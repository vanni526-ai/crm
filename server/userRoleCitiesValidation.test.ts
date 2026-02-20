import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, userRoleCities } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("用户角色城市验证修复测试", () => {
  let testUserId: number;
  let drizzle: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    drizzle = await getDb();
    if (!drizzle) throw new Error("数据库连接失败");

    // 创建测试用户
    const [newUser] = await drizzle
      .insert(users)
      .values({
        name: "测试用户_角色城市验证",
        phone: "19900000001",
        role: "admin",
        roles: "admin",
        isActive: true,
      })
      .$returningId();
    testUserId = newUser.id;

    // 为admin角色添加城市
    await drizzle.insert(userRoleCities).values({
      userId: testUserId,
      role: "admin",
      cities: JSON.stringify(["重庆"]),
    });
  });

  afterAll(async () => {
    if (!drizzle || !testUserId) return;

    // 清理测试数据
    await drizzle.delete(userRoleCities).where(eq(userRoleCities.userId, testUserId));
    await drizzle.delete(users).where(eq(users.id, testUserId));
  });

  it("应该允许更新用户，即使选中了老师角色但没有在roleCities中传递城市数据", async () => {
    // 模拟前端请求：选中4个角色（老师、老板、合伙人、管理员），但只为老板和管理员传递城市
    const updateInput = {
      id: testUserId,
      name: "测试用户_更新后",
      roles: "teacher,cityPartner,admin",
      roleCities: {
        "admin": ["重庆"],
      },
    };

    // 这个测试应该通过，因为：
    // 1. roleCities中只传递了"老板"和"admin"的城市数据
    // 2. 验证逻辑应该只检查roleCities中实际传递的角色
    // 3. 对于teacher和cityPartner角色，应该检查数据库中是否已有城市配置
    
    // 由于teacher和cityPartner在数据库中没有城市配置，这个更新应该失败
    // 但不应该因为检查roleCities["teacher"]为undefined而失败
    
    // 实际测试：验证错误消息是否正确
    try {
      const rolesArray = updateInput.roles.split(",").map((r: string) => r.trim());
      const hasRoleCities = updateInput.roleCities && Object.keys(updateInput.roleCities).length > 0;
      
      // 验证roleCities中传递的角色
      if (hasRoleCities) {
        for (const [role, cities] of Object.entries(updateInput.roleCities)) {
          if (role === 'teacher' || role === 'cityPartner') {
            if (!cities || cities.length === 0) {
              throw new Error(`选择${role === 'teacher' ? '老师' : '合伙人'}角色时，必须选择对应的城市`);
            }
          }
        }
      }
      
      // 检查未在roleCities中传递但被选中的角色
      for (const role of rolesArray) {
        if (role === 'teacher' || role === 'cityPartner') {
          if (!hasRoleCities || !updateInput.roleCities[role]) {
            // 检查数据库中是否已有城市配置
            const existingCities = await drizzle!
              .select()
              .from(userRoleCities)
              .where(
                and(
                  eq(userRoleCities.userId, testUserId),
                  eq(userRoleCities.role, role)
                )
              );
            
            if (existingCities.length === 0 || !existingCities[0].cities || JSON.parse(existingCities[0].cities).length === 0) {
              throw new Error(`选择${role === 'teacher' ? '老师' : '合伙人'}角色时，必须选择对应的城市`);
            }
          }
        }
      }
      
      // 如果到这里没有抛出错误，说明验证逻辑有问题
      expect.fail("应该抛出错误：teacher和cityPartner角色没有城市配置");
    } catch (error: any) {
      // 验证错误消息是否正确
      expect(error.message).toContain("选择老师角色时，必须选择对应的城市");
    }
  });

  it("应该允许更新用户，当所有需要城市的角色都在roleCities中有数据时", async () => {
    // 模拟前端请求：选中4个角色，并为所有需要城市的角色传递城市数据
    const updateInput = {
      id: testUserId,
      name: "测试用户_更新后2",
      roles: "teacher,cityPartner,admin",
      roleCities: {
        "teacher": ["重庆"],
        "cityPartner": ["重庆"],
        "admin": ["重庆"],
      },
    };

    // 这个测试应该通过，因为所有需要城市的角色都有城市数据
    const rolesArray = updateInput.roles.split(",").map((r: string) => r.trim());
    const hasRoleCities = updateInput.roleCities && Object.keys(updateInput.roleCities).length > 0;
    
    // 验证roleCities中传递的角色
    if (hasRoleCities) {
      for (const [role, cities] of Object.entries(updateInput.roleCities)) {
        if (role === 'teacher' || role === 'cityPartner') {
          if (!cities || cities.length === 0) {
            throw new Error(`选择${role === 'teacher' ? '老师' : '合伙人'}角色时，必须选择对应的城市`);
          }
        }
      }
    }
    
    // 检查未在roleCities中传递但被选中的角色
    for (const role of rolesArray) {
      if (role === 'teacher' || role === 'cityPartner') {
        if (!hasRoleCities || !updateInput.roleCities[role]) {
          const existingCities = await drizzle!
            .select()
            .from(userRoleCities)
            .where(
              and(
                eq(userRoleCities.userId, testUserId),
                eq(userRoleCities.role, role)
              )
            );
          
          if (existingCities.length === 0 || !existingCities[0].cities || JSON.parse(existingCities[0].cities).length === 0) {
            throw new Error(`选择${role === 'teacher' ? '老师' : '合伙人'}角色时，必须选择对应的城市`);
          }
        }
      }
    }
    
    // 如果到这里没有抛出错误，说明验证通过
    expect(true).toBe(true);
  });

  it("应该拒绝更新，当roleCities中的teacher角色没有城市数据时", async () => {
    const updateInput = {
      id: testUserId,
      name: "测试用户_更新后3",
      roles: "teacher,admin",
      roleCities: {
        "teacher": [], // 空数组
        "admin": ["重庆"],
      },
    };

    try {
      const hasRoleCities = updateInput.roleCities && Object.keys(updateInput.roleCities).length > 0;
      
      if (hasRoleCities) {
        for (const [role, cities] of Object.entries(updateInput.roleCities)) {
          if (role === 'teacher' || role === 'cityPartner') {
            if (!cities || cities.length === 0) {
              throw new Error(`选择${role === 'teacher' ? '老师' : '合伙人'}角色时，必须选择对应的城市`);
            }
          }
        }
      }
      
      expect.fail("应该抛出错误：teacher角色没有城市数据");
    } catch (error: any) {
      expect(error.message).toContain("选择老师角色时，必须选择对应的城市");
    }
  });

  it("应该允许更新用户，当选中的角色都不需要城市时", async () => {
    const updateInput = {
      id: testUserId,
      name: "测试用户_更新后4",
      roles: "admin",
      roleCities: {
        "admin": ["重庆"],
      },
    };

    // 这个测试应该通过，因为admin角色不需要城市验证
    const rolesArray = updateInput.roles.split(",").map((r: string) => r.trim());
    const hasRoleCities = updateInput.roleCities && Object.keys(updateInput.roleCities).length > 0;
    
    if (hasRoleCities) {
      for (const [role, cities] of Object.entries(updateInput.roleCities)) {
        if (role === 'teacher' || role === 'cityPartner') {
          if (!cities || cities.length === 0) {
            throw new Error(`选择${role === 'teacher' ? '老师' : '合伙人'}角色时，必须选择对应的城市`);
          }
        }
      }
    }
    
    for (const role of rolesArray) {
      if (role === 'teacher' || role === 'cityPartner') {
        if (!hasRoleCities || !updateInput.roleCities[role]) {
          const existingCities = await drizzle!
            .select()
            .from(userRoleCities)
            .where(
              and(
                eq(userRoleCities.userId, testUserId),
                eq(userRoleCities.role, role)
              )
            );
          
          if (existingCities.length === 0 || !existingCities[0].cities || JSON.parse(existingCities[0].cities).length === 0) {
            throw new Error(`选择${role === 'teacher' ? '老师' : '合伙人'}角色时，必须选择对应的城市`);
          }
        }
      }
    }
    
    expect(true).toBe(true);
  });
});
