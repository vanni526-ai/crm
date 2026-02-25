/**
 * 导出所有城市数据到Excel
 */

import { getDb } from "./db";
import { cities, classrooms } from "../drizzle/schema";
import * as XLSX from 'xlsx';
import * as path from 'path';
import { eq } from "drizzle-orm";

async function exportAllCities() {
  console.log("开始导出城市数据...\n");
  
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection failed');
  }
  
  // 查询所有城市数据
  console.log("正在查询城市数据...");
  const allCities = await db.select().from(cities);
  
  console.log(`查询到 ${allCities.length} 条城市记录\n`);
  
  // 为每个城市查询关联的教室数据
  const citiesWithClassrooms = await Promise.all(
    allCities.map(async (city) => {
      const cityClassrooms = await db
        .select()
        .from(classrooms)
        .where(eq(classrooms.cityId, city.id));
      
      return {
        city,
        classrooms: cityClassrooms
      };
    })
  );
  
  // 转换数据格式为Excel友好格式
  const excelData = citiesWithClassrooms.map(({ city, classrooms: cityClassrooms }) => ({
    '城市ID': city.id,
    '城市名称': city.name,
    '电话区号': city.areaCode,
    '教室数量': cityClassrooms.length,
    '教室列表': cityClassrooms.map(c => c.name).join(', '),
    '教室地址列表': cityClassrooms.map(c => c.address || '').join(' | '),
    '是否启用': city.isActive ? '是' : '否',
    '创建时间': city.createdAt,
    '更新时间': city.updatedAt
  }));
  
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // 设置列宽
  const colWidths = [
    { wch: 10 },  // 城市ID
    { wch: 15 },  // 城市名称
    { wch: 15 },  // 合伙人费率
    { wch: 12 },  // 教室数量
    { wch: 50 },  // 教室列表
    { wch: 80 },  // 教室地址列表
    { wch: 10 },  // 是否启用
    { wch: 20 },  // 创建时间
    { wch: 20 }   // 更新时间
  ];
  ws['!cols'] = colWidths;
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, "城市数据");
  
  // 如果需要，也可以创建一个单独的教室详情表
  const classroomData: any[] = [];
  citiesWithClassrooms.forEach(({ city, classrooms: cityClassrooms }) => {
    cityClassrooms.forEach(classroom => {
      classroomData.push({
        '教室ID': classroom.id,
        '所属城市': city.name,
        '教室名称': classroom.name,
        '教室地址': classroom.address,
        '是否启用': classroom.isActive ? '是' : '否',
        '创建时间': classroom.createdAt,
        '更新时间': classroom.updatedAt
      });
    });
  });
  
  if (classroomData.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(classroomData);
    const colWidths2 = [
      { wch: 10 },  // 教室ID
      { wch: 15 },  // 所属城市
      { wch: 30 },  // 教室名称
      { wch: 60 },  // 教室地址
      { wch: 10 },  // 是否启用
      { wch: 20 },  // 创建时间
      { wch: 20 }   // 更新时间
    ];
    ws2['!cols'] = colWidths2;
    XLSX.utils.book_append_sheet(wb, ws2, "教室详情");
  }
  
  // 生成文件名（包含时间戳）
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `城市数据导出_${timestamp}.xlsx`;
  const filepath = path.join('/home/ubuntu', filename);
  
  // 写入文件
  XLSX.writeFile(wb, filepath);
  
  console.log(`✅ 导出成功！`);
  console.log(`文件路径: ${filepath}`);
  console.log(`城市记录数: ${allCities.length} 条`);
  console.log(`教室记录数: ${classroomData.length} 条\n`);
  
  return filepath;
}

// 执行导出
exportAllCities()
  .then(filepath => {
    console.log("导出完成！");
    process.exit(0);
  })
  .catch(error => {
    console.error("导出失败:", error);
    process.exit(1);
  });
