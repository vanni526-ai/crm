import { useState, useEffect } from "react";
import { useLocation } from "wouter";

interface AuthUser {
  id: number;
  name: string;
  nickname?: string;
  email?: string;
  role: "admin" | "sales" | "finance" | "user";
  username: string;
}

export function usePasswordAuth() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 从localStorage读取认证信息
    const token = localStorage.getItem("auth_token");
    const userStr = localStorage.getItem("auth_user");
    
    if (token && userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (error) {
        console.error("Failed to parse user data:", error);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
    }
    
    setIsLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setUser(null);
    setLocation("/login");
  };

  const isAuthenticated = !!user;

  return {
    user,
    isAuthenticated,
    isLoading,
    logout,
  };
}
