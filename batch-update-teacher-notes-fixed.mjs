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
        data.append({'userId': row[0], 'userName': row[1], 'notes': row[6] or ''})
print(json.dumps(data))
`;
  
  const excelData = JSON.parse(execSync(`python3.11 -c "${pythonScript.replace(/"/g, '\\"')}"`, { encoding: 'utf-8' }));
  
  // 连接数据库
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('开始批量更新老师备注...\n');
  
  let successCount = 0;
  let notFoundCount = 0;
  let noChangeCount = 0;
  const notFoundIds = [];
  const noChangeIds = [];
  
  // 遍历Excel数据
  for (const { userId, userName, notes } of excelData) {
    
    try {
      // 使用userId更新teachers表的notes字段
      const [result] = await connection.query(
        'UPDATE teachers SET notes = ?, updatedAt = NOW() WHERE userId = ?',
        [notes || '', userId]
      );
      
      if (result.affectedRows > 0) {
        successCount++;
        console.log(`✅ 成功更新: ${userName} (ID: ${userId}), 备注: ${notes || '(空)'}`);
      } else {
        // 检查是否是因为notes值相同而没有更新
        const [existing] = await connection.query(
          'SELECT notes FROM teachers WHERE userId = ?',
          [userId]
        );
        
        if (existing.length > 0) {
          noChangeCount++;
          noChangeIds.push({ id: userId, name: userName });
          console.log(`⚠️  未更新（记录存在但值相同）: ${userName} (ID: ${userId})`);
        } else {
          notFoundCount++;
          notFoundIds.push({ id: userId, name: userName });
          console.log(`❌ 未找到teacher记录: ${userName} (ID: ${userId})`);
        }
      }
    } catch (error) {
      console.error(`❌ 更新失败: ${userName} (ID: ${userId})`, error.message);
    }
  }
  
  await connection.end();
  
  console.log('\n=== 批量更新完成 ===');
  console.log(`✅ 成功更新: ${successCount} 条`);
  console.log(`⚠️  未更新（值相同）: ${noChangeCount} 条`);
  console.log(`❌ 未找到记录: ${notFoundCount} 条`);
  
  if (notFoundIds.length > 0) {
    console.log('\n未找到teacher记录的用户ID:');
    notFoundIds.forEach(({ id, name }) => {
      console.log(`  - ${name} (ID: ${id})`);
    });
  }
  
  if (noChangeIds.length > 0) {
    console.log('\n未更新（值相同）的用户ID:');
    noChangeIds.forEach(({ id, name }) => {
      console.log(`  - ${name} (ID: ${id})`);
    });
  }
}

main().catch(console.error);
