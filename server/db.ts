import { eq, and, gte, lte, desc, sql, between, isNotNull, isNull, ne, like, or, inArray, count } from "drizzle-orm";
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
  gmailImportLogs,
  InsertGmailImportLog,
  gmailImportConfig,
  gmailImportHistory,
  InsertGmailImportHistory,
  GmailImportHistory,
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
  
  // 获取所有客户及其统计信息
  const customersData = await db.select().from(customers).orderBy(desc(customers.createdAt));
  
  // 为每个客户计算累计消费和最后消费时间
  const customersWithStats = await Promise.all(
    customersData.map(async (customer) => {
      const customerOrders = await db
        .select({
          totalAmount: sql<string>`SUM(${orders.paymentAmount})`,
          lastOrderDate: sql<Date>`MAX(${orders.createdAt})`,
          firstOrderDate: sql<Date>`MIN(${orders.createdAt})`,
        })
        .from(orders)
        .where(eq(orders.customerName, customer.name));
      
      // 获取最新订单的账户余额
      const latestOrder = await db
        .select({ accountBalance: orders.accountBalance })
        .from(orders)
        .where(eq(orders.customerName, customer.name))
        .orderBy(desc(orders.createdAt))
        .limit(1);
      
      return {
        ...customer,
        totalSpent: customerOrders[0]?.totalAmount || "0.00",
        lastOrderDate: customerOrders[0]?.lastOrderDate || null,
        firstOrderDate: customerOrders[0]?.firstOrderDate || null,
        accountBalance: latestOrder[0]?.accountBalance || "0.00",
      };
    })
  );
  
  return customersWithStats;
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
  
  // 检查渠道订单号是否重复
  if (order.channelOrderNo && order.channelOrderNo.trim() !== '') {
    const exists = await checkChannelOrderNoExists(order.channelOrderNo);
    if (exists) {
      const existingOrder = await getOrderByChannelOrderNo(order.channelOrderNo);
      throw new Error(
        `渠道订单号已存在: ${order.channelOrderNo}\n` +
        `关联订单: ${existingOrder?.orderNo || '未知'} (客户: ${existingOrder?.customerName || '未知'})`
      );
    }
  }
  
  const result = await db.insert(orders).values(order);
  return { id: result[0].insertId, ...order };
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

export async function updateOrderNo(id: number, orderNo: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({ orderNo }).where(eq(orders.id, id));
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

export async function updateTeacher(id: number, data: Partial<InsertTeacher> & { aliases?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 将aliases字符串转换为JSON数组
  const updateData: any = { ...data };
  if (data.aliases !== undefined) {
    if (data.aliases && data.aliases.trim() !== '') {
      // 将逗号分隔的字符串转换为数组
      const aliasesArray = data.aliases.split(',').map(a => a.trim()).filter(a => a !== '');
      updateData.aliases = JSON.stringify(aliasesArray);
    } else {
      updateData.aliases = null;
    }
  }
  
  await db.update(teachers).set(updateData).where(eq(teachers.id, id));
}

// 批量删除老师
export async function batchDeleteTeachers(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(teachers).where(inArray(teachers.id, ids));
}

// 批量更新老师状态
export async function batchUpdateTeacherStatus(ids: number[], status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(teachers).set({ status }).where(inArray(teachers.id, ids));
}

// 批量创建老师
export async function batchCreateTeachers(teacherList: InsertTeacher[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = [];
  for (const teacher of teacherList) {
    const result = await db.insert(teachers).values(teacher);
    results.push({ id: result[0].insertId, name: teacher.name });
  }
  return results;
}

// 获取所有老师名字(用于验证)
export async function getAllTeacherNames() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ name: teachers.name, aliases: teachers.aliases }).from(teachers).where(eq(teachers.isActive, true));
  
  // 收集所有名字(包括真实名和别名)
  const allNames: string[] = [];
  result.forEach(r => {
    allNames.push(r.name);
    if (r.aliases) {
      try {
        const aliases = JSON.parse(r.aliases);
        if (Array.isArray(aliases)) {
          allNames.push(...aliases);
        }
      } catch (e) {
        // 忽略JSON解析错误
      }
    }
  });
  
  return allNames;
}

// 检查名字是否为老师名
export async function isTeacherName(name: string | null | undefined): Promise<boolean> {
  if (!name || name.trim() === '') return false;
  const teacherNames = await getAllTeacherNames();
  return teacherNames.includes(name.trim());
}

