import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, CheckCircle2, XCircle, AlertCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function GmailImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // 获取导入历史
  const { data: historyData, refetch: refetchHistory } = trpc.gmailAutoImport.getImportHistory.useQuery();
  
  // 获取统计数据
  const { data: stats } = trpc.gmailAutoImport.getImportStats.useQuery();

  // 手动触发导入
  const handleManualImport = async () => {
    setIsImporting(true);
    try {
      // 这里调用后端脚本或API触发导入
      alert("手动导入功能需要在服务器端配置。请使用: node scripts/gmail-auto-import.mjs");
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
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gmail订单导入</h1>
          <p className="text-muted-foreground mt-2">
            自动从Gmail读取"打款群"邮件并解析订单信息
          </p>
        </div>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetail(log)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    查看详情
                  </Button>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
