import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";

// 权限检查中间件
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
  }
  return next({ ctx });
});
import { z } from "zod";
import { getDb } from "./db";
import { auditLogs } from "../drizzle/schema";
import { desc, and, eq, gte, lte, like, or } from "drizzle-orm";

export const auditLogRouter = router({
  /**
   * 查询审计日志列表(仅管理员)
   */
  list: adminProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(50),
      action: z.string().optional(),
      userId: z.number().optional(),
      targetType: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      keyword: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { logs: [], total: 0, page: input.page, pageSize: input.pageSize };

      const conditions = [];

      // 按操作类型筛选
      if (input.action) {
        conditions.push(eq(auditLogs.action, input.action as any));
      }

      // 按操作人筛选
      if (input.userId) {
        conditions.push(eq(auditLogs.userId, input.userId));
      }

      // 按目标类型筛选
      if (input.targetType) {
        conditions.push(eq(auditLogs.targetType, input.targetType));
      }

      // 按时间范围筛选
      if (input.startDate) {
        conditions.push(gte(auditLogs.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(auditLogs.createdAt, new Date(input.endDate)));
      }

      // 关键词搜索(描述或目标名称)
      if (input.keyword) {
        conditions.push(
          or(
            like(auditLogs.description, `%${input.keyword}%`),
            like(auditLogs.targetName, `%${input.keyword}%`)
          )!
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // 查询总数
      const totalResult = await db
        .select({ count: auditLogs.id })
        .from(auditLogs)
        .where(whereClause);
      const total = totalResult.length;

      // 分页查询
      const logs = await db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return {
        logs,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  /**
   * 获取单条审计日志详情(仅管理员)
   */
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.id, input.id))
        .limit(1);

      return result[0] || null;
    }),

  /**
   * 获取操作统计(仅管理员)
   */
  getStatistics: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { totalLogs: 0, actionCounts: {}, userCounts: {} };

      const conditions = [];
      if (input.startDate) {
        conditions.push(gte(auditLogs.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(auditLogs.createdAt, new Date(input.endDate)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const logs = await db
        .select()
        .from(auditLogs)
        .where(whereClause);

      // 统计操作类型分布
      const actionCounts: Record<string, number> = {};
      const userCounts: Record<string, number> = {};

      logs.forEach(log => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
        const userKey = `${log.userId}-${log.userName || 'Unknown'}`;
        userCounts[userKey] = (userCounts[userKey] || 0) + 1;
      });

      return {
        totalLogs: logs.length,
        actionCounts,
        userCounts,
      };
    }),
});
