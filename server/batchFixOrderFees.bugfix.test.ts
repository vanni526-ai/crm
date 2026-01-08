import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { batchFixOrderFees, extractFeesFromText } from "./batchFixOrderFees";
import { orders } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("批量修正费用功能Bug修复验证", () => {
  let testOrderId: number;
  
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");
    
    // 创建测试订单:有老师费用,但备注中没有费用信息
    const [inserted] = await db.insert(orders).values({
      orderNo: `TEST-BUGFIX-${Date.now()}`,
      customerName: "测试客户",
      salesId: 999999, // 必需字段(整数类型)
      paymentAmount: "2800.00", // 必需字段
      deliveryCity: "泉州",
      courseAmount: "2800.00",
      teacherFee: "400.00", // 已有老师费用
      transportFee: "0.00",
      partnerFee: "0.00",
      notes: "这是一个测试订单,备注中没有费用信息", // 备注中没有费用
      createdAt: new Date(),
    });
    
    testOrderId = inserted.insertId;
    console.log(`[测试] 创建测试订单 ID: ${testOrderId}`);
  });
  
  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    
    // 清理测试订单
    await db.delete(orders).where(eq(orders.id, testOrderId));
    console.log(`[测试] 清理测试订单 ID: ${testOrderId}`);
  });
  
  it("应该保留原有的老师费用(不清零)", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");
    
    // 执行批量修正
    const result = await batchFixOrderFees();
    console.log(`[测试] 批量修正结果:`, result);
    
    // 查询测试订单
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, testOrderId));
    
    console.log(`[测试] 修正后的订单数据:`, {
      teacherFee: order.teacherFee,
      transportFee: order.transportFee,
      partnerFee: order.partnerFee,
    });
    
    // 验证:老师费用应该保持400.00,不应该被清零
    expect(parseFloat(order.teacherFee)).toBe(400);
    
    // 验证:合伙人费应该被正确计算 (2800 - 400) * 0.3 = 720
    expect(parseFloat(order.partnerFee)).toBe(720);
  });
  
  it("应该正确提取备注中的费用信息", () => {
    const text1 = "给老师500,老师打车50";
    const result1 = extractFeesFromText(text1);
    expect(result1.teacherFee).toBe(500);
    expect(result1.transportFee).toBe(50);
    
    const text2 = "课时费800";
    const result2 = extractFeesFromText(text2);
    expect(result2.teacherFee).toBe(800);
    
    const text3 = "没有费用信息的备注";
    const result3 = extractFeesFromText(text3);
    expect(result3.teacherFee).toBe(0);
    expect(result3.transportFee).toBe(0);
  });
  
  it("泉州城市应该按30%计算合伙人费", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");
    
    // 导入calculatePartnerFee函数
    const { calculatePartnerFee } = await import("./db");
    
    // 测试泉州的合伙人费计算
    const partnerFee = await calculatePartnerFee("泉州", 2800, 400);
    
    // (2800 - 400) * 0.3 = 720
    expect(partnerFee).toBe(720);
  });
});
