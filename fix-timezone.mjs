/**
 * 此脚本用于辅助分析需要修改的时间相关代码
 * 实际修改通过file edit工具完成
 */
import fs from 'fs';

const dbContent = fs.readFileSync('./server/db.ts', 'utf-8');

// 查找所有 toISOString().split('T')[0] 的使用
const isoPattern = /\.toISOString\(\)\.split\('T'\)\[0\]/g;
let match;
let count = 0;
while ((match = isoPattern.exec(dbContent)) !== null) {
  const lineNum = dbContent.substring(0, match.index).split('\n').length;
  const line = dbContent.split('\n')[lineNum - 1].trim();
  console.log(`Line ${lineNum}: ${line}`);
  count++;
}
console.log(`\nTotal toISOString().split('T')[0] occurrences: ${count}`);

// 查找所有 new Date() 用于获取当前时间的地方
const newDatePattern = /new Date\(\)/g;
let count2 = 0;
while ((match = newDatePattern.exec(dbContent)) !== null) {
  const lineNum = dbContent.substring(0, match.index).split('\n').length;
  const line = dbContent.split('\n')[lineNum - 1].trim();
  console.log(`Line ${lineNum}: ${line}`);
  count2++;
}
console.log(`\nTotal new Date() occurrences: ${count2}`);
