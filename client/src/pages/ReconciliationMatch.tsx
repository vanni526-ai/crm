import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, Download, CheckCircle2, AlertCircle, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface MatchedOrder {
  orderId: number;
  orderNo: string;
  customerName: string | null;
  salesPerson: string | null;
  deliveryCourse: string | null;
  deliveryCity: string | null;
  deliveryTeacher: string | null;
  classDate: string | null;
  courseAmount: number;
  receivedAmount: number;
  gap: number;
  matchStatus: "paid" | "partial" | "unpaid";
  notes: string | null;
  paymentChannel: string | null;
  channelOrderNo: string | null;
  paymentDate: string | null;
  matchedRows: Array<{
    tradeDate: string;
    amount: number;
    channel: string;
    tradeNo: string;
    remark: string;
  }>;
}

interface MatchResult {
  statementCount: number;
  orderCount: number;
  paid: MatchedOrder[];
  partial: MatchedOrder[];
  unpaid: MatchedOrder[];
  unmatchedRows: Array<{
    tradeDate: string;
    amount: number;
    channel: string;
    tradeNo: string;
    remark: string;
  }>;
}

function fmtAmt(n: number) {
  return "¥" + n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string | null) {
  if (!s) return "-";
  return s.substring(0, 10);
}

function OrderRow({ order, statusColor }: { order: MatchedOrder; statusColor: string }) {
  return (
    <TableRow className="hover:bg-white/5 transition-colors">
      <TableCell className="font-mono text-xs text-muted-foreground">{order.orderNo}</TableCell>
      <TableCell>{order.customerName || "-"}</TableCell>
      <TableCell>{order.salesPerson || "-"}</TableCell>
      <TableCell className="max-w-[140px] truncate" title={order.deliveryCourse || ""}>{order.deliveryCourse || "-"}</TableCell>
      <TableCell>{order.deliveryCity || "-"}</TableCell>
      <TableCell>{order.deliveryTeacher || "-"}</TableCell>
      <TableCell>{fmtDate(order.classDate)}</TableCell>
      <TableCell className="text-right font-medium">{fmtAmt(order.courseAmount)}</TableCell>
      <TableCell className={"text-right font-medium " + statusColor}>{fmtAmt(order.receivedAmount)}</TableCell>
      <TableCell className="text-right text-muted-foreground text-sm">{order.gap !== 0 ? fmtAmt(Math.abs(order.gap)) : "-"}</TableCell>
      <TableCell>{order.paymentChannel || "-"}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{order.matchedRows.map((r) => r.tradeDate).join(", ") || "-"}</TableCell>
    </TableRow>
  );
}

