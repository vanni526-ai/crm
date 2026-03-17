import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./sdk/api";

// Token存储键
const USER_INFO_KEY = "auth_user_info";
const USER_CREDENTIALS_KEY = "auth_user_credentials";

// 用户类型
interface User {
  id: number;
  openId?: string;
  name: string;
  phone?: string;
  role: string;   // 兼容旧字段
  roles?: string; // 多角色，逗号分隔
}

// 认证状态
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
}

// Action类型
type AuthAction =
  | { type: "AUTH_START" }
  | { type: "AUTH_SUCCESS"; user: User }
  | { type: "AUTH_FAILURE"; error: string }
  | { type: "LOGOUT" }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_LOADING"; loading: boolean };

// 初始状态
const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTH_START":
      return { ...state, isLoading: true, error: null };
    case "AUTH_SUCCESS":
      return { ...state, isAuthenticated: true, isLoading: false, user: action.user, error: null };
    case "AUTH_FAILURE":
      return { ...state, isAuthenticated: false, isLoading: false, user: null, error: action.error };
    case "LOGOUT":
      return { ...state, isAuthenticated: false, isLoading: false, user: null, error: null };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    case "SET_LOADING":
      return { ...state, isLoading: action.loading };
    default:
      return state;
  }
}

// Context
interface AuthContextType {
  state: AuthState;
  login: (username: string, password: string) => Promise<boolean>;
  loginWithOAuth: () => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  checkAuth: () => Promise<void>;
  reLoginWithRole: (role: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 检查登录状态
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // 检查认证状态 - 只检查本地存储，不调用后端验证
  // 因为后端auth.me不支持通过URL参数token验证（Cloudflare限制）
  const checkAuthStatus = async () => {
    try {
      dispatch({ type: "SET_LOADING", loading: true });
      
      // 检查本地存储的token和用户信息
      const token = await api.getToken();
      const userInfoStr = await AsyncStorage.getItem(USER_INFO_KEY);
      
      console.log('[Auth] checkAuthStatus: token exists:', !!token, ', userInfo exists:', !!userInfoStr);
      
      if (token && userInfoStr) {
        try {
          const user = JSON.parse(userInfoStr) as User;
          console.log('[Auth] Restoring session for user:', user.name || user.id);
          dispatch({ type: "AUTH_SUCCESS", user });
          return;
        } catch (e) {
          console.warn('[Auth] Failed to parse stored user info');
        }
      }
      
      // 没有有效的本地会话
      dispatch({ type: "AUTH_FAILURE", error: "" });
    } catch (error: any) {
      console.log("Auth check failed:", error.message);
      dispatch({ type: "AUTH_FAILURE", error: "" });
    }
  };

  // 用户名密码登录
  const login = async (username: string, password: string): Promise<boolean> => {
    dispatch({ type: "AUTH_START" });
    try {
      console.log('[Auth] ========================================');
      console.log('[Auth] Platform:', Platform.OS);
      console.log('[Auth] Attempting login with username:', username);
      console.log('[Auth] ========================================');
      
      // 调用SDK登录接口
      const result = await api.auth.login({ username, password });
      
      if (result && result.success && result.token) {
        // 构建用户对象 - 后端返回: {id, name, nickname, email, role}
        const u = result.user as any;
        const user: User = u ? {
          id: u.id,
          openId: u.openId || '',
          name: u.nickname || u.name || u.relatedName || username,
          phone: u.phone || '',
          role: u.role || u.identity || 'user',
          roles: u.roles || u.role || u.identity || 'user',
        } : {
          id: 0,
          name: username,
          role: 'user',
          roles: 'user',
        };
        
        // 保存用户信息
        await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
        await AsyncStorage.setItem("user", JSON.stringify(user));
        await AsyncStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify({ username, password }));
        
        if (result.token) {
          await AsyncStorage.setItem("auth_token", result.token);
          console.log('[Auth] Token saved:', result.token.substring(0, 20) + '...');
        }
        
        dispatch({ type: "AUTH_SUCCESS", user });
        return true;
      } else {
        dispatch({
          type: "AUTH_FAILURE",
          error: result?.error || "登录失败，请检查用户名和密码",
        });
        return false;
      }
    } catch (error: any) {
      dispatch({
        type: "AUTH_FAILURE",
        error: error.message || "登录失败，请检查网络连接",
      });
      return false;
    }
  };

  // OAuth登录（保留作为备用）
  const loginWithOAuth = async (): Promise<boolean> => {
    dispatch({ type: "AUTH_FAILURE", error: "请使用用户名密码登录" });
    return false;
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
    await AsyncStorage.removeItem(USER_INFO_KEY);
    await AsyncStorage.removeItem(USER_CREDENTIALS_KEY);
    await AsyncStorage.removeItem("auth_token");
    await AsyncStorage.removeItem("user");
    dispatch({ type: "LOGOUT" });
  };

  // 切换角色时自动重新登录
  const reLoginWithRole = async (role: string): Promise<boolean> => {
    try {
      console.log('[Auth] Re-login with role:', role);
      
      const credentialsStr = await AsyncStorage.getItem(USER_CREDENTIALS_KEY);
      if (!credentialsStr) {
        console.error('[Auth] No saved credentials found');
        return false;
      }
      
      const { username, password } = JSON.parse(credentialsStr);
      
      // 清除当前登录状态
      await logout();
      dispatch({ type: "SET_LOADING", loading: true });
      
      // 重新登录
      return await login(username, password);
    } catch (error: any) {
      console.error('[Auth] Re-login error:', error);
      dispatch({ type: "AUTH_FAILURE", error: error.message || "重新登录失败" });
      return false;
    }
  };

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const checkAuth = async () => {
    await checkAuthStatus();
  };

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        loginWithOAuth,
        logout,
        clearError,
        checkAuth,
        reLoginWithRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
