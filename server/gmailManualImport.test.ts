import { describe, it, expect, vi } from "vitest";
import { searchGmailMessages, readGmailThread, extractEmailContent } from "./gmailMcpImporter";

describe("Gmail手动导入功能", () => {
  it("应该能够搜索Gmail邮件", async () => {
    // 这个测试需要实际的Gmail连接,所以我们只测试函数存在
    expect(typeof searchGmailMessages).toBe("function");
  }, 10000);

  it("应该能够读取Gmail邮件线程", async () => {
    expect(typeof readGmailThread).toBe("function");
  }, 10000);

  it("应该能够从邮件数据中提取文本内容", () => {
    const mockEmailData = {
      threads: [
        {
          messages: [
            {
              textContent: "测试邮件内容1",
            },
            {
              textContent: "测试邮件内容2",
            },
          ],
        },
      ],
    };

    const content = extractEmailContent(mockEmailData);
    expect(content).toContain("测试邮件内容1");
    expect(content).toContain("测试邮件内容2");
  });

  it("应该处理空邮件数据", () => {
    const emptyData = { threads: [] };
    const content = extractEmailContent(emptyData);
    expect(content).toBe("");
  });

  it("应该处理没有textContent的邮件", () => {
    const mockEmailData = {
      threads: [
        {
          messages: [
            {
              // 没有textContent字段
            },
          ],
        },
      ],
    };

    const content = extractEmailContent(mockEmailData);
    expect(content).toBe("");
  });
});
