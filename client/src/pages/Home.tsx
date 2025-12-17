import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      </div>
    </DashboardLayout>
  );
}
