/**
 * 用户角色常量和类型定义
 * 
 * 系统支持5种用户角色，同一用户可拥有多个角色（多选）
 * 角色以逗号分隔的字符串存储在 `roles` 字段中
 */

// 角色常量
export const USER_ROLES = ["admin", "teacher", "user", "sales", "cityPartner"] as const;

// 角色类型
export type UserRole = typeof USER_ROLES[number];

// 角色中文名称映射
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "管理员",
  teacher: "老师",
  user: "学员",
  sales: "销售",
  cityPartner: "合伙人",
};

// 角色首页路由映射
export const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  admin: "/(admin)",
  teacher: "/(teacher)",
  user: "/(tabs)",  // 学员使用现有的tabs首页
  sales: "/(sales)",
  cityPartner: "/(partner)",
};

// 中文角色名到英文角色名的映射
const CHINESE_ROLE_MAP: Record<string, UserRole> = {
  '管理员': 'admin',
  '老师': 'teacher',
  '教师': 'teacher',
  '学员': 'user',
  '普通用户': 'user',
  '用户': 'user',
  '销售': 'sales',
  '合伙人': 'cityPartner',
  '城市合伙人': 'cityPartner',
};

/**
 * 解析角色字符串为数组
 * @param rolesStr 角色字符串，支持英文逗号和中文顿号分隔，如 "admin,teacher" 或 "老师、合伙人"
 * @returns 角色数组，如 ["admin", "teacher"] 或 ["teacher", "cityPartner"]
 */
export function parseRoles(rolesStr: string | string[] | null | undefined): UserRole[] {
  // 处理空值
  if (!rolesStr) return ["user"];
  
  // 如果已经是数组，直接过滤
  if (Array.isArray(rolesStr)) {
    return rolesStr.filter((r): r is UserRole =>
      USER_ROLES.includes(r as UserRole)
    );
  }
  
  // 如果不是字符串，转换为字符串
  const str = typeof rolesStr === 'string' ? rolesStr : String(rolesStr);
  
  // 支持英文逗号、中文顿号、中文逗号分割
  const roles = str.split(/[,、，]/).map(r => r.trim());
  
  // 转换并过滤角色
  const result: UserRole[] = [];
  for (const role of roles) {
    // 先检查是否是英文角色名
    if (USER_ROLES.includes(role as UserRole)) {
      result.push(role as UserRole);
    }
    // 再检查是否是中文角色名
    else if (CHINESE_ROLE_MAP[role]) {
      result.push(CHINESE_ROLE_MAP[role]);
    }
  }
  
  // 如果没有有效角色，返回默认的 user 角色
  return result.length > 0 ? result : ["user"];
}

/**
 * 检查用户是否拥有某个角色
 * @param rolesStr 角色字符串
 * @param role 要检查的角色
 * @returns 是否拥有该角色
 */
export function hasRole(rolesStr: string | string[] | null | undefined, role: UserRole): boolean {
  return parseRoles(rolesStr).includes(role);
}

/**
 * 检查用户是否拥有任一角色
 * @param rolesStr 角色字符串
 * @param checkRoles 要检查的角色列表
 * @returns 是否拥有任一角色
 */
export function hasAnyRole(rolesStr: string | string[] | null | undefined, checkRoles: UserRole[]): boolean {
  const roles = parseRoles(rolesStr);
  return checkRoles.some(r => roles.includes(r));
}

/**
 * 获取角色的中文名称
 * @param role 角色
 * @returns 中文名称
 */
export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role];
}

/**
 * 获取角色的首页路由
 * @param role 角色
 * @returns 首页路由
 */
export function getRoleHomeRoute(role: UserRole): string {
  return ROLE_HOME_ROUTES[role];
}
