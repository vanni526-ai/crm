import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import ical from 'ical';

const icsFilePath = '/home/ubuntu/upload/20260113.ics';
const outputDir = '/home/ubuntu/upload/ics_chunks';
const EVENTS_PER_FILE = 200; // 每个文件200个事件

console.log('开始读取ICS文件...');
const icsContent = readFileSync(icsFilePath, 'utf-8');

console.log('开始解析ICS事件...');
const icsData = ical.parseICS(icsContent);
const events = Object.values(icsData).filter(event => event.type === 'VEVENT');
console.log(`共解析出 ${events.length} 个事件`);

// 创建输出目录
try {
  mkdirSync(outputDir, { recursive: true });
} catch (e) {
  // 目录已存在,忽略
}

// 分割事件
const totalFiles = Math.ceil(events.length / EVENTS_PER_FILE);
console.log(`\n将分割成 ${totalFiles} 个文件,每个文件约 ${EVENTS_PER_FILE} 个事件\n`);

for (let i = 0; i < events.length; i += EVENTS_PER_FILE) {
  const fileNum = Math.floor(i / EVENTS_PER_FILE) + 1;
  const chunk = events.slice(i, i + EVENTS_PER_FILE);
  
  // 构建新的ICS文件内容
  let icsFileContent = 'BEGIN:VCALENDAR\r\n';
  icsFileContent += 'VERSION:2.0\r\n';
  icsFileContent += 'PRODID:-//Course CRM//ICS Split//CN\r\n';
  icsFileContent += 'CALSCALE:GREGORIAN\r\n';
  
  for (const event of chunk) {
    icsFileContent += 'BEGIN:VEVENT\r\n';
    icsFileContent += `UID:${event.uid || `event-${Date.now()}-${Math.random()}`}\r\n`;
    
    if (event.summary) {
      icsFileContent += `SUMMARY:${event.summary}\r\n`;
    }
    
    if (event.description) {
      icsFileContent += `DESCRIPTION:${event.description}\r\n`;
    }
    
    if (event.location) {
      icsFileContent += `LOCATION:${event.location}\r\n`;
    }
    
    if (event.start) {
      const startStr = event.start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      icsFileContent += `DTSTART:${startStr}\r\n`;
    }
    
    if (event.end) {
      const endStr = event.end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      icsFileContent += `DTEND:${endStr}\r\n`;
    }
    
    if (event.organizer) {
      icsFileContent += `ORGANIZER:${event.organizer}\r\n`;
    }
    
    icsFileContent += 'END:VEVENT\r\n';
  }
  
  icsFileContent += 'END:VCALENDAR\r\n';
  
  // 写入文件
  const outputPath = join(outputDir, `chunk_${fileNum.toString().padStart(2, '0')}.ics`);
  writeFileSync(outputPath, icsFileContent, 'utf-8');
  
  console.log(`[${fileNum}/${totalFiles}] 已创建: ${outputPath} (${chunk.length} 个事件)`);
}

console.log(`\n分割完成!文件保存在: ${outputDir}`);
console.log(`\n您可以在导入页面逐个上传这些文件,每个文件约 ${EVENTS_PER_FILE} 个事件,不会超时。`);
