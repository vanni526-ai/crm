import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV } from "./_core/env";

/**
 * 账号密码认证路由
 */
export const passwordAuthRouter = router({
  /**
   * 账号密码登录
   */
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "用户名不能为空"),
        password: z.string().min(1, "密码不能为空"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接失败");
      
      // 查找用户
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      if (!user) {
        throw new Error("用户名或密码错误");
      }

      if (!user.isActive) {
        throw new Error("账号已被禁用");
      }

      if (!user.passwordHash) {
        throw new Error("该账号未设置密码");
      }

      // 验证密码
      const isValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValid) {
        throw new Error("用户名或密码错误");
      }

      // 生成JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role: user.role,
        },
        ENV.cookieSecret,
        { expiresIn: "7d" }
      );

      // 更新最后登录时间
      if (db) await db
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          nickname: user.nickname,
          email: user.email,
          role: user.role,
          salespersonId: user.salespersonId,
        },
      };
    }),

  /**
   * 验证token并获取用户信息
   */
  verifyToken: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const decoded = jwt.verify(input.token, ENV.cookieSecret) as {
          userId: number;
          username: string;
          role: string;
        };

        const db = await getDb();
        if (!db) return null;
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, decoded.userId))
          .limit(1);

        if (!user || !user.isActive) {
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          name: user.name,
          nickname: user.nickname,
          email: user.email,
          role: user.role,
          salespersonId: user.salespersonId,
        };
      } catch (error) {
        return null;
      }
    }),
});
