import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("合伙人城市管理和费用明细功能测试", () => {
  let testPartnerId: number;
  let testCityId: number;

  beforeAll(async () => {
    // 获取第一个合伙人用于测试
    const dbInstance = await db.getDb();
    if (!dbInstance) throw new Error("Database not available");
    
    const { partners, partnerExpenses } = await import("../drizzle/schema");
    const partnerList = await dbInstance.select().from(partners).limit(1);
    if (partnerList.length === 0) {
      throw new Error("No partners found in database");
    }
    testPartnerId = partnerList[0].id;

    // 获取第一个城市用于测试
    const cities = await db.getAllCities();
    if (cities.length === 0) {
      throw new Error("No cities found in database");
    }
    testCityId = cities[0].id;

    // 清理测试数据
    const { eq } = await import("drizzle-orm");
    await dbInstance.delete(partnerExpenses).where(eq(partnerExpenses.partnerId, testPartnerId));
  });

  it("应该能够为合伙人分配城市", async () => {
    const result = await db.assignPartnerCities(testPartnerId, [testCityId], 1);
    expect(result).toBe(true);
  });

  it("应该能够查询合伙人关联的城市", async () => {
    const cities = await db.getPartnerCities(testPartnerId);
    expect(cities).toBeDefined();
    expect(Array.isArray(cities)).toBe(true);
    expect(cities.length).toBeGreaterThan(0);
    expect(cities[0]).toHaveProperty("cityId");
    expect(cities[0]).toHaveProperty("cityName");
  });

  it("应该能够创建/更新合伙人费用明细", async () => {
    const expenseData = {
      partnerId: testPartnerId,
      cityId: testCityId,
      month: "2025-02-01",
      rentFee: "5000.00",
      propertyFee: "500.00",
      utilityFee: "300.00",
      consumablesFee: "200.00",
      teacherFee: "0.00",
      transportFee: "0.00",
      otherFee: "100.00",
      deferredPayment: "0.00",
      notes: "测试费用记录",
      createdBy: 1,
    };

    const result = await db.upsertPartnerExpense(expenseData);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("id");
  });

  it("应该能够查询合伙人的费用明细列表", async () => {
    const expenses = await db.getPartnerExpenses(testPartnerId);
    expect(expenses).toBeDefined();
    expect(Array.isArray(expenses)).toBe(true);
    expect(expenses.length).toBeGreaterThan(0);
    expect(expenses[0]).toHaveProperty("rentFee");
    expect(expenses[0]).toHaveProperty("propertyFee");
    expect(expenses[0]).toHaveProperty("utilityFee");
  });

  it("应该能够查询城市订单统计数据", async () => {
    const stats = await db.getPartnerCityOrderStats(testPartnerId);
    expect(stats).toBeDefined();
    expect(Array.isArray(stats)).toBe(true);
    // 统计数据可能为空,因为测试环境可能没有订单数据
    if (stats.length > 0) {
      expect(stats[0]).toHaveProperty("cityId");
      expect(stats[0]).toHaveProperty("cityName");
      expect(stats[0]).toHaveProperty("orderCount");
      expect(stats[0]).toHaveProperty("totalAmount");
    }
  });
});
