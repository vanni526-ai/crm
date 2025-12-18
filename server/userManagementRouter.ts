import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

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
      await db.update(users)
        .set(updateData)
        .where(eq(users.id, input.id));

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
