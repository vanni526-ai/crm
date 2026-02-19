import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { users, orders, membershipConfig } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { generateOrderNo } from "./orderNoGenerator";

/**
 * 会员系统路由
 * 实现会员状态查询、会员订单创建、会员激活等功能
 */
export const membershipRouter = router({
  /**
   * 查询会员状态
   * 接口路径: users.getMembershipStatus
   * 请求方法: query (GET)
   */
  getMembershipStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      // 查询当前用户的会员状态
      const [user] = await db
        .select({
          membershipStatus: users.membershipStatus,
          isMember: users.isMember,
          membershipOrderId: users.membershipOrderId,
          membershipActivatedAt: users.membershipActivatedAt,
          membershipExpiresAt: users.membershipExpiresAt,
        })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      // 检查会员是否过期
      let currentStatus = user.membershipStatus;
      if (currentStatus === "active" && user.membershipExpiresAt) {
        const now = new Date();
        if (now > user.membershipExpiresAt) {
          // 会员已过期，更新状态
          currentStatus = "expired";
          await db
            .update(users)
            .set({ membershipStatus: "expired", isMember: false })
            .where(eq(users.id, ctx.user.id));
        }
      }

      return {
        membershipStatus: currentStatus,
        isMember: currentStatus === "active",
        membershipActivatedAt: user.membershipActivatedAt?.toISOString(),
        membershipExpiresAt: user.membershipExpiresAt?.toISOString(),
        membershipOrderId: user.membershipOrderId || undefined,
      };
    } catch (error) {
      console.error("[getMembershipStatus] 错误:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "查询会员状态失败",
      });
    }
  }),

  /**
   * 创建会员订单
   * 接口路径: orders.createMembership
   * 请求方法: mutation (POST)
   */
  createMembership: protectedProcedure
    .input(
      z.object({
        customerName: z.string(), // 学员姓名
        paymentChannel: z.string().optional().default("微信"), // 支付渠道
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "数据库连接失败",
          });
        }

        // 检查用户是否已是会员
        const [existingUser] = await db
          .select({ 
            membershipStatus: users.membershipStatus,
            membershipExpiresAt: users.membershipExpiresAt 
          })
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);

        if (existingUser?.membershipStatus === "active") {
          // 检查是否真的过期
          const now = new Date();
          if (!existingUser.membershipExpiresAt || now <= existingUser.membershipExpiresAt) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "您已经是会员，无需重复购买",
            });
          }
        }

        // 生成订单号
        const orderNo = await generateOrderNo();

        // 创建会员订单
        const [result] = await db.insert(orders).values({
          orderNo,
          customerName: input.customerName,
          salesId: ctx.user.id,
          salesPerson: ctx.user.name || ctx.user.nickname || "未知",
          paymentAmount: "39",
          courseAmount: "39",
          deliveryCourse: "会员费",
          paymentChannel: input.paymentChannel,
          orderType: "membership", // 标记为会员订单
          status: "pending",
          deliveryStatus: "pending",
          notes: "学员会员开通",
        });

        console.log("[createMembership] 会员订单创建成功:", {
          orderId: result.insertId,
          orderNo,
          userId: ctx.user.id,
        });

        return {
          id: result.insertId,
          orderNo,
          success: true,
        };
      } catch (error) {
        console.error("[createMembership] 错误:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "创建会员订单失败",
        });
      }
    }),

  /**
   * 激活会员
   * 接口路径: users.activateMembership
   * 请求方法: mutation (POST)
   */
  activateMembership: protectedProcedure
    .input(
      z.object({
        orderNo: z.string(), // 会员订单号
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "数据库连接失败",
          });
        }

        // 检查用户是否已是会员
        const [existingUser] = await db
          .select({ 
            membershipStatus: users.membershipStatus,
            membershipExpiresAt: users.membershipExpiresAt 
          })
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);

        if (existingUser?.membershipStatus === "active") {
          // 检查是否真的过期
          const now = new Date();
          if (!existingUser.membershipExpiresAt || now <= existingUser.membershipExpiresAt) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "您已经是会员",
            });
          }
        }

        // 根据订单号查询订单
        const [order] = await db
          .select()
          .from(orders)
          .where(eq(orders.orderNo, input.orderNo))
          .limit(1);

        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "订单不存在",
          });
        }

        // 验证订单类型
        if (order.orderType !== "membership" && order.deliveryCourse !== "会员费") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "订单类型错误",
          });
        }

        // 验证订单金额
        if (order.paymentAmount !== "39.00" && order.paymentAmount !== "39") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "订单金额错误",
          });
        }

        // 验证订单是否已支付
        if (order.status !== "paid") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "订单未支付，无法激活会员",
          });
        }

        // 获取会员有效期配置
        const [config] = await db
          .select({ configValue: membershipConfig.configValue })
          .from(membershipConfig)
          .where(and(
            eq(membershipConfig.configKey, "validity_days"),
            eq(membershipConfig.isActive, true)
          ))
          .limit(1);

        const validityDays = config ? parseInt(config.configValue) : 365; // 默认365天
        const activatedAt = new Date();
        const expiresAt = new Date(activatedAt);
        expiresAt.setDate(expiresAt.getDate() + validityDays);

        // 更新用户会员状态
        await db
          .update(users)
          .set({
            membershipStatus: "active",
            isMember: true,
            membershipOrderId: order.id,
            membershipActivatedAt: activatedAt,
            membershipExpiresAt: expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(users.id, ctx.user.id));

        console.log("[activateMembership] 会员激活成功:", {
          userId: ctx.user.id,
          orderNo: input.orderNo,
          orderId: order.id,
        });

        return {
          success: true,
          message: "会员激活成功",
        };
      } catch (error) {
        console.error("[activateMembership] 错误:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "激活会员失败",
        });
      }
    }),
});
