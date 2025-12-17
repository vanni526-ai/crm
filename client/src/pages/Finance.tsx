import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { useState, useMemo } from "react";

export default function Finance() {
  const { data: orders } = trpc.orders.list.useQuery();
  const { data: schedules } = trpc.schedules.list.useQuery();
  
  const [dateRange, setDateRange] = useState("thisMonth");
  const [searchTerm, setSearchTerm] = useState("");

  // 计算财务统计数据
  const financialStats = useMemo(() => {
    if (!orders) return { totalIncome: 0, totalExpense: 0, profit: 0, orderCount: 0 };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let filteredOrders = orders;
    if (dateRange === "thisMonth") {
      filteredOrders = orders.filter((order) => {
        if (!order.paymentDate) return false;
        const paymentDate = new Date(order.paymentDate);
        return paymentDate >= startOfMonth && paymentDate <= endOfMonth;
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

    return {
      totalIncome,
      totalExpense,
      profit,
      orderCount: filteredOrders.length,
    };
  }, [orders, dateRange]);

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
        });
      }
    });

    return records;
  }, [orders]);

  const filteredIncomeRecords = incomeRecords.filter(
    (record) =>
      record.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExpenseRecords = expenseRecords.filter(
    (record) =>
      record.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">财务对账</h1>
          <p className="text-muted-foreground mt-2">查看收支明细和利润分析</p>
        </div>

        {/* 财务概览 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <p className="text-sm text-muted-foreground">订单数量</p>
                  <p className="text-2xl font-bold">{financialStats.orderCount}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

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
