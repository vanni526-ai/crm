import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, and, like } from 'drizzle-orm';
import { teachers, users } from '../drizzle/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log('开始同步teachers表与users表的关联...\n');

// 1. 查询所有活跃的teachers记录
const activeTeachers = await db.select().from(teachers).where(eq(teachers.isActive, 1));
console.log(`找到${activeTeachers.length}条活跃的teachers记录`);

let matchedCount = 0;
let unmatchedCount = 0;

// 2. 根据phone号码匹配users表
for (const teacher of activeTeachers) {
  if (!teacher.phone) {
    console.log(`⚠️  老师"${teacher.name}"没有phone号码，跳过`);
    unmatchedCount++;
    continue;
  }
  
  // 查找users表中对应的记录
  const matchedUsers = await db.select().from(users).where(
    and(
      eq(users.phone, teacher.phone),
      like(users.roles, '%teacher%')
    )
  );
  
  if (matchedUsers.length === 0) {
    console.log(`⚠️  老师"${teacher.name}" (phone: ${teacher.phone})在users表中未找到匹配记录`);
    unmatchedCount++;
    continue;
  }
  
  if (matchedUsers.length > 1) {
    console.log(`⚠️  老师"${teacher.name}" (phone: ${teacher.phone})在users表中找到多条匹配记录，使用第一条`);
  }
  
  const matchedUser = matchedUsers[0];
  
  // 更新teachers表的userId
  await db.update(teachers)
    .set({ userId: matchedUser.id })
    .where(eq(teachers.id, teacher.id));
  
  console.log(`✅ 老师"${teacher.name}" → 用户"${matchedUser.name}" (userId: ${matchedUser.id})`);
  matchedCount++;
}

console.log(`\n同步完成！`);
console.log(`成功匹配: ${matchedCount}条`);
console.log(`未匹配: ${unmatchedCount}条`);

await connection.end();
