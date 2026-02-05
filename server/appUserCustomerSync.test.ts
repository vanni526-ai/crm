import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, customers, orders } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import * as db from "./db";

describe("App用户下单自动关联业务客户", () => {
  let testUserId: number;
  let testCustomerId: number | null = null;
  const testPhone = `199${Date.now().toString().slice(-8)}`;

  beforeAll(async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error("Database not available");

    // 创建测试用户
    const result = await drizzle.insert(users).values({
      openId: `test_user_${Date.now()}`,
      name: "测试App用户",
      phone: testPhone,
      role: "user",
      isActive: true,
      loginMethod: "phone",
    });
    testUserId = (result[0] as any).insertId;
  });

  afterAll(async () => {
    const drizzle = await getDb();
    if (!drizzle) return;

    // 清理测试数据
    if (testCustomerId) {
      await drizzle.delete(customers).where(eq(customers.id, testCustomerId));
    }
    await drizzle.delete(users).where(eq(users.id, testUserId));
  });

  it("应该为新用户自动创建业务客户", async () => {
    const result = await db.getOrCreateCustomerForUser({
      id: testUserId,
      name: "测试App用户",
      phone: testPhone,
    });

    expect(result.customerId).toBeGreaterThan(0);
    expect(result.customerName).toBe("测试App用户");
    expect(result.isNew).toBe(true);

    testCustomerId = result.customerId;
  });

  it("再次调用应该返回已存在的业务客户", async () => {
    const result = await db.getOrCreateCustomerForUser({
      id: testUserId,
      name: "测试App用户",
      phone: testPhone,
    });

    expect(result.customerId).toBe(testCustomerId);
    expect(result.isNew).toBe(false);
  });

  it("业务客户应该关联到用户", async () => {
    const customer = await db.getCustomerByUserId(testUserId);
    expect(customer).not.toBeNull();
    expect(customer?.id).toBe(testCustomerId);
    expect(customer?.userId).toBe(testUserId);
  });

  it("业务客户应该有正确的手机号", async () => {
    const customer = await db.getCustomerByPhone(testPhone);
    expect(customer).not.toBeNull();
    expect(customer?.id).toBe(testCustomerId);
    expect(customer?.phone).toBe(testPhone);
  });

  it("业务客户应该有正确的流量来源", async () => {
    const customer = await db.getCustomerByUserId(testUserId);
    expect(customer?.trafficSource).toBe("App注册");
  });
});

describe("通过手机号匹配已存在的业务客户", () => {
  let testUserId: number;
  let existingCustomerId: number;
  const testPhone = `188${Date.now().toString().slice(-8)}`;

  beforeAll(async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error("Database not available");

    // 先创建一个业务客户(没有关联用户)
    const customerResult = await drizzle.insert(customers).values({
      name: "已存在的客户",
      phone: testPhone,
      trafficSource: "微信",
      createdBy: 1,
    });
    existingCustomerId = (customerResult[0] as any).insertId;

    // 再创建一个用户(手机号相同)
    const userResult = await drizzle.insert(users).values({
      openId: `test_match_${Date.now()}`,
      name: "新注册用户",
      phone: testPhone,
      role: "user",
      isActive: true,
      loginMethod: "phone",
    });
    testUserId = (userResult[0] as any).insertId;
  });

  afterAll(async () => {
    const drizzle = await getDb();
    if (!drizzle) return;

    await drizzle.delete(customers).where(eq(customers.id, existingCustomerId));
    await drizzle.delete(users).where(eq(users.id, testUserId));
  });

  it("应该匹配已存在的业务客户并关联", async () => {
    const result = await db.getOrCreateCustomerForUser({
      id: testUserId,
      name: "新注册用户",
      phone: testPhone,
    });

    expect(result.customerId).toBe(existingCustomerId);
    expect(result.customerName).toBe("已存在的客户");
    expect(result.isNew).toBe(false);
  });

  it("已存在的业务客户应该被关联到新用户", async () => {
    const customer = await db.getCustomerByUserId(testUserId);
    expect(customer).not.toBeNull();
    expect(customer?.id).toBe(existingCustomerId);
    expect(customer?.userId).toBe(testUserId);
  });
});
