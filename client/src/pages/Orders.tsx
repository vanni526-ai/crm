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
import { Plus, Search, Eye, Edit, Trash2, Download, Upload } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const orderSchema = z.object({
  orderNo: z.string().min(1, "订单号不能为空"),
  customerName: z.string().min(1, "请输入客户姓名"),
  salesPerson: z.string().optional(),
  trafficSource: z.string().optional(),
  paymentAmount: z.string().min(1, "支付金额不能为空"),
  courseAmount: z.string().min(1, "课程金额不能为空"),
  accountBalance: z.string().optional(),
  paymentCity: z.string().optional(),
  paymentChannel: z.string().optional(),
  channelOrderNo: z.string().optional(),
  paymentDate: z.string().optional(),
  paymentTime: z.string().optional(),
  teacherFee: z.string().optional(),
  transportFee: z.string().optional(),
  otherFee: z.string().optional(),
  partnerFee: z.string().optional(),
  finalAmount: z.string().optional(),
  deliveryCity: z.string().optional(),
  deliveryRoom: z.string().optional(),
  deliveryTeacher: z.string().optional(),
  deliveryCourse: z.string().optional(),
  classDate: z.string().optional(),
  classTime: z.string().optional(),
  notes: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

export default function Orders() {
  const utils = trpc.useUtils();
  const { data: orders, isLoading } = trpc.orders.list.useQuery();
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
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [salesFilter, setSalesFilter] = useState("all");
  const [exportTimeRange, setExportTimeRange] = useState<"yesterday" | "last7days" | "thisMonth" | "custom">("thisMonth");
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
  });

  const onCreateSubmit = (data: OrderFormData) => {
    createOrder.mutate({
      orderNo: data.orderNo,
      customerName: data.customerName,
      salesPerson: data.salesPerson,
      trafficSource: data.trafficSource,
      paymentAmount: data.paymentAmount,
      courseAmount: data.courseAmount,
      accountBalance: data.accountBalance,
      paymentCity: data.paymentCity,
      paymentChannel: data.paymentChannel,
      channelOrderNo: data.channelOrderNo,
      paymentDate: data.paymentDate,
      paymentTime: data.paymentTime,
      teacherFee: data.teacherFee,
      transportFee: data.transportFee,
      otherFee: data.otherFee,
      partnerFee: data.partnerFee,
      finalAmount: data.finalAmount,
      deliveryCity: data.deliveryCity,
      deliveryRoom: data.deliveryRoom,
      deliveryTeacher: data.deliveryTeacher,
      deliveryCourse: data.deliveryCourse,
      classDate: data.classDate,
      classTime: data.classTime,
      notes: data.notes,
    });
  };

  const onEditSubmit = (data: OrderFormData) => {
    if (!selectedOrder) return;
    updateOrder.mutate({
      id: selectedOrder.id,
      orderNo: data.orderNo,
      customerName: data.customerName,
      salesPerson: data.salesPerson,
      trafficSource: data.trafficSource,
      paymentAmount: data.paymentAmount,
      courseAmount: data.courseAmount,
      accountBalance: data.accountBalance,
      paymentCity: data.paymentCity,
      paymentChannel: data.paymentChannel,
      channelOrderNo: data.channelOrderNo,
      paymentDate: data.paymentDate,
      paymentTime: data.paymentTime,
      teacherFee: data.teacherFee,
      transportFee: data.transportFee,
      otherFee: data.otherFee,
      partnerFee: data.partnerFee,
      finalAmount: data.finalAmount,
      deliveryCity: data.deliveryCity,
      deliveryRoom: data.deliveryRoom,
      deliveryTeacher: data.deliveryTeacher,
      deliveryCourse: data.deliveryCourse,
      classDate: data.classDate,
      classTime: data.classTime,
      notes: data.notes,
    });
  };

  const handleEdit = (order: any) => {
    setSelectedOrder(order);
    setValue("orderNo", order.orderNo);
    setValue("customerName", order.customerName || "");
    setValue("salesPerson", order.salesPerson || "");
    setValue("trafficSource", order.trafficSource || "");
    setValue("paymentAmount", order.paymentAmount || "");
    setValue("courseAmount", order.courseAmount || "");
    setValue("accountBalance", order.accountBalance || "");
    setValue("paymentCity", order.paymentCity || "");
    setValue("paymentChannel", order.paymentChannel || "");
    setValue("channelOrderNo", order.channelOrderNo || "");
    setValue("paymentDate", order.paymentDate || "");
    setValue("paymentTime", order.paymentTime || "");
    setValue("teacherFee", order.teacherFee || "");
    setValue("transportFee", order.transportFee || "");
    setValue("otherFee", order.otherFee || "");
    setValue("partnerFee", order.partnerFee || "");
    setValue("finalAmount", order.finalAmount || "");
    setValue("deliveryCity", order.deliveryCity || "");
    setValue("deliveryRoom", order.deliveryRoom || "");
    setValue("deliveryTeacher", order.deliveryTeacher || "");
    setValue("deliveryCourse", order.deliveryCourse || "");
    setValue("classDate", order.classDate || "");
    setValue("classTime", order.classTime || "");
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

  const [sortBy, setSortBy] = useState<"createdAt" | "paymentAmount" | "customerName">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredAndSortedOrders = useMemo(() => {
    if (!orders) return [];
    
    let filtered = orders.filter((order) => {
      const matchesSearch =
        !searchTerm ||
        order.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.salesPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.deliveryCourse?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.deliveryTeacher?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesSales = salesFilter === "all" || order.salesPerson === salesFilter;

      return matchesSearch && matchesStatus && matchesSales;
    });

    filtered.sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === "createdAt") {
        compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === "paymentAmount") {
        compareValue = parseFloat(a.paymentAmount || "0") - parseFloat(b.paymentAmount || "0");
      } else if (sortBy === "customerName") {
        compareValue = (a.customerName || "").localeCompare(b.customerName || "");
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return filtered;
  }, [orders, searchTerm, statusFilter, salesFilter, sortBy, sortOrder]);

  const getFilteredOrdersByTimeRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (exportTimeRange === "yesterday") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (exportTimeRange === "last7days") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (exportTimeRange === "thisMonth") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (exportTimeRange === "custom") {
      if (!exportStartDate || !exportEndDate) {
        toast.error("请选择开始和结束日期");
        return [];
      }
      startDate = new Date(exportStartDate);
      endDate = new Date(exportEndDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      return filteredAndSortedOrders;
    }

    return filteredAndSortedOrders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("请选择要导入的文件");
      return;
    }

    setIsImporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await importFile.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        toast.error("文件中没有找到工作表");
        setIsImporting(false);
        return;
      }

      const orders: any[] = [];
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.text;
      });

      // 验证表头
      const requiredHeaders = ["订单号", "客户名", "支付金额", "课程金额"];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast.error(`缺少必要字段: ${missingHeaders.join(", ")}`);
        setIsImporting(false);
        return;
      }

      // 读取数据行
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // 跳过表头
        
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            rowData[header] = cell.text;
          }
        });

        if (rowData["订单号"]) {
          orders.push({
            orderNo: rowData["订单号"],
            customerName: rowData["客户名"],
            salesPerson: rowData["销售人"],
            trafficSource: rowData["流量来源"],
            paymentAmount: rowData["支付金额"],
            courseAmount: rowData["课程金额"],
            accountBalance: rowData["账户余额"],
            paymentCity: rowData["支付城市"],
            channelOrderNo: rowData["渠道订单号"],
            teacherFee: rowData["老师费用"],
            transportFee: rowData["车费"],
            otherFee: rowData["其他费用"],
            partnerFee: rowData["合伙人费"],
            finalAmount: rowData["金串到账金额"],
            paymentDate: rowData["支付日期"],
            paymentTime: rowData["支付时间"],
            deliveryCity: rowData["交付城市"],
            deliveryRoom: rowData["交付教室"],
            deliveryTeacher: rowData["交付老师"],
            deliveryCourse: rowData["交付课程"],
            classDate: rowData["上课日期"],
            classTime: rowData["上课时间"],
            notes: rowData["备注"],
          });
        }
      });

      if (orders.length === 0) {
        toast.error("文件中没有有效的订单数据");
        setIsImporting(false);
        return;
      }

      // 批量创建订单
      let successCount = 0;
      let failCount = 0;
      for (const order of orders) {
        try {
          await createOrder.mutateAsync(order);
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`导入订单 ${order.orderNo} 失败:`, error);
        }
      }

      toast.success(`导入完成! 成功: ${successCount} 条, 失败: ${failCount} 条`);
      setImportOpen(false);
      setImportFile(null);
      utils.orders.list.invalidate();
    } catch (error) {
      console.error("导入失败:", error);
      toast.error("导入失败,请检查文件格式");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    const ordersToExport = getFilteredOrdersByTimeRange();
    
    if (ordersToExport.length === 0) {
      toast.error("没有符合条件的订单数据");
      return;
    }

    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("订单列表");

      // 设置所有23个详细字段的表头
      sheet.columns = [
        { header: "订单号", key: "orderNo", width: 20 },
        { header: "销售人", key: "salesPerson", width: 12 },
        { header: "流量来源", key: "trafficSource", width: 15 },
        { header: "客户名", key: "customerName", width: 15 },
        { header: "支付金额", key: "paymentAmount", width: 12 },
        { header: "课程金额", key: "courseAmount", width: 12 },
        { header: "账户余额", key: "accountBalance", width: 12 },
        { header: "支付城市", key: "paymentCity", width: 12 },
        { header: "渠道订单号", key: "channelOrderNo", width: 25 },
        { header: "老师费用", key: "teacherFee", width: 12 },
        { header: "车费", key: "transportFee", width: 10 },
        { header: "其他费用", key: "otherFee", width: 12 },
        { header: "合伙人费", key: "partnerFee", width: 12 },
        { header: "金串到账金额", key: "finalAmount", width: 15 },
        { header: "支付日期", key: "paymentDate", width: 12 },
        { header: "支付时间", key: "paymentTime", width: 12 },
        { header: "交付城市", key: "deliveryCity", width: 12 },
        { header: "交付教室", key: "deliveryRoom", width: 20 },
        { header: "交付老师", key: "deliveryTeacher", width: 15 },
        { header: "交付课程", key: "deliveryCourse", width: 20 },
        { header: "上课日期", key: "classDate", width: 12 },
        { header: "上课时间", key: "classTime", width: 12 },
        { header: "备注", key: "notes", width: 30 },
      ];

      ordersToExport.forEach((order) => {
        sheet.addRow({
          orderNo: order.orderNo,
          salesPerson: order.salesPerson || "",
          trafficSource: order.trafficSource || "",
          customerName: order.customerName || "",
          paymentAmount: order.paymentAmount || "",
          courseAmount: order.courseAmount || "",
          accountBalance: order.accountBalance || "",
          paymentCity: order.paymentCity || "",
          channelOrderNo: order.channelOrderNo || "",
          teacherFee: order.teacherFee || "",
          transportFee: order.transportFee || "",
          otherFee: order.otherFee || "",
          partnerFee: order.partnerFee || "",
          finalAmount: order.finalAmount || "",
          paymentDate: order.paymentDate || "",
          paymentTime: order.paymentTime || "",
          deliveryCity: order.deliveryCity || "",
          deliveryRoom: order.deliveryRoom || "",
          deliveryTeacher: order.deliveryTeacher || "",
          deliveryCourse: order.deliveryCourse || "",
          classDate: order.classDate || "",
          classTime: order.classTime || "",
          notes: order.notes || "",
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `订单列表_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success(`成功导出 ${ordersToExport.length} 条订单`);
      setExportOpen(false);
    } catch (error) {
      console.error("导出失败:", error);
      toast.error("导出失败,请重试");
    }
  };

  // 获取唯一的销售人员列表
  const salesPersonList = useMemo(() => {
    if (!orders) return [];
    const uniqueSales = new Set(orders.map(o => o.salesPerson).filter((s): s is string => Boolean(s)));
    return Array.from(uniqueSales);
  }, [orders]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">订单管理</h1>
            <p className="text-muted-foreground mt-1">查看和管理所有客户订单</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              导入订单
            </Button>
            <Button variant="outline" onClick={() => setExportOpen(true)}>
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
            <CardTitle>订单列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="全部状态" />
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
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="全部销售" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部销售</SelectItem>
                    {salesPersonList.map((sales) => (
                      <SelectItem key={sales} value={sales}>
                        {sales}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="创建时间" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">创建时间</SelectItem>
                    <SelectItem value="paymentAmount">支付金额</SelectItem>
                    <SelectItem value="customerName">客户名称</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="降序" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">降序</SelectItem>
                    <SelectItem value="asc">升序</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索订单号、客户、课程..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : filteredAndSortedOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暂无订单数据</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>订单号</TableHead>
                        <TableHead>销售人</TableHead>
                        <TableHead>流量来源</TableHead>
                        <TableHead>客户名</TableHead>
                        <TableHead>支付金额</TableHead>
                        <TableHead>课程金额</TableHead>
                        <TableHead>账户余额</TableHead>
                        <TableHead>支付城市</TableHead>
                        <TableHead>渠道订单号</TableHead>
                        <TableHead>老师费用</TableHead>
                        <TableHead>车费</TableHead>
                        <TableHead>其他费用</TableHead>
                        <TableHead>合伙人费</TableHead>
                        <TableHead>金串到账金额</TableHead>
                        <TableHead>支付日期</TableHead>
                        <TableHead>支付时间</TableHead>
                        <TableHead>交付城市</TableHead>
                        <TableHead>交付教室</TableHead>
                        <TableHead>交付老师</TableHead>
                        <TableHead>交付课程</TableHead>
                        <TableHead>上课日期</TableHead>
                        <TableHead>上课时间</TableHead>
                        <TableHead>备注</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>创建时间</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNo}</TableCell>
                          <TableCell>{order.salesPerson || "-"}</TableCell>
                          <TableCell>{order.trafficSource || "-"}</TableCell>
                          <TableCell>{order.customerName || "-"}</TableCell>
                          <TableCell className="text-green-600">¥{order.paymentAmount}</TableCell>
                          <TableCell>¥{order.courseAmount}</TableCell>
                          <TableCell>¥{order.accountBalance || "0.00"}</TableCell>
                          <TableCell>{order.paymentCity || "-"}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{order.channelOrderNo || "-"}</TableCell>
                          <TableCell>¥{order.teacherFee || "0.00"}</TableCell>
                          <TableCell>¥{order.transportFee || "0.00"}</TableCell>
                          <TableCell>¥{order.otherFee || "0.00"}</TableCell>
                          <TableCell>¥{order.partnerFee || "0.00"}</TableCell>
                          <TableCell>¥{order.finalAmount || "0.00"}</TableCell>
                          <TableCell>{order.paymentDate ? (typeof order.paymentDate === 'string' ? order.paymentDate : new Date(order.paymentDate).toLocaleDateString()) : "-"}</TableCell>
                          <TableCell>{order.paymentTime || "-"}</TableCell>
                          <TableCell>{order.deliveryCity || "-"}</TableCell>
                          <TableCell>{order.deliveryRoom || "-"}</TableCell>
                          <TableCell>{order.deliveryTeacher || "-"}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{order.deliveryCourse || "-"}</TableCell>
                          <TableCell>{order.classDate ? (typeof order.classDate === 'string' ? order.classDate : new Date(order.classDate).toLocaleDateString()) : "-"}</TableCell>
                          <TableCell>{order.classTime || "-"}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{order.notes || "-"}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 导出对话框 */}
        <Dialog open={exportOpen} onOpenChange={setExportOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>导出订单</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>选择时间范围</Label>
                <Select
                  value={exportTimeRange}
                  onValueChange={(v: any) => setExportTimeRange(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yesterday">昨天</SelectItem>
                    <SelectItem value="last7days">近7天</SelectItem>
                    <SelectItem value="thisMonth">当月</SelectItem>
                    <SelectItem value="custom">自定义时间</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {exportTimeRange === "custom" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>开始日期</Label>
                    <Input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>结束日期</Label>
                    <Input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExportOpen(false)}>
                取消
              </Button>
              <Button onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                导出
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 导入对话框 */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>导入订单</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  点击或拖拽Excel文件到此处上传
                </p>
                <p className="text-xs text-muted-foreground">
                  支持 .xlsx 格式,文件需包含所有23个字段
                </p>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  className="mt-4"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImportFile(file);
                    }
                  }}
                />
                {importFile && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">已选择: {importFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      大小: {(importFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setImportOpen(false);
                setImportFile(null);
              }}>
                取消
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!importFile || isImporting}
              >
                {isImporting ? "导入中..." : "开始导入"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 查看订单详情对话框 */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>订单详情</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 text-lg">基本信息</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">订单号</p>
                      <p className="font-medium">{selectedOrder.orderNo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">销售人</p>
                      <p className="font-medium">{selectedOrder.salesPerson || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">流量来源</p>
                      <p className="font-medium">{selectedOrder.trafficSource || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">客户名</p>
                      <p className="font-medium">{selectedOrder.customerName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">状态</p>
                      <div>{getStatusBadge(selectedOrder.status)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">创建时间</p>
                      <p className="font-medium">
                        {new Date(selectedOrder.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 text-lg">支付信息</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">支付金额</p>
                      <p className="font-medium text-green-600">¥{selectedOrder.paymentAmount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">课程金额</p>
                      <p className="font-medium">¥{selectedOrder.courseAmount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">账户余额</p>
                      <p className="font-medium">¥{selectedOrder.accountBalance || "0.00"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">支付城市</p>
                      <p className="font-medium">{selectedOrder.paymentCity || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">支付日期</p>
                      <p className="font-medium">{selectedOrder.paymentDate || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">支付时间</p>
                      <p className="font-medium">{selectedOrder.paymentTime || "-"}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm text-muted-foreground">渠道订单号</p>
                      <p className="font-medium">{selectedOrder.channelOrderNo || "-"}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 text-lg">费用信息</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">老师费用</p>
                      <p className="font-medium">¥{selectedOrder.teacherFee || "0.00"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">车费</p>
                      <p className="font-medium">¥{selectedOrder.transportFee || "0.00"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">其他费用</p>
                      <p className="font-medium">¥{selectedOrder.otherFee || "0.00"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">合伙人费</p>
                      <p className="font-medium">¥{selectedOrder.partnerFee || "0.00"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">金串到账金额</p>
                      <p className="font-medium">¥{selectedOrder.finalAmount || "0.00"}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 text-lg">交付信息</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">交付城市</p>
                      <p className="font-medium">{selectedOrder.deliveryCity || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">交付教室</p>
                      <p className="font-medium">{selectedOrder.deliveryRoom || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">交付老师</p>
                      <p className="font-medium">{selectedOrder.deliveryTeacher || "-"}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm text-muted-foreground">交付课程</p>
                      <p className="font-medium">{selectedOrder.deliveryCourse || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">上课日期</p>
                      <p className="font-medium">{selectedOrder.classDate || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">上课时间</p>
                      <p className="font-medium">{selectedOrder.classTime || "-"}</p>
                    </div>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div>
                    <h3 className="font-semibold mb-3 text-lg">备注</h3>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 创建订单对话框 */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新建订单</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
              <Tabs defaultValue="basic">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">基本信息</TabsTrigger>
                  <TabsTrigger value="payment">支付信息</TabsTrigger>
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
                      <Label htmlFor="customerName">客户名 *</Label>
                      <Input id="customerName" {...register("customerName")} placeholder="请输入客户姓名" />
                      {errors.customerName && (
                        <p className="text-sm text-destructive mt-1">{errors.customerName.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="salesPerson">销售人</Label>
                      <Input id="salesPerson" {...register("salesPerson")} placeholder="请输入销售人姓名" />
                    </div>
                    <div>
                      <Label htmlFor="trafficSource">流量来源</Label>
                      <Input id="trafficSource" {...register("trafficSource")} placeholder="请输入流量来源" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="payment" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
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
                        <p className="text-sm text-destructive mt-1">{errors.paymentAmount.message}</p>
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
                        <p className="text-sm text-destructive mt-1">{errors.courseAmount.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="accountBalance">账户余额</Label>
                      <Input
                        id="accountBalance"
                        type="number"
                        step="0.01"
                        {...register("accountBalance")}
                        placeholder="请输入账户余额"
                      />
                    </div>
                    <div>
                      <Label htmlFor="paymentCity">支付城市</Label>
                      <Input id="paymentCity" {...register("paymentCity")} placeholder="请输入支付城市" />
                    </div>
                    <div>
                      <Label htmlFor="paymentChannel">支付渠道</Label>
                      <Input
                        id="paymentChannel"
                        {...register("paymentChannel")}
                        placeholder="如:微信/支付宝/富掌柜"
                      />
                    </div>
                    <div>
                      <Label htmlFor="channelOrderNo">渠道订单号</Label>
                      <Input id="channelOrderNo" {...register("channelOrderNo")} placeholder="请输入渠道订单号" />
                    </div>
                    <div>
                      <Label htmlFor="paymentDate">支付日期</Label>
                      <Input type="date" id="paymentDate" {...register("paymentDate")} />
                    </div>
                    <div>
                      <Label htmlFor="paymentTime">支付时间</Label>
                      <Input type="time" id="paymentTime" {...register("paymentTime")} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="delivery" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="deliveryCity">交付城市</Label>
                      <Input id="deliveryCity" {...register("deliveryCity")} placeholder="请输入交付城市" />
                    </div>
                    <div>
                      <Label htmlFor="deliveryRoom">交付教室</Label>
                      <Input id="deliveryRoom" {...register("deliveryRoom")} placeholder="请输入交付教室" />
                    </div>
                    <div>
                      <Label htmlFor="deliveryTeacher">交付老师</Label>
                      <Input id="deliveryTeacher" {...register("deliveryTeacher")} placeholder="请输入交付老师" />
                    </div>
                    <div>
                      <Label htmlFor="deliveryCourse">交付课程</Label>
                      <Input id="deliveryCourse" {...register("deliveryCourse")} placeholder="请输入交付课程" />
                    </div>
                    <div>
                      <Label htmlFor="classDate">上课日期</Label>
                      <Input type="date" id="classDate" {...register("classDate")} />
                    </div>
                    <div>
                      <Label htmlFor="classTime">上课时间</Label>
                      <Input type="time" id="classTime" {...register("classTime")} />
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
                      <Label htmlFor="otherFee">其他费用</Label>
                      <Input
                        id="otherFee"
                        type="number"
                        step="0.01"
                        {...register("otherFee")}
                        placeholder="请输入其他费用"
                      />
                    </div>
                    <div>
                      <Label htmlFor="partnerFee">合伙人费</Label>
                      <Input
                        id="partnerFee"
                        type="number"
                        step="0.01"
                        {...register("partnerFee")}
                        placeholder="请输入合伙人费"
                      />
                    </div>
                    <div>
                      <Label htmlFor="finalAmount">金串到账金额</Label>
                      <Input
                        id="finalAmount"
                        type="number"
                        step="0.01"
                        {...register("finalAmount")}
                        placeholder="请输入金串到账金额"
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑订单</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
              <Tabs defaultValue="basic">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">基本信息</TabsTrigger>
                  <TabsTrigger value="payment">支付信息</TabsTrigger>
                  <TabsTrigger value="delivery">交付信息</TabsTrigger>
                  <TabsTrigger value="finance">费用信息</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-orderNo">订单号 *</Label>
                      <Input id="edit-orderNo" {...register("orderNo")} placeholder="请输入订单号" />
                      {errors.orderNo && (
                        <p className="text-sm text-destructive mt-1">{errors.orderNo.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="edit-customerName">客户名 *</Label>
                      <Input id="edit-customerName" {...register("customerName")} placeholder="请输入客户姓名" />
                      {errors.customerName && (
                        <p className="text-sm text-destructive mt-1">{errors.customerName.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="edit-salesPerson">销售人</Label>
                      <Input id="edit-salesPerson" {...register("salesPerson")} placeholder="请输入销售人姓名" />
                    </div>
                    <div>
                      <Label htmlFor="edit-trafficSource">流量来源</Label>
                      <Input id="edit-trafficSource" {...register("trafficSource")} placeholder="请输入流量来源" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="payment" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
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
                        <p className="text-sm text-destructive mt-1">{errors.paymentAmount.message}</p>
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
                        <p className="text-sm text-destructive mt-1">{errors.courseAmount.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="edit-accountBalance">账户余额</Label>
                      <Input
                        id="edit-accountBalance"
                        type="number"
                        step="0.01"
                        {...register("accountBalance")}
                        placeholder="请输入账户余额"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-paymentCity">支付城市</Label>
                      <Input id="edit-paymentCity" {...register("paymentCity")} placeholder="请输入支付城市" />
                    </div>
                    <div>
                      <Label htmlFor="edit-paymentChannel">支付渠道</Label>
                      <Input
                        id="edit-paymentChannel"
                        {...register("paymentChannel")}
                        placeholder="如:微信/支付宝/富掌柜"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-channelOrderNo">渠道订单号</Label>
                      <Input id="edit-channelOrderNo" {...register("channelOrderNo")} placeholder="请输入渠道订单号" />
                    </div>
                    <div>
                      <Label htmlFor="edit-paymentDate">支付日期</Label>
                      <Input type="date" id="edit-paymentDate" {...register("paymentDate")} />
                    </div>
                    <div>
                      <Label htmlFor="edit-paymentTime">支付时间</Label>
                      <Input type="time" id="edit-paymentTime" {...register("paymentTime")} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="delivery" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-deliveryCity">交付城市</Label>
                      <Input id="edit-deliveryCity" {...register("deliveryCity")} placeholder="请输入交付城市" />
                    </div>
                    <div>
                      <Label htmlFor="edit-deliveryRoom">交付教室</Label>
                      <Input id="edit-deliveryRoom" {...register("deliveryRoom")} placeholder="请输入交付教室" />
                    </div>
                    <div>
                      <Label htmlFor="edit-deliveryTeacher">交付老师</Label>
                      <Input id="edit-deliveryTeacher" {...register("deliveryTeacher")} placeholder="请输入交付老师" />
                    </div>
                    <div>
                      <Label htmlFor="edit-deliveryCourse">交付课程</Label>
                      <Input id="edit-deliveryCourse" {...register("deliveryCourse")} placeholder="请输入交付课程" />
                    </div>
                    <div>
                      <Label htmlFor="edit-classDate">上课日期</Label>
                      <Input type="date" id="edit-classDate" {...register("classDate")} />
                    </div>
                    <div>
                      <Label htmlFor="edit-classTime">上课时间</Label>
                      <Input type="time" id="edit-classTime" {...register("classTime")} />
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
                      <Label htmlFor="edit-otherFee">其他费用</Label>
                      <Input
                        id="edit-otherFee"
                        type="number"
                        step="0.01"
                        {...register("otherFee")}
                        placeholder="请输入其他费用"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-partnerFee">合伙人费</Label>
                      <Input
                        id="edit-partnerFee"
                        type="number"
                        step="0.01"
                        {...register("partnerFee")}
                        placeholder="请输入合伙人费"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-finalAmount">金串到账金额</Label>
                      <Input
                        id="edit-finalAmount"
                        type="number"
                        step="0.01"
                        {...register("finalAmount")}
                        placeholder="请输入金串到账金额"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="edit-notes">备注</Label>
                      <Input id="edit-notes" {...register("notes")} placeholder="请输入备注信息" />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={updateOrder.isPending}>
                  {updateOrder.isPending ? "更新中..." : "更新"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
