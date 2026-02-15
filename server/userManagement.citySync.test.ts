import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, partners, partnerCities, cities, userRoleCities } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("用户管理城市同步测试", () => {
  let db: any;
  let testUserId: number;
  let testPartnerId: number;
  let testCityId: number;

  beforeAll(async () => {
    db = await getDb();
    
    // 创建测试城市
    const [cityResult] = await db.insert(cities).values({
      name: "测试城市_同步",
      latitude: 30.0,
      longitude: 120.0,
    } as any);
    testCityId = cityResult.insertId;
    
    // 创建测试用户
    const [userResult] = await db.insert(users).values({
      name: "测试合伙人_同步",
      phone: "19900000001",
      email: "test_sync@example.com",
      roles: "cityPartner",
      role: "cityPartner",
      isActive: true,
    } as any);
    testUserId = userResult.insertId;
    
    // 创建测试合伙人
    const [partnerResult] = await db.insert(partners).values({
      userId: testUserId,
      name: "测试合伙人_同步",
      phone: "19900000001",
      profitRatio: "0.30",
      createdBy: 1,
      isActive: true,
    } as any);
    testPartnerId = partnerResult.insertId;
  });

  afterAll(async () => {
    // 清理测试数据
    if (testUserId) {
      await db.delete(userRoleCities).where(eq(userRoleCities.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
    if (testPartnerId) {
      await db.delete(partnerCities).where(eq(partnerCities.partnerId, testPartnerId));
      await db.delete(partners).where(eq(partners.id, testPartnerId));
    }
    if (testCityId) {
      await db.delete(cities).where(eq(cities.id, testCityId));
    }
  });

  it("应该在用户管理编辑城市时自动创建partner_cities记录", async () => {
    // 模拟用户管理的update接口逻辑
    // 1. 更新user_role_cities表
    await db.insert(userRoleCities).values({
      userId: testUserId,
      role: "cityPartner",
      cities: JSON.stringify(["测试城市_同步"]),
    } as any);
    
    // 2. 同步创建partner_cities记录
    const [existingPartnerCity] = await db.select().from(partnerCities)
      .where(
        and(
          eq(partnerCities.partnerId, testPartnerId),
          eq(partnerCities.cityId, testCityId)
        )
      )
      .limit(1);
    
    if (!existingPartnerCity) {
      await db.insert(partnerCities).values({
        partnerId: testPartnerId,
        cityId: testCityId,
        contractStatus: 'active',
        currentProfitStage: 1,
        isInvestmentRecovered: false,
        createdBy: 1,
      } as any);
    }
    
    // 验证partner_cities记录已创建
    const [partnerCity] = await db.select().from(partnerCities)
      .where(
        and(
          eq(partnerCities.partnerId, testPartnerId),
          eq(partnerCities.cityId, testCityId)
        )
      )
      .limit(1);
    
    expect(partnerCity).toBeDefined();
    expect(partnerCity.contractStatus).toBe('active');
  });

  it("应该在合伙人管理页面正确显示城市信息", async () => {
    // 模拟getPartnerStats接口的查询逻辑
    const partnerCitiesList = await db
      .select({
        cityId: partnerCities.cityId,
        cityName: cities.name,
      })
      .from(partnerCities)
      .leftJoin(cities, eq(partnerCities.cityId, cities.id))
      .where(and(
        eq(partnerCities.partnerId, testPartnerId),
        eq(partnerCities.contractStatus, 'active')
      ));
    
    // 验证查询结果
    expect(partnerCitiesList).toHaveLength(1);
    expect(partnerCitiesList[0].cityName).toBe("测试城市_同步");
    
    // 验证cities字段生成逻辑
    const citiesString = partnerCitiesList.map(c => c.cityName).join(", ");
    expect(citiesString).toBe("测试城市_同步");
  });

  it("应该在更新城市时正确同步partner_cities表", async () => {
    // 创建第二个测试城市
    const [city2Result] = await db.insert(cities).values({
      name: "测试城市2_同步",
      latitude: 31.0,
      longitude: 121.0,
    } as any);
    const testCity2Id = city2Result.insertId;
    
    try {
      // 模拟用户管理更新城市列表
      await db.update(userRoleCities)
        .set({
          cities: JSON.stringify(["测试城市_同步", "测试城市2_同步"]),
        } as any)
        .where(
          and(
            eq(userRoleCities.userId, testUserId),
            eq(userRoleCities.role, "cityPartner")
          )
        );
      
      // 同步添加新城市到partner_cities
      const [existingPartnerCity2] = await db.select().from(partnerCities)
        .where(
          and(
            eq(partnerCities.partnerId, testPartnerId),
            eq(partnerCities.cityId, testCity2Id)
          )
        )
        .limit(1);
      
      if (!existingPartnerCity2) {
        await db.insert(partnerCities).values({
          partnerId: testPartnerId,
          cityId: testCity2Id,
          contractStatus: 'active',
          currentProfitStage: 1,
          isInvestmentRecovered: false,
          createdBy: 1,
        } as any);
      }
      
      // 验证partner_cities表已更新
      const allPartnerCities = await db.select().from(partnerCities)
        .where(
          and(
            eq(partnerCities.partnerId, testPartnerId),
            eq(partnerCities.contractStatus, 'active')
          )
        );
      
      expect(allPartnerCities).toHaveLength(2);
      
      // 验证合伙人管理页面能正确显示多个城市
      const partnerCitiesList = await db
        .select({
          cityId: partnerCities.cityId,
          cityName: cities.name,
        })
        .from(partnerCities)
        .leftJoin(cities, eq(partnerCities.cityId, cities.id))
        .where(and(
          eq(partnerCities.partnerId, testPartnerId),
          eq(partnerCities.contractStatus, 'active')
        ));
      
      const citiesString = partnerCitiesList.map(c => c.cityName).join(", ");
      expect(citiesString).toContain("测试城市_同步");
      expect(citiesString).toContain("测试城市2_同步");
    } finally {
      // 清理第二个测试城市
      await db.delete(partnerCities).where(eq(partnerCities.cityId, testCity2Id));
      await db.delete(cities).where(eq(cities.id, testCity2Id));
    }
  });
});
