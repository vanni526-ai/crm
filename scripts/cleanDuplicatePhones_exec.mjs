import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log('=== 开始数据清理 ===\n');

  let teachersDeleted = 0;
  let usersDeleted = 0;
  let usersUpdated = 0;

  // 1. Teachers表
  console.log('1. 清理Teachers表重复手机号...');
  const teacherDuplicates = await db.execute(sql`
    SELECT phone, GROUP_CONCAT(id ORDER BY id) as ids
    FROM teachers
    WHERE phone IS NOT NULL AND phone != ''
    GROUP BY phone
    HAVING COUNT(*) > 1
  `);

  for (const dup of teacherDuplicates[0]) {
    const ids = dup.ids.split(',').map(id => parseInt(id));
    const records = await db.execute(sql`SELECT * FROM teachers WHERE id IN (${sql.raw(ids.join(','))})`);
    
    const recordsWithScore = records[0].map(record => ({
      ...record,
      score: Object.values(record).filter(v => v !== null && v !== '').length
    }));
    
    recordsWithScore.sort((a, b) => b.score - a.score);
    const keepId = recordsWithScore[0].id;
    const deleteIds = recordsWithScore.slice(1).map(r => r.id);
    
    console.log(`  手机号 ${dup.phone}: 保留ID=${keepId}, 删除${deleteIds.length}条`);
    
    for (const id of deleteIds) {
      await db.execute(sql`DELETE FROM teachers WHERE id = ${id}`);
      teachersDeleted++;
    }
  }

  // 2. Users表
  console.log('\n2. 清理Users表重复手机号...');
  const userDuplicates = await db.execute(sql`
    SELECT phone, GROUP_CONCAT(id ORDER BY id) as ids
    FROM users
    WHERE phone IS NOT NULL AND phone != ''
    GROUP BY phone
    HAVING COUNT(*) > 1
  `);

  for (const dup of userDuplicates[0]) {
    const ids = dup.ids.split(',').map(id => parseInt(id));
    const records = await db.execute(sql`SELECT * FROM users WHERE id IN (${sql.raw(ids.join(','))})`);
    
    const sortedRecords = records[0].sort((a, b) => a.id - b.id);
    const keepRecord = sortedRecords[0];
    const deleteRecords = sortedRecords.slice(1);
    
    const allRoles = new Set();
    sortedRecords.forEach(record => {
      if (record.roles) {
        record.roles.split(',').forEach(role => allRoles.add(role.trim()));
      }
    });
    const mergedRoles = Array.from(allRoles).join(',');
    
    console.log(`  手机号 ${dup.phone}: 保留ID=${keepRecord.id}, 删除${deleteRecords.length}条`);
    
    if (mergedRoles !== keepRecord.roles) {
      await db.execute(sql`UPDATE users SET roles = ${mergedRoles} WHERE id = ${keepRecord.id}`);
      usersUpdated++;
    }
    
    for (const record of deleteRecords) {
      await db.execute(sql`DELETE FROM users WHERE id = ${record.id}`);
      usersDeleted++;
    }
  }

  console.log('\n=== 清理完成 ===');
  console.log(`Teachers表：删除 ${teachersDeleted} 条`);
  console.log(`Users表：更新 ${usersUpdated} 条，删除 ${usersDeleted} 条`);

  await connection.end();
}

main().catch(console.error);
