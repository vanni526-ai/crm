import mysql from 'mysql2/promise.js';

const DATABASE_URL = process.env.DATABASE_URL;

console.log('🔍 Testing database connection...');
console.log('DATABASE_URL:', DATABASE_URL ? DATABASE_URL.replace(/:[^:@]+@/, ':***@') : 'NOT SET');

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set!');
  process.exit(1);
}

try {
  console.log('\n📡 Attempting to connect to TiDB Cloud...');
  
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log('✅ Connection established successfully!');
  
  // Test a simple query
  console.log('\n🔍 Testing query: SELECT 1 as test');
  const [rows] = await connection.execute('SELECT 1 as test');
  console.log('✅ Query result:', rows);
  
  // Test users table
  console.log('\n🔍 Testing query: SELECT COUNT(*) FROM users');
  const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
  console.log('✅ Users count:', userCount);
  
  await connection.end();
  console.log('\n✅ Database connection test completed successfully!');
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ Database connection failed!');
  console.error('Error code:', error.code);
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  process.exit(1);
}
