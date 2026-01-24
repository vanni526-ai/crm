import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Teacher Delete Functionality', () => {
  let testTeacherId: number;

  beforeAll(async () => {
    // 创建测试老师
    const teacher = await db.createTeacher({
      name: '测试删除老师',
      phone: '13800138000',
      status: '活跃',
      customerType: '全职',
      notes: '用于测试删除功能',
    });
    testTeacherId = teacher.id;
  });

  it('should delete a teacher successfully', async () => {
    // 删除老师
    await db.batchDeleteTeachers([testTeacherId]);

    // 验证老师已被删除
    const teacher = await db.getTeacherById(testTeacherId);
    expect(teacher).toBeNull();
  });

  it('should delete multiple teachers successfully', async () => {
    // 创建多个测试老师
    const teacher1 = await db.createTeacher({
      name: '批量删除测试1',
      phone: '13800138001',
      status: '活跃',
    });
    const teacher2 = await db.createTeacher({
      name: '批量删除测试2',
      phone: '13800138002',
      status: '活跃',
    });

    // 批量删除
    await db.batchDeleteTeachers([teacher1.id, teacher2.id]);

    // 验证都已被删除
    const deletedTeacher1 = await db.getTeacherById(teacher1.id);
    const deletedTeacher2 = await db.getTeacherById(teacher2.id);
    expect(deletedTeacher1).toBeNull();
    expect(deletedTeacher2).toBeNull();
  });

  it('should handle deleting non-existent teacher gracefully', async () => {
    // 尝试删除不存在的老师ID
    const nonExistentId = 999999;
    
    // 不应该抛出错误
    await expect(db.batchDeleteTeachers([nonExistentId])).resolves.not.toThrow();
  });
});
