import MobileLayout from "../components/MobileLayout";
import { GlassCard, StatCard } from "../components/GlassCard";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Calendar, CreditCard, Crown, ChevronRight } from "lucide-react";

export default function UserHome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const membershipQuery = trpc.membership.getStatus.useQuery(undefined, {
    retry: false,
  });

  const membership = membershipQuery.data;
  const userName = (user as any)?.nickname || (user as any)?.name || "用户";

  return (
    <MobileLayout>
      <div className="px-4 pt-6 pb-4 space-y-5">
        {/* 欢迎区域 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">你好，{userName}</h1>
            <p className="text-slate-500 text-sm mt-0.5">欢迎回到瀛姬</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-purple-600 flex items-center justify-center">
            <span className="text-lg font-bold text-white">{userName[0]}</span>
          </div>
        </div>

        {/* 会员卡片 */}
        <GlassCard className="p-5 bg-gradient-to-br from-purple-900/30 to-amber-900/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-semibold text-sm">
                {membership?.isMember ? "VIP会员" : "普通用户"}
              </span>
            </div>
            {membership?.isMember && membership.daysRemaining && (
              <span className="text-xs text-slate-400">
                剩余 {membership.daysRemaining} 天
              </span>
            )}
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-slate-400 text-xs mb-1">账户余额</p>
              <p className="text-2xl font-bold text-white">
                ¥{membership?.accountBalance?.toFixed(2) || "0.00"}
              </p>
            </div>
            <button
              onClick={() => setLocation("/app/user/wallet")}
              className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-xl text-sm font-medium active:bg-amber-500/30 transition-colors"
            >
              充值
            </button>
          </div>
        </GlassCard>

        {/* 快捷入口 */}
        <div className="grid grid-cols-2 gap-3">
          <GlassCard
            className="p-4 flex items-center gap-3"
            onClick={() => setLocation("/app/user/booking")}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">课程预约</p>
              <p className="text-slate-500 text-xs">选课·选时·选老师</p>
            </div>
          </GlassCard>
          <GlassCard
            className="p-4 flex items-center gap-3"
            onClick={() => setLocation("/app/user/orders")}
          >
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">我的订单</p>
              <p className="text-slate-500 text-xs">查看订单详情</p>
            </div>
          </GlassCard>
        </div>

        {/* 最近订单 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">最近订单</h2>
            <button
              onClick={() => setLocation("/app/user/orders")}
              className="text-amber-400 text-xs flex items-center gap-0.5"
            >
              查看全部 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <RecentOrders />
        </div>
      </div>
    </MobileLayout>
  );
}

function RecentOrders() {
  const ordersQuery = trpc.orders.list.useQuery(undefined, { retry: false });
  const orders = (ordersQuery.data || []).slice(0, 3);

  if (ordersQuery.isLoading) {
    return (
      <GlassCard className="p-6 text-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
      </GlassCard>
    );
  }

  if (orders.length === 0) {
    return (
      <GlassCard className="p-6 text-center text-slate-500 text-sm">
        暂无订单记录
      </GlassCard>
    );
  }

  const statusLabels: Record<string, string> = {
    pending: "待支付",
    paid: "已支付",
    has_balance: "有尾款",
    completed: "已完成",
    cancelled: "已取消",
    refunded: "已退款",
  };

  const statusColors: Record<string, string> = {
    pending: "text-yellow-400 bg-yellow-400/10",
    paid: "text-green-400 bg-green-400/10",
    has_balance: "text-orange-400 bg-orange-400/10",
    completed: "text-blue-400 bg-blue-400/10",
    cancelled: "text-slate-400 bg-slate-400/10",
    refunded: "text-red-400 bg-red-400/10",
  };

  return (
    <div className="space-y-2">
      {orders.map((order: any) => (
        <GlassCard key={order.id} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm font-medium">
              {order.deliveryCourse || order.courseName || "课程订单"}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status] || statusColors.pending}`}>
              {statusLabels[order.status] || order.status}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{order.paymentDate || order.classDate || "—"}</span>
            <span className="text-amber-400 font-medium">
              ¥{Number(order.paymentAmount || order.courseAmount || 0).toFixed(2)}
            </span>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
