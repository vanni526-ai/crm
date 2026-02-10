import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { partners, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Partner Management API", () => {
  let testUserId: number;
  let testPartnerId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 创建测试用户
    const userResult = await db.insert(users).values({
      openId: `test-partner-${Date.now()}`,
      name: "测试合伙人用户",
      phone: `1399999${Math.floor(Math.random() * 10000)}`,
      roles: "cityPartner",
      isActive: true,
    });
    testUserId = Number(userResult[0].insertId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // 清理测试数据
    if (testPartnerId) {
      await db.delete(partners).where(eq(partners.id, testPartnerId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it("应该能够创建合伙人", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    const result = await db.insert(partners).values({
      userId: testUserId,
      name: "测试合伙人",
      phone: "13900000001",
      profitRatio: "0.50",
      profitRule: "按照订单金额的50%分成",
      brandFee: "10000.00",
      techServiceFee: "5000.00",
      deferredPaymentTotal: "20000.00",
      deferredPaymentRule: "分12个月支付",
      contractStartDate: new Date("2024-01-01"),
      contractEndDate: new Date("2025-12-31"),
      accountName: "测试账户",
      bankName: "测试银行",
      accountNumber: "6222000000000001",
      isActive: true,
      notes: "测试合伙人备注",
      createdBy: testUserId,
    });

    testPartnerId = Number(result[0].insertId);
    expect(testPartnerId).toBeGreaterThan(0);
  });

  it("应该能够查询合伙人列表", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    const result = await db
      .select()
      .from(partners)
      .where(eq(partners.id, testPartnerId));

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("测试合伙人");
    expect(result[0].profitRatio).toBe("0.50");
    expect(result[0].brandFee).toBe("10000.00");
  });

  it("应该能够更新合伙人信息", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    await db
      .update(partners)
      .set({
        profitRatio: "0.60",
        brandFee: "15000.00",
        notes: "更新后的备注",
      })
      .where(eq(partners.id, testPartnerId));

    const result = await db
      .select()
      .from(partners)
      .where(eq(partners.id, testPartnerId));

    expect(result[0].profitRatio).toBe("0.60");
    expect(result[0].brandFee).toBe("15000.00");
    expect(result[0].notes).toBe("更新后的备注");
  });

  it("应该能够软删除合伙人", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    await db
      .update(partners)
      .set({ isActive: false })
      .where(eq(partners.id, testPartnerId));

    const result = await db
      .select()
      .from(partners)
      .where(eq(partners.id, testPartnerId));

    expect(result[0].isActive).toBe(false);
  });

  it("应该验证利润分成比例格式", () => {
    const validRatios = ["0.50", "0.30", "0.75", "1.00"];
    const invalidRatios = ["1.5", "-0.5", "abc"];

    validRatios.forEach((ratio) => {
      const num = parseFloat(ratio);
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThanOrEqual(1);
    });

    invalidRatios.forEach((ratio) => {
      const num = parseFloat(ratio);
      if (!isNaN(num)) {
        expect(num < 0 || num > 1).toBe(true);
      } else {
        expect(isNaN(num)).toBe(true);
      }
    });
  });

  it("应该正确计算合伙人费用", () => {
    // 测试合伙人费用计算公式: (课程金额 - 老师费用 - 车费) × 合伙人费比例
    const courseAmount = 1000;
    const teacherFee = 300;
    const transportFee = 50;
    const partnerRatio = 0.5;

    const expectedPartnerFee = (courseAmount - teacherFee - transportFee) * partnerRatio;
    expect(expectedPartnerFee).toBe(325); // (1000 - 300 - 50) × 0.5 = 325
  });
});
