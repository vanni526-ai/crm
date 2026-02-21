import XLSX from 'xlsx';
import mysql from 'mysql2/promise';

// 数据库连接配置
const DB_CONFIG = {
  host: 'gateway02.us-east-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: 'SQg17LQaPsV51m8.32b9e2c038f9',
  password: 'Kl73f9UV66JE7yHBpNmX',
  database: 'jtCSa4Dgw9WMNzinVreVWF',
  ssl: {
    rejectUnauthorized: true,
  },
};

async function migrateTeacherCities() {
  console.log('=== 开始迁移老师城市映射数据 ===\n');

  // 1. 读取Excel文件
  console.log('📖 读取Excel文件...');
  const workbook = XLSX.readFile('/home/ubuntu/upload/老师信息表.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`✅ 读取到 ${data.length} 条老师记录\n`);

  // 2. 连接数据库
  console.log('🔌 连接数据库...');
  const connection = await mysql.createConnection(DB_CONFIG);
  console.log('✅ 数据库连接成功\n');

  try {
    // 3. 获取所有城市的ID映射
    console.log('📍 获取城市列表...');
    const [cities] = await connection.execute(
      'SELECT id, name FROM cities WHERE isActive = true'
    );
    const cityNameToIdMap = new Map(cities.map(c => [c.name, c.id]));
    console.log(`✅ 找到 ${cities.length} 个激活的城市\n`);

    // 4. 处理每个老师
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const row of data) {
      const teacherName = row['老师'];
      const cityNames = row['城市'] ? row['城市'].split('/').map(c => c.trim()) : [];

      if (!teacherName) {
        console.log('⚠️  跳过：姓名为空的记录');
        skipCount++;
        continue;
      }

      if (cityNames.length === 0) {
        console.log(`⚠️  跳过：${teacherName} 没有城市信息`);
        skipCount++;
        continue;
      }

      try {
        // 查询老师是否存在
        const [users] = await connection.execute(
          'SELECT id, name, roles FROM users WHERE name = ? AND roles LIKE ?',
          [teacherName, '%teacher%']
        );

        if (users.length === 0) {
          console.log(`⚠️  跳过：${teacherName} 在users表中不存在或不是老师`);
          skipCount++;
          continue;
        }

        const teacher = users[0];

        // 将城市名称转换为城市ID
        const cityIds = cityNames
          .map(name => cityNameToIdMap.get(name))
          .filter(id => id !== undefined);

        if (cityIds.length === 0) {
          console.log(`⚠️  跳过：${teacherName} 的城市 [${cityNames.join(', ')}] 在cities表中找不到`);
          skipCount++;
          continue;
        }

        // 检查是否已有映射记录
        const [existingMappings] = await connection.execute(
          'SELECT id, cities FROM user_role_cities WHERE userId = ? AND role = ?',
          [teacher.id, 'teacher']
        );

        const citiesJson = JSON.stringify(cityIds);

        if (existingMappings.length > 0) {
          // 更新现有记录
          const existingMapping = existingMappings[0];
          await connection.execute(
            'UPDATE user_role_cities SET cities = ?, updatedAt = NOW() WHERE id = ?',
            [citiesJson, existingMapping.id]
          );
          console.log(`✅ 更新：${teacherName} (ID: ${teacher.id}) → 城市: [${cityNames.join(', ')}] (IDs: ${cityIds.join(',')})`);
        } else {
          // 插入新记录
          await connection.execute(
            'INSERT INTO user_role_cities (userId, role, cities, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
            [teacher.id, 'teacher', citiesJson]
          );
          console.log(`✅ 创建：${teacherName} (ID: ${teacher.id}) → 城市: [${cityNames.join(', ')}] (IDs: ${cityIds.join(',')})`);
        }

        successCount++;
      } catch (error) {
        console.error(`❌ 错误：处理 ${teacherName} 时出错:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== 迁移完成 ===');
    console.log(`✅ 成功: ${successCount} 个老师`);
    console.log(`⚠️  跳过: ${skipCount} 个老师`);
    console.log(`❌ 错误: ${errorCount} 个老师`);

    // 5. 验证结果
    console.log('\n=== 验证结果 ===');
    const [stats] = await connection.execute(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE roles LIKE '%teacher%') as total_teachers,
        (SELECT COUNT(DISTINCT userId) FROM user_role_cities WHERE role = 'teacher') as teachers_with_mapping
    `);
    
    const stat = stats[0];
    const coverage = ((stat.teachers_with_mapping / stat.total_teachers) * 100).toFixed(2);
    
    console.log(`📊 老师总数: ${stat.total_teachers}`);
    console.log(`📊 有城市映射的老师: ${stat.teachers_with_mapping}`);
    console.log(`📊 覆盖率: ${coverage}%`);

  } finally {
    await connection.end();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 执行迁移
migrateTeacherCities().catch(error => {
  console.error('❌ 迁移失败:', error);
  process.exit(1);
});
