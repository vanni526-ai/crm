import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, FileText, Calendar, CheckCircle, XCircle } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Import() {
  const { data: logs, refetch } = trpc.import.getLogs.useQuery();
  const parseCSV = trpc.import.parseCSV.useMutation();
  const importCSV = trpc.import.importCSVToOrders.useMutation();
  const parseExcel = trpc.import.parseExcel.useMutation();
  const importExcel = trpc.import.importExcelToOrders.useMutation();
  const parseICS = trpc.import.parseICS.useMutation();
  const importICS = trpc.import.importICSToSchedules.useMutation();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [currentFile, setCurrentFile] = useState<{ type: string; content: string } | null>(null);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const icsInputRef = useRef<HTMLInputElement>(null);

  const handleFileRead = (file: File, type: "csv" | "excel" | "ics") => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result;
        if (!content) return;

        // 转换为base64
        const base64 = btoa(
          new Uint8Array(content as ArrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );

        setCurrentFile({ type, content: base64 });

        // 解析预览
        if (type === "csv") {
          const result = await parseCSV.mutateAsync({ fileContent: base64 });
          setPreviewData(result.records);
          setPreviewOpen(true);
          toast.success(`成功解析 ${result.recordCount} 条记录`);
        } else if (type === "excel") {
          const result = await parseExcel.mutateAsync({ fileContent: base64 });
          setPreviewData(result.records);
          setPreviewOpen(true);
          toast.success(`成功解析 ${result.recordCount} 条记录`);
        } else if (type === "ics") {
          const result = await parseICS.mutateAsync({ fileContent: base64 });
          setPreviewData(result.events);
          setPreviewOpen(true);
          toast.success(`成功解析 ${result.recordCount} 个事件`);
        }
      } catch (error: any) {
        toast.error(error.message || "文件解析失败");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!currentFile) return;

    try {
      let result;
      if (currentFile.type === "csv") {
        result = await importCSV.mutateAsync({ fileContent: currentFile.content });
      } else if (currentFile.type === "excel") {
        result = await importExcel.mutateAsync({ fileContent: currentFile.content });
      } else if (currentFile.type === "ics") {
        result = await importICS.mutateAsync({ fileContent: currentFile.content });
      }

      if (result) {
        toast.success(
          `导入完成: 成功 ${result.successCount} 条, 失败 ${result.failedCount} 条`
        );
        setPreviewOpen(false);
        setCurrentFile(null);
        refetch();
      }
    } catch (error: any) {
      toast.error(error.message || "导入失败");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">数据导入</h1>
          <p className="text-muted-foreground mt-2">支持CSV、Excel、XML、ICS文件格式</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">CSV文件</CardTitle>
              </div>
              <CardDescription>支付宝交易明细</CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileRead(file, "csv");
                }}
              />
              <Button
                className="w-full"
                onClick={() => csvInputRef.current?.click()}
                disabled={parseCSV.isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                {parseCSV.isPending ? "解析中..." : "上传CSV"}
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Excel文件</CardTitle>
              </div>
              <CardDescription>微信支付账单</CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileRead(file, "excel");
                }}
              />
              <Button
                className="w-full"
                onClick={() => excelInputRef.current?.click()}
                disabled={parseExcel.isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                {parseExcel.isPending ? "解析中..." : "上传Excel"}
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">ICS文件</CardTitle>
              </div>
              <CardDescription>日历排课信息</CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={icsInputRef}
                type="file"
                accept=".ics"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileRead(file, "ics");
                }}
              />
              <Button
                className="w-full"
                onClick={() => icsInputRef.current?.click()}
                disabled={parseICS.isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                {parseICS.isPending ? "解析中..." : "上传ICS"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>导入历史</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>文件名</TableHead>
                    <TableHead>文件类型</TableHead>
                    <TableHead>数据类型</TableHead>
                    <TableHead>总记录数</TableHead>
                    <TableHead>成功</TableHead>
                    <TableHead>失败</TableHead>
                    <TableHead>导入时间</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs && logs.length > 0 ? (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.fileName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.fileType.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>{log.dataType}</TableCell>
                        <TableCell>{log.totalRows}</TableCell>
                        <TableCell className="text-green-600">{log.successRows}</TableCell>
                        <TableCell className="text-red-600">{log.failedRows}</TableCell>
                        <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          {log.failedRows === 0 ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        暂无导入记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>数据预览</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                共解析到 {previewData.length} 条记录,以下是前10条预览
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {previewData[0] &&
                        Object.keys(previewData[0]).slice(0, 6).map((key) => (
                          <TableHead key={key}>{key}</TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(0, 10).map((record, index) => (
                      <TableRow key={index}>
                        {Object.values(record).slice(0, 6).map((value: any, i) => (
                          <TableCell key={i} className="max-w-[200px] truncate">
                            {value?.toString() || "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                  取消
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={
                    importCSV.isPending || importExcel.isPending || importICS.isPending
                  }
                >
                  {importCSV.isPending || importExcel.isPending || importICS.isPending
                    ? "导入中..."
                    : "确认导入"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
