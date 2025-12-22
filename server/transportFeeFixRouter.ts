import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { 
  detectTransportFeeIssues, 
  batchFixTransportFee,
  getOrderById 
} from "./db";

/**
 * 车费修复路由
 * 用于检测和修复历史订单中车费识别错误的问题
 */
export const transportFeeFixRouter = router({
  /**
   * 检测可能存在车费识别问题的订单
   * 查找备注中包含"车费"但transportFee为0的订单
   */
  detectIssues: publicProcedure
    .query(async () => {
      const issues = await detectTransportFeeIssues();
      return issues;
    }),

  /**
   * 批量修复车费识别问题
   * 重新解析备注并更新transportFee和teacherFee字段
   */
  batchFix: publicProcedure
    .input(z.object({
      orderIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      const result = await batchFixTransportFee(input.orderIds);
      return result;
    }),

  /**
   * 获取单个订单详情(用于预览修复效果)
   */
  getOrderDetail: publicProcedure
    .input(z.object({
      orderId: z.number(),
    }))
    .query(async ({ input }) => {
      const order = await getOrderById(input.orderId);
      return order;
    }),
});
