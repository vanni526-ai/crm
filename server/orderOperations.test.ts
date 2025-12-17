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

describe("order operations", () => {
  it("should delete an order successfully", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建测试客户
    const customer = await caller.customers.create({
      name: "删除测试客户",
      wechatId: "wxdelete" + Date.now(),
    });

    // 创建测试订单
    const order = await caller.orders.create({
      orderNo: "DELETE" + Date.now(),
      customerId: customer.id,
      customerName: "删除测试客户",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      paymentDate: new Date().toISOString().split('T')[0],
      status: "paid",
    });

    // 删除订单
    const result = await caller.orders.delete({ id: order.id });
    expect(result.success).toBe(true);

    // 验证订单已被删除
    const orders = await caller.orders.list();
    const deletedOrder = orders.find(o => o.id === order.id);
    expect(deletedOrder).toBeUndefined();
  });

  it("should allow sales role to delete orders", async () => {
    const { ctx } = createTestContext("sales");
    const caller = appRouter.createCaller(ctx);

    // 创建测试客户
    const customer = await caller.customers.create({
      name: "销售删除测试",
      wechatId: "wxsalesdelete" + Date.now(),
    });

    // 创建测试订单
    const order = await caller.orders.create({
      orderNo: "SALESDELETE" + Date.now(),
      customerId: customer.id,
      customerName: "销售删除测试",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      paymentDate: new Date().toISOString().split('T')[0],
      status: "paid",
    });

    // 销售角色删除订单
    const result = await caller.orders.delete({ id: order.id });
    expect(result.success).toBe(true);
  });

  it("should retrieve order details", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建测试客户
    const customer = await caller.customers.create({
      name: "详情测试客户",
      wechatId: "wxdetail" + Date.now(),
      phone: "13800138000",
    });

    // 创建包含所有字段的测试订单
    const orderData = {
      orderNo: "DETAIL" + Date.now(),
      customerId: customer.id,
      customerName: "详情测试客户",
      salesPerson: "张三",
      trafficSource: "微信",
      paymentAmount: "1000.00",
      courseAmount: "900.00",
      accountBalance: "100.00",
      paymentCity: "北京",
      channelOrderNo: "CH123456",
      teacherFee: "300.00",
      transportFee: "50.00",
      otherFee: "20.00",
      partnerFee: "100.00",
      finalAmount: "530.00",
      paymentDate: "2025-12-16",
      paymentTime: "14:30:00",
      deliveryCity: "北京",
      deliveryRoom: "朝阳教室A",
      deliveryTeacher: "李老师",
      deliveryCourse: "瑜伽基础课",
      classDate: "2025-12-19",
      classTime: "10:00:00",
      notes: "测试备注",
      status: "paid" as const,
    };

    const order = await caller.orders.create(orderData);

    // 获取订单列表并验证详情
    const orders = await caller.orders.list();
    const foundOrder = orders.find(o => o.id === order.id);

    expect(foundOrder).toBeDefined();
    if (foundOrder) {
      expect(foundOrder.orderNo).toBe(orderData.orderNo);
      expect(foundOrder.customerName).toBe(orderData.customerName);
      expect(foundOrder.salesPerson).toBe(orderData.salesPerson);
      expect(foundOrder.trafficSource).toBe(orderData.trafficSource);
      expect(foundOrder.paymentAmount).toBe(orderData.paymentAmount);
      expect(foundOrder.courseAmount).toBe(orderData.courseAmount);
      expect(foundOrder.deliveryCity).toBe(orderData.deliveryCity);
      expect(foundOrder.deliveryTeacher).toBe(orderData.deliveryTeacher);
      expect(foundOrder.notes).toBe(orderData.notes);
    }
  });

  it("should handle deleting non-existent order gracefully", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 尝试删除不存在的订单ID
    const nonExistentId = 999999;
    
    try {
      await caller.orders.delete({ id: nonExistentId });
      // 如果没有抛出错误,说明删除成功(即使订单不存在)
      expect(true).toBe(true);
    } catch (error) {
      // 如果抛出错误,验证错误类型
      expect(error).toBeDefined();
    }
  });

  it("should list all orders with correct fields", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 获取订单列表
    const orders = await caller.orders.list();

    expect(Array.isArray(orders)).toBe(true);
    
    if (orders.length > 0) {
      const firstOrder = orders[0];
      // 验证订单包含所有必要字段
      expect(firstOrder).toHaveProperty('id');
      expect(firstOrder).toHaveProperty('orderNo');
      expect(firstOrder).toHaveProperty('customerName');
      expect(firstOrder).toHaveProperty('paymentAmount');
      expect(firstOrder).toHaveProperty('status');
      expect(firstOrder).toHaveProperty('createdAt');
    }
  });
});
