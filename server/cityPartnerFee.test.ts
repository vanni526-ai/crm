import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("城市合伙人费自动计算", () => {
  beforeAll(async () => {
    // 确保数据库连接正常
    const dbInstance = await db.getDb();
    expect(dbInstance).toBeTruthy();
  });

  describe("获取城市合伙人费配置", () => {
    it("应该能获取所有启用的城市配置", async () => {
      const configs = await db.getAllCityPartnerConfig();
      expect(configs).toBeDefined();
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0);
    });

    it("应该能根据城市名称获取配置", async () => {
      const config = await db.getCityPartnerConfigByCity("济南");
      expect(config).toBeDefined();
      expect(config?.city).toBe("济南");
      expect(config?.partnerFeeRate).toBe("30.00");
    });

    it("不存在的城市应该返回null", async () => {
      const config = await db.getCityPartnerConfigByCity("不存在的城市");
      expect(config).toBeNull();
    });
  });

  describe("合伙人费计算逻辑", () => {
    it("济南: (课程金额 - 老师费用) × 30%", async () => {
      const partnerFee = await db.calculatePartnerFee("济南", 1000, 300);
      expect(partnerFee).toBe(210); // (1000 - 300) * 0.3 = 210
    });

    it("武汉: (课程金额 - 老师费用) × 40%", async () => {
      const partnerFee = await db.calculatePartnerFee("武汉", 1000, 300);
      expect(partnerFee).toBe(280); // (1000 - 300) * 0.4 = 280
    });

    it("天津: (课程金额 - 老师费用) × 50%", async () => {
      const partnerFee = await db.calculatePartnerFee("天津", 1000, 300);
      expect(partnerFee).toBe(350); // (1000 - 300) * 0.5 = 350
    });

    it("石家庄: (课程金额 - 老师费用) × 30%", async () => {
      const partnerFee = await db.calculatePartnerFee("石家庄", 2000, 500);
      expect(partnerFee).toBe(450); // (2000 - 500) * 0.3 = 450
    });

    it("大连: (课程金额 - 老师费用) × 30%", async () => {
      const partnerFee = await db.calculatePartnerFee("大连", 1500, 400);
      expect(partnerFee).toBe(330); // (1500 - 400) * 0.3 = 330
    });

    it("老师费用为0时应该正确计算", async () => {
      const partnerFee = await db.calculatePartnerFee("济南", 1000, 0);
      expect(partnerFee).toBe(300); // (1000 - 0) * 0.3 = 300
    });

    it("课程金额等于老师费用时应该返回0", async () => {
      const partnerFee = await db.calculatePartnerFee("济南", 1000, 1000);
      expect(partnerFee).toBe(0); // (1000 - 1000) * 0.3 = 0
    });

    it("城市为null时应该返回0", async () => {
      const partnerFee = await db.calculatePartnerFee(null, 1000, 300);
      expect(partnerFee).toBe(0);
    });

    it("不存在的城市应该返回0", async () => {
      const partnerFee = await db.calculatePartnerFee("不存在的城市", 1000, 300);
      expect(partnerFee).toBe(0);
    });

    it("小数金额应该正确计算并保留两位小数", async () => {
      const partnerFee = await db.calculatePartnerFee("济南", 1234.56, 456.78);
      // (1234.56 - 456.78) * 0.3 = 777.78 * 0.3 = 233.334 ≈ 233.33
      expect(partnerFee).toBe(233.33);
    });
  });

  describe("所有配置城市的计算验证", () => {
    const testCases = [
      { city: "济南", rate: 30, courseAmount: 1000, teacherFee: 300, expected: 210 },
      { city: "石家庄", rate: 30, courseAmount: 1000, teacherFee: 300, expected: 210 },
      { city: "大连", rate: 30, courseAmount: 1000, teacherFee: 300, expected: 210 },
      { city: "宁波", rate: 30, courseAmount: 1000, teacherFee: 300, expected: 210 },
      { city: "太原", rate: 30, courseAmount: 1000, teacherFee: 300, expected: 210 },
      { city: "郑州", rate: 30, courseAmount: 1000, teacherFee: 300, expected: 210 },
      { city: "东莞", rate: 30, courseAmount: 1000, teacherFee: 300, expected: 210 },
      { city: "南京", rate: 30, courseAmount: 1000, teacherFee: 300, expected: 210 },
      { city: "无锡", rate: 30, courseAmount: 1000, teacherFee: 300, expected: 210 },
      { city: "武汉", rate: 40, courseAmount: 1000, teacherFee: 300, expected: 280 },
      { city: "天津", rate: 50, courseAmount: 1000, teacherFee: 300, expected: 350 },
    ];

    testCases.forEach(({ city, rate, courseAmount, teacherFee, expected }) => {
      it(`${city} (${rate}%): 课程${courseAmount} - 老师${teacherFee} = ${expected}`, async () => {
        const partnerFee = await db.calculatePartnerFee(city, courseAmount, teacherFee);
        expect(partnerFee).toBe(expected);
      });
    });
  });
});
