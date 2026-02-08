/**
 * 批量迁移用户角色脚本
 * 
 * 功能：
 * 1. 将users表中的单角色role字段迁移到多角色roles字段
 * 2. 如果roles字段为空或为默认值"user"，则从role字段复制
 * 3. 如果roles字段已有值，保持不变
 * 4. 输出迁移统计信息
 * 
 * 使用方法：
 * node scripts/migrate-user-roles.mjs
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '../.env') });

async function migrateUserRoles() {
  let connection;
  
  try {
    // 连接数据库
    console.log('正在连接数据库...');
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('✅ 数据库连接成功\n');
    
    // 查询所有用户
    console.log('正在查询用户数据...');
    const [users] = await connection.query(`
      SELECT id, name, nickname, role, roles 
      FROM users 
      ORDER BY id
    `);
    console.log(`✅ 查询到 ${users.length} 个用户\n`);
    
    if (users.length === 0) {
      console.log('没有用户需要迁移');
      return;
    }
    
    // 统计信息
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    console.log('开始迁移角色数据...\n');
    console.log('ID\t姓名\t\t旧role\t\t旧roles\t\t新roles\t\t状态');
    console.log('='.repeat(100));
    
    // 遍历用户进行迁移
    for (const user of users) {
      const { id, name, nickname, role, roles } = user;
      const displayName = nickname || name || `用户${id}`;
      
      try {
        // 判断是否需要迁移
        // 如果roles为空、为"user"、或与role不一致，则需要迁移
        const needsMigration = !roles || roles === 'user' || roles !== role;
        
        if (!needsMigration) {
          console.log(`${id}\t${displayName.padEnd(12)}\t${role}\t\t${roles}\t\t-\t\t跳过（已有正确值）`);
          skippedCount++;
          continue;
        }
        
        // 执行迁移：将role字段的值复制到roles字段
        const newRoles = role || 'user';
        await connection.query(
          'UPDATE users SET roles = ? WHERE id = ?',
          [newRoles, id]
        );
        
        console.log(`${id}\t${displayName.padEnd(12)}\t${role}\t\t${roles || '(空)'}\t\t${newRoles}\t\t✅ 已迁移`);
        migratedCount++;
        
      } catch (error) {
        console.log(`${id}\t${displayName.padEnd(12)}\t${role}\t\t${roles}\t\t-\t\t❌ 错误: ${error.message}`);
        errorCount++;
      }
    }
    
    // 输出统计信息
    console.log('='.repeat(100));
    console.log('\n迁移完成！统计信息：');
    console.log(`  总用户数: ${users.length}`);
    console.log(`  已迁移: ${migratedCount}`);
    console.log(`  已跳过: ${skippedCount}`);
    console.log(`  失败: ${errorCount}`);
    
    // 验证迁移结果
    console.log('\n正在验证迁移结果...');
    const [result] = await connection.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN roles IS NULL OR roles = '' THEN 1 ELSE 0 END) as empty_roles,
        SUM(CASE WHEN role != roles AND roles != 'user' THEN 1 ELSE 0 END) as mismatched
      FROM users
    `);
    
    const { total, empty_roles, mismatched } = result[0];
    console.log(`  总用户数: ${total}`);
    console.log(`  roles为空: ${empty_roles}`);
    console.log(`  role与roles不匹配: ${mismatched}`);
    
    if (empty_roles === 0 && mismatched === 0) {
      console.log('\n✅ 所有用户的角色数据已正确迁移！');
    } else {
      console.log('\n⚠️  仍有部分用户的角色数据需要检查');
    }
    
  } catch (error) {
    console.error('\n❌ 迁移失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

// 执行迁移
migrateUserRoles().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
