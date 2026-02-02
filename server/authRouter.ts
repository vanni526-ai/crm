import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { systemAccounts, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { hashPassword, verifyPassword } from "./passwordUtils";
import { or } from "drizzle-orm";
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

  // 用户账号登录(支u6301用户名/手u673au53f7/邮u7bb1登录)
  loginWithUserAccount: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "请输入用户名"),
        password: z.string().min(1, "请输入密码"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据u5e93连u63a5失败",
        });
      }

      // 1. 查找u7528户(支u6301用户名/手u673au53f7/邮u7bb1登u5f55)
      const userList = await drizzle
        .select()
        .from(users)
        .where(
          or(
            eq(users.name, input.username),
            eq(users.phone, input.username),
            eq(users.email, input.username)
          )
        )
        .limit(1);

      if (userList.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "用户不存在",
        });
      }

      const user = userList[0];

      // 2. 验u8bc1密码
      if (!user.password) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "该账号未设u7f6e密码，请联系管理员",
        });
      }

      const isValidPassword = await verifyPassword(input.password, user.password);
      if (!isValidPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "密码错误",
        });
      }

      // 3. 检查用户状态
      if (!user.isActive) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "账号已被禁用，请联系管理员",
        });
      }

      // 4. 生u6210token
      const token = jwt.sign(
        {
          id: user.id,
          openId: user.openId,
          name: user.name,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );

      // 5. 设u7f6esession cookie
      ctx.res?.cookie("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      });

      // 6. 更新最后登u5f55时间
      await drizzle
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      return {
        success: true,
        token,
        user: {
          id: user.id,
          openId: user.openId || "",
          name: user.name || "",
          nickname: user.nickname || "",
          email: user.email || "",
          phone: user.phone || "",
          role: user.role,
          isActive: user.isActive,
        },
      };
    }),
});
