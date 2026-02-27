import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { orders } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * 支付路由
 * 实现微信支付、支付宝和账户余额支付功能
 */

// 支付渠道枚举
const PaymentChannelEnum = z.enum(["wechat", "alipay", "balance"]);

// 订单状态枚举
const OrderStatusEnum = z.enum(["pending", "paid", "has_balance", "completed", "cancelled", "refunded"]);

export const paymentRouter = router({
  /**
   * 预下单接口
   * 向支付服务商进行预下单，获取前端拉起原生支付所需的参数
   */
  prepay: protectedProcedure
    .input(
      z.object({
        orderId: z.number().int().positive(),
        paymentChannel: PaymentChannelEnum,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { orderId, paymentChannel } = input;

      // 1. 查询订单信息
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "订单不存在",
        });
      }

      // 2. 检查订单状态
      if (order.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `订单状态不正确，当前状态: ${order.status}`,
        });
      }

      // 3. 根据支付渠道返回不同的预下单参数
      switch (paymentChannel) {
        case "balance":
          // 账户余额支付：内部扣款
          return await handleBalancePayment(orderId, ctx.user.id);

        case "wechat":
          // 微信支付：调用微信预下单API
          return await handleWechatPrepay(order);

        case "alipay":
          // 支付宝：调用支付宝预下单API
          return await handleAlipayPrepay(order);

        default:
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "不支持的支付渠道",
          });
      }
    }),

  /**
   * 查询订单支付状态
   * 供前端轮询使用
   */
  getStatus: publicProcedure
    .input(
      z.object({
        orderId: z.number().int().positive(),
      })
    )
    .query(async ({ input }) => {
      const { orderId } = input;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      const [order] = await db.select({
        status: orders.status,
        paymentDate: orders.paymentDate,
        paymentChannel: orders.paymentChannel,
      }).from(orders).where(eq(orders.id, orderId)).limit(1);

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "订单不存在",
        });
      }

      return {
        status: order.status,
        paymentDate: order.paymentDate,
        paymentChannel: order.paymentChannel,
      };
    }),

  /**
   * 更新订单支付状态（内部接口）
   * 由支付回调Webhook调用
   */
  updateStatus: publicProcedure
    .input(
      z.object({
        orderId: z.number().int().positive(),
        status: OrderStatusEnum,
        paymentDate: z.string().optional(),
        paymentChannel: z.string().optional(),
        channelOrderNo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { orderId, status, paymentDate, paymentChannel, channelOrderNo } = input;

      // 查询订单当前状态
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "订单不存在",
        });
      }

      // 幂等性检查：如果订单已经是paid状态，直接返回成功
      if (order.status === "paid" && status === "paid") {
        return {
          success: true,
          message: "订单已支付，幂等性处理",
        };
      }

      // 更新订单状态
      await db
        .update(orders)
        .set({
          status,
          paymentDate: paymentDate ? new Date(paymentDate) : undefined,
          paymentChannel,
          channelOrderNo,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      return {
        success: true,
        message: "订单状态更新成功",
      };
    }),
});

/**
 * 处理账户余额支付
 */
async function handleBalancePayment(orderId: number, userId: number) {
  // TODO: 实现账户余额扣款逻辑
  // 1. 查询用户余额
  // 2. 检查余额是否足够
  // 3. 扣款
  // 4. 更新订单状态为paid

  // 临时实现：直接返回成功
  // 实际应该调用 updateStatus 更新订单状态
  const db = await getDb();
  if (!db) {
    throw new Error("数据库连接失败");
  }

  await db
    .update(orders)
    .set({
      status: "paid",
      paymentDate: new Date(),
      paymentChannel: "balance",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  return {
    success: true,
    message: "余额支付成功",
  };
}

/**
 * 处理微信支付预下单
 */
async function handleWechatPrepay(order: any) {
  // TODO: 调用微信支付API进行预下单
  // 需要配置：
  // - WECHAT_APP_ID: 微信开放平台AppID
  // - WECHAT_MCH_ID: 微信商户号
  // - WECHAT_API_KEY: 微信API密钥
  // - WECHAT_NOTIFY_URL: 支付回调URL

  // 临时返回模拟数据
  return {
    partnerId: "mock_partner_id",
    prepayId: "mock_prepay_id",
    nonceStr: "mock_nonce_str",
    timestamp: Date.now().toString(),
    sign: "mock_sign",
    package: "Sign=WXPay",
  };
}

/**
 * 处理支付宝预下单
 */
async function handleAlipayPrepay(order: any) {
  // TODO: 调用支付宝API进行预下单
  // 需要配置：
  // - ALIPAY_APP_ID: 支付宝AppID
  // - ALIPAY_PRIVATE_KEY: 应用私钥
  // - ALIPAY_PUBLIC_KEY: 支付宝公钥
  // - ALIPAY_NOTIFY_URL: 支付回调URL

  // 临时返回模拟数据
  return {
    orderString: "mock_order_string",
  };
}
