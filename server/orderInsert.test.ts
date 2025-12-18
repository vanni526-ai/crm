import { describe, it, expect, beforeAll } from "vitest";
import { parseOrderExcel, parseDate } from "./orderExcelParser";
import * as db from "./db";
import * as fs from "fs";

describe("订单插入测试", () => {
  let firstOrderData: any;
  
  beforeAll(async () => {
    const testFilePath = "/home/ubuntu/upload/pasted_file_3E1JWF_瀛姬智能解析结果_2242条.xlsx";
    
    if (!fs.existsSync(testFilePath)) {
      throw new Error("测试文件不存在");
    }
    
    const buffer = fs.readFileSync(testFilePath);
    const orders = await parseOrderExcel(buffer);
    
    const firstOrder = orders[0];
    const paymentDate = parseDate(firstOrder.支付日期);
    const classDate = parseDate(firstOrder.上课日期);
    
    firstOrderData = {
      orderNo: `TEST-${Date.now()}`,
      customerName: firstOrder.客户微信号 || "未知客户",
      customerWechat: firstOrder.客户微信号,
      salesPerson: firstOrder.销售人,
      trafficSource: firstOrder.流量来源,
      paymentAmount: firstOrder.课程金额.toString(),
      courseAmount: firstOrder.课程金额.toString(),
      downPayment: firstOrder.首付金额.toString(),
      finalPayment: firstOrder.尾款金额.toString(),
      rechargeAmount: firstOrder.充值金额.toString(),
      accountBalance: firstOrder.账户余额.toString(),
      teacherFee: firstOrder.老师费用.toString(),
      transportFee: firstOrder.车费.toString(),
      otherFee: firstOrder.其他费用.toString(),
      partnerFee: firstOrder.合伙人费用.toString(),
      netIncome: firstOrder.净收入.toString(),
      paymentChannel: firstOrder.支付渠道,
      channelOrderNo: firstOrder.订单号,
      paymentDate: paymentDate,
      paymentTime: firstOrder.支付时间,
      classDate: classDate,
      classTime: firstOrder.上课时间,
      deliveryCity: firstOrder.交付城市,
      deliveryRoom: firstOrder.交付教室,
      deliveryTeacher: firstOrder.交付老师,
      deliveryCourse: firstOrder.交付课程,
      status: "pending" as const,
      confidence: firstOrder.置信度,
      notes: firstOrder.备注,
      originalText: firstOrder.原始文本,
      customerId: 0,
      salesId: 1,
    };
  });
  
  it("应该能够插入单条订单", async () => {
    console.log("准备插入的订单数据:", JSON.stringify(firstOrderData, null, 2));
    
    try {
      const orderId = await db.createOrder(firstOrderData);
      console.log("成功插入订单,ID:", orderId);
      expect(orderId).toBeGreaterThan(0);
    } catch (error: any) {
      console.error("插入订单失败:", error.message);
      console.error("错误堆栈:", error.stack);
      throw error;
    }
  });
});
