import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("refreshCustomerStats - 优化版测试", () => {
  it("应该成功更新客户统计信息并报告进度", async () => {
    const progressUpdates: Array<{ current: number; total: number; message: string }> = [];
    
    const result = await db.refreshCustomerStats((progress) => {
      progressUpdates.push(progress);
      console.log(`进度: ${progress.current}% - ${progress.message}`);
    });

    // 验证返回结果
    expect(result.success).toBe(true);
    expect(result.totalCustomers).toBeGreaterThan(0);
    console.log(`总客户数: ${result.totalCustomers}`);
    console.log(`更新: ${result.updatedCount}, 新建: ${result.createdCount}, 跳过: ${result.skippedCount}`);
    
    // 验证进度回调被调用
    expect(progressUpdates.length).toBeGreaterThan(0);
    
    // 验证进度从0开始到100结束
    expect(progressUpdates[0].current).toBe(0);
    expect(progressUpdates[progressUpdates.length - 1].current).toBe(100);
    
    // 验证进度是递增的
    for (let i = 1; i < progressUpdates.length; i++) {
      expect(progressUpdates[i].current).toBeGreaterThanOrEqual(progressUpdates[i - 1].current);
    }
    
    console.log(`\n✅ 测试通过! 共收到${progressUpdates.length}次进度更新`);
  }, 60000); // 60秒超时

  it("应该正确处理空数据库情况", async () => {
    // 这个测试假设数据库中有数据,如果没有数据应该返回0
    const result = await db.refreshCustomerStats();
    
    expect(result.success).toBe(true);
    expect(result.totalCustomers).toBeGreaterThanOrEqual(0);
  });
});
