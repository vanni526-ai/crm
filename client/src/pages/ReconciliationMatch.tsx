import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ReconciliationMatch() {
  const [isMatching, setIsMatching] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // 查询数据
  const { data: matches, isLoading: matchesLoading, refetch: refetchMatches } = trpc.reconciliation.getAllMatches.useQuery();
  const { data: unmatchedSchedules, isLoading: schedulesLoading, refetch: refetchSchedules } = trpc.reconciliation.getUnmatchedSchedules.useQuery();
  const { data: unmatchedOrders, isLoading: ordersLoading, refetch: refetchOrders } = trpc.reconciliation.getUnmatchedOrders.useQuery();

  // Mutations
  const intelligentMatch = trpc.reconciliation.intelligentMatch.useMutation({
    onSuccess: (data) => {
      toast.success("智能匹配完成", {
        description: data.message,
      });
      refetchMatches();
      refetchSchedules();
      refetchOrders();
    },
    onError: (error) => {
      toast.error("匹配失败", {
        description: error.message,
      });
    },
  });

  const deleteMatch = trpc.reconciliation.deleteMatch.useMutation({
    onSuccess: () => {
      toast.success("删除成功", {
        description: "匹配关系已删除",
      });
      setShowDeleteDialog(false);
      setSelectedMatch(null);
      refetchMatches();
      refetchSchedules();
      refetchOrders();
    },
    onError: (error) => {
      toast.error("删除失败", {
        description: error.message,
      });
    },
  });

  const updateMatch = trpc.reconciliation.updateMatch.useMutation({
    onSuccess: () => {
      toast.success("更新成功", {
        description: "匹配关系已验证",
      });
      refetchMatches();
    },
    onError: (error) => {
      toast.error("更新失败", {
        description: error.message,
      });
    },
  });

  const handleIntelligentMatch = async () => {
    setIsMatching(true);
    try {
      await intelligentMatch.mutateAsync({});
    } finally {
      setIsMatching(false);
    }
  };

  const handleDeleteMatch = (match: any) => {
    setSelectedMatch(match);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedMatch) {
      deleteMatch.mutate({ matchId: selectedMatch.match.id });
    }
  };

  const handleVerifyMatch = (matchId: number) => {
    updateMatch.mutate({ matchId, isVerified: true });
  };

  const getConfidenceBadge = (confidence: string | null) => {
    if (!confidence) return <Badge variant="secondary">未知</Badge>;
    const conf = parseFloat(confidence);
    if (conf >= 90) return <Badge className="bg-green-600">高 ({conf}%)</Badge>;
    if (conf >= 70) return <Badge className="bg-yellow-600">中 ({conf}%)</Badge>;
    return <Badge className="bg-orange-600">低 ({conf}%)</Badge>;
  };

  const getMethodBadge = (method: string) => {
    const labels: Record<string, string> = {
      llm_intelligent: "智能匹配",
      manual: "手动匹配",
      channel_order_no: "订单号匹配",
    };
    return <Badge variant="outline">{labels[method] || method}</Badge>;
  };

  if (matchesLoading || schedulesLoading || ordersLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">财务对账匹配</h1>
            <p className="text-muted-foreground mt-1">
              智能匹配课程日程与订单,生成对账报表
            </p>
          </div>
          <Button
            onClick={handleIntelligentMatch}
            disabled={isMatching || (unmatchedSchedules?.length === 0 && unmatchedOrders?.length === 0)}
          >
            {isMatching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                匹配中...
              </>
            ) : (
              "开始智能匹配"
            )}
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                已匹配
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold">{matches?.length || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                未匹配课程
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-2xl font-bold">{unmatchedSchedules?.length || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                未匹配订单
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-2xl font-bold">{unmatchedOrders?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 已匹配列表 */}
        <Card>
          <CardHeader>
            <CardTitle>已匹配记录</CardTitle>
            <CardDescription>
              显示已成功匹配的课程日程和订单
            </CardDescription>
          </CardHeader>
          <CardContent>
            {matches && matches.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>课程信息</TableHead>
                    <TableHead>订单信息</TableHead>
                    <TableHead>匹配方式</TableHead>
                    <TableHead>置信度</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((item) => (
                    <TableRow key={item.match.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{item.schedule?.customerName}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.schedule?.deliveryTeacher} · {item.schedule?.deliveryCourse}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.schedule?.classDate?.toISOString().split('T')[0]} {item.schedule?.classTime}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{item.order?.orderNo}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.order?.customerName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ¥{item.order?.courseAmount}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getMethodBadge(item.match.matchMethod)}</TableCell>
                      <TableCell>{getConfidenceBadge(item.match.confidence)}</TableCell>
                      <TableCell>
                        {item.match.isVerified ? (
                          <Badge className="bg-green-600">已验证</Badge>
                        ) : (
                          <Badge variant="secondary">待验证</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!item.match.isVerified && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerifyMatch(item.match.id)}
                            >
                              验证
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteMatch(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无匹配记录,点击"开始智能匹配"进行自动匹配
              </div>
            )}
          </CardContent>
        </Card>

        {/* 未匹配课程 */}
        <Card>
          <CardHeader>
            <CardTitle>未匹配课程日程</CardTitle>
            <CardDescription>
              这些课程日程尚未找到对应的订单
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unmatchedSchedules && unmatchedSchedules.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>客户名</TableHead>
                    <TableHead>老师</TableHead>
                    <TableHead>课程</TableHead>
                    <TableHead>日期时间</TableHead>
                    <TableHead>金额</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unmatchedSchedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>{schedule.customerName}</TableCell>
                      <TableCell>{schedule.deliveryTeacher}</TableCell>
                      <TableCell>{schedule.deliveryCourse}</TableCell>
                      <TableCell>
                        {schedule.classDate?.toISOString().split('T')[0]} {schedule.classTime}
                      </TableCell>
                      <TableCell>¥{schedule.courseAmount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                所有课程日程均已匹配
              </div>
            )}
          </CardContent>
        </Card>

        {/* 未匹配订单 */}
        <Card>
          <CardHeader>
            <CardTitle>未匹配订单</CardTitle>
            <CardDescription>
              这些订单尚未找到对应的课程日程
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unmatchedOrders && unmatchedOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>客户名</TableHead>
                    <TableHead>老师</TableHead>
                    <TableHead>课程</TableHead>
                    <TableHead>日期时间</TableHead>
                    <TableHead>金额</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unmatchedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.orderNo}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{order.deliveryTeacher}</TableCell>
                      <TableCell>{order.deliveryCourse}</TableCell>
                      <TableCell>
                        {order.classDate?.toISOString().split('T')[0]} {order.classTime}
                      </TableCell>
                      <TableCell>¥{order.courseAmount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                所有订单均已匹配
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这条匹配关系吗?删除后可以重新进行匹配。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
