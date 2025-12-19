import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, CheckCircle2, XCircle, AlertCircle, Eye, Trash2, RefreshCw, Download, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function GmailImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);


  // 获取导入历史
  const { data: historyData, refetch: refetchHistory } = trpc.gmailAutoImport.getImportHistory.useQuery();
  
  // 获取统计数据
  const { data: stats, refetch: refetchStats } = trpc.gmailAutoImport.getImportStats.useQuery();

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

  // 手动触发导入
  const handleManualImport = async () => {
    setIsImporting(true);
    try {
      toast.info("提示", { 
        description: "手动导入功能需要在服务器端配置。请使用: node scripts/gmail-auto-import.mjs" 
      });
    } catch (error) {
      console.error("导入失败:", error);
    } finally {
      setIsImporting(false);
      refetchHistory();
    }
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

  // 确认删除
  const confirmDelete = () => {
    if (selectedLog) {
      deleteLogMutation.mutate({ id: selectedLog.id });
    }
  };

  // 清空所有
  const handleClearAll = () => {
    setShowClearAllDialog(true);
  };

  // 确认清空
  const confirmClearAll = () => {
    clearAllMutation.mutate();
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
      "导入时间": format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss", { locale: zhCN }),
      "邮件主题": log.emailSubject,
      "邮件日期": format(new Date(log.emailDate), "yyyy-MM-dd HH:mm:ss", { locale: zhCN }),
      "总订单数": log.totalOrders,
      "成功录入": log.successOrders,
      "录入失败": log.failedOrders,
      "成功率": log.totalOrders > 0 ? `${((log.successOrders / log.totalOrders) * 100).toFixed(2)}%` : "0%",
      "状态": log.status === "success" ? "成功" : log.status === "partial" ? "部分成功" : "失败",
      "错误信息": log.errorLog || "",
    }));

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gmail导入记录");

    // 添加统计数据工作表
    if (stats) {
      const statsData = [
        { "指标": "总导入次数", "数值": stats.totalImports },
        { "指标": "总订单数", "数值": stats.totalOrders },
        { "指标": "成功录入", "数值": stats.successOrders },
        { "指标": "录入失败", "数值": stats.failedOrders },
        { "指标": "成功率", "数值": `${stats.successRate}%` },
      ];
      const statsWs = XLSX.utils.json_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, statsWs, "统计数据");
    }

    // 下载文件
    const fileName = `Gmail导入记录_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast.success("导出成功", { description: `已保存为 ${fileName}` });
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
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gmail订单导入</h1>
            <p className="text-muted-foreground mt-2">
              自动从Gmail读取"打款群"邮件并解析订单信息
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              导出报表
            </Button>
            {historyData?.logs && historyData.logs.length > 0 && (
              <Button onClick={handleClearAll} variant="outline">
                <Trash2 className="w-4 h-4 mr-2" />
                清空全部
              </Button>
            )}
            <Button onClick={handleManualImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  导入中...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  手动触发导入
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                总导入次数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalImports || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                总订单数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                成功录入
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.successOrders || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                成功率
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.successRate ? `${stats.successRate}%` : "0%"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 导入历史列表 */}
        <Card>
          <CardHeader>
            <CardTitle>导入历史</CardTitle>
            <CardDescription>查看所有Gmail邮件导入记录</CardDescription>
          </CardHeader>
          <CardContent>
            {!historyData?.logs || historyData.logs.length === 0 ? (
              <Alert>
                <AlertDescription>暂无导入记录</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {historyData.logs.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{log.emailSubject}</span>
                        {getStatusBadge(log.status)}
                        {log.emailSubject.includes("重新解析") && (
                          <Badge variant="outline" className="text-blue-600">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            已重新解析
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        导入时间: {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss", { locale: zhCN })}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">订单数: </span>
                        <span className="font-medium">{log.totalOrders}</span>
                        <span className="text-muted-foreground ml-4">成功: </span>
                        <span className="text-green-600 font-medium">{log.successOrders}</span>
                        {log.failedOrders > 0 && (
                          <>
                            <span className="text-muted-foreground ml-4">失败: </span>
                            <span className="text-red-600 font-medium">{log.failedOrders}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetail(log)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        查看详情
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(log)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 详情对话框 */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>导入记录详情</DialogTitle>
              <DialogDescription>
                {selectedLog?.emailSubject}
              </DialogDescription>
            </DialogHeader>
            
            {selectedLog && (
              <div className="space-y-4">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">邮件主题</div>
                    <div className="font-medium">{selectedLog.emailSubject}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">邮件日期</div>
                    <div className="font-medium">
                      {format(new Date(selectedLog.emailDate), "yyyy-MM-dd HH:mm:ss", { locale: zhCN })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">导入状态</div>
                    <div>{getStatusBadge(selectedLog.status)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">导入时间</div>
                    <div className="font-medium">
                      {format(new Date(selectedLog.createdAt), "yyyy-MM-dd HH:mm:ss", { locale: zhCN })}
                    </div>
                  </div>
                </div>

                {/* 统计信息 */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-accent/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedLog.totalOrders}</div>
                    <div className="text-sm text-muted-foreground">总订单数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{selectedLog.successOrders}</div>
                    <div className="text-sm text-muted-foreground">成功录入</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{selectedLog.failedOrders}</div>
                    <div className="text-sm text-muted-foreground">录入失败</div>
                  </div>
                </div>

                {/* 错误日志 */}
                {selectedLog.errorLog && (
                  <div>
                    <div className="text-sm font-medium mb-2">错误日志</div>
                    <Alert variant="destructive">
                      <AlertDescription className="whitespace-pre-wrap">
                        {selectedLog.errorLog}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* 解析的订单数据 */}
                {selectedLog.parsedData && Array.isArray(selectedLog.parsedData) && (
                  <div>
                    <div className="text-sm font-medium mb-2">解析的订单数据</div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedLog.parsedData.map((order: any, index: number) => (
                        <div key={index} className="p-3 border rounded-lg text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div><span className="text-muted-foreground">销售:</span> {order.salesperson}</div>
                            <div><span className="text-muted-foreground">客户:</span> {order.customerName || "未知"}</div>
                            <div><span className="text-muted-foreground">课程:</span> {order.course}</div>
                            <div><span className="text-muted-foreground">老师:</span> {order.teacher}</div>
                            <div><span className="text-muted-foreground">城市:</span> {order.city}</div>
                            <div><span className="text-muted-foreground">金额:</span> ¥{order.paymentAmount}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 原始邮件内容 */}
                {selectedLog.emailContent && (
                  <div>
                    <div className="text-sm font-medium mb-2">原始邮件内容</div>
                    <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {selectedLog.emailContent}
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex justify-end gap-2">
                  {selectedLog.emailContent && (
                    <Button 
                      onClick={handleReprocess} 
                      disabled={isReprocessing}
                    >
                      {isReprocessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          解析中...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          重新解析
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除这条导入记录吗?此操作不可撤销。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                取消
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                disabled={deleteLogMutation.isPending}
              >
                {deleteLogMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    删除中...
                  </>
                ) : (
                  "确认删除"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 清空全部确认对话框 */}
        <Dialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                警告
              </DialogTitle>
              <DialogDescription>
                确定要清空所有导入记录吗?此操作将删除所有历史数据,不可撤销!
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowClearAllDialog(false)}>
                取消
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmClearAll}
                disabled={clearAllMutation.isPending}
              >
                {clearAllMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    清空中...
                  </>
                ) : (
                  "确认清空"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
