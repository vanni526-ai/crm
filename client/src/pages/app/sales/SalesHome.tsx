import MobileLayout from "../components/MobileLayout";
import { StatCard, GlassCard } from "../components/GlassCard";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Users, ShoppingCart, TrendingUp, DollarSign, ChevronRight, UserPlus } from "lucide-react";

export default function SalesHome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const userName = (user as any)?.nickname || (user as any)?.name || "销售";

  // 获取订单数据
  const ordersQuery = trpc.orders.list.useQuery(undefined, { retry: false });
  const customersQuery = trpc.customers.list.useQuery(undefined, { retry: false });

  const orders = ordersQuery.data || [];
  const customers = customersQuery.data || [];

  // 计算今日统计
  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.substring(0, 7);

  const todayOrders = orders.filter((o: any) => (o.paymentDate || "").startsWith(today));
  const monthOrders = orders.filter((o: any) => (o.paymentDate || "").startsWith(thisMonth));
  const monthRevenue = monthOrders.reduce((sum: number, o: any) => sum + Number(o.paymentAmount || 0), 0);
  const monthCommission = monthRevenue * 0.1; // 预估10%提成

  const todayCustomers = customers.filter((c: any) => {
    const created = c.createdAt || "";
    return created.startsWith(today);
  });

  return (
    <MobileLayout>
      <div className="px-4 pt-6 pb-4 space-y-5">
        {/* 欢迎区域 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">你好，{userName}</h1>
            <p className="text-slate-500 text-sm mt-0.5">今日业绩概览</p>
          </div>
          <button
            onClick={() => setLocation("/app/sales/register")}
            className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center active:scale-95 transition-transform"
          >
            <UserPlus className="w-5 h-5 text-black" />
          </button>
        </div>

        {/* 数据卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="今日新增客户"
            value={todayCustomers.length}
            icon={<Users className="w-4 h-4" />}
            color="blue"
          />
          <StatCard
            label="今日订单数"
            value={todayOrders.length}
            icon={<ShoppingCart className="w-4 h-4" />}
            color="green"
          />
          <StatCard
            label="本月销售额"
            value={`¥${(monthRevenue / 1000).toFixed(1)}k`}
            icon={<TrendingUp className="w-4 h-4" />}
            color="amber"
          />
          <StatCard
            label="本月提成预估"
            value={`¥${monthCommission.toFixed(0)}`}
            icon={<DollarSign className="w-4 h-4" />}
            color="purple"
          />
        </div>

        {/* 快捷操作 */}
        <div className="grid grid-cols-2 gap-3">
          <GlassCard
            className="p-4 text-center"
            onClick={() => setLocation("/app/sales/register")}
          >
            <div className="w-10 h-10 mx-auto rounded-xl bg-amber-500/20 flex items-center justify-center mb-2">
              <UserPlus className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-white text-sm font-medium">新增客户</p>
          </GlassCard>
          <GlassCard
            className="p-4 text-center"
            onClick={() => setLocation("/app/sales/customers")}
          >
            <div className="w-10 h-10 mx-auto rounded-xl bg-blue-500/20 flex items-center justify-center mb-2">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-white text-sm font-medium">客户列表</p>
          </GlassCard>
        </div>

        {/* 最近订单 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">最近订单</h2>
            <button
              onClick={() => setLocation("/app/sales/orders")}
              className="text-amber-400 text-xs flex items-center gap-0.5"
            >
              查看全部 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {orders.slice(0, 5).map((order: any) => (
              <GlassCard key={order.id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm font-medium">
                    {order.customerName || "未知客户"}
                  </span>
                  <span className="text-amber-400 font-semibold">
                    ¥{Number(order.paymentAmount || 0).toFixed(0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{order.deliveryCourse || "—"}</span>
                  <span>{order.paymentDate || "—"}</span>
                </div>
              </GlassCard>
            ))}
            {orders.length === 0 && (
              <GlassCard className="p-6 text-center text-slate-500 text-sm">
                暂无订单记录
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
