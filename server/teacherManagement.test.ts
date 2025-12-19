import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

/**
 * 老师管理功能单元测试
 */
describe("老师管理功能", () => {
  
  describe("数据验证", () => {
    it("应该能够获取所有老师名字", async () => {
      const teacherNames = await db.getAllTeacherNames();
      expect(Array.isArray(teacherNames)).toBe(true);
    });

    it("老师名字列表应该只包含字符串", async () => {
      const teacherNames = await db.getAllTeacherNames();
      teacherNames.forEach(name => {
        expect(typeof name).toBe("string");
      });
    });
  });

  describe("批量操作", () => {
    it("批量创建老师应该返回结果数组", async () => {
      const teachers = [
        {
          name: "测试老师A",
          phone: "13800000001",
          status: "活跃",
          customerType: "测试类型",
          category: "本部老师",
        },
        {
          name: "测试老师B",
          phone: "13800000002",
          status: "活跃",
          customerType: "测试类型",
          category: "合伙店老师",
          city: "天津",
        },
      ];

      const results = await db.batchCreateTeachers(teachers);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      expect(results[0]).toHaveProperty("id");
      expect(results[0]).toHaveProperty("name");
      
      // 清理测试数据
      const ids = results.map(r => r.id);
      await db.batchDeleteTeachers(ids);
    });

    it("批量更新老师状态应该成功", async () => {
      // 先创建测试数据
      const teachers = [
        { name: "测试老师C", status: "活跃" },
        { name: "测试老师D", status: "活跃" },
      ];
      const results = await db.batchCreateTeachers(teachers);
      const ids = results.map(r => r.id);

      // 批量更新状态
      await db.batchUpdateTeacherStatus(ids, "不活跃");

      // 验证更新结果
      const teacher = await db.getTeacherById(ids[0]);
      expect(teacher?.status).toBe("不活跃");

      // 清理测试数据
      await db.batchDeleteTeachers(ids);
    });

    it("批量删除老师应该成功", async () => {
      // 先创建测试数据
      const teachers = [
        { name: "测试老师E" },
        { name: "测试老师F" },
      ];
      const results = await db.batchCreateTeachers(teachers);
      const ids = results.map(r => r.id);

      // 批量删除
      await db.batchDeleteTeachers(ids);

      // 验证删除结果
      const teacher = await db.getTeacherById(ids[0]);
      expect(teacher).toBeNull();
    });
  });

  describe("Excel导入导出", () => {
    it("导入的老师数据应该包含必需字段", () => {
      const importedTeacher = {
        name: "导入老师",
        phone: "13900000000",
        status: "活跃",
        customerType: "温柔御姐",
        notes: "测试备注",
        category: "本部老师",
      };

      expect(importedTeacher).toHaveProperty("name");
      expect(importedTeacher.name).toBeTruthy();
    });

    it("导出的老师数据应该包含所有字段", async () => {
      const teachers = await db.getAllTeachers();
      if (teachers.length > 0) {
        const teacher = teachers[0];
        expect(teacher).toHaveProperty("name");
        expect(teacher).toHaveProperty("status");
      }
    });
  });

  describe("数据完整性", () => {
    it("创建老师时必须提供姓名", async () => {
      try {
        await db.createTeacher({ name: "" } as any);
        // 如果没有抛出错误,测试失败
        expect(true).toBe(false);
      } catch (error) {
        // 应该抛出错误
        expect(error).toBeDefined();
      }
    });

    it("老师状态应该有默认值", async () => {
      const id = await db.createTeacher({ name: "测试老师G" });
      const teacher = await db.getTeacherById(id);
      expect(teacher?.status).toBe("活跃");
      
      // 清理测试数据
      await db.batchDeleteTeachers([id]);
    });
  });
});

/**
 * 客户名验证功能测试
 */
describe("客户名验证功能", () => {
  let testTeacherId: number;

  beforeAll(async () => {
    // 创建测试老师
    testTeacherId = await db.createTeacher({
      name: "验证测试老师",
      status: "活跃",
    });
  });

  it("应该能够检测客户名是否为老师名", async () => {
    const teacherNames = await db.getAllTeacherNames();
    const isTeacherName = teacherNames.includes("验证测试老师");
    expect(isTeacherName).toBe(true);
  });

  it("不应该将非老师名识别为老师名", async () => {
    const teacherNames = await db.getAllTeacherNames();
    const isTeacherName = teacherNames.includes("这不是老师名字");
    expect(isTeacherName).toBe(false);
  });
});
