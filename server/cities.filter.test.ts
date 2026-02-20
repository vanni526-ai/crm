import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, getAllCities } from "./db";
import { cities } from "../drizzle/schema";

describe("getAllCities - filter inactive cities", () => {
  let testCityId1: number;
  let testCityId2: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 创建两个测试城市：一个激活，一个未激活
    const result1 = await db.insert(cities).values({
      name: "测试激活城市",
      areaCode: "TEST001",
      isActive: true,
      sortOrder: 999,
      updatedBy: 1,
    });
    testCityId1 = Number(result1[0].insertId);

    const result2 = await db.insert(cities).values({
      name: "测试未激活城市",
      areaCode: "TEST002",
      isActive: false,
      sortOrder: 998,
      updatedBy: 1,
    });
    testCityId2 = Number(result2[0].insertId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // 清理测试数据
    await db.delete(cities).where(eq(cities.id, testCityId1));
    await db.delete(cities).where(eq(cities.id, testCityId2));
  });

  it("应该只返回激活状态的城市", async () => {
    const allCities = await getAllCities();

    // 检查返回的城市列表中包含激活的城市
    const activeCity = allCities.find((c) => c.id === testCityId1);
    expect(activeCity).toBeDefined();
    expect(activeCity?.name).toBe("测试激活城市");
    expect(activeCity?.isActive).toBe(true);

    // 检查返回的城市列表中不包含未激活的城市
    const inactiveCity = allCities.find((c) => c.id === testCityId2);
    expect(inactiveCity).toBeUndefined();
  });

  it("所有返回的城市都应该是激活状态", async () => {
    const allCities = await getAllCities();

    // 验证所有返回的城市都是激活状态
    allCities.forEach((city) => {
      expect(city.isActive).toBe(true);
    });
  });
});
