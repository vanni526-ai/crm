import { getDb } from "../db";
import { partnerCities, cities } from "../../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

async function checkExpenseCoverage() {
  const db = await getDb();
  if (!db) {
    console.error("❌ 数据库连接失败");
    process.exit(1);
  }

  const cityNames = ['武汉', '济南', '深圳', '宁波', '泉州'];
  
  console.log("\n========== 检查城市费用承担配置 ==========\n");

  // 查询城市列表
  const cityList = await db
    .select()
    .from(cities)
    .where(inArray(cities.name, cityNames));

  for (const city of cityList) {
    // 查询合伙人城市配置
    const pcList = await db
      .select()
      .from(partnerCities)
      .where(eq(partnerCities.cityId, city.id))
      .limit(1);

    if (pcList.length === 0) {
      console.log(`${city.name}: ⚠️  没有合伙人城市配置`);
      continue;
    }

    const pc = pcList[0];
    const costShareRatio = pc.currentProfitStage === 1
      ? pc.profitRatioStage1Partner
      : pc.currentProfitStage === 2
      ? (pc.isInvestmentRecovered ? pc.profitRatioStage2BPartner : pc.profitRatioStage2APartner)
      : pc.profitRatioStage3Partner;

    console.log(`${city.name}:`);
    console.log(`  费用分摊比例: ${costShareRatio}%`);
    console.log(`  expenseCoverage: ${JSON.stringify(pc.expenseCoverage, null, 2)}`);
    console.log();
  }

  console.log("========== 检查完成 ==========\n");
  process.exit(0);
}

checkExpenseCoverage().catch((error) => {
  console.error("❌ 脚本执行失败:", error);
  process.exit(1);
});
