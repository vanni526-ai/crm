import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getOrCreateCustomerForUser } from "./db";
import { systemAccounts, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { hashPassword, verifyPassword } from "./passwordUtils";
import { or } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

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
        success: true,
        token,
        user: {
          id: user.id,
          name: user.username,
          nickname: user.relatedName,
          email: user.email,
          role: user.identity,
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

  // 刷新Token
  refreshToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(1, "请提供当前Token"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // 1. 验证当前Token(允许过期的Token,但不允许无效签名)
        const decoded = jwt.verify(input.token, JWT_SECRET, {
          ignoreExpiration: true, // 允许过期的Token刷新
        }) as any;

        const drizzle = await getDb();
        if (!drizzle) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "数据库连接失败",
          });
        }

        // 2. 检查用户是否仍然存在且激活
        const userList = await drizzle
          .select()
          .from(users)
          .where(eq(users.id, decoded.id))
          .limit(1);

        if (userList.length === 0) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "用户不存在",
          });
        }

        const user = userList[0];

        if (!user.isActive) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "账号已被禁用",
          });
        }

        // 3. 检查Token是否在允许刷新的时间范围内(过期后7天内可刷新)
        const tokenExp = decoded.exp * 1000; // 转换为毫秒
        const now = Date.now();
        const maxRefreshWindow = 7 * 24 * 60 * 60 * 1000; // 7天

        if (now - tokenExp > maxRefreshWindow) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Token已过期太久,请重新登录",
          });
        }

        // 4. 生成新Token
        const newToken = jwt.sign(
          {
            id: user.id,
            openId: user.openId,
            name: user.name,
            role: user.role,
          },
          JWT_SECRET,
          { expiresIn: TOKEN_EXPIRY }
        );

        // 5. 更新session cookie
        ctx.res?.cookie("session", newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
        });

        return {
          success: true,
          token: newToken,
          expiresIn: 24 * 60 * 60, // 24小时(秒)
          user: {
            id: user.id,
            openId: user.openId || "",
            name: user.name || "",
            role: user.role,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Token无效,请重新登录",
        });
      }
    }),

  // 用户账号登录(支u6301用户名/手u673au53f7/邮u7bb1登u5f55)
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

      // 6. 更新最后登录时间
      await drizzle
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      // 7. 登录时自动检查并补充业务客户记录(对于普通用户)
      if (user.role === 'user' && user.phone) {
        try {
          await getOrCreateCustomerForUser({
            id: user.id,
            name: user.name,
            nickname: user.nickname,
            phone: user.phone,
          });
        } catch (err) {
          console.error('[Login] 检查/创建业务客户失败:', err);
        }
      }

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

  // 新用户注册(手机号+密码)
  register: publicProcedure
    .input(
      z.object({
        phone: z.string()
          .min(11, "手机号格式错误")
          .max(11, "手机号格式错误")
          .regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
        password: z.string()
          .min(6, "密码至少6位")
          .max(20, "密码最多20位"),
        name: z.string().optional(),
        nickname: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      // 1. 检查手机号是否已注册
      const existingUser = await drizzle
        .select()
        .from(users)
        .where(eq(users.phone, input.phone))
        .limit(1);

      if (existingUser.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "该手机号已被注册",
        });
      }

      // 2. 加密密码
      const hashedPassword = await hashPassword(input.password);

      // 3. 生成唯一标识
      const openId = `user_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

      // 4. 创建用户
      const result = await drizzle.insert(users).values({
        openId,
        phone: input.phone,
        password: hashedPassword,
        name: input.name || input.phone,
        nickname: input.nickname,
        role: "user",
        isActive: true,
        loginMethod: "phone",
      });

      // 获取插入的用户ID
      const userId = (result[0] as any).insertId;

      // 5. 注册成功后立即创建业务客户记录
      try {
        await getOrCreateCustomerForUser({
          id: userId,
          name: input.name || input.phone,
          nickname: input.nickname || null,
          phone: input.phone,
        });
      } catch (err) {
        // 业务客户创建失败不影响注册流程，记录日志
        console.error('[Register] 创建业务客户失败:', err);
      }

      // 7. 生成JWT Token(注册后自动登录)
      const token = jwt.sign(
        {
          id: userId,
          openId,
          name: input.name || input.phone,
          role: "user",
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );

      // 8. 设置session cookie(Web端使用)
      ctx.res?.cookie("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      });

      return {
        success: true,
        message: "注册成功",
        token,
        user: {
          id: userId,
          openId,
          phone: input.phone,
          name: input.name || input.phone,
          role: "user",
        },
      };
    }),
});
