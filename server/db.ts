import { eq, and, gte, lte, desc, sql, between, isNotNull, ne, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  customers,
  InsertCustomer,
  orders,
  InsertOrder,
  teachers,
  InsertTeacher,
  schedules,
  InsertSchedule,
  teacherPayments,
  InsertTeacherPayment,
  reconciliations,
  InsertReconciliation,
  importLogs,
  InsertImportLog,
  accountTransactions,
  InsertAccountTransaction,
  smartRegisterHistory,
  InsertSmartRegisterHistory,
  salespersons,
  InsertSalesperson,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ========== 用户管理 ==========

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "nickname", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "admin" | "sales" | "finance" | "user") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserStatus(userId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ isActive }).where(eq(users.id, userId));
}

// ========== 客户管理 ==========

export async function createCustomer(customer: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(customer);
  return result[0].insertId;
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0] || null;
}

export async function getAllCustomers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customers).orderBy(desc(customers.createdAt));
}

export async function searchCustomers(keyword: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(customers)
    .where(
      sql`${customers.name} LIKE ${`%${keyword}%`} OR ${customers.wechatId} LIKE ${`%${keyword}%`} OR ${customers.phone} LIKE ${`%${keyword}%`}`
    )
    .orderBy(desc(customers.createdAt));
}

export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(customers).set(data).where(eq(customers.id, id));
}

export async function deleteCustomer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(customers).where(eq(customers.id, id));
}

// ========== 订单管理 ==========

export async function checkOrderNoExists(orderNo: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(orders).where(eq(orders.orderNo, orderNo)).limit(1);
  return result.length > 0;
}

export async function createOrder(order: InsertOrder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(orders).values(order);
  return result[0].insertId;
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0] || null;
}

export async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getOrdersBySales(salesId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.salesId, salesId)).orderBy(desc(orders.createdAt));
}

export async function getOrdersByDateRange(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orders)
    .where(
      sql`${orders.paymentDate} >= ${startDate} AND ${orders.paymentDate} <= ${endDate}`
    )
    .orderBy(desc(orders.paymentDate));
}

export async function updateOrder(id: number, data: Partial<InsertOrder>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set(data).where(eq(orders.id, id));
}

export async function deleteOrder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(orders).where(eq(orders.id, id));
}

// ========== 老师管理 ==========

export async function createTeacher(teacher: InsertTeacher) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(teachers).values(teacher);
  return result[0].insertId;
}

export async function getTeacherById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(teachers).where(eq(teachers.id, id)).limit(1);
  return result[0] || null;
}

export async function getAllTeachers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teachers).where(eq(teachers.isActive, true)).orderBy(desc(teachers.createdAt));
}

export async function updateTeacher(id: number, data: Partial<InsertTeacher>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(teachers).set(data).where(eq(teachers.id, id));
}

// ========== 课程排课 ==========

export async function createSchedule(schedule: InsertSchedule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(schedules).values(schedule);
  return result[0].insertId;
}

export async function getScheduleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
  return result[0] || null;
}

export async function getSchedulesByDateRange(startTime: Date, endTime: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(schedules)
    .where(and(gte(schedules.startTime, startTime), lte(schedules.startTime, endTime)))
    .orderBy(schedules.startTime);
}

export async function getSchedulesByTeacher(teacherId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schedules).where(eq(schedules.teacherId, teacherId)).orderBy(desc(schedules.startTime));
}

export async function deleteSchedule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(schedules).where(eq(schedules.id, id));
}

// ========== 老师费用 ==========

export async function createTeacherPayment(payment: InsertTeacherPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(teacherPayments).values(payment);
  return result[0].insertId;
}

export async function getTeacherPaymentsByTeacher(teacherId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(teacherPayments)
    .where(eq(teacherPayments.teacherId, teacherId))
    .orderBy(desc(teacherPayments.createdAt));
}

