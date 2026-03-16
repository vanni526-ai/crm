import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GlassCard({ children, className = "", onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-2xl ${onClick ? "cursor-pointer active:scale-[0.98] transition-transform" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: "amber" | "purple" | "blue" | "green" | "red";
}

const colorMap = {
  amber: "from-amber-500/20 to-amber-600/5 border-amber-500/10 text-amber-400",
  purple: "from-purple-500/20 to-purple-600/5 border-purple-500/10 text-purple-400",
  blue: "from-blue-500/20 to-blue-600/5 border-blue-500/10 text-blue-400",
  green: "from-green-500/20 to-green-600/5 border-green-500/10 text-green-400",
  red: "from-red-500/20 to-red-600/5 border-red-500/10 text-red-400",
};

export function StatCard({ label, value, icon, trend, trendUp, color = "amber" }: StatCardProps) {
  const colors = colorMap[color];
  return (
    <div className={`bg-gradient-to-br ${colors} backdrop-blur-xl border rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-xs">{label}</span>
        {icon && <span className="opacity-60">{icon}</span>}
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      {trend && (
        <div className={`text-xs mt-1 ${trendUp ? "text-green-400" : "text-red-400"}`}>
          {trendUp ? "↑" : "↓"} {trend}
        </div>
      )}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: ReactNode;
  onBack?: () => void;
}

export function PageHeader({ title, subtitle, rightAction, onBack }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-slate-400 hover:text-white -ml-1 p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold text-white">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {rightAction}
      </div>
    </div>
  );
}

export function EmptyState({ message = "暂无数据", icon }: { message?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      {icon || (
        <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )}
      <span className="text-sm">{message}</span>
    </div>
  );
}

export function LoadingSpinner({ text = "加载中..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-3" />
      <span className="text-slate-500 text-sm">{text}</span>
    </div>
  );
}
