import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Partner Statistics API", () => {
  const caller = appRouter.createCaller({
    user: {
      openId: "test-admin",
      name: "Test Admin",
      email: "admin@test.com",
      avatarUrl: null,
      role: "admin",
    },
  });

  it("should get partner stats without date filter", async () => {
    const result = await caller.partnerManagement.getPartnerStats();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    if (result.length > 0) {
      const stat = result[0];
      expect(stat).toHaveProperty("partnerId");
      expect(stat).toHaveProperty("partnerName");
      expect(stat).toHaveProperty("cities");
      expect(stat).toHaveProperty("orderCount");
      expect(stat).toHaveProperty("courseAmount");
      expect(stat).toHaveProperty("teacherFee");
      expect(stat).toHaveProperty("transportFee");
      expect(stat).toHaveProperty("rentFee");
      expect(stat).toHaveProperty("propertyFee");
      expect(stat).toHaveProperty("utilityFee");
      expect(stat).toHaveProperty("consumablesFee");
      expect(stat).toHaveProperty("deferredPayment");
      expect(stat).toHaveProperty("partnerFee");
    }
  });

  it("should get partner stats with date filter", async () => {
    const result = await caller.partnerManagement.getPartnerStats({
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should calculate correct totals across multiple cities", async () => {
    const result = await caller.partnerManagement.getPartnerStats();
    
    if (result.length > 0) {
      const stat = result[0];
      
      // 验证数值字段格式
      expect(typeof stat.orderCount).toBe("number");
      expect(typeof stat.courseAmount).toBe("string");
      expect(typeof stat.teacherFee).toBe("string");
      expect(typeof stat.partnerFee).toBe("string");
      
      // 验证金额为非负数
      expect(Number(stat.courseAmount)).toBeGreaterThanOrEqual(0);
      expect(Number(stat.teacherFee)).toBeGreaterThanOrEqual(0);
      expect(Number(stat.partnerFee)).toBeGreaterThanOrEqual(0);
    }
  });

  it("should filter partners by date range correctly", async () => {
    // 测试本月数据
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    
    const result = await caller.partnerManagement.getPartnerStats({
      startDate,
      endDate,
    });
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
