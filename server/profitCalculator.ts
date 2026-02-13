import { getDb } from "./db";
import { orders, partnerCities } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * 计算合同签订后的月数
 * @param contractSignDate 合同签署日期 (YYYY-MM-DD)
 * @returns 签订后的月数
 */
export function calculateMonthsSinceContract(contractSignDate: string): number {
  const signDate = new Date(contractSignDate);
  const now = new Date();
  
  const yearsDiff = now.getFullYear() - signDate.getFullYear();
  const monthsDiff = now.getMonth() - signDate.getMonth();
  
  return yearsDiff * 12 + monthsDiff;
}

/**
 * 根据合同签订月数判断当前所处分红阶段
 * @param monthsSinceContract 合同签订后的月数
 * @returns 分红阶段 (1/2/3)
 */
export function determineProfitStage(monthsSinceContract: number): number {
  if (monthsSinceContract <= 12) {
    return 1; // 第1阶段：0-12个月
  } else if (monthsSinceContract <= 24) {
    return 2; // 第2阶段：13-24个月
  } else {
    return 3; // 第3阶段：25个月后
  }
}

/**
 * 计算前12个月的收入总额
 * @param partnerId 合伙人ID
 * @param cityId 城市ID
 * @param contractSignDate 合同签署日期
 * @returns 前12个月的收入总额
 */
export async function calculateFirst12MonthsRevenue(
  partnerId: number,
  cityId: number,
  contractSignDate: string
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const signDate = new Date(contractSignDate);
  const endDate = new Date(signDate);
  endDate.setMonth(endDate.getMonth() + 12);
  
  // 获取城市名称
  const partnerCity = await db
    .select()
    .from(partnerCities)
    .where(and(
      eq(partnerCities.partnerId, partnerId),
      eq(partnerCities.cityId, cityId),
      eq(partnerCities.contractStatus, 'active')
    ))
    .limit(1);
  
  if (partnerCity.length === 0) return 0;
  
  // 查询该城市在前12个月的订单收入
  const result = await db
    .select({
      totalRevenue: sql<string>`COALESCE(SUM(${orders.courseAmount}), 0)`,
    })
    .from(orders)
    .where(and(
      sql`${orders.deliveryCity} = (SELECT name FROM cities WHERE id = ${cityId})`,
      sql`${orders.classDate} >= ${signDate.toISOString().split('T')[0]}`,
      sql`${orders.classDate} < ${endDate.toISOString().split('T')[0]}`
    ));
  
  return Number(result[0]?.totalRevenue || 0);
}

/**
 * 判断投资是否已回本
 * @param first12MonthsRevenue 前12个月的收入总额
 * @param totalInvestment 总投资金额
 * @returns 是否已回本
 */
export function isInvestmentRecovered(
  first12MonthsRevenue: number,
  totalInvestment: number
): boolean {
  return first12MonthsRevenue >= totalInvestment;
}

/**
 * 计算总投资金额
 * @param brandUsageFee 品牌使用费
 * @param brandAuthDeposit 品牌授权押金
 * @param totalEstimatedCost 总预估成本
 * @returns 总投资金额
 */
export function calculateTotalInvestment(
  brandUsageFee: number = 0,
  brandAuthDeposit: number = 0,
  totalEstimatedCost: number = 0
): number {
  return brandUsageFee + brandAuthDeposit + totalEstimatedCost;
}

/**
 * 获取当前应用的分红比例
 * @param partnerCityData 合伙人-城市关联数据
 * @param currentStage 当前分红阶段
 * @param isRecovered 是否已回本
 * @returns { partnerRatio, brandRatio }
 */
export function getCurrentProfitRatio(
  partnerCityData: any,
  currentStage: number,
  isRecovered: boolean
): { partnerRatio: number; brandRatio: number } {
  if (currentStage === 1) {
    return {
      partnerRatio: Number(partnerCityData.profitRatioStage1Partner || 0),
      brandRatio: Number(partnerCityData.profitRatioStage1Brand || 0),
    };
  } else if (currentStage === 2) {
    if (isRecovered) {
      // 第2阶段B：已回本
      return {
        partnerRatio: Number(partnerCityData.profitRatioStage2BPartner || 0),
        brandRatio: Number(partnerCityData.profitRatioStage2BBrand || 0),
      };
    } else {
      // 第2阶段A：未回本
      return {
        partnerRatio: Number(partnerCityData.profitRatioStage2APartner || 0),
        brandRatio: Number(partnerCityData.profitRatioStage2ABrand || 0),
      };
    }
  } else {
    // 第3阶段
    return {
      partnerRatio: Number(partnerCityData.profitRatioStage3Partner || 0),
      brandRatio: Number(partnerCityData.profitRatioStage3Brand || 0),
    };
  }
}

/**
 * 完整的分红阶段和回本状态更新流程
 * @param partnerId 合伙人ID
 * @param cityId 城市ID
 * @returns 更新后的分红阶段和回本状态
 */
export async function updateProfitStageAndRecoveryStatus(
  partnerId: number,
  cityId: number
): Promise<{
  currentProfitStage: number;
  isInvestmentRecovered: boolean;
  first12MonthsRevenue: number;
  totalInvestment: number;
  currentProfitRatio: { partnerRatio: number; brandRatio: number };
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("数据库连接失败");
  }
  
  // 获取合伙人-城市合同信息
  const partnerCity = await db
    .select()
    .from(partnerCities)
    .where(and(
      eq(partnerCities.partnerId, partnerId),
      eq(partnerCities.cityId, cityId),
      eq(partnerCities.contractStatus, 'active')
    ))
    .limit(1);
  
  if (partnerCity.length === 0) {
    throw new Error("未找到合伙人-城市关联记录");
  }
  
  const data = partnerCity[0];
  
  // 如果没有合同签署日期，无法计算
  if (!data.contractSignDate) {
    throw new Error("合同签署日期未设置");
  }
  
  // 1. 计算合同签订后的月数
  const monthsSinceContract = calculateMonthsSinceContract(
    data.contractSignDate.toISOString().split('T')[0]
  );
  
  // 2. 判断当前所处分红阶段
  const currentProfitStage = determineProfitStage(monthsSinceContract);
  
  // 3. 计算前12个月的收入
  const first12MonthsRevenue = await calculateFirst12MonthsRevenue(
    partnerId,
    cityId,
    data.contractSignDate.toISOString().split('T')[0]
  );
  
  // 4. 计算总投资金额
  const totalInvestment = calculateTotalInvestment(
    Number(data.brandUsageFee || 0),
    Number(data.brandAuthDeposit || 0),
    Number(data.totalEstimatedCost || 0)
  );
  
  // 5. 判断是否已回本
  const isRecovered = isInvestmentRecovered(first12MonthsRevenue, totalInvestment);
  
  // 6. 获取当前应用的分红比例
  const currentProfitRatio = getCurrentProfitRatio(data, currentProfitStage, isRecovered);
  
  // 7. 更新数据库
  await db
    .update(partnerCities)
    .set({
      currentProfitStage,
      isInvestmentRecovered: isRecovered,
    })
    .where(eq(partnerCities.id, data.id));
  
  return {
    currentProfitStage,
    isInvestmentRecovered: isRecovered,
    first12MonthsRevenue,
    totalInvestment,
    currentProfitRatio,
  };
}
