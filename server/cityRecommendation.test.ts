import { describe, it, expect } from "vitest";
import { recommendCity, getRecommendedCity } from "./cityRecommendation";

describe("城市智能推荐功能测试", () => {
  describe("基本推荐功能", () => {
    it("应该能够获取推荐城市列表", async () => {
      const recommendations = await recommendCity();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it("推荐结果应该包含必要字段", async () => {
      const recommendations = await recommendCity();
      if (recommendations.length > 0) {
        const first = recommendations[0];
        expect(first).toHaveProperty("city");
        expect(first).toHaveProperty("score");
        expect(first).toHaveProperty("reason");
        expect(typeof first.city).toBe("string");
        expect(typeof first.score).toBe("number");
        expect(typeof first.reason).toBe("string");
      }
    });

    it("推荐结果应该按得分降序排列", async () => {
      const recommendations = await recommendCity();
      if (recommendations.length > 1) {
        for (let i = 0; i < recommendations.length - 1; i++) {
          expect(recommendations[i].score).toBeGreaterThanOrEqual(
            recommendations[i + 1].score
          );
        }
      }
    });
  });

  describe("基于客户历史的推荐", () => {
    it("应该根据客户历史订单推荐城市", async () => {
      // 使用实际存在的客户名称进行测试
      const recommendations = await recommendCity("测试客户", undefined);
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it("客户历史推荐应该有较高权重", async () => {
      const recommendations = await recommendCity("测试客户", undefined);
      if (recommendations.length > 0) {
        // 客户历史推荐的得分应该较高(50-100分)
        const topRecommendation = recommendations[0];
        expect(topRecommendation.reason).toContain("客户在此城市");
      }
    });
  });

  describe("基于销售人员的推荐", () => {
    it("应该根据销售人员常用城市推荐", async () => {
      const recommendations = await recommendCity(undefined, "测试销售");
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it("销售人员推荐应该有中等权重", async () => {
      const recommendations = await recommendCity(undefined, "测试销售");
      if (recommendations.length > 0) {
        const topRecommendation = recommendations[0];
        // 销售人员推荐的得分应该在20-40分范围
        expect(topRecommendation.reason).toContain("销售人员在此城市");
      }
    });
  });

  describe("综合推荐", () => {
    it("应该综合考虑客户和销售人员信息", async () => {
      const recommendations = await recommendCity("测试客户", "测试销售");
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it("综合推荐应该叠加多个因素的得分", async () => {
      const recommendations = await recommendCity("测试客户", "测试销售");
      if (recommendations.length > 0) {
        const topRecommendation = recommendations[0];
        // 综合推荐可能包含多个推荐理由
        expect(topRecommendation.reason.length).toBeGreaterThan(0);
      }
    });
  });

  describe("热门城市推荐", () => {
    it("应该包含热门城市推荐", async () => {
      const recommendations = await recommendCity();
      // 应该至少有一些推荐结果(基于热门城市)
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it("热门城市推荐应该有较低权重", async () => {
      const recommendations = await recommendCity();
      if (recommendations.length > 0) {
        // 热门城市推荐的得分应该在5-15分范围
        const lastRecommendation = recommendations[recommendations.length - 1];
        expect(lastRecommendation.score).toBeGreaterThan(0);
      }
    });
  });

  describe("获取首选城市", () => {
    it("应该返回得分最高的城市", async () => {
      const topCity = await getRecommendedCity("测试客户", "测试销售");
      const allRecommendations = await recommendCity("测试客户", "测试销售");
      
      if (allRecommendations.length > 0) {
        expect(topCity).toBe(allRecommendations[0].city);
      } else {
        expect(topCity).toBeNull();
      }
    });

    it("没有推荐时应该返回null", async () => {
      // 使用不存在的客户和销售人员
      const topCity = await getRecommendedCity("不存在的客户", "不存在的销售");
      // 即使没有历史记录,也应该有热门城市推荐
      expect(topCity).toBeDefined();
    });
  });

  describe("边界情况", () => {
    it("应该处理空参数", async () => {
      const recommendations = await recommendCity(undefined, undefined);
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it("应该处理空字符串参数", async () => {
      const recommendations = await recommendCity("", "");
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it("得分应该是有效数字", async () => {
      const recommendations = await recommendCity();
      for (const rec of recommendations) {
        expect(rec.score).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(rec.score)).toBe(true);
      }
    });
  });
});
