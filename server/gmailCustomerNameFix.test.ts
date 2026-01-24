import { describe, it, expect } from "vitest";
import { parseGmailOrderContent } from "./gmailOrderParser";

/**
 * 测试修复后的客户名识别逻辑
 * 
 * 问题: LLM把"山竹"和"HxL"识别成"山竹"和"辛辛"
 * 原因: 客户名识别规则不够明确,把老师名误识别为客户名
 * 修复: 优化prompt,明确客户名在老师名之后、金额信息之前的位置规则
 */
describe("客户名识别修复测试", () => {
  it("应该正确识别客户名HxL,而不是把老师名酥酥识别为客户名", async () => {
    const emailContent = `
瀛姬芊芊（11:00-20:00)  16:29
山竹 1.24 13:00-15:00基础局+裸足丝袜课  酥酥上 HxL （宁波上）订金1200已付 尾款1500未付 给老师500 周六上完课再打 （教室第一次使用）交易单号A2026012216054910041107
`;

    const orders = await parseGmailOrderContent(emailContent);
    
    expect(orders.length).toBe(1);
    const order = orders[0];
    
    // 验证销售名
    expect(order.salesperson).toBe("山竹");
    
    // 验证老师名
    expect(order.teacher).toBe("酥酥");
    
    // 验证客户名 - 关键测试点
    expect(order.customerName).toBe("HxL");
    expect(order.customerName).not.toBe("酥酥"); // 不应该是老师名
    expect(order.customerName).not.toBe("辛辛"); // 不应该是错误的识别结果
    
    // 验证其他字段
    expect(order.deliveryCity).toBe("宁波");
    expect(order.downPayment).toBe(1200);
    expect(order.finalPayment).toBe(1500);
    expect(order.teacherFee).toBe(500);
  }, 15000);

  it("应该正确识别客户名lsc,而不是把老师名yy识别为客户名", async () => {
    const emailContent = `
瀛姬奈落（11:00-20:00）  17:33
奈落 1.23 18:00-19:00 埃及艳后课1h yy上 lsc 1500全款已付 给老师300
交易单号：4200002893202601222239606610
`;

    const orders = await parseGmailOrderContent(emailContent);
    
    expect(orders.length).toBe(1);
    const order = orders[0];
    
    // 验证销售名
    expect(order.salesperson).toBe("奈落");
    
    // 验证老师名
    expect(order.teacher).toBe("yy");
    
    // 验证客户名 - 关键测试点
    expect(order.customerName).toBe("lsc");
    expect(order.customerName).not.toBe("yy"); // 不应该是老师名
    
    // 验证其他字段
    expect(order.paymentAmount).toBe(1500);
    expect(order.teacherFee).toBe(300);
  }, 15000);

  it("应该正确识别客户名'某市民',而不是把老师名yy识别为客户名", async () => {
    const emailContent = `
瀛姬喵喵12:00-21:00  01:26
土豆1.23 14.00-15.00 sp 1h yy上（天津）某市民 定金750已付 尾款750未付 给老师300 交易编号A2026012221204210049774
`;

    const orders = await parseGmailOrderContent(emailContent);
    
    expect(orders.length).toBe(1);
    const order = orders[0];
    
    // 验证销售名
    expect(order.salesperson).toBe("土豆");
    
    // 验证老师名
    expect(order.teacher).toBe("yy");
    
    // 验证客户名 - 关键测试点
    expect(order.customerName).toBe("某市民");
    expect(order.customerName).not.toBe("yy"); // 不应该是老师名
    expect(order.customerName).not.toBe("天津"); // 不应该是城市名
    
    // 验证其他字段
    expect(order.deliveryCity).toBe("天津");
    expect(order.downPayment).toBe(750);
    expect(order.finalPayment).toBe(750);
    expect(order.teacherFee).toBe(300);
  }, 15000);

  it("应该正确识别客户名'剑桃',而不是把老师名yy识别为客户名", async () => {
    const emailContent = `
瀛姬安琪11:00-20:00  18:06
山竹 1.24 13:00-16:00 足下恩典+屈辱  yy上（天津上） 剑桃 6000全款已付 给老师900
交易单号：4200002905202601230071451409
`;

    const orders = await parseGmailOrderContent(emailContent);
    
    expect(orders.length).toBe(1);
    const order = orders[0];
    
    // 验证销售名
    expect(order.salesperson).toBe("山竹");
    
    // 验证老师名
    expect(order.teacher).toBe("yy");
    
    // 验证客户名 - 关键测试点
    expect(order.customerName).toBe("剑桃");
    expect(order.customerName).not.toBe("yy"); // 不应该是老师名
    expect(order.customerName).not.toBe("天津"); // 不应该是城市名
    
    // 验证其他字段
    expect(order.deliveryCity).toBe("天津");
    expect(order.paymentAmount).toBe(6000);
    expect(order.teacherFee).toBe(900);
  }, 15000);

  it("应该正确识别客户名'Gaho',而不是把老师名苏苏识别为客户名", async () => {
    const emailContent = `
瀛姬痴痴（中午12点-晚上9点）  18:45
山竹 1.26  11:00-13:00 女王局 +埃及艳后（第二节半价） 南京 苏苏上 Gaho 1000已付 1600未付 报销老师400车费  给老师900  交易单号4200002984202601214056373752
`;

    const orders = await parseGmailOrderContent(emailContent);
    
    expect(orders.length).toBe(1);
    const order = orders[0];
    
    // 验证销售名
    expect(order.salesperson).toBe("山竹");
    
    // 验证老师名
    expect(order.teacher).toBe("苏苏");
    
    // 验证客户名 - 关键测试点
    expect(order.customerName).toBe("Gaho");
    expect(order.customerName).not.toBe("苏苏"); // 不应该是老师名
    expect(order.customerName).not.toBe("南京"); // 不应该是城市名
    
    // 验证其他字段
    expect(order.deliveryCity).toBe("南京");
    expect(order.downPayment).toBe(1000);
    expect(order.finalPayment).toBe(1600);
    expect(order.carFee).toBe(400);
    expect(order.teacherFee).toBe(900);
  }, 15000);

  it("应该正确处理复杂客户名'卐ᯤ⁶ᴳ',而不是把老师名橘子识别为客户名", async () => {
    const emailContent = `
瀛姬思涵11:00-20:00  22:40
 山竹 1.24  13:30-18:00 基础局+埃及艳后+裸足丝袜课+深渊90分钟（ 重庆陪陵）  橘子上 卐ᯤ⁶ᴳ 8450已付 2450未付 报销老师2500机票加酒店   给老师4960 交易单号4200002901202601231973174642，4200002977202601233883456597
`;

    const orders = await parseGmailOrderContent(emailContent);
    
    expect(orders.length).toBe(1);
    const order = orders[0];
    
    // 验证销售名
    expect(order.salesperson).toBe("山竹");
    
    // 验证老师名
    expect(order.teacher).toBe("橘子");
    
    // 验证客户名 - 关键测试点
    expect(order.customerName).toBe("卐ᯤ⁶ᴳ");
    expect(order.customerName).not.toBe("橘子"); // 不应该是老师名
    expect(order.customerName).not.toBe("重庆"); // 不应该是城市名
    
    // 验证其他字段
    expect(order.deliveryCity).toBe("重庆");
    expect(order.downPayment).toBe(8450);
    expect(order.finalPayment).toBe(2450);
    expect(order.carFee).toBe(2500);
    expect(order.teacherFee).toBe(4960);
  }, 15000);
});
