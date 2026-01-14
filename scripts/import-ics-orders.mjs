import { readFileSync } from 'fs';
import ical from 'ical';
import { parseICSToOrders } from '../server/icsOrderParser.ts';
import { db } from '../server/db.ts';
import { orders } from '../drizzle/schema.ts';

const icsFilePath = '/home/ubuntu/upload/20260113.ics';

console.log('开始读取ICS文件...');
const icsContent = readFileSync(icsFilePath, 'utf-8');

console.log('开始解析ICS事件...');
const icsData = ical.parseICS(icsContent);
const events = Object.values(icsData).filter(event => event.type === 'VEVENT');
console.log(`共解析出 ${events.length} 个事件`);

console.log('开始使用LLM解析订单信息...');
const parsedOrders = await parseICSToOrders(events);
console.log(`成功解析出 ${parsedOrders.length} 个订单`);

if (parsedOrders.length === 0) {
  console.log('未能识别出订单信息,请检查ICS文件格式');
  process.exit(0);
}

console.log('开始批量导入订单到数据库...');
let successCount = 0;
let errorCount = 0;

for (const order of parsedOrders) {
  try {
    await db.insert(orders).values(order);
    successCount++;
    if (successCount % 100 === 0) {
      console.log(`已导入 ${successCount} 个订单...`);
    }
  } catch (error) {
    errorCount++;
    console.error(`导入订单失败:`, error.message);
  }
}

console.log(`\n导入完成!`);
console.log(`成功: ${successCount} 个订单`);
console.log(`失败: ${errorCount} 个订单`);
