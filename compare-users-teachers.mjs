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

console.log('========== 1. users表中带有teacher角色的账号信息 ==========\n');

const [usersWithTeacher] = await db.query(`
  SELECT 
    id,
    name,
    nickname,
    phone,
    email,
    roles,
    teacherAttribute,
    teacherStatus,
    teacherNotes,
    createdAt
  FROM users
  WHERE roles LIKE '%teacher%'
  AND deletedAt IS NULL
  ORDER BY createdAt DESC
`);

console.log(`总数: ${usersWithTeacher.length}条记录\n`);
console.log('ID\t\t姓名\t\t昵称\t\t角色\t\t老师属性\t创建时间');
console.log('='.repeat(100));
usersWithTeacher.forEach(u => {
  console.log(`${u.id}\t${u.name || '-'}\t\t${u.nickname || '-'}\t\t${u.roles}\t${u.teacherAttribute || '-'}\t\t${u.createdAt.toISOString().split('T')[0]}`);
});

console.log('\n\n========== 2. teachers表的所有记录 ==========\n');

const [teachersAll] = await db.query(`
  SELECT 
    id,
    userId,
    name,
    phone,
    wechat,
    teacherAttribute,
    status,
    notes,
    createdAt
  FROM teachers
  ORDER BY createdAt DESC
`);

console.log(`总数: ${teachersAll.length}条记录\n`);
console.log('ID\t\tuserID\t\t姓名\t\t电话\t\t老师属性\t状态\t\t创建时间');
console.log('='.repeat(120));
teachersAll.forEach(t => {
  console.log(`${t.id}\t${t.userId}\t\t${t.name || '-'}\t\t${t.phone || '-'}\t${t.teacherAttribute || '-'}\t\t${t.status || '-'}\t${t.createdAt.toISOString().split('T')[0]}`);
});

console.log('\n\n========== 3. 比对结果 ==========\n');

// 创建users表中teacher角色的userId集合
const userIdsSet = new Set(usersWithTeacher.map(u => u.id));

// 找出teachers表中不在users表的记录（孤儿记录）
const orphanRecords = teachersAll.filter(t => !userIdsSet.has(t.userId));

// 找出teachers表中userId重复的记录
const userIdCount = new Map();
teachersAll.forEach(t => {
  userIdCount.set(t.userId, (userIdCount.get(t.userId) || 0) + 1);
});
const duplicateUserIds = Array.from(userIdCount.entries()).filter(([_, count]) => count > 1);

console.log(`✓ users表中有teacher角色的账号: ${usersWithTeacher.length}个`);
console.log(`✓ teachers表中的记录: ${teachersAll.length}条`);
console.log(`✓ teachers表中userId重复的记录: ${duplicateUserIds.length}个userId (${duplicateUserIds.reduce((sum, [_, count]) => sum + count, 0)}条记录)`);
console.log(`✗ teachers表中不在users表的孤儿记录: ${orphanRecords.length}条\n`);

if (duplicateUserIds.length > 0) {
  console.log('重复的userId详情:');
  duplicateUserIds.forEach(([userId, count]) => {
    const user = usersWithTeacher.find(u => u.id === userId);
    const teacherRecords = teachersAll.filter(t => t.userId === userId);
    console.log(`  - userId=${userId} (${user?.name || '未知'}) 有${count}条记录:`);
    teacherRecords.forEach(t => {
      console.log(`    * teachers.id=${t.id}, name=${t.name}, createdAt=${t.createdAt.toISOString()}`);
    });
  });
  console.log('');
}

if (orphanRecords.length > 0) {
  console.log('孤儿记录详情（将被删除）:');
  orphanRecords.forEach(t => {
    console.log(`  - teachers.id=${t.id}, userId=${t.userId}, name=${t.name}, phone=${t.phone}, createdAt=${t.createdAt.toISOString()}`);
  });
  console.log('');
}

console.log('\n========== 4. 删除建议 ==========\n');
console.log(`将删除${orphanRecords.length}条孤儿记录（userId不在users表中）`);
if (orphanRecords.length > 0) {
  console.log('删除SQL:');
  console.log(`DELETE FROM teachers WHERE id IN (${orphanRecords.map(t => t.id).join(', ')});`);
}

await db.end();
