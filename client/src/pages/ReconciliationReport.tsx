import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Download } from "lucide-react";
import { toast } from "sonner";

export default function ReconciliationReport() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // 本月第一天
    return date.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });

  const { data: report, isLoading, refetch } = trpc.reconciliation.getMonthlyReport.useQuery(
    { startDate, endDate },
    { enabled: false }
  );

  const handleGenerate = () => {
    refetch();
  };

  const handleExport = () => {
    if (!report) return;
    
    // 生成CSV内容
    const csvRows = [];
    csvRows.push(['财务对账报表']);
    csvRows.push([`时间范围: ${startDate} 至 ${endDate}`]);
    csvRows.push([]);
    csvRows.push(['总体统计']);
    csvRows.push(['项目', '金额(元)']);
    csvRows.push(['总收入', report.stats.totalRevenue.toFixed(2)]);
    csvRows.push(['老师费用', report.stats.totalTeacherFee.toFixed(2)]);
    csvRows.push(['车费', report.stats.totalTransportFee.toFixed(2)]);
    csvRows.push(['其他费用', report.stats.totalOtherFee.toFixed(2)]);
    csvRows.push(['合伙人费用', report.stats.totalPartnerFee.toFixed(2)]);
    csvRows.push(['总支出', report.stats.totalExpense.toFixed(2)]);
    csvRows.push(['净利润', report.stats.netProfit.toFixed(2)]);
    csvRows.push([]);
    
    csvRows.push(['按城市统计']);
    csvRows.push(['城市', '订单数', '收入(元)', '支出(元)', '利润(元)']);
    Object.entries(report.stats.byCity).forEach(([city, data]: [string, any]) => {
      csvRows.push([
        city,
        data.count,
        data.revenue.toFixed(2),
        data.expense.toFixed(2),
        data.profit.toFixed(2),
      ]);
    });
    csvRows.push([]);
    
    csvRows.push(['按销售人员统计']);
    csvRows.push(['销售人员', '订单数', '收入(元)', '支出(元)', '利润(元)']);
    Object.entries(report.stats.bySalesPerson).forEach(([person, data]: [string, any]) => {
      csvRows.push([
        person,
        data.count,
        data.revenue.toFixed(2),
        data.expense.toFixed(2),
        data.profit.toFixed(2),
      ]);
    });

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `对账报表_${startDate}_${endDate}.csv`;
    link.click();
    
    toast.success("导出成功");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">月度对账报表</h1>
            <p className="text-muted-foreground mt-1">
              查看已匹配订单的财务统计数据
            </p>
          </div>
        </div>

        {/* 时间范围选择 */}
        <Card>
          <CardHeader>
            <CardTitle>选择时间范围</CardTitle>
            <CardDescription>
              选择要生成对账报表的时间范围
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="startDate">开始日期</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="endDate">结束日期</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  "生成报表"
                )}
              </Button>
              {report && (
                <Button variant="outline" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  导出CSV
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {report && (
          <>
            {/* 总体统计 */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    总收入
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ¥{report.stats.totalRevenue.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {report.stats.totalMatches} 笔订单
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    总支出
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    ¥{report.stats.totalExpense.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    老师 ¥{report.stats.totalTeacherFee.toFixed(2)} · 
                    车费 ¥{report.stats.totalTransportFee.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    净利润
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    ¥{report.stats.netProfit.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    利润率 {((report.stats.netProfit / report.stats.totalRevenue) * 100).toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 费用明细 */}
            <Card>
              <CardHeader>
                <CardTitle>费用明细</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>费用项目</TableHead>
                      <TableHead className="text-right">金额(元)</TableHead>
                      <TableHead className="text-right">占比</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>老师费用</TableCell>
                      <TableCell className="text-right">¥{report.stats.totalTeacherFee.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {((report.stats.totalTeacherFee / report.stats.totalExpense) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>车费</TableCell>
                      <TableCell className="text-right">¥{report.stats.totalTransportFee.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {((report.stats.totalTransportFee / report.stats.totalExpense) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>其他费用</TableCell>
                      <TableCell className="text-right">¥{report.stats.totalOtherFee.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {((report.stats.totalOtherFee / report.stats.totalExpense) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>合伙人费用</TableCell>
                      <TableCell className="text-right">¥{report.stats.totalPartnerFee.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {((report.stats.totalPartnerFee / report.stats.totalExpense) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                    <TableRow className="font-bold">
                      <TableCell>总计</TableCell>
                      <TableCell className="text-right">¥{report.stats.totalExpense.toFixed(2)}</TableCell>
                      <TableCell className="text-right">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* 按城市统计 */}
            <Card>
              <CardHeader>
                <CardTitle>按城市统计</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>城市</TableHead>
                      <TableHead className="text-right">订单数</TableHead>
                      <TableHead className="text-right">收入(元)</TableHead>
                      <TableHead className="text-right">支出(元)</TableHead>
                      <TableHead className="text-right">利润(元)</TableHead>
                      <TableHead className="text-right">利润率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(report.stats.byCity).map(([city, data]: [string, any]) => (
                      <TableRow key={city}>
                        <TableCell>{city}</TableCell>
                        <TableCell className="text-right">{data.count}</TableCell>
                        <TableCell className="text-right">¥{data.revenue.toFixed(2)}</TableCell>
                        <TableCell className="text-right">¥{data.expense.toFixed(2)}</TableCell>
                        <TableCell className="text-right">¥{data.profit.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {((data.profit / data.revenue) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* 按销售人员统计 */}
            <Card>
              <CardHeader>
                <CardTitle>按销售人员统计</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>销售人员</TableHead>
                      <TableHead className="text-right">订单数</TableHead>
                      <TableHead className="text-right">收入(元)</TableHead>
                      <TableHead className="text-right">支出(元)</TableHead>
                      <TableHead className="text-right">利润(元)</TableHead>
                      <TableHead className="text-right">利润率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(report.stats.bySalesPerson).map(([person, data]: [string, any]) => (
                      <TableRow key={person}>
                        <TableCell>{person}</TableCell>
                        <TableCell className="text-right">{data.count}</TableCell>
                        <TableCell className="text-right">¥{data.revenue.toFixed(2)}</TableCell>
                        <TableCell className="text-right">¥{data.expense.toFixed(2)}</TableCell>
                        <TableCell className="text-right">¥{data.profit.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {((data.profit / data.revenue) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {!report && !isLoading && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                选择时间范围后点击"生成报表"查看对账数据
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
