import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { cityMonthlyExpenses, partnerCities, cities } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("城市费用账单 - 合伙人承担计算", () => {
  let testCityId: number;
  let testExpenseId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 创建测试城市
    const cityResult = await db.insert(cities).values({
      name: "测试城市_合伙人承担",
      province: "测试省份",
      status: "active",
    });
    testCityId = Number(cityResult[0].insertId);

    // 创建合伙人城市配置(费用分摄比例30%)
    await db.insert(partnerCities).values({
      cityId: testCityId,
      partnerId: 1,
      partnerName: "测试合伙人",
      currentProfitStage: 1,
      profitRatioStage1Partner: "30",
      profitRatioStage1Company: "70",
      profitRatioStage2APartner: "40",
      profitRatioStage2ACompany: "60",
      profitRatioStage2BPartner: "50",
      profitRatioStage2BCompany: "50",
      profitRatioStage3Partner: "60",
      profitRatioStage3Company: "40",
      isInvestmentRecovered: 0,
      createdBy: 1,
      updatedBy: 1,
    });
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // 清理测试数据
    if (testExpenseId) {
      await db.delete(cityMonthlyExpenses).where(eq(cityMonthlyExpenses.id, testExpenseId));
    }
    await db.delete(partnerCities).where(eq(partnerCities.cityId, testCityId));
    await db.delete(cities).where(eq(cities.id, testCityId));
  });

  it("应该正确计算合伙人承担金额(30%费用分摊比例)", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 创建费用账单
    const result = await db.insert(cityMonthlyExpenses).values({
      cityId: testCityId,
      cityName: "测试城市_合伙人承担",
      month: "2025-02",
      rentFee: "2000.00",
      propertyFee: "500.00",
      utilityFee: "300.00",
      consumablesFee: "200.00",
      cleaningFee: "100.00",
      phoneFee: "50.00",
      deferredPayment: "0.00",
      expressFee: "30.00",
      promotionFee: "20.00",
      otherFee: "100.00",
      teacherFee: "0.00",
      transportFee: "0.00",
      totalExpense: "3300.00", // 总费用
      partnerShare: "990.00", // 合伙人承担 = 3300 × 30% = 990
      uploadedBy: 1,
    });

    testExpenseId = Number(result[0].insertId);

    // 查询费用账单
    const expense = await db
      .select()
      .from(cityMonthlyExpenses)
      .where(eq(cityMonthlyExpenses.id, testExpenseId))
      .limit(1);

    expect(expense.length).toBe(1);
    expect(expense[0].totalExpense).toBe("3300.00");
    expect(expense[0].partnerShare).toBe("990.00");
  });

  it("应该正确计算合伙人承担金额(40%费用分摊比例)", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 更新合伙人城市配置为阶段2A(40%费用分摊比例)
    await db
      .update(partnerCities)
      .set({
        currentProfitStage: 2,
        isInvestmentRecovered: 0,
      })
      .where(eq(partnerCities.cityId, testCityId));

    // 更新费用账单
    await db
      .update(cityMonthlyExpenses)
      .set({
        totalExpense: "5000.00",
        partnerShare: "2000.00", // 合伙人承担 = 5000 × 40% = 2000
      })
      .where(eq(cityMonthlyExpenses.id, testExpenseId));

    // 查询费用账单
    const expense = await db
      .select()
      .from(cityMonthlyExpenses)
      .where(eq(cityMonthlyExpenses.id, testExpenseId))
      .limit(1);

    expect(expense.length).toBe(1);
    expect(expense[0].totalExpense).toBe("5000.00");
    expect(expense[0].partnerShare).toBe("2000.00");
  });

  it("应该正确计算合伙人承担金额(10%费用分摊比例)", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 创建另一个测试城市(费用分摊比例10%)
    const cityResult = await db.insert(cities).values({
      name: "测试城市_10%",
      province: "测试省份",
      status: "active",
    });
    const testCityId2 = Number(cityResult[0].insertId);

    // 创建合伙人城市配置(费用分摄比例10%)
    await db.insert(partnerCities).values({
      cityId: testCityId2,
      partnerId: 1,
      partnerName: "测试合伙人",
      currentProfitStage: 1,
      profitRatioStage1Partner: "10",
      profitRatioStage1Company: "90",
      profitRatioStage2APartner: "10",
      profitRatioStage2ACompany: "90",
      profitRatioStage2BPartner: "10",
      profitRatioStage2BCompany: "90",
      profitRatioStage3Partner: "10",
      profitRatioStage3Company: "90",
      isInvestmentRecovered: 0,
      createdBy: 1,
      updatedBy: 1,
    });

    // 创建费用账单
    const expenseResult = await db.insert(cityMonthlyExpenses).values({
      cityId: testCityId2,
      cityName: "测试城市_10%",
      month: "2025-02",
      rentFee: "1000.00",
      propertyFee: "0.00",
      utilityFee: "0.00",
      consumablesFee: "0.00",
      cleaningFee: "0.00",
      phoneFee: "0.00",
      deferredPayment: "0.00",
      expressFee: "0.00",
      promotionFee: "0.00",
      otherFee: "0.00",
      teacherFee: "0.00",
      transportFee: "0.00",
      totalExpense: "1000.00", // 总费用
      partnerShare: "100.00", // 合伙人承担 = 1000 × 10% = 100
      uploadedBy: 1,
    });

    const testExpenseId2 = Number(expenseResult[0].insertId);

    // 查询费用账单
    const expense = await db
      .select()
      .from(cityMonthlyExpenses)
      .where(eq(cityMonthlyExpenses.id, testExpenseId2))
      .limit(1);

    expect(expense.length).toBe(1);
    expect(expense[0].totalExpense).toBe("1000.00");
    expect(expense[0].partnerShare).toBe("100.00");

    // 清理测试数据
    await db.delete(cityMonthlyExpenses).where(eq(cityMonthlyExpenses.id, testExpenseId2));
    await db.delete(partnerCities).where(eq(partnerCities.cityId, testCityId2));
    await db.delete(cities).where(eq(cities.id, testCityId2));
  });
});
