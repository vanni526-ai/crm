import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { partners, users, partnerCities, cities } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "./passwordUtils";

describe("合伙人创建功能测试", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testUserId: number;
  let testCityId: number;
  let createdPartnerIds: number[] = [];

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 创建测试用户（作为创建人）
    const hashedPassword = await hashPassword("test123");
    const openId = `test_user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const userResult = await db.insert(users).values({
      openId,
      name: "测试用户",
      phone: `test${Date.now()}`,
      password: hashedPassword,
      role: "admin" as any,
      roles: "admin",
      isActive: true,
    } as any);
    testUserId = Number(userResult[0].insertId);

    // 创建测试城市
    const cityResult = await db.insert(cities).values({
      name: `测试城市_${Date.now()}`,
      areaCode: "000",
      isActive: true,
      createdBy: testUserId,
    } as any);
    testCityId = Number(cityResult[0].insertId);
  });

  afterAll(async () => {
    if (!db) return;

    // 清理测试数据
    for (const partnerId of createdPartnerIds) {
      await db.delete(partnerCities).where(eq(partnerCities.partnerId, partnerId));
      await db.delete(partners).where(eq(partners.id, partnerId));
    }

    await db.delete(cities).where(eq(cities.id, testCityId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("应该能够创建合伙人并关联城市", async () => {
    if (!db) throw new Error("数据库连接失败");

    const phone = `13900000${Date.now().toString().slice(-3)}`;
    const name = "测试合伙人";

    // 创建用户账号
    const hashedPassword = await hashPassword("123456");
    const openId = `partner_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const userResult = await db.insert(users).values({
      openId,
      name,
      phone,
      password: hashedPassword,
      role: "user" as any,
      roles: "user,cityPartner",
      isActive: true,
    } as any);
    const userId = Number(userResult[0].insertId);

    // 创建合伙人
    const partnerResult = await db.insert(partners).values({
      userId,
      name,
      phone,
      profitRatio: "0.10",
      createdBy: testUserId,
    } as any);
    const partnerId = Number(partnerResult[0].insertId);
    createdPartnerIds.push(partnerId);

    // 关联城市
    await db.insert(partnerCities).values({
      partnerId,
      cityId: testCityId,
      expenseCoverage: {},
      createdBy: testUserId,
    } as any);

    // 验证合伙人创建成功
    const partner = await db
      .select()
      .from(partners)
      .where(eq(partners.id, partnerId))
      .limit(1);

    expect(partner.length).toBe(1);
    expect(partner[0].name).toBe(name);
    expect(partner[0].phone).toBe(phone);
    expect(partner[0].userId).toBe(userId);

    // 验证城市关联成功
    const cityRelation = await db
      .select()
      .from(partnerCities)
      .where(
        and(
          eq(partnerCities.partnerId, partnerId),
          eq(partnerCities.cityId, testCityId)
        )
      )
      .limit(1);

    expect(cityRelation.length).toBe(1);
    expect(cityRelation[0].partnerId).toBe(partnerId);
    expect(cityRelation[0].cityId).toBe(testCityId);
    expect(cityRelation[0].createdBy).toBe(testUserId);

    // 验证用户账号创建成功
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    expect(user.length).toBe(1);
    expect(user[0].phone).toBe(phone);
    expect(user[0].roles).toBe("user,cityPartner");
  });

  it("应该能够创建合伙人并关联多个城市", async () => {
    if (!db) throw new Error("数据库连接失败");

    const phone = `13900000${Date.now().toString().slice(-3)}`;
    const name = "多城市合伙人";

    // 创建第二个测试城市
    const city2Result = await db.insert(cities).values({
      name: `测试城市2_${Date.now()}`,
      areaCode: "001",
      isActive: true,
      createdBy: testUserId,
    } as any);
    const testCity2Id = Number(city2Result[0].insertId);

    // 创建用户账号
    const hashedPassword = await hashPassword("123456");
    const openId = `partner_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const userResult = await db.insert(users).values({
      openId,
      name,
      phone,
      password: hashedPassword,
      role: "user" as any,
      roles: "user,cityPartner",
      isActive: true,
    } as any);
    const userId = Number(userResult[0].insertId);

    // 创建合伙人
    const partnerResult = await db.insert(partners).values({
      userId,
      name,
      phone,
      profitRatio: "0.10",
      createdBy: testUserId,
    } as any);
    const partnerId = Number(partnerResult[0].insertId);
    createdPartnerIds.push(partnerId);

    // 关联多个城市
    await db.insert(partnerCities).values([
      {
        partnerId,
        cityId: testCityId,
        expenseCoverage: {},
        createdBy: testUserId,
      } as any,
      {
        partnerId,
        cityId: testCity2Id,
        expenseCoverage: {},
        createdBy: testUserId,
      } as any,
    ]);

    // 验证两个城市关联都成功
    const cityRelations = await db
      .select()
      .from(partnerCities)
      .where(eq(partnerCities.partnerId, partnerId));

    expect(cityRelations.length).toBe(2);
    expect(cityRelations.map((r) => r.cityId)).toContain(testCityId);
    expect(cityRelations.map((r) => r.cityId)).toContain(testCity2Id);

    // 清理第二个测试城市
    await db.delete(cities).where(eq(cities.id, testCity2Id));
  });

  it("应该能够创建不关联城市的合伙人", async () => {
    if (!db) throw new Error("数据库连接失败");

    const phone = `13900000${Date.now().toString().slice(-3)}`;
    const name = "无城市合伙人";

    // 创建用户账号
    const hashedPassword = await hashPassword("123456");
    const openId = `partner_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const userResult = await db.insert(users).values({
      openId,
      name,
      phone,
      password: hashedPassword,
      role: "user" as any,
      roles: "user,cityPartner",
      isActive: true,
    } as any);
    const userId = Number(userResult[0].insertId);

    // 创建合伙人（不关联城市）
    const partnerResult = await db.insert(partners).values({
      userId,
      name,
      phone,
      profitRatio: "0.10",
      createdBy: testUserId,
    } as any);
    const partnerId = Number(partnerResult[0].insertId);
    createdPartnerIds.push(partnerId);

    // 验证合伙人创建成功
    const partner = await db
      .select()
      .from(partners)
      .where(eq(partners.id, partnerId))
      .limit(1);

    expect(partner.length).toBe(1);
    expect(partner[0].name).toBe(name);

    // 验证没有城市关联
    const cityRelations = await db
      .select()
      .from(partnerCities)
      .where(eq(partnerCities.partnerId, partnerId));

    expect(cityRelations.length).toBe(0);
  });
});
