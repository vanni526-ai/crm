import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, DollarSign, Building2, FileText } from "lucide-react";
import { toast } from "sonner";

export default function MonthlyPartnerSettlement() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  // 查询月度合伙人费用统计
  const { data: settlements, isLoading } = trpc.schedules.getMonthlyPartnerSettlement.useQuery({
    year: selectedYear,
    month: selectedMonth,
  });

  // 生成年份选项(最近3年)
  const years = Array.from({ length: 3 }, (_, i) => currentDate.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // 计算总计
  const totals = settlements?.reduce(
    (acc, item) => ({
      orderCount: acc.orderCount + item.orderCount,
      totalCourseAmount: acc.totalCourseAmount + item.totalCourseAmount,
      totalTeacherFee: acc.totalTeacherFee + item.totalTeacherFee,
      totalTransportFee: acc.totalTransportFee + item.totalTransportFee,
      totalOtherFee: acc.totalOtherFee + item.totalOtherFee,
      totalPartnerFee: acc.totalPartnerFee + item.totalPartnerFee,
    }),
    {
      orderCount: 0,
      totalCourseAmount: 0,
      totalTeacherFee: 0,
      totalTransportFee: 0,
      totalOtherFee: 0,
      totalPartnerFee: 0,
    }
  );

  // 导出为CSV
  const handleExport = () => {
    if (!settlements || settlements.length === 0) {
      toast.error("没有数据可导出");
      return;
    }

    // 构建CSV内容
    const headers = [
      "城市",
      "订单数量",
      "总课程金额",
      "总老师费用",
      "总车费",
      "总其他费用",
      "应付合伙人费用",
      "合伙人费率(%)",
    ];

    const rows = settlements.map((item) => [
      item.city,
      item.orderCount,
      `¥${item.totalCourseAmount.toFixed(2)}`,
      `¥${item.totalTeacherFee.toFixed(2)}`,
      `¥${item.totalTransportFee.toFixed(2)}`,
      `¥${item.totalOtherFee.toFixed(2)}`,
      `¥${item.totalPartnerFee.toFixed(2)}`,
      `${item.partnerFeeRate.toFixed(1)}%`,
    ]);

    // 添加总计行
    if (totals) {
      rows.push([
        "总计",
        totals.orderCount.toString(),
        `¥${totals.totalCourseAmount.toFixed(2)}`,
        `¥${totals.totalTeacherFee.toFixed(2)}`,
        `¥${totals.totalTransportFee.toFixed(2)}`,
        `¥${totals.totalOtherFee.toFixed(2)}`,
        `¥${totals.totalPartnerFee.toFixed(2)}`,
        "-",
      ]);
    }

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");

    // 添加BOM以支持中文
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `月度合伙人费用统计_${selectedYear}年${selectedMonth}月.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("导出成功");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              月度合伙人费用统计
            </CardTitle>
            <CardDescription>按月汇总各城市的合伙人应结算金额</CardDescription>
          </div>
          <Button onClick={handleExport} disabled={!settlements || settlements.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            导出报表
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 月份选择器 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">统计月份:</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {month}月
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 统计卡片 */}
          {totals && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm font-medium text-muted-foreground">订单总数</div>
                  </div>
                  <div className="mt-2 text-2xl font-bold">{totals.orderCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm font-medium text-muted-foreground">总课程金额</div>
                  </div>
                  <div className="mt-2 text-2xl font-bold">¥{totals.totalCourseAmount.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm font-medium text-muted-foreground">城市数量</div>
                  </div>
                  <div className="mt-2 text-2xl font-bold">{settlements?.length || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm font-medium text-muted-foreground">应付合伙人费用</div>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-primary">
                    ¥{totals.totalPartnerFee.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 统计表格 */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : settlements && settlements.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>城市</TableHead>
                    <TableHead className="text-right">订单数量</TableHead>
                    <TableHead className="text-right">总课程金额</TableHead>
                    <TableHead className="text-right">总老师费用</TableHead>
                    <TableHead className="text-right">总车费</TableHead>
                    <TableHead className="text-right">总其他费用</TableHead>
                    <TableHead className="text-right">应付合伙人费用</TableHead>
                    <TableHead className="text-right">合伙人费率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.city}</TableCell>
                      <TableCell className="text-right">{item.orderCount}</TableCell>
                      <TableCell className="text-right">¥{item.totalCourseAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">¥{item.totalTeacherFee.toFixed(2)}</TableCell>
                      <TableCell className="text-right">¥{item.totalTransportFee.toFixed(2)}</TableCell>
                      <TableCell className="text-right">¥{item.totalOtherFee.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        ¥{item.totalPartnerFee.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">{item.partnerFeeRate.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                  {/* 总计行 */}
                  {totals && (
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell>总计</TableCell>
                      <TableCell className="text-right">{totals.orderCount}</TableCell>
                      <TableCell className="text-right">¥{totals.totalCourseAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">¥{totals.totalTeacherFee.toFixed(2)}</TableCell>
                      <TableCell className="text-right">¥{totals.totalTransportFee.toFixed(2)}</TableCell>
                      <TableCell className="text-right">¥{totals.totalOtherFee.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-primary">
                        ¥{totals.totalPartnerFee.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              该月份暂无数据
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
