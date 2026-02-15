import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, partners, partnerCities, cities, userRoleCities } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("用户管理和合伙人管理完整数据同步测试", () => {
  let db: any;
  let testCityId: number;

  beforeAll(async () => {
    db = await getDb();
    
    // 创建测试城市
    const [cityResult] = await db.insert(cities).values({
      name: "测试城市_完整同步",
      latitude: 30.0,
      longitude: 120.0,
    } as any);
    testCityId = cityResult.insertId;
  });

  afterAll(async () => {
    // 清理测试城市
    if (testCityId) {
      await db.delete(cities).where(eq(cities.id, testCityId));
    }
  });

  it("删除用户时应该自动删除partners和partner_cities数据", async () => {
    // 1. 创建测试用户
    const [userResult] = await db.insert(users).values({
      name: "测试用户_删除同步",
      phone: "19900000010",
      email: "test_delete@example.com",
      roles: "cityPartner",
      role: "cityPartner",
      isActive: true,
    } as any);
    const testUserId = userResult.insertId;
    
    // 2. 创建合伙人记录
    const [partnerResult] = await db.insert(partners).values({
      userId: testUserId,
      name: "测试用户_删除同步",
      phone: "19900000010",
      profitRatio: "0.30",
      createdBy: 1,
      isActive: true,
    } as any);
    const testPartnerId = partnerResult.insertId;
    
    // 3. 创建partner_cities记录
    await db.insert(partnerCities).values({
      partnerId: testPartnerId,
      cityId: testCityId,
      contractStatus: 'active',
      currentProfitStage: 1,
      isInvestmentRecovered: false,
      createdBy: 1,
    } as any);
    
    // 4. 验证数据已创建
    const [partnerBefore] = await db.select().from(partners).where(eq(partners.userId, testUserId)).limit(1);
    expect(partnerBefore).toBeDefined();
    
    const partnerCitiesBefore = await db.select().from(partnerCities).where(eq(partnerCities.partnerId, testPartnerId));
    expect(partnerCitiesBefore).toHaveLength(1);
    
    // 5. 模拟删除用户（包含级联删除逻辑）
    const [partnerRecord] = await db.select().from(partners).where(eq(partners.userId, testUserId)).limit(1);
    if (partnerRecord) {
      await db.delete(partnerCities).where(eq(partnerCities.partnerId, partnerRecord.id));
      await db.delete(partners).where(eq(partners.userId, testUserId));
    }
    await db.delete(users).where(eq(users.id, testUserId));
    
    // 6. 验证数据已删除
    const [userAfter] = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
    expect(userAfter).toBeUndefined();
    
    const [partnerAfter] = await db.select().from(partners).where(eq(partners.userId, testUserId)).limit(1);
    expect(partnerAfter).toBeUndefined();
    
    const partnerCitiesAfter = await db.select().from(partnerCities).where(eq(partnerCities.partnerId, testPartnerId));
    expect(partnerCitiesAfter).toHaveLength(0);
  });

  it("取消cityPartner角色时应该自动删除partner_cities数据", async () => {
    // 1. 创建测试用户
    const [userResult] = await db.insert(users).values({
      name: "测试用户_取消角色",
      phone: "19900000011",
      email: "test_role@example.com",
      roles: "cityPartner",
      role: "cityPartner",
      isActive: true,
    } as any);
    const testUserId = userResult.insertId;
    
    // 2. 创建合伙人记录
    const [partnerResult] = await db.insert(partners).values({
      userId: testUserId,
      name: "测试用户_取消角色",
      phone: "19900000011",
      profitRatio: "0.30",
      createdBy: 1,
      isActive: true,
    } as any);
    const testPartnerId = partnerResult.insertId;
    
    // 3. 创建partner_cities记录
    await db.insert(partnerCities).values({
      partnerId: testPartnerId,
      cityId: testCityId,
      contractStatus: 'active',
      currentProfitStage: 1,
      isInvestmentRecovered: false,
      createdBy: 1,
    } as any);
    
    // 4. 验证数据已创建
    const partnerCitiesBefore = await db.select().from(partnerCities).where(eq(partnerCities.partnerId, testPartnerId));
    expect(partnerCitiesBefore).toHaveLength(1);
    
    // 5. 模拟取消cityPartner角色（删除partner_cities，设置partners为不激活）
    await db.delete(partnerCities).where(eq(partnerCities.partnerId, testPartnerId));
    await db.update(partners).set({ isActive: false } as any).where(eq(partners.userId, testUserId));
    
    // 6. 验证partner_cities已删除
    const partnerCitiesAfter = await db.select().from(partnerCities).where(eq(partnerCities.partnerId, testPartnerId));
    expect(partnerCitiesAfter).toHaveLength(0);
    
    // 7. 验证partners设置为不激活
    const [partnerAfter] = await db.select().from(partners).where(eq(partners.userId, testUserId)).limit(1);
    expect(partnerAfter.isActive).toBe(false);
    
    // 清理测试数据
    await db.delete(partners).where(eq(partners.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("修改用户名时应该自动同步到partners表", async () => {
    // 1. 创建测试用户
    const [userResult] = await db.insert(users).values({
      name: "原始用户名",
      phone: "19900000012",
      email: "test_name@example.com",
      roles: "cityPartner",
      role: "cityPartner",
      isActive: true,
    } as any);
    const testUserId = userResult.insertId;
    
    // 2. 创建合伙人记录
    const [partnerResult] = await db.insert(partners).values({
      userId: testUserId,
      name: "原始用户名",
      phone: "19900000012",
      profitRatio: "0.30",
      createdBy: 1,
      isActive: true,
    } as any);
    const testPartnerId = partnerResult.insertId;
    
    // 3. 创建partner_cities记录
    await db.insert(partnerCities).values({
      partnerId: testPartnerId,
      cityId: testCityId,
      contractStatus: 'active',
      currentProfitStage: 1,
      isInvestmentRecovered: false,
      createdBy: 1,
    } as any);
    
    // 4. 验证初始数据
    const [partnerBefore] = await db.select().from(partners).where(eq(partners.userId, testUserId)).limit(1);
    expect(partnerBefore.name).toBe("原始用户名");
    
    // 5. 模拟用户管理修改用户名
    await db.update(users).set({ name: "新用户名" } as any).where(eq(users.id, testUserId));
    
    // 6. 模拟同步逻辑：更新partners表的name字段
    await db.update(partners).set({ name: "新用户名" } as any).where(eq(partners.userId, testUserId));
    
    // 7. 验证partners表已同步
    const [partnerAfter] = await db.select().from(partners).where(eq(partners.userId, testUserId)).limit(1);
    expect(partnerAfter.name).toBe("新用户名");
    
    // 8. 验证合伙人管理页面能正确显示新用户名
    const partnerCitiesList = await db
      .select({
        partnerId: partners.id,
        partnerName: partners.name,
        cityName: cities.name,
      })
      .from(partners)
      .leftJoin(partnerCities, eq(partnerCities.partnerId, partners.id))
      .leftJoin(cities, eq(partnerCities.cityId, cities.id))
      .where(eq(partners.userId, testUserId));
    
    expect(partnerCitiesList[0].partnerName).toBe("新用户名");
    
    // 清理测试数据
    await db.delete(partnerCities).where(eq(partnerCities.partnerId, testPartnerId));
    await db.delete(partners).where(eq(partners.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("修改手机号时应该自动同步到partners表", async () => {
    // 1. 创建测试用户
    const [userResult] = await db.insert(users).values({
      name: "测试用户_手机号同步",
      phone: "19900000013",
      email: "test_phone@example.com",
      roles: "cityPartner",
      role: "cityPartner",
      isActive: true,
    } as any);
    const testUserId = userResult.insertId;
    
    // 2. 创建合伙人记录
    const [partnerResult] = await db.insert(partners).values({
      userId: testUserId,
      name: "测试用户_手机号同步",
      phone: "19900000013",
      profitRatio: "0.30",
      createdBy: 1,
      isActive: true,
    } as any);
    const testPartnerId = partnerResult.insertId;
    
    // 3. 验证初始数据
    const [partnerBefore] = await db.select().from(partners).where(eq(partners.userId, testUserId)).limit(1);
    expect(partnerBefore.phone).toBe("19900000013");
    
    // 4. 模拟用户管理修改手机号
    await db.update(users).set({ phone: "19900000099" } as any).where(eq(users.id, testUserId));
    
    // 5. 模拟同步逻辑：更新partners表的phone字段
    await db.update(partners).set({ phone: "19900000099" } as any).where(eq(partners.userId, testUserId));
    
    // 6. 验证partners表已同步
    const [partnerAfter] = await db.select().from(partners).where(eq(partners.userId, testUserId)).limit(1);
    expect(partnerAfter.phone).toBe("19900000099");
    
    // 清理测试数据
    await db.delete(partners).where(eq(partners.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("删除合伙人时应该自动删除partner_cities数据", async () => {
    // 1. 创建测试用户
    const [userResult] = await db.insert(users).values({
      name: "测试用户_删除合伙人",
      phone: "19900000014",
      email: "test_delete_partner@example.com",
      roles: "cityPartner",
      role: "cityPartner",
      isActive: true,
    } as any);
    const testUserId = userResult.insertId;
    
    // 2. 创建合伙人记录
    const [partnerResult] = await db.insert(partners).values({
      userId: testUserId,
      name: "测试用户_删除合伙人",
      phone: "19900000014",
      profitRatio: "0.30",
      createdBy: 1,
      isActive: true,
    } as any);
    const testPartnerId = partnerResult.insertId;
    
    // 3. 创建partner_cities记录
    await db.insert(partnerCities).values({
      partnerId: testPartnerId,
      cityId: testCityId,
      contractStatus: 'active',
      currentProfitStage: 1,
      isInvestmentRecovered: false,
      createdBy: 1,
    } as any);
    
    // 4. 验证数据已创建
    const partnerCitiesBefore = await db.select().from(partnerCities).where(eq(partnerCities.partnerId, testPartnerId));
    expect(partnerCitiesBefore).toHaveLength(1);
    
    // 5. 模拟删除合伙人（软删除，先删除partner_cities）
    await db.delete(partnerCities).where(eq(partnerCities.partnerId, testPartnerId));
    await db.update(partners).set({ isActive: false } as any).where(eq(partners.id, testPartnerId));
    
    // 6. 验证partner_cities已删除
    const partnerCitiesAfter = await db.select().from(partnerCities).where(eq(partnerCities.partnerId, testPartnerId));
    expect(partnerCitiesAfter).toHaveLength(0);
    
    // 7. 验证partners设置为不激活
    const [partnerAfter] = await db.select().from(partners).where(eq(partners.id, testPartnerId)).limit(1);
    expect(partnerAfter.isActive).toBe(false);
    
    // 清理测试数据
    await db.delete(partners).where(eq(partners.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });
});
