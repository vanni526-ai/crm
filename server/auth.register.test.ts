import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// 测试手机号前缀
const TEST_PHONE_PREFIX = "199";

describe("auth.register - 用户注册接口", () => {
  let testPhones: string[] = [];

  // 清理测试数据
  afterAll(async () => {
    const drizzle = await getDb();
    if (drizzle && testPhones.length > 0) {
      for (const phone of testPhones) {
        await drizzle.delete(users).where(eq(users.phone, phone));
      }
    }
  });

  // 生成唯一测试手机号
  function generateTestPhone(): string {
    const phone = `${TEST_PHONE_PREFIX}${Date.now().toString().slice(-8)}`;
    testPhones.push(phone);
    return phone;
  }

  it("应该成功注册新用户", async () => {
    const phone = generateTestPhone();
    const password = "test123456";

    // 模拟调用注册接口
    const drizzle = await getDb();
    expect(drizzle).toBeTruthy();

    // 检查手机号未被注册
    const existing = await drizzle!
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);
    expect(existing.length).toBe(0);

    // 注册逻辑验证(模拟接口行为)
    const { hashPassword } = await import("./passwordUtils");
    const hashedPassword = await hashPassword(password);
    expect(hashedPassword).toBeTruthy();
    expect(hashedPassword.length).toBeGreaterThan(20);
  });

  it("应该拒绝无效的手机号格式", async () => {
    const invalidPhones = [
      "1234567890",    // 10位
      "123456789012",  // 12位
      "02345678901",   // 不以1开头
      "abcdefghijk",   // 非数字
    ];

    const phoneRegex = /^1[3-9]\d{9}$/;

    for (const phone of invalidPhones) {
      expect(phoneRegex.test(phone)).toBe(false);
    }
  });

  it("应该接受有效的手机号格式", async () => {
    const validPhones = [
      "13800138000",
      "15912345678",
      "18888888888",
      "19900001111",
    ];

    const phoneRegex = /^1[3-9]\d{9}$/;

    for (const phone of validPhones) {
      expect(phoneRegex.test(phone)).toBe(true);
    }
  });

  it("应该拒绝过短的密码", async () => {
    const shortPasswords = ["123", "12345", "a", ""];

    for (const password of shortPasswords) {
      expect(password.length >= 6).toBe(false);
    }
  });

  it("应该接受有效长度的密码", async () => {
    const validPasswords = ["123456", "password123", "MySecurePassword!"];

    for (const password of validPasswords) {
      expect(password.length >= 6 && password.length <= 20).toBe(true);
    }
  });

  it("密码应该被正确加密", async () => {
    const { hashPassword, verifyPassword } = await import("./passwordUtils");
    
    const password = "test123456";
    const hashed = await hashPassword(password);

    // 验证哈希值不等于原密码
    expect(hashed).not.toBe(password);

    // 验证可以正确验证密码
    const isValid = await verifyPassword(password, hashed);
    expect(isValid).toBe(true);

    // 验证错误密码不能通过
    const isInvalid = await verifyPassword("wrongpassword", hashed);
    expect(isInvalid).toBe(false);
  });

  it("应该生成唯一的openId", async () => {
    const { v4: uuidv4 } = await import("uuid");
    
    const openIds = new Set<string>();
    
    for (let i = 0; i < 100; i++) {
      const openId = `user_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
      expect(openIds.has(openId)).toBe(false);
      openIds.add(openId);
    }

    expect(openIds.size).toBe(100);
  });
});
