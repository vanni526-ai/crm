import { formatDateBeijing, formatDateTimeBeijing, todayBeijing, getYearBeijing, getMonthBeijing } from './shared/timezone.ts';

console.log('=== 后端时间工具函数验证 ===');
console.log('当前时间（系统UTC）:', new Date().toISOString());
console.log('今天（北京）:', todayBeijing());
console.log('当前年份（北京）:', getYearBeijing());
console.log('当前月份（北京）:', getMonthBeijing());

const testDate = new Date('2026-02-07T03:00:00.000Z'); // UTC 2026-02-07 03:00 = 北京 2026-02-07 11:00
console.log('\n测试日期（UTC）:', testDate.toISOString());
console.log('格式化日期（北京）:', formatDateBeijing(testDate));
console.log('格式化日期时间（北京）:', formatDateTimeBeijing(testDate));

// 测试边界情况
const midnight = new Date('2026-02-06T16:00:00.000Z'); // UTC 2026-02-06 16:00 = 北京 2026-02-07 00:00
console.log('\n边界测试（UTC 2026-02-06 16:00）:');
console.log('格式化日期（北京）:', formatDateBeijing(midnight));
console.log('预期结果: 2026-02-07');
