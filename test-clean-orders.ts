import { getDb } from "./server/db";
import { orders } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function testCleanOrders() {
  console.log("开始测试cleanOrders接口...\n");
  
  const db = await getDb();
  if (!db) {
    console.error("数据库连接失败");
    return;
  }

  // 查询订单ORD1768031803561996
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNo, "ORD1768031803561996"))
    .limit(1);

  if (!order) {
    console.log("订单ORD1768031803561996不存在");
    return;
  }

  console.log("订单信息:");
  console.log(`- 订单号: ${order.orderNo}`);
  console.log(`- 客户名: ${order.customerName}`);
  console.log(`- 交付城市: ${order.deliveryCity}`);
  console.log(`- 交付教室: ${order.deliveryRoom || "(空)"}`);
  console.log(`- 交付老师: ${order.deliveryTeacher || "(空)"}`);
  
  // 检查天津是否只有一个教室
  const { classrooms } = await import("./drizzle/schema");
  const { and } = await import("drizzle-orm");
  
  if (order.deliveryCity) {
    const cityClassrooms = await db
      .select({ name: classrooms.name })
      .from(classrooms)
      .where(
        and(
          eq(classrooms.cityName, order.deliveryCity),
          eq(classrooms.isActive, true)
        )
      );
    
    console.log(`\n${order.deliveryCity}的教室数量: ${cityClassrooms.length}`);
    if (cityClassrooms.length > 0) {
      console.log("教室列表:");
      cityClassrooms.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.name}`);
      });
    }
    
    if (cityClassrooms.length === 1 && !order.deliveryRoom) {
      console.log(`\n✅ 符合智能填充条件：城市有且仅有一个教室，订单无教室信息`);
      console.log(`   应该自动填充为: ${cityClassrooms[0].name}`);
    }
  }
  
  console.log("\n测试完成");
}

testCleanOrders().catch(console.error);
