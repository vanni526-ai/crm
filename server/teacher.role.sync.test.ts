import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, teachers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { updateUserRoles } from "./db";

describe("Teacher Role Synchronization", () => {
  let testUserId: number;
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建测试用户
    const result = await db.insert(users).values({
      name: "测试老师",
      phone: "13800138000",
      roles: "user",
      role: "user",
      isActive: true,
    });
    testUserId = result[0].insertId;
  });

  afterAll(async () => {
    // 清理测试数据
    if (db && testUserId) {
      await db.delete(teachers).where(eq(teachers.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it("should create teacher record when adding teacher role", async () => {
    // 添加teacher角色
    await updateUserRoles(testUserId, ["teacher"]);

    // 验证teachers表中创建了记录
    const teacherRecords = await db
      .select()
      .from(teachers)
      .where(eq(teachers.userId, testUserId));

    expect(teacherRecords.length).toBe(1);
    expect(teacherRecords[0].name).toBe("测试老师");
    expect(teacherRecords[0].phone).toBe("13800138000");
    expect(teacherRecords[0].isActive).toBe(true);
  });

  it("should set isActive to false when removing teacher role", async () => {
    // 移除teacher角色
    await updateUserRoles(testUserId, ["user"]);

    // 验证teachers表中的记录被禁用
    const teacherRecords = await db
      .select()
      .from(teachers)
      .where(eq(teachers.userId, testUserId));

    expect(teacherRecords.length).toBe(1);
    expect(teacherRecords[0].isActive).toBe(false);
  });

  it("should set isActive to true when re-adding teacher role", async () => {
    // 重新添加teacher角色
    await updateUserRoles(testUserId, ["teacher"]);

    // 验证teachers表中的记录被重新启用
    const teacherRecords = await db
      .select()
      .from(teachers)
      .where(eq(teachers.userId, testUserId));

    expect(teacherRecords.length).toBe(1);
    expect(teacherRecords[0].isActive).toBe(true);
  });

  it("should handle multiple roles including teacher", async () => {
    // 添加多个角色（包括teacher）
    await updateUserRoles(testUserId, ["teacher", "sales", "finance"]);

    // 验证users表中的roles字段
    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId));

    expect(userRecords[0].roles).toBe("teacher,sales,finance");

    // 验证teachers表中的记录仍然是active
    const teacherRecords = await db
      .select()
      .from(teachers)
      .where(eq(teachers.userId, testUserId));

    expect(teacherRecords[0].isActive).toBe(true);
  });

  it("should only affect teacher role when removing it from multiple roles", async () => {
    // 移除teacher角色，但保留其他角色
    await updateUserRoles(testUserId, ["sales", "finance"]);

    // 验证users表中的roles字段
    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId));

    expect(userRecords[0].roles).toBe("sales,finance");

    // 验证teachers表中的记录被禁用
    const teacherRecords = await db
      .select()
      .from(teachers)
      .where(eq(teachers.userId, testUserId));

    expect(teacherRecords[0].isActive).toBe(false);
  });
});
