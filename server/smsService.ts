/**
 * 阿里云短信服务
 * 使用 @alicloud/dysmsapi20170525 SDK 发送短信验证码
 */
import * as $dysmsapi from "@alicloud/dysmsapi20170525";
import * as $OpenApi from "@alicloud/openapi-client";
import * as $Util from "@alicloud/tea-util";

// 兼容 ESM/CJS 混合导出
const Dysmsapi = ($dysmsapi as any).default ?? $dysmsapi;

// 内存缓存：手机号 -> { code, expiresAt }
const smsCodeCache = new Map<string, { code: string; expiresAt: number }>();

// 创建阿里云短信客户端
function createSmsClient(): any {
  const config = new $OpenApi.Config({
    accessKeyId: process.env.ALIYUN_SMS_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET,
    endpoint: "dysmsapi.aliyuncs.com",
  });
  return new Dysmsapi(config);
}

/**
 * 发送短信验证码
 * @param phone 手机号
 * @returns 是否发送成功
 */
export async function sendSmsVerificationCode(phone: string): Promise<{ success: boolean; message: string }> {
  // 检查发送频率（60 秒内不能重复发送）
  const existing = smsCodeCache.get(phone);
  if (existing && existing.expiresAt - Date.now() > 4 * 60 * 1000) {
    return { success: false, message: "验证码已发送，请 60 秒后再试" };
  }

  // 生成 6 位随机验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const client = createSmsClient();
    const sendSmsRequest = new $dysmsapi.SendSmsRequest({
      phoneNumbers: phone,
      signName: "瀛姬",
      templateCode: "SMS_501820654",
      templateParam: JSON.stringify({ code }),
    });
    const runtime = new $Util.RuntimeOptions({});
    const response = await client.sendSmsWithOptions(sendSmsRequest, runtime);

    if (response.body?.code === "OK") {
      // 缓存验证码，5 分钟有效
      smsCodeCache.set(phone, {
        code,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
      return { success: true, message: "验证码已发送" };
    } else {
      console.error("[SMS] 发送失败:", response.body?.code, response.body?.message);
      return { success: false, message: `短信发送失败：${response.body?.message || "未知错误"}` };
    }
  } catch (err: any) {
    console.error("[SMS] 发送异常:", err);
    return { success: false, message: "短信服务暂时不可用，请稍后再试" };
  }
}

/**
 * 验证短信验证码
 * @param phone 手机号
 * @param code 用户输入的验证码
 * @returns 是否验证通过
 */
export function verifySmsCode(phone: string, code: string): { valid: boolean; message: string } {
  const cached = smsCodeCache.get(phone);
  if (!cached) {
    return { valid: false, message: "验证码不存在或已过期，请重新获取" };
  }
  if (Date.now() > cached.expiresAt) {
    smsCodeCache.delete(phone);
    return { valid: false, message: "验证码已过期，请重新获取" };
  }
  if (cached.code !== code) {
    return { valid: false, message: "验证码错误，请重新输入" };
  }
  // 验证成功后删除缓存（一次性使用）
  smsCodeCache.delete(phone);
  return { valid: true, message: "验证码正确" };
}
