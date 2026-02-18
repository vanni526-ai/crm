import { getDb } from "./server/db";
import { orders, classrooms } from "./drizzle/schema";
import { eq, and, or, isNull } from "drizzle-orm";

async function testCleanFix() {
  console.log("测试修复后的清洗逻辑...\n");
  
  const db = await getDb();
  if (!db) {
    console.error("数据库连接失败");
    return;
  }

  // 查询有城市但无教室的订单（包括NULL和空字符串）
  const testOrders = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      deliveryCity: orders.deliveryCity,
      deliveryRoom: orders.deliveryRoom,
    })
    .from(orders)
    .where(
      and(
        or(
          isNull(orders.deliveryRoom),
          eq(orders.deliveryRoom, "")
        ),
        // @ts-ignore
        eq(orders.deliveryCity, "天津")
      )
    )
    .limit(5);

  console.log(`找到${testOrders.length}个符合条件的订单\n`);

  for (const order of testOrders) {
    console.log(`订单: ${order.orderNo}`);
    console.log(`  城市: ${order.deliveryCity || "(空)"}`);
    console.log(`  教室: ${order.deliveryRoom === null ? "(NULL)" : order.deliveryRoom === "" ? "(空字符串)" : order.deliveryRoom}`);
    
    // 测试新的条件判断
    const shouldFill = order.deliveryCity && (!order.deliveryRoom || order.deliveryRoom.trim() === "");
    console.log(`  应该智能填充: ${shouldFill}`);
    
    if (shouldFill) {
      const cityClassrooms = await db
        .select({ name: classrooms.name })
        .from(classrooms)
        .where(
          and(
            eq(classrooms.cityName, order.deliveryCity!),
            eq(classrooms.isActive, true)
          )
        );
      
      console.log(`  ${order.deliveryCity}的教室数量: ${cityClassrooms.length}`);
      if (cityClassrooms.length === 1) {
        console.log(`  ✅ 应该填充为: ${cityClassrooms[0].name}`);
      }
    }
    console.log("");
  }
}

testCleanFix().catch(console.error);
