import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { orders, schedules, matchedScheduleOrders } from "../drizzle/schema";
import { eq } from "drizzle-orm";

function createTestContext(role: "admin" | "finance" | "sales" = "admin") {
  return {
    user: {
      id: 1,
      openId: `test-${role}`,
      name: `测试${role}`,
      role,
      isActive: true,
    },
    req: {} as any,
    res: {} as any,
  };
}

describe("Reconciliation (财务对账)", () => {
  let adminCaller: ReturnType<typeof appRouter.createCaller>;
  let testScheduleId: number;
  let testOrderId: number;

  beforeAll(async () => {
    // 创建管理员caller
    const ctx = createTestContext("admin");
    adminCaller = appRouter.createCaller(ctx);

    // 创建测试数据
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建测试订单
    const [orderResult] = await db.insert(orders).values({
      orderNo: "TEST-ORDER-001",
      customerName: "测试客户",
      salesId: 1,
      salesPerson: "测试销售",
      deliveryTeacher: "测试老师",
      deliveryCourse: "测试课程",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      classDate: new Date("2025-01-15"),
      classTime: "14:00-16:00",
      deliveryCity: "上海",
      channelOrderNo: "CH-001",
      status: "paid",
    });
    testOrderId = Number(orderResult.insertId);

    // 创建测试课程日程
    const [scheduleResult] = await db.insert(schedules).values({
      customerName: "测试客户",
      deliveryTeacher: "测试老师",
      deliveryCourse: "测试课程",
      courseAmount: "1000.00",
      classDate: new Date("2025-01-15"),
      classTime: "14:00-16:00",
      deliveryCity: "上海",
      channelOrderNo: "CH-001",
      courseType: "测试课程",
      startTime: new Date("2025-01-15T14:00:00"),
      endTime: new Date("2025-01-15T16:00:00"),
      status: "scheduled",
    });
    testScheduleId = Number(scheduleResult.insertId);
  });

  afterAll(async () => {
    // 清理测试数据
    const db = await getDb();
    if (!db) return;

    await db.delete(matchedScheduleOrders).where(eq(matchedScheduleOrders.scheduleId, testScheduleId));
    await db.delete(schedules).where(eq(schedules.id, testScheduleId));
    await db.delete(orders).where(eq(orders.id, testOrderId));
  });

  it("应该能获取未匹配的课程日程", async () => {
    const result = await adminCaller.reconciliation.getUnmatchedSchedules();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    // 测试数据应该在未匹配列表中
    const testSchedule = result.find((s) => s.id === testScheduleId);
    expect(testSchedule).toBeDefined();
    expect(testSchedule?.customerName).toBe("测试客户");
  });

  it("应该能获取未匹配的订单", async () => {
    const result = await adminCaller.reconciliation.getUnmatchedOrders();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    // 测试数据应该在未匹配列表中
    const testOrder = result.find((o) => o.id === testOrderId);
    expect(testOrder).toBeDefined();
    expect(testOrder?.orderNo).toBe("TEST-ORDER-001");
  });

  it("应该能手动创建匹配关系", async () => {
    const result = await adminCaller.reconciliation.createMatch({
      scheduleId: testScheduleId,
      orderId: testOrderId,
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("成功");

    // 验证匹配关系已创建
    const matches = await adminCaller.reconciliation.getAllMatches();
    const testMatch = matches.find(
      (m) => m.match.scheduleId === testScheduleId && m.match.orderId === testOrderId
    );
    expect(testMatch).toBeDefined();
    expect(testMatch?.match.matchMethod).toBe("manual");
    expect(testMatch?.match.isVerified).toBe(true);
  });

  it("应该能获取所有匹配关系", async () => {
    const result = await adminCaller.reconciliation.getAllMatches();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // 验证匹配关系包含完整数据
    const match = result[0];
    expect(match.match).toBeDefined();
    expect(match.schedule).toBeDefined();
    expect(match.order).toBeDefined();
  });

  it("应该能生成月度对账报表", async () => {
    const result = await adminCaller.reconciliation.getMonthlyReport({
      startDate: "2025-01-01",
      endDate: "2025-01-31",
    });

    expect(result).toBeDefined();
    expect(result.stats).toBeDefined();
    expect(result.details).toBeDefined();

    // 验证统计数据
    expect(result.stats.totalMatches).toBeGreaterThan(0);
    expect(result.stats.totalRevenue).toBeGreaterThanOrEqual(0);
    expect(result.stats.totalExpense).toBeGreaterThanOrEqual(0);
    expect(result.stats.netProfit).toBeDefined();

    // 验证按城市统计
    expect(result.stats.byCity).toBeDefined();
    expect(typeof result.stats.byCity).toBe("object");

    // 验证按销售人员统计
    expect(result.stats.bySalesPerson).toBeDefined();
    expect(typeof result.stats.bySalesPerson).toBe("object");
  });

  it("应该能更新匹配关系的验证状态", async () => {
    // 获取测试匹配关系
    const matches = await adminCaller.reconciliation.getAllMatches();
    const testMatch = matches.find(
      (m) => m.match.scheduleId === testScheduleId && m.match.orderId === testOrderId
    );
    expect(testMatch).toBeDefined();

    // 更新验证状态
    const result = await adminCaller.reconciliation.updateMatch({
      matchId: testMatch!.match.id,
      isVerified: true,
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("成功");
  });

  it("应该能删除匹配关系", async () => {
    // 获取测试匹配关系
    const matches = await adminCaller.reconciliation.getAllMatches();
    const testMatch = matches.find(
      (m) => m.match.scheduleId === testScheduleId && m.match.orderId === testOrderId
    );
    expect(testMatch).toBeDefined();

    // 删除匹配关系
    const result = await adminCaller.reconciliation.deleteMatch({
      matchId: testMatch!.match.id,
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("成功");

    // 验证匹配关系已删除
    const updatedMatches = await adminCaller.reconciliation.getAllMatches();
    const deletedMatch = updatedMatches.find(
      (m) => m.match.scheduleId === testScheduleId && m.match.orderId === testOrderId
    );
    expect(deletedMatch).toBeUndefined();
  });

  it("非管理员和财务人员不应该能访问对账功能", async () => {
    const salesCtx = createTestContext("sales");
    const salesCaller = appRouter.createCaller(salesCtx);

    await expect(
      salesCaller.reconciliation.getAllMatches()
    ).rejects.toThrow("需要管理员或财务权限");
  });

  // 注意: 智能匹配测试需要调用LLM，耗时较长，已经在手动匹配测试中验证了核心功能
});
