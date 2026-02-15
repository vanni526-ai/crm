import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';

describe('partnerManagement.getProfitRecordsByCity', () => {
  let partnerId: number;
  let cityId: number;

  beforeAll(async () => {
    // 获取测试数据: partnerId=25 (冯玉智), cityId=13 (福州)
    partnerId = 25;
    cityId = 13;
  });

  it('应该能够查询合伙人在指定城市的分红记录', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: 'test', name: 'Test User', role: 'admin' },
    });

    const result = await caller.partnerManagement.getProfitRecordsByCity({
      partnerId,
      cityId,
    });

    expect(result).toHaveProperty('records');
    expect(result).toHaveProperty('totalAmount');
    expect(result).toHaveProperty('count');
    expect(Array.isArray(result.records)).toBe(true);
    expect(typeof result.totalAmount).toBe('string');
    expect(typeof result.count).toBe('number');
  });

  it('应该能够按状态筛选分红记录', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: 'test', name: 'Test User', role: 'admin' },
    });

    const result = await caller.partnerManagement.getProfitRecordsByCity({
      partnerId,
      cityId,
      status: 'completed',
    });

    expect(result).toHaveProperty('records');
    // 所有记录的状态应该是completed
    result.records.forEach(record => {
      expect(record.status).toBe('completed');
    });
  });

  it('应该能够按时间范围筛选分红记录', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: 'test', name: 'Test User', role: 'admin' },
    });

    const result = await caller.partnerManagement.getProfitRecordsByCity({
      partnerId,
      cityId,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });

    expect(result).toHaveProperty('records');
    // 所有记录的转账日期应该在指定范围内
    result.records.forEach(record => {
      const transferDate = new Date(record.transferDate);
      expect(transferDate >= new Date('2026-01-01')).toBe(true);
      expect(transferDate <= new Date('2026-12-31')).toBe(true);
    });
  });

  it('应该正确计算分红总金额', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: 'test', name: 'Test User', role: 'admin' },
    });

    const result = await caller.partnerManagement.getProfitRecordsByCity({
      partnerId,
      cityId,
    });

    // 手动计算总金额验证
    const manualTotal = result.records.reduce((sum, record) => {
      return sum + Number(record.amount || 0);
    }, 0);

    expect(result.totalAmount).toBe(manualTotal.toFixed(2));
    expect(result.count).toBe(result.records.length);
  });

  it('应该返回城市信息', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: 'test', name: 'Test User', role: 'admin' },
    });

    const result = await caller.partnerManagement.getProfitRecordsByCity({
      partnerId,
      cityId,
    });

    // 检查返回的记录是否包含城市信息
    if (result.records.length > 0) {
      result.records.forEach(record => {
        expect(record).toHaveProperty('cityId');
        expect(record).toHaveProperty('cityName');
      });
    }
  });

  it('应该支持不指定cityId查询所有城市的分红', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: 'test', name: 'Test User', role: 'admin' },
    });

    const result = await caller.partnerManagement.getProfitRecordsByCity({
      partnerId,
      // 不指定cityId
    });

    expect(result).toHaveProperty('records');
    expect(result).toHaveProperty('totalAmount');
    expect(result).toHaveProperty('count');
  });
});
