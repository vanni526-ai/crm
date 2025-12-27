import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getCityFinancialStats } from './db';
import * as db from './db';

describe('城市财务统计功能测试', () => {
  let testOrderIds: number[] = [];

  beforeAll(async () => {
    // 创建测试订单数据
    const testOrders = [
      {
        orderNo: 'TEST-CITY-001',
        customerName: '测试客户1',
        salesId: 1,
        salesPerson: '测试销售',
        deliveryCity: '北京',
        paymentAmount: '1000.00',
        courseAmount: '1000.00',
        teacherFee: '300.00',
        transportFee: '50.00',
        otherFee: '20.00',
        partnerFee: '0.00',
        classDate: new Date().toISOString().split('T')[0],
        status: 'completed' as const,
      },
      {
        orderNo: 'TEST-CITY-002',
        customerName: '测试客户2',
        salesId: 1,
        salesPerson: '测试销售',
        deliveryCity: '北京',
        paymentAmount: '1500.00',
        courseAmount: '1500.00',
        teacherFee: '400.00',
        transportFee: '60.00',
        otherFee: '30.00',
        partnerFee: '10.00',
        classDate: new Date().toISOString().split('T')[0],
        status: 'completed' as const,
      },
      {
        orderNo: 'TEST-CITY-003',
        customerName: '测试客户3',
        salesId: 1,
        salesPerson: '测试销售',
        deliveryCity: '上海',
        paymentAmount: '2000.00',
        courseAmount: '2000.00',
        teacherFee: '500.00',
        transportFee: '80.00',
        otherFee: '40.00',
        partnerFee: '20.00',
        classDate: new Date().toISOString().split('T')[0],
        status: 'completed' as const,
      },
      {
        orderNo: 'TEST-CITY-004',
        customerName: '测试客户4',
        salesId: 1,
        salesPerson: '测试销售',
        deliveryCity: '广州',
        paymentAmount: '1200.00',
        courseAmount: '1200.00',
        teacherFee: '350.00',
        transportFee: '55.00',
        otherFee: '25.00',
        partnerFee: '0.00',
        classDate: new Date().toISOString().split('T')[0],
        status: 'completed' as const,
      },
      {
        orderNo: 'TEST-CITY-005',
        customerName: '测试客户5',
        salesId: 1,
        salesPerson: '测试销售',
        deliveryCity: null, // 测试未知城市
        paymentAmount: '800.00',
        courseAmount: '800.00',
        teacherFee: '200.00',
        transportFee: '40.00',
        otherFee: '10.00',
        partnerFee: '0.00',
        classDate: new Date().toISOString().split('T')[0],
        status: 'completed' as const,
      },
    ];

    for (const order of testOrders) {
      const result = await db.createOrder(order);
      testOrderIds.push(result.id);
    }
  });

  afterAll(async () => {
    // 清理测试数据
    for (const id of testOrderIds) {
      await db.deleteOrder(id);
    }
  });

  it('应该正确按城市聚合统计订单数据', async () => {
    const stats = await getCityFinancialStats();
    
    // 验证返回数据结构
    expect(Array.isArray(stats)).toBe(true);
    expect(stats.length).toBeGreaterThan(0);

    // 查找北京的统计数据
    const beijingStats = stats.find(s => s.city === '北京');
    expect(beijingStats).toBeDefined();
    
    if (beijingStats) {
      // 验证北京的订单数量(至少有2个测试订单)
      expect(beijingStats.orderCount).toBeGreaterThanOrEqual(2);
      
      // 验证销售额计算正确(1000 + 1500 = 2500)
      expect(beijingStats.totalRevenue).toBeGreaterThanOrEqual(2500);
      
      // 验证费用计算
      expect(beijingStats.teacherFee).toBeGreaterThanOrEqual(700); // 300 + 400
      expect(beijingStats.transportFee).toBeGreaterThanOrEqual(110); // 50 + 60
      
      // 验证利润计算
      expect(beijingStats.profit).toBe(
        beijingStats.totalRevenue - beijingStats.totalExpense
      );
      
      // 验证利润率计算
      const expectedProfitMargin = (beijingStats.profit / beijingStats.totalRevenue) * 100;
      expect(beijingStats.profitMargin).toBeCloseTo(expectedProfitMargin, 2);
    }
  });

  it('应该正确处理未知城市的订单', async () => {
    const stats = await getCityFinancialStats();
    
    // 查找"未知城市"的统计数据
    const unknownCityStats = stats.find(s => s.city === '未知城市');
    expect(unknownCityStats).toBeDefined();
    
    if (unknownCityStats) {
      // 验证至少有1个测试订单
      expect(unknownCityStats.orderCount).toBeGreaterThanOrEqual(1);
      expect(unknownCityStats.totalRevenue).toBeGreaterThanOrEqual(800);
    }
  });

  it('应该按销售额降序排列城市', async () => {
    const stats = await getCityFinancialStats();
    
    // 验证排序
    for (let i = 0; i < stats.length - 1; i++) {
      expect(stats[i].totalRevenue).toBeGreaterThanOrEqual(stats[i + 1].totalRevenue);
    }
  });

  it('应该正确支持时间范围筛选 - 本月', async () => {
    const stats = await getCityFinancialStats('thisMonth');
    
    // 验证返回数据
    expect(Array.isArray(stats)).toBe(true);
    
    // 由于测试订单的classDate是今天,应该能在本月统计中找到
    const beijingStats = stats.find(s => s.city === '北京');
    expect(beijingStats).toBeDefined();
    
    if (beijingStats) {
      expect(beijingStats.orderCount).toBeGreaterThanOrEqual(2);
    }
  });

  it('应该正确支持时间范围筛选 - 本季度', async () => {
    const stats = await getCityFinancialStats('thisQuarter');
    
    // 验证返回数据
    expect(Array.isArray(stats)).toBe(true);
    
    // 由于测试订单的classDate是今天,应该能在本季度统计中找到
    const beijingStats = stats.find(s => s.city === '北京');
    expect(beijingStats).toBeDefined();
  });

  it('应该正确支持时间范围筛选 - 本年', async () => {
    const stats = await getCityFinancialStats('thisYear');
    
    // 验证返回数据
    expect(Array.isArray(stats)).toBe(true);
    
    // 由于测试订单的classDate是今天,应该能在本年统计中找到
    const beijingStats = stats.find(s => s.city === '北京');
    expect(beijingStats).toBeDefined();
  });

  it('应该正确计算所有费用类型的总和', async () => {
    const stats = await getCityFinancialStats();
    
    const shanghaiStats = stats.find(s => s.city === '上海');
    expect(shanghaiStats).toBeDefined();
    
    if (shanghaiStats) {
      // 验证总费用 = 老师费用 + 车费 + 其他费用 + 合伙人费用
      const expectedTotalExpense = 
        shanghaiStats.teacherFee + 
        shanghaiStats.transportFee + 
        shanghaiStats.otherFee + 
        shanghaiStats.partnerFee;
      
      expect(shanghaiStats.totalExpense).toBeCloseTo(expectedTotalExpense, 2);
    }
  });

  it('应该正确处理零费用的情况', async () => {
    const stats = await getCityFinancialStats();
    
    // 所有城市的费用字段都应该是数字,不应该是null或undefined
    stats.forEach(stat => {
      expect(typeof stat.teacherFee).toBe('number');
      expect(typeof stat.transportFee).toBe('number');
      expect(typeof stat.otherFee).toBe('number');
      expect(typeof stat.partnerFee).toBe('number');
      expect(typeof stat.totalExpense).toBe('number');
      expect(typeof stat.profit).toBe('number');
      expect(typeof stat.profitMargin).toBe('number');
    });
  });
});
