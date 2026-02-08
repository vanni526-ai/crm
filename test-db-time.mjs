import { formatDateTimeBeijing, formatDateBeijing } from './shared/timezone.ts';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.query('SELECT id, customerName, createdAt FROM orders ORDER BY createdAt DESC LIMIT 3');

console.log('数据库时间 → 北京时间格式化测试：\n');
rows.forEach((r) => {
  console.log(`订单 ${r.id}:`);
  console.log(`  数据库原始时间: ${r.createdAt.toISOString()}`);
  console.log(`  北京日期: ${formatDateBeijing(r.createdAt)}`);
  console.log(`  北京日期时间: ${formatDateTimeBeijing(r.createdAt)}`);
  console.log('');
});

await conn.end();
