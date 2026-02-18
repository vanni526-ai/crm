/**
 * 数据清理脚本：标记teachers表中的重复记录为isActive=false
 * 
 * 策略：
 * 1. 对于每个重复的名字，保留ID最小的一条记录（最早创建的）
 * 2. 其他重复记录标记为isActive=false
 * 3. 对于users表中不存在的老师（如橘子），全部标记为isActive=false
 */

import mysql from 'mysql2/promise';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('🧹 开始清理teachers表中的重复数据');
    console.log('');
    
    // 1. 获取users表中的所有老师名字
    const [users] = await connection.query(`
      SELECT DISTINCT name
      FROM users
      WHERE roles LIKE '%teacher%'
    `);
    
    const validTeacherNames = new Set(users.map(u => u.name));
    console.log(`✅ users表中有 ${validTeacherNames.size} 位老师`);
    console.log('');
    
    // 2. 获取teachers表的所有记录
    const [teachers] = await connection.query(`
      SELECT id, name, isActive
      FROM teachers
      ORDER BY name, id
    `);
    
    console.log(`📊 teachers表有 ${teachers.length} 条记录`);
    console.log('');
    
    // 3. 按名字分组
    const teachersByName = {};
    for (const t of teachers) {
      if (!teachersByName[t.name]) {
        teachersByName[t.name] = [];
      }
      teachersByName[t.name].push(t);
    }
    
    let markedInactive = 0;
    const idsToMark = [];
    
    // 4. 处理每个名字组
    for (const [name, records] of Object.entries(teachersByName)) {
      // 检查是否在users表中存在
      if (!validTeacherNames.has(name)) {
        // users表中不存在，全部标记为inactive
        console.log(`❌ ${name}: users表中不存在，标记所有${records.length}条记录为inactive`);
        for (const r of records) {
          if (r.isActive) {
            idsToMark.push(r.id);
            markedInactive++;
          }
        }
      } else if (records.length > 1) {
        // 有重复记录，保留ID最小的一条
        const [keep, ...duplicates] = records;
        console.log(`🔄 ${name}: 保留ID=${keep.id}，标记${duplicates.length}条重复记录为inactive`);
        for (const r of duplicates) {
          if (r.isActive) {
            idsToMark.push(r.id);
            markedInactive++;
          }
        }
      }
    }
    
    console.log('');
    console.log(`📝 总计需要标记 ${markedInactive} 条记录为isActive=false`);
    console.log('');
    
    // 5. 执行更新
    if (idsToMark.length > 0) {
      const placeholders = idsToMark.map(() => '?').join(',');
      const [result] = await connection.query(
        `UPDATE teachers SET isActive = 0 WHERE id IN (${placeholders})`,
        idsToMark
      );
      
      console.log(`✅ 成功更新 ${result.affectedRows} 条记录`);
    } else {
      console.log('✅ 没有需要更新的记录');
    }
    
    console.log('');
    console.log('✨ 数据清理完成！');
    console.log('');
    
  } catch (error) {
    console.error('❌ 清理失败:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
