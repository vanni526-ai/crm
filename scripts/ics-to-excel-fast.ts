import fs from 'fs';
import * as XLSX from 'xlsx';

interface CourseEvent {
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

// 快速解析ICS文件(不使用ical库,直接正则匹配)
function parseICSFast(filePath: string): CourseEvent[] {
  console.log('开始解析ICS文件:', filePath);
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split(/\r?\n/);
  
  const courses: CourseEvent[] = [];
  let currentEvent: any = {};
  let inEvent = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
      continue;
    }
    
    if (line === 'END:VEVENT') {
      if (inEvent && currentEvent.dtstart) {
        // 解析日期时间
        const start = parseDateTime(currentEvent.dtstart);
        const end = parseDateTime(currentEvent.dtend);
        
        // 解析SUMMARY (格式: "客户名 课程名")
        const summary = currentEvent.summary || '';
        const summaryParts = summary.split(/\s+/);
        const customerName = summaryParts[0] || '';
        const courseName = summaryParts.slice(1).join(' ') || '';
        
        // 解析LOCATION (格式: "城市 教室")
        const location = currentEvent.location || '';
        const locationParts = location.split(/\s+/);
        const city = locationParts[0] || '';
        const classroom = locationParts.slice(1).join(' ') || '';
        
        // 解析老师名
        let teacherName = '';
        if (currentEvent.organizer) {
          const cnMatch = currentEvent.organizer.match(/CN=([^;:]+)/);
          if (cnMatch) {
            teacherName = cnMatch[1];
          }
        }
        
        courses.push({
          序号: 0, // 稍后重新编号
          日期: start.date,
          星期: start.date ? getWeekday(start.date) : '',
          开始时间: start.time,
          结束时间: end.time,
          客户名: customerName,
          老师: teacherName,
          课程: courseName,
          地点: city,
          教室: classroom,
          备注: currentEvent.description || ''
        });
      }
      inEvent = false;
      continue;
    }
    
    if (!inEvent) continue;
    
    // 解析字段 - 支持TZID格式
    if (line.startsWith('DTSTART')) {
      // 提取时间部分 (DTSTART:20260113T140000 或 DTSTART;TZID=Asia/Shanghai:20250713T190000)
      const match = line.match(/:(\d{8}T\d{6})/);
      if (match) {
        currentEvent.dtstart = match[1];
      }
    } else if (line.startsWith('DTEND')) {
      const match = line.match(/:(\d{8}T\d{6})/);
      if (match) {
        currentEvent.dtend = match[1];
      }
    } else if (line.startsWith('SUMMARY:')) {
      currentEvent.summary = line.substring(8);
    } else if (line.startsWith('LOCATION:')) {
      currentEvent.location = line.substring(9);
    } else if (line.startsWith('ORGANIZER')) {
      currentEvent.organizer = line;
    } else if (line.startsWith('DESCRIPTION:')) {
      currentEvent.description = line.substring(12);
    }
  }
  
  // 按日期和时间排序
  courses.sort((a, b) => {
    const dateCompare = a.日期.localeCompare(b.日期);
    if (dateCompare !== 0) return dateCompare;
    return a.开始时间.localeCompare(b.开始时间);
  });
  
  // 重新编号
  courses.forEach((course, idx) => {
    course.序号 = idx + 1;
  });
  
  console.log(`解析完成,共 ${courses.length} 个课程事件`);
  return courses;
}

// 解析日期时间 (格式: 20260113T140000)
function parseDateTime(dt: string) {
  if (!dt || dt.length < 15) return { date: '', time: '' };
  const year = dt.substring(0, 4);
  const month = dt.substring(4, 6);
  const day = dt.substring(6, 8);
  const hour = dt.substring(9, 11);
  const minute = dt.substring(11, 13);
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`
  };
}

// 计算星期
function getWeekday(dateStr: string) {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const date = new Date(dateStr);
  return `星期${weekdays[date.getDay()]}`;
}

// 生成Excel文件
function generateExcel(courses: CourseEvent[], outputPath: string) {
  console.log('开始生成Excel文件...');
  
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 转换为工作表数据
  const ws = XLSX.utils.json_to_sheet(courses);
  
  // 设置列宽
  ws['!cols'] = [
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
  
  // 添加工作表
  XLSX.utils.book_append_sheet(wb, ws, '课程对账表');
  
  // 写入文件
  XLSX.writeFile(wb, outputPath);
  console.log(`Excel文件已生成: ${outputPath}`);
}

// 主函数
async function main() {
  const inputFile = process.argv[2] || '/home/ubuntu/upload/pasted_file_Po7505_20260113.ics';
  const outputFile = process.argv[3] || '/home/ubuntu/upload/课程对账表.xlsx';
  
  if (!fs.existsSync(inputFile)) {
    console.error('错误: ICS文件不存在:', inputFile);
    process.exit(1);
  }
  
  try {
    // 解析ICS文件
    const courses = parseICSFast(inputFile);
    
    if (courses.length === 0) {
      console.warn('\n警告: 未能解析出任何课程事件!');
      console.warn('请检查ICS文件格式是否正确。');
    }
    
    // 生成Excel文件
    generateExcel(courses, outputFile);
    
    console.log('\n转换完成!');
    console.log(`输入文件: ${inputFile}`);
    console.log(`输出文件: ${outputFile}`);
    console.log(`课程数量: ${courses.length}`);
  } catch (error) {
    console.error('转换失败:', error);
    process.exit(1);
  }
}

main();
