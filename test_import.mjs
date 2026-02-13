import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

// 读取Excel文件
const buffer = readFileSync('/home/ubuntu/upload/老师信息表.xlsx');
const workbook = XLSX.read(buffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Excel文件读取成功');
console.log('总行数:', data.length);
console.log('前3行数据:');
console.log(JSON.stringify(data.slice(0, 3), null, 2));

// 测试列名映射
const nameColumns = ['老师', '姓名', 'name', '教师姓名', '老师姓名'];
const cityColumns = ['城市', '地区', 'city', '所在城市'];

const firstRow = data[0];
console.log('\n第一行的所有列名:', Object.keys(firstRow));

const nameColumn = nameColumns.find(col => firstRow.hasOwnProperty(col));
const cityColumn = cityColumns.find(col => firstRow.hasOwnProperty(col));

console.log('\n检测到的姓名列:', nameColumn);
console.log('检测到的城市列:', cityColumn);

if (nameColumn && cityColumn) {
  console.log('\n✅ 列名映射成功!');
  console.log('示例数据:');
  data.slice(0, 3).forEach((row, idx) => {
    console.log(`  ${idx + 1}. ${row[nameColumn]} - ${row[cityColumn]}`);
  });
} else {
  console.log('\n❌ 列名映射失败');
  console.log('缺少列:', !nameColumn ? '姓名列' : '', !cityColumn ? '城市列' : '');
}
