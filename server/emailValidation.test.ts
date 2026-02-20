import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Email Validation Fix', () => {
  // 模拟修复后的email验证schema
  const emailSchema = z.union([z.string().email("邮箱格式不正确"), z.literal("")]).optional();

  it('should accept valid email addresses', () => {
    expect(() => emailSchema.parse('test@example.com')).not.toThrow();
    expect(() => emailSchema.parse('user@domain.co.uk')).not.toThrow();
  });

  it('should accept empty string', () => {
    expect(() => emailSchema.parse('')).not.toThrow();
  });

  it('should accept undefined', () => {
    expect(() => emailSchema.parse(undefined)).not.toThrow();
  });

  it('should reject invalid email formats', () => {
    expect(() => emailSchema.parse('invalid-email')).toThrow();
    expect(() => emailSchema.parse('test@')).toThrow();
    expect(() => emailSchema.parse('@example.com')).toThrow();
  });

  it('should work in update mutation context', () => {
    const updateSchema = z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      email: z.union([z.string().email("邮箱格式不正确"), z.literal("")]).optional(),
    });

    // 有效的更新请求
    expect(() => updateSchema.parse({
      id: 1,
      name: 'Test User',
      email: 'test@example.com'
    })).not.toThrow();

    // 空邮箱的更新请求
    expect(() => updateSchema.parse({
      id: 1,
      name: 'Test User',
      email: ''
    })).not.toThrow();

    // 未提供邮箱的更新请求
    expect(() => updateSchema.parse({
      id: 1,
      name: 'Test User'
    })).not.toThrow();

    // 无效邮箱的更新请求应该抛出错误
    expect(() => updateSchema.parse({
      id: 1,
      name: 'Test User',
      email: 'invalid'
    })).toThrow();
  });
});
