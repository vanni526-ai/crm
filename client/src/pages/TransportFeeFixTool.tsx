import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * 车费修复工具页面
 * 用于检测和修复历史订单中车费识别错误的问题
 */
export default function TransportFeeFixTool() {
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [isFixing, setIsFixing] = useState(false);

  // 查询可能存在问题的订单
  const { data: issueOrders, isLoading, refetch } = trpc.transportFeeFix.detectIssues.useQuery();

  // 批量修复mutation
  const batchFixMutation = trpc.transportFeeFix.batchFix.useMutation({
    onSuccess: (result) => {
      toast.success(`修复完成: 成功${result.success}条, 失败${result.failed}条`);
      if (result.errors.length > 0) {
        console.error("修复错误:", result.errors);
      }
      setSelectedOrderIds([]);
      refetch();
      setIsFixing(false);
    },
    onError: (error) => {
      toast.error(`修复失败: ${error.message}`);
      setIsFixing(false);
    },
  });

  const handleSelectAll = () => {
    if (!issueOrders) return;
    if (selectedOrderIds.length === issueOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(issueOrders.map(order => order.id));
    }
  };

  const handleToggleOrder = (orderId: number) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleBatchFix = async () => {
    if (selectedOrderIds.length === 0) {
      toast.error("请至少选择一条订单");
      return;
    }

    if (!confirm(`确定要修复选中的 ${selectedOrderIds.length} 条订单吗?`)) {
      return;
    }

    setIsFixing(true);
    batchFixMutation.mutate({ orderIds: selectedOrderIds });
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">车费修复工具</h1>
        <p className="text-muted-foreground mt-2">
          检测和修复历史订单中车费识别错误的问题
        </p>
      </div>

      {/* 统计信息 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">检测到的问题</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{issueOrders?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              备注中包含"车费"但未正确识别
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">已选择</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedOrderIds.length}</div>
            <p className="text-xs text-muted-foreground">
              待修复的订单数量
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">修复状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isFixing ? (
                <span className="text-yellow-600">修复中...</span>
              ) : (
                <span className="text-green-600">就绪</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isFixing ? "正在处理订单" : "准备修复"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button
          onClick={handleSelectAll}
          variant="outline"
          disabled={!issueOrders || issueOrders.length === 0}
        >
          {selectedOrderIds.length === issueOrders?.length ? "取消全选" : "全选"}
        </Button>
        <Button
          onClick={handleBatchFix}
          disabled={selectedOrderIds.length === 0 || isFixing}
        >
          {isFixing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              修复中...
            </>
          ) : (
            `批量修复 (${selectedOrderIds.length})`
          )}
        </Button>
        <Button
          onClick={() => refetch()}
          variant="outline"
          disabled={isFixing}
        >
          刷新
        </Button>
      </div>

      {/* 问题订单列表 */}
      {issueOrders && issueOrders.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>问题订单列表</CardTitle>
            <CardDescription>
              以下订单的备注中包含"车费"关键词,但车费字段为空或为0
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {issueOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedOrderIds.includes(order.id)}
                    onCheckedChange={() => handleToggleOrder(order.id)}
                  />
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">订单 #{order.orderNo}</span>
                      {order.isVoided && (
                        <Badge variant="destructive">已作废</Badge>
                      )}
                      <Badge variant="outline">{order.status}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">客户: </span>
                        <span>{order.customerName || "未填写"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">销售: </span>
                        <span>{order.salesPerson || "未填写"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">上课日期: </span>
                        <span>{order.classDate ? new Date(order.classDate).toLocaleDateString() : "未填写"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">老师: </span>
                        <span>{order.deliveryTeacher || "未填写"}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm">
                        <span className="text-muted-foreground">当前老师费用: </span>
                        <span className="font-medium">¥{order.teacherFee || "0.00"}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">当前车费: </span>
                        <span className="font-medium text-red-600">¥{order.transportFee || "0.00"}</span>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="p-2 bg-muted rounded text-sm">
                        <span className="text-muted-foreground">备注: </span>
                        <span>{order.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            未检测到车费识别问题。所有订单的车费字段都已正确填写。
          </AlertDescription>
        </Alert>
      )}

      {/* 说明信息 */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">修复说明:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>系统会从备注中重新提取车费和老师费用信息</li>
              <li>车费识别规则: "报销老师XXX车费" 或 "车费XXX"</li>
              <li>老师费用识别规则: "给老师XXX"</li>
              <li>修复后请检查订单详情,确认数据正确</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