export async function updateTeacherPaymentStatus(id: number, status: "pending" | "paid", paymentTime?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const data: any = { status };
  if (paymentTime) data.paymentTime = paymentTime;
  await db.update(teacherPayments).set(data).where(eq(teacherPayments.id, id));
}

// ========== 财务对账 ==========

export async function createReconciliation(reconciliation: InsertReconciliation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reconciliations).values(reconciliation);
  return result[0].insertId;
}

export async function getAllReconciliations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reconciliations).orderBy(desc(reconciliations.periodStart));
}

export async function updateReconciliation(id: number, data: Partial<InsertReconciliation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reconciliations).set(data).where(eq(reconciliations.id, id));
}

// ========== 数据统计 ==========

export async function getOrderStatsByDateRange(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      totalOrders: sql<number>`COUNT(*)`,
      totalPaymentAmount: sql<number>`SUM(${orders.paymentAmount})`,
      totalTeacherFee: sql<number>`SUM(${orders.teacherFee})`,
      totalTransportFee: sql<number>`SUM(${orders.transportFee})`,
      totalOtherFee: sql<number>`SUM(${orders.otherFee})`,
      totalPartnerFee: sql<number>`SUM(${orders.partnerFee})`,
      totalFinalAmount: sql<number>`SUM(${orders.finalAmount})`,
    })
    .from(orders)
    .where(
      sql`${orders.paymentDate} >= ${startDate} AND ${orders.paymentDate} <= ${endDate}`
    );

  return result[0];
}

export async function getSalesPerformance(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      salesId: orders.salesId,
      totalOrders: sql<number>`COUNT(*)`,
      totalAmount: sql<number>`SUM(${orders.paymentAmount})`,
    })
    .from(orders)
    .where(
      sql`${orders.paymentDate} >= ${startDate} AND ${orders.paymentDate} <= ${endDate}`
    )
    .groupBy(orders.salesId);
}

export async function getCityRevenue() {
  const db = await getDb();
  if (!db) return [];

  // 获取所有订单
  const allOrders = await db
    .select({
      paymentCity: orders.paymentCity,
      paymentAmount: orders.paymentAmount,
      teacherFee: orders.teacherFee,
    })
    .from(orders)
    .where(sql`${orders.status} != 'cancelled'`);

  // 按城市分组计算收益
  const cityRevenueMap = new Map<string, { revenue: number; orderCount: number }>();
  
  for (const order of allOrders) {
    const city = order.paymentCity || '未知城市';
    const paymentAmount = parseFloat(order.paymentAmount?.toString() || '0');
    const teacherFee = parseFloat(order.teacherFee?.toString() || '0');
    const baseRevenue = paymentAmount - teacherFee;
    
    // 根据城市计算收益比例
    let ratio = 0.3; // 默认比例
    if (city === '天津') {
      ratio = 0.5;
    } else if (city === '武汉') {
      ratio = 0.4;
    } else if (city === '上海') {
      ratio = 1.0;
    }
    
    const revenue = baseRevenue * ratio;
    
    if (!cityRevenueMap.has(city)) {
      cityRevenueMap.set(city, { revenue: 0, orderCount: 0 });
    }
    
    const cityData = cityRevenueMap.get(city)!;
    cityData.revenue += revenue;
    cityData.orderCount += 1;
  }
  
  // 转换为数组并按收益排序
  return Array.from(cityRevenueMap.entries())
    .map(([city, data]) => ({
      city,
      revenue: data.revenue.toFixed(2),
      orderCount: data.orderCount,
    }))
    .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue));
}

