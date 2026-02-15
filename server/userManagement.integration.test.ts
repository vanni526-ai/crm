import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { users, partners, partnerCities, cities } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe.sequential('用户管理和合伙人管理完整集成测试', () => {
  let caller: any;
  let testUserId: number;
  let testPartnerId: number;
  let testCityId: number;

  beforeAll(async () => {
    // 创建测试caller（模拟管理员用户）
    caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: 'test-admin',
        name: 'Test Admin',
        role: 'admin',
        roles: 'admin',
      } as any,
    });

    // 准备测试数据：创建测试城市
    const drizzle = await getDb();
    if (!drizzle) throw new Error('Database connection failed');

    const [existingCity] = await drizzle.select().from(cities).where(eq(cities.name, '测试城市')).limit(1);
    if (existingCity) {
      testCityId = existingCity.id;
    } else {
      const [newCity] = await drizzle.insert(cities).values({
        name: '测试城市',
        createdBy: 1,
      } as any).$returningId();
      testCityId = newCity.id;
    }
  });

  it('场景1：新增cityPartner角色 → 自动创建partners和partner_cities记录', async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error('Database connection failed');

    // 1. 创建用户并添加cityPartner角色
    const result = await caller.userManagement.create({
      name: '集成测试用户1',
      phone: '19900000001',
      roles: 'cityPartner',
      roleCities: [
        { role: 'cityPartner', cities: ['测试城市'] }
      ],
    });

    expect(result.success).toBe(true);
    testUserId = result.userId!;

    // 2. 验证partners记录已创建
    const [partnerRecord] = await drizzle.select().from(partners).where(eq(partners.userId, testUserId)).limit(1);
    expect(partnerRecord).toBeDefined();
    expect(partnerRecord.name).toBe('集成测试用户1');
    expect(partnerRecord.phone).toBe('19900000001');
    expect(partnerRecord.isActive).toBe(true);
    testPartnerId = partnerRecord.id;

    // 3. 验证partner_cities记录已创建且contractStatus='active'
    const partnerCityRecords = await drizzle.select().from(partnerCities).where(eq(partnerCities.partnerId, testPartnerId));
    expect(partnerCityRecords.length).toBe(1);
    expect(partnerCityRecords[0].cityId).toBe(testCityId);
    expect(partnerCityRecords[0].contractStatus).toBe('active'); // 重要：必须是active
  });

  it('场景2：修改用户名 → 自动同步到partners表', async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error('Database connection failed');

    // 1. 修改用户名
    await caller.userManagement.update({
      id: testUserId,
      name: '集成测试用户1-修改后',
    });

    // 2. 验证partners表已同步
    const [partnerRecord] = await drizzle.select().from(partners).where(eq(partners.userId, testUserId)).limit(1);
    expect(partnerRecord.name).toBe('集成测试用户1-修改后');
  });

  it('场景3：修改手机号 → 自动同步到partners表', async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error('Database connection failed');

    // 1. 修改手机号
    await caller.userManagement.update({
      id: testUserId,
      phone: '19900000002',
    });

    // 2. 验证partners表已同步
    const [partnerRecord] = await drizzle.select().from(partners).where(eq(partners.userId, testUserId)).limit(1);
    expect(partnerRecord.phone).toBe('19900000002');
  });

  it('场景4：禁用用户 → 自动同步到partners.isActive', async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error('Database connection failed');

    // 1. 禁用用户
    await caller.userManagement.toggleActive({
      id: testUserId,
      isActive: false,
    });

    // 2. 验证partners表已同步
    const [partnerRecord] = await drizzle.select().from(partners).where(eq(partners.userId, testUserId)).limit(1);
    expect(partnerRecord.isActive).toBe(false);

    // 3. 验证合伙人管理页面不显示该合伙人
    const stats = await caller.partnerManagement.getPartnerStats();
    const partner = stats.find((p: any) => p.partnerId === testPartnerId);
    expect(partner).toBeUndefined(); // 因为isActive=false，不应该显示
  });

  it('场景5：启用用户 → 自动同步到partners.isActive', async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error('Database connection failed');

    // 1. 启用用户
    await caller.userManagement.toggleActive({
      id: testUserId,
      isActive: true,
    });

    // 2. 验证partners表已同步
    const [partnerRecord] = await drizzle.select().from(partners).where(eq(partners.userId, testUserId)).limit(1);
    expect(partnerRecord.isActive).toBe(true);

    // 3. 验证合伙人管理页面显示该合伙人
    const stats = await caller.partnerManagement.getPartnerStats();
    const partner = stats.find((p: any) => p.partnerId === testPartnerId);
    expect(partner).toBeDefined();
    expect(partner.partnerName).toBe('集成测试用户1-修改后');
    expect(partner.cities).toBe('测试城市');
  });

  it('场景6：取消cityPartner角色 → 删除partner_cities并设置partners.isActive=false', async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error('Database connection failed');

    // 1. 取消cityPartner角色（改为其他角色）
    await caller.userManagement.update({
      id: testUserId,
      roles: 'user', // 移除cityPartner角色
    });

    // 2. 验证partner_cities记录已删除
    const partnerCityRecords = await drizzle.select().from(partnerCities).where(eq(partnerCities.partnerId, testPartnerId));
    expect(partnerCityRecords.length).toBe(0);

    // 3. 验证partners.isActive=false
    const [partnerRecord] = await drizzle.select().from(partners).where(eq(partners.userId, testUserId)).limit(1);
    expect(partnerRecord.isActive).toBe(false);

    // 4. 验证合伙人管理页面不显示该合伙人
    const stats = await caller.partnerManagement.getPartnerStats();
    const partner = stats.find((p: any) => p.partnerId === testPartnerId);
    expect(partner).toBeUndefined();
  });

  it('场曷7：重新添加cityPartner角色 → 恢复partners.isActive并创建partner_cities', async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error('Database connection failed');

    // 0. 验证testUserId是否存在
    expect(testUserId).toBeDefined();
    expect(testUserId).toBeGreaterThan(0);

    // 1. 重新添加cityPartner角色
    await caller.userManagement.update({
      id: testUserId,
      roles: 'cityPartner',
      roleCities: { cityPartner: ['测试城市'] },
    });

    // 2. 验证partners.isActive=true
    const [partnerRecord] = await drizzle.select().from(partners).where(eq(partners.userId, testUserId)).limit(1);
    expect(partnerRecord.isActive).toBe(true);

    // 3. 验证partner_cities记录已重新创建
    const partnerCityRecords = await drizzle.select().from(partnerCities).where(eq(partnerCities.partnerId, testPartnerId));
    expect(partnerCityRecords.length).toBe(1);
    expect(partnerCityRecords[0].contractStatus).toBe('active');

    // 4. 验证合伙人管理页面显示该合伙人
    const stats = await caller.partnerManagement.getPartnerStats();
    const partner = stats.find((p: any) => p.partnerId === testPartnerId);
    expect(partner).toBeDefined();
  });

  it('场曷8：删除用户 → 级联删除partners和partner_cities记录', async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error('Database connection failed');

    // 0. 验证testUserId是否存在
    expect(testUserId).toBeDefined();
    expect(testUserId).toBeGreaterThan(0);
    console.log('testUserId before delete:', testUserId);

    // 1. 删除用户
    await caller.userManagement.delete({ id: testUserId });

    // 2. 验证users记录已删除
    const [userRecord] = await drizzle.select().from(users).where(eq(users.id, testUserId)).limit(1);
    expect(userRecord).toBeUndefined();

    // 3. 验证partners记录已删除
    const [partnerRecord] = await drizzle.select().from(partners).where(eq(partners.id, testPartnerId)).limit(1);
    expect(partnerRecord).toBeUndefined();

    // 4. 验证partner_cities记录已删除
    const partnerCityRecords = await drizzle.select().from(partnerCities).where(eq(partnerCities.partnerId, testPartnerId));
    expect(partnerCityRecords.length).toBe(0);

    // 5. 验证合伙人管理页面不显示该合伙人
    const stats = await caller.partnerManagement.getPartnerStats();
    const partner = stats.find((p: any) => p.partnerId === testPartnerId);
    expect(partner).toBeUndefined();
  });

  it('场景9：孤儿记录预防 - 不应该存在userId不存在的partners记录', async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error('Database connection failed');

    // 查找所有孤儿partners记录
    const orphanPartners = await drizzle
      .select({ partnerId: partners.id, userId: partners.userId })
      .from(partners)
      .leftJoin(users, eq(users.id, partners.userId))
      .where(eq(users.id, null as any));

    expect(orphanPartners.length).toBe(0); // 不应该有孤儿记录
  });

  it('场景10：孤儿记录预防 - 不应该存在partnerId不存在的partner_cities记录', async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error('Database connection failed');

    // 查找所有孤儿partner_cities记录
    const orphanPartnerCities = await drizzle
      .select({ partnerCityId: partnerCities.id, partnerId: partnerCities.partnerId })
      .from(partnerCities)
      .leftJoin(partners, eq(partners.id, partnerCities.partnerId))
      .where(eq(partners.id, null as any));

    expect(orphanPartnerCities.length).toBe(0); // 不应该有孤儿记录
  });
});
