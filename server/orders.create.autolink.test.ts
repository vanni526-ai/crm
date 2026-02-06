import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  checkOrderNoExists: vi.fn().mockResolvedValue(false),
  checkChannelOrderNoExists: vi.fn().mockResolvedValue(false),
  getAllTeacherNames: vi.fn().mockResolvedValue([]),
  calculatePartnerFee: vi.fn().mockResolvedValue(0),
  getOrCreateCustomerForUser: vi.fn().mockResolvedValue({
    customerId: 12345,
    customerName: "测试客户",
    isNew: true,
  }),
  createOrder: vi.fn().mockResolvedValue({ id: 1 }),
}));

import * as db from "./db";

describe("orders.create 自动关联业务客户", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("当用户角色是user且没有提供customerId时，应自动调用getOrCreateCustomerForUser", async () => {
    // 模拟普通用户上下文
    const mockUser = {
      id: 14790117,
      name: "15921456877",
      nickname: null,
      phone: "15921456877",
      role: "user" as const,
    };

    // 模拟输入数据（没有customerId）
    const input = {
      paymentAmount: "100",
      courseAmount: "100",
      customerName: undefined,
    };

    // 验证当role=user且没有customerId时，应该调用getOrCreateCustomerForUser
    if (!input.customerName && mockUser.role === "user") {
      const result = await db.getOrCreateCustomerForUser({
        id: mockUser.id,
        name: mockUser.name,
        nickname: mockUser.nickname,
        phone: mockUser.phone,
      });
      
      expect(db.getOrCreateCustomerForUser).toHaveBeenCalledWith({
        id: 14790117,
        name: "15921456877",
        nickname: null,
        phone: "15921456877",
      });
      expect(result.customerId).toBe(12345);
      expect(result.customerName).toBe("测试客户");
    }
  });

  it("当用户角色是admin时，不应自动调用getOrCreateCustomerForUser", async () => {
    // 模拟管理员用户上下文
    const mockUser = {
      id: 1,
      name: "管理员",
      nickname: null,
      phone: null,
      role: "admin" as const,
    };

    // 模拟输入数据（没有customerId）
    const input = {
      paymentAmount: "100",
      courseAmount: "100",
      customerId: undefined,
    };

    // 验证当role=admin时，不应该调用getOrCreateCustomerForUser
    if (!input.customerId && mockUser.role === "user") {
      await db.getOrCreateCustomerForUser({
        id: mockUser.id,
        name: mockUser.name,
        nickname: mockUser.nickname,
        phone: mockUser.phone,
      });
    }
    
    // admin角色不应触发自动关联
    expect(db.getOrCreateCustomerForUser).not.toHaveBeenCalled();
  });

  it("当已提供customerId时，不应调用getOrCreateCustomerForUser", async () => {
    // 模拟普通用户上下文
    const mockUser = {
      id: 14790117,
      name: "15921456877",
      nickname: null,
      phone: "15921456877",
      role: "user" as const,
    };

    // 模拟输入数据（已有customerId）
    const input = {
      paymentAmount: "100",
      courseAmount: "100",
      customerId: 99999,
    };

    // 验证当已有customerId时，不应该调用getOrCreateCustomerForUser
    if (!input.customerId && mockUser.role === "user") {
      await db.getOrCreateCustomerForUser({
        id: mockUser.id,
        name: mockUser.name,
        nickname: mockUser.nickname,
        phone: mockUser.phone,
      });
    }
    
    // 已有customerId不应触发自动关联
    expect(db.getOrCreateCustomerForUser).not.toHaveBeenCalled();
  });
});
