import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export default function ReconciliationExport() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentChannel, setPaymentChannel] = useState("all");
  const [showReport, setShowReport] = useState(false);

  const reportQuery = trpc.orders.exportReconciliationReport.useQuery(
    {
      startDate,
      endDate,
      paymentChannel: paymentChannel !== "all" ? paymentChannel : undefined,
    },
    { enabled: showReport && !!startDate && !!endDate }
  );

  const handleGenerate = () => {
    if (!startDate || !endDate) {
      toast.error("请选择开始和结束日期");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("开始日期不能晚于结束日期");
      return;
    }

    setShowReport(true);
  };

  const handleExportCSV = () => {
    if (!reportQuery.data) return;

    const { allOrders } = reportQuery.data;
    
    // CSV表头
    const headers = [
      "订单号",
      "客户名",
      "支付渠道",
      "渠道订单号",
      "支付金额",
      "课程金额",
      "上课日期",
      "上课时间",
      "交付城市",
      "交付老师",
      "交付课程",
      "销售人员",
      "订单状态",
      "创建时间",
    ];

    // CSV数据行
    const rows = allOrders.map((order) => [
      order.orderNo || "",
      order.customerName || "",
      order.paymentChannel || "",
      order.channelOrderNo || "",
      order.paymentAmount || "0",
      order.courseAmount || "0",
      order.classDate ? new Date(order.classDate).toLocaleDateString() : "",
      order.classTime || "",
      order.deliveryCity || "",
      order.deliveryTeacher || "",
      order.deliveryCourse || "",
      order.salesPerson || "",
      order.status || "",
      order.createdAt ? new Date(order.createdAt).toLocaleString() : "",
    ]);

    // 组装CSV内容
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // 创建下载链接
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `对账报表_${startDate}_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("报表导出成功");
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">对账报表导出</h1>
        <p className="text-muted-foreground mt-2">
          按支付渠道分组导出订单数据,方便与支付平台账单进行对账
        </p>
      </div>

      {/* 筛选条件 */}
      <Card>
        <CardHeader>
          <CardTitle>报表筛选</CardTitle>
          <CardDescription>选择日期范围和支付渠道</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">开始日期</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">结束日期</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentChannel">支付渠道</Label>
              <Select value={paymentChannel} onValueChange={setPaymentChannel}>
                <SelectTrigger id="paymentChannel">
                  <SelectValue placeholder="全部渠道" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部渠道</SelectItem>
                  <SelectItem value="支付宝">支付宝</SelectItem>
                  <SelectItem value="微信支付">微信支付</SelectItem>
                  <SelectItem value="富掌柜">富掌柜</SelectItem>
                  <SelectItem value="现金">现金</SelectItem>
                  <SelectItem value="银行转账">银行转账</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleGenerate} disabled={reportQuery.isLoading}>
              生成报表
            </Button>
            {showReport && reportQuery.data && (
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                导出CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 报表统计 */}
      {showReport && reportQuery.data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  订单总数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportQuery.data.totalCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  总金额
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ¥{reportQuery.data.totalAmount.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 按渠道分组统计 */}
          <Card>
            <CardHeader>
              <CardTitle>按支付渠道分组</CardTitle>
              <CardDescription>各支付渠道的订单数量和金额统计</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>支付渠道</TableHead>
                      <TableHead className="text-right">订单数量</TableHead>
                      <TableHead className="text-right">总金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportQuery.data.groupedByChannel.map((group: any) => (
                      <TableRow key={group.channel}>
                        <TableCell>
                          <Badge variant="outline">{group.channel}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{group.count}</TableCell>
                        <TableCell className="text-right font-medium">
                          ¥{group.totalAmount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 订单明细 */}
          <Card>
            <CardHeader>
              <CardTitle>订单明细</CardTitle>
              <CardDescription>
                共 {reportQuery.data.allOrders.length} 条订单记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>订单号</TableHead>
                      <TableHead>客户名</TableHead>
                      <TableHead>支付渠道</TableHead>
                      <TableHead>渠道订单号</TableHead>
                      <TableHead className="text-right">支付金额</TableHead>
                      <TableHead>上课日期</TableHead>
                      <TableHead>交付城市</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportQuery.data.allOrders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.orderNo}</TableCell>
                        <TableCell>{order.customerName || "-"}</TableCell>
                        <TableCell>
                          {order.paymentChannel ? (
                            <Badge variant="outline">{order.paymentChannel}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {order.channelOrderNo || <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ¥{parseFloat(order.paymentAmount || "0").toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {order.classDate
                            ? new Date(order.classDate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>{order.deliveryCity || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.status === "completed"
                                ? "default"
                                : order.status === "paid"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {order.status === "pending"
                              ? "待支付"
                              : order.status === "paid"
                              ? "已支付"
                              : order.status === "completed"
                              ? "已完成"
                              : order.status === "cancelled"
                              ? "已取消"
                              : order.status === "refunded"
                              ? "已退款"
                              : order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
