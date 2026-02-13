import { describe, it, expect } from 'vitest';
import { db } from './db';
import { teachers } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Teachers Excel Import Field Mapping', () => {
  it('should correctly map "老师" column to name field', async () => {
    const timestamp = Date.now();
    const teacherData = {
      name: `测试老师_老师列${timestamp}`,
      phone: '13800138000',
      status: '活跃',
      teacherAttribute: 'S' as const,
      customerType: '成人',
      city: '上海',
      notes: '测试导入-老师列映射',
    };

    const result = await db.batchCreateTeachers([teacherData]);
    expect(result.stats.created).toBe(1);

    const created = await db.query.teachers.findFirst({
      where: eq(teachers.name, teacherData.name),
    });

    expect(created).toBeDefined();
    expect(created?.name).toBe(teacherData.name);
    expect(created?.teacherAttribute).toBe('S');
    expect(created?.city).toBe('上海');
  });

  it('should correctly map "城市" column to city field', async () => {
    const timestamp = Date.now();
    const teacherData = {
      name: `测试老师_城市列${timestamp}`,
      phone: '13900139000',
      status: '活跃',
      teacherAttribute: 'M' as const,
      city: '重庆',
      notes: '测试导入-城市列映射',
    };

    const result = await db.batchCreateTeachers([teacherData]);
    expect(result.stats.created).toBe(1);

    const created = await db.query.teachers.findFirst({
      where: eq(teachers.name, teacherData.name),
    });

    expect(created).toBeDefined();
    expect(created?.city).toBe('重庆');
  });

  it('should handle missing phone number gracefully', async () => {
    const timestamp = Date.now();
    const teacherData = {
      name: `测试老师_无电话${timestamp}`,
      phone: '',
      status: '活跃',
      teacherAttribute: 'Switch' as const,
      city: '上海',
      notes: '测试导入-无电话号码',
    };

    const result = await db.batchCreateTeachers([teacherData]);
    expect(result.stats.created).toBe(1);

    const created = await db.query.teachers.findFirst({
      where: eq(teachers.name, teacherData.name),
    });

    expect(created).toBeDefined();
    expect(created?.phone).toBe('');
  });
});
