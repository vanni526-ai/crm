import { eq, and, gte, lte, desc, sql, between } from "drizzle-orm";
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
