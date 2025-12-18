import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "./auditLogger";
import bcrypt from "bcryptjs";

// 检查是否为超级管理员
async function checkAdmin(ctx: any) {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "需要登录",
    });
  }

  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "仅超级管理员可访问此功能",
    });
  }

  return ctx.user;
}

export const userManagementRouter = router({
  // 创建用户(账号密码登录)
  create: protectedProcedure
    .input(z.object({
      username: z.string().min(3, "用户名至少3个字符"),
      password: z.string().min(6, "密码至少6个字符"),
      name: z.string().min(1, "姓名不能为空"),
      nickname: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      role: z.enum(["admin", "sales", "finance", "user"]),
      salespersonId: z.number().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      await checkAdmin(ctx);

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      // 检查用户名是否已存在
      const existingUser = await db.select().from(users).where(eq(users.username, input.username)).limit(1).then(rows => rows[0]);
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "用户名已存在",
        });
      }

      // 加密密码
      const passwordHash = await bcrypt.hash(input.password, 10);

      // 创建用户
      const [newUser] = await db.insert(users).values({
        username: input.username,
        passwordHash,
        name: input.name,
        nickname: input.nickname,
        email: input.email,
        role: input.role,
        salespersonId: input.salespersonId,
        loginMethod: "password",
        isActive: true,
        createdBy: ctx.user.id,
        openId: `password_${input.username}`, // 为密码登录用户生成虚拟openId
      });

      // 记录审计日志
      await logAudit({
        action: "user_create",
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.nickname || undefined,
        userRole: ctx.user.role,
        targetType: "user",
        targetId: newUser.insertId,
        targetName: input.name,
        description: `创建新用户: ${input.username} (${input.name})`,
        changes: { username: input.username, role: input.role },
      });

      return { success: true, userId: newUser.insertId };
    }),

  // 列出所有用户
  list: protectedProcedure
    .query(async ({ ctx }) => {
      await checkAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      const allUsers = await db.select().from(users);
      return allUsers;
    }),

  // 更新用户角色和信息
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      role: z.enum(["admin", "sales", "finance", "user"]).optional(),
      salespersonId: z.number().optional().nullable(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const currentUser = await checkAdmin(ctx);

      // 不能修改自己的角色和状态
      if (input.id === currentUser.id && (input.role || input.isActive !== undefined)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "不能修改自己的角色或状态",
        });
      }

      const updateData: any = {};
      if (input.role) updateData.role = input.role;
      if (input.salespersonId !== undefined) updateData.salespersonId = input.salespersonId;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      // 获取用户信息用于日志
      const targetUser = await db.select().from(users).where(eq(users.id, input.id)).limit(1).then(rows => rows[0]);
      
      await db.update(users)
        .set(updateData)
        .where(eq(users.id, input.id));
      
      // 记录审计日志
      const changes: string[] = [];
      if (input.role) changes.push(`角色: ${targetUser?.role} → ${input.role}`);
      if (input.salespersonId !== undefined) changes.push(`销售人员ID: ${targetUser?.salespersonId} → ${input.salespersonId}`);
      if (input.isActive !== undefined) changes.push(`状态: ${targetUser?.isActive ? '活跃' : '禁用'} → ${input.isActive ? '活跃' : '禁用'}`);
      
      await logAudit({
        action: input.role ? "user_role_update" : "user_status_update",
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.nickname || undefined,
        userRole: ctx.user.role,
        targetType: "user",
        targetId: input.id,
        targetName: targetUser?.name || targetUser?.nickname || `User#${input.id}`,
        description: `更新用户信息: ${changes.join(', ')}`,
        changes: { before: { role: targetUser?.role, salespersonId: targetUser?.salespersonId, isActive: targetUser?.isActive }, after: updateData },
      });

      return { success: true };
    }),

  // 删除用户
  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const currentUser = await checkAdmin(ctx);

      // 不能删除自己
      if (input.id === currentUser.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "不能删除自己的账号",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),
});
