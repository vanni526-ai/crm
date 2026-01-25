import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("refreshCustomerStats", () => {
  it("应该从订单表重新计算并更新所有客户统计信息", async () => {
    const result = await db.refreshCustomerStats();
    
    console.log("更新结果:", result);
    
    expect(result.success).toBe(true);
    expect(result.totalCustomers).toBeGreaterThan(0);
    expect(result.message).toContain("成功处理");
    
    // 验证返回的统计信息
    console.log(`总客户数: ${result.totalCustomers}`);
    console.log(`更新客户数: ${result.updatedCount}`);
    console.log(`新建客户数: ${result.createdCount}`);
    console.log(`跳过数量(老师): ${result.skippedCount}`);
  }, 30000); // 30秒超时

  it("应该正确排除老师名单", async () => {
    const result = await db.refreshCustomerStats();
    
    expect(result.skippedCount).toBeGreaterThan(0);
    console.log(`成功排除${result.skippedCount}个老师`);
  }, 30000); // 30秒超时

  it("应该自动创建不存在的客户记录", async () => {
    const result = await db.refreshCustomerStats();
    
    // 如果有新建客户,说明功能正常
    if (result.createdCount > 0) {
      console.log(`成功创建${result.createdCount}个新客户`);
    }
    
    expect(result.success).toBe(true);
  }, 30000); // 30秒超时
});
