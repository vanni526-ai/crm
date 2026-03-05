import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getOrCreateCustomerForUser } from "./db";
import { systemAccounts, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { hashPassword, verifyPassword } from "./passwordUtils";
import { sendSmsVerificationCode, verifySmsCode } from "./smsService";
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
  logout: publicProcedure.mutation(async ({ ctx }) => {
    // 清除 session cookie
    ctx.res?.clearCookie("session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    // 兼容旧的 Manus OAuth cookie
    ctx.res?.clearCookie("manus-session", {
      httpOnly: true,
      sameSite: "lax",
    });
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
            roles: user.roles || user.role,
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
            roles: (user.roles || user.role).split(","),
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

  // 用户账号登录（仅支持手机号+密码）
  loginWithUserAccount: publicProcedure
    .input(
      z.object({
        phone: z.string().min(1, "请输入手机号"),
        password: z.string().min(1, "请输入密码"),
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

      // 1. 通过手机号查找用户
      const userList = await drizzle
        .select()
        .from(users)
        .where(
          eq(users.phone, input.phone)
        )
        .limit(1);

      if (userList.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "手机号不存在，请确认后重试",
        });
      }

      const user = userList[0];

      // 2. 验证密码
      if (!user.password) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "该账号未设置密码，请联系管理员",
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

      // 4. 生成token
      const token = jwt.sign(
        {
          id: user.id,
          openId: user.openId,
          name: user.name,
          role: user.role,
          roles: user.roles || user.role,
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

      // 7. 登录时自动检查并补充业务客户记录(对于含有普通用户角色的用户)
      const userRoles = (user.roles || user.role || '').split(',');
      if (userRoles.includes('user') && user.phone) {
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
          roles: (user.roles || user.role).split(","),
          isActive: user.isActive,
        },
      };
    }),

  // 修改密码(需要登录状态，通过Token获取用户)
  changePassword: protectedProcedure
    .input(
      z.object({
        oldPassword: z.string().min(1, "请输入旧密码"),
        newPassword: z.string()
          .min(6, "密码长度至少6位")
          .max(20, "密码最多20位"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        return {
          success: false,
          error: "数据库连接失败",
        };
      }

      const userId = ctx.user.id;

      // 1. 查找用户
      const userList = await drizzle
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userList.length === 0) {
        return {
          success: false,
          error: "用户不存在",
        };
      }

      const user = userList[0];

      // 2. 检查账号状态
      if (!user.isActive) {
        return {
          success: false,
          error: "账号已被禁用",
        };
      }

      // 3. 验证旧密码
      if (!user.password) {
        return {
          success: false,
          error: "该账号未设置密码，无法修改",
        };
      }

      const isOldPasswordValid = await verifyPassword(input.oldPassword, user.password);
      if (!isOldPasswordValid) {
        return {
          success: false,
          error: "旧密码错误",
        };
      }

      // 4. 检查新旧密码不能相同
      const isSamePassword = await verifyPassword(input.newPassword, user.password);
      if (isSamePassword) {
        return {
          success: false,
          error: "新密码不能与旧密码相同",
        };
      }

      // 5. 加密新密码并更新
      const hashedNewPassword = await hashPassword(input.newPassword);
      await drizzle
        .update(users)
        .set({ password: hashedNewPassword })
        .where(eq(users.id, userId));

      return {
        success: true,
      };
    }),

  // 发送短信验证码（用于重置密码）
  sendSmsCode: publicProcedure
    .input(
      z.object({
        phone: z.string()
          .min(11, "手机号格式错误")
          .max(11, "手机号格式错误")
          .regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
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
      // 验证手机号是否已注册
      const userList = await drizzle
        .select()
        .from(users)
        .where(eq(users.phone, input.phone))
        .limit(1);
      if (userList.length === 0) {
        return { success: false, error: "该手机号未注册" };
      }
      if (!userList[0].isActive) {
        return { success: false, error: "账号已被禁用，请联系管理员" };
      }
      // 发送短信验证码
      const result = await sendSmsVerificationCode(input.phone);
      if (!result.success) {
        return { success: false, error: result.message };
      }
      return { success: true };
    }),

  // 忘记密码 - 通过手机号+验证码重置密码
  resetPassword: publicProcedure
    .input(
      z.object({
        phone: z.string()
          .min(11, "手机号格式错误")
          .max(11, "手机号格式错误")
          .regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
        code: z.string().min(1, "请输入验证码"),
        newPassword: z.string()
          .min(6, "密码长度至少6位")
          .max(20, "密码最多20位"),
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

      // 1. 验证手机号是否已注册
      const userList = await drizzle
        .select()
        .from(users)
        .where(eq(users.phone, input.phone))
        .limit(1);

      if (userList.length === 0) {
        return {
          success: false,
          error: "手机号未注册",
        };
      }

      const user = userList[0];

      // 2. 检查账号状态
      if (!user.isActive) {
        return {
          success: false,
          error: "账号已被禁用，请联系管理员",
        };
      }

      // 3. 验证内部令牌（方案B）
      // 验证码已由 API 代理层校验，此处只校验代理层注入的内部令牌
      // ⚠️ 【架构约定——请勿修改此处逻辑】
      // 此处必须校验 INTERNAL_RESET_TOKEN，不得改回 verifySmsCode 或其他校验
      if (input.code !== process.env.INTERNAL_RESET_TOKEN) {
        console.warn(`[AUTH] resetPassword: 无效的内部令牌，疑似绕过代理层调用, phone=${input.phone}`);
        return {
          success: false,
          error: "无效的请求，请通过官方 App 操作",
        };
      }

      // 4. 加密新密码并更新
      const hashedNewPassword = await hashPassword(input.newPassword);
      await drizzle
        .update(users)
        .set({ password: hashedNewPassword })
        .where(eq(users.id, user.id));

      return {
        success: true,
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
        roles: "user",
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
          roles: "user",
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
          roles: ["user"],
        },
      };
    }),

  // 账号恢复接口
  restoreAccount: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        phone: z.string(),
        verificationCode: z.string(),
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

      // 1. 查找用户
      const userList = await drizzle
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (userList.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      const user = userList[0];

      // 2. 验证手机号
      if (user.phone !== input.phone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "手机号不匹配",
        });
      }

      // 3. 验证账号状态
      if (user.isDeleted !== 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "账号未处于注销状态",
        });
      }

      // 4. 检查是否在30天缓冲期内
      const deletedAt = user.deletedAt ? new Date(user.deletedAt) : new Date();
      const recoveryDeadline = new Date(deletedAt);
      recoveryDeadline.setDate(recoveryDeadline.getDate() + 30);
      const now = new Date();

      if (now > recoveryDeadline) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "恢复期限已过，账号已永久删除",
        });
      }

      // 5. TODO: 验证验证码(这里暂时跳过，实际应该调用短信验证服务)
      // if (input.verificationCode !== "123456") {
      //   throw new TRPCError({
      //     code: "BAD_REQUEST",
      //     message: "验证码错误",
      //   });
      // }

      // 6. 恢复账号
      await drizzle
        .update(users)
        .set({
          isDeleted: 0,
          deletedAt: null,
          deletionReason: null,
        })
        .where(eq(users.id, user.id));

      // 7. TODO: 记录审计日志
      // await logAccountRestoration(user.id);

      return {
        success: true,
        message: "账号已成功恢复",
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          roles: user.roles,
        },
      };
    }),

  // 查询注销状态接口
  getDeletionStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "未登录",
      });
    }

    // 正常状态
    if (user.isDeleted === 0) {
      return {
        isDeleted: 0,
        status: "active",
        message: "账号正常",
      };
    }

    // 注销中(30天缓冲期)
    if (user.isDeleted === 1) {
      const deletedAt = user.deletedAt ? new Date(user.deletedAt) : new Date();
      const recoveryDeadline = new Date(deletedAt);
      recoveryDeadline.setDate(recoveryDeadline.getDate() + 30);
      const now = new Date();
      const daysRemaining = Math.ceil(
        (recoveryDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        isDeleted: 1,
        status: "pending_deletion",
        deletedAt: deletedAt.toISOString(),
        recoveryDeadline: recoveryDeadline.toISOString(),
        daysRemaining,
        message: `账号处于注销缓冲期，还有${daysRemaining}天可恢复`,
      };
    }

    // 已脱敏
    if (user.isDeleted === 2) {
      const anonymizedAt = user.anonymizedAt
        ? new Date(user.anonymizedAt)
        : new Date();
      return {
        isDeleted: 2,
        status: "anonymized",
        anonymizedAt: anonymizedAt.toISOString(),
        message: "账号已永久删除",
      };
    }

    return {
      isDeleted: user.isDeleted,
      status: "unknown",
      message: "未知状态",
    };
  }),

  // App 传 JWT 免登录建立 H5 session
  loginWithToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(1, "token 不能为空"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 1. 验证 JWT
      let decoded: any;
      try {
        decoded = jwt.verify(input.token, JWT_SECRET) as any;
      } catch (err) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "token 无效或已过期",
        });
      }
      // 2. 查询用户
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
          message: "账号已被禁用，请联系管理员",
        });
      }
      // 3. 生成新的 session token 并设置 cookie
      const sessionToken = jwt.sign(
        {
          id: user.id,
          openId: user.openId,
          name: user.name,
          role: user.role,
          roles: user.roles || user.role,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      ctx.res?.cookie("session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      // 4. 查询会员状态
      const now = new Date();
      const isMember =
        user.membershipStatus === "active" &&
        user.membershipExpiresAt !== null &&
        new Date(user.membershipExpiresAt as any) > now;
      return {
        success: true,
        message: "登录成功",
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          isMember,
          membershipStatus: user.membershipStatus || "none",
          membershipExpiresAt: user.membershipExpiresAt
            ? new Date(user.membershipExpiresAt as any).toISOString()
            : null,
        },
      };
    }),
});
