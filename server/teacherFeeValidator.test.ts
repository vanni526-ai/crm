import { describe, it, expect } from "vitest";
import { validateTeacherFee, batchValidateTeacherFees } from "./teacherFeeValidator";

describe("老师费用验证", () => {
  describe("validateTeacherFee", () => {
    it("老师费用为0时应该通过验证", () => {
      const result = validateTeacherFee(0, 1000);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("老师费用为null时应该通过验证", () => {
      const result = validateTeacherFee(null, 1000);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("老师费用小于课程金额时应该通过验证", () => {
      const result = validateTeacherFee(500, 1000);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("老师费用等于课程金额时应该通过验证", () => {
      const result = validateTeacherFee(1000, 1000);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("老师费用超过课程金额时应该验证失败", () => {
      const result = validateTeacherFee(1500, 1000);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("老师费用");
      expect(result.error).toContain("不能超过");
      expect(result.error).toContain("课程金额");
    });

    it("课程金额为0但老师费用不为0时应该验证失败", () => {
      const result = validateTeacherFee(500, 0);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("课程金额为空或0时,不能设置老师费用");
    });

    it("课程金额为null但老师费用不为0时应该验证失败", () => {
      const result = validateTeacherFee(500, null);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("课程金额为空或0时,不能设置老师费用");
    });

    it("老师费用为负数时应该验证失败", () => {
      const result = validateTeacherFee(-100, 1000);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("老师费用不能为负数");
    });

    it("课程金额为负数时应该验证失败", () => {
      const result = validateTeacherFee(500, -1000);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("课程金额不能为负数");
    });

    it("老师费用占课程金额80%以上时应该给出警告", () => {
      const result = validateTeacherFee(900, 1000);
      expect(result.isValid).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("比例较高");
    });

    it("老师费用占课程金额80%以下时不应该给出警告", () => {
      const result = validateTeacherFee(700, 1000);
      expect(result.isValid).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });

  describe("batchValidateTeacherFees", () => {
    it("应该批量验证多个订单", () => {
      const orders = [
        { id: 1, orderNo: "ORD001", teacherFee: 500, courseAmount: 1000 },
        { id: 2, orderNo: "ORD002", teacherFee: 1500, courseAmount: 1000 },
        { id: 3, orderNo: "ORD003", teacherFee: null, courseAmount: 1000 },
      ];

      const results = batchValidateTeacherFees(orders);

      expect(results).toHaveLength(3);
      expect(results[0].validation.isValid).toBe(true);
      expect(results[1].validation.isValid).toBe(false);
      expect(results[2].validation.isValid).toBe(true);
    });

    it("应该返回正确的订单ID和订单号", () => {
      const orders = [
        { id: 1, orderNo: "ORD001", teacherFee: 500, courseAmount: 1000 },
      ];

      const results = batchValidateTeacherFees(orders);

      expect(results[0].orderId).toBe(1);
      expect(results[0].orderNo).toBe("ORD001");
    });
  });

  describe("真实场景测试", () => {
    it("案例1: 课程金额2680,老师费用1340(50%)", () => {
      const result = validateTeacherFee(1340, 2680);
      expect(result.isValid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it("案例2: 课程金额2680,老师费用2680(100%,应警告)", () => {
      const result = validateTeacherFee(2680, 2680);
      expect(result.isValid).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("100%");
    });

    it("案例3: 课程金额2680,老师费用3000(超过)", () => {
      const result = validateTeacherFee(3000, 2680);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("3000");
      expect(result.error).toContain("2680");
    });

    it("案例4: 课程金额1000,老师费用850(85%,应警告)", () => {
      const result = validateTeacherFee(850, 1000);
      expect(result.isValid).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("85%");
    });
  });
});
