import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';
import { desc } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

const results = await db.select({
  id: schema.orders.id,
  orderNo: schema.orders.orderNo,
  customerName: schema.orders.customerName,
  salesPerson: schema.orders.salesPerson,
}).from(schema.orders).orderBy(desc(schema.orders.id)).limit(20);

console.log('Recent orders:');
results.forEach(order => {
  console.log(`ID: ${order.id}, OrderNo: "${order.orderNo}", Customer: ${order.customerName}, Sales: ${order.salesPerson}`);
});

await connection.end();
