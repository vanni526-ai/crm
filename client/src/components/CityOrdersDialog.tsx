import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CityOrdersDialogProps {
  cityName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CityOrdersDialog({ cityName, open, onOpenChange }: CityOrdersDialogProps) {
  const { data: orders, isLoading } = trpc.orders.list.useQuery(undefined, {
    enabled: open && !!cityName,
  });

  const cityOrders = orders?.filter((order: any) => order.deliveryCity === cityName) || [];

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return `¥${value.toFixed(2)}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("zh-CN");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cityName} - 订单列表</DialogTitle>
          <DialogDescription>
            共 {cityOrders.length} 个订单
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : cityOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            该城市暂无订单记录
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>订单号</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>课程</TableHead>
                <TableHead>老师</TableHead>
                <TableHead>上课日期</TableHead>
                <TableHead className="text-right">课程金额</TableHead>
                <TableHead className="text-right">支付金额</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cityOrders.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNo}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.deliveryCourse || "-"}</TableCell>
                  <TableCell>{order.deliveryTeacher || "-"}</TableCell>
                  <TableCell>{formatDate(order.classDate)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(order.courseAmount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(order.paymentAmount)}</TableCell>
                  <TableCell>
                    <Badge variant={order.orderStatus === "completed" ? "default" : "secondary"}>
                      {order.orderStatus === "completed" ? "已完成" : order.orderStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
