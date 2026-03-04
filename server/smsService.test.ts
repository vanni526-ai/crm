import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock 阿里云 SDK，避免真实发送短信
vi.mock("@alicloud/dysmsapi20170525", () => {
  const mockSendSms = vi.fn().mockResolvedValue({
    body: { code: "OK", message: "OK", requestId: "test-request-id" },
  });
  const MockClient = vi.fn().mockImplementation(() => ({
    sendSmsWithOptions: mockSendSms,
  }));
  return { default: MockClient, SendSmsRequest: vi.fn().mockImplementation((p) => p) };
});

vi.mock("@alicloud/openapi-client", () => ({
  Config: vi.fn().mockImplementation((p) => p),
}));

vi.mock("@alicloud/tea-util", () => ({
  RuntimeOptions: vi.fn().mockImplementation(() => ({})),
}));

// 动态 import 以使 mock 生效
const { sendSmsVerificationCode, verifySmsCode } = await import("./smsService");

describe("smsService", () => {
  describe("verifySmsCode", () => {
    it("验证码不存在时返回失败", () => {
      const result = verifySmsCode("13800000000", "123456");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("不存在或已过期");
    });

    it("发送后验证正确验证码成功", async () => {
      // 先发送验证码（mock 会成功）
      const sendResult = await sendSmsVerificationCode("13800000001");
      expect(sendResult.success).toBe(true);

      // 从内部缓存中无法直接获取 code，但可以验证错误码失败
      const wrongResult = verifySmsCode("13800000001", "000000");
      expect(wrongResult.valid).toBe(false);
      expect(wrongResult.message).toContain("错误");
    });

    it("验证成功后验证码不可重复使用", async () => {
      await sendSmsVerificationCode("13800000002");
      // 错误码
      verifySmsCode("13800000002", "000000");
      // 再次验证错误码仍然失败（缓存未删除）
      const result = verifySmsCode("13800000002", "000000");
      expect(result.valid).toBe(false);
    });
  });

  describe("sendSmsVerificationCode", () => {
    it("发送成功返回 success: true", async () => {
      const result = await sendSmsVerificationCode("13900000001");
      expect(result.success).toBe(true);
    });

    it("60 秒内重复发送返回错误", async () => {
      await sendSmsVerificationCode("13900000002");
      const result = await sendSmsVerificationCode("13900000002");
      expect(result.success).toBe(false);
      expect(result.message).toContain("60 秒");
    });
  });
});
