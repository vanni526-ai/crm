import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, CheckCircle2, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function ChannelOrderNoManagement() {
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [validateFormat, setValidateFormat] = useState(true);
  const [autoIdentifyChannel, setAutoIdentifyChannel] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  // 预览查询
  const previewQuery = trpc.orders.previewBatchFillChannelOrderNo.useQuery(
    { onlyMissing },
    { enabled: showPreview }
  );

  // 批量补全mutation
  const batchFillMutation = trpc.orders.batchFillChannelOrderNo.useMutation({
    onSuccess: (result) => {
      toast.success(
        `批量补全完成!\n成功: ${result.filledOrders}个\n跳过: ${result.skippedOrders}个\n失败: ${result.failedOrders}个`
      );
      setShowPreview(false);
    },
    onError: (error) => {
      toast.error(`批量补全失败: ${error.message}`);
    },
  });

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleExecute = () => {
    if (
      !confirm(
        `确定要批量补全渠道订单号吗?\n\n` +
          `预计处理: ${previewQuery.data?.canFillOrders || 0} 个订单\n` +
          `无法处理: ${previewQuery.data?.cannotFillOrders || 0} 个订单\n` +
          `已有订单号: ${previewQuery.data?.alreadyHasOrders || 0} 个订单`
      )
    ) {
      return;
    }

    batchFillMutation.mutate({
      onlyMissing,
      validateFormat,
      autoIdentifyChannel,
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">渠道订单号管理</h1>
        <p className="text-muted-foreground mt-2">
          批量补全历史订单的渠道订单号,自动从备注中提取并验证格式
        </p>
      </div>

      {/* 配置选项 */}
      <Card>
        <CardHeader>
          <CardTitle>补全选项</CardTitle>
          <CardDescription>配置批量补全的行为</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="onlyMissing"
              checked={onlyMissing}
              onCheckedChange={(checked) => setOnlyMissing(checked as boolean)}
            />
            <Label htmlFor="onlyMissing" className="cursor-pointer">
              只处理缺失渠道订单号的订单
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="validateFormat"
              checked={validateFormat}
              onCheckedChange={(checked) => setValidateFormat(checked as boolean)}
            />
            <Label htmlFor="validateFormat" className="cursor-pointer">
              验证渠道订单号格式(支付宝28位/微信32位/富掌柜20-30位)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoIdentifyChannel"
              checked={autoIdentifyChannel}
              onCheckedChange={(checked) => setAutoIdentifyChannel(checked as boolean)}
            />
            <Label htmlFor="autoIdentifyChannel" className="cursor-pointer">
              自动识别支付渠道(根据订单号格式)
            </Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handlePreview} disabled={previewQuery.isLoading}>
              {previewQuery.isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              预览结果
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 预览结果 */}
      {showPreview && previewQuery.data && (
        <>
          {/* 统计摘要 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  总订单数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{previewQuery.data.totalOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  可补全订单
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {previewQuery.data.canFillOrders}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  无法补全订单
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {previewQuery.data.cannotFillOrders}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  已有订单号
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-500">
                  {previewQuery.data.alreadyHasOrders}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 执行按钮 */}
          {previewQuery.data.canFillOrders > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  找到 <strong>{previewQuery.data.canFillOrders}</strong> 个订单可以补全渠道订单号
                </span>
                <Button
                  onClick={handleExecute}
                  disabled={batchFillMutation.isPending}
                  size="sm"
                >
                  {batchFillMutation.isPending && (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  执行批量补全
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* 预览列表 */}
          <Card>
            <CardHeader>
              <CardTitle>预览详情</CardTitle>
              <CardDescription>
                显示前50条可补全的订单(总共 {previewQuery.data.preview.length} 条)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>订单号</TableHead>
                      <TableHead>客户名</TableHead>
                      <TableHead>当前渠道订单号</TableHead>
                      <TableHead>提取的渠道订单号</TableHead>
                      <TableHead>识别的支付渠道</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewQuery.data.preview.slice(0, 50).map((item) => (
                      <TableRow key={item.orderId}>
                        <TableCell className="font-mono text-sm">{item.orderNo}</TableCell>
                        <TableCell>{item.customerName || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.currentChannelOrderNo || <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.extractedChannelOrderNo || (
                            <span className="text-gray-400">未找到</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.identifiedChannel ? (
                            <Badge variant="outline">{item.identifiedChannel}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.canFill ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              可补全
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              {item.reason}
                            </Badge>
                          )}
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
