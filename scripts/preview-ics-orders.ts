import { readFileSync } from 'fs';
import ical from 'ical';
import { parseICSOrderContent } from '../server/icsOrderParser';

const icsFilePath = '/home/ubuntu/upload/20260113.ics';

console.log('开始读取ICS文件...');
const icsContent = readFileSync(icsFilePath, 'utf-8');

console.log('开始解析ICS事件...');
const icsData = ical.parseICS(icsContent);
const allEvents = Object.values(icsData).filter((event: any) => event.type === 'VEVENT');
console.log(`共解析出 ${allEvents.length} 个事件`);

// 只取前10个事件进行预览
const events = allEvents.slice(0, 10);
console.log(`\n预览前 ${events.length} 个事件...\n`);

// 从原始ICS内容中提取DTSTART和DTEND
const extractDateTime = (summary: string, icsContent: string) => {
  const summaryEscaped = summary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const eventMatch = icsContent.match(new RegExp(`DTSTART[^\\n]*\\n[\\s\\S]*?SUMMARY:${summaryEscaped}`, 'm'));
  
  if (eventMatch) {
    const eventBlock = eventMatch[0];
    const dtstartMatch = eventBlock.match(/DTSTART(?:;TZID=[^:]+)?:(\d{8}T\d{6})/);
    const dtendMatch = eventBlock.match(/DTEND(?:;TZID=[^:]+)?:(\d{8}T\d{6})/);
    
    if (dtstartMatch && dtendMatch) {
      const parseICSDate = (dateStr: string) => {
        // 20250713T190000 -> 2025-07-13 19:00:00
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = dateStr.substring(9, 11);
        const minute = dateStr.substring(11, 13);
        return { year, month, day, hour, minute };
      };
      
      const start = parseICSDate(dtstartMatch[1]);
      const end = parseICSDate(dtendMatch[1]);
      
      return {
        classDate: `${start.year}-${start.month}-${start.day}`,
        classTime: `${start.hour}:${start.minute}-${end.hour}:${end.minute}`
      };
    }
  }
  
  return null;
};

console.log('事件内容示例:');
events.forEach((event: any, index) => {
  const dateTime = extractDateTime(event.summary, icsContent);
  console.log(`\n事件 ${index + 1}:`);
  console.log(`  SUMMARY: ${event.summary || 'N/A'}`);
  console.log(`  LOCATION: ${event.location || 'N/A'}`);
  if (dateTime) {
    console.log(`  上课日期(北京时间): ${dateTime.classDate}`);
    console.log(`  上课时间(北京时间): ${dateTime.classTime}`);
  } else {
    console.log(`  START: ${event.start || 'N/A'}`);
    console.log(`  END: ${event.end || 'N/A'}`);
  }
});

// 转换为parseICSOrderContent需要的格式
const formattedEvents = events.map((event: any) => ({
  summary: event.summary || '',
  description: event.description || '',
  location: event.location || '',
  startTime: event.start,
  endTime: event.end,
  organizer: event.organizer?.val || '',
  attendees: event.attendee ? (Array.isArray(event.attendee) ? event.attendee.map((a: any) => a.val || '') : [event.attendee.val || '']) : []
}));

console.log('\n\n开始使用LLM解析订单信息...');
parseICSOrderContent(formattedEvents).then(parsedOrders => {
  console.log(`\n成功解析出 ${parsedOrders.length} 个订单\n`);

  parsedOrders.forEach((order, index) => {
    console.log(`\n订单 ${index + 1}:`);
    console.log(`  客户名: ${order.customerName || '未识别'}`);
    console.log(`  课程: ${order.course || '未识别'}`);
    console.log(`  老师: ${order.teacher || '未识别'}`);
    console.log(`  城市: ${order.city || '未识别'}`);
    console.log(`  课程金额: ${order.courseAmount || 0}`);
    console.log(`  老师费用: ${order.teacherFee || 0}`);
    console.log(`  上课日期: ${order.classDate || '未识别'}`);
    console.log(`  上课时间: ${order.classTime || '未识别'}`);
    console.log(`  备注: ${order.notes || '无'}`);
  });

  console.log('\n\n预览完成!如果数据正确,可以继续批量导入所有订单。');
  process.exit(0);
}).catch(error => {
  console.error('解析失败:', error);
  process.exit(1);
});