export async function getCityRevenueTrend() {
  const db = await getDb();
  if (!db) return { months: [], cities: [] };

  // 计算最近6个月的日期范围
  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  // 获取最近6个月的订单
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const allOrders = await db
    .select({
      paymentCity: orders.paymentCity,
      paymentAmount: orders.paymentAmount,
      teacherFee: orders.teacherFee,
      paymentDate: orders.paymentDate,
    })
    .from(orders)
    .where(
      sql`${orders.status} != 'cancelled' AND ${orders.paymentDate} >= ${sixMonthsAgo.toISOString().split('T')[0]}`
    );

  // 按城市和月份分组计算收益
  const cityMonthRevenueMap = new Map<string, Map<string, number>>();
  
  for (const order of allOrders) {
    if (!order.paymentDate) continue;
    
    const city = order.paymentCity || '未知城市';
    const paymentAmount = parseFloat(order.paymentAmount?.toString() || '0');
    const teacherFee = parseFloat(order.teacherFee?.toString() || '0');
    const baseRevenue = paymentAmount - teacherFee;
    
    // 根据城市计算收益比例
    let ratio = 0.3;
    if (city === '天津') {
      ratio = 0.5;
    } else if (city === '武汉') {
      ratio = 0.4;
    } else if (city === '上海') {
      ratio = 1.0;
    }
    
    const revenue = baseRevenue * ratio;
    
    // 获取月份
    const date = new Date(order.paymentDate);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!cityMonthRevenueMap.has(city)) {
      cityMonthRevenueMap.set(city, new Map());
    }
    
    const monthRevenueMap = cityMonthRevenueMap.get(city)!;
    monthRevenueMap.set(month, (monthRevenueMap.get(month) || 0) + revenue);
  }
  
  // 转换为前端需要的格式
  const cities = Array.from(cityMonthRevenueMap.entries()).map(([city, monthRevenueMap]) => {
    const data = months.map(month => {
      const revenue = monthRevenueMap.get(month) || 0;
      return parseFloat(revenue.toFixed(2));
    });
    
    return {
      city,
      data,
    };
  });
  
  // 按总收益排序,只返回前5个城市
  cities.sort((a, b) => {
    const sumA = a.data.reduce((acc, val) => acc + val, 0);
    const sumB = b.data.reduce((acc, val) => acc + val, 0);
    return sumB - sumA;
  });
  
  return {
    months,
    cities: cities.slice(0, 5),
  };
}

// ========== 顾客统计 ==========

