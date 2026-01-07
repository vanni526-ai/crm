import { getDb } from "./db";
import { matchedScheduleOrders, schedules, orders } from "../drizzle/schema";
import { eq, and, isNull, gte, lte, sql } from "drizzle-orm";

/**
 * 创建匹配关系
 */
export async function createMatch(data: {
  scheduleId: number;
  orderId: number;
  matchMethod: "llm_intelligent" | "manual" | "channel_order_no";
  confidence?: number;
  matchDetails?: string;
  isVerified?: boolean;
  verifiedBy?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(matchedScheduleOrders).values({
    scheduleId: data.scheduleId,
    orderId: data.orderId,
    matchMethod: data.matchMethod,
    confidence: data.confidence?.toString(),
    matchDetails: data.matchDetails,
    isVerified: data.isVerified ?? false,
    verifiedBy: data.verifiedBy,
    verifiedAt: data.isVerified ? new Date() : undefined,
  });

  return result;
}

/**
 * 批量创建匹配关系
 */
export async function batchCreateMatches(matches: Array<{
  scheduleId: number;
  orderId: number;
  matchMethod: "llm_intelligent" | "manual" | "channel_order_no";
  confidence?: number;
  matchDetails?: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (matches.length === 0) return;

  await db.insert(matchedScheduleOrders).values(
    matches.map(m => ({
      scheduleId: m.scheduleId,
      orderId: m.orderId,
      matchMethod: m.matchMethod,
      confidence: m.confidence?.toString(),
      matchDetails: m.matchDetails,
      isVerified: false,
    }))
  );
}

/**
 * 更新匹配关系
 */
export async function updateMatch(
  matchId: number,
  data: {
    orderId?: number;
    confidence?: number;
    matchDetails?: string;
    isVerified?: boolean;
    verifiedBy?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(matchedScheduleOrders)
    .set({
      ...(data.orderId !== undefined && { orderId: data.orderId }),
      ...(data.confidence !== undefined && { confidence: data.confidence.toString() }),
      ...(data.matchDetails !== undefined && { matchDetails: data.matchDetails }),
      ...(data.isVerified !== undefined && { isVerified: data.isVerified }),
      ...(data.verifiedBy !== undefined && { verifiedBy: data.verifiedBy }),
      ...(data.isVerified && { verifiedAt: new Date() }),
    })
    .where(eq(matchedScheduleOrders.id, matchId));
}

/**
 * 删除匹配关系
 */
export async function deleteMatch(matchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(matchedScheduleOrders).where(eq(matchedScheduleOrders.id, matchId));
}

/**
 * 获取所有匹配关系(带关联数据)
 */
export async function getAllMatches() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select({
      match: matchedScheduleOrders,
      schedule: schedules,
      order: orders,
    })
    .from(matchedScheduleOrders)
    .leftJoin(schedules, eq(matchedScheduleOrders.scheduleId, schedules.id))
    .leftJoin(orders, eq(matchedScheduleOrders.orderId, orders.id));

  return results;
}

/**
 * 获取未匹配的课程日程
 */
export async function getUnmatchedSchedules() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select()
    .from(schedules)
    .leftJoin(matchedScheduleOrders, eq(schedules.id, matchedScheduleOrders.scheduleId))
    .where(isNull(matchedScheduleOrders.id));

  return results.map(r => r.schedules);
}

/**
 * 获取未匹配的订单
 */
export async function getUnmatchedOrders() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select()
    .from(orders)
    .leftJoin(matchedScheduleOrders, eq(orders.id, matchedScheduleOrders.orderId))
    .where(isNull(matchedScheduleOrders.id));

  return results.map(r => r.orders);
}

/**
 * 获取月度对账报表数据
 */
export async function getMonthlyReconciliationReport(params: {
  startDate: Date;
  endDate: Date;
  city?: string;
  salesPerson?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = db
    .select({
      match: matchedScheduleOrders,
      schedule: schedules,
      order: orders,
    })
    .from(matchedScheduleOrders)
    .innerJoin(schedules, eq(matchedScheduleOrders.scheduleId, schedules.id))
    .innerJoin(orders, eq(matchedScheduleOrders.orderId, orders.id))
    .where(
      and(
        gte(schedules.classDate, params.startDate),
        lte(schedules.classDate, params.endDate)
      )
    );

  const results = await query;

  // 计算统计数据
  const stats = {
    totalMatches: results.length,
    totalRevenue: 0,
    totalTeacherFee: 0,
    totalTransportFee: 0,
    totalOtherFee: 0,
    totalPartnerFee: 0,
    totalExpense: 0,
    netProfit: 0,
    byCity: {} as Record<string, any>,
    bySalesPerson: {} as Record<string, any>,
  };

  results.forEach(({ schedule, order }) => {
    const revenue = parseFloat(order.courseAmount || "0");
    const teacherFee = parseFloat(schedule.teacherFee || order.teacherFee || "0");
    const transportFee = parseFloat(schedule.transportFee || order.transportFee || "0");
    const otherFee = parseFloat(schedule.otherFee || order.otherFee || "0");
    const partnerFee = parseFloat(schedule.partnerFee || order.partnerFee || "0");
    const expense = teacherFee + transportFee + otherFee + partnerFee;

    stats.totalRevenue += revenue;
    stats.totalTeacherFee += teacherFee;
    stats.totalTransportFee += transportFee;
    stats.totalOtherFee += otherFee;
    stats.totalPartnerFee += partnerFee;
    stats.totalExpense += expense;
    stats.netProfit += revenue - expense;

    // 按城市统计
    const city = schedule.deliveryCity || order.deliveryCity || "未知";
    if (!stats.byCity[city]) {
      stats.byCity[city] = { revenue: 0, expense: 0, profit: 0, count: 0 };
    }
    stats.byCity[city].revenue += revenue;
    stats.byCity[city].expense += expense;
    stats.byCity[city].profit += revenue - expense;
    stats.byCity[city].count += 1;

    // 按销售人员统计
    const salesPerson = schedule.salesName || order.salesPerson || "未知";
    if (!stats.bySalesPerson[salesPerson]) {
      stats.bySalesPerson[salesPerson] = { revenue: 0, expense: 0, profit: 0, count: 0 };
    }
    stats.bySalesPerson[salesPerson].revenue += revenue;
    stats.bySalesPerson[salesPerson].expense += expense;
    stats.bySalesPerson[salesPerson].profit += revenue - expense;
    stats.bySalesPerson[salesPerson].count += 1;
  });

  return {
    stats,
    details: results,
  };
}
