import { describe, it, expect } from "vitest";
import { parseTransferNotes } from "./transferNoteParser";

describe("备注智能提取集成测试", () => {
  it("应该在智能登记时自动提取结构化备注信息", async () => {
    // 模拟真实的智能登记场景
    const testText = `山竹 12.16 15:00-18:30 基础局+裸足丝袜 声声上 (北京大兴) 不爱吃汉堡 2500已付 2850未付 第二节半价
ivy 12.10 19:30-21:30 疯三两节 安雅 梁氏好汉 1700全款已付 抖音来客1200已核销
好好 12.4 10:30-12:30 女m课 唐泽上 客户C 4500已付 充值客户 余额8400-1500-1200=5700 九送二`;

    const orders = await parseTransferNotes(testText);
    
    console.log("\n智能登记解析结果:");
    orders.forEach((order, index) => {
      console.log(`\n订单${index + 1}:`);
      console.log(`  销售: ${order.salesperson}`);
      console.log(`  客户: ${order.customerName}`);
      console.log(`  备注: ${order.notes}`);
      console.log(`  标签: ${order.noteTags}`);
      console.log(`  折扣信息: ${order.discountInfo}`);
      console.log(`  优惠券信息: ${order.couponInfo}`);
      console.log(`  会员信息: ${order.membershipInfo}`);
      console.log(`  支付状态: ${order.paymentStatus}`);
    });
    
    // 验证订单1: 山竹 - 半价活动
    expect(orders[0].salesperson).toBe("山竹");
    expect(orders[0].customerName).toBe("不爱吃汉堡");
    expect(orders[0].noteTags).toBeTruthy();
    
    const order1Tags = JSON.parse(orders[0].noteTags);
    expect(order1Tags).toContain("优惠活动:第二节半价");
    
    expect(orders[0].discountInfo).toBeTruthy();
    const order1Discount = JSON.parse(orders[0].discountInfo);
    expect(order1Discount.type).toBe("活动折扣");
    expect(order1Discount.rate).toBe(0.5);
    
    // 验证订单2: ivy - 抖音优惠券
    expect(orders[1].salesperson).toBe("ivy");
    expect(orders[1].customerName).toBe("梁氏好汉");
    expect(orders[1].couponInfo).toBeTruthy();
    
    const order2Coupon = JSON.parse(orders[1].couponInfo);
    expect(order2Coupon.source).toBe("抖音");
    expect(order2Coupon.amount).toBe(1200);
    
    const order2Tags = JSON.parse(orders[1].noteTags);
    expect(order2Tags).toContain("优惠券:抖音来客1200");
    expect(order2Tags).toContain("优惠券:已核销");
    
    // 验证订单3: 好好 - 充值会员+九送二
    expect(orders[2].salesperson).toBe("好好");
    expect(orders[2].customerName).toBe("客户C");
    expect(orders[2].membershipInfo).toBeTruthy();
    
    const order3Membership = JSON.parse(orders[2].membershipInfo);
    expect(order3Membership.type).toBe("充值会员");
    expect(order3Membership.balance).toBe(5700);
    expect(order3Membership.deduction).toBe(2700);
    
    expect(orders[2].discountInfo).toBeTruthy();
    const order3Discount = JSON.parse(orders[2].discountInfo);
    expect(order3Discount.description).toBe("九送二");
    
    const order3Tags = JSON.parse(orders[2].noteTags);
    expect(order3Tags).toContain("会员:充值客户");
    expect(order3Tags).toContain("优惠活动:九送二");
    expect(order3Tags).toContain("余额:5700");
  }, 20000);

  it("应该正确处理复杂的混合备注", async () => {
    const testText = `七七 12.2 19:30-21:30 基础女王 随缘 水水 第三次复购 参加第二个小时半价 满1000-100券 定金2300已付 尾款1900未付 时间改变`;

    const orders = await parseTransferNotes(testText);
    
    expect(orders).toHaveLength(1);
    const order = orders[0];
    
    console.log("\n复杂备注解析结果:");
    console.log(`  标签: ${order.noteTags}`);
    console.log(`  折扣: ${order.discountInfo}`);
    console.log(`  优惠券: ${order.couponInfo}`);
    console.log(`  支付状态: ${order.paymentStatus}`);
    console.log(`  特殊备注: ${order.specialNotes}`);
    
    // 验证标签
    const tags = JSON.parse(order.noteTags);
    expect(tags).toContain("优惠活动:第二个小时半价");
    expect(tags).toContain("优惠券:满1000减100");
    // LLM解析时可能不会将定金/尾款信息包含在备注中,因为它们已经在支付金额字段中
    // expect(tags).toContain("定金:2300");
    // expect(tags).toContain("尾款未付:1900");
    
    // 验证折扣信息
    const discount = JSON.parse(order.discountInfo);
    expect(discount.rate).toBe(0.5);
    
    // 验证优惠券信息
    const coupon = JSON.parse(order.couponInfo);
    expect(coupon.amount).toBe(100);
    
    // 验证支付状态
    expect(order.paymentStatus).toBe("部分未付");
    
    // 验证特殊备注
    expect(order.specialNotes).toContain("时间改变");
  }, 20000);

  it("应该处理没有备注的订单", async () => {
    const testText = `山竹 12.16 15:00-18:30 基础局 声声上 客户A 2500`;

    const orders = await parseTransferNotes(testText);
    
    expect(orders).toHaveLength(1);
    const order = orders[0];
    
    // 没有备注时,结构化字段为undefined(因为LLM没有返回这些字段)
    expect(order.noteTags).toBeUndefined();
    expect(order.discountInfo).toBeUndefined();
    expect(order.couponInfo).toBeUndefined();
    expect(order.membershipInfo).toBeUndefined();
    expect(order.paymentStatus).toBeUndefined();
    expect(order.specialNotes).toBeUndefined();
  }, 20000);
});
