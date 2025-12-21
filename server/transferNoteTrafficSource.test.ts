import { describe, it, expect } from "vitest";
import { parseTransferNotes } from "./transferNoteParser";

describe("智能登记流量来源和渠道订单号提取测试", () => {
  it("应该能提取渠道订单号", async () => {
    const text = `山竹 12.20 16:10-17:10基础局 韦德上 阿Q 1200全款微信已付 (上海404) 给老师300 交易单号4200002971202512209215930344`;
    
    const results = await parseTransferNotes(text);
    
    expect(results.length).toBeGreaterThan(0);
    const order = results[0];
    expect(order.channelOrderNo).toBe("4200002971202512209215930344");
    expect(order.customerName).toBe("阿Q");
    expect(order.teacherFee).toBe("300");
  }, 30000);

  it("应该能提取流量来源(微信群)", async () => {
    const text = `
微信群"本部及巡游打款群"的聊天记录如下:

山竹 12.20 16:10-17:10基础局 韦德上 阿Q 1200全款微信已付 (上海404) 给老师300 交易单号4200002971202512209215930344
`;
    
    const results = await parseTransferNotes(text);
    
    expect(results.length).toBeGreaterThan(0);
    const order = results[0];
    
    // 流量来源应该提取微信群名称
    expect(order.trafficSource).toContain("本部及巡游打款群");
  }, 30000);

  it("应该能同时提取渠道订单号和流量来源", async () => {
    const text = `
来源:微信群"课程销售群"

山竹 12.22 20:00-21:30 情趣变装课 黑桃上 晓曦东晨 1888全款微信已付 (上海404) 给老师450 交易单号4200002912202512208697791196
`;
    
    const results = await parseTransferNotes(text);
    
    expect(results.length).toBeGreaterThan(0);
    const order = results[0];
    expect(order.channelOrderNo).toBe("4200002912202512208697791196");
    expect(order.trafficSource).toBeTruthy();
    expect(order.customerName).toBe("晓曦东晨");
  }, 30000);

  it("没有流量来源时应该留空", async () => {
    const text = `山竹 12.20 16:10-17:10基础局 韦德上 阿Q 1200全款微信已付 (上海404) 给老师300`;
    
    const results = await parseTransferNotes(text);
    
    expect(results.length).toBeGreaterThan(0);
    const order = results[0];
    expect(order.trafficSource).toBeFalsy();
  }, 30000);

  it("没有渠道订单号时应该留空", async () => {
    const text = `山竹 12.20 16:10-17:10基础局 韦德上 阿Q 1200全款微信已付 (上海404) 给老师300`;
    
    const results = await parseTransferNotes(text);
    
    expect(results.length).toBeGreaterThan(0);
    const order = results[0];
    expect(order.channelOrderNo).toBeFalsy();
  }, 30000);
});
