import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
// membershipRouter: listPlans, getStatus, createOrder, prepay, getOrderStatus, cancelOrder, listOrders, adminListOrders, adminActivate, createRechargeOrder, getRechargeOrderStatus, confirmRecharge, adminUpsertPlan
import { getDb } from "./db";
import { membershipPlans, membershipOrders, users, customers } from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// 生成会员订单号
function generateMembershipOrderNo(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `MEM${timestamp}${random}`;
}

// 激活会员逻辑（支付成功后调用，幂等）
export async function activateMembership(
  orderId: number,
  channelOrderNo?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [order] = await db
    .select()
    .from(membershipOrders)
    .where(eq(membershipOrders.id, orderId))
    .limit(1);

  if (!order) throw new Error("Order not found");
  if (order.status === "paid") return; // 幂等：已激活则直接返回

  const now = new Date();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, order.userId))
    .limit(1);

  if (!user) throw new Error("User not found");

  const [plan] = await db
    .select()
    .from(membershipPlans)
    .where(eq(membershipPlans.id, order.planId))
    .limit(1);

  if (!plan) throw new Error("Plan not found");

  // 续费时从当前到期时间延续，否则从现在开始
  let activatedAt = now;
  let expiresAt: Date;

  if (
    user.membershipStatus === "active" &&
    user.membershipExpiresAt &&
    user.membershipExpiresAt > now
  ) {
    expiresAt = new Date(
      user.membershipExpiresAt.getTime() + plan.duration * 24 * 60 * 60 * 1000
    );
    activatedAt = user.membershipActivatedAt || now;
  } else {
    expiresAt = new Date(now.getTime() + plan.duration * 24 * 60 * 60 * 1000);
  }

  await db
    .update(membershipOrders)
    .set({
      status: "paid",
      paymentDate: now,
      channelOrderNo: channelOrderNo || null,
      activatedAt,
      expiresAt,
      updatedAt: now,
    })
    .where(eq(membershipOrders.id, orderId));

  // 方案A：会员状态统一存在users表
  await db
    .update(users)
    .set({
      membershipStatus: "active",
      isMember: true,
      membershipOrderId: orderId,
      membershipActivatedAt: activatedAt,
      membershipExpiresAt: expiresAt,
      updatedAt: now,
    })
    .where(eq(users.id, order.userId));
}

