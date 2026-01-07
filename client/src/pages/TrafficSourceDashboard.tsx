import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, DollarSign, ShoppingCart, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";

/**
 * 流量来源统计仪表板
 */
export default function TrafficSourceDashboard() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<{ startDate?: string; endDate?: string }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 查询统计数据
  const { data: stats, isLoading, refetch } = trpc.trafficSourceConfig.getTrafficSourceStats.useQuery(
    appliedFilters.startDate && appliedFilters.endDate ? appliedFilters : undefined
  );

  const handleApplyFilters = () => {
    if (startDate && endDate) {
      setAppliedFilters({ startDate, endDate });
    } else {
      setAppliedFilters({});
    }
    setCurrentPage(1); // 筛选后重置到第一页
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setAppliedFilters({});
    setCurrentPage(1); // 清除筛选后重置到第一页
  };

  // 计算总计
  const totalOrders = stats?.reduce((sum, item) => sum + item.orderCount, 0) || 0;
  const totalAmount = stats?.reduce((sum, item) => sum + item.totalAmount, 0) || 0;

  // 分页逻辑
  const totalPages = stats ? Math.ceil(stats.length / pageSize) : 0;
  const paginatedStats = stats?.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">流量来源统计</h1>
          <p className="text-muted-foreground mt-2">
            查看各流量来源的订单数量和金额统计
          </p>
        </div>
        <Link href="/traffic-source-config">
          <Button variant="outline">
            配置管理
          </Button>
        </Link>
      </div>

      {/* 日期筛选 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>开始日期</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label>结束日期</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleApplyFilters}>
              <Filter className="mr-2 h-4 w-4" />
              应用筛选
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              清除
            </Button>
          </div>
          {appliedFilters.startDate && appliedFilters.endDate && (
            <p className="text-sm text-muted-foreground mt-2">
              当前筛选: {appliedFilters.startDate} 至 {appliedFilters.endDate}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 总计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              总订单数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              来自 {stats?.length || 0} 个流量来源
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              总金额
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              支付总额
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              平均订单金额
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{totalOrders > 0 ? (totalAmount / totalOrders).toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              每单平均
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 流量来源详细列表 */}
      <Card>
        <CardHeader>
          <CardTitle>流量来源明细</CardTitle>
          <CardDescription>
            按支付金额降序排列
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paginatedStats && paginatedStats.length > 0 ? (
            <>
            <div className="space-y-4">
              {paginatedStats.map((item, index) => {
                const percentage = totalAmount > 0 ? (item.totalAmount / totalAmount * 100).toFixed(1) : "0.0";
                const avgAmount = item.orderCount > 0 ? (item.totalAmount / item.orderCount).toFixed(2) : "0.00";
                
                return (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-lg">{item.trafficSource}</span>
                        <span className="text-sm text-muted-foreground">
                          (占比 {percentage}%)
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">订单数: </span>
                          <span className="font-medium">{item.orderCount}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">总金额: </span>
                          <span className="font-medium text-green-600">
                            ¥{item.totalAmount.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">平均: </span>
                          <span className="font-medium">¥{avgAmount}</span>
                        </div>
                      </div>
                    </div>

                    {/* 进度条 */}
                    <div className="w-32">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* 分页控件 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  显示第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, stats?.length || 0)} 条,共 {stats?.length || 0} 条
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    上一页
                  </Button>
                  <div className="text-sm font-medium">
                    第 {currentPage} / {totalPages} 页
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    下一页
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              暂无数据
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
