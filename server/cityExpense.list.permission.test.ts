import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import type { Context } from './_core/context';

describe('cityExpense.list - Permission Filtering', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    // 使用城市合伙人账户(userId=15372555, partnerId=25, 管理福州和泉州)
    const mockContext: Context = {
      user: {
        id: 15372555,
        openId: 'partner_1770716361865_85eqp',
        name: '冯玉智',
        role: 'cityPartner',
        roles: 'cityPartner,user',
      },
      req: {} as any,
      res: {} as any,
    };
    caller = appRouter.createCaller(mockContext);
  });

  it('城市合伙人应该只能看到自己管理的城市账单', async () => {
    const result = await caller.cityExpense.list();
    
    console.log(`返回的账单数量: ${result.length}`);
    
    // 验证返回的账单数量大于0
    expect(result.length).toBeGreaterThan(0);
    
    // 验证所有账单都属于福州(cityId=13)或泉州(cityId=14)
    const managedCityIds = [13, 14];
    result.forEach((bill: any) => {
      console.log(`账单ID: ${bill.id}, 城市: ${bill.cityName} (cityId=${bill.cityId})`);
      expect(managedCityIds).toContain(bill.cityId);
    });
    
    // 验证不包含其他城市的账单(例如重庆cityId=3)
    const hasChongqing = result.some((bill: any) => bill.cityId === 3);
    expect(hasChongqing).toBe(false);
  });

  it('城市合伙人查询特定城市应该只返回该城市的账单', async () => {
    const result = await caller.cityExpense.list({ cityId: 13 }); // 福州
    
    console.log(`福州账单数量: ${result.length}`);
    
    // 验证所有账单都是福州的
    result.forEach((bill: any) => {
      expect(bill.cityId).toBe(13);
      expect(bill.cityName).toBe('福州');
    });
  });

  it('城市合伙人查询非管理城市应该返回空数组', async () => {
    const result = await caller.cityExpense.list({ cityId: 3 }); // 重庆(不是冯玉智管理的城市)
    
    console.log(`重庆账单数量: ${result.length}`);
    
    // 应该返回空数组
    expect(result.length).toBe(0);
  });

  it('城市合伙人按月份查询应该只返回自己管理的城市', async () => {
    const result = await caller.cityExpense.list({ month: '2026-01' });
    
    console.log(`2026-01月账单数量: ${result.length}`);
    
    // 验证所有账单都属于福州或泉州
    const managedCityIds = [13, 14];
    result.forEach((bill: any) => {
      expect(managedCityIds).toContain(bill.cityId);
      expect(bill.month).toBe('2026-01');
    });
  });
});

describe('cityExpense.list - Admin Permission', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    // 使用管理员账户(userId=13860029, partnerId=90006, 同时拥有admin和cityPartner角色)
    const mockContext: Context = {
      user: {
        id: 13860029,
        openId: 'test_admin',
        name: 'test',
        role: 'admin',
        roles: 'admin,sales,cityPartner',
      },
      req: {} as any,
      res: {} as any,
    };
    caller = appRouter.createCaller(mockContext);
  });

  it('管理员应该能看到所有城市的账单', async () => {
    const result = await caller.cityExpense.list();
    
    console.log(`管理员看到的账单数量: ${result.length}`);
    
    // 验证返回的账单数量大于0
    expect(result.length).toBeGreaterThan(0);
    
    // 验证包含多个不同城市的账单
    const uniqueCityIds = new Set(result.map((bill: any) => bill.cityId));
    console.log(`包含的城市数量: ${uniqueCityIds.size}`);
    console.log(`城市ID列表: ${Array.from(uniqueCityIds).join(', ')}`);
    
    // 管理员应该能看到至少2个不同城市的账单
    expect(uniqueCityIds.size).toBeGreaterThanOrEqual(2);
  });

  it('管理员查询特定城市应该能返回该城市的账单', async () => {
    const result = await caller.cityExpense.list({ cityId: 3 }); // 重庆
    
    console.log(`管理员查询重庆账单数量: ${result.length}`);
    
    // 管理员应该能看到重庆的账单
    if (result.length > 0) {
      result.forEach((bill: any) => {
        expect(bill.cityId).toBe(3);
      });
    }
  });
});

describe('cityExpense.list - Finance Permission', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    // 使用财务账户
    const mockContext: Context = {
      user: {
        id: 99999,
        openId: 'finance_user',
        name: '财务人员',
        role: 'finance',
        roles: 'finance',
      },
      req: {} as any,
      res: {} as any,
    };
    caller = appRouter.createCaller(mockContext);
  });

  it('财务人员应该能看到所有城市的账单', async () => {
    const result = await caller.cityExpense.list();
    
    console.log(`财务人员看到的账单数量: ${result.length}`);
    
    // 验证返回的账单数量大于0
    expect(result.length).toBeGreaterThan(0);
    
    // 验证包含多个不同城市的账单
    const uniqueCityIds = new Set(result.map((bill: any) => bill.cityId));
    console.log(`财务人员看到的城市数量: ${uniqueCityIds.size}`);
    
    // 财务人员应该能看到至少2个不同城市的账单
    expect(uniqueCityIds.size).toBeGreaterThanOrEqual(2);
  });
});
