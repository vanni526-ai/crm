/**
 * 订单数据规范化预览测试脚本
 * 生成数据规范化预览报告，展示哪些数据将被修改
 */

import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("订单数据规范化预览", () => {
  it("生成数据规范化预览报告", async () => {
    // 创建测试上下文（模拟管理员用户）
    const ctx: TrpcContext = {
      req: {} as any,
      res: {} as any,
      user: {
        id: 11040019,
        openId: "test-open-id",
        name: "Test Admin",
        role: "admin",
        roles: "admin",
        isActive: true
      } as any
    };
    
    const caller = appRouter.createCaller(ctx);
    
    console.log("\n========== 订单数据规范化预览报告 ==========\n");
    
    // 生成预览报告（限制前100条）
    const result = await caller.normalizeOrder.previewNormalization({
      limit: 100
    });
    
    console.log("📊 统计信息:");
    console.log(`  总订单数: ${result.stats.totalOrders}`);
    console.log(`  需要修改的订单数: ${result.stats.ordersWithChanges}`);
    console.log(`  需要人工审核: ${result.stats.needsReview}`);
    console.log(`  高置信度匹配: ${result.stats.highConfidence}`);
    console.log(`  中等置信度匹配: ${result.stats.mediumConfidence}`);
    console.log("\n按字段统计:");
    console.log(`  交付老师: ${result.stats.changesByField.deliveryTeacher} 条`);
    console.log(`  交付课程: ${result.stats.changesByField.deliveryCourse} 条`);
    console.log(`  上课时间: ${result.stats.changesByField.classTime} 条`);
    console.log(`  交付教室: ${result.stats.changesByField.deliveryRoom} 条`);
    
    console.log("\n\n📝 详细变更列表（前20条）:\n");
    
    // 显示前20条详细变更
    const previewSample = result.preview.slice(0, 20);
    
    for (const item of previewSample) {
      console.log(`订单 #${item.orderNo} (ID: ${item.orderId}):`);
      
      for (const change of item.changes) {
        const fieldName = {
          'deliveryTeacher': '交付老师',
          'deliveryCourse': '交付课程',
          'classTime': '上课时间',
          'deliveryRoom': '交付教室'
        }[change.field] || change.field;
        
        const confidenceIcon = {
          'high': '✅',
          'medium': '⚠️',
          'low': '❌'
        }[change.confidence] || '❓';
        
        if (change.needsReview) {
          console.log(`  ${confidenceIcon} ${fieldName}: "${change.original}" → 无法匹配（需人工审核）`);
        } else {
          console.log(`  ${confidenceIcon} ${fieldName}: "${change.original}" → "${change.normalized}" (相似度: ${(change.similarity * 100).toFixed(0)}%)`);
        }
      }
      
      console.log("");
    }
    
    // 分类显示需要人工审核的记录
    const needsReviewItems = result.preview.filter((p: any) => 
      p.changes.some((c: any) => c.needsReview)
    );
    
    if (needsReviewItems.length > 0) {
      console.log("\n\n⚠️  需要人工审核的记录:\n");
      
      for (const item of needsReviewItems.slice(0, 10)) {
        console.log(`订单 #${item.orderNo}:`);
        
        const reviewChanges = item.changes.filter((c: any) => c.needsReview);
        for (const change of reviewChanges) {
          const fieldName = {
            'deliveryTeacher': '交付老师',
            'deliveryCourse': '交付课程',
            'deliveryRoom': '交付教室'
          }[change.field] || change.field;
          
          console.log(`  ❌ ${fieldName}: "${change.original}" 无法匹配`);
        }
        
        console.log("");
      }
    }
    
    console.log("\n========== 报告结束 ==========\n");
    
    // 验证结果
    expect(result.stats.totalOrders).toBeGreaterThan(0);
    expect(result.preview).toBeInstanceOf(Array);
  }, 120000); // 设置120秒超时
});
