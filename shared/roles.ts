/**
 * 用户角色枚举定义
 * 统一管理所有角色常量，避免在多个文件中重复定义
 */

// 所有可用的角色类型
export const USER_ROLES = {
  ADMIN: 'admin',
  SALES: 'sales',
  FINANCE: 'finance',
  USER: 'user',
  TEACHER: 'teacher',
  CITY_PARTNER: 'cityPartner',
} as const;

// 角色类型（TypeScript类型）
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// 角色数组（用于验证）
export const USER_ROLE_VALUES: UserRole[] = [
  USER_ROLES.ADMIN,
  USER_ROLES.SALES,
  USER_ROLES.FINANCE,
  USER_ROLES.USER,
  USER_ROLES.TEACHER,
  USER_ROLES.CITY_PARTNER,
];

// 角色显示名称映射
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.ADMIN]: '管理员',
  [USER_ROLES.SALES]: '销售',
  [USER_ROLES.FINANCE]: '财务',
  [USER_ROLES.USER]: '普通用户',
  [USER_ROLES.TEACHER]: '老师',
  [USER_ROLES.CITY_PARTNER]: '城市合伙人',
};

// 角色描述
export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [USER_ROLES.ADMIN]: '拥有系统所有权限，可以管理用户、订单、财务等所有模块',
  [USER_ROLES.SALES]: '可以管理订单、客户、查看销售统计等',
  [USER_ROLES.FINANCE]: '可以管理财务、对账、查看财务报表等',
  [USER_ROLES.USER]: '普通用户，可以查看自己的订单和课程',
  [USER_ROLES.TEACHER]: '老师，可以查看自己的课程安排和收入',
  [USER_ROLES.CITY_PARTNER]: '城市合伙人，可以查看所在城市的业绩和收入',
};

/**
 * 检查角色是否有效
 */
export function isValidRole(role: string): role is UserRole {
  return USER_ROLE_VALUES.includes(role as UserRole);
}

/**
 * 解析多角色字符串（逗号分隔）
 */
export function parseRoles(rolesString: string | null | undefined): UserRole[] {
  if (!rolesString) return [];
  return rolesString
    .split(',')
    .map(r => r.trim())
    .filter(r => isValidRole(r)) as UserRole[];
}

/**
 * 将角色数组转换为字符串（逗号分隔）
 */
export function stringifyRoles(roles: UserRole[]): string {
  return roles.join(',');
}

/**
 * 检查用户是否拥有指定角色
 */
export function hasRole(userRoles: string | null | undefined, targetRole: UserRole): boolean {
  const roles = parseRoles(userRoles);
  return roles.includes(targetRole);
}

/**
 * 检查用户是否拥有任一指定角色
 */
export function hasAnyRole(userRoles: string | null | undefined, targetRoles: UserRole[]): boolean {
  const roles = parseRoles(userRoles);
  return targetRoles.some(targetRole => roles.includes(targetRole));
}

/**
 * 检查用户是否拥有所有指定角色
 */
export function hasAllRoles(userRoles: string | null | undefined, targetRoles: UserRole[]): boolean {
  const roles = parseRoles(userRoles);
  return targetRoles.every(targetRole => roles.includes(targetRole));
}
