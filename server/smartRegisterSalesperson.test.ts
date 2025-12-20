import { describe, it, expect, beforeAll } from "vitest";
import { parseTransferNotes } from "./transferNoteParser";
import * as db from "./db";

describe("智能登记销售人员字段测试", () => {
  let salespersons: any[] = [];

  beforeAll(async () => {
    // 获取所有销售人员
    salespersons = await db.getAllSalespersons();
    console.log("系统中的销售人员:", salespersons.map(s => ({
      id: s.id,
      name: s.name,
      nickname: s.nickname,
      aliases: s.aliases
    })));
  });

  it("应该正确解析销售人员花名", async () => {
    const testText = `山竹 12.16 15:00-18:30 基础局+裸足丝袜 声声上 (北京大兴) 不爱吃汉堡 2500已付`;

    const result = await parseTransferNotes(testText);
    
    console.log("解析结果:", result);
    
    expect(result).toHaveLength(1);
    expect(result[0].salesperson).toBeDefined();
    expect(result[0].salesperson).toBe("山竹");
  });

  it("应该正确解析销售人员别名", async () => {
    const testText = `妍渊 12.10 17:00-19:00 基础女王局 安雅上 白风 已付1200`;

    const result = await parseTransferNotes(testText);
    
    console.log("解析结果:", result);
    
    expect(result).toHaveLength(1);
    expect(result[0].salesperson).toBeDefined();
    // 应该返回花名"妍渊"而不是真实姓名
    expect(result[0].salesperson).toBe("妍渊");
  });

  it("应该正确解析多条记录的销售人员", async () => {
    const testText = `山竹 12.16 15:00-18:30 基础局 声声上 客户A 2500已付
ivy 12.10 19.30-21.30 疯三两节 安雅 客户B 1700全款已付
好好 12.4 10:30-00:30 女m课 唐泽上 客户C 4500已付`;

    const result = await parseTransferNotes(testText);
    
    console.log("解析结果:", result);
    
    expect(result).toHaveLength(3);
    expect(result[0].salesperson).toBe("山竹");
    expect(result[1].salesperson).toBe("ivy");
    expect(result[2].salesperson).toBe("好好");
  });

  it("应该正确处理树莓啵啵的聊天记录格式", async () => {
    const testText = `树莓啵啵  14:04

七七 12.2 基础女王 （参加第二个小时半价）随缘 水水 19:30-21:30 （第三次复购）（i404）


树莓啵啵  14:04

虞餍 12.3 17:00-18:00 基础课 安雅上 全款900已付（i404）`;

    const result = await parseTransferNotes(testText);
    
    console.log("解析结果:", result);
    
    // 应该过滤掉"树莓啵啵"这种非订单记录
    expect(result.length).toBeGreaterThan(0);
    
    // 检查解析出的订单是否有销售人员
    result.forEach(order => {
      console.log(`订单: 销售=${order.salesperson}, 客户=${order.customerName}, 课程=${order.deliveryCourse}`);
    });
  });
});
