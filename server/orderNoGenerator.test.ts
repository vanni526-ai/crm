import { describe, it, expect } from "vitest";
import { generateOrderNo, getCityAreaCode, getSupportedCities } from "./orderNoGenerator";

describe("订单号生成功能", () => {
  it("应该生成正确格式的订单号", () => {
    const orderNo = generateOrderNo("上海");
    
    // 验证格式: YYYYMMDDHHMMSS-区号
    expect(orderNo).toMatch(/^\d{14}-\d{3,4}$/);
    
    // 验证包含上海区号021
    expect(orderNo).toContain("-021");
  });

  it("应该为北京生成正确的订单号", () => {
    const orderNo = generateOrderNo("北京");
    
    expect(orderNo).toMatch(/^\d{14}-010$/);
  });

  it("应该为天津生成正确的订单号", () => {
    const orderNo = generateOrderNo("天津");
    
    expect(orderNo).toMatch(/^\d{14}-022$/);
  });

  it("应该为武汉生成正确的订单号", () => {
    const orderNo = generateOrderNo("武汉");
    
    expect(orderNo).toMatch(/^\d{14}-027$/);
  });

  it("应该为未知城市生成默认区号000", () => {
    const orderNo = generateOrderNo("未知城市");
    
    expect(orderNo).toMatch(/^\d{14}-000$/);
  });

  it("应该在没有城市参数时生成默认区号000", () => {
    const orderNo = generateOrderNo();
    
    expect(orderNo).toMatch(/^\d{14}-000$/);
  });

  it("应该返回正确的城市区号", () => {
    expect(getCityAreaCode("上海")).toBe("021");
    expect(getCityAreaCode("北京")).toBe("010");
    expect(getCityAreaCode("深圳")).toBe("0755");
    expect(getCityAreaCode("杭州")).toBe("0571");
  });

  it("应该为未知城市返回undefined", () => {
    expect(getCityAreaCode("未知城市")).toBeUndefined();
  });

  it("应该返回所有支持的城市列表", () => {
    const cities = getSupportedCities();
    
    expect(cities).toContain("上海");
    expect(cities).toContain("北京");
    expect(cities).toContain("天津");
    expect(cities).toContain("武汉");
    expect(cities.length).toBeGreaterThan(30);
  });

  it("生成的订单号应该包含当前日期时间", () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const orderNo = generateOrderNo("上海");
    const dateTimePart = orderNo.split('-')[0];
    
    // 验证年月日部分
    expect(dateTimePart.substring(0, 8)).toBe(`${year}${month}${day}`);
  });
});
