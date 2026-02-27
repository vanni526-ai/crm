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
        totalPaymentAmount: 1250000,
        totalTeacherFee: 450000,
        netProfit: 800000,
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

      // 获取当前最大的sortOrder值
      const maxSortOrderResult = await db
        .select({ maxSort: sql<number>`MAX(${cities.sortOrder})` })
        .from(cities);
      
      const maxSortOrder = maxSortOrderResult[0]?.maxSort || 0;
      const newSortOrder = maxSortOrder + 1;

      const result = await db.insert(cities).values({
        name: input.city,
        areaCode: input.areaCode || null,
        isActive: true,
        sortOrder: newSortOrder,
      });

      return { success: true, id: Number((result as any).insertId), sortOrder: newSortOrder };
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

  /**
   * 获取城市财务统计数据
   */
  cityFinancialStats: protectedProcedure
    .input(
      z.object({
        dateRange: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      // 构建日期过滤条件
      let whereConditions = [eq(orders.status, 'paid')];
      
      if (input?.startDate && input?.endDate) {
        whereConditions.push(sql`${orders.classDate} >= ${input.startDate}`);
        whereConditions.push(sql`${orders.classDate} <= ${input.endDate}`);
      } else if (input?.dateRange) {
        const now = new Date();
        let startDateStr: string;
        switch (input.dateRange) {
          case 'today':
            startDateStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
            whereConditions.push(sql`${orders.classDate} >= ${startDateStr}`);
            break;
          case 'thisWeek':
            startDateStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString().split('T')[0];
            whereConditions.push(sql`${orders.classDate} >= ${startDateStr}`);
            break;
          case 'thisMonth':
            startDateStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            whereConditions.push(sql`${orders.classDate} >= ${startDateStr}`);
            break;
          case 'thisYear':
            startDateStr = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            whereConditions.push(sql`${orders.classDate} >= ${startDateStr}`);
            break;
        }
      }

      // 查询城市财务统计
      const stats = await db
        .select({
          city: orders.deliveryCity,
          orderCount: sql<number>`COUNT(*)`,
          totalRevenue: sql<number>`SUM(${orders.courseAmount})`,
          totalTeacherFee: sql<number>`SUM(${orders.teacherFee})`,
          totalTransportFee: sql<number>`SUM(${orders.transportFee})`,
          totalOtherFee: sql<number>`SUM(${orders.otherFee})`,
          totalConsumablesFee: sql<number>`SUM(${orders.consumablesFee})`,
          totalRentFee: sql<number>`SUM(${orders.rentFee})`,
          totalPropertyFee: sql<number>`SUM(${orders.propertyFee})`,
          totalUtilityFee: sql<number>`SUM(${orders.utilityFee})`,
          totalPartnerFee: sql<number>`SUM(${orders.partnerFee})`,
        })
        .from(orders)
        .where(and(...whereConditions))
        .groupBy(orders.deliveryCity);

      return stats.map(s => {
        const totalRevenue = Number(s.totalRevenue) || 0;
        const teacherFee = Number(s.totalTeacherFee) || 0;
        const transportFee = Number(s.totalTransportFee) || 0;
        const rentFee = Number(s.totalRentFee) || 0;
        const propertyFee = Number(s.totalPropertyFee) || 0;
        const utilityFee = Number(s.totalUtilityFee) || 0;
        const consumablesFee = Number(s.totalConsumablesFee) || 0;
        const otherFee = Number(s.totalOtherFee) || 0;
        const partnerFee = Number(s.totalPartnerFee) || 0;
        
        // 数据库中不存在的字段，设置为0
        const cleaningFee = 0;
        const phoneFee = 0;
        const expressFee = 0;
        const promotionFee = 0;
        
        const totalExpense = teacherFee + transportFee + rentFee + propertyFee + 
                            utilityFee + consumablesFee + cleaningFee + phoneFee + 
                            expressFee + promotionFee + otherFee + partnerFee;
        
        const profit = totalRevenue - totalExpense;
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
        
        return {
          city: s.city || '未知',
          orderCount: Number(s.orderCount) || 0,
          totalRevenue,
          teacherFee,
          transportFee,
          rentFee,
          propertyFee,
          utilityFee,
          consumablesFee,
          cleaningFee,
          phoneFee,
          expressFee,
          promotionFee,
          otherFee,
          totalExpense,
          partnerShare: partnerFee, // 合伙人分成就是partnerFee
          deferredPayment: 0, // TODO: 延期支付需要从其他表查询
          profit,
          profitMargin,
        };
      });
    }),

  /**
   * 获取流量来源分析数据
   */
  trafficSourceAnalysis: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      const stats = await db
        .select({
          source: orders.trafficSource,
          orderCount: sql<number>`COUNT(*)`,
          totalRevenue: sql<number>`SUM(${orders.courseAmount})`,
        })
        .from(orders)
        .where(eq(orders.status, 'paid'))
        .groupBy(orders.trafficSource);

      return stats.map(s => ({
        source: s.source || '未知',
        orderCount: Number(s.orderCount) || 0,
        totalRevenue: Number(s.totalRevenue) || 0,
        conversionRate: 0, // TODO: 实现转化率计算
      }));
    }),

  /**
   * 获取城市收入趋势数据
   */
  cityRevenueTrend: protectedProcedure
    .input(
      z.object({
        cityId: z.number().optional(),
        months: z.number().optional().default(12),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      const monthsCount = input?.months || 12;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsCount);

      let whereConditions = [
        eq(orders.status, 'paid'),
        sql`${orders.classDate} >= ${startDate.toISOString().split('T')[0]}`
      ];

      if (input?.cityId) {
        // TODO: 添加城市ID过滤
      }

      const monthColumn = sql<string>`DATE_FORMAT(${orders.classDate}, '%Y-%m')`;
      
      const stats = await db
        .select({
          month: monthColumn,
          city: orders.deliveryCity,
          totalRevenue: sql<number>`SUM(${orders.courseAmount})`,
          orderCount: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(and(...whereConditions))
        .groupBy(monthColumn, orders.deliveryCity)
        .orderBy(monthColumn);

      // 将扁平数据转换为前端期望的格式：{ cities: [...], months: [...] }
      const monthsSet = new Set<string>();
      const citiesMap = new Map<string, number[]>();
      
      stats.forEach(s => {
        const month = s.month;
        const city = s.city || '未知';
        const revenue = Number(s.totalRevenue) || 0;
        
        monthsSet.add(month);
        
        if (!citiesMap.has(city)) {
          citiesMap.set(city, []);
        }
      });
      
      const months = Array.from(monthsSet).sort();
      
      // 为每个城市初始化数据数组
      citiesMap.forEach((data, city) => {
        citiesMap.set(city, new Array(months.length).fill(0));
      });
      
      // 填充数据
      stats.forEach(s => {
        const month = s.month;
        const city = s.city || '未知';
        const revenue = Number(s.totalRevenue) || 0;
        const monthIndex = months.indexOf(month);
        
        if (monthIndex !== -1) {
          const cityData = citiesMap.get(city);
          if (cityData) {
            cityData[monthIndex] = revenue;
          }
        }
      });
      
      const cities = Array.from(citiesMap.entries()).map(([city, data]) => ({
        city,
        data,
      }));
      
      return {
        months,
        cities,
      };
    }),

  /**
   * 获取城市收入汇总数据
   */
  cityRevenue: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      let whereConditions = [eq(orders.status, 'paid')];

      if (input?.startDate) {
        whereConditions.push(sql`${orders.classDate} >= ${input.startDate}`);
      }
      if (input?.endDate) {
        whereConditions.push(sql`${orders.classDate} <= ${input.endDate}`);
      }

      const stats = await db
        .select({
          city: orders.deliveryCity,
          totalRevenue: sql<number>`SUM(${orders.courseAmount})`,
          orderCount: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(and(...whereConditions))
        .groupBy(orders.deliveryCity);

      return stats.map(s => ({
        city: s.city || '未知',
        totalRevenue: Number(s.totalRevenue) || 0,
        orderCount: Number(s.orderCount) || 0,
      }));
    }),
});