export async function getCustomerStats() {
  const db = await getDb();
  if (!db) return {
    totalCustomers: 0,
    returningCustomers: 0,
    memberCustomers: 0,
    todayNewCustomers: 0,
    todayReturningCustomers: 0,
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // 累计顾客数(所有客户)
  const totalCustomersResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(customers);
  const totalCustomers = totalCustomersResult[0]?.count || 0;

  // 累计回头客(有多个订单的客户)
  const returningCustomersResult = await db
    .select({
      customerId: orders.customerId,
      orderCount: sql<number>`COUNT(*)`
    })
    .from(orders)
    .where(sql`${orders.customerId} IS NOT NULL AND ${orders.status} NOT IN ('pending', 'cancelled')`)
    .groupBy(orders.customerId)
    .having(sql`COUNT(*) > 1`);
  const returningCustomers = returningCustomersResult.length;

  // 累计会员(这里暂时用有3个或以上订单的客户作为会员)
  const memberCustomersResult = await db
    .select({
      customerId: orders.customerId,
      orderCount: sql<number>`COUNT(*)`
    })
    .from(orders)
    .where(sql`${orders.customerId} IS NOT NULL AND ${orders.status} NOT IN ('pending', 'cancelled')`)
    .groupBy(orders.customerId)
    .having(sql`COUNT(*) >= 3`);
  const memberCustomers = memberCustomersResult.length;

  // 今日新客(今天创建的客户)
  const todayNewCustomersResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(customers)
    .where(sql`DATE(${customers.createdAt}) = ${todayStr}`);
  const todayNewCustomers = todayNewCustomersResult[0]?.count || 0;

  // 今日老客(今天有订单的回头客)
  const todayReturningCustomersResult = await db
    .select({
      customerId: orders.customerId,
    })
    .from(orders)
    .where(
      sql`${orders.customerId} IS NOT NULL AND DATE(${orders.paymentDate}) = ${todayStr} AND ${orders.status} NOT IN ('pending', 'cancelled')`
    )
    .groupBy(orders.customerId);
  
  // 检查这些客户是否是回头客
  let todayReturningCustomers = 0;
  for (const row of todayReturningCustomersResult) {
    const orderCountResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(
        sql`${orders.customerId} = ${row.customerId} AND ${orders.status} NOT IN ('pending', 'cancelled')`
      );
    if ((orderCountResult[0]?.count || 0) > 1) {
      todayReturningCustomers++;
    }
  }

  return {
    totalCustomers,
    returningCustomers,
    memberCustomers,
    todayNewCustomers,
    todayReturningCustomers,
  };
}

// ========== 流失预警 ==========

export async function getChurnRiskCustomers() {
  const db = await getDb();
  if (!db) return [];

  // 计算30天前的日期
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  // 查找所有有过订单的客户（老客）
  const allCustomersWithOrders = await db
    .select({
      customerId: orders.customerId,
      customerName: orders.customerName,
      lastOrderDate: sql<string>`MAX(${orders.paymentDate})`,
      orderCount: sql<number>`COUNT(*)`,
      totalAmount: sql<string>`SUM(${orders.paymentAmount})`,
    })
    .from(orders)
    .where(
      sql`${orders.customerId} IS NOT NULL AND ${orders.status} NOT IN ('pending', 'cancelled')`
    )
    .groupBy(orders.customerId, orders.customerName);

  // 筛选出超过30天未下单的老客户
  const churnRiskCustomers = allCustomersWithOrders.filter(customer => {
    if (!customer.lastOrderDate) return false;
    const lastOrderDate = new Date(customer.lastOrderDate);
    return lastOrderDate < thirtyDaysAgo;
  });

  // 获取客户详细信息
  const result = await Promise.all(
    churnRiskCustomers.map(async (customer) => {
      const customerInfo = await db
        .select()
        .from(customers)
        .where(eq(customers.id, customer.customerId!))
        .limit(1);

      const daysSinceLastOrder = Math.floor(
        (Date.now() - new Date(customer.lastOrderDate!).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        customerId: customer.customerId,
        customerName: customer.customerName,
        phone: customerInfo[0]?.phone || null,
        wechatId: customerInfo[0]?.wechatId || null,
        lastOrderDate: customer.lastOrderDate,
        daysSinceLastOrder,
        orderCount: customer.orderCount,
        totalAmount: parseFloat(customer.totalAmount || '0'),
      };
    })
  );

  // 按距离最后一次订单的天数排序（降序）
  result.sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder);

  return result;
}

// ========== 订单批量操作 ==========

export async function batchDeleteOrders(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  for (const id of ids) {
    await db.delete(orders).where(eq(orders.id, id));
  }
}

export async function batchUpdateOrderStatus(
  ids: number[], 
  status: "pending" | "paid" | "completed" | "cancelled" | "refunded"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  for (const id of ids) {
    await db.update(orders).set({ status }).where(eq(orders.id, id));
  }
}

// ========== 数据导入日志 ==========

export async function createImportLog(log: InsertImportLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(importLogs).values(log);
  return result[0].insertId;
}

export async function getImportLogs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(importLogs).orderBy(desc(importLogs.createdAt)).limit(50);
}

// ========== 数据看板统计 ==========

// 交付老师月度统计(上课数量和收益金额)
export async function getTeacherMonthlyStats() {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const result = await db
    .select({
      teacher: orders.deliveryTeacher,
      classCount: sql<number>`count(*)`,
      totalRevenue: sql<string>`sum(CAST(${orders.paymentAmount} AS DECIMAL(10,2)) - COALESCE(CAST(${orders.teacherFee} AS DECIMAL(10,2)), 0))`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, startOfMonth),
        ne(orders.status, "cancelled"),
        isNotNull(orders.deliveryTeacher)
      )
    )
    .groupBy(orders.deliveryTeacher);
  
  return result.map(r => ({
    teacher: r.teacher || '未知',
    classCount: r.classCount,
    totalRevenue: parseFloat(r.totalRevenue || '0'),
  })).sort((a, b) => b.classCount - a.classCount);
}

