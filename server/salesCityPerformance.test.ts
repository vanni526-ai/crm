import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("salesCityPerformance", () => {
  const adminCaller = appRouter.createCaller(createAdminContext());
  const userCaller = appRouter.createCaller(createUserContext());

  describe("getCrossStats", () => {
    it("should return cross stats data with correct structure", async () => {
      const result = await adminCaller.salesCityPerformance.getCrossStats({});
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("salespersons");
      expect(result).toHaveProperty("cities");
      expect(result).toHaveProperty("commissionConfigs");
      expect(Array.isArray(result.data)).toBe(true);
      expect(Array.isArray(result.salespersons)).toBe(true);
      expect(Array.isArray(result.cities)).toBe(true);
      expect(Array.isArray(result.commissionConfigs)).toBe(true);
    });

    it("should accept date range filters", async () => {
      const result = await adminCaller.salesCityPerformance.getCrossStats({
        startDate: "2025-01-01",
        endDate: "2025-12-31",
      });
      expect(result).toHaveProperty("data");
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should accept salesperson filter", async () => {
      const result = await adminCaller.salesCityPerformance.getCrossStats({
        salespersonId: 1,
      });
      expect(result).toHaveProperty("data");
    });

    it("should accept city filter", async () => {
      const result = await adminCaller.salesCityPerformance.getCrossStats({
        city: "上海",
      });
      expect(result).toHaveProperty("data");
    });

    it("should return data items with correct fields", async () => {
      const result = await adminCaller.salesCityPerformance.getCrossStats({});
      if (result.data.length > 0) {
        const item = result.data[0];
        expect(item).toHaveProperty("salespersonId");
        expect(item).toHaveProperty("salesPerson");
        expect(item).toHaveProperty("city");
        expect(item).toHaveProperty("orderCount");
        expect(item).toHaveProperty("totalAmount");
        expect(item).toHaveProperty("commissionRate");
        expect(item).toHaveProperty("commissionAmount");
        expect(typeof item.orderCount).toBe("number");
        expect(typeof item.totalAmount).toBe("number");
        expect(typeof item.commissionRate).toBe("number");
        expect(typeof item.commissionAmount).toBe("number");
      }
    });
  });

  describe("getComparison", () => {
    it("should return comparison data with correct structure", async () => {
      const result = await adminCaller.salesCityPerformance.getComparison({
        currentStartDate: "2025-12-01",
        currentEndDate: "2025-12-31",
        previousStartDate: "2025-11-01",
        previousEndDate: "2025-11-30",
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return comparison items with change fields", async () => {
      const result = await adminCaller.salesCityPerformance.getComparison({
        currentStartDate: "2025-12-01",
        currentEndDate: "2025-12-31",
        previousStartDate: "2025-11-01",
        previousEndDate: "2025-11-30",
      });
      if (result.length > 0) {
        const item = result[0];
        expect(item).toHaveProperty("currentOrderCount");
        expect(item).toHaveProperty("currentAmount");
        expect(item).toHaveProperty("previousOrderCount");
        expect(item).toHaveProperty("previousAmount");
        expect(item).toHaveProperty("orderCountChange");
        expect(item).toHaveProperty("amountChange");
        expect(typeof item.orderCountChange).toBe("number");
        expect(typeof item.amountChange).toBe("number");
      }
    });

    it("should accept salesperson and city filters", async () => {
      const result = await adminCaller.salesCityPerformance.getComparison({
        currentStartDate: "2025-12-01",
        currentEndDate: "2025-12-31",
        previousStartDate: "2025-11-01",
        previousEndDate: "2025-11-30",
        salespersonId: 1,
        city: "上海",
      });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getCommissionConfigs", () => {
    it("should return commission configs list", async () => {
      const result = await adminCaller.salesCityPerformance.getCommissionConfigs();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("setCommission", () => {
    it("should allow admin to set commission", async () => {
      const result = await adminCaller.salesCityPerformance.setCommission({
        salespersonId: 1,
        city: "测试城市",
        commissionRate: 10,
        notes: "测试提成配置",
      });
      expect(result).toEqual({ success: true });
    });

    it("should reject non-admin users", async () => {
      await expect(
        userCaller.salesCityPerformance.setCommission({
          salespersonId: 1,
          city: "测试城市",
          commissionRate: 10,
        })
      ).rejects.toThrow();
    });

    it("should update existing commission config", async () => {
      // Set initial
      await adminCaller.salesCityPerformance.setCommission({
        salespersonId: 1,
        city: "测试城市更新",
        commissionRate: 10,
      });
      // Update
      const result = await adminCaller.salesCityPerformance.setCommission({
        salespersonId: 1,
        city: "测试城市更新",
        commissionRate: 15,
        notes: "更新后的提成",
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("batchSetCommission", () => {
    it("should allow admin to batch set commissions", async () => {
      const result = await adminCaller.salesCityPerformance.batchSetCommission({
        configs: [
          { salespersonId: 1, city: "批量城市A", commissionRate: 8 },
          { salespersonId: 1, city: "批量城市B", commissionRate: 12 },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.failCount).toBe(0);
    });

    it("should reject non-admin users for batch set", async () => {
      await expect(
        userCaller.salesCityPerformance.batchSetCommission({
          configs: [
            { salespersonId: 1, city: "批量城市A", commissionRate: 8 },
          ],
        })
      ).rejects.toThrow();
    });
  });

  describe("deleteCommission", () => {
    it("should reject non-admin users", async () => {
      await expect(
        userCaller.salesCityPerformance.deleteCommission({ id: 999 })
      ).rejects.toThrow();
    });
  });

  describe("getExportData", () => {
    it("should return export data with correct structure", async () => {
      const result = await adminCaller.salesCityPerformance.getExportData({});
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return export items with correct fields", async () => {
      const result = await adminCaller.salesCityPerformance.getExportData({});
      if (result.length > 0) {
        const item = result[0];
        expect(item).toHaveProperty("salesPerson");
        expect(item).toHaveProperty("city");
        expect(item).toHaveProperty("orderCount");
        expect(item).toHaveProperty("totalAmount");
        expect(item).toHaveProperty("commissionRate");
        expect(item).toHaveProperty("commissionAmount");
      }
    });

    it("should accept date range filters for export", async () => {
      const result = await adminCaller.salesCityPerformance.getExportData({
        startDate: "2025-01-01",
        endDate: "2025-12-31",
      });
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
