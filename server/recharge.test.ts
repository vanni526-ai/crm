import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock getDb to avoid real DB connections in unit tests
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("membership.createRechargeOrder", () => {
  it("should fail when DB is unavailable", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.membership.createRechargeOrder({
        amount: 100,
        paymentChannel: "wechat",
      })
    ).rejects.toThrow();
  });

  it("should reject amount below minimum (< 1)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.membership.createRechargeOrder({
        amount: 0,
        paymentChannel: "wechat",
      })
    ).rejects.toThrow();
  });

  it("should reject amount above maximum (> 10000)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.membership.createRechargeOrder({
        amount: 10001,
        paymentChannel: "alipay",
      })
    ).rejects.toThrow();
  });

  it("should reject invalid payment channel", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.membership.createRechargeOrder({
        amount: 100,
        paymentChannel: "balance" as "wechat",
      })
    ).rejects.toThrow();
  });
});

describe("membership.getRechargeOrderStatus", () => {
  it("should fail when DB is unavailable", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.membership.getRechargeOrderStatus({ orderId: 999 })
    ).rejects.toThrow();
  });
});

describe("membership.confirmRecharge", () => {
  it("should fail when DB is unavailable", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.membership.confirmRecharge({ orderId: 999 })
    ).rejects.toThrow();
  });
});

describe("analytics.orderStats date filter", () => {
  it("should accept date range input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Should not throw on valid input (DB will fail but input validation passes)
    await expect(
      caller.analytics.orderStats({
        startDate: "2026-03-01",
        endDate: "2026-03-31",
      })
    ).rejects.toThrow("数据库连接失败");
  });

  it("should accept empty input (no date filter)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.analytics.orderStats({})
    ).rejects.toThrow("数据库连接失败");
  });
});
