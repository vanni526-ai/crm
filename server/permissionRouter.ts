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
      // 开放给所有用户
      // if (ctx.user.role !== "admin") {
      //   throw new TRPCError({ code: "FORBIDDEN" });
      // }

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
      // 开放给所有用户
      // if (ctx.user.role !== "admin") {
      //   throw new TRPCError({ code: "FORBIDDEN" });
      // }

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

  // 获取所有可用权限(菜单列表 - 按类别分组)
  getAvailablePermissions: protectedProcedure.query(async ({ ctx }: any) => {
    // 开放给所有用户
    // if (ctx.user.role !== "admin") {
    //   throw new TRPCError({ code: "FORBIDDEN" });
    // }

    // 返回所有导航菜单项作为可用权限(按类别分组)
    const availablePermissions = [
      {
        category: "基础功能",
        icon: "Home",
        permissions: [
          { key: "/", name: "首页", description: "查看主控制板" },
        ]
      },
      {
        category: "销售管理",
        icon: "ShoppingCart",
        permissions: [
          { key: "/orders", name: "订单管理", description: "管理订单信息" },
          { key: "/customers", name: "客户管理", description: "管理客户信息" },
          { key: "/sales", name: "销售管理", description: "管理销售人员" },
        ]
      },
      {
        category: "课程管理",
        icon: "BookOpen",
        permissions: [
          { key: "/schedules", name: "课程排课", description: "管理课程日程" },
          { key: "/teachers", name: "老师管理", description: "管理老师信息" },
        ]
      },
      {
        category: "系统配置",
        icon: "Settings",
        permissions: [
          { key: "/cities", name: "城市管理", description: "管理城市配置" },
        ]
      },
      {
        category: "财务管理",
        icon: "DollarSign",
        permissions: [
          { key: "/finance", name: "财务管理", description: "管理财务信息" },
          { key: "/reconciliation-match", name: "财务对账", description: "执行财务对账" },
        ]
      },
      {
        category: "数据管理",
        icon: "Database",
        permissions: [
          { key: "/import", name: "数据导入", description: "导入数据" },
          { key: "/gmail-import", name: "Gmail导入", description: "从 Gmail 导入" },
          { key: "/parsing-learning", name: "解析学习", description: "查看解析结果" },
        ]
      },
      {
        category: "系统管理",
        icon: "Shield",
        permissions: [
          { key: "/accounts", name: "账号管理", description: "管理系统账号" },
        ]
      },
    ];

    return availablePermissions;
  }),

  // 获取权限预设(按角色类型)
  getPermissionPresets: protectedProcedure.query(async ({ ctx }: any) => {
    // 返回不同角色的权限预设
    const presets = [
      {
        name: "销售权限",
        description: "销售人员的标准权限",
        identity: "sales",
        permissions: ["/", "/orders", "/customers", "/sales", "/schedules"],
      },
      {
        name: "财务权限",
        description: "财务人员的标准权限",
        identity: "finance",
        permissions: ["/", "/orders", "/finance", "/reconciliation-match"],
      },
      {
        name: "老师权限",
        description: "老师的标准权限",
        identity: "teacher",
        permissions: ["/", "/schedules", "/customers"],
      },
      {
        name: "管理员权限",
        description: "管理员的完全权限",
        identity: "admin",
        permissions: ["/", "/orders", "/customers", "/sales", "/schedules", "/teachers", "/cities", "/finance", "/reconciliation-match", "/import", "/gmail-import", "/parsing-learning", "/accounts"],
      },
      {
        name: "查看权限",
        description: "仅查看权限(只读)",
        identity: "viewer",
        permissions: ["/", "/orders", "/customers", "/sales", "/schedules", "/finance"],
      },
    ];

    return presets;
  }),
});
