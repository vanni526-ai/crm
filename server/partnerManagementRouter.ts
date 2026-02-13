import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { partners, partnerExpenses, partnerProfitRecords, partnerCities, cities, orders, users } from "../drizzle/schema";
import { eq, and, desc, sql, inArray, not } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { uploadAndParseContract } from "./contractParser";
import { updateProfitStageAndRecoveryStatus } from "./profitCalculator";

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
      
      // 默认只显示isActive=true的合伙人
      if (input?.isActive !== undefined) {
        conditions.push(eq(partners.isActive, input.isActive));
      } else {
        conditions.push(eq(partners.isActive, true));
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
      userId: z.number().optional(), // 可选，如果不提供则自动创建
      name: z.string(),
      phone: z.string().optional(),
      idCardNumber: z.string().optional(), // 身份证号码
      idCardFrontUrl: z.string().optional(), // 身份证正面照片URL
      idCardBackUrl: z.string().optional(), // 身份证反面照片URL
      profitRatio: z.string().optional().default("0.10"), // decimal类型需要字符串，默认10%
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
      cityIds: z.array(z.number()).optional(), // 关联的城市ID列表
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      let userId = input.userId;
      
      // 如果没有提供userId，则自动创建用户账号
      if (!userId) {
        if (!input.phone) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "创建合伙人时必须提供手机号"
          });
        }
        
        // 检查手机号是否已存在
        const existingUser = await db.select().from(users).where(eq(users.phone, input.phone)).limit(1);
        if (existingUser.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "该手机号已被使用"
          });
        }
        
        // 创建用户账号
        const { hashPassword } = await import("./passwordUtils");
        const hashedPassword = await hashPassword("123456"); // 默认密码
        const openId = `partner_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        const userResult = await db.insert(users).values({
          openId,
          name: input.name,
          phone: input.phone,
          password: hashedPassword,
          role: "user" as any,
          roles: "user,cityPartner", // 普通用户 + 合伙人
          isActive: true,
        } as any);
        
        userId = Number(userResult[0].insertId);
      }
      
      const { contractStartDate, contractEndDate, cityIds, ...insertData } = input;
      
      // 设置默认分红比例
      const profitRatio = input.profitRatio || "0.10";
      
      const result = await db.insert(partners).values({
        ...insertData,
        profitRatio, // 使用默认值或用户提供的值
        userId,
        ...(contractStartDate ? { contractStartDate: new Date(contractStartDate) } : {}),
        ...(contractEndDate ? { contractEndDate: new Date(contractEndDate) } : {}),
        createdBy: ctx.user.id,
      });
      
      const partnerId = Number(result[0].insertId);
      
      // 如果提供了cityIds，则关联城市
      if (input.cityIds && input.cityIds.length > 0) {
        await db.insert(partnerCities).values(
          input.cityIds.map(cityId => ({
            partnerId,
            cityId,
            expenseCoverage: {}, // 初始化空的费用承担配置
            createdBy: ctx.user.id, // 添加创建人ID
          } as any))
        );
      }
      
      return { 
        id: partnerId,
        userId,
        userCreated: !input.userId // 标记是否新创建了用户
      };
    }),

  /**
   * 更新合伙人信息
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      phone: z.string().optional(),
      idCardNumber: z.string().optional(), // 身份证号码
      idCardFrontUrl: z.string().optional(), // 身份证正面照片URL
      idCardBackUrl: z.string().optional(), // 身份证反面照片URL
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
      profitPaymentDay: z.number().optional(), // 每月分红支付日(1-31)
      isActive: z.boolean().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const { id, contractStartDate, contractEndDate, phone, ...updateData } = input;
      
      // 如果更新了手机号，需要同步到users表
      if (phone !== undefined) {
        // 先获取合伙人的userId
        const partner = await db.select().from(partners).where(eq(partners.id, id)).limit(1);
        if (partner.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "合伙人不存在" });
        }
        
        const userId = partner[0].userId;
        
        // 检查新手机号是否已被其他用户使用
        if (phone) {
          const existingUser = await db.select().from(users)
            .where(eq(users.phone, phone))
            .limit(1);
          if (existingUser.length > 0 && existingUser[0].id !== userId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "该手机号已被其他用户使用"
            });
          }
        }
        
        // 同步更新users表的手机号
        await db.update(users)
          .set({ phone })
          .where(eq(users.id, userId));
      }
      
      await db
        .update(partners)
        .set({
          ...updateData,
          ...(phone !== undefined ? { phone } : {}),
          ...(contractStartDate ? { contractStartDate: new Date(contractStartDate) } : {}),
          ...(contractEndDate ? { contractEndDate: new Date(contractEndDate) } : {}),
        })
        .where(eq(partners.id, id));
      
      return { success: true };
    }),

  /**
   * 获取合伙人的费用承担配置
   */
  getExpenseCoverage: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const result = await db
        .select({ expenseCoverage: partners.expenseCoverage })
        .from(partners)
        .where(eq(partners.id, input.partnerId))
        .limit(1);
      
      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "合伙人不存在",
        });
      }
      
      // 如果没有配置，返回默认值（全部不承担）
      return result[0].expenseCoverage || {
        rentFee: false,
        propertyFee: false,
        utilityFee: false,
        consumablesFee: false,
        cleaningFee: false,
        phoneFee: false,
        deferredPayment: false,
        courierFee: false,
        promotionFee: false,
        teacherFee: false,
        transportFee: false,
        otherFee: false,
      };
    }),

  /**
   * 更新合伙人的费用承担配置
   */
  updateExpenseCoverage: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      expenseCoverage: z.object({
        rentFee: z.boolean().optional(),
        propertyFee: z.boolean().optional(),
        utilityFee: z.boolean().optional(),
        consumablesFee: z.boolean().optional(),
        cleaningFee: z.boolean().optional(),
        phoneFee: z.boolean().optional(),
        courierFee: z.boolean().optional(),
        promotionFee: z.boolean().optional(),
        teacherFee: z.boolean().optional(),
        transportFee: z.boolean().optional(),
        otherFee: z.boolean().optional(),
        // 注意: deferredPayment(合同后付款)永远100%由合伙人承担,不需要在此配置
      }),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      await db
        .update(partners)
        .set({ expenseCoverage: input.expenseCoverage as any })
        .where(eq(partners.id, input.partnerId));
      
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
      
      const expenses = await db
        .select()
        .from(partnerExpenses)
        .where(and(...conditions))
        .orderBy(desc(partnerExpenses.month));
      
      // 获取合伙人的费用承担配置
      const partnerResult = await db
        .select({ expenseCoverage: partners.expenseCoverage })
        .from(partners)
        .where(eq(partners.id, input.partnerId))
        .limit(1);
      
      const expenseCoverage = partnerResult[0]?.expenseCoverage || {};
      
      // 为每个费用记录计算合伙人承担总费用
      const result = expenses.map((expense: any) => {
        let partnerCoveredTotal = 0;
        const expenseShareRatio = Number(expense.expenseShareRatio || 0) / 100;
        
        // 根据费用承担配置计算
        if (expenseCoverage.rentFee) partnerCoveredTotal += Number(expense.rentFee || 0);
        if (expenseCoverage.propertyFee) partnerCoveredTotal += Number(expense.propertyFee || 0);
        if (expenseCoverage.utilityFee) partnerCoveredTotal += Number(expense.utilityFee || 0);
        if (expenseCoverage.consumablesFee) partnerCoveredTotal += Number(expense.consumablesFee || 0);
        if (expenseCoverage.cleaningFee) partnerCoveredTotal += Number(expense.cleaningFee || 0);
        if (expenseCoverage.phoneFee) partnerCoveredTotal += Number(expense.phoneFee || 0);
        if (expenseCoverage.deferredPayment) partnerCoveredTotal += Number(expense.deferredPayment || 0);
        if (expenseCoverage.courierFee) partnerCoveredTotal += Number(expense.courierFee || 0);
        if (expenseCoverage.promotionFee) partnerCoveredTotal += Number(expense.promotionFee || 0);
        if (expenseCoverage.teacherFee) partnerCoveredTotal += Number(expense.teacherFee || 0);
        if (expenseCoverage.transportFee) partnerCoveredTotal += Number(expense.transportFee || 0);
        if (expenseCoverage.otherFee) partnerCoveredTotal += Number(expense.otherFee || 0);
        
        // 乘以费用分摆比例
        partnerCoveredTotal = partnerCoveredTotal * expenseShareRatio;
        
        return {
          ...expense,
          partnerCoveredTotal: partnerCoveredTotal.toFixed(2),
        };
      });
      
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
      
      // 先获取这些城市的所有现有关联配置(不管是哪个合伙人的)
      const existingCities = await db
        .select()
        .from(partnerCities)
        .where(inArray(partnerCities.cityId, input.cityIds));
      
      // 创建配置映射(cityId -> 配置)
      const configMap = new Map();
      existingCities.forEach((city) => {
        configMap.set(city.cityId, {
          currentProfitStage: city.currentProfitStage,
          profitRatioStage1Partner: city.profitRatioStage1Partner,
          profitRatioStage1Brand: city.profitRatioStage1Brand,
          profitRatioStage2APartner: city.profitRatioStage2APartner,
          profitRatioStage2ABrand: city.profitRatioStage2ABrand,
          profitRatioStage2BPartner: city.profitRatioStage2BPartner,
          profitRatioStage2BBrand: city.profitRatioStage2BBrand,
          profitRatioStage3Partner: city.profitRatioStage3Partner,
          profitRatioStage3Brand: city.profitRatioStage3Brand,
          isInvestmentRecovered: city.isInvestmentRecovered,
          contractEndDate: city.contractEndDate,
          contractStatus: city.contractStatus,
          expenseCoverage: city.expenseCoverage,
        });
      });
      
      // 删除这些城市的所有现有关联(不管是哪个合伙人的)
      await db.delete(partnerCities).where(inArray(partnerCities.cityId, input.cityIds));
      
      // 同时删除当前合伙人的其他城市关联(不在新列表中的)
      await db.delete(partnerCities).where(
        and(
          eq(partnerCities.partnerId, input.partnerId),
          not(inArray(partnerCities.cityId, input.cityIds.length > 0 ? input.cityIds : [0]))
        )
      );
      
      // 添加新的城市关联(恢复原有配置)
      if (input.cityIds.length > 0) {
        await db.insert(partnerCities).values(
          input.cityIds.map((cityId) => {
            const savedConfig = configMap.get(cityId);
            return {
              partnerId: input.partnerId,
              cityId,
              createdBy: ctx.user.id,
              // 如果有原有配置,则恢复;  否则使用默认值
              ...(savedConfig || {}),
            } as any;
          })
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
          contractEndDate: partnerCities.contractEndDate,
          contractStatus: partnerCities.contractStatus,
          createdAt: partnerCities.createdAt,
        })
        .from(partnerCities)
        .leftJoin(cities, eq(partnerCities.cityId, cities.id))
        .where(and(
          eq(partnerCities.partnerId, input.partnerId),
          eq(partnerCities.contractStatus, 'active')
        ));
      
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
        .where(and(
          eq(partnerCities.partnerId, input.partnerId),
          eq(partnerCities.contractStatus, 'active')
        ));
      
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

  /**
   * 获取合伙人统计数据(用于列表展示)
   */
  getPartnerStats: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      // 获取所有合伙人
      const allPartners = await db
        .select()
        .from(partners)
        .orderBy(desc(partners.createdAt));
      
      // 为每个合伙人统计数据
      const stats = [];
      for (const partner of allPartners) {
        // 获取合伙人的城市列表
        const partnerCitiesList = await db
          .select({
            cityId: partnerCities.cityId,
            cityName: cities.name,
          })
          .from(partnerCities)
          .leftJoin(cities, eq(partnerCities.cityId, cities.id))
          .where(and(
            eq(partnerCities.partnerId, partner.id),
            eq(partnerCities.contractStatus, 'active')
          ));
        
        // 统计所有城市的数据
        let totalOrderCount = 0;
        let totalCourseAmount = 0;
        let totalTeacherFee = 0;
        let totalTransportFee = 0;
        let totalRentFee = 0;
        let totalPropertyFee = 0;
        let totalUtilityFee = 0;
        let totalConsumablesFee = 0;
        let totalDeferredPayment = 0;
        let totalPartnerFee = 0;
        
        for (const city of partnerCitiesList) {
          // 构建查询条件
          const conditions = [sql`${orders.deliveryCity} = ${city.cityName}`];
          
          if (input?.startDate) {
            conditions.push(sql`${orders.classDate} >= ${input.startDate}`);
          }
          
          if (input?.endDate) {
            conditions.push(sql`${orders.classDate} <= ${input.endDate}`);
          }
          
          // 统计订单数据
          const orderResult = await db
            .select({
              orderCount: sql<number>`COUNT(*)`,
              totalAmount: sql<string>`COALESCE(SUM(${orders.courseAmount}), 0)`,
              totalTeacherFee: sql<string>`COALESCE(SUM(${orders.teacherFee}), 0)`,
              totalTransportFee: sql<string>`COALESCE(SUM(${orders.transportFee}), 0)`,
              totalRentFee: sql<string>`COALESCE(SUM(${orders.rentFee}), 0)`,
              totalPropertyFee: sql<string>`COALESCE(SUM(${orders.propertyFee}), 0)`,
              totalUtilityFee: sql<string>`COALESCE(SUM(${orders.utilityFee}), 0)`,
              totalConsumablesFee: sql<string>`COALESCE(SUM(${orders.consumablesFee}), 0)`,
              totalPartnerFee: sql<string>`COALESCE(SUM(${orders.partnerFee}), 0)`,
            })
            .from(orders)
            .where(and(...conditions));
          
          if (orderResult[0]) {
            totalOrderCount += Number(orderResult[0].orderCount);
            totalCourseAmount += Number(orderResult[0].totalAmount);
            totalTeacherFee += Number(orderResult[0].totalTeacherFee);
            totalTransportFee += Number(orderResult[0].totalTransportFee);
            totalRentFee += Number(orderResult[0].totalRentFee);
            totalPropertyFee += Number(orderResult[0].totalPropertyFee);
            totalUtilityFee += Number(orderResult[0].totalUtilityFee);
            totalConsumablesFee += Number(orderResult[0].totalConsumablesFee);
            totalPartnerFee += Number(orderResult[0].totalPartnerFee);
          }
          
          // 统计费用明细中的后付款
          const expenseConditions = [eq(partnerExpenses.partnerId, partner.id), eq(partnerExpenses.cityId, city.cityId)];
          
          if (input?.startDate) {
            expenseConditions.push(sql`${partnerExpenses.month} >= ${input.startDate}`);
          }
          
          if (input?.endDate) {
            expenseConditions.push(sql`${partnerExpenses.month} <= ${input.endDate}`);
          }
          
          const expenseResult = await db
            .select({
              totalDeferredPayment: sql<string>`COALESCE(SUM(${partnerExpenses.deferredPayment}), 0)`,
            })
            .from(partnerExpenses)
            .where(and(...expenseConditions));
          
          if (expenseResult[0]) {
            totalDeferredPayment += Number(expenseResult[0].totalDeferredPayment);
          }
        }
        
        // 计算当月分红金额
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const currentMonthProfit = await db
          .select({
            totalProfit: sql<string>`COALESCE(SUM(${partnerProfitRecords.amount}), 0)`,
          })
          .from(partnerProfitRecords)
          .where(
            and(
              eq(partnerProfitRecords.partnerId, partner.id),
              sql`DATE_FORMAT(${partnerProfitRecords.transferDate}, '%Y-%m') = ${currentMonth}`
            )
          );
        
        const currentMonthProfitAmount = currentMonthProfit[0] ? Number(currentMonthProfit[0].totalProfit) : 0;
        
        stats.push({
          partnerId: partner.id,
          partnerName: partner.name,
          cities: partnerCitiesList.map(c => c.cityName).join(", "),
          orderCount: totalOrderCount,
          courseAmount: totalCourseAmount.toFixed(2),
          teacherFee: totalTeacherFee.toFixed(2),
          transportFee: totalTransportFee.toFixed(2),
          rentFee: totalRentFee.toFixed(2),
          propertyFee: totalPropertyFee.toFixed(2),
          utilityFee: totalUtilityFee.toFixed(2),
          consumablesFee: totalConsumablesFee.toFixed(2),
          deferredPayment: totalDeferredPayment.toFixed(2),
          partnerFee: totalPartnerFee.toFixed(2),
          currentMonthProfit: currentMonthProfitAmount.toFixed(2),
        });
      }
      
      return stats;
    }),

  /**
   * 上传合同文件并智能识别（预览模式，不保存到数据库）
   */
  uploadContract: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      cityId: z.number(),
      fileBase64: z.string(), // Base64编码的PDF文件
      fileName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // 将Base64转换为Buffer
        const fileBuffer = Buffer.from(input.fileBase64, 'base64');
        
        // 上传并识别合同
        const { contractFileUrl, contractInfo } = await uploadAndParseContract(
          fileBuffer,
          input.fileName,
          input.partnerId,
          input.cityId
        );
        
        // 只返回识别结果，不保存到数据库
        return {
          success: true,
          contractFileUrl,
          contractInfo,
        };
      } catch (error: any) {
        console.error("合同上传失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `合同上传失败: ${error.message}`,
        });
      }
    }),

  /**
   * 保存用户确认后的合同信息
   */
  saveContractInfo: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      cityId: z.number(),
      contractFileUrl: z.string(),
      contractInfo: z.object({
        contractStartDate: z.string().optional(),
        contractEndDate: z.string().optional(),
        contractSignDate: z.string().optional(),
        equityRatioPartner: z.number().optional(),
        equityRatioBrand: z.number().optional(),
        profitRatioStage1Partner: z.number().optional(),
        profitRatioStage1Brand: z.number().optional(),
        profitRatioStage2APartner: z.number().optional(),
        profitRatioStage2ABrand: z.number().optional(),
        profitRatioStage2BPartner: z.number().optional(),
        profitRatioStage2BBrand: z.number().optional(),
        profitRatioStage3Partner: z.number().optional(),
        profitRatioStage3Brand: z.number().optional(),
        brandUsageFee: z.number().optional(),
        brandAuthDeposit: z.number().optional(),
        managementFee: z.number().optional(),
        operationPositionFee: z.number().optional(),
        teacherRecruitmentFee: z.number().optional(),
        marketingFee: z.number().optional(),
        estimatedRentDeposit: z.number().optional(),
        estimatedPropertyFee: z.number().optional(),
        estimatedUtilityFee: z.number().optional(),
        estimatedRegistrationFee: z.number().optional(),
        estimatedRenovationFee: z.number().optional(),
        totalEstimatedCost: z.number().optional(),
        partnerBankName: z.string().optional(),
        partnerBankAccount: z.string().optional(),
        partnerAccountHolder: z.string().optional(),
        legalRepresentative: z.string().nullable().optional(),
        profitPaymentDay: z.number().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      try {
        // 将contractInfo中的number类型转换为string（decimal字段）
        const convertedInfo: any = {};
        for (const [key, value] of Object.entries(input.contractInfo)) {
          if (value === undefined) continue;
          
          if (typeof value === 'number' && !['profitPaymentDay', 'currentProfitStage'].includes(key)) {
            convertedInfo[key] = value.toString();
          } else if (key.includes('Date') && typeof value === 'string') {
            convertedInfo[key] = new Date(value);
          } else {
            convertedInfo[key] = value;
          }
        }
        
        // 查询是否已存在该合伙人-城市关联
        const existing = await db
          .select()
          .from(partnerCities)
          .where(and(
            eq(partnerCities.partnerId, input.partnerId),
            eq(partnerCities.cityId, input.cityId)
          ))
          .limit(1);
        
        if (existing.length > 0) {
          // 更新现有记录
          await db
            .update(partnerCities)
            .set({
              contractFileUrl: input.contractFileUrl,
              contractStatus: 'active',
              ...convertedInfo,
              updatedBy: ctx.user.id,
            })
            .where(eq(partnerCities.id, existing[0].id));
          
          // 同步更新partners表中的收款账户信息
          if (input.contractInfo.partnerBankName || input.contractInfo.partnerBankAccount || input.contractInfo.partnerAccountHolder || input.contractInfo.profitPaymentDay) {
            await db
              .update(partners)
              .set({
                accountName: input.contractInfo.partnerAccountHolder || undefined,
                bankName: input.contractInfo.partnerBankName || undefined,
                accountNumber: input.contractInfo.partnerBankAccount || undefined,
                profitPaymentDay: input.contractInfo.profitPaymentDay || undefined,
              })
              .where(eq(partners.id, input.partnerId));
          }
          
          return {
            success: true,
            partnerCityId: existing[0].id,
          };
        } else {
          // 创建新记录
          const result = await db.insert(partnerCities).values({
            partnerId: input.partnerId,
            cityId: input.cityId,
            contractFileUrl: input.contractFileUrl,
            contractStatus: 'active',
            ...convertedInfo,
            createdBy: ctx.user.id,
          });
          
          // 同步更新partners表中的收款账户信息
          if (input.contractInfo.partnerBankName || input.contractInfo.partnerBankAccount || input.contractInfo.partnerAccountHolder || input.contractInfo.profitPaymentDay) {
            await db
              .update(partners)
              .set({
                accountName: input.contractInfo.partnerAccountHolder || undefined,
                bankName: input.contractInfo.partnerBankName || undefined,
                accountNumber: input.contractInfo.partnerBankAccount || undefined,
                profitPaymentDay: input.contractInfo.profitPaymentDay || undefined,
              })
              .where(eq(partners.id, input.partnerId));
          }
          
          return {
            success: true,
            partnerCityId: Number(result[0].insertId),
          };
        }
      } catch (error: any) {
        console.error("保存合同信息失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `保存失败: ${error.message}`,
        });
      }
    }),

  /**
   * 获取合伙人-城市合同详情
   */
  getContractInfo: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      cityId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const result = await db
        .select()
        .from(partnerCities)
        .where(and(
          eq(partnerCities.partnerId, input.partnerId),
          eq(partnerCities.cityId, input.cityId)
        ))
        .limit(1);
      
      if (result.length === 0) {
        return null;
      }
      
      return result[0];
    }),

  /**
   * 更新合同信息
   */
  updateContractInfo: protectedProcedure
    .input(z.object({
      partnerCityId: z.number(),
      contractStatus: z.enum(["draft", "active", "expired", "terminated"]).optional(),
      contractStartDate: z.string().optional(),
      contractEndDate: z.string().optional(),
      contractSignDate: z.string().optional(),
      equityRatioPartner: z.number().optional(),
      equityRatioBrand: z.number().optional(),
      profitRatioStage1Partner: z.number().optional(),
      profitRatioStage1Brand: z.number().optional(),
      profitRatioStage2APartner: z.number().optional(),
      profitRatioStage2ABrand: z.number().optional(),
      profitRatioStage2BPartner: z.number().optional(),
      profitRatioStage2BBrand: z.number().optional(),
      profitRatioStage3Partner: z.number().optional(),
      profitRatioStage3Brand: z.number().optional(),
      brandUsageFee: z.number().optional(),
      brandAuthDeposit: z.number().optional(),
      managementFee: z.number().optional(),
      operationPositionFee: z.number().optional(),
      teacherRecruitmentFee: z.number().optional(),
      marketingFee: z.number().optional(),
      totalEstimatedCost: z.number().optional(),
      partnerBankName: z.string().optional(),
      partnerBankAccount: z.string().optional(),
      partnerAccountHolder: z.string().optional(),
      partnerAlipayAccount: z.string().optional(),
      partnerWechatAccount: z.string().optional(),
      legalRepresentative: z.string().optional(),
      supervisor: z.string().optional(),
      financialOfficer: z.string().optional(),
      profitPaymentDay: z.number().optional(),
      profitPaymentRule: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const {
        partnerCityId,
        contractStartDate,
        contractEndDate,
        contractSignDate,
        equityRatioPartner,
        equityRatioBrand,
        profitRatioStage1Partner,
        profitRatioStage1Brand,
        profitRatioStage2APartner,
        profitRatioStage2ABrand,
        profitRatioStage2BPartner,
        profitRatioStage2BBrand,
        profitRatioStage3Partner,
        profitRatioStage3Brand,
        brandUsageFee,
        brandAuthDeposit,
        managementFee,
        operationPositionFee,
        teacherRecruitmentFee,
        marketingFee,
        totalEstimatedCost,
        ...updateData
      } = input;
      
      await db
        .update(partnerCities)
        .set({
          ...updateData,
          ...(contractStartDate ? { contractStartDate: new Date(contractStartDate) } : {}),
          ...(contractEndDate ? { contractEndDate: new Date(contractEndDate) } : {}),
          ...(contractSignDate ? { contractSignDate: new Date(contractSignDate) } : {}),
          ...(equityRatioPartner !== undefined ? { equityRatioPartner: equityRatioPartner.toString() } : {}),
          ...(equityRatioBrand !== undefined ? { equityRatioBrand: equityRatioBrand.toString() } : {}),
          ...(profitRatioStage1Partner !== undefined ? { profitRatioStage1Partner: profitRatioStage1Partner.toString() } : {}),
          ...(profitRatioStage1Brand !== undefined ? { profitRatioStage1Brand: profitRatioStage1Brand.toString() } : {}),
          ...(profitRatioStage2APartner !== undefined ? { profitRatioStage2APartner: profitRatioStage2APartner.toString() } : {}),
          ...(profitRatioStage2ABrand !== undefined ? { profitRatioStage2ABrand: profitRatioStage2ABrand.toString() } : {}),
          ...(profitRatioStage2BPartner !== undefined ? { profitRatioStage2BPartner: profitRatioStage2BPartner.toString() } : {}),
          ...(profitRatioStage2BBrand !== undefined ? { profitRatioStage2BBrand: profitRatioStage2BBrand.toString() } : {}),
          ...(profitRatioStage3Partner !== undefined ? { profitRatioStage3Partner: profitRatioStage3Partner.toString() } : {}),
          ...(profitRatioStage3Brand !== undefined ? { profitRatioStage3Brand: profitRatioStage3Brand.toString() } : {}),
          ...(brandUsageFee !== undefined ? { brandUsageFee: brandUsageFee.toString() } : {}),
          ...(brandAuthDeposit !== undefined ? { brandAuthDeposit: brandAuthDeposit.toString() } : {}),
          ...(managementFee !== undefined ? { managementFee: managementFee.toString() } : {}),
          ...(operationPositionFee !== undefined ? { operationPositionFee: operationPositionFee.toString() } : {}),
          ...(teacherRecruitmentFee !== undefined ? { teacherRecruitmentFee: teacherRecruitmentFee.toString() } : {}),
          ...(marketingFee !== undefined ? { marketingFee: marketingFee.toString() } : {}),
          ...(totalEstimatedCost !== undefined ? { totalEstimatedCost: totalEstimatedCost.toString() } : {}),
          updatedBy: ctx.user.id,
        })
        .where(eq(partnerCities.id, partnerCityId));
      
      return { success: true };
    }),

  /**
   * 计算并更新分红阶段和回本状态
   */
  calculateProfitStage: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      cityId: z.number(),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await updateProfitStageAndRecoveryStatus(
          input.partnerId,
          input.cityId
        );
        
        return {
          success: true,
          ...result,
        };
      } catch (error: any) {
        console.error("分红阶段计算失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `分红阶段计算失败: ${error.message}`,
        });
      }
    }),

  /**
   * 获取城市的费用承担配置
   */
  getCityExpenseCoverage: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      cityId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const result = await db
        .select({
          expenseCoverage: partnerCities.expenseCoverage,
        })
        .from(partnerCities)
        .where(and(
          eq(partnerCities.partnerId, input.partnerId),
          eq(partnerCities.cityId, input.cityId)
        ))
        .limit(1);
      
      if (result.length === 0) {
        return null;
      }
      
      return result[0].expenseCoverage || {};
    }),

  /**
   * 更新城市的费用承担配置
   */
  updateCityExpenseCoverage: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      cityId: z.number(),
      expenseCoverage: z.object({
        rentFee: z.boolean().optional(),
        propertyFee: z.boolean().optional(),
        utilityFee: z.boolean().optional(),
        consumablesFee: z.boolean().optional(),
        cleaningFee: z.boolean().optional(),
        phoneFee: z.boolean().optional(),
        courierFee: z.boolean().optional(),
        promotionFee: z.boolean().optional(),
        teacherFee: z.boolean().optional(),
        transportFee: z.boolean().optional(),
        otherFee: z.boolean().optional(),
        // 注意: deferredPayment(合同后付款)永远100%由合伙人承担,不需要在此配置
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      try {
        // 查询是否存在该合伙人-城市关联
        const existing = await db
          .select()
          .from(partnerCities)
          .where(and(
            eq(partnerCities.partnerId, input.partnerId),
            eq(partnerCities.cityId, input.cityId)
          ))
          .limit(1);
        
        if (existing.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "未找到该合伙人-城市关联记录",
          });
        }
        
        // 更新费用承担配置
        await db
          .update(partnerCities)
          .set({
            expenseCoverage: input.expenseCoverage,
            updatedBy: ctx.user.id,
          })
          .where(eq(partnerCities.id, existing[0].id));
        
        // 自动触发当月账单的重新计算(如果存在)
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        try {
          const { cityExpenseRouter } = await import('./cityExpenseRouter');
          const recalculateResult = await cityExpenseRouter.createCaller(ctx).recalculatePartnerShare({
            cityId: input.cityId,
            month: currentMonth,
          });
          console.log('自动重新计算结果:', recalculateResult);
        } catch (recalcError: any) {
          console.error('自动重新计算失败:', recalcError.message);
          // 不抛出错误,避免影响配置保存
        }
        
        return { success: true };
      } catch (error: any) {
        console.error("更新费用承担配置失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `更新失败: ${error.message}`,
        });
      }
    }),

  /**
   * 更新场地合同信息
   */
  updateVenueContract: protectedProcedure
    .input(z.object({
      partnerCityId: z.number(),
      venueContractFileUrl: z.string().optional(),
      venueRentAmount: z.number().optional(),
      venueDeposit: z.number().optional(),
      venueLeaseStartDate: z.string().optional(),
      venueLeaseEndDate: z.string().optional(),
      venuePaymentCycle: z.enum(["monthly", "bimonthly", "quarterly", "semiannual", "annual"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const {
        partnerCityId,
        venueLeaseStartDate,
        venueLeaseEndDate,
        venueRentAmount,
        venueDeposit,
        ...updateData
      } = input;
      
      await db
        .update(partnerCities)
        .set({
          ...updateData,
          ...(venueLeaseStartDate ? { venueLeaseStartDate: new Date(venueLeaseStartDate) } : {}),
          ...(venueLeaseEndDate ? { venueLeaseEndDate: new Date(venueLeaseEndDate) } : {}),
          ...(venueRentAmount !== undefined ? { venueRentAmount: venueRentAmount.toString() } : {}),
          ...(venueDeposit !== undefined ? { venueDeposit: venueDeposit.toString() } : {}),
          updatedBy: ctx.user.id,
        })
        .where(eq(partnerCities.id, partnerCityId));
      
      return { success: true };
    }),
});
