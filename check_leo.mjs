import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';
import { like } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

const results = await db.select({
  id: schema.orders.id,
  orderNo: schema.orders.orderNo,
  customerName: schema.orders.customerName,
  channelOrderNo: schema.orders.channelOrderNo,
  paymentAmount: schema.orders.paymentAmount,
  deliveryCourse: schema.orders.deliveryCourse,
}).from(schema.orders)
  .where(like(schema.orders.customerName, '%leo%'))
  .limit(5);

console.log('Leo orders:');
results.forEach(order => {
  console.log(`\nID: ${order.id}`);
  console.log(`OrderNo: "${order.orderNo}"`);
  console.log(`ChannelOrderNo: "${order.channelOrderNo}"`);
  console.log(`Customer: ${order.customerName}`);
  console.log(`Amount: ${order.paymentAmount}`);
  console.log(`Course: ${order.deliveryCourse}`);
});

await connection.end();
