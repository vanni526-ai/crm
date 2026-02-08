import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./passwordUtils";

// 角色常量
const VALID_ROLES = ["admin", "teacher", "user", "sales", "cityPartner"] as const;

// 权限检查中间件 - 只有管理员可以管理用户
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  // 支持多角色：检查roles字段或回退到role字段
  const userRoles = (ctx.user as any).roles || ctx.user.role || "";
  const hasAdmin = userRoles.split(",").map((r: string) => r.trim()).includes("admin");
  if (!hasAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
  }
  return next({ ctx });
});

export const userManagementRouter = router({
  // 获取所有用户列表
  list: adminProcedure.query(async () => {
    const drizzle = await getDb();
    if (!drizzle) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "数据库连接失败",
      });
    }

    const userList = await drizzle.select().from(users);

    // 不返回密码字段
    return userList.map((user) => ({
      id: user.id,
      openId: user.openId,
      name: user.name,
      nickname: user.nickname,
      email: user.email,
      phone: user.phone,
      role: user.role,
      roles: (user as any).roles || user.role || "user",
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastSignedIn: user.lastSignedIn,
    }));
  }),

  // 获取单个用户详情
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      const userList = await drizzle
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (userList.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      const user = userList[0];

      // 不返回密码字段
      return {
        id: user.id,
        openId: user.openId,
        name: user.name,
        nickname: user.nickname,
        email: user.email,
        phone: user.phone,
        role: user.role,
        roles: (user as any).roles || user.role || "user",
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastSignedIn: user.lastSignedIn,
      };
    }),

  // 创建新用户
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "用户名不能为空"),
        nickname: z.string().optional(),
        email: z.string().email("邮箱格式不正确").optional(),
        phone: z.string().optional(),
        password: z.string().min(6, "密码至少6位"),
        role: z.enum(["admin", "sales", "finance", "user", "teacher", "cityPartner"]).optional(),
        roles: z.string().optional(), // 多角色，逗号分隔
      })
    )
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      // 加密密码
      const hashedPassword = await hashPassword(input.password);

      // 生成openId(使用时间戳+随机数)
      const openId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // 解析角色
      const rolesStr = input.roles || input.role || "user";
      const primaryRole = rolesStr.split(",")[0].trim();

      // 创建用户
      await drizzle.insert(users).values({
        openId,
        name: input.name,
        nickname: input.nickname || null,
        email: input.email || null,
        phone: input.phone || null,
        password: hashedPassword,
        role: primaryRole as any,
        roles: rolesStr,
        isActive: true,
      } as any);

      return {
        success: true,
        message: "用户创建成功",
      };
    }),

  // 更新用户信息
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1, "用户名不能为空").optional(),
        nickname: z.string().optional(),
        email: z.string().email("邮箱格式不正确").optional(),
        phone: z.string().optional(),
        role: z.enum(["admin", "sales", "finance", "user", "teacher", "cityPartner"]).optional(),
        roles: z.string().optional(), // 多角色，逗号分隔
      })
    )
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      const { id, roles, ...updateData } = input;

      // 如果传了roles，同步更新role字段
      const setData: any = { ...updateData };
      if (roles) {
        setData.roles = roles;
        setData.role = roles.split(",")[0].trim();
      }

      await drizzle.update(users).set(setData).where(eq(users.id, id));

      return {
        success: true,
        message: "用户信息更新成功",
      };
    }),

  // 更新用户角色（多角色）
  updateRoles: adminProcedure
    .input(
      z.object({
        id: z.number(),
        roles: z.string().min(1, "至少需要一个角色"),
      })
    )
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      const primaryRole = input.roles.split(",")[0].trim();

      await drizzle
        .update(users)
        .set({
          role: primaryRole as any,
          roles: input.roles,
        } as any)
        .where(eq(users.id, input.id));

      return {
        success: true,
        message: "角色更新成功",
      };
    }),

  // 重置用户密码
  resetPassword: adminProcedure
    .input(
      z.object({
        id: z.number(),
        newPassword: z.string().min(6, "密码至少6位"),
      })
    )
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      // 加密新密码
      const hashedPassword = await hashPassword(input.newPassword);

      await drizzle
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, input.id));

      return {
        success: true,
        message: "密码重置成功",
      };
    }),

  // 启用/禁用用户账号
  toggleActive: adminProcedure
    .input(
      z.object({
        id: z.number(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      await drizzle
        .update(users)
        .set({ isActive: input.isActive })
        .where(eq(users.id, input.id));

      return {
        success: true,
        message: input.isActive ? "账号已启用" : "账号已禁用",
      };
    }),

  // 删除用户
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      // 检查用户是否存在
      const [existingUser] = await drizzle
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      await drizzle.delete(users).where(eq(users.id, input.id));

      return {
        success: true,
        message: "用户删除成功",
      };
    }),
});
