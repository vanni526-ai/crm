import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { updateTeacher, getAllTeachers, getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('老师信息更新修复验证', () => {
  let testUserId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const result = await db.insert(users).values({
      openId: `test_update_fix_${Date.now()}`,
      name: '更新测试老师',
      phone: '13700137099',
      roles: 'teacher',
      role: 'teacher',
    });
    testUserId = Number(result[0].insertId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (db && testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it('更新 category 后 getAllTeachers 应该返回新值', async () => {
    await updateTeacher(testUserId, { category: '本部老师' });
    const teachers = await getAllTeachers();
    const teacher = teachers.find(t => t.id === testUserId);
    expect(teacher).toBeDefined();
    expect(teacher?.category).toBe('本部老师');
  });

  it('更新 customerType 后 getAllTeachers 应该返回新值', async () => {
    await updateTeacher(testUserId, { customerType: '成人学员' });
    const teachers = await getAllTeachers();
    const teacher = teachers.find(t => t.id === testUserId);
    expect(teacher?.customerType).toBe('成人学员');
  });

  it('更新 teacherAttribute 后 getAllTeachers 应该返回新值', async () => {
    await updateTeacher(testUserId, { teacherAttribute: 'S' });
    const teachers = await getAllTeachers();
    const teacher = teachers.find(t => t.id === testUserId);
    expect(teacher?.teacherAttribute).toBe('S');
  });

  it('更新 notes 后 getAllTeachers 应该返回新值', async () => {
    await updateTeacher(testUserId, { notes: '这是测试备注' });
    const teachers = await getAllTeachers();
    const teacher = teachers.find(t => t.id === testUserId);
    expect(teacher?.notes).toBe('这是测试备注');
  });

  it('更新 aliases 后 getAllTeachers 应该返回新值', async () => {
    await updateTeacher(testUserId, { aliases: '别名A,别名B' });
    const teachers = await getAllTeachers();
    const teacher = teachers.find(t => t.id === testUserId);
    // aliases 在 users 表中存为 JSON 数组字符串
    expect(teacher?.aliases).toBeTruthy();
  });
});
