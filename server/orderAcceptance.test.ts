import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("订单接单功能测试", () => {
  let testTeacherId: number;
  let testOrderId: number;

  beforeAll(async () => {
    // 查找一个老师用户
    const teachers = await db.getAllUsers();
    const teacher = teachers.find(u => u.roles?.includes("teacher"));
    if (!teacher) {
      throw new Error("测试需要至少一个teacher角色的用户");
    }
    testTeacherId = teacher.id;

    // 查找任意一个待接单的订单（不限制老师）
    const allOrders = await db.getAllOrders();
    const pendingOrder = allOrders.find(o => o.deliveryStatus === "pending");
    if (!pendingOrder) {
      throw new Error("测试需要至少一个待接单的订单");
    }
    testOrderId = pendingOrder.id;
  });

  it("应该能够查询分配给老师的订单", async () => {
    const orders = await db.getTeacherOrders(testTeacherId);
    expect(Array.isArray(orders)).toBe(true);
  });

  it("应该能够按交付状态筛选订单", async () => {
    const pendingOrders = await db.getTeacherOrders(testTeacherId, "pending");
    expect(Array.isArray(pendingOrders)).toBe(true);
    
    if (pendingOrders.length > 0) {
      expect(pendingOrders[0].deliveryStatus).toBe("pending");
    }
  });

  it("应该能够接单并更新订单状态", async () => {
    // 获取接单前的订单状态
    const orderBefore = await db.getOrderById(testOrderId);
    expect(orderBefore).toBeTruthy();
    expect(orderBefore!.deliveryStatus).toBe("pending");

    // 接单
    await db.updateOrder(testOrderId, {
      deliveryStatus: "accepted",
      acceptedAt: new Date(),
      acceptedBy: testTeacherId,
    });

    // 验证接单后的状态
    const orderAfter = await db.getOrderById(testOrderId);
    expect(orderAfter).toBeTruthy();
    expect(orderAfter!.deliveryStatus).toBe("accepted");
    expect(orderAfter!.acceptedBy).toBe(testTeacherId);
    expect(orderAfter!.acceptedAt).toBeTruthy();

    // 恢复测试数据
    await db.updateOrder(testOrderId, {
      deliveryStatus: "pending",
      acceptedAt: null,
      acceptedBy: null,
    });
  });

  it("deliveryStatus枚举值应该包含pending/accepted/delivered", async () => {
    const order = await db.getOrderById(testOrderId);
    expect(order).toBeTruthy();
    expect(["pending", "accepted", "delivered"]).toContain(order!.deliveryStatus);
  });
});
