import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;

async function createTestAccount() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL环境变量未设置');
    process.exit(1);
  }

  // 解析DATABASE_URL
  const url = new URL(DATABASE_URL);
  const config = {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  };

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功');

    // 测试账号信息
    const testAccounts = [
      {
        openId: 'test_app_user_001',
        name: 'appuser',
        nickname: 'App测试用户',
        email: 'appuser@test.com',
        phone: '13800138000',
        password: '123456',
        role: 'user',
        isActive: true,
      },
      {
        openId: 'test_app_user_002',
        name: 'testuser',
        nickname: '测试用户2',
        email: 'testuser@test.com',
        phone: '13900139000',
        password: 'test123',
        role: 'user',
        isActive: true,
      },
    ];

    for (const account of testAccounts) {
      // 检查账号是否已存在
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE phone = ? OR email = ? OR name = ?',
        [account.phone, account.email, account.name]
      );

      if (existing.length > 0) {
        console.log(`⚠️  账号已存在: ${account.name} (${account.phone})`);
        continue;
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(account.password, 10);

      // 插入测试账号
      const [result] = await connection.execute(
        `INSERT INTO users (openId, name, nickname, email, phone, password, role, isActive, createdAt, updatedAt, lastSignedIn)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
        [
          account.openId,
          account.name,
          account.nickname,
          account.email,
          account.phone,
          hashedPassword,
          account.role,
          account.isActive,
        ]
      );

      console.log(`✅ 创建测试账号成功: ${account.name} (${account.phone})`);
      console.log(`   - 用户名: ${account.name}`);
      console.log(`   - 手机号: ${account.phone}`);
      console.log(`   - 邮箱: ${account.email}`);
      console.log(`   - 密码: ${account.password}`);
      console.log(`   - 角色: ${account.role}`);
      console.log(`   - ID: ${result.insertId}`);
      console.log('');
    }

    console.log('✅ 所有测试账号创建完成');
  } catch (error) {
    console.error('❌ 创建测试账号失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createTestAccount();
