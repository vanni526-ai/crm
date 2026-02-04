import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;

async function fixAccounts() {
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
    console.log('✅ 数据库连接成功\n');

    // 1. 创建appuser账号(使用新的手机号)
    const appuserPhone = '13800138001';  // 使用新手机号避免冲突
    const appuserPassword = '123456';
    
    // 检查appuser是否已存在
    const [existingAppuser] = await connection.execute(
      'SELECT id FROM users WHERE name = ?',
      ['appuser']
    );

    if (existingAppuser.length > 0) {
      console.log('⚠️  appuser账号已存在,更新密码和手机号...');
      const hashedPassword = await bcrypt.hash(appuserPassword, 10);
      await connection.execute(
        'UPDATE users SET password = ?, phone = ?, updatedAt = NOW() WHERE name = ?',
        [hashedPassword, appuserPhone, 'appuser']
      );
      console.log('✅ appuser账号已更新');
    } else {
      console.log('创建appuser账号...');
      const hashedPassword = await bcrypt.hash(appuserPassword, 10);
      const [result] = await connection.execute(
        `INSERT INTO users (openId, name, nickname, email, phone, password, role, isActive, createdAt, updatedAt, lastSignedIn)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
        [
          'test_app_user_001',
          'appuser',
          'App测试用户',
          'appuser@test.com',
          appuserPhone,
          hashedPassword,
          'user',
          true,
        ]
      );
      console.log(`✅ appuser账号创建成功 (ID: ${result.insertId})`);
    }

    console.log(`   用户名: appuser`);
    console.log(`   手机号: ${appuserPhone}`);
    console.log(`   邮箱: appuser@test.com`);
    console.log(`   密码: ${appuserPassword}`);
    console.log('');

    // 2. 更新testuser密码为123456
    console.log('更新testuser密码...');
    const testuserPassword = '123456';
    const hashedTestuserPassword = await bcrypt.hash(testuserPassword, 10);
    
    const [updateResult] = await connection.execute(
      'UPDATE users SET password = ?, updatedAt = NOW() WHERE name = ?',
      [hashedTestuserPassword, 'testuser']
    );

    if (updateResult.affectedRows > 0) {
      console.log('✅ testuser密码已更新为: 123456');
    } else {
      console.log('⚠️  testuser账号不存在');
    }
    console.log('');

    // 3. 验证所有测试账号
    console.log('========== 验证测试账号 ==========\n');
    
    const testAccounts = [
      { username: 'appuser', password: '123456' },
      { username: appuserPhone, password: '123456' },
      { username: 'testuser', password: '123456' },
      { username: '13900139000', password: '123456' },
    ];

    for (const test of testAccounts) {
      const [users] = await connection.execute(
        'SELECT id, name, phone, password FROM users WHERE name = ? OR phone = ?',
        [test.username, test.username]
      );

      if (users.length > 0) {
        const user = users[0];
        const isMatch = await bcrypt.compare(test.password, user.password);
        if (isMatch) {
          console.log(`✅ ${test.username} / ${test.password} - 验证成功`);
        } else {
          console.log(`❌ ${test.username} / ${test.password} - 密码错误`);
        }
      } else {
        console.log(`❌ ${test.username} - 账号不存在`);
      }
    }

    console.log('\n✅ 所有测试账号修复完成!');

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixAccounts();
