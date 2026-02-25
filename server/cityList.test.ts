import { describe, it, expect } from "vitest";
import { getAllCitiesWithStats } from "./db";

describe("城市列表查询功能", () => {
  it("应该能查询到所有启用的城市（包括新建的城市）", async () => {
    const cities = await getAllCitiesWithStats();
    
    expect(cities).toBeDefined();
    expect(Array.isArray(cities)).toBe(true);
    expect(cities.length).toBeGreaterThan(0);
    
    // 验证返回的数据结构
    const firstCity = cities[0];
    expect(firstCity).toHaveProperty("city");
    expect(firstCity).toHaveProperty("orderCount");
    expect(firstCity).toHaveProperty("totalSales");
    expect(firstCity).toHaveProperty("profit");
    expect(firstCity).toHaveProperty("profitRate");
    
    // 验证是否包含"巡游"城市
    const xunYouCity = cities.find(c => c.city === "巡游");
    expect(xunYouCity).toBeDefined();
    if (xunYouCity) {
      expect(xunYouCity.city).toBe("巡游");
      expect(xunYouCity.isActive).toBe(true);
      // 新建的城市应该没有订单数据
      expect(xunYouCity.orderCount).toBe(0);
      expect(xunYouCity.totalSales).toBe(0);
      expect(xunYouCity.profit).toBe(0);
    }
  });

  it("应该只返回启用的城市（isActive=true）", async () => {
    const cities = await getAllCitiesWithStats();
    
    // 所有返回的城市都应该是启用状态
    cities.forEach(city => {
      expect(city.isActive).toBe(true);
    });
  });

  it("应该正确计算城市的统计数据", async () => {
    const cities = await getAllCitiesWithStats();
    
    // 验证每个城市的统计数据
    cities.forEach(city => {
      expect(city.orderCount).toBeGreaterThanOrEqual(0);
      expect(city.totalSales).toBeGreaterThanOrEqual(0);
      expect(city.totalExpense).toBeGreaterThanOrEqual(0);
      expect(city.profit).toBe(city.totalSales - city.totalExpense);
      
      if (city.totalSales > 0) {
        const expectedProfitRate = Math.round((city.profit / city.totalSales) * 100 * 100) / 100;
        expect(city.profitRate).toBe(expectedProfitRate);
      } else {
        expect(city.profitRate).toBe(0);
      }
    });
  });
});
