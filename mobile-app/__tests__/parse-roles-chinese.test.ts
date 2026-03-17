import { describe, it, expect } from 'vitest';
import { parseRoles } from '../src/constants/roles';

describe('parseRoles - Chinese role names support', () => {
  it('should parse Chinese role names with Chinese comma (、)', () => {
    const result = parseRoles('老师、合伙人');
    expect(result).toEqual(['teacher', 'cityPartner']);
  });

  it('should parse Chinese role names with Chinese comma (,)', () => {
    const result = parseRoles('老师,合伙人');
    expect(result).toEqual(['teacher', 'cityPartner']);
  });

  it('should parse Chinese role names with English comma', () => {
    const result = parseRoles('老师,合伙人');
    expect(result).toEqual(['teacher', 'cityPartner']);
  });

  it('should parse single Chinese role name', () => {
    expect(parseRoles('老师')).toEqual(['teacher']);
    expect(parseRoles('管理员')).toEqual(['admin']);
    expect(parseRoles('学员')).toEqual(['user']);
    expect(parseRoles('销售')).toEqual(['sales']);
    expect(parseRoles('合伙人')).toEqual(['cityPartner']);
  });

  it('should parse mixed English and Chinese role names', () => {
    const result = parseRoles('admin、老师');
    expect(result).toEqual(['admin', 'teacher']);
  });

  it('should handle spaces around role names', () => {
    const result = parseRoles(' 老师 、 合伙人 ');
    expect(result).toEqual(['teacher', 'cityPartner']);
  });

  it('should handle alternative Chinese names', () => {
    expect(parseRoles('教师')).toEqual(['teacher']);
    expect(parseRoles('普通用户')).toEqual(['user']);
    expect(parseRoles('用户')).toEqual(['user']);
    expect(parseRoles('城市合伙人')).toEqual(['cityPartner']);
  });

  it('should return default user role for invalid Chinese names', () => {
    const result = parseRoles('无效角色');
    expect(result).toEqual(['user']);
  });

  it('should filter out invalid roles and keep valid ones', () => {
    const result = parseRoles('老师、无效角色、合伙人');
    expect(result).toEqual(['teacher', 'cityPartner']);
  });

  it('should handle complex multi-role string', () => {
    const result = parseRoles('管理员、老师、合伙人、销售');
    expect(result).toEqual(['admin', 'teacher', 'cityPartner', 'sales']);
  });

  it('should maintain backward compatibility with English role names', () => {
    const result = parseRoles('admin,teacher,cityPartner');
    expect(result).toEqual(['admin', 'teacher', 'cityPartner']);
  });
});
