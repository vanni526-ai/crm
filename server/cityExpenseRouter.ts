import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { cityMonthlyExpenses, cities } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const cityExpenseRouter = router({
  /**
   * 获取城市月度费用账单列表
   */
  list: protectedProcedure
    .input(z.object({
      cityId: z.number().optional(),
      month: z.string().optional(), // 格式: YYYY-MM
      startMonth: z.string().optional(),
      endMonth: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const conditions = [];
      
      if (input?.cityId) {
        conditions.push(eq(cityMonthlyExpenses.cityId, input.cityId));
      }
      
      if (input?.month) {
        conditions.push(eq(cityMonthlyExpenses.month, input.month));
      }
      
      if (input?.startMonth) {
        conditions.push(sql`${cityMonthlyExpenses.month} >= ${input.startMonth}`);
      }
      
      if (input?.endMonth) {
        conditions.push(sql`${cityMonthlyExpenses.month} <= ${input.endMonth}`);
      }
      
      const result = await db
        .select()
        .from(cityMonthlyExpenses)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(cityMonthlyExpenses.month), desc(cityMonthlyExpenses.cityId));
      
      return result;
    }),

  /**
   * 获取单个费用账单详情
   */
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const result = await db
        .select()
        .from(cityMonthlyExpenses)
        .where(eq(cityMonthlyExpenses.id, input.id))
        .limit(1);
      
      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "费用账单不存在",
        });
      }
      
      return result[0];
    }),

  /**
   * 获取指定城市和月份的费用账单
   */
  getByCityAndMonth: protectedProcedure
    .input(z.object({
      cityId: z.number(),
      month: z.string(), // 格式: YYYY-MM
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const result = await db
        .select()
        .from(cityMonthlyExpenses)
        .where(and(
          eq(cityMonthlyExpenses.cityId, input.cityId),
          eq(cityMonthlyExpenses.month, input.month)
        ))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    }),

  /**
   * 创建或更新费用账单
   */
  upsert: protectedProcedure
    .input(z.object({
      cityId: z.number(),
      cityName: z.string(),
      month: z.string(), // 格式: YYYY-MM
      rentFee: z.string().optional(),
      propertyFee: z.string().optional(),
      utilityFee: z.string().optional(),
      consumablesFee: z.string().optional(),
      cleaningFee: z.string().optional(),
      phoneFee: z.string().optional(),
      deferredPayment: z.string().optional(),
      expressFee: z.string().optional(),
      promotionFee: z.string().optional(),
      otherFee: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      // 计算总费用
      const totalExpense = (
        parseFloat(input.rentFee || "0") +
        parseFloat(input.propertyFee || "0") +
        parseFloat(input.utilityFee || "0") +
        parseFloat(input.consumablesFee || "0") +
        parseFloat(input.cleaningFee || "0") +
        parseFloat(input.phoneFee || "0") +
        parseFloat(input.deferredPayment || "0") +
        parseFloat(input.expressFee || "0") +
        parseFloat(input.promotionFee || "0") +
        parseFloat(input.otherFee || "0")
      ).toFixed(2);
      
      // 检查是否已存在该城市该月份的记录
      const existing = await db
        .select()
        .from(cityMonthlyExpenses)
        .where(and(
          eq(cityMonthlyExpenses.cityId, input.cityId),
          eq(cityMonthlyExpenses.month, input.month)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        // 更新现有记录
        await db
          .update(cityMonthlyExpenses)
          .set({
            rentFee: input.rentFee || "0.00",
            propertyFee: input.propertyFee || "0.00",
            utilityFee: input.utilityFee || "0.00",
            consumablesFee: input.consumablesFee || "0.00",
            cleaningFee: input.cleaningFee || "0.00",
            phoneFee: input.phoneFee || "0.00",
            deferredPayment: input.deferredPayment || "0.00",
            expressFee: input.expressFee || "0.00",
            promotionFee: input.promotionFee || "0.00",
            otherFee: input.otherFee || "0.00",
            totalExpense,
            notes: input.notes,
            uploadedBy: ctx.user.id,
          })
          .where(eq(cityMonthlyExpenses.id, existing[0].id));
        
        return { id: existing[0].id, isNew: false };
      } else {
        // 创建新记录
        const result = await db.insert(cityMonthlyExpenses).values({
          cityId: input.cityId,
          cityName: input.cityName,
          month: input.month,
          rentFee: input.rentFee || "0.00",
          propertyFee: input.propertyFee || "0.00",
          utilityFee: input.utilityFee || "0.00",
          consumablesFee: input.consumablesFee || "0.00",
          cleaningFee: input.cleaningFee || "0.00",
          phoneFee: input.phoneFee || "0.00",
          deferredPayment: input.deferredPayment || "0.00",
          expressFee: input.expressFee || "0.00",
          promotionFee: input.promotionFee || "0.00",
          otherFee: input.otherFee || "0.00",
          totalExpense,
          notes: input.notes,
          uploadedBy: ctx.user.id,
        });
        
        return { id: Number(result[0].insertId), isNew: true };
      }
    }),

  /**
   * 删除费用账单
   */
  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      await db
        .delete(cityMonthlyExpenses)
        .where(eq(cityMonthlyExpenses.id, input.id));
      
      return { success: true };
    }),

  /**
   * 获取所有城市列表（用于下拉选择）
   */
  getCities: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const result = await db
        .select({
          id: cities.id,
          name: cities.name,
        })
        .from(cities)
        .where(eq(cities.isActive, true))
        .orderBy(cities.sortOrder, cities.name);
      
      return result;
    }),
});
