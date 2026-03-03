import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "../_core/hooks/useAuth";

// ========== 类型定义 ==========
type PaymentChannel = "wechat" | "alipay";
type Step = "select" | "paying" | "success";

// ========== 预设充值金额 ==========
const PRESET_AMOUNTS = [50, 100, 200, 500, 1000];

// ========== 支付渠道配置 ==========
const CHANNELS: { key: PaymentChannel; label: string; emoji: string; bgColor: string }[] = [
  { key: "wechat", label: "微信支付", emoji: "💚", bgColor: "#E8F5E9" },
  { key: "alipay", label: "支付宝支付", emoji: "💙", bgColor: "#E3F2FD" },
];

export default function Recharge() {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("select");
  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState("");
  const [channel, setChannel] = useState<PaymentChannel>("wechat");
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
        const url = new URL(window.location.href);
        url.searchParams.delete("token");
        window.history.replaceState({}, "", url.toString());
        setTokenLoginDone(true);
        window.location.reload();
      })
      .catch(() => {
        setTokenLoginDone(true);
      });
  }, []);

  // 查询会员状态（含账户余额）
  const { data: statusData, refetch: refetchStatus } =
    trpc.membership.getStatus.useQuery(undefined, { enabled: !!user });

  // 查询充值订单状态（支付中轮询）
  const { data: rechargeStatus } = trpc.membership.getRechargeOrderStatus.useQuery(
    { orderId: orderId! },
    { enabled: step === "paying" && !!orderId, refetchInterval: 3000 }
  );

  // 创建充值订单
  const createRechargeOrder = trpc.membership.createRechargeOrder.useMutation();
  // 模拟确认充值（开发测试用）
  const confirmRecharge = trpc.membership.confirmRecharge.useMutation();

  // 监听充值订单状态
  useEffect(() => {
    if (step === "paying" && rechargeStatus?.status === "paid") {
      refetchStatus();
      setStep("success");
    }
  }, [rechargeStatus, step, refetchStatus]);

  // 获取实际充值金额
  const finalAmount = customAmount ? parseFloat(customAmount) : amount;
  const isValidAmount = finalAmount >= 1 && finalAmount <= 10000 && !isNaN(finalAmount);

  // 处理充值
  const handleRecharge = async () => {
    if (!isValidAmount) {
      setErrorMsg("请输入有效金额（1 ~ 10000 元）");
      return;
    }
    setErrorMsg("");
    try {
      const result = await createRechargeOrder.mutateAsync({
        amount: finalAmount,
        paymentChannel: channel,
      });
      setOrderId(result.orderId);

      if (result.channel === "wechat" && "mwebUrl" in result) {
        setStep("paying");
        window.location.href = result.mwebUrl;
        return;
      }
      if (result.channel === "alipay" && "formHtml" in result) {
        setStep("paying");
        const div = document.createElement("div");
        div.innerHTML = result.formHtml;
        document.body.appendChild(div);
        return;
      }
      setStep("paying");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "充值失败，请重试");
    }
  };

  // 「我已完成支付」— 手动确认充值
  const handleCheckPayment = async () => {
    if (!orderId) return;
    try {
      // 开发环境：直接调用确认接口
      await confirmRecharge.mutateAsync({ orderId });
      await refetchStatus();
      setStep("success");
    } catch {
      setErrorMsg("暂未检测到支付成功，请稍后再试或联系客服");
    }
  };

  // 充值完成后跳转
  const handleFinish = () => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect) {
      window.location.href = redirect;
    } else {
      window.location.href = "/membership";
    }
  };

  const accountBalance = statusData?.accountBalance ?? 0;

  // ---- Token 登录中 ----
  if (!tokenLoginDone && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-400 text-base">正在验证身份…</div>
      </div>
    );
  }

  // ---- 加载中 ----
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-400 text-base">加载中…</div>
      </div>
    );
  }

  // ---- 未登录 ----
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-6">
        <div className="text-center">
          <p className="text-gray-600 mb-4">请先登录后再充值</p>
          <button
            onClick={() => (window.location.href = "/login?redirect=/recharge")}
            className="px-6 py-3 rounded-2xl font-bold text-white"
            style={{ background: "linear-gradient(135deg, #FF8C00, #FF6B00)" }}
          >
            去登录
          </button>
        </div>
      </div>
    );
  }

  // ---- 充值成功页 ----
  if (step === "success") {
    return (
      <div
        className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-6"
        style={{ fontFamily: "'PingFang SC', 'Helvetica Neue', sans-serif" }}
      >
        <div className="text-6xl mb-6">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">充值成功！</h2>
        <p className="text-gray-500 text-center mb-2">
          已成功充值 <span className="font-bold text-orange-500">¥{finalAmount.toFixed(2)}</span>
        </p>
        <p className="text-gray-500 text-center mb-8">
          当前余额：<span className="font-bold text-green-500">¥{(statusData?.accountBalance ?? 0).toFixed(2)}</span>
        </p>
        <button
          onClick={handleFinish}
          className="w-full max-w-sm py-4 rounded-2xl font-bold text-lg text-white"
          style={{ background: "linear-gradient(135deg, #FF8C00, #FF6B00)" }}
        >
          返回继续
        </button>
      </div>
    );
  }

  // ---- 支付中页 ----
  if (step === "paying") {
    return (
      <div
        className="min-h-screen bg-gray-100 flex flex-col"
        style={{ fontFamily: "'PingFang SC', 'Helvetica Neue', sans-serif" }}
      >
        <div
          className="w-full flex flex-col items-center justify-center py-10 px-6"
          style={{ background: "linear-gradient(160deg, #FF8C00 0%, #FF6B00 100%)" }}
        >
          <h1 className="text-2xl font-bold text-white">等待支付确认</h1>
          <p className="text-white/80 text-sm mt-1">请在支付页面完成支付</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          <div className="text-4xl">⏳</div>
          <p className="text-gray-500 text-center">
            充值金额：<span className="font-bold text-orange-500">¥{finalAmount.toFixed(2)}</span>
          </p>
          <p className="text-gray-400 text-sm text-center">正在等待支付结果…</p>
          {errorMsg && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}
        </div>
        <div className="px-5 pb-8 flex flex-col gap-3">
          <button
            onClick={handleCheckPayment}
            disabled={confirmRecharge.isPending}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #FF8C00, #FF6B00)" }}
          >
            {confirmRecharge.isPending ? "确认中..." : "我已完成支付"}
          </button>
          <button
            onClick={() => { setStep("select"); setOrderId(null); }}
            className="w-full py-3 rounded-2xl font-medium border border-orange-300 text-orange-500 bg-white"
          >
            返回修改
          </button>
        </div>
      </div>
    );
  }

  // ---- 充值选择页 ----
  return (
    <div
      className="min-h-screen bg-gray-100 flex flex-col"
      style={{ fontFamily: "'PingFang SC', 'Helvetica Neue', sans-serif" }}
    >
      {/* 顶部 Banner */}
      <div
        className="w-full flex flex-col items-center justify-center py-10 px-6"
        style={{ background: "linear-gradient(160deg, #FF8C00 0%, #FF6B00 100%)" }}
      >
        <h1 className="text-2xl font-bold text-white mb-1">账户充值</h1>
        <p className="text-white/80 text-sm">充值后可用余额支付会员</p>
      </div>

      {/* 当前余额 */}
      <div className="bg-white mx-4 mt-4 rounded-2xl px-5 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">💰</span>
          <span className="text-gray-700 font-medium">当前余额</span>
        </div>
        <span className="text-green-500 font-bold text-lg">¥{accountBalance.toFixed(2)}</span>
      </div>

      {/* 充值金额选择 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl px-5 py-4 shadow-sm">
        <p className="text-gray-700 font-semibold mb-3">选择充值金额</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              onClick={() => { setAmount(preset); setCustomAmount(""); }}
              className="py-3 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: amount === preset && !customAmount ? "linear-gradient(135deg, #FF8C00, #FF6B00)" : "#F3F4F6",
                color: amount === preset && !customAmount ? "white" : "#374151",
                border: amount === preset && !customAmount ? "none" : "1px solid #E5E7EB",
              }}
            >
              ¥{preset}
            </button>
          ))}
        </div>
        {/* 自定义金额 */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
          <input
            type="number"
            min="1"
            max="10000"
            placeholder="自定义金额（1-10000）"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              if (e.target.value) setAmount(0);
            }}
            className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-orange-400"
            style={{ background: customAmount ? "#FFF8F0" : "white" }}
          />
        </div>
        {/* 显示实际充值金额 */}
        {isValidAmount && (
          <p className="text-orange-500 text-sm mt-2 text-right font-medium">
            充值金额：¥{finalAmount.toFixed(2)}
          </p>
        )}
      </div>

      {/* 支付方式 */}
      <div className="mx-4 mt-4 flex flex-col gap-3">
        {CHANNELS.map((ch) => (
          <button
            key={ch.key}
            onClick={() => setChannel(ch.key)}
            className="w-full bg-white rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm transition-all"
            style={{
              border: channel === ch.key ? "2px solid #FF6B00" : "2px solid transparent",
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: ch.bgColor }}
            >
              {ch.emoji}
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-800 font-semibold text-base">{ch.label}</p>
              <p className="text-gray-400 text-sm mt-0.5">安全快捷</p>
            </div>
            <div
              className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              style={{
                borderColor: channel === ch.key ? "#FF6B00" : "#D1D5DB",
                background: channel === ch.key ? "#FF6B00" : "white",
              }}
            >
              {channel === ch.key && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
            </div>
          </button>
        ))}
      </div>

      {errorMsg && (
        <p className="text-red-500 text-sm text-center px-5 mt-3">{errorMsg}</p>
      )}

      {/* 底部按钮 */}
      <div className="px-5 pb-8 pt-4 mt-auto flex flex-col gap-3">
        <button
          onClick={handleRecharge}
          disabled={!isValidAmount || createRechargeOrder.isPending}
          className="w-full py-4 rounded-2xl font-bold text-lg text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #FF8C00, #FF6B00)" }}
        >
          {createRechargeOrder.isPending
            ? "处理中..."
            : isValidAmount
            ? `确认充值 ¥${finalAmount.toFixed(2)}`
            : "请选择充值金额"}
        </button>
        <button
          onClick={() => window.history.back()}
          className="w-full py-3 rounded-2xl font-medium border border-orange-300 text-orange-500 bg-white"
        >
          返回
        </button>
      </div>
    </div>
  );
}
