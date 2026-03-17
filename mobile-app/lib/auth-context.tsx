import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import sdkApi from "./sdk/api";
import { setToken as setApiToken, getToken as getApiToken, clearToken as clearApiToken } from "./api-client";

// Token存储键
const USER_INFO_KEY = "auth_user_info";
const USER_CREDENTIALS_KEY = "auth_user_credentials";

// 用户类型
interface User {
  id: number;
  openId?: string;
  name: string;
  phone?: string;
  role: string;
  roles?: string;
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

  useEffect(() => {
    checkAuthStatus();
  }, []);

  /** 检查认证状态 - 本地token + 远程验证 */
  const checkAuthStatus = async () => {
    try {
      dispatch({ type: "SET_LOADING", loading: true });

      // 检查本地存储的token和用户信息
      const token = await getApiToken();
      const userInfoStr = await AsyncStorage.getItem(USER_INFO_KEY);

      if (token && userInfoStr) {
        try {
          const user = JSON.parse(userInfoStr) as User;
          // 同步token到SDK
          await sdkApi.setToken(token);
          dispatch({ type: "AUTH_SUCCESS", user });

          // 后台验证token有效性
          const verification = await sdkApi.auth.verifyToken();
          if (!verification.valid) {
            console.warn('[Auth] Token expired, attempting re-login');
            const credStr = await AsyncStorage.getItem(USER_CREDENTIALS_KEY);
            if (credStr) {
              const { username, password } = JSON.parse(credStr);
              const result = await sdkApi.auth.login({ username, password });
              if (result.success && result.token) {
                await setApiToken(result.token);
                return;
              }
            }
            // 重新登录失败
            dispatch({ type: "AUTH_FAILURE", error: "" });
          }
          return;
        } catch (e) {
          console.warn('[Auth] Failed to parse stored user info');
        }
      }

      dispatch({ type: "AUTH_FAILURE", error: "" });
    } catch (error: any) {
      console.log("Auth check failed:", error.message);
      dispatch({ type: "AUTH_FAILURE", error: "" });
    }
  };

  /** 用户名密码登录 */
  const login = async (username: string, password: string): Promise<boolean> => {
    dispatch({ type: "AUTH_START" });
    try {
      console.log('[Auth] Login attempt:', username, 'Platform:', Platform.OS);

      // 调用SDK登录
      const result = await sdkApi.auth.login({ username, password });

      if (result && result.success && result.token) {
        // 同步token到api-client
        await setApiToken(result.token);

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

        await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
        await AsyncStorage.setItem("user", JSON.stringify(user));
        await AsyncStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify({ username, password }));
        await AsyncStorage.setItem("auth_token", result.token);

        dispatch({ type: "AUTH_SUCCESS", user });
        return true;
      } else {
        dispatch({
          type: "AUTH_FAILURE",
          error: result?.error || result?.message || "登录失败，请检查用户名和密码",
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

  /** OAuth登录（保留备用） */
  const loginWithOAuth = async (): Promise<boolean> => {
    dispatch({ type: "AUTH_FAILURE", error: "请使用用户名密码登录" });
    return false;
  };

  /** 登出 */
  const logout = async () => {
    try {
      await sdkApi.auth.logout();
    } catch {
      /* ignore */
    }
    await clearApiToken();
    await AsyncStorage.removeItem(USER_INFO_KEY);
    await AsyncStorage.removeItem(USER_CREDENTIALS_KEY);
    await AsyncStorage.removeItem("auth_token");
    await AsyncStorage.removeItem("user");
    dispatch({ type: "LOGOUT" });
  };

  /** 切换角色时重新登录 */
  const reLoginWithRole = async (role: string): Promise<boolean> => {
    try {
      const credentialsStr = await AsyncStorage.getItem(USER_CREDENTIALS_KEY);
      if (!credentialsStr) return false;

      const { username, password } = JSON.parse(credentialsStr);
      await logout();
      dispatch({ type: "SET_LOADING", loading: true });
      return await login(username, password);
    } catch (error: any) {
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
