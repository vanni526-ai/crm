import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as reconciliationDb from "./reconciliationDb";
import * as db from "./db";
// 权限检查:管理员或财务可以访问对账功能
const reconciliationProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "finance") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员或财务权限" });
  }
  return next({ ctx });
});

export const reconciliationRouter = router({
  /**
   * 智能匹配（已停用）
   */
  intelligentMatch: reconciliationProcedure
    .input(
      z.object({
        scheduleIds: z.array(z.number()).optional(),
        orderIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async () => {
      throw new TRPCError({
        code: "METHOD_NOT_SUPPORTED",
        message: "智能匹配功能已停用，请使用手动匹配功能",
      });
    }),

  /**
   * 手动创建匹配关系
   */
  createMatch: reconciliationProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        orderId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await reconciliationDb.createMatch({
          scheduleId: input.scheduleId,
          orderId: input.orderId,
          matchMethod: "manual",
          confidence: 100,
          isVerified: true,
          verifiedBy: ctx.user.id,
        });

        return { success: true, message: "匹配关系创建成功" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `创建匹配关系失败: ${error.message}`,
        });
      }
    }),

  /**
   * 更新匹配关系
   */
  updateMatch: reconciliationProcedure
    .input(
      z.object({
        matchId: z.number(),
        orderId: z.number().optional(),
        isVerified: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await reconciliationDb.updateMatch(input.matchId, {
          orderId: input.orderId,
          isVerified: input.isVerified,
          verifiedBy: input.isVerified ? ctx.user.id : undefined,
        });

        return { success: true, message: "匹配关系更新成功" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `更新匹配关系失败: ${error.message}`,
        });
      }
    }),

  /**
   * 删除匹配关系
   */
  deleteMatch: reconciliationProcedure
    .input(z.object({ matchId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await reconciliationDb.deleteMatch(input.matchId);
        return { success: true, message: "匹配关系删除成功" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `删除匹配关系失败: ${error.message}`,
        });
      }
    }),

  /**
   * 获取所有匹配关系
   */
  getAllMatches: reconciliationProcedure.query(async () => {
    try {
      const matches = await reconciliationDb.getAllMatches();
      return matches;
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `获取匹配关系失败: ${error.message}`,
      });
    }
  }),

  /**
   * 获取未匹配的课程日程
   */
  getUnmatchedSchedules: reconciliationProcedure.query(async () => {
    try {
      const schedules = await reconciliationDb.getUnmatchedSchedules();
      return schedules;
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `获取未匹配课程日程失败: ${error.message}`,
      });
    }
  }),

  /**
   * 获取未匹配的订单
   */
  getUnmatchedOrders: reconciliationProcedure.query(async () => {
    try {
      const orders = await reconciliationDb.getUnmatchedOrders();
      return orders;
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `获取未匹配订单失败: ${error.message}`,
      });
    }
  }),

  /**
   * 生成月度对账报表
   */
  getMonthlyReport: reconciliationProcedure
    .input(
      z.object({
        startDate: z.string(), // YYYY-MM-DD
        endDate: z.string(), // YYYY-MM-DD
        city: z.string().optional(),
        salesPerson: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const report = await reconciliationDb.getMonthlyReconciliationReport({
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          city: input.city,
          salesPerson: input.salesPerson,
        });

        return report;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `生成对账报表失败: ${error.message}`,
        });
      }
    }),
});
