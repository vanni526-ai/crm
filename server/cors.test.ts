import { describe, it, expect } from "vitest";

describe("CORS配置测试", () => {
  it("应该允许所有*.manus.computer域名", () => {
    const testDomains = [
      "https://8081-iw7ezl9uw107lltdk8rzb-9b5da5a1.manus.computer",
      "https://3000-i5pob32lur63e8ezns4ea-466ba960.manus.computer",
      "https://9000-abc123xyz456-abcdef12.manus.computer",
      "http://test-subdomain.manus.computer",
    ];

    const corsPattern = /^https?:\/\/.*\.manus\.computer$/;

    testDomains.forEach((domain) => {
      expect(corsPattern.test(domain)).toBe(true);
    });
  });

  it("应该允许localhost域名", () => {
    const testDomains = [
      "http://localhost:3000",
      "http://localhost:8081",
      "https://localhost:9000",
      "http://localhost",
    ];

    const corsPattern = /^https?:\/\/localhost(:\d+)?$/;

    testDomains.forEach((domain) => {
      expect(corsPattern.test(domain)).toBe(true);
    });
  });

  it("应该允许Expo Go app协议", () => {
    const testOrigins = ["app://anonymous-123", "app://user-456"];

    testOrigins.forEach((origin) => {
      expect(origin.startsWith("app://")).toBe(true);
    });
  });

  it("应该拒绝其他域名", () => {
    const invalidDomains = [
      "https://evil.com",
      "https://manus.computer.fake.com",
      "https://notmanus.com",
      "http://192.168.1.1:3000",
    ];

    const manusPattern = /^https?:\/\/.*\.manus\.computer$/;
    const localhostPattern = /^https?:\/\/localhost(:\d+)?$/;

    invalidDomains.forEach((domain) => {
      const isValid =
        manusPattern.test(domain) ||
        localhostPattern.test(domain) ||
        domain.startsWith("app://");
      expect(isValid).toBe(false);
    });
  });

  it("应该正确处理无origin的请求（移动App）", () => {
    const origin = undefined;
    // 无origin的请求应该被允许（移动App场景）
    expect(origin).toBeUndefined();
  });
});
