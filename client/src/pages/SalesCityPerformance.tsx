import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatDateBJ } from "@/lib/timezone";
import {
  ArrowLeft, Download, Settings, TrendingUp, TrendingDown, Minus,
  BarChart3, Filter, Percent, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLocation } from "wouter";

// 格式化金额
function formatMoney(val: number) {
  return `¥${val.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// 格式化百分比变化
function ChangeIndicator({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center text-green-600 text-xs font-medium">
        <ArrowUpRight className="w-3 h-3 mr-0.5" />+{value.toFixed(1)}%
      </span>
    );
  } else if (value < 0) {
    return (
      <span className="inline-flex items-center text-red-600 text-xs font-medium">
        <ArrowDownRight className="w-3 h-3 mr-0.5" />{value.toFixed(1)}%
      </span>
    );
  }
  return <span className="text-muted-foreground text-xs">-</span>;
}

export default function SalesCityPerformance() {
  const [, navigate] = useLocation();

  // 筛选器状态
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return formatDateBJ(d);
  });
  const [endDate, setEndDate] = useState(() => formatDateBJ(new Date()));
  const [selectedSalesperson, setSelectedSalesperson] = useState<number | undefined>();
  const [selectedCity, setSelectedCity] = useState<string | undefined>();

  // 对比模式
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonType, setComparisonType] = useState<"mom" | "yoy">("mom"); // mom=环比, yoy=同比

  // 提成配置弹窗
  const [showCommissionDialog, setShowCommissionDialog] = useState(false);
  const [batchMode, setBatchMode] = useState<"single" | "bySalesperson" | "byCity">("single");
  const [commissionForm, setCommissionForm] = useState({
    salespersonId: 0,
    city: "",
    commissionRate: 0,
  });

  // 查询交叉统计数据
  const { data: crossStats, isLoading, refetch } = trpc.salesCityPerformance.getCrossStats.useQuery({
    startDate,
    endDate,
    salespersonId: selectedSalesperson,
    city: selectedCity,
  });

  // 计算对比时间段
  const comparisonDates = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();

    if (comparisonType === "mom") {
      // 环比：上一个同等时间段
      const prevEnd = new Date(start.getTime() - 86400000); // 前一天
      const prevStart = new Date(prevEnd.getTime() - diff);
      return {
        previousStartDate: prevStart.toISOString().split("T")[0],
        previousEndDate: prevEnd.toISOString().split("T")[0],
      };
    } else {
      // 同比：去年同期
      const prevStart = new Date(start);
      prevStart.setFullYear(prevStart.getFullYear() - 1);
      const prevEnd = new Date(end);
      prevEnd.setFullYear(prevEnd.getFullYear() - 1);
      return {
        previousStartDate: prevStart.toISOString().split("T")[0],
        previousEndDate: prevEnd.toISOString().split("T")[0],
      };
    }
  }, [startDate, endDate, comparisonType]);

  // 查询对比数据
  const { data: comparisonData } = trpc.salesCityPerformance.getComparison.useQuery({
    currentStartDate: startDate,
    currentEndDate: endDate,
    previousStartDate: comparisonDates.previousStartDate,
    previousEndDate: comparisonDates.previousEndDate,
    salespersonId: selectedSalesperson,
    city: selectedCity,
  }, { enabled: showComparison });

  // 提成配置mutation
  const setCommissionMutation = trpc.salesCityPerformance.setCommission.useMutation({
    onSuccess: () => {
      toast.success("提成配置已保存");
      refetch();
    },
    onError: (e) => toast.error(`保存失败: ${e.message}`),
  });

  const batchSetCommissionMutation = trpc.salesCityPerformance.batchSetCommission.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      setShowCommissionDialog(false);
      refetch();
    },
    onError: (e) => toast.error(`批量设置失败: ${e.message}`),
  });

  // 构建交叉表数据
  const tableData = useMemo(() => {
    if (!crossStats?.data) return { rows: [], cityColumns: [], grandTotal: { orderCount: 0, totalAmount: 0, commissionAmount: 0 } };

    const data = crossStats.data;
    const citySet = new Set(data.map((d: any) => d.city));
    const cityColumns = Array.from(citySet).sort() as string[];

    // 按销售人员分组
    const spMap = new Map<string, any>();
    for (const d of data) {
      const key = `${d.salespersonId}_${d.salesPerson}`;
      if (!spMap.has(key)) {
        spMap.set(key, {
          salespersonId: d.salespersonId,
          salesPerson: d.salesPerson,
          cities: {} as Record<string, { orderCount: number; totalAmount: number; commissionRate: number; commissionAmount: number }>,
          total: { orderCount: 0, totalAmount: 0, commissionAmount: 0 },
        });
      }
      const row = spMap.get(key)!;
      row.cities[d.city] = {
        orderCount: d.orderCount,
        totalAmount: d.totalAmount,
        commissionRate: d.commissionRate,
        commissionAmount: d.commissionAmount,
      };
      row.total.orderCount += d.orderCount;
      row.total.totalAmount += d.totalAmount;
      row.total.commissionAmount += d.commissionAmount;
    }

    const rows = Array.from(spMap.values()).sort((a, b) => b.total.totalAmount - a.total.totalAmount);

    // 城市合计行
    const grandTotal = { orderCount: 0, totalAmount: 0, commissionAmount: 0 };
    for (const row of rows) {
      grandTotal.orderCount += row.total.orderCount;
      grandTotal.totalAmount += row.total.totalAmount;
      grandTotal.commissionAmount += row.total.commissionAmount;
    }

    return { rows, cityColumns, grandTotal };
  }, [crossStats]);

  // 构建对比数据映射
  const comparisonMap = useMemo(() => {
    if (!comparisonData) return new Map<string, any>();
    const map = new Map<string, any>();
    for (const d of comparisonData) {
      map.set(`${d.salespersonId}_${d.city}`, d);
    }
    return map;
  }, [comparisonData]);

  // 获取提成配置映射
  const commissionConfigMap = useMemo(() => {
    if (!crossStats?.commissionConfigs) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const c of crossStats.commissionConfigs) {
      map.set(`${c.salespersonId}_${c.city}`, c.commissionRate);
    }
    return map;
  }, [crossStats]);

  // 处理提成配置提交
  const handleCommissionSubmit = () => {
    if (batchMode === "single") {
      if (!commissionForm.salespersonId || !commissionForm.city) {
        toast.error("请选择销售人员和城市");
        return;
      }
      setCommissionMutation.mutate(commissionForm);
    } else if (batchMode === "bySalesperson") {
      // 为选定销售人员设置所有城市的提成
      if (!commissionForm.salespersonId) {
        toast.error("请选择销售人员");
        return;
      }
      const configs = (crossStats?.cities || []).map((city: string) => ({
        salespersonId: commissionForm.salespersonId,
        city,
        commissionRate: commissionForm.commissionRate,
      }));
      batchSetCommissionMutation.mutate({ configs });
    } else if (batchMode === "byCity") {
      // 为选定城市设置所有销售人员的提成
      if (!commissionForm.city) {
        toast.error("请选择城市");
        return;
      }
      const activeSps = crossStats?.salespersons?.filter((sp: any) => sp.isActive) || [];
      const configs = activeSps.map((sp: any) => ({
        salespersonId: sp.id,
        city: commissionForm.city,
        commissionRate: commissionForm.commissionRate,
      }));
      batchSetCommissionMutation.mutate({ configs });
    }
  };

  // Excel导出
  const handleExport = () => {
    if (!tableData.rows.length) {
      toast.error("没有数据可导出");
      return;
    }

    const headers = ["销售人员"];
    for (const city of tableData.cityColumns) {
      headers.push(`${city}-订单数`, `${city}-金额`, `${city}-提成比例`, `${city}-提成金额`);
    }
    headers.push("合计-订单数", "合计-金额", "合计-提成金额");

    const csvRows = tableData.rows.map((row: any) => {
      const cells = [row.salesPerson];
      for (const city of tableData.cityColumns) {
        const c = row.cities[city];
        cells.push(
          c ? c.orderCount.toString() : "0",
          c ? c.totalAmount.toFixed(2) : "0.00",
          c ? `${c.commissionRate}%` : "0%",
          c ? c.commissionAmount.toFixed(2) : "0.00",
        );
      }
      cells.push(
        row.total.orderCount.toString(),
        row.total.totalAmount.toFixed(2),
        row.total.commissionAmount.toFixed(2),
      );
      return cells;
    });

    // 合计行
    const totalCells = ["合计"];
    for (const city of tableData.cityColumns) {
      let cityOrderCount = 0, cityAmount = 0, cityCommission = 0;
      for (const row of tableData.rows) {
        const c = (row as any).cities[city];
        if (c) {
          cityOrderCount += c.orderCount;
          cityAmount += c.totalAmount;
          cityCommission += c.commissionAmount;
        }
      }
      totalCells.push(cityOrderCount.toString(), cityAmount.toFixed(2), "", cityCommission.toFixed(2));
    }
    totalCells.push(
      tableData.grandTotal.orderCount.toString(),
      tableData.grandTotal.totalAmount.toFixed(2),
      tableData.grandTotal.commissionAmount.toFixed(2),
    );
    csvRows.push(totalCells);

    const csvContent = [
      headers.join(","),
      ...csvRows.map((row: string[]) => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `销售城市业绩_${startDate}_${endDate}.csv`;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("导出成功");
  };

  // 快捷时间选择
  const setQuickDate = (type: string) => {
    const now = new Date();
    let start: Date, end: Date;
    switch (type) {
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        break;
      case "lastMonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "thisQuarter":
        start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        end = now;
        break;
      case "thisYear":
        start = new Date(now.getFullYear(), 0, 1);
        end = now;
        break;
      default:
        return;
    }
    setStartDate(formatDateBJ(start));
    setEndDate(formatDateBJ(end));
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/sales")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> 返回
            </Button>
            <div>
              <h1 className="text-2xl font-bold">销售城市业绩</h1>
              <p className="text-sm text-muted-foreground">查看每个销售在各城市的订单和提成</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCommissionDialog(true)}>
              <Settings className="w-4 h-4 mr-1" /> 提成配置
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" /> 导出Excel
            </Button>
          </div>
        </div>

        {/* 筛选器 */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">筛选条件</span>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">开始日期</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">结束日期</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">销售人员</Label>
              <select
                className="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={selectedSalesperson || ""}
                onChange={(e) => setSelectedSalesperson(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">全部销售</option>
                {crossStats?.salespersons?.map((sp: any) => (
                  <option key={sp.id} value={sp.id}>{sp.name}{sp.nickname ? ` (${sp.nickname})` : ""}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">城市</Label>
              <select
                className="flex h-9 w-36 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={selectedCity || ""}
                onChange={(e) => setSelectedCity(e.target.value || undefined)}
              >
                <option value="">全部城市</option>
                {crossStats?.cities?.map((city: string) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setQuickDate("thisMonth")}>本月</Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDate("lastMonth")}>上月</Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDate("thisQuarter")}>本季</Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDate("thisYear")}>全年</Button>
            </div>
          </div>
          {/* 对比模式 */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showComparison}
                onChange={(e) => setShowComparison(e.target.checked)}
                className="rounded"
              />
              <BarChart3 className="w-4 h-4" />
              对比模式
            </label>
            {showComparison && (
              <div className="flex gap-2">
                <Button
                  variant={comparisonType === "mom" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setComparisonType("mom")}
                >
                  环比（上期）
                </Button>
                <Button
                  variant={comparisonType === "yoy" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setComparisonType("yoy")}
                >
                  同比（去年）
                </Button>
                <span className="text-xs text-muted-foreground self-center">
                  对比期间: {comparisonDates.previousStartDate} ~ {comparisonDates.previousEndDate}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* 汇总卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">总订单数</p>
            <p className="text-2xl font-bold mt-1">{tableData.grandTotal.orderCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">总销售金额</p>
            <p className="text-2xl font-bold mt-1">{formatMoney(tableData.grandTotal.totalAmount)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">总提成金额</p>
            <p className="text-2xl font-bold mt-1">{formatMoney(tableData.grandTotal.commissionAmount)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">涉及城市 / 销售</p>
            <p className="text-2xl font-bold mt-1">{tableData.cityColumns.length} / {tableData.rows.length}</p>
          </Card>
        </div>

        {/* 交叉统计表 */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[120px] font-semibold">销售人员</TableHead>
                  {tableData.cityColumns.map((city: string) => (
                    <TableHead key={city} colSpan={showComparison ? 3 : 2} className="text-center border-l font-semibold">
                      {city}
                    </TableHead>
                  ))}
                  <TableHead colSpan={showComparison ? 3 : 2} className="text-center border-l font-semibold bg-blue-50/50">
                    合计
                  </TableHead>
                </TableRow>
                <TableRow className="bg-muted/30">
                  <TableHead className="sticky left-0 bg-muted/30 z-10"></TableHead>
                  {tableData.cityColumns.map((city: string) => (
                    <Fragment key={city}>
                      <TableHead className="text-center text-xs border-l">订单数</TableHead>
                      <TableHead className="text-center text-xs">金额</TableHead>
                      {showComparison && <TableHead className="text-center text-xs">变化</TableHead>}
                    </Fragment>
                  ))}
                  <TableHead className="text-center text-xs border-l bg-blue-50/30">订单数</TableHead>
                  <TableHead className="text-center text-xs bg-blue-50/30">金额</TableHead>
                  {showComparison && <TableHead className="text-center text-xs bg-blue-50/30">变化</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={100} className="text-center py-12 text-muted-foreground">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : tableData.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={100} className="text-center py-12 text-muted-foreground">
                      暂无数据，请调整筛选条件
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {tableData.rows.map((row: any) => (
                      <TableRow key={row.salespersonId} className="hover:bg-muted/20">
                        <TableCell className="sticky left-0 bg-background z-10 font-medium">
                          {row.salesPerson}
                        </TableCell>
                        {tableData.cityColumns.map((city: string) => {
                          const c = row.cities[city];
                          const comp = showComparison ? comparisonMap.get(`${row.salespersonId}_${city}`) : null;
                          return (
                            <Fragment key={city}>
                              <TableCell className="text-center border-l tabular-nums">
                                {c ? c.orderCount : 0}
                              </TableCell>
                              <TableCell className="text-center tabular-nums text-sm">
                                {c ? formatMoney(c.totalAmount) : "-"}
                                {c && c.commissionRate > 0 && (
                                  <div className="text-xs text-orange-600">
                                    {c.commissionRate}% = {formatMoney(c.commissionAmount)}
                                  </div>
                                )}
                              </TableCell>
                              {showComparison && (
                                <TableCell className="text-center">
                                  {comp ? <ChangeIndicator value={comp.amountChange} /> : <span className="text-xs text-muted-foreground">-</span>}
                                </TableCell>
                              )}
                            </Fragment>
                          );
                        })}
                        {/* 合计列 */}
                        <TableCell className="text-center border-l bg-blue-50/20 font-medium tabular-nums">
                          {row.total.orderCount}
                        </TableCell>
                        <TableCell className="text-center bg-blue-50/20 font-medium tabular-nums">
                          {formatMoney(row.total.totalAmount)}
                          {row.total.commissionAmount > 0 && (
                            <div className="text-xs text-orange-600">
                              提成: {formatMoney(row.total.commissionAmount)}
                            </div>
                          )}
                        </TableCell>
                        {showComparison && (
                          <TableCell className="text-center bg-blue-50/20">
                            {(() => {
                              // 计算该销售的总变化
                              let totalCurrentAmount = 0;
                              let totalPrevAmount = 0;
                              for (const city of tableData.cityColumns) {
                                const comp = comparisonMap.get(`${row.salespersonId}_${city}`);
                                if (comp) {
                                  totalCurrentAmount += comp.currentAmount;
                                  totalPrevAmount += comp.previousAmount;
                                }
                              }
                              const change = totalPrevAmount > 0 ? ((totalCurrentAmount - totalPrevAmount) / totalPrevAmount * 100) : (totalCurrentAmount > 0 ? 100 : 0);
                              return <ChangeIndicator value={change} />;
                            })()}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {/* 合计行 */}
                    <TableRow className="bg-muted/40 font-semibold border-t-2">
                      <TableCell className="sticky left-0 bg-muted/40 z-10">合计</TableCell>
                      {tableData.cityColumns.map((city: string) => {
                        let cityOrderCount = 0, cityAmount = 0, cityCommission = 0;
                        for (const row of tableData.rows) {
                          const c = (row as any).cities[city];
                          if (c) {
                            cityOrderCount += c.orderCount;
                            cityAmount += c.totalAmount;
                            cityCommission += c.commissionAmount;
                          }
                        }
                        return (
                          <Fragment key={city}>
                            <TableCell className="text-center border-l tabular-nums">{cityOrderCount}</TableCell>
                            <TableCell className="text-center tabular-nums text-sm">
                              {formatMoney(cityAmount)}
                              {cityCommission > 0 && (
                                <div className="text-xs text-orange-600">提成: {formatMoney(cityCommission)}</div>
                              )}
                            </TableCell>
                            {showComparison && <TableCell className="text-center">-</TableCell>}
                          </Fragment>
                        );
                      })}
                      <TableCell className="text-center border-l bg-blue-50/30 tabular-nums">
                        {tableData.grandTotal.orderCount}
                      </TableCell>
                      <TableCell className="text-center bg-blue-50/30 tabular-nums">
                        {formatMoney(tableData.grandTotal.totalAmount)}
                        {tableData.grandTotal.commissionAmount > 0 && (
                          <div className="text-xs text-orange-600">提成: {formatMoney(tableData.grandTotal.commissionAmount)}</div>
                        )}
                      </TableCell>
                      {showComparison && <TableCell className="text-center bg-blue-50/30">-</TableCell>}
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* 提成配置弹窗 */}
        <Dialog open={showCommissionDialog} onOpenChange={setShowCommissionDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5" />
                提成比例配置
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* 模式选择 */}
              <div className="flex gap-2">
                <Button
                  variant={batchMode === "single" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBatchMode("single")}
                >
                  单个设置
                </Button>
                <Button
                  variant={batchMode === "bySalesperson" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBatchMode("bySalesperson")}
                >
                  按销售批量
                </Button>
                <Button
                  variant={batchMode === "byCity" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBatchMode("byCity")}
                >
                  按城市批量
                </Button>
              </div>

              <div className="grid gap-4">
                {(batchMode === "single" || batchMode === "bySalesperson") && (
                  <div className="grid gap-2">
                    <Label>销售人员</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={commissionForm.salespersonId || ""}
                      onChange={(e) => setCommissionForm(f => ({ ...f, salespersonId: Number(e.target.value) }))}
                    >
                      <option value="">选择销售人员</option>
                      {crossStats?.salespersons?.filter((sp: any) => sp.isActive).map((sp: any) => (
                        <option key={sp.id} value={sp.id}>{sp.name}{sp.nickname ? ` (${sp.nickname})` : ""}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(batchMode === "single" || batchMode === "byCity") && (
                  <div className="grid gap-2">
                    <Label>城市</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={commissionForm.city || ""}
                      onChange={(e) => setCommissionForm(f => ({ ...f, city: e.target.value }))}
                    >
                      <option value="">选择城市</option>
                      {crossStats?.cities?.map((city: string) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>提成比例 (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={commissionForm.commissionRate}
                    onChange={(e) => setCommissionForm(f => ({ ...f, commissionRate: parseFloat(e.target.value) || 0 }))}
                    placeholder="例如: 10"
                  />
                </div>

                {batchMode === "bySalesperson" && (
                  <p className="text-sm text-muted-foreground">
                    将为选定销售人员在所有 {crossStats?.cities?.length || 0} 个城市设置相同的提成比例
                  </p>
                )}
                {batchMode === "byCity" && (
                  <p className="text-sm text-muted-foreground">
                    将为选定城市的所有 {crossStats?.salespersons?.filter((sp: any) => sp.isActive).length || 0} 位在职销售设置相同的提成比例
                  </p>
                )}
              </div>

              {/* 当前配置列表 */}
              {crossStats?.commissionConfigs && crossStats.commissionConfigs.length > 0 && (
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                  <p className="text-sm font-medium mb-2">当前提成配置</p>
                  <div className="space-y-1">
                    {crossStats.commissionConfigs.map((c: any) => {
                      const sp = crossStats.salespersons?.find((s: any) => s.id === c.salespersonId);
                      return (
                        <div key={c.id} className="flex justify-between items-center text-sm py-1 border-b last:border-0">
                          <span>{sp?.name || `ID:${c.salespersonId}`} - {c.city}</span>
                          <span className="font-medium text-orange-600">{c.commissionRate}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCommissionDialog(false)}>取消</Button>
              <Button
                onClick={handleCommissionSubmit}
                disabled={setCommissionMutation.isPending || batchSetCommissionMutation.isPending}
              >
                {(setCommissionMutation.isPending || batchSetCommissionMutation.isPending) ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// Fragment helper
function Fragment({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return <>{children}</>;
}
