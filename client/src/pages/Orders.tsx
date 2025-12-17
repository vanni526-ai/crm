import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Eye, Edit, Trash2, Download } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const orderSchema = z.object({
  orderNo: z.string().min(1, "订单号不能为空"),
  customerId: z.number().min(1, "请选择客户"),
  paymentAmount: z.string().min(1, "支付金额不能为空"),
  courseAmount: z.string().min(1, "课程金额不能为空"),
  paymentChannel: z.string().optional(),
  deliveryCourse: z.string().optional(),
  deliveryCity: z.string().optional(),
  deliveryRoom: z.string().optional(),
  deliveryTeacher: z.string().optional(),
  teacherFee: z.string().optional(),
  transportFee: z.string().optional(),
  partnerFee: z.string().optional(),
  otherFee: z.string().optional(),
  notes: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

export default function Orders() {
  const utils = trpc.useUtils();
  const { data: orders, isLoading } = trpc.orders.list.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();
  const { data: users } = trpc.users.list.useQuery();
  
  const createOrder = trpc.orders.create.useMutation({
    onSuccess: () => {
      utils.orders.list.invalidate();
      toast.success("订单创建成功");
      setCreateOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.message || "创建失败");
    },
  });

  const updateOrder = trpc.orders.update.useMutation({
    onSuccess: () => {
      utils.orders.list.invalidate();
      toast.success("订单更新成功");
      setEditOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.message || "更新失败");
    },
  });

  const deleteOrder = trpc.orders.delete.useMutation({
    onSuccess: () => {
      utils.orders.list.invalidate();
      toast.success("订单删除成功");
    },
    onError: (error) => {
      toast.error(error.message || "删除失败");
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [salesFilter, setSalesFilter] = useState<string>("all");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
  });

  const onCreateSubmit = (data: OrderFormData) => {
    createOrder.mutate({
      orderNo: data.orderNo,
      customerId: data.customerId,
      paymentAmount: data.paymentAmount,
      courseAmount: data.courseAmount,
      paymentChannel: data.paymentChannel,
      deliveryCourse: data.deliveryCourse,
      deliveryCity: data.deliveryCity,
      deliveryRoom: data.deliveryRoom,
      deliveryTeacher: data.deliveryTeacher,
      teacherFee: data.teacherFee,
      transportFee: data.transportFee,
      partnerFee: data.partnerFee,
      otherFee: data.otherFee,
      notes: data.notes,
    });
  };

  const onEditSubmit = (data: OrderFormData) => {
    if (!selectedOrder) return;
    updateOrder.mutate({
      id: selectedOrder.id,
      orderNo: data.orderNo,
      customerId: data.customerId,
      paymentAmount: data.paymentAmount,
      courseAmount: data.courseAmount,
      paymentChannel: data.paymentChannel,
      deliveryCourse: data.deliveryCourse,
      deliveryCity: data.deliveryCity,
      deliveryRoom: data.deliveryRoom,
      deliveryTeacher: data.deliveryTeacher,
      teacherFee: data.teacherFee,
      transportFee: data.transportFee,
      partnerFee: data.partnerFee,
      otherFee: data.otherFee,
      notes: data.notes,
    });
  };

  const handleEdit = (order: any) => {
    setSelectedOrder(order);
    setValue("orderNo", order.orderNo);
    setValue("customerId", order.customerId);
    setValue("paymentAmount", order.paymentAmount || "");
    setValue("courseAmount", order.courseAmount || "");
    setValue("paymentChannel", order.paymentChannel || "");
    setValue("deliveryCourse", order.deliveryCourse || "");
    setValue("deliveryCity", order.deliveryCity || "");
    setValue("deliveryRoom", order.deliveryRoom || "");
    setValue("deliveryTeacher", order.deliveryTeacher || "");
    setValue("teacherFee", order.teacherFee || "");
    setValue("transportFee", order.transportFee || "");
    setValue("partnerFee", order.partnerFee || "");
    setValue("otherFee", order.otherFee || "");
    setValue("notes", order.notes || "");
    setEditOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这个订单吗?")) {
      deleteOrder.mutate({ id });
    }
  };

  const handleViewDetail = (order: any) => {
    setSelectedOrder(order);
    setDetailOpen(true);
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

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((order) => {
      const matchesSearch =
        !searchTerm ||
        order.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.deliveryCourse?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.deliveryTeacher?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesSales = salesFilter === "all" || order.salesId.toString() === salesFilter;

      return matchesSearch && matchesStatus && matchesSales;
    });
  }, [orders, searchTerm, statusFilter, salesFilter]);

  // 导出订单数据
  const handleExport = async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("订单列表");

      sheet.columns = [
        { header: "订单号", key: "orderNo", width: 20 },
        { header: "客户", key: "customer", width: 15 },
        { header: "支付金额", key: "paymentAmount", width: 12 },
        { header: "课程金额", key: "courseAmount", width: 12 },
        { header: "支付渠道", key: "paymentChannel", width: 15 },
        { header: "交付课程", key: "deliveryCourse", width: 20 },
        { header: "交付老师", key: "deliveryTeacher", width: 15 },
        { header: "老师费用", key: "teacherFee", width: 12 },
        { header: "车费", key: "transportFee", width: 10 },
        { header: "状态", key: "status", width: 10 },
        { header: "创建时间", key: "createdAt", width: 20 },
      ];

      sheet.addRows(
        filteredOrders.map((order) => {
          const customer = customers?.find((c) => c.id === order.customerId);
          return {
            orderNo: order.orderNo,
            customer: customer?.name || "-",
            paymentAmount: order.paymentAmount || "0",
            courseAmount: order.courseAmount || "0",
            paymentChannel: order.paymentChannel || "-",
            deliveryCourse: order.deliveryCourse || "-",
            deliveryTeacher: order.deliveryTeacher || "-",
            teacherFee: order.teacherFee || "0",
            transportFee: order.transportFee || "0",
            status: order.status,
            createdAt: new Date(order.createdAt).toLocaleString(),
          };
        })
      );

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `订单列表_${new Date().toLocaleDateString()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("导出成功");
    } catch (error) {
      toast.error("导出失败");
      console.error(error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">订单管理</h1>
            <p className="text-muted-foreground mt-2">查看和管理所有客户订单</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              导出订单
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              新建订单
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>订单列表</CardTitle>
              <div className="flex items-center space-x-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="筛选状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="pending">待支付</SelectItem>
                    <SelectItem value="paid">已支付</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                    <SelectItem value="refunded">已退款</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={salesFilter} onValueChange={setSalesFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="筛选销售" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部销售</SelectItem>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索订单号、课程、老师..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-[250px]"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>客户</TableHead>
                    <TableHead>支付金额</TableHead>
                    <TableHead>课程</TableHead>
                    <TableHead>老师</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders && filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => {
                      const customer = customers?.find((c) => c.id === order.customerId);
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNo}</TableCell>
                          <TableCell>{customer?.name || "-"}</TableCell>
                          <TableCell className="text-green-600 font-medium">
                            ¥{parseFloat(order.paymentAmount || "0").toFixed(2)}
                          </TableCell>
                          <TableCell>{order.deliveryCourse || "-"}</TableCell>
                          <TableCell>{order.deliveryTeacher || "-"}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetail(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(order)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(order.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {searchTerm || statusFilter !== "all" || salesFilter !== "all"
                          ? "未找到匹配的订单"
                          : "暂无订单数据"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 新建订单对话框 */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新建订单</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
              <Tabs defaultValue="basic">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">基本信息</TabsTrigger>
                  <TabsTrigger value="delivery">交付信息</TabsTrigger>
                  <TabsTrigger value="finance">费用信息</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="orderNo">订单号 *</Label>
                      <Input id="orderNo" {...register("orderNo")} placeholder="请输入订单号" />
                      {errors.orderNo && (
                        <p className="text-sm text-destructive mt-1">{errors.orderNo.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="customerId">客户 *</Label>
                      <Select
                        value={watch("customerId")?.toString()}
                        onValueChange={(value) => setValue("customerId", parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择客户" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers?.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.customerId && (
                        <p className="text-sm text-destructive mt-1">{errors.customerId.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="paymentAmount">支付金额 *</Label>
                      <Input
                        id="paymentAmount"
                        type="number"
                        step="0.01"
                        {...register("paymentAmount")}
                        placeholder="请输入支付金额"
                      />
                      {errors.paymentAmount && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.paymentAmount.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="courseAmount">课程金额 *</Label>
                      <Input
                        id="courseAmount"
                        type="number"
                        step="0.01"
                        {...register("courseAmount")}
                        placeholder="请输入课程金额"
                      />
                      {errors.courseAmount && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.courseAmount.message}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="paymentChannel">支付渠道</Label>
                      <Input
                        id="paymentChannel"
                        {...register("paymentChannel")}
                        placeholder="如:微信/支付宝/富掌柜"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="delivery" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="deliveryCourse">交付课程</Label>
                      <Input
                        id="deliveryCourse"
                        {...register("deliveryCourse")}
                        placeholder="请输入课程名称"
                      />
                    </div>
                    <div>
                      <Label htmlFor="deliveryCity">交付城市</Label>
                      <Input
                        id="deliveryCity"
                        {...register("deliveryCity")}
                        placeholder="请输入城市"
                      />
                    </div>
                    <div>
                      <Label htmlFor="deliveryRoom">交付教室</Label>
                      <Input
                        id="deliveryRoom"
                        {...register("deliveryRoom")}
                        placeholder="请输入教室"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="deliveryTeacher">交付老师</Label>
                      <Input
                        id="deliveryTeacher"
                        {...register("deliveryTeacher")}
                        placeholder="请输入老师姓名"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="finance" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="teacherFee">老师费用</Label>
                      <Input
                        id="teacherFee"
                        type="number"
                        step="0.01"
                        {...register("teacherFee")}
                        placeholder="请输入老师费用"
                      />
                    </div>
                    <div>
                      <Label htmlFor="transportFee">车费</Label>
                      <Input
                        id="transportFee"
                        type="number"
                        step="0.01"
                        {...register("transportFee")}
                        placeholder="请输入车费"
                      />
                    </div>
                    <div>
                      <Label htmlFor="partnerFee">合伙人费用</Label>
                      <Input
                        id="partnerFee"
                        type="number"
                        step="0.01"
                        {...register("partnerFee")}
                        placeholder="请输入合伙人费用"
                      />
                    </div>
                    <div>
                      <Label htmlFor="otherFee">其他费用</Label>
                      <Input
                        id="otherFee"
                        type="number"
                        step="0.01"
                        {...register("otherFee")}
                        placeholder="请输入其他费用"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="notes">备注</Label>
                      <Input id="notes" {...register("notes")} placeholder="请输入备注信息" />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={createOrder.isPending}>
                  {createOrder.isPending ? "创建中..." : "创建"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 编辑订单对话框 */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑订单</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
              <Tabs defaultValue="basic">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">基本信息</TabsTrigger>
                  <TabsTrigger value="delivery">交付信息</TabsTrigger>
                  <TabsTrigger value="finance">费用信息</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-orderNo">订单号 *</Label>
                      <Input
                        id="edit-orderNo"
                        {...register("orderNo")}
                        placeholder="请输入订单号"
                      />
                      {errors.orderNo && (
                        <p className="text-sm text-destructive mt-1">{errors.orderNo.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="edit-customerId">客户 *</Label>
                      <Select
                        value={watch("customerId")?.toString()}
                        onValueChange={(value) => setValue("customerId", parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择客户" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers?.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.customerId && (
                        <p className="text-sm text-destructive mt-1">{errors.customerId.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="edit-paymentAmount">支付金额 *</Label>
                      <Input
                        id="edit-paymentAmount"
                        type="number"
                        step="0.01"
                        {...register("paymentAmount")}
                        placeholder="请输入支付金额"
                      />
                      {errors.paymentAmount && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.paymentAmount.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="edit-courseAmount">课程金额 *</Label>
                      <Input
                        id="edit-courseAmount"
                        type="number"
                        step="0.01"
                        {...register("courseAmount")}
                        placeholder="请输入课程金额"
                      />
                      {errors.courseAmount && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.courseAmount.message}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="edit-paymentChannel">支付渠道</Label>
                      <Input
                        id="edit-paymentChannel"
                        {...register("paymentChannel")}
                        placeholder="如:微信/支付宝/富掌柜"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="delivery" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="edit-deliveryCourse">交付课程</Label>
                      <Input
                        id="edit-deliveryCourse"
                        {...register("deliveryCourse")}
                        placeholder="请输入课程名称"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-deliveryCity">交付城市</Label>
                      <Input
                        id="edit-deliveryCity"
                        {...register("deliveryCity")}
                        placeholder="请输入城市"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-deliveryRoom">交付教室</Label>
                      <Input
                        id="edit-deliveryRoom"
                        {...register("deliveryRoom")}
                        placeholder="请输入教室"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="edit-deliveryTeacher">交付老师</Label>
                      <Input
                        id="edit-deliveryTeacher"
                        {...register("deliveryTeacher")}
                        placeholder="请输入老师姓名"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="finance" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-teacherFee">老师费用</Label>
                      <Input
                        id="edit-teacherFee"
                        type="number"
                        step="0.01"
                        {...register("teacherFee")}
                        placeholder="请输入老师费用"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-transportFee">车费</Label>
                      <Input
                        id="edit-transportFee"
                        type="number"
                        step="0.01"
                        {...register("transportFee")}
                        placeholder="请输入车费"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-partnerFee">合伙人费用</Label>
                      <Input
                        id="edit-partnerFee"
                        type="number"
                        step="0.01"
                        {...register("partnerFee")}
                        placeholder="请输入合伙人费用"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-otherFee">其他费用</Label>
                      <Input
                        id="edit-otherFee"
                        type="number"
                        step="0.01"
                        {...register("otherFee")}
                        placeholder="请输入其他费用"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="edit-notes">备注</Label>
                      <Input
                        id="edit-notes"
                        {...register("notes")}
                        placeholder="请输入备注信息"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={updateOrder.isPending}>
                  {updateOrder.isPending ? "保存中..." : "保存"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 订单详情对话框 */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>订单详情</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">基本信息</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">订单号:</span>
                      <p className="font-medium mt-1">{selectedOrder.orderNo}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">客户:</span>
                      <p className="font-medium mt-1">
                        {customers?.find((c) => c.id === selectedOrder.customerId)?.name || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">支付金额:</span>
                      <p className="font-medium mt-1 text-green-600">
                        ¥{parseFloat(selectedOrder.paymentAmount || "0").toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">课程金额:</span>
                      <p className="font-medium mt-1">
                        ¥{parseFloat(selectedOrder.courseAmount || "0").toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">支付渠道:</span>
                      <p className="font-medium mt-1">{selectedOrder.paymentChannel || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">订单状态:</span>
                      <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">交付信息</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">交付课程:</span>
                      <p className="font-medium mt-1">{selectedOrder.deliveryCourse || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">交付老师:</span>
                      <p className="font-medium mt-1">{selectedOrder.deliveryTeacher || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">交付城市:</span>
                      <p className="font-medium mt-1">{selectedOrder.deliveryCity || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">交付教室:</span>
                      <p className="font-medium mt-1">{selectedOrder.deliveryRoom || "-"}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">费用明细</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">老师费用:</span>
                      <p className="font-medium mt-1 text-red-600">
                        ¥{parseFloat(selectedOrder.teacherFee || "0").toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">车费:</span>
                      <p className="font-medium mt-1 text-red-600">
                        ¥{parseFloat(selectedOrder.transportFee || "0").toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">合伙人费用:</span>
                      <p className="font-medium mt-1 text-red-600">
                        ¥{parseFloat(selectedOrder.partnerFee || "0").toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">其他费用:</span>
                      <p className="font-medium mt-1 text-red-600">
                        ¥{parseFloat(selectedOrder.otherFee || "0").toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">备注</h3>
                    <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold mb-3">其他信息</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">创建时间:</span>
                      <p className="font-medium mt-1">
                        {new Date(selectedOrder.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">更新时间:</span>
                      <p className="font-medium mt-1">
                        {new Date(selectedOrder.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
