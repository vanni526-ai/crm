import { describe, it, expect } from "vitest";
import {
  validateChannelOrderNo,
  identifyPaymentChannel,
  extractChannelOrderNo,
} from "./channelOrderNoUtils";

describe("渠道订单号工具函数测试", () => {
  describe("validateChannelOrderNo", () => {
    it("应该正确验证支付宝订单号(28位数字)", () => {
      const result = validateChannelOrderNo("2024121822001234567890123456");
      expect(result.isValid).toBe(true);
      expect(result.channel).toBe("alipay");
      expect(result.channelName).toBe("支付宝");
      expect(result.format).toBe("28位数字");
    });

    it("应该正确验证微信支付订单号(32位数字)", () => {
      const result = validateChannelOrderNo("42000029712025122092159303441234");
      expect(result.isValid).toBe(true);
      expect(result.channel).toBe("wechat");
      expect(result.channelName).toBe("微信支付");
      expect(result.format).toBe("32位数字");
    });

    it("应该正确验证富掌柜订单号", () => {
      const result = validateChannelOrderNo("FZG20241218000123456789");
      expect(result.isValid).toBe(true);
      expect(result.channel).toBe("fuzhanggui");
      expect(result.channelName).toBe("富掌柜");
    });



    it("应该拒绝空订单号", () => {
      const result = validateChannelOrderNo("");
      expect(result.isValid).toBe(false);
      expect(result.channel).toBe("unknown");
      expect(result.format).toBe("空订单号");
    });

    it("应该拒绝格式不匹配的订单号", () => {
      const result = validateChannelOrderNo("ABC123");
      expect(result.isValid).toBe(false);
      expect(result.channel).toBe("unknown");
      expect(result.warning).toContain("订单号格式无法识别");
    });
  });

  describe("identifyPaymentChannel", () => {
    it("应该正确识别支付宝渠道", () => {
      const channel = identifyPaymentChannel("2024121822001234567890123456");
      expect(channel).toBe("支付宝");
    });

    it("应该正确识别微信支付渠道", () => {
      const channel = identifyPaymentChannel("42000029712025122092159303441234");
      expect(channel).toBe("微信支付");
    });

    it("应该正确识别富掌柜渠道", () => {
      const channel = identifyPaymentChannel("FZG20241218000123456789");
      expect(channel).toBe("富掌柜");
    });

    it("应该返回空字符串对于无法识别的订单号", () => {
      const channel = identifyPaymentChannel("INVALID123");
      expect(channel).toBe("");
    });
  });

  describe("extractChannelOrderNo", () => {
    it("应该从'交易单号'模式中提取订单号", () => {
      const text = "收款成功 交易单号 4200002971202512209215930344";
      const orderNo = extractChannelOrderNo(text);
      expect(orderNo).toBe("4200002971202512209215930344");
    });

    it("应该从'订单号'模式中提取订单号", () => {
      const text = "支付成功 订单号2024121822001234567890123456";
      const orderNo = extractChannelOrderNo(text);
      expect(orderNo).toBe("2024121822001234567890123456");
    });

    it("应该从'渠道订单号'模式中提取订单号", () => {
      const text = "渠道订单号: FZG20241218000123456789";
      const orderNo = extractChannelOrderNo(text);
      expect(orderNo).toBe("FZG20241218000123456789");
    });

    it("应该返回null对于不包含订单号的文本", () => {
      const text = "这是一段普通文本,没有订单号";
      const orderNo = extractChannelOrderNo(text);
      expect(orderNo).toBe(null);
    });

    it("应该返回null对于空文本", () => {
      const orderNo = extractChannelOrderNo("");
      expect(orderNo).toBe(null);
    });
  });
});
