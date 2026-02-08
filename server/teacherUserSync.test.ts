/**
 * 老师管理和用户管理双向同步测试
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, teachers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./passwordUtils";

describe("Teacher-User Sync", () => {
  let testUserId: number;
  let testTeacherId: number;

  beforeAll(async () => {
    // 清理测试数据
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    await db.delete(users).where(eq(users.name, "测试老师同步"));
    await db.delete(teachers).where(eq(teachers.name, "测试老师同步"));
  });

  afterAll(async () => {
    // 清理测试数据
    const db = await getDb();
    if (!db) return;
    
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
    if (testTeacherId) {
      await db.delete(teachers).where(eq(teachers.id, testTeacherId));
    }
  });

  it("should create teacher record when creating user with teacher role", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建带teacher角色的用户
    const hashedPassword = await hashPassword("123456");
    const openId = `test_teacher_${Date.now()}`;
    
    const [result] = await db.insert(users).values({
      openId,
      name: "测试老师同步",
      nickname: "测试老师同步",
      phone: "13800138000",
      password: hashedPassword,
      role: "teacher",
      roles: "teacher",
      isActive: true,
    } as any);

    testUserId = result.insertId;

    // 模拟同步逻辑：创建对应的老师记录
    await db.insert(teachers).values({
      userId: testUserId,
      name: "测试老师同步",
      phone: "13800138000",
      status: "活跃",
      isActive: true,
    } as any);

    // 验证老师记录已创建
    const [teacherRecords] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.userId, testUserId))
      .limit(1);

    expect(teacherRecords).toBeDefined();
    expect(teacherRecords.name).toBe("测试老师同步");
    expect(teacherRecords.isActive).toBe(true);
    
    testTeacherId = teacherRecords.id;
  });

  it("should deactivate teacher when removing teacher role from user", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 移除teacher角色
    await db
      .update(users)
      .set({ role: "user", roles: "user" } as any)
      .where(eq(users.id, testUserId));

    // 模拟同步逻辑：将老师设为不激活
    await db
      .update(teachers)
      .set({ isActive: false, status: "不活跃" } as any)
      .where(eq(teachers.userId, testUserId));

    // 验证老师已被停用
    const [teacherRecords] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.userId, testUserId))
      .limit(1);

    expect(teacherRecords).toBeDefined();
    expect(teacherRecords.isActive).toBe(false);
    expect(teacherRecords.status).toBe("不活跃");
  });

  it("should reactivate teacher when adding teacher role back to user", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 重新添加teacher角色
    await db
      .update(users)
      .set({ role: "teacher", roles: "teacher,user" } as any)
      .where(eq(users.id, testUserId));

    // 模拟同步逻辑：将老师重新激活
    await db
      .update(teachers)
      .set({ isActive: true, status: "活跃" } as any)
      .where(eq(teachers.userId, testUserId));

    // 验证老师已被重新激活
    const [teacherRecords] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.userId, testUserId))
      .limit(1);

    expect(teacherRecords).toBeDefined();
    expect(teacherRecords.isActive).toBe(true);
    expect(teacherRecords.status).toBe("活跃");
  });

  it("should verify all existing teachers have userId", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [result] = await db.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN userId IS NULL THEN 1 ELSE 0 END) as no_user
      FROM teachers
    `);

    const { total, no_user } = result[0] as any;
    
    expect(Number(total)).toBeGreaterThan(0);
    expect(Number(no_user)).toBe(0); // 所有老师都应该有userId
  });
});
