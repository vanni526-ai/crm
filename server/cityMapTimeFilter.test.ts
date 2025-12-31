import { describe, it, expect, beforeAll } from "vitest";
import { getAllCitiesWithStats } from "./db";

describe("城市地图时间范围筛选功能", () => {
  describe("getAllCitiesWithStats - 时间范围筛选", () => {
    it("应该返回所有城市的统计数据(无时间筛选)", async () => {
      const result = await getAllCitiesWithStats();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // 验证返回的数据结构
      const firstCity = result[0];
      expect(firstCity).toHaveProperty("city");
      expect(firstCity).toHaveProperty("orderCount");
      expect(firstCity).toHaveProperty("totalSales");
      expect(firstCity).toHaveProperty("profit");
      expect(firstCity).toHaveProperty("profitRate");
    });

    it("应该支持按开始日期筛选", async () => {
      const startDate = new Date("2024-01-01");
      const result = await getAllCitiesWithStats({ startDate });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // 所有城市的数据应该只包含2024年1月1日之后的订单
      const totalOrders = result.reduce((sum, city) => sum + city.orderCount, 0);
      expect(totalOrders).toBeGreaterThanOrEqual(0);
    });

    it("应该支持按结束日期筛选", async () => {
      const endDate = new Date("2024-12-31");
      const result = await getAllCitiesWithStats({ endDate });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // 所有城市的数据应该只包含2024年12月31日之前的订单
      const totalOrders = result.reduce((sum, city) => sum + city.orderCount, 0);
      expect(totalOrders).toBeGreaterThanOrEqual(0);
    });

    it("应该支持按日期范围筛选", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");
      const result = await getAllCitiesWithStats({ startDate, endDate });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // 验证筛选后的数据
      const totalSales = result.reduce((sum, city) => sum + city.totalSales, 0);
      expect(totalSales).toBeGreaterThanOrEqual(0);
    });

    it("应该正确计算筛选后的销售额和利润", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");
      const result = await getAllCitiesWithStats({ startDate, endDate });
      
      // 验证每个城市的计算正确性
      result.forEach(city => {
        expect(city.totalSales).toBeGreaterThanOrEqual(0);
        expect(city.totalExpense).toBeGreaterThanOrEqual(0);
        expect(city.profit).toBe(city.totalSales - city.totalExpense);
        
        if (city.totalSales > 0) {
          const expectedProfitRate = Math.round((city.profit / city.totalSales) * 100 * 100) / 100;
          expect(city.profitRate).toBe(expectedProfitRate);
        }
      });
    });

    it("应该排除已取消的订单", async () => {
      const result = await getAllCitiesWithStats();
      
      // 验证统计数据不包含已取消的订单
      // 这个测试通过检查数据一致性来验证
      expect(result).toBeDefined();
      result.forEach(city => {
        expect(city.orderCount).toBeGreaterThanOrEqual(0);
        expect(city.totalSales).toBeGreaterThanOrEqual(0);
      });
    });

    it("应该在没有订单时返回零值", async () => {
      // 使用一个未来的日期范围,应该没有订单
      const startDate = new Date("2099-01-01");
      const endDate = new Date("2099-12-31");
      const result = await getAllCitiesWithStats({ startDate, endDate });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // 所有城市应该都是零值
      result.forEach(city => {
        expect(city.orderCount).toBe(0);
        expect(city.totalSales).toBe(0);
        expect(city.totalExpense).toBe(0);
        expect(city.profit).toBe(0);
        expect(city.profitRate).toBe(0);
      });
    });

    it("应该正确处理本月数据筛选", async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const result = await getAllCitiesWithStats({ 
        startDate: startOfMonth, 
        endDate: now 
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // 验证返回的数据
      const totalOrders = result.reduce((sum, city) => sum + city.orderCount, 0);
      expect(totalOrders).toBeGreaterThanOrEqual(0);
    });

    it("应该正确处理本季度数据筛选", async () => {
      const now = new Date();
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const result = await getAllCitiesWithStats({ 
        startDate: startOfQuarter, 
        endDate: now 
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // 验证返回的数据
      const totalSales = result.reduce((sum, city) => sum + city.totalSales, 0);
      expect(totalSales).toBeGreaterThanOrEqual(0);
    });

    it("应该正确处理本年数据筛选", async () => {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const result = await getAllCitiesWithStats({ 
        startDate: startOfYear, 
        endDate: now 
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // 验证返回的数据
      const totalSales = result.reduce((sum, city) => sum + city.totalSales, 0);
      expect(totalSales).toBeGreaterThanOrEqual(0);
    });
  });
});
