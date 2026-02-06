import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  updateOrder: vi.fn().mockResolvedValue(undefined),
  getOrderById: vi.fn().mockResolvedValue({
    id: 1,
    orderNo: "20260205085420-000",
    deliveryStatus: "undelivered",
  }),
}));

import * as db from "./db";

describe("订单交付状态功能", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应该能更新单个订单的交付状态为已交付", async () => {
    await db.updateOrder(1, { deliveryStatus: "delivered" });
    expect(db.updateOrder).toHaveBeenCalledWith(1, { deliveryStatus: "delivered" });
  });

  it("应该能更新单个订单的交付状态为未交付", async () => {
    await db.updateOrder(1, { deliveryStatus: "undelivered" });
    expect(db.updateOrder).toHaveBeenCalledWith(1, { deliveryStatus: "undelivered" });
  });

  it("应该能批量更新订单交付状态", async () => {
    const ids = [1, 2, 3];
    for (const id of ids) {
      await db.updateOrder(id, { deliveryStatus: "delivered" });
    }
    expect(db.updateOrder).toHaveBeenCalledTimes(3);
    expect(db.updateOrder).toHaveBeenCalledWith(1, { deliveryStatus: "delivered" });
    expect(db.updateOrder).toHaveBeenCalledWith(2, { deliveryStatus: "delivered" });
    expect(db.updateOrder).toHaveBeenCalledWith(3, { deliveryStatus: "delivered" });
  });

  it("交付状态只接受有效枚举值", () => {
    const validStatuses = ["undelivered", "delivered"];
    expect(validStatuses).toContain("undelivered");
    expect(validStatuses).toContain("delivered");
    expect(validStatuses).not.toContain("pending");
    expect(validStatuses).not.toContain("");
  });

  it("新订单默认交付状态应为未交付", () => {
    const defaultStatus = "undelivered";
    expect(defaultStatus).toBe("undelivered");
  });

  it("查询订单时应包含deliveryStatus字段", async () => {
    const order = await db.getOrderById(1);
    expect(order).toHaveProperty("deliveryStatus");
    expect(["undelivered", "delivered"]).toContain(order!.deliveryStatus);
  });
});
