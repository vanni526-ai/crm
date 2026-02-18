import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { updateUserRoles } from "./db";
import { getDb } from "./db";
import { users, salespersons } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("销售角色双向同步测试", () => {
  let testUserId: number;
  
  beforeAll(async () => {
    // 创建测试用户
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const result = await db.insert(users).values({
      name: "测试销售",
      email: "test-sales@example.com",
      phone: "13800138888",
      role: "user",
      roles: "user",
      isActive: true,
    });
    testUserId = result[0].insertId;
  });
  
  afterAll(async () => {
    // 清理测试数据
    const db = await getDb();
    if (!db) return;
    
    await db.delete(salespersons).where(eq(salespersons.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });
  
  it("添加sales角色时应自动创建salespersons表记录", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // 添加sales角色
    await updateUserRoles(testUserId, ["sales"]);
    
    // 验证users表roles字段
    const user = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
    expect(user[0].roles).toBe("sales");
    expect(user[0].role).toBe("sales");
    
    // 验证salespersons表记录已创建
    const salesRecord = await db.select().from(salespersons).where(eq(salespersons.userId, testUserId)).limit(1);
    expect(salesRecord.length).toBe(1);
    expect(salesRecord[0].name).toBe("测试销售");
    expect(salesRecord[0].isActive).toBe(true);
  });
  
  it("移除sales角色时应禁用salespersons表记录", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // 移除sales角色
    await updateUserRoles(testUserId, ["user"]);
    
    // 验证users表roles字段
    const user = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
    expect(user[0].roles).toBe("user");
    
    // 验证salespersons表记录已禁用
    const salesRecord = await db.select().from(salespersons).where(eq(salespersons.userId, testUserId)).limit(1);
    expect(salesRecord.length).toBe(1);
    expect(salesRecord[0].isActive).toBe(false);
  });
  
  it("重新添加sales角色时应重新启用salespersons表记录", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // 重新添加sales角色
    await updateUserRoles(testUserId, ["sales"]);
    
    // 验证salespersons表记录已重新启用
    const salesRecord = await db.select().from(salespersons).where(eq(salespersons.userId, testUserId)).limit(1);
    expect(salesRecord.length).toBe(1);
    expect(salesRecord[0].isActive).toBe(true);
  });
  
  it("支持多角色同时管理（sales + finance）", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // 添加多个角色
    await updateUserRoles(testUserId, ["sales", "finance"]);
    
    // 验证users表roles字段
    const user = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
    expect(user[0].roles).toBe("sales,finance");
    expect(user[0].role).toBe("sales"); // 主角色应该是sales
    
    // 验证salespersons表记录仍然活跃
    const salesRecord = await db.select().from(salespersons).where(eq(salespersons.userId, testUserId)).limit(1);
    expect(salesRecord.length).toBe(1);
    expect(salesRecord[0].isActive).toBe(true);
  });
  
  it("移除sales但保留其他角色时应禁用salespersons表记录", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // 移除sales角色，保留finance角色
    await updateUserRoles(testUserId, ["finance"]);
    
    // 验证users表roles字段
    const user = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
    expect(user[0].roles).toBe("finance");
    
    // 验证salespersons表记录已禁用
    const salesRecord = await db.select().from(salespersons).where(eq(salespersons.userId, testUserId)).limit(1);
    expect(salesRecord.length).toBe(1);
    expect(salesRecord[0].isActive).toBe(false);
  });
  
  it("用户name为null时应使用回退逻辑创建salespersons记录", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // 创建一个name为null的测试用户
    const result = await db.insert(users).values({
      name: null as any,
      nickname: "销售昵称",
      email: "test-sales-null@example.com",
      role: "user",
      roles: "user",
      isActive: true,
    });
    const nullNameUserId = result[0].insertId;
    
    try {
      // 添加sales角色
      await updateUserRoles(nullNameUserId, ["sales"]);
      
      // 验证salespersons表记录已创建，name使用了回退值
      const salesRecord = await db.select().from(salespersons).where(eq(salespersons.userId, nullNameUserId)).limit(1);
      expect(salesRecord.length).toBe(1);
      expect(salesRecord[0].name).toBe("销售昵称"); // 应该使用nickname
      expect(salesRecord[0].isActive).toBe(true);
    } finally {
      // 清理测试数据
      await db.delete(salespersons).where(eq(salespersons.userId, nullNameUserId));
      await db.delete(users).where(eq(users.id, nullNameUserId));
    }
  });
});
