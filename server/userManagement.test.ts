import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./passwordUtils";

describe("userManagement API", () => {
  let testUserId: number;
  const caller = appRouter.createCaller({
    user: { id: 1, openId: "test", name: "Test Admin", email: "admin@test.com", role: "admin", isActive: true },
  });

  beforeAll(async () => {
    // 清理测试数据
    const drizzle = await getDb();
    if (!drizzle) throw new Error("数据库连接失败");
    await drizzle.delete(users).where(eq(users.name, "test_user_management"));
  });

  describe("create", () => {
    it("应该能够创建新用户", async () => {
      const result = await caller.userManagement.create({
        name: "test_user_management",
        password: "test123",
        nickname: "测试用户",
        email: "test@example.com",
        phone: "13800138000",
        role: "user",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("创建成功");

      // 验证用户是否真的被创建
      const drizzle = await getDb();
      if (!drizzle) throw new Error("数据库连接失败");
      const [user] = await drizzle
        .select()
        .from(users)
        .where(eq(users.name, "test_user_management"));

      expect(user).toBeDefined();
      expect(user.nickname).toBe("测试用户");
      expect(user.email).toBe("test@example.com");
      expect(user.phone).toBe("13800138000");
      expect(user.role).toBe("user");
      expect(user.password).toBeDefined();
      expect(user.password).not.toBe("test123"); // 密码应该被加密

      testUserId = user.id;
    });

    it("不应该允许创建重复的用户名", async () => {
      await expect(
        caller.userManagement.create({
          name: "test_user_management",
          password: "test123",
          role: "user",
        })
      ).rejects.toThrow();
    });

    it("应该验证密码长度", async () => {
      await expect(
        caller.userManagement.create({
          name: "test_short_password",
          password: "123", // 太短
          role: "user",
        })
      ).rejects.toThrow();
    });
  });

  describe("list", () => {
    it("应该能够获取用户列表", async () => {
      const users = await caller.userManagement.list();

      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);

      const testUser = users.find((u) => u.name === "test_user_management");
      expect(testUser).toBeDefined();
      expect(testUser?.nickname).toBe("测试用户");
      expect(testUser?.password).toBeUndefined(); // 密码不应该被返回
    });
  });

  describe("update", () => {
    it("应该能够更新用户信息", async () => {
      const result = await caller.userManagement.update({
        id: testUserId,
        nickname: "更新后的昵称",
        email: "updated@example.com",
        role: "sales",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("更新成功");

      // 验证更新是否生效
      const drizzle = await getDb();
      if (!drizzle) throw new Error("数据库连接失败");
      const [user] = await drizzle
        .select()
        .from(users)
        .where(eq(users.id, testUserId));

      expect(user.nickname).toBe("更新后的昵称");
      expect(user.email).toBe("updated@example.com");
      expect(user.role).toBe("sales");
    });

    it("不应该允许更新不存在的用户", async () => {
      await expect(
        caller.userManagement.update({
          id: 999999,
          nickname: "不存在",
        })
      ).rejects.toThrow("用户不存在");
    });
  });

  describe("resetPassword", () => {
    it("应该能够重置用户密码", async () => {
      const result = await caller.userManagement.resetPassword({
        id: testUserId,
        newPassword: "newpassword123",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("重置成功");

      // 验证密码是否被更新
      const drizzle = await getDb();
      if (!drizzle) throw new Error("数据库连接失败");
      const [user] = await drizzle
        .select()
        .from(users)
        .where(eq(users.id, testUserId));

      expect(user.password).toBeDefined();
      expect(user.password).not.toBe("newpassword123"); // 应该被加密

      // 验证新密码是否可以登录
      const loginResult = await caller.auth.loginWithUserAccount({
        username: "test_user_management",
        password: "newpassword123",
      });

      expect(loginResult.success).toBe(true);
    });

    it("应该验证新密码长度", async () => {
      await expect(
        caller.userManagement.resetPassword({
          id: testUserId,
          newPassword: "123", // 太短
        })
      ).rejects.toThrow();
    });
  });

  describe("toggleActive", () => {
    it("应该能够禁用用户", async () => {
      const result = await caller.userManagement.toggleActive({
        id: testUserId,
        isActive: false,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("禁用");

      // 验证用户是否被禁用
      const drizzle = await getDb();
      if (!drizzle) throw new Error("数据库连接失败");
      const [user] = await drizzle
        .select()
        .from(users)
        .where(eq(users.id, testUserId));

      expect(user.isActive).toBe(false);

      // 验证禁用的用户无法登录
      await expect(
        caller.auth.loginWithUserAccount({
          username: "test_user_management",
          password: "newpassword123",
        })
      ).rejects.toThrow("账号已被禁用");
    });

    it("应该能够启用用户", async () => {
      const result = await caller.userManagement.toggleActive({
        id: testUserId,
        isActive: true,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("启用");

      // 验证用户是否被启用
      const drizzle = await getDb();
      if (!drizzle) throw new Error("数据库连接失败");
      const [user] = await drizzle
        .select()
        .from(users)
        .where(eq(users.id, testUserId));

      expect(user.isActive).toBe(true);

      // 验证启用的用户可以登录
      const loginResult = await caller.auth.loginWithUserAccount({
        username: "test_user_management",
        password: "newpassword123",
      });

      expect(loginResult.success).toBe(true);
    });
  });

  // 注意: delete功能在实际使用中通常不需要,我们只禁用用户而不删除
});
