import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "../_core/hooks/useAuth";

// ========== 类型定义 ==========
type PaymentChannel = "wechat" | "alipay" | "balance";
type Step = "landing" | "confirm" | "paying" | "success";

interface Plan {
  id: number;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  originalPrice: number | null;
  benefits: string[];
}

// ========== 工具函数 ==========
function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ========== 特性列表 ==========
const FEATURES = [
  {
    emoji: "🎯",
    title: "专属约课权限",
    desc: "解锁全平台课程预约功能，随时随地约课",
  },
  {
    emoji: "👩‍🏫",
    title: "优质教师资源",
    desc: "匹配全国各城市专业教师，一对一精品教学",
  },
  {
    emoji: "📅",
    title: "灵活时间安排",
    desc: "根据您的时间自由选择上课时段，弹性安排",
  },
  {
    emoji: "🏆",
    title: "会员专属服务",
    desc: "享受会员专属客服支持，优先处理您的需求",
  },
  {
    emoji: "🔄",
    title: "一年有效期",
    desc: "购买后立即生效，365天内无限次约课",
  },
];

// ========== 主页面 ==========
export default function MembershipH5() {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("landing");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>("wechat");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // 查询套餐列表
  const { data: plansData, isLoading: plansLoading } =
    trpc.membership.listPlans.useQuery();

  // 查询会员状态
  const { data: statusData, refetch: refetchStatus } =
    trpc.membership.getStatus.useQuery(undefined, {
      enabled: !!user,
    });

  // 查询订单状态（支付中轮询）
  const { data: orderStatusData } =
    trpc.membership.getOrderStatus.useQuery(
      { orderId: orderId! },
      { enabled: step === "paying" && !!orderId, refetchInterval: 3000 }
    );

  // 创建订单
  const createOrder = trpc.membership.createOrder.useMutation();
  // 预下单
  const prepay = trpc.membership.prepay.useMutation();
  // 取消订单
  const cancelOrder = trpc.membership.cancelOrder.useMutation();

  // 监听订单状态变化
  useEffect(() => {
    if (step === "paying" && orderStatusData?.status === "paid") {
      refetchStatus();
      setStep("success");
    }
  }, [orderStatusData, step, refetchStatus]);

  // 取年度套餐（durationDays >= 365 或第一个）
  const yearPlan: Plan | null =
    plansData?.plans?.find((p: Plan) => p.duration >= 365) ??
    plansData?.plans?.[0] ??
    null;

  const displayPrice = yearPlan?.price ?? 39;

  // 处理立即开通
  const handleOpenMembership = () => {
    if (!user) {
      window.location.href = "/login?redirect=/membership";
      return;
    }
    const plan = yearPlan;
    if (!plan) return;
    setSelectedPlan(plan);
    setErrorMsg("");
    setStep("confirm");
  };

  // 处理确认支付
  const handleConfirmPay = async () => {
    if (!selectedPlan) return;
    setErrorMsg("");
    try {
      const orderResult = await createOrder.mutateAsync({ planId: selectedPlan.id });
      setOrderId(orderResult.orderId);
      const prepayResult = await prepay.mutateAsync({
        orderId: orderResult.orderId,
        paymentChannel,
      });
      if (prepayResult.channel === "balance" && prepayResult.success) {
        await refetchStatus();
        setStep("success");
        return;
      }
      if (prepayResult.channel === "wechat" && "mwebUrl" in prepayResult) {
        setStep("paying");
        window.location.href = prepayResult.mwebUrl;
        return;
      }
      if (prepayResult.channel === "alipay" && "formHtml" in prepayResult) {
        setStep("paying");
        const div = document.createElement("div");
        div.innerHTML = prepayResult.formHtml;
        document.body.appendChild(div);
        return;
      }
      setStep("paying");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "支付失败，请重试");
    }
  };

  // 处理取消
  const handleCancel = async () => {
    if (orderId) {
      try { await cancelOrder.mutateAsync({ orderId }); } catch { /* ignore */ }
    }
    setStep("landing");
    setOrderId(null);
    setSelectedPlan(null);
  };

  // ---- 加载中 ----
  if (authLoading || plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-400 text-base">加载中…</div>
      </div>
    );
  }

  // ---- 支付成功页 ----
  if (step === "success") {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-6">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">开通成功！</h2>
        <p className="text-gray-500 text-center mb-8">欢迎成为瀛姬年度会员，立即开始约课吧</p>
        <button
          onClick={() => (window.location.href = "/")}
          className="w-full max-w-sm py-4 rounded-2xl font-bold text-lg text-white"
          style={{ background: "linear-gradient(135deg, #FF8C00, #FF6B00)" }}
        >
          开始约课
        </button>
      </div>
    );
  }

  // ---- 支付中页 ----
  if (step === "paying") {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <div
          className="w-full flex flex-col items-center justify-center py-10 px-6"
          style={{ background: "linear-gradient(160deg, #FF8C00 0%, #FF6B00 100%)" }}
        >
          <h1 className="text-2xl font-bold text-white">等待支付确认</h1>
          <p className="text-white/80 text-sm mt-1">请在支付页面完成支付</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          <div className="text-4xl animate-spin">⏳</div>
          <p className="text-gray-500">正在等待支付结果…</p>
        </div>
        <div className="px-5 pb-8">
          <button
            onClick={handleCancel}
            className="w-full py-3 rounded-2xl font-medium text-gray-500 bg-white shadow-sm"
          >
            取消支付
          </button>
        </div>
      </div>
    );
  }

  // ---- 确认支付页 ----
  if (step === "confirm" && selectedPlan) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* 顶部 Banner */}
        <div
          className="w-full flex flex-col items-center justify-center py-10 px-6"
          style={{ background: "linear-gradient(160deg, #FF8C00 0%, #FF6B00 100%)" }}
        >
          <h1 className="text-2xl font-bold text-white">开通年度会员</h1>
          <p className="text-white/80 text-sm mt-1">确认订单信息</p>
        </div>

        {/* 订单详情 */}
        <div className="flex-1 px-5 py-6 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-500">套餐</span>
              <span className="text-gray-800 font-medium">{selectedPlan.name}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-500">有效期</span>
              <span className="text-gray-800 font-medium">{selectedPlan.duration} 天</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-500">价格</span>
              <span className="text-2xl font-bold" style={{ color: "#FF6B00" }}>
                ¥{selectedPlan.price}
              </span>
            </div>
          </div>

          {/* 支付方式 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-gray-700 font-semibold mb-3">选择支付方式</p>
            {(
              [
                { key: "wechat", label: "微信支付", emoji: "💚" },
                { key: "alipay", label: "支付宝", emoji: "💙" },
                { key: "balance", label: "账户余额", emoji: "💰" },
              ] as { key: PaymentChannel; label: string; emoji: string }[]
            ).map((ch) => (
              <label
                key={ch.key}
                className="flex items-center gap-3 py-3 border-b last:border-b-0 cursor-pointer"
              >
                <input
                  type="radio"
                  name="channel"
                  value={ch.key}
                  checked={paymentChannel === ch.key}
                  onChange={() => setPaymentChannel(ch.key)}
                  className="w-4 h-4"
                  style={{ accentColor: "#FF6B00" }}
                />
                <span className="text-xl">{ch.emoji}</span>
                <span className="text-gray-700">{ch.label}</span>
              </label>
            ))}
          </div>

          {errorMsg && (
            <p className="text-red-500 text-sm text-center">{errorMsg}</p>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-5 pb-8 pt-2 flex flex-col gap-3">
          <button
            onClick={handleConfirmPay}
            disabled={createOrder.isPending || prepay.isPending}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #FF8C00, #FF6B00)" }}
          >
            {createOrder.isPending || prepay.isPending
              ? "处理中..."
              : `立即支付 ¥${selectedPlan.price}`}
          </button>
          <button
            onClick={handleCancel}
            className="w-full py-3 rounded-2xl font-medium text-gray-500 bg-white shadow-sm"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  // ---- 已是会员 — 展示状态 ----
  if (user && statusData?.isMember) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* 橙色 Banner */}
        <div
          className="w-full flex flex-col items-center justify-center pt-14 pb-16 px-6"
          style={{ background: "linear-gradient(160deg, #FF8C00 0%, #FF6B00 100%)" }}
        >
          <h1 className="text-4xl font-bold text-white mb-4 tracking-wide">瀛姬年度会员</h1>
          <p className="text-white/90 text-base text-center">您已是尊贵会员</p>
        </div>

        <div className="flex-1 px-4 py-6 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="text-5xl mb-4">🏆</div>
            <p className="text-gray-500 text-sm mb-1">会员到期时间</p>
            <p className="text-xl font-bold text-gray-800">
              {formatDate(statusData.expiresAt ?? null)}
            </p>
            {statusData.daysRemaining != null && (
              <p className="font-medium mt-2" style={{ color: "#FF6B00" }}>
                还剩 {statusData.daysRemaining} 天
              </p>
            )}
          </div>

          {/* 特性卡片 */}
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl px-5 py-5 flex items-center gap-4 shadow-sm">
              <span className="text-4xl flex-shrink-0">{f.emoji}</span>
              <div>
                <p className="text-gray-900 font-bold text-base mb-1">{f.title}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 续费按钮 */}
        <div className="px-4 pb-8 pt-2">
          <button
            onClick={handleOpenMembership}
            className="w-full rounded-2xl py-5 flex flex-col items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #FF8C00, #FF6B00)" }}
          >
            <span className="text-white font-bold text-2xl">续费年度会员</span>
            <span className="text-white/90 text-base mt-1">¥{displayPrice} / 年</span>
          </button>
        </div>
      </div>
    );
  }

  // ---- 主落地页（landing）----
  return (
    <div
      className="min-h-screen bg-gray-100 flex flex-col"
      style={{ fontFamily: "'PingFang SC', 'Helvetica Neue', sans-serif" }}
    >
      {/* 橙色顶部 Banner */}
      <div
        className="w-full flex flex-col items-center justify-center pt-14 pb-16 px-6"
        style={{ background: "linear-gradient(160deg, #FF8C00 0%, #FF6B00 100%)" }}
      >
        <h1
          className="text-4xl font-bold text-white mb-4 tracking-wide"
          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
        >
          瀛姬年度会员
        </h1>
        <p className="text-white/90 text-base text-center leading-relaxed">
          解锁全平台约课权限
        </p>
        <p className="text-white/90 text-base text-center mt-1">
          专业教师 · 灵活时间 · 优质体验
        </p>
      </div>

      {/* 特性卡片列表 */}
      <div className="flex-1 px-4 py-6 flex flex-col gap-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="bg-white rounded-2xl px-5 py-5 flex items-center gap-4 shadow-sm"
          >
            <span className="text-4xl flex-shrink-0">{f.emoji}</span>
            <div>
              <p className="text-gray-900 font-bold text-base mb-1">{f.title}</p>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 底部固定立即开通按钮 */}
      <div className="px-4 pb-8 pt-2">
        <button
          onClick={handleOpenMembership}
          className="w-full rounded-2xl py-5 flex flex-col items-center justify-center shadow-lg active:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #FF8C00, #FF6B00)" }}
        >
          <span className="text-white font-bold text-2xl">立即开通会员</span>
          <span className="text-white/90 text-base mt-1">¥{displayPrice} / 年</span>
        </button>
      </div>
    </div>
  );
}
