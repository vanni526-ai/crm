import { getDb } from "../db";
import { cityMonthlyExpenses, partnerCities, cities } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

async function analyzeWuhanJinan() {
  const db = await getDb();
  if (!db) {
    console.error("❌ 数据库连接失败");
    process.exit(1);
  }

  const cityNames = ['武汉', '济南'];
  
  console.log("\n========== 分析武汉和济南的费用数据 ==========\n");

  for (const cityName of cityNames) {
    // 查询城市
    const cityList = await db
      .select()
      .from(cities)
      .where(eq(cities.name, cityName))
      .limit(1);

    if (cityList.length === 0) {
      console.log(`${cityName}: ⚠️  城市不存在`);
      continue;
    }

    const city = cityList[0];

    // 查询合伙人城市配置
    const pcList = await db
      .select()
      .from(partnerCities)
      .where(eq(partnerCities.cityId, city.id))
      .limit(1);

    if (pcList.length === 0) {
      console.log(`${cityName}: ⚠️  没有合伙人城市配置`);
      continue;
    }

    const pc = pcList[0];
    const expenseCoverage = pc.expenseCoverage as any || {};

    // 查询费用账单
    const expenseList = await db
      .select()
      .from(cityMonthlyExpenses)
      .where(
        and(
          eq(cityMonthlyExpenses.cityName, cityName),
          eq(cityMonthlyExpenses.month, "2026-01")
        )
      )
      .limit(1);

    if (expenseList.length === 0) {
      console.log(`${cityName}: ⚠️  没有2026-01月份的费用账单`);
      continue;
    }

    const expense = expenseList[0];

    console.log(`${cityName}:`);
    console.log(`  总费用: ¥${expense.totalExpense}`);
    console.log(`  合伙人承担: ¥${expense.partnerShare}`);
    console.log();
    console.log(`  费用明细:`);
    console.log(`    房租: ¥${expense.rentFee} (勾选: ${expenseCoverage.rentFee ? '✓' : '✗'})`);
    console.log(`    物业费: ¥${expense.propertyFee} (勾选: ${expenseCoverage.propertyFee ? '✓' : '✗'})`);
    console.log(`    水电费: ¥${expense.utilityFee} (勾选: ${expenseCoverage.utilityFee ? '✓' : '✗'})`);
    console.log(`    道具耗材: ¥${expense.consumablesFee} (勾选: ${expenseCoverage.consumablesFee ? '✓' : '✗'})`);
    console.log(`    保洁费: ¥${expense.cleaningFee} (勾选: ${expenseCoverage.cleaningFee ? '✓' : '✗'})`);
    console.log(`    话费: ¥${expense.phoneFee} (勾选: ${expenseCoverage.phoneFee ? '✓' : '✗'})`);
    console.log(`    合同后付款: ¥${expense.deferredPayment} (勾选: ${expenseCoverage.deferredPayment ? '✓' : '✗'})`);
    console.log(`    快递费: ¥${expense.expressFee} (勾选: ${expenseCoverage.courierFee ? '✓' : '✗'})`);
    console.log(`    推广费: ¥${expense.promotionFee} (勾选: ${expenseCoverage.promotionFee ? '✓' : '✗'})`);
    console.log(`    其他费用: ¥${expense.otherFee} (勾选: ${expenseCoverage.otherFee ? '✓' : '✗'})`);
    console.log(`    老师费用: ¥${expense.teacherFee} (勾选: ${expenseCoverage.teacherFee ? '✓' : '✗'})`);
    console.log(`    车费: ¥${expense.transportFee} (勾选: ${expenseCoverage.transportFee ? '✓' : '✗'})`);
    console.log();

    // 计算勾选费用总和
    let coveredExpenseTotal = 0;
    if (expenseCoverage.rentFee) coveredExpenseTotal += parseFloat(expense.rentFee || "0");
    if (expenseCoverage.propertyFee) coveredExpenseTotal += parseFloat(expense.propertyFee || "0");
    if (expenseCoverage.utilityFee) coveredExpenseTotal += parseFloat(expense.utilityFee || "0");
    if (expenseCoverage.consumablesFee) coveredExpenseTotal += parseFloat(expense.consumablesFee || "0");
    if (expenseCoverage.cleaningFee) coveredExpenseTotal += parseFloat(expense.cleaningFee || "0");
    if (expenseCoverage.phoneFee) coveredExpenseTotal += parseFloat(expense.phoneFee || "0");
    if (expenseCoverage.deferredPayment) coveredExpenseTotal += parseFloat(expense.deferredPayment || "0");
    if (expenseCoverage.courierFee) coveredExpenseTotal += parseFloat(expense.expressFee || "0");
    if (expenseCoverage.promotionFee) coveredExpenseTotal += parseFloat(expense.promotionFee || "0");
    if (expenseCoverage.otherFee) coveredExpenseTotal += parseFloat(expense.otherFee || "0");
    if (expenseCoverage.teacherFee) coveredExpenseTotal += parseFloat(expense.teacherFee || "0");
    if (expenseCoverage.transportFee) coveredExpenseTotal += parseFloat(expense.transportFee || "0");

    const costShareRatio = pc.currentProfitStage === 1
      ? parseFloat(pc.profitRatioStage1Partner || "0")
      : pc.currentProfitStage === 2
      ? parseFloat(pc.isInvestmentRecovered ? pc.profitRatioStage2BPartner || "0" : pc.profitRatioStage2APartner || "0")
      : parseFloat(pc.profitRatioStage3Partner || "0");

    const expectedPartnerShare = (coveredExpenseTotal * costShareRatio / 100).toFixed(2);

    console.log(`  勾选费用总和: ¥${coveredExpenseTotal.toFixed(2)}`);
    console.log(`  费用分摊比例: ${costShareRatio}%`);
    console.log(`  应该的合伙人承担: ¥${expectedPartnerShare}`);
    console.log(`  实际的合伙人承担: ¥${expense.partnerShare}`);
    console.log();
  }

  console.log("========== 分析完成 ==========\n");
  process.exit(0);
}

analyzeWuhanJinan().catch((error) => {
  console.error("❌ 脚本执行失败:", error);
  process.exit(1);
});
