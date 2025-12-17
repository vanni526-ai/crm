import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function Orders() {
  const { data: orders, isLoading, refetch } = trpc.orders.list.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();
  const createOrder = trpc.orders.create.useMutation();
  
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    orderNo: "",
    customerId: "",
    paymentAmount: "",
    courseAmount: "",
    paymentChannel: "",
    deliveryCourse: "",
    deliveryCity: "",
    deliveryRoom: "",
    deliveryTeacher: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createOrder.mutateAsync({
        ...formData,
        customerId: parseInt(formData.customerId),
      });
      toast.success("订单创建成功");
      setOpen(false);
      refetch();
      setFormData({
        orderNo: "",
        customerId: "",
        paymentAmount: "",
        courseAmount: "",
        paymentChannel: "",
        deliveryCourse: "",
        deliveryCity: "",
        deliveryRoom: "",
        deliveryTeacher: "",
      });
    } catch (error: any) {
      toast.error(error.message || "创建失败");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      paid: "default",
      completed: "secondary",
      cancelled: "destructive",
      refunded: "destructive",
    };
    const labels: Record<string, string> = {
      pending: "待支付",
      paid: "已支付",
      completed: "已完成",
      cancelled: "已取消",
      refunded: "已退款",
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const filteredOrders = orders?.filter((order) => {
    if (!searchTerm) return true;
    return (
      order.orderNo.includes(searchTerm) ||
      order.deliveryCourse?.includes(searchTerm) ||
      order.deliveryTeacher?.includes(searchTerm)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">订单管理</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                新建订单
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>创建新订单</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="orderNo">订单编号*</Label>
                    <Input
                      id="orderNo"
                      value={formData.orderNo}
                      onChange={(e) => setFormData({ ...formData, orderNo: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerId">客户*</Label>
                    <Select
                      value={formData.customerId}
                      onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择客户" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name} ({customer.wechatId || customer.phone})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="paymentAmount">支付金额*</Label>
                    <Input
                      id="paymentAmount"
                      type="number"
                      step="0.01"
                      value={formData.paymentAmount}
                      onChange={(e) => setFormData({ ...formData, paymentAmount: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="courseAmount">课程金额*</Label>
                    <Input
                      id="courseAmount"
                      type="number"
                      step="0.01"
                      value={formData.courseAmount}
                      onChange={(e) => setFormData({ ...formData, courseAmount: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="paymentChannel">支付渠道</Label>
                    <Input
                      id="paymentChannel"
                      value={formData.paymentChannel}
                      onChange={(e) => setFormData({ ...formData, paymentChannel: e.target.value })}
                      placeholder="微信/支付宝/富掌柜"
                    />
                  </div>
                  <div>
                    <Label htmlFor="deliveryCourse">交付课程</Label>
                    <Input
                      id="deliveryCourse"
                      value={formData.deliveryCourse}
                      onChange={(e) => setFormData({ ...formData, deliveryCourse: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="deliveryCity">交付城市</Label>
                    <Input
                      id="deliveryCity"
                      value={formData.deliveryCity}
                      onChange={(e) => setFormData({ ...formData, deliveryCity: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="deliveryRoom">交付教室</Label>
                    <Input
                      id="deliveryRoom"
                      value={formData.deliveryRoom}
                      onChange={(e) => setFormData({ ...formData, deliveryRoom: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="deliveryTeacher">交付老师</Label>
                    <Input
                      id="deliveryTeacher"
                      value={formData.deliveryTeacher}
                      onChange={(e) => setFormData({ ...formData, deliveryTeacher: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit" disabled={createOrder.isPending}>
                    {createOrder.isPending ? "创建中..." : "创建"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索订单编号、课程、老师..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>订单列表</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>订单编号</TableHead>
                      <TableHead>支付金额</TableHead>
                      <TableHead>课程金额</TableHead>
                      <TableHead>支付渠道</TableHead>
                      <TableHead>交付课程</TableHead>
                      <TableHead>交付城市</TableHead>
                      <TableHead>交付老师</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders && filteredOrders.length > 0 ? (
                      filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNo}</TableCell>
                          <TableCell>¥{order.paymentAmount}</TableCell>
                          <TableCell>¥{order.courseAmount}</TableCell>
                          <TableCell>{order.paymentChannel || "-"}</TableCell>
                          <TableCell>{order.deliveryCourse || "-"}</TableCell>
                          <TableCell>{order.deliveryCity || "-"}</TableCell>
                          <TableCell>{order.deliveryTeacher || "-"}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          暂无订单数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
