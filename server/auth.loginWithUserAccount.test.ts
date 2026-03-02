import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { hashPassword } from "./passwordUtils";
import { eq } from "drizzle-orm";

describe("auth.loginWithUserAccount", () => {
  let testUserId: number;
  const TEST_PHONE = "13800138001";

  beforeAll(async () => {
    // 确保测试用户存在（手机号唯一）
    const drizzle = await getDb();
    if (!drizzle) throw new Error("数据库连接失败");

    const existing = await drizzle
      .select()
      .from(users)
      .where(eq(users.phone, TEST_PHONE))
      .limit(1);

    if (existing.length > 0) {
      testUserId = existing[0].id;
      // 更新密码确保测试可用
      const hashedPassword = await hashPassword("123456");
      await drizzle
        .update(users)
        .set({ password: hashedPassword, isActive: true })
        .where(eq(users.id, testUserId));
    } else {
      // 创建测试用户
      const hashedPassword = await hashPassword("123456");
      const result = await drizzle.insert(users).values({
        openId: `test_${Date.now()}`,
        name: "test",
        nickname: "测试用户",
        email: "test@example.com",
        phone: TEST_PHONE,
        password: hashedPassword,
        role: "user",
        isActive: true,
      });
      testUserId = Number(result.insertId);
    }
  });

  it("应该能够使用手机号登录", async () => {
    const caller = appRouter.createCaller({
      user: null,
      res: {
        cookie: () => {},
      } as any,
    });

    const result = await caller.auth.loginWithUserAccount({
      phone: TEST_PHONE,
      password: "123456",
    });

    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.user).toBeDefined();
  });

  it("密码错误时应该抛出错误", async () => {
    const caller = appRouter.createCaller({
      user: null,
      res: {
        cookie: () => {},
      } as any,
    });

    await expect(
      caller.auth.loginWithUserAccount({
        phone: TEST_PHONE,
        password: "wrongpassword",
      })
    ).rejects.toThrow("密码错误");
  });

  it("手机号不存在时应该抛出错误", async () => {
    const caller = appRouter.createCaller({
      user: null,
      res: {
        cookie: () => {},
      } as any,
    });

    await expect(
      caller.auth.loginWithUserAccount({
        phone: "19999999999",
        password: "123456",
      })
    ).rejects.toThrow("手机号不存在，请确认后重试");
  });

  it("禁用的账号不能登录", async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error("数据库连接失败");

    // 禁用测试用户
    await drizzle
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, testUserId));

    const caller = appRouter.createCaller({
      user: null,
      res: {
        cookie: () => {},
      } as any,
    });

    await expect(
      caller.auth.loginWithUserAccount({
        phone: TEST_PHONE,
        password: "123456",
      })
    ).rejects.toThrow("账号已被禁用");

    // 恢复测试用户状态
    await drizzle
      .update(users)
      .set({ isActive: true })
      .where(eq(users.id, testUserId));
  });

  it("未设置密码的账号不能登录", async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error("数据库连接失败");

    const TEST_PHONE_NOPASS = "13800138099";

    // 创建没有密码的测试用户
    const result = await drizzle.insert(users).values({
      openId: `nopass_${Date.now()}`,
      name: `nopassword_${Date.now()}`,
      phone: TEST_PHONE_NOPASS,
      password: null,
      role: "user",
      isActive: true,
    });

    const caller = appRouter.createCaller({
      user: null,
      res: {
        cookie: () => {},
      } as any,
    });

    await expect(
      caller.auth.loginWithUserAccount({
        phone: TEST_PHONE_NOPASS,
        password: "123456",
      })
    ).rejects.toThrow("该账号未设置密码，请联系管理员");

    // 清理测试数据
    const insertId = typeof result.insertId === "bigint" ? Number(result.insertId) : result.insertId;
    if (insertId) {
      await drizzle.delete(users).where(eq(users.id, insertId));
    }
  });
});
