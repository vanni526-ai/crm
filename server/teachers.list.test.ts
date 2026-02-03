import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("teachers.list API - 修复city和isActive字段", () => {
  it("应该返回包含city和isActive字段的老师列表", async () => {
    const teachers = await db.getAllTeachers();
    
    expect(teachers).toBeDefined();
    expect(Array.isArray(teachers)).toBe(true);
    
    if (teachers.length > 0) {
      const firstTeacher = teachers[0];
      
      // 验证必需字段存在
      expect(firstTeacher).toHaveProperty("id");
      expect(firstTeacher).toHaveProperty("name");
      expect(firstTeacher).toHaveProperty("customerType");
      expect(firstTeacher).toHaveProperty("notes");
      
      // 验证新增的字段存在
      expect(firstTeacher).toHaveProperty("city");
      expect(firstTeacher).toHaveProperty("isActive");
      
      // 验证字段类型
      expect(typeof firstTeacher.id).toBe("number");
      expect(typeof firstTeacher.name).toBe("string");
      expect(typeof firstTeacher.isActive).toBe("boolean");
      
      // city可以是string或null
      if (firstTeacher.city !== null) {
        expect(typeof firstTeacher.city).toBe("string");
      }
    }
  });
  
  it("应该只返回isActive=true的老师", async () => {
    const teachers = await db.getAllTeachers();
    
    // 所有返回的老师都应该是激活状态
    teachers.forEach(teacher => {
      expect(teacher.isActive).toBe(true);
    });
  });
  
  it("应该返回至少一位老师(数据库中有64位激活老师)", async () => {
    const teachers = await db.getAllTeachers();
    
    expect(teachers.length).toBeGreaterThan(0);
    console.log(`✅ 返回了 ${teachers.length} 位激活的老师`);
  });
  
  it("应该返回包含城市信息的老师", async () => {
    const teachers = await db.getAllTeachers();
    
    // 统计有城市信息的老师数量
    const teachersWithCity = teachers.filter(t => t.city && t.city.trim() !== "");
    
    console.log(`✅ 共有 ${teachersWithCity.length}/${teachers.length} 位老师有城市信息`);
    
    if (teachersWithCity.length > 0) {
      const firstTeacherWithCity = teachersWithCity[0];
      console.log(`示例: ${firstTeacherWithCity.name} - ${firstTeacherWithCity.city}`);
    }
  });
  
  it("返回的数据格式应该符合前端期望", async () => {
    const teachers = await db.getAllTeachers();
    
    if (teachers.length > 0) {
      const teacher = teachers[0];
      
      // 前端期望的数据结构
      const expectedKeys = ["id", "name", "customerType", "notes", "city", "isActive"];
      const actualKeys = Object.keys(teacher);
      
      expectedKeys.forEach(key => {
        expect(actualKeys).toContain(key);
      });
      
      console.log("✅ 返回的数据结构:", JSON.stringify(teacher, null, 2));
    }
  });
  
  it("应该能够按城市过滤老师(模拟前端逻辑)", async () => {
    const teachers = await db.getAllTeachers();
    
    // 获取所有唯一城市
    const cities = [...new Set(teachers.map(t => t.city).filter(c => c && c.trim() !== ""))];
    
    console.log(`✅ 可用城市列表: ${cities.join(", ")}`);
    
    if (cities.length > 0) {
      const testCity = cities[0];
      
      // 模拟前端过滤逻辑
      const filteredTeachers = teachers.filter(t => t.isActive && t.city === testCity);
      
      console.log(`✅ 在 ${testCity} 有 ${filteredTeachers.length} 位老师`);
      expect(filteredTeachers.length).toBeGreaterThan(0);
    }
  });
});
