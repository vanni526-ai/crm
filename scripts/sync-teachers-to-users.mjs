/**
 * 老师管理和用户管理同步脚本
 * 
 * 功能：
 * 1. 将teachers表中的所有老师同步到users表
 * 2. 为每个老师创建用户账户，角色设为"teacher"
 * 3. 用户名和花名都填老师姓名
 * 4. 手机号暂时填"无"（后期维护）
 * 5. 更新teachers表的userId字段关联users表
 * 
 * 使用方法：
 * node scripts/sync-teachers-to-users.mjs
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '../.env') });

async function syncTeachersToUsers() {
  let connection;
  
  try {
    // 连接数据库
    console.log('正在连接数据库...');
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('✅ 数据库连接成功\n');
    
    // 查询所有老师
    console.log('正在查询老师数据...');
    const [teachers] = await connection.query(`
      SELECT id, userId, name, phone, city, isActive 
      FROM teachers 
      ORDER BY id
    `);
    console.log(`✅ 查询到 ${teachers.length} 个老师\n`);
    
    if (teachers.length === 0) {
      console.log('没有老师需要同步');
      return;
    }
    
    // 统计信息
    let createdCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    console.log('开始同步老师到用户管理...\n');
    console.log('ID\t姓名\t\t手机号\t\t城市\t\t状态');
    console.log('='.repeat(100));
    
    // 默认密码（加密后的"123456"）
    const defaultPassword = await bcrypt.hash('123456', 10);
    
    // 遍历老师进行同步
    for (const teacher of teachers) {
      const { id, userId, name, phone, city, isActive } = teacher;
      const displayName = name || `老师${id}`;
      const displayPhone = phone || '无';
      const displayCity = city || '-';
      
      try {
        // 如果已经有userId，检查用户是否存在
        if (userId) {
          const [existingUsers] = await connection.query(
            'SELECT id, roles FROM users WHERE id = ?',
            [userId]
          );
          
          if (existingUsers.length > 0) {
            const user = existingUsers[0];
            const roles = user.roles || '';
            const hasTeacherRole = roles.split(',').includes('teacher');
            
            if (hasTeacherRole) {
              console.log(`${id}\t${displayName.padEnd(12)}\t${displayPhone.padEnd(12)}\t${displayCity.padEnd(12)}\t跳过（已关联用户${userId}）`);
              skippedCount++;
            } else {
              // 用户存在但没有teacher角色，添加角色
              const newRoles = roles ? `${roles},teacher` : 'teacher';
              await connection.query(
                'UPDATE users SET roles = ? WHERE id = ?',
                [newRoles, userId]
              );
              console.log(`${id}\t${displayName.padEnd(12)}\t${displayPhone.padEnd(12)}\t${displayCity.padEnd(12)}\t✅ 已添加teacher角色`);
              updatedCount++;
            }
            continue;
          }
        }
        
        // 检查是否已存在同名用户
        const [existingByName] = await connection.query(
          'SELECT id, roles FROM users WHERE name = ? OR nickname = ?',
          [name, name]
        );
        
        if (existingByName.length > 0) {
          const user = existingByName[0];
          const roles = user.roles || '';
          const hasTeacherRole = roles.split(',').includes('teacher');
          
          if (!hasTeacherRole) {
            // 添加teacher角色
            const newRoles = roles ? `${roles},teacher` : 'teacher';
            await connection.query(
              'UPDATE users SET roles = ? WHERE id = ?',
              [newRoles, user.id]
            );
            
            // 更新teachers表的userId
            await connection.query(
              'UPDATE teachers SET userId = ? WHERE id = ?',
              [user.id, id]
            );
            
            console.log(`${id}\t${displayName.padEnd(12)}\t${displayPhone.padEnd(12)}\t${displayCity.padEnd(12)}\t✅ 已关联现有用户${user.id}并添加角色`);
            updatedCount++;
          } else {
            // 只更新teachers表的userId
            await connection.query(
              'UPDATE teachers SET userId = ? WHERE id = ?',
              [user.id, id]
            );
            
            console.log(`${id}\t${displayName.padEnd(12)}\t${displayPhone.padEnd(12)}\t${displayCity.padEnd(12)}\t✅ 已关联现有用户${user.id}`);
            updatedCount++;
          }
          continue;
        }
        
        // 创建新用户
        const openId = `teacher_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const phoneValue = phone || '无';
        
        const [result] = await connection.query(
          `INSERT INTO users (openId, name, nickname, phone, password, role, roles, isActive) 
           VALUES (?, ?, ?, ?, ?, 'teacher', 'teacher', ?)`,
          [openId, name, name, phoneValue, defaultPassword, isActive]
        );
        
        const newUserId = result.insertId;
        
        // 更新teachers表的userId
        await connection.query(
          'UPDATE teachers SET userId = ? WHERE id = ?',
          [newUserId, id]
        );
        
        console.log(`${id}\t${displayName.padEnd(12)}\t${displayPhone.padEnd(12)}\t${displayCity.padEnd(12)}\t✅ 已创建用户${newUserId}`);
        createdCount++;
        
      } catch (error) {
        console.log(`${id}\t${displayName.padEnd(12)}\t${displayPhone.padEnd(12)}\t${displayCity.padEnd(12)}\t❌ 错误: ${error.message}`);
        errorCount++;
      }
    }
    
    // 输出统计信息
    console.log('='.repeat(100));
    console.log('\n同步完成！统计信息：');
    console.log(`  总老师数: ${teachers.length}`);
    console.log(`  新建用户: ${createdCount}`);
    console.log(`  更新关联: ${updatedCount}`);
    console.log(`  已跳过: ${skippedCount}`);
    console.log(`  失败: ${errorCount}`);
    
    // 验证同步结果
    console.log('\n正在验证同步结果...');
    const [result] = await connection.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN userId IS NULL THEN 1 ELSE 0 END) as no_user,
        SUM(CASE WHEN userId IS NOT NULL THEN 1 ELSE 0 END) as has_user
      FROM teachers
    `);
    
    const { total, no_user, has_user } = result[0];
    console.log(`  总老师数: ${total}`);
    console.log(`  已关联用户: ${has_user}`);
    console.log(`  未关联用户: ${no_user}`);
    
    if (no_user === 0) {
      console.log('\n✅ 所有老师都已成功关联用户账户！');
    } else {
      console.log('\n⚠️  仍有部分老师未关联用户账户');
    }
    
  } catch (error) {
    console.error('\n❌ 同步失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

// 执行同步
syncTeachersToUsers().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
