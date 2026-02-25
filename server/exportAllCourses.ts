/**
 * 导出所有课程数据到Excel
 */

import { getDb } from "./db";
import { courses } from "../drizzle/schema";
import * as XLSX from 'xlsx';
import * as path from 'path';

async function exportAllCourses() {
  console.log("开始导出课程数据...\n");
  
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection failed');
  }
  
  // 查询所有课程数据
  console.log("正在查询课程数据...");
  const allCourses = await db.select().from(courses);
  
  console.log(`查询到 ${allCourses.length} 条课程记录\n`);
  
  // 转换数据格式为Excel友好格式
  const excelData = allCourses.map(course => ({
    '课程ID': course.id,
    '课程名称': course.name,
    '课程简介': course.introduction,
    '课程描述': course.description,
    '课程时长': course.duration,
    '课程价格': course.price,
    '课程级别': course.level,
    '是否启用': course.isActive ? '是' : '否',
    '创建时间': course.createdAt,
    '更新时间': course.updatedAt
  }));
  
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // 设置列宽
  const colWidths = [
    { wch: 10 },  // 课程ID
    { wch: 30 },  // 课程名称
    { wch: 50 },  // 课程描述
    { wch: 15 },  // 课程时长
    { wch: 12 },  // 课程价格
    { wch: 15 },  // 课程分类
    { wch: 30 },  // 课程标签
    { wch: 10 },  // 是否启用
    { wch: 12 },  // 排序顺序
    { wch: 20 },  // 创建时间
    { wch: 20 }   // 更新时间
  ];
  ws['!cols'] = colWidths;
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, "课程数据");
  
  // 生成文件名（包含时间戳）
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `课程数据导出_${timestamp}.xlsx`;
  const filepath = path.join('/home/ubuntu', filename);
  
  // 写入文件
  XLSX.writeFile(wb, filepath);
  
  console.log(`✅ 导出成功！`);
  console.log(`文件路径: ${filepath}`);
  console.log(`总记录数: ${allCourses.length} 条\n`);
  
  return filepath;
}

// 执行导出
exportAllCourses()
  .then(filepath => {
    console.log("导出完成！");
    process.exit(0);
  })
  .catch(error => {
    console.error("导出失败:", error);
    process.exit(1);
  });
