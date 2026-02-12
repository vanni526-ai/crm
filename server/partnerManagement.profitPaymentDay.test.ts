import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { partners, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("合伙人管理 - 分红支付日更新功能", () => {
  let testPartnerId: number;
  let testUserId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 创建测试用户
    const userResult = await db
      .insert(users)
      .values({
        username: "test_profit_payment_" + Date.now(),
        name: "测试分红支付日",
        phone: "13900000" + Math.floor(Math.random() * 1000),
        password: "123456",
        role: "cityPartner",
      })
      .$returningId();

    testUserId = userResult[0].id;

    // 创建测试合伙人
    const partnerResult = await db
      .insert(partners)
      .values({
        name: "测试分红支付日",
        phone: "13900000" + Math.floor(Math.random() * 1000),
        userId: testUserId,
        profitRatio: "0.10", // 必填字段
        expenseCoverage: JSON.stringify({ transportation: true, accommodation: true }), // 必填字段
        profitPaymentDay: 25, // 默认值
        createdBy: testUserId, // 必填字段
      })
      .$returningId();

    testPartnerId = partnerResult[0].id;
  });

  it("应该成功更新合伙人的分红支付日", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        username: "test_user",
        name: "测试用户",
        openId: "test_openid",
        role: "admin",
      },
    });

    // 更新分红支付日为15号
    const result = await caller.partnerManagement.update({
      id: testPartnerId,
      profitPaymentDay: 15,
    });

    expect(result.success).toBe(true);

    // 验证数据库中的值是否已更新
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    const updatedPartner = await db
      .select()
      .from(partners)
      .where(eq(partners.id, testPartnerId))
      .limit(1);

    expect(updatedPartner[0].profitPaymentDay).toBe(15);
  });

  it("应该成功更新合伙人的分红支付日为1号", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        username: "test_user",
        name: "测试用户",
        openId: "test_openid",
        role: "admin",
      },
    });

    // 更新分红支付日为1号
    const result = await caller.partnerManagement.update({
      id: testPartnerId,
      profitPaymentDay: 1,
    });

    expect(result.success).toBe(true);

    // 验证数据库中的值是否已更新
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    const updatedPartner = await db
      .select()
      .from(partners)
      .where(eq(partners.id, testPartnerId))
      .limit(1);

    expect(updatedPartner[0].profitPaymentDay).toBe(1);
  });

  it("应该成功更新合伙人的分红支付日为31号", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        username: "test_user",
        name: "测试用户",
        openId: "test_openid",
        role: "admin",
      },
    });

    // 更新分红支付日为31号
    const result = await caller.partnerManagement.update({
      id: testPartnerId,
      profitPaymentDay: 31,
    });

    expect(result.success).toBe(true);

    // 验证数据库中的值是否已更新
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    const updatedPartner = await db
      .select()
      .from(partners)
      .where(eq(partners.id, testPartnerId))
      .limit(1);

    expect(updatedPartner[0].profitPaymentDay).toBe(31);
  });

  it("应该成功同时更新账户信息和分红支付日", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        username: "test_user",
        name: "测试用户",
        openId: "test_openid",
        role: "admin",
      },
    });

    // 同时更新账户信息和分红支付日
    const result = await caller.partnerManagement.update({
      id: testPartnerId,
      accountName: "测试账户名",
      bankName: "测试银行",
      accountNumber: "1234567890",
      profitPaymentDay: 20,
    });

    expect(result.success).toBe(true);

    // 验证数据库中的值是否已更新
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    const updatedPartner = await db
      .select()
      .from(partners)
      .where(eq(partners.id, testPartnerId))
      .limit(1);

    expect(updatedPartner[0].accountName).toBe("测试账户名");
    expect(updatedPartner[0].bankName).toBe("测试银行");
    expect(updatedPartner[0].accountNumber).toBe("1234567890");
    expect(updatedPartner[0].profitPaymentDay).toBe(20);
  });
});
