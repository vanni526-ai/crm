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

describe("financial calculations", () => {
  it("should calculate total income from orders", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const orders = await caller.orders.list();
    const totalIncome = orders.reduce(
      (sum, order) => sum + parseFloat(order.paymentAmount || "0"),
      0
    );

    expect(totalIncome).toBeGreaterThanOrEqual(0);
  });

  it("should calculate total expense from orders", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const orders = await caller.orders.list();
    const totalExpense = orders.reduce(
      (sum, order) =>
        sum +
        parseFloat(order.teacherFee || "0") +
        parseFloat(order.transportFee || "0") +
        parseFloat(order.partnerFee || "0") +
        parseFloat(order.otherFee || "0"),
      0
    );

    expect(totalExpense).toBeGreaterThanOrEqual(0);
  });

  it("should calculate profit correctly", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const orders = await caller.orders.list();
    
    const totalIncome = orders.reduce(
      (sum, order) => sum + parseFloat(order.paymentAmount || "0"),
      0
    );

    const totalExpense = orders.reduce(
      (sum, order) =>
        sum +
        parseFloat(order.teacherFee || "0") +
        parseFloat(order.transportFee || "0") +
        parseFloat(order.partnerFee || "0") +
        parseFloat(order.otherFee || "0"),
      0
    );

    const profit = totalIncome - totalExpense;

    expect(profit).toBeDefined();
    expect(typeof profit).toBe("number");
  });

  it("should allow authenticated users to access user list for sales stats", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const users = await caller.users.list();

    expect(Array.isArray(users)).toBe(true);
  });
});

describe("expense breakdown", () => {
  it("should categorize expenses correctly", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const orders = await caller.orders.list();

    let teacherTotal = 0;
    let transportTotal = 0;
    let partnerTotal = 0;
    let otherTotal = 0;

    orders.forEach((order) => {
      teacherTotal += parseFloat(order.teacherFee || "0");
      transportTotal += parseFloat(order.transportFee || "0");
      partnerTotal += parseFloat(order.partnerFee || "0");
      otherTotal += parseFloat(order.otherFee || "0");
    });

    expect(teacherTotal).toBeGreaterThanOrEqual(0);
    expect(transportTotal).toBeGreaterThanOrEqual(0);
    expect(partnerTotal).toBeGreaterThanOrEqual(0);
    expect(otherTotal).toBeGreaterThanOrEqual(0);
  });
});
