import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

// 权限检查:只有管理员可以管理销售人员
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
  }
  return next({ ctx });
});

export const salespersonRouter = router({
  // 获取所有销售人员
  list: protectedProcedure.query(async () => {
    return db.getAllSalespersons();
  }),

  // 搜索销售人员
  search: protectedProcedure
    .input(z.object({ keyword: z.string() }))
    .query(async ({ input }) => {
      return db.searchSalespersons(input.keyword);
    }),

  // 创建销售人员
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1, "姓名不能为空"),
      nickname: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      wechat: z.string().optional(),
      commissionRate: z.number().min(0).max(100).optional(),
      city: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const data = {
        ...input,
        commissionRate: input.commissionRate !== undefined ? input.commissionRate.toString() : undefined,
      };
      const id = await db.createSalesperson(data);
      return { id, success: true };
    }),

  // 更新销售人员
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1, "姓名不能为空"),
      nickname: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      wechat: z.string().optional(),
      commissionRate: z.number().min(0).max(100).optional(),
      city: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData = {
        ...data,
        commissionRate: data.commissionRate !== undefined ? data.commissionRate.toString() : undefined,
      };
      await db.updateSalesperson(id, updateData);
      return { success: true };
    }),

  // 删除销售人员(软删除,设置为不活跃)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteSalesperson(input.id);
      return { success: true };
    }),

  // 更新销售人员状态
  updateStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      await db.updateSalespersonStatus(input.id, input.isActive);
      return { success: true };
    }),

  // 获取销售统计数据
  getStatistics: protectedProcedure
    .input(z.object({
      salespersonId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      groupBy: z.enum(["month", "year"]).optional(),
    }))
    .query(async ({ input }) => {
      return db.getSalesStatistics(input);
    }),

  // 获取月度销售额
  getMonthlySales: protectedProcedure
    .input(z.object({
      salespersonId: z.number().optional(),
      year: z.number(),
    }))
    .query(async ({ input }) => {
      return db.getMonthlySales(input.salespersonId, input.year);
    }),

  // 获取年度销售额
  getYearlySales: protectedProcedure
    .input(z.object({
      salespersonId: z.number().optional(),
      startYear: z.number().optional(),
      endYear: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return db.getYearlySales(input.salespersonId, input.startYear, input.endYear);
    }),
});
