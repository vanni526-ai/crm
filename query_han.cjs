const mysql = require('mysql2/promise');

async function query() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not found');
    return;
  }
  
  const conn = await mysql.createConnection(dbUrl);
  
  console.log('=== customers表中的韩顗杰 ===');
  const [customers] = await conn.query(`
    SELECT id, userId, name, membershipStatus, membershipActivatedAt, membershipExpiresAt, membershipOrderId
    FROM customers
    WHERE name LIKE '%韩顗杰%'
  `);
  console.table(customers);
  
  console.log('\n=== users表中的韩顗杰 ===');
  const [users] = await conn.query(`
    SELECT id, name, phone, membershipStatus, membershipActivatedAt, membershipExpiresAt, membershipOrderId
    FROM users
    WHERE name LIKE '%韩顗杰%' OR phone LIKE '%17370405%'
  `);
  console.table(users);
  
  await conn.end();
}

query().catch(console.error);
