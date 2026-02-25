import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";
import { cities } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("createCityConfig修复验证", () => {
  beforeAll(async () => {
    // 清理测试数据
    const dbInstance = await db.getDb();
    if (dbInstance) {
      await dbInstance.delete(cities).where(eq(cities.name, "测试城市"));
    }
  });

  it("应该能成功创建城市（包含sortOrder字段）", async () => {
    const dbInstance = await db.getDb();
    expect(dbInstance).toBeTruthy();

    if (!dbInstance) return;

    // 模拟createCityConfig接口的插入逻辑
    const result = await dbInstance.insert(cities).values({
      name: "测试城市",
      areaCode: "999",
      isActive: true,
      sortOrder: 0,
    });

    expect(result).toBeTruthy();

    // 验证城市是否成功创建
    const createdCity = await dbInstance
      .select()
      .from(cities)
      .where(eq(cities.name, "测试城市"))
      .limit(1);

    expect(createdCity.length).toBe(1);
    expect(createdCity[0].name).toBe("测试城市");
    expect(createdCity[0].areaCode).toBe("999");
    expect(createdCity[0].isActive).toBe(true);
    expect(createdCity[0].sortOrder).toBe(0);

    // 清理测试数据
    await dbInstance.delete(cities).where(eq(cities.name, "测试城市"));
  });

  it("应该能创建areaCode为null的城市", async () => {
    const dbInstance = await db.getDb();
    expect(dbInstance).toBeTruthy();

    if (!dbInstance) return;

    // 模拟areaCode为null的情况
    const result = await dbInstance.insert(cities).values({
      name: "测试城市2",
      areaCode: null,
      isActive: true,
      sortOrder: 0,
    });

    expect(result).toBeTruthy();

    // 验证城市是否成功创建
    const createdCity = await dbInstance
      .select()
      .from(cities)
      .where(eq(cities.name, "测试城市2"))
      .limit(1);

    expect(createdCity.length).toBe(1);
    expect(createdCity[0].name).toBe("测试城市2");
    expect(createdCity[0].areaCode).toBeNull();

    // 清理测试数据
    await dbInstance.delete(cities).where(eq(cities.name, "测试城市2"));
  });
});
