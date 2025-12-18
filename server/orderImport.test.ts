import { describe, it, expect } from "vitest";
import { parseOrderExcel, parseDate } from "./orderExcelParser";
import * as fs from "fs";
import * as path from "path";

describe("订单Excel导入功能测试", () => {
  it("应该能够解析订单Excel文件", async () => {
    // 读取测试文件
    const testFilePath = "/home/ubuntu/upload/pasted_file_3E1JWF_瀛姬智能解析结果_2242条.xlsx";
    
    if (!fs.existsSync(testFilePath)) {
      console.log("测试文件不存在,跳过测试");
      return;
    }
    
    const buffer = fs.readFileSync(testFilePath);
    
    // 解析Excel
    const orders = await parseOrderExcel(buffer);
    
    // 验证解析结果
    expect(orders).toBeDefined();
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBeGreaterThan(0);
    
    console.log(`成功解析 ${orders.length} 条订单数据`);
    
    // 验证第一条数据的结构
    if (orders.length > 0) {
      const firstOrder = orders[0];
      expect(firstOrder).toHaveProperty("销售人");
      expect(firstOrder).toHaveProperty("课程金额");
      expect(firstOrder).toHaveProperty("订单号");
      
      console.log("第一条订单数据:", JSON.stringify(firstOrder, null, 2));
    }
  });
  
  it("应该能够解析日期字段", () => {
    // 测试各种日期格式
    const testCases = [
      { input: "2024-12-18", expected: new Date(2024, 11, 18) },
      { input: "2024/12/18", expected: new Date(2024, 11, 18) },
      { input: "2024年12月18日", expected: new Date(2024, 11, 18) },
      { input: null, expected: null },
      { input: "", expected: null },
    ];
    
    testCases.forEach(({ input, expected }) => {
      const result = parseDate(input);
      if (expected === null) {
        expect(result).toBeNull();
      } else {
        expect(result?.getFullYear()).toBe(expected.getFullYear());
        expect(result?.getMonth()).toBe(expected.getMonth());
        expect(result?.getDate()).toBe(expected.getDate());
      }
    });
  });
  
  it("应该正确处理数字字段", async () => {
    const testFilePath = "/home/ubuntu/upload/pasted_file_3E1JWF_瀛姬智能解析结果_2242条.xlsx";
    
    if (!fs.existsSync(testFilePath)) {
      console.log("测试文件不存在,跳过测试");
      return;
    }
    
    const buffer = fs.readFileSync(testFilePath);
    const orders = await parseOrderExcel(buffer);
    
    if (orders.length > 0) {
      const firstOrder = orders[0];
      
      // 验证数字字段类型
      expect(typeof firstOrder.课程金额).toBe("number");
      expect(typeof firstOrder.首付金额).toBe("number");
      expect(typeof firstOrder.尾款金额).toBe("number");
      expect(typeof firstOrder.净收入).toBe("number");
      
      // 验证数字字段非负
      expect(firstOrder.课程金额).toBeGreaterThanOrEqual(0);
      expect(firstOrder.首付金额).toBeGreaterThanOrEqual(0);
      expect(firstOrder.尾款金额).toBeGreaterThanOrEqual(0);
    }
  });
});
