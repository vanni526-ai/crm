import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';
import { sql, isNotNull, ne } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

// 查询所有有渠道订单号的订单
const allWithChannel = await db.select({
  id: schema.orders.id,
  orderNo: schema.orders.orderNo,
  customerName: schema.orders.customerName,
  channelOrderNo: schema.orders.channelOrderNo,
  createdAt: schema.orders.createdAt,
}).from(schema.orders)
  .where(isNotNull(schema.orders.channelOrderNo))
  .limit(100);

console.log(`Total orders with channelOrderNo: ${allWithChannel.length}`);

// 过滤出异常的渠道订单号(长度小于10或者包含小数点)
const abnormal = allWithChannel.filter(order => {
  const channelNo = order.channelOrderNo || '';
  return channelNo.length < 10 || channelNo.includes('.');
});

console.log(`\nAbnormal channelOrderNo count: ${abnormal.length}`);
console.log('\nAbnormal examples:');
abnormal.slice(0, 10).forEach(order => {
  console.log(`ID: ${order.id}, ChannelOrderNo: "${order.channelOrderNo}", Customer: ${order.customerName}, Created: ${order.createdAt}`);
});

await connection.end();
