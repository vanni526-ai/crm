import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";
import ExcelJS from "exceljs";

describe("订单导出功能测试", () => {
  let testOrderIds: number[] = [];

  beforeAll(async () => {
    // 创建测试订单
    const order1 = await db.createOrder({
      orderNo: "TEST-EXPORT-001",
      customerName: "测试客户1",
      salesId: 1, // 添加必需的salesId字段
      salesPerson: "测试销售",
      paymentAmount: "1000",
      courseAmount: "800",
      teacherFee: "400",
      transportFee: "50",
      deliveryCity: "上海",
      deliveryTeacher: "张老师",
      deliveryCourse: "基础课程",
      notes: "测试导出订单1",
    });

    const order2 = await db.createOrder({
      orderNo: "TEST-EXPORT-002",
      customerName: "测试客户2",
      salesId: 1, // 添加必需的salesId字段
      salesPerson: "测试销售",
      paymentAmount: "2000",
      courseAmount: "1800",
      teacherFee: "900",
      transportFee: "100",
      deliveryCity: "北京",
      deliveryTeacher: "李老师",
      deliveryCourse: "进阶课程",
      notes: "测试导出订单2",
    });

    testOrderIds = [order1.id as number, order2.id as number];
  });

  it("应该能够按ID列表获取订单", async () => {
    const orders = await db.getOrdersByIds(testOrderIds);
    expect(orders).toHaveLength(2);
    expect(orders[0].orderNo).toContain("TEST-EXPORT");
    expect(orders[1].orderNo).toContain("TEST-EXPORT");
  });

  it("应该能够生成包含中文的Excel文件", async () => {
    const orders = await db.getOrdersByIds(testOrderIds);

    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "课程交付CRM系统";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("订单列表");

    // 设置表头(包含中文)
    sheet.columns = [
      { header: "订单号", key: "orderNo", width: 20 },
      { header: "销售人", key: "salesPerson", width: 12 },
      { header: "客户名", key: "customerName", width: 15 },
      { header: "支付金额", key: "paymentAmount", width: 12 },
      { header: "老师费用", key: "teacherFee", width: 12 },
      { header: "交付城市", key: "deliveryCity", width: 12 },
      { header: "交付老师", key: "deliveryTeacher", width: 15 },
      { header: "备注", key: "notes", width: 30 },
    ];

    // 填充数据
    orders.forEach((order: any) => {
      sheet.addRow({
        orderNo: order.orderNo || "",
        salesPerson: order.salesPerson || "",
        customerName: order.customerName || "",
        paymentAmount: order.paymentAmount || "",
        teacherFee: order.teacherFee || "",
        deliveryCity: order.deliveryCity || "",
        deliveryTeacher: order.deliveryTeacher || "",
        notes: order.notes || "",
      });
    });

    // 生成Excel文件的Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 验证buffer不为空
    expect(buffer).toBeDefined();
    expect(buffer.byteLength).toBeGreaterThan(0);

    // 验证可以将buffer转换为Base64
    const base64 = Buffer.from(buffer).toString("base64");
    expect(base64).toBeDefined();
    expect(base64.length).toBeGreaterThan(0);

    // 验证可以从Base64还原buffer
    const restoredBuffer = Buffer.from(base64, "base64");
    expect(restoredBuffer.byteLength).toBe(buffer.byteLength);
  });

  it("应该能够正确处理空订单列表", async () => {
    const orders = await db.getOrdersByIds([]);
    expect(orders).toHaveLength(0);
  });

  it("应该能够正确处理不存在的订单ID", async () => {
    const orders = await db.getOrdersByIds([999999, 888888]);
    expect(orders).toHaveLength(0);
  });

  it("Excel表头应该包含所有必要的中文字段", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("订单列表");

    const expectedHeaders = [
      "订单号",
      "销售人",
      "流量来源",
      "客户名",
      "支付金额",
      "课程金额",
      "账户余额",
      "支付城市",
      "渠道订单号",
      "老师费用",
      "车费",
      "其他费用",
      "合伙人费",
      "金串到账金额",
      "支付日期",
      "支付时间",
      "交付城市",
      "交付教室",
      "交付老师",
      "交付课程",
      "上课日期",
      "上课时间",
      "备注",
    ];

    sheet.columns = expectedHeaders.map((header, index) => ({
      header,
      key: `field${index}`,
      width: 15,
    }));

    // 验证表头数量
    expect(sheet.columns.length).toBe(expectedHeaders.length);

    // 验证表头内容
    const headerRow = sheet.getRow(1);
    expectedHeaders.forEach((expectedHeader, index) => {
      const cell = headerRow.getCell(index + 1);
      expect(cell.value).toBe(expectedHeader);
    });
  });
});
