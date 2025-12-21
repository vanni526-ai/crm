import { describe, it, expect } from "vitest";
import { parseTransferNotes } from "./transferNoteParser";

describe("智能登记字段提取修复测试", () => {
  it("应该正确提取渠道订单号(交易单号)", async () => {
    const testText = `山竹 12.20 16:10-17:10基础局  韦德上 阿Q  1200全款微信已付 （上海404 ）给老师300 交易单号4200002971202512209215930344`;

    const orders = await parseTransferNotes(testText);
    
    console.log("\n渠道订单号提取结果:");
    console.log(`  销售: ${orders[0].salesperson}`);
    console.log(`  客户: ${orders[0].customerName}`);
    console.log(`  渠道订单号: ${orders[0].channelOrderNo}`);
    console.log(`  老师费用: ${orders[0].teacherFee}`);
    
    expect(orders).toHaveLength(1);
    expect(orders[0].salesperson).toBe("山竹");
    expect(orders[0].customerName).toBe("阿Q");
    expect(orders[0].channelOrderNo).toBe("4200002971202512209215930344");
    expect(orders[0].teacherFee).toBe("300");
  }, 20000);

  it("应该正确区分老师车费和老师费用", async () => {
    const testText = `山竹 12.20 21:30-23:30 基础局+线下乳首课   唐泽上    JoeGong 1200定金已付 1600尾款未付（上海404 ）报销老师100车费 给老师600  支付宝收款`;

    const orders = await parseTransferNotes(testText);
    
    console.log("\n车费和老师费用提取结果:");
    console.log(`  销售: ${orders[0].salesperson}`);
    console.log(`  客户: ${orders[0].customerName}`);
    console.log(`  车费: ${orders[0].transportFee}`);
    console.log(`  老师费用: ${orders[0].teacherFee}`);
    console.log(`  备注: ${orders[0].notes}`);
    
    expect(orders).toHaveLength(1);
    expect(orders[0].salesperson).toBe("山竹");
    expect(orders[0].customerName).toBe("JoeGong");
    expect(orders[0].transportFee).toBe("100");
    expect(orders[0].teacherFee).toBe("600");
    // 车费和老师费用应该分开
    expect(orders[0].transportFee).not.toBe(orders[0].teacherFee);
  }, 20000);

  it("应该正确识别作废订单", async () => {
    const testText = `作废 山竹 12.22 20:00-21:30 情趣变装课   黑桃上 晓曦东晨  1888全款微信已付 （上海404 ）给老师300 交易单号4200002912202512208697791196

山竹 12.22 20:00-21:30 情趣变装课   黑桃上 晓曦东晨  1888全款微信已付 （上海404 ）给老师450  交易单号4200002912202512208697791196`;

    const orders = await parseTransferNotes(testText);
    
    console.log("\n作废订单识别结果:");
    orders.forEach((order, index) => {
      console.log(`\n订单${index + 1}:`);
      console.log(`  销售: ${order.salesperson}`);
      console.log(`  客户: ${order.customerName}`);
      console.log(`  是否作废: ${order.isVoided}`);
      console.log(`  老师费用: ${order.teacherFee}`);
    });
    
    expect(orders).toHaveLength(2);
    
    // 第一个订单应该被标记为作废
    expect(orders[0].isVoided).toBe(true);
    expect(orders[0].salesperson).toBe("山竹");
    expect(orders[0].teacherFee).toBe("300");
    
    // 第二个订单不是作废
    expect(orders[1].isVoided).toBe(false);
    expect(orders[1].salesperson).toBe("山竹");
    expect(orders[1].teacherFee).toBe("450");
  }, 20000);

  it("应该正确处理复杂的聊天记录格式", async () => {
    const testText = `瀛姬芊芊（11:00-20:00)  16:05

山竹 12.20 16:10-17:10基础局  韦德上 阿Q  1200全款微信已付 （上海404 ）给老师300 交易单号4200002971202512209215930344


瀛姬痴痴（中午12点-晚上9点）  17:27

作废 山竹 12.22 20:00-21:30 情趣变装课   黑桃上 晓曦东晨  1888全款微信已付 （上海404 ）给老师300 交易单号4200002912202512208697791196


瀛姬弥音  23:16

山竹 12.20 23:30-0:30 问罪   淼淼上    John 600定金已付 1500尾款未付（上海1101）报销老师100车费 给老师400  交易单号4200002889202512208422971999`;

    const orders = await parseTransferNotes(testText);
    
    console.log("\n聊天记录格式解析结果:");
    orders.forEach((order, index) => {
      console.log(`\n订单${index + 1}:`);
      console.log(`  销售: ${order.salesperson}`);
      console.log(`  客户: ${order.customerName}`);
      console.log(`  是否作废: ${order.isVoided}`);
      console.log(`  渠道订单号: ${order.channelOrderNo}`);
      console.log(`  车费: ${order.transportFee}`);
      console.log(`  老师费用: ${order.teacherFee}`);
    });
    
    expect(orders).toHaveLength(3);
    
    // 订单1: 正常订单,有交易单号
    expect(orders[0].isVoided).toBe(false);
    expect(orders[0].customerName).toBe("阿Q");
    expect(orders[0].channelOrderNo).toBe("4200002971202512209215930344");
    expect(orders[0].teacherFee).toBe("300");
    
    // 订单2: 作废订单
    expect(orders[1].isVoided).toBe(true);
    expect(orders[1].customerName).toBe("晓曦东晨");
    
    // 订单3: 有车费和老师费用
    expect(orders[2].isVoided).toBe(false);
    expect(orders[2].customerName).toBe("John");
    expect(orders[2].transportFee).toBe("100");
    expect(orders[2].teacherFee).toBe("400");
    expect(orders[2].channelOrderNo).toBe("4200002889202512208422971999");
  }, 30000);
});
