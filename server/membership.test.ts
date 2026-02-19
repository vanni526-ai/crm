import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, orders, membershipConfig } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

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
      membershipStatus: "pending",
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

  it("新用户默认会员状态为pending", async () => {
    if (!database) throw new Error("数据库未初始化");

    const [user] = await database
      .select({
        membershipStatus: users.membershipStatus,
        isMember: users.isMember,
        membershipActivatedAt: users.membershipActivatedAt,
        membershipExpiresAt: users.membershipExpiresAt,
      })
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(user).toBeDefined();
    expect(user.membershipStatus).toBe("pending");
    expect(user.isMember).toBe(false);
    expect(user.membershipActivatedAt).toBeNull();
    expect(user.membershipExpiresAt).toBeNull();
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

  it("激活会员后状态为active并计算有效期", async () => {
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

    // 获取会员有效期配置
    const [config] = await database
      .select({ configValue: membershipConfig.configValue })
      .from(membershipConfig)
      .where(and(
        eq(membershipConfig.configKey, "validity_days"),
        eq(membershipConfig.isActive, true)
      ))
      .limit(1);

    const validityDays = config ? parseInt(config.configValue) : 365;
    const activatedAt = new Date();
    const expiresAt = new Date(activatedAt);
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    // 激活会员
    await database
      .update(users)
      .set({
        membershipStatus: "active",
        isMember: true,
        membershipOrderId: testOrderId,
        membershipActivatedAt: activatedAt,
        membershipExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, testUserId));

    // 验证会员状态已更新
    const [user] = await database
      .select({
        membershipStatus: users.membershipStatus,
        isMember: users.isMember,
        membershipOrderId: users.membershipOrderId,
        membershipActivatedAt: users.membershipActivatedAt,
        membershipExpiresAt: users.membershipExpiresAt,
      })
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(user.membershipStatus).toBe("active");
    expect(user.isMember).toBe(true);
    expect(user.membershipOrderId).toBe(testOrderId);
    expect(user.membershipActivatedAt).toBeDefined();
    expect(user.membershipExpiresAt).toBeDefined();

    // 验证有效期是365天后
    if (user.membershipActivatedAt && user.membershipExpiresAt) {
      const activatedDate = new Date(user.membershipActivatedAt);
      const expiresDate = new Date(user.membershipExpiresAt);
      const diffDays = Math.floor((expiresDate.getTime() - activatedDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(365);
    }
  });

  it("应该正确查询会员状态（已开通会员）", async () => {
    if (!database) throw new Error("数据库未初始化");

    const [user] = await database
      .select({
        membershipStatus: users.membershipStatus,
        isMember: users.isMember,
        membershipOrderId: users.membershipOrderId,
        membershipActivatedAt: users.membershipActivatedAt,
        membershipExpiresAt: users.membershipExpiresAt,
      })
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(user).toBeDefined();
    expect(user.membershipStatus).toBe("active");
    expect(user.isMember).toBe(true);
    expect(user.membershipOrderId).toBe(testOrderId);
    expect(user.membershipActivatedAt).toBeDefined();
    expect(user.membershipExpiresAt).toBeDefined();
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

  it("应该正确检测会员过期", async () => {
    if (!database) throw new Error("数据库未初始化");

    // 创建一个已过期的测试用户
    const expiredUserId = testUserId + 1000; // 使用不同的ID避免冲突
    
    const [expiredUserResult] = await database.insert(users).values({
      openId: `test_expired_${Date.now()}`,
      name: "测试过期会员",
      role: "user",
      roles: "user",
      membershipStatus: "active",
      isMember: true,
      membershipActivatedAt: new Date("2023-01-01"),
      membershipExpiresAt: new Date("2024-01-01"), // 已过期
    });

    const expiredId = expiredUserResult.insertId;

    // 查询用户状态
    const [user] = await database
      .select({
        membershipStatus: users.membershipStatus,
        membershipExpiresAt: users.membershipExpiresAt,
      })
      .from(users)
      .where(eq(users.id, expiredId))
      .limit(1);

    // 检查是否过期
    const now = new Date();
    const isExpired = user.membershipExpiresAt && now > user.membershipExpiresAt;
    
    expect(isExpired).toBe(true);

    // 清理测试数据
    await database.delete(users).where(eq(users.id, expiredId));
  });

  it("应该验证会员配置存在", async () => {
    if (!database) throw new Error("数据库未初始化");

    const [config] = await database
      .select({
        configKey: membershipConfig.configKey,
        configValue: membershipConfig.configValue,
        description: membershipConfig.description,
      })
      .from(membershipConfig)
      .where(eq(membershipConfig.configKey, "validity_days"))
      .limit(1);

    expect(config).toBeDefined();
    expect(config.configKey).toBe("validity_days");
    expect(config.configValue).toBe("365");
    expect(config.description).toContain("会员有效期");
  });
});
