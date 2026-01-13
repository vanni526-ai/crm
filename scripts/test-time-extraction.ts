import { readFileSync } from 'fs';
import { parseICS } from '../server/fileParser';

const icsFilePath = '/home/ubuntu/upload/20260113.ics';

console.log('开始读取ICS文件...');
const icsContent = readFileSync(icsFilePath);

console.log('开始解析ICS事件...');
parseICS(icsContent).then(events => {
  console.log(`共解析出 ${events.length} 个事件\n`);
  
  // 只显示前10个事件的时间信息
  events.slice(0, 10).forEach((event, index) => {
    console.log(`事件 ${index + 1}:`);
    console.log(`  SUMMARY: ${event.summary}`);
    console.log(`  上课日期: ${event.startTime.getFullYear()}-${String(event.startTime.getMonth() + 1).padStart(2, '0')}-${String(event.startTime.getDate()).padStart(2, '0')}`);
    console.log(`  上课时间: ${String(event.startTime.getHours()).padStart(2, '0')}:${String(event.startTime.getMinutes()).padStart(2, '0')}-${String(event.endTime.getHours()).padStart(2, '0')}:${String(event.endTime.getMinutes()).padStart(2, '0')}`);
    console.log('');
  });
  
  process.exit(0);
}).catch(error => {
  console.error('解析失败:', error);
  process.exit(1);
});
