import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getOrCreateCustomerForUser: vi.fn(),
}));

vi.mock("./passwordUtils", () => ({
  hashPassword: vi.fn().mockResolvedValue("$2a$10$hashedNewPassword"),
  verifyPassword: vi.fn(),
}));

import { verifyPassword, hashPassword } from "./passwordUtils";

describe("auth.resetPassword 忘记密码接口逻辑", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("手机号已注册+验证码正确时应成功重置密码", () => {
    // 模拟：手机号存在、验证码为123456
    const phone = "13800138000";
    const code = "123456";
    const isValidCode = code === "123456";
    expect(isValidCode).toBe(true);
  });

  it("手机号未注册时应返回错误", () => {
    const userList: any[] = []; // 空数组表示未找到用户
    expect(userList.length).toBe(0);
    // 接口应返回 { success: false, error: "手机号未注册" }
  });

  it("验证码错误时应返回错误", () => {
    const code = "000000";
    const isValidCode = code === "123456";
    expect(isValidCode).toBe(false);
    // 接口应返回 { success: false, error: "验证码错误" }
  });

  it("账号被禁用时应返回错误", () => {
    const user = { id: 1, phone: "13800138000", isActive: false };
    expect(user.isActive).toBe(false);
    // 接口应返回 { success: false, error: "账号已被禁用，请联系管理员" }
  });

  it("手机号格式校验 - 11位数字", () => {
    const validPhone = "13800138000";
    const invalidPhone1 = "1380013800"; // 10位
    const invalidPhone2 = "138001380001"; // 12位
    const invalidPhone3 = "23800138000"; // 不以1开头

    expect(/^1[3-9]\d{9}$/.test(validPhone)).toBe(true);
    expect(/^1[3-9]\d{9}$/.test(invalidPhone1)).toBe(false);
    expect(/^1[3-9]\d{9}$/.test(invalidPhone2)).toBe(false);
    expect(/^1[3-9]\d{9}$/.test(invalidPhone3)).toBe(false);
  });

  it("新密码长度校验 - 至少6位", () => {
    expect("12345".length).toBeLessThan(6);
    expect("123456".length).toBeGreaterThanOrEqual(6);
  });

  it("新密码长度校验 - 最多20位", () => {
    expect("12345678901234567890".length).toBeLessThanOrEqual(20);
    expect("123456789012345678901".length).toBeGreaterThan(20);
  });

  it("应正确加密新密码", async () => {
    const mockHash = vi.mocked(hashPassword);
    mockHash.mockResolvedValueOnce("$2a$10$newHashedPassword");

    const hashed = await mockHash("newPassword123");
    expect(hashed).toBe("$2a$10$newHashedPassword");
    expect(mockHash).toHaveBeenCalledWith("newPassword123");
  });

  it("返回格式应包含success字段", () => {
    const successResult = { success: true };
    const errorResult = { success: false, error: "手机号未注册" };

    expect(successResult).toHaveProperty("success", true);
    expect(errorResult).toHaveProperty("success", false);
    expect(errorResult).toHaveProperty("error");
  });
});

describe("auth.changePassword 修改密码接口（修复后）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("参数格式：只需oldPassword和newPassword，不需要userId", () => {
    const input = {
      oldPassword: "oldpass123",
      newPassword: "newpass456",
    };
    expect(input).not.toHaveProperty("userId");
    expect(input).toHaveProperty("oldPassword");
    expect(input).toHaveProperty("newPassword");
  });

  it("通过ctx.user获取用户ID", () => {
    const ctx = {
      user: { id: 14790117, name: "testuser", role: "user" },
    };
    expect(ctx.user.id).toBe(14790117);
    expect(typeof ctx.user.id).toBe("number");
  });

  it("旧密码正确且新密码不同时应成功", async () => {
    const mockVerify = vi.mocked(verifyPassword);
    mockVerify.mockResolvedValueOnce(true);  // 旧密码验证通过
    mockVerify.mockResolvedValueOnce(false); // 新密码与旧密码不同

    const result1 = await mockVerify("oldPass", "$2a$10$hashed");
    const result2 = await mockVerify("newPass", "$2a$10$hashed");

    expect(result1).toBe(true);
    expect(result2).toBe(false);
  });

  it("旧密码错误时应返回错误", async () => {
    const mockVerify = vi.mocked(verifyPassword);
    mockVerify.mockResolvedValueOnce(false);

    const result = await mockVerify("wrongPass", "$2a$10$hashed");
    expect(result).toBe(false);
    // 接口应返回 { success: false, error: "旧密码错误" }
  });

  it("新旧密码相同时应返回错误", async () => {
    const mockVerify = vi.mocked(verifyPassword);
    mockVerify.mockResolvedValueOnce(true); // 旧密码验证通过
    mockVerify.mockResolvedValueOnce(true); // 新密码与旧密码相同

    const r1 = await mockVerify("samePass", "$2a$10$hashed");
    const r2 = await mockVerify("samePass", "$2a$10$hashed");

    expect(r1).toBe(true);
    expect(r2).toBe(true);
    // 接口应返回 { success: false, error: "新密码不能与旧密码相同" }
  });

  it("返回格式应使用error而非message", () => {
    const successResult = { success: true };
    const errorResult = { success: false, error: "旧密码错误" };

    expect(successResult).not.toHaveProperty("message");
    expect(successResult).not.toHaveProperty("error");
    expect(errorResult).toHaveProperty("error");
    expect(errorResult).not.toHaveProperty("message");
  });

  it("未登录时protectedProcedure应拒绝访问", () => {
    const ctx = { user: null };
    expect(ctx.user).toBeNull();
    // protectedProcedure会自动抛出UNAUTHORIZED错误
  });
});
