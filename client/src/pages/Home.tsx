import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Users, TrendingUp, MapPin } from "lucide-react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function Home() {
  const { data: user } = trpc.auth.me.useQuery();
  
  // 获取本月数据统计
  const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];
  
  const { data: stats } = trpc.analytics.orderStats.useQuery({
    startDate,
    endDate,
  });
  
  const { data: cityRevenue } = trpc.analytics.cityRevenue.useQuery();
  const { data: cityRevenueTrend } = trpc.analytics.cityRevenueTrend.useQuery();

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

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>城市收益统计</CardTitle>
              <CardDescription>按城市分配比例计算收益</CardDescription>
            </CardHeader>
            <CardContent>
              {cityRevenue && cityRevenue.length > 0 ? (
                <div className="space-y-3">
                  {cityRevenue.slice(0, 5).map((city) => (
                    <div key={city.city} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{city.city}</div>
                          <div className="text-xs text-muted-foreground">
                            {city.orderCount} 个订单
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          ¥{parseFloat(city.revenue).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {city.city === '天津' && '50%分配'}
                          {city.city === '武汉' && '40%分配'}
                          {city.city === '上海' && '100%分配'}
                          {city.city !== '天津' && city.city !== '武汉' && city.city !== '上海' && '30%分配'}
                        </div>
                      </div>
                    </div>
                  ))}
                  {cityRevenue.length > 5 && (
                    <div className="text-center text-sm text-muted-foreground pt-2">
                      还有 {cityRevenue.length - 5} 个城市...
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>城市收益趋势</CardTitle>
              <CardDescription>最近6个月收益变化</CardDescription>
            </CardHeader>
            <CardContent>
              {cityRevenueTrend && cityRevenueTrend.cities.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cityRevenueTrend.months.map((month, index) => {
                    const dataPoint: any = { month: month.substring(5) + '月' };
                    cityRevenueTrend.cities.forEach(city => {
                      dataPoint[city.city] = city.data[index];
                    });
                    return dataPoint;
                  })}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                    <Legend />
                    {cityRevenueTrend.cities.map((city, index) => {
                      const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a78bfa'];
                      return (
                        <Line
                          key={city.city}
                          type="monotone"
                          dataKey={city.city}
                          stroke={colors[index % colors.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  暂无数据
                </div>
              )}
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
              <a href="/import" className="block p-3 rounded-lg border hover:bg-accent transition-colors">
                <div className="font-medium">数据导入</div>
                <div className="text-sm text-muted-foreground">批量导入CSV、Excel、ICS文件</div>
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
