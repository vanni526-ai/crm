/**
 * 月度合伙人费用统计功能单元测试
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { orders, cityPartnerConfig } from "../drizzle/schema";
import { getMonthlyPartnerSettlement, getPartnerSettlementByDateRange } from "./partnerSettlement";
import { eq } from "drizzle-orm";

describe("月度合伙人费用统计", () => {
  let testOrderIds: number[] = [];
  let testCityConfigIds: number[] = [];

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 清理测试数据
    await db.delete(orders).where(eq(orders.customerName, "测试客户_合伙人费用统计"));
    await db.delete(cityPartnerConfig).where(eq(cityPartnerConfig.city, "测试城市A"));
    await db.delete(cityPartnerConfig).where(eq(cityPartnerConfig.city, "测试城市B"));

    // 创建测试城市配置
    const cityAResult = await db.insert(cityPartnerConfig).values({
      city: "测试城市A",
      partnerFeeRate: 0.3, // 30%
      isActive: true,
      updatedBy: 1, // 测试用户ID
    });
    testCityConfigIds.push(Number(cityAResult.insertId));

    const cityBResult = await db.insert(cityPartnerConfig).values({
      city: "测试城市B",
      partnerFeeRate: 0.5, // 50%
      isActive: true,
      updatedBy: 1, // 测试用户ID
    });
    testCityConfigIds.push(Number(cityBResult.insertId));

    // 创建测试订单 - 2025年1月
    const testDate1 = new Date("2025-01-15");
    const order1 = await db.insert(orders).values({
      orderNo: "TEST_PARTNER_001",
      customerName: "测试客户_合伙人费用统计",
      deliveryCity: "测试城市A",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      teacherFee: "300.00",
      transportFee: "50.00",
      otherFee: "20.00",
      partnerFee: "189.00", // (1000 - 300 - 50 - 20) * 0.3 = 189
      classDate: testDate1,
      status: "completed",
      salesId: 1, // 测试用户ID
      createdAt: new Date(),
    });
    testOrderIds.push(Number(order1.insertId));

    const order2 = await db.insert(orders).values({
      orderNo: "TEST_PARTNER_002",
      paymentAmount: "2000.00",
      customerName: "测试客户_合伙人费用统计",
      deliveryCity: "测试城市A",
      courseAmount: "2000.00",
      teacherFee: "600.00",
      transportFee: "100.00",
      otherFee: "0.00",
      partnerFee: "390.00", // (2000 - 600 - 100) * 0.3 = 390
      classDate: testDate1,
      status: "completed",
      salesId: 1, // 测试用户ID
      createdAt: new Date(),
    });
    testOrderIds.push(Number(order2.insertId));

    const order3 = await db.insert(orders).values({
      orderNo: "TEST_PARTNER_003",
      paymentAmount: "1500.00",
      customerName: "测试客户_合伙人费用统计",
      deliveryCity: "测试城市B",
      courseAmount: "1500.00",
      teacherFee: "400.00",
      transportFee: "80.00",
      otherFee: "10.00",
      partnerFee: "505.00", // (1500 - 400 - 80 - 10) * 0.5 = 505
      classDate: testDate1,
      status: "completed",
      salesId: 1, // 测试用户ID
      createdAt: new Date(),
    });
    testOrderIds.push(Number(order3.insertId));

    // 创建测试订单 - 2025年2月(不应该被1月统计包含)
    const testDate2 = new Date("2025-02-10");
    const order4 = await db.insert(orders).values({
      orderNo: "TEST_PARTNER_004",
      paymentAmount: "3000.00",
      customerName: "测试客户_合伙人费用统计",
      deliveryCity: "测试城市A",
      courseAmount: "3000.00",
      teacherFee: "900.00",
      transportFee: "150.00",
      otherFee: "0.00",
      partnerFee: "585.00", // (3000 - 900 - 150) * 0.3 = 585
      classDate: testDate2,
      status: "completed",
      salesId: 1, // 测试用户ID
      createdAt: new Date(),
    });
    testOrderIds.push(Number(order4.insertId));

    // 创建已取消的订单(不应该被统计)
    const order5 = await db.insert(orders).values({
      orderNo: "TEST_PARTNER_005",
      paymentAmount: "5000.00",
      customerName: "测试客户_合伙人费用统计",
      deliveryCity: "测试城市A",
      courseAmount: "5000.00",
      teacherFee: "1500.00",
      transportFee: "200.00",
      otherFee: "0.00",
      partnerFee: "990.00",
      classDate: testDate1,
      status: "cancelled",
      salesId: 1, // 测试用户ID
      createdAt: new Date(),
    });
    testOrderIds.push(Number(order5.insertId));
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // 清理测试数据
    for (const id of testOrderIds) {
      await db.delete(orders).where(eq(orders.id, id));
    }
    for (const id of testCityConfigIds) {
      await db.delete(cityPartnerConfig).where(eq(cityPartnerConfig.id, id));
    }
  });

  it("应该正确统计2025年1月的合伙人费用", async () => {
    const result = await getMonthlyPartnerSettlement(2025, 1);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThanOrEqual(2); // 至少有测试城市A和B

    // 查找测试城市A的统计
    const cityA = result.find((item) => item.city === "测试城市A");
    expect(cityA).toBeDefined();
    expect(cityA?.orderCount).toBe(2); // 2个订单(不包括已取消的)
    expect(cityA?.totalCourseAmount).toBe(3000); // 1000 + 2000
    expect(cityA?.totalTeacherFee).toBe(900); // 300 + 600
    expect(cityA?.totalTransportFee).toBe(150); // 50 + 100
    expect(cityA?.totalOtherFee).toBe(20); // 20 + 0
    expect(cityA?.totalPartnerFee).toBe(579); // 189 + 390
    expect(cityA?.partnerFeeRate).toBe(30); // 30%

    // 查找测试城市B的统计
    const cityB = result.find((item) => item.city === "测试城市B");
    expect(cityB).toBeDefined();
    expect(cityB?.orderCount).toBe(1);
    expect(cityB?.totalCourseAmount).toBe(1500);
    expect(cityB?.totalTeacherFee).toBe(400);
    expect(cityB?.totalTransportFee).toBe(80);
    expect(cityB?.totalOtherFee).toBe(10);
    expect(cityB?.totalPartnerFee).toBe(505);
    expect(cityB?.partnerFeeRate).toBe(50); // 50%
  });

  it("应该正确统计2025年2月的合伙人费用", async () => {
    const result = await getMonthlyPartnerSettlement(2025, 2);

    expect(result).toBeDefined();

    // 查找测试城市A的统计
    const cityA = result.find((item) => item.city === "测试城市A");
    expect(cityA).toBeDefined();
    expect(cityA?.orderCount).toBe(1); // 只有1个2月的订单
    expect(cityA?.totalCourseAmount).toBe(3000);
    expect(cityA?.totalPartnerFee).toBe(585);
  });

  it("应该正确按日期范围统计合伙人费用", async () => {
    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-01-31");
    endDate.setHours(23, 59, 59, 999);

    const result = await getPartnerSettlementByDateRange(startDate, endDate);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThanOrEqual(2);

    // 验证测试城市A的统计
    const cityA = result.find((item) => item.city === "测试城市A");
    expect(cityA).toBeDefined();
    expect(cityA?.orderCount).toBe(2);
    expect(cityA?.totalPartnerFee).toBe(579);

    // 验证测试城市B的统计
    const cityB = result.find((item) => item.city === "测试城市B");
    expect(cityB).toBeDefined();
    expect(cityB?.orderCount).toBe(1);
    expect(cityB?.totalPartnerFee).toBe(505);
  });

  it("应该排除已取消的订单", async () => {
    const result = await getMonthlyPartnerSettlement(2025, 1);

    const cityA = result.find((item) => item.city === "测试城市A");
    expect(cityA).toBeDefined();
    // 如果包含已取消的订单,orderCount应该是3,但实际应该是2
    expect(cityA?.orderCount).toBe(2);
    // 如果包含已取消的订单,totalPartnerFee应该是1569,但实际应该是579
    expect(cityA?.totalPartnerFee).toBe(579);
  });

  it("应该按合伙人费用从高到低排序", async () => {
    const result = await getMonthlyPartnerSettlement(2025, 1);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);

    // 验证排序
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].totalPartnerFee).toBeGreaterThanOrEqual(result[i + 1].totalPartnerFee);
    }
  });

  it("应该处理没有数据的月份", async () => {
    const result = await getMonthlyPartnerSettlement(2025, 12);

    expect(result).toBeDefined();
    // 可能有其他城市的数据,但测试城市应该不在结果中
    const cityA = result.find((item) => item.city === "测试城市A");
    const cityB = result.find((item) => item.city === "测试城市B");
    expect(cityA).toBeUndefined();
    expect(cityB).toBeUndefined();
  });

  it("应该正确显示合伙人费率百分比", async () => {
    const result = await getMonthlyPartnerSettlement(2025, 1);

    const cityA = result.find((item) => item.city === "测试城市A");
    expect(cityA?.partnerFeeRate).toBe(30); // 30%

    const cityB = result.find((item) => item.city === "测试城市B");
    expect(cityB?.partnerFeeRate).toBe(50); // 50%
  });
});
