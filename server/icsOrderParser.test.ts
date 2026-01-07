import { describe, it, expect, beforeAll } from "vitest";
import { parseICSOrderContent } from "./icsOrderParser";
import * as db from "./db";

describe("ICS订单解析器集成测试", () => {
  beforeAll(async () => {
    // 确保数据库连接正常
    await db.getDb();
  });

  it("应该能够解析真实的ICS事件并返回订单数据结构", async () => {
    const mockEvents = [
      {
        summary: "七七 线上理论课 水不在深有龙则呜 姜一 全款350",
        description: "",
        location: "线上",
        startTime: new Date("2025-12-16T10:00:00Z"),
        endTime: new Date("2025-12-16T11:00:00Z"),
        organizer: "姜一",
        attendees: [],
      },
    ];

    const orders = await parseICSOrderContent(mockEvents);

    // 验证基本结构
    expect(orders).toBeInstanceOf(Array);
    expect(orders.length).toBeGreaterThan(0);
    
    // 验证返回的订单包含必要字段
    const order = orders[0];
    expect(order).toHaveProperty("salesperson");
    expect(order).toHaveProperty("customerName");
    expect(order).toHaveProperty("classDate");
    expect(order).toHaveProperty("classTime");
    expect(order).toHaveProperty("course");
    expect(order).toHaveProperty("teacher");
    expect(order).toHaveProperty("city");
    expect(order).toHaveProperty("classroom");
    expect(order).toHaveProperty("paymentAmount");
    expect(order).toHaveProperty("courseAmount");
    expect(order).toHaveProperty("originalText");
    
    // 验证原始文本被保留
    expect(order.originalText).toBeTruthy();
    
    // 验证金额字段为数字类型
    expect(typeof order.paymentAmount).toBe("number");
    expect(typeof order.courseAmount).toBe("number");
    expect(typeof order.teacherFee).toBe("number");
    expect(typeof order.carFee).toBe("number");
    
    console.log("解析结果示例:", JSON.stringify(order, null, 2));
  }, 60000); // 60秒超时,足够LLM处理

  it("应该能够批量解析多个ICS事件", async () => {
    const mockEvents = [
      {
        summary: "山竹 基础局 米妮 2400已付",
        description: "",
        location: "上海1101教室",
        startTime: new Date("2025-12-18T12:30:00Z"),
        endTime: new Date("2025-12-18T14:30:00Z"),
        organizer: "米妮",
        attendees: [],
      },
      {
        summary: "嘟嘟 基础局 唐泽 1200已付",
        description: "",
        location: "404教室",
        startTime: new Date("2025-12-20T13:00:00Z"),
        endTime: new Date("2025-12-20T15:00:00Z"),
        organizer: "唐泽",
        attendees: [],
      },
    ];

    const orders = await parseICSOrderContent(mockEvents);

    // 验证返回的订单数量
    expect(orders).toBeInstanceOf(Array);
    expect(orders.length).toBe(2);
    
    // 验证每个订单都有基本字段
    orders.forEach(order => {
      expect(order).toHaveProperty("teacher");
      expect(order).toHaveProperty("paymentAmount");
      expect(order.paymentAmount).toBeGreaterThan(0);
    });
    
    console.log(`成功解析${orders.length}个订单`);
  }, 60000);
});
