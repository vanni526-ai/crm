import mysql from 'mysql2/promise';
import 'dotenv/config';

/**
 * 清理用户roles字段脚本
 * 
 * 问题:
 * 1. 角色重复: "teacher,普通用户,老师,上海" - teacher和老师重复
 * 2. 中英文混用: 使用中文而非英文标识符
 * 3. 城市混入: 城市名不应该在roles字段中
 * 
 * 清理规则:
 * 1. 统一使用英文标识符: user, teacher, admin, sales, finance, cityPartner
 * 2. 移除城市名
 * 3. 去重
 */

// 角色映射表
const roleMapping = {
  // 英文标识符
  'user': 'user',
  'teacher': 'teacher',
  'admin': 'admin',
  'sales': 'sales',
  'finance': 'finance',
  'cityPartner': 'cityPartner',
  'customer': 'customer',
  
  // 中文映射
  '普通用户': 'user',
  '老师': 'teacher',
  '管理员': 'admin',
  '销售': 'sales',
  '财务': 'finance',
  '城市合伙人': 'cityPartner',
  '客户': 'customer',
};

// 城市列表(需要从roles中移除)
const cities = [
  '上海', '北京', '深圳', '广州', '杭州', '南京', '武汉', '成都', '重庆',
  '天津', '西安', '郑州', '苏州', '长沙', '青岛', '大连', '厦门', '宁波',
  '无锡', '石家庄', '济南', '沈阳', '哈尔滨', '长春', '合肥', '南昌', '福州',
  '太原', '昆明', '兰州', '乌鲁木齐', '呼和浩特', '银川', '西宁', '拉萨',
  '贵阳', '海口', '南宁', '石家庄'
];

/**
 * 清理单个roles字符串
 */
function cleanRoles(rolesStr) {
  if (!rolesStr || rolesStr.trim() === '') {
    return '';
  }
  
  // 分割roles
  const roleParts = rolesStr.split(',').map(r => r.trim());
  
  // 映射并过滤
  const cleanedRoles = roleParts
    .map(role => roleMapping[role] || null) // 映射到英文标识符
    .filter(role => role !== null); // 移除未识别的项(包括城市名)
  
  // 去重
  const uniqueRoles = [...new Set(cleanedRoles)];
  
  return uniqueRoles.join(',');
}

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('开始清理roles字段...\n');
    
    // 1. 获取所有有roles的用户
    const [users] = await connection.query(`
      SELECT id, name, phone, roles
      FROM users
      WHERE roles IS NOT NULL AND roles != ''
    `);
    
    console.log(`找到 ${users.length} 个用户需要清理\n`);
    
    // 2. 统计清理前的情况
    const beforeStats = {};
    users.forEach(user => {
      beforeStats[user.roles] = (beforeStats[user.roles] || 0) + 1;
    });
    
    console.log('清理前roles分布(前10):');
    Object.entries(beforeStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([roles, count]) => {
        console.log(`  ${roles}: ${count}个用户`);
      });
    console.log('');
    
    // 3. 清理roles
    let updateCount = 0;
    const updates = [];
    
    for (const user of users) {
      const cleanedRoles = cleanRoles(user.roles);
      
      if (cleanedRoles !== user.roles) {
        updates.push({
          id: user.id,
          name: user.name,
          phone: user.phone,
          oldRoles: user.roles,
          newRoles: cleanedRoles
        });
        updateCount++;
      }
    }
    
    console.log(`需要更新 ${updateCount} 个用户的roles字段\n`);
    
    // 4. 显示更新示例
    console.log('更新示例(前10个):');
    updates.slice(0, 10).forEach(u => {
      console.log(`  用户${u.id} (${u.name}/${u.phone}):`);
      console.log(`    旧: ${u.oldRoles}`);
      console.log(`    新: ${u.newRoles}`);
    });
    console.log('');
    
    // 5. 执行更新
    console.log('开始执行批量更新...');
    
    for (const update of updates) {
      await connection.query(
        'UPDATE users SET roles = ? WHERE id = ?',
        [update.newRoles, update.id]
      );
    }
    
    console.log(`✅ 成功更新 ${updateCount} 个用户的roles字段\n`);
    
    // 6. 验证清理后的情况
    const [afterUsers] = await connection.query(`
      SELECT roles, COUNT(*) as count
      FROM users
      WHERE roles IS NOT NULL AND roles != ''
      GROUP BY roles
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('清理后roles分布(前10):');
    afterUsers.forEach(row => {
      console.log(`  ${row.roles}: ${row.count}个用户`);
    });
    
  } catch (error) {
    console.error('清理失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
