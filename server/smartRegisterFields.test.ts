import { describe, it, expect } from "vitest";
import { parseTransferNotes } from "./transferNoteParser";

describe("智能登记字段提取测试", () => {
  it("应该正确提取用户示例文本中的所有字段", async () => {
    const text = `山竹 12.22 20:00-21:30 情趣变装课 黑桃上 晓曦东晨 1888全款微信已付 (上海404) 给老师300 交易单号4200002912202512208697791196`;

    const orders = await parseTransferNotes(text);

    expect(orders).toHaveLength(1);

    const order = orders[0];

    // 验证销售人(花名"山竹"应该转换为真实姓名"王舒婷")
    expect(order.salesperson).toBe("王舒婷");

    // 验证客户名
    expect(order.customerName).toBe("晓曦东晨");

    // 验证支付金额
    expect(order.paymentAmount).toBe("1888");

    // 验证支付方式
    expect(order.paymentMethod).toContain("微信");

    // 验证渠道订单号
    expect(order.channelOrderNo).toBe("4200002912202512208697791196");

    // 验证老师费用
    expect(order.teacherFee).toBe("300");

    // 验证交付城市
    expect(order.deliveryCity).toBe("上海");

    // 验证交付教室
    expect(order.deliveryRoom).toBe("404");

    // 验证交付老师
    expect(order.deliveryTeacher).toContain("黑桃");

    // 验证交付课程
    expect(order.deliveryCourse).toBe("情趣变装课");

    // 验证上课日期
    expect(order.classDate).toMatch(/2024-12-22|2025-12-22/);

    // 验证上课时间
    expect(order.classTime).toBe("20:00-21:30");
  }, 15000);

  it("应该正确处理带车费的订单", async () => {
    const text = `山竹 12.22 20:00-21:30 情趣变装课 黑桃上 晓曦东晨 1888全款微信已付 (上海404) 给老师300 报销车费50 交易单号4200002912202512208697791196`;

    const orders = await parseTransferNotes(text);

    expect(orders).toHaveLength(1);

    const order = orders[0];

    // 验证老师费用
    expect(order.teacherFee).toBe("300");

    // 验证车费
    expect(order.transportFee).toBe("50");
  }, 15000);

  it("应该正确处理没有客户名的订单", async () => {
    const text = `山竹 12.22 20:00-21:30 情趣变装课 黑桃上 1888全款微信已付 (上海404) 给老师300`;

    const orders = await parseTransferNotes(text);

    expect(orders).toHaveLength(1);

    const order = orders[0];

    // 验证销售人(花名"山竹"应该转换为真实姓名"王舒婷")
    expect(order.salesperson).toBe("王舒婷");

    // 验证客户名为空或不是老师名/城市名
    if (order.customerName) {
      expect(order.customerName).not.toBe("黑桃");
      expect(order.customerName).not.toBe("上海");
    }

    // 验证老师费用
    expect(order.teacherFee).toBe("300");
  }, 15000);
});
