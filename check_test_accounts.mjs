import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function checkAccounts() {
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
    
    // 查询测试账号
    const [rows] = await connection.execute(`
      SELECT id, openId, name, nickname, email, phone, role, isActive, 
             LEFT(password, 20) as passwordPrefix, LENGTH(password) as passwordLength,
             createdAt, updatedAt
      FROM users 
      WHERE name IN ('appuser', 'testuser') 
         OR phone IN ('13800138000', '13900139000') 
         OR email IN ('appuser@test.com', 'testuser@test.com')
      ORDER BY id
    `);

    console.log('\n========== 测试账号详细信息 ==========\n');
    console.log(`找到 ${rows.length} 个相关账号:\n`);

    rows.forEach((row, index) => {
      console.log(`账号 ${index + 1}:`);
      console.log(`  ID: ${row.id}`);
      console.log(`  OpenID: ${row.openId}`);
      console.log(`  用户名: ${row.name}`);
      console.log(`  昵称: ${row.nickname}`);
      console.log(`  邮箱: ${row.email}`);
      console.log(`  手机号: ${row.phone}`);
      console.log(`  角色: ${row.role}`);
      console.log(`  状态: ${row.isActive ? '启用' : '禁用'}`);
      console.log(`  密码前缀: ${row.passwordPrefix}...`);
      console.log(`  密码长度: ${row.passwordLength} 字符`);
      console.log(`  创建时间: ${row.createdAt}`);
      console.log(`  更新时间: ${row.updatedAt}`);
      console.log('');
    });

    // 测试密码验证
    console.log('========== 密码验证测试 ==========\n');
    
    const bcrypt = await import('bcryptjs');
    
    for (const row of rows) {
      const [fullRow] = await connection.execute(
        'SELECT password FROM users WHERE id = ?',
        [row.id]
      );
      
      const storedPassword = fullRow[0].password;
      
      // 测试常见密码
      const testPasswords = ['123456', 'test123', 'password', ''];
      
      console.log(`测试账号: ${row.name} (${row.phone})`);
      
      for (const testPwd of testPasswords) {
        try {
          const isMatch = await bcrypt.compare(testPwd, storedPassword);
          if (isMatch) {
            console.log(`  ✅ 密码匹配: "${testPwd}"`);
          }
        } catch (error) {
          // 忽略比对错误
        }
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAccounts();
