import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "../_core/hooks/useAuth";

// ========== 类型定义 ==========
type PaymentChannel = "wechat" | "alipay" | "balance" | "recharge";
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
  { emoji: "🎯", title: "专属约课权限", desc: "解锁全平台课程预约功能，随时随地约课" },
  { emoji: "👩‍🏫", title: "优质教师资源", desc: "匹配全国各城市专业教师，一对一精品教学" },
  { emoji: "📅", title: "灵活时间安排", desc: "根据您的时间自由选择上课时段，弹性安排" },
  { emoji: "🏆", title: "会员专属服务", desc: "享受会员专属客服支持，优先处理您的需求" },
  { emoji: "🔄", title: "一年有效期", desc: "购买后立即生效，365天内无限次约课" },
];

// ========== 支付方式配置 ==========
const PAYMENT_CHANNELS: {
  key: PaymentChannel;
  label: string;
  desc: string;
  bgColor: string;
  emoji: string;
}[] = [
  { key: "wechat", label: "微信支付", desc: "使用微信完成支付", bgColor: "#E8F5E9", emoji: "💚" },
  { key: "alipay", label: "支付宝支付", desc: "使用支付宝完成支付", bgColor: "#E3F2FD", emoji: "💙" },
  { key: "balance", label: "账户余额支付", desc: "使用账户余额支付", bgColor: "#FFF3E0", emoji: "💰" },
  { key: "recharge", label: "账户充值", desc: "充值后使用余额支付", bgColor: "#EDE7F6", emoji: "➕" },
];

