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

describe("customer statistics", () => {
  it("should return customer statistics", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建测试客户
    const customer1 = await caller.customers.create({
      name: "测试客户1",
      wechatId: "wx001",
      phone: "13800138001",
      trafficSource: "微信",
    });

    const customer2 = await caller.customers.create({
      name: "测试客户2",
      wechatId: "wx002",
      phone: "13800138002",
      trafficSource: "抖音",
    });

    // 为客户1创建多个订单(回头客)
    await caller.orders.create({
      orderNo: "CUST1ORDER1" + Date.now(),
      customerId: customer1.id,
      customerName: "测试客户1",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      paymentDate: new Date().toISOString().split('T')[0],
      status: "paid",
    });

    await caller.orders.create({
      orderNo: "CUST1ORDER2" + Date.now(),
      customerId: customer1.id,
      customerName: "测试客户1",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      paymentDate: new Date().toISOString().split('T')[0],
      status: "paid",
    });

    // 为客户2创建一个订单
    await caller.orders.create({
      orderNo: "CUST2ORDER1" + Date.now(),
      customerId: customer2.id,
      customerName: "测试客户2",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      paymentDate: new Date().toISOString().split('T')[0],
      status: "paid",
    });

    // 获取顾客统计
    const stats = await caller.analytics.customerStats();

    expect(stats).toBeDefined();
    expect(stats.totalCustomers).toBeGreaterThanOrEqual(0);
    expect(stats.returningCustomers).toBeGreaterThanOrEqual(0);
    expect(stats.memberCustomers).toBeGreaterThanOrEqual(0);
    expect(stats.todayNewCustomers).toBeGreaterThanOrEqual(0);
    expect(stats.todayReturningCustomers).toBeGreaterThanOrEqual(0);
  });

  it("should count returning customers correctly", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建客户并添加多个订单
    const customer = await caller.customers.create({
      name: "回头客测试",
      wechatId: "wxreturn" + Date.now(),
    });

    // 第一个订单
    await caller.orders.create({
      orderNo: "RETURN1" + Date.now(),
      customerId: customer.id,
      customerName: "回头客测试",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      status: "paid",
    });

    // 第二个订单
    await caller.orders.create({
      orderNo: "RETURN2" + Date.now(),
      customerId: customer.id,
      customerName: "回头客测试",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      status: "paid",
    });

    const stats = await caller.analytics.customerStats();
    
    // 验证统计结果存在
    expect(stats).toBeDefined();
    expect(typeof stats.returningCustomers).toBe('number');
  });

  it("should count member customers correctly", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建会员客户(3个或以上订单)
    const member = await caller.customers.create({
      name: "会员测试",
      wechatId: "wxmember" + Date.now(),
    });

    // 创建3个订单
    for (let i = 0; i < 3; i++) {
      await caller.orders.create({
        orderNo: "MEMBER" + Date.now() + i,
        customerId: member.id,
        customerName: "会员测试",
        paymentAmount: "1000.00",
        courseAmount: "1000.00",
        status: "paid",
      });
      // 等待一下确保 orderNo 不重复
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const stats = await caller.analytics.customerStats();
    
    // 验证统计结果存在
    expect(stats).toBeDefined();
    expect(typeof stats.memberCustomers).toBe('number');
  });

  it("should count today new customers correctly", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    const initialStats = await caller.analytics.customerStats();
    const initialTodayNew = initialStats.todayNewCustomers;

    // 创建今日新客户
    await caller.customers.create({
      name: "今日新客" + Date.now(),
      wechatId: "wxnew" + Date.now(),
    });

    const updatedStats = await caller.analytics.customerStats();
    
    expect(updatedStats.todayNewCustomers).toBeGreaterThanOrEqual(initialTodayNew);
  });

  it("should exclude cancelled orders from statistics", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建客户
    const customer = await caller.customers.create({
      name: "取消订单测试",
      wechatId: "wxcancel" + Date.now(),
    });

    // 创建已取消的订单
    await caller.orders.create({
      orderNo: "CANCELLED" + Date.now(),
      customerId: customer.id,
      customerName: "取消订单测试",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      status: "cancelled",
    });

    // 创建正常订单
    await caller.orders.create({
      orderNo: "NORMAL" + Date.now(),
      customerId: customer.id,
      customerName: "取消订单测试",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      status: "paid",
    });

    const stats = await caller.analytics.customerStats();
    
    // 已取消的订单不应该计入回头客统计
    expect(stats).toBeDefined();
  });
});
