import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';
import { or, like } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

const results = await db.select().from(schema.orders)
  .where(or(
    like(schema.orders.customerName, '%清然%'),
    like(schema.orders.customerName, '%leo%')
  ))
  .limit(10);

console.log('Found orders:');
results.forEach(order => {
  console.log(`\nID: ${order.id}`);
  console.log(`OrderNo: "${order.orderNo}"`);
  console.log(`Customer: ${order.customerName}`);
  console.log(`Sales: ${order.salesPerson}`);
  console.log(`Traffic: ${order.trafficSource}`);
  console.log(`Course: ${order.deliveryCourse}`);
});

await connection.end();
