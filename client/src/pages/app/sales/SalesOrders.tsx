import { useState } from "react";
import MobileLayout from "../components/MobileLayout";
import { PageHeader, GlassCard, LoadingSpinner, EmptyState } from "../components/GlassCard";
import { trpc } from "@/lib/trpc";
import { Search, FileText } from "lucide-react";

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

export default function SalesOrders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const ordersQuery = trpc.orders.list.useQuery(undefined, { retry: false });
  const orders = ordersQuery.data || [];

  const filtered = orders.filter((o: any) => {
    const matchSearch = !search ||
      (o.customerName || "").includes(search) ||
      (o.deliveryCourse || "").includes(search);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalAmount = filtered.reduce((sum: number, o: any) => sum + Number(o.paymentAmount || 0), 0);

  const filters = [
    { key: "all", label: "全部" },
    { key: "pending", label: "待支付" },
    { key: "paid", label: "已支付" },
    { key: "has_balance", label: "有尾款" },
    { key: "completed", label: "已完成" },
  ];

  return (
    <MobileLayout>
      <PageHeader
        title="订单查询"
        subtitle={`共 ${filtered.length} 笔 · ¥${totalAmount.toFixed(0)}`}
      />

      {/* 搜索 */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索客户名或课程"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* 状态筛选 */}
      <div className="px-4 py-1 flex gap-2 overflow-x-auto no-scrollbar">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all ${
              statusFilter === f.key
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-white/5 text-slate-400 border border-white/5"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 订单列表 */}
      <div className="px-4 pb-6 space-y-2 mt-2">
        {ordersQuery.isLoading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState message="暂无订单" icon={<FileText className="w-12 h-12 mb-3 opacity-20 text-slate-500" />} />
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
  const commission = Number(order.salesCommission || 0);

  return (
    <GlassCard className="overflow-hidden" onClick={() => setExpanded(!expanded)}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-white font-medium text-sm">{order.customerName || "未知客户"}</p>
            <p className="text-slate-500 text-xs mt-0.5">{order.deliveryCourse || "—"}</p>
          </div>
          <div className="text-right">
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status] || statusColors.pending}`}>
              {statusLabels[order.status] || order.status}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">{order.paymentDate || order.classDate || "—"}</span>
          <div className="flex items-center gap-3">
            <span className="text-amber-400 font-semibold">
              ¥{Number(order.paymentAmount || 0).toFixed(0)}
            </span>
            {commission > 0 && (
              <span className="text-green-400 text-[10px]">
                提成 ¥{commission.toFixed(0)}
              </span>
            )}
          </div>
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
          {order.deliveryTeacher && (
            <div className="flex justify-between">
              <span className="text-slate-500">老师</span>
              <span className="text-slate-300">{order.deliveryTeacher}</span>
            </div>
          )}
          {order.classDate && (
            <div className="flex justify-between">
              <span className="text-slate-500">上课日期</span>
              <span className="text-slate-300">{order.classDate}</span>
            </div>
          )}
          {order.courseAmount && (
            <div className="flex justify-between">
              <span className="text-slate-500">课程金额</span>
              <span className="text-slate-300">¥{Number(order.courseAmount).toFixed(2)}</span>
            </div>
          )}
          {order.teacherFee && (
            <div className="flex justify-between">
              <span className="text-slate-500">老师费用</span>
              <span className="text-slate-300">¥{Number(order.teacherFee).toFixed(2)}</span>
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
