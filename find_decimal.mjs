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
  salesPerson: schema.orders.salesPerson,
  trafficSource: schema.orders.trafficSource,
  notes: schema.orders.notes,
  createdAt: schema.orders.createdAt,
}).from(schema.orders)
  .where(like(schema.orders.channelOrderNo, '%.%'))
  .limit(20);

console.log(`Found ${results.length} orders with decimal point in channelOrderNo:`);
results.forEach(order => {
  console.log(`\nID: ${order.id}`);
  console.log(`OrderNo: "${order.orderNo}"`);
  console.log(`ChannelOrderNo: "${order.channelOrderNo}"`);
  console.log(`Customer: ${order.customerName}`);
  console.log(`Sales: ${order.salesPerson}`);
  console.log(`Traffic: ${order.trafficSource}`);
  console.log(`Notes: ${order.notes ? order.notes.substring(0, 50) + '...' : 'N/A'}`);
  console.log(`Created: ${order.createdAt}`);
});

await connection.end();
