import { describe, it, expect } from "vitest";
import { parseGmailOrderContent } from "./gmailOrderParser";

/**
 * 简化测试:只关注客户名识别是否正确
 * 不验证其他字段(如城市、金额等)
 */
describe("客户名识别修复测试(简化版)", () => {
  it("测试1: 山竹订单 - 客户名应该是HxL,不是老师名酥酥", async () => {
    const emailContent = `
瀛姬芊芊（11:00-20:00)  16:29
山竹 1.24 13:00-15:00基础局+裸足丝袜课  酥酥上 HxL （宁波上）订金1200已付 尾款1500未付 给老师500 周六上完课再打 （教室第一次使用）交易单号A2026012216054910041107
`;

    const orders = await parseGmailOrderContent(emailContent);
    expect(orders.length).toBe(1);
    
    const order = orders[0];
    console.log("测试1 - 实际解析结果:", {
      销售名: order.salesperson,
      老师名: order.teacher,
      客户名: order.customerName,
      城市: order.city,
    });
    
    // 关键验证: 客户名
    expect(order.customerName).toBe("HxL");
    expect(order.customerName).not.toBe("酥酥");
    expect(order.customerName).not.toBe("辛辛");
  }, 15000);

  it("测试2: 奈落订单 - 客户名应该是lsc,不是老师名yy", async () => {
    const emailContent = `
瀛姬奈落（11:00-20:00）  17:33
奈落 1.23 18:00-19:00 埃及艳后课1h yy上 lsc 1500全款已付 给老师300
交易单号：4200002893202601222239606610
`;

    const orders = await parseGmailOrderContent(emailContent);
    expect(orders.length).toBe(1);
    
    const order = orders[0];
    console.log("测试2 - 实际解析结果:", {
      销售名: order.salesperson,
      老师名: order.teacher,
      客户名: order.customerName,
    });
    
    // 关键验证: 客户名
    expect(order.customerName).toBe("lsc");
    expect(order.customerName).not.toBe("yy");
  }, 15000);

  it("测试3: 土豆订单 - 客户名应该是'某市民',不是老师名yy", async () => {
    const emailContent = `
瀛姬喵喵12:00-21:00  01:26
土豆1.23 14.00-15.00 sp 1h yy上（天津）某市民 定金750已付 尾款750未付 给老师300 交易编号A2026012221204210049774
`;

    const orders = await parseGmailOrderContent(emailContent);
    expect(orders.length).toBe(1);
    
    const order = orders[0];
    console.log("测试3 - 实际解析结果:", {
      销售名: order.salesperson,
      老师名: order.teacher,
      客户名: order.customerName,
      城市: order.city,
    });
    
    // 关键验证: 客户名
    expect(order.customerName).toBe("某市民");
    expect(order.customerName).not.toBe("yy");
    expect(order.customerName).not.toBe("天津");
  }, 15000);

  it("测试4: 山竹订单2 - 客户名应该是'剑桃',不是老师名yy", async () => {
    const emailContent = `
瀛姬安琪11:00-20:00  18:06
山竹 1.24 13:00-16:00 足下恩典+屈辱  yy上（天津上） 剑桃 6000全款已付 给老师900
交易单号：4200002905202601230071451409
`;

    const orders = await parseGmailOrderContent(emailContent);
    expect(orders.length).toBe(1);
    
    const order = orders[0];
    console.log("测试4 - 实际解析结果:", {
      销售名: order.salesperson,
      老师名: order.teacher,
      客户名: order.customerName,
      城市: order.city,
    });
    
    // 关键验证: 客户名
    expect(order.customerName).toBe("剑桃");
    expect(order.customerName).not.toBe("yy");
    expect(order.customerName).not.toBe("天津");
  }, 15000);

  it("测试5: 山竹订单3 - 客户名应该是'Gaho',不是老师名苏苏", async () => {
    const emailContent = `
瀛姬痴痴（中午12点-晚上9点）  18:45
山竹 1.26  11:00-13:00 女王局 +埃及艳后（第二节半价） 南京 苏苏上 Gaho 1000已付 1600未付 报销老师400车费  给老师900  交易单号4200002984202601214056373752
`;

    const orders = await parseGmailOrderContent(emailContent);
    expect(orders.length).toBe(1);
    
    const order = orders[0];
    console.log("测试5 - 实际解析结果:", {
      销售名: order.salesperson,
      老师名: order.teacher,
      客户名: order.customerName,
      城市: order.city,
    });
    
    // 关键验证: 客户名
    expect(order.customerName).toBe("Gaho");
    expect(order.customerName).not.toBe("苏苏");
    expect(order.customerName).not.toBe("南京");
  }, 15000);

  it("测试6: 山竹订单4 - 客户名应该是'卐ᯤ⁶ᴳ',不是老师名橘子", async () => {
    const emailContent = `
瀛姬思涵11:00-20:00  22:40
 山竹 1.24  13:30-18:00 基础局+埃及艳后+裸足丝袜课+深渊90分钟（ 重庆陪陵）  橘子上 卐ᯤ⁶ᴳ 8450已付 2450未付 报销老师2500机票加酒店   给老师4960 交易单号4200002901202601231973174642，4200002977202601233883456597
`;

    const orders = await parseGmailOrderContent(emailContent);
    expect(orders.length).toBe(1);
    
    const order = orders[0];
    console.log("测试6 - 实际解析结果:", {
      销售名: order.salesperson,
      老师名: order.teacher,
      客户名: order.customerName,
      城市: order.city,
    });
    
    // 关键验证: 客户名
    expect(order.customerName).toBe("卐ᯤ⁶ᴳ");
    expect(order.customerName).not.toBe("橘子");
    expect(order.customerName).not.toBe("重庆");
  }, 15000);
});
