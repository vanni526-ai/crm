import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseRoles, hasRole, type UserRole } from "../constants/roles";

/**
 * 用户信息接口
 */
export interface User {
  id: number;
  openId?: string;
  name: string;
  phone?: string;
  role: string;    // 兼容旧字段
  roles?: string;  // 多角色，逗号分隔
}

/**
 * 用户角色Hook返回值
 */
export interface UseUserRolesResult {
  user: User | null;
  roles: UserRole[];
  currentRole: UserRole | null;
  isAdmin: boolean;
  isTeacher: boolean;
  isSales: boolean;
  isCityPartner: boolean;
  isUser: boolean;
  hasMultipleRoles: boolean;
  setCurrentRole: (role: UserRole) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const USER_STORAGE_KEY = "user";
const CURRENT_ROLE_STORAGE_KEY = "current_role";

/**
 * 用户角色管理Hook
 * 
 * 提供用户信息、角色列表、当前选择的角色等状态管理
 * 
 * @example
 * ```tsx
 * function ProfileScreen() {
 *   const { user, roles, currentRole, isAdmin, isTeacher, hasMultipleRoles } = useUserRoles();
 *   
 *   return (
 *     <View>
 *       <Text>用户: {user?.name}</Text>
 *       <Text>角色: {roles.map(r => ROLE_LABELS[r]).join('、')}</Text>
 *       <Text>当前身份: {currentRole ? ROLE_LABELS[currentRole] : '未选择'}</Text>
 *       
 *       {hasMultipleRoles && <RoleSwitcher />}
 *       {isAdmin && <AdminPanel />}
 *       {isTeacher && <TeacherSchedule />}
 *     </View>
 *   );
 * }
 * ```
 */
export function useUserRoles(): UseUserRolesResult {
  const [user, setUser] = useState<User | null>(null);
  const [currentRole, setCurrentRoleState] = useState<UserRole | null>(null);
  // 从 AsyncStorage加载用户信息
  const loadUser = useCallback(async () => {
    try {
      // 先尝试从 user key 读取，如果没有则从 auth_user_info key 读取（向后兼容）
      let userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (!userData) {
        userData = await AsyncStorage.getItem("auth_user_info");
        // 如果从 auth_user_info 读取到了，同步到 user key
        if (userData) {
          await AsyncStorage.setItem(USER_STORAGE_KEY, userData);
        }
      }
      
      if (userData) {
        const parsedUser = JSON.parse(userData) as User;
        setUser(parsedUser);

        // 加载当前选择的角色
        const savedRole = await AsyncStorage.getItem(CURRENT_ROLE_STORAGE_KEY);
        const userRoles = parseRoles(parsedUser.roles || parsedUser.role);

        if (savedRole && userRoles.includes(savedRole as UserRole)) {
          // 使用保存的角色
          setCurrentRoleState(savedRole as UserRole);
        } else if (userRoles.length === 1) {
          // 单角色用户，自动设置为唯一角色
          setCurrentRoleState(userRoles[0]);
          await AsyncStorage.setItem(CURRENT_ROLE_STORAGE_KEY, userRoles[0]);
        } else {
          // 多角色用户，但没有保存的角色，设置为null（需要用户选择）
          setCurrentRoleState(null);
        }
      } else {
        setUser(null);
        setCurrentRoleState(null);
      }
    } catch (error) {
      console.error("Failed to load user from AsyncStorage:", error);
      setUser(null);
      setCurrentRoleState(null);
    }
  }, []);

  // 设置当前角色
  const setCurrentRole = useCallback(async (role: UserRole) => {
    if (!user) {
      console.warn("Cannot set current role: user is not logged in");
      return;
    }

    const userRoles = parseRoles(user.roles || user.role);
    if (!userRoles.includes(role)) {
      console.warn(`Cannot set current role: user does not have role "${role}"`);
      return;
    }

    try {
      await AsyncStorage.setItem(CURRENT_ROLE_STORAGE_KEY, role);
      setCurrentRoleState(role);
    } catch (error) {
      console.error("Failed to save current role to AsyncStorage:", error);
    }
  }, [user]);

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  // 初始加载
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // 解析角色列表（兼容 roles 和 role 字段）
  const roles = user ? parseRoles(user.roles || user.role) : [];

  // 角色判断（兼容 roles 和 role 字段）
  const rolesStr = user ? (user.roles || user.role) : "";
  const isAdmin = user ? hasRole(rolesStr, "admin") : false;
  const isTeacher = user ? hasRole(rolesStr, "teacher") : false;
  const isSales = user ? hasRole(rolesStr, "sales") : false;
  const isCityPartner = user ? hasRole(rolesStr, "cityPartner") : false;
  const isUser = user ? hasRole(rolesStr, "user") : false;

  // 是否有多个角色
  const hasMultipleRoles = roles.length > 1;

  return {
    user,
    roles,
    currentRole,
    isAdmin,
    isTeacher,
    isSales,
    isCityPartner,
    isUser,
    hasMultipleRoles,
    setCurrentRole,
    refreshUser,
  };
}
