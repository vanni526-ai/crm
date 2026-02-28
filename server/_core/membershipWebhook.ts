import { Request, Response } from "express";
import { getDb } from "../db";
import { membershipOrders, membershipPlans, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * 会员支付回调Webhook处理器
 * 接收微信支付和支付宝的会员订单异步回调通知
 */

/**
 * 微信支付会员回调处理
 * POST /api/webhook/membership-wechat-notify
 */
export async function handleMembershipWechatNotify(req: Request, res: Response) {
  try {
    // 1. 验签
    const isValid = await verifyWechatSignature(req);
    if (!isValid) {
      console.error("[Membership Wechat Webhook] 签名验证失败");
      return res.status(400).send("FAIL");
    }

    // 2. 解析回调数据
    const { out_trade_no, transaction_id, trade_state } = req.body;

    if (trade_state !== "SUCCESS") {
      console.log(`[Membership Wechat Webhook] 支付未成功，状态: ${trade_state}`);
      return res.send("SUCCESS");
    }

    // 3. 更新会员订单状态并激活会员
    await activateMembership(out_trade_no, {
      paymentChannel: "wechat",
      channelOrderNo: transaction_id,
    });

    res.send("SUCCESS");
  } catch (error) {
    console.error("[Membership Wechat Webhook] 处理失败:", error);
    res.status(500).send("FAIL");
  }
}

/**
 * 支付宝会员回调处理
 * POST /api/webhook/membership-alipay-notify
 */
export async function handleMembershipAlipayNotify(req: Request, res: Response) {
  try {
    // 1. 验签
    const isValid = await verifyAlipaySignature(req);
    if (!isValid) {
      console.error("[Membership Alipay Webhook] 签名验证失败");
      return res.send("failure");
    }

    // 2. 解析回调数据
    const { out_trade_no, trade_no, trade_status } = req.body;

    if (trade_status !== "TRADE_SUCCESS" && trade_status !== "TRADE_FINISHED") {
      console.log(`[Membership Alipay Webhook] 支付未成功，状态: ${trade_status}`);
      return res.send("success");
    }

    // 3. 更新会员订单状态并激活会员
    await activateMembership(out_trade_no, {
      paymentChannel: "alipay",
      channelOrderNo: trade_no,
    });

    res.send("success");
  } catch (error) {
    console.error("[Membership Alipay Webhook] 处理失败:", error);
    res.send("failure");
  }
}

/**
 * 激活会员（幂等性处理）
 */
async function activateMembership(
  orderNo: string,
  data: {
    paymentChannel: string;
    channelOrderNo: string;
  }
) {
  const db = await getDb();
  if (!db) {
    throw new Error("数据库连接失败");
  }

  // 查询会员订单
  const [memberOrder] = await db
    .select()
    .from(membershipOrders)
    .where(eq(membershipOrders.orderNo, orderNo))
    .limit(1);

  if (!memberOrder) {
    console.error(`[Membership Webhook] 会员订单不存在: ${orderNo}`);
    throw new Error("会员订单不存在");
  }

  // 幂等性检查：如果订单已经是paid状态，直接返回
  if (memberOrder.status === "paid") {
    console.log(`[Membership Webhook] 会员订单已支付，幂等性处理: ${orderNo}`);
    return;
  }

  const now = new Date();
  const paidAt = now.toISOString();

  // 更新会员订单状态
  await db
    .update(membershipOrders)
    .set({
      status: "paid",
      paymentChannel: data.paymentChannel as "wechat" | "alipay" | "balance",
      channelOrderNo: data.channelOrderNo,
      paymentDate: now,
      updatedAt: now,
    })
    .where(eq(membershipOrders.orderNo, orderNo));

  // 查询用户当前会员状态，计算新的到期时间
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, memberOrder.userId))
    .limit(1);

  if (!currentUser) {
    throw new Error("用户不存在");
  }

  // 计算会员到期时间（从套餐表获取，或根据planName推算）
  // membershipOrders表没有durationDays字段，需要从membershipPlans表查询
  const [plan] = await db
    .select()
    .from(membershipPlans)
    .where(eq(membershipPlans.id, memberOrder.planId))
    .limit(1);
  const durationDays = plan?.duration ?? 30; // 默认30天
  let expiresAt: Date;

  if (currentUser.isMember && currentUser.membershipExpiresAt && currentUser.membershipExpiresAt > now) {
    // 续费：在当前到期时间基础上延长
    expiresAt = new Date(currentUser.membershipExpiresAt);
    expiresAt.setDate(expiresAt.getDate() + durationDays);
  } else {
    // 首次购买或已过期：从现在开始计算
    expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + durationDays);
  }

  // 更新用户会员状态
  await db
    .update(users)
    .set({
      isMember: true,
      membershipStatus: "active",
      membershipOrderId: memberOrder.id,
      membershipActivatedAt: now,
      membershipExpiresAt: expiresAt,
      updatedAt: now,
    })
    .where(eq(users.id, memberOrder.userId));

  console.log(`[Membership Webhook] 会员激活成功: userId=${memberOrder.userId}, expiresAt=${expiresAt.toISOString()}`);
}

/**
 * 验证微信支付签名
 */
async function verifyWechatSignature(req: Request): Promise<boolean> {
  if (process.env.NODE_ENV === "development") {
    console.warn("[Membership Wechat Webhook] 开发环境跳过签名验证");
    return true;
  }

  const { signature } = req.body;
  const apiKey = process.env.WECHAT_API_KEY;

  if (!apiKey) {
    console.error("[Membership Wechat Webhook] 缺少WECHAT_API_KEY环境变量");
    return false;
  }

  const params = { ...req.body };
  delete params.signature;

  const sortedKeys = Object.keys(params).sort();
  const signString =
    sortedKeys.map((key) => `${key}=${params[key]}`).join("&") +
    `&key=${apiKey}`;

  const calculatedSign = crypto
    .createHash("md5")
    .update(signString)
    .digest("hex")
    .toUpperCase();

  return calculatedSign === signature;
}

/**
 * 验证支付宝签名
 */
async function verifyAlipaySignature(req: Request): Promise<boolean> {
  if (process.env.NODE_ENV === "development") {
    console.warn("[Membership Alipay Webhook] 开发环境跳过签名验证");
    return true;
  }

  const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;

  if (!alipayPublicKey) {
    console.error("[Membership Alipay Webhook] 缺少ALIPAY_PUBLIC_KEY环境变量");
    return false;
  }

  // TODO: 使用RSA公钥验证签名（生产环境需要完整实现）
  return true;
}
