import { updateAllSalespersonStats } from './server/db.ts';

console.log('开始更新所有销售人员的统计数据...');
const results = await updateAllSalespersonStats();
console.log('\n更新完成，结果：');
results.forEach(r => {
  console.log(`  ${r.name}(${r.nickname || '-'}): ${r.orderCount}单, ¥${r.totalAmount}`);
});
process.exit(0);
