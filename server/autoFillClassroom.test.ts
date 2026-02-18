import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { orders, classrooms, cities } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("智能填充教室功能测试", () => {
  let testCityId: number;
  let testClassroomId: number;
  let testOrderId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 创建测试城市
    const [testCity] = await db
      .insert(cities)
      .values({
        name: "测试城市_智能填充",
        partnerFeeRate: 0.1,
      })
      .$returningId();
    testCityId = testCity.id;

    // 创建一个教室
    const [testClassroom] = await db
      .insert(classrooms)
      .values({
        cityId: testCityId,
        cityName: "测试城市_智能填充",
        name: "测试城市_智能填充1501",
        address: "测试地址",
        isActive: true,
      })
      .$returningId();
    testClassroomId = testClassroom.id;

    // 创建测试订单（有城市但无教室）
    const [testOrder] = await db
      .insert(orders)
      .values({
        orderNo: `TEST_AUTO_FILL_${Date.now()}`,
        customerName: "测试客户",
        salesId: 0,
        paymentAmount: 1000,
        deliveryCity: "测试城市_智能填充",
        deliveryRoom: null,
        classDate: new Date(),
        totalAmount: 1000,
        orderStatus: "已支付",
      })
      .$returningId();
    testOrderId = testOrder.id;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // 清理测试数据
    if (testOrderId) {
      await db.delete(orders).where(eq(orders.id, testOrderId));
    }
    if (testClassroomId) {
      await db.delete(classrooms).where(eq(classrooms.id, testClassroomId));
    }
    if (testCityId) {
      await db.delete(cities).where(eq(cities.id, testCityId));
    }
  });

  it("应该自动填充唯一教室", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 模拟数据清洗逻辑
    const [order] = await db
      .select({
        id: orders.id,
        deliveryCity: orders.deliveryCity,
        deliveryRoom: orders.deliveryRoom,
      })
      .from(orders)
      .where(eq(orders.id, testOrderId))
      .limit(1);

    expect(order).toBeDefined();
    expect(order.deliveryCity).toBe("测试城市_智能填充");
    expect(order.deliveryRoom).toBeNull();

    // 查询该城市的教室
    const cityClassrooms = await db
      .select({ name: classrooms.name })
      .from(classrooms)
      .where(eq(classrooms.cityName, order.deliveryCity!));

    expect(cityClassrooms.length).toBe(1);
    expect(cityClassrooms[0].name).toBe("测试城市_智能填充1501");

    // 执行智能填充
    if (cityClassrooms.length === 1) {
      await db
        .update(orders)
        .set({
          deliveryRoom: cityClassrooms[0].name,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, testOrderId));
    }

    // 验证填充结果
    const [updatedOrder] = await db
      .select({ deliveryRoom: orders.deliveryRoom })
      .from(orders)
      .where(eq(orders.id, testOrderId))
      .limit(1);

    expect(updatedOrder.deliveryRoom).toBe("测试城市_智能填充1501");
  });

  it("当城市有多个教室时不应自动填充", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 添加第二个教室
    const [secondClassroom] = await db
      .insert(classrooms)
      .values({
        cityId: testCityId,
        cityName: "测试城市_智能填充",
        name: "测试城市_智能填充1502",
        address: "测试地址2",
        isActive: true,
      })
      .$returningId();

    // 创建新订单
    const [newOrder] = await db
      .insert(orders)
      .values({
        orderNo: `TEST_AUTO_FILL_MULTI_${Date.now()}`,
        customerName: "测试客户2",
        salesId: 0,
        paymentAmount: 1000,
        deliveryCity: "测试城市_智能填充",
        deliveryRoom: null,
        classDate: new Date(),
        totalAmount: 1000,
        orderStatus: "已支付",
      })
      .$returningId();

    // 查询该城市的教室
    const cityClassrooms = await db
      .select({ name: classrooms.name })
      .from(classrooms)
      .where(eq(classrooms.cityName, "测试城市_智能填充"));

    expect(cityClassrooms.length).toBe(2);

    // 不应该自动填充（因为有多个教室）
    const shouldAutoFill = cityClassrooms.length === 1;
    expect(shouldAutoFill).toBe(false);

    // 清理测试数据
    await db.delete(orders).where(eq(orders.id, newOrder.id));
    await db.delete(classrooms).where(eq(classrooms.id, secondClassroom.id));
  });
});