// 流量来源月度统计
export async function getTrafficSourceMonthlyStats() {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const result = await db
    .select({
      source: orders.trafficSource,
      orderCount: sql<number>`count(*)`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, startOfMonth),
        ne(orders.status, "cancelled"),
        isNotNull(orders.trafficSource)
      )
    )
    .groupBy(orders.trafficSource);
  
  return result.map(r => ({
    source: r.source || '未知',
    orderCount: r.orderCount,
  })).sort((a, b) => b.orderCount - a.orderCount);
}

// 销售人员支付金额统计
export async function getSalesPersonPaymentStats() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      salesPerson: orders.salesPerson,
      totalPayment: sql<string>`sum(CAST(${orders.paymentAmount} AS DECIMAL(10,2)))`,
      orderCount: sql<number>`count(*)`,
    })
    .from(orders)
    .where(
      and(
        ne(orders.status, "cancelled"),
        isNotNull(orders.salesPerson)
      )
    )
    .groupBy(orders.salesPerson);
  
  return result.map(r => ({
    salesPerson: r.salesPerson || '未知',
    totalPayment: parseFloat(r.totalPayment || '0'),
    orderCount: r.orderCount,
  })).sort((a, b) => b.totalPayment - a.totalPayment);
}

// 客户账户余额排名
export async function getCustomerBalanceRanking() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      customerName: orders.customerName,
      accountBalance: sql<string>`max(CAST(${orders.accountBalance} AS DECIMAL(10,2)))`,
    })
    .from(orders)
    .where(
      and(
        isNotNull(orders.customerName),
        isNotNull(orders.accountBalance),
        ne(orders.accountBalance, ''),
        ne(orders.accountBalance, '0')
      )
    )
    .groupBy(orders.customerName);
  
  return result.map(r => ({
    customerName: r.customerName || '未知',
    accountBalance: parseFloat(r.accountBalance || '0'),
  }))
  .filter(r => r.accountBalance > 0)
  .sort((a, b) => b.accountBalance - a.accountBalance)
  .slice(0, 20); // 只返回前20名
}

// ==================== 账户流水管理 ====================

/**
 * 获取客户的账户流水列表
 */
export async function getCustomerTransactions(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select()
    .from(accountTransactions)
    .where(eq(accountTransactions.customerId, customerId))
    .orderBy(desc(accountTransactions.createdAt));
}

/**
 * 创建账户流水记录
 */
export async function createAccountTransaction(data: InsertAccountTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const [result] = await db.insert(accountTransactions).values(data);
  return result;
}

/**
 * 客户充值(事务操作:更新余额+记录流水)
 */
export async function rechargeCustomerAccount(params: {
  customerId: number;
  amount: number;
  notes?: string;
  operatorId: number;
  operatorName: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // 1. 获取当前余额
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, params.customerId));
  
  if (!customer) {
    throw new Error("客户不存在");
  }
  
  const balanceBefore = Number(customer.accountBalance);
  const balanceAfter = balanceBefore + params.amount;
  
  // 2. 更新客户余额
  await db
    .update(customers)
    .set({ accountBalance: balanceAfter.toFixed(2) })
    .where(eq(customers.id, params.customerId));
  
  // 3. 记录流水
  await db.insert(accountTransactions).values({
    customerId: params.customerId,
    customerName: customer.name,
    type: "recharge",
    amount: params.amount.toFixed(2),
    balanceBefore: balanceBefore.toFixed(2),
    balanceAfter: balanceAfter.toFixed(2),
    notes: params.notes,
    operatorId: params.operatorId,
    operatorName: params.operatorName,
  });
  
  return { balanceBefore, balanceAfter };
}

