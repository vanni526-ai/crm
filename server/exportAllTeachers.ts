/**
 * 导出所有老师数据到Excel
 */

import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { like } from "drizzle-orm";
import * as XLSX from 'xlsx';
import * as path from 'path';

async function exportAllTeachers() {
  console.log("开始导出老师数据...\n");
  
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection failed');
  }
  
  // 查询所有老师数据（roles包含'teacher'）
  console.log("正在查询老师数据...");
  const allTeachers = await db
    .select()
    .from(users)
    .where(like(users.roles, '%teacher%'));
  
  console.log(`查询到 ${allTeachers.length} 条老师记录\n`);
  
  // 转换数据格式为Excel友好格式
  const excelData = allTeachers.map(teacher => ({
    '用户ID': teacher.id,
    '姓名': teacher.name,
    '花名': teacher.nickname,
    '邮箱': teacher.email,
    '手机号': teacher.phone,
    '角色': teacher.roles,
    '老师属性': teacher.teacherAttribute,
    '老师状态': teacher.teacherStatus,
    '老师备注': teacher.teacherNotes,
    '分类': teacher.category,
    '小时费率': teacher.hourlyRate,
    '银行账户': teacher.bankAccount,
    '银行名称': teacher.bankName,
    '别名': teacher.aliases,
    '合同结束日期': teacher.contractEndDate,
    '入职日期': teacher.joinDate,
    '是否活跃': teacher.isActive ? '是' : '否',
    '微信': teacher.wechat,
    '头像URL': teacher.avatarUrl,
    '创建时间': teacher.createdAt,
    '更新时间': teacher.updatedAt,
    '最后登录时间': teacher.lastSignedIn
  }));
  
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // 设置列宽
  const colWidths = [
    { wch: 10 },  // 用户ID
    { wch: 15 },  // 姓名
    { wch: 15 },  // 花名
    { wch: 30 },  // 邮箱
    { wch: 15 },  // 手机号
    { wch: 30 },  // 角色
    { wch: 12 },  // 老师属性
    { wch: 12 },  // 老师状态
    { wch: 40 },  // 老师备注
    { wch: 15 },  // 分类
    { wch: 12 },  // 城市
    { wch: 12 },  // 小时费率
    { wch: 20 },  // 银行账户
    { wch: 15 },  // 银行名称
    { wch: 20 },  // 别名
    { wch: 15 },  // 合同结束日期
    { wch: 15 },  // 入职日期
    { wch: 10 },  // 是否活跃
    { wch: 15 },  // 微信
    { wch: 40 },  // 头像URL
    { wch: 20 },  // 创建时间
    { wch: 20 },  // 更新时间
    { wch: 20 }   // 最后登录时间
  ];
  ws['!cols'] = colWidths;
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, "老师数据");
  
  // 生成文件名（包含时间戳）
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `老师数据导出_${timestamp}.xlsx`;
  const filepath = path.join('/home/ubuntu', filename);
  
  // 写入文件
  XLSX.writeFile(wb, filepath);
  
  console.log(`✅ 导出成功！`);
  console.log(`文件路径: ${filepath}`);
  console.log(`总记录数: ${allTeachers.length} 条\n`);
  
  return filepath;
}

// 执行导出
exportAllTeachers()
  .then(filepath => {
    console.log("导出完成！");
    process.exit(0);
  })
  .catch(error => {
    console.error("导出失败:", error);
    process.exit(1);
  });
