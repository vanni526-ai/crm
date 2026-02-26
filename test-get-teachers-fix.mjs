import mysql from 'mysql2/promise';

const db = await mysql.createConnection({
  host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '3vGqJVqSXdBxJEJ.root',
  password: 'Kfm5VqZPPxDZNPHE',
  database: 'course_crm',
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
});

console.log('测试getAllTeachers修复效果:\n');

// 1. 查询users表中有teacher角色的用户数量
const [usersWithTeacherRole] = await db.query(`
  SELECT COUNT(*) as count
  FROM users
  WHERE roles LIKE '%teacher%'
  AND deletedAt IS NULL
`);
console.log('1. users表中有teacher角色的用户数量:', usersWithTeacherRole[0].count);

// 2. 查询teachers表中的记录数量
const [teachersTableRecords] = await db.query(`
  SELECT COUNT(*) as count
  FROM teachers
`);
console.log('2. teachers表中的记录数量:', teachersTableRecords[0].count);

// 3. 查询teachers表中有重复userId的记录
const [duplicateUserIds] = await db.query(`
  SELECT userId, COUNT(*) as count
  FROM teachers
  GROUP BY userId
  HAVING COUNT(*) > 1
`);
console.log('3. teachers表中有重复userId的记录数量:', duplicateUserIds.length);
if (duplicateUserIds.length > 0) {
  console.log('   重复的userId:', duplicateUserIds.map(r => `userId=${r.userId} (${r.count}条)`).join(', '));
}

// 4. 模拟修复后的查询逻辑（以users表为准）
const [usersData] = await db.query(`
  SELECT 
    u.id,
    u.name,
    u.teacherNotes as usersTableNotes
  FROM users u
  WHERE u.roles LIKE '%teacher%'
  AND u.deletedAt IS NULL
  ORDER BY u.createdAt DESC
`);

console.log('\n4. 修复后的查询结果（以users表为准）:');
console.log('   返回记录数:', usersData.length);
console.log('   前3条记录:', usersData.slice(0, 3).map(r => `${r.name} (ID: ${r.id})`).join(', '));

// 5. 为每个用户获取teachers表的notes（只取第一条）
const userIds = usersData.map(u => u.id);
const [teacherNotesData] = await db.query(`
  SELECT 
    userId,
    notes
  FROM teachers
  WHERE userId IN (?)
  GROUP BY userId
`, [userIds]);

console.log('\n5. teachers表的notes数据:');
console.log('   有notes记录的用户数:', teacherNotesData.length);

const notesMap = new Map(teacherNotesData.map(t => [t.userId, t.notes]));

// 6. 合并数据
const finalResults = usersData.map(user => ({
  id: user.id,
  name: user.name,
  notes: notesMap.get(user.id) || user.usersTableNotes || null
}));

console.log('\n6. 最终合并结果:');
console.log('   总记录数:', finalResults.length);
console.log('   有notes的记录数:', finalResults.filter(r => r.notes).length);
console.log('   前5条记录:');
finalResults.slice(0, 5).forEach(r => {
  console.log(`   - ${r.name} (ID: ${r.id}): notes=${r.notes ? r.notes.substring(0, 30) + '...' : 'null'}`);
});

await db.end();
