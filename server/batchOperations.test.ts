import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(role: "admin" | "sales" | "finance" | "user" = "admin"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    nickname: "测试用户",
    loginMethod: "manus",
    role,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("batch operations", () => {
  it("should batch delete multiple orders successfully", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建测试客户
    const customer = await caller.customers.create({
      name: "批量删除测试客户",
      wechatId: "wxbatchdelete" + Date.now(),
    });

    // 创建多个测试订单
    const order1 = await caller.orders.create({
      orderNo: "BATCH1" + Date.now(),
      customerId: customer.id,
      customerName: "批量删除测试客户",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      status: "paid",
    });

    const order2 = await caller.orders.create({
      orderNo: "BATCH2" + Date.now(),
      customerId: customer.id,
      customerName: "批量删除测试客户",
      paymentAmount: "2000.00",
      courseAmount: "2000.00",
      status: "paid",
    });

    const order3 = await caller.orders.create({
      orderNo: "BATCH3" + Date.now(),
      customerId: customer.id,
      customerName: "批量删除测试客户",
      paymentAmount: "3000.00",
      courseAmount: "3000.00",
      status: "paid",
    });

    // 批量删除订单
    const result = await caller.orders.batchDelete({ 
      ids: [order1.id, order2.id, order3.id] 
    });

    expect(result.success).toBe(true);
    expect(result.count).toBe(3);

    // 验证订单已被删除
    const orders = await caller.orders.list();
    const deletedOrder1 = orders.find(o => o.id === order1.id);
    const deletedOrder2 = orders.find(o => o.id === order2.id);
    const deletedOrder3 = orders.find(o => o.id === order3.id);
    
    expect(deletedOrder1).toBeUndefined();
    expect(deletedOrder2).toBeUndefined();
    expect(deletedOrder3).toBeUndefined();
  });

  it("should batch update order status successfully", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建测试客户
    const customer = await caller.customers.create({
      name: "批量更新测试客户",
      wechatId: "wxbatchupdate" + Date.now(),
    });

    // 创建多个测试订单
    const order1 = await caller.orders.create({
      orderNo: "BATCHUPD1" + Date.now(),
      customerId: customer.id,
      customerName: "批量更新测试客户",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      status: "pending",
    });

    const order2 = await caller.orders.create({
      orderNo: "BATCHUPD2" + Date.now(),
      customerId: customer.id,
      customerName: "批量更新测试客户",
      paymentAmount: "2000.00",
      courseAmount: "2000.00",
      status: "pending",
    });

    // 批量更新订单状态
    const result = await caller.orders.batchUpdateStatus({ 
      ids: [order1.id, order2.id],
      status: "completed"
    });

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);

    // 验证订单状态已更新
    const orders = await caller.orders.list();
    const updatedOrder1 = orders.find(o => o.id === order1.id);
    const updatedOrder2 = orders.find(o => o.id === order2.id);
    
    expect(updatedOrder1?.status).toBe("completed");
    expect(updatedOrder2?.status).toBe("completed");
  });

  it("should allow sales role to batch delete orders", async () => {
    const { ctx } = createTestContext("sales");
    const caller = appRouter.createCaller(ctx);

    // 创建测试客户
    const customer = await caller.customers.create({
      name: "销售批量删除测试",
      wechatId: "wxsalesbatch" + Date.now(),
    });

    // 创建测试订单
    const order1 = await caller.orders.create({
      orderNo: "SALESBATCH1" + Date.now(),
      customerId: customer.id,
      customerName: "销售批量删除测试",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      status: "paid",
    });

    const order2 = await caller.orders.create({
      orderNo: "SALESBATCH2" + Date.now(),
      customerId: customer.id,
      customerName: "销售批量删除测试",
      paymentAmount: "2000.00",
      courseAmount: "2000.00",
      status: "paid",
    });

    // 销售角色批量删除订单
    const result = await caller.orders.batchDelete({ 
      ids: [order1.id, order2.id] 
    });

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
  });

  it("should batch update to different statuses", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建测试客户
    const customer = await caller.customers.create({
      name: "状态测试客户",
      wechatId: "wxstatustest" + Date.now(),
    });

    // 测试所有状态转换
    const statuses: Array<"pending" | "paid" | "completed" | "cancelled" | "refunded"> = 
      ["pending", "paid", "completed", "cancelled", "refunded"];

    for (const status of statuses) {
      const order = await caller.orders.create({
        orderNo: "STATUS" + status + Date.now(),
        customerId: customer.id,
        customerName: "状态测试客户",
        paymentAmount: "1000.00",
        courseAmount: "1000.00",
        status: "pending",
      });

      // 更新到目标状态
      await caller.orders.batchUpdateStatus({ 
        ids: [order.id],
        status
      });

      // 验证状态已更新
      const orders = await caller.orders.list();
      const updatedOrder = orders.find(o => o.id === order.id);
      expect(updatedOrder?.status).toBe(status);
    }
  });

  it("should handle empty batch operations gracefully", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 空数组批量删除
    const deleteResult = await caller.orders.batchDelete({ ids: [] });
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.count).toBe(0);

    // 空数组批量更新
    const updateResult = await caller.orders.batchUpdateStatus({ 
      ids: [],
      status: "paid"
    });
    expect(updateResult.success).toBe(true);
    expect(updateResult.count).toBe(0);
  });
});
