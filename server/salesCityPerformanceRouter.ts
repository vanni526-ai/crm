import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { orders, salespersons, salesCommissionConfigs, cities } from "../drizzle/schema";
import { eq, and, sql, ne } from "drizzle-orm";

// 权限检查:只有管理员可以管理提成配置
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
  }
  return next({ ctx });
});

export const salesCityPerformanceRouter = router({
  /**
   * 获取销售x城市交叉统计数据
   */
  getCrossStats: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      salespersonId: z.number().optional(),
      city: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库未连接" });

      const conditions: any[] = [
        ne(orders.status, "cancelled"),
        eq(orders.isVoided, false),
      ];
      if (input.startDate) conditions.push(sql`${orders.paymentDate} >= ${input.startDate}`);
      if (input.endDate) conditions.push(sql`${orders.paymentDate} <= ${input.endDate}`);
      if (input.salespersonId) conditions.push(eq(orders.salespersonId, input.salespersonId));
      if (input.city) conditions.push(eq(orders.paymentCity, input.city));

      const stats = await db
        .select({
          salespersonId: orders.salespersonId,
          salesPerson: orders.salesPerson,
          city: orders.paymentCity,
          orderCount: sql<number>`COUNT(*)`.as("orderCount"),
          totalAmount: sql<string>`COALESCE(SUM(${orders.paymentAmount}), 0)`.as("totalAmount"),
          totalCourseAmount: sql<string>`COALESCE(SUM(${orders.courseAmount}), 0)`.as("totalCourseAmount"),
        })
        .from(orders)
        .where(and(...conditions))
        .groupBy(orders.salespersonId, orders.salesPerson, orders.paymentCity);

      const allSalespersons = await db
        .select({ id: salespersons.id, name: salespersons.name, nickname: salespersons.nickname, isActive: salespersons.isActive })
        .from(salespersons);

      const commissionConfigs = await db.select().from(salesCommissionConfigs);

      const allCities = await db
        .select({ name: cities.name })
        .from(cities)
        .where(eq(cities.isActive, true));

      const orderCitiesSet = new Set(stats.map((s: any) => s.city).filter(Boolean));
      const orderCities = Array.from(orderCitiesSet) as string[];
      const cityCityNames = allCities.map((c: any) => c.name);
      const allCityNamesSet = new Set([...cityCityNames, ...orderCities]);
      const allCityNames = Array.from(allCityNamesSet).sort() as string[];

      const commissionMap = new Map<string, number>();
      for (const config of commissionConfigs) {
        commissionMap.set(`${config.salespersonId}_${config.city}`, Number(config.commissionRate));
      }

      const crossData = stats.map((s: any) => {
        const spId = s.salespersonId;
        const city = s.city || "未知城市";
        const commissionRate = spId ? (commissionMap.get(`${spId}_${city}`) ?? 0) : 0;
        const totalAmount = Number(s.totalAmount);
        const commissionAmount = totalAmount * commissionRate / 100;
        return {
          salespersonId: spId,
          salesPerson: s.salesPerson || "未知销售",
          city,
          orderCount: Number(s.orderCount),
          totalAmount,
          totalCourseAmount: Number(s.totalCourseAmount),
          commissionRate,
          commissionAmount: Math.round(commissionAmount * 100) / 100,
        };
      });

      return {
        data: crossData,
        salespersons: allSalespersons,
        cities: allCityNames,
        commissionConfigs: commissionConfigs.map((c: any) => ({
          ...c,
          commissionRate: Number(c.commissionRate),
        })),
      };
    }),

  /**
   * 获取环比/同比对比数据
   */
  getComparison: protectedProcedure
    .input(z.object({
      currentStartDate: z.string(),
      currentEndDate: z.string(),
      previousStartDate: z.string(),
      previousEndDate: z.string(),
      salespersonId: z.number().optional(),
      city: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库未连接" });

      const baseConditions: any[] = [
        ne(orders.status, "cancelled"),
        eq(orders.isVoided, false),
      ];
      if (input.salespersonId) baseConditions.push(eq(orders.salespersonId, input.salespersonId));
      if (input.city) baseConditions.push(eq(orders.paymentCity, input.city));

      const currentStats = await db
        .select({
          salespersonId: orders.salespersonId,
          salesPerson: orders.salesPerson,
          city: orders.paymentCity,
          orderCount: sql<number>`COUNT(*)`.as("orderCount"),
          totalAmount: sql<string>`COALESCE(SUM(${orders.paymentAmount}), 0)`.as("totalAmount"),
        })
        .from(orders)
        .where(and(
          ...baseConditions,
          sql`${orders.paymentDate} >= ${input.currentStartDate}`,
          sql`${orders.paymentDate} <= ${input.currentEndDate}`,
        ))
        .groupBy(orders.salespersonId, orders.salesPerson, orders.paymentCity);

      const previousStats = await db
        .select({
          salespersonId: orders.salespersonId,
          salesPerson: orders.salesPerson,
          city: orders.paymentCity,
          orderCount: sql<number>`COUNT(*)`.as("orderCount"),
          totalAmount: sql<string>`COALESCE(SUM(${orders.paymentAmount}), 0)`.as("totalAmount"),
        })
        .from(orders)
        .where(and(
          ...baseConditions,
          sql`${orders.paymentDate} >= ${input.previousStartDate}`,
          sql`${orders.paymentDate} <= ${input.previousEndDate}`,
        ))
        .groupBy(orders.salespersonId, orders.salesPerson, orders.paymentCity);

      const prevMap = new Map<string, { orderCount: number; totalAmount: number }>();
      for (const s of previousStats) {
        const key = `${s.salespersonId}_${s.city || "未知城市"}`;
        prevMap.set(key, {
          orderCount: Number(s.orderCount),
          totalAmount: Number(s.totalAmount),
        });
      }

      const comparisonData = currentStats.map((s: any) => {
        const key = `${s.salespersonId}_${s.city || "未知城市"}`;
        const prev = prevMap.get(key);
        const currentAmount = Number(s.totalAmount);
        const currentCount = Number(s.orderCount);
        const prevAmount = prev?.totalAmount ?? 0;
        const prevCount = prev?.orderCount ?? 0;
        return {
          salespersonId: s.salespersonId,
          salesPerson: s.salesPerson || "未知销售",
          city: s.city || "未知城市",
          currentOrderCount: currentCount,
          currentAmount,
          previousOrderCount: prevCount,
          previousAmount: prevAmount,
          orderCountChange: prevCount > 0 ? Math.round((currentCount - prevCount) / prevCount * 10000) / 100 : (currentCount > 0 ? 100 : 0),
          amountChange: prevAmount > 0 ? Math.round((currentAmount - prevAmount) / prevAmount * 10000) / 100 : (currentAmount > 0 ? 100 : 0),
        };
      });

      const prevEntries = Array.from(prevMap.entries());
      for (const [key, prev] of prevEntries) {
        const exists = comparisonData.some((d: any) => `${d.salespersonId}_${d.city}` === key);
        if (!exists) {
          const parts = key.split("_");
          const spId = parts[0];
          const city = parts.slice(1).join("_");
          const prevStat = previousStats.find((s: any) => `${s.salespersonId}_${s.city || "未知城市"}` === key);
          comparisonData.push({
            salespersonId: Number(spId) || null as any,
            salesPerson: prevStat?.salesPerson || "未知销售",
            city,
            currentOrderCount: 0,
            currentAmount: 0,
            previousOrderCount: prev.orderCount,
            previousAmount: prev.totalAmount,
            orderCountChange: -100,
            amountChange: -100,
          });
        }
      }

      return comparisonData;
    }),

  /**
   * 获取提成配置列表
   */
  getCommissionConfigs: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库未连接" });
    const configs = await db.select().from(salesCommissionConfigs);
    return configs.map((c: any) => ({
      ...c,
      commissionRate: Number(c.commissionRate),
    }));
  }),

  /**
   * 设置单个提成配置
   */
  setCommission: adminProcedure
    .input(z.object({
      salespersonId: z.number(),
      city: z.string().min(1),
      commissionRate: z.number().min(0).max(100),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库未连接" });
      await db.insert(salesCommissionConfigs)
        .values({
          salespersonId: input.salespersonId,
          city: input.city,
          commissionRate: input.commissionRate.toString(),
          notes: input.notes || null,
          updatedBy: ctx.user.id,
        })
        .onDuplicateKeyUpdate({
          set: {
            commissionRate: input.commissionRate.toString(),
            notes: input.notes || null,
            updatedBy: ctx.user.id,
          },
        });
      return { success: true };
    }),

  /**
   * 批量设置提成配置
   */
  batchSetCommission: adminProcedure
    .input(z.object({
      configs: z.array(z.object({
        salespersonId: z.number(),
        city: z.string().min(1),
        commissionRate: z.number().min(0).max(100),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库未连接" });
      let successCount = 0;
      let failCount = 0;
      for (const config of input.configs) {
        try {
          await db.insert(salesCommissionConfigs)
            .values({
              salespersonId: config.salespersonId,
              city: config.city,
              commissionRate: config.commissionRate.toString(),
              notes: config.notes || null,
              updatedBy: ctx.user.id,
            })
            .onDuplicateKeyUpdate({
              set: {
                commissionRate: config.commissionRate.toString(),
                notes: config.notes || null,
                updatedBy: ctx.user.id,
              },
            });
          successCount++;
        } catch (error) {
          failCount++;
          console.error("批量设置提成失败:", config, error);
        }
      }
      return {
        success: true,
        successCount,
        failCount,
        message: `成功设置 ${successCount} 条，失败 ${failCount} 条`,
      };
    }),

  /**
   * 删除提成配置
   */
  deleteCommission: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库未连接" });
      await db.delete(salesCommissionConfigs).where(eq(salesCommissionConfigs.id, input.id));
      return { success: true };
    }),

  /**
   * 导出Excel数据
   */
  getExportData: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      salespersonId: z.number().optional(),
      city: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库未连接" });

      const conditions: any[] = [
        ne(orders.status, "cancelled"),
        eq(orders.isVoided, false),
      ];
      if (input.startDate) conditions.push(sql`${orders.paymentDate} >= ${input.startDate}`);
      if (input.endDate) conditions.push(sql`${orders.paymentDate} <= ${input.endDate}`);
      if (input.salespersonId) conditions.push(eq(orders.salespersonId, input.salespersonId));
      if (input.city) conditions.push(eq(orders.paymentCity, input.city));

      const stats = await db
        .select({
          salespersonId: orders.salespersonId,
          salesPerson: orders.salesPerson,
          city: orders.paymentCity,
          orderCount: sql<number>`COUNT(*)`.as("orderCount"),
          totalAmount: sql<string>`COALESCE(SUM(${orders.paymentAmount}), 0)`.as("totalAmount"),
          totalCourseAmount: sql<string>`COALESCE(SUM(${orders.courseAmount}), 0)`.as("totalCourseAmount"),
        })
        .from(orders)
        .where(and(...conditions))
        .groupBy(orders.salespersonId, orders.salesPerson, orders.paymentCity);

      const commissionConfigs = await db.select().from(salesCommissionConfigs);
      const commissionMap = new Map<string, number>();
      for (const config of commissionConfigs) {
        commissionMap.set(`${config.salespersonId}_${config.city}`, Number(config.commissionRate));
      }

      return stats.map((s: any) => {
        const spId = s.salespersonId;
        const city = s.city || "未知城市";
        const commissionRate = spId ? (commissionMap.get(`${spId}_${city}`) ?? 0) : 0;
        const totalAmount = Number(s.totalAmount);
        const commissionAmount = Math.round(totalAmount * commissionRate / 100 * 100) / 100;
        return {
          salesPerson: s.salesPerson || "未知销售",
          city,
          orderCount: Number(s.orderCount),
          totalAmount,
          totalCourseAmount: Number(s.totalCourseAmount),
          commissionRate,
          commissionAmount,
        };
      });
    }),
});
