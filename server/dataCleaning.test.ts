import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { orders } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { standardizeClassroom } from "./classroomMappingRules";

describe("数据清洗功能测试", () => {
  let testOrderId: number;
  let database: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    database = await getDb();
    if (!database) {
      throw new Error("数据库连接失败");
    }

    // 创建测试订单
    const [result] = await database.insert(orders).values({
      orderNo: `TEST_CLEAN_${Date.now()}`,
      salesId: 1,
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      deliveryCity: null, // 城市为空
      deliveryRoom: "长风1101", // 需要清洗的教室名称
      status: "pending",
      deliveryStatus: "pending",
    });

    testOrderId = result.insertId;
  });

  afterAll(async () => {
    if (database && testOrderId) {
      // 清理测试数据
      await database.delete(orders).where(eq(orders.id, testOrderId));
    }
  });

  it("应该正确识别需要清洗的教室名称", async () => {
    if (!database) throw new Error("数据库未初始化");

    const [order] = await database
      .select({
        deliveryRoom: orders.deliveryRoom,
        deliveryCity: orders.deliveryCity,
      })
      .from(orders)
      .where(eq(orders.id, testOrderId))
      .limit(1);

    expect(order).toBeDefined();
    expect(order.deliveryRoom).toBe("长风1101");

    // 测试标准化函数
    const standardized = standardizeClassroom(
      order.deliveryRoom!,
      order.deliveryCity || undefined
    );

    expect(standardized).toBeDefined();
    expect(standardized?.city).toBe("上海");
    expect(standardized?.classroom).toBe("上海1101");
  });

  it("应该正确清洗订单数据", async () => {
    if (!database) throw new Error("数据库未初始化");

    // 获取原始数据
    const [originalOrder] = await database
      .select({
        deliveryRoom: orders.deliveryRoom,
        deliveryCity: orders.deliveryCity,
      })
      .from(orders)
      .where(eq(orders.id, testOrderId))
      .limit(1);

    expect(originalOrder.deliveryRoom).toBe("长风1101");

    // 执行清洗
    const standardized = standardizeClassroom(
      originalOrder.deliveryRoom!,
      originalOrder.deliveryCity || undefined
    );

    if (standardized) {
      await database
        .update(orders)
        .set({
          deliveryCity: standardized.city,
          deliveryRoom: standardized.classroom,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, testOrderId));
    }

    // 验证清洗后的数据
    const [cleanedOrder] = await database
      .select({
        deliveryRoom: orders.deliveryRoom,
        deliveryCity: orders.deliveryCity,
      })
      .from(orders)
      .where(eq(orders.id, testOrderId))
      .limit(1);

    expect(cleanedOrder.deliveryCity).toBe("上海");
    expect(cleanedOrder.deliveryRoom).toBe("上海1101");
  });

  it("应该正确处理各种教室名称格式", () => {
    // 测试上海教室映射
    const test1 = standardizeClassroom("长风1101");
    expect(test1?.city).toBe("上海");
    expect(test1?.classroom).toBe("上海1101");

    const test2 = standardizeClassroom("长风北岸404");
    expect(test2?.city).toBe("上海");
    expect(test2?.classroom).toBe("上海404");

    // 测试城市名映射
    const test3 = standardizeClassroom("深圳");
    expect(test3?.city).toBe("深圳");
    expect(test3?.classroom).toBe("深圳1309");

    const test4 = standardizeClassroom("深圳教室");
    expect(test4?.city).toBe("深圳");
    expect(test4?.classroom).toBe("深圳1309");

    // 测试已标准化的名称
    const test5 = standardizeClassroom("上海1101", "上海");
    expect(test5?.city).toBe("上海");
    expect(test5?.classroom).toBe("上海1101");

    // 测试石家庄教室（只有城市名）
    const test6 = standardizeClassroom("石家庄");
    expect(test6?.city).toBe("石家庄");
    expect(test6?.classroom).toBe("石家庄教室");
  });

  it("应该正确处理null和undefined值", () => {
    const test1 = standardizeClassroom("", undefined);
    expect(test1).toBeNull();

    const test2 = standardizeClassroom("未知教室", undefined);
    expect(test2).toBeNull();
  });

  it("应该将所有天津教室变体标准化为天津1501", () => {
    const testCases = [
      { input: "天津教室", expected: "天津1501" },
      { input: "天津1501", expected: "天津1501" },
      { input: "(天津)", expected: "天津1501" },
      { input: "天津场", expected: "天津1501" },
      { input: "天津上", expected: "天津1501" },
      { input: "天津", expected: "天津1501" },
    ];

    for (const testCase of testCases) {
      const result = standardizeClassroom(testCase.input, "天津");
      expect(result).toBeDefined();
      expect(result?.classroom).toBe(testCase.expected);
      expect(result?.city).toBe("天津");
    }
  });

  it("应该不匹配垃圾数据", () => {
    const result = standardizeClassroom("ゴミ箱", "天津");
    expect(result).toBeNull();
  });
});
