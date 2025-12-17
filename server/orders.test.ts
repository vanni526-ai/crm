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

describe("orders router", () => {
  it("should allow admin to access orders list", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.orders.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should allow sales to access orders list", async () => {
    const { ctx } = createTestContext("sales");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.orders.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should prevent regular user from creating orders", async () => {
    const { ctx } = createTestContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.orders.create({
        orderNo: "TEST001",
        customerId: 1,
        paymentAmount: "1000",
        courseAmount: "1000",
      })
    ).rejects.toThrow("需要销售或管理员权限");
  });

  it("should create an order with all 23 fields", async () => {
    const { ctx } = createTestContext("sales");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.orders.create({
      orderNo: "TEST" + Date.now(),
      customerName: "测试客户",
      salesPerson: "张三",
      trafficSource: "微信朋友圈",
      paymentAmount: "1000.00",
      courseAmount: "900.00",
      accountBalance: "100.00",
      paymentCity: "北京",
      paymentChannel: "微信支付",
      channelOrderNo: "WX123456789",
      paymentDate: "2025-12-17",
      paymentTime: "14:30:00",
      teacherFee: "300.00",
      transportFee: "50.00",
      otherFee: "20.00",
      partnerFee: "100.00",
      finalAmount: "530.00",
      deliveryCity: "北京",
      deliveryRoom: "朝阳教室A",
      deliveryTeacher: "李老师",
      deliveryCourse: "瑜伽基础课",
      classDate: "2025-12-20",
      classTime: "10:00:00",
      notes: "客户要求提前通知",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeGreaterThan(0);
  });

  it("should update an order with new fields", async () => {
    const { ctx } = createTestContext("sales");
    const caller = appRouter.createCaller(ctx);

    // 先创建一个订单
    const createResult = await caller.orders.create({
      orderNo: "TEST" + Date.now(),
      customerName: "测试客户2",
      paymentAmount: "500.00",
      courseAmount: "450.00",
    });

    // 更新订单,添加所有字段
    const updateResult = await caller.orders.update({
      id: createResult.id,
      salesPerson: "王五",
      trafficSource: "抖音广告",
      paymentCity: "上海",
      channelOrderNo: "ALI987654321",
      teacherFee: "200.00",
      deliveryCity: "上海",
      deliveryTeacher: "赵老师",
    });

    expect(updateResult.success).toBe(true);

    // 验证更新后的数据
    const order = await caller.orders.getById({ id: createResult.id });
    expect(order?.salesPerson).toBe("王五");
    expect(order?.trafficSource).toBe("抖音广告");
    expect(order?.paymentCity).toBe("上海");
  });
});

describe("analytics router", () => {
  it("should return order stats for authenticated users", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.orderStats({
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });

    expect(result).toBeDefined();
  });
});
