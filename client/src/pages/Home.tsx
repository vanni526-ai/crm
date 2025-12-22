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
          <Card className="glass-card">
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

          <Card className="glass-card">
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

          <Card className="glass-card">
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

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">净利润</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{stats?.netProfit?.toLocaleString() || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                本月利润金额
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 客户生命周期预警 */}
        <InactiveCustomersAlert />
        
        {/* 优惠活动统计 */}
        <PromotionStatsCards />

        {/* 快捷操作和系统说明 */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* 左侧:快捷操作 */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">快捷操作</h2>
            <p className="text-sm text-muted-foreground mb-4">常用功能入口</p>
            <div className="grid gap-4 md:grid-cols-2">
            {/* 订单管理 */}
            <Link href="/orders">
              <Card className="glass-card cursor-pointer hover:shadow-lg transition-all">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">订单管理</h3>
                  <p className="text-sm text-muted-foreground">查看和管理客户订单</p>
                </CardContent>
              </Card>
            </Link>

            {/* 财务对账 */}
            <Link href="/reconciliations">
              <Card className="glass-card cursor-pointer hover:shadow-lg transition-all">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">财务对账</h3>
                  <p className="text-sm text-muted-foreground">查看收支明细和对账报表</p>
                </CardContent>
              </Card>
            </Link>

            {/* 顾客情况 */}
            <Link href="/customers">
              <Card className="glass-card cursor-pointer hover:shadow-lg transition-all">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">顾客情况</h3>
                  <p className="text-sm text-muted-foreground">查看顾客统计和顾客列表</p>
                </CardContent>
              </Card>
            </Link>

            {/* 课程排课 */}
            <Link href="/schedules">
              <Card className="glass-card cursor-pointer hover:shadow-lg transition-all">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">课程排课</h3>
                  <p className="text-sm text-muted-foreground">查看和管理课程安排</p>
                </CardContent>
              </Card>
            </Link>

            {/* 数据导入 */}
            <Link href="/import">
              <Card className="glass-card cursor-pointer hover:shadow-lg transition-all">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">数据导入</h3>
                  <p className="text-sm text-muted-foreground">批量导入CSV、Excel、ICS文件</p>
                </CardContent>
              </Card>
            </Link>

            {/* 车费修复工具 */}
            <Link href="/transport-fee-fix">
              <Card className="glass-card cursor-pointer hover:shadow-lg transition-all">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">🔧 车费修复工具</h3>
                  <p className="text-sm text-muted-foreground">检测和修复历史订单中的车费识别错误</p>
                </CardContent>
              </Card>
            </Link>

            {/* 流量来源统计 */}
            <Link href="/traffic-source-dashboard">
              <Card className="glass-card cursor-pointer hover:shadow-lg transition-all">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">📊 流量来源统计</h3>
                  <p className="text-sm text-muted-foreground">查看各流量来源的订单和金额统计</p>
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
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">销售人员</h3>
                  <p className="text-sm text-muted-foreground">可以登记客户订单、收款信息</p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">财务人员</h3>
                  <p className="text-sm text-muted-foreground">可以管理老师费用结算、财务对账</p>
                </CardContent>
              </Card>

              <Card className="glass-card">
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

// 优惠活动统计组件
function PromotionStatsCards() {
  const { data: orders } = trpc.orders.list.useQuery();
  
  if (!orders || orders.length === 0) {
    return null;
  }
  
  // 统计优惠券使用情况
  const couponStats = orders.reduce((acc: any, order: any) => {
    if (order.couponInfo) {
      try {
        const coupon = JSON.parse(order.couponInfo);
        if (!acc[coupon.source]) {
          acc[coupon.source] = { count: 0, totalAmount: 0 };
        }
        acc[coupon.source].count++;
        acc[coupon.source].totalAmount += coupon.amount || 0;
      } catch (e) {
        // 忽略解析错误
      }
    }
    return acc;
  }, {});
  
  // 统计折扣活动
  const discountStats = orders.reduce((acc: any, order: any) => {
    if (order.discountInfo) {
      try {
        const discount = JSON.parse(order.discountInfo);
        if (!acc[discount.type]) {
          acc[discount.type] = { count: 0, descriptions: new Set() };
        }
        acc[discount.type].count++;
        acc[discount.type].descriptions.add(discount.description);
      } catch (e) {
        // 忽略解析错误
      }
    }
    return acc;
  }, {});
  
  // 统计会员消费
  const membershipCount = orders.filter((order: any) => order.membershipInfo).length;
  
  const hasCoupons = Object.keys(couponStats).length > 0;
  const hasDiscounts = Object.keys(discountStats).length > 0;
  const hasMembers = membershipCount > 0;
  
  if (!hasCoupons && !hasDiscounts && !hasMembers) {
    return null;
  }
  
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* 优惠券统计 */}
      {hasCoupons && (
        <Card className="glass-card border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              🎫 优惠券使用
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(couponStats).map(([source, data]: [string, any]) => (
                <div key={source} className="flex justify-between items-center p-2 rounded bg-background/50">
                  <div>
                    <p className="font-medium">{source}</p>
                    <p className="text-sm text-muted-foreground">使用 {data.count} 次</p>
                  </div>
                  <p className="text-lg font-semibold text-blue-600">
                    ￥{data.totalAmount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 折扣活动统计 */}
      {hasDiscounts && (
        <Card className="glass-card border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              🎉 折扣活动
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(discountStats).map(([type, data]: [string, any]) => (
                <div key={type} className="p-2 rounded bg-background/50">
                  <p className="font-medium">{type}</p>
                  <p className="text-sm text-muted-foreground">参与 {data.count} 次</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Array.from(data.descriptions).slice(0, 3).map((desc: any, idx: number) => (
                      <span key={idx} className="text-xs bg-orange-100 dark:bg-orange-900 px-2 py-0.5 rounded">
                        {desc}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 会员消费统计 */}
      {hasMembers && (
        <Card className="glass-card border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              👑 会员消费
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-purple-600">{membershipCount}</p>
              <p className="text-sm text-muted-foreground mt-2">会员订单数</p>
              <p className="text-xs text-muted-foreground mt-1">
                占总订单 {((membershipCount / orders.length) * 100).toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 不活跃客户预警组件
function InactiveCustomersAlert() {
  const { data: inactiveCustomers } = trpc.analytics.inactiveCustomers.useQuery({ days: 30 });
  
  if (!inactiveCustomers || inactiveCustomers.length === 0) {
    return null;
  }
  
  return (
    <Card className="glass-card border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-orange-600" />
          客户生命周期预警
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          以下 {inactiveCustomers.length} 位客户超过30天未消费，建议及时跟进维护客户关系
        </p>
        <div className="space-y-2">
          {inactiveCustomers.slice(0, 5).map((customer: any) => (
            <div key={customer.customerId} className="flex justify-between items-center p-2 rounded bg-background/50">
              <span className="font-medium">{customer.customerName}</span>
              <span className="text-sm text-muted-foreground">
                最后消费: {new Date(customer.lastOrderDate).toLocaleDateString()}
              </span>
            </div>
          ))}
          {inactiveCustomers.length > 5 && (
            <p className="text-sm text-muted-foreground text-center pt-2">
              还有 {inactiveCustomers.length - 5} 位客户...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
