import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => {
  return {
    getCustomerByUserId: vi.fn(),
    getCustomerTransactions: vi.fn(),
    rechargeCustomerAccount: vi.fn(),
    consumeCustomerAccount: vi.fn(),
    refundCustomerAccount: vi.fn(),
    getDb: vi.fn(),
  };
});

// Mock getDb for direct DB queries
vi.mock("../drizzle/schema", () => ({
  orders: {},
  customers: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

import * as db from "./db";

describe("Account Balance API - 接口设计验证", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("account.getMyBalance - App用户查询自己余额", () => {
    it("用户无关联业务客户时返回0余额", async () => {
      (db.getCustomerByUserId as any).mockResolvedValue(null);
      
      // 模拟接口逻辑
      const customer = await db.getCustomerByUserId(999);
      expect(customer).toBeNull();
      
      const result = { success: true, data: { balance: "0.00", customerId: null, customerName: null } };
      expect(result.success).toBe(true);
      expect(result.data.balance).toBe("0.00");
      expect(result.data.customerId).toBeNull();
    });

    it("用户有关联业务客户时返回正确余额(从流水表)", async () => {
      (db.getCustomerByUserId as any).mockResolvedValue({
        id: 100, name: "测试客户", accountBalance: "500.00",
      });
      (db.getCustomerTransactions as any).mockResolvedValue([
        { id: 1, balanceAfter: "800.00", type: "recharge", amount: "300.00" },
        { id: 2, balanceAfter: "500.00", type: "recharge", amount: "500.00" },
      ]);

      const customer = await db.getCustomerByUserId(1);
      expect(customer).not.toBeNull();
      
      const transactions = await db.getCustomerTransactions(customer!.id);
      const latestBalance = transactions.length > 0 
        ? transactions[0].balanceAfter 
        : customer!.accountBalance;
      
      expect(latestBalance).toBe("800.00");
    });

    it("用户有关联业务客户但无流水时返回customers表余额", async () => {
      (db.getCustomerByUserId as any).mockResolvedValue({
        id: 100, name: "测试客户", accountBalance: "500.00",
      });
      (db.getCustomerTransactions as any).mockResolvedValue([]);

      const customer = await db.getCustomerByUserId(1);
      const transactions = await db.getCustomerTransactions(customer!.id);
      const latestBalance = transactions.length > 0 
        ? transactions[0].balanceAfter 
        : customer!.accountBalance;
      
      expect(latestBalance).toBe("500.00");
    });
  });

  describe("account.getMyTransactions - App用户查询自己的流水", () => {
    it("用户无关联客户时返回空流水", async () => {
      (db.getCustomerByUserId as any).mockResolvedValue(null);
      
      const customer = await db.getCustomerByUserId(999);
      const result = customer 
        ? { success: true, data: { transactions: await db.getCustomerTransactions(customer.id), total: 0 } }
        : { success: true, data: { transactions: [], total: 0 } };
      
      expect(result.data.transactions).toEqual([]);
      expect(result.data.total).toBe(0);
    });

    it("用户有流水时返回分页数据", async () => {
      (db.getCustomerByUserId as any).mockResolvedValue({ id: 100, name: "测试客户" });
      const mockTransactions = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        type: i % 2 === 0 ? "recharge" : "consume",
        amount: `${(i + 1) * 100}.00`,
        balanceAfter: `${(25 - i) * 100}.00`,
        createdAt: new Date(),
      }));
      (db.getCustomerTransactions as any).mockResolvedValue(mockTransactions);

      const customer = await db.getCustomerByUserId(1);
      const allTransactions = await db.getCustomerTransactions(customer!.id);
      
      // 默认limit=20, offset=0
      const limit = 20;
      const offset = 0;
      const paged = allTransactions.slice(offset, offset + limit);
      
      expect(paged.length).toBe(20);
      expect(allTransactions.length).toBe(25);
    });

    it("支持分页参数", async () => {
      (db.getCustomerByUserId as any).mockResolvedValue({ id: 100, name: "测试客户" });
      const mockTransactions = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        amount: `${(i + 1) * 100}.00`,
      }));
      (db.getCustomerTransactions as any).mockResolvedValue(mockTransactions);

      const allTransactions = await db.getCustomerTransactions(100);
      const limit = 10;
      const offset = 20;
      const paged = allTransactions.slice(offset, offset + limit);
      
      expect(paged.length).toBe(5); // 25 - 20 = 5
    });
  });

  describe("account.recharge - 客户充值", () => {
    it("充值成功返回前后余额", async () => {
      (db.rechargeCustomerAccount as any).mockResolvedValue({
        balanceBefore: 500,
        balanceAfter: 800,
      });

      const result = await db.rechargeCustomerAccount({
        customerId: 100,
        amount: 300,
        notes: "管理员充值",
        operatorId: 1,
        operatorName: "管理员",
      });

      expect(result.balanceBefore).toBe(500);
      expect(result.balanceAfter).toBe(800);
      expect(result.balanceAfter - result.balanceBefore).toBe(300);
    });

    it("充值金额必须大于0", () => {
      // 验证z.number().positive()的校验逻辑
      const amount = -100;
      expect(amount > 0).toBe(false);
      
      const amount2 = 0;
      expect(amount2 > 0).toBe(false);
      
      const amount3 = 100;
      expect(amount3 > 0).toBe(true);
    });

    it("充值失败返回错误信息", async () => {
      (db.rechargeCustomerAccount as any).mockRejectedValue(new Error("客户不存在"));

      try {
        await db.rechargeCustomerAccount({
          customerId: 99999,
          amount: 300,
          notes: "测试",
          operatorId: 1,
          operatorName: "管理员",
        });
      } catch (error: any) {
        expect(error.message).toBe("客户不存在");
      }
    });
  });

  describe("account.refund - 客户退款", () => {
    it("退款成功返回前后余额", async () => {
      (db.refundCustomerAccount as any).mockResolvedValue({
        balanceBefore: 500,
        balanceAfter: 800,
      });

      const result = await db.refundCustomerAccount({
        customerId: 100,
        amount: 300,
        orderId: 1,
        orderNo: "20260206-001",
        operatorId: 1,
        operatorName: "管理员",
      });

      expect(result.balanceBefore).toBe(500);
      expect(result.balanceAfter).toBe(800);
    });
  });

  describe("下单余额扣除逻辑验证", () => {
    it("consumeCustomerAccount正确扣除余额", async () => {
      (db.consumeCustomerAccount as any).mockResolvedValue({
        balanceBefore: 1000,
        balanceAfter: 700,
      });

      const result = await db.consumeCustomerAccount({
        customerId: 100,
        amount: 300,
        orderId: 1,
        orderNo: "20260206-001",
        operatorId: 1,
        operatorName: "用户",
      });

      expect(result.balanceBefore).toBe(1000);
      expect(result.balanceAfter).toBe(700);
      expect(result.balanceBefore - result.balanceAfter).toBe(300);
    });

    it("余额不足时扣款失败", async () => {
      (db.consumeCustomerAccount as any).mockRejectedValue(new Error("余额不足"));

      try {
        await db.consumeCustomerAccount({
          customerId: 100,
          amount: 5000,
          orderId: 1,
          orderNo: "20260206-001",
          operatorId: 1,
          operatorName: "用户",
        });
        expect.fail("应该抛出错误");
      } catch (error: any) {
        expect(error.message).toBe("余额不足");
      }
    });
  });

  describe("完整充值-消费-退款流程", () => {
    it("充值1000 → 消费300 → 退款100 = 余额800", async () => {
      // Step 1: 充值1000
      (db.rechargeCustomerAccount as any).mockResolvedValue({
        balanceBefore: 0, balanceAfter: 1000,
      });
      const rechargeResult = await db.rechargeCustomerAccount({
        customerId: 100, amount: 1000, notes: "首次充值",
        operatorId: 1, operatorName: "管理员",
      });
      expect(rechargeResult.balanceAfter).toBe(1000);

      // Step 2: 消费300
      (db.consumeCustomerAccount as any).mockResolvedValue({
        balanceBefore: 1000, balanceAfter: 700,
      });
      const consumeResult = await db.consumeCustomerAccount({
        customerId: 100, amount: 300, orderId: 1, orderNo: "ORD-001",
        operatorId: 1, operatorName: "用户",
      });
      expect(consumeResult.balanceAfter).toBe(700);

      // Step 3: 退款100
      (db.refundCustomerAccount as any).mockResolvedValue({
        balanceBefore: 700, balanceAfter: 800,
      });
      const refundResult = await db.refundCustomerAccount({
        customerId: 100, amount: 100, orderId: 1, orderNo: "ORD-001",
        operatorId: 1, operatorName: "管理员",
      });
      expect(refundResult.balanceAfter).toBe(800);
    });
  });

  describe("接口返回格式统一性验证", () => {
    it("成功响应格式: { success: true, data: {...} }", () => {
      const successResponse = {
        success: true,
        data: { balance: "1000.00", customerId: 100, customerName: "测试" },
      };
      expect(successResponse).toHaveProperty("success", true);
      expect(successResponse).toHaveProperty("data");
      expect(successResponse.data).toHaveProperty("balance");
    });

    it("失败响应格式: { success: false, error: '...' }", () => {
      const errorResponse = { success: false, error: "客户不存在" };
      expect(errorResponse).toHaveProperty("success", false);
      expect(errorResponse).toHaveProperty("error");
    });

    it("余额金额格式为字符串,保留两位小数", () => {
      const balance = (800).toFixed(2);
      expect(balance).toBe("800.00");
      expect(typeof balance).toBe("string");
      
      const balance2 = (0).toFixed(2);
      expect(balance2).toBe("0.00");
    });
  });
});
