import mysql from 'mysql2/promise';
import 'dotenv/config';

async function syncMissingTeachers() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('开始检查拥有teacher角色但没有teachers表记录的用户...\n');
    
    // 查找所有拥有teacher角色的用户
    const [usersWithTeacherRole] = await conn.execute(`
      SELECT id, name, nickname, phone 
      FROM users 
      WHERE roles LIKE '%teacher%' OR role = 'teacher'
    `);
    
    console.log(`找到 ${usersWithTeacherRole.length} 个拥有teacher角色的用户`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const user of usersWithTeacherRole) {
      // 检查是否已有teachers表记录
      const [existingTeacher] = await conn.execute(
        'SELECT id FROM teachers WHERE userId = ?',
        [user.id]
      );
      
      if (existingTeacher.length > 0) {
        console.log(`✓ 用户 ${user.id} (${user.nickname || user.name}) 已有teachers记录，跳过`);
        skippedCount++;
        continue;
      }
      
      // 创建teachers表记录
      const teacherName = user.nickname || user.name || '未命名老师';
      await conn.execute(`
        INSERT INTO teachers (name, nickname, phone, userId, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 1, NOW(), NOW())
      `, [teacherName, teacherName, user.phone || '无', user.id]);
      
      console.log(`✓ 为用户 ${user.id} (${teacherName}) 创建了teachers记录`);
      createdCount++;
    }
    
    console.log(`\n=== 同步完成 ===`);
    console.log(`新创建: ${createdCount} 条记录`);
    console.log(`已跳过: ${skippedCount} 条记录`);
    
  } catch (error) {
    console.error('同步失败:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

syncMissingTeachers();
