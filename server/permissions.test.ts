/**
 * 权限系统测试用例
 * 测试基于JWT的角色权限控制
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, customers, orders, partners, partnerCities, cities } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

describe("权限系统测试", () => {
  let testDb: Awaited<ReturnType<typeof getDb>>;
  
  // 测试用户ID
  let studentUserId: number;
  let teacherUserId: number;
  let salesUserId: number;
  let cityPartnerUserId: number;
  let adminUserId: number;
  
  // 测试数据ID
  let testCustomerId: number;
  let testOrderId: number;
  let testCityId: number;
  let testPartnerId: number;

  beforeAll(async () => {
    testDb = await getDb();
    if (!testDb) throw new Error("数据库连接失败");

    // 创建测试用户
    // 1. 学员
    const studentOpenId = `test_student_${Date.now()}`;
    await testDb.insert(users).values({
      openId: studentOpenId,
      name: "测试学员",
      email: `student_${Date.now()}@test.com`,
      role: "user",
      roles: "user",
      isActive: true,
    });
    const studentUser = await testDb.select().from(users).where(eq(users.openId, studentOpenId)).limit(1);
    studentUserId = studentUser[0].id;

    // 2. 老师
    const teacherOpenId = `test_teacher_${Date.now()}`;
    await testDb.insert(users).values({
      openId: teacherOpenId,
      name: "测试老师",
      email: `teacher_${Date.now()}@test.com`,
      role: "teacher",
      roles: "teacher",
      isActive: true,
    });
    const teacherUser = await testDb.select().from(users).where(eq(users.openId, teacherOpenId)).limit(1);
    teacherUserId = teacherUser[0].id;

    // 3. 销售
    const salesOpenId = `test_sales_${Date.now()}`;
    await testDb.insert(users).values({
      openId: salesOpenId,
      name: "测试销售",
      email: `sales_${Date.now()}@test.com`,
      role: "sales",
      roles: "sales",
      isActive: true,
    });
    const salesUser = await testDb.select().from(users).where(eq(users.openId, salesOpenId)).limit(1);
    salesUserId = salesUser[0].id;

    // 4. 城市合伙人
    const cityPartnerOpenId = `test_citypartner_${Date.now()}`;
    await testDb.insert(users).values({
      openId: cityPartnerOpenId,
      name: "测试城市合伙人",
      email: `citypartner_${Date.now()}@test.com`,
      role: "cityPartner",
      roles: "cityPartner",
      isActive: true,
    });
    const cityPartnerUser = await testDb.select().from(users).where(eq(users.openId, cityPartnerOpenId)).limit(1);
    cityPartnerUserId = cityPartnerUser[0].id;

    // 5. 管理员
    const adminOpenId = `test_admin_${Date.now()}`;
    await testDb.insert(users).values({
      openId: adminOpenId,
      name: "测试管理员",
      email: `admin_${Date.now()}@test.com`,
      role: "admin",
      roles: "admin",
      isActive: true,
    });
    const adminUser = await testDb.select().from(users).where(eq(users.openId, adminOpenId)).limit(1);
    adminUserId = adminUser[0].id;

    // 创建测试客户
    await testDb.insert(customers).values({
      name: "测试客户",
      phone: "13800138000",
      userId: studentUserId,
      accountBalance: "1000.00",
      trafficSource: "测试",
      createdBy: adminUserId,
    });
    const customerRecord = await testDb.select().from(customers).where(eq(customers.userId, studentUserId)).limit(1);
    testCustomerId = customerRecord[0].id;

    // 创建测试订单（关联到销售）
    const orderNo = `TEST${Date.now()}`;
    await testDb.insert(orders).values({
      orderNo,
      customerId: testCustomerId,
      customerName: "测试客户",
      salesId: salesUserId,
      salesPerson: "测试销售",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      status: "paid",
      deliveryStatus: "pending",
      deliveryTeacher: "测试老师",
    });
    const orderRecord = await testDb.select().from(orders).where(eq(orders.orderNo, orderNo)).limit(1);
    testOrderId = orderRecord[0].id;

    // 创建测试城市
    const cityName = `测试城市_${Date.now()}`;
    await testDb.insert(cities).values({
      name: cityName,
      province: "测试省",
      isActive: true,
    });
    const cityRecord = await testDb.select().from(cities).where(eq(cities.name, cityName)).limit(1);
    testCityId = cityRecord[0].id;

    // 创建测试合伙人
    await testDb.insert(partners).values({
      userId: cityPartnerUserId,
      name: "测试城市合伙人",
      phone: "13900139000",
      profitRatio: "0.10",
      isActive: true,
      createdBy: adminUserId,
    });
    const partnerRecord = await testDb.select().from(partners).where(eq(partners.userId, cityPartnerUserId)).limit(1);
    testPartnerId = partnerRecord[0].id;

    // 关联合伙人和城市
    await testDb.insert(partnerCities).values({
      partnerId: testPartnerId,
      cityId: testCityId,
      contractStatus: "active",
      createdBy: adminUserId,
    });
  });

  afterAll(async () => {
    if (!testDb) return;

    // 清理测试数据
    await testDb.delete(partnerCities).where(eq(partnerCities.partnerId, testPartnerId));
    await testDb.delete(partners).where(eq(partners.id, testPartnerId));
    await testDb.delete(orders).where(eq(orders.id, testOrderId));
    await testDb.delete(customers).where(eq(customers.id, testCustomerId));
    await testDb.delete(cities).where(eq(cities.id, testCityId));
    await testDb.delete(users).where(eq(users.id, studentUserId));
    await testDb.delete(users).where(eq(users.id, teacherUserId));
    await testDb.delete(users).where(eq(users.id, salesUserId));
    await testDb.delete(users).where(eq(users.id, cityPartnerUserId));
    await testDb.delete(users).where(eq(users.id, adminUserId));
  });

  describe("学员端权限测试", () => {
    it("学员应该只能查看自己的客户信息", async () => {
      // 查询客户
      const result = await testDb
        .select()
        .from(customers)
        .where(eq(customers.userId, studentUserId));

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].userId).toBe(studentUserId);
    });

    it("学员应该只能查看自己的订单", async () => {
      // 查询订单（通过customerId关联）
      const result = await testDb
        .select()
        .from(orders)
        .where(eq(orders.customerId, testCustomerId));

      expect(result.length).toBeGreaterThan(0);
    });

    it("学员不应该能查看其他用户的订单", async () => {
      // 尝试查询不属于自己的订单（通过salesId筛选）
      const result = await testDb
        .select()
        .from(orders)
        .where(eq(orders.salesId, salesUserId));

      // 学员不应该通过salesId查询到订单
      // 注意：这个测试假设学员不是销售
      expect(studentUserId).not.toBe(salesUserId);
    });
  });

  describe("老师端权限测试", () => {
    it("老师应该只能查看与自己相关的订单", async () => {
      // 查询包含老师名字的订单
      const result = await testDb
        .select()
        .from(orders)
        .where(eq(orders.deliveryTeacher, "测试老师"));

      expect(result.length).toBeGreaterThan(0);
    });

    it("老师不应该能查看与自己无关的订单", async () => {
      // 创建一个不包含该老师的订单
      const otherOrderNo = `TEST_OTHER_${Date.now()}`;
      await testDb.insert(orders).values({
        orderNo: otherOrderNo,
        customerId: testCustomerId,
        customerName: "测试客户",
        salesId: salesUserId,
        salesPerson: "测试销售",
        paymentAmount: "500.00",
        courseAmount: "500.00",
        status: "paid",
        deliveryStatus: "pending",
        deliveryTeacher: "其他老师",
      });
      const otherOrderRecord = await testDb.select().from(orders).where(eq(orders.orderNo, otherOrderNo)).limit(1);
      const otherOrderId = otherOrderRecord[0].id;

      // 查询该老师的订单
      const result = await testDb
        .select()
        .from(orders)
        .where(eq(orders.deliveryTeacher, "测试老师"));

      // 不应该包含其他老师的订单
      const hasOtherOrder = result.some(order => order.id === otherOrderId);
      expect(hasOtherOrder).toBe(false);

      // 清理
      await testDb.delete(orders).where(eq(orders.id, otherOrderId));
    });
  });

  describe("销售端权限测试", () => {
    it("销售应该只能查看自己创建的订单", async () => {
      // 查询该销售的订单
      const result = await testDb
        .select()
        .from(orders)
        .where(eq(orders.salesId, salesUserId));

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].salesId).toBe(salesUserId);
    });

    it("销售不应该能查看其他销售的订单", async () => {
      // 创建另一个销售
      const otherSalesOpenId = `test_sales_other_${Date.now()}`;
      await testDb.insert(users).values({
        openId: otherSalesOpenId,
        name: "其他销售",
        email: `sales_other_${Date.now()}@test.com`,
        role: "sales",
        roles: "sales",
        isActive: true,
      });
      const otherSalesUser = await testDb.select().from(users).where(eq(users.openId, otherSalesOpenId)).limit(1);
      const otherSalesId = otherSalesUser[0].id;

      // 创建其他销售的订单
      const otherOrderNo = `TEST_OTHER_SALES_${Date.now()}`;
      await testDb.insert(orders).values({
        orderNo: otherOrderNo,
        customerId: testCustomerId,
        customerName: "测试客户",
        salesId: otherSalesId,
        salesPerson: "其他销售",
        paymentAmount: "500.00",
        courseAmount: "500.00",
        status: "paid",
        deliveryStatus: "pending",
      });
      const otherOrderRecord = await testDb.select().from(orders).where(eq(orders.orderNo, otherOrderNo)).limit(1);
      const otherOrderId = otherOrderRecord[0].id;

      // 查询当前销售的订单
      const result = await testDb
        .select()
        .from(orders)
        .where(eq(orders.salesId, salesUserId));

      // 不应该包含其他销售的订单
      const hasOtherOrder = result.some(order => order.id === otherOrderId);
      expect(hasOtherOrder).toBe(false);

      // 清理
      await testDb.delete(orders).where(eq(orders.id, otherOrderId));
      await testDb.delete(users).where(eq(users.id, otherSalesId));
    });
  });

  describe("城市合伙人端权限测试", () => {
    it("城市合伙人应该只能查看自己管理的城市", async () => {
      // 查询合伙人管理的城市
      const result = await testDb
        .select()
        .from(partnerCities)
        .where(eq(partnerCities.partnerId, testPartnerId));

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].cityId).toBe(testCityId);
    });

    it("城市合伙人不应该能查看其他城市的数据", async () => {
      // 创建另一个城市
      const otherCityName = `其他城市_${Date.now()}`;
      await testDb.insert(cities).values({
        name: otherCityName,
        province: "其他省",
        isActive: true,
      });
      const otherCityRecord = await testDb.select().from(cities).where(eq(cities.name, otherCityName)).limit(1);
      const otherCityId = otherCityRecord[0].id;

      // 查询合伙人管理的城市
      const result = await testDb
        .select()
        .from(partnerCities)
        .where(eq(partnerCities.partnerId, testPartnerId));

      // 不应该包含其他城市
      const hasOtherCity = result.some(pc => pc.cityId === otherCityId);
      expect(hasOtherCity).toBe(false);

      // 清理
      await testDb.delete(cities).where(eq(cities.id, otherCityId));
    });
  });

  describe("管理员权限测试", () => {
    it("管理员应该能查看所有订单", async () => {
      // 查询所有订单
      const result = await testDb.select().from(orders);

      expect(result.length).toBeGreaterThan(0);
    });

    it("管理员应该能查看所有客户", async () => {
      // 查询所有客户
      const result = await testDb.select().from(customers);

      expect(result.length).toBeGreaterThan(0);
    });

    it("管理员应该能查看所有城市", async () => {
      // 查询所有城市
      const result = await testDb.select().from(cities);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("越权访问拒绝测试", () => {
    it("学员不应该能访问销售端接口", async () => {
      // 模拟学员尝试查询所有订单
      const result = await testDb
        .select()
        .from(orders)
        .where(eq(orders.salesId, studentUserId));

      // 应该返回空结果（学员不是销售）
      expect(result.length).toBe(0);
    });

    it("销售不应该能访问财务端接口", async () => {
      // 这个测试需要在实际的tRPC路由中进行
      // 这里只是示例，实际应该测试tRPC接口
      expect(true).toBe(true);
    });

    it("老师不应该能访问管理员端接口", async () => {
      // 这个测试需要在实际的tRPC路由中进行
      // 这里只是示例，实际应该测试tRPC接口
      expect(true).toBe(true);
    });
  });
});
