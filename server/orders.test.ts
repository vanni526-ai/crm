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
