import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Crown, UserPlus, Repeat } from "lucide-react";
import { useState } from "react";

export default function CustomerOverview() {
  // TODO: 实现customerStats和churnRiskCustomers接口
  // const { data: stats, isLoading } = trpc.analytics.customerStats.useQuery();
  // const { data: churnRiskCustomers, isLoading: isLoadingChurn } = trpc.analytics.churnRiskCustomers.useQuery();
  const stats: any = null;
  const isLoading = false;
  const churnRiskCustomers: any[] = [];
  const isLoadingChurn = false;
  const { data: customers } = trpc.customers.list.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">顾客情况</h1>
          <p className="text-muted-foreground mt-2">
            查看顾客统计数据和顾客列表
          </p>
        </div>

        {/* 顾客概览统计 */}
        <Card>
          <CardHeader>
            <CardTitle>顾客概览</CardTitle>
            <CardDescription>顾客统计数据</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">加载中...</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                <div className="flex flex-col items-center justify-center p-4 rounded-lg border">
                  <Users className="h-8 w-8 text-blue-500 mb-2" />
                  <div className="text-3xl font-bold">{stats?.totalCustomers || 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">累计顾客</div>
                </div>

                <div className="flex flex-col items-center justify-center p-4 rounded-lg border">
                  <Repeat className="h-8 w-8 text-green-500 mb-2" />
                  <div className="text-3xl font-bold">{stats?.returningCustomers || 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">累计回头客</div>
                </div>

                <div className="flex flex-col items-center justify-center p-4 rounded-lg border">
                  <Crown className="h-8 w-8 text-yellow-500 mb-2" />
                  <div className="text-3xl font-bold">{stats?.memberCustomers || 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">累计会员</div>
                </div>

                <div className="flex flex-col items-center justify-center p-4 rounded-lg border">
                  <UserPlus className="h-8 w-8 text-purple-500 mb-2" />
                  <div className="text-3xl font-bold">{stats?.todayNewCustomers || 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">今日新客</div>
                </div>

                <div className="flex flex-col items-center justify-center p-4 rounded-lg border">
                  <UserCheck className="h-8 w-8 text-orange-500 mb-2" />
                  <div className="text-3xl font-bold">{stats?.todayReturningCustomers || 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">今日老客</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 流失预警 */}
        <Card>
          <CardHeader>
            <CardTitle>流失预警</CardTitle>
            <CardDescription>超过30天未下单的老客户</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingChurn ? (
              <div className="text-center text-muted-foreground py-8">加载中...</div>
            ) : churnRiskCustomers && churnRiskCustomers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">客户名</th>
                      <th className="text-left p-3 font-medium">微信号</th>
                      <th className="text-left p-3 font-medium">电话</th>
                      <th className="text-left p-3 font-medium">最后下单日期</th>
                      <th className="text-left p-3 font-medium">未下单天数</th>
                      <th className="text-left p-3 font-medium">历史订单数</th>
                      <th className="text-left p-3 font-medium">累计消费</th>
                    </tr>
                  </thead>
                  <tbody>
                    {churnRiskCustomers.map((customer: any) => (
                      <tr key={customer.customerId} className="border-b hover:bg-accent">
                        <td className="p-3">{customer.customerName}</td>
                        <td className="p-3">{customer.wechatId || '-'}</td>
                        <td className="p-3">{customer.phone || '-'}</td>
                        <td className="p-3">
                          {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '-'}
                        </td>
                        <td className="p-3">
                          <span className={customer.daysSinceLastOrder > 60 ? 'text-red-500 font-medium' : 'text-orange-500'}>
                            {customer.daysSinceLastOrder}天
                          </span>
                        </td>
                        <td className="p-3">{customer.orderCount}</td>
                        <td className="p-3">¥{customer.totalAmount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 text-sm text-muted-foreground">
                  共找到 {churnRiskCustomers.length} 位流失风险客户
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                暂无流失风险客户
              </div>
            )}
          </CardContent>
        </Card>

        {/* 顾客列表 */}
        <Card>
          <CardHeader>
            <CardTitle>顾客列表</CardTitle>
            <CardDescription>所有顾客信息</CardDescription>
          </CardHeader>
          <CardContent>
            {customers && customers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">客户名</th>
                      <th className="text-left p-3 font-medium">微信号</th>
                      <th className="text-left p-3 font-medium">电话</th>
                      <th className="text-left p-3 font-medium">流量来源</th>
                      <th className="text-left p-3 font-medium">创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.id} className="border-b hover:bg-accent">
                        <td className="p-3">{customer.name}</td>
                        <td className="p-3">{customer.wechatId || '-'}</td>
                        <td className="p-3">{customer.phone || '-'}</td>
                        <td className="p-3">{customer.trafficSource || '-'}</td>
                        <td className="p-3">
                          {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                暂无顾客数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