/**
 * 订单消费扣款(事务操作:更新余额+记录流水)
 */
export async function consumeCustomerAccount(params: {
  customerId: number;
  amount: number;
  orderId: number;
  orderNo: string;
  operatorId: number;
  operatorName: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // 1. 获取当前余额
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, params.customerId));
  
  if (!customer) {
    throw new Error("客户不存在");
  }
  
  const balanceBefore = Number(customer.accountBalance);
  
  // 2. 检查余额是否足够
  if (balanceBefore < params.amount) {
    throw new Error(`余额不足,当前余额¥${balanceBefore.toFixed(2)},需要¥${params.amount.toFixed(2)}`);
  }
  
  const balanceAfter = balanceBefore - params.amount;
  
  // 3. 更新客户余额
  await db
    .update(customers)
    .set({ accountBalance: balanceAfter.toFixed(2) })
    .where(eq(customers.id, params.customerId));
  
  // 4. 记录流水
  await db.insert(accountTransactions).values({
    customerId: params.customerId,
    customerName: customer.name,
    type: "consume",
    amount: (-params.amount).toFixed(2),
    balanceBefore: balanceBefore.toFixed(2),
    balanceAfter: balanceAfter.toFixed(2),
    relatedOrderId: params.orderId,
    relatedOrderNo: params.orderNo,
    notes: `订单消费:${params.orderNo}`,
    operatorId: params.operatorId,
    operatorName: params.operatorName,
  });
  
  return { balanceBefore, balanceAfter };
}

/**
 * 订单退款(事务操作:更新余额+记录流水)
 */
export async function refundCustomerAccount(params: {
  customerId: number;
  amount: number;
  orderId: number;
  orderNo: string;
  operatorId: number;
  operatorName: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // 1. 获取当前余额
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, params.customerId));
  
  if (!customer) {
    throw new Error("客户不存在");
  }
  
  const balanceBefore = Number(customer.accountBalance);
  const balanceAfter = balanceBefore + params.amount;
  
  // 2. 更新客户余额
  await db
    .update(customers)
    .set({ accountBalance: balanceAfter.toFixed(2) })
    .where(eq(customers.id, params.customerId));
  
  // 3. 记录流水
  await db.insert(accountTransactions).values({
    customerId: params.customerId,
    customerName: customer.name,
    type: "refund",
    amount: params.amount.toFixed(2),
    balanceBefore: balanceBefore.toFixed(2),
    balanceAfter: balanceAfter.toFixed(2),
    relatedOrderId: params.orderId,
    relatedOrderNo: params.orderNo,
    notes: `订单退款:${params.orderNo}`,
    operatorId: params.operatorId,
    operatorName: params.operatorName,
  });
  
  return { balanceBefore, balanceAfter };
}

// ============ Smart Register History ============

export async function createSmartRegisterHistory(data: InsertSmartRegisterHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const result = await db.insert(smartRegisterHistory).values(data);
  return result;
}

export async function getSmartRegisterHistory(limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  return db
    .select()
    .from(smartRegisterHistory)
    .orderBy(desc(smartRegisterHistory.createdAt))
    .limit(limit);
}

// ============ Salesperson Management ============

export async function getAllSalespersons() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  return db
    .select()
    .from(salespersons)
    .orderBy(desc(salespersons.createdAt));
}

export async function searchSalespersons(keyword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  return db
    .select()
    .from(salespersons)
    .where(
      or(
        like(salespersons.name, `%${keyword}%`),
        like(salespersons.nickname, `%${keyword}%`),
        like(salespersons.phone, `%${keyword}%`),
        like(salespersons.wechat, `%${keyword}%`)
      )
    )
    .orderBy(desc(salespersons.createdAt));
}

export async function createSalesperson(data: InsertSalesperson) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const result = await db.insert(salespersons).values(data);
  return result[0].insertId;
}

