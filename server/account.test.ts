import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("账户余额管理系统", () => {
  let testCustomerId: number;
  let testOrderId: number;

  beforeAll(async () => {
    // 创建测试客户
    testCustomerId = await db.createCustomer({
      name: "测试客户-余额管理",
      phone: "13800138000",
      wechatId: "test_account_balance",
      createdBy: 1,
    });
  });

  it("应该能够创建客户并初始化余额为0", async () => {
    const customer = await db.getCustomerById(testCustomerId);
    expect(customer).toBeDefined();
    expect(Number(customer!.accountBalance)).toBe(0);
  });

  it("应该能够为客户充值", async () => {
    const result = await db.rechargeCustomerAccount({
      customerId: testCustomerId,
      amount: 1000,
      notes: "测试充值",
      operatorId: 1,
      operatorName: "测试操作员",
    });

    expect(result.balanceBefore).toBe(0);
    expect(result.balanceAfter).toBe(1000);

    // 验证客户余额已更新
    const customer = await db.getCustomerById(testCustomerId);
    expect(Number(customer!.accountBalance)).toBe(1000);
  });

  it("应该能够记录充值流水", async () => {
    const transactions = await db.getCustomerTransactions(testCustomerId);
    expect(transactions.length).toBeGreaterThan(0);
    
    const rechargeTransaction = transactions.find((tx) => tx.type === "recharge");
    expect(rechargeTransaction).toBeDefined();
    expect(Number(rechargeTransaction!.amount)).toBe(1000);
    expect(Number(rechargeTransaction!.balanceBefore)).toBe(0);
    expect(Number(rechargeTransaction!.balanceAfter)).toBe(1000);
  });

  it("应该能够从账户余额扣款", async () => {
    // 先创建一个订单
    testOrderId = await db.createOrder({
      orderNo: "TEST-ACCOUNT-001",
      customerId: testCustomerId,
      customerName: "测试客户-余额管理",
      salesId: 1,
      paymentAmount: "300.00",
      courseAmount: "300.00",
    });

    // 执行扣款
    const result = await db.consumeCustomerAccount({
      customerId: testCustomerId,
      amount: 300,
      orderId: testOrderId,
      orderNo: "TEST-ACCOUNT-001",
      operatorId: 1,
      operatorName: "测试操作员",
    });

    expect(result.balanceBefore).toBe(1000);
    expect(result.balanceAfter).toBe(700);

    // 验证客户余额已更新
    const customer = await db.getCustomerById(testCustomerId);
    expect(Number(customer!.accountBalance)).toBe(700);
  });

  it("应该能够记录消费流水", async () => {
    const transactions = await db.getCustomerTransactions(testCustomerId);
    const consumeTransaction = transactions.find((tx) => tx.type === "consume");
    
    expect(consumeTransaction).toBeDefined();
    expect(Number(consumeTransaction!.amount)).toBe(-300);
    expect(Number(consumeTransaction!.balanceBefore)).toBe(1000);
    expect(Number(consumeTransaction!.balanceAfter)).toBe(700);
    expect(consumeTransaction!.relatedOrderNo).toBe("TEST-ACCOUNT-001");
  });

  it("余额不足时应该抛出异常", async () => {
    await expect(
      db.consumeCustomerAccount({
        customerId: testCustomerId,
        amount: 1000, // 当前余额只有700
        orderId: testOrderId,
        orderNo: "TEST-ACCOUNT-002",
        operatorId: 1,
        operatorName: "测试操作员",
      })
    ).rejects.toThrow("余额不足");
  });

  it("应该能够退款到账户余额", async () => {
    const result = await db.refundCustomerAccount({
      customerId: testCustomerId,
      amount: 300,
      orderId: testOrderId,
      orderNo: "TEST-ACCOUNT-001",
      operatorId: 1,
      operatorName: "测试操作员",
    });

    expect(result.balanceBefore).toBe(700);
    expect(result.balanceAfter).toBe(1000);

    // 验证客户余额已更新
    const customer = await db.getCustomerById(testCustomerId);
    expect(Number(customer!.accountBalance)).toBe(1000);
  });

  it("应该能够记录退款流水", async () => {
    const transactions = await db.getCustomerTransactions(testCustomerId);
    const refundTransaction = transactions.find((tx) => tx.type === "refund");
    
    expect(refundTransaction).toBeDefined();
    expect(Number(refundTransaction!.amount)).toBe(300);
    expect(Number(refundTransaction!.balanceBefore)).toBe(700);
    expect(Number(refundTransaction!.balanceAfter)).toBe(1000);
    expect(refundTransaction!.relatedOrderNo).toBe("TEST-ACCOUNT-001");
  });
});