// 获取老师统计数据
export async function getTeacherStats(teacherId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return null;

  // 统计授课次数和总课时
  const scheduleConditions = startDate && endDate
    ? and(
        eq(schedules.teacherId, teacherId),
        gte(schedules.startTime, startDate),
        lte(schedules.startTime, endDate)
      )
    : eq(schedules.teacherId, teacherId);

  const scheduleStats = await db
    .select({
      count: sql<number>`COUNT(*)`,
      totalHours: sql<number>`SUM(TIMESTAMPDIFF(HOUR, ${schedules.startTime}, ${schedules.endTime}))`,
    })
    .from(schedules)
    .where(scheduleConditions);

  // 统计总收入(已支付)
  const paymentConditions = startDate && endDate
    ? and(
        eq(teacherPayments.teacherId, teacherId),
        eq(teacherPayments.status, "paid"),
        gte(teacherPayments.paymentTime, startDate),
        lte(teacherPayments.paymentTime, endDate)
      )
    : and(
        eq(teacherPayments.teacherId, teacherId),
        eq(teacherPayments.status, "paid")
      );

  const paymentStats = await db
    .select({
      totalIncome: sql<number>`SUM(${teacherPayments.amount})`,
    })
    .from(teacherPayments)
    .where(paymentConditions);

  return {
    classCount: Number(scheduleStats[0]?.count) || 0,
    totalHours: Number(scheduleStats[0]?.totalHours) || 0,
    totalIncome: Number(paymentStats[0]?.totalIncome) || 0,
  };
}

// 获取所有老师的统计数据
export async function getAllTeachersStats(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  const allTeachers = await getAllTeachers();
  const stats = await Promise.all(
    allTeachers.map(async (teacher) => {
      const teacherStats = await getTeacherStats(teacher.id, startDate, endDate);
      return {
        teacherId: teacher.id,
        teacherName: teacher.name,
        ...teacherStats,
      };
    })
  );

  return stats;
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
      // 净利润 = 销售额 - 老师费用 - 车费 - 其他费用 - 合伙人费用
      netProfit: sql<number>`SUM(${orders.paymentAmount}) - SUM(${orders.teacherFee}) - SUM(${orders.transportFee}) - SUM(${orders.otherFee}) - SUM(${orders.partnerFee})`,
    })
    .from(orders)
    .where(
      sql`${orders.classDate} >= ${startDate} AND ${orders.classDate} <= ${endDate}`
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

// ========== Gmail导入日志管理 ==========

export async function createGmailImportLog(log: InsertGmailImportLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(gmailImportLogs).values(log);
  return result[0].insertId;
}

export async function getAllGmailImportLogs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gmailImportLogs).orderBy(desc(gmailImportLogs.createdAt));
}

export async function getGmailImportLogById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(gmailImportLogs).where(eq(gmailImportLogs.id, id)).limit(1);
  return result[0] || null;
}

export async function getGmailImportLogsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(gmailImportLogs)
    .where(
      and(
        gte(gmailImportLogs.createdAt, startDate),
        lte(gmailImportLogs.createdAt, endDate)
      )
    )
    .orderBy(desc(gmailImportLogs.createdAt));
}

export async function getGmailImportStats() {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select({
      totalImports: sql<number>`COUNT(*)`,
      totalOrders: sql<number>`SUM(${gmailImportLogs.totalOrders})`,
      successOrders: sql<number>`SUM(${gmailImportLogs.successOrders})`,
      failedOrders: sql<number>`SUM(${gmailImportLogs.failedOrders})`,
      successRate: sql<number>`ROUND(SUM(${gmailImportLogs.successOrders}) * 100.0 / NULLIF(SUM(${gmailImportLogs.totalOrders}), 0), 2)`,
    })
    .from(gmailImportLogs);
    
  return result[0] || null;
}

export async function checkThreadIdExists(threadId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(gmailImportLogs)
    .where(eq(gmailImportLogs.threadId, threadId))
    .limit(1);
  return result.length > 0;
}

export async function deleteGmailImportLog(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(gmailImportLogs).where(eq(gmailImportLogs.id, id));
  return true;
}

export async function deleteAllGmailImportLogs() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(gmailImportLogs);
  return true;
}

// ==================== Gmail导入配置管理 ====================

export async function getGmailImportConfig(configKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [config] = await db
    .select()
    .from(gmailImportConfig)
    .where(eq(gmailImportConfig.configKey, configKey))
    .limit(1);
  return config || null;
}

