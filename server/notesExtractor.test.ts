import { describe, it, expect } from "vitest";
import { extractNotesInfo } from "./notesExtractor";

describe("备注智能提取测试", () => {
  it("应该提取优惠活动信息", () => {
    const notes = "参加第二个小时半价";
    const result = extractNotesInfo(notes);
    
    expect(result.tags).toContain("优惠活动:第二个小时半价");
    expect(result.discountInfo).not.toBeNull();
    expect(result.discountInfo?.type).toBe("活动折扣");
    expect(result.discountInfo?.rate).toBe(0.5);
  });

  it("应该提取送课活动信息", () => {
    const notes = "九送二活动";
    const result = extractNotesInfo(notes);
    
    expect(result.tags).toContain("优惠活动:九送二");
    expect(result.discountInfo).not.toBeNull();
    expect(result.discountInfo?.type).toBe("赠送活动");
  });

  it("应该提取折扣信息", () => {
    const notes = "使用市场部8折优惠券";
    const result = extractNotesInfo(notes);
    
    expect(result.tags).toContain("优惠活动:8折");
    expect(result.discountInfo?.rate).toBe(0.8);
  });

  it("应该提取抖音来客优惠券", () => {
    const notes = "抖音来客1200已核销";
    const result = extractNotesInfo(notes);
    
    expect(result.tags).toContain("优惠券:抖音来客1200");
    expect(result.tags).toContain("优惠券:已核销");
    expect(result.couponInfo).not.toBeNull();
    expect(result.couponInfo?.source).toBe("抖音");
    expect(result.couponInfo?.amount).toBe(1200);
  });

  it("应该提取满减券信息", () => {
    const notes = "满1000-100券,抵扣100";
    const result = extractNotesInfo(notes);
    
    expect(result.tags).toContain("优惠券:满1000减100");
    expect(result.couponInfo).not.toBeNull();
    expect(result.couponInfo?.amount).toBe(100);
  });

  it("应该提取会员充值信息", () => {
    const notes = "充值客户 余额8400-1500-1200=5700";
    const result = extractNotesInfo(notes);
    
    expect(result.tags).toContain("会员:充值客户");
    expect(result.tags).toContain("余额:5700");
    expect(result.membershipInfo).not.toBeNull();
    expect(result.membershipInfo?.type).toBe("充值会员");
    expect(result.membershipInfo?.balance).toBe(5700);
    expect(result.membershipInfo?.deduction).toBe(2700);
  });

  it("应该提取复购信息", () => {
    const notes = "第三次复购 九送二 还剩4.5节";
    const result = extractNotesInfo(notes);
    
    expect(result.tags).toContain("复购:第三次");
    expect(result.tags).toContain("优惠活动:九送二");
    expect(result.tags).toContain("剩余课时:4.5节");
  });

  it("应该提取支付状态 - 全款已付", () => {
    const notes = "全款已付";
    const result = extractNotesInfo(notes);
    
    expect(result.paymentStatus).toBe("全款已付");
    expect(result.tags).toContain("支付:全款已付");
  });

  it("应该提取支付状态 - 定金和尾款", () => {
    const notes = "定金2300已付 尾款1900未付";
    const result = extractNotesInfo(notes);
    
    expect(result.paymentStatus).toBe("部分未付");
    expect(result.tags).toContain("定金:2300");
    expect(result.tags).toContain("尾款未付:1900");
  });

  it("应该提取巡游信息", () => {
    const notes = "成都上 巡游30%";
    const result = extractNotesInfo(notes);
    
    expect(result.tags).toContain("巡游:30%");
    expect(result.tags).toContain("外地:成都");
  });

  it("应该处理复杂备注", () => {
    const notes = "第三次复购 九送二 充值客户 余额5100 抖音来客1200已核销 定金2300已付 尾款1900未付 时间改变";
    const result = extractNotesInfo(notes);
    
    console.log("复杂备注提取结果:", result);
    
    // 验证标签
    expect(result.tags).toContain("复购:第三次");
    expect(result.tags).toContain("优惠活动:九送二");
    expect(result.tags).toContain("会员:充值客户");
    expect(result.tags).toContain("优惠券:抖音来客1200");
    expect(result.tags).toContain("定金:2300");
    expect(result.tags).toContain("尾款未付:1900");
    
    // 验证结构化信息
    expect(result.discountInfo).not.toBeNull();
    expect(result.couponInfo).not.toBeNull();
    expect(result.membershipInfo).not.toBeNull();
    expect(result.paymentStatus).toBe("部分未付");
    expect(result.specialNotes).toContain("时间改变");
  });

  it("应该处理空备注", () => {
    const result = extractNotesInfo("");
    
    expect(result.tags).toHaveLength(0);
    expect(result.discountInfo).toBeNull();
    expect(result.couponInfo).toBeNull();
    expect(result.membershipInfo).toBeNull();
    expect(result.paymentStatus).toBe("");
    expect(result.specialNotes).toBe("");
  });

  it("应该处理无关键词的备注", () => {
    const notes = "客户很满意";
    const result = extractNotesInfo(notes);
    
    expect(result.tags).toHaveLength(0);
    expect(result.discountInfo).toBeNull();
    expect(result.couponInfo).toBeNull();
  });
});
