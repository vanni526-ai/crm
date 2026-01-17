import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Gmail导入 - 合伙人费计算测试", () => {
  describe("天津订单合伙人费计算 (50%)", () => {
    it("天津订单: 课程1200元, 老师费200元 → 合伙人费应为500元", async () => {
      // (1200 - 200) * 0.5 = 500
      const partnerFee = await db.calculatePartnerFee("天津", 1200, 200);
      expect(partnerFee).toBe(500);
    });

    it("天津订单: 课程1800元, 老师费400元 → 合伙人费应为700元", async () => {
      // (1800 - 400) * 0.5 = 700
      const partnerFee = await db.calculatePartnerFee("天津", 1800, 400);
      expect(partnerFee).toBe(700);
    });
  });

  describe("武汉订单合伙人费计算 (40%)", () => {
    it("武汉订单: 课程1200元, 老师费200元 → 合伙人费应为400元", async () => {
      // (1200 - 200) * 0.4 = 400
      const partnerFee = await db.calculatePartnerFee("武汉", 1200, 200);
      expect(partnerFee).toBe(400);
    });

    it("武汉订单: 课程1800元, 老师费400元 → 合伙人费应为560元", async () => {
      // (1800 - 400) * 0.4 = 560
      const partnerFee = await db.calculatePartnerFee("武汉", 1800, 400);
      expect(partnerFee).toBe(560);
    });
  });

  describe("理论课老师费用为0时的合伙人费计算", () => {
    it("天津理论课: 课程1200元, 老师费0元 → 合伙人费应为600元", async () => {
      // (1200 - 0) * 0.5 = 600
      const partnerFee = await db.calculatePartnerFee("天津", 1200, 0);
      expect(partnerFee).toBe(600);
    });

    it("武汉理论课: 课程1200元, 老师费0元 → 合伙人费应为480元", async () => {
      // (1200 - 0) * 0.4 = 480
      const partnerFee = await db.calculatePartnerFee("武汉", 1200, 0);
      expect(partnerFee).toBe(480);
    });
  });

  describe("边界情况测试", () => {
    it("城市为null时应返回0", async () => {
      const partnerFee = await db.calculatePartnerFee(null, 1200, 200);
      expect(partnerFee).toBe(0);
    });

    it("城市为空字符串时应返回0", async () => {
      const partnerFee = await db.calculatePartnerFee("", 1200, 200);
      expect(partnerFee).toBe(0);
    });

    it("课程金额等于老师费用时应返回0", async () => {
      const partnerFee = await db.calculatePartnerFee("天津", 1000, 1000);
      expect(partnerFee).toBe(0);
    });

    it("课程金额小于老师费用时应返回0", async () => {
      const partnerFee = await db.calculatePartnerFee("天津", 800, 1000);
      expect(partnerFee).toBe(0);
    });
  });
});
