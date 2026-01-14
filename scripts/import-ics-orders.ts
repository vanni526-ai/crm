import { readFileSync } from 'fs';
import ical from 'ical';
import { parseICSOrderContent } from '../server/icsOrderParser';
import * as dbModule from '../server/db';
import { orders } from '../drizzle/schema';

const db = dbModule.db;

const icsFilePath = '/home/ubuntu/upload/20260113.ics';
const BATCH_SIZE = 100; // 每批处理100个事件

console.log('开始读取ICS文件...');
const icsContent = readFileSync(icsFilePath, 'utf-8');

console.log('开始解析ICS事件...');
const icsData = ical.parseICS(icsContent);
const events = Object.values(icsData).filter(event => event.type === 'VEVENT');
console.log(`共解析出 ${events.length} 个事件`);

// 将ical事件转换为parseICSOrderContent需要的格式
const formattedEvents = events.map((event: any) => ({
  summary: event.summary || '',
  description: event.description || '',
  location: event.location || '',
  startTime: event.start,
  endTime: event.end,
  organizer: event.organizer || '',
  attendees: event.attendee ? (Array.isArray(event.attendee) ? event.attendee : [event.attendee]) : []
}));

// 分批处理
let totalParsedOrders = 0;
let successCount = 0;
let errorCount = 0;
const allParsedOrders: any[] = [];

const totalBatches = Math.ceil(formattedEvents.length / BATCH_SIZE);
console.log(`\n将分 ${totalBatches} 批处理,每批 ${BATCH_SIZE} 个事件\n`);

for (let i = 0; i < formattedEvents.length; i += BATCH_SIZE) {
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;
  const batch = formattedEvents.slice(i, i + BATCH_SIZE);
  
  console.log(`[批次 ${batchNum}/${totalBatches}] 正在处理第 ${i + 1}-${Math.min(i + BATCH_SIZE, formattedEvents.length)} 个事件...`);
  
  try {
    const parsedOrders = await parseICSOrderContent(batch);
    console.log(`[批次 ${batchNum}/${totalBatches}] 成功解析出 ${parsedOrders.length} 个订单`);
    
    totalParsedOrders += parsedOrders.length;
    allParsedOrders.push(...parsedOrders);
    
    // 立即导入这批订单到数据库
    for (const order of parsedOrders) {
      try {
        await db.insert(orders).values(order);
        successCount++;
      } catch (error: any) {
        errorCount++;
        console.error(`  导入订单失败: ${error.message}`);
      }
    }
    
    console.log(`[批次 ${batchNum}/${totalBatches}] 已导入 ${successCount} 个订单 (失败 ${errorCount} 个)\n`);
    
    // 每批之间暂停1秒,避免请求过快
    if (i + BATCH_SIZE < formattedEvents.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error: any) {
    console.error(`[批次 ${batchNum}/${totalBatches}] 解析失败: ${error.message}`);
    console.log(`跳过这批事件,继续处理下一批...\n`);
  }
}

console.log('\n=== 导入完成 ===');
console.log(`共解析事件: ${formattedEvents.length} 个`);
console.log(`识别订单: ${totalParsedOrders} 个`);
console.log(`成功导入: ${successCount} 个订单`);
console.log(`失败: ${errorCount} 个订单`);
