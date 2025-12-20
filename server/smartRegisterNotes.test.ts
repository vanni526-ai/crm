import { describe, it, expect } from "vitest";
import { parseTransferNotes } from "./transferNoteParser";

describe("智能登记备注字段测试", () => {
  it("应该正确保存LLM返回的备注信息,不包含聊天记录元数据", async () => {
    // 模拟用户粘贴的聊天记录格式
    const testText = `树莓啵啵  14:04

七七 12.2 基础女王 （参加第二个小时半价）随缘 水水 19:30-21:30 （第三次复购）（i404）


树莓啵啵  14:04

虞餍 12.3 17:00-18:00 基础课 安雅上 全款900已付（i404）`;

    const result = await parseTransferNotes(testText);
    
    console.log("解析结果:", JSON.stringify(result, null, 2));
    
    // 验证解析结果
    expect(result.length).toBeGreaterThan(0);
    
    // 检查每个订单的备注
    result.forEach((order, index) => {
      console.log(`\n订单${index + 1}:`);
      console.log(`  销售: ${order.salesperson}`);
      console.log(`  客户: ${order.customerName}`);
      console.log(`  备注: ${order.notes}`);
      
      // 备注不应该包含"树莓啵啵"或时间戳
      if (order.notes) {
        expect(order.notes).not.toContain("树莓啵啵");
        expect(order.notes).not.toMatch(/\d{2}:\d{2}/); // 不应包含时间戳格式
      }
    });
  }, 15000);

  it("应该保留LLM解析的有效备注信息", async () => {
    const testText = `山竹 12.16 15:00-18:30 基础局+裸足丝袜 声声上 (北京大兴) 不爱吃汉堡 2500已付 2850未付 给声声报销400车费`;

    const result = await parseTransferNotes(testText);
    
    console.log("解析结果:", JSON.stringify(result, null, 2));
    
    expect(result).toHaveLength(1);
    
    // 备注应该包含有用的信息(如果LLM提取了的话)
    console.log("备注内容:", result[0].notes);
    
    // 备注不应该包含完整的原始文本
    if (result[0].notes) {
      expect(result[0].notes).not.toContain("[原始文本]");
    }
  }, 15000);
});
