/**
 * 月度合伙人费用统计模块
 * 用于按月汇总各城市的合伙人应结算金额
 */

import { getDb } from "./db";
import { orders } from "../drizzle/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";

/**
 * 月度合伙人费用统计结果
 */
export interface MonthlyPartnerSettlement {
  city: string; // 城市名称
  orderCount: number; // 订单数量
  totalCourseAmount: number; // 总课程金额
  totalTeacherFee: number; // 总老师费用
  totalTransportFee: number; // 总车费
  totalOtherFee: number; // 总其他费用
  totalPartnerFee: number; // 应付合伙人费用
  partnerFeeRate: number; // 合伙人费率(%)
}

/**
 * 获取指定月份的合伙人费用统计
 * @param year 年份(如2025)
 * @param month 月份(1-12)
 * @returns 按城市分组的合伙人费用统计
 */
export async function getMonthlyPartnerSettlement(
  year: number,
  month: number
): Promise<MonthlyPartnerSettlement[]> {
  const db = await getDb();
  if (!db) return [];

  // 计算月份的起止日期
  const startDate = new Date(year, month - 1, 1); // 月初
  const endDate = new Date(year, month, 0); // 月末
  endDate.setHours(23, 59, 59, 999);

  console.log(`[PartnerSettlement] 查询时间范围: ${startDate.toISOString()} ~ ${endDate.toISOString()}`);

  // 按城市分组统计订单数据
  const results = await db
    .select({
      city: orders.deliveryCity,
      orderCount: sql<number>`COUNT(*)`,
      totalCourseAmount: sql<number>`COALESCE(SUM(${orders.courseAmount}), 0)`,
      totalTeacherFee: sql<number>`COALESCE(SUM(${orders.teacherFee}), 0)`,
      totalTransportFee: sql<number>`COALESCE(SUM(${orders.transportFee}), 0)`,
      totalOtherFee: sql<number>`COALESCE(SUM(${orders.otherFee}), 0)`,
      totalPartnerFee: sql<number>`COALESCE(SUM(${orders.partnerFee}), 0)`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.classDate, startDate),
        lte(orders.classDate, endDate),
        // 排除已取消的订单
        sql`${orders.status} != 'cancelled'`
      )
    )
    .groupBy(orders.deliveryCity);

  console.log(`[PartnerSettlement] 查询到 ${results.length} 个城市的数据`);

  // 获取城市合伙人费率配置
  const { getAllCityPartnerConfig } = await import("./db");
  const cityConfigs = await getAllCityPartnerConfig();
  const cityConfigMap = new Map(
    cityConfigs.map((config) => [config.city, config.partnerFeeRate])
  );

  // 格式化结果
  const settlements: MonthlyPartnerSettlement[] = results
    .map((row) => {
      const city = row.city || "未知城市";
      const partnerFeeRate = cityConfigMap.get(city) || 0;

      return {
        city,
        orderCount: Number(row.orderCount) || 0,
        totalCourseAmount: Number(row.totalCourseAmount) || 0,
        totalTeacherFee: Number(row.totalTeacherFee) || 0,
        totalTransportFee: Number(row.totalTransportFee) || 0,
        totalOtherFee: Number(row.totalOtherFee) || 0,
        totalPartnerFee: Number(row.totalPartnerFee) || 0,
        partnerFeeRate: Number(partnerFeeRate) * 100, // 转换为百分比显示
      };
    })
    // 按合伙人费用从高到低排序
    .sort((a, b) => b.totalPartnerFee - a.totalPartnerFee);

  console.log(`[PartnerSettlement] 返回 ${settlements.length} 条统计数据`);

  return settlements;
}

/**
 * 获取指定日期范围的合伙人费用统计
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 按城市分组的合伙人费用统计
 */
export async function getPartnerSettlementByDateRange(
  startDate: Date,
  endDate: Date
): Promise<MonthlyPartnerSettlement[]> {
  const db = await getDb();
  if (!db) return [];

  console.log(`[PartnerSettlement] 查询时间范围: ${startDate.toISOString()} ~ ${endDate.toISOString()}`);

  // 按城市分组统计订单数据
  const results = await db
    .select({
      city: orders.deliveryCity,
      orderCount: sql<number>`COUNT(*)`,
      totalCourseAmount: sql<number>`COALESCE(SUM(${orders.courseAmount}), 0)`,
      totalTeacherFee: sql<number>`COALESCE(SUM(${orders.teacherFee}), 0)`,
      totalTransportFee: sql<number>`COALESCE(SUM(${orders.transportFee}), 0)`,
      totalOtherFee: sql<number>`COALESCE(SUM(${orders.otherFee}), 0)`,
      totalPartnerFee: sql<number>`COALESCE(SUM(${orders.partnerFee}), 0)`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.classDate, startDate),
        lte(orders.classDate, endDate),
        // 排除已取消的订单
        sql`${orders.status} != 'cancelled'`
      )
    )
    .groupBy(orders.deliveryCity);

  console.log(`[PartnerSettlement] 查询到 ${results.length} 个城市的数据`);

  // 获取城市合伙人费率配置
  const { getAllCityPartnerConfig } = await import("./db");
  const cityConfigs = await getAllCityPartnerConfig();
  const cityConfigMap = new Map(
    cityConfigs.map((config) => [config.city, config.partnerFeeRate])
  );

  // 格式化结果
  const settlements: MonthlyPartnerSettlement[] = results
    .map((row) => {
      const city = row.city || "未知城市";
      const partnerFeeRate = cityConfigMap.get(city) || 0;

      return {
        city,
        orderCount: Number(row.orderCount) || 0,
        totalCourseAmount: Number(row.totalCourseAmount) || 0,
        totalTeacherFee: Number(row.totalTeacherFee) || 0,
        totalTransportFee: Number(row.totalTransportFee) || 0,
        totalOtherFee: Number(row.totalOtherFee) || 0,
        totalPartnerFee: Number(row.totalPartnerFee) || 0,
        partnerFeeRate: Number(partnerFeeRate) * 100, // 转换为百分比显示
      };
    })
    // 按合伙人费用从高到低排序
    .sort((a, b) => b.totalPartnerFee - a.totalPartnerFee);

  console.log(`[PartnerSettlement] 返回 ${settlements.length} 条统计数据`);

  return settlements;
}
