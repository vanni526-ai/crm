import { useState, useMemo } from "react";
import MobileLayout from "../components/MobileLayout";
import { PageHeader, GlassCard, StatCard, LoadingSpinner, EmptyState } from "../components/GlassCard";
import { trpc } from "@/lib/trpc";
import { DollarSign, TrendingUp, Target, Award } from "lucide-react";

// 阶梯提成规则
const COMMISSION_TIERS = [
  { min: 0, max: 50000, rate: 0.08, label: "基础" },
  { min: 50000, max: 100000, rate: 0.10, label: "进阶" },
  { min: 100000, max: 200000, rate: 0.12, label: "高级" },
  { min: 200000, max: Infinity, rate: 0.15, label: "王牌" },
];

export default function SalesCommission() {
  const [period, setPeriod] = useState<"month" | "all">("month");

  const ordersQuery = trpc.orders.list.useQuery(undefined, { retry: false });
  const orders = ordersQuery.data || [];

  const thisMonth = new Date().toISOString().substring(0, 7);

  const { monthOrders, monthRevenue, monthCommission, allCommission, currentTier, nextTier, progressPercent } = useMemo(() => {
    const monthOrd = orders.filter((o: any) =>
      (o.paymentDate || "").startsWith(thisMonth) && o.status !== "cancelled"
    );
    const monthRev = monthOrd.reduce((sum: number, o: any) => sum + Number(o.paymentAmount || 0), 0);

    // 计算阶梯提成
    let tier = COMMISSION_TIERS[0];
    for (const t of COMMISSION_TIERS) {
      if (monthRev >= t.min) tier = t;
    }
    const monthComm = monthRev * tier.rate;

    // 总提成
    const allRev = orders
      .filter((o: any) => o.status !== "cancelled")
      .reduce((sum: number, o: any) => sum + Number(o.paymentAmount || 0), 0);
    const allComm = orders
      .filter((o: any) => o.status !== "cancelled")
      .reduce((sum: number, o: any) => sum + Number(o.salesCommission || o.paymentAmount || 0) * tier.rate, 0);

    // 下一阶梯
    const nextTierIdx = COMMISSION_TIERS.indexOf(tier) + 1;
    const next = nextTierIdx < COMMISSION_TIERS.length ? COMMISSION_TIERS[nextTierIdx] : null;

    // 进度百分比
    const progress = next ? Math.min(100, (monthRev / next.min) * 100) : 100;

    return {
      monthOrders: monthOrd,
      monthRevenue: monthRev,
      monthCommission: monthComm,
      allCommission: allComm,
      currentTier: tier,
      nextTier: next,
      progressPercent: progress,
    };
  }, [orders, thisMonth]);

  return (
    <MobileLayout>
      <PageHeader title="我的提成" />

      <div className="px-4 pb-6 space-y-5">
        {/* 本月提成卡片 */}
        <div className="bg-gradient-to-br from-amber-600/20 via-purple-600/15 to-amber-800/10 backdrop-blur-xl border border-amber-500/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400/80 text-sm font-medium">本月提成</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            ¥{monthCommission.toFixed(2)}
          </p>
          <p className="text-slate-500 text-xs">
            本月销售额 ¥{monthRevenue.toFixed(0)} · 提成比例 {(currentTier.rate * 100).toFixed(0)}%
          </p>
        </div>

        {/* 数据统计 */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="本月订单数"
            value={monthOrders.length}
            icon={<TrendingUp className="w-4 h-4" />}
            color="blue"
          />
          <StatCard
            label="当前等级"
            value={currentTier.label}
            icon={<Award className="w-4 h-4" />}
            color="purple"
          />
        </div>

        {/* 阶梯提成进度 */}
        <GlassCard className="p-5">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            阶梯提成进度
          </h3>

          {/* 进度条 */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400">当前: {currentTier.label} ({(currentTier.rate * 100)}%)</span>
              {nextTier && (
                <span className="text-amber-400">
                  下一级: {nextTier.label} ({(nextTier.rate * 100)}%)
                </span>
              )}
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {nextTier && (
              <p className="text-slate-500 text-xs mt-1.5">
                距下一级还差 ¥{Math.max(0, nextTier.min - monthRevenue).toFixed(0)}
              </p>
            )}
          </div>

          {/* 阶梯规则 */}
          <div className="space-y-2">
            {COMMISSION_TIERS.map((tier) => {
              const isActive = tier === currentTier;
              return (
                <div
                  key={tier.label}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    isActive ? "bg-amber-500/10 border border-amber-500/20" : "bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isActive && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                    <span className={`text-sm ${isActive ? "text-amber-400 font-medium" : "text-slate-400"}`}>
                      {tier.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm ${isActive ? "text-white font-medium" : "text-slate-500"}`}>
                      {(tier.rate * 100)}%
                    </span>
                    <span className="text-slate-600 text-xs ml-2">
                      {tier.max === Infinity ? `≥¥${(tier.min / 10000).toFixed(0)}万` : `¥${(tier.min / 10000).toFixed(0)}-${(tier.max / 10000).toFixed(0)}万`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* 提成明细 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">提成明细</h2>
            <div className="flex gap-1">
              <button
                onClick={() => setPeriod("month")}
                className={`px-3 py-1 rounded-lg text-xs ${
                  period === "month" ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-slate-500"
                }`}
              >
                本月
              </button>
              <button
                onClick={() => setPeriod("all")}
                className={`px-3 py-1 rounded-lg text-xs ${
                  period === "all" ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-slate-500"
                }`}
              >
                全部
              </button>
            </div>
          </div>

          {ordersQuery.isLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-2">
              {(period === "month" ? monthOrders : orders.filter((o: any) => o.status !== "cancelled"))
                .slice(0, 20)
                .map((order: any) => {
                  const amount = Number(order.paymentAmount || 0);
                  const commission = Number(order.salesCommission || amount * currentTier.rate);
                  return (
                    <GlassCard key={order.id} className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm">{order.customerName || "—"}</span>
                        <span className="text-green-400 font-medium text-sm">
                          +¥{commission.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{order.deliveryCourse || "—"}</span>
                        <span>订单 ¥{amount.toFixed(0)} · {order.paymentDate || "—"}</span>
                      </div>
                    </GlassCard>
                  );
                })}
              {(period === "month" ? monthOrders : orders).length === 0 && (
                <EmptyState message="暂无提成记录" />
              )}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
