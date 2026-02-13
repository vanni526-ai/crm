import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { batchCreateTeachers } from './db';
import { getDb } from './db';
import { users, teachers, userRoleCities } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

describe('Teachers Import with User Creation', () => {
  let createdTeacherIds: number[] = [];
  let createdUserIds: number[] = [];

  afterAll(async () => {
    // 清理测试数据
    const db = await getDb();
    if (!db) return;

    // 删除创建的老师记录
    if (createdTeacherIds.length > 0) {
      for (const id of createdTeacherIds) {
        await db.delete(teachers).where(eq(teachers.id, id));
      }
    }

    // 删除创建的用户记录
    if (createdUserIds.length > 0) {
      for (const id of createdUserIds) {
        await db.delete(userRoleCities).where(eq(userRoleCities.userId, id));
        await db.delete(users).where(eq(users.id, id));
      }
    }
  });

  it('should create user account when importing teacher', async () => {
    const testTeachers = [
      {
        name: '测试导入老师A',
        phone: '13800000001',
        status: '活跃',
        customerType: '成人',
        category: '本部老师',
        city: '重庆',
      },
    ];

    const results = await batchCreateTeachers(testTeachers);
    
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('测试导入老师A');
    expect(results[0].userId).toBeDefined();

    createdTeacherIds.push(results[0].id);
    createdUserIds.push(results[0].userId);

    // 验证users表中创建了对应记录
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const user = await db.select().from(users).where(eq(users.id, results[0].userId)).limit(1);
    expect(user).toHaveLength(1);
    expect(user[0].name).toBe('测试导入老师A');
    expect(user[0].phone).toBe('13800000001');
    expect(user[0].password).toBe('123456');
    expect(user[0].roles).toContain('teacher');
    expect(user[0].roles).toContain('user');
    expect(user[0].isActive).toBe(true);
  });

  it('should create userRoleCities when teacher has city', async () => {
    const testTeachers = [
      {
        name: '测试导入老师B',
        phone: '13800000002',
        status: '活跃',
        customerType: '成人',
        category: '本部老师',
        city: '重庆;上海',
      },
    ];

    const results = await batchCreateTeachers(testTeachers);
    
    expect(results).toHaveLength(1);
    createdTeacherIds.push(results[0].id);
    createdUserIds.push(results[0].userId);

    // 验证userRoleCities表中创建了对应记录
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const roleCity = await db.select().from(userRoleCities)
      .where(and(
        eq(userRoleCities.userId, results[0].userId),
        eq(userRoleCities.role, 'teacher')
      ))
      .limit(1);

    expect(roleCity).toHaveLength(1);
    const cities = JSON.parse(roleCity[0].cities);
    expect(cities).toContain('重庆');
    expect(cities).toContain('上海');
  });

  it('should update existing user when importing teacher with same name', async () => {
    // 第一次导入
    const testTeachers1 = [
      {
        name: '测试导入老师C',
        phone: '13800000003',
        status: '活跃',
        customerType: '成人',
        category: '本部老师',
      },
    ];

    const results1 = await batchCreateTeachers(testTeachers1);
    createdTeacherIds.push(results1[0].id);
    createdUserIds.push(results1[0].userId);

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // 获取第一次创建的用户ID
    const firstUserId = results1[0].userId;

    // 第二次导入同名老师
    const testTeachers2 = [
      {
        name: '测试导入老师C',
        phone: '13800000004', // 不同的电话
        status: '活跃',
        customerType: '青少年',
        category: '合伙店老师',
      },
    ];

    const results2 = await batchCreateTeachers(testTeachers2);
    createdTeacherIds.push(results2[0].id);

    // 验证使用了相同的用户ID
    expect(results2[0].userId).toBe(firstUserId);

    // 验证用户角色包含teacher
    const user = await db.select().from(users).where(eq(users.id, firstUserId)).limit(1);
    expect(user[0].roles).toContain('teacher');
    expect(user[0].roles).toContain('user');
  });
});
