import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Gmail导入 - 合伙人费计算测试", () => {
  describe("天津订单合伙人费计算 (50%)", () => {
    it("天津订单: 课程1200元, 老师费200元, 车费50元 → 合伙人费应为475元", async () => {
      // (1200 - 200 - 50) * 0.5 = 475
      const partnerFee = await db.calculatePartnerFee("天津", 1200, 200, 50);
      expect(partnerFee).toBe(475);
    });

    it("天津订单: 课程1800元, 老师费400元, 车费60元 → 合伙人费应为670元", async () => {
      // (1800 - 400 - 60) * 0.5 = 670
      const partnerFee = await db.calculatePartnerFee("天津", 1800, 400, 60);
      expect(partnerFee).toBe(670);
    });
  });

  describe("武汉订单合伙人费计算 (40%)", () => {
    it("武汉订单: 课程1200元, 老师费200元, 车费50元 → 合伙人费应为380元", async () => {
      // (1200 - 200 - 50) * 0.4 = 380
      const partnerFee = await db.calculatePartnerFee("武汉", 1200, 200, 50);
      expect(partnerFee).toBe(380);
    });

    it("武汉订单: 课程1800元, 老师费400元, 车费60元 → 合伙人费应为536元", async () => {
      // (1800 - 400 - 60) * 0.4 = 536
      const partnerFee = await db.calculatePartnerFee("武汉", 1800, 400, 60);
      expect(partnerFee).toBe(536);
    });
  });

  describe("理论课老师费用为0时的合伙人费计算", () => {
    it("天津理论课: 课程1200元, 老师费0元, 车费50元 → 合伙人费应为575元", async () => {
      // (1200 - 0 - 50) * 0.5 = 575
      const partnerFee = await db.calculatePartnerFee("天津", 1200, 0, 50);
      expect(partnerFee).toBe(575);
    });

    it("武汉理论课: 课程1200元, 老师费0元, 车费50元 → 合伙人费应为460元", async () => {
      // (1200 - 0 - 50) * 0.4 = 460
      const partnerFee = await db.calculatePartnerFee("武汉", 1200, 0, 50);
      expect(partnerFee).toBe(460);
    });
  });

  describe("边界情况测试", () => {
    it("城市为null时应返回0", async () => {
      const partnerFee = await db.calculatePartnerFee(null, 1200, 200, 50);
      expect(partnerFee).toBe(0);
    });

    it("城市为空字符串时应返回0", async () => {
      const partnerFee = await db.calculatePartnerFee("", 1200, 200, 50);
      expect(partnerFee).toBe(0);
    });

    it("课程金额等于老师费用+车费时应返回0", async () => {
      const partnerFee = await db.calculatePartnerFee("天津", 1000, 900, 100);
      expect(partnerFee).toBe(0);
    });

    it("课程金额小于老师费用+车费时应返回0", async () => {
      const partnerFee = await db.calculatePartnerFee("天津", 800, 600, 300);
      expect(partnerFee).toBe(0);
    });

    it("车费为0时应该正确计算", async () => {
      const partnerFee = await db.calculatePartnerFee("天津", 1200, 200, 0);
      // (1200 - 200 - 0) * 0.5 = 500
      expect(partnerFee).toBe(500);
    });
  });
});
