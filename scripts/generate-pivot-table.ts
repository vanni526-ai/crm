import XLSX from 'xlsx';

interface CourseRecord {
  序号: number;
  日期: string;
  星期: string;
  开始时间: string;
  结束时间: string;
  客户名: string;
  老师: string;
  课程: string;
  地点: string;
  教室: string;
  备注: string;
}

// 读取Excel文件
function readExcel(filePath: string): CourseRecord[] {
  console.log('读取Excel文件:', filePath);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<CourseRecord>(worksheet);
  console.log(`读取完成,共 ${data.length} 条记录`);
  return data;
}

// 按城市统计
function statsByCity(data: CourseRecord[]) {
  const cityStats = new Map<string, number>();
  
  data.forEach(record => {
    const city = record.地点 || '未知';
    cityStats.set(city, (cityStats.get(city) || 0) + 1);
  });
  
  // 转换为数组并排序
  const result = Array.from(cityStats.entries())
    .map(([city, count]) => ({ 城市: city, 课程数量: count }))
    .sort((a, b) => b.课程数量 - a.课程数量);
  
  console.log(`城市统计: ${result.length} 个城市`);
  return result;
}

// 按老师统计
function statsByTeacher(data: CourseRecord[]) {
  const teacherStats = new Map<string, number>();
  
  data.forEach(record => {
    const teacher = record.老师 || '未知';
    teacherStats.set(teacher, (teacherStats.get(teacher) || 0) + 1);
  });
  
  // 转换为数组并排序
  const result = Array.from(teacherStats.entries())
    .map(([teacher, count]) => ({ 老师: teacher, 课程数量: count }))
    .sort((a, b) => b.课程数量 - a.课程数量);
  
  console.log(`老师统计: ${result.length} 位老师`);
  return result;
}

// 城市×老师交叉统计
function statsByCityAndTeacher(data: CourseRecord[]) {
  const crossStats = new Map<string, Map<string, number>>();
  const cities = new Set<string>();
  const teachers = new Set<string>();
  
  // 统计数据
  data.forEach(record => {
    const city = record.地点 || '未知';
    const teacher = record.老师 || '未知';
    
    cities.add(city);
    teachers.add(teacher);
    
    if (!crossStats.has(city)) {
      crossStats.set(city, new Map());
    }
    const cityMap = crossStats.get(city)!;
    cityMap.set(teacher, (cityMap.get(teacher) || 0) + 1);
  });
  
  // 转换为表格格式
  const sortedTeachers = Array.from(teachers).sort();
  const result: any[] = [];
  
  // 表头
  const header: any = { 城市: '城市' };
  sortedTeachers.forEach(teacher => {
    header[teacher] = teacher;
  });
  header['合计'] = '合计';
  result.push(header);
  
  // 数据行
  const sortedCities = Array.from(cities).sort();
  sortedCities.forEach(city => {
    const row: any = { 城市: city };
    let total = 0;
    
    sortedTeachers.forEach(teacher => {
      const count = crossStats.get(city)?.get(teacher) || 0;
      row[teacher] = count || '';
      total += count;
    });
    
    row['合计'] = total;
    result.push(row);
  });
  
  // 合计行
  const totalRow: any = { 城市: '合计' };
  let grandTotal = 0;
  sortedTeachers.forEach(teacher => {
    let teacherTotal = 0;
    sortedCities.forEach(city => {
      teacherTotal += crossStats.get(city)?.get(teacher) || 0;
    });
    totalRow[teacher] = teacherTotal;
    grandTotal += teacherTotal;
  });
  totalRow['合计'] = grandTotal;
  result.push(totalRow);
  
  console.log(`交叉统计: ${cities.size} 个城市 × ${teachers.size} 位老师`);
  return result;
}

// 按月份统计
function statsByMonth(data: CourseRecord[]) {
  const monthStats = new Map<string, number>();
  
  data.forEach(record => {
    if (record.日期) {
      const month = record.日期.substring(0, 7); // YYYY-MM
      monthStats.set(month, (monthStats.get(month) || 0) + 1);
    }
  });
  
  // 转换为数组并排序
  const result = Array.from(monthStats.entries())
    .map(([month, count]) => ({ 月份: month, 课程数量: count }))
    .sort((a, b) => a.月份.localeCompare(b.月份));
  
  console.log(`月份统计: ${result.length} 个月`);
  return result;
}

// 生成数据透视表Excel
function generatePivotTableExcel(
  inputFile: string,
  outputFile: string
) {
  console.log('\n开始生成数据透视表...');
  
  // 读取原始数据
  const data = readExcel(inputFile);
  
  // 生成各种统计
  const cityStats = statsByCity(data);
  const teacherStats = statsByTeacher(data);
  const crossStats = statsByCityAndTeacher(data);
  const monthStats = statsByMonth(data);
  
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 1. 按城市统计
  const ws1 = XLSX.utils.json_to_sheet(cityStats);
  ws1['!cols'] = [{ wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws1, '按城市统计');
  
  // 2. 按老师统计
  const ws2 = XLSX.utils.json_to_sheet(teacherStats);
  ws2['!cols'] = [{ wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, '按老师统计');
  
  // 3. 城市×老师交叉统计
  const ws3 = XLSX.utils.json_to_sheet(crossStats, { skipHeader: true });
  // 动态设置列宽
  const colCount = Object.keys(crossStats[0]).length;
  ws3['!cols'] = Array(colCount).fill({ wch: 12 });
  ws3['!cols'][0] = { wch: 15 }; // 城市列宽一点
  XLSX.utils.book_append_sheet(wb, ws3, '城市×老师交叉统计');
  
  // 4. 按月份统计
  const ws4 = XLSX.utils.json_to_sheet(monthStats);
  ws4['!cols'] = [{ wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws4, '按月份统计');
  
  // 5. 原始数据
  const ws5 = XLSX.utils.json_to_sheet(data);
  ws5['!cols'] = [
    { wch: 6 },  // 序号
    { wch: 12 }, // 日期
    { wch: 8 },  // 星期
    { wch: 10 }, // 开始时间
    { wch: 10 }, // 结束时间
    { wch: 15 }, // 客户名
    { wch: 12 }, // 老师
    { wch: 20 }, // 课程
    { wch: 10 }, // 地点
    { wch: 12 }, // 教室
    { wch: 30 }  // 备注
  ];
  XLSX.utils.book_append_sheet(wb, ws5, '原始数据');
  
  // 写入文件
  XLSX.writeFile(wb, outputFile);
  console.log(`\n数据透视表已生成: ${outputFile}`);
  
  // 输出统计摘要
  console.log('\n📊 统计摘要:');
  console.log(`总课程数: ${data.length}`);
  console.log(`城市数量: ${cityStats.length}`);
  console.log(`老师数量: ${teacherStats.length}`);
  console.log(`月份跨度: ${monthStats.length} 个月`);
  
  console.log('\n🏆 Top 5 城市:');
  cityStats.slice(0, 5).forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.城市}: ${item.课程数量} 节课`);
  });
  
  console.log('\n🏆 Top 5 老师:');
  teacherStats.slice(0, 5).forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.老师}: ${item.课程数量} 节课`);
  });
}

// 主函数
async function main() {
  const inputFile = process.argv[2] || '/home/ubuntu/upload/课程对账表.xlsx';
  const outputFile = process.argv[3] || '/home/ubuntu/upload/课程数据透视表.xlsx';
  
  try {
    generatePivotTableExcel(inputFile, outputFile);
    console.log('\n✅ 转换完成!');
  } catch (error) {
    console.error('❌ 转换失败:', error);
    process.exit(1);
  }
}

main();
