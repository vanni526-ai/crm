/**
 * auth.generateMembershipToken 接口测试
 *
 * 验证：
 * 1. admin 用户可成功生成 token，返回 token / expiresAt / webviewUrl
 * 2. 非 admin 用户调用时抛出 FORBIDDEN
 * 3. 目标 userId 不存在时抛出 NOT_FOUND
 * 4. 生成的 JWT 可被 jsonwebtoken 正确解析，且 payload.id 与 userId 一致
 * 5. expiresInMinutes 参数生效（默认 10 分钟）
 */

import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminCtx(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-open-id",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createUserCtx(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "user-open-id",
    email: "user@example.com",
    name: "Normal User",
    loginMethod: "phone",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("auth.generateMembershipToken", () => {
  it("非 admin 用户调用时应抛出 FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createUserCtx());
    await expect(
      caller.auth.generateMembershipToken({ userId: 1 })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("admin 调用时目标 userId 不存在应抛出 NOT_FOUND", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    await expect(
      caller.auth.generateMembershipToken({ userId: 999999999 })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("admin 调用时应成功返回 token、expiresAt、webviewUrl", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    // 使用 admin 自身的 userId（id=1），数据库中应存在
    const result = await caller.auth.generateMembershipToken({
      userId: 1,
      expiresInMinutes: 5,
    });

    expect(result).toHaveProperty("token");
    expect(result).toHaveProperty("expiresAt");
    expect(result).toHaveProperty("webviewUrl");
    expect(result.expiresInMinutes).toBe(5);
    expect(result.webviewUrl).toContain("/membership?token=");
    expect(result.webviewUrl).toContain(result.token);
  });

  it("生成的 JWT 可被正确解析，payload.id 与 userId 一致", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.auth.generateMembershipToken({
      userId: 1,
      expiresInMinutes: 10,
    });

    const decoded = jwt.verify(result.token, JWT_SECRET) as any;
    expect(decoded.id).toBe(1);
    expect(decoded.purpose).toBe("membership_webview");

    // 验证过期时间约为 10 分钟（允许 ±5 秒误差）
    const expectedExp = Math.floor(Date.now() / 1000) + 10 * 60;
    expect(decoded.exp).toBeGreaterThanOrEqual(expectedExp - 5);
    expect(decoded.exp).toBeLessThanOrEqual(expectedExp + 5);
  });

  it("expiresAt 字段应为合法 ISO 时间字符串且在未来", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const before = new Date();
    const result = await caller.auth.generateMembershipToken({
      userId: 1,
      expiresInMinutes: 15,
    });
    const expiresAt = new Date(result.expiresAt);
    expect(expiresAt.getTime()).toBeGreaterThan(before.getTime());
    // 过期时间应在约 15 分钟后（允许 ±10 秒误差）
    const expectedMs = before.getTime() + 15 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMs - 10000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMs + 10000);
  });
});
