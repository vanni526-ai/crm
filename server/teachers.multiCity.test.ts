import { describe, it, expect } from "vitest";
import { z } from "zod";

// 复制后端的城市验证逻辑
const citySchema = z.string().min(1, "城市不能为空").refine(
  (val) => {
    // 验证城市格式:支持单个城市或多个城市(分号分隔)
    const cities = val.split(';').map(c => c.trim()).filter(c => c !== '');
    return cities.length > 0;
  },
  { message: "请输入有效的城市名称,多个城市用分号分隔" }
);

const citySchemaOptional = z.string().optional().refine(
  (val) => {
    // 如果提供了city值,验证格式
    if (!val || val.trim() === '') return true; // 空值允许(编辑时可选)
    const cities = val.split(';').map(c => c.trim()).filter(c => c !== '');
    return cities.length > 0;
  },
  { message: "请输入有效的城市名称,多个城市用分号分隔" }
);

describe("城市字段多城市支持 - 验证逻辑测试", () => {
  describe("新增老师 - 城市必填", () => {
    it("应该接受单个城市", () => {
      const result = citySchema.safeParse("北京");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("北京");
      }
    });

    it("应该接受多个城市(分号分隔)", () => {
      const result = citySchema.safeParse("北京;上海;深圳");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("北京;上海;深圳");
      }
    });

    it("应该接受带空格的多城市", () => {
      const result = citySchema.safeParse("北京 ; 上海 ; 深圳");
      expect(result.success).toBe(true);
    });

    it("应该拒绝空字符串", () => {
      const result = citySchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("应该拒绝只有分号的字符串", () => {
      const result = citySchema.safeParse(";;;");
      expect(result.success).toBe(false);
    });

    it("应该拒绝只有空格的字符串", () => {
      const result = citySchema.safeParse("   ");
      expect(result.success).toBe(false);
    });
  });

  describe("编辑老师 - 城市可选", () => {
    it("应该接受undefined(不修改城市)", () => {
      const result = citySchemaOptional.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it("应该接受空字符串(不修改城市)", () => {
      const result = citySchemaOptional.safeParse("");
      expect(result.success).toBe(true);
    });

    it("应该接受单个城市", () => {
      const result = citySchemaOptional.safeParse("北京");
      expect(result.success).toBe(true);
    });

    it("应该接受多个城市", () => {
      const result = citySchemaOptional.safeParse("北京;上海;深圳");
      expect(result.success).toBe(true);
    });

    it("应该拒绝无效格式", () => {
      const result = citySchemaOptional.safeParse(";;;");
      expect(result.success).toBe(false);
    });
  });

  describe("多城市字符串解析", () => {
    it("应该正确解析单城市", () => {
      const cityStr = "北京";
      const cities = cityStr.split(';').map(c => c.trim()).filter(c => c !== '');
      expect(cities).toEqual(["北京"]);
      expect(cities.length).toBe(1);
    });

    it("应该正确解析多城市", () => {
      const cityStr = "北京;上海;深圳";
      const cities = cityStr.split(';').map(c => c.trim()).filter(c => c !== '');
      expect(cities).toEqual(["北京", "上海", "深圳"]);
      expect(cities.length).toBe(3);
    });

    it("应该正确处理带空格的多城市", () => {
      const cityStr = " 北京 ; 上海 ; 深圳 ";
      const cities = cityStr.split(';').map(c => c.trim()).filter(c => c !== '');
      expect(cities).toEqual(["北京", "上海", "深圳"]);
      expect(cities.length).toBe(3);
    });

    it("应该过滤空城市", () => {
      const cityStr = "北京;;上海;;;深圳";
      const cities = cityStr.split(';').map(c => c.trim()).filter(c => c !== '');
      expect(cities).toEqual(["北京", "上海", "深圳"]);
      expect(cities.length).toBe(3);
    });
  });

  describe("城市匹配逻辑(用于前端过滤)", () => {
    it("单城市应该匹配自己", () => {
      const teacherCity = "北京";
      const selectedCity = "北京";
      
      const cities = teacherCity.split(';').map(c => c.trim());
      const isMatch = cities.includes(selectedCity);
      
      expect(isMatch).toBe(true);
    });

    it("多城市应该匹配其中任意一个", () => {
      const teacherCity = "北京;上海;深圳";
      const selectedCity = "上海";
      
      const cities = teacherCity.split(';').map(c => c.trim());
      const isMatch = cities.includes(selectedCity);
      
      expect(isMatch).toBe(true);
    });

    it("多城市不应该匹配不存在的城市", () => {
      const teacherCity = "北京;上海;深圳";
      const selectedCity = "广州";
      
      const cities = teacherCity.split(';').map(c => c.trim());
      const isMatch = cities.includes(selectedCity);
      
      expect(isMatch).toBe(false);
    });

    it("应该正确处理带空格的城市匹配", () => {
      const teacherCity = " 北京 ; 上海 ; 深圳 ";
      const selectedCity = "上海";
      
      const cities = teacherCity.split(';').map(c => c.trim());
      const isMatch = cities.includes(selectedCity);
      
      expect(isMatch).toBe(true);
    });
  });

  describe("边界情况测试", () => {
    it("应该处理超长城市列表", () => {
      const cityStr = "北京;上海;深圳;广州;成都;杭州;武汉;西安;南京;天津";
      const result = citySchema.safeParse(cityStr);
      expect(result.success).toBe(true);
      
      const cities = cityStr.split(';').map(c => c.trim());
      expect(cities.length).toBe(10);
    });

    it("应该处理包含特殊字符的城市名", () => {
      const cityStr = "澳大利亚墨尔本";
      const result = citySchema.safeParse(cityStr);
      expect(result.success).toBe(true);
    });

    it("应该处理中英文混合的城市名", () => {
      const cityStr = "北京;New York;东京";
      const result = citySchema.safeParse(cityStr);
      expect(result.success).toBe(true);
      
      const cities = cityStr.split(';').map(c => c.trim());
      expect(cities).toEqual(["北京", "New York", "东京"]);
    });
  });
});
