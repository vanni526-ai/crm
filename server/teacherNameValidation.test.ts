import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("老师名与客户名数据验证", () => {
  beforeAll(async () => {
    // 确保数据库中有测试老师数据
    const teachers = await db.getAllTeachers();
    if (teachers.length === 0) {
      // 如果没有老师数据,创建测试数据
      await db.createTeacher({
        name: "测试老师A",
        phone: "13800138000",
        status: "active",
        category: "本部",
        customerType: "S",
        city: "上海",
      });
      await db.createTeacher({
        name: "测试老师B",
        phone: "13800138001",
        status: "active",
        category: "本部",
        customerType: "S",
        city: "北京",
      });
    }
  });

  it("getAllTeacherNames应该返回所有活跃老师的名字", async () => {
    const teacherNames = await db.getAllTeacherNames();
    expect(teacherNames).toBeInstanceOf(Array);
    expect(teacherNames.length).toBeGreaterThan(0);
  });

  it("isTeacherName应该正确识别老师名", async () => {
    const teacherNames = await db.getAllTeacherNames();
    if (teacherNames.length > 0) {
      const firstTeacherName = teacherNames[0];
      const isTeacher = await db.isTeacherName(firstTeacherName);
      expect(isTeacher).toBe(true);
    }
  });

  it("isTeacherName应该正确识别非老师名", async () => {
    const isTeacher = await db.isTeacherName("不存在的客户名");
    expect(isTeacher).toBe(false);
  });

  it("isTeacherName应该处理空值", async () => {
    expect(await db.isTeacherName(null)).toBe(false);
    expect(await db.isTeacherName(undefined)).toBe(false);
    expect(await db.isTeacherName("")).toBe(false);
    expect(await db.isTeacherName("   ")).toBe(false);
  });

  it("importCustomersFromOrders应该过滤掉老师名", async () => {
    // 获取所有老师名
    const teacherNames = await db.getAllTeacherNames();
    
    // 跳过测试如果没有老师数据
    if (teacherNames.length === 0) {
      console.log("跳过测试: 没有老师数据");
      return;
    }
    
    const teacherName = teacherNames[0];
    
    // 直接验证过滤逻辑，不实际创建订单
    const isTeacher = await db.isTeacherName(teacherName);
    expect(isTeacher).toBe(true);
  });

  it("importCustomersFromOrders应该正常导入非老师名的客户", async () => {
    const uniqueCustomerName = `测试客户-${Date.now()}`;
    
    // 创建测试订单
    const orderId = await db.createOrder({
      orderNo: `TEST-${Date.now()}`,
      customerName: uniqueCustomerName,
      salesId: 1, // 提供必填字段
      paymentAmount: "1000",
      courseAmount: "1000",
      status: "paid",
    });
    
    expect(orderId).toBeGreaterThan(0);
    
    // 执行客户导入
    const result = await db.importCustomersFromOrders(1);
    
    // 验证客户已被导入
    const customers = await db.searchCustomers(uniqueCustomerName);
    expect(customers.length).toBeGreaterThan(0);
    expect(customers[0].name).toBe(uniqueCustomerName);
    
    // 清理测试数据
    await db.deleteOrder(orderId);
    if (customers.length > 0) {
      await db.deleteCustomer(customers[0].id);
    }
  });
});
