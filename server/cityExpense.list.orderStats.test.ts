import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createTestContext(userId: number, roles: string = 'user'): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: 'password',
    role: roles.split(',')[0] as any,
    roles: roles,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {} as any,
    res: {} as any,
  };
}

describe('cityExpense.list - 订单统计功能测试', () => {
  it('应该返回重庆2026-01的订单数量和销售额', async () => {
    const ctx = createTestContext(13860029, 'admin,sales,cityPartner'); // test用户(partnerId=90006,管理重庆)
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.cityExpense.list({
      cityId: 3,      // 重庆
      month: '2026-01'
    });
    
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    
    const chongqingBill = result[0];
    expect(chongqingBill.cityName).toBe('重庆');
    expect(chongqingBill.month).toBe('2026-01');
    
    // 验证订单数量字段存在
    expect(chongqingBill).toHaveProperty('orderCount');
    expect(typeof chongqingBill.orderCount).toBe('number');
    
    // 验证销售额字段存在
    expect(chongqingBill).toHaveProperty('salesAmount');
    expect(typeof chongqingBill.salesAmount).toBe('string');
    
    // 验证合伙人分红字段存在
    expect(chongqingBill).toHaveProperty('partnerDividend');
    expect(typeof chongqingBill.partnerDividend).toBe('string');
    
    console.log('重庆2026-01账单数据:');
    console.log(`  订单数量: ${chongqingBill.orderCount}`);
    console.log(`  销售额: ¥${chongqingBill.salesAmount}`);
    console.log(`  合伙人承担: ¥${chongqingBill.partnerShare}`);
    console.log(`  合同后付款: ¥${chongqingBill.deferredPayment}`);
    console.log(`  合伙人分红: ¥${chongqingBill.partnerDividend}`);
  });
  
  it('应该正确统计重庆的订单数量(预期5个订单)', async () => {
    const ctx = createTestContext(13860029, 'admin,sales,cityPartner');
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.cityExpense.list({
      cityId: 3,
      month: '2026-01'
    });
    
    expect(result.length).toBeGreaterThan(0);
    const chongqingBill = result[0];
    
    // 根据数据库查询,重庆2026-01有5个订单
    expect(chongqingBill.orderCount).toBe(5);
  });
  
  it('应该正确统计重庆的销售额(预期￥20845.00)', async () => {
    const ctx = createTestContext(13860029, 'admin,sales,cityPartner');
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.cityExpense.list({
      cityId: 3,
      month: '2026-01'
    });
    
    expect(result.length).toBeGreaterThan(0);
    const chongqingBill = result[0];
    
    // 根据数据库查询,重庆2026-01销售额为￥20845.00
    expect(chongqingBill.salesAmount).toBe('20845.00');
  });
  
  it('非管理城市应该返回空数组', async () => {
    const ctx = createTestContext(13860029, 'cityPartner'); // test用户只管理重庆
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.cityExpense.list({
      cityId: 13,     // 福州(不是test用户管理的城市)
      month: '2026-01'
    });
    
    // 权限过滤后应该返回空数组
    expect(result).toEqual([]);
  });
  
  it('管理员应该能查看所有城市的订单数据', async () => {
    const ctx = createTestContext(1, 'admin'); // 假设userID=1是管理员
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.cityExpense.list({
      month: '2026-01'
    });
    
    // 管理员应该能看到多个城市的数据
    expect(result.length).toBeGreaterThan(1);
    
    // 所有账单都应该有订单统计字段
    result.forEach(bill => {
      expect(bill).toHaveProperty('orderCount');
      expect(bill).toHaveProperty('salesAmount');
      expect(bill).toHaveProperty('partnerDividend');
    });
  });
});
