import { describe, it, expect } from "vitest";
import { parseTransferNotes } from "./transferNoteParser";

/**
 * LLM智能解析优化测试
 * 测试新增的功能:
 * 1. 提高准确率
 * 2. 增强容错性
 * 3. 扩展识别能力(退款、补课、多人拼课、存课)
 * 4. 智能纠错
 */

describe("LLM智能解析优化测试", () => {
  // 测试1: 多行格式订单
  it("应该正确解析多行格式的订单", async () => {
    const text = `嘟嘟 
12.21 13:00-15:00 
臣服剧本课，
姜一上，
长风404
涛涛10800 全款已付
9送2=13200-6500=6700
给老师600 支付宝付款`;

    const orders = await parseTransferNotes(text);
    expect(orders).toHaveLength(1);
    expect(orders[0].deliveryCourse).toContain("臣服剧本课");
    expect(orders[0].deliveryTeacher).toContain("姜一");
    expect(orders[0].customerName).toBe("涛涛");
    expect(parseFloat(orders[0].paymentAmount)).toBe(10800);
    expect(parseFloat(orders[0].teacherFee)).toBe(600);
    expect(orders[0].notes).toContain("9送2");
  }, 30000);

  // 测试2: 存课场景
  it("应该正确识别存课场景", async () => {
    const text = `夏鑫 12月21日 存一节裸足丝袜课+流放剧本 YY老师面销 5000 给老师500 望山全款5000 4200002984202512216346104594 4200002991202512210344645644`;

    const orders = await parseTransferNotes(text);
    expect(orders).toHaveLength(1);
    expect(orders[0].deliveryCourse).toContain("存");
    expect(orders[0].customerName).toBe("望山");
    expect(parseFloat(orders[0].paymentAmount)).toBe(5000);
    expect(parseFloat(orders[0].teacherFee)).toBe(500);
    // 检查多个交易单号是否用逗号分隔
    expect(orders[0].channelOrderNo).toContain(",");
    expect(orders[0].notes).toContain("存课");
  }, 30000);

  // 测试3: 促销计算场景
  it("应该正确处理促销计算信息", async () => {
    const text = `夏鑫 1月2日 14:00~17:00 3个小时基础女王局 歪歪老师上 天津单 全款3000（第三节课半价）Augustin.W 给老师600 支付宝支付`;

    const orders = await parseTransferNotes(text);
    expect(orders).toHaveLength(1);
    expect(orders[0].deliveryCourse).toContain("基础女王局");
    expect(orders[0].customerName).toBe("Augustin.W");
    expect(parseFloat(orders[0].paymentAmount)).toBe(3000);
    expect(orders[0].notes).toContain("半价");
  }, 30000);

  // 测试4: 教室使用备注
  it("应该正确保留教室使用备注", async () => {
    const text = `山竹 12.23 20:30-21:30 tk 昭昭上 （大连）从不服输 750定金已付 750未付 给老师300 （大连教室第一次使用）4200002887202512219062635765`;

    const orders = await parseTransferNotes(text);
    expect(orders).toHaveLength(1);
    expect(orders[0].deliveryCity).toBe("大连");
    expect(orders[0].customerName).toBe("从不服输");
    expect(parseFloat(orders[0].paymentAmount)).toBe(750);
    expect(parseFloat(orders[0].courseAmount)).toBe(1500);
    expect(orders[0].notes).toContain("教室第一次使用");
  }, 30000);

  // 测试5: 全角数字容错
  it("应该正确处理全角数字", async () => {
    const text = `夏鑫 12月25日 13:00~15：00 2个小时基础女王局 米妮老师上 上海404 全款２４００ Ethanys 给老师400 支付宝收款`;

    const orders = await parseTransferNotes(text);
    expect(orders).toHaveLength(1);
    expect(parseFloat(orders[0].paymentAmount)).toBe(2400);
  }, 30000);

  // 测试6: 智能纠错 - 日期格式
  it("应该自动补充年份", async () => {
    const text = `山竹 12.25 14:00-16:00 基础局 声声上 客户A 1000已付`;

    const orders = await parseTransferNotes(text);
    expect(orders).toHaveLength(1);
    // 检查日期是否包含年份
    expect(orders[0].classDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }, 30000);

  // 测试7: 智能纠错 - 地点分离
  it("应该自动分离城市和教室", async () => {
    const text = `山竹 12.25 14:00-16:00 基础局 声声上 上海404 客户A 1000已付`;

    const orders = await parseTransferNotes(text);
    expect(orders).toHaveLength(1);
    expect(orders[0].deliveryCity).toBe("上海");
    expect(orders[0].deliveryRoom).toBe("404");
  }, 30000);

  // 测试8: 多人拼课场景
  it("应该正确识别多人拼课", async () => {
    const text = `山竹 12.27 基础局 yy上yaya上 客户B和客户C 3000已付`;

    const orders = await parseTransferNotes(text);
    expect(orders).toHaveLength(1);
    expect(orders[0].customerName).toContain("和");
    expect(orders[0].deliveryTeacher).toContain("yy");
    expect(orders[0].deliveryTeacher).toContain("yaya");
  }, 30000);

  // 测试9: 退款场景
  it("应该正确处理退款场景(金额为负数)", async () => {
    const text = `山竹 12.25 退款 客户名 退款1000`;

    const orders = await parseTransferNotes(text);
    expect(orders).toHaveLength(1);
    expect(orders[0].deliveryCourse).toContain("退款");
    expect(parseFloat(orders[0].paymentAmount)).toBeLessThan(0);
  }, 30000);

  // 测试10: 补课场景
  it("应该正确识别补课场景", async () => {
    const text = `山竹 12.26 补课 声声上 客户A 500已付`;

    const orders = await parseTransferNotes(text);
    expect(orders).toHaveLength(1);
    expect(orders[0].deliveryCourse).toContain("补课");
    expect(parseFloat(orders[0].paymentAmount)).toBe(500);
  }, 30000);
});
