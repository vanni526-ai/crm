import { getDb } from "./server/db";
import { orders } from "./drizzle/schema";
import { eq, sql } from "drizzle-orm";

async function checkOrders() {
  const db = await getDb();
  if (!db) {
    console.error("数据库连接失败");
    return;
  }

  // 查询天津的订单，看看deliveryRoom字段的实际情况
  const tianJinOrders = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      deliveryCity: orders.deliveryCity,
      deliveryRoom: orders.deliveryRoom,
    })
    .from(orders)
    .where(eq(orders.deliveryCity, "天津"))
    .limit(10);

  console.log(`天津的订单数量: ${tianJinOrders.length}\n`);

  for (const order of tianJinOrders) {
    console.log(`订单: ${order.orderNo}`);
    console.log(`  城市: "${order.deliveryCity}"`);
    console.log(`  教室: "${order.deliveryRoom}" (类型: ${typeof order.deliveryRoom}, 长度: ${order.deliveryRoom?.length}, null: ${order.deliveryRoom === null})`);
    console.log("");
  }

  // 统计不同教室字段的情况
  const stats = await db
    .select({
      deliveryRoom: orders.deliveryRoom,
      count: sql<number>`count(*)`,
    })
    .from(orders)
    .where(eq(orders.deliveryCity, "天津"))
    .groupBy(orders.deliveryRoom);

  console.log("天津订单的教室统计:");
  for (const stat of stats) {
    console.log(`  "${stat.deliveryRoom}": ${stat.count}个`);
  }
}

checkOrders().catch(console.error);
