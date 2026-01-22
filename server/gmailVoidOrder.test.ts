import { describe, it, expect, beforeAll } from "vitest";
import { parseGmailOrderContent } from "./gmailOrderParser";
import {
  createOrder,
  deleteOrderByChannelOrderNo,
  getOrderByChannelOrderNo,
} from "./db";

describe("Gmail导入 - 作废订单删除功能", () => {
  const testChannelOrderNo = `TEST_VOID_${Date.now()}`;
  let testOrderNo: string;

  beforeAll(async () => {
    // 创建一个测试订单
    testOrderNo = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
    await createOrder({
      orderNo: testOrderNo,
      customerName: "测试客户",
      salesPerson: "测试销售",
      salesId: 1,
      trafficSource: "测试来源",
      paymentAmount: "1000",
      courseAmount: "1000",
      accountBalance: "0",
      teacherFee: "300",
      transportFee: "0",
      partnerFee: "0",
      channelOrderNo: testChannelOrderNo,
      paymentChannel: "支付宝",
      deliveryCity: "上海",
      deliveryRoom: "404教室",
      deliveryTeacher: "测试老师",
      deliveryCourse: "测试课程",
      classDate: new Date("2026-01-20"),
      classTime: "14:00-16:00",
      notes: "测试订单",
      originalText: "测试订单原始文本",
      createdAt: new Date(),
    });
  });

  it("应该能够识别作废订单(客户名以'作废'开头)", { timeout: 15000 }, async () => {
    const emailContent = `
瀛姬测试账号  12:00
作废-测试客户 1.20 14:00-16:00 测试课程 测试老师上 上海404教室 1000全款已付 交易单号${testChannelOrderNo}
    `.trim();

    const parsedOrders = await parseGmailOrderContent(emailContent);
    
    expect(parsedOrders.length).toBeGreaterThan(0);
    expect(parsedOrders[0].customerName).toMatch(/^作废/);
    expect(parsedOrders[0].channelOrderNo).toBe(testChannelOrderNo);
  });

  it("应该能够根据渠道订单号删除订单", async () => {
    // 验证订单存在
    const orderBefore = await getOrderByChannelOrderNo(testChannelOrderNo);
    expect(orderBefore).not.toBeNull();
    expect(orderBefore?.orderNo).toBe(testOrderNo);

    // 删除订单
    const deletedOrder = await deleteOrderByChannelOrderNo(testChannelOrderNo);
    expect(deletedOrder).not.toBeNull();
    expect(deletedOrder?.orderNo).toBe(testOrderNo);
    expect(deletedOrder?.customerName).toBe("测试客户");

    // 验证订单已删除
    const orderAfter = await getOrderByChannelOrderNo(testChannelOrderNo);
    expect(orderAfter).toBeNull();
  });

  it("删除不存在的订单应该返回null", async () => {
    const result = await deleteOrderByChannelOrderNo("NONEXISTENT_ORDER_NO");
    expect(result).toBeNull();
  });

  it("作废订单的LLM解析应该保留完整的客户名", { timeout: 15000 }, async () => {
    const emailContent = `
瀛姬测试账号  12:00
作废-张三 1.20 14:00-16:00 测试课程 测试老师上 上海404教室 1000全款已付 交易单号TEST123456
    `.trim();

    const parsedOrders = await parseGmailOrderContent(emailContent);
    
    expect(parsedOrders.length).toBeGreaterThan(0);
    expect(parsedOrders[0].customerName).toBe("作废-张三");
  });
});
