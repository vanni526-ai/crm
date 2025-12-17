import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';

describe('数据看板统计功能', () => {
  let testOrderIds: number[] = [];
  let testCustomerId: number;

  beforeAll(async () => {
    // 创建测试客户
    testCustomerId = await db.createCustomer({
      name: '测试客户1',
      wechat: '微信1',
      phone: '13800138001',
      trafficSource: '微信',
      createdBy: 1,
    });

    // 创建测试订单
    const order1 = await db.createOrder({
      orderNo: 'DASHBOARD1',
      customerId: testCustomerId,
      customerName: '测试客户1',
      salesId: 1,
      salesPerson: '张三',
      trafficSource: '微信',
      paymentAmount: '1000',
      courseAmount: '1000',
      accountBalance: '500',
      teacherFee: '200',
      deliveryTeacher: '李老师',
      status: 'paid',
    });
    testOrderIds.push(order1);

    const order2 = await db.createOrder({
      orderNo: 'DASHBOARD2',
      customerId: testCustomerId,
      customerName: '测试客户2',
      salesId: 1,
      salesPerson: '李四',
      trafficSource: '抖音',
      paymentAmount: '2000',
      courseAmount: '2000',
      accountBalance: '1000',
      teacherFee: '300',
      deliveryTeacher: '王老师',
      status: 'paid',
    });
    testOrderIds.push(order2);
  });

  afterAll(async () => {
    // 清理测试数据
    for (const id of testOrderIds) {
      await db.deleteOrder(id);
    }
    await db.deleteCustomer(testCustomerId);
  });

  it('应该能获取交付老师月度统计', async () => {
    const stats = await db.getTeacherMonthlyStats();
    expect(Array.isArray(stats)).toBe(true);
    if (stats.length > 0) {
      expect(stats[0]).toHaveProperty('teacher');
      expect(stats[0]).toHaveProperty('classCount');
      expect(stats[0]).toHaveProperty('totalRevenue');
      expect(typeof stats[0].classCount).toBe('number');
      expect(typeof stats[0].totalRevenue).toBe('number');
    }
  });

  it('应该能获取流量来源月度统计', async () => {
    const stats = await db.getTrafficSourceMonthlyStats();
    expect(Array.isArray(stats)).toBe(true);
    if (stats.length > 0) {
      expect(stats[0]).toHaveProperty('source');
      expect(stats[0]).toHaveProperty('orderCount');
      expect(typeof stats[0].orderCount).toBe('number');
    }
  });

  it('应该能获取销售人员支付金额统计', async () => {
    const stats = await db.getSalesPersonPaymentStats();
    expect(Array.isArray(stats)).toBe(true);
    if (stats.length > 0) {
      expect(stats[0]).toHaveProperty('salesPerson');
      expect(stats[0]).toHaveProperty('totalPayment');
      expect(stats[0]).toHaveProperty('orderCount');
      expect(typeof stats[0].totalPayment).toBe('number');
      expect(typeof stats[0].orderCount).toBe('number');
    }
  });

  it('应该能获取客户账户余额排名', async () => {
    const ranking = await db.getCustomerBalanceRanking();
    expect(Array.isArray(ranking)).toBe(true);
    if (ranking.length > 0) {
      expect(ranking[0]).toHaveProperty('customerName');
      expect(ranking[0]).toHaveProperty('accountBalance');
      expect(typeof ranking[0].accountBalance).toBe('number');
      // 验证排序是降序
      if (ranking.length > 1) {
        expect(ranking[0].accountBalance).toBeGreaterThanOrEqual(ranking[1].accountBalance);
      }
    }
  });

  it('应该只返回前20名客户余额', async () => {
    const ranking = await db.getCustomerBalanceRanking();
    expect(ranking.length).toBeLessThanOrEqual(20);
  });
});
