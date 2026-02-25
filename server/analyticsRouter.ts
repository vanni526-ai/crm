import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { getDb, getAllCitiesWithStats } from "./db";
import { orders, users, customers, partners, partnerCities, cities } from "../drizzle/schema";
import { eq, and, sql, gte, lte, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const analyticsRouter = router({
  /**
   * 获取流失客户统计
   */
  inactiveCustomers: protectedProcedure
    .input(
      z.object({
        days: z.number().optional().default(30), // 多少天未消费算流失
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      const days = input?.days || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // TODO: 实现真实的流失客户查询逻辑
      // 暂时返回空数组
      return [];
    }),

  /**
   * 获取订单统计
   */
  orderStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      // TODO: 实现真实的订单统计逻辑
      return {
        totalOrders: 1250,
        completedOrders: 1100,
        pendingOrders: 120,
        cancelledOrders: 30,
        totalRevenue: '1250000.00',
        averageOrderValue: '1000.00',
      };
    }),

  /**
   * 获取数据分析看板统计
   * 多角色接口：根据JWT中的roles返回不同范围的数据
   */
  /**
   * 获取数据分析看板统计
   * 多角色接口：根据JWT中的roles返回不同范围的数据
   */
  getDashboardStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      const userRoles = ctx.user.roles ? ctx.user.roles.split(',') : [];
      const userId = ctx.user.id;

      console.log('[analytics.getDashboardStats] User ID:', userId);
      console.log('[analytics.getDashboardStats] Roles:', userRoles);

      // 管理员：全局数据
      if (userRoles.includes('admin')) {
        // TODO: 实现真实的全局统计逻辑
        return {
          role: 'admin',
          totalOrders: 1250,
          totalRevenue: '1250000.00',
          totalCustomers: 850,
          totalTeachers: 45,
          monthlyGrowth: {
            orders: '+12%',
            revenue: '+15%',
            customers: '+8%',
          },
        };
      }

      // 销售：自己的订单数据
      if (userRoles.includes('sales')) {
        // TODO: 实现真实的销售统计逻辑
        return {
          role: 'sales',
          myOrders: 85,
          myRevenue: '85000.00',
          myCustomers: 42,
          monthlyTarget: '100000.00',
          achievementRate: '85%',
        };
      }

      // 老师：自己的课程数据
      if (userRoles.includes('teacher')) {
        // TODO: 实现真实的老师统计逻辑
        return {
          role: 'teacher',
          myCourses: 120,
          myStudents: 65,
          myEarnings: '24000.00',
          monthlyHours: 160,
          averageRating: 4.8,
        };
      }

      // 城市合伙人：管理城市的数据
      if (userRoles.includes('cityPartner')) {
        // 查询该合伙人的partner记录
        const partnerRecord = await db
          .select({ id: partners.id })
          .from(partners)
          .where(eq(partners.userId, userId))
          .limit(1);

        if (partnerRecord.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Partner not found for current user',
          });
        }

        const partnerId = partnerRecord[0].id;

        // 获取该合伙人管理的城市列表
        const partnerCitiesRecords = await db
          .select({
            cityId: partnerCities.cityId,
            cityName: cities.name,
          })
          .from(partnerCities)
          .leftJoin(cities, eq(partnerCities.cityId, cities.id))
          .where(and(
            eq(partnerCities.partnerId, partnerId),
            eq(partnerCities.contractStatus, 'active')
          ));

        console.log('[analytics.getDashboardStats] Partner ID:', partnerId);
        console.log('[analytics.getDashboardStats] Managed Cities:', partnerCitiesRecords.map(c => c.cityName));

        // TODO: 实现真实的城市合伙人统计逻辑
        return {
          role: 'cityPartner',
          cities: partnerCitiesRecords.map(c => c.cityName),
          totalOrders: 320,
          totalRevenue: '320000.00',
          totalExpense: '45000.00',
          netProfit: '275000.00',
          myCommission: '27500.00',
        };
      }

      // 普通用户：无权访问
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to access dashboard stats',
      });
    }),

  /**
   * 获取所有城市的统计数据
   */
  getAllCitiesWithStats: publicProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const options: { startDate?: Date; endDate?: Date } = {};
      
      if (input?.startDate) {
        options.startDate = new Date(input.startDate);
      }
      if (input?.endDate) {
        options.endDate = new Date(input.endDate);
      }

      return await getAllCitiesWithStats(options);
    }),

  /**
   * 创建城市配置
   */
  createCityConfig: protectedProcedure
    .input(
      z.object({
        city: z.string(),
        areaCode: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      const result = await db.insert(cities).values({
        name: input.city,
        areaCode: input.areaCode || null,
        isActive: true,
        sortOrder: 0,
      });

      return { success: true, id: Number((result as any).insertId) };
    }),

  /**
   * 更新城市配置
   */
  updateCityPartnerConfig: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        areaCode: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      await db
        .update(cities)
        .set({
          areaCode: input.areaCode || null,
          updatedAt: new Date(),
        })
        .where(eq(cities.id, input.id));

      return { success: true };
    }),

  /**
   * 删除城市配置
   */
  deleteCityConfig: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      // 软删除：将isActive设置为0
      await db
        .update(cities)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(cities.id, input.id));

      return { success: true };
    }),
});
