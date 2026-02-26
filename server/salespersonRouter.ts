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

  // 创建销售人员：自动同步到users表
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1, "姓名不能为空"),
      nickname: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      wechat: z.string().optional(),
      aliases: z.string().optional(), // JSON字符串
      commissionRate: z.number().min(0).max(100).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. 先在users表创建用户记录
      const userId = await db.createUser({
        openId: `sales_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: input.name,
        nickname: input.nickname,
        phone: input.phone,
        email: input.email,
        wechat: input.wechat,
        aliases: input.aliases,
        role: 'sales',
        roles: 'sales',
        isActive: true,
      } as any);

      // 2. 再在salespersons表创建业务记录
      const salespersonId = await db.createSalesperson({
        userId,
        commissionRate: input.commissionRate?.toString(),
        notes: input.notes,
      } as any);

      return { id: salespersonId, success: true };
    }),

  // 更新销售人员：自动同步到users表
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1, "姓名不能为空"),
      nickname: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      wechat: z.string().optional(),
      aliases: z.string().optional(), // JSON字符串
      commissionRate: z.number().min(0).max(100).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, name, nickname, phone, email, wechat, aliases, commissionRate, notes } = input;
      
      // 1. 获取salesperson记录以找到userId
      const salesperson = await db.getSalespersonById(id);
      if (!salesperson) {
        throw new TRPCError({ code: "NOT_FOUND", message: "销售人员不存在" });
      }
      
      // 2. 更新users表的基础信息
      await db.updateUser(salesperson.userId, {
        name,
        nickname,
        phone,
        email,
        wechat,
        aliases,
      });
      
      // 3. 更新salespersons表的业务信息
      await db.updateSalesperson(id, {
        commissionRate: commissionRate?.toString(),
        notes,
      });
      
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

  // 更新所有销售人员的销售数据
  updateAllStats: adminProcedure
    .mutation(async () => {
      const results = await db.updateAllSalespersonStats();
      return { 
        success: true, 
        data: results,
        message: `已更新 ${results.length} 位销售人员的数据`
      };
    }),

  // 更新单个销售人员的销售数据
  updateStats: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const result = await db.updateSalespersonStats(input.id);
      return { 
        success: true, 
        data: result,
        message: `已更新销售人员 ${result.name} 的数据`
      };
    }),
});
