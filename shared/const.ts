export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

// 用户角色常量
export const USER_ROLES = ["admin", "teacher", "user", "sales", "cityPartner"] as const;
export type UserRole = typeof USER_ROLES[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "管理员",
  teacher: "老师",
  user: "普通用户",
  sales: "销售",
  cityPartner: "城市合伙人",
};

/**
 * 解析角色字符串为角色数组
 * @param rolesStr 逗号分隔的角色字符串，如 "admin,teacher"
 * @returns 角色数组
 */
export function parseRoles(rolesStr: string | null | undefined): UserRole[] {
  if (!rolesStr) return ["user"];
  return rolesStr.split(",").filter((r): r is UserRole => USER_ROLES.includes(r as UserRole));
}

/**
 * 将角色数组序列化为字符串
 * @param roles 角色数组
 * @returns 逗号分隔的角色字符串
 */
export function serializeRoles(roles: UserRole[]): string {
  return roles.length > 0 ? roles.join(",") : "user";
}

/**
 * 检查用户是否拥有指定角色
 * @param rolesStr 用户的roles字段值
 * @param role 要检查的角色
 */
export function hasRole(rolesStr: string | null | undefined, role: UserRole): boolean {
  const roles = parseRoles(rolesStr);
  return roles.includes(role);
}

/**
 * 检查用户是否拥有任一指定角色
 * @param rolesStr 用户的roles字段值
 * @param checkRoles 要检查的角色列表
 */
export function hasAnyRole(rolesStr: string | null | undefined, checkRoles: UserRole[]): boolean {
  const roles = parseRoles(rolesStr);
  return checkRoles.some(r => roles.includes(r));
}
