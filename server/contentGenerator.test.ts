/**
 * 内容生成功能测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock LLM调用
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: "这是一段测试生成的内容。"
      }
    }]
  })
}));

import {
  generateCourseIntro,
  generateMarketingMessage,
  generateFollowUpScript,
} from "./contentGenerator";

describe("内容生成服务", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateCourseIntro - 课程介绍文案生成", () => {
    it("应该能生成课程介绍文案", async () => {
      const result = await generateCourseIntro({
        courseName: "Python编程入门",
        courseType: "编程课程",
        targetAudience: "零基础学员",
        highlights: ["实战项目", "一对一辅导"],
        duration: "3个月",
        price: 9999
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("应该能处理只有课程名称的情况", async () => {
      const result = await generateCourseIntro({
        courseName: "数据分析课程"
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });
  });

  describe("generateMarketingMessage - 营销内容生成", () => {
    it("应该能生成短信营销内容", async () => {
      const result = await generateMarketingMessage({
        type: "sms",
        purpose: "promotion",
        customerName: "张三",
        courseName: "Python课程",
        discount: "8折优惠"
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("应该能生成邮件营销内容", async () => {
      const result = await generateMarketingMessage({
        type: "email",
        purpose: "followup",
        customerName: "李四",
        courseName: "数据分析课程"
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("应该支持不同的营销目的", async () => {
      const purposes = ["promotion", "reminder", "followup", "holiday"] as const;
      
      for (const purpose of purposes) {
        const result = await generateMarketingMessage({
          type: "sms",
          purpose
        });
        expect(result).toBeDefined();
      }
    });
  });

  describe("generateFollowUpScript - 客户跟进话术生成", () => {
    it("应该能为新客户生成跟进话术", async () => {
      const result = await generateFollowUpScript({
        customerName: "王五",
        customerStatus: "new",
        previousCourse: "Python课程"
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("应该能为犹豫客户生成跟进话术", async () => {
      const result = await generateFollowUpScript({
        customerName: "赵六",
        customerStatus: "hesitant",
        lastContact: "2025-01-15",
        notes: "担心学不会"
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("应该支持不同的客户状态", async () => {
      const statuses = ["new", "interested", "hesitant", "inactive"] as const;
      
      for (const status of statuses) {
        const result = await generateFollowUpScript({
          customerName: "测试客户",
          customerStatus: status
        });
        expect(result).toBeDefined();
      }
    });
  });
});
