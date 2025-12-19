import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Mail, CheckCircle2, XCircle, AlertCircle, Eye, Trash2, RefreshCw, Download, AlertTriangle, Settings } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Checkbox } from "@/components/ui/checkbox";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Link } from "wouter";

export default function GmailImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [emailContent, setEmailContent] = useState("");

  // 获取导入历史
  const { data: historyData, refetch: refetchHistory } = trpc.gmailAutoImport.getImportHistory.useQuery();
  
  // 获取统计数据
  const { data: statsData, refetch: refetchStats } = trpc.gmailAutoImport.getImportStats.useQuery();

  // 获取失败原因统计
  const { data: failureStats } = trpc.gmailAutoImport.getFailureStats.useQuery();

  // 删除单条记录
  const deleteLogMutation = trpc.gmailAutoImport.deleteImportLog.useMutation({
    onSuccess: () => {
      toast.success("删除成功");
      refetchHistory();
      refetchStats();
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast.error("删除失败", { description: error.message });
    },
  });

  // 批量删除记录
  const batchDeleteMutation = trpc.gmailAutoImport.batchDeleteImportLogs.useMutation({
    onSuccess: (data) => {
      toast.success(`成功删除${data.deletedCount}条记录`);
      refetchHistory();
      refetchStats();
      setSelectedIds([]);
    },
    onError: (error) => {
      toast.error("批量删除失败", { description: error.message });
    },
  });

  // 清空所有记录
  const clearAllMutation = trpc.gmailAutoImport.deleteAllImportLogs.useMutation({
    onSuccess: () => {
      toast.success("已清空所有记录");
      refetchHistory();
      refetchStats();
      setShowClearAllDialog(false);
    },
    onError: (error) => {
      toast.error("清空失败", { description: error.message });
    },
  });

  // 重新解析
  const reprocessMutation = trpc.gmailAutoImport.reprocessEmail.useMutation({
    onSuccess: (data) => {
      toast.success("重新解析完成", { 
        description: `成功: ${data.successCount}, 失败: ${data.failCount}` 
      });
      refetchHistory();
      refetchStats();
      setShowDetailDialog(false);
      setIsReprocessing(false);
    },
    onError: (error) => {
      toast.error("重新解析失败", { description: error.message });
      setIsReprocessing(false);
    },
  });

  // 手动导入(粘贴内容)
  const pasteImportMutation = trpc.gmailAutoImport.pasteImport.useMutation({
    onSuccess: (data: any) => {
      toast.success("导入完成", { 
        description: `成功导入${data.successCount}个订单, 跳过${data.skippedCount}个重复订单` 
      });
      refetchHistory();
      refetchStats();
      setIsImporting(false);
      setShowPasteDialog(false);
      setEmailContent("");
    },
    onError: (error: any) => {
      toast.error("导入失败", { description: error.message });
      setIsImporting(false);
    },
  });

  // 手动导入处理函数
  const handleManualImport = () => {
    setShowPasteDialog(true);
  };

  // 提交粘贴内容
  const handlePasteSubmit = () => {
    if (!emailContent.trim()) {
      toast.error("请粘贴邮件内容");
      return;
    }
    setIsImporting(true);
    pasteImportMutation.mutate({ emailContent });
  };

  // 查看详情
  const handleViewDetail = (log: any) => {
    setSelectedLog(log);
    setShowDetailDialog(true);
  };

  // 删除记录
  const handleDelete = (log: any) => {
    setSelectedLog(log);
    setShowDeleteDialog(true);
  };

  // 重新解析
  const handleReprocess = () => {
    if (selectedLog && selectedLog.emailContent) {
      setIsReprocessing(true);
      reprocessMutation.mutate({
        logId: selectedLog.id,
        emailContent: selectedLog.emailContent,
      });
    } else {
      toast.error("无法重新解析", { description: "邮件内容不存在" });
    }
  };

  // 导出Excel报表
  const handleExport = () => {
    if (!historyData?.logs || historyData.logs.length === 0) {
      toast.error("无数据可导出");
      return;
    }

    // 准备导出数据
    const exportData = historyData.logs.map((log: any) => ({
      "邮件主题": log.emailSubject,
      "邮件日期": format(new Date(log.emailDate), "yyyy-MM-dd HH:mm", { locale: zhCN }),
      "订单总数": log.totalOrders,
      "成功数": log.successOrders,
      "失败数": log.failedOrders,
      "状态": log.status === "success" ? "成功" : log.status === "partial" ? "部分成功" : "失败",
      "导入时间": format(new Date(log.createdAt), "yyyy-MM-dd HH:mm", { locale: zhCN }),
    }));

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws1, "导入历史");

    // 添加统计数据表
    if (statsData) {
      const statsExport = [
        { "指标": "总导入次数", "数值": statsData.totalImports },
        { "指标": "总订单数", "数值": statsData.totalOrders },
        { "指标": "成功订单数", "数值": statsData.successOrders },
        { "指标": "失败订单数", "数值": statsData.failedOrders },
      ];
      const ws2 = XLSX.utils.json_to_sheet(statsExport);
      XLSX.utils.book_append_sheet(wb, ws2, "统计数据");
    }

    // 下载文件
    const fileName = `Gmail导入记录_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast.success("导出成功", { description: `已保存为 ${fileName}` });
  };

  // 批量选择
  const handleSelectAll = (checked: boolean) => {
    if (checked && historyData?.logs) {
      setSelectedIds(historyData.logs.map((log: any) => log.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedIds.length === 0) {
      toast.error("请先选择要删除的记录");
      return;
    }
    batchDeleteMutation.mutate({ ids: selectedIds });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />成功</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500"><AlertCircle className="w-3 h-3 mr-1" />部分成功</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />失败</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 失败原因图表数据
  const failureChartData = failureStats?.failureReasons 
    ? Object.entries(failureStats.failureReasons).map(([name, value]) => ({ name, value }))
    : [];

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题和操作按钮 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gmail导入管理</h1>
            <p className="text-muted-foreground mt-1">自动从Gmail读取订单信息并导入系统</p>
          </div>
          <div className="flex gap-2">
            <Link href="/gmail-import/config">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                配置规则
              </Button>
            </Link>
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              导出报表
            </Button>
            <Button onClick={handleManualImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  导入中...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  手动导入
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 手动导入说明 */}
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <AlertCircle className="w-5 h-5" />
              导入说明
            </CardTitle>
          </CardHeader>
          <CardContent className="text-green-800 space-y-3">
            <div>
              <h4 className="font-semibold mb-2">如何导入订单？</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>打开Gmail，找到包含“打款群”的邮件</li>
                <li>复制邮件正文内容</li>
                <li>点击上方的<strong>“手动导入”</strong>按钮</li>
                <li>将复制的内容粘贴到对话框中</li>
                <li>点击“开始导入”，系统会自动解析并创建订单</li>
              </ol>
            </div>
            
            <div className="bg-white p-3 rounded-md border">
              <p className="text-sm">
                <strong>提示：</strong>系统会自动识别邮件中的订单信息（客户名、上课时间、金额等），无需手动填写。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 邮件格式说明 */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              邮件格式说明
            </CardTitle>
            <CardDescription>
              为了提高解析准确率，请按照以下格式发送邮件
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">标准格式示例：</h4>
              <div className="bg-white p-4 rounded-md border font-mono text-sm space-y-2">
                <div className="text-muted-foreground">—————  2025-12-17  —————</div>
                <div className="text-blue-600">瀑姬喵喵11:00-20:00  17:34</div>
                <div>昭昭 12.17 20:30-21:30 sp课 云云上(无锡单)全款1500已付 无锡教室第三次使用</div>
                <div className="text-blue-600 mt-3">瀑姬小领16:00-23:00  19:09</div>
                <div>嘅嘅 12.17 18:00-20:00  裸足丝袜+埃及艳后  皮皮上(济南)  ，韩开银1600定金已付   1600尾款已付➕报销老师200车费 (济南教室第二次使用)</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">关键字段说明：</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <span className="text-blue-600 font-medium">设备微信号</span>：发送消息的微信账号（如“瀑姬喵喵11:00-20:00”）</li>
                <li>• <span className="font-medium">销售人员</span>：订单信息第一个词（如“昭昭”、“嘅嘅”）</li>
                <li>• <span className="font-medium">日期时间</span>：格式为 MM.DD HH:MM-HH:MM（如“12.17 20:30-21:30”）</li>
                <li>• <span className="font-medium">课程名称</span>：课程内容（如“sp课”、“裸足丝袜+埃及艳后”）</li>
                <li>• <span className="font-medium">老师名称</span>：格式为“XX上”（如“云云上”、“皮皮上”）</li>
                <li>• <span className="font-medium">城市信息</span>：括号中的城市（如“(无锡单)”、“(济南)”）</li>
                <li>• <span className="font-medium">支付金额</span>：全款/定金/尾款格式（如“全款1500已付”、“1600定金已付 1600尾款已付”）</li>
                <li>• <span className="font-medium">客户名</span>：可选，通常在金额信息中（如“韩开银1600定金已付”）</li>
                <li>• <span className="font-medium">车费</span>：可选，格式为“报销老师XX车费”</li>
              </ul>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                <strong>提示：</strong>您可以在<Link href="/gmail-import/config" className="underline">配置页面</Link>设置城市区号、销售人员别名等规则，提高解析准确率。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">总导入次数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData?.totalImports || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                总订单数: {statsData?.totalOrders || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">总订单数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData?.totalOrders || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                成功 {statsData?.successOrders || 0} / 失败 {statsData?.failedOrders || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">成功率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData?.totalOrders 
                  ? ((statsData.successOrders / statsData.totalOrders) * 100).toFixed(1) 
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">基于订单数统计</p>
            </CardContent>
          </Card>
        </div>

        {/* 失败原因分析 */}
        {failureStats && failureStats.totalFailed > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                失败原因分析
              </CardTitle>
              <CardDescription>共 {failureStats.totalFailed} 次导入失败</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={failureChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {failureChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 导入历史列表 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>导入历史</CardTitle>
                <CardDescription>查看所有Gmail导入记录</CardDescription>
              </div>
              <div className="flex gap-2">
                {selectedIds.length > 0 && (
                  <>
                    <Badge variant="secondary">{selectedIds.length} 条已选择</Badge>
                    <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      批量删除
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowClearAllDialog(true)}>
                  清空全部
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === historyData?.logs?.length && historyData?.logs?.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>邮件主题</TableHead>
                  <TableHead>邮件日期</TableHead>
                  <TableHead>订单数</TableHead>
                  <TableHead>成功/失败</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>导入时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyData?.logs && historyData.logs.length > 0 ? (
                  historyData.logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(log.id)}
                          onCheckedChange={(checked) => handleSelectOne(log.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{log.emailSubject}</TableCell>
                      <TableCell>{format(new Date(log.emailDate), "yyyy-MM-dd HH:mm", { locale: zhCN })}</TableCell>
                      <TableCell>{log.totalOrders}</TableCell>
                      <TableCell>
                        <span className="text-green-600">{log.successOrders}</span> / 
                        <span className="text-red-600 ml-1">{log.failedOrders}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{format(new Date(log.createdAt), "yyyy-MM-dd HH:mm", { locale: zhCN })}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetail(log)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(log)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      暂无导入记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 详情对话框 */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>导入详情</DialogTitle>
              <DialogDescription>
                {selectedLog?.emailSubject} - {selectedLog && format(new Date(selectedLog.emailDate), "yyyy-MM-dd HH:mm", { locale: zhCN })}
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">订单总数</p>
                    <p className="text-2xl font-bold">{selectedLog.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">成功/失败</p>
                    <p className="text-2xl font-bold">
                      <span className="text-green-600">{selectedLog.successOrders}</span> / 
                      <span className="text-red-600">{selectedLog.failedOrders}</span>
                    </p>
                  </div>
                </div>

                {selectedLog.parsedData && selectedLog.parsedData.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">解析数据</p>
                    <div className="bg-muted p-4 rounded-md max-h-64 overflow-y-auto">
                      <pre className="text-xs">{JSON.stringify(selectedLog.parsedData, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {selectedLog.errorLog && (
                  <div>
                    <p className="text-sm font-medium mb-2 text-red-600">错误日志</p>
                    <div className="bg-red-50 p-4 rounded-md max-h-64 overflow-y-auto">
                      <pre className="text-xs text-red-800">{selectedLog.errorLog}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>关闭</Button>
              {selectedLog?.emailContent && (
                <Button onClick={handleReprocess} disabled={isReprocessing}>
                  {isReprocessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  重新解析
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除这条导入记录吗?此操作不可恢复。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>取消</Button>
              <Button variant="destructive" onClick={() => selectedLog && deleteLogMutation.mutate({ id: selectedLog.id })}>
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 清空全部确认对话框 */}
        <Dialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认清空</DialogTitle>
              <DialogDescription>
                确定要清空所有导入记录吗?此操作不可恢复。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowClearAllDialog(false)}>取消</Button>
              <Button variant="destructive" onClick={() => clearAllMutation.mutate()}>
                清空全部
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 粘贴邮件内容对话框 */}
        <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>粘贴Gmail邮件内容</DialogTitle>
              <DialogDescription>
                请打开Gmail,找到包含"打款群"的邮件,复制邮件内容并粘贴到下方文本框中
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <textarea
                className="w-full h-96 p-4 border rounded-md font-mono text-sm"
                placeholder="请粘贴邮件内容..."
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
              />
              <div className="text-sm text-muted-foreground">
                <p>提示：系统会自动识别邮件中的订单信息，包括：</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>设备微信号：如"澎姬咕咕"、"澎姬小领"</li>
                  <li>日期时间：格式为MM.DD HH:MM-HH:MM</li>
                  <li>课程名称：如"sp课"、"sp红色上衣红色下装"</li>
                  <li>金额信息：包含"元已付"的数字</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasteDialog(false)}>
                取消
              </Button>
              <Button onClick={handlePasteSubmit} disabled={isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    导入中...
                  </>
                ) : (
                  "开始导入"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
