import { describe, it, expect } from "vitest";
import { parseGmailOrderContent } from "./gmailOrderParser";

describe("Gmail导入 - 渠道订单号提取", () => {
  it("应该正确提取交易单号", async () => {
    const emailContent = `
昭昭 12.17 晚晚 2400 已付 交易单号4200002971202512209215930344
瀛姬喵喵11:00-20:00 20:30-21:30 sp课 云云上 (无锡单)
无锡教室第三次使用
    `;

    const orders = await parseGmailOrderContent(emailContent);
    
    expect(orders).toHaveLength(1);
    expect(orders[0].channelOrderNo).toBe("4200002971202512209215930344");
  }, 10000);

  it("应该正确提取支付宝交易单号", async () => {
    const emailContent = `
嘟嘟 12.18 韩开银 1600 定金已付 交易单号2024121822001234567890123456
瀛姬小颖 14:00-16:00 裸足丝袜+埃及艳后 皮皮上 (济南)
给老师1260+240+100=1600
    `;

    const orders = await parseGmailOrderContent(emailContent);
    
    expect(orders).toHaveLength(1);
    expect(orders[0].channelOrderNo).toBe("2024121822001234567890123456");
  }, 10000);

  it("没有交易单号时应该返回空字符串", async () => {
    const emailContent = `
昭昭 12.19 小明 1800 已付
瀛姬喵喵11:00-20:00 18:00-20:00 sp课 云云上 (无锡单)
    `;

    const orders = await parseGmailOrderContent(emailContent);
    
    expect(orders).toHaveLength(1);
    expect(orders[0].channelOrderNo).toBe("");
  }, 10000);

  it("应该同时提取渠道订单号和支付方式", async () => {
    const emailContent = `
ivy 12.20 张三 2000 支付宝收款 交易单号1234567890
瀛姬喵喵11:00-20:00 10:00-12:00 sp课 橘子上 (上海)
    `;

    const orders = await parseGmailOrderContent(emailContent);
    
    expect(orders).toHaveLength(1);
    expect(orders[0].channelOrderNo).toBe("1234567890");
    expect(orders[0].paymentMethod).toBe("支付宝收款");
  }, 10000);

  it("应该正确提取多个订单的渠道订单号", async () => {
    const emailContent = `
昭昭 12.17 晚晚 2400 已付 交易单号4200002971202512209215930344
瀛姬喵喵11:00-20:00 20:30-21:30 sp课 云云上 (无锡单)

嘟嘟 12.18 韩开银 1600 定金已付 交易单号2024121822001234567890123456
瀛姬小颖 14:00-16:00 裸足丝袜+埃及艳后 皮皮上 (济南)
    `;

    const orders = await parseGmailOrderContent(emailContent);
    
    expect(orders).toHaveLength(2);
    expect(orders[0].channelOrderNo).toBe("4200002971202512209215930344");
    expect(orders[1].channelOrderNo).toBe("2024121822001234567890123456");
  }, 15000);
});
