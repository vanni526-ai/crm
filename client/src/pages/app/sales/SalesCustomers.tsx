import { useState } from "react";
import MobileLayout from "../components/MobileLayout";
import { PageHeader, GlassCard, LoadingSpinner, EmptyState } from "../components/GlassCard";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Search, Phone, MessageCircle, ChevronRight, Users } from "lucide-react";

export default function SalesCustomers() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const customersQuery = trpc.customers.list.useQuery(undefined, { retry: false });
  const customers = customersQuery.data || [];

  // 搜索和过滤
  const filtered = customers.filter((c: any) => {
    const matchSearch = !search || 
      (c.name || "").includes(search) || 
      (c.phone || "").includes(search) ||
      (c.wechat || "").includes(search);
    
    if (statusFilter === "all") return matchSearch;
    if (statusFilter === "new") return matchSearch && !c.hasOrder;
    if (statusFilter === "ordered") return matchSearch && c.hasOrder;
    if (statusFilter === "visited") return matchSearch && c.hasVisited;
    return matchSearch;
  });

  const filters = [
    { key: "all", label: "全部" },
    { key: "new", label: "未成交" },
    { key: "ordered", label: "已成交" },
    { key: "visited", label: "已到店" },
  ];

  return (
    <MobileLayout>
      <PageHeader title="客户列表" subtitle={`共 ${customers.length} 位客户`} />

      {/* 搜索栏 */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索姓名、手机号、微信号"
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

      {/* 客户列表 */}
      <div className="px-4 pb-6 space-y-2 mt-2">
        {customersQuery.isLoading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState message={search ? "未找到匹配的客户" : "暂无客户"} icon={<Users className="w-12 h-12 mb-3 opacity-20 text-slate-500" />} />
        ) : (
          filtered.map((customer: any) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))
        )}
      </div>
    </MobileLayout>
  );
}

function CustomerCard({ customer }: { customer: any }) {
  const [expanded, setExpanded] = useState(false);

  const statusLabel = customer.hasOrder ? "已成交" : customer.hasVisited ? "已到店" : "未成交";
  const statusColor = customer.hasOrder
    ? "text-green-400 bg-green-400/10"
    : customer.hasVisited
    ? "text-blue-400 bg-blue-400/10"
    : "text-slate-400 bg-slate-400/10";

  return (
    <GlassCard className="overflow-hidden" onClick={() => setExpanded(!expanded)}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-amber-500/30 flex items-center justify-center">
              <span className="text-sm font-bold text-white">{(customer.name || "?")[0]}</span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">{customer.name}</p>
              <p className="text-slate-500 text-xs">{customer.phone || "—"}</p>
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
        {customer.trafficSource && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-slate-600">来源:</span>
            <span className="text-xs text-slate-400">{customer.trafficSource}</span>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-4 py-3 space-y-3">
          {customer.wechat && (
            <div className="flex items-center gap-2 text-xs">
              <MessageCircle className="w-3.5 h-3.5 text-green-400" />
              <span className="text-slate-400">微信:</span>
              <span className="text-white">{customer.wechat}</span>
            </div>
          )}
          {customer.city && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">城市:</span>
              <span className="text-white">{customer.city}</span>
            </div>
          )}
          {customer.notes && (
            <div className="text-xs">
              <span className="text-slate-400">备注:</span>
              <p className="text-slate-300 mt-0.5">{customer.notes}</p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs"
              >
                <Phone className="w-3 h-3" />
                拨打电话
              </a>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
