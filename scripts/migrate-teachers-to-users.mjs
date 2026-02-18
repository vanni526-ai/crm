/**
 * 数据迁移脚本：将teachers表的数据合并到users表
 * 
 * 策略：
 * 1. 按照phone号码分组，找出重复的老师记录
 * 2. 对于每个phone号码：
 *    - 如果users表中已存在该phone的记录，更新其老师相关字段并添加"teacher"角色
 *    - 如果users表中不存在，创建新的user记录
 * 3. 选择teachers表中数据最完整的记录进行合并
 */

import mysql from 'mysql2/promise';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

// 选择数据最完整的老师记录
function selectBestTeacher(teachers) {
  return teachers.reduce((best, current) => {
    let bestScore = calculateCompletenessScore(best);
    let currentScore = calculateCompletenessScore(current);
    return currentScore > bestScore ? current : best;
  });
}

// 计算数据完整度分数
function calculateCompletenessScore(teacher) {
  let score = 0;
  const fields = ['name', 'phone', 'email', 'nickname', 'wechat', 'avatarUrl', 
                  'aliases', 'teacherAttribute', 'customerType', 'category', 
                  'hourlyRate', 'bankAccount', 'bankName', 'contractEndDate', 'joinDate'];
  
  for (const field of fields) {
    if (teacher[field]) score++;
  }
  return score;
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('🚀 开始数据迁移：teachers表 → users表');
    console.log('');
    
    // 1. 获取所有teachers表的记录
    const [teachers] = await connection.query(`
      SELECT 
        id, name, phone, nickname, email, wechat,
        avatarUrl, aliases, teacherAttribute, customerType,
        category, city, hourlyRate, bankAccount, bankName,
        contractEndDate, joinDate, status as teacherStatus,
        notes as teacherNotes, isActive, createdAt
      FROM teachers
      WHERE isActive = 1
      ORDER BY phone, createdAt
    `);
    
    console.log(`📊 找到 ${teachers.length} 条活跃的老师记录`);
    console.log('');
    
    // 2. 按phone分组
    const teachersByPhone = {};
    const teachersWithoutPhone = [];
    
    for (const teacher of teachers) {
      if (teacher.phone) {
        if (!teachersByPhone[teacher.phone]) {
          teachersByPhone[teacher.phone] = [];
        }
        teachersByPhone[teacher.phone].push(teacher);
      } else {
        teachersWithoutPhone.push(teacher);
      }
    }
    
    console.log(`📞 有电话号码的老师组: ${Object.keys(teachersByPhone).length}`);
    console.log(`❓ 没有电话号码的老师: ${teachersWithoutPhone.length}`);
    console.log('');
    
    let created = 0;
    let updated = 0;
    let skipped = 0;
    
    // 3. 处理有电话号码的老师
    for (const [phone, phoneTeachers] of Object.entries(teachersByPhone)) {
      // 选择数据最完整的记录
      const bestTeacher = selectBestTeacher(phoneTeachers);
      
      if (phoneTeachers.length > 1) {
        console.log(`🔄 合并 ${phoneTeachers.length} 条记录: ${bestTeacher.name} (${phone})`);
      }
      
      // 检查users表中是否已存在该phone
      const [existingUsers] = await connection.query(
        'SELECT id, name, roles FROM users WHERE phone = ? LIMIT 1',
        [phone]
      );
      
      if (existingUsers.length > 0) {
        // 更新现有用户
        const user = existingUsers[0];
        const roles = user.roles ? user.roles.split(',') : [];
        
        if (!roles.includes('teacher')) {
          roles.push('teacher');
        }
        
        await connection.query(`
          UPDATE users SET
            roles = ?,
            avatarUrl = COALESCE(avatarUrl, ?),
            aliases = COALESCE(aliases, ?),
            teacherAttribute = COALESCE(teacherAttribute, ?),
            customerType = COALESCE(customerType, ?),
            category = COALESCE(category, ?),
            hourlyRate = COALESCE(hourlyRate, ?),
            bankAccount = COALESCE(bankAccount, ?),
            bankName = COALESCE(bankName, ?),
            contractEndDate = COALESCE(contractEndDate, ?),
            joinDate = COALESCE(joinDate, ?),
            teacherStatus = COALESCE(teacherStatus, ?),
            teacherNotes = COALESCE(teacherNotes, ?),
            wechat = COALESCE(wechat, ?)
          WHERE id = ?
        `, [
          roles.join(','),
          bestTeacher.avatarUrl,
          bestTeacher.aliases,
          bestTeacher.teacherAttribute,
          bestTeacher.customerType,
          bestTeacher.category,
          bestTeacher.hourlyRate,
          bestTeacher.bankAccount,
          bestTeacher.bankName,
          bestTeacher.contractEndDate,
          bestTeacher.joinDate,
          bestTeacher.teacherStatus,
          bestTeacher.teacherNotes,
          bestTeacher.wechat,
          user.id
        ]);
        
        console.log(`  ✅ 更新用户 #${user.id}: ${user.name} → 添加teacher角色`);
        updated++;
      } else {
        // 创建新用户（使用phone作为openId的一部分）
        const openId = `teacher_${phone}_${Date.now()}`;
        
        await connection.query(`
          INSERT INTO users (
            openId, name, nickname, email, phone, roles,
            avatarUrl, aliases, teacherAttribute, customerType,
            category, hourlyRate, bankAccount, bankName,
            contractEndDate, joinDate, teacherStatus, teacherNotes,
            wechat, isActive
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          openId,
          bestTeacher.name,
          bestTeacher.nickname,
          bestTeacher.email,
          bestTeacher.phone,
          'teacher',
          bestTeacher.avatarUrl,
          bestTeacher.aliases,
          bestTeacher.teacherAttribute,
          bestTeacher.customerType,
          bestTeacher.category,
          bestTeacher.hourlyRate,
          bestTeacher.bankAccount,
          bestTeacher.bankName,
          bestTeacher.contractEndDate,
          bestTeacher.joinDate,
          bestTeacher.teacherStatus,
          bestTeacher.teacherNotes,
          bestTeacher.wechat,
          bestTeacher.isActive
        ]);
        
        console.log(`  ✅ 创建新用户: ${bestTeacher.name} (${phone})`);
        created++;
      }
    }
    
    // 4. 处理没有电话号码的老师（跳过）
    console.log('');
    console.log(`⚠️  跳过 ${teachersWithoutPhone.length} 条没有电话号码的记录`);
    skipped = teachersWithoutPhone.length;
    
    // 5. 同步城市信息到user_role_cities表
    console.log('');
    console.log('🏙️  同步城市信息到user_role_cities表...');
    
    const [teachersWithCity] = await connection.query(`
      SELECT DISTINCT t.phone, t.city
      FROM teachers t
      WHERE t.isActive = 1 AND t.phone IS NOT NULL AND t.city IS NOT NULL
    `);
    
    for (const {phone, city} of teachersWithCity) {
      const [users] = await connection.query(
        'SELECT id FROM users WHERE phone = ? LIMIT 1',
        [phone]
      );
      
      if (users.length > 0) {
        const userId = users[0].id;
        
        // 检查是否已存在
        const [existing] = await connection.query(
          'SELECT id, cities FROM user_role_cities WHERE userId = ? AND role = ?',
          [userId, 'teacher']
        );
        
        if (existing.length > 0) {
          // 更新城市列表
          const cities = JSON.parse(existing[0].cities);
          if (!cities.includes(city)) {
            cities.push(city);
            await connection.query(
              'UPDATE user_role_cities SET cities = ? WHERE id = ?',
              [JSON.stringify(cities), existing[0].id]
            );
          }
        } else {
          // 创建新记录
          await connection.query(
            'INSERT INTO user_role_cities (userId, role, cities) VALUES (?, ?, ?)',
            [userId, 'teacher', JSON.stringify([city])]
          );
        }
      }
    }
    
    console.log('');
    console.log('✨ 数据迁移完成！');
    console.log('');
    console.log(`📈 统计：`);
    console.log(`  - 创建新用户: ${created}`);
    console.log(`  - 更新现有用户: ${updated}`);
    console.log(`  - 跳过记录: ${skipped}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
