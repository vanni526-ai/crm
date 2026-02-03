import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 创建测试账号
const passwordHash = await bcrypt.hash('123456', 10);
await conn.query(`
  INSERT INTO systemAccounts (username, email, passwordHash, identity, relatedName, isActive)
  VALUES ('test', 'test@example.com', ?, 'admin', '测试用户', 1)
  ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash)
`, [passwordHash]);

console.log('✅ 测试账号创建成功: username=test, password=123456');

await conn.end();
