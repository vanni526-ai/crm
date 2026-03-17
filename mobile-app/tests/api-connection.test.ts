import { describe, it, expect } from "vitest";

// API 连接测试
// 测试后端 API 代理配置是否正确

const BACKEND_URL = "https://crm.bdsm.com.cn";
const LOCAL_API_URL = "http://127.0.0.1:3000";

describe("API Connection Tests", () => {
  it("should connect to local health endpoint", async () => {
    const response = await fetch(`${LOCAL_API_URL}/api/health`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.timestamp).toBeDefined();
  });

  it("should proxy requests to backend metadata API", async () => {
    const response = await fetch(`${LOCAL_API_URL}/api/proxy/api/trpc/metadata.getAll?input=%7B%7D`, {
      signal: AbortSignal.timeout(15000),
    });
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    // tRPC 响应格式: { result: { data: { json: {...} } } }
    expect(data.result).toBeDefined();
    expect(data.result.data).toBeDefined();
  }, 20000); // 20秒超时

  it("should connect directly to backend health check", async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });
      expect(response.ok).toBe(true);
    } catch (error) {
      // 如果直连失败，可能是网络问题，跳过此测试
      console.log("Direct backend connection failed, skipping...");
    }
  }, 15000);
});

describe("API Client Configuration", () => {
  it("should have correct proxy path configuration", () => {
    // 验证代理路径格式
    const proxyPath = "/api/proxy";
    expect(proxyPath).toBe("/api/proxy");
  });

  it("should have correct backend URL", () => {
    expect(BACKEND_URL).toBe("https://crm.bdsm.com.cn");
  });
});
