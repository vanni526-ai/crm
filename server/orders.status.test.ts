import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Orders Status Update APIs", () => {
  let testOrderId: number;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    // 创建测试用的caller，模拟销售人员权限
    caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: "test_sales_open_id",
        name: "测试销售",
        username: "测试销售",
        email: "test@example.com",
        phone: "13800138000",
        role: "sales",
        roles: "sales",
        city: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 创建一个测试订单
    const order = await caller.orders.userCreate({
      customerName: "测试客户",
      customerPhone: "13800138001",
      courseAmount: "1000",
      paymentAmount: "1000",
      trafficSource: "测试来源",
      salesPerson: "测试销售",
      deliveryCity: "上海",
      deliveryCourse: "测试课程",
    });

    testOrderId = order.id;
  });

  describe("updateStatus - 更新订单支付状态", () => {
    it("应该成功将订单状态从pending更新为paid", async () => {
      const result = await caller.orders.updateStatus({
        id: testOrderId,
        status: "paid",
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message", "订单状态更新成功");

      // 验证订单状态已更新
      const order = await caller.orders.getById({ id: testOrderId });
      expect(order?.status).toBe("paid");
    });

    it("应该成功将订单状态更新为completed", async () => {
      const result = await caller.orders.updateStatus({
        id: testOrderId,
        status: "completed",
      });

      expect(result).toHaveProperty("success", true);

      // 验证订单状态已更新
      const order = await caller.orders.getById({ id: testOrderId });
      expect(order?.status).toBe("completed");
    });

    it("应该成功将订单状态更新为cancelled", async () => {
      const result = await caller.orders.updateStatus({
        id: testOrderId,
        status: "cancelled",
      });

      expect(result).toHaveProperty("success", true);

      // 验证订单状态已更新
      const order = await caller.orders.getById({ id: testOrderId });
      expect(order?.status).toBe("cancelled");
    });
  });

  describe("updateDeliveryStatus - 更新订单交付状态", () => {
    it("应该成功将交付状态从pending更新为accepted", async () => {
      const result = await caller.orders.updateDeliveryStatus({
        id: testOrderId,
        deliveryStatus: "accepted",
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message", "订单交付状态更新成功");

      // 验证交付状态已更新
      const order = await caller.orders.getById({ id: testOrderId });
      expect(order?.deliveryStatus).toBe("accepted");
    });

    it("应该成功将交付状态更新为delivered", async () => {
      const result = await caller.orders.updateDeliveryStatus({
        id: testOrderId,
        deliveryStatus: "delivered",
      });

      expect(result).toHaveProperty("success", true);

      // 验证交付状态已更新
      const order = await caller.orders.getById({ id: testOrderId });
      expect(order?.deliveryStatus).toBe("delivered");
    });
  });

  describe("updateFields - 通用订单字段更新", () => {
    it("应该成功同时更新订单状态和交付信息", async () => {
      const result = await caller.orders.updateFields({
        id: testOrderId,
        data: {
          status: "paid",
          deliveryStatus: "accepted",
          deliveryTeacher: "测试老师",
          deliveryCity: "北京",
          deliveryRoom: "测试教室",
          deliveryCourse: "更新后的课程",
        },
      });

      expect(result).toBeDefined();

      // 验证所有字段已更新
      const order = await caller.orders.getById({ id: testOrderId });
      expect(order?.status).toBe("paid");
      expect(order?.deliveryStatus).toBe("accepted");
      expect(order?.deliveryTeacher).toBe("测试老师");
      expect(order?.deliveryCity).toBe("北京");
      expect(order?.deliveryRoom).toBe("测试教室");
      expect(order?.deliveryCourse).toBe("更新后的课程");
    });

    it("应该成功只更新部分字段", async () => {
      const result = await caller.orders.updateFields({
        id: testOrderId,
        data: {
          deliveryTeacher: "新老师",
        },
      });

      expect(result).toBeDefined();

      // 验证字段已更新
      const order = await caller.orders.getById({ id: testOrderId });
      expect(order?.deliveryTeacher).toBe("新老师");
    });
  });

  describe("getTeacherOrders - 老师端查询订单", () => {
    beforeAll(async () => {
      // 重置测试订单状态为已支付但未交付
      await caller.orders.updateFields({
        id: testOrderId,
        data: {
          status: "paid",
          deliveryStatus: "pending",
          deliveryTeacher: "测试老师",
          deliveryCity: "上海",
        },
      });
    });

    it("应该返回已支付但未交付的订单", async () => {
      const result = await caller.orders.getTeacherOrders({
        page: 1,
        pageSize: 10,
      });

      expect(result).toHaveProperty("orders");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.orders)).toBe(true);
      
      // 验证返回的订单都是已支付但未交付的
      result.orders.forEach((order) => {
        expect(order.status).toBe("paid");
        expect(order.deliveryStatus).toBe("pending");
      });
    });

    it("应该支持按老师名称筛选", async () => {
      const result = await caller.orders.getTeacherOrders({
        page: 1,
        pageSize: 10,
        teacherName: "测试老师",
      });

      expect(result).toHaveProperty("orders");
      expect(Array.isArray(result.orders)).toBe(true);
      
      // 验证返回的订单都属于指定老师
      result.orders.forEach((order) => {
        expect(order.deliveryTeacher).toBe("测试老师");
      });
    });

    it("应该支持按城市筛选", async () => {
      const result = await caller.orders.getTeacherOrders({
        page: 1,
        pageSize: 10,
        city: "上海",
      });

      expect(result).toHaveProperty("orders");
      expect(Array.isArray(result.orders)).toBe(true);
      
      // 验证返回的订单都属于指定城市
      result.orders.forEach((order) => {
        expect(order.deliveryCity).toBe("上海");
      });
    });

    it("应该支持分页", async () => {
      const result = await caller.orders.getTeacherOrders({
        page: 1,
        pageSize: 5,
      });

      expect(result).toHaveProperty("orders");
      expect(result).toHaveProperty("total");
      expect(result.orders.length).toBeLessThanOrEqual(5);
    });
  });
});
