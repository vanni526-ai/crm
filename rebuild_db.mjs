import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function rebuildDatabase() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log('删除旧表...');
  const tables = ['importLogs', 'reconciliations', 'teacherPayments', 'schedules', 'payments', 'teachers', 'orders', 'customers', 'users'];
  
  for (const table of tables) {
    try {
      await connection.execute(`DROP TABLE IF EXISTS ${table}`);
      console.log(`  ✓ 删除表 ${table}`);
    } catch (err) {
      console.log(`  - 跳过表 ${table}: ${err.message}`);
    }
  }
  
  await connection.end();
  console.log('\n旧表已删除,现在运行 pnpm drizzle-kit generate && pnpm drizzle-kit migrate');
}

rebuildDatabase().catch(console.error);
