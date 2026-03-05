/**
 * 企业微信回调验证接口
 * 用于配置"接收消息服务器URL"时的 URL 验证
 * 验证通过后即可设置企业可信IP，进而调用日历等 API
 */
import { Request, Response } from "express";
import crypto from "crypto";

// 从环境变量读取 Token（用于验证签名）
const WXWORK_TOKEN = process.env.WXWORK_TOKEN || "wxwork_token_2026";

/**
 * GET 请求：企业微信服务器验证
 * 企业微信会发送 msg_signature, timestamp, nonce, echostr 四个参数
 * 需要验证签名后原样返回 echostr
 */
export function handleWxworkCallbackVerify(req: Request, res: Response) {
  const { msg_signature, timestamp, nonce, echostr } = req.query as Record<string, string>;

  console.log("[WxWork Callback] Verify request:", { msg_signature, timestamp, nonce, echostr: echostr?.substring(0, 20) + "..." });

  if (!msg_signature || !timestamp || !nonce || !echostr) {
    // 如果没有这些参数，可能是普通 GET 请求，返回 OK
    res.status(200).send("OK - WxWork callback endpoint is ready");
    return;
  }

  try {
    // 企业微信签名验证：将 token, timestamp, nonce 排序后 SHA1
    const arr = [WXWORK_TOKEN, timestamp, nonce].sort();
    const str = arr.join("");
    const signature = crypto.createHash("sha1").update(str).digest("hex");

    if (signature === msg_signature) {
      console.log("[WxWork Callback] Signature verified OK, returning echostr");
      res.status(200).send(echostr);
    } else {
      console.error("[WxWork Callback] Signature mismatch:", { expected: signature, got: msg_signature });
      res.status(403).send("Signature mismatch");
    }
  } catch (err) {
    console.error("[WxWork Callback] Error:", err);
    res.status(500).send("Internal error");
  }
}

/**
 * POST 请求：接收企业微信推送的消息（暂时只记录日志）
 */
export function handleWxworkCallbackPost(req: Request, res: Response) {
  console.log("[WxWork Callback] Received POST message:", JSON.stringify(req.body).substring(0, 200));
  res.status(200).send("success");
}
