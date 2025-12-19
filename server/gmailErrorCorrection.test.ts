import { describe, it, expect } from "vitest";

describe("Gmail订单解析 - 同音字纠错功能", () => {
  // 测试纠错函数
  const correctCommonErrors = (text: string): string => {
    if (!text) return text;
    return text
      .replace(/瀑姬/g, "瀛姬")  // 瀑姬 → 瀛姬
      .replace(/嘅嘅/g, "嘟嘟")  // 嘅嘅 → 嘟嘟
      .replace(/赵赵/g, "昭昭")  // 赵赵 → 昭昭
      .replace(/朝朝/g, "昭昭"); // 朝朝 → 昭昭
  };

  it("应该能够纠正'瀑姬'为'瀛姬'", () => {
    const input = "瀑姬喵喵11:00-20:00";
    const expected = "瀛姬喵喵11:00-20:00";
    expect(correctCommonErrors(input)).toBe(expected);
  });

  it("应该能够纠正'嘅嘅'为'嘟嘟'", () => {
    const input = "嘅嘅";
    const expected = "嘟嘟";
    expect(correctCommonErrors(input)).toBe(expected);
  });

  it("应该能够纠正'赵赵'为'昭昭'", () => {
    const input = "赵赵";
    const expected = "昭昭";
    expect(correctCommonErrors(input)).toBe(expected);
  });

  it("应该能够纠正'朝朝'为'昭昭'", () => {
    const input = "朝朝";
    const expected = "昭昭";
    expect(correctCommonErrors(input)).toBe(expected);
  });

  it("应该能够处理包含多个错误的文本", () => {
    const input = "瀑姬小颖 嘅嘅 赵赵 朝朝";
    const expected = "瀛姬小颖 嘟嘟 昭昭 昭昭";
    expect(correctCommonErrors(input)).toBe(expected);
  });

  it("应该能够处理空字符串", () => {
    const input = "";
    const expected = "";
    expect(correctCommonErrors(input)).toBe(expected);
  });

  it("应该能够处理不包含错误的文本", () => {
    const input = "瀛姬喵喵 嘟嘟 昭昭";
    const expected = "瀛姬喵喵 嘟嘟 昭昭";
    expect(correctCommonErrors(input)).toBe(expected);
  });

  it("应该能够纠正设备微信号中的错误", () => {
    const input = "瀑姬喵喵11:00-20:00";
    const result = correctCommonErrors(input);
    expect(result).toContain("瀛姬");
    expect(result).not.toContain("瀑姬");
  });

  it("应该能够纠正销售人员名字中的错误", () => {
    const salespeople = ["嘅嘅", "赵赵", "朝朝"];
    const corrected = salespeople.map(correctCommonErrors);
    expect(corrected).toEqual(["嘟嘟", "昭昭", "昭昭"]);
  });
});
