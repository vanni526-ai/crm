import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Teacher Attribute Feature', () => {
  const timestamp = Date.now();
  
  it('should create teacher with teacherAttribute field', async () => {
    const teachers = [{
      name: `测试老师属性S_${timestamp}`,
      phone: '13800138888',
      status: '活跃',
      teacherAttribute: 'S' as const,
      city: '重庆',
    }];

    const { results, stats } = await db.batchCreateTeachers(teachers);
    
    expect(results.length).toBeGreaterThan(0);
    expect(stats.created).toBeGreaterThan(0);
    
    // 验证创建的老师包含teacherAttribute字段
    const createdTeacher = await db.getTeacherById(results[0].id);
    expect(createdTeacher).toBeDefined();
    expect(createdTeacher?.teacherAttribute).toBe('S');
  }, 30000);

  it('should create teacher with teacherAttribute=M', async () => {
    const teachers = [{
      name: `测试老师属性M_${timestamp}`,
      phone: '13800138889',
      status: '活跃',
      teacherAttribute: 'M' as const,
      city: '上海',
    }];

    const { results } = await db.batchCreateTeachers(teachers);
    
    const createdTeacher = await db.getTeacherById(results[0].id);
    expect(createdTeacher?.teacherAttribute).toBe('M');
  }, 30000);

  it('should create teacher with teacherAttribute=Switch', async () => {
    const teachers = [{
      name: `测试老师属性Switch_${timestamp}`,
      phone: '13800138890',
      status: '活跃',
      teacherAttribute: 'Switch' as const,
      city: '天津',
    }];

    const { results } = await db.batchCreateTeachers(teachers);
    
    const createdTeacher = await db.getTeacherById(results[0].id);
    expect(createdTeacher?.teacherAttribute).toBe('Switch');
  }, 30000);

  it('should create teacher without teacherAttribute (optional field)', async () => {
    const teachers = [{
      name: `测试老师无属性_${timestamp}`,
      phone: '13800138891',
      status: '活跃',
      city: '重庆',
    }];

    const { results } = await db.batchCreateTeachers(teachers);
    
    const createdTeacher = await db.getTeacherById(results[0].id);
    expect(createdTeacher).toBeDefined();
    // teacherAttribute应该是null或undefined
    expect(createdTeacher?.teacherAttribute == null).toBe(true); // null或undefined都可以
  }, 30000);

  it('should update teacher teacherAttribute', async () => {
    // 先创建一个老师
    const teachers = [{
      name: `测试更新老师属性_${timestamp}`,
      phone: '13800138892',
      status: '活跃',
      teacherAttribute: 'S' as const,
      city: '重庆',
    }];

    const { results } = await db.batchCreateTeachers(teachers);
    const teacherId = results[0].id;
    
    // 更新teacherAttribute
    await db.updateTeacher(teacherId, { teacherAttribute: 'M' });
    
    // 验证更新
    const updatedTeacher = await db.getTeacherById(teacherId);
    expect(updatedTeacher?.teacherAttribute).toBe('M');
  }, 30000);
});
