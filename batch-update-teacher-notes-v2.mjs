import mysql from 'mysql2/promise';
import { execSync } from 'child_process';

async function main() {
  // 使用Python读取Excel文件
  const excelPath = '/home/ubuntu/upload/老师数据导出_2026-02-25T06-03-21.xlsx';
  const pythonScript = `
import openpyxl
import json
wb = openpyxl.load_workbook('${excelPath}')
ws = wb.active
data = []
for row in ws.iter_rows(min_row=2, values_only=True):
    if row[0]:
        data.append({'userId': row[0], 'userName': row[1], 'notes': row[8] or ''})
print(json.dumps(data))
`;
  
  console.log('正在读取Excel文件...');
  const excelData = JSON.parse(execSync(`python3.11 -c "${pythonScript.replace(/"/g, '\\"')}"`, { encoding: 'utf-8' }));
  console.log(`读取到 ${excelData.length} 条记录\n`);
  
  // 连接数据库
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('开始批量更新老师备注...\n');
  
  let teachersTableSuccess = 0;
  let usersTableSuccess = 0;
  let notFoundCount = 0;
  const notFoundIds = [];
  
  // 遍历Excel数据
  for (const { userId, userName, notes } of excelData) {
    try {
      // 1. 尝试更新teachers表
      const [teacherResult] = await connection.query(
        'UPDATE teachers SET notes = ?, updatedAt = NOW() WHERE userId = ?',
        [notes || '', userId]
      );
      
      if (teacherResult.affectedRows > 0) {
        teachersTableSuccess++;
        console.log(`✅ [teachers表] 成功更新: ${userName} (ID: ${userId}), 备注: ${notes || '(空)'}`);
      } else {
        // 2. teachers表没有记录，尝试更新users表的teacherNotes字段
        const [userResult] = await connection.query(
          'UPDATE users SET teacherNotes = ? WHERE id = ? AND roles LIKE ?',
          [notes || '', userId, '%teacher%']
        );
        
        if (userResult.affectedRows > 0) {
          usersTableSuccess++;
          console.log(`✅ [users表] 成功更新: ${userName} (ID: ${userId}), 备注: ${notes || '(空)'} [多角色用户]`);
        } else {
          notFoundCount++;
          notFoundIds.push({ id: userId, name: userName });
          console.log(`❌ 未找到记录: ${userName} (ID: ${userId}) [既不在teachers表也不在users.roles中]`);
        }
      }
    } catch (error) {
      console.error(`❌ 更新失败: ${userName} (ID: ${userId})`, error.message);
    }
  }
  
  await connection.end();
  
  console.log('\n=== 批量更新完成 ===');
  console.log(`✅ teachers表更新成功: ${teachersTableSuccess} 条`);
  console.log(`✅ users表更新成功: ${usersTableSuccess} 条（多角色用户）`);
  console.log(`❌ 未找到记录: ${notFoundCount} 条`);
  console.log(`📊 总计成功: ${teachersTableSuccess + usersTableSuccess} / ${excelData.length}`);
  
  if (notFoundIds.length > 0) {
    console.log('\n未找到记录的用户ID:');
    notFoundIds.forEach(({ id, name }) => {
      console.log(`  - ${name} (ID: ${id})`);
    });
  }
}

main().catch(console.error);
