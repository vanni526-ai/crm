import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

// 创建测试上下文
function createTestContext(role: "user" | "sales" | "admin" = "user") {
  return {
    ctx: {
      user: {
        id: 999,
        openId: "test-user-open-id",
        name: "测试用户",
        nickname: "测试用户",
        role,
        appId: "test-app",
        signedInAt: new Date(),
      },
    },
  };
}

describe("用户下单API测试", () => {
  const createdOrderIds: number[] = [];

  afterAll(async () => {
    // 清理测试数据
    for (const id of createdOrderIds) {
      try {
        await db.deleteOrder(id);
      } catch (e) {
        // 忽略删除错误
      }
    }
  });

  it("普通用户应该能够创建订单", async () => {
    const { ctx } = createTestContext("user");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.orders.userCreate({
      customerName: "测试客户-用户下单",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      deliveryCity: "上海",
      deliveryCourse: "基础课程",
      notes: "用户下单测试",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeGreaterThan(0);
    expect(result.orderNo).toBeDefined();
    const orderId = typeof result.id === 'object' ? (result.id as any).id : result.id;
    createdOrderIds.push(orderId);

    // 验证订单数据
    const order = await db.getOrderById(orderId);
    expect(order).toBeDefined();
    expect(order?.customerName).toBe("测试客户-用户下单");
    expect(order?.salesId).toBe(999); // 记录下单用户ID
    expect(order?.trafficSource).toBe("App用户下单");
    expect(order?.status).toBe("pending");
  });

  it("销售用户也应该能够使用userCreate接口", async () => {
    const { ctx } = createTestContext("sales");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.orders.userCreate({
      customerName: "测试客户-销售下单",
      paymentAmount: "2000.00",
      courseAmount: "2000.00",
      paymentChannel: "微信支付",
      deliveryCity: "北京",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeGreaterThan(0);
    const orderId2 = typeof result.id === 'object' ? (result.id as any).id : result.id;
    createdOrderIds.push(orderId2);
  });

  it("管理员用户也应该能够使用userCreate接口", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.orders.userCreate({
      customerName: "测试客户-管理员下单",
      paymentAmount: "3000.00",
      courseAmount: "3000.00",
      deliveryCity: "天津",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeGreaterThan(0);
    const orderId3 = typeof result.id === 'object' ? (result.id as any).id : result.id;
    createdOrderIds.push(orderId3);
  });

  it("应该能够查询自己创建的订单", async () => {
    const { ctx } = createTestContext("user");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.orders.myOrders({});

    expect(result).toBeDefined();
    expect(result.orders).toBeDefined();
    expect(Array.isArray(result.orders)).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it("应该能够按状态筛选订单", async () => {
    const { ctx } = createTestContext("user");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.orders.myOrders({
      status: "pending",
    });

    expect(result).toBeDefined();
    expect(result.orders).toBeDefined();
    // 所有返回的订单状态应该是pending
    for (const order of result.orders) {
      expect(order.status).toBe("pending");
    }
  });

  it("应该拒绝重复的渠道订单号", async () => {
    const { ctx } = createTestContext("user");
    const caller = appRouter.createCaller(ctx);

    const uniqueChannelOrderNo = `TEST_CHANNEL_${Date.now()}`;

    // 第一次创建应该成功
    const result1 = await caller.orders.userCreate({
      customerName: "测试客户-渠道订单号1",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      channelOrderNo: uniqueChannelOrderNo,
    });
    expect(result1.success).toBe(true);
    const orderId4 = typeof result1.id === 'object' ? (result1.id as any).id : result1.id;
    createdOrderIds.push(orderId4);

    // 第二次使用相同渠道订单号应该失败
    await expect(
      caller.orders.userCreate({
        customerName: "测试客户-渠道订单号2",
        paymentAmount: "1000.00",
        courseAmount: "1000.00",
        channelOrderNo: uniqueChannelOrderNo,
      })
    ).rejects.toThrow("渠道订单号已存在");
  });

  it("未登录用户不能创建订单", async () => {
    const caller = appRouter.createCaller({ user: null } as any);

    await expect(
      caller.orders.userCreate({
        customerName: "测试客户",
        paymentAmount: "1000.00",
        courseAmount: "1000.00",
      })
    ).rejects.toThrow();
  });

  it("应该正确记录所有订单字段", async () => {
    const { ctx } = createTestContext("user");
    const caller = appRouter.createCaller(ctx);

    const orderData = {
      customerName: "完整字段测试客户",
      paymentAmount: "5000.00",
      courseAmount: "4500.00",
      paymentChannel: "支付宝",
      channelOrderNo: `FULL_TEST_${Date.now()}`,
      paymentDate: "2026-02-05",
      paymentTime: "14:30",
      deliveryCity: "武汉",
      deliveryRoom: "瀛姬体验馆",
      deliveryTeacher: "测试老师",
      deliveryCourse: "高级课程",
      classDate: "2026-02-10",
      classTime: "10:00",
      notes: "完整字段测试备注",
    };

    const result = await caller.orders.userCreate(orderData);
    expect(result.success).toBe(true);
    const orderId5 = typeof result.id === 'object' ? (result.id as any).id : result.id;
    createdOrderIds.push(orderId5);

    // 验证所有字段
    const order = await db.getOrderById(orderId5);
    expect(order).toBeDefined();
    expect(order?.customerName).toBe(orderData.customerName);
    expect(order?.paymentAmount).toBe(orderData.paymentAmount);
    expect(order?.courseAmount).toBe(orderData.courseAmount);
    expect(order?.paymentChannel).toBe(orderData.paymentChannel);
    expect(order?.channelOrderNo).toBe(orderData.channelOrderNo);
    expect(order?.deliveryCity).toBe(orderData.deliveryCity);
    expect(order?.deliveryRoom).toBe(orderData.deliveryRoom);
    expect(order?.deliveryTeacher).toBe(orderData.deliveryTeacher);
    expect(order?.deliveryCourse).toBe(orderData.deliveryCourse);
    expect(order?.classTime).toBe(orderData.classTime);
    expect(order?.notes).toBe(orderData.notes);
  });
});
