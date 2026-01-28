import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { systemAccounts, accountAuditLogs } from "../drizzle/schema";
import { eq, and, like, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";

export const accountRouter = router({
  // 获取账号列表
  list: protectedProcedure
    .input(
      z.object({
        identity: z.enum(["customer", "teacher", "sales", "finance", "admin", "store_partner"]).optional(),
        isActive: z.boolean().optional(),
        search: z.string().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions: any[] = [];

      if (input?.identity) {
        conditions.push(eq(systemAccounts.identity, input.identity));
      }

      if (input?.isActive !== undefined) {
        conditions.push(eq(systemAccounts.isActive, input.isActive));
      }

      if (input?.search) {
        conditions.push(like(systemAccounts.username, `%${input.search}%`));
      }

      let query: any = drizzle.select().from(systemAccounts);
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const accounts = await query.orderBy(desc(systemAccounts.createdAt)).limit(limit).offset(offset);
      return accounts;
    }),

  // 获取账号详情
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const account = await drizzle.select().from(systemAccounts).where(eq(systemAccounts.id, input.id)).limit(1);
      if (!account || account.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "账号不存在" });
      }
      return account[0];
    }),

  // 创建账号
  create: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3, "用户名至少3个字符"),
        password: z.string().min(6, "密码至少6个字符"),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        identity: z.enum(["customer", "teacher", "sales", "finance", "admin", "store_partner"]),
        relatedId: z.number().optional(),
        relatedName: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      const existing = await drizzle.select().from(systemAccounts).where(eq(systemAccounts.username, input.username)).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "用户名已存在" });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const result = await drizzle.insert(systemAccounts).values({
        username: input.username,
        passwordHash,
        email: input.email,
        phone: input.phone,
        identity: input.identity,
        relatedId: input.relatedId,
        relatedName: input.relatedName,
        notes: input.notes,
        createdBy: ctx.user.id,
        isActive: true,
      } as any);

      const accountId = result[0];

      // 记录审计日志
      await drizzle.insert(accountAuditLogs).values({
        accountId: accountId,
        operationType: "create",
        operatorId: ctx.user.id,
        operatorName: ctx.user.name,
        newValue: JSON.stringify({
          username: input.username,
          identity: input.identity,
          relatedName: input.relatedName,
        }),
      } as any);

      return {
        id: accountId,
        username: input.username,
        identity: input.identity,
        message: "账号创建成功",
      };
    }),

  // 更新账号
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        identity: z.enum(["customer", "teacher", "sales", "finance", "admin", "store_partner"]).optional(),
        relatedId: z.number().optional(),
        relatedName: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      const account = await drizzle.select().from(systemAccounts).where(eq(systemAccounts.id, input.id)).limit(1);
      if (!account || account.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "账号不存在" });
      }

      const oldValue = account[0];
      const updateData: any = {};

      if (input.email !== undefined) updateData.email = input.email;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.identity !== undefined) updateData.identity = input.identity;
      if (input.relatedId !== undefined) updateData.relatedId = input.relatedId;
      if (input.relatedName !== undefined) updateData.relatedName = input.relatedName;
      if (input.notes !== undefined) updateData.notes = input.notes;

      await drizzle.update(systemAccounts).set(updateData).where(eq(systemAccounts.id, input.id));

      // 记录审计日志
      await drizzle.insert(accountAuditLogs).values({
        accountId: input.id,
        operationType: "update",
        operatorId: ctx.user.id,
        operatorName: ctx.user.name,
        oldValue: JSON.stringify({
          email: oldValue.email,
          phone: oldValue.phone,
          identity: oldValue.identity,
          relatedName: oldValue.relatedName,
        }),
        newValue: JSON.stringify(input),
      } as any);

      return { success: true, message: "账号更新成功" };
    }),

  // 修改密码
  changePassword: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        oldPassword: z.string().optional(),
        newPassword: z.string().min(6, "新密码至少6个字符"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      const account = await drizzle.select().from(systemAccounts).where(eq(systemAccounts.id, input.id)).limit(1);
      if (!account || account.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "账号不存在" });
      }

      if (ctx.user.role !== "admin" && input.id !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "无权修改他人密码" });
      }

      if (ctx.user.role !== "admin" && input.id === ctx.user.id) {
        if (!input.oldPassword) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "必须提供旧密码" });
        }

        const isValid = await bcrypt.compare(input.oldPassword, account[0].passwordHash);
        if (!isValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "旧密码错误" });
        }
      }

      const newPasswordHash = await bcrypt.hash(input.newPassword, 10);
      await drizzle.update(systemAccounts).set({ passwordHash: newPasswordHash }).where(eq(systemAccounts.id, input.id));

      // 记录审计日志
      await drizzle.insert(accountAuditLogs).values({
        accountId: input.id,
        operationType: "password_change",
        operatorId: ctx.user.id,
        operatorName: ctx.user.name,
      } as any);

      return { success: true, message: "密码修改成功" };
    }),

  // 重置密码(管理员)
  resetPassword: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        newPassword: z.string().min(6, "新密码至少6个字符"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      const account = await drizzle.select().from(systemAccounts).where(eq(systemAccounts.id, input.id)).limit(1);
      if (!account || account.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "账号不存在" });
      }

      const newPasswordHash = await bcrypt.hash(input.newPassword, 10);
      await drizzle.update(systemAccounts).set({ passwordHash: newPasswordHash }).where(eq(systemAccounts.id, input.id));

      // 记录审计日志
      await drizzle.insert(accountAuditLogs).values({
        accountId: input.id,
        operationType: "password_change",
        operatorId: ctx.user.id,
        operatorName: ctx.user.name,
        newValue: JSON.stringify({ resetBy: ctx.user.name }),
      } as any);

      return { success: true, message: "密码重置成功" };
    }),

  // 激活/停用账号
  toggleActive: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      const account = await drizzle.select().from(systemAccounts).where(eq(systemAccounts.id, input.id)).limit(1);
      if (!account || account.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "账号不存在" });
      }

      await drizzle.update(systemAccounts).set({ isActive: input.isActive }).where(eq(systemAccounts.id, input.id));

      const operationType = input.isActive ? "activate" : "deactivate";
      await drizzle.insert(accountAuditLogs).values({
        accountId: input.id,
        operationType: operationType as any,
        operatorId: ctx.user.id,
        operatorName: ctx.user.name,
        newValue: JSON.stringify({ isActive: input.isActive }),
      } as any);

      return {
        success: true,
        message: input.isActive ? "账号已激活" : "账号已停用",
      };
    }),

  // 删除账号
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      const account = await drizzle.select().from(systemAccounts).where(eq(systemAccounts.id, input.id)).limit(1);
      if (!account || account.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "账号不存在" });
      }

      // 记录审计日志(在删除前)
      await drizzle.insert(accountAuditLogs).values({
        accountId: input.id,
        operationType: "delete",
        operatorId: ctx.user.id,
        operatorName: ctx.user.name,
        oldValue: JSON.stringify({
          username: account[0].username,
          identity: account[0].identity,
        }),
      } as any);

      await drizzle.delete(systemAccounts).where(eq(systemAccounts.id, input.id));

      return { success: true, message: "账号删除成功" };
    }),

  // 获取账号统计
  getStats: protectedProcedure.query(async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

    const allAccounts = await drizzle.select().from(systemAccounts);

    const totalAccounts = allAccounts.length;
    const activeAccounts = allAccounts.filter((a) => a.isActive).length;

    const byIdentity = {
      customer: allAccounts.filter((a) => a.identity === "customer").length,
      teacher: allAccounts.filter((a) => a.identity === "teacher").length,
      sales: allAccounts.filter((a) => a.identity === "sales").length,
      finance: allAccounts.filter((a) => a.identity === "finance").length,
      admin: allAccounts.filter((a) => a.identity === "admin").length,
    };

    return {
      totalAccounts,
      activeAccounts,
      byIdentity,
    };
  }),

  // 获取审计日志
  auditLogs: router({
    list: adminProcedure
      .input(
        z.object({
          accountId: z.number().optional(),
          operationType: z.string().optional(),
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
        }).optional()
      )
      .query(async ({ input }) => {
        const drizzle = await getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
        
        const limit = input?.limit || 50;
        const offset = input?.offset || 0;
        const conditions: any[] = [];

        if (input?.accountId) {
          conditions.push(eq(accountAuditLogs.accountId, input.accountId));
        }

        if (input?.operationType) {
          conditions.push(eq(accountAuditLogs.operationType, input.operationType as any));
        }

        let query: any = drizzle.select().from(accountAuditLogs);
        if (conditions.length > 0) {
          query = drizzle.select().from(accountAuditLogs).where(and(...conditions));
        }

        const logs = await query.orderBy(desc(accountAuditLogs.createdAt)).limit(limit).offset(offset);
        return logs;
      }),

    getStats: adminProcedure
      .input(z.object({ accountId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const drizzle = await getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

        let query: any = drizzle.select().from(accountAuditLogs);
        if (input?.accountId) {
          query = drizzle.select().from(accountAuditLogs).where(eq(accountAuditLogs.accountId, input.accountId));
        }

        const logs = await query;

        const totalLogs = logs.length;
        const operationTypes: Record<string, number> = {};
        let recentLogins = 0;

        logs.forEach((log: any) => {
          operationTypes[log.operationType] = (operationTypes[log.operationType] || 0) + 1;
          if (log.operationType === "login") {
            recentLogins++;
          }
        });

        return {
          totalLogs,
          operationTypes,
          recentLogins,
        };
      }),
  }),
});
