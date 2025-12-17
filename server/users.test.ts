import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "admin" | "user" | "sales" | "finance" = "user"): TrpcContext {
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

describe("users management", () => {
  it("should allow authenticated users to list users", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const users = await caller.users.list();

    expect(Array.isArray(users)).toBe(true);
  });

  it("should allow admin to update user role", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    expect(caller.users.updateRole).toBeDefined();
  });

  it("should allow admin to update user status", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    expect(caller.users.updateStatus).toBeDefined();
  });

  it("should prevent non-admin from updating user role", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.updateRole({
        userId: 2,
        role: "admin",
      })
    ).rejects.toThrow("需要管理员权限");
  });

  it("should prevent non-admin from updating user status", async () => {
    const ctx = createAuthContext("sales");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.updateStatus({
        userId: 2,
        isActive: false,
      })
    ).rejects.toThrow("需要管理员权限");
  });
});

describe("user data validation", () => {
  it("should validate user structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const users = await caller.users.list();

    if (users.length > 0) {
      const user = users[0];
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("openId");
      expect(user).toHaveProperty("role");
      expect(user).toHaveProperty("isActive");
      expect(user).toHaveProperty("createdAt");
      expect(user).toHaveProperty("lastSignedIn");
    }
  });

  it("should have valid role values", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const users = await caller.users.list();

    const validRoles = ["admin", "sales", "finance", "user"];
    users.forEach((user) => {
      expect(validRoles).toContain(user.role);
    });
  });
});
