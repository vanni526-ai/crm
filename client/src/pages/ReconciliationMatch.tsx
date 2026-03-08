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
  return "\u00a5" + n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
            <Badge variant="secondary" className="text-xs">{orders.length} \u5355</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            \u8bfe\u7a0b\u91d1\u989d\u5408\u8ba1\uff1a<span className="font-medium text-foreground">{fmtAmt(totalCourse)}</span>
            {totalReceived > 0 && <span className="ml-3">\u5df2\u6536\uff1a<span className={"font-medium " + statusColor}>{fmtAmt(totalReceived)}</span></span>}
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
                  <TableHead className="text-xs">\u8ba2\u5355\u53f7</TableHead>
                  <TableHead className="text-xs">\u5ba2\u6237</TableHead>
                  <TableHead className="text-xs">\u9500\u552e</TableHead>
                  <TableHead className="text-xs">\u8bfe\u7a0b</TableHead>
                  <TableHead className="text-xs">\u57ce\u5e02</TableHead>
                  <TableHead className="text-xs">\u8001\u5e08</TableHead>
                  <TableHead className="text-xs">\u4e0a\u8bfe\u65e5\u671f</TableHead>
                  <TableHead className="text-xs text-right">\u8bfe\u7a0b\u91d1\u989d</TableHead>
                  <TableHead className="text-xs text-right">\u5df2\u6536\u91d1\u989d</TableHead>
                  <TableHead className="text-xs text-right">\u5dee\u989d</TableHead>
                  <TableHead className="text-xs">\u652f\u4ed8\u6e20\u9053</TableHead>
                  <TableHead className="text-xs">\u6536\u6b3e\u65e5\u671f</TableHead>
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
      toast.success("\u5339\u914d\u5b8c\u6210", { description: "\u89e3\u6790 " + data.statementCount + " \u6761\u6d41\u6c34\uff0c\u5339\u914d " + data.orderCount + " \u4e2a\u8ba2\u5355" });
    },
    onError: (err) => { toast.error("\u5339\u914d\u5931\u8d25", { description: err.message }); },
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
        "\u652f\u4ed8\u72b6\u6001": statusLabel,
        "\u8ba2\u5355\u53f7": o.orderNo,
        "\u5ba2\u6237": o.customerName || "",
        "\u9500\u552e": o.salesPerson || "",
        "\u8bfe\u7a0b": o.deliveryCourse || "",
        "\u57ce\u5e02": o.deliveryCity || "",
        "\u8001\u5e08": o.deliveryTeacher || "",
        "\u4e0a\u8bfe\u65e5\u671f": fmtDate(o.classDate),
        "\u8bfe\u7a0b\u91d1\u989d": o.courseAmount,
        "\u5df2\u6536\u91d1\u989d": o.receivedAmount,
        "\u5dee\u989d": o.gap,
        "\u652f\u4ed8\u6e20\u9053": o.paymentChannel || "",
        "\u6e20\u9053\u8ba2\u5355\u53f7": o.channelOrderNo || "",
        "\u5907\u6ce8": o.notes || "",
        "\u6536\u6b3e\u6d41\u6c34\u65e5\u671f": o.matchedRows.map((r) => r.tradeDate).join("; "),
        "\u6536\u6b3e\u6d41\u6c34\u91d1\u989d": o.matchedRows.map((r) => "\u00a5" + r.amount).join("; "),
      }));
    const allRows = [
      ...toRows(result.paid, "\u5168\u6b3e\u5df2\u4ed8"),
      ...toRows(result.partial, "\u90e8\u5206\u4ed8\u6b3e"),
      ...toRows(result.unpaid, "\u672a\u4ed8\u6b3e"),
    ];
    const ws = XLSX.utils.json_to_sheet(allRows);
    ws["!cols"] = Array(16).fill({ wch: 14 });
    XLSX.utils.book_append_sheet(wb, ws, "\u5bf9\u8d26\u7ed3\u679c");
    if (result.unmatchedRows.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(result.unmatchedRows.map((r) => ({
        "\u65e5\u671f": r.tradeDate,
        "\u91d1\u989d": r.amount,
        "\u6e20\u9053": r.channel === "wechat" ? "\u5fae\u4fe1" : "\u652f\u4ed8\u5b9d",
        "\u6d41\u6c34\u53f7": r.tradeNo,
        "\u5907\u6ce8": r.remark,
      })));
      XLSX.utils.book_append_sheet(wb, ws2, "\u672a\u5339\u914d\u6d41\u6c34");
    }
    XLSX.writeFile(wb, "\u5bf9\u8d26\u7ed3\u679c_" + year + "\u5e74" + month + "\u6708.xlsx");
    toast.success("\u5bfc\u51fa\u6210\u529f");
  }, [result, year, month]);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">\u8d22\u52a1\u5bf9\u8d26\u5339\u914d</h1>
            <p className="text-muted-foreground text-sm mt-1">\u5bfc\u5165\u6536\u6b3e\u6d41\u6c34\uff0c\u667a\u80fd\u5339\u914d\u5f53\u6708\u8ba2\u5355\uff0c\u6838\u5bf9\u652f\u4ed8\u72b6\u6001</p>
          </div>
          {result && (
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />\u5bfc\u51fa Excel
            </Button>
          )}
        </div>

        <Card className="backdrop-blur-sm bg-white/5 border-white/10">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">\u5bf9\u8d26\u5e74\u4efd</label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y} \u5e74</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">\u5bf9\u8d26\u6708\u4efd</label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>{months.map((m) => <SelectItem key={m} value={String(m)}>{m} \u6708</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">\u6d41\u6c34\u7c7b\u578b</label>
                <Select value={fileType} onValueChange={(v) => setFileType(v as any)}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wechat_csv">\u5fae\u4fe1\u6536\u6b3e\u6d41\u6c34\uff08CSV\uff09</SelectItem>
                    <SelectItem value="alipay_xlsx">\u652f\u4ed8\u5b9d\u6d41\u6c34\uff08Excel\uff09</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium opacity-0 select-none">\u4e0a\u4f20</label>
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" accept={fileType === "wechat_csv" ? ".csv" : ".xlsx,.xls"} onChange={handleFileChange} className="hidden" id="statement-file" />
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="gap-2">
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {isProcessing ? "\u89e3\u6790\u5339\u914d\u4e2d..." : "\u5bfc\u5165\u6d41\u6c34\u6587\u4ef6"}
                  </Button>
                  {fileName && <span className="text-sm text-muted-foreground flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{fileName}</span>}
                </div>
              </div>
            </div>
            {result && (
              <div className="mt-5 pt-5 border-t border-white/10 flex flex-wrap gap-6 text-sm">
                <div>\u6d41\u6c34\u6761\u6570\uff1a<span className="font-semibold">{result.statementCount}</span></div>
                <div>\u5f53\u6708\u8ba2\u5355\uff1a<span className="font-semibold">{result.orderCount}</span></div>
                <div className="text-green-400">\u5168\u6b3e\u5df2\u4ed8\uff1a<span className="font-semibold">{result.paid.length}</span></div>
                <div className="text-yellow-400">\u90e8\u5206\u4ed8\u6b3e\uff1a<span className="font-semibold">{result.partial.length}</span></div>
                <div className="text-red-400">\u672a\u4ed8\u6b3e\uff1a<span className="font-semibold">{result.unpaid.length}</span></div>
                {result.unmatchedRows.length > 0 && <div className="text-muted-foreground">\u672a\u5339\u914d\u6d41\u6c34\uff1a<span className="font-semibold">{result.unmatchedRows.length}</span> \u6761</div>}
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-6">
            <StatusCard title="\u5168\u6b3e\u5df2\u4ed8" icon={<CheckCircle2 className="w-5 h-5" />} orders={result.paid} accentClass="text-green-400" bgClass="bg-green-500/5 border-green-500/20" statusColor="text-green-400" emptyText="\u6682\u65e0\u5168\u6b3e\u5df2\u4ed8\u8ba2\u5355" />
            <StatusCard title="\u90e8\u5206\u4ed8\u6b3e" icon={<AlertCircle className="w-5 h-5" />} orders={result.partial} accentClass="text-yellow-400" bgClass="bg-yellow-500/5 border-yellow-500/20" statusColor="text-yellow-400" emptyText="\u6682\u65e0\u90e8\u5206\u4ed8\u6b3e\u8ba2\u5355" />
            <StatusCard title="\u672a\u4ed8\u6b3e" icon={<XCircle className="w-5 h-5" />} orders={result.unpaid} accentClass="text-red-400" bgClass="bg-red-500/5 border-red-500/20" statusColor="text-red-400" emptyText="\u6682\u65e0\u672a\u4ed8\u6b3e\u8ba2\u5355" />
          </div>
        )}

        {!result && !isProcessing && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Upload className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-base">\u8bf7\u9009\u62e9\u5bf9\u8d26\u6708\u4efd\u5e76\u5bfc\u5165\u6536\u6b3e\u6d41\u6c34\u6587\u4ef6</p>
            <p className="text-sm mt-1 opacity-70">\u652f\u6301\u5fae\u4fe1\u6536\u6b3e\u6d41\u6c34\uff08CSV\uff09\u548c\u652f\u4ed8\u5b9d\u6d41\u6c34\uff08Excel\uff09</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
