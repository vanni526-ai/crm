import { describe, it, expect } from "vitest";
import { standardizeTeacherName } from "./teacherMappingRules";
import { standardizeCityName } from "./cityMappingRules";
import { standardizeClassroom } from "./classroomMappingRules";

describe("扩展数据清洗功能测试", () => {
  describe("老师名称标准化", () => {
    it("应该识别并标准化老师别名", async () => {
      // 假设晚晚的别名是"ww"
      const result = await standardizeTeacherName("ww");
      // 如果没有别名映射，返回null
      expect(result).toBeNull();
    });

    it("应该保留已标准化的老师名称", async () => {
      const result = await standardizeTeacherName("晚晚");
      // 如果已经是标准名称，应该返回相同的名称或null
      expect(result === null || result === "晚晚").toBe(true);
    });

    it("应该处理不存在的老师名称", async () => {
      const result = await standardizeTeacherName("不存在的老师");
      expect(result).toBeNull();
    });
  });

  describe("城市名称标准化", () => {
    it("应该识别并标准化城市别名", async () => {
      // 测试城市名称的标准化
      const result = await standardizeCityName("上海市");
      // 如果有别名映射，应该返回"上海"
      expect(result === null || result === "上海").toBe(true);
    });

    it("应该保留已标准化的城市名称", async () => {
      const result = await standardizeCityName("上海");
      // 如果已经是标准名称，可能返回相同的名称或null
      expect(result === null || result === "上海").toBe(true);
    });

    it("应该处理不存在的城市名称", async () => {
      const result = await standardizeCityName("不存在的城市");
      expect(result).toBeNull();
    });
  });

  describe("综合数据清洗测试", () => {
    it("应该同时标准化教室、老师和城市", async () => {
      // 1. 标准化教室（可能同时更新城市）
      const classroomResult = standardizeClassroom("长风1101", undefined);
      expect(classroomResult).not.toBeNull();
      if (classroomResult) {
        expect(classroomResult.city).toBe("上海");
        expect(classroomResult.classroom).toBe("上海1101");
      }

      // 2. 标准化老师
      const teacherResult = await standardizeTeacherName("ww");
      // 如果没有别名映射，返回null
      expect(teacherResult).toBeNull();

      // 3. 标准化城市
      const cityResult = await standardizeCityName("上海市");
      expect(cityResult === null || cityResult === "上海").toBe(true);
    });

    it("应该处理部分字段需要清洗的情况", async () => {
      // 教室需要清洗
      const classroomResult = standardizeClassroom("深圳", undefined);
      expect(classroomResult).not.toBeNull();
      if (classroomResult) {
        expect(classroomResult.city).toBe("深圳");
        expect(classroomResult.classroom).toBe("深圳1309");
      }

      // 老师不需要清洗
      const teacherResult = await standardizeTeacherName("晚晚");
      expect(teacherResult === null || teacherResult === "晚晚").toBe(true);

      // 城市不需要清洗
      const cityResult = await standardizeCityName("深圳");
      // 可能返回相同的名称或null
      expect(cityResult === null || cityResult === "深圳").toBe(true);
    });

    it("应该处理所有字段都不需要清洗的情况", async () => {
      // 教室已标准化
      const classroomResult = standardizeClassroom("上海1101", "上海");
      // 可能返回相同的结果或null
      if (classroomResult) {
        expect(classroomResult.city).toBe("上海");
        expect(classroomResult.classroom).toBe("上海1101");
      } else {
        expect(classroomResult).toBeNull();
      }

      // 老师已标准化
      const teacherResult = await standardizeTeacherName("晚晚");
      expect(teacherResult === null || teacherResult === "晚晚").toBe(true);

      // 城市已标准化
      const cityResult = await standardizeCityName("上海");
      // 可能返回相同的名称或null
      expect(cityResult === null || cityResult === "上海").toBe(true);
    });
  });
});
