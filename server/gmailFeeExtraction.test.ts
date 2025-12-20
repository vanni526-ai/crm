import { describe, it, expect } from "vitest";
import { parseGmailOrderContent } from "./gmailOrderParser";

describe("Gmail费用提取功能测试", () => {
  it("应该正确提取老师费用和车费", async () => {
    const emailContent = `
昭昭 12.20 14:00-15:00 基础局 云云上 全款1500已付 给老师450 报销车费100
嘟嘟 12.21 16:00-18:00 深度局 皮皮上 定金750已付 尾款750未付 给老师600 老师打车50
    `.trim();

    const orders = await parseGmailOrderContent(emailContent);

    expect(orders).toHaveLength(2);

    // 第一个订单
    expect(orders[0].salesperson).toBe("昭昭");
    expect(orders[0].teacherFee).toBe(450);
    expect(orders[0].carFee).toBe(100);
    expect(orders[0].originalText).toContain("昭昭");
    expect(orders[0].originalText).toContain("12.20");

    // 第二个订单
    expect(orders[1].salesperson).toBe("嘟嘟");
    expect(orders[1].teacherFee).toBe(600);
    expect(orders[1].carFee).toBe(50);
    expect(orders[1].originalText).toContain("嘟嘟");
    expect(orders[1].originalText).toContain("12.21");
  }, 15000);

  it("应该正确处理复杂的老师费用表达", async () => {
    const emailContent = `
山竹 12.22 10:00-12:00 基础局 唐泽上 全款2400已付 给老师1260+240+100=1600
    `.trim();

    const orders = await parseGmailOrderContent(emailContent);

    expect(orders).toHaveLength(1);
    expect(orders[0].teacherFee).toBe(1600);
  }, 15000);

  it("应该正确处理酒店车费", async () => {
    const emailContent = `
ivy 12.23 18:00-20:00 女王局 水水上 全款3000已付 给老师900 240酒店+100打车
    `.trim();

    const orders = await parseGmailOrderContent(emailContent);

    expect(orders).toHaveLength(1);
    expect(orders[0].teacherFee).toBe(900);
    expect(orders[0].carFee).toBe(340); // 240 + 100
  }, 15000);

  it("应该正确保存单个订单的原始文本", async () => {
    const emailContent = `
昭昭 12.20 14:00-15:00 基础局 云云上 全款1500已付 给老师450 报销车费100
嘟嘟 12.21 16:00-18:00 深度局 皮皮上 定金750已付 尾款750未付 给老师600 老师打车50
    `.trim();

    const orders = await parseGmailOrderContent(emailContent);

    expect(orders).toHaveLength(2);

    // 每个订单的originalText应该只包含自己的内容,不包含其他订单
    expect(orders[0].originalText).toContain("昭昭");
    expect(orders[0].originalText).not.toContain("嘟嘟");

    expect(orders[1].originalText).toContain("嘟嘟");
    expect(orders[1].originalText).not.toContain("昭昭");
  }, 15000);

  it("应该在LLM返回0时使用正则提取的费用", async () => {
    // 这个测试验证fallback逻辑:如果LLM没有正确提取费用,正则表达式应该能够提取
    const emailContent = `
好好 12.24 20:00-21:00 丝足课 yy上 全款1500已付 给老师500 报销老师80车费
    `.trim();

    const orders = await parseGmailOrderContent(emailContent);

    expect(orders).toHaveLength(1);
    // 无论LLM是否提取成功,最终结果都应该有费用数据
    expect(orders[0].teacherFee).toBeGreaterThan(0);
    expect(orders[0].carFee).toBeGreaterThan(0);
  }, 15000);
});
