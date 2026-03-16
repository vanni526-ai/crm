import { useState } from "react";
import MobileLayout from "../components/MobileLayout";
import { PageHeader, GlassCard } from "../components/GlassCard";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { UserPlus, Loader2, Check } from "lucide-react";

export default function SalesRegister() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    wechat: "",
    source: "",
    city: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const citiesQuery = trpc.city.list.useQuery(undefined, { retry: false });
  const cities = citiesQuery.data || [];

  const createCustomer = trpc.customers.create.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setIsSubmitting(false);
      setTimeout(() => {
        setLocation("/app/sales/customers");
      }, 1500);
    },
    onError: (err) => {
      setError(err.message || "创建失败");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError("请输入客户姓名");
      return;
    }
    if (!form.phone.trim()) {
      setError("请输入手机号");
      return;
    }
    setError("");
    setIsSubmitting(true);
    createCustomer.mutate({
      name: form.name.trim(),
      phone: form.phone.trim(),
      wechat: form.wechat.trim() || undefined,
      trafficSource: form.source.trim() || undefined,
      city: form.city || undefined,
      notes: form.notes.trim() || undefined,
    } as any);
  };

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const sources = ["抖音", "小红书", "微信", "朋友介绍", "线下活动", "其他"];

  if (success) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-white text-lg font-bold mb-2">客户登记成功</h2>
          <p className="text-slate-500 text-sm">正在跳转到客户列表...</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader title="客户登记" onBack={() => setLocation("/app/sales")} />

      <div className="px-4 pb-6 space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* 基本信息 */}
        <GlassCard className="p-5 space-y-4">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-amber-400" />
            基本信息
          </h3>

          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">
              姓名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="请输入客户姓名"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">
              手机号 <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              placeholder="请输入手机号"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">微信号</label>
            <input
              type="text"
              placeholder="请输入微信号"
              value={form.wechat}
              onChange={(e) => updateField("wechat", e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </GlassCard>

        {/* 来源和城市 */}
        <GlassCard className="p-5 space-y-4">
          <h3 className="text-white font-semibold text-sm">来源信息</h3>

          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">来源渠道</label>
            <div className="flex flex-wrap gap-2">
              {sources.map((s) => (
                <button
                  key={s}
                  onClick={() => updateField("source", form.source === s ? "" : s)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    form.source === s
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-white/5 text-slate-400 border border-white/5"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">城市</label>
            <select
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-amber-500/50 appearance-none"
            >
              <option value="" className="bg-[#16161f]">请选择城市</option>
              {cities.map((city: any) => (
                <option key={city.id} value={city.name} className="bg-[#16161f]">
                  {city.name}
                </option>
              ))}
            </select>
          </div>
        </GlassCard>

        {/* 备注 */}
        <GlassCard className="p-5">
          <label className="text-slate-400 text-xs mb-1.5 block">备注</label>
          <textarea
            placeholder="添加备注信息..."
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 resize-none"
          />
        </GlassCard>

        {/* 提交按钮 */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              提交中...
            </span>
          ) : (
            "确认登记"
          )}
        </button>
      </div>
    </MobileLayout>
  );
}
