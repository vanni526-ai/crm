import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { customers, orders } from "../drizzle/schema";
import { eq } from "drizzle-orm";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {} as any,
    res: {} as any,
  };

  return ctx;
}

function createCaller() {
  const ctx = createAuthContext();
  return appRouter.createCaller(ctx);
}

describe("Customer Class Count Statistics", () => {
  let caller: ReturnType<typeof createCaller>;
  let testCustomerId: number;
  let testOrderIds: number[] = [];

  beforeAll(async () => {
    caller = await createCaller();
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建测试客户
    const customerResult = await db.insert(customers).values({
      name: "测试客户-上课次数统计",
      wechatId: "test_classcount_wx",
      phone: "13800138000",
      trafficSource: "测试来源",
      accountBalance: "1000.00",
      createdBy: 1,
    });
    testCustomerId = customerResult[0].insertId;

    // 创建3个测试订单
    for (let i = 1; i <= 3; i++) {
      const orderResult = await db.insert(orders).values({
        orderNo: `TEST_CLASSCOUNT_${Date.now()}_${i}`,
        customerId: testCustomerId,
        customerName: "测试客户-上课次数统计",
        salesId: 1,
        salesPerson: "测试销售",
        paymentAmount: "300.00",
        courseAmount: "300.00",
        status: "paid",
      });
      testOrderIds.push(orderResult[0].insertId);
    }
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // 清理测试数据
    for (const orderId of testOrderIds) {
      await db.delete(orders).where(eq(orders.id, orderId));
    }
    await db.delete(customers).where(eq(customers.id, testCustomerId));
  });

  it("should return correct class count for customer with orders", async () => {
    const allCustomers = await caller.customers.list();
    const testCustomer = allCustomers.find((c: any) => c.id === testCustomerId);

    expect(testCustomer).toBeDefined();
    expect(testCustomer?.classCount).toBe(3);
  });

  it("should return 0 class count for customer without orders", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建一个没有订单的客户
    const customerResult = await db.insert(customers).values({
      name: "测试客户-无订单",
      wechatId: "test_noorders_wx",
      phone: "13900139000",
      createdBy: 1,
    });
    const noOrderCustomerId = customerResult[0].insertId;

    try {
      const allCustomers = await caller.customers.list();
      const noOrderCustomer = allCustomers.find((c: any) => c.id === noOrderCustomerId);

      expect(noOrderCustomer).toBeDefined();
      expect(noOrderCustomer?.classCount).toBe(0);
    } finally {
      // 清理测试数据
      await db.delete(customers).where(eq(customers.id, noOrderCustomerId));
    }
  });

  it("should include classCount field in customer list response", async () => {
    const allCustomers = await caller.customers.list();
    
    expect(allCustomers).toBeDefined();
    expect(Array.isArray(allCustomers)).toBe(true);
    
    if (allCustomers.length > 0) {
      const customer = allCustomers[0];
      expect(customer).toHaveProperty("classCount");
      expect(typeof customer.classCount).toBe("number");
    }
  });
});
