import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { users, partners } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('合伙人自动同步机制', () => {
  const caller = appRouter.createCaller({
    user: { id: 1, openId: 'test', name: 'Test Admin', email: 'admin@test.com', role: 'admin', isActive: true },
  });
  let testUserId: number;
  let testPartnerId: number;

  beforeAll(async () => {
    // 清理测试数据
    const drizzle = await getDb();
    if (!drizzle) throw new Error('数据库连接失败');
  });

  it('创建城市合伙人角色用户时应自动在partners表创建记录', async () => {
    const testPhone = `139${Date.now().toString().slice(-8)}`;
    
    // 创建城市合伙人用户
    const result = await caller.userManagement.create({
      name: '测试合伙人',
      phone: testPhone,
      password: '123456',
      role: 'cityPartner',
      roles: 'cityPartner',
    });

    expect(result.success).toBe(true);

    // 验证用户已创建
    const drizzle = await getDb();
    const [user] = await drizzle!.select().from(users).where(eq(users.phone, testPhone));
    expect(user).toBeDefined();
    expect(user.role).toBe('cityPartner');
    testUserId = user.id;

    // 验证partners表中已自动创建记录
    const [partner] = await drizzle!.select().from(partners).where(eq(partners.userId, testUserId));
    expect(partner).toBeDefined();
    expect(partner.name).toBe('测试合伙人');
    expect(partner.phone).toBe(testPhone);
    expect(partner.profitRatio).toBe('0.30'); // 默认30%
    testPartnerId = partner.id;
  });

  it('创建非城市合伙人角色用户时不应在partners表创建记录', async () => {
    const testPhone = `138${Date.now().toString().slice(-8)}`;
    
    // 创建销售用户
    const result = await caller.userManagement.create({
      name: '测试销售',
      phone: testPhone,
      password: '123456',
      role: 'sales',
      roles: 'sales',
    });

    expect(result.success).toBe(true);

    // 验证用户已创建
    const drizzle = await getDb();
    const [user] = await drizzle!.select().from(users).where(eq(users.phone, testPhone));
    expect(user).toBeDefined();
    expect(user.role).toBe('sales');

    // 验证partners表中没有创建记录
    const partnerRecords = await drizzle!.select().from(partners).where(eq(partners.userId, user.id));
    expect(partnerRecords.length).toBe(0);
  });

  it('验证批量创建的13个合伙人数据完整性', async () => {
    const drizzle = await getDb();
    
    // 查询所有合伙人
    const allPartners = await drizzle!.select().from(partners);
    
    // 应该至少有13个合伙人（不包括测试数据）
    expect(allPartners.length).toBeGreaterThanOrEqual(13);
    
    // 验证特定合伙人
    const zhangXueting = allPartners.find(p => p.name === '张雪婷');
    expect(zhangXueting).toBeDefined();
    expect(zhangXueting!.phone).toBe('13800000003');
    
    const fengYuzhi = allPartners.find(p => p.name === '冯玉智');
    expect(fengYuzhi).toBeDefined();
    expect(fengYuzhi!.phone).toBe('13800000010');
  });


});