export const membershipRouter = router({
  // ========== 查询会员套餐列表（公开）==========
  listPlans: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { plans: [] };

    const plans = await db
      .select()
      .from(membershipPlans)
      .where(eq(membershipPlans.isActive, true))
      .orderBy(membershipPlans.sortOrder);

    return {
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        duration: p.duration,
        price: Number(p.price),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
        benefits: (p.benefits as string[]) || [],
        sortOrder: p.sortOrder,
      })),
    };
  }),

  // ========== 查询当前用户会员状态 ==========
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!user) throw new TRPCError({ code: "NOT_FOUND" });

    const now = new Date();
    let membershipStatus = user.membershipStatus;

    // 自动检查过期
    if (
      membershipStatus === "active" &&
      user.membershipExpiresAt &&
      user.membershipExpiresAt < now
    ) {
      membershipStatus = "expired";
      await db
        .update(users)
        .set({ membershipStatus: "expired", isMember: false, updatedAt: now })
        .where(eq(users.id, user.id));
    }

    const daysRemaining =
      membershipStatus === "active" && user.membershipExpiresAt
        ? Math.max(
            0,
            Math.ceil(
              (user.membershipExpiresAt.getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        : null;

    // 查询当前套餐信息
    let currentPlan = null;
    if (user.membershipOrderId) {
      const [order] = await db
        .select({ planId: membershipOrders.planId })
        .from(membershipOrders)
        .where(eq(membershipOrders.id, user.membershipOrderId))
        .limit(1);

      if (order) {
        const [plan] = await db
          .select()
          .from(membershipPlans)
          .where(eq(membershipPlans.id, order.planId))
          .limit(1);

        if (plan) {
          currentPlan = {
            id: plan.id,
            name: plan.name,
            benefits: (plan.benefits as string[]) || [],
          };
        }
      }
    }

    // 查询关联客户的账户余额
    let accountBalance = 0;
    const [customer] = await db
      .select({ accountBalance: customers.accountBalance })
      .from(customers)
      .where(eq(customers.userId, user.id))
      .limit(1);
    if (customer?.accountBalance) {
      accountBalance = parseFloat(String(customer.accountBalance));
    }

    return {
      isMember: membershipStatus === "active",
      membershipStatus,
      activatedAt: user.membershipActivatedAt?.toISOString() || null,
      expiresAt: user.membershipExpiresAt?.toISOString() || null,
      daysRemaining,
      currentPlan,
      accountBalance,
    };
  }),

  // ========== 创建会员订单 ==========
  createOrder: protectedProcedure
    .input(z.object({ planId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [plan] = await db
        .select()
        .from(membershipPlans)
        .where(
          and(
            eq(membershipPlans.id, input.planId),
            eq(membershipPlans.isActive, true)
          )
        )
        .limit(1);

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "套餐不存在或已下架" });
      }

      const orderNo = generateMembershipOrderNo();
      const now = new Date();

      const [result] = await db.insert(membershipOrders).values({
        orderNo,
        userId: ctx.user.id,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });

      return {
        orderId: (result as any).insertId,
        orderNo,
        amount: Number(plan.price),
        planName: plan.name,
        planId: plan.id,
        duration: plan.duration,
      };
    }),

  // ========== 预下单（获取支付参数）==========
  prepay: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        paymentChannel: z.enum(["wechat", "alipay", "balance"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [order] = await db
        .select()
        .from(membershipOrders)
        .where(
          and(
            eq(membershipOrders.id, input.orderId),
            eq(membershipOrders.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
      }
      if (order.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `订单状态异常：${order.status}`,
        });
      }

      await db
        .update(membershipOrders)
        .set({ paymentChannel: input.paymentChannel, updatedAt: new Date() })
        .where(eq(membershipOrders.id, input.orderId));

      // 账户余额支付：直接激活
      if (input.paymentChannel === "balance") {
        await activateMembership(input.orderId, `BALANCE_${Date.now()}`);
        return {
          channel: "balance" as const,
          success: true,
          message: "支付成功，会员已激活",
        };
      }

      // 微信支付H5（MWEB模式）
      if (input.paymentChannel === "wechat") {
        // TODO: 接入真实微信支付H5 API
        return {
          channel: "wechat" as const,
          mwebUrl: `https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb?prepay_id=mock_${order.orderNo}&package=1234567890`,
          orderNo: order.orderNo,
        };
      }

      // 支付宝H5（手机网站支付）
      if (input.paymentChannel === "alipay") {
        // TODO: 接入真实支付宝H5 API
        return {
          channel: "alipay" as const,
          formHtml: `<form id="alipayForm" action="https://openapi.alipay.com/gateway.do" method="post"><input type="hidden" name="biz_content" value='{"out_trade_no":"${order.orderNo}"}'></form><script>document.getElementById('alipayForm').submit();</script>`,
          orderNo: order.orderNo,
        };
      }

      throw new TRPCError({ code: "BAD_REQUEST", message: "不支持的支付渠道" });
    }),

  // ========== 查询订单状态（前端轮询用）==========
  getOrderStatus: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [order] = await db
        .select()
        .from(membershipOrders)
        .where(
          and(
            eq(membershipOrders.id, input.orderId),
            eq(membershipOrders.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
      }

      return {
        status: order.status,
        paymentDate: order.paymentDate?.toISOString() || null,
        activatedAt: order.activatedAt?.toISOString() || null,
        expiresAt: order.expiresAt?.toISOString() || null,
      };
    }),

  // ========== 取消订单 ==========
  cancelOrder: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [order] = await db
        .select()
        .from(membershipOrders)
        .where(
          and(
            eq(membershipOrders.id, input.orderId),
            eq(membershipOrders.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
      }
      if (order.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "只能取消待支付的订单",
        });
      }

      await db
        .update(membershipOrders)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(membershipOrders.id, input.orderId));

      return { success: true };
    }),

  // ========== 查询用户自己的订单列表 ==========
  listOrders: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(10),
        status: z
          .enum(["pending", "paid", "cancelled", "refunded"])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { orders: [], total: 0, page: 1, pageSize: 10 };

      const conditions: ReturnType<typeof eq>[] = [
        eq(membershipOrders.userId, ctx.user.id),
      ];
      if (input.status) {
        conditions.push(eq(membershipOrders.status, input.status));
      }

      const allOrders = await db
        .select()
        .from(membershipOrders)
        .where(and(...conditions))
        .orderBy(desc(membershipOrders.createdAt));

      const total = allOrders.length;
      const offset = (input.page - 1) * input.pageSize;
      const paged = allOrders.slice(offset, offset + input.pageSize);

      return {
        orders: paged.map((o) => ({
          id: o.id,
          orderNo: o.orderNo,
          planName: o.planName,
          amount: Number(o.amount),
          status: o.status,
          paymentChannel: o.paymentChannel,
          paymentDate: o.paymentDate?.toISOString() || null,
          activatedAt: o.activatedAt?.toISOString() || null,
          expiresAt: o.expiresAt?.toISOString() || null,
          createdAt: o.createdAt.toISOString(),
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // ========== 管理员：查询所有会员订单 ==========
  adminListOrders: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        status: z
          .enum(["pending", "paid", "cancelled", "refunded"])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) return { orders: [], total: 0, page: 1, pageSize: 20 };

      const conditions = [];
      if (input.status) {
        conditions.push(eq(membershipOrders.status, input.status));
      }

      const allOrders = await db
        .select({
          id: membershipOrders.id,
          orderNo: membershipOrders.orderNo,
          userId: membershipOrders.userId,
          planName: membershipOrders.planName,
          amount: membershipOrders.amount,
          status: membershipOrders.status,
          paymentChannel: membershipOrders.paymentChannel,
          paymentDate: membershipOrders.paymentDate,
          activatedAt: membershipOrders.activatedAt,
          expiresAt: membershipOrders.expiresAt,
          createdAt: membershipOrders.createdAt,
          userName: users.name,
          userPhone: users.phone,
        })
        .from(membershipOrders)
        .leftJoin(users, eq(membershipOrders.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(membershipOrders.createdAt));

      const total = allOrders.length;
      const offset = (input.page - 1) * input.pageSize;
      const paged = allOrders.slice(offset, offset + input.pageSize);

      return {
        orders: paged.map((o) => ({
          id: o.id,
          orderNo: o.orderNo,
          userId: o.userId,
          userName: o.userName || "未知",
          userPhone: o.userPhone || "",
          planName: o.planName,
          amount: Number(o.amount),
          status: o.status,
          paymentChannel: o.paymentChannel,
          paymentDate: o.paymentDate?.toISOString() || null,
          activatedAt: o.activatedAt?.toISOString() || null,
          expiresAt: o.expiresAt?.toISOString() || null,
          createdAt: o.createdAt.toISOString(),
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // ========== 管理员：手动激活会员 ==========
  adminActivate: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await activateMembership(input.orderId);
      return { success: true };
    }),

  // ========== 创建充値订单 ==========
  createRechargeOrder: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(1).max(10000),
        paymentChannel: z.enum(["wechat", "alipay"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const orderNo = `RCH${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
      const now = new Date();

      // 将充値订单存入 membershipOrders 表（复用该表，使用特殊 planName 标识）
      const [result] = await db.insert(membershipOrders).values({
        orderNo,
        userId: ctx.user.id,
        planId: 0, // 0 表示充値订单
        planName: `RECHARGE_${input.amount}`, // 特殊标识
        amount: input.amount.toFixed(2),
        status: "pending",
        paymentChannel: input.paymentChannel,
        createdAt: now,
        updatedAt: now,
      });

      const orderId = (result as any).insertId;

      // 根据支付渠道返回支付参数
      if (input.paymentChannel === "wechat") {
        return {
          channel: "wechat" as const,
          orderId,
          orderNo,
          amount: input.amount,
          // TODO: 接入真实微信支付H5 API
          mwebUrl: `https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb?prepay_id=mock_${orderNo}&package=1234567890`,
        };
      }

      if (input.paymentChannel === "alipay") {
        return {
          channel: "alipay" as const,
          orderId,
          orderNo,
          amount: input.amount,
          // TODO: 接入真实支付宝H5 API
          formHtml: `<form id="alipayForm" action="https://openapi.alipay.com/gateway.do" method="post"><input type="hidden" name="biz_content" value='{"out_trade_no":"${orderNo}","total_amount":"${input.amount}"}'></form><script>document.getElementById('alipayForm').submit();</script>`,
        };
      }

      throw new TRPCError({ code: "BAD_REQUEST", message: "不支持的支付渠道" });
    }),

  // ========== 查询充値订单状态 ==========
  getRechargeOrderStatus: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [order] = await db
        .select()
        .from(membershipOrders)
        .where(
          and(
            eq(membershipOrders.id, input.orderId),
            eq(membershipOrders.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });

      return {
        status: order.status,
        amount: Number(order.amount),
        paymentDate: order.paymentDate?.toISOString() || null,
      };
    }),

  // ========== 模拟充値完成（开发测试用）==========
  // 生产环境应由支付回调触发，这里仅供测试
  confirmRecharge: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [order] = await db
        .select()
        .from(membershipOrders)
        .where(
          and(
            eq(membershipOrders.id, input.orderId),
            eq(membershipOrders.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
      if (order.status === "paid") return { success: true, message: "已充値成功" };
      if (order.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "订单状态异常" });

      // 确认充値金额
      const rechargeAmount = Number(order.amount);
      const now = new Date();

      // 更新订单状态
      await db
        .update(membershipOrders)
        .set({ status: "paid", paymentDate: now, updatedAt: now })
        .where(eq(membershipOrders.id, input.orderId));

      // 查找关联客户记录
      const [customer] = await db
        .select({ id: customers.id, accountBalance: customers.accountBalance })
        .from(customers)
        .where(eq(customers.userId, ctx.user.id))
        .limit(1);

      if (customer) {
        const currentBalance = parseFloat(String(customer.accountBalance || 0));
        const newBalance = currentBalance + rechargeAmount;
        await db
          .update(customers)
          .set({ accountBalance: newBalance.toFixed(2), updatedAt: now })
          .where(eq(customers.id, customer.id));
      } else {
        // 如果没有客户记录，将充値金额存到 users.accountBalance（如果该字段存在）
        // 暂时记录到备注中
        console.log(`[recharge] User ${ctx.user.id} recharged ${rechargeAmount} but no customer record found`);
      }

      return { success: true, message: `充値 ¥${rechargeAmount.toFixed(2)} 成功` };
    }),

  // ========== 管理员：管理套餐 ==========
  adminUpsertPlan: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        duration: z.number().min(1),
        price: z.number().min(0),
        originalPrice: z.number().optional(),
        benefits: z.array(z.string()).optional(),
        isActive: z.boolean().default(true),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const data = {
        name: input.name,
        description: input.description || null,
        duration: input.duration,
        price: input.price.toFixed(2),
        originalPrice: input.originalPrice?.toFixed(2) || null,
        benefits: JSON.stringify(input.benefits || []),
        isActive: input.isActive,
        sortOrder: input.sortOrder,
        updatedAt: new Date(),
      };

      if (input.id) {
        await db
          .update(membershipPlans)
          .set(data)
          .where(eq(membershipPlans.id, input.id));
        return { id: input.id };
      } else {
        const [result] = await db.insert(membershipPlans).values({
          ...data,
          createdAt: new Date(),
        });
        return { id: (result as any).insertId };
      }
    }),
});
