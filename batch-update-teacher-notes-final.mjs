import { execSync } from 'child_process';
import mysql from 'mysql2/promise';

/**
 * 批量更新老师备注脚本（最终版）
 * 
 * 功能：
 * 1. 读取Excel文件中的老师数据（用户ID + 老师备注）
 * 2. 根据用户ID查找teachers表中的记录
 * 3. 使用UPDATE更新notes字段（不创建新记录）
 * 4. 统计更新成功/失败的记录数
 */

async function batchUpdateTeacherNotes() {
  console.log('=== 开始批量更新老师备注 ===\n');

  // 1. 使用Python读取Excel文件
  const excelData = execSync(`python3.11 -c "
import openpyxl
import json

wb = openpyxl.load_workbook('/home/ubuntu/upload/老师数据导出_2026-02-25T06-03-21.xlsx')
ws = wb.active

# 读取所有老师数据（跳过表头）
teachers_data = []
for i in range(2, ws.max_row + 1):
    user_id = ws.cell(i, 1).value  # 第1列：用户ID
    notes = ws.cell(i, 9).value     # 第9列：老师备注
    
    if user_id:  # 确保用户ID存在
        teachers_data.append({
            'userId': int(user_id),
            'notes': notes if notes else ''
        })

print(json.dumps(teachers_data, ensure_ascii=False))
"`, { encoding: 'utf-8' });

  const teachersData = JSON.parse(excelData.trim());
  console.log(`从Excel读取到 ${teachersData.length} 条老师数据\n`);

  // 2. 连接数据库
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // 3. 批量更新teachers表
  let successCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  for (const teacher of teachersData) {
    try {
      // 检查teachers表是否存在该userId的记录
      const [existingTeacher] = await connection.execute(
        'SELECT id FROM teachers WHERE userId = ? LIMIT 1',
        [teacher.userId]
      );

      if (existingTeacher.length === 0) {
        console.log(`⚠️  用户ID ${teacher.userId} 在teachers表不存在，跳过`);
        notFoundCount++;
        continue;
      }

      // 更新notes字段
      await connection.execute(
        'UPDATE teachers SET notes = ?, updatedAt = NOW() WHERE userId = ?',
        [teacher.notes, teacher.userId]
      );

      console.log(`✅ 更新成功: 用户ID ${teacher.userId}, 备注: ${teacher.notes.substring(0, 30)}...`);
      successCount++;
    } catch (error) {
      console.error(`❌ 更新失败: 用户ID ${teacher.userId}, 错误: ${error.message}`);
      errorCount++;
    }
  }

  // 4. 关闭数据库连接
  await connection.end();

  // 5. 输出统计结果
  console.log('\n=== 批量更新完成 ===');
  console.log(`总记录数: ${teachersData.length}`);
  console.log(`✅ 更新成功: ${successCount}`);
  console.log(`⚠️  记录不存在: ${notFoundCount}`);
  console.log(`❌ 更新失败: ${errorCount}`);
  console.log(`成功率: ${((successCount / teachersData.length) * 100).toFixed(2)}%`);
}

// 执行批量更新
batchUpdateTeacherNotes()
  .then(() => {
    console.log('\n脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n脚本执行失败:', error);
    process.exit(1);
  });
