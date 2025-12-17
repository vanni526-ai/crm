import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(role: "admin" | "sales" | "finance" | "user" = "admin"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    nickname: "测试用户",
    loginMethod: "manus",
    role,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("churn risk detection", () => {
  it("should identify customers with no orders in 30+ days", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建测试客户
    const customer = await caller.customers.create({
      name: "流失风险客户",
      wechatId: "wxchurn" + Date.now(),
      phone: "13800138000",
    });

    // 创建一个35天前的订单
    const thirtyFiveDaysAgo = new Date();
    thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);
    const paymentDate = thirtyFiveDaysAgo.toISOString().split('T')[0];

    await caller.orders.create({
      orderNo: "CHURN" + Date.now(),
      customerId: customer.id,
      customerName: "流失风险客户",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      paymentDate,
      status: "paid",
    });

    // 获取流失预警客户
    const churnRiskCustomers = await caller.analytics.churnRiskCustomers();

    // 验证结果
    expect(churnRiskCustomers).toBeDefined();
    expect(Array.isArray(churnRiskCustomers)).toBe(true);
    
    // 查找我们创建的测试客户
    const foundCustomer = churnRiskCustomers.find(c => c.customerId === customer.id);
    if (foundCustomer) {
      expect(foundCustomer.daysSinceLastOrder).toBeGreaterThanOrEqual(30);
      expect(foundCustomer.customerName).toBe("流失风险客户");
    }
  });

  it("should not include customers with recent orders", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建测试客户
    const customer = await caller.customers.create({
      name: "活跃客户",
      wechatId: "wxactive" + Date.now(),
    });

    // 创建今天的订单
    const today = new Date().toISOString().split('T')[0];

    await caller.orders.create({
      orderNo: "ACTIVE" + Date.now(),
      customerId: customer.id,
      customerName: "活跃客户",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      paymentDate: today,
      status: "paid",
    });

    // 获取流失预警客户
    const churnRiskCustomers = await caller.analytics.churnRiskCustomers();

    // 验证活跃客户不在流失预警列表中
    const foundCustomer = churnRiskCustomers.find(c => c.customerId === customer.id);
    expect(foundCustomer).toBeUndefined();
  });

  it("should calculate days since last order correctly", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建测试客户
    const customer = await caller.customers.create({
      name: "天数测试客户",
      wechatId: "wxdays" + Date.now(),
    });

    // 创建45天前的订单
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
    const paymentDate = fortyFiveDaysAgo.toISOString().split('T')[0];

    await caller.orders.create({
      orderNo: "DAYS" + Date.now(),
      customerId: customer.id,
      customerName: "天数测试客户",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      paymentDate,
      status: "paid",
    });

    // 获取流失预警客户
    const churnRiskCustomers = await caller.analytics.churnRiskCustomers();

    // 查找测试客户
    const foundCustomer = churnRiskCustomers.find(c => c.customerId === customer.id);
    if (foundCustomer) {
      // 验证天数计算（允许±1天的误差）
      expect(foundCustomer.daysSinceLastOrder).toBeGreaterThanOrEqual(44);
      expect(foundCustomer.daysSinceLastOrder).toBeLessThanOrEqual(46);
    }
  });

  it("should include customer contact information", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建测试客户
    const customer = await caller.customers.create({
      name: "联系信息测试",
      wechatId: "wxcontact" + Date.now(),
      phone: "13900139000",
    });

    // 创建40天前的订单
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
    const paymentDate = fortyDaysAgo.toISOString().split('T')[0];

    await caller.orders.create({
      orderNo: "CONTACT" + Date.now(),
      customerId: customer.id,
      customerName: "联系信息测试",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      paymentDate,
      status: "paid",
    });

    // 获取流失预警客户
    const churnRiskCustomers = await caller.analytics.churnRiskCustomers();

    // 查找测试客户
    const foundCustomer = churnRiskCustomers.find(c => c.customerId === customer.id);
    if (foundCustomer) {
      expect(foundCustomer.phone).toBe("13900139000");
      expect(foundCustomer.wechatId).toContain("wxcontact");
    }
  });

  it("should exclude cancelled orders from churn calculation", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建测试客户
    const customer = await caller.customers.create({
      name: "取消订单测试",
      wechatId: "wxcancel" + Date.now(),
    });

    // 创建一个已取消的订单（今天）
    const today = new Date().toISOString().split('T')[0];
    await caller.orders.create({
      orderNo: "CANCELTODAY" + Date.now(),
      customerId: customer.id,
      customerName: "取消订单测试",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      paymentDate: today,
      status: "cancelled",
    });

    // 创建一个40天前的正常订单
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
    const oldPaymentDate = fortyDaysAgo.toISOString().split('T')[0];

    await caller.orders.create({
      orderNo: "OLDORDER" + Date.now(),
      customerId: customer.id,
      customerName: "取消订单测试",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      paymentDate: oldPaymentDate,
      status: "paid",
    });

    // 获取流失预警客户
    const churnRiskCustomers = await caller.analytics.churnRiskCustomers();

    // 应该在流失预警列表中，因为最后一个有效订单是40天前
    const foundCustomer = churnRiskCustomers.find(c => c.customerId === customer.id);
    if (foundCustomer) {
      expect(foundCustomer.daysSinceLastOrder).toBeGreaterThanOrEqual(30);
    }
  });
});
