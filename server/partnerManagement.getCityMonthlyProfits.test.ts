import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';

describe('partnerManagement.getCityMonthlyProfits', () => {
  let partnerId: number;
  let cityId: number;

  beforeAll(async () => {
    // 使用partnerId=25 (冯玉智), cityId=13 (福州)
    partnerId = 25;
    cityId = 13;
  });

  it('应该能够查询合伙人在所有城市的分红记录', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: 'test', name: 'Test User', role: 'admin' },
    });

    const result = await caller.partnerManagement.getCityMonthlyProfits({
      partnerId,
    });

    expect(result).toHaveProperty('records');
    expect(result).toHaveProperty('totalAmount');
    expect(result).toHaveProperty('count');
    expect(Array.isArray(result.records)).toBe(true);
    expect(typeof result.totalAmount).toBe('string');
    expect(typeof result.count).toBe('number');
    
    // partnerId=25管理福州和泉州，应该有记录
    expect(result.count).toBeGreaterThan(0);
  });

  it('应该能够查询合伙人在指定城市的分红记录', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: 'test', name: 'Test User', role: 'admin' },
    });

    const result = await caller.partnerManagement.getCityMonthlyProfits({
      partnerId,
      cityId,
    });

    expect(result).toHaveProperty('records');
    // 所有记录的cityId应该是指定的城市
    result.records.forEach(record => {
      expect(record.cityId).toBe(cityId);
      expect(record.cityName).toBe('福州');
    });
  });

  it('应该能够按时间范围筛选分红记录', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: 'test', name: 'Test User', role: 'admin' },
    });

    const result = await caller.partnerManagement.getCityMonthlyProfits({
      partnerId,
      startDate: '2026-01',
      endDate: '2026-12',
    });

    expect(result).toHaveProperty('records');
    // 所有记录的月份应该在指定范围内
    result.records.forEach(record => {
      expect(record.month >= '2026-01').toBe(true);
      expect(record.month <= '2026-12').toBe(true);
    });
  });

  it('应该正确计算分红总金额', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: 'test', name: 'Test User', role: 'admin' },
    });

    const result = await caller.partnerManagement.getCityMonthlyProfits({
      partnerId,
    });

    // 手动计算总金额验证
    const manualTotal = result.records.reduce((sum, record) => {
      return sum + Number(record.partnerShare || 0);
    }, 0);

    expect(result.totalAmount).toBe(manualTotal.toFixed(2));
    expect(result.count).toBe(result.records.length);
  });

  it('应该返回城市信息和月份信息', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: 'test', name: 'Test User', role: 'admin' },
    });

    const result = await caller.partnerManagement.getCityMonthlyProfits({
      partnerId,
    });

    // 检查返回的记录是否包含必要字段
    if (result.records.length > 0) {
      result.records.forEach(record => {
        expect(record).toHaveProperty('cityId');
        expect(record).toHaveProperty('cityName');
        expect(record).toHaveProperty('month');
        expect(record).toHaveProperty('partnerShare');
        expect(record).toHaveProperty('totalExpense');
      });
    }
  });

  it('应该正确处理没有关联城市的合伙人', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: 'test', name: 'Test User', role: 'admin' },
    });

    // 使用一个不存在的partnerId
    const result = await caller.partnerManagement.getCityMonthlyProfits({
      partnerId: 99999,
    });

    expect(result.records).toEqual([]);
    expect(result.totalAmount).toBe('0.00');
    expect(result.count).toBe(0);
  });

  it('应该验证福州和泉州的分红数据', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: 'test', name: 'Test User', role: 'admin' },
    });

    // 查询福州的分红
    const fuzhou = await caller.partnerManagement.getCityMonthlyProfits({
      partnerId: 25,
      cityId: 13,
    });

    // 查询泉州的分红
    const quanzhou = await caller.partnerManagement.getCityMonthlyProfits({
      partnerId: 25,
      cityId: 14,
    });

    // 验证福州有分红记录
    expect(fuzhou.count).toBeGreaterThan(0);
    expect(Number(fuzhou.totalAmount)).toBeGreaterThan(0);

    // 验证泉州有分红记录
    expect(quanzhou.count).toBeGreaterThan(0);
    expect(Number(quanzhou.totalAmount)).toBeGreaterThan(0);

    console.log(`福州分红: ¥${fuzhou.totalAmount}`);
    console.log(`泉州分红: ¥${quanzhou.totalAmount}`);
  });
});
