import { getDb } from "./server/db";
import { orders, classrooms } from "./drizzle/schema";
import { eq, and } from "drizzle-orm";
import { standardizeClassroom } from "./server/classroomMappingRules";

async function testDataCleaningDirect() {
  console.log("开始直接测试数据清洗逻辑...\n");
  
  const db = await getDb();
  if (!db) {
    console.error("数据库连接失败");
    return;
  }

  // 查询一些需要清洗的订单
  const testOrders = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      deliveryCity: orders.deliveryCity,
      deliveryRoom: orders.deliveryRoom,
    })
    .from(orders)
    .limit(10);

  console.log(`找到${testOrders.length}个订单进行测试\n`);

  for (const order of testOrders) {
    console.log(`订单: ${order.orderNo}`);
    console.log(`  城市: ${order.deliveryCity || "(空)"}`);
    console.log(`  教室: ${order.deliveryRoom || "(空)"}`);

    // 测试智能填充逻辑
    if (order.deliveryCity && !order.deliveryRoom) {
      try {
        const cityClassrooms = await db
          .select({ name: classrooms.name })
          .from(classrooms)
          .where(
            and(
              eq(classrooms.cityName, order.deliveryCity),
              eq(classrooms.isActive, true)
            )
          );

        console.log(`  ${order.deliveryCity}的教室数量: ${cityClassrooms.length}`);
        if (cityClassrooms.length === 1) {
          console.log(`  ✅ 应该填充为: ${cityClassrooms[0].name}`);
        }
      } catch (error) {
        console.error(`  ❌ 查询教室失败:`, error);
      }
    }

    // 测试教室标准化
    if (order.deliveryRoom) {
      const standardized = standardizeClassroom(
        order.deliveryRoom,
        order.deliveryCity || undefined
      );
      if (standardized) {
        if (
          standardized.classroom !== order.deliveryRoom ||
          standardized.city !== order.deliveryCity
        ) {
          console.log(`  🔧 需要标准化:`);
          console.log(`     ${order.deliveryCity} / ${order.deliveryRoom}`);
          console.log(`     → ${standardized.city} / ${standardized.classroom}`);
        }
      }
    }

    console.log("");
  }

  console.log("测试完成");
}

testDataCleaningDirect().catch(console.error);
