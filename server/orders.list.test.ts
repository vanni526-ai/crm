import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Request } from "express";

describe("orders.list Token Authentication", () => {
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
      username: "appuser",
      password: "123456",
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.token).toBeDefined();
    authToken = loginResult.token;
    testUserId = loginResult.user.id;
  });

  it("should authenticate with token and list orders", async () => {
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

    // 测试获取订单列表
    const orders = await caller.orders.list();
    
    expect(orders).toBeDefined();
    expect(Array.isArray(orders)).toBe(true);
    console.log(`[Test] Successfully fetched ${orders.length} orders`);
  });

  it("should authenticate with token and filter orders by channelOrderNo", async () => {
    const mockReq = {
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    } as Request;

    const { createContext } = await import("./_core/context");
    const ctx = await createContext({
      req: mockReq,
      res: {} as any,
    });

    const caller = appRouter.createCaller(ctx);

    // 测试按渠道订单号筛选
    const orders = await caller.orders.list({
      channelOrderNo: "WX1770189969560",
    });
    
    expect(orders).toBeDefined();
    expect(Array.isArray(orders)).toBe(true);
    console.log(`[Test] Successfully filtered ${orders.length} orders by channelOrderNo`);
  });

  it("should fail without authorization header", async () => {
    const mockReq = {
      headers: {},
    } as Request;

    const { createContext } = await import("./_core/context");
    const ctx = await createContext({
      req: mockReq,
      res: {} as any,
    });

    const caller = appRouter.createCaller(ctx);

    await expect(caller.orders.list()).rejects.toThrow();
  });

  it("should fail with invalid token", async () => {
    const mockReq = {
      headers: {
        authorization: "Bearer invalid-token-12345",
      },
    } as Request;

    const { createContext } = await import("./_core/context");
    const ctx = await createContext({
      req: mockReq,
      res: {} as any,
    });

    const caller = appRouter.createCaller(ctx);

    await expect(caller.orders.list()).rejects.toThrow();
  });
});
