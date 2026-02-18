import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb, getAllTeachers, updateUserRoles } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Teacher Attribute Display", () => {
  let testUserId: number;
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建测试用户并设置teacherAttribute
    const result = await db.insert(users).values({
      name: "测试老师S",
      phone: "13700137000",
      roles: "teacher",
      role: "user",
      isActive: true,
      teacherAttribute: "S",
    });
    testUserId = result[0].insertId;
  });

  afterAll(async () => {
    // 清理测试数据
    if (db && testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it("should return teacherAttribute field in getAllTeachers", async () => {
    // 调用getAllTeachers
    const teachers = await getAllTeachers();

    // 查找测试老师
    const testTeacher = teachers.find(t => t.id === testUserId);

    // 验证teacherAttribute字段存在且正确
    expect(testTeacher).toBeDefined();
    expect(testTeacher?.teacherAttribute).toBe("S");
  });

  it("should handle teachers with different attributes", async () => {
    // 创建M属性老师
    const resultM = await db.insert(users).values({
      name: "测试老师M",
      phone: "13700137001",
      roles: "teacher",
      role: "user",
      isActive: true,
      teacherAttribute: "M",
    });
    const userIdM = resultM[0].insertId;

    // 创建Switch属性老师
    const resultSwitch = await db.insert(users).values({
      name: "测试老师Switch",
      phone: "13700137002",
      roles: "teacher",
      role: "user",
      isActive: true,
      teacherAttribute: "Switch",
    });
    const userIdSwitch = resultSwitch[0].insertId;

    try {
      // 调用getAllTeachers
      const teachers = await getAllTeachers();

      // 验证M属性老师
      const teacherM = teachers.find(t => t.id === userIdM);
      expect(teacherM?.teacherAttribute).toBe("M");

      // 验证Switch属性老师
      const teacherSwitch = teachers.find(t => t.id === userIdSwitch);
      expect(teacherSwitch?.teacherAttribute).toBe("Switch");
    } finally {
      // 清理测试数据
      await db.delete(users).where(eq(users.id, userIdM));
      await db.delete(users).where(eq(users.id, userIdSwitch));
    }
  });

  it("should handle teachers without teacherAttribute", async () => {
    // 创建没有teacherAttribute的老师
    const result = await db.insert(users).values({
      name: "测试老师无属性",
      phone: "13700137003",
      roles: "teacher",
      role: "user",
      isActive: true,
      teacherAttribute: null,
    });
    const userId = result[0].insertId;

    try {
      // 调用getAllTeachers
      const teachers = await getAllTeachers();

      // 验证没有teacherAttribute的老师
      const teacher = teachers.find(t => t.id === userId);
      expect(teacher).toBeDefined();
      expect(teacher?.teacherAttribute).toBeNull();
    } finally {
      // 清理测试数据
      await db.delete(users).where(eq(users.id, userId));
    }
  });
});
