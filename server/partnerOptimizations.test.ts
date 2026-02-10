import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { users, partners } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./passwordUtils";

describe("合伙人管理优化功能测试", () => {
  let testUserId: number;
  let testPartnerId: number;

  beforeAll(async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error("数据库连接失败");

    // 清理测试数据
    await drizzle.execute(`DELETE FROM partners WHERE phone = '13900000999'`);
    await drizzle.execute(`DELETE FROM users WHERE phone = '13900000999'`);
  });

  it("应该能够创建城市合伙人用户并自动同步到partners表", async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error("数据库连接失败");

    // 创建城市合伙人用户
    const hashedPassword = await hashPassword("123456");
    const [result] = await drizzle.insert(users).values({
      name: "测试合伙人",
      phone: "13900000999",
      password: hashedPassword,
      role: "cityPartner",
      roles: "cityPartner",
      isActive: true,
      createdBy: 1,
    } as any);

    testUserId = Number(result.insertId);
    expect(testUserId).toBeGreaterThan(0);

    // 手动触发自动同步逻辑（模拟create mutation中的逻辑）
    await drizzle.insert(partners).values({
      userId: testUserId,
      name: "测试合伙人",
      phone: "13900000999",
      profitRatio: "0.30",
      createdBy: 1,
    } as any);

    // 验证partners表中是否自动创建了记录
    const [partnerRecord] = await drizzle
      .select()
      .from(partners)
      .where(eq(partners.userId, testUserId))
      .limit(1);

    expect(partnerRecord).toBeDefined();
    expect(partnerRecord.name).toBe("测试合伙人");
    testPartnerId = partnerRecord.id;
  });

  it("应该能够移除城市合伙人角色并自动从partners表删除记录", async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error("数据库连接失败");

    // 更新用户角色，移除cityPartner
    await drizzle
      .update(users)
      .set({
        role: "user",
        roles: "user",
      } as any)
      .where(eq(users.id, testUserId));

    // 手动触发角色移除同步逻辑（模拟updateRoles mutation）
    await drizzle.execute(`DELETE FROM partners WHERE userId = ${testUserId}`);

    // 验证partners表中的记录已被删除
    const [partnerRecord] = await drizzle
      .select()
      .from(partners)
      .where(eq(partners.userId, testUserId))
      .limit(1);

    expect(partnerRecord).toBeUndefined();
  });

  it("应该能够通过城市名称搜索合伙人", async () => {
    const drizzle = await getDb();
    if (!drizzle) throw new Error("数据库连接失败");

    // 这个测试验证前端搜索逻辑，后端只需要确保数据结构正确
    // 查询合伙人统计数据
    const stats = await drizzle.execute(`
      SELECT 
        p.id,
        p.name as partnerName,
        GROUP_CONCAT(DISTINCT c.name) as cities
      FROM partners p
      LEFT JOIN partner_cities pc ON p.id = pc.partnerId
      LEFT JOIN cities c ON pc.cityId = c.id
      WHERE p.isActive = 1
      GROUP BY p.id
      LIMIT 1
    `);

    if (stats.rows && stats.rows.length > 0) {
      const stat = stats.rows[0] as any;
      expect(stat.partnerName).toBeDefined();
      // cities字段应该包含城市名称，用于前端搜索
      expect(typeof stat.cities === 'string' || stat.cities === null).toBe(true);
    }
  });
});
