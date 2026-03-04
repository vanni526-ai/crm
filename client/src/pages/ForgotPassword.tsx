import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, ArrowLeft, Phone, KeyRound, Lock } from "lucide-react";

type Step = "phone" | "code" | "password" | "done";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const sendSmsCodeMutation = trpc.auth.sendSmsCode.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setStep("code");
        setCountdown(60);
        setError(null);
      } else {
        setError(data.error || "发送失败");
      }
    },
    onError: (err) => setError(err.message),
  });

  const resetPasswordMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setStep("done");
        setError(null);
      } else {
        setError(data.error || "重置失败");
      }
    },
    onError: (err) => setError(err.message),
  });

  const handleSendCode = () => {
    setError(null);
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入正确的手机号");
      return;
    }
    sendSmsCodeMutation.mutate({ phone });
  };

  const handleResendCode = () => {
    if (countdown > 0) return;
    sendSmsCodeMutation.mutate({ phone });
    setCountdown(60);
  };

  const handleVerifyCode = () => {
    setError(null);
    if (code.length !== 6) {
      setError("请输入 6 位验证码");
      return;
    }
    setStep("password");
  };

  const handleResetPassword = () => {
    setError(null);
    if (newPassword.length < 6) {
      setError("密码长度至少 6 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    resetPasswordMutation.mutate({ phone, code, newPassword });
  };

  const stepLabels = [
    { key: "phone", label: "输入手机号", icon: Phone },
    { key: "code", label: "验证码", icon: KeyRound },
    { key: "password", label: "设置新密码", icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">重置密码</h1>
          <p className="text-slate-400 text-sm mt-1">通过手机短信验证码重置您的密码</p>
        </div>

        {/* 步骤指示器 */}
        {step !== "done" && (
          <div className="flex items-center justify-center mb-6 gap-2">
            {stepLabels.map((s, i) => {
              const stepOrder = ["phone", "code", "password"];
              const currentIdx = stepOrder.indexOf(step);
              const isActive = s.key === step;
              const isDone = stepOrder.indexOf(s.key) < currentIdx;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive ? "bg-blue-600 text-white" :
                    isDone ? "bg-green-600/20 text-green-400" :
                    "bg-slate-700 text-slate-500"
                  }`}>
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                    {s.label}
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div className={`w-6 h-px ${isDone ? "bg-green-600/40" : "bg-slate-700"}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Card className="bg-slate-800 border-slate-700 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl">
              {step === "phone" && "验证手机号"}
              {step === "code" && "输入验证码"}
              {step === "password" && "设置新密码"}
              {step === "done" && "密码重置成功"}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {step === "phone" && "请输入您注册时使用的手机号"}
              {step === "code" && `验证码已发送至 ${phone.slice(0, 3)}****${phone.slice(7)}`}
              {step === "password" && "请设置您的新密码"}
              {step === "done" && "您的密码已成功重置，请使用新密码登录"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="bg-red-950 border-red-800 mb-4">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-400 ml-2">{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: 手机号 */}
            {step === "phone" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium">手机号</Label>
                  <Input
                    type="tel"
                    placeholder="请输入注册手机号"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setError(null); }}
                    onKeyDown={e => e.key === "Enter" && handleSendCode()}
                    disabled={sendSmsCodeMutation.isPending}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 h-11"
                    autoFocus
                    maxLength={11}
                  />
                </div>
                <Button
                  onClick={handleSendCode}
                  disabled={sendSmsCodeMutation.isPending || phone.length !== 11}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11"
                >
                  {sendSmsCodeMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />发送中...</>
                  ) : "发送验证码"}
                </Button>
              </div>
            )}

            {/* Step 2: 验证码 */}
            {step === "code" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium">短信验证码</Label>
                  <Input
                    type="text"
                    placeholder="请输入 6 位验证码"
                    value={code}
                    onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
                    onKeyDown={e => e.key === "Enter" && handleVerifyCode()}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 h-11 text-center text-lg tracking-widest"
                    autoFocus
                    maxLength={6}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={countdown > 0 || sendSmsCodeMutation.isPending}
                      className="text-xs text-blue-400 hover:text-blue-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                    >
                      {countdown > 0 ? `${countdown}s 后重新发送` : "重新发送验证码"}
                    </button>
                  </div>
                </div>
                <Button
                  onClick={handleVerifyCode}
                  disabled={code.length !== 6}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11"
                >
                  下一步
                </Button>
              </div>
            )}

            {/* Step 3: 新密码 */}
            {step === "password" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium">新密码</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="请输入新密码（至少 6 位）"
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setError(null); }}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 h-11 pr-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium">确认新密码</Label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      placeholder="请再次输入新密码"
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setError(null); }}
                      onKeyDown={e => e.key === "Enter" && handleResetPassword()}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  onClick={handleResetPassword}
                  disabled={resetPasswordMutation.isPending || !newPassword || !confirmPassword}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11"
                >
                  {resetPasswordMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />重置中...</>
                  ) : "确认重置密码"}
                </Button>
              </div>
            )}

            {/* Step 4: 完成 */}
            {step === "done" && (
              <div className="text-center space-y-4 py-2">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                </div>
                <p className="text-slate-300 text-sm">密码已成功重置，请使用新密码登录系统。</p>
                <Button
                  onClick={() => setLocation("/login")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11"
                >
                  前往登录
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 返回登录 */}
        {step !== "done" && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setLocation("/login")}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回登录
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
