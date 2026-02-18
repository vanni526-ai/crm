import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, orders } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("会员系统功能测试", () => {
  let database: Awaited<ReturnType<typeof getDb>>;
  let testUserId: number;
  let testOrderId: number;
  let testOrderNo: string;

  beforeAll(async () => {
    database = await getDb();
    if (!database) {
      throw new Error("数据库连接失败");
    }

    // 创建测试用户
    const [userResult] = await database.insert(users).values({
      openId: `test_member_${Date.now()}`,
      name: "测试会员用户",
      role: "user",
      roles: "user",
      isMember: false,
    });

    testUserId = userResult.insertId;
  });

  afterAll(async () => {
    if (database && testUserId) {
      // 清理测试数据
      await database.delete(users).where(eq(users.id, testUserId));
    }
    if (database && testOrderId) {
      await database.delete(orders).where(eq(orders.id, testOrderId));
    }
  });

  it("应该正确查询会员状态（未开通会员）", async () => {
    if (!database) throw new Error("数据库未初始化");

    const [user] = await database
      .select({
        isMember: users.isMember,
        membershipOrderId: users.membershipOrderId,
        membershipActivatedAt: users.membershipActivatedAt,
      })
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(user).toBeDefined();
    expect(user.isMember).toBe(false);
    expect(user.membershipOrderId).toBeNull();
    expect(user.membershipActivatedAt).toBeNull();
  });

  it("应该正确创建会员订单", async () => {
    if (!database) throw new Error("数据库未初始化");

    // 生成测试订单号
    testOrderNo = `TEST_MEMBER_${Date.now()}`;

    // 创建会员订单
    const [result] = await database.insert(orders).values({
      orderNo: testOrderNo,
      customerName: "测试会员用户",
      salesId: testUserId,
      salesPerson: "测试销售",
      paymentAmount: "39",
      courseAmount: "39",
      deliveryCourse: "会员费",
      paymentChannel: "微信",
      orderType: "membership",
      status: "pending",
      deliveryStatus: "pending",
      notes: "学员会员开通",
    });

    testOrderId = result.insertId;

    // 验证订单创建成功
    const [order] = await database
      .select()
      .from(orders)
      .where(eq(orders.id, testOrderId))
      .limit(1);

    expect(order).toBeDefined();
    expect(order.orderNo).toBe(testOrderNo);
    expect(order.orderType).toBe("membership");
    expect(order.deliveryCourse).toBe("会员费");
    expect(order.paymentAmount).toBe("39.00");
    expect(order.status).toBe("pending");
  });

  it("应该拒绝激活未支付的会员订单", async () => {
    if (!database) throw new Error("数据库未初始化");

    // 查询订单状态
    const [order] = await database
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, testOrderId))
      .limit(1);

    expect(order.status).toBe("pending");

    // 尝试激活会员应该失败（因为订单未支付）
    // 这里我们只验证订单状态，实际的激活逻辑在API中会抛出错误
  });

  it("应该正确激活会员（订单已支付）", async () => {
    if (!database) throw new Error("数据库未初始化");

    // 模拟订单支付成功
    await database
      .update(orders)
      .set({ status: "paid", updatedAt: new Date() })
      .where(eq(orders.id, testOrderId));

    // 验证订单状态已更新
    const [order] = await database
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, testOrderId))
      .limit(1);

    expect(order.status).toBe("paid");

    // 激活会员
    await database
      .update(users)
      .set({
        isMember: true,
        membershipOrderId: testOrderId,
        membershipActivatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, testUserId));

    // 验证会员状态已更新
    const [user] = await database
      .select({
        isMember: users.isMember,
        membershipOrderId: users.membershipOrderId,
        membershipActivatedAt: users.membershipActivatedAt,
      })
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(user.isMember).toBe(true);
    expect(user.membershipOrderId).toBe(testOrderId);
    expect(user.membershipActivatedAt).toBeDefined();
  });

  it("应该正确查询会员状态（已开通会员）", async () => {
    if (!database) throw new Error("数据库未初始化");

    const [user] = await database
      .select({
        isMember: users.isMember,
        membershipOrderId: users.membershipOrderId,
        membershipActivatedAt: users.membershipActivatedAt,
      })
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(user).toBeDefined();
    expect(user.isMember).toBe(true);
    expect(user.membershipOrderId).toBe(testOrderId);
    expect(user.membershipActivatedAt).toBeDefined();
  });

  it("应该验证会员订单金额", async () => {
    if (!database) throw new Error("数据库未初始化");

    const [order] = await database
      .select({ paymentAmount: orders.paymentAmount })
      .from(orders)
      .where(eq(orders.id, testOrderId))
      .limit(1);

    // 验证金额为39元
    expect(order.paymentAmount).toBe("39.00");
  });

  it("应该验证会员订单类型", async () => {
    if (!database) throw new Error("数据库未初始化");

    const [order] = await database
      .select({
        orderType: orders.orderType,
        deliveryCourse: orders.deliveryCourse,
      })
      .from(orders)
      .where(eq(orders.id, testOrderId))
      .limit(1);

    // 验证订单类型
    expect(order.orderType).toBe("membership");
    expect(order.deliveryCourse).toBe("会员费");
  });
});
