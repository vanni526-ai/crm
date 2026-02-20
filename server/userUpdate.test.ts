import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("User Management Update API", () => {
  let testUserId: number;
  let adminContext: any;

  beforeAll(async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error("Database connection failed");

    // 创建测试用户
    const [result] = await drizzle.insert(users).values({
      openId: `test_update_${Date.now()}`,
      name: "测试用户更新",
      email: "test_update@example.com",
      phone: "13900000099",
      password: "hashedpassword",
      role: "user",
      roles: "user",
      isActive: true,
    } as any);

    testUserId = result.insertId;

    // 模拟管理员上下文
    adminContext = {
      user: {
        id: 1,
        role: "admin",
        roles: "admin",
        openId: "admin",
        name: "Admin",
      },
    };
  });

  it("should update user with empty roleCities object", async () => {
    const caller = appRouter.createCaller(adminContext);

    const result = await caller.userManagement.update({
      id: testUserId,
      name: "更新后的用户名",
      phone: "13900000100",
      roles: "user",
      roleCities: {}, // 空对象，不应该导致错误
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("用户信息更新成功");

    // 验证数据库中的更新
    const drizzle = await getDb();
    const [updatedUser] = await drizzle!
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(updatedUser.name).toBe("更新后的用户名");
    expect(updatedUser.phone).toBe("13900000100");
  });

  it("should update user without roleCities parameter", async () => {
    const caller = appRouter.createCaller(adminContext);

    const result = await caller.userManagement.update({
      id: testUserId,
      name: "再次更新",
      roles: "user",
      // 不传roleCities参数
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("用户信息更新成功");
  });

  it("should update user with multiple roles (not teacher/cityPartner)", async () => {
    const caller = appRouter.createCaller(adminContext);

    const result = await caller.userManagement.update({
      id: testUserId,
      name: "多角色用户",
      roles: "user,sales,finance",
      roleCities: {}, // 非teacher/cityPartner角色，空roleCities应该被允许
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("用户信息更新成功");

    // 验证角色更新
    const drizzle = await getDb();
    const [updatedUser] = await drizzle!
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(updatedUser.roles).toBe("user,sales,finance");
  });

  it("should throw error when teacher role has no cities", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(
      caller.userManagement.update({
        id: testUserId,
        name: "老师角色测试",
        roles: "teacher",
        roleCities: {}, // teacher角色但没有城市，应该报错
      })
    ).rejects.toThrow("选择老师角色时，必须选择对应的城市");
  });

  it("should throw error when cityPartner role has no cities", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(
      caller.userManagement.update({
        id: testUserId,
        name: "合伙人角色测试",
        roles: "cityPartner",
        roleCities: {}, // cityPartner角色但没有城市，应该报错
      })
    ).rejects.toThrow("选择合伙人角色时，必须选择对应的城市");
  });
});
