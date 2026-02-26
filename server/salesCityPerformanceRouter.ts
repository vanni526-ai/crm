import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { orders, salespersons, salesCommissionConfigs, cities, users } from "../drizzle/schema";
import { eq, and, sql, ne, or } from "drizzle-orm";

// 权限检查:只有管理员可以管理提成配置
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
  }
  return next({ ctx });
});

/**
 * 根据salesPerson文本字段匹配salespersons表中的销售人员
 * 返回一个Map: salesPersonText -> { id, name, nickname }
 */
function buildSalesPersonMapping(allSalespersons: any[]) {
  const mapping = new Map<string, { id: number; name: string; nickname: string | null }>();
  for (const sp of allSalespersons) {
    // 用name匹配
    if (sp.name) {
      mapping.set(sp.name.toLowerCase(), { id: sp.id, name: sp.name, nickname: sp.nickname });
    }
    // 用nickname匹配
    if (sp.nickname && sp.nickname !== sp.name) {
      mapping.set(sp.nickname.toLowerCase(), { id: sp.id, name: sp.name, nickname: sp.nickname });
    }
  }
  return mapping;
}

/**
 * 将原始统计数据按(销售人员ID, 城市)合并
 * 核心逻辑：通过salesPerson文本字段匹配salespersons表，合并同一销售的数据
 */
function mergeStatsBySalesperson(
  rawStats: any[],
  salesPersonMapping: Map<string, { id: number; name: string; nickname: string | null }>
) {
  const merged = new Map<string, {
    salespersonId: number | null;
    salesPerson: string;
    city: string;
    orderCount: number;
    totalAmount: number;
    totalCourseAmount: number;
  }>();

  for (const row of rawStats) {
    const spText = (row.salesPerson || "").trim();
    const city = row.city || "未知城市";

    // 尝试通过文本匹配找到对应的销售人员
    let matchedSp = salesPersonMapping.get(spText.toLowerCase());

    // 如果有salespersonId，也尝试直接用ID匹配
    if (!matchedSp && row.salespersonId) {
      const entries = Array.from(salesPersonMapping.entries());
      for (let i = 0; i < entries.length; i++) {
        if (entries[i][1].id === row.salespersonId) {
          matchedSp = entries[i][1];
          break;
        }
      }
    }

    const spId = matchedSp?.id ?? null;
    const spName = matchedSp?.name || spText || "未知销售";
    const key = `${spId ?? spText}_${city}`;

    const existing = merged.get(key);
    if (existing) {
      existing.orderCount += Number(row.orderCount);
      existing.totalAmount += Number(row.totalAmount);
      existing.totalCourseAmount += Number(row.totalCourseAmount || 0);
    } else {
      merged.set(key, {
        salespersonId: spId,
        salesPerson: spName,
        city,
        orderCount: Number(row.orderCount),
        totalAmount: Number(row.totalAmount),
        totalCourseAmount: Number(row.totalCourseAmount || 0),
      });
    }
  }

  return Array.from(merged.values());
}

