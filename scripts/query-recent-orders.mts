import { getDb } from "../server/db";
import { orders } from "../drizzle/schema";
import { desc, sql } from "drizzle-orm";

const db = await getDb();

const recentOrders = await db
  .select({
    id: orders.id,
    customerName: orders.customerName,
    deliveryCity: orders.deliveryCity,
    paymentAmount: orders.paymentAmount,
    courseAmount: orders.courseAmount,
    teacherFee: orders.teacherFee,
    partnerFee: orders.partnerFee,
    createdAt: orders.createdAt
  })
  .from(orders)
  .where(sql`${orders.createdAt} >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`)
  .orderBy(desc(orders.createdAt))
  .limit(10);

console.log("最近1小时导入的订单:");
console.log(JSON.stringify(recentOrders, null, 2));

process.exit(0);
