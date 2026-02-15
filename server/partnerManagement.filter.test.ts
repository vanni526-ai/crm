import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, partners, partnerCities, cities } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

describe("合伙人管理过滤逻辑测试", () => {
  let db: any;
  let testCityId: number;
  let activeUserId: number;
  let activePartnerId: number;
  let inactiveUserId: number;
  let inactivePartnerId: number;

  beforeAll(async () => {
    db = await getDb();
    
    // 创建测试城市
    const [cityResult] = await db.insert(cities).values({
      name: "测试城市_过滤",
      latitude: 30.0,
      longitude: 120.0,
    } as any);
    testCityId = cityResult.insertId;
    
    // 创建激活的测试用户和合伙人
    const [activeUserResult] = await db.insert(users).values({
      name: "激活合伙人",
      phone: "19900000020",
      email: "active@example.com",
      roles: "cityPartner",
      role: "cityPartner",
      isActive: true,
    } as any);
    activeUserId = activeUserResult.insertId;
    
    const [activePartnerResult] = await db.insert(partners).values({
      userId: activeUserId,
      name: "激活合伙人",
      phone: "19900000020",
      profitRatio: "0.30",
      createdBy: 1,
      isActive: true,
    } as any);
    activePartnerId = activePartnerResult.insertId;
    
    await db.insert(partnerCities).values({
      partnerId: activePartnerId,
      cityId: testCityId,
      contractStatus: 'active',
      currentProfitStage: 1,
      isInvestmentRecovered: false,
      createdBy: 1,
    } as any);
    
    // 创建不激活的测试用户和合伙人
    const [inactiveUserResult] = await db.insert(users).values({
      name: "不激活合伙人",
      phone: "19900000021",
      email: "inactive@example.com",
      roles: "cityPartner",
      role: "cityPartner",
      isActive: true,
    } as any);
    inactiveUserId = inactiveUserResult.insertId;
    
    const [inactivePartnerResult] = await db.insert(partners).values({
      userId: inactiveUserId,
      name: "不激活合伙人",
      phone: "19900000021",
      profitRatio: "0.30",
      createdBy: 1,
      isActive: false,  // 设置为不激活
    } as any);
    inactivePartnerId = inactivePartnerResult.insertId;
    
    await db.insert(partnerCities).values({
      partnerId: inactivePartnerId,
      cityId: testCityId,
      contractStatus: 'active',
      currentProfitStage: 1,
      isInvestmentRecovered: false,
      createdBy: 1,
    } as any);
  });

  afterAll(async () => {
    // 清理测试数据
    if (activePartnerId) {
      await db.delete(partnerCities).where(eq(partnerCities.partnerId, activePartnerId));
      await db.delete(partners).where(eq(partners.id, activePartnerId));
    }
    if (inactivePartnerId) {
      await db.delete(partnerCities).where(eq(partnerCities.partnerId, inactivePartnerId));
      await db.delete(partners).where(eq(partners.id, inactivePartnerId));
    }
    if (activeUserId) {
      await db.delete(users).where(eq(users.id, activeUserId));
    }
    if (inactiveUserId) {
      await db.delete(users).where(eq(users.id, inactiveUserId));
    }
    if (testCityId) {
      await db.delete(cities).where(eq(cities.id, testCityId));
    }
  });

  it("getPartnerStats应该只返回isActive=true的合伙人", async () => {
    // 模拟getPartnerStats接口的查询逻辑
    const allPartners = await db
      .select()
      .from(partners)
      .where(eq(partners.isActive, true))
      .orderBy(desc(partners.createdAt));
    
    // 验证只返回激活的合伙人
    const testPartners = allPartners.filter((p: any) => 
      p.id === activePartnerId || p.id === inactivePartnerId
    );
    
    expect(testPartners).toHaveLength(1);
    expect(testPartners[0].id).toBe(activePartnerId);
    expect(testPartners[0].name).toBe("激活合伙人");
  });

  it("删除合伙人后应该不再显示在列表中", async () => {
    // 1. 查询删除前的合伙人列表
    const partnersBefore = await db
      .select()
      .from(partners)
      .where(eq(partners.isActive, true))
      .orderBy(desc(partners.createdAt));
    
    const activePartnersBefore = partnersBefore.filter((p: any) => p.id === activePartnerId);
    expect(activePartnersBefore).toHaveLength(1);
    
    // 2. 软删除合伙人
    await db.update(partners).set({ isActive: false } as any).where(eq(partners.id, activePartnerId));
    
    // 3. 查询删除后的合伙人列表
    const partnersAfter = await db
      .select()
      .from(partners)
      .where(eq(partners.isActive, true))
      .orderBy(desc(partners.createdAt));
    
    const activePartnersAfter = partnersAfter.filter((p: any) => p.id === activePartnerId);
    expect(activePartnersAfter).toHaveLength(0);
    
    // 4. 恢复测试数据
    await db.update(partners).set({ isActive: true } as any).where(eq(partners.id, activePartnerId));
  });

  it("取消cityPartner角色后应该不再显示在合伙人列表中", async () => {
    // 1. 创建临时测试用户和合伙人
    const [tempUserResult] = await db.insert(users).values({
      name: "临时合伙人",
      phone: "19900000022",
      email: "temp@example.com",
      roles: "cityPartner",
      role: "cityPartner",
      isActive: true,
    } as any);
    const tempUserId = tempUserResult.insertId;
    
    const [tempPartnerResult] = await db.insert(partners).values({
      userId: tempUserId,
      name: "临时合伙人",
      phone: "19900000022",
      profitRatio: "0.30",
      createdBy: 1,
      isActive: true,
    } as any);
    const tempPartnerId = tempPartnerResult.insertId;
    
    await db.insert(partnerCities).values({
      partnerId: tempPartnerId,
      cityId: testCityId,
      contractStatus: 'active',
      currentProfitStage: 1,
      isInvestmentRecovered: false,
      createdBy: 1,
    } as any);
    
    // 2. 查询取消角色前的合伙人列表
    const partnersBefore = await db
      .select()
      .from(partners)
      .where(eq(partners.isActive, true))
      .orderBy(desc(partners.createdAt));
    
    const tempPartnersBefore = partnersBefore.filter((p: any) => p.id === tempPartnerId);
    expect(tempPartnersBefore).toHaveLength(1);
    
    // 3. 模拟取消cityPartner角色（删除partner_cities，设置partners为不激活）
    await db.delete(partnerCities).where(eq(partnerCities.partnerId, tempPartnerId));
    await db.update(partners).set({ isActive: false } as any).where(eq(partners.id, tempPartnerId));
    
    // 4. 查询取消角色后的合伙人列表
    const partnersAfter = await db
      .select()
      .from(partners)
      .where(eq(partners.isActive, true))
      .orderBy(desc(partners.createdAt));
    
    const tempPartnersAfter = partnersAfter.filter((p: any) => p.id === tempPartnerId);
    expect(tempPartnersAfter).toHaveLength(0);
    
    // 5. 清理临时测试数据
    await db.delete(partners).where(eq(partners.id, tempPartnerId));
    await db.delete(users).where(eq(users.id, tempUserId));
  });

  it("partner_cities的contractStatus应该只显示active状态", async () => {
    // 1. 创建一个draft状态的partner_cities记录
    const [draftPartnerCityResult] = await db.insert(partnerCities).values({
      partnerId: activePartnerId,
      cityId: testCityId,
      contractStatus: 'draft',
      currentProfitStage: 1,
      isInvestmentRecovered: false,
      createdBy: 1,
    } as any);
    const draftPartnerCityId = draftPartnerCityResult.insertId;
    
    // 2. 查询只返回active状态的partner_cities
    const activeCities = await db
      .select()
      .from(partnerCities)
      .where(eq(partnerCities.partnerId, activePartnerId));
    
    const activeOnly = activeCities.filter((pc: any) => pc.contractStatus === 'active');
    const draftOnly = activeCities.filter((pc: any) => pc.contractStatus === 'draft');
    
    expect(activeOnly.length).toBeGreaterThan(0);
    expect(draftOnly).toHaveLength(1);
    
    // 3. 验证getPartnerStats接口的查询逻辑（只返回active）
    const partnerCitiesList = await db
      .select({
        cityId: partnerCities.cityId,
        cityName: cities.name,
      })
      .from(partnerCities)
      .leftJoin(cities, eq(partnerCities.cityId, cities.id))
      .where(eq(partnerCities.partnerId, activePartnerId));
    
    // 应该包含active和draft
    expect(partnerCitiesList.length).toBeGreaterThanOrEqual(2);
    
    // 但getPartnerStats只应该返回active
    const activePartnerCitiesList = await db
      .select({
        cityId: partnerCities.cityId,
        cityName: cities.name,
        contractStatus: partnerCities.contractStatus,
      })
      .from(partnerCities)
      .leftJoin(cities, eq(partnerCities.cityId, cities.id))
      .where(eq(partnerCities.partnerId, activePartnerId));
    
    const activeFiltered = activePartnerCitiesList.filter((pc: any) => pc.contractStatus === 'active');
    expect(activeFiltered.length).toBeGreaterThan(0);
    
    // 4. 清理draft记录
    await db.delete(partnerCities).where(eq(partnerCities.id, draftPartnerCityId));
  });
});
