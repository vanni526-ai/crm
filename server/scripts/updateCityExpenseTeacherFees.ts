/**
 * 批量更新城市费用账单的老师费用和车费
 * 从订单数据中重新汇总计算
 */
import { getDb } from "../db";
import { cityMonthlyExpenses, cities, partnerCities } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { aggregateOrderFeesByMonthAndCity } from "../orderAggregation";

async function updateCityExpenseTeacherFees() {
  const db = await getDb();
  if (!db) {
    console.error("数据库连接失败");
    process.exit(1);
  }

  console.log("开始批量更新城市费用账单的老师费用和车费...");

  // 查询所有费用账单记录
  const expenses = await db
    .select({
      id: cityMonthlyExpenses.id,
      cityId: cityMonthlyExpenses.cityId,
      cityName: cities.name,
      month: cityMonthlyExpenses.month,
      rentFee: cityMonthlyExpenses.rentFee,
      propertyFee: cityMonthlyExpenses.propertyFee,
      utilityFee: cityMonthlyExpenses.utilityFee,
      consumablesFee: cityMonthlyExpenses.consumablesFee,
      cleaningFee: cityMonthlyExpenses.cleaningFee,
      phoneFee: cityMonthlyExpenses.phoneFee,
      deferredPayment: cityMonthlyExpenses.deferredPayment,
      expressFee: cityMonthlyExpenses.expressFee,
      promotionFee: cityMonthlyExpenses.promotionFee,
      otherFee: cityMonthlyExpenses.otherFee,
      // 费用分摄比例
      costShareRatio: sql<string>`
        CASE 
          WHEN ${partnerCities.currentProfitStage} = 1 THEN ${partnerCities.profitRatioStage1Partner}
          WHEN ${partnerCities.currentProfitStage} = 2 AND ${partnerCities.isInvestmentRecovered} = 0 THEN ${partnerCities.profitRatioStage2APartner}
          WHEN ${partnerCities.currentProfitStage} = 2 AND ${partnerCities.isInvestmentRecovered} = 1 THEN ${partnerCities.profitRatioStage2BPartner}
          WHEN ${partnerCities.currentProfitStage} = 3 THEN ${partnerCities.profitRatioStage3Partner}
          ELSE NULL
        END
      `.as('costShareRatio'),
    })
    .from(cityMonthlyExpenses)
    .leftJoin(cities, eq(cityMonthlyExpenses.cityId, cities.id))
    .leftJoin(partnerCities, eq(cityMonthlyExpenses.cityId, partnerCities.cityId));

  console.log(`找到 ${expenses.length} 条费用账单记录`);

  let updatedCount = 0;
  let errorCount = 0;

  for (const expense of expenses) {
    try {
      console.log(`\n处理: ${expense.cityName} - ${expense.month}`);

      // 从订单数据汇总老师费用和车费
      const { teacherFee, transportFee } = await aggregateOrderFeesByMonthAndCity(
        expense.month,
        expense.cityName || ""
      );

      console.log(`  老师费用: ${teacherFee}, 车费: ${transportFee}`);

      // 重新计算总费用
      const totalExpense = (
        parseFloat(expense.rentFee || "0") +
        parseFloat(expense.propertyFee || "0") +
        parseFloat(expense.utilityFee || "0") +
        parseFloat(expense.consumablesFee || "0") +
        parseFloat(expense.cleaningFee || "0") +
        parseFloat(expense.phoneFee || "0") +
        parseFloat(expense.expressFee || "0") +
        parseFloat(expense.promotionFee || "0") +
        parseFloat(expense.otherFee || "0") +
        parseFloat(teacherFee) +
        parseFloat(transportFee)
      ).toFixed(2);

      // 计算合伙人承担 = 总费用 × 费用分摄比例 / 100
      const costShareRatio = parseFloat(expense.costShareRatio || "0");
      const partnerShare = (parseFloat(totalExpense) * costShareRatio / 100).toFixed(2);

      console.log(`  总费用: ${totalExpense}, 合伙人承担: ${partnerShare} (${costShareRatio}%)`);

      // 更新数据库
      await db
        .update(cityMonthlyExpenses)
        .set({
          teacherFee,
          transportFee,
          totalExpense,
          partnerShare,
          updatedAt: new Date(),
        })
        .where(eq(cityMonthlyExpenses.id, expense.id));

      updatedCount++;
      console.log(`  ✓ 更新成功`);
    } catch (error) {
      errorCount++;
      console.error(`  ✗ 更新失败:`, error);
    }
  }

  console.log(`\n批量更新完成:`);
  console.log(`  成功: ${updatedCount} 条`);
  console.log(`  失败: ${errorCount} 条`);
  console.log(`  总计: ${expenses.length} 条`);

  process.exit(0);
}

// 执行脚本
updateCityExpenseTeacherFees().catch((error) => {
  console.error("脚本执行失败:", error);
  process.exit(1);
});
