import { getDb } from "../server/db";
import { orders } from "../drizzle/schema";
import { sql } from "drizzle-orm";

async function checkOrderMonths() {
  const db = await getDb();
  if (!db) {
    console.error("数据库连接失败");
    process.exit(1);
  }

  const result = await db
    .select({
      month: sql`DATE_FORMAT(classDate, '%Y-%m')`,
      count: sql`COUNT(*)`,
    })
    .from(orders)
    .groupBy(sql`DATE_FORMAT(classDate, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(classDate, '%Y-%m') DESC`)
    .limit(12);

  console.log("订单月份分布:");
  result.forEach((r) => console.log(`  ${r.month}: ${r.count}个订单`));

  const total = await db.select({ count: sql`COUNT(*)` }).from(orders);
  console.log(`\n订单总数: ${total[0].count}`);

  process.exit(0);
}

checkOrderMonths().catch(console.error);
