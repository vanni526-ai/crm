import { describe, it, expect } from "vitest";
import { parseTransferNotes } from "./transferNoteParser";
import * as db from "./db";

describe("智能登记集成测试", () => {
  it("应该正确解析并准备创建订单数据", async () => {
    const testText = `山竹 12.16 15:00-18:30 基础局+裸足丝袜 声声上 (北京大兴) 不爱吃汉堡 2500已付
ivy 12.10 19.30-21.30 疯三两节 安雅 梁氏好汉 1700全款已付
好好 12.4 10:30-12:30 女m课 唐泽上 客户C 4500已付`;

    const result = await parseTransferNotes(testText);
    
    console.log("解析结果:", JSON.stringify(result, null, 2));
    
    // 验证解析结果
    expect(result).toHaveLength(3);
    
    // 验证第一条:山竹
    expect(result[0].salesperson).toBe("山竹");
    expect(result[0].customerName).toBe("不爱吃汉堡");
    expect(result[0].deliveryTeacher).toBe("声声");
    
    // 验证第二条:ivy
    expect(result[1].salesperson).toBe("ivy");
    expect(result[1].customerName).toBe("梁氏好汉");
    
    // 验证第三条:好好
    expect(result[2].salesperson).toBe("好好");
    expect(result[2].customerName).toBe("客户C");
    
    // 模拟查找销售人员ID的过程
    const allSalespersons = await db.getAllSalespersons();
    console.log("\n销售人员列表:", allSalespersons.map(s => ({
      id: s.id,
      name: s.name,
      nickname: s.nickname
    })));
    
    // 验证可以找到对应的销售人员
    for (const order of result) {
      if (order.salesperson) {
        const sp = allSalespersons.find(s => 
          s.nickname === order.salesperson || 
          s.name === order.salesperson
        );
        console.log(`\n销售人员"${order.salesperson}"查找结果:`, sp ? {
          id: sp.id,
          name: sp.name,
          nickname: sp.nickname
        } : "未找到");
        
        // 应该能找到匹配的销售人员
        expect(sp).toBeDefined();
        if (sp) {
          console.log(`  -> 将保存 salesId=${sp.id}, salesPerson=${sp.nickname || sp.name}`);
        }
      }
    }
  }, 15000); // 增加超时时间到15秒
});
