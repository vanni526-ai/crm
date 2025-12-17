import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, DollarSign, Download, AlertCircle, MapPin } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

export default function Finance() {
  const { data: orders } = trpc.orders.list.useQuery();
  const { data: users } = trpc.users.list.useQuery();
  const { data: cityRevenue } = trpc.analytics.cityRevenue.useQuery();
  const { data: cityRevenueTrend } = trpc.analytics.cityRevenueTrend.useQuery();
  
  const [dateRange, setDateRange] = useState("thisMonth");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSales, setSelectedSales] = useState<string>("all");

  // 计算财务统计数据
  const financialStats = useMemo(() => {
    if (!orders) return { totalIncome: 0, totalExpense: 0, profit: 0, orderCount: 0, profitMargin: 0 };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    let filteredOrders = orders;
    if (dateRange === "thisMonth") {
      filteredOrders = orders.filter((order) => {
        if (!order.paymentDate) return false;
        const paymentDate = new Date(order.paymentDate);
        return paymentDate >= startOfMonth && paymentDate <= endOfMonth;
      });
    } else if (dateRange === "lastMonth") {
      filteredOrders = orders.filter((order) => {
        if (!order.paymentDate) return false;
        const paymentDate = new Date(order.paymentDate);
        return paymentDate >= startOfLastMonth && paymentDate <= endOfLastMonth;
      });
    }

    const totalIncome = filteredOrders.reduce(
      (sum, order) => sum + parseFloat(order.paymentAmount || "0"),
      0
    );

    const totalExpense = filteredOrders.reduce(
      (sum, order) =>
        sum +
        parseFloat(order.teacherFee || "0") +
        parseFloat(order.transportFee || "0") +
        parseFloat(order.partnerFee || "0") +
        parseFloat(order.otherFee || "0"),
      0
    );

    const profit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpense,
      profit,
      orderCount: filteredOrders.length,
      profitMargin,
    };
  }, [orders, dateRange]);

  // 按销售人员统计
  const salesStats = useMemo(() => {
    if (!orders || !users) return [];

    const stats: Record<number, { name: string; income: number; expense: number; profit: number; orderCount: number }> = {};

    orders.forEach((order) => {
      if (!stats[order.salesId]) {
        const salesUser = users.find(u => u.id === order.salesId);
        stats[order.salesId] = {
          name: salesUser?.name || `销售${order.salesId}`,
          income: 0,
          expense: 0,
          profit: 0,
          orderCount: 0,
        };
      }

      stats[order.salesId].income += parseFloat(order.paymentAmount || "0");
      stats[order.salesId].expense +=
        parseFloat(order.teacherFee || "0") +
        parseFloat(order.transportFee || "0") +
        parseFloat(order.partnerFee || "0") +
        parseFloat(order.otherFee || "0");
      stats[order.salesId].profit = stats[order.salesId].income - stats[order.salesId].expense;
      stats[order.salesId].orderCount++;
    });

    return Object.values(stats).sort((a, b) => b.profit - a.profit);
  }, [orders, users]);

  // 收支趋势数据(最近6个月)
  const trendData = useMemo(() => {
    if (!orders) return [];

    const now = new Date();
    const months: { month: string; income: number; expense: number; profit: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const monthOrders = orders.filter((order) => {
        if (!order.paymentDate) return false;
        const paymentDate = new Date(order.paymentDate);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      });

      const income = monthOrders.reduce((sum, order) => sum + parseFloat(order.paymentAmount || "0"), 0);
      const expense = monthOrders.reduce(
        (sum, order) =>
          sum +
          parseFloat(order.teacherFee || "0") +
          parseFloat(order.transportFee || "0") +
          parseFloat(order.partnerFee || "0") +
          parseFloat(order.otherFee || "0"),
        0
      );

      months.push({
        month: `${monthDate.getMonth() + 1}月`,
        income,
        expense,
        profit: income - expense,
      });
    }

    return months;
  }, [orders]);

  // 费用占比数据
  const expenseBreakdown = useMemo(() => {
    if (!orders) return [];

    let teacherTotal = 0;
    let transportTotal = 0;
    let partnerTotal = 0;
    let otherTotal = 0;

    orders.forEach((order) => {
      teacherTotal += parseFloat(order.teacherFee || "0");
      transportTotal += parseFloat(order.transportFee || "0");
      partnerTotal += parseFloat(order.partnerFee || "0");
      otherTotal += parseFloat(order.otherFee || "0");
    });

    return [
      { name: "老师费用", value: teacherTotal },
      { name: "车费", value: transportTotal },
      { name: "合伙人费用", value: partnerTotal },
      { name: "其他费用", value: otherTotal },
    ].filter(item => item.value > 0);
  }, [orders]);

  // 收支明细数据
  const incomeRecords = useMemo(() => {
    if (!orders) return [];
    return orders
      .filter((order) => order.paymentAmount && parseFloat(order.paymentAmount) > 0)
      .map((order) => ({
        id: order.id,
        date: order.paymentDate,
        type: "income" as const,
        amount: parseFloat(order.paymentAmount || "0"),
        channel: order.paymentChannel || "-",
        orderNo: order.orderNo,
        description: `订单收款 - ${order.orderNo}`,
        salesId: order.salesId,
      }));
  }, [orders]);

  const expenseRecords = useMemo(() => {
    if (!orders) return [];
    const records: Array<{
      id: number;
      date: Date | null;
      type: "expense";
      amount: number;
      category: string;
      orderNo: string;
      description: string;
      salesId: number;
    }> = [];

    orders.forEach((order) => {
      if (order.teacherFee && parseFloat(order.teacherFee) > 0) {
        records.push({
          id: order.id,
          date: order.classDate,
          type: "expense",
          amount: parseFloat(order.teacherFee),
          category: "老师费用",
          orderNo: order.orderNo,
          description: `老师费用 - ${order.deliveryTeacher || "未指定"}`,
          salesId: order.salesId,
        });
      }
      if (order.transportFee && parseFloat(order.transportFee) > 0) {
        records.push({
          id: order.id * 10 + 1,
          date: order.classDate,
          type: "expense",
          amount: parseFloat(order.transportFee),
          category: "车费",
          orderNo: order.orderNo,
          description: `车费 - ${order.orderNo}`,
          salesId: order.salesId,
        });
      }
      if (order.partnerFee && parseFloat(order.partnerFee) > 0) {
        records.push({
          id: order.id * 10 + 2,
          date: order.classDate,
          type: "expense",
          amount: parseFloat(order.partnerFee),
          category: "合伙人费用",
          orderNo: order.orderNo,
          description: `合伙人费用 - ${order.orderNo}`,
          salesId: order.salesId,
        });
      }
      if (order.otherFee && parseFloat(order.otherFee) > 0) {
        records.push({
          id: order.id * 10 + 3,
          date: order.classDate,
          type: "expense",
          amount: parseFloat(order.otherFee),
          category: "其他费用",
          orderNo: order.orderNo,
          description: `其他费用 - ${order.orderNo}`,
          salesId: order.salesId,
        });
      }
    });

    return records;
  }, [orders]);

  const filteredIncomeRecords = incomeRecords.filter(
    (record) =>
      (record.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedSales === "all" || record.salesId.toString() === selectedSales)
  );

  const filteredExpenseRecords = expenseRecords.filter(
    (record) =>
      (record.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedSales === "all" || record.salesId.toString() === selectedSales)
  );

  // 导出Excel
  const handleExport = async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      
      // 财务概览
      const summarySheet = workbook.addWorksheet("财务概览");
      summarySheet.columns = [
        { header: "指标", key: "metric", width: 20 },
        { header: "数值", key: "value", width: 20 },
      ];
      summarySheet.addRows([
        { metric: "总收入", value: `¥${financialStats.totalIncome.toFixed(2)}` },
        { metric: "总支出", value: `¥${financialStats.totalExpense.toFixed(2)}` },
        { metric: "净利润", value: `¥${financialStats.profit.toFixed(2)}` },
        { metric: "利润率", value: `${financialStats.profitMargin.toFixed(2)}%` },
        { metric: "订单数量", value: financialStats.orderCount },
      ]);

      // 收入明细
      const incomeSheet = workbook.addWorksheet("收入明细");
      incomeSheet.columns = [
        { header: "日期", key: "date", width: 15 },
        { header: "订单号", key: "orderNo", width: 20 },
        { header: "支付渠道", key: "channel", width: 15 },
        { header: "描述", key: "description", width: 30 },
        { header: "金额", key: "amount", width: 15 },
      ];
      incomeSheet.addRows(
        filteredIncomeRecords.map((record) => ({
          date: record.date ? new Date(record.date).toLocaleDateString() : "-",
          orderNo: record.orderNo,
          channel: record.channel,
          description: record.description,
          amount: `¥${record.amount.toFixed(2)}`,
        }))
      );

      // 支出明细
      const expenseSheet = workbook.addWorksheet("支出明细");
      expenseSheet.columns = [
        { header: "日期", key: "date", width: 15 },
        { header: "订单号", key: "orderNo", width: 20 },
        { header: "费用类别", key: "category", width: 15 },
        { header: "描述", key: "description", width: 30 },
        { header: "金额", key: "amount", width: 15 },
      ];
      expenseSheet.addRows(
        filteredExpenseRecords.map((record) => ({
          date: record.date ? new Date(record.date).toLocaleDateString() : "-",
          orderNo: record.orderNo,
          category: record.category,
          description: record.description,
          amount: `¥${record.amount.toFixed(2)}`,
        }))
      );

      // 销售业绩
      const salesSheet = workbook.addWorksheet("销售业绩");
      salesSheet.columns = [
        { header: "销售人员", key: "name", width: 15 },
        { header: "订单数", key: "orderCount", width: 10 },
        { header: "总收入", key: "income", width: 15 },
        { header: "总支出", key: "expense", width: 15 },
        { header: "净利润", key: "profit", width: 15 },
      ];
      salesSheet.addRows(
        salesStats.map((stat) => ({
          name: stat.name,
          orderCount: stat.orderCount,
          income: `¥${stat.income.toFixed(2)}`,
          expense: `¥${stat.expense.toFixed(2)}`,
          profit: `¥${stat.profit.toFixed(2)}`,
        }))
      );

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `财务报表_${new Date().toLocaleDateString()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("导出成功");
    } catch (error) {
      toast.error("导出失败");
      console.error(error);
    }
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">财务对账</h1>
            <p className="text-muted-foreground mt-2">查看收支明细和利润分析</p>
          </div>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            导出报表
          </Button>
        </div>

        {/* 城市收益统计和趋势 */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>城市收益统计</CardTitle>
              <p className="text-sm text-muted-foreground">按城市分配比例计算收益</p>
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
              <p className="text-sm text-muted-foreground">最近6个月收益变化</p>
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

        {/* 财务概览 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">总收入</p>
                  <p className="text-2xl font-bold text-green-600">
                    ¥{financialStats.totalIncome.toFixed(2)}
                  </p>
                </div>
                <ArrowUpCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">总支出</p>
                  <p className="text-2xl font-bold text-red-600">
                    ¥{financialStats.totalExpense.toFixed(2)}
                  </p>
                </div>
                <ArrowDownCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">净利润</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ¥{financialStats.profit.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">利润率</p>
                  <p className="text-2xl font-bold">
                    {financialStats.profitMargin.toFixed(1)}%
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">订单数量</p>
                  <p className="text-2xl font-bold">{financialStats.orderCount}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 图表展示 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 收支趋势图 */}
          <Card>
            <CardHeader>
              <CardTitle>收支趋势(最近6个月)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#10b981" name="收入" />
                  <Line type="monotone" dataKey="expense" stroke="#ef4444" name="支出" />
                  <Line type="monotone" dataKey="profit" stroke="#3b82f6" name="利润" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 费用占比饼图 */}
          <Card>
            <CardHeader>
              <CardTitle>费用占比</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ¥${entry.value.toFixed(0)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* 销售业绩排名 */}
        <Card>
          <CardHeader>
            <CardTitle>销售业绩排名</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesStats.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="income" fill="#10b981" name="收入" />
                <Bar dataKey="expense" fill="#ef4444" name="支出" />
                <Bar dataKey="profit" fill="#3b82f6" name="利润" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 筛选工具栏 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>收支明细</CardTitle>
              <div className="flex items-center space-x-2">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="选择时间范围" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部时间</SelectItem>
                    <SelectItem value="thisMonth">本月</SelectItem>
                    <SelectItem value="lastMonth">上月</SelectItem>
                    <SelectItem value="thisYear">今年</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedSales} onValueChange={setSelectedSales}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="筛选销售" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部销售</SelectItem>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="搜索订单号或描述..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-[250px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="income">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="income">收入明细</TabsTrigger>
                <TabsTrigger value="expense">支出明细</TabsTrigger>
              </TabsList>

              <TabsContent value="income" className="mt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日期</TableHead>
                        <TableHead>订单号</TableHead>
                        <TableHead>支付渠道</TableHead>
                        <TableHead>描述</TableHead>
                        <TableHead className="text-right">金额</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIncomeRecords.length > 0 ? (
                        filteredIncomeRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              {record.date ? new Date(record.date).toLocaleDateString() : "-"}
                            </TableCell>
                            <TableCell className="font-medium">{record.orderNo}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{record.channel}</Badge>
                            </TableCell>
                            <TableCell>{record.description}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              +¥{record.amount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            暂无收入记录
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="expense" className="mt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日期</TableHead>
                        <TableHead>订单号</TableHead>
                        <TableHead>费用类别</TableHead>
                        <TableHead>描述</TableHead>
                        <TableHead className="text-right">金额</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenseRecords.length > 0 ? (
                        filteredExpenseRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              {record.date ? new Date(record.date).toLocaleDateString() : "-"}
                            </TableCell>
                            <TableCell className="font-medium">{record.orderNo}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{record.category}</Badge>
                            </TableCell>
                            <TableCell>{record.description}</TableCell>
                            <TableCell className="text-right text-red-600 font-medium">
                              -¥{record.amount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            暂无支出记录
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