function StatusCard({ title, icon, orders, accentClass, bgClass, statusColor, emptyText }: {
  title: string; icon: React.ReactNode; orders: MatchedOrder[];
  accentClass: string; bgClass: string; statusColor: string; emptyText: string;
}) {
  const totalCourse = orders.reduce((s, o) => s + o.courseAmount, 0);
  const totalReceived = orders.reduce((s, o) => s + o.receivedAmount, 0);
  return (
    <Card className={"backdrop-blur-sm border " + bgClass}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={accentClass}>{icon}</span>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <Badge variant="secondary" className="text-xs">{orders.length} 单</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            课程金额合计：<span className="font-medium text-foreground">{fmtAmt(totalCourse)}</span>
            {totalReceived > 0 && <span className="ml-3">已收：<span className={"font-medium " + statusColor}>{fmtAmt(totalReceived)}</span></span>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {orders.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">{emptyText}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/10">
                  <TableHead className="text-xs">订单号</TableHead>
                  <TableHead className="text-xs">客户</TableHead>
                  <TableHead className="text-xs">销售</TableHead>
                  <TableHead className="text-xs">课程</TableHead>
                  <TableHead className="text-xs">城市</TableHead>
                  <TableHead className="text-xs">老师</TableHead>
                  <TableHead className="text-xs">上课日期</TableHead>
                  <TableHead className="text-xs text-right">课程金额</TableHead>
                  <TableHead className="text-xs text-right">已收金额</TableHead>
                  <TableHead className="text-xs text-right">差额</TableHead>
                  <TableHead className="text-xs">支付渠道</TableHead>
                  <TableHead className="text-xs">收款日期</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <OrderRow key={order.orderId} order={order} statusColor={statusColor} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReconciliationMatch() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [fileType, setFileType] = useState<"wechat_csv" | "alipay_xlsx">("wechat_csv");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseAndMatch = trpc.statementMatch.parseAndMatch.useMutation({
    onSuccess: (data) => {
      setResult(data as MatchResult);
      toast.success("匹配完成", { description: "解析 " + data.statementCount + " 条流水，匹配 " + data.orderCount + " 个订单" });
    },
    onError: (err) => { toast.error("匹配失败", { description: err.message }); },
  });

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));
      await parseAndMatch.mutateAsync({ fileContent: base64, fileType, year, month });
    } catch {
      // handled by onError
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [fileType, year, month, parseAndMatch]);

  const handleExport = useCallback(() => {
    if (!result) return;
    const wb = XLSX.utils.book_new();
    const toRows = (orders: MatchedOrder[], statusLabel: string) =>
      orders.map((o) => ({
        "支付状态": statusLabel,
        "订单号": o.orderNo,
        "客户": o.customerName || "",
        "销售": o.salesPerson || "",
        "课程": o.deliveryCourse || "",
        "城市": o.deliveryCity || "",
        "老师": o.deliveryTeacher || "",
        "上课日期": fmtDate(o.classDate),
        "课程金额": o.courseAmount,
        "已收金额": o.receivedAmount,
        "差额": o.gap,
        "支付渠道": o.paymentChannel || "",
        "渠道订单号": o.channelOrderNo || "",
        "备注": o.notes || "",
        "收款流水日期": o.matchedRows.map((r) => r.tradeDate).join("; "),
        "收款流水金额": o.matchedRows.map((r) => "¥" + r.amount).join("; "),
      }));
    const allRows = [
      ...toRows(result.paid, "全款已付"),
      ...toRows(result.partial, "部分付款"),
      ...toRows(result.unpaid, "未付款"),
    ];
    const ws = XLSX.utils.json_to_sheet(allRows);
    ws["!cols"] = Array(16).fill({ wch: 14 });
    XLSX.utils.book_append_sheet(wb, ws, "对账结果");
    if (result.unmatchedRows.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(result.unmatchedRows.map((r) => ({
        "日期": r.tradeDate,
        "金额": r.amount,
        "渠道": r.channel === "wechat" ? "微信" : "支付宝",
        "流水号": r.tradeNo,
        "备注": r.remark,
      })));
      XLSX.utils.book_append_sheet(wb, ws2, "未匹配流水");
    }
    XLSX.writeFile(wb, "对账结果_" + year + "年" + month + "月.xlsx");
    toast.success("导出成功");
  }, [result, year, month]);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">财务对账匹配</h1>
            <p className="text-muted-foreground text-sm mt-1">导入收款流水，智能匹配当月订单，核对支付状态</p>
          </div>
          {result && (
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />导出 Excel
            </Button>
          )}
        </div>

        <Card className="backdrop-blur-sm bg-white/5 border-white/10">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">对账年份</label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y} 年</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">对账月份</label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>{months.map((m) => <SelectItem key={m} value={String(m)}>{m} 月</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">流水类型</label>
                <Select value={fileType} onValueChange={(v) => setFileType(v as any)}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wechat_csv">微信收款流水（CSV）</SelectItem>
                    <SelectItem value="alipay_xlsx">支付宝流水（Excel）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium opacity-0 select-none">上传</label>
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" accept={fileType === "wechat_csv" ? ".csv" : ".xlsx,.xls"} onChange={handleFileChange} className="hidden" id="statement-file" />
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="gap-2">
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {isProcessing ? "解析匹配中..." : "导入流水文件"}
                  </Button>
                  {fileName && <span className="text-sm text-muted-foreground flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{fileName}</span>}
                </div>
              </div>
            </div>
            {result && (
              <div className="mt-5 pt-5 border-t border-white/10 flex flex-wrap gap-6 text-sm">
                <div>流水条数：<span className="font-semibold">{result.statementCount}</span></div>
                <div>当月订单：<span className="font-semibold">{result.orderCount}</span></div>
                <div className="text-green-400">全款已付：<span className="font-semibold">{result.paid.length}</span></div>
                <div className="text-yellow-400">部分付款：<span className="font-semibold">{result.partial.length}</span></div>
                <div className="text-red-400">未付款：<span className="font-semibold">{result.unpaid.length}</span></div>
                {result.unmatchedRows.length > 0 && <div className="text-muted-foreground">未匹配流水：<span className="font-semibold">{result.unmatchedRows.length}</span> 条</div>}
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-6">
            <StatusCard title="全款已付" icon={<CheckCircle2 className="w-5 h-5" />} orders={result.paid} accentClass="text-green-400" bgClass="bg-green-500/5 border-green-500/20" statusColor="text-green-400" emptyText="暂无全款已付订单" />
            <StatusCard title="部分付款" icon={<AlertCircle className="w-5 h-5" />} orders={result.partial} accentClass="text-yellow-400" bgClass="bg-yellow-500/5 border-yellow-500/20" statusColor="text-yellow-400" emptyText="暂无部分付款订单" />
            <StatusCard title="未付款" icon={<XCircle className="w-5 h-5" />} orders={result.unpaid} accentClass="text-red-400" bgClass="bg-red-500/5 border-red-500/20" statusColor="text-red-400" emptyText="暂无未付款订单" />
          </div>
        )}

        {!result && !isProcessing && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Upload className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-base">请选择对账月份并导入收款流水文件</p>
            <p className="text-sm mt-1 opacity-70">支持微信收款流水（CSV）和支付宝流水（Excel）</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
