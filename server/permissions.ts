/**
 * 权限中间件和数据范围控制
 * 实现基于JWT的用户身份和角色的权限控制
 */

import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "./_core/trpc";
import { USER_ROLES, hasAnyRole, hasRole, parseRoles } from "../shared/roles";
import type { UserRole } from "../shared/roles";

/**
 * 权限检查中间件工厂函数
 * @param allowedRoles 允许访问的角色列表
 * @param errorMessage 权限不足时的错误消息
 */
export function requireRoles(allowedRoles: UserRole[], errorMessage?: string) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ 
        code: "UNAUTHORIZED", 
        message: "请先登录" 
      });
    }

    // 管理员拥有所有权限
    if (hasRole(ctx.user.roles, USER_ROLES.ADMIN)) {
      return next({ ctx });
    }

    // 检查用户是否拥有任一允许的角色
    if (!hasAnyRole(ctx.user.roles, allowedRoles)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: errorMessage || `需要以下角色之一: ${allowedRoles.join(', ')}`,
      });
    }

    return next({ ctx });
  });
}

/**
 * 学员端权限中间件
 * 用于需要学员身份的接口
 */
export const userProcedure = requireRoles(
  [USER_ROLES.USER],
  "需要学员权限"
);

/**
 * 老师端权限中间件
 * 用于需要老师身份的接口
 */
export const teacherProcedure = requireRoles(
  [USER_ROLES.TEACHER],
  "需要老师权限"
);

/**
 * 城市合伙人权限中间件
 * 用于需要城市合伙人身份的接口
 */
export const cityPartnerProcedure = requireRoles(
  [USER_ROLES.CITY_PARTNER],
  "需要城市合伙人权限"
);

/**
 * 销售端权限中间件
 * 用于需要销售身份的接口
 */
export const salesProcedure = requireRoles(
  [USER_ROLES.SALES],
  "需要销售权限"
);

/**
 * 财务端权限中间件
 * 用于需要财务身份的接口
 */
export const financeProcedure = requireRoles(
  [USER_ROLES.FINANCE],
  "需要财务权限"
);

/**
 * 管理员权限中间件
 * 用于需要管理员身份的接口
 */
export const adminProcedure = requireRoles(
  [USER_ROLES.ADMIN],
  "需要管理员权限"
);

/**
 * 销售或管理员权限中间件
 */
export const salesOrAdminProcedure = requireRoles(
  [USER_ROLES.SALES, USER_ROLES.ADMIN],
  "需要销售或管理员权限"
);

/**
 * 财务或管理员权限中间件
 */
export const financeOrAdminProcedure = requireRoles(
  [USER_ROLES.FINANCE, USER_ROLES.ADMIN],
  "需要财务或管理员权限"
);

/**
 * 数据范围控制辅助函数
 */

/**
 * 获取用户的数据访问范围
 * 根据用户角色返回其可访问的数据范围
 */
export function getDataScope(ctx: { user: { id: number; roles: string | null } }) {
  const roles = parseRoles(ctx.user.roles);
  
  return {
    userId: ctx.user.id,
    roles,
    isAdmin: roles.includes(USER_ROLES.ADMIN),
    isUser: roles.includes(USER_ROLES.USER),
    isTeacher: roles.includes(USER_ROLES.TEACHER),
    isCityPartner: roles.includes(USER_ROLES.CITY_PARTNER),
    isSales: roles.includes(USER_ROLES.SALES),
    isFinance: roles.includes(USER_ROLES.FINANCE),
  };
}

/**
 * 检查用户是否有权访问指定资源
 * @param ctx tRPC上下文
 * @param resourceOwnerId 资源所有者ID
 * @param errorMessage 权限不足时的错误消息
 */
export function checkResourceOwnership(
  ctx: { user: { id: number; roles: string | null } },
  resourceOwnerId: number | null | undefined,
  errorMessage: string = "无权访问此资源"
) {
  const scope = getDataScope(ctx);
  
  // 管理员可以访问所有资源
  if (scope.isAdmin) {
    return true;
  }
  
  // 检查资源是否属于当前用户
  if (resourceOwnerId !== ctx.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: errorMessage,
    });
  }
  
  return true;
}

/**
 * 强制忽略前端传入的用户标识参数
 * 返回当前登录用户的ID
 */
export function enforceCurrentUserId(ctx: { user: { id: number } }): number {
  return ctx.user.id;
}

/**
 * 获取用户关联的城市（用于城市合伙人）
 * 从数据库中查询用户绑定的城市
 */
export async function getUserCity(userId: number): Promise<string | null> {
  // TODO: 从数据库查询用户关联的城市
  // 这里需要根据实际的数据库结构实现
  // 示例：
  // const user = await db.users.findUnique({ where: { id: userId }, include: { city: true } });
  // return user?.city?.name || null;
  
  // 临时实现：返回null，需要后续完善
  return null;
}

/**
 * 检查用户是否有权访问指定城市的数据
 */
export async function checkCityAccess(
  ctx: { user: { id: number; roles: string | null } },
  targetCity: string
): Promise<boolean> {
  const scope = getDataScope(ctx);
  
  // 管理员可以访问所有城市
  if (scope.isAdmin) {
    return true;
  }
  
  // 城市合伙人只能访问自己负责的城市
  if (scope.isCityPartner) {
    const userCity = await getUserCity(ctx.user.id);
    if (userCity !== targetCity) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "无权访问其他城市的数据",
      });
    }
    return true;
  }
  
  // 其他角色不能按城市访问数据
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "无权访问城市数据",
  });
}
