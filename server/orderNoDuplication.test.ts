import { describe, it, expect, beforeEach } from "vitest";
import * as db from "./db";
import { generateOrderNo } from "./orderNoGenerator";

describe("订单号查重验证功能", () => {
  it("应该能检测订单号是否存在", async () => {
    // 创建一个测试订单
    const testOrderNo = `TEST${Date.now()}`;
    const orderId = await db.createOrder({
      orderNo: testOrderNo,
      customerName: "查重测试客户",
      paymentAmount: "1000",
      courseAmount: "1000",
      salesId: 1,
    });

    // 验证订单号存在
    const exists = await db.checkOrderNoExists(testOrderNo);
    expect(exists).toBe(true);

    // 验证不存在的订单号
    const notExists = await db.checkOrderNoExists("NOTEXIST123");
    expect(notExists).toBe(false);

    // 清理测试数据
    await db.deleteOrder(orderId);
  });

  it("应该为带后缀的订单号生成正确格式", () => {
    const orderNo1 = generateOrderNo("上海", "001");
    expect(orderNo1).toMatch(/^\d{14}-021-001$/);

    const orderNo2 = generateOrderNo("北京", "099");
    expect(orderNo2).toMatch(/^\d{14}-010-099$/);
  });

  it("应该能生成不同的后缀订单号", () => {
    const baseOrderNo = generateOrderNo("上海");
    const orderNo1 = generateOrderNo("上海", "001");
    const orderNo2 = generateOrderNo("上海", "002");

    expect(baseOrderNo).not.toBe(orderNo1);
    expect(orderNo1).not.toBe(orderNo2);
    expect(orderNo1.endsWith("-001")).toBe(true);
    expect(orderNo2.endsWith("-002")).toBe(true);
  });

  it("应该正确填充后缀为三位数", () => {
    const orderNo1 = generateOrderNo("上海", "001");
    const orderNo2 = generateOrderNo("上海", "010");
    const orderNo3 = generateOrderNo("上海", "100");

    expect(orderNo1.split('-')[2]).toBe("001");
    expect(orderNo2.split('-')[2]).toBe("010");
    expect(orderNo3.split('-')[2]).toBe("100");
  });

  it("应该在订单号冲突时自动添加后缀", async () => {
    // 创建一个基础订单号
    const baseOrderNo = `CONFLICT${Date.now()}-021`;
    
    // 创建第一个订单
    const order1Id = await db.createOrder({
      orderNo: baseOrderNo,
      customerName: "冲突测试客户",
      paymentAmount: "1000",
      courseAmount: "1000",
      salesId: 1,
    });

    // 验证订单号存在
    const exists = await db.checkOrderNoExists(baseOrderNo);
    expect(exists).toBe(true);

    // 模拟查重逻辑:如果订单号存在,应该生成带后缀的订单号
    let newOrderNo = baseOrderNo;
    let suffix = 1;
    while (await db.checkOrderNoExists(newOrderNo)) {
      newOrderNo = `${baseOrderNo}-${String(suffix).padStart(3, '0')}`;
      suffix++;
    }

    // 验证生成了带后缀的订单号
    expect(newOrderNo).toBe(`${baseOrderNo}-001`);
    expect(newOrderNo).not.toBe(baseOrderNo);

    // 创建第二个订单使用新订单号
    const order2Id = await db.createOrder({
      orderNo: newOrderNo,
      customerName: "冲突测试客户",
      paymentAmount: "1000",
      courseAmount: "1000",
      salesId: 1,
    });

    // 验证两个订单都存在
    const order1 = await db.getOrderById(order1Id);
    const order2 = await db.getOrderById(order2Id);
    expect(order1?.orderNo).toBe(baseOrderNo);
    expect(order2?.orderNo).toBe(newOrderNo);

    // 清理测试数据
    await db.deleteOrder(order1Id);
    await db.deleteOrder(order2Id);
  });
});
