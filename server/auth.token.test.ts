import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import type { Request } from "express";

describe("JWT Token Authentication", () => {
  let testUser: Awaited<ReturnType<typeof db.getUserByOpenId>>;
  let testToken: string;

  beforeAll(async () => {
    // 获取测试用户(appuser)
    testUser = await db.getUserByOpenId("test-app-user-openid");
    
    // 如果用户不存在,创建一个
    if (!testUser) {
      await db.upsertUser({
        openId: "test-app-user-openid",
        name: "Test App User",
        email: "appuser@test.com",
        loginMethod: "password",
      });
      testUser = await db.getUserByOpenId("test-app-user-openid");
    }

    expect(testUser).toBeDefined();
    expect(testUser!.id).toBeTypeOf("number");

    // 生成JWT Token
    testToken = await sdk.createSessionToken("test-app-user-openid", {
      name: testUser!.name || "Test User",
    });
    
    expect(testToken).toBeTypeOf("string");
    expect(testToken.length).toBeGreaterThan(0);
  });

  it("should authenticate with valid JWT token in Authorization header", async () => {
    // 模拟带有Authorization头的请求
    const mockReq = {
      headers: {
        authorization: `Bearer ${testToken}`,
      },
    } as Request;

    const authenticatedUser = await sdk.authenticateRequest(mockReq);
    
    expect(authenticatedUser).toBeDefined();
    expect(authenticatedUser.openId).toBe("test-app-user-openid");
    expect(authenticatedUser.name).toBe(testUser!.name);
  });

  it("should fail with invalid JWT token", async () => {
    const mockReq = {
      headers: {
        authorization: "Bearer invalid-token-12345",
      },
    } as Request;

    await expect(sdk.authenticateRequest(mockReq)).rejects.toThrow();
  });

  it("should fail with missing Authorization header", async () => {
    const mockReq = {
      headers: {},
    } as Request;

    await expect(sdk.authenticateRequest(mockReq)).rejects.toThrow();
  });

  it("should fail with malformed Authorization header", async () => {
    const mockReq = {
      headers: {
        authorization: "InvalidFormat token123",
      },
    } as Request;

    await expect(sdk.authenticateRequest(mockReq)).rejects.toThrow();
  });

  it("should update lastSignedIn when authenticating with token", async () => {
    const beforeTime = new Date();
    
    const mockReq = {
      headers: {
        authorization: `Bearer ${testToken}`,
      },
    } as Request;

    await sdk.authenticateRequest(mockReq);
    
    // 重新获取用户,检查lastSignedIn是否更新
    const updatedUser = await db.getUserByOpenId("test-app-user-openid");
    expect(updatedUser).toBeDefined();
    expect(updatedUser!.lastSignedIn).toBeDefined();
    expect(updatedUser!.lastSignedIn!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
  });
});
