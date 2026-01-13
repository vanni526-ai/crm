import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, FileText, Calendar, CheckCircle, XCircle, List, CalendarDays, CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MonthlyPartnerSettlement from "@/components/MonthlyPartnerSettlement";

export default function Import() {
  const { data: logs, refetch } = trpc.import.getLogs.useQuery();
  const { data: schedules } = trpc.schedules.list.useQuery();
  const parseCSV = trpc.import.parseCSV.useMutation();
  const importCSV = trpc.import.importCSVToOrders.useMutation();
  const parseExcel = trpc.import.parseExcel.useMutation();
  const importExcel = trpc.import.importExcelToOrders.useMutation();
  const parseICS = trpc.import.parseICS.useMutation();
  const parseICSToOrders = trpc.import.parseICSToOrders.useMutation();
  const importICS = trpc.import.importICSToSchedules.useMutation();
  const importICSToOrders = trpc.import.importICSToOrders.useMutation();
  
  const [icsImportMode, setIcsImportMode] = useState<'schedule' | 'order'>('order');

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [currentFile, setCurrentFile] = useState<{ type: string; content: string } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'month'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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
          if (icsImportMode === 'order') {
            const result = await parseICSToOrders.mutateAsync({ fileContent: base64 });
            setPreviewData(result.orders);
            setPreviewOpen(true);
            toast.success(`成功解析 ${result.recordCount} 个订单`);
          } else {
            const result = await parseICS.mutateAsync({ fileContent: base64 });
            setPreviewData(result.events);
            setPreviewOpen(true);
            toast.success(`成功解析 ${result.recordCount} 个事件`);
          }
        }
      } catch (error: any) {
        console.error("File parse error:", error);
        let errorMsg = "文件解析失败";
        if (error.message) {
          errorMsg = error.message;
        } else if (error.data?.message) {
          errorMsg = error.data.message;
        } else if (typeof error === "string") {
          errorMsg = error;
        }
        // 特殊处理网络错误
        if (error.name === "TypeError" && error.message.includes("fetch")) {
          errorMsg = "网络请求失败,请检查网络连接或稍后重试";
        }
        toast.error(errorMsg);
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
        if (icsImportMode === 'order') {
          result = await importICSToOrders.mutateAsync({ fileContent: currentFile.content });
        } else {
          result = await importICS.mutateAsync({ fileContent: currentFile.content });
        }
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
      console.error("Import error:", error);
      let errorMsg = "导入失败";
      if (error.message) {
        errorMsg = error.message;
      } else if (error.data?.message) {
        errorMsg = error.data.message;
      } else if (typeof error === "string") {
        errorMsg = error;
      }
      // 特殊处理网络错误
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        errorMsg = "网络请求失败,请检查网络连接或文件大小是否过大";
      }
      toast.error(errorMsg);
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
          <Card className="glass-card cursor-pointer hover:border-primary transition-colors">
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

          <Card className="glass-card cursor-pointer hover:border-primary transition-colors">
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

          <Card className="glass-card cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">ICS文件</CardTitle>
              </div>
              <CardDescription>
                {icsImportMode === 'order' ? '导入为订单（默认）' : '导入为排课'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant={icsImportMode === 'order' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setIcsImportMode('order')}
                >
                  订单模式
                </Button>
                <Button
                  variant={icsImportMode === 'schedule' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setIcsImportMode('schedule')}
                >
                  排课模式
                </Button>
              </div>
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
                disabled={parseICS.isPending || parseICSToOrders.isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                {(parseICS.isPending || parseICSToOrders.isPending) ? "解析中..." : "上传ICS"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 课程日程看板 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>课程日程看板</CardTitle>
                <CardDescription>已导入的课程安排</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4 mr-1" />
                  列表视图
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                >
                  <CalendarDays className="h-4 w-4 mr-1" />
                  日历视图
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                >
                  <CalendarRange className="h-4 w-4 mr-1" />
                  月度日历
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {schedules && schedules.length > 0 ? (
                <>
                  <div className="text-sm text-muted-foreground">
                    共有 {schedules.length} 节课安排
                  </div>
                  {viewMode === 'list' ? (
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>上课日期</TableHead>
                          <TableHead>上课时间</TableHead>
                          <TableHead>课程名称</TableHead>
                          <TableHead>交付老师</TableHead>
                          <TableHead>交付教室</TableHead>
                          <TableHead>客户名</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedules
                          .sort((a, b) => {
                            const dateA = new Date(a.classDate || '');
                            const dateB = new Date(b.classDate || '');
                            return dateB.getTime() - dateA.getTime();
                          })
                          .map((schedule) => (
                            <TableRow key={schedule.id}>
                              <TableCell className="font-medium">
                                {schedule.classDate ? new Date(schedule.classDate).toLocaleDateString() : '-'}
                              </TableCell>
                              <TableCell>{schedule.classTime || '-'}</TableCell>
                              <TableCell>{schedule.deliveryCourse || '-'}</TableCell>
                              <TableCell>{schedule.deliveryTeacher || '-'}</TableCell>
                              <TableCell>{schedule.deliveryClassroom || '-'}</TableCell>
                              <TableCell>{schedule.customerName || '-'}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                  ) : viewMode === 'calendar' ? (
                    <div className="space-y-4">
                      {/* 简单的按日期分组展示 */}
                      {Object.entries(
                        schedules.reduce((acc, schedule) => {
                          const date = schedule.classDate ? new Date(schedule.classDate).toLocaleDateString() : '未设置日期';
                          if (!acc[date]) acc[date] = [];
                          acc[date].push(schedule);
                          return acc;
                        }, {} as Record<string, typeof schedules>)
                      )
                        .sort(([dateA], [dateB]) => {
                          if (dateA === '未设置日期') return 1;
                          if (dateB === '未设置日期') return -1;
                          return new Date(dateB).getTime() - new Date(dateA).getTime();
                        })
                        .map(([date, daySchedules]) => (
                          <div key={date} className="border rounded-lg p-4">
                            <h3 className="font-semibold text-lg mb-3">{date}</h3>
                            <div className="space-y-2">
                              {daySchedules.map((schedule) => (
                                <div
                                  key={schedule.id}
                                  className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                                >
                                  <div className="flex-1">
                                    <div className="font-medium">{schedule.deliveryCourse || '未命名课程'}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {schedule.classTime || '-'} | {schedule.deliveryTeacher || '-'} | {schedule.deliveryClassroom || '-'}
                                    </div>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {schedule.customerName || '-'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    // 月度日历视图
                    <div className="space-y-4">
                      {/* 月份导航 */}
                      <div className="flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newMonth = new Date(currentMonth);
                            newMonth.setMonth(newMonth.getMonth() - 1);
                            setCurrentMonth(newMonth);
                          }}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-lg font-semibold">
                          {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newMonth = new Date(currentMonth);
                            newMonth.setMonth(newMonth.getMonth() + 1);
                            setCurrentMonth(newMonth);
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* 日历网格 */}
                      <div className="border rounded-lg overflow-hidden">
                        {/* 星期标题 */}
                        <div className="grid grid-cols-7 bg-muted">
                          {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
                            <div key={day} className="p-2 text-center text-sm font-medium border-r last:border-r-0">
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* 日期网格 */}
                        <div className="grid grid-cols-7">
                          {(() => {
                            const year = currentMonth.getFullYear();
                            const month = currentMonth.getMonth();
                            const firstDay = new Date(year, month, 1).getDay();
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            const today = new Date();
                            const cells = [];

                            // 填充空白单元格
                            for (let i = 0; i < firstDay; i++) {
                              cells.push(
                                <div key={`empty-${i}`} className="min-h-[100px] p-2 border-r border-b bg-muted/30" />
                              );
                            }

                            // 填充日期单元格
                            for (let day = 1; day <= daysInMonth; day++) {
                              const currentDate = new Date(year, month, day);
                              const dateStr = currentDate.toLocaleDateString();
                              const isToday = 
                                currentDate.getDate() === today.getDate() &&
                                currentDate.getMonth() === today.getMonth() &&
                                currentDate.getFullYear() === today.getFullYear();

                              // 获取当天的课程
                              const daySchedules = schedules.filter((schedule) => {
                                if (!schedule.classDate) return false;
                                const scheduleDate = new Date(schedule.classDate);
                                return scheduleDate.toLocaleDateString() === dateStr;
                              });

                              cells.push(
                                <div
                                  key={day}
                                  className={`min-h-[100px] p-2 border-r border-b ${
                                    isToday ? 'bg-primary/5 border-primary' : ''
                                  }`}
                                >
                                  <div className={`text-sm font-medium mb-1 ${
                                    isToday ? 'text-primary' : ''
                                  }`}>
                                    {day}
                                  </div>
                                  {daySchedules.length > 0 && (
                                    <div className="space-y-1">
                                      {daySchedules.slice(0, 3).map((schedule) => (
                                        <div
                                          key={schedule.id}
                                          className="text-xs p-1 bg-blue-100 dark:bg-blue-900/30 rounded truncate"
                                          title={`${schedule.classTime} ${schedule.deliveryCourse} - ${schedule.customerName}`}
                                        >
                                          <div className="font-medium truncate">
                                            {schedule.classTime?.split('-')[0]} {schedule.customerName}
                                          </div>
                                        </div>
                                      ))}
                                      {daySchedules.length > 3 && (
                                        <div className="text-xs text-muted-foreground">
                                          +{daySchedules.length - 3} 更多
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            return cells;
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  暂无课程安排，请先导入ICS文件
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 月度合伙人费用统计 */}
        <MonthlyPartnerSettlement />

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
