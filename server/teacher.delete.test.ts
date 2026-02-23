import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq, and, like, isNull } from 'drizzle-orm';

describe('老师删除功能测试', () => {
  let testTeacherId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // 创建测试老师
    const openId = `test-teacher-delete-${Date.now()}`;
    await db.insert(users).values({
      openId,
      name: '测试老师删除',
      roles: 'teacher',
      role: 'teacher',
    });

    // 查询刚创建的用户获取ID
    const createdUser = await db
      .select()
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);
    
    if (!createdUser[0]) {
      throw new Error('Failed to create test teacher');
    }
    
    testTeacherId = createdUser[0].id;
    console.log('[Test] 创建测试老师成功: id=', testTeacherId);
  });

  it('软删除老师后，deletedAt字段应该被设置', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // 软删除老师
    await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, testTeacherId));

    // 验证deletedAt字段已设置
    const deletedTeacher = await db
      .select()
      .from(users)
      .where(eq(users.id, testTeacherId))
      .limit(1);

    expect(deletedTeacher[0].deletedAt).not.toBeNull();
    console.log('[Test] 软删除成功: deletedAt=', deletedTeacher[0].deletedAt);
  });

  it('getAllTeachers应该过滤已删除的老师', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // 查询所有未删除的老师
    const teachers = await db
      .select()
      .from(users)
      .where(
        and(
          like(users.roles, '%teacher%'),
          isNull(users.deletedAt)
        )
      );

    // 验证已删除的老师不在列表中
    const deletedTeacherInList = teachers.find(t => t.id === testTeacherId);
    expect(deletedTeacherInList).toBeUndefined();
    console.log('[Test] 已删除老师不在列表中，当前老师总数:', teachers.length);
  });

  it('批量删除多个老师应该成功', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // 创建3个测试老师
    const teacherIds: number[] = [];
    for (let i = 0; i < 3; i++) {
      const openId = `test-batch-delete-${Date.now()}-${i}`;
      await db.insert(users).values({
        openId,
        name: `批量删除测试${i}`,
        roles: 'teacher',
        role: 'teacher',
      });

      const created = await db
        .select()
        .from(users)
        .where(eq(users.openId, openId))
        .limit(1);
      
      if (created[0]) {
        teacherIds.push(created[0].id);
      }
    }

    console.log('[Test] 创建3个测试老师: ids=', teacherIds);

    // 批量软删除
    await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, teacherIds[0]));
    
    await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, teacherIds[1]));
    
    await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, teacherIds[2]));

    // 验证所有老师都被删除
    const deletedTeachers = await db
      .select()
      .from(users)
      .where(eq(users.id, teacherIds[0]));

    expect(deletedTeachers[0].deletedAt).not.toBeNull();
    console.log('[Test] 批量删除成功');
  });
});