// ========== 主页面 ==========
export default function MembershipH5() {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("landing");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>("wechat");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [tokenLoginDone, setTokenLoginDone] = useState(false);
  const loginWithTokenMutation = trpc.auth.loginWithToken.useMutation();
  const tokenProcessed = useRef(false);

  // ---- URL token 自动登录 ----
  useEffect(() => {
    if (tokenProcessed.current) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setTokenLoginDone(true);
      return;
    }
    tokenProcessed.current = true;
    loginWithTokenMutation
      .mutateAsync({ token })
      .then(() => {
        // 清除 URL 中的 token 参数，避免泄露
        const url = new URL(window.location.href);
        url.searchParams.delete("token");
        window.history.replaceState({}, "", url.toString());
        setTokenLoginDone(true);
        // 刷新页面以让 useAuth 重新读取 session
        window.location.reload();
      })
      .catch(() => {
        setTokenLoginDone(true);
      });
  }, []);

  // 查询套餐列表
  const { data: plansData, isLoading: plansLoading } =
    trpc.membership.listPlans.useQuery();

  // 查询会员状态（含账户余额）
  const { data: statusData, refetch: refetchStatus } =
    trpc.membership.getStatus.useQuery(undefined, {
      enabled: !!user,
    });

  // 查询订单状态（支付中轮询）
  const { data: orderStatusData } = trpc.membership.getOrderStatus.useQuery(
    { orderId: orderId! },
    { enabled: step === "paying" && !!orderId, refetchInterval: 3000 }
  );

  // 创建订单
  const createOrder = trpc.membership.createOrder.useMutation();
  // 预下单
  const prepay = trpc.membership.prepay.useMutation();
  // 取消订单
  const cancelOrder = trpc.membership.cancelOrder.useMutation();

  // 监听订单状态变化（轮询到已支付）
  useEffect(() => {
    if (step === "paying" && orderStatusData?.status === "paid") {
      refetchStatus();
      setStep("success");
    }
  }, [orderStatusData, step, refetchStatus]);

  // 取年度套餐
  const yearPlan: Plan | null =
    plansData?.plans?.find((p: Plan) => p.duration >= 365) ??
    plansData?.plans?.[0] ??
    null;

  const displayPrice = yearPlan?.price ?? 39;
  const accountBalance = statusData?.accountBalance ?? 0;

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
    // 充值跳转
    if (paymentChannel === "recharge") {
      window.location.href = `/recharge?redirect=/membership`;
      return;
    }
    setErrorMsg("");
    try {
      const orderResult = await createOrder.mutateAsync({ planId: selectedPlan.id });
      setOrderId(orderResult.orderId);
      const prepayResult = await prepay.mutateAsync({
        orderId: orderResult.orderId,
        paymentChannel: paymentChannel as "wechat" | "alipay" | "balance",
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

  // 「我已完成支付」— 手动刷新会员状态
  const handleCheckPayment = async () => {
    const result = await refetchStatus();
    if (result.data?.isMember) {
      setStep("success");
    } else {
      setErrorMsg("暂未检测到支付成功，请稍后再试或联系客服");
    }
  };

  // ---- Token 登录中 ----
  if (!tokenLoginDone && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-400 text-base">正在验证身份…</div>
      </div>
    );
  }

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
          <div className="text-4xl">⏳</div>
          <p className="text-gray-500 text-center">正在等待支付结果…</p>
          {errorMsg && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}
        </div>
        <div className="px-5 pb-8 flex flex-col gap-3">
          <button
            onClick={handleCheckPayment}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white"
            style={{ background: "linear-gradient(135deg, #FF8C00, #FF6B00)" }}
          >
            我已完成支付
          </button>
          <button
            onClick={handleCancel}
            className="w-full py-3 rounded-2xl font-medium border border-orange-300 text-orange-500 bg-white"
          >
            返回修改
          </button>
        </div>
      </div>
    );
  }

  // ---- 确认支付页（参考图示设计）----
  if (step === "confirm" && selectedPlan) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col" style={{ fontFamily: "'PingFang SC', 'Helvetica Neue', sans-serif" }}>
        {/* 顶部账户余额 */}
        <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <span className="text-gray-700 font-medium">账户余额</span>
          </div>
          <span className="text-green-500 font-bold text-lg">
            ¥{accountBalance.toFixed(2)}
          </span>
        </div>

        {/* 订单信息 */}
        <div className="bg-white mx-4 mt-4 rounded-2xl px-5 py-4 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">商品</span>
            <span className="text-gray-800 font-medium text-sm">{selectedPlan.name}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-500 text-sm">有效期</span>
            <span className="text-gray-800 text-sm">{selectedPlan.duration} 天</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-500 text-sm">应付金额</span>
            <span className="font-bold text-xl" style={{ color: "#FF6B00" }}>
              ¥{selectedPlan.price.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 支付方式列表 */}
        <div className="flex-1 px-4 mt-4 flex flex-col gap-3">
          {PAYMENT_CHANNELS.map((ch) => (
            <button
              key={ch.key}
              onClick={() => setPaymentChannel(ch.key)}
              className="w-full bg-white rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm transition-all"
              style={{
                border: paymentChannel === ch.key ? "2px solid #FF6B00" : "2px solid transparent",
              }}
            >
              {/* 图标 */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: ch.bgColor }}
              >
                {ch.emoji}
              </div>
              {/* 文字 */}
              <div className="flex-1 text-left">
                <p className="text-gray-800 font-semibold text-base">{ch.label}</p>
                <p className="text-gray-400 text-sm mt-0.5">
                  {ch.key === "balance"
                    ? `当前余额 ¥${accountBalance.toFixed(2)}`
                    : ch.desc}
                </p>
              </div>
              {/* 单选圆圈 */}
              <div
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: paymentChannel === ch.key ? "#FF6B00" : "#D1D5DB",
                  background: paymentChannel === ch.key ? "#FF6B00" : "white",
                }}
              >
                {paymentChannel === ch.key && (
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                )}
              </div>
            </button>
          ))}
        </div>

        {errorMsg && (
          <p className="text-red-500 text-sm text-center px-5 mt-2">{errorMsg}</p>
        )}

        {/* 底部按钮 */}
        <div className="px-5 pb-8 pt-4 flex flex-col gap-3">
          <button
            onClick={handleConfirmPay}
            disabled={createOrder.isPending || prepay.isPending}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #FF8C00, #FF6B00)" }}
          >
            {createOrder.isPending || prepay.isPending
              ? "处理中..."
              : `确认支付 ¥${selectedPlan.price.toFixed(2)}`}
          </button>
          <button
            onClick={handleCancel}
            className="w-full py-3 rounded-2xl font-medium border border-orange-300 text-orange-500 bg-white"
          >
            返回修改
          </button>
        </div>
      </div>
    );
  }

  // ---- 已是会员 — 展示状态 ----
  if (user && statusData?.isMember) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
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
              <p className="text-sm text-orange-500 mt-1">
                还剩 {statusData.daysRemaining} 天
              </p>
            )}
          </div>
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
