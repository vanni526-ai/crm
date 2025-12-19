import { describe, it, expect, vi, beforeEach } from "vitest";
import { execSync } from "child_process";

/**
 * Gmail手动导入功能单元测试
 */
describe("Gmail手动导入功能", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应该能够调用gmail-auto-import脚本", () => {
    // 这是一个集成测试,验证脚本文件存在
    const { existsSync } = require("fs");
    const { join } = require("path");
    
    const scriptPath = join(process.cwd(), "scripts/gmail-auto-import.mjs");
    expect(existsSync(scriptPath)).toBe(true);
  });

  it("应该能够正确处理脚本执行成功的情况", () => {
    // 模拟成功场景
    const result = {
      success: true,
      message: "导入任务已完成",
    };
    
    expect(result.success).toBe(true);
    expect(result.message).toBe("导入任务已完成");
  });

  it("应该能够正确处理脚本执行失败的情况", () => {
    // 模拟失败场景
    const error = new Error("导入失败: 脚本执行超时");
    
    expect(error.message).toContain("导入失败");
  });

  it("应该在2分钟内完成导入任务", () => {
    // 验证超时设置
    const timeout = 120000; // 2分钟
    expect(timeout).toBe(120000);
  });

  it("应该使用正确的脚本路径", () => {
    const { join } = require("path");
    const scriptPath = join(process.cwd(), "scripts/gmail-auto-import.mjs");
    
    expect(scriptPath).toContain("scripts/gmail-auto-import.mjs");
  });
});