export async function getAllGmailImportConfigs() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(gmailImportConfig);
}

export async function upsertGmailImportConfig(data: {
  configKey: string;
  configValue: any;
  description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getGmailImportConfig(data.configKey);
  
  if (existing) {
    await db
      .update(gmailImportConfig)
      .set({
        configValue: data.configValue,
        description: data.description,
        updatedAt: new Date(),
      })
      .where(eq(gmailImportConfig.configKey, data.configKey));
    return existing.id;
  } else {
    const [result] = await db.insert(gmailImportConfig).values(data);
    return result.insertId;
  }
}

export async function deleteGmailImportConfig(configKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(gmailImportConfig)
    .where(eq(gmailImportConfig.configKey, configKey));
  return true;
}

// ========== 客户生命周期 ==========

export async function getInactiveCustomers(days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  // 获取所有有订单记录的客户
  const customersWithOrders = await db
    .select({
      customerId: orders.customerId,
      lastOrderDate: sql<Date>`MAX(${orders.createdAt})`,
      customerName: sql<string>`(SELECT name FROM customers WHERE id = ${orders.customerId})`,
    })
    .from(orders)
    .where(sql`${orders.customerId} IS NOT NULL`)
    .groupBy(orders.customerId)
    .having(sql`MAX(${orders.createdAt}) < ${cutoffDate}`);
  
  return customersWithOrders;
}

// ========== 客户批量导入 ==========

export async function importCustomersFromOrders(createdBy: number) {
  const db = await getDb();
  if (!db) return { success: 0, skipped: 0, failed: 0 };
  
  // 获取所有老师名
  const teacherNames = await getAllTeacherNames();
  const teacherNameSet = new Set(teacherNames);
  
  // 获取所有订单
  const allOrders = await db.select().from(orders);
  
  // 提取唯一的客户名和流量来源
  const uniqueCustomers = new Map<string, { name: string; trafficSource?: string }>();
  
  for (const order of allOrders) {
    // 过滤空客户名和老师名
    if (order.customerName && 
        !uniqueCustomers.has(order.customerName) && 
        !teacherNameSet.has(order.customerName)) {
      uniqueCustomers.set(order.customerName, {
        name: order.customerName,
        trafficSource: order.trafficSource || undefined,
      });
    }
  }
  
  // 获取现有客户列表
  const existingCustomers = await db.select({ name: customers.name }).from(customers);
  const existingNames = new Set(existingCustomers.map(c => c.name));
  
  let success = 0;
  let skipped = 0;
  let failed = 0;
  
  // 批量创建客户
  for (const customerData of Array.from(uniqueCustomers.values())) {
    if (existingNames.has(customerData.name)) {
      skipped++;
      continue;
    }
    
    try {
      await db.insert(customers).values({
        name: customerData.name,
        trafficSource: customerData.trafficSource,
        createdBy,
      });
      success++;
    } catch (error) {
      console.error(`Failed to create customer ${customerData.name}:`, error);
      failed++;
    }
  }
  
  return { success, skipped, failed, total: uniqueCustomers.size };
}

// ========== Gmail导入历史管理 ==========

/**
 * 创建Gmail导入历史记录
 */
export async function createGmailImportHistory(data: InsertGmailImportHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const [result] = await db.insert(gmailImportHistory).values(data);
  return result.insertId;
}

/**
 * 检查Message ID是否已导入
 */
export async function checkMessageIdExists(messageId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const result = await db
    .select({ id: gmailImportHistory.id })
    .from(gmailImportHistory)
    .where(eq(gmailImportHistory.messageId, messageId))
    .limit(1);
  
  return result.length > 0;
}

/**
 * 获取所有Gmail导入历史记录
 */
export async function getAllGmailImportHistory(limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  return await db
    .select()
    .from(gmailImportHistory)
    .orderBy(desc(gmailImportHistory.importedAt))
    .limit(limit)
    .offset(offset);
}

/**
 * 获取Gmail导入统计
 */
export async function getGmailImportHistoryStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const stats = await db
    .select({
      totalImports: count(),
      successCount: sql<number>`SUM(CASE WHEN ${gmailImportHistory.importStatus} = 'success' THEN 1 ELSE 0 END)`,
      failedCount: sql<number>`SUM(CASE WHEN ${gmailImportHistory.importStatus} = 'failed' THEN 1 ELSE 0 END)`,
      skippedCount: sql<number>`SUM(CASE WHEN ${gmailImportHistory.importStatus} = 'skipped' THEN 1 ELSE 0 END)`,
    })
    .from(gmailImportHistory);
  
  return stats[0] || { totalImports: 0, successCount: 0, failedCount: 0, skippedCount: 0 };
}

