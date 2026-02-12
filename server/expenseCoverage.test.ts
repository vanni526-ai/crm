import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { partners, partnerExpenses } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("费用承担功能测试", () => {
  let testPartnerId: number;
  let testExpenseId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 查找一个测试合伙人
    const partnerResult = await db
      .select()
      .from(partners)
      .limit(1);

    if (partnerResult.length === 0) {
      throw new Error("没有找到测试合伙人");
    }

    testPartnerId = partnerResult[0].id;
  });

  it("应该能够获取合伙人的费用承担配置", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, name: "测试用户", email: "test@example.com", role: "admin" },
    });

    const result = await caller.partnerManagement.getExpenseCoverage({
      partnerId: testPartnerId,
    });

    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
    // 验证所有费用项目字段都存在
    expect(result).toHaveProperty("rentFee");
    expect(result).toHaveProperty("propertyFee");
    expect(result).toHaveProperty("utilityFee");
    expect(result).toHaveProperty("consumablesFee");
    expect(result).toHaveProperty("cleaningFee");
    expect(result).toHaveProperty("phoneFee");
    expect(result).toHaveProperty("deferredPayment");
    expect(result).toHaveProperty("courierFee");
    expect(result).toHaveProperty("promotionFee");
    expect(result).toHaveProperty("teacherFee");
    expect(result).toHaveProperty("transportFee");
    expect(result).toHaveProperty("otherFee");
  });

  it("应该能够更新合伙人的费用承担配置", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, name: "测试用户", email: "test@example.com", role: "admin" },
    });

    const testCoverage = {
      rentFee: true,
      propertyFee: true,
      utilityFee: true,
      consumablesFee: false,
      cleaningFee: false,
      phoneFee: false,
      deferredPayment: false,
      courierFee: false,
      promotionFee: false,
      teacherFee: false,
      transportFee: false,
      otherFee: false,
    };

    const updateResult = await caller.partnerManagement.updateExpenseCoverage({
      partnerId: testPartnerId,
      expenseCoverage: testCoverage,
    });

    expect(updateResult.success).toBe(true);

    // 验证更新后的配置
    const getResult = await caller.partnerManagement.getExpenseCoverage({
      partnerId: testPartnerId,
    });

    expect(getResult.rentFee).toBe(true);
    expect(getResult.propertyFee).toBe(true);
    expect(getResult.utilityFee).toBe(true);
    expect(getResult.consumablesFee).toBe(false);
  });

  it("应该能够正确计算合伙人承担总费用", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    const caller = appRouter.createCaller({
      user: { id: 1, name: "测试用户", email: "test@example.com", role: "admin" },
    });

    // 设置费用承担配置：只承担房租和物业费
    await caller.partnerManagement.updateExpenseCoverage({
      partnerId: testPartnerId,
      expenseCoverage: {
        rentFee: true,
        propertyFee: true,
        utilityFee: false,
        consumablesFee: false,
        cleaningFee: false,
        phoneFee: false,
        deferredPayment: false,
        courierFee: false,
        promotionFee: false,
        teacherFee: false,
        transportFee: false,
        otherFee: false,
      },
    });

    // 获取费用明细列表
    const expenses = await caller.partnerManagement.getExpenses({
      partnerId: testPartnerId,
    });

    expect(expenses).toBeDefined();
    expect(Array.isArray(expenses)).toBe(true);

    if (expenses.length > 0) {
      const firstExpense = expenses[0];
      
      // 验证返回的数据包含partnerCoveredTotal字段
      expect(firstExpense).toHaveProperty("partnerCoveredTotal");
      
      // 手动计算合伙人承担总费用
      const rentFee = Number(firstExpense.rentFee || 0);
      const propertyFee = Number(firstExpense.propertyFee || 0);
      const expenseShareRatio = Number(firstExpense.expenseShareRatio || 0) / 100;
      const expectedTotal = (rentFee + propertyFee) * expenseShareRatio;
      
      // 验证计算结果
      expect(Number(firstExpense.partnerCoveredTotal)).toBeCloseTo(expectedTotal, 2);
    }
  });

  it("应该在没有配置时返回默认值（全部不承担）", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    const caller = appRouter.createCaller({
      user: { id: 1, name: "测试用户", email: "test@example.com", role: "admin" },
    });

    // 清空费用承担配置
    await db
      .update(partners)
      .set({ expenseCoverage: null })
      .where(eq(partners.id, testPartnerId));

    // 获取配置
    const result = await caller.partnerManagement.getExpenseCoverage({
      partnerId: testPartnerId,
    });

    // 验证所有字段都是false
    expect(result.rentFee).toBe(false);
    expect(result.propertyFee).toBe(false);
    expect(result.utilityFee).toBe(false);
    expect(result.consumablesFee).toBe(false);
    expect(result.cleaningFee).toBe(false);
    expect(result.phoneFee).toBe(false);
    expect(result.deferredPayment).toBe(false);
    expect(result.courierFee).toBe(false);
    expect(result.promotionFee).toBe(false);
    expect(result.teacherFee).toBe(false);
    expect(result.transportFee).toBe(false);
    expect(result.otherFee).toBe(false);
  });
});
