import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import jwt from "jsonwebtoken";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

describe("auth.refreshToken", () => {
  let testUserId: number;
  let validToken: string;
  let expiredToken: string;

  beforeAll(async () => {
    // 获取测试用户
    const drizzle = await getDb();
    if (!drizzle) throw new Error("数据库连接失败");

    const userList = await drizzle
      .select()
      .from(users)
      .where(eq(users.name, "test"))
      .limit(1);

    if (userList.length === 0) {
      throw new Error("测试用户不存在,请先创建test账号");
    }

    testUserId = userList[0].id;

    // 创建有效Token
    validToken = jwt.sign(
      {
        id: testUserId,
        openId: userList[0].openId,
        name: userList[0].name,
        role: userList[0].role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // 创建已过期Token(过期1小时)
    expiredToken = jwt.sign(
      {
        id: testUserId,
        openId: userList[0].openId,
        name: userList[0].name,
        role: userList[0].role,
      },
      JWT_SECRET,
      { expiresIn: "-1h" }
    );
  });

  it("应该成功刷新有效Token", async () => {
    const ctx = await createContext({
      req: { headers: {} } as any,
      res: { cookie: () => {} } as any,
    });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.refreshToken({ token: validToken });

    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.expiresIn).toBe(24 * 60 * 60); // 24小时(秒)
    expect(result.user).toBeDefined();
    expect(result.user?.id).toBe(testUserId);
  });

  it("应该成功刷新已过期但在7天内的Token", async () => {
    const ctx = await createContext({
      req: { headers: {} } as any,
      res: { cookie: () => {} } as any,
    });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.refreshToken({ token: expiredToken });

    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.token).not.toBe(expiredToken); // 新Token应该不同
  });

  it("应该拒绝无效签名的Token", async () => {
    const invalidToken = jwt.sign(
      { id: testUserId, name: "test" },
      "wrong-secret",
      { expiresIn: "24h" }
    );

    const ctx = await createContext({
      req: { headers: {} } as any,
      res: { cookie: () => {} } as any,
    });

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.refreshToken({ token: invalidToken })
    ).rejects.toThrow();
  });

  it("应该拒绝格式错误的Token", async () => {
    const ctx = await createContext({
      req: { headers: {} } as any,
      res: { cookie: () => {} } as any,
    });

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.refreshToken({ token: "invalid-token-format" })
    ).rejects.toThrow();
  });

  it("应该拒绝过期超过7天的Token", async () => {
    // 创建过期超过7天的Token
    const veryOldToken = jwt.sign(
      {
        id: testUserId,
        name: "test",
        exp: Math.floor(Date.now() / 1000) - 8 * 24 * 60 * 60, // 8天前过期
      },
      JWT_SECRET
    );

    const ctx = await createContext({
      req: { headers: {} } as any,
      res: { cookie: () => {} } as any,
    });

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.refreshToken({ token: veryOldToken })
    ).rejects.toThrow("Token已过期太久");
  });

  it("应该拒绝已被禁用用户的Token刷新", async () => {
    // 创建一个不存在用户的Token
    const nonExistentUserToken = jwt.sign(
      {
        id: 999999,
        openId: "non-existent",
        name: "ghost",
        role: "user",
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    const ctx = await createContext({
      req: { headers: {} } as any,
      res: { cookie: () => {} } as any,
    });

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.refreshToken({ token: nonExistentUserToken })
    ).rejects.toThrow("用户不存在");
  });
});
