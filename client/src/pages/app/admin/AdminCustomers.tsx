import { useState } from "react";
import MobileLayout from "../components/MobileLayout";
import { PageHeader, GlassCard, LoadingSpinner, EmptyState } from "../components/GlassCard";
import { trpc } from "@/lib/trpc";
import { Search, Users, Phone, MessageCircle } from "lucide-react";

export default function AdminCustomers() {
  const [search, setSearch] = useState("");

  const customersQuery = trpc.customers.list.useQuery(undefined, { retry: false });
  const customers = customersQuery.data || [];

  const filtered = customers.filter((c: any) => {
    if (!search) return true;
    return (c.name || "").includes(search) ||
      (c.phone || "").includes(search) ||
      (c.wechat || "").includes(search) ||
      (c.salesperson || "").includes(search);
  });

  return (
    <MobileLayout>
      <PageHeader title="客户管理" subtitle={`共 ${customers.length} 位客户`} />

      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索姓名、手机号、微信号、销售"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

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

  return (
    <GlassCard className="overflow-hidden" onClick={() => setExpanded(!expanded)}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-amber-500/30 flex items-center justify-center">
              <span className="text-sm font-bold text-white">{(customer.name || "?")[0]}</span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">{customer.name}</p>
              <p className="text-slate-500 text-xs">{customer.phone || "—"}</p>
            </div>
          </div>
          <div className="text-right">
            {customer.salesperson && (
              <span className="text-xs text-slate-500">销售: {customer.salesperson}</span>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-4 py-3 space-y-2 text-xs">
          {customer.wechat && (
            <div className="flex items-center gap-2">
              <MessageCircle className="w-3.5 h-3.5 text-green-400" />
              <span className="text-slate-400">微信:</span>
              <span className="text-white">{customer.wechat}</span>
            </div>
          )}
          {customer.city && (
            <div><span className="text-slate-400">城市:</span> <span className="text-white">{customer.city}</span></div>
          )}
          {customer.trafficSource && (
            <div><span className="text-slate-400">来源:</span> <span className="text-white">{customer.trafficSource}</span></div>
          )}
          {customer.accountBalance != null && (
            <div><span className="text-slate-400">余额:</span> <span className="text-amber-400">¥{Number(customer.accountBalance).toFixed(2)}</span></div>
          )}
          {customer.notes && (
            <div><span className="text-slate-400">备注:</span> <span className="text-slate-300">{customer.notes}</span></div>
          )}
          {customer.phone && (
            <a href={`tel:${customer.phone}`} onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs mt-1">
              <Phone className="w-3 h-3" /> 拨打电话
            </a>
          )}
        </div>
      )}
    </GlassCard>
  );
}
