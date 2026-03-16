import { useMemo } from "react";
import MobileLayout from "../components/MobileLayout";
import { PageHeader, GlassCard, StatCard, LoadingSpinner } from "../components/GlassCard";
import { trpc } from "@/lib/trpc";
import { TrendingUp, DollarSign, Users, ShoppingCart, BarChart3 } from "lucide-react";

export default function AdminStats() {
  const ordersQuery = trpc.orders.list.useQuery(undefined, { retry: false });
  const customersQuery = trpc.customers.list.useQuery(undefined, { retry: false });

  const orders = ordersQuery.data || [];
  const customers = customersQuery.data || [];

  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const thisMonth = today.substring(0, 7);
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().substring(0, 7);

    const validOrders = orders.filter((o: any) => o.status !== "cancelled");

    // 本月数据
    const monthOrders = validOrders.filter((o: any) => (o.paymentDate || "").startsWith(thisMonth));
    const monthRevenue = monthOrders.reduce((s: number, o: any) => s + Number(o.paymentAmount || 0), 0);
    const monthTeacherFee = monthOrders.reduce((s: number, o: any) => s + Number(o.teacherFee || 0), 0);

    // 上月数据
    const lastMonthOrders = validOrders.filter((o: any) => (o.paymentDate || "").startsWith(lastMonthStr));
    const lastMonthRevenue = lastMonthOrders.reduce((s: number, o: any) => s + Number(o.paymentAmount || 0), 0);

    // 总计
    const totalRevenue = validOrders.reduce((s: number, o: any) => s + Number(o.paymentAmount || 0), 0);
    const totalTeacherFee = validOrders.reduce((s: number, o: any) => s + Number(o.teacherFee || 0), 0);

    // 月度趋势（最近6个月）
    const monthlyData: Array<{ month: string; revenue: number; orders: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.toISOString().substring(0, 7);
      const mOrders = validOrders.filter((o: any) => (o.paymentDate || "").startsWith(m));
      monthlyData.push({
        month: `${d.getMonth() + 1}月`,
        revenue: mOrders.reduce((s: number, o: any) => s + Number(o.paymentAmount || 0), 0),
        orders: mOrders.length,
      });
    }

    // 环比增长
    const revenueGrowth = lastMonthRevenue > 0
      ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : "—";

    return {
      monthRevenue, monthTeacherFee, monthOrders: monthOrders.length,
      totalRevenue, totalTeacherFee, totalOrders: validOrders.length,
      totalCustomers: customers.length,
      revenueGrowth, monthlyData,
      netProfit: totalRevenue - totalTeacherFee,
    };
  }, [orders, customers]);

  if (ordersQuery.isLoading) {
    return (
      <MobileLayout>
        <PageHeader title="数据统计" />
        <LoadingSpinner />
      </MobileLayout>
    );
  }

  const maxRevenue = Math.max(...stats.monthlyData.map((d) => d.revenue), 1);

  return (
    <MobileLayout>
      <PageHeader title="数据统计" />

      <div className="px-4 pb-6 space-y-5">
        {/* 核心指标 */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="总收入" value={`¥${(stats.totalRevenue / 10000).toFixed(1)}万`} icon={<DollarSign className="w-4 h-4" />} color="amber" />
          <StatCard label="净利润" value={`¥${(stats.netProfit / 10000).toFixed(1)}万`} icon={<TrendingUp className="w-4 h-4" />} color="green" />
          <StatCard label="总订单" value={stats.totalOrders} icon={<ShoppingCart className="w-4 h-4" />} color="blue" />
          <StatCard label="总客户" value={stats.totalCustomers} icon={<Users className="w-4 h-4" />} color="purple" />
        </div>

        {/* 本月数据 */}
        <GlassCard className="p-5">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            本月概况
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">¥{(stats.monthRevenue / 1000).toFixed(1)}k</p>
              <p className="text-xs text-slate-500 mt-1">本月收入</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stats.monthOrders}</p>
              <p className="text-xs text-slate-500 mt-1">本月订单</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${stats.revenueGrowth !== "—" && Number(stats.revenueGrowth) >= 0 ? "text-green-400" : "text-red-400"}`}>
                {stats.revenueGrowth === "—" ? "—" : `${Number(stats.revenueGrowth) >= 0 ? "+" : ""}${stats.revenueGrowth}%`}
              </p>
              <p className="text-xs text-slate-500 mt-1">环比增长</p>
            </div>
          </div>
        </GlassCard>

        {/* 月度趋势图 */}
        <GlassCard className="p-5">
          <h3 className="text-white font-semibold text-sm mb-4">收入趋势（近6月）</h3>
          <div className="flex items-end justify-between gap-2 h-32">
            {stats.monthlyData.map((d, i) => {
              const height = Math.max(4, (d.revenue / maxRevenue) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-amber-400">
                    {d.revenue > 0 ? `${(d.revenue / 1000).toFixed(0)}k` : ""}
                  </span>
                  <div
                    className="w-full bg-gradient-to-t from-amber-500/60 to-amber-400/30 rounded-t-lg transition-all duration-500"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-slate-500">{d.month}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* 费用结构 */}
        <GlassCard className="p-5">
          <h3 className="text-white font-semibold text-sm mb-4">费用结构</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">总收入</span>
                <span className="text-white">¥{stats.totalRevenue.toFixed(0)}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: "100%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">老师费用</span>
                <span className="text-white">¥{stats.totalTeacherFee.toFixed(0)}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${stats.totalRevenue > 0 ? (stats.totalTeacherFee / stats.totalRevenue * 100) : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">净利润</span>
                <span className="text-green-400">¥{stats.netProfit.toFixed(0)}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${stats.totalRevenue > 0 ? (stats.netProfit / stats.totalRevenue * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </MobileLayout>
  );
}
