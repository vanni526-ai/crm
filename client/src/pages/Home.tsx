import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";

export default function Home() {
  const { data: user } = trpc.auth.me.useQuery();
  
  // 获取本月数据统计
  const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];
  
  const { data: stats } = trpc.analytics.orderStats.useQuery({
    startDate,
    endDate,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">课程交付CRM系统</h1>
          <p className="text-muted-foreground mt-2">
            欢迎回来, {user?.name || user?.nickname || '用户'}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">本月销售额</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{stats?.totalPaymentAmount?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                本月累计收入
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">订单数量</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalOrders || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                本月成交订单
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">老师费用</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{stats?.totalTeacherFee?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                本月老师支出
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">净利润</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{stats?.totalFinalAmount?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                本月到账金额
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>快速操作</CardTitle>
              <CardDescription>常用功能入口</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(user?.role === 'admin' || user?.role === 'sales') && (
                <a href="/orders" className="block p-3 rounded-lg border hover:bg-accent transition-colors">
                  <div className="font-medium">订单管理</div>
                  <div className="text-sm text-muted-foreground">查看和管理客户订单</div>
                </a>
              )}
              {(user?.role === 'admin' || user?.role === 'finance') && (
                <a href="/reconciliations" className="block p-3 rounded-lg border hover:bg-accent transition-colors">
                  <div className="font-medium">财务对账</div>
                  <div className="text-sm text-muted-foreground">查看收支明细和对账报表</div>
                </a>
              )}
              <a href="/schedules" className="block p-3 rounded-lg border hover:bg-accent transition-colors">
                <div className="font-medium">课程排课</div>
                <div className="text-sm text-muted-foreground">查看和管理课程安排</div>
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>系统说明</CardTitle>
              <CardDescription>功能介绍</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">销售人员</div>
                <div className="text-muted-foreground">可以登记客户订单、收款信息</div>
              </div>
              <div>
                <div className="font-medium">财务人员</div>
                <div className="text-muted-foreground">可以管理老师费用结算、财务对账</div>
              </div>
              <div>
                <div className="font-medium">管理员</div>
                <div className="text-muted-foreground">可以管理用户权限、查看所有数据</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
