import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

// ========== 类型定义 ==========
type PaymentChannel = "wechat" | "alipay" | "balance";
type Step = "plans" | "confirm" | "paying" | "success" | "status";

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

function calcSavings(price: number, originalPrice: number | null) {
  if (!originalPrice || originalPrice <= price) return null;
  return Math.round(originalPrice - price);
}

// ========== 主页面 ==========
export default function MembershipH5() {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("plans");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>("wechat");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // 查询套餐列表
  const { data: plansData, isLoading: plansLoading } =
    trpc.membership.listPlans.useQuery();

  // 查询会员状态
  const { data: statusData, isLoading: _statusLoading, refetch: refetchStatus } =
    trpc.membership.getStatus.useQuery(undefined, {
      enabled: !!user,
    });

  // 查询订单状态（支付中轮询）
  const { data: orderStatusData, refetch: refetchOrderStatus } =
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

  // 处理选择套餐
  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep("confirm");
    setErrorMsg("");
  };

  // 处理确认支付
  const handleConfirmPay = async () => {
    if (!selectedPlan) return;
    setErrorMsg("");

    try {
      // 创建订单
      const orderResult = await createOrder.mutateAsync({
        planId: selectedPlan.id,
      });
      setOrderId(orderResult.orderId);

      // 预下单
      const prepayResult = await prepay.mutateAsync({
        orderId: orderResult.orderId,
        paymentChannel,
      });

      // 余额支付直接成功
      if (prepayResult.channel === "balance" && prepayResult.success) {
        await refetchStatus();
        setStep("success");
        return;
      }

      // 微信H5支付：跳转到微信支付页面
      if (prepayResult.channel === "wechat" && "mwebUrl" in prepayResult) {
        setStep("paying");
        window.location.href = prepayResult.mwebUrl;
        return;
      }

      // 支付宝H5支付：提交表单
      if (prepayResult.channel === "alipay" && "formHtml" in prepayResult) {
        setStep("paying");
        const div = document.createElement("div");
        div.innerHTML = prepayResult.formHtml;
        document.body.appendChild(div);
        return;
      }

      setStep("paying");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "支付失败，请重试";
      setErrorMsg(msg);
    }
  };

  // 处理取消
  const handleCancel = async () => {
    if (orderId) {
      try {
        await cancelOrder.mutateAsync({ orderId });
      } catch {
        // 忽略取消失败
      }
    }
    setStep("plans");
    setOrderId(null);
    setSelectedPlan(null);
  };

  // 未登录
  if (!authLoading && !user) {
    return (
      <div className="membership-h5">
        <div className="h5-hero">
          <div className="hero-badge">✦ 瀛姬会员</div>
          <h1>开通会员，解锁专属权益</h1>
          <p>登录后即可查看套餐并开通会员</p>
        </div>
        <div className="h5-login-section">
          <a href={getLoginUrl()} className="btn-primary btn-full">
            立即登录
          </a>
        </div>
        <style>{h5Styles}</style>
      </div>
    );
  }

  // 加载中
  if (authLoading || plansLoading) {
    return (
      <div className="membership-h5">
        <div className="h5-loading">
          <div className="loading-spinner" />
          <p>加载中…</p>
        </div>
        <style>{h5Styles}</style>
      </div>
    );
  }

  const plans = plansData?.plans || [];
  const isActiveMember = statusData?.isMember;

  return (
    <div className="membership-h5">
      <style>{h5Styles}</style>

      {/* Hero 区域 */}
      <div className="h5-hero">
        <div className="hero-badge">✦ 瀛姬会员</div>
        <h1>开通会员，解锁专属权益</h1>
        {isActiveMember && statusData ? (
          <div className="hero-member-badge">
            <span>✓ 当前会员</span>
            <span>剩余 {statusData.daysRemaining} 天</span>
          </div>
        ) : (
          <p>加入瀛姬会员，享受专属折扣与优先服务</p>
        )}
      </div>

      {/* 步骤：套餐列表 */}
      {step === "plans" && (
        <div className="h5-content">
          {/* 当前会员状态卡片 */}
          {isActiveMember && statusData && (
            <div className="member-status-card">
              <div className="status-card-header">
                <span className="status-icon">👑</span>
                <div>
                  <div className="status-title">会员有效期</div>
                  <div className="status-date">
                    {formatDate(statusData.expiresAt)} 到期
                  </div>
                </div>
                <div className="status-days">
                  <span className="days-num">{statusData.daysRemaining}</span>
                  <span className="days-label">天</span>
                </div>
              </div>
              {statusData.currentPlan && (
                <div className="status-plan-name">
                  当前套餐：{statusData.currentPlan.name}
                </div>
              )}
              <button
                className="btn-outline btn-sm"
                onClick={() => setStep("status")}
              >
                查看会员详情
              </button>
            </div>
          )}

          {/* 套餐列表 */}
          <div className="plans-header">
            <h2>{isActiveMember ? "续费套餐" : "选择套餐"}</h2>
            <p>{isActiveMember ? "续费将在当前到期时间基础上延续" : "选择适合您的会员套餐"}</p>
          </div>

          <div className="plans-list">
            {plans.map((plan, idx) => {
              const savings = calcSavings(plan.price, plan.originalPrice);
              const isRecommended = idx === 1; // 季度套餐推荐
              return (
                <div
                  key={plan.id}
                  className={`plan-card ${isRecommended ? "plan-recommended" : ""}`}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {isRecommended && (
                    <div className="plan-tag">最受欢迎</div>
                  )}
                  {savings && (
                    <div className="plan-savings">省 ¥{savings}</div>
                  )}
                  <div className="plan-name">{plan.name}</div>
                  <div className="plan-duration">{plan.duration} 天</div>
                  <div className="plan-price-row">
                    <span className="plan-price">¥{plan.price}</span>
                    {plan.originalPrice && (
                      <span className="plan-original">¥{plan.originalPrice}</span>
                    )}
                  </div>
                  {plan.description && (
                    <div className="plan-desc">{plan.description}</div>
                  )}
                  <ul className="plan-benefits">
                    {plan.benefits.slice(0, 3).map((b, i) => (
                      <li key={i}>✓ {b}</li>
                    ))}
                    {plan.benefits.length > 3 && (
                      <li className="more">+{plan.benefits.length - 3} 项权益</li>
                    )}
                  </ul>
                  <div className="plan-cta">
                    {isActiveMember ? "立即续费" : "立即开通"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 权益说明 */}
          <div className="benefits-section">
            <h3>会员专属权益</h3>
            <div className="benefits-grid">
              <div className="benefit-item">
                <span className="benefit-icon">🎯</span>
                <span>课程折扣</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">⚡</span>
                <span>优先预约</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">💬</span>
                <span>专属客服</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">🎉</span>
                <span>专属活动</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤：确认支付 */}
      {step === "confirm" && selectedPlan && (
        <div className="h5-content">
          <div className="confirm-header">
            <button className="btn-back" onClick={() => setStep("plans")}>
              ← 返回
            </button>
            <h2>确认订单</h2>
          </div>

          {/* 订单详情 */}
          <div className="order-detail-card">
            <div className="order-row">
              <span className="order-label">套餐</span>
              <span className="order-value">{selectedPlan.name}</span>
            </div>
            <div className="order-row">
              <span className="order-label">有效期</span>
              <span className="order-value">{selectedPlan.duration} 天</span>
            </div>
            <div className="order-row order-total">
              <span className="order-label">应付金额</span>
              <span className="order-price">¥{selectedPlan.price}</span>
            </div>
          </div>

          {/* 权益列表 */}
          <div className="confirm-benefits">
            <div className="benefits-title">套餐权益</div>
            {selectedPlan.benefits.map((b, i) => (
              <div key={i} className="benefit-row">
                <span className="benefit-check">✓</span>
                <span>{b}</span>
              </div>
            ))}
          </div>

          {/* 支付方式 */}
          <div className="payment-section">
            <div className="payment-title">支付方式</div>
            <div className="payment-options">
              {(
                [
                  { key: "wechat", label: "微信支付", icon: "💚" },
                  { key: "alipay", label: "支付宝", icon: "💙" },
                  { key: "balance", label: "账户余额", icon: "💰" },
                ] as { key: PaymentChannel; label: string; icon: string }[]
              ).map((opt) => (
                <div
                  key={opt.key}
                  className={`payment-option ${paymentChannel === opt.key ? "selected" : ""}`}
                  onClick={() => setPaymentChannel(opt.key)}
                >
                  <span className="payment-icon">{opt.icon}</span>
                  <span className="payment-label">{opt.label}</span>
                  <span className="payment-radio">
                    {paymentChannel === opt.key ? "●" : "○"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="error-msg">{errorMsg}</div>
          )}

          <div className="confirm-actions">
            <button
              className="btn-primary btn-full"
              onClick={handleConfirmPay}
              disabled={createOrder.isPending || prepay.isPending}
            >
              {createOrder.isPending || prepay.isPending
                ? "处理中…"
                : `确认支付 ¥${selectedPlan.price}`}
            </button>
            <button className="btn-ghost btn-full" onClick={handleCancel}>
              取消
            </button>
          </div>
        </div>
      )}

      {/* 步骤：支付中 */}
      {step === "paying" && (
        <div className="h5-content">
          <div className="paying-screen">
            <div className="paying-spinner" />
            <h2>等待支付确认</h2>
            <p>请在支付页面完成支付，完成后自动跳转</p>
            <button
              className="btn-outline"
              onClick={() => {
                refetchOrderStatus();
              }}
            >
              我已完成支付
            </button>
            <button className="btn-ghost" onClick={handleCancel}>
              取消支付
            </button>
          </div>
        </div>
      )}

      {/* 步骤：支付成功 */}
      {step === "success" && statusData && (
        <div className="h5-content">
          <div className="success-screen">
            <div className="success-icon">🎉</div>
            <h2>开通成功！</h2>
            <p>欢迎成为瀛姬会员</p>
            <div className="success-info">
              <div className="success-row">
                <span>套餐</span>
                <span>{statusData.currentPlan?.name || selectedPlan?.name}</span>
              </div>
              <div className="success-row">
                <span>到期时间</span>
                <span>{formatDate(statusData.expiresAt)}</span>
              </div>
              <div className="success-row">
                <span>剩余天数</span>
                <span>{statusData.daysRemaining} 天</span>
              </div>
            </div>
            <button
              className="btn-primary btn-full"
              onClick={() => setStep("plans")}
            >
              返回首页
            </button>
          </div>
        </div>
      )}

      {/* 步骤：会员详情 */}
      {step === "status" && statusData && (
        <div className="h5-content">
          <div className="confirm-header">
            <button className="btn-back" onClick={() => setStep("plans")}>
              ← 返回
            </button>
            <h2>我的会员</h2>
          </div>

          <div className="status-detail-card">
            <div className="status-detail-icon">👑</div>
            <div className="status-detail-title">
              {statusData.isMember ? "会员有效" : "暂无会员"}
            </div>
            {statusData.isMember && (
              <>
                <div className="status-detail-days">
                  <span className="big-num">{statusData.daysRemaining}</span>
                  <span className="big-label">天后到期</span>
                </div>
                <div className="status-detail-rows">
                  <div className="detail-row">
                    <span>激活时间</span>
                    <span>{formatDate(statusData.activatedAt)}</span>
                  </div>
                  <div className="detail-row">
                    <span>到期时间</span>
                    <span>{formatDate(statusData.expiresAt)}</span>
                  </div>
                  {statusData.currentPlan && (
                    <div className="detail-row">
                      <span>当前套餐</span>
                      <span>{statusData.currentPlan.name}</span>
                    </div>
                  )}
                </div>
                {statusData.currentPlan?.benefits && (
                  <div className="status-benefits">
                    <div className="benefits-title">我的权益</div>
                    {statusData.currentPlan.benefits.map((b, i) => (
                      <div key={i} className="benefit-row">
                        <span className="benefit-check">✓</span>
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <button
            className="btn-primary btn-full"
            onClick={() => setStep("plans")}
          >
            {statusData.isMember ? "立即续费" : "立即开通"}
          </button>
        </div>
      )}

      {/* 底部说明 */}
      <div className="h5-footer">
        <p>会员服务由瀛姬体验馆提供 · 如有疑问请联系客服</p>
      </div>
    </div>
  );
}

// ========== 样式 ==========
const h5Styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .membership-h5 {
    min-height: 100vh;
    background: #0a0a0f;
    color: #f0e8ff;
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
    max-width: 480px;
    margin: 0 auto;
    position: relative;
    overflow-x: hidden;
  }

  /* Hero */
  .h5-hero {
    background: linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%);
    padding: 48px 24px 32px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .h5-hero::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at 60% 40%, rgba(180,100,255,0.15) 0%, transparent 60%);
    pointer-events: none;
  }
  .hero-badge {
    display: inline-block;
    background: rgba(180,100,255,0.2);
    border: 1px solid rgba(180,100,255,0.4);
    color: #c084fc;
    padding: 4px 16px;
    border-radius: 20px;
    font-size: 12px;
    letter-spacing: 2px;
    margin-bottom: 16px;
  }
  .h5-hero h1 {
    font-size: 24px;
    font-weight: 700;
    color: #f0e8ff;
    margin-bottom: 8px;
    line-height: 1.3;
  }
  .h5-hero p {
    font-size: 14px;
    color: rgba(240,232,255,0.6);
  }
  .hero-member-badge {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 8px;
  }
  .hero-member-badge span {
    background: rgba(180,100,255,0.2);
    border: 1px solid rgba(180,100,255,0.3);
    color: #c084fc;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 13px;
  }

  /* Content */
  .h5-content {
    padding: 20px 16px 100px;
  }

  /* Loading */
  .h5-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    gap: 16px;
    color: rgba(240,232,255,0.5);
  }
  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(180,100,255,0.2);
    border-top-color: #c084fc;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Member Status Card */
  .member-status-card {
    background: linear-gradient(135deg, rgba(180,100,255,0.15), rgba(100,60,200,0.1));
    border: 1px solid rgba(180,100,255,0.3);
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 24px;
  }
  .status-card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  .status-icon { font-size: 28px; }
  .status-title { font-size: 12px; color: rgba(240,232,255,0.5); }
  .status-date { font-size: 14px; color: #f0e8ff; font-weight: 600; }
  .status-days { margin-left: auto; text-align: right; }
  .days-num { font-size: 28px; font-weight: 700; color: #c084fc; }
  .days-label { font-size: 12px; color: rgba(240,232,255,0.5); margin-left: 2px; }
  .status-plan-name {
    font-size: 12px;
    color: rgba(240,232,255,0.5);
    margin-bottom: 12px;
  }

  /* Plans */
  .plans-header { margin-bottom: 16px; }
  .plans-header h2 { font-size: 18px; font-weight: 700; color: #f0e8ff; margin-bottom: 4px; }
  .plans-header p { font-size: 13px; color: rgba(240,232,255,0.5); }

  .plans-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 32px;
  }

  .plan-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 20px;
    cursor: pointer;
    position: relative;
    transition: all 0.2s;
    overflow: hidden;
  }
  .plan-card:active { transform: scale(0.98); }
  .plan-card.plan-recommended {
    background: linear-gradient(135deg, rgba(180,100,255,0.12), rgba(100,60,200,0.08));
    border-color: rgba(180,100,255,0.4);
  }
  .plan-tag {
    position: absolute;
    top: 0;
    right: 0;
    background: linear-gradient(135deg, #c084fc, #7c3aed);
    color: white;
    font-size: 11px;
    padding: 4px 12px;
    border-radius: 0 16px 0 12px;
    font-weight: 600;
  }
  .plan-savings {
    position: absolute;
    top: 12px;
    left: 16px;
    background: rgba(255,100,100,0.15);
    border: 1px solid rgba(255,100,100,0.3);
    color: #f87171;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 8px;
  }
  .plan-name {
    font-size: 18px;
    font-weight: 700;
    color: #f0e8ff;
    margin-bottom: 4px;
    margin-top: 4px;
  }
  .plan-duration {
    font-size: 13px;
    color: rgba(240,232,255,0.5);
    margin-bottom: 12px;
  }
  .plan-price-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 8px;
  }
  .plan-price {
    font-size: 28px;
    font-weight: 700;
    color: #c084fc;
  }
  .plan-original {
    font-size: 14px;
    color: rgba(240,232,255,0.3);
    text-decoration: line-through;
  }
  .plan-desc {
    font-size: 12px;
    color: rgba(240,232,255,0.5);
    margin-bottom: 12px;
  }
  .plan-benefits {
    list-style: none;
    margin-bottom: 16px;
  }
  .plan-benefits li {
    font-size: 13px;
    color: rgba(240,232,255,0.7);
    padding: 3px 0;
  }
  .plan-benefits li.more {
    color: rgba(180,100,255,0.7);
    font-size: 12px;
  }
  .plan-cta {
    background: linear-gradient(135deg, #7c3aed, #c084fc);
    color: white;
    text-align: center;
    padding: 12px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
  }
  .plan-recommended .plan-cta {
    background: linear-gradient(135deg, #c084fc, #7c3aed);
  }

  /* Benefits Section */
  .benefits-section {
    margin-top: 8px;
    padding: 20px;
    background: rgba(255,255,255,0.03);
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.07);
  }
  .benefits-section h3 {
    font-size: 15px;
    font-weight: 600;
    color: #f0e8ff;
    margin-bottom: 16px;
    text-align: center;
  }
  .benefits-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .benefit-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px;
    background: rgba(180,100,255,0.08);
    border-radius: 10px;
  }
  .benefit-icon { font-size: 24px; }
  .benefit-item span:last-child { font-size: 12px; color: rgba(240,232,255,0.7); }

  /* Confirm */
  .confirm-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }
  .confirm-header h2 { font-size: 18px; font-weight: 700; color: #f0e8ff; }
  .btn-back {
    background: none;
    border: none;
    color: rgba(240,232,255,0.6);
    font-size: 14px;
    cursor: pointer;
    padding: 4px 0;
  }

  .order-detail-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 16px;
  }
  .order-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .order-row:last-child { border-bottom: none; }
  .order-label { font-size: 14px; color: rgba(240,232,255,0.5); }
  .order-value { font-size: 14px; color: #f0e8ff; }
  .order-total .order-label { font-weight: 600; color: #f0e8ff; }
  .order-price { font-size: 22px; font-weight: 700; color: #c084fc; }

  .confirm-benefits {
    background: rgba(255,255,255,0.03);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
  }
  .benefits-title {
    font-size: 13px;
    color: rgba(240,232,255,0.5);
    margin-bottom: 10px;
    font-weight: 600;
  }
  .benefit-row {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 4px 0;
    font-size: 13px;
    color: rgba(240,232,255,0.7);
  }
  .benefit-check { color: #c084fc; }

  /* Payment */
  .payment-section {
    margin-bottom: 20px;
  }
  .payment-title {
    font-size: 14px;
    font-weight: 600;
    color: #f0e8ff;
    margin-bottom: 12px;
  }
  .payment-options { display: flex; flex-direction: column; gap: 8px; }
  .payment-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .payment-option.selected {
    border-color: rgba(180,100,255,0.5);
    background: rgba(180,100,255,0.08);
  }
  .payment-icon { font-size: 20px; }
  .payment-label { flex: 1; font-size: 14px; color: #f0e8ff; }
  .payment-radio { font-size: 16px; color: #c084fc; }

  /* Error */
  .error-msg {
    background: rgba(255,100,100,0.1);
    border: 1px solid rgba(255,100,100,0.3);
    color: #f87171;
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 13px;
    margin-bottom: 16px;
  }

  /* Confirm Actions */
  .confirm-actions { display: flex; flex-direction: column; gap: 10px; }

  /* Paying */
  .paying-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px 0;
    gap: 16px;
    text-align: center;
  }
  .paying-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid rgba(180,100,255,0.2);
    border-top-color: #c084fc;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 8px;
  }
  .paying-screen h2 { font-size: 20px; font-weight: 700; color: #f0e8ff; }
  .paying-screen p { font-size: 14px; color: rgba(240,232,255,0.5); }

  /* Success */
  .success-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 0;
    gap: 16px;
    text-align: center;
  }
  .success-icon { font-size: 64px; }
  .success-screen h2 { font-size: 24px; font-weight: 700; color: #f0e8ff; }
  .success-screen p { font-size: 14px; color: rgba(240,232,255,0.5); }
  .success-info {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border-radius: 16px;
    padding: 16px;
    margin: 8px 0 16px;
  }
  .success-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .success-row:last-child { border-bottom: none; }
  .success-row span:first-child { color: rgba(240,232,255,0.5); }
  .success-row span:last-child { color: #f0e8ff; font-weight: 600; }

  /* Status Detail */
  .status-detail-card {
    background: linear-gradient(135deg, rgba(180,100,255,0.12), rgba(100,60,200,0.08));
    border: 1px solid rgba(180,100,255,0.3);
    border-radius: 20px;
    padding: 28px 20px;
    text-align: center;
    margin-bottom: 20px;
  }
  .status-detail-icon { font-size: 48px; margin-bottom: 12px; }
  .status-detail-title { font-size: 18px; font-weight: 700; color: #f0e8ff; margin-bottom: 16px; }
  .status-detail-days {
    margin-bottom: 20px;
  }
  .big-num { font-size: 56px; font-weight: 700; color: #c084fc; }
  .big-label { font-size: 16px; color: rgba(240,232,255,0.5); margin-left: 4px; }
  .status-detail-rows {
    text-align: left;
    margin-bottom: 16px;
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    font-size: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .detail-row span:first-child { color: rgba(240,232,255,0.5); }
  .detail-row span:last-child { color: #f0e8ff; font-weight: 600; }
  .status-benefits {
    text-align: left;
    margin-top: 16px;
  }

  /* Buttons */
  .btn-primary {
    display: block;
    background: linear-gradient(135deg, #7c3aed, #c084fc);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 16px 24px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    text-align: center;
    text-decoration: none;
    transition: opacity 0.2s;
  }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary:active { opacity: 0.85; }
  .btn-outline {
    display: block;
    background: transparent;
    color: #c084fc;
    border: 1px solid rgba(180,100,255,0.4);
    border-radius: 12px;
    padding: 14px 24px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s;
  }
  .btn-outline:active { background: rgba(180,100,255,0.1); }
  .btn-ghost {
    display: block;
    background: transparent;
    color: rgba(240,232,255,0.4);
    border: none;
    border-radius: 12px;
    padding: 14px 24px;
    font-size: 15px;
    cursor: pointer;
    text-align: center;
  }
  .btn-full { width: 100%; }
  .btn-sm { padding: 8px 16px; font-size: 13px; border-radius: 8px; }

  /* Login */
  .h5-login-section {
    padding: 32px 24px;
  }

  /* Footer */
  .h5-footer {
    padding: 20px 24px 40px;
    text-align: center;
  }
  .h5-footer p {
    font-size: 12px;
    color: rgba(240,232,255,0.25);
  }
`;
