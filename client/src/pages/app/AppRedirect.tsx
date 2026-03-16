import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getRoleHome } from "./components/MobileLayout";

/**
 * /app 入口重定向组件
 * 已登录用户根据角色跳转到对应首页
 * 未登录用户跳转到登录页
 */
export default function AppRedirect() {
  const [, setLocation] = useLocation();
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      setLocation("/app/login");
      return;
    }

    // 根据角色跳转
    const u = user as any;
    const rolesStr = u?.roles || u?.role || "user";
    const roles = typeof rolesStr === "string" ? rolesStr.split(",") : rolesStr;
    const homePath = getRoleHome(roles);
    setLocation(homePath);
  }, [loading, isAuthenticated, user, setLocation]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">正在跳转...</span>
      </div>
    </div>
  );
}
