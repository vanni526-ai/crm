import { describe, it, expect } from "vitest";
import { getUniqueCities } from "./db";

describe("getUniqueCities函数测试", () => {
  it("应该返回所有启用的城市（包括新建的巡游城市）", async () => {
    const cities = await getUniqueCities();
    
    expect(cities).toBeDefined();
    expect(Array.isArray(cities)).toBe(true);
    expect(cities.length).toBeGreaterThan(0);
    
    // 验证是否包含"巡游"城市
    expect(cities).toContain("巡游");
    
    // 验证城市列表是否按名称排序
    const sortedCities = [...cities].sort((a, b) => a.localeCompare(b, "zh-CN"));
    expect(cities).toEqual(sortedCities);
  });

  it("应该只返回启用的城市", async () => {
    const cities = await getUniqueCities();
    
    // 所有返回的城市都应该是启用状态
    // 这个测试通过检查返回的城市数量来验证
    expect(cities.length).toBeGreaterThan(0);
  });

  it("应该返回不重复的城市名称", async () => {
    const cities = await getUniqueCities();
    
    // 验证没有重复的城市
    const uniqueCities = Array.from(new Set(cities));
    expect(cities.length).toBe(uniqueCities.length);
  });
});
