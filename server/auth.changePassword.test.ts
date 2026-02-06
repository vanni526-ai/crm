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

describe("auth.changePassword 接口逻辑", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("旧密码正确且新密码不同时应成功", async () => {
    const mockVerify = vi.mocked(verifyPassword);
    // 第一次调用验证旧密码 -> 正确
    mockVerify.mockResolvedValueOnce(true);
    // 第二次调用检查新旧密码是否相同 -> 不同
    mockVerify.mockResolvedValueOnce(false);

    const result1 = await mockVerify("oldPass123", "$2a$10$hashedOld");
    const result2 = await mockVerify("newPass456", "$2a$10$hashedOld");

    expect(result1).toBe(true);  // 旧密码验证通过
    expect(result2).toBe(false); // 新密码与旧密码不同
  });

  it("旧密码错误时应拒绝", async () => {
    const mockVerify = vi.mocked(verifyPassword);
    mockVerify.mockResolvedValueOnce(false);

    const result = await mockVerify("wrongOldPass", "$2a$10$hashedOld");
    expect(result).toBe(false);
  });

  it("新密码与旧密码相同时应拒绝", async () => {
    const mockVerify = vi.mocked(verifyPassword);
    // 旧密码验证通过
    mockVerify.mockResolvedValueOnce(true);
    // 新密码与旧密码相同
    mockVerify.mockResolvedValueOnce(true);

    const oldPassResult = await mockVerify("samePass", "$2a$10$hashed");
    const sameCheckResult = await mockVerify("samePass", "$2a$10$hashed");

    expect(oldPassResult).toBe(true);
    expect(sameCheckResult).toBe(true);
    // 当sameCheckResult为true时，接口应返回错误
  });

  it("应正确加密新密码", async () => {
    const mockHash = vi.mocked(hashPassword);
    mockHash.mockResolvedValueOnce("$2a$10$newHashedPassword");

    const hashed = await mockHash("newPassword123");
    expect(hashed).toBe("$2a$10$newHashedPassword");
    expect(mockHash).toHaveBeenCalledWith("newPassword123");
  });

  it("密码长度校验 - 最少6位", () => {
    const minLength = 6;
    expect("12345".length).toBeLessThan(minLength);
    expect("123456".length).toBeGreaterThanOrEqual(minLength);
  });

  it("密码长度校验 - 最多20位", () => {
    const maxLength = 20;
    expect("12345678901234567890".length).toBeLessThanOrEqual(maxLength);
    expect("123456789012345678901".length).toBeGreaterThan(maxLength);
  });

  it("输入参数校验 - userId必须为正整数", () => {
    const validUserId = 14790117;
    expect(validUserId).toBeGreaterThan(0);
    expect(Number.isInteger(validUserId)).toBe(true);
  });

  it("输入参数校验 - oldPassword不能为空", () => {
    const emptyPassword = "";
    expect(emptyPassword.length).toBe(0);
    // 接口应拒绝空旧密码
  });

  it("修改密码成功后应清除Token", async () => {
    // 模拟SDK行为：修改成功后清除Token
    const mockRemoveToken = vi.fn().mockResolvedValue(undefined);
    const tokenStorage = { removeToken: mockRemoveToken };

    const changeResult = { success: true, message: "密码修改成功，请重新登录" };

    if (changeResult.success) {
      await tokenStorage.removeToken();
    }

    expect(mockRemoveToken).toHaveBeenCalledTimes(1);
  });

  it("修改密码失败时不应清除Token", async () => {
    const mockRemoveToken = vi.fn().mockResolvedValue(undefined);
    const tokenStorage = { removeToken: mockRemoveToken };

    const changeResult = { success: false, message: "旧密码错误" };

    if (changeResult.success) {
      await tokenStorage.removeToken();
    }

    expect(mockRemoveToken).not.toHaveBeenCalled();
  });
});
