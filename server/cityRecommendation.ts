import * as db from "./db";

/**
 * 城市推荐结果
 */
export interface CityRecommendation {
  city: string;
  score: number;
  reason: string;
}

/**
 * 根据客户历史订单和销售人员常用城市推荐交付城市
 * @param customerName 客户姓名
 * @param salesPersonName 销售人员姓名
 * @returns 推荐的城市列表(按得分降序)
 */
export async function recommendCity(
  customerName?: string,
  salesPersonName?: string
): Promise<CityRecommendation[]> {
  const recommendations: Map<string, { score: number; reasons: string[] }> = new Map();

  // 1. 基于客户历史订单推荐
  if (customerName) {
    const customerOrders = await db.getOrdersByCustomerName(customerName);
    const cityFrequency = new Map<string, number>();

    for (const order of customerOrders) {
      if (order.deliveryCity) {
        cityFrequency.set(
          order.deliveryCity,
          (cityFrequency.get(order.deliveryCity) || 0) + 1
        );
      }
    }

    // 客户历史城市权重最高(得分 50-100)
    const maxFreq = Math.max(...Array.from(cityFrequency.values()), 0);
    for (const [city, freq] of Array.from(cityFrequency.entries())) {
      const score = 50 + (freq / maxFreq) * 50;
      const existing = recommendations.get(city) || { score: 0, reasons: [] };
      existing.score += score;
      existing.reasons.push(`客户在此城市有${freq}次订单记录`);
      recommendations.set(city, existing);
    }
  }

  // 2. 基于销售人员常用城市推荐
  if (salesPersonName) {
    const salesOrders = await db.getOrdersBySalesPerson(salesPersonName);
    const cityFrequency = new Map<string, number>();

    for (const order of salesOrders) {
      if (order.deliveryCity) {
        cityFrequency.set(
          order.deliveryCity,
          (cityFrequency.get(order.deliveryCity) || 0) + 1
        );
      }
    }

    // 销售人员常用城市权重中等(得分 20-40)
    const maxFreq = Math.max(...Array.from(cityFrequency.values()), 0);
    for (const [city, freq] of Array.from(cityFrequency.entries())) {
      const score = 20 + (freq / maxFreq) * 20;
      const existing = recommendations.get(city) || { score: 0, reasons: [] };
      existing.score += score;
      existing.reasons.push(`销售人员在此城市有${freq}次订单记录`);
      recommendations.set(city, existing);
    }
  }

  // 3. 基于城市订单量推荐(热门城市)
  const cityStats = await db.getAllCitiesWithStats();
  const maxOrderCount = Math.max(...cityStats.map((c) => c.orderCount), 0);

  for (const cityStat of cityStats) {
    if (cityStat.orderCount > 0) {
      // 热门城市权重较低(得分 5-15)
      const score = 5 + (cityStat.orderCount / maxOrderCount) * 10;
      const existing = recommendations.get(cityStat.city) || { score: 0, reasons: [] };
      existing.score += score;
      existing.reasons.push(`热门城市(共${cityStat.orderCount}个订单)`);
      recommendations.set(cityStat.city, existing);
    }
  }

  // 转换为数组并排序
  const result: CityRecommendation[] = Array.from(recommendations.entries())
    .map(([city, data]) => ({
      city,
      score: Math.round(data.score * 100) / 100,
      reason: data.reasons.join("; "),
    }))
    .sort((a, b) => b.score - a.score);

  return result;
}

/**
 * 获取推荐的首选城市
 * @param customerName 客户姓名
 * @param salesPersonName 销售人员姓名
 * @returns 推荐的城市名称,如果没有推荐则返回null
 */
export async function getRecommendedCity(
  customerName?: string,
  salesPersonName?: string
): Promise<string | null> {
  const recommendations = await recommendCity(customerName, salesPersonName);
  return recommendations.length > 0 ? recommendations[0].city : null;
}
