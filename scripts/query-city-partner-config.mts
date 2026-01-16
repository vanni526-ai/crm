import { getDb } from "../server/db";
import { cityPartnerConfig } from "../drizzle/schema";
import { asc } from "drizzle-orm";

const db = await getDb();

const configs = await db
  .select()
  .from(cityPartnerConfig)
  .orderBy(asc(cityPartnerConfig.city));

console.log("城市合伙人费配置:");
console.log(JSON.stringify(configs, null, 2));

console.log("\n配置的城市列表:");
configs.forEach(config => {
  console.log(`- ${config.city}: ${Number(config.partnerFeeRate) * 100}% (${config.isActive ? '启用' : '禁用'})`);
});

process.exit(0);
