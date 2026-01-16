import { describe, it, expect } from "vitest";
import { parseGmailOrderContent } from "./gmailOrderParser";

describe("Gmail订单解析 - 理论课老师费用测试", () => {
  it("理论论课没有明确标注老师费用时,老师费用应为0", async () => {
    const emailContent = `
微信群"瀛姬合伙店打款群"的聊天记录如下:

瀛姬喵喵12:00-21:00  14:30
昭昭 1.15 14:00-16:00 理论课 云云 上海404教室 2400 支付宝收款
    `;

    const orders = await parseGmailOrderContent(emailContent);
    
    expect(orders).toHaveLength(1);
    expect(orders[0].course).toContain("理论课");
    expect(orders[0].teacherFee).toBe(0);
  }, 30000);

  it("理论课有明确标注老师费用时,应使用标注的费用", async () => {
    const emailContent = `
微信群"瀛姬合伙店打款群"的聊天记录如下:

瀛姬喵喵12:00-21:00  14:30
昭昭 1.15 14:00-16:00 理论课 云云 上海404教室 2400 给老师300 支付宝收款
    `;

    const orders = await parseGmailOrderContent(emailContent);
    
    expect(orders).toHaveLength(1);
    expect(orders[0].course).toContain("理论课");
    expect(orders[0].teacherFee).toBe(300);
  }, 30000);

  it("非理论课应正常计算老师费用", async () => {
    const emailContent = `
微信群"瀛姬合伙店打款群"的聊天记录如下:

瀛姬喵喵12:00-21:00  14:30
昭昭 1.15 14:00-16:00 sp课 云云 上海404教室 2400 给老师600 支付宝收款
    `;

    const orders = await parseGmailOrderContent(emailContent);
    
    expect(orders).toHaveLength(1);
    expect(orders[0].course).toBe("sp课");
    expect(orders[0].teacherFee).toBe(600);
  }, 30000);

  it("理论课使用课时费表达时,应使用标注的费用", async () => {
    const emailContent = `
微信群"瀛姬合伙店打款群"的聊天记录如下:

瀛姬喵喵12:00-21:00  14:30
昭昭 1.15 14:00-16:00 理论课 云云 上海404教室 2400 课时费500 支付宝收款
    `;

    const orders = await parseGmailOrderContent(emailContent);
    
    expect(orders).toHaveLength(1);
    expect(orders[0].course).toContain("理论课");
    expect(orders[0].teacherFee).toBe(500);
  }, 30000);
});
