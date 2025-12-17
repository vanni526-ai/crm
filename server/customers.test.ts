import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(role: "admin" | "sales" | "finance" | "user" = "sales"): { ctx: TrpcContext } {
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

describe("customers router", () => {
  it("should allow authenticated users to list customers", async () => {
    const { ctx } = createTestContext("sales");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.customers.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should allow sales to create customers", async () => {
    const { ctx } = createTestContext("sales");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.customers.create({
      name: "测试客户",
      wechatId: "test_wechat",
      phone: "13800138000",
      notes: "测试备注",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("should allow admin to create customers", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.customers.create({
      name: "管理员创建的客户",
      phone: "13900139000",
    });

    expect(result.success).toBe(true);
  });

  it("should prevent regular users from creating customers", async () => {
    const { ctx } = createTestContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.customers.create({
        name: "非法客户",
        phone: "13700137000",
      })
    ).rejects.toThrow("需要销售或管理员权限");
  });

  it("should search customers by keyword", async () => {
    const { ctx } = createTestContext("sales");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.customers.search({ keyword: "测试" });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("customers CRUD operations", () => {
  it("should create customer with minimal required fields", async () => {
    const { ctx } = createTestContext("sales");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.customers.create({
      name: "最小字段客户",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("should allow updating customer information", async () => {
    const { ctx } = createTestContext("sales");
    const caller = appRouter.createCaller(ctx);

    // 先创建一个客户
    const createResult = await caller.customers.create({
      name: "待更新客户",
      phone: "13800138000",
    });

    // 更新客户信息
    const updateResult = await caller.customers.update({
      id: createResult.id,
      name: "已更新客户",
      phone: "13900139000",
    });

    expect(updateResult.success).toBe(true);
  });

  it("should allow deleting customers", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 先创建一个客户
    const createResult = await caller.customers.create({
      name: "待删除客户",
      phone: "13800138000",
    });

    // 删除客户
    const deleteResult = await caller.customers.delete({
      id: createResult.id,
    });

    expect(deleteResult.success).toBe(true);
  });
});
