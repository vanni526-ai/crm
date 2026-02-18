/**
 * 数据对比脚本：分析teachers表与users表的数据差异
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
    console.log('🔍 分析teachers表与users表的数据差异');
    console.log('');
    
    // 1. 获取teachers表的所有记录
    const [teachers] = await connection.query(`
      SELECT id, name, nickname, phone, city, isActive
      FROM teachers
      ORDER BY name
    `);
    
    console.log(`📊 teachers表: ${teachers.length} 条记录`);
    
    // 2. 获取users表中角色包含teacher的记录
    const [users] = await connection.query(`
      SELECT id, name, nickname, phone, roles
      FROM users
      WHERE roles LIKE '%teacher%'
      ORDER BY name
    `);
    
    console.log(`📊 users表(teacher角色): ${users.length} 条记录`);
    console.log('');
    
    // 3. 按名字分组统计
    const teachersByName = {};
    for (const t of teachers) {
      const key = t.name;
      if (!teachersByName[key]) {
        teachersByName[key] = [];
      }
      teachersByName[key].push(t);
    }
    
    const usersByName = {};
    for (const u of users) {
      const key = u.name;
      if (!usersByName[key]) {
        usersByName[key] = [];
      }
      usersByName[key].push(u);
    }
    
    // 4. 找出teachers表中的重复记录
    console.log('🔄 teachers表中的重复名字:');
    let duplicateCount = 0;
    for (const [name, records] of Object.entries(teachersByName)) {
      if (records.length > 1) {
        console.log(`  - ${name}: ${records.length}条记录`);
        records.forEach(r => {
          console.log(`    ID=${r.id}, nickname=${r.nickname}, phone=${r.phone}, city=${r.city}, isActive=${r.isActive}`);
        });
        duplicateCount += records.length - 1; // 减去1个保留的
      }
    }
    console.log(`  总计: ${duplicateCount} 条重复记录`);
    console.log('');
    
    // 5. 找出只在teachers表中存在的记录
    console.log('📌 只在teachers表中存在的老师:');
    let onlyInTeachers = 0;
    for (const [name, records] of Object.entries(teachersByName)) {
      if (!usersByName[name]) {
        console.log(`  - ${name} (${records.length}条记录)`);
        onlyInTeachers += records.length;
      }
    }
    console.log(`  总计: ${onlyInTeachers} 条`);
    console.log('');
    
    // 6. 找出只在users表中存在的记录
    console.log('📌 只在users表中存在的老师:');
    let onlyInUsers = 0;
    for (const [name, records] of Object.entries(usersByName)) {
      if (!teachersByName[name]) {
        console.log(`  - ${name} (ID=${records[0].id})`);
        onlyInUsers++;
      }
    }
    console.log(`  总计: ${onlyInUsers} 条`);
    console.log('');
    
    // 7. 生成清理建议
    console.log('💡 清理建议:');
    console.log(`  1. 将teachers表中的 ${duplicateCount} 条重复记录标记为isActive=false`);
    console.log(`  2. 将teachers表中只存在的 ${onlyInTeachers} 条记录标记为isActive=false（因为users表中没有对应记录）`);
    console.log(`  3. 保留users表中的所有数据不变`);
    console.log('');
    
  } catch (error) {
    console.error('❌ 分析失败:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
