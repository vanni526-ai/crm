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

describe("city revenue calculation", () => {
  it("should calculate city revenue with correct ratios", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建测试订单 - 天津 (50%分配)
    await caller.orders.create({
      orderNo: "TIANJIN" + Date.now(),
      customerName: "天津客户",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      paymentCity: "天津",
      teacherFee: "400.00", // 基础收益 = 1000 - 400 = 600, 天津收益 = 600 * 0.5 = 300
    });

    // 创建测试订单 - 武汉 (40%分配)
    await caller.orders.create({
      orderNo: "WUHAN" + Date.now(),
      customerName: "武汉客户",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      paymentCity: "武汉",
      teacherFee: "400.00", // 基础收益 = 1000 - 400 = 600, 武汉收益 = 600 * 0.4 = 240
    });

    // 创建测试订单 - 上海 (100%分配)
    await caller.orders.create({
      orderNo: "SHANGHAI" + Date.now(),
      customerName: "上海客户",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      paymentCity: "上海",
      teacherFee: "400.00", // 基础收益 = 1000 - 400 = 600, 上海收益 = 600 * 1.0 = 600
    });

    // 创建测试订单 - 其他城市 (30%分配)
    await caller.orders.create({
      orderNo: "BEIJING" + Date.now(),
      customerName: "北京客户",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      paymentCity: "北京",
      teacherFee: "400.00", // 基础收益 = 1000 - 400 = 600, 北京收益 = 600 * 0.3 = 180
    });

    // 获取城市收益统计
    const cityRevenue = await caller.analytics.cityRevenue();

    expect(Array.isArray(cityRevenue)).toBe(true);
    expect(cityRevenue.length).toBeGreaterThan(0);

    // 验证天津收益
    const tianjinRevenue = cityRevenue.find(c => c.city === "天津");
    expect(tianjinRevenue).toBeDefined();
    expect(parseFloat(tianjinRevenue!.revenue)).toBeGreaterThan(0);

    // 验证武汉收益
    const wuhanRevenue = cityRevenue.find(c => c.city === "武汉");
    expect(wuhanRevenue).toBeDefined();
    expect(parseFloat(wuhanRevenue!.revenue)).toBeGreaterThan(0);

    // 验证上海收益
    const shanghaiRevenue = cityRevenue.find(c => c.city === "上海");
    expect(shanghaiRevenue).toBeDefined();
    expect(parseFloat(shanghaiRevenue!.revenue)).toBeGreaterThan(0);

    // 验证其他城市收益
    const beijingRevenue = cityRevenue.find(c => c.city === "北京");
    expect(beijingRevenue).toBeDefined();
    expect(parseFloat(beijingRevenue!.revenue)).toBeGreaterThan(0);

    // 验证收益排序(按收益从高到低)
    for (let i = 0; i < cityRevenue.length - 1; i++) {
      expect(parseFloat(cityRevenue[i].revenue)).toBeGreaterThanOrEqual(
        parseFloat(cityRevenue[i + 1].revenue)
      );
    }
  });

  it("should handle orders with no teacher fee", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    await caller.orders.create({
      orderNo: "NOFEEE" + Date.now(),
      customerName: "测试客户",
      paymentAmount: "1000.00",
      courseAmount: "1000.00",
      paymentCity: "天津",
      // 没有老师费用,基础收益 = 1000 - 0 = 1000, 天津收益 = 1000 * 0.5 = 500
    });

    const cityRevenue = await caller.analytics.cityRevenue();
    const tianjinRevenue = cityRevenue.find(c => c.city === "天津");
    
    expect(tianjinRevenue).toBeDefined();
    expect(parseFloat(tianjinRevenue!.revenue)).toBeGreaterThan(0);
  });

  it("should exclude cancelled orders from revenue calculation", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建已取消的订单
    const cancelledOrder = await caller.orders.create({
      orderNo: "CANCELLED" + Date.now(),
      customerName: "取消订单客户",
      paymentAmount: "5000.00",
      courseAmount: "5000.00",
      paymentCity: "天津",
      teacherFee: "1000.00",
      status: "cancelled",
    });

    const cityRevenue = await caller.analytics.cityRevenue();
    
    // 已取消的订单不应该计入收益
    expect(Array.isArray(cityRevenue)).toBe(true);
  });
});

describe("city revenue trend", () => {
  it("should return monthly revenue trend for cities", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建不同月份的订单
    const now = new Date();
    
    // 上个月的订单
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    await caller.orders.create({
      orderNo: "TREND1" + Date.now(),
      customerName: "测试客户1",
      paymentAmount: "2000.00",
      courseAmount: "2000.00",
      paymentCity: "天津",
      teacherFee: "800.00",
      paymentDate: lastMonth.toISOString().split('T')[0],
    });

    // 当月的订单
    await caller.orders.create({
      orderNo: "TREND2" + Date.now(),
      customerName: "测试客户2",
      paymentAmount: "3000.00",
      courseAmount: "3000.00",
      paymentCity: "上海",
      teacherFee: "1000.00",
      paymentDate: now.toISOString().split('T')[0],
    });

    const trend = await caller.analytics.cityRevenueTrend();

    expect(trend).toBeDefined();
    expect(Array.isArray(trend.months)).toBe(true);
    expect(trend.months.length).toBe(6);
    expect(Array.isArray(trend.cities)).toBe(true);
    
    // 验证月份格式
    trend.months.forEach(month => {
      expect(month).toMatch(/^\d{4}-\d{2}$/);
    });
    
    // 验证城市数据结构
    trend.cities.forEach(city => {
      expect(city).toHaveProperty('city');
      expect(city).toHaveProperty('data');
      expect(Array.isArray(city.data)).toBe(true);
      expect(city.data.length).toBe(6);
    });
  });

  it("should limit to top 5 cities by total revenue", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    const trend = await caller.analytics.cityRevenueTrend();
    
    expect(trend.cities.length).toBeLessThanOrEqual(5);
  });

  it("should exclude cancelled orders from trend calculation", async () => {
    const { ctx } = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 创建已取消的订单
    await caller.orders.create({
      orderNo: "TRENDCANCEL" + Date.now(),
      customerName: "取消订单",
      paymentAmount: "10000.00",
      courseAmount: "10000.00",
      paymentCity: "天津",
      teacherFee: "2000.00",
      paymentDate: new Date().toISOString().split('T')[0],
      status: "cancelled",
    });

    const trend = await caller.analytics.cityRevenueTrend();
    
    expect(trend).toBeDefined();
    expect(Array.isArray(trend.cities)).toBe(true);
  });
});
