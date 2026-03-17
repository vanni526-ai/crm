import { describe, it, expect, beforeAll } from 'vitest';
import { api } from '../lib/sdk/api-client';

describe('用户注册功能测试', () => {
  // 生成随机手机号用于测试
  const generateTestPhone = () => {
    const timestamp = Date.now().toString().slice(-8);
    return `138${timestamp}`;
  };

  it('应该成功注册新用户', async () => {
    const testPhone = generateTestPhone();
    const testPassword = '123456';

    const result = await api.auth.register({
      phone: testPhone,
      password: testPassword,
    });

    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.user?.role).toBe('user');
  }, 30000);

  it('应该拒绝已注册的手机号', async () => {
    const testPhone = generateTestPhone();
    const testPassword = '123456';

    // 第一次注册应该成功
    const firstResult = await api.auth.register({
      phone: testPhone,
      password: testPassword,
    });
    expect(firstResult.success).toBe(true);

    // 第二次注册应该失败
    const secondResult = await api.auth.register({
      phone: testPhone,
      password: testPassword,
    });
    expect(secondResult.success).toBe(false);
    expect(secondResult.error).toContain('已被注册');
  }, 30000);

  it('应该拒绝格式错误的手机号', async () => {
    const result = await api.auth.register({
      phone: '1234', // 格式错误
      password: '123456',
    });

    expect(result.success).toBe(false);
  });

  it('应该拒绝过短的密码', async () => {
    const testPhone = generateTestPhone();
    
    const result = await api.auth.register({
      phone: testPhone,
      password: '123', // 少于6位
    });

    expect(result.success).toBe(false);
  });

  it('注册成功后应该能够登录', async () => {
    const testPhone = generateTestPhone();
    const testPassword = '123456';

    // 先注册
    const registerResult = await api.auth.register({
      phone: testPhone,
      password: testPassword,
    });
    expect(registerResult.success).toBe(true);

    // 登出
    await api.auth.logout();

    // 再登录
    const loginResult = await api.auth.login({
      username: testPhone,
      password: testPassword,
    });
    expect(loginResult.success).toBe(true);
    expect(loginResult.token).toBeDefined();
  }, 30000);
});

describe('表单验证测试', () => {
  const validatePhone = (phone: string): boolean => {
    return /^1[3-9]\d{9}$/.test(phone);
  };

  it('应该验证正确的手机号格式', () => {
    expect(validatePhone('13800138000')).toBe(true);
    expect(validatePhone('15912345678')).toBe(true);
    expect(validatePhone('18888888888')).toBe(true);
  });

  it('应该拒绝错误的手机号格式', () => {
    expect(validatePhone('1234')).toBe(false);
    expect(validatePhone('12345678901')).toBe(false);
    expect(validatePhone('10012345678')).toBe(false); // 不以1开头
    expect(validatePhone('12012345678')).toBe(false); // 第二位不是3-9
    expect(validatePhone('abc')).toBe(false);
    expect(validatePhone('')).toBe(false);
  });

  it('应该验证密码长度', () => {
    const validatePassword = (password: string): boolean => {
      return password.length >= 6 && password.length <= 20;
    };

    expect(validatePassword('123456')).toBe(true);
    expect(validatePassword('12345678901234567890')).toBe(true);
    expect(validatePassword('12345')).toBe(false); // 太短
    expect(validatePassword('123456789012345678901')).toBe(false); // 太长
  });
});