/**
 * 按日期范围获取Gmail导入历史
 */
export async function getGmailImportHistoryByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  return await db
    .select()
    .from(gmailImportHistory)
    .where(
      and(
        gte(gmailImportHistory.importedAt, startDate),
        lte(gmailImportHistory.importedAt, endDate)
      )
    )
    .orderBy(desc(gmailImportHistory.importedAt));
}

/**
 * 删除Gmail导入历史记录
 */
export async function deleteGmailImportHistory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  await db.delete(gmailImportHistory).where(eq(gmailImportHistory.id, id));
}

/**
 * 批量删除客户表中所有客户名为老师名的记录
 * @returns 删除的记录数
 */
export async function deleteCustomersWithTeacherNames(): Promise<number> {
  const teacherNames = await getAllTeacherNames();
  
  if (teacherNames.length === 0) {
    return 0;
  }
  
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");
  
  // 删除所有客户名在老师名列表中的客户记录
  await db
    .delete(customers)
    .where(inArray(customers.name, teacherNames));
  
  // 返回删除的记录数
  return teacherNames.length;
}


/**
 * 批量更新历史订单号,添加支付方式前缀
 * @returns 更新的订单数量
 */
export async function batchUpdateOrderNumbers() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // 获取所有订单
  const allOrders = await db.select().from(orders);
  
  let updatedCount = 0;
  
  for (const order of allOrders) {
    // 跳过已经有支付方式前缀的订单号
    if (order.orderNo.startsWith('pay') || order.orderNo.startsWith('we') || order.orderNo.startsWith('xj')) {
      continue;
    }
    
    // 根据备注推断支付方式
    let paymentMethod: string | undefined;
    if (order.notes) {
      const notesLower = order.notes.toLowerCase();
      if (notesLower.includes('支付宝') || notesLower.includes('alipay')) {
        paymentMethod = 'alipay';
      } else if (notesLower.includes('富掌柜') || notesLower.includes('微信') || notesLower.includes('wechat')) {
        paymentMethod = 'wechat';
      } else if (notesLower.includes('现金') || notesLower.includes('cash')) {
        paymentMethod = 'cash';
      }
    }
    
    // 生成新订单号
    const { generateOrderId } = await import('./orderIdGenerator');
    const newOrderNo = generateOrderId(
      order.deliveryCity || undefined,
      order.classDate || undefined,
      paymentMethod
    );
    
    // 更新订单号
    const dbInstance = await getDb();
    if (!dbInstance) throw new Error("Database not initialized");
    await dbInstance.update(orders)
      .set({ orderNo: newOrderNo })
      .where(eq(orders.id, order.id));
    
    updatedCount++;
  }
  
  return updatedCount;
}


// ========== 渠道订单号管理 ==========

/**
 * 检查渠道订单号是否已存在
 * @param channelOrderNo 渠道订单号
 * @returns 是否存在
 */
export async function checkChannelOrderNoExists(channelOrderNo: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db
    .select()
    .from(orders)
    .where(eq(orders.channelOrderNo, channelOrderNo))
    .limit(1);
  
  return result.length > 0;
}

/**
 * 根据渠道订单号查找订单
 * @param channelOrderNo 渠道订单号
 * @returns 订单信息
 */
export async function getOrderByChannelOrderNo(channelOrderNo: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(orders)
    .where(eq(orders.channelOrderNo, channelOrderNo))
    .limit(1);
  
  return result[0] || null;
}

/**
 * 按支付渠道筛选订单
 * @param paymentChannel 支付渠道
 * @returns 订单列表
 */
export async function getOrdersByPaymentChannel(paymentChannel: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(orders)
    .where(eq(orders.paymentChannel, paymentChannel))
    .orderBy(desc(orders.createdAt));
}

/**
 * 搜索渠道订单号(模糊匹配)
 * @param keyword 搜索关键词
 * @returns 订单列表
 */
export async function searchOrdersByChannelOrderNo(keyword: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(orders)
    .where(sql`${orders.channelOrderNo} LIKE ${`%${keyword}%`}`)
    .orderBy(desc(orders.createdAt));
}

/**
 * 获取对账报表数据(按支付渠道分组)
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 对账报表数据
 */
