import { getDb } from "./server/db";
import { orders, classrooms } from "./drizzle/schema";
import { eq, and } from "drizzle-orm";
import { standardizeClassroom } from "./server/classroomMappingRules";

async function testCleanSingleOrder() {
  console.log("测试单个订单的清洗逻辑...\n");
  
  const db = await getDb();
  if (!db) {
    console.error("数据库连接失败");
    return;
  }

  // 查询一个有城市但无教室的订单
  const [testOrder] = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      deliveryCity: orders.deliveryCity,
      deliveryRoom: orders.deliveryRoom,
    })
    .from(orders)
    .where(
      and(
        eq(orders.deliveryRoom, ""),
        // @ts-ignore
        eq(orders.deliveryCity, "天津")
      )
    )
    .limit(1);

  if (!testOrder) {
    console.log("没有找到符合条件的订单");
    return;
  }

  console.log(`找到订单: ${testOrder.orderNo}`);
  console.log(`  城市: ${testOrder.deliveryCity || "(空)"}`);
  console.log(`  教室: ${testOrder.deliveryRoom || "(空)"}`);
  console.log("");

  // 模拟cleanOrders的逻辑
  const updateData: any = {};

  // 1. 标准化教室名称
  if (testOrder.deliveryRoom) {
    const classroomStandardized = standardizeClassroom(
      testOrder.deliveryRoom,
      testOrder.deliveryCity || undefined
    );
    if (classroomStandardized) {
      if (
        classroomStandardized.classroom !== testOrder.deliveryRoom ||
        classroomStandardized.city !== testOrder.deliveryCity
      ) {
        updateData.deliveryCity = classroomStandardized.city;
        updateData.deliveryRoom = classroomStandardized.classroom;
        console.log("✅ 需要标准化教室名称");
      }
    }
  } else if (testOrder.deliveryCity && !testOrder.deliveryRoom) {
    // 智能填充教室
    console.log("🔍 检查智能填充条件...");
    console.log(`  条件1: 有城市 = ${!!testOrder.deliveryCity}`);
    console.log(`  条件2: 无教室 = ${!testOrder.deliveryRoom}`);
    
    try {
      console.log(`  查询${testOrder.deliveryCity}的教室...`);
      const cityClassrooms = await db
        .select({ name: classrooms.name })
        .from(classrooms)
        .where(
          and(
            eq(classrooms.cityName, testOrder.deliveryCity),
            eq(classrooms.isActive, true)
          )
        );
      
      console.log(`  找到${cityClassrooms.length}个教室:`, cityClassrooms.map(c => c.name));
      
      if (cityClassrooms.length === 1) {
        updateData.deliveryRoom = cityClassrooms[0].name;
        console.log(`✅ 智能填充: ${cityClassrooms[0].name}`);
      } else if (cityClassrooms.length === 0) {
        console.log(`❌ 该城市没有教室`);
      } else {
        console.log(`❌ 该城市有多个教室，无法自动填充`);
      }
    } catch (error) {
      console.error(`❌ 查询教室失败:`, error);
    }
  }

  console.log("\n最终updateData:", updateData);
  console.log(`updateData字段数: ${Object.keys(updateData).length}`);

  if (Object.keys(updateData).length === 0) {
    console.log("\n❌ 没有需要清洗的字段 - 这就是问题所在！");
  } else {
    console.log("\n✅ 有需要清洗的字段，应该执行更新");
  }
}

testCleanSingleOrder().catch(console.error);
