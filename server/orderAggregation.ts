import { getDb } from "./db";
import { orders } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * 根据月份和城市汇总订单的老师费用和车费
 * @param month 月份，格式：YYYY-MM
 * @param cityName 城市名称
 * @returns { teacherFee: string, transportFee: string }
 */
/**
 * 根据月份和城市汇总订单的销售额和订单数
 * @param month 月份，格式：YYYY-MM
 * @param cityName 城市名称
 * @returns { salesAmount: string, orderCount: number }
 */
export async function aggregateOrderSalesByMonthAndCity(
  month: string,
  cityName: string
): Promise<{ salesAmount: string; orderCount: number }> {
  const db = await getDb();
  if (!db) {
    throw new Error("数据库连接失败");
  }

  // 解析月份，获取开始和结束日期
  const [year, monthNum] = month.split("-").map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0); // 当月最后一天

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  // 查询该月份、该城市的所有订单，汇总销售额和订单数
  const result = await db
    .select({
      totalSalesAmount: sql<string>`COALESCE(SUM(${orders.paymentAmount}), 0)`,
      orderCount: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.deliveryCity, cityName),
        sql`${orders.classDate} >= ${startDateStr}`,
        sql`${orders.classDate} <= ${endDateStr}`
      )
    );

  if (!result || result.length === 0) {
    return {
      salesAmount: "0.00",
      orderCount: 0,
    };
  }

  return {
    salesAmount: Number(result[0].totalSalesAmount || 0).toFixed(2),
    orderCount: Number(result[0].orderCount || 0),
  };
}

export async function aggregateOrderFeesByMonthAndCity(
  month: string,
  cityName: string
): Promise<{ teacherFee: string; transportFee: string }> {
  const db = await getDb();
  if (!db) {
    throw new Error("数据库连接失败");
  }

  // 解析月份，获取开始和结束日期
  const [year, monthNum] = month.split("-").map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0); // 当月最后一天

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  // 查询该月份、该城市的所有订单，汇总老师费用和车费
  const result = await db
    .select({
      totalTeacherFee: sql<string>`COALESCE(SUM(${orders.teacherFee}), 0)`,
      totalTransportFee: sql<string>`COALESCE(SUM(${orders.transportFee}), 0)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.deliveryCity, cityName),
        sql`${orders.classDate} >= ${startDateStr}`,
        sql`${orders.classDate} <= ${endDateStr}`
      )
    );

  if (!result || result.length === 0) {
    return {
      teacherFee: "0.00",
      transportFee: "0.00",
    };
  }

  return {
    teacherFee: Number(result[0].totalTeacherFee || 0).toFixed(2),
    transportFee: Number(result[0].totalTransportFee || 0).toFixed(2),
  };
}

/**
 * 根据partnerId和月份，汇总该合伙人所有城市的老师费用和车费
 * @param partnerId 合伙人ID
 * @param month 月份，格式：YYYY-MM
 * @returns { teacherFee: string, transportFee: string }
 */
export async function aggregateOrderFeesByPartnerAndMonth(
  partnerId: number,
  month: string
): Promise<{ teacherFee: string; transportFee: string }> {
  const db = await getDb();
  if (!db) {
    throw new Error("数据库连接失败");
  }

  // 查询该合伙人的所有城市
  const { partnerCities } = await import("../drizzle/schema");
  const partnerCitiesResult = await db
    .select()
    .from(partnerCities)
    .where(and(
      eq(partnerCities.partnerId, partnerId),
      eq(partnerCities.contractStatus, 'active')
    ));

  if (!partnerCitiesResult || partnerCitiesResult.length === 0) {
    return {
      teacherFee: "0.00",
      transportFee: "0.00",
    };
  }

  // 汇总所有城市的费用
  let totalTeacherFee = 0;
  let totalTransportFee = 0;

  for (const partnerCity of partnerCitiesResult) {
    const { cities } = await import("../drizzle/schema");
    const cityResult = await db
      .select()
      .from(cities)
      .where(eq(cities.id, partnerCity.cityId))
      .limit(1);

    if (cityResult && cityResult.length > 0) {
      const cityName = cityResult[0].name;
      const fees = await aggregateOrderFeesByMonthAndCity(month, cityName);
      totalTeacherFee += Number(fees.teacherFee);
      totalTransportFee += Number(fees.transportFee);
    }
  }

  return {
    teacherFee: totalTeacherFee.toFixed(2),
    transportFee: totalTransportFee.toFixed(2),
  };
}
