import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Request } from "express";

describe("App Authentication Integration", () => {
  let authToken: string;
  let testUserId: number;

  beforeAll(async () => {
    // 模拟登录获取Token
    const loginCaller = appRouter.createCaller({
      req: {} as Request,
      res: {
        cookie: () => {},
      } as any,
      user: null,
    });

    const loginResult = await loginCaller.auth.loginWithUserAccount({
      phone: "13800138001",
      password: "123456",
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.token).toBeDefined();
    authToken = loginResult.token;
    testUserId = loginResult.user.id;
  });

  it("should login successfully and get token", () => {
    expect(authToken).toBeDefined();
    expect(authToken.length).toBeGreaterThan(0);
    expect(testUserId).toBeTypeOf("number");
  });

  it("should access protected procedure with Authorization header", async () => {
    // 模拟带有Authorization头的请求
    const mockReq = {
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    } as Request;

    // 使用createContext来创建context,会自动调用authenticateRequest
    const { createContext } = await import("./_core/context");
    const ctx = await createContext({
      req: mockReq,
      res: {} as any,
    });

    const caller = appRouter.createCaller(ctx);

    // 测试获取用户信息
    const user = await caller.auth.me();
    expect(user).toBeDefined();
    expect(user?.id).toBe(testUserId);
    expect(user?.name).toBe("appuser");
  });

  it("should fail to create order with user role (requires sales/admin)", async () => {
    const mockReq = {
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    } as Request;

    // 使用createContext来创建context
    const { createContext } = await import("./_core/context");
    const ctx = await createContext({
      req: mockReq,
      res: {} as any,
    });

    const caller = appRouter.createCaller(ctx);

    // 测试创建订单(应该失败,因为appuser角色是user,不是sales/admin)
    await expect(
      caller.orders.create({
      customerName: "App测试用户",
      courseAmount: 3000,
      paymentAmount: 3000,
      accountBalance: 0,
      paymentChannel: "微信",
      channelOrderNo: `TEST${Date.now()}`,
      paymentDate: "2026-02-15",
      paymentTime: "14:00",
      deliveryCity: "上海",
      deliveryClassroomId: 76,
      deliveryRoom: "上海1101",
      deliveryTeacher: "测试老师1",
      deliveryCourse: "1V1 女王深度局",
      classDate: "2026-02-15",
      classTime: "14:00-16:00",
      status: "paid",
    })
    ).rejects.toThrow("需要销售或管理员权限");
  });

  it("should fail to create order without Authorization header", async () => {
    const mockReq = {
      headers: {},
    } as Request;

    // 使用createContext来创建context
    const { createContext } = await import("./_core/context");
    const ctx = await createContext({
      req: mockReq,
      res: {} as any,
    });

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.orders.create({
        customerName: "测试用户",
        courseAmount: 1000,
        paymentAmount: 1000,
        accountBalance: 0,
        paymentChannel: "微信",
        channelOrderNo: `TEST${Date.now()}`,
        paymentDate: "2026-02-15",
        paymentTime: "14:00",
        deliveryCity: "上海",
        deliveryClassroomId: 76,
        deliveryRoom: "上海1101",
        deliveryTeacher: "测试老师1",
        deliveryCourse: "测试课程",
        classDate: "2026-02-15",
        classTime: "14:00-16:00",
        status: "paid",
      })
    ).rejects.toThrow();
  });

  it("should fail to create order with invalid token", async () => {
    const mockReq = {
      headers: {
        authorization: "Bearer invalid-token-12345",
      },
    } as Request;

    // 使用createContext来创建context
    const { createContext } = await import("./_core/context");
    const ctx = await createContext({
      req: mockReq,
      res: {} as any,
    });

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.orders.create({
        customerName: "测试用户",
        courseAmount: 1000,
        paymentAmount: 1000,
        accountBalance: 0,
        paymentChannel: "微信",
        channelOrderNo: `TEST${Date.now()}`,
        paymentDate: "2026-02-15",
        paymentTime: "14:00",
        deliveryCity: "上海",
        deliveryClassroomId: 76,
        deliveryRoom: "上海1101",
        deliveryTeacher: "测试老师1",
        deliveryCourse: "测试课程",
        classDate: "2026-02-15",
        classTime: "14:00-16:00",
        status: "paid",
      })
    ).rejects.toThrow();
  });
});
