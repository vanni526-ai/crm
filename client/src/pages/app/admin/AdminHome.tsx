import MobileLayout from "../components/MobileLayout";
import { GlassCard, StatCard } from "../components/GlassCard";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  LayoutDashboard, ShoppingCart, Users, DollarSign,
  TrendingUp, ChevronRight, ExternalLink,
} from "lucide-react";

export default function AdminHome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const userName = (user as any)?.nickname || (user as any)?.name || "管理员";

  // 获取统计数据
  const ordersQuery = trpc.orders.list.useQuery(undefined, { retry: false });
  const customersQuery = trpc.customers.list.useQuery(undefined, { retry: false });

  const orders = ordersQuery.data || [];
  const customers = customersQuery.data || [];

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.substring(0, 7);

  const todayOrders = orders.filter((o: any) => (o.paymentDate || "").startsWith(today));
  const monthOrders = orders.filter((o: any) => (o.paymentDate || "").startsWith(thisMonth));
  const monthRevenue = monthOrders.reduce((sum: number, o: any) => sum + Number(o.paymentAmount || 0), 0);
  const todayRevenue = todayOrders.reduce((sum: number, o: any) => sum + Number(o.paymentAmount || 0), 0);
  const todayCustomers = customers.filter((c: any) => (c.createdAt || "").startsWith(today));

  return (
    <MobileLayout>
      <div className="px-4 pt-6 pb-4 space-y-5">
        {/* 欢迎区域 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{userName}</h1>
            <p className="text-slate-500 text-sm mt-0.5">管理员控制台</p>
          </div>
          <a
            href="/"
            className="flex items-center gap-1 px-3 py-1.5 bg-white/5 rounded-lg text-slate-400 text-xs"
          >
            <ExternalLink className="w-3 h-3" />
            PC后台
          </a>
        </div>

        {/* 今日数据概览 */}
        <div>
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-amber-400" />
            今日数据
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="今日订单"
              value={todayOrders.length}
              icon={<ShoppingCart className="w-4 h-4" />}
              color="blue"
            />
            <StatCard
              label="今日收入"
              value={`¥${todayRevenue.toFixed(0)}`}
              icon={<DollarSign className="w-4 h-4" />}
              color="green"
            />
            <StatCard
              label="新增客户"
              value={todayCustomers.length}
              icon={<Users className="w-4 h-4" />}
              color="amber"
            />
            <StatCard
              label="本月收入"
              value={`¥${(monthRevenue / 1000).toFixed(1)}k`}
              icon={<TrendingUp className="w-4 h-4" />}
              color="purple"
            />
          </div>
        </div>

        {/* 快捷入口 */}
        <div>
          <h2 className="text-white font-semibold mb-3">快捷操作</h2>
          <div className="space-y-2">
            <GlassCard
              className="p-4 flex items-center justify-between"
              onClick={() => setLocation("/app/admin/orders")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">订单管理</p>
                  <p className="text-slate-500 text-xs">共 {orders.length} 笔订单</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </GlassCard>

            <GlassCard
              className="p-4 flex items-center justify-between"
              onClick={() => setLocation("/app/admin/customers")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">客户管理</p>
                  <p className="text-slate-500 text-xs">共 {customers.length} 位客户</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </GlassCard>

            <GlassCard
              className="p-4 flex items-center justify-between"
              onClick={() => setLocation("/app/admin/approval")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">费用审批</p>
                  <p className="text-slate-500 text-xs">老师课时费审批</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </GlassCard>

            <GlassCard
              className="p-4 flex items-center justify-between"
              onClick={() => setLocation("/app/admin/stats")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">数据统计</p>
                  <p className="text-slate-500 text-xs">收入、订单趋势分析</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </GlassCard>
          </div>
        </div>

        {/* 最近订单 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">最近订单</h2>
            <button
              onClick={() => setLocation("/app/admin/orders")}
              className="text-amber-400 text-xs flex items-center gap-0.5"
            >
              查看全部 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {orders.slice(0, 5).map((order: any) => (
              <GlassCard key={order.id} className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm">{order.customerName || "—"}</span>
                  <span className="text-amber-400 font-medium text-sm">
                    ¥{Number(order.paymentAmount || 0).toFixed(0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{order.deliveryCourse || "—"}</span>
                  <span>{order.paymentDate || "—"}</span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
