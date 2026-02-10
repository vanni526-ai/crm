import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { partners, partnerExpenses, partnerProfitRecords, partnerCities, cities, orders } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const partnerManagementRouter = router({
  /**
   * 获取所有合伙人列表
   */
  list: protectedProcedure
    .input(z.object({
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const conditions = [];
      
      if (input?.isActive !== undefined) {
        conditions.push(eq(partners.isActive, input.isActive));
      }
      
      const result = await db
        .select()
        .from(partners)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(partners.createdAt));
      
      return result;
    }),

  /**
   * 获取单个合伙人详情
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
        .from(partners)
        .where(eq(partners.id, input.id))
        .limit(1);
      
      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "合伙人不存在",
        });
      }
      
      return result[0];
    }),

  /**
   * 创建合伙人
   */
  create: protectedProcedure
    .input(z.object({
      userId: z.number(),
      name: z.string(),
      phone: z.string().optional(),
      profitRatio: z.string(), // decimal类型需要字符串
      profitRule: z.string().optional(),
      brandFee: z.string().optional(),
      techServiceFee: z.string().optional(),
      deferredPaymentTotal: z.string().optional(),
      deferredPaymentRule: z.string().optional(),
      contractStartDate: z.string().optional(),
      contractEndDate: z.string().optional(),
      accountName: z.string().optional(),
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const { contractStartDate, contractEndDate, ...insertData } = input;
      
      const result = await db.insert(partners).values({
        ...insertData,
        ...(contractStartDate ? { contractStartDate: new Date(contractStartDate) } : {}),
        ...(contractEndDate ? { contractEndDate: new Date(contractEndDate) } : {}),
        createdBy: ctx.user.id,
      });
      
      return { id: Number(result[0].insertId) };
    }),

  /**
   * 更新合伙人信息
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      phone: z.string().optional(),
      profitRatio: z.string().optional(), // decimal类型需要字符串
      profitRule: z.string().optional(),
      brandFee: z.string().optional(),
      techServiceFee: z.string().optional(),
      deferredPaymentTotal: z.string().optional(),
      deferredPaymentRule: z.string().optional(),
      contractStartDate: z.string().optional(),
      contractEndDate: z.string().optional(),
      contractHistory: z.string().optional(),
      accountName: z.string().optional(),
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      isActive: z.boolean().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const { id, contractStartDate, contractEndDate, ...updateData } = input;
      
      await db
        .update(partners)
        .set({
          ...updateData,
          ...(contractStartDate ? { contractStartDate: new Date(contractStartDate) } : {}),
          ...(contractEndDate ? { contractEndDate: new Date(contractEndDate) } : {}),
        })
        .where(eq(partners.id, id));
      
      return { success: true };
    }),

  /**
   * 删除合伙人（软删除）
   */
  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      await db
        .update(partners)
        .set({ isActive: false })
        .where(eq(partners.id, input.id));
      
      return { success: true };
    }),

  /**
   * 获取合伙人的费用明细列表
   */
  getExpenses: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      cityId: z.number().optional(),
      startMonth: z.string().optional(),
      endMonth: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const conditions = [eq(partnerExpenses.partnerId, input.partnerId)];
      
      if (input.cityId) {
        conditions.push(eq(partnerExpenses.cityId, input.cityId));
      }
      
      if (input.startMonth) {
        conditions.push(sql`${partnerExpenses.month} >= ${input.startMonth}`);
      }
      
      if (input.endMonth) {
        conditions.push(sql`${partnerExpenses.month} <= ${input.endMonth}`);
      }
      
      const result = await db
        .select()
        .from(partnerExpenses)
        .where(and(...conditions))
        .orderBy(desc(partnerExpenses.month));
      
      return result;
    }),

  /**
   * 创建或更新费用明细
   */
  upsertExpense: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      partnerId: z.number(),
      cityId: z.number(),
      month: z.string(),
      rentFee: z.string().optional(),
      propertyFee: z.string().optional(),
      utilityFee: z.string().optional(),
      consumablesFee: z.string().optional(),
      teacherFee: z.string().optional(),
      transportFee: z.string().optional(),
      otherFee: z.string().optional(),
      totalFee: z.string().optional(),
      deferredPayment: z.string().optional(),
      deferredPaymentBalance: z.string().optional(),
      revenue: z.string().optional(),
      profit: z.string().optional(),
      profitAmount: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const { id, ...data } = input;
      
      if (id) {
        // 更新
        const { month, ...updateData } = data;
        await db
          .update(partnerExpenses)
          .set({
            ...updateData,
            ...(month ? { month: new Date(month) } : {}),
          })
          .where(eq(partnerExpenses.id, id));
        
        return { id };
      } else {
        // 创建
        const { month, ...insertData } = data;
        const result = await db.insert(partnerExpenses).values({
          ...insertData,
          month: new Date(month),
          createdBy: ctx.user.id,
        });
        
        return { id: Number(result[0].insertId) };
      }
    }),

  /**
   * 获取合伙人的分红流水记录
   */
  getProfitRecords: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      status: z.enum(["pending", "completed", "failed"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const conditions = [eq(partnerProfitRecords.partnerId, input.partnerId)];
      
      if (input.status) {
        conditions.push(eq(partnerProfitRecords.status, input.status));
      }
      
      if (input.startDate) {
        conditions.push(sql`${partnerProfitRecords.transferDate} >= ${input.startDate}`);
      }
      
      if (input.endDate) {
        conditions.push(sql`${partnerProfitRecords.transferDate} <= ${input.endDate}`);
      }
      
      const result = await db
        .select()
        .from(partnerProfitRecords)
        .where(and(...conditions))
        .orderBy(desc(partnerProfitRecords.transferDate));
      
      return result;
    }),

  /**
   * 创建分红流水记录
   */
  createProfitRecord: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      expenseId: z.number().optional(),
      amount: z.string(), // decimal类型需要字符串
      transferDate: z.string(),
      transferMethod: z.enum(["wechat", "alipay", "bank", "cash", "other"]),
      transactionNo: z.string().optional(),
      status: z.enum(["pending", "completed", "failed"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const result = await db.insert(partnerProfitRecords).values({
        partnerId: input.partnerId,
        expenseId: input.expenseId,
        amount: input.amount,
        transferDate: new Date(input.transferDate),
        transferMethod: input.transferMethod,
        transactionNo: input.transactionNo,
        status: input.status,
        notes: input.notes,
        recordedBy: ctx.user.id,
      });
      
      return { id: Number(result[0].insertId) };
    }),

  /**
   * 更新分红流水记录状态
   */
  updateProfitRecordStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "completed", "failed"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const { id, ...updateData } = input;
      
      await db
        .update(partnerProfitRecords)
        .set(updateData)
        .where(eq(partnerProfitRecords.id, id));
      
      return { success: true };
    }),

  /**
   * 为合伙人分配城市
   */
  assignCities: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      cityIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      // 先删除现有的城市关联
      await db.delete(partnerCities).where(eq(partnerCities.partnerId, input.partnerId));
      
      // 添加新的城市关联
      if (input.cityIds.length > 0) {
        await db.insert(partnerCities).values(
          input.cityIds.map((cityId) => ({
            partnerId: input.partnerId,
            cityId,
            createdBy: ctx.user.id,
          }))
        );
      }
      
      return { success: true };
    }),

  /**
   * 获取合伙人关联的城市列表
   */
  getPartnerCities: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const result = await db
        .select({
          id: partnerCities.id,
          partnerId: partnerCities.partnerId,
          cityId: partnerCities.cityId,
          cityName: cities.name,
          createdAt: partnerCities.createdAt,
        })
        .from(partnerCities)
        .leftJoin(cities, eq(partnerCities.cityId, cities.id))
        .where(eq(partnerCities.partnerId, input.partnerId));
      
      return result;
    }),

  /**
   * 获取合伙人的订单统计（按城市）
   */
  getCityOrderStats: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      // 获取合伙人关联的城市
      const partnerCitiesList = await db
        .select({ cityId: partnerCities.cityId, cityName: cities.name })
        .from(partnerCities)
        .leftJoin(cities, eq(partnerCities.cityId, cities.id))
        .where(eq(partnerCities.partnerId, input.partnerId));
      
      if (partnerCitiesList.length === 0) {
        return [];
      }
      
      // 统计每个城市的订单数据
      const stats = [];
      for (const city of partnerCitiesList) {
        // 根据城市名称匹配订单
        const conditions = [sql`${orders.deliveryCity} = ${city.cityName}`];
        
        if (input.startDate) {
          conditions.push(sql`${orders.classDate} >= ${input.startDate}`);
        }
        
        if (input.endDate) {
          conditions.push(sql`${orders.classDate} <= ${input.endDate}`);
        }
        
        const result = await db
          .select({
            orderCount: sql<number>`COUNT(*)`,
            totalAmount: sql<string>`COALESCE(SUM(${orders.courseAmount}), 0)`,
            totalTeacherFee: sql<string>`COALESCE(SUM(${orders.teacherFee}), 0)`,
            totalTransportFee: sql<string>`COALESCE(SUM(${orders.transportFee}), 0)`,
            totalPartnerFee: sql<string>`COALESCE(SUM(${orders.partnerFee}), 0)`,
          })
          .from(orders)
          .where(and(...conditions));
        
        if (result[0]) {
          stats.push({
            cityId: city.cityId,
            cityName: city.cityName,
            orderCount: Number(result[0].orderCount),
            totalAmount: result[0].totalAmount,
            totalTeacherFee: result[0].totalTeacherFee,
            totalTransportFee: result[0].totalTransportFee,
            totalPartnerFee: result[0].totalPartnerFee,
          });
        }
      }
      
      return stats;
    }),
});
