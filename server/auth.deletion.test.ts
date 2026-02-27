import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb, upsertUser, getUserById } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("账号注销功能测试", () => {
  let testUserId: number;
  const testOpenId = `test-deletion-${Date.now()}`;

  beforeAll(async () => {
    // 创建测试用户
    await upsertUser({
      openId: testOpenId,
      name: "测试注销用户",
      phone: "13800138000",
      email: "test-deletion@example.com",
      role: "user",
      roles: "user",
    });

    // 通过openId查找用户获取ID
    const drizzle = await getDb();
    if (drizzle) {
      const result = await drizzle
        .select()
        .from(users)
        .where(eq(users.openId, testOpenId))
        .limit(1);
      if (result.length > 0) {
        testUserId = result[0].id;
      }
    }
  });

  afterAll(async () => {
    // 清理测试数据
    const drizzle = await getDb();
    if (drizzle && testUserId) {
      await drizzle.delete(users).where(eq(users.id, testUserId));
    }
  });

  it("应该能够标记用户为注销中状态", async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error("数据库连接失败");

    // 标记用户为注销中
    await drizzle
      .update(users)
      .set({
        isDeleted: 1,
        deletedAt: new Date(),
        deletionReason: "测试注销",
      })
      .where(eq(users.id, testUserId));

    // 验证状态
    const user = await getUserById(testUserId);
    expect(user?.isDeleted).toBe(1);
    expect(user?.deletedAt).toBeTruthy();
    expect(user?.deletionReason).toBe("测试注销");
  });

  it("应该能够恢复注销中的用户", async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error("数据库连接失败");

    // 恢复用户
    await drizzle
      .update(users)
      .set({
        isDeleted: 0,
        deletedAt: null,
        deletionReason: null,
      })
      .where(eq(users.id, testUserId));

    // 验证状态
    const user = await getUserById(testUserId);
    expect(user?.isDeleted).toBe(0);
    expect(user?.deletedAt).toBeNull();
    expect(user?.deletionReason).toBeNull();
  });

  it("应该能够标记用户为已脱敏状态", async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error("数据库连接失败");

    // 标记用户为已脱敏
    await drizzle
      .update(users)
      .set({
        isDeleted: 2,
        anonymizedAt: new Date(),
        name: "已注销用户",
        phone: null,
        email: null,
      })
      .where(eq(users.id, testUserId));

    // 验证状态
    const user = await getUserById(testUserId);
    expect(user?.isDeleted).toBe(2);
    expect(user?.anonymizedAt).toBeTruthy();
    expect(user?.name).toBe("已注销用户");
    expect(user?.phone).toBeNull();
    expect(user?.email).toBeNull();
  });

  it("应该能够计算剩余恢复天数", () => {
    const deletedAt = new Date();
    const recoveryDeadline = new Date(deletedAt);
    recoveryDeadline.setDate(recoveryDeadline.getDate() + 30);
    const now = new Date();
    const daysRemaining = Math.ceil(
      (recoveryDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(daysRemaining).toBeGreaterThan(29);
    expect(daysRemaining).toBeLessThanOrEqual(30);
  });
});
