import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { LogIn, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

export default function LocalLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      // 保存token到localStorage
      localStorage.setItem("auth-token", data.token);
      localStorage.setItem("auth-user", JSON.stringify(data.user));
      
      toast.success("登录成功!");
      
      // 延迟导航,让用户看到成功提示
      setTimeout(() => {
        setLocation("/");
      }, 500);
    },
    onError: (error) => {
      const errorMessage = error.message || "登录失败,请检查用户名和密码";
      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // 基本验证
    if (!username.trim()) {
      setError("请输入用户名");
      setIsLoading(false);
      return;
    }

    if (!password) {
      setError("请输入密码");
      setIsLoading(false);
      return;
    }

    try {
      await loginMutation.mutateAsync({
        username: username.trim(),
        password,
      });
    } catch (err) {
      // 错误已在onError中处理
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleSubmit(e as any);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-lg">
              <LogIn className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">课程交付CRM</h1>
          <p className="text-slate-400">本地账户登录</p>
        </div>

        {/* 登录卡片 */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">登录您的账户</CardTitle>
            <CardDescription className="text-slate-400">
              使用您的用户名和密码登录系统
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 错误提示 */}
              {error && (
                <Alert className="bg-red-950 border-red-800">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-400 ml-2">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* 用户名输入 */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-200">
                  用户名
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
                  autoComplete="username"
                />
              </div>

              {/* 密码输入 */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">
                  密码
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
                  autoComplete="current-password"
                />
              </div>

              {/* 登录按钮 */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 h-10"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    登录中...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    登录
                  </>
                )}
              </Button>
            </form>

            {/* 测试账号提示 */}
            <div className="mt-6 p-4 bg-slate-700 rounded-lg border border-slate-600">
              <p className="text-sm text-slate-300 font-semibold mb-3">
                <CheckCircle className="w-4 h-4 inline mr-2 text-green-500" />
                测试账号
              </p>
              <div className="space-y-2 text-xs text-slate-400">
                <div>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded">admin_test</span>
                  <span className="mx-2">/</span>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded">Test123456</span>
                </div>
                <div>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded">sales_test</span>
                  <span className="mx-2">/</span>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded">Test123456</span>
                </div>
                <div>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded">finance_test</span>
                  <span className="mx-2">/</span>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded">Test123456</span>
                </div>
                <div className="text-slate-500 mt-2">
                  还有: teacher_test, customer_test, partner_test
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 底部信息 */}
        <div className="mt-6 text-center text-slate-400 text-sm">
          <p>系统支持本地账户和Manus OAuth两种登录方式</p>
        </div>
      </div>
    </div>
  );
}
