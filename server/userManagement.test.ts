import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("用户管理权限测试", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("数据库连接失败");
  });

  it("应该能够查询所有用户", async () => {
    const allUsers = await db!.select().from(users);
    expect(allUsers).toBeDefined();
    expect(Array.isArray(allUsers)).toBe(true);
  });

  it("应该能够根据角色过滤用户", async () => {
    const adminUsers = await db!.select().from(users).where(eq(users.role, "admin"));
    expect(adminUsers).toBeDefined();
    expect(Array.isArray(adminUsers)).toBe(true);
    
    // 验证所有返回的用户都是admin角色
    adminUsers.forEach(user => {
      expect(user.role).toBe("admin");
    });
  });

  it("应该能够根据salespersonId查询销售用户", async () => {
    const salesUsers = await db!.select().from(users).where(eq(users.role, "sales"));
    expect(salesUsers).toBeDefined();
    expect(Array.isArray(salesUsers)).toBe(true);
  });

  it("应该能够查询活跃用户", async () => {
    const activeUsers = await db!.select().from(users).where(eq(users.isActive, true));
    expect(activeUsers).toBeDefined();
    expect(Array.isArray(activeUsers)).toBe(true);
    
    // 验证所有返回的用户都是活跃状态
    activeUsers.forEach(user => {
      expect(user.isActive).toBe(true);
    });
  });
});
