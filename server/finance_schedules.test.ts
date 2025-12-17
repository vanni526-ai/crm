import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "admin" | "user" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
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
    res: {} as TrpcContext["res"],
  };
}

describe("schedules router", () => {
  it("should allow authenticated users to list schedules", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.schedules.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should allow authenticated users to create schedules", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const result = await caller.schedules.create({
      customerId: 1,
      courseType: "瑜伽课",
      startTime: now,
      endTime: oneHourLater,
      location: "A教室",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("should allow authenticated users to delete schedules", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 先创建一个排课
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const createResult = await caller.schedules.create({
      customerId: 1,
      courseType: "舞蹈课",
      startTime: now,
      endTime: oneHourLater,
    });

    // 删除刚创建的排课
    const deleteResult = await caller.schedules.delete({ id: createResult.id });

    expect(deleteResult.success).toBe(true);
  });
});

describe("finance data", () => {
  it("should calculate financial stats from orders", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 获取订单列表
    const orders = await caller.orders.list();

    // 计算总收入
    const totalIncome = orders.reduce(
      (sum, order) => sum + parseFloat(order.paymentAmount || "0"),
      0
    );

    // 计算总支出
    const totalExpense = orders.reduce(
      (sum, order) =>
        sum +
        parseFloat(order.teacherFee || "0") +
        parseFloat(order.transportFee || "0") +
        parseFloat(order.partnerFee || "0") +
        parseFloat(order.otherFee || "0"),
      0
    );

    // 计算利润
    const profit = totalIncome - totalExpense;

    expect(totalIncome).toBeGreaterThanOrEqual(0);
    expect(totalExpense).toBeGreaterThanOrEqual(0);
    expect(profit).toBeDefined();
  });
});
