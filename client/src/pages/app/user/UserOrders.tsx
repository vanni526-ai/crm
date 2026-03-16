import { useState } from "react";
import MobileLayout from "../components/MobileLayout";
import { GlassCard, PageHeader, LoadingSpinner, EmptyState } from "../components/GlassCard";
import { trpc } from "@/lib/trpc";
import { ShoppingCart } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "待支付", paid: "已支付", has_balance: "有尾款",
  completed: "已完成", cancelled: "已取消", refunded: "已退款",
};

const statusColors: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-400/10",
  paid: "text-green-400 bg-green-400/10",
  has_balance: "text-orange-400 bg-orange-400/10",
  completed: "text-blue-400 bg-blue-400/10",
  cancelled: "text-slate-400 bg-slate-400/10",
  refunded: "text-red-400 bg-red-400/10",
};

export default function UserOrders() {
  const [filter, setFilter] = useState<string>("all");
  const ordersQuery = trpc.orders.list.useQuery(undefined, { retry: false });
  const orders = ordersQuery.data || [];

  const filtered = filter === "all" ? orders : orders.filter((o: any) => o.status === filter);

  const filters = [
    { key: "all", label: "全部" },
    { key: "pending", label: "待支付" },
    { key: "paid", label: "已支付" },
    { key: "completed", label: "已完成" },
  ];

  return (
    <MobileLayout>
      <PageHeader title="我的订单" />

      {/* 筛选Tab */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
              filter === f.key
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-white/5 text-slate-400 border border-white/5"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-6 space-y-2 mt-2">
        {ordersQuery.isLoading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState message="暂无订单" icon={<ShoppingCart className="w-12 h-12 mb-3 opacity-20 text-slate-500" />} />
        ) : (
          filtered.map((order: any) => (
            <OrderCard key={order.id} order={order} />
          ))
        )}
      </div>
    </MobileLayout>
  );
}

function OrderCard({ order }: { order: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassCard className="overflow-hidden" onClick={() => setExpanded(!expanded)}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-medium text-sm">
            {order.deliveryCourse || order.courseName || "课程订单"}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status] || statusColors.pending}`}>
            {statusLabels[order.status] || order.status}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {order.deliveryTeacher && `${order.deliveryTeacher} · `}
            {order.paymentDate || order.classDate || "—"}
          </span>
          <span className="text-amber-400 font-semibold text-base">
            ¥{Number(order.paymentAmount || order.courseAmount || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-4 py-3 space-y-2 text-xs">
          {order.deliveryCity && (
            <div className="flex justify-between">
              <span className="text-slate-500">城市</span>
              <span className="text-slate-300">{order.deliveryCity}</span>
            </div>
          )}
          {order.classDate && (
            <div className="flex justify-between">
              <span className="text-slate-500">上课日期</span>
              <span className="text-slate-300">{order.classDate}</span>
            </div>
          )}
          {order.classTime && (
            <div className="flex justify-between">
              <span className="text-slate-500">上课时间</span>
              <span className="text-slate-300">{order.classTime}</span>
            </div>
          )}
          {order.deliveryRoom && (
            <div className="flex justify-between">
              <span className="text-slate-500">教室</span>
              <span className="text-slate-300">{order.deliveryRoom}</span>
            </div>
          )}
          {order.notes && (
            <div className="flex justify-between">
              <span className="text-slate-500">备注</span>
              <span className="text-slate-300 text-right max-w-[60%]">{order.notes}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">订单编号</span>
            <span className="text-slate-300">#{order.id}</span>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
