import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";
import { Link } from "wouter";

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

        {/* 快捷操作和系统说明 */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* 左侧:快捷操作 */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">快捷操作</h2>
            <p className="text-sm text-muted-foreground mb-4">常用功能入口</p>
            <div className="grid gap-4 md:grid-cols-2">
            {/* 订单管理 */}
            <Link href="/orders">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">订单管理</h3>
                  <p className="text-sm text-muted-foreground">查看和管理客户订单</p>
                </CardContent>
              </Card>
            </Link>

            {/* 财务对账 */}
            <Link href="/reconciliations">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">财务对账</h3>
                  <p className="text-sm text-muted-foreground">查看收支明细和对账报表</p>
                </CardContent>
              </Card>
            </Link>

            {/* 顾客情况 */}
            <Link href="/customers">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">顾客情况</h3>
                  <p className="text-sm text-muted-foreground">查看顾客统计和顾客列表</p>
                </CardContent>
              </Card>
            </Link>

            {/* 课程排课 */}
            <Link href="/schedules">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">课程排课</h3>
                  <p className="text-sm text-muted-foreground">查看和管理课程安排</p>
                </CardContent>
              </Card>
            </Link>

            {/* 数据导入 */}
            <Link href="/import">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">数据导入</h3>
                  <p className="text-sm text-muted-foreground">批量导入CSV、Excel、ICS文件</p>
                </CardContent>
              </Card>
            </Link>
            </div>
          </div>

          {/* 右侧:系统说明 */}
          <div>
            <h2 className="text-xl font-semibold mb-4">系统说明</h2>
            <p className="text-sm text-muted-foreground mb-4">功能介绍</p>
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">销售人员</h3>
                  <p className="text-sm text-muted-foreground">可以登记客户订单、收款信息</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">财务人员</h3>
                  <p className="text-sm text-muted-foreground">可以管理老师费用结算、财务对账</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">管理员</h3>
                  <p className="text-sm text-muted-foreground">可以管理用户权限、查看所有数据</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
