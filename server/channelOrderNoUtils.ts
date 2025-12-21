/**
 * 渠道订单号工具函数
 * 提供格式验证、支付渠道识别等功能
 */

/**
 * 支付渠道类型
 */
export type PaymentChannel = 
  | "alipay"      // 支付宝
  | "wechat"      // 微信支付
  | "fuzhanggui"  // 富掌柜
  | "unknown";    // 未知

/**
 * 渠道订单号验证结果
 */
export interface ChannelOrderNoValidation {
  isValid: boolean;           // 是否有效
  channel: PaymentChannel;    // 识别出的支付渠道
  channelName: string;        // 渠道中文名称
  format: string;             // 格式描述
  warning?: string;           // 警告信息(格式异常但可能有效)
}

/**
 * 支付宝订单号格式:
 * - 长度: 28位
 * - 格式: 数字
 * - 示例: 2024121822001234567890123456
 */
function validateAlipayOrderNo(orderNo: string): boolean {
  return /^\d{28}$/.test(orderNo);
}

/**
 * 微信支付订单号格式:
 * - 长度: 32位
 * - 格式: 数字
 * - 示例: 4200002971202512209215930344
 */
function validateWechatOrderNo(orderNo: string): boolean {
  return /^\d{32}$/.test(orderNo);
}

/**
 * 富掌柜订单号格式:
 * - 长度: 可变(通常20-30位)
 * - 格式: 字母+数字
 * - 示例: FZG202412180001234567
 */
function validateFZGOrderNo(orderNo: string): boolean {
  // 富掌柜订单号通常以FZG开头,或者包含字母数字混合
  return /^[A-Z0-9]{20,30}$/.test(orderNo) || /^FZG\d{15,25}$/i.test(orderNo);
}

/**
 * 从原始文本中提取渠道订单号
 * @param text 原始文本(如备注内容)
 * @returns 提取到的渠道订单号,如果没有则返回null
 */
export function extractChannelOrderNo(text: string): string | null {
  if (!text) return null;
  
  // 匹配"交易单号XXXXXXXX"模式
  const pattern1 = /交易单号\s*([A-Z0-9]{15,35})/i;
  const match1 = text.match(pattern1);
  if (match1) return match1[1];
  
  // 匹配"订单号XXXXXXXX"模式
  const pattern2 = /订单号\s*([A-Z0-9]{15,35})/i;
  const match2 = text.match(pattern2);
  if (match2) return match2[1];
  
  // 匹配"渠道订单号XXXXXXXX"模式
  const pattern3 = /渠道订单号[:\uff1a\s]*([A-Z0-9]{15,35})/i;
  const match3 = text.match(pattern3);
  if (match3) return match3[1];
  
  return null;
}

/**
 * 验证渠道订单号并识别支付渠道
 * @param orderNo 渠道订单号
 * @returns 验证结果
 */
export function validateChannelOrderNo(orderNo: string): ChannelOrderNoValidation {
  if (!orderNo || orderNo.trim() === "") {
    return {
      isValid: false,
      channel: "unknown",
      channelName: "未知",
      format: "空订单号",
    };
  }
  
  const trimmed = orderNo.trim();
  
  // 检查支付宝格式(28位数字)
  if (validateAlipayOrderNo(trimmed)) {
    return {
      isValid: true,
      channel: "alipay",
      channelName: "支付宝",
      format: "28位数字",
    };
  }
  
  // 检查微信支付格式(32位数字)
  if (validateWechatOrderNo(trimmed)) {
    return {
      isValid: true,
      channel: "wechat",
      channelName: "微信支付",
      format: "32位数字",
    };
  }
  
  // 检查富掌柜格式
  if (validateFZGOrderNo(trimmed)) {
    return {
      isValid: true,
      channel: "fuzhanggui",
      channelName: "富掌柜",
      format: "字母数字混合",
    };
  }
  
  // 如果是纯数字但长度不匹配,可能是格式异常但仍有效
  if (/^\d+$/.test(trimmed)) {
    const length = trimmed.length;
    let possibleChannel: PaymentChannel = "unknown";
    let channelName = "未知";
    
    if (length >= 26 && length <= 30) {
      possibleChannel = "alipay";
      channelName = "支付宝(疑似)";
    } else if (length >= 30 && length <= 34) {
      possibleChannel = "wechat";
      channelName = "微信支付(疑似)";
    }
    
    return {
      isValid: false,
      channel: possibleChannel,
      channelName,
      format: `${length}位数字`,
      warning: `订单号长度异常(${length}位),请核对`,
    };
  }
  
  // 其他格式
  return {
    isValid: false,
    channel: "unknown",
    channelName: "未知",
    format: "格式不匹配",
    warning: "订单号格式无法识别,请手动核对",
  };
}

/**
 * 根据渠道订单号自动识别支付渠道
 * @param orderNo 渠道订单号
 * @returns 支付渠道名称(中文)
 */
export function identifyPaymentChannel(orderNo: string): string {
  const validation = validateChannelOrderNo(orderNo);
  
  if (validation.isValid) {
    return validation.channelName;
  }
  
  // 如果格式不完全匹配但有疑似渠道,返回疑似渠道名
  if (validation.channel !== "unknown") {
    return validation.channelName;
  }
  
  return "";
}

/**
 * 批量验证渠道订单号
 * @param orderNos 订单号数组
 * @returns 验证结果数组
 */
export function batchValidateChannelOrderNo(
  orderNos: string[]
): ChannelOrderNoValidation[] {
  return orderNos.map(validateChannelOrderNo);
}
