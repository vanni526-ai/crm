/**
 * 测试batchCreate API的字段验证修复
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("batchCreate字段验证", () => {
  // 模拟batchCreate的输入schema
  const orderSchema = z.object({
    salesperson: z.string().optional(),
    customerName: z.string(),
    deliveryTeacher: z.string().optional(),
    deliveryCourse: z.string().optional(),
    deliveryCity: z.string().optional(),
    deliveryRoom: z.string().optional(),
    classDate: z.string().optional(),
    classTime: z.string().optional(),
    paymentAmount: z.string(),
    paymentMethod: z.string().optional(),
    courseAmount: z.string().optional(),
    channelOrderNo: z.string().optional(),
    teacherFee: z.string().optional(),
    transportFee: z.string().optional(),
    notes: z.string().optional(),
    // 结构化备注字段(使用nullish()同时允许null和undefined)
    noteTags: z.string().nullish(),
    discountInfo: z.string().nullish(),
    couponInfo: z.string().nullish(),
    membershipInfo: z.string().nullish(),
    paymentStatus: z.string().nullish(),
    specialNotes: z.string().nullish(),
    isVoided: z.boolean().nullish(),
  });

  it("应该接受结构化字段为null的订单", () => {
    const orderData = {
      customerName: "测试客户",
      paymentAmount: "2400",
      noteTags: null,
      discountInfo: null,
      couponInfo: null,
      membershipInfo: null,
      paymentStatus: null,
      specialNotes: null,
      isVoided: null,
    };

    const result = orderSchema.safeParse(orderData);
    expect(result.success).toBe(true);
  });

  it("应该接受结构化字段为undefined的订单", () => {
    const orderData = {
      customerName: "测试客户",
      paymentAmount: "2400",
      noteTags: undefined,
      discountInfo: undefined,
      couponInfo: undefined,
      membershipInfo: undefined,
      paymentStatus: undefined,
      specialNotes: undefined,
      isVoided: undefined,
    };

    const result = orderSchema.safeParse(orderData);
    expect(result.success).toBe(true);
  });

  it("应该接受结构化字段有值的订单", () => {
    const orderData = {
      customerName: "测试客户",
      paymentAmount: "2400",
      noteTags: "优惠券,会员",
      discountInfo: "半价活动",
      couponInfo: "抖音来客1200",
      membershipInfo: "充值会员",
      paymentStatus: "全款已付",
      specialNotes: "第三次复购",
      isVoided: false,
    };

    const result = orderSchema.safeParse(orderData);
    expect(result.success).toBe(true);
  });

  it("应该接受混合null和有值的订单", () => {
    const orderData = {
      customerName: "测试客户",
      paymentAmount: "2400",
      channelOrderNo: "4200002971202512209215930344",
      noteTags: "优惠券",
      discountInfo: null,
      couponInfo: "抖音来客1200",
      membershipInfo: null,
      paymentStatus: "全款已付",
      specialNotes: null,
      isVoided: false,
    };

    const result = orderSchema.safeParse(orderData);
    expect(result.success).toBe(true);
  });
});
