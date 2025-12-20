import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getAllTeacherNames, createTeacher, updateTeacher, getDb } from './db';
import { teachers } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('老师别名功能', () => {
  let testTeacherId: number;

  beforeAll(async () => {
    // 创建测试老师
    testTeacherId = await createTeacher({
      name: '测试老师',
      phone: '13800138000',
      status: '活跃',
      isActive: true,
    });
  });

  afterAll(async () => {
    // 清理测试数据
    const db = await getDb();
    if (db && testTeacherId) {
      await db.delete(teachers).where(eq(teachers.id, testTeacherId));
    }
  });

  it('应该能够为老师添加别名', async () => {
    // 添加别名
    await updateTeacher(testTeacherId, {
      aliases: '小测,测测,测试'
    });

    // 验证别名已保存
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const result = await db.select().from(teachers).where(eq(teachers.id, testTeacherId)).limit(1);
    const teacher = result[0];
    
    expect(teacher.aliases).toBeTruthy();
    const aliases = JSON.parse(teacher.aliases!);
    expect(aliases).toEqual(['小测', '测测', '测试']);
  });

  it('getAllTeacherNames应该返回老师名和所有别名', async () => {
    // 添加别名
    await updateTeacher(testTeacherId, {
      aliases: '小测,测测'
    });

    // 获取所有老师名
    const allNames = await getAllTeacherNames();
    
    // 应该包含真实名和别名
    expect(allNames).toContain('测试老师');
    expect(allNames).toContain('小测');
    expect(allNames).toContain('测测');
  });

  it('应该能够清空别名', async () => {
    // 先添加别名
    await updateTeacher(testTeacherId, {
      aliases: '小测,测测'
    });

    // 清空别名
    await updateTeacher(testTeacherId, {
      aliases: ''
    });

    // 验证别名已清空
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const result = await db.select().from(teachers).where(eq(teachers.id, testTeacherId)).limit(1);
    const teacher = result[0];
    
    expect(teacher.aliases).toBeNull();
  });

  it('应该正确处理别名中的空格', async () => {
    // 添加带空格的别名
    await updateTeacher(testTeacherId, {
      aliases: ' 小测 , 测测 , 测试 '
    });

    // 验证空格已被去除
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const result = await db.select().from(teachers).where(eq(teachers.id, testTeacherId)).limit(1);
    const teacher = result[0];
    
    expect(teacher.aliases).toBeTruthy();
    const aliases = JSON.parse(teacher.aliases!);
    expect(aliases).toEqual(['小测', '测测', '测试']);
  });

  it('应该过滤掉空别名', async () => {
    // 添加包含空别名的字符串
    await updateTeacher(testTeacherId, {
      aliases: '小测,,测测,,'
    });

    // 验证空别名已被过滤
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const result = await db.select().from(teachers).where(eq(teachers.id, testTeacherId)).limit(1);
    const teacher = result[0];
    
    expect(teacher.aliases).toBeTruthy();
    const aliases = JSON.parse(teacher.aliases!);
    expect(aliases).toEqual(['小测', '测测']);
  });
});
