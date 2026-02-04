/**
 * Excel报表导出路由
 * 提供多种专业报表的导出功能
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  generateFinancialReport,
  generateCityReport,
  generateTeacherSettlementReport,
  generateOrderExportReport,
} from "./excelReportGenerator";

// 权限检查中间件
const financeOrAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "finance") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要财务或管理员权限" });
  }
  return next({ ctx });
});

export const excelReportRouter = router({
  /**
   * 导出综合财务报表
   * 包含:概览、城市统计、销售业绩、老师结算、收支明细
   */
  exportFinancialReport: financeOrAdminProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await generateFinancialReport({
          startDate: input.startDate,
          endDate: input.endDate,
        });

        return {
          success: true,
          data: result.buffer.toString("base64"),
          filename: result.filename,
        };
      } catch (error) {
        console.error("导出财务报表失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "导出财务报表失败",
        });
      }
    }),

  /**
   * 导出城市业绩报表
   * 包含:概览、城市统计、月度趋势
   */
  exportCityReport: financeOrAdminProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await generateCityReport({
          startDate: input.startDate,
          endDate: input.endDate,
        });

        return {
          success: true,
          data: result.buffer.toString("base64"),
          filename: result.filename,
        };
      } catch (error) {
        console.error("导出城市报表失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "导出城市报表失败",
        });
      }
    }),

  /**
   * 导出老师结算报表
   * 包含:概览、结算明细、课时明细
   */
  exportTeacherSettlementReport: financeOrAdminProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await generateTeacherSettlementReport({
          startDate: input.startDate,
          endDate: input.endDate,
        });

        return {
          success: true,
          data: result.buffer.toString("base64"),
          filename: result.filename,
        };
      } catch (error) {
        console.error("导出老师结算报表失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "导出老师结算报表失败",
        });
      }
    }),

  /**
   * 导出订单数据
   * 完整的订单数据导出,支持筛选
   */
  exportOrderData: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await generateOrderExportReport({
          startDate: input.startDate,
          endDate: input.endDate,
        });

        return {
          success: true,
          data: result.buffer.toString("base64"),
          filename: result.filename,
        };
      } catch (error) {
        console.error("导出订单数据失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "导出订单数据失败",
        });
      }
    }),

  /**
   * 获取可用的报表类型列表
   */
  getAvailableReports: protectedProcedure.query(async ({ ctx }) => {
    const isFinanceOrAdmin = ctx.user.role === "admin" || ctx.user.role === "finance";

    const reports = [
      {
        id: "order",
        name: "订单数据导出",
        description: "导出完整的订单数据,支持按日期筛选",
        icon: "FileSpreadsheet",
        available: true,
      },
    ];

    if (isFinanceOrAdmin) {
      reports.unshift(
        {
          id: "financial",
          name: "综合财务报表",
          description: "包含概览、城市统计、销售业绩、老师结算等多个维度",
          icon: "BarChart3",
          available: true,
        },
        {
          id: "city",
          name: "城市业绩报表",
          description: "城市维度的业绩分析和月度趋势",
          icon: "Building2",
          available: true,
        },
        {
          id: "teacher",
          name: "老师结算报表",
          description: "老师课时费和车费的结算明细",
          icon: "Users",
          available: true,
        }
      );
    }

    return reports;
  }),
});
