import mysql from 'mysql2/promise';

async function testGetAllTeachers() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // 模拟getAllTeachers的查询逻辑
  const [results] = await connection.query(`
    SELECT 
      u.id,
      u.name,
      u.nickname,
      u.phone,
      u.customerType,
      1 as isActive,
      u.avatarUrl,
      u.teacherAttribute,
      u.teacherStatus as status,
      u.teacherNotes,
      t.notes as teacherTableNotes
    FROM users u
    LEFT JOIN teachers t ON u.id = t.userId
    WHERE u.roles LIKE '%teacher%' AND u.deletedAt IS NULL
    ORDER BY u.createdAt DESC
  `);
  
  // 查找琴酒、露娜、test三个用户
  const testUsers = results.filter(r => ['琴酒', '露娜', 'test'].includes(r.name));
  
  console.log('测试用户的notes字段:');
  testUsers.forEach(t => {
    const finalNotes = t.teacherTableNotes || t.teacherNotes || null;
    console.log(`- ${t.name} (ID: ${t.id}):`);
    console.log(`  teacherTableNotes: ${t.teacherTableNotes}`);
    console.log(`  users.teacherNotes: ${t.teacherNotes}`);
    console.log(`  最终notes: ${finalNotes}`);
  });
  
  await connection.end();
}

testGetAllTeachers().catch(console.error);
