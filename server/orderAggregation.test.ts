import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { aggregateOrderFeesByMonthAndCity } from "./orderAggregation";
import { getDb } from "./db";
import { orders, cities } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("订单数据汇总计算功能", () => {
  let testCityId: number;
  let testOrderIds: number[] = [];

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 查找测试城市（使用深圳）
    const cityResult = await db
      .select()
      .from(cities)
      .where(eq(cities.name, "深圳"))
      .limit(1);

    if (cityResult.length === 0) {
      throw new Error("未找到深圳城市数据");
    }

    testCityId = cityResult[0].id;

    // 创建测试订单
    const testOrders = [
      {
        orderNo: `TEST-ORDER-${Date.now()}-1`,
        customerName: "测试客户1",
        salesId: 1,
        salesPerson: "测试销售",
        paymentAmount: "1000.00",
        courseAmount: "1000.00",
        deliveryCity: "深圳",
        classDate: new Date("2025-01-15"),
        teacherFee: "200.00",
        transportFee: "50.00",
        status: "completed" as const,
      },
      {
        orderNo: `TEST-ORDER-${Date.now()}-2`,
        customerName: "测试客户2",
        salesId: 1,
        salesPerson: "测试销售",
        paymentAmount: "1500.00",
        courseAmount: "1500.00",
        deliveryCity: "深圳",
        classDate: new Date("2025-01-20"),
        teacherFee: "300.00",
        transportFee: "80.00",
        status: "completed" as const,
      },
    ];

    for (const order of testOrders) {
      const result = await db.insert(orders).values(order);
      testOrderIds.push(Number(result[0].insertId));
    }
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // 清理测试数据
    for (const orderId of testOrderIds) {
      await db.delete(orders).where(eq(orders.id, orderId));
    }
  });

  it("应该正确汇总指定月份和城市的老师费用和车费", async () => {
    const result = await aggregateOrderFeesByMonthAndCity("2025-01", "深圳");

    // 验证老师费用和车费的汇总结果
    expect(parseFloat(result.teacherFee)).toBeGreaterThanOrEqual(500); // 200 + 300 = 500
    expect(parseFloat(result.transportFee)).toBeGreaterThanOrEqual(130); // 50 + 80 = 130
  });

  it("应该对不存在的城市返回零值", async () => {
    const result = await aggregateOrderFeesByMonthAndCity("2025-01", "不存在的城市");

    expect(result.teacherFee).toBe("0.00");
    expect(result.transportFee).toBe("0.00");
  });

  it("应该对不存在的月份返回零值", async () => {
    const result = await aggregateOrderFeesByMonthAndCity("2099-12", "深圳");

    expect(result.teacherFee).toBe("0.00");
    expect(result.transportFee).toBe("0.00");
  });
});
