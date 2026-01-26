import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq } from 'drizzle-orm';
import * as schema from './drizzle/schema.ts';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

const order = await db.select().from(schema.orders).where(eq(schema.orders.orderNo, 'ORD1769234555645602')).limit(1);

if (order.length > 0) {
  console.log('订单详情:');
  console.log('订单号:', order[0].orderNo);
  console.log('客户名:', order[0].customerName);
  console.log('销售人:', order[0].salesperson);
  console.log('课程:', order[0].course);
  console.log('备注:', order[0].notes);
  console.log('\n原始文本:', order[0].originalText);
} else {
  console.log('未找到订单');
}

await connection.end();