export async function updateSalesperson(id: number, data: Partial<InsertSalesperson>) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  await db
    .update(salespersons)
    .set(data)
    .where(eq(salespersons.id, id));
}

export async function deleteSalesperson(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // 软删除:设置为不活跃
  await db
    .update(salespersons)
    .set({ isActive: false })
    .where(eq(salespersons.id, id));
}

export async function updateSalespersonStatus(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  await db
    .update(salespersons)
    .set({ isActive })
    .where(eq(salespersons.id, id));
}

// 获取销售统计数据
export async function getSalesStatistics(params: {
  salespersonId?: number;
  startDate?: string;
  endDate?: string;
  groupBy?: "month" | "year";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // 基础查询条件 - 统计所有非取消状态的订单
  const conditions: any[] = [ne(orders.status, "cancelled")];
  
  if (params.salespersonId) {
    conditions.push(eq(orders.salespersonId, params.salespersonId));
  }
  
  if (params.startDate) {
    conditions.push(sql`${orders.paymentDate} >= ${params.startDate}`);
  }
  
  if (params.endDate) {
    conditions.push(sql`${orders.paymentDate} <= ${params.endDate}`);
  }
  
  // 查询订单数据
  const orderList = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.paymentDate));
  
  // 计算统计数据
  const totalSales = orderList.reduce((sum, order) => sum + Number(order.paymentAmount), 0);
  const totalOrders = orderList.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  
  return {
    totalSales,
    totalOrders,
    avgOrderValue,
    orders: orderList,
  };
}

// 获取月度销售额
export async function getMonthlySales(salespersonId: number | undefined, year: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  
  const conditions: any[] = [
    eq(orders.status, "paid"),
    sql`${orders.paymentDate} >= ${startDate}`,
    sql`${orders.paymentDate} <= ${endDate}`,
  ];
  
  if (salespersonId) {
    conditions.push(eq(orders.salespersonId, salespersonId));
  }
  
  const orderList = await db
    .select()
    .from(orders)
    .where(and(...conditions));
  
  // 按月份分组统计
  const monthlySales: { month: number; sales: number; orders: number }[] = [];
  
  for (let month = 1; month <= 12; month++) {
    const monthOrders = orderList.filter(order => {
      if (!order.paymentDate) return false;
      const orderMonth = new Date(order.paymentDate).getMonth() + 1;
      return orderMonth === month;
    });
    
    const sales = monthOrders.reduce((sum, order) => sum + Number(order.paymentAmount), 0);
    
    monthlySales.push({
      month,
      sales,
      orders: monthOrders.length,
    });
  }
  
  return monthlySales;
}

// 获取年度销售额
export async function getYearlySales(
  salespersonId: number | undefined,
  startYear?: number,
  endYear?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const currentYear = new Date().getFullYear();
  const start = startYear || currentYear - 2;
  const end = endYear || currentYear;
  
  const conditions: any[] = [
    eq(orders.status, "paid"),
    sql`${orders.paymentDate} >= ${`${start}-01-01`}`,
    sql`${orders.paymentDate} <= ${`${end}-12-31`}`,
  ];
  
  if (salespersonId) {
    conditions.push(eq(orders.salespersonId, salespersonId));
  }
  
  const orderList = await db
    .select()
    .from(orders)
    .where(and(...conditions));
  
  // 按年份分组统计
  const yearlySales: { year: number; sales: number; orders: number }[] = [];
  
  for (let year = start; year <= end; year++) {
    const yearOrders = orderList.filter(order => {
      if (!order.paymentDate) return false;
      const orderYear = new Date(order.paymentDate).getFullYear();
      return orderYear === year;
    });
    
    const sales = yearOrders.reduce((sum, order) => sum + Number(order.paymentAmount), 0);
    
    yearlySales.push({
      year,
      sales,
      orders: yearOrders.length,
    });
  }
  
  return yearlySales;
}
