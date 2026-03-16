import MobileLayout from "../components/MobileLayout";
import { GlassCard, PageHeader } from "../components/GlassCard";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { User, Phone, Mail, LogOut, ChevronRight, Shield, Lock } from "lucide-react";
import { getRoleHome } from "../components/MobileLayout";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function TeacherProfile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const u = user as any;
  const userName = u?.nickname || u?.name || "老师";
  const userRoles = (u?.roles || u?.role || "teacher").toString().split(",");

  const roleLabels: Record<string, string> = {
    admin: "管理员", teacher: "老师", user: "普通用户",
    sales: "销售", finance: "财务", cityPartner: "城市合伙人",
  };

  const handleLogout = async () => {
    if (confirm("确定要退出登录吗？")) {
      await logout();
      window.location.href = "/app/login";
    }
  };

  return (
    <MobileLayout>
      <PageHeader title="个人中心" />

      <div className="px-4 pb-6 space-y-4">
        {/* 用户信息 */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{userName[0]}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-white text-lg font-bold">{userName}</h2>
              <div className="flex flex-wrap gap-1 mt-1">
                {userRoles.map((role: string) => (
                  <span
                    key={role}
                    className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  >
                    {roleLabels[role] || role}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* 基本信息 */}
        <GlassCard className="divide-y divide-white/5">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400 text-sm">手机号</span>
            </div>
            <span className="text-white text-sm">{u?.phone || "未设置"}</span>
          </div>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400 text-sm">邮箱</span>
            </div>
            <span className="text-white text-sm">{u?.email || "未设置"}</span>
          </div>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400 text-sm">用户ID</span>
            </div>
            <span className="text-slate-300 text-sm">#{u?.id}</span>
          </div>
        </GlassCard>

        {/* 角色切换 */}
        {userRoles.length > 1 && (
          <GlassCard className="p-4">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              切换角色视图
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {userRoles.map((role: string) => {
                const homePath = getRoleHome([role]);
                return (
                  <button
                    key={role}
                    onClick={() => setLocation(homePath)}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 text-sm text-white text-center active:bg-white/10 transition-colors"
                  >
                    {roleLabels[role] || role}端
                  </button>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* 修改密码 */}
        <GlassCard className="divide-y divide-white/5">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-slate-400" />
              <span className="text-white text-sm">修改密码</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </GlassCard>

        {/* 退出登录 */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 active:bg-red-500/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">退出登录</span>
        </button>
      </div>

      {showPasswordModal && (
        <PasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </MobileLayout>
  );
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const changePwd = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      alert("密码修改成功，请重新登录");
      window.location.href = "/app/login";
    },
    onError: (err) => {
      setError(err.message);
      setIsLoading(false);
    },
  });

  const handleSubmit = () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("请填写所有字段"); return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致"); return;
    }
    if (newPassword.length < 6) {
      setError("新密码长度至少6位"); return;
    }
    setIsLoading(true);
    setError("");
    changePwd.mutate({ oldPassword, newPassword });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center">
      <div className="w-full max-w-lg bg-[#16161f] rounded-t-3xl p-6 pb-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-lg font-bold">修改密码</h3>
          <button onClick={onClose} className="text-slate-400 text-sm">取消</button>
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        <div className="space-y-4">
          <input type="password" placeholder="旧密码" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)}
            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-amber-500/50" />
          <input type="password" placeholder="新密码" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-amber-500/50" />
          <input type="password" placeholder="确认新密码" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-amber-500/50" />
          <button onClick={handleSubmit} disabled={isLoading}
            className="w-full h-12 bg-amber-500 text-black font-semibold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50">
            {isLoading ? "提交中..." : "确认修改"}
          </button>
        </div>
      </div>
    </div>
  );
}
