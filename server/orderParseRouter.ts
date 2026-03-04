import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";

/**
 * 订单智能解析路由
 * 注：LLM 智能解析功能已移除，请使用手动录入或 Gmail 导入功能
 */
export const orderParseRouter = router({
  /**
   * 解析订单文本（功能已停用）
   */
  parseOrderText: protectedProcedure
    .input(z.object({
      text: z.string().min(1, "订单文本不能为空"),
    }))
    .mutation(async () => {
      throw new TRPCError({
        code: "METHOD_NOT_SUPPORTED",
        message: "智能解析功能已停用，请使用手动录入或 Gmail 导入功能",
      });
    }),
});
