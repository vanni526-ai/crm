import { describe, it, expect } from "vitest";
import { standardizeClassroom } from "./classroomMappingRules";

describe("教室名称标准化测试", () => {
  describe("上海教室映射", () => {
    it("应该将'长风1101'映射到'上海1101'", () => {
      const result = standardizeClassroom("长风1101");
      expect(result).toEqual({
        city: "上海",
        classroom: "上海1101"
      });
    });

    it("应该将'长风404'映射到'上海404'", () => {
      const result = standardizeClassroom("长风404");
      expect(result).toEqual({
        city: "上海",
        classroom: "上海404"
      });
    });

    it("应该将'404'映射到'上海404'", () => {
      const result = standardizeClassroom("404");
      expect(result).toEqual({
        city: "上海",
        classroom: "上海404"
      });
    });

    it("应该将'1101'映射到'上海1101'", () => {
      const result = standardizeClassroom("1101");
      expect(result).toEqual({
        city: "上海",
        classroom: "上海1101"
      });
    });

    it("应该将'404教室'映射到'上海404'", () => {
      const result = standardizeClassroom("404教室");
      expect(result).toEqual({
        city: "上海",
        classroom: "上海404"
      });
    });

    it("应该将'1101教室'映射到'上海1101'", () => {
      const result = standardizeClassroom("1101教室");
      expect(result).toEqual({
        city: "上海",
        classroom: "上海1101"
      });
    });

    it("应该将'捕运大厦'映射到'上海捕运大厦16D'", () => {
      const result = standardizeClassroom("捕运大厦");
      expect(result).toEqual({
        city: "上海",
        classroom: "上海捕运大厦16D"
      });
    });

    it("应该将'捕运大厦16D'映射到'上海捕运大厦16D'", () => {
      const result = standardizeClassroom("捕运大厦16D");
      expect(result).toEqual({
        city: "上海",
        classroom: "上海捕运大厦16D"
      });
    });
  });

  describe("其他城市教室映射", () => {
    it("应该将'深圳'映射到'深圳1309'", () => {
      const result = standardizeClassroom("深圳");
      expect(result).toEqual({
        city: "深圳",
        classroom: "深圳1309"
      });
    });

    it("应该将'深圳教室'映射到'深圳1309'", () => {
      const result = standardizeClassroom("深圳教室");
      expect(result).toEqual({
        city: "深圳",
        classroom: "深圳1309"
      });
    });

    it("应该将'苏州'映射到'苏州教室'", () => {
      const result = standardizeClassroom("苏州");
      expect(result).toEqual({
        city: "苏州",
        classroom: "苏州教室"
      });
    });

    it("应该将'石家庄'映射到'石家庄教室'", () => {
      const result = standardizeClassroom("石家庄");
      expect(result).toEqual({
        city: "石家庄",
        classroom: "石家庄教室"
      });
    });

    it("应该将'宁波教室'映射到'宁波教室'", () => {
      const result = standardizeClassroom("宁波教室");
      expect(result).toEqual({
        city: "宁波",
        classroom: "宁波教室"
      });
    });

    it("应该将'济南'映射到'济南教室'", () => {
      const result = standardizeClassroom("济南");
      expect(result).toEqual({
        city: "济南",
        classroom: "济南教室"
      });
    });

    it("应该将'无锡教室'映射到'无锡教室'", () => {
      const result = standardizeClassroom("无锡教室");
      expect(result).toEqual({
        city: "无锡",
        classroom: "无锡教室"
      });
    });

    it("应该将'天津'映射到'天津教室'", () => {
      const result = standardizeClassroom("天津");
      expect(result).toEqual({
        city: "天津",
        classroom: "天津教室"
      });
    });

    it("应该将'武汉教室'映射到'武汉教室'", () => {
      const result = standardizeClassroom("武汉教室");
      expect(result).toEqual({
        city: "武汉",
        classroom: "武汉教室"
      });
    });
  });

  describe("已标准化的教室名称", () => {
    it("应该保留已标准化的'上海1101'", () => {
      const result = standardizeClassroom("上海1101", "上海");
      expect(result).toEqual({
        city: "上海",
        classroom: "上海1101"
      });
    });

    it("应该保留已标准化的'深圳1309'", () => {
      const result = standardizeClassroom("深圳1309", "深圳");
      expect(result).toEqual({
        city: "深圳",
        classroom: "深圳1309"
      });
    });
  });

  describe("无法映射的情况", () => {
    it("对于未知教室名称应该返回null", () => {
      const result = standardizeClassroom("未知教室");
      expect(result).toBeNull();
    });

    it("对于空字符串应该返回null", () => {
      const result = standardizeClassroom("");
      expect(result).toBeNull();
    });
  });

  describe("边界情况", () => {
    it("应该处理带空格的输入", () => {
      const result = standardizeClassroom("  长风1101  ");
      expect(result).toEqual({
        city: "上海",
        classroom: "上海1101"
      });
    });

    it("应该处理带空格的'深圳 教室'", () => {
      const result = standardizeClassroom("深圳 教室");
      expect(result).toBeNull(); // 因为正则不匹配带空格的情况
    });
  });
});