export async function getReconciliationReport(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(orders)
    .where(
      and(
        gte(orders.classDate, new Date(startDate)),
        lte(orders.classDate, new Date(endDate))
      )
    )
    .orderBy(orders.paymentChannel, desc(orders.createdAt));
}

/**
 * 检测可能存在车费识别问题的订单
 * 查找备注中包含"车费"但transportFee为0的订单
 * @returns 问题订单列表
 */
export async function detectTransportFeeIssues() {
  const db = await getDb();
  if (!db) return [];
  
  // 查找备注中包含"车费"关键词,但transportFee为0或null的订单
  const issueOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        sql`${orders.notes} LIKE '%车费%'`,
        or(
          eq(orders.transportFee, "0.00"),
          isNull(orders.transportFee)
        )
      )
    )
    .orderBy(desc(orders.createdAt));
  
  return issueOrders;
}

/**
 * 批量修复车费识别问题
 * 重新解析备注并更新transportFee和teacherFee字段
 * @param orderIds 订单ID列表
 * @returns 修复结果统计
 */
export async function batchFixTransportFee(orderIds: number[]) {
  const db = await getDb();
  if (!db) return { success: 0, failed: 0, errors: [] as string[] };
  
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  
  for (const orderId of orderIds) {
    try {
      // 获取订单详情
      const order = await getOrderById(orderId);
      if (!order || !order.notes) {
        errors.push(`订单 ${orderId}: 未找到或没有备注`);
        failedCount++;
        continue;
      }
      
      // 使用正则表达式从备注中提取车费和老师费用
      const notes = order.notes;
      
      // 提取车费: "报销老师100车费" -> 100
      const transportFeeMatch = notes.match(/报销(?:老师)?(\d+)(?:元)?车费|车费(\d+)(?:元)?/);
      const transportFee = transportFeeMatch ? (transportFeeMatch[1] || transportFeeMatch[2]) : null;
      
      // 提取老师费用: "给老师600" -> 600
      const teacherFeeMatch = notes.match(/给老师(\d+)(?:元)?/);
      const teacherFee = teacherFeeMatch ? teacherFeeMatch[1] : null;
      
      // 更新订单
      const updateData: any = {};
      if (transportFee) {
        updateData.transportFee = transportFee;
      }
      if (teacherFee) {
        updateData.teacherFee = teacherFee;
      }
      
      if (Object.keys(updateData).length > 0) {
        await db
          .update(orders)
          .set(updateData)
          .where(eq(orders.id, orderId));
        successCount++;
      } else {
        errors.push(`订单 ${orderId}: 未能从备注中提取车费或老师费用`);
        failedCount++;
      }
    } catch (error) {
      errors.push(`订单 ${orderId}: ${error instanceof Error ? error.message : '未知错误'}`);
      failedCount++;
    }
  }
  
  return {
    success: successCount,
    failed: failedCount,
    errors,
  };
}

/**
 * 获取流量来源统计数据
 * @param startDate 开始日期(可选)
 * @param endDate 结束日期(可选)
 * @returns 流量来源统计数据
 */
export async function getTrafficSourceStats(startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db
    .select({
      trafficSource: orders.trafficSource,
      orderCount: count(orders.id),
      totalAmount: sql<number>`SUM(${orders.paymentAmount})`,
    })
    .from(orders)
    .where(
      and(
        isNotNull(orders.trafficSource),
        ne(orders.trafficSource, ""),
        eq(orders.isVoided, false)
      )
    )
    .groupBy(orders.trafficSource)
    .orderBy(sql`SUM(${orders.paymentAmount}) DESC`);
  
  // 如果提供了日期范围,添加日期过滤
  if (startDate && endDate) {
    query = db
      .select({
        trafficSource: orders.trafficSource,
        orderCount: count(orders.id),
        totalAmount: sql<number>`SUM(${orders.paymentAmount})`,
      })
      .from(orders)
      .where(
        and(
          isNotNull(orders.trafficSource),
          ne(orders.trafficSource, ""),
          eq(orders.isVoided, false),
          gte(orders.classDate, new Date(startDate)),
          lte(orders.classDate, new Date(endDate))
        )
      )
      .groupBy(orders.trafficSource)
      .orderBy(sql`SUM(${orders.paymentAmount}) DESC`);
  }
  
  const results = await query;
  
  return results.map(row => ({
    trafficSource: row.trafficSource,
    orderCount: Number(row.orderCount),
    totalAmount: Number(row.totalAmount) || 0,
  }));
}
