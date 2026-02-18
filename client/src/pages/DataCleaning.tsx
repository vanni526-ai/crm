import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

export default function DataCleaning() {
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);

  // 查询需要清洗的订单
  const {
    data: scanResult,
    isLoading: isScanning,
    refetch: refetchScan,
  } = trpc.dataCleaning.scanOrders.useQuery();

  // 批量清洗订单
  const cleanMutation = trpc.dataCleaning.cleanOrders.useMutation({
    onSuccess: (data) => {
      alert(`数据清洗完成: ${data.message}`);
      setSelectedOrderIds([]);
      refetchScan();
    },
    onError: (error) => {
      alert(`数据清洗失败: ${error.message}`);
    },
  });

  const handleSelectAll = () => {
    if (!scanResult?.orders) return;
    
    if (selectedOrderIds.length === scanResult.orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(scanResult.orders.map((o) => o.id));
    }
  };

  const handleSelectOrder = (orderId: number) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleCleanSelected = () => {
    if (selectedOrderIds.length === 0) {
      alert("请至少选择一个需要清洗的订单");
      return;
    }

    cleanMutation.mutate({ orderIds: selectedOrderIds });
  };

  const handleCleanAll = () => {
    if (!scanResult?.orders || scanResult.orders.length === 0) {
      alert("没有需要清洗的订单");
      return;
    }

    const allOrderIds = scanResult.orders.map((o) => o.id);
    cleanMutation.mutate({ orderIds: allOrderIds });
  };

  if (isScanning) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">数据清洗</h1>
        <p className="text-muted-foreground mt-2">
          扫描并修复历史订单中不符合标准的教室名称
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>扫描结果</CardTitle>
              <CardDescription>
                {scanResult?.total === 0
                  ? "所有订单的教室名称都符合标准"
                  : `发现 ${scanResult?.total || 0} 个订单需要清洗`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchScan()}
                disabled={isScanning}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重新扫描
              </Button>
              {scanResult && scanResult.total > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCleanSelected}
                    disabled={
                      selectedOrderIds.length === 0 || cleanMutation.isPending
                    }
                  >
                    {cleanMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    清洗选中 ({selectedOrderIds.length})
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCleanAll}
                    disabled={cleanMutation.isPending}
                  >
                    {cleanMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    一键清洗全部
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {scanResult && scanResult.total > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedOrderIds.length === scanResult.orders.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>订单号</TableHead>
                    <TableHead>客户姓名</TableHead>
                    <TableHead>上课日期</TableHead>
                    <TableHead>原始城市</TableHead>
                    <TableHead>原始教室</TableHead>
                    <TableHead className="text-center">→</TableHead>
                    <TableHead>标准城市</TableHead>
                    <TableHead>标准教室</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scanResult.orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrderIds.includes(order.id)}
                          onCheckedChange={() => handleSelectOrder(order.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.orderNo}
                      </TableCell>
                      <TableCell>{order.customerName || "-"}</TableCell>
                      <TableCell>
                        {order.classDate
                          ? new Date(order.classDate).toLocaleDateString(
                              "zh-CN"
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {order.originalCity || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{order.originalRoom}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <AlertCircle className="w-4 h-4 text-orange-500 mx-auto" />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50">
                          {order.standardizedCity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-50">
                          {order.standardizedRoom}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">所有订单数据都符合标准</p>
              <p className="text-sm mt-2">无需进行数据清洗</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
