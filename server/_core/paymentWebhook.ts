import { Request, Response } from "express";
import { getDb } from "../db";
import { orders } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * 支付回调Webhook处理器
 * 接收微信支付和支付宝的异步回调通知
 */

/**
 * 微信支付回调处理
 * POST /api/webhook/wechat-payment-notify
 */
export async function handleWechatPaymentNotify(req: Request, res: Response) {
  try {
    // 1. 验签
    const isValid = await verifyWechatSignature(req);
    if (!isValid) {
      console.error("[Wechat Webhook] 签名验证失败");
      return res.status(400).send("FAIL");
    }

    // 2. 解析回调数据
    const { out_trade_no, transaction_id, trade_state } = req.body;

    if (trade_state !== "SUCCESS") {
      console.log(`[Wechat Webhook] 支付未成功，状态: ${trade_state}`);
      return res.send("SUCCESS"); // 仍然返回SUCCESS，避免重复回调
    }

    // 3. 更新订单状态
    const orderNo = out_trade_no; // 商户订单号
    await updateOrderStatus(orderNo, {
      status: "paid",
      paymentChannel: "wechat",
      channelOrderNo: transaction_id,
      paymentDate: new Date().toISOString(),
    });

    // 4. 返回成功响应（微信要求返回特定格式）
    res.send("SUCCESS");
  } catch (error) {
    console.error("[Wechat Webhook] 处理失败:", error);
    res.status(500).send("FAIL");
  }
}

/**
 * 支付宝回调处理
 * POST /api/webhook/alipay-payment-notify
 */
export async function handleAlipayPaymentNotify(req: Request, res: Response) {
  try {
    // 1. 验签
    const isValid = await verifyAlipaySignature(req);
    if (!isValid) {
      console.error("[Alipay Webhook] 签名验证失败");
      return res.send("failure");
    }

    // 2. 解析回调数据
    const { out_trade_no, trade_no, trade_status } = req.body;

    if (trade_status !== "TRADE_SUCCESS" && trade_status !== "TRADE_FINISHED") {
      console.log(`[Alipay Webhook] 支付未成功，状态: ${trade_status}`);
      return res.send("success"); // 仍然返回success，避免重复回调
    }

    // 3. 更新订单状态
    const orderNo = out_trade_no; // 商户订单号
    await updateOrderStatus(orderNo, {
      status: "paid",
      paymentChannel: "alipay",
      channelOrderNo: trade_no,
      paymentDate: new Date().toISOString(),
    });

    // 4. 返回成功响应（支付宝要求返回特定格式）
    res.send("success");
  } catch (error) {
    console.error("[Alipay Webhook] 处理失败:", error);
    res.send("failure");
  }
}

/**
 * 更新订单支付状态（幂等性处理）
 */
async function updateOrderStatus(
  orderNo: string,
  data: {
    status: string;
    paymentChannel: string;
    channelOrderNo: string;
    paymentDate: string;
  }
) {
  const db = await getDb();
  if (!db) {
    throw new Error("数据库连接失败");
  }

  // 查询订单
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNo, orderNo))
    .limit(1);

  if (!order) {
    console.error(`[Payment Webhook] 订单不存在: ${orderNo}`);
    throw new Error("订单不存在");
  }

  // 幂等性检查：如果订单已经是paid状态，直接返回
  if (order.status === "paid") {
    console.log(`[Payment Webhook] 订单已支付，幂等性处理: ${orderNo}`);
    return;
  }

  // 更新订单状态
  await db
    .update(orders)
    .set({
      status: data.status as any,
      paymentChannel: data.paymentChannel,
      channelOrderNo: data.channelOrderNo,
      paymentDate: new Date(data.paymentDate),
      updatedAt: new Date(),
    })
    .where(eq(orders.orderNo, orderNo));

  console.log(`[Payment Webhook] 订单状态更新成功: ${orderNo}`);
}

/**
 * 验证微信支付签名
 */
async function verifyWechatSignature(req: Request): Promise<boolean> {
  // TODO: 实现微信支付签名验证
  // 需要从环境变量获取：
  // - WECHAT_API_KEY: 微信API密钥
  
  // 临时实现：开发环境跳过验签
  if (process.env.NODE_ENV === "development") {
    console.warn("[Wechat Webhook] 开发环境跳过签名验证");
    return true;
  }

  // 生产环境必须验签
  const { signature, timestamp, nonce } = req.body;
  const apiKey = process.env.WECHAT_API_KEY;

  if (!apiKey) {
    console.error("[Wechat Webhook] 缺少WECHAT_API_KEY环境变量");
    return false;
  }

  // 微信签名算法：
  // 1. 将参数按字典序排序
  // 2. 拼接成字符串
  // 3. 加上API密钥
  // 4. MD5加密并转大写
  const params = { ...req.body };
  delete params.signature;
  
  const sortedKeys = Object.keys(params).sort();
  const signString = sortedKeys
    .map((key) => `${key}=${params[key]}`)
    .join("&") + `&key=${apiKey}`;
  
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
  // TODO: 实现支付宝签名验证
  // 需要从环境变量获取：
  // - ALIPAY_PUBLIC_KEY: 支付宝公钥
  
  // 临时实现：开发环境跳过验签
  if (process.env.NODE_ENV === "development") {
    console.warn("[Alipay Webhook] 开发环境跳过签名验证");
    return true;
  }

  // 生产环境必须验签
  const { sign, sign_type } = req.body;
  const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;

  if (!alipayPublicKey) {
    console.error("[Alipay Webhook] 缺少ALIPAY_PUBLIC_KEY环境变量");
    return false;
  }

  // 支付宝签名算法：
  // 1. 将参数按字典序排序（排除sign和sign_type）
  // 2. 拼接成字符串
  // 3. 使用支付宝公钥验证签名
  const params = { ...req.body };
  delete params.sign;
  delete params.sign_type;
  
  const sortedKeys = Object.keys(params).sort();
  const signString = sortedKeys
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  // TODO: 使用RSA公钥验证签名
  // 这里需要使用crypto模块的verify方法
  // 临时返回true
  return true;
}
