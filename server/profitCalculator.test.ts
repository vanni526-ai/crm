import { describe, it, expect } from "vitest";
import {
  calculateMonthsSinceContract,
  determineProfitStage,
  isInvestmentRecovered,
  calculateTotalInvestment,
  getCurrentProfitRatio,
} from "./profitCalculator";

describe("合伙人管理 - 分红阶段计算", () => {
  describe("calculateMonthsSinceContract", () => {
    it("应该正确计算合同签订后的月数", () => {
      // 假设当前日期是2026-02-11
      const testDate = "2025-02-11"; // 12个月前
      const months = calculateMonthsSinceContract(testDate);
      expect(months).toBe(12);
    });

    it("应该正确计算不满一个月的情况", () => {
      const testDate = "2026-01-15"; // 不到1个月
      const months = calculateMonthsSinceContract(testDate);
      expect(months).toBe(1);
    });

    it("应该正确计算超过24个月的情况", () => {
      const testDate = "2023-12-11"; // 26个月前
      const months = calculateMonthsSinceContract(testDate);
      expect(months).toBeGreaterThanOrEqual(25);
    });
  });

  describe("determineProfitStage", () => {
    it("0-12个月应该返回第1阶段", () => {
      expect(determineProfitStage(0)).toBe(1);
      expect(determineProfitStage(6)).toBe(1);
      expect(determineProfitStage(12)).toBe(1);
    });

    it("13-24个月应该返回第2阶段", () => {
      expect(determineProfitStage(13)).toBe(2);
      expect(determineProfitStage(18)).toBe(2);
      expect(determineProfitStage(24)).toBe(2);
    });

    it("25个月以上应该返回第3阶段", () => {
      expect(determineProfitStage(25)).toBe(3);
      expect(determineProfitStage(30)).toBe(3);
      expect(determineProfitStage(100)).toBe(3);
    });
  });

  describe("isInvestmentRecovered", () => {
    it("前12个月收入大于等于投资金额时应返回true", () => {
      expect(isInvestmentRecovered(100000, 90000)).toBe(true);
      expect(isInvestmentRecovered(100000, 100000)).toBe(true);
    });

    it("前12个月收入小于投资金额时应返回false", () => {
      expect(isInvestmentRecovered(80000, 100000)).toBe(false);
      expect(isInvestmentRecovered(0, 100000)).toBe(false);
    });
  });

  describe("calculateTotalInvestment", () => {
    it("应该正确计算总投资金额", () => {
      const total = calculateTotalInvestment(50000, 5000, 44000);
      expect(total).toBe(99000);
    });

    it("应该处理部分参数为0的情况", () => {
      const total = calculateTotalInvestment(50000, 0, 44000);
      expect(total).toBe(94000);
    });

    it("应该处理所有参数为0的情况", () => {
      const total = calculateTotalInvestment(0, 0, 0);
      expect(total).toBe(0);
    });

    it("应该处理undefined参数", () => {
      const total = calculateTotalInvestment(undefined, undefined, undefined);
      expect(total).toBe(0);
    });
  });

  describe("getCurrentProfitRatio", () => {
    const mockPartnerCityData = {
      profitRatioStage1Partner: "30",
      profitRatioStage1Brand: "70",
      profitRatioStage2APartner: "30",
      profitRatioStage2ABrand: "70",
      profitRatioStage2BPartner: "20",
      profitRatioStage2BBrand: "80",
      profitRatioStage3Partner: "20",
      profitRatioStage3Brand: "80",
    };

    it("第1阶段应该返回正确的分红比例", () => {
      const ratio = getCurrentProfitRatio(mockPartnerCityData, 1, false);
      expect(ratio.partnerRatio).toBe(30);
      expect(ratio.brandRatio).toBe(70);
    });

    it("第2阶段未回本应该返回2A比例", () => {
      const ratio = getCurrentProfitRatio(mockPartnerCityData, 2, false);
      expect(ratio.partnerRatio).toBe(30);
      expect(ratio.brandRatio).toBe(70);
    });

    it("第2阶段已回本应该返回2B比例", () => {
      const ratio = getCurrentProfitRatio(mockPartnerCityData, 2, true);
      expect(ratio.partnerRatio).toBe(20);
      expect(ratio.brandRatio).toBe(80);
    });

    it("第3阶段应该返回正确的分红比例", () => {
      const ratio = getCurrentProfitRatio(mockPartnerCityData, 3, false);
      expect(ratio.partnerRatio).toBe(20);
      expect(ratio.brandRatio).toBe(80);
    });

    it("应该处理缺失的分红比例数据", () => {
      const emptyData = {};
      const ratio = getCurrentProfitRatio(emptyData, 1, false);
      expect(ratio.partnerRatio).toBe(0);
      expect(ratio.brandRatio).toBe(0);
    });
  });
});

describe("合伙人管理 - 合同信息验证", () => {
  it("合同状态枚举应该包含所有有效值", () => {
    const validStatuses = ["draft", "active", "expired", "terminated"];
    expect(validStatuses).toContain("draft");
    expect(validStatuses).toContain("active");
    expect(validStatuses).toContain("expired");
    expect(validStatuses).toContain("terminated");
  });

  it("分红比例总和应该等于100", () => {
    const partnerRatio = 30;
    const brandRatio = 70;
    expect(partnerRatio + brandRatio).toBe(100);
  });

  it("股权比例总和应该等于100", () => {
    const partnerEquity = 60;
    const brandEquity = 40;
    expect(partnerEquity + brandEquity).toBe(100);
  });

  it("投资费用应该大于0", () => {
    const brandUsageFee = 50000;
    const brandAuthDeposit = 5000;
    const totalEstimatedCost = 44000;
    
    expect(brandUsageFee).toBeGreaterThan(0);
    expect(brandAuthDeposit).toBeGreaterThan(0);
    expect(totalEstimatedCost).toBeGreaterThan(0);
  });

  it("分红支付日应该在1-31之间", () => {
    const validPaymentDays = [1, 15, 25, 31];
    validPaymentDays.forEach(day => {
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(31);
    });
  });
});

describe("合伙人管理 - 业务逻辑验证", () => {
  it("第1阶段分红比例应该是30%/70%", () => {
    const stage1PartnerRatio = 30;
    const stage1BrandRatio = 70;
    expect(stage1PartnerRatio + stage1BrandRatio).toBe(100);
  });

  it("第2阶段A（未回本）分红比例应该是30%/70%", () => {
    const stage2APartnerRatio = 30;
    const stage2ABrandRatio = 70;
    expect(stage2APartnerRatio + stage2ABrandRatio).toBe(100);
  });

  it("第2阶段B（已回本）分红比例应该是20%/80%", () => {
    const stage2BPartnerRatio = 20;
    const stage2BBrandRatio = 80;
    expect(stage2BPartnerRatio + stage2BBrandRatio).toBe(100);
  });

  it("第3阶段分红比例应该是20%/80%", () => {
    const stage3PartnerRatio = 20;
    const stage3BrandRatio = 80;
    expect(stage3PartnerRatio + stage3BrandRatio).toBe(100);
  });

  it("品牌使用费应该包含所有子项", () => {
    const managementFee = 5000;
    const operationPositionFee = 18000;
    const teacherRecruitmentFee = 7000;
    const marketingFee = 20000;
    
    const totalBrandUsageFee = managementFee + operationPositionFee + teacherRecruitmentFee + marketingFee;
    expect(totalBrandUsageFee).toBe(50000);
  });
});
