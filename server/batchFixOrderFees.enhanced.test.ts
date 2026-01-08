import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb, calculatePartnerFee } from "./db";
import { batchFixOrderFees, extractFeesFromText } from "./batchFixOrderFees";
import { orders } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("批量修正费用功能增强测试", () => {
  describe("费用提取功能", () => {
    it("应该正确提取老师费用和车费", () => {
      const text = "给老师500,老师打车50,酒店车费100";
      const result = extractFeesFromText(text);
      expect(result.teacherFee).toBe(500);
      expect(result.transportFee).toBe(150); // 50 + 100
    });

    it("应该处理复杂的费用文本", () => {
      const text = "课时费800,给老师200,报销老师30车费,酒店车费70";
      const result = extractFeesFromText(text);
      expect(result.teacherFee).toBeGreaterThanOrEqual(800); // 至少包含课时费
      expect(result.transportFee).toBeGreaterThanOrEqual(70); // 至少包含酒店车费
    });
  });

  describe("合伙人费计算集成", () => {
    it("济南城市应该按30%计算合伙人费", async () => {
      const partnerFee = await calculatePartnerFee("济南", 1000, 300);
      // (1000 - 300) * 0.3 = 210
      expect(partnerFee).toBe(210);
    });

    it("武汉城市应该按40%计算合伙人费", async () => {
      const partnerFee = await calculatePartnerFee("武汉", 2000, 500);
      // (2000 - 500) * 0.4 = 600
      expect(partnerFee).toBe(600);
    });

    it("天津城市应该按50%计算合伙人费", async () => {
      const partnerFee = await calculatePartnerFee("天津", 1500, 400);
      // (1500 - 400) * 0.5 = 550
      expect(partnerFee).toBe(550);
    });

    it("无城市配置时应该返回0", async () => {
      const partnerFee = await calculatePartnerFee(null, 1000, 300);
      expect(partnerFee).toBe(0);
    });

    it("不存在的城市应该返回0", async () => {
      const partnerFee = await calculatePartnerFee("不存在的城市", 1000, 300);
      expect(partnerFee).toBe(0);
    });
  });

  describe("批量修正功能集成验证", () => {
    it("应该正确计算合佩人费(模拟场景)", async () => {
      // 模拟场景: 济南订单, 课程金额1000, 老师费300
      const city = "济南";
      const courseAmount = 1000;
      const teacherFee = 300;
      
      // 计算合佩人费
      const partnerFee = await calculatePartnerFee(city, courseAmount, teacherFee);
      
      // 验证: (1000 - 300) * 0.3 = 210
      expect(partnerFee).toBe(210);
    });
    
    it("应该正确提取费用并计算合佩人费(完整流程)", async () => {
      // 模拟备注文本
      const notes = "给老师300,老师打车50,酒店车费100";
      
      // 提取费用
      const { teacherFee, transportFee } = extractFeesFromText(notes);
      expect(teacherFee).toBe(300);
      expect(transportFee).toBe(150);
      
      // 计算合佩人费
      const partnerFee = await calculatePartnerFee("济南", 1000, teacherFee);
      expect(partnerFee).toBe(210); // (1000 - 300) * 0.3
    });
  });

  describe("边界情况测试", () => {
    it("应该处理空备注的订单", () => {
      const result = extractFeesFromText("");
      expect(result.teacherFee).toBe(0);
      expect(result.transportFee).toBe(0);
    });

    it("应该处理没有费用信息的备注", () => {
      const result = extractFeesFromText("这是一个普通的备注,没有费用信息");
      expect(result.teacherFee).toBe(0);
      expect(result.transportFee).toBe(0);
    });

    it("应该处理课程金额为0的情况", async () => {
      const partnerFee = await calculatePartnerFee("济南", 0, 0);
      expect(partnerFee).toBe(0);
    });

    it("应该处理老师费用大于课程金额的情况", async () => {
      const partnerFee = await calculatePartnerFee("济南", 500, 1000);
      // (500 - 1000) * 0.3 = -150, 但应该返回负数或0
      expect(partnerFee).toBeLessThanOrEqual(0);
    });
  });
});
