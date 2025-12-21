import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  checkChannelOrderNoExists,
  getOrderByChannelOrderNo,
  createOrder,
} from "./db";

describe("渠道订单号重复检测测试", () => {
  const testChannelOrderNo = `TEST_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  let testOrderId: number;

  beforeAll(async () => {
    // 创建测试订单
    const orderNo = `TEST_ORD_${Date.now()}`;
    const order = await createOrder({
      orderNo,
      customerName: "测试客户",
      salesId: 1,
      paymentAmount: "100",
      courseAmount: "100",
      channelOrderNo: testChannelOrderNo,
      paymentChannel: "支付宝",
      status: "paid",
    });
    testOrderId = order.id;
  });

  afterAll(async () => {
    // 清理测试数据
    const { getDb } = await import("./db");
    const db = await getDb();
    if (db) {
      const { orders } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.delete(orders).where(eq(orders.id, testOrderId));
    }
  });

  it("应该能检测到已存在的渠道订单号", async () => {
    const exists = await checkChannelOrderNoExists(testChannelOrderNo);
    expect(exists).toBe(true);
  });

  it("应该能检测到不存在的渠道订单号", async () => {
    const exists = await checkChannelOrderNoExists("NONEXISTENT_ORDER_NO");
    expect(exists).toBe(false);
  });

  it("应该能根据渠道订单号查找订单", async () => {
    const order = await getOrderByChannelOrderNo(testChannelOrderNo);
    expect(order).not.toBeNull();
    expect(order?.channelOrderNo).toBe(testChannelOrderNo);
    expect(order?.customerName).toBe("测试客户");
  });

  it("查找不存在的渠道订单号应该返回null", async () => {
    const order = await getOrderByChannelOrderNo("NONEXISTENT_ORDER_NO");
    expect(order).toBeNull();
  });

  it("创建订单时应该拒绝重复的渠道订单号", async () => {
    try {
      await createOrder({
        orderNo: `TEST_ORD_DUP_${Date.now()}`,
        customerName: "重复测试客户",
        salesId: 1,
        paymentAmount: "200",
        courseAmount: "200",
        channelOrderNo: testChannelOrderNo, // 使用已存在的渠道订单号
        paymentChannel: "微信支付",
        status: "paid",
      });
      // 如果没有抛出错误,测试失败
      expect(true).toBe(false);
    } catch (error: any) {
      // 应该抛出错误
      expect(error.message).toContain("渠道订单号已存在");
    }
  });
});
