import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';

describe('老师导入查重逻辑测试', () => {
  beforeAll(async () => {
    // 清理测试数据
    const dbInstance = await db.getDb();
    if (dbInstance) {
      await dbInstance.execute('DELETE FROM teachers WHERE name LIKE "测试查重%"');
      await dbInstance.execute('DELETE FROM users WHERE name LIKE "测试查重%"');
    }
  });

  afterAll(async () => {
    // 清理测试数据
    const dbInstance = await db.getDb();
    if (dbInstance) {
      // 删除测试创建的老师
      await dbInstance.execute('DELETE FROM teachers WHERE name LIKE "测试查重%"');
      await dbInstance.execute('DELETE FROM users WHERE name LIKE "测试查重%"');
    }
  });

  it('应该使用姓名+城市查重,同名同城市的老师更新现有记录', async () => {
    // 1. 第一次导入:创建"测试查重老师A"(上海)
    const firstImport = await db.batchCreateTeachers([
      {
        name: '测试查重老师A',
        phone: '13800000001',
        city: '上海',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    expect(firstImport.stats.created).toBe(1);
    expect(firstImport.stats.updated).toBe(0);
    const firstTeacherId = firstImport.results[0].id;

    // 2. 第二次导入:同名同城市,应该更新现有记录
    const secondImport = await db.batchCreateTeachers([
      {
        name: '测试查重老师A',
        phone: '13800000002', // 不同的电话
        city: '上海',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    expect(secondImport.stats.created).toBe(0);
    expect(secondImport.stats.updated).toBe(1);
    expect(secondImport.results[0].id).toBe(firstTeacherId); // 应该是同一个ID

    // 3. 验证老师记录被更新
    const teacher = await db.getTeacherById(firstTeacherId);
    expect(teacher).toBeTruthy();
    expect(teacher!.phone).toBe('13800000002'); // 电话应该被更新
  });

  it('应该允许同名但不同城市的老师创建新记录', async () => {
    // 1. 第一次导入:创建"测试查重老师B"(上海)
    const firstImport = await db.batchCreateTeachers([
      {
        name: '测试查重老师B',
        phone: '13800000003',
        city: '上海',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    expect(firstImport.stats.created).toBe(1);
    const firstTeacherId = firstImport.results[0].id;

    // 2. 第二次导入:同名但不同城市(北京),应该创建新记录
    const secondImport = await db.batchCreateTeachers([
      {
        name: '测试查重老师B',
        phone: '13800000004',
        city: '北京',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    expect(secondImport.stats.created).toBe(1);
    expect(secondImport.stats.updated).toBe(0);
    expect(secondImport.results[0].id).not.toBe(firstTeacherId); // 应该是不同的ID

    // 3. 验证两个老师记录都存在
    const teacher1 = await db.getTeacherById(firstTeacherId);
    const teacher2 = await db.getTeacherById(secondImport.results[0].id);
    expect(teacher1).toBeTruthy();
    expect(teacher2).toBeTruthy();
    expect(teacher1!.city).toBe('上海');
    expect(teacher2!.city).toBe('北京');
  });

  it('应该正确统计新增、更新、跳过的老师数量', { timeout: 15000 }, async () => {
    // 批量导入3位老师
    const firstImport = await db.batchCreateTeachers([
      {
        name: '测试查重老师C',
        phone: '13800000005',
        city: '上海',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: '测试查重老师D',
        phone: '13800000006',
        city: '北京',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: '测试查重老师E',
        phone: '13800000007',
        city: '深圳',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    expect(firstImport.stats.created).toBe(3);
    expect(firstImport.stats.updated).toBe(0);

    // 第二次导入:1个新老师,2个更新
    const secondImport = await db.batchCreateTeachers([
      {
        name: '测试查重老师C', // 更新
        phone: '13800000008',
        city: '上海',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: '测试查重老师D', // 更新
        phone: '13800000009',
        city: '北京',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: '测试查重老师F', // 新增
        phone: '13800000010',
        city: '广州',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    expect(secondImport.stats.created).toBe(1);
    expect(secondImport.stats.updated).toBe(2);
    expect(secondImport.stats.skipped).toBe(0);
  });

  it('应该为导入的老师自动创建用户账号', async () => {
    // 导入一位新老师
    const importResult = await db.batchCreateTeachers([
      {
        name: '测试查重老师G',
        phone: '13800000011',
        city: '杭州',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    expect(importResult.stats.created).toBe(1);
    const userId = importResult.results[0].userId;

    // 验证用户账号被创建
    const user = await db.getUserById(userId);
    expect(user).toBeTruthy();
    expect(user!.name).toBe('测试查重老师G');
    expect(user!.roles).toContain('teacher');
    expect(user!.roles).toContain('user');
    expect(user!.password).toBe('123456'); // 默认密码
  });
});
