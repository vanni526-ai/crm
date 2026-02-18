import { describe, it, expect } from "vitest";

describe("订单智能解析API测试", () => {
  it("测试用例1: 标准订单解析", async () => {
    const orderText = `山竹 1.24 13:00-15:00 基础局+裸足丝袜课 酥酥上 HxL（宁波上）订金1200已付 尾款1800未付 给老师600 交易单号A2026012119504910049723`;
    
    // 预期解析结果
    const expected = {
      salesperson: "山竹",
      customerName: "HxL",
      classDate: "2025-01-24",
      classTime: "13:00-15:00",
      course: "基础局+裸足丝袜课",
      teacher: "酥酥",
      city: "宁波",
      paymentAmount: 3000,
      downPayment: 1200,
      finalPayment: 1800,
      teacherFee: 600,
      channelOrderNo: "A2026012119504910049723",
      paymentMethod: "支付宝" // 自动识别
    };
    
    console.log("测试用例1: 标准订单解析");
    console.log("输入文本:", orderText);
    console.log("预期结果:", expected);
  });

  it("测试用例2: 理论课订单（老师费用为0）", async () => {
    const orderText = `嘟嘟 1.15 19:00-20:00 理论课 云云上（上海404教室）小明 1500全款已付 交易单号4200002971202512209215930344`;
    
    const expected = {
      salesperson: "嘟嘟",
      customerName: "小明",
      classDate: "2025-01-15",
      classTime: "19:00-20:00",
      course: "理论课",
      teacher: "云云",
      city: "上海",
      classroom: "404教室",
      paymentAmount: 1500,
      teacherFee: 0, // 理论课默认为0
      channelOrderNo: "4200002971202512209215930344",
      paymentMethod: "微信" // 自动识别
    };
    
    console.log("测试用例2: 理论课订单");
    console.log("输入文本:", orderText);
    console.log("预期结果:", expected);
  });

  it("测试用例3: 作废订单", async () => {
    const orderText = `作废 山竹 1.16 19:30-21:30 基础局+医生 米妮上（广州巡游）1000订金已付 3200尾款未付 给老师1260 交易单号4200002917202601132625805238`;
    
    const expected = {
      salesperson: "山竹",
      customerName: "作废 山竹", // 保留作废标记
      classDate: "2025-01-16",
      classTime: "19:30-21:30",
      course: "基础局+医生",
      teacher: "米妮",
      city: "广州",
      paymentAmount: 4200,
      downPayment: 1000,
      finalPayment: 3200,
      teacherFee: 1260,
      channelOrderNo: "4200002917202601132625805238",
      isVoidOrder: true // 标记为作废订单
    };
    
    console.log("测试用例3: 作废订单");
    console.log("输入文本:", orderText);
    console.log("预期结果:", expected);
  });

  it("测试用例4: 账户余额抵扣订单", async () => {
    const orderText = `土豆 1.23 14:00-15:00 sp 1h yy上（天津）某市民 定金750已付 余额 6200抵扣 2400剩 3800 交易单号A2026012213174510046217`;
    
    const expected = {
      salesperson: "土豆",
      customerName: "某市民",
      classDate: "2025-01-23",
      classTime: "14:00-15:00",
      course: "sp 1h",
      teacher: "yy",
      city: "天津",
      downPayment: 750,
      accountBalance: 3800, // 提取余额
      channelOrderNo: "A2026012213174510046217",
      paymentMethod: "支付宝"
    };
    
    console.log("测试用例4: 账户余额抵扣订单");
    console.log("输入文本:", orderText);
    console.log("预期结果:", expected);
  });

  it("测试用例5: 包含车费的订单", async () => {
    const orderText = `昭昭 1.20 18:00-20:00 埃及艳后+裸足丝袜 晚晚上（武汉）张三 5000全款已付 给老师2000 报销老师100车费 交易单号4200002971202512209215930344`;
    
    const expected = {
      salesperson: "昭昭",
      customerName: "张三",
      classDate: "2025-01-20",
      classTime: "18:00-20:00",
      course: "埃及艳后+裸足丝袜",
      teacher: "晚晚",
      city: "武汉",
      paymentAmount: 5000,
      teacherFee: 2000,
      carFee: 100, // 提取车费
      partnerFee: 1200, // 自动计算：(5000-2000)*40%
      channelOrderNo: "4200002971202512209215930344",
      paymentMethod: "微信"
    };
    
    console.log("测试用例5: 包含车费的订单");
    console.log("输入文本:", orderText);
    console.log("预期结果:", expected);
  });
});
