import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { systemAccounts } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const TOKEN_EXPIRY = "24h";

export const authRouter = router({
  // 本地账户登录
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "用户名不能为空"),
        password: z.string().min(1, "密码不能为空"),
      })
    )
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      // 查询账号
      const account = await drizzle
        .select()
        .from(systemAccounts)
        .where(eq(systemAccounts.username, input.username))
        .limit(1);

      if (account.length === 0) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "用户名或密码错误" });
      }

      const user = account[0];

      // 检查账号是否激活
      if (!user.isActive) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "账号已被停用" });
      }

      // 验证密码
      const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
      if (!passwordMatch) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "用户名或密码错误" });
      }

      // 更新最后登录时间
      await drizzle
        .update(systemAccounts)
        .set({ lastLoginAt: new Date() })
        .where(eq(systemAccounts.id, user.id));

      // 生成JWT token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          identity: user.identity,
          relatedName: user.relatedName,
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          identity: user.identity,
          relatedName: user.relatedName,
          isActive: user.isActive,
        },
      };
    }),

  // 验证token
  verifyToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      try {
        const decoded = jwt.verify(input.token, JWT_SECRET) as any;
        const drizzle = await getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

        // 验证账号是否还存在且激活
        const account = await drizzle
          .select()
          .from(systemAccounts)
          .where(eq(systemAccounts.id, decoded.id))
          .limit(1);

        if (account.length === 0 || !account[0].isActive) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "账号不存在或已被停用" });
        }

        return {
          valid: true,
          user: decoded,
        };
      } catch (error) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Token无效或已过期" });
      }
    }),

  // 获取当前登录用户信息
  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  // 登出
  logout: publicProcedure.mutation(async () => {
    return { success: true };
  }),
});
