import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { accountPermissions, accountAuditLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const permissionRouter = router({
  // 获取账号权限
  getPermissions: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .query(async ({ ctx, input }: any) => {
      // 只有管理员可以查看权限
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      const permissions = await drizzle
        .select()
        .from(accountPermissions)
        .where(eq(accountPermissions.accountId, input.accountId));

      return permissions;
    }),

  // 更新账号权限
  updatePermissions: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        permissions: z.array(
          z.object({
            permissionKey: z.string(),
            permissionName: z.string(),
            isGranted: z.boolean(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      // 只有管理员可以修改权限
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      // 删除旧的权限记录
      await drizzle
        .delete(accountPermissions)
        .where(eq(accountPermissions.accountId, input.accountId));

      // 插入新的权限记录
      if (input.permissions.length > 0) {
        await drizzle.insert(accountPermissions).values(
          input.permissions.map((p: any) => ({
            accountId: input.accountId,
            permissionKey: p.permissionKey,
            permissionName: p.permissionName,
            isGranted: p.isGranted,
          })) as any
        );
      }

      // 记录审计日志
      await drizzle.insert(accountAuditLogs).values({
        accountId: input.accountId,
        operationType: "update_permissions",
        operatorId: ctx.user.id,
        operatorName: ctx.user.name || "Unknown",
        newValue: JSON.stringify(input.permissions),
      } as any);

      return { success: true };
    }),

  // 获取所有可用权限(菜单列表)
  getAvailablePermissions: protectedProcedure.query(async ({ ctx }: any) => {
    // 只有管理员可以查看权限列表
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    // 返回所有导航菜单项作为可用权限
    const availablePermissions = [
      { key: "/", name: "首页" },
      { key: "/orders", name: "订单管理" },
      { key: "/customers", name: "客户管理" },
      { key: "/sales", name: "销售管理" },
      { key: "/schedules", name: "课程排课" },
      { key: "/teachers", name: "老师管理" },
      { key: "/cities", name: "城市管理" },
      { key: "/finance", name: "财务管理" },
      { key: "/reconciliation-match", name: "财务对账" },
      { key: "/import", name: "数据导入" },
      { key: "/gmail-import", name: "Gmail导入" },
      { key: "/parsing-learning", name: "解析学习" },
      { key: "/accounts", name: "账号管理" },
    ];

    return availablePermissions;
  }),
});
