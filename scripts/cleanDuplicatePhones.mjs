import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * 数据清理脚本：检查并合并重复手机号记录
 * 
 * 合并策略：
 * 1. Teachers表：保留数据最完整的记录（更多非空字段），删除其他记录
 * 2. Users表：保留最早创建的记录，合并其他记录的角色信息，删除重复记录
 * 3. 生成详细的清理报告
 */

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log('=== 开始数据清理 ===\n');

  let teachersDeleted = 0;
  let usersDeleted = 0;
  let usersUpdated = 0;

  // 1. 检查Teachers表重复手机号
  console.log('1. 检查Teachers表重复手机号...');
  const teacherDuplicates = await db.execute(sql`
    SELECT phone, COUNT(*) as count, GROUP_CONCAT(id ORDER BY id) as ids, GROUP_CONCAT(name ORDER BY id) as names
    FROM teachers
    WHERE phone IS NOT NULL AND phone != ''
    GROUP BY phone
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `);

  console.log(`   发现 ${teacherDuplicates[0].length} 组重复手机号\n`);

  if (teacherDuplicates[0].length > 0) {
    console.log('   详细信息：');
    for (const dup of teacherDuplicates[0]) {
      console.log(`   - 手机号: ${dup.phone}`);
      console.log(`     重复次数: ${dup.count}`);
      console.log(`     IDs: ${dup.ids}`);
      console.log(`     姓名: ${dup.names}\n`);

      // 获取详细记录
      const ids = dup.ids.split(',').map(id => parseInt(id));
      const records = await db.execute(sql`
        SELECT * FROM teachers WHERE id IN (${sql.raw(ids.join(','))})
      `);

      // 计算每条记录的完整度（非空字段数量）
      const recordsWithScore = records[0].map(record => {
        const nonNullFields = Object.values(record).filter(v => v !== null && v !== '').length;
        return { ...record, score: nonNullFields };
      });

      // 按完整度排序，保留最完整的记录
      recordsWithScore.sort((a, b) => b.score - a.score);
      const keepRecord = recordsWithScore[0];
      const deleteRecords = recordsWithScore.slice(1);

      console.log(`     保留记录: ID=${keepRecord.id}, 姓名=${keepRecord.name}, 完整度=${keepRecord.score}`);
      console.log(`     删除记录: ${deleteRecords.map(r => `ID=${r.id}(${r.name}, 完整度=${r.score})`).join(', ')}\n`);

      // 执行删除
      for (const record of deleteRecords) {
        await db.execute(sql`DELETE FROM teachers WHERE id = ${record.id}`);
        console.log(`     ✓ 已删除: ID=${record.id}`);
        teachersDeleted++;
      }
    }
  }

  // 2. 检查Users表重复手机号
  console.log('\n2. 检查Users表重复手机号...');
  const userDuplicates = await db.execute(sql`
    SELECT phone, COUNT(*) as count, GROUP_CONCAT(id ORDER BY id) as ids, GROUP_CONCAT(username ORDER BY id) as usernames
    FROM users
    WHERE phone IS NOT NULL AND phone != ''
    GROUP BY phone
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `);

  console.log(`   发现 ${userDuplicates[0].length} 组重复手机号\n`);

  if (userDuplicates[0].length > 0) {
    console.log('   详细信息：');
    for (const dup of userDuplicates[0]) {
      console.log(`   - 手机号: ${dup.phone}`);
      console.log(`     重复次数: ${dup.count}`);
      console.log(`     IDs: ${dup.ids}`);
      console.log(`     用户名: ${dup.usernames}\n`);

      // 获取详细记录
      const ids = dup.ids.split(',').map(id => parseInt(id));
      const records = await db.execute(sql`
        SELECT * FROM users WHERE id IN (${sql.raw(ids.join(','))})
      `);

      // 按ID排序，保留最早创建的记录
      const sortedRecords = records[0].sort((a, b) => a.id - b.id);
      const keepRecord = sortedRecords[0];
      const deleteRecords = sortedRecords.slice(1);

      // 合并角色信息
      const allRoles = new Set();
      sortedRecords.forEach(record => {
        if (record.roles) {
          record.roles.split(',').forEach(role => allRoles.add(role.trim()));
        }
      });
      const mergedRoles = Array.from(allRoles).join(',');

      console.log(`     保留记录: ID=${keepRecord.id}, 用户名=${keepRecord.username}, 原角色=${keepRecord.roles}`);
      console.log(`     合并后角色: ${mergedRoles}`);
      console.log(`     删除记录: ${deleteRecords.map(r => `ID=${r.id}(${r.username}, 角色=${r.roles})`).join(', ')}\n`);

      // 执行更新和删除
      if (mergedRoles !== keepRecord.roles) {
        await db.execute(sql`UPDATE users SET roles = ${mergedRoles} WHERE id = ${keepRecord.id}`);
        console.log(`     ✓ 已更新: ID=${keepRecord.id}, 新角色=${mergedRoles}`);
        usersUpdated++;
      }
      
      for (const record of deleteRecords) {
        await db.execute(sql`DELETE FROM users WHERE id = ${record.id}`);
        console.log(`     ✓ 已删除: ID=${record.id}`);
        usersDeleted++;
      }
    }
  }

  console.log('\n=== 数据清理完成 ===');
  console.log(`Teachers表：删除 ${teachersDeleted} 条重复记录`);
  console.log(`Users表：更新 ${usersUpdated} 条记录，删除 ${usersDeleted} 条重复记录`);
  console.log(`总计：删除 ${teachersDeleted + usersDeleted} 条记录，更新 ${usersUpdated} 条记录\n`);

  await connection.end();
}

main().catch(console.error);
