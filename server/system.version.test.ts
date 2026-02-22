import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("system.version API", () => {
  it("should return version information", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.system.version();
    
    // 验证返回的版本信息包含必要字段
    expect(result).toHaveProperty("version");
    expect(result).toHaveProperty("buildTime");
    expect(result).toHaveProperty("branch");
    expect(result).toHaveProperty("isDirty");
    expect(result).toHaveProperty("serverTime");
    
    // 验证字段类型
    expect(typeof result.version).toBe("string");
    expect(typeof result.buildTime).toBe("string");
    expect(typeof result.branch).toBe("string");
    expect(typeof result.isDirty).toBe("boolean");
    expect(typeof result.serverTime).toBe("string");
    
    // 验证版本号不为空
    expect(result.version.length).toBeGreaterThan(0);
    
    // 验证serverTime是有效的ISO 8601日期格式
    expect(() => new Date(result.serverTime)).not.toThrow();
    expect(new Date(result.serverTime).toISOString()).toBe(result.serverTime);
  });
  
  it("should return consistent version across multiple calls", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    
    const result1 = await caller.system.version();
    const result2 = await caller.system.version();
    
    // 版本号、构建时间、分支应该保持一致
    expect(result1.version).toBe(result2.version);
    expect(result1.buildTime).toBe(result2.buildTime);
    expect(result1.branch).toBe(result2.branch);
    expect(result1.isDirty).toBe(result2.isDirty);
    
    // serverTime可能不同（因为是当前时间）
    expect(result1.serverTime).not.toBe(result2.serverTime);
  });
});
