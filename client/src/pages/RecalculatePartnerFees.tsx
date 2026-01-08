import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function RecalculatePartnerFees() {
  const [result, setResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const recalculateMutation = trpc.orders.recalculateAllPartnerFees.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error("批量重算失败:", error);
      setIsProcessing(false);
    },
  });

  const handleRecalculate = () => {
    if (confirm("确定要批量重算所有订单的合伙人费吗？此操作将更新数据库中的数据。")) {
      setIsProcessing(true);
      setResult(null);
      recalculateMutation.mutate();
    }
  };

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>批量重算合伙人费</CardTitle>
          <CardDescription>
            根据城市配置和订单数据，批量重新计算所有订单的合伙人费用
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>注意：</strong>此操作将会：
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>遍历所有订单，根据城市配置重新计算合伙人费</li>
                <li>当老师费用≥课程金额时，合伙人费将设置为0（不承担亏损）</li>
                <li>自动更新数据库中的合伙人费字段</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleRecalculate}
            disabled={isProcessing}
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在处理...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                开始批量重算
              </>
            )}
          </Button>

          {result && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>重算完成！</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>总订单数: {result.totalOrders}</li>
                    <li>已更新: {result.updatedCount}</li>
                    <li>无需更新: {result.unchangedCount}</li>
                    <li>错误: {result.errorCount}</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {result.updates && result.updates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>详细更新列表</CardTitle>
                    <CardDescription>
                      以下订单的合伙人费已更新
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>订单号</TableHead>
                            <TableHead>客户名</TableHead>
                            <TableHead>城市</TableHead>
                            <TableHead className="text-right">课程金额</TableHead>
                            <TableHead className="text-right">老师费用</TableHead>
                            <TableHead className="text-right">旧合伙人费</TableHead>
                            <TableHead className="text-right">新合伙人费</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.updates.map((update: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-sm">
                                {update.orderNo}
                              </TableCell>
                              <TableCell>{update.customerName || '-'}</TableCell>
                              <TableCell>{update.deliveryCity}</TableCell>
                              <TableCell className="text-right">
                                ¥{update.courseAmount.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                ¥{update.teacherFee.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                ¥{update.oldPartnerFee.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600">
                                ¥{update.newPartnerFee.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
