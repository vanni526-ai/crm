import { describe, it, expect } from 'vitest';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';

describe('批量更新老师属性和备注', () => {
  it('应该成功批量更新老师属性和备注', async () => {
    const drizzle = await getDb();
    if (!drizzle) {
      throw new Error('数据库连接失败');
    }

    // 读取更新数据
    const updatesJson = fs.readFileSync('/home/ubuntu/teacher_updates.json', 'utf-8');
    const updates = JSON.parse(updatesJson);

    console.log(`准备更新 ${updates.length} 位老师的数据...`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ userId: number; error: string }>,
    };

    // 逐个更新
    for (const update of updates) {
      try {
        // 检查用户是否存在
        const [existingUser] = await drizzle
          .select()
          .from(users)
          .where(eq(users.id, update.userId))
          .limit(1);

        if (!existingUser) {
          results.failed++;
          results.errors.push({
            userId: update.userId,
            error: '用户不存在',
          });
          continue;
        }

        // 准备更新数据
        const updateData: any = {};
        if (update.teacherAttribute) {
          updateData.teacherAttribute = update.teacherAttribute;
        }
        if (update.teacherNotes !== undefined) {
          updateData.teacherNotes = update.teacherNotes;
        }

        // 执行更新
        if (Object.keys(updateData).length > 0) {
          await drizzle
            .update(users)
            .set(updateData)
            .where(eq(users.id, update.userId));
          results.success++;
          console.log(`✓ 成功更新用户 ${update.userId} (${existingUser.name})`);
        } else {
          results.failed++;
          results.errors.push({
            userId: update.userId,
            error: '无需要更新的字段',
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId: update.userId,
          error: error instanceof Error ? error.message : '未知错误',
        });
        console.error(`✗ 更新用户 ${update.userId} 失败:`, error);
      }
    }

    console.log('\n更新结果:');
    console.log(`成功: ${results.success}`);
    console.log(`失败: ${results.failed}`);
    if (results.errors.length > 0) {
      console.log('\n失败详情:');
      results.errors.forEach(err => {
        console.log(`  用户 ${err.userId}: ${err.error}`);
      });
    }

    // 验证更新结果
    expect(results.success).toBeGreaterThan(0);
    expect(results.failed).toBe(0);

    // 随机抽查几个用户验证更新是否成功
    const sampleUserIds = [updates[0].userId, updates[Math.floor(updates.length / 2)].userId, updates[updates.length - 1].userId];
    for (const userId of sampleUserIds) {
      const [user] = await drizzle
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      const expectedUpdate = updates.find((u: any) => u.userId === userId);
      if (user && expectedUpdate) {
        expect(user.teacherAttribute).toBe(expectedUpdate.teacherAttribute);
        expect(user.teacherNotes).toBe(expectedUpdate.teacherNotes);
        console.log(`\n验证用户 ${userId} (${user.name}):`);
        console.log(`  属性: ${user.teacherAttribute}`);
        console.log(`  备注: ${user.teacherNotes?.substring(0, 50)}...`);
      }
    }
  }, 120000); // 设置超时时间为120秒
});
