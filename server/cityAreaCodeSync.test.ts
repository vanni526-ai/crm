import { describe, it, expect, beforeAll } from "vitest";
import {
  updateCityPartnerConfig,
  updateCity,
  syncAreaCodeFromConfigToCities,
  syncAreaCodeFromCitiesToConfig,
} from "./db";
import { getDb } from "./db";
import { cities, cityPartnerConfig } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("城市区号双向同步测试", () => {
  let testCityId: number;
  let testConfigId: number;
  const testCityName = "测试城市_同步";

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // 清理可能存在的测试数据
    await db.delete(cityPartnerConfig).where(eq(cityPartnerConfig.city, testCityName));
    await db.delete(cities).where(eq(cities.name, testCityName));

    // 创建测试城市数据
    const [cityResult] = await db.insert(cities).values({
      name: testCityName,
      areaCode: "000",
      isActive: true,
      sortOrder: 999,
    });
    testCityId = Number(cityResult.insertId);

    const [configResult] = await db.insert(cityPartnerConfig).values({
      city: testCityName,
      areaCode: "000",
      isActive: true,
      updatedBy: 1,
    });
    testConfigId = Number(configResult.insertId);
  });

  it("应该在更新cityPartnerConfig时同步区号到cities表", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // 更新cityPartnerConfig的区号
    await updateCityPartnerConfig(
      testConfigId,
      { areaCode: "111" },
      1
    );

    // 验证cities表的区号是否同步更新
    const [city] = await db
      .select()
      .from(cities)
      .where(eq(cities.id, testCityId))
      .limit(1);

    expect(city.areaCode).toBe("111");
  });

  it("应该在更新cities时同步区号到cityPartnerConfig表", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // 更新cities的区号
    await updateCity(testCityId, { areaCode: "222" });

    // 验证cityPartnerConfig表的区号是否同步更新
    const [config] = await db
      .select()
      .from(cityPartnerConfig)
      .where(eq(cityPartnerConfig.id, testConfigId))
      .limit(1);

    expect(config.areaCode).toBe("222");
  });

  it("应该批量同步区号从cityPartnerConfig到cities", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // 先手动更新cityPartnerConfig的区号（不触发同步）
    await db
      .update(cityPartnerConfig)
      .set({ areaCode: "333" })
      .where(eq(cityPartnerConfig.id, testConfigId));

    // 执行批量同步
    const result = await syncAreaCodeFromConfigToCities();

    // 验证同步结果
    expect(result.synced).toBeGreaterThan(0);

    // 验证cities表的区号是否已同步
    const [city] = await db
      .select()
      .from(cities)
      .where(eq(cities.id, testCityId))
      .limit(1);

    expect(city.areaCode).toBe("333");
  });

  it("应该批量同步区号从cities到cityPartnerConfig", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // 先手动更新cities的区号（不触发同步）
    await db
      .update(cities)
      .set({ areaCode: "444" })
      .where(eq(cities.id, testCityId));

    // 执行批量同步
    const result = await syncAreaCodeFromCitiesToConfig();

    // 验证同步结果
    expect(result.synced).toBeGreaterThan(0);

    // 验证cityPartnerConfig表的区号是否已同步
    const [config] = await db
      .select()
      .from(cityPartnerConfig)
      .where(eq(cityPartnerConfig.id, testConfigId))
      .limit(1);

    expect(config.areaCode).toBe("444");
  });

  it("清理测试数据", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // 删除测试数据
    await db.delete(cityPartnerConfig).where(eq(cityPartnerConfig.id, testConfigId));
    await db.delete(cities).where(eq(cities.id, testCityId));

    // 验证删除成功
    const citiesResult = await db
      .select()
      .from(cities)
      .where(eq(cities.id, testCityId));
    expect(citiesResult.length).toBe(0);

    const configResult = await db
      .select()
      .from(cityPartnerConfig)
      .where(eq(cityPartnerConfig.id, testConfigId));
    expect(configResult.length).toBe(0);
  });
});