export const salesCityPerformanceRouter = router({
  /**
   * 获取销售x城市交叉统计数据
   * 核心修复：通过salesPerson文本匹配salespersons表，合并同一销售的数据
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

      // 获取所有销售人员（JOIN users表获取姓名和花名）
      const allSalespersons = await db
        .select({ 
          id: salespersons.id, 
          name: users.name, 
          nickname: users.nickname, 
          isActive: salespersons.isActive 
        })
        .from(salespersons)
        .leftJoin(users, eq(salespersons.userId, users.id));

      const salesPersonMapping = buildSalesPersonMapping(allSalespersons);

      // 构建查询条件
      const conditions: any[] = [
        ne(orders.status, "cancelled"),
        eq(orders.isVoided, false),
      ];
      if (input.startDate) conditions.push(sql`${orders.paymentDate} >= ${input.startDate}`);
      if (input.endDate) conditions.push(sql`${orders.paymentDate} <= ${input.endDate}`);
      if (input.city) conditions.push(eq(orders.deliveryCity, input.city));

      // 如果按销售人员筛选，需要同时匹配salespersonId和salesPerson文本
      if (input.salespersonId) {
        const targetSp = allSalespersons.find(sp => sp.id === input.salespersonId);
        if (targetSp) {
          const spConditions: any[] = [eq(orders.salespersonId, input.salespersonId)];
          if (targetSp.name) spConditions.push(eq(orders.salesPerson, targetSp.name));
          if (targetSp.nickname && targetSp.nickname !== targetSp.name) {
            spConditions.push(eq(orders.salesPerson, targetSp.nickname));
          }
          conditions.push(or(...spConditions));
        } else {
          conditions.push(eq(orders.salespersonId, input.salespersonId));
        }
      }

      // 按salesPerson文本和城市分组（不再按salespersonId分组，避免null和有值的分裂）
      const rawStats = await db
        .select({
          salespersonId: orders.salespersonId,
          salesPerson: orders.salesPerson,
          city: orders.deliveryCity,
          orderCount: sql<number>`COUNT(*)`.as("orderCount"),
          totalAmount: sql<string>`COALESCE(SUM(${orders.courseAmount}), 0)`.as("totalAmount"),
          totalCourseAmount: sql<string>`COALESCE(SUM(${orders.courseAmount}), 0)`.as("totalCourseAmount"),
        })
        .from(orders)
        .where(and(...conditions))
        .groupBy(orders.salespersonId, orders.salesPerson, orders.deliveryCity);

      // 合并同一销售人员的数据
      const mergedStats = mergeStatsBySalesperson(rawStats, salesPersonMapping);

      // 获取提成配置
      const commissionConfigs = await db.select().from(salesCommissionConfigs);
      const commissionMap = new Map<string, number>();
      for (const config of commissionConfigs) {
        commissionMap.set(`${config.salespersonId}_${config.city}`, Number(config.commissionRate));
      }

      // 获取所有城市
      const allCities = await db
        .select({ name: cities.name })
        .from(cities)
        .where(eq(cities.isActive, true));

      const orderCitiesSet = new Set(mergedStats.map(s => s.city).filter(Boolean));
      const cityCityNames = allCities.map((c: any) => c.name);
      const allCityNamesSet = new Set([...cityCityNames, ...Array.from(orderCitiesSet)]);
      const allCityNames = Array.from(allCityNamesSet).sort() as string[];

      // 计算提成
      const crossData = mergedStats.map(s => {
        const spId = s.salespersonId;
        const city = s.city;
        const commissionRate = spId ? (commissionMap.get(`${spId}_${city}`) ?? 0) : 0;
        const totalAmount = s.totalAmount;
        const commissionAmount = totalAmount * commissionRate / 100;
        return {
          salespersonId: spId,
          salesPerson: s.salesPerson,
          city,
          orderCount: s.orderCount,
          totalAmount,
          totalCourseAmount: s.totalCourseAmount,
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

      // 获取所有销售人员用于名字匹配（JOIN users表获取姓名和花名）
      const allSalespersons = await db
        .select({ 
          id: salespersons.id, 
          name: users.name, 
          nickname: users.nickname 
        })
        .from(salespersons)
        .leftJoin(users, eq(salespersons.userId, users.id));
      const salesPersonMapping = buildSalesPersonMapping(allSalespersons);

      const baseConditions: any[] = [
        ne(orders.status, "cancelled"),
        eq(orders.isVoided, false),
      ];
      if (input.city) baseConditions.push(eq(orders.deliveryCity, input.city));

      // 销售人员筛选：同时匹配ID和名字
      if (input.salespersonId) {
        const targetSp = allSalespersons.find(sp => sp.id === input.salespersonId);
        if (targetSp) {
          const spConditions: any[] = [eq(orders.salespersonId, input.salespersonId)];
          if (targetSp.name) spConditions.push(eq(orders.salesPerson, targetSp.name));
          if (targetSp.nickname && targetSp.nickname !== targetSp.name) {
            spConditions.push(eq(orders.salesPerson, targetSp.nickname));
          }
          baseConditions.push(or(...spConditions));
        }
      }

      const fetchStats = async (startDate: string, endDate: string) => {
        const rawStats = await db
          .select({
            salespersonId: orders.salespersonId,
            salesPerson: orders.salesPerson,
            city: orders.deliveryCity,
            orderCount: sql<number>`COUNT(*)`.as("orderCount"),
            totalAmount: sql<string>`COALESCE(SUM(${orders.courseAmount}), 0)`.as("totalAmount"),
            totalCourseAmount: sql<string>`COALESCE(SUM(${orders.courseAmount}), 0)`.as("totalCourseAmount"),
          })
          .from(orders)
          .where(and(
            ...baseConditions,
            sql`${orders.paymentDate} >= ${startDate}`,
            sql`${orders.paymentDate} <= ${endDate}`,
          ))
          .groupBy(orders.salespersonId, orders.salesPerson, orders.deliveryCity);

        return mergeStatsBySalesperson(rawStats, salesPersonMapping);
      };

      const currentStats = await fetchStats(input.currentStartDate, input.currentEndDate);
      const previousStats = await fetchStats(input.previousStartDate, input.previousEndDate);

      const prevMap = new Map<string, { orderCount: number; totalAmount: number; salesPerson: string }>();
      for (const s of previousStats) {
        const key = `${s.salespersonId ?? s.salesPerson}_${s.city}`;
        prevMap.set(key, {
          orderCount: s.orderCount,
          totalAmount: s.totalAmount,
          salesPerson: s.salesPerson,
        });
      }

      const comparisonData = currentStats.map(s => {
        const key = `${s.salespersonId ?? s.salesPerson}_${s.city}`;
        const prev = prevMap.get(key);
        const currentAmount = s.totalAmount;
        const currentCount = s.orderCount;
        const prevAmount = prev?.totalAmount ?? 0;
        const prevCount = prev?.orderCount ?? 0;
        return {
          salespersonId: s.salespersonId,
          salesPerson: s.salesPerson,
          city: s.city,
          currentOrderCount: currentCount,
          currentAmount,
          previousOrderCount: prevCount,
          previousAmount: prevAmount,
          orderCountChange: prevCount > 0 ? Math.round((currentCount - prevCount) / prevCount * 10000) / 100 : (currentCount > 0 ? 100 : 0),
          amountChange: prevAmount > 0 ? Math.round((currentAmount - prevAmount) / prevAmount * 10000) / 100 : (currentAmount > 0 ? 100 : 0),
        };
      });

      // 添加仅在上期存在的数据
      const prevEntries = Array.from(prevMap.entries());
      for (let i = 0; i < prevEntries.length; i++) {
        const [key, prev] = prevEntries[i];
        const exists = comparisonData.some(d => `${d.salespersonId ?? d.salesPerson}_${d.city}` === key);
        if (!exists) {
          const parts = key.split("_");
          const city = parts.slice(1).join("_");
          comparisonData.push({
            salespersonId: null as any,
            salesPerson: prev.salesPerson,
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

      // 获取所有销售人员用于名字匹配（JOIN users表获取姓名和花名）
      const allSalespersons = await db
        .select({ 
          id: salespersons.id, 
          name: users.name, 
          nickname: users.nickname 
        })
        .from(salespersons)
        .leftJoin(users, eq(salespersons.userId, users.id));
      const salesPersonMapping = buildSalesPersonMapping(allSalespersons);

      const conditions: any[] = [
        ne(orders.status, "cancelled"),
        eq(orders.isVoided, false),
      ];
      if (input.startDate) conditions.push(sql`${orders.paymentDate} >= ${input.startDate}`);
      if (input.endDate) conditions.push(sql`${orders.paymentDate} <= ${input.endDate}`);
      if (input.city) conditions.push(eq(orders.deliveryCity, input.city));

      if (input.salespersonId) {
        const targetSp = allSalespersons.find(sp => sp.id === input.salespersonId);
        if (targetSp) {
          const spConditions: any[] = [eq(orders.salespersonId, input.salespersonId)];
          if (targetSp.name) spConditions.push(eq(orders.salesPerson, targetSp.name));
          if (targetSp.nickname && targetSp.nickname !== targetSp.name) {
            spConditions.push(eq(orders.salesPerson, targetSp.nickname));
          }
          conditions.push(or(...spConditions));
        }
      }

      const rawStats = await db
        .select({
          salespersonId: orders.salespersonId,
          salesPerson: orders.salesPerson,
          city: orders.deliveryCity,
          orderCount: sql<number>`COUNT(*)`.as("orderCount"),
          totalAmount: sql<string>`COALESCE(SUM(${orders.courseAmount}), 0)`.as("totalAmount"),
          totalCourseAmount: sql<string>`COALESCE(SUM(${orders.courseAmount}), 0)`.as("totalCourseAmount"),
        })
        .from(orders)
        .where(and(...conditions))
        .groupBy(orders.salespersonId, orders.salesPerson, orders.deliveryCity);

      const mergedStats = mergeStatsBySalesperson(rawStats, salesPersonMapping);

      const commissionConfigs = await db.select().from(salesCommissionConfigs);
      const commissionMap = new Map<string, number>();
      for (const config of commissionConfigs) {
        commissionMap.set(`${config.salespersonId}_${config.city}`, Number(config.commissionRate));
      }

      return mergedStats.map(s => {
        const spId = s.salespersonId;
        const city = s.city;
        const commissionRate = spId ? (commissionMap.get(`${spId}_${city}`) ?? 0) : 0;
        const totalAmount = s.totalAmount;
        const commissionAmount = Math.round(totalAmount * commissionRate / 100 * 100) / 100;
        return {
          salesPerson: s.salesPerson,
          city,
          orderCount: s.orderCount,
          totalAmount,
          totalCourseAmount: s.totalCourseAmount,
          commissionRate,
          commissionAmount,
        };
      });
    }),
});
