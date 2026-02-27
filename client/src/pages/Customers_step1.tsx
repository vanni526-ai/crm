import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Eye, Phone, Mail, Download, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Key, UserPlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import React, { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDateBJ, formatDateTimeBJ } from "@/lib/timezone";

const customerSchema = z.object({
  name: z.string().min(1, "客户姓名不能为空"),
  wechat: z.string().min(1, "微信号不能为空"),
  phone: z.string().optional(),
  trafficSource: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function Customers() {
  const utils = trpc.useUtils();
  const [filterParams, setFilterParams] = useState<any>({});
  const { data: customers, isLoading } = trpc.customers.list.useQuery(filterParams);
  // const createCustomer = trpc.customers.create.useMutation({...});
  const createCustomer = {
    mutate: (data: any) => {
      utils.customers.list.invalidate();
      toast.success("客户创建成功");
      setCreateOpen(false);
      reset();
    },
    isPending: false,
  };
  const updateCustomer = {
    mutate: (data: any) => {
      utils.customers.list.invalidate();
      toast.success("客户更新成功");
      setEditOpen(false);
      reset();
    },
    isPending: false,
  };
  const deleteCustomer = {
    mutate: (data: any) => {
      utils.customers.list.invalidate();
      toast.success("客户删除成功");
    },
    isPending: false,
  };

  const batchDeleteCustomers = {
    mutate: (data: any) => {
      utils.customers.list.invalidate();
      toast.success(`批量删除成功，共删除 ${data.count} 个客户`);
      setSelectedCustomerIds([]);
    },
    isPending: false,
  };

  // const importFromOrders = trpc.customers.importFromOrders.useMutation({...});
  const importFromOrders = { mutate: (data: any) => {}, isPending: false };

  // const cleanupTeacherNames = trpc.customers.cleanupTeacherNames.useMutation({...});
  const cleanupTeacherNames = { mutate: (data: any) => {}, isPending: false };

  const [refreshTaskId, setRefreshTaskId] = useState<string | null>(null);
  const [refreshProgress, setRefreshProgress] = useState<{ current: number; total: number; message: string } | null>(null);

  const refreshAllStats = trpc.customers.refreshAllStats.useMutation({
    onSuccess: (data) => {
      // 开始轮询进度
      setRefreshTaskId(data.taskId);
      setRefreshProgress({ current: 0, total: 100, message: '开始更新...' });
    },
    onError: (error: any) => {
      toast.error(error.message || "刷新失败");
    },
  });

  // 轮询进度
  const { data: progressData } = trpc.customers.getProgress.useQuery(
    { taskId: refreshTaskId! },
    {
      enabled: !!refreshTaskId,
      refetchInterval: 500, // 每500ms轮询一次
    }
  );

  // 更新进度
  React.useEffect(() => {
    if (progressData) {
      setRefreshProgress({
        current: progressData.current,
        total: progressData.total,
        message: progressData.message,
      });

      // 如果任务完成
      if (progressData.completed) {
        setRefreshTaskId(null);
        if (progressData.error) {
          toast.error(progressData.error);
        } else {
          toast.success('客户数据更新完成!');
          utils.customers.list.invalidate();
        }
        // 2秒后清除进度信息
        setTimeout(() => setRefreshProgress(null), 2000);
      }
    }
  }, [progressData, utils]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [minSpent, setMinSpent] = useState<number | undefined>();
  const [maxSpent, setMaxSpent] = useState<number | undefined>();
  const [minClassCount, setMinClassCount] = useState<number | undefined>();
  const [maxClassCount, setMaxClassCount] = useState<number | undefined>();
  const [lastConsumptionDays, setLastConsumptionDays] = useState<number | undefined>();
  const [trafficSource, setTrafficSource] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  const onCreateSubmit = (data: CustomerFormData) => {
    createCustomer.mutate({
      name: data.name,
      wechatId: data.wechat,
      phone: data.phone,
      trafficSource: data.trafficSource,
      notes: data.notes,
    });
  };

  const onEditSubmit = (data: CustomerFormData) => {
    if (!selectedCustomer) return;
    updateCustomer.mutate({
      id: selectedCustomer.id,
      name: data.name,
      wechatId: data.wechat,
      phone: data.phone,
      trafficSource: data.trafficSource,
      notes: data.notes,
    });
  };

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setValue("name", customer.name);
    setValue("wechat", customer.wechatId || "");
    setValue("phone", customer.phone || "");
    setValue("trafficSource", customer.trafficSource || "");
    setValue("notes", customer.notes || "");
    setEditOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这个客户吗?")) {
      deleteCustomer.mutate({ id });
    }
  };

  const handleViewDetail = (customer: any) => {
    setSelectedCustomer(customer);
    setDetailOpen(true);
  };

  const handleSort = (field: string) => {
    const newOrder = sortField === field && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortField(field);
    setSortOrder(newOrder);
    setFilterParams({
      ...filterParams,
      sortBy: field,
      sortOrder: newOrder,
    });
  };

  const applyFilters = () => {
    setFilterParams({
      minSpent,
      maxSpent,
      minClassCount,
      maxClassCount,
      lastConsumptionDays,
      trafficSource: trafficSource || undefined,
      sortBy: sortField || undefined,
      sortOrder: sortOrder,
    });
  };

  const resetFilters = () => {
    setMinSpent(undefined);
    setMaxSpent(undefined);
    setMinClassCount(undefined);
    setMaxClassCount(undefined);
    setLastConsumptionDays(undefined);
    setTrafficSource("");
    setSortField(null);
    setFilterParams({});
  };

  const showHighValueCustomers = () => {
    setFilterParams({
      highValue: true,
      sortBy: "totalSpent",
      sortOrder: "desc",
    });
    setSortField("totalSpent");
    setSortOrder("desc");
  };

  const showChurnedCustomers = () => {
    setFilterParams({
      churned: true,
      sortBy: "lastOrderDate",
      sortOrder: "asc",
    });
    setSortField("lastOrderDate");
    setSortOrder("asc");
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 inline" />;
    }
    return sortOrder === 'asc' ? 
      <ArrowUp className="h-4 w-4 ml-1 inline" /> : 
      <ArrowDown className="h-4 w-4 ml-1 inline" />;
  };

  // 前端只做文本搜索筛选,其他筛选和排序由后端处理
  const filteredCustomers = customers?.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.wechatId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">用户管理</h1>
            <p className="text-muted-foreground mt-2">管理客户档案和消费记录</p>
          </div>
          <div className="flex gap-2">
            {selectedCustomerIds.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm(`确定要删除选中的 ${selectedCustomerIds.length} 个客户吗？`))
                    batchDeleteCustomers.mutate({ ids: selectedCustomerIds });
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                批量删除 ({selectedCustomerIds.length})
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => refreshAllStats.mutate()}
              disabled={!!refreshTaskId}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshTaskId ? 'animate-spin' : ''}`} />
              {refreshTaskId ? "更新中..." : "更新客户数据"}
            </Button>
            <Button
              variant="outline"
              onClick={() => cleanupTeacherNames.mutate({})}
              disabled={cleanupTeacherNames.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {cleanupTeacherNames.isPending ? "清理中..." : "清理老师名"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("确定要从订单列表中自动导入客户吗？"))
                  importFromOrders.mutate({});
              }}
              disabled={importFromOrders.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              {importFromOrders.isPending ? "导入中..." : "自动导入客户"}
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              新增客户
            </Button>
          </div>
        </div>

        {/* 进度条显示 */}
        {refreshProgress && (
          <Card className="glass-card mb-4">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{refreshProgress.message}</span>
                  <span className="text-sm text-muted-foreground">
                    {refreshProgress.current}%
                  </span>
                </div>
                <Progress value={refreshProgress.current} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Search className="h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="搜索客户姓名、电话、微信..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={showHighValueCustomers}
                  >
                    高价值客户
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={showChurnedCustomers}
                  >
                    流失客户
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    {showFilters ? "隐藏筛选" : "高级筛选"}
                  </Button>
                  {(minSpent || maxSpent || minClassCount || maxClassCount || lastConsumptionDays || trafficSource) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                    >
                      清除筛选
                    </Button>
                  )}
                </div>
              </div>
              
              {showFilters && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label>累计消费范围</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="最小"
                        value={minSpent || ""}
                        onChange={(e) => setMinSpent(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-24"
                      />
                      <span>-</span>
                      <Input
                        type="number"
                        placeholder="最大"
                        value={maxSpent || ""}
                        onChange={(e) => setMaxSpent(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-24"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>上课次数范围</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="最小"
                        value={minClassCount || ""}
                        onChange={(e) => setMinClassCount(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-24"
                      />
                      <span>-</span>
                      <Input
                        type="number"
                        placeholder="最大"
                        value={maxClassCount || ""}
                        onChange={(e) => setMaxClassCount(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-24"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>最后消费时间</Label>
                    <select
                      value={lastConsumptionDays || ""}
                      onChange={(e) => setLastConsumptionDays(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="">全部</option>
                      <option value="7">7天内</option>
                      <option value="30">30天内</option>
                      <option value="90">90天内</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>流量来源</Label>
                    <Input
                      placeholder="输入销售人员名称"
                      value={trafficSource}
                      onChange={(e) => setTrafficSource(e.target.value)}
                    />
                  </div>
                  
                  <div className="col-span-2 flex items-end">
                    <Button onClick={applyFilters} className="w-full">
                      应用筛选
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedCustomerIds.length === (filteredCustomers?.length || 0) && filteredCustomers && filteredCustomers.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCustomerIds(filteredCustomers?.map((c: any) => c.id) || []);
                          } else {
                            setSelectedCustomerIds([]);
                          }
                        }}
                        className="cursor-pointer"
                      />
                    </TableHead>
                    <TableHead>客户名</TableHead>
                    <TableHead>流量来源</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('accountBalance')}>
                      账户余额{getSortIcon('accountBalance')}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('firstOrderDate')}>
                      首次上课时间{getSortIcon('firstOrderDate')}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('totalSpent')}>
                      累计消费{getSortIcon('totalSpent')}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('classCount')}>
                      上课次数{getSortIcon('classCount')}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('lastOrderDate')}>
                      最后消费{getSortIcon('lastOrderDate')}
                    </TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : filteredCustomers && filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer: any) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedCustomerIds.includes(customer.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCustomerIds([...selectedCustomerIds, customer.id]);
                              } else {
                                setSelectedCustomerIds(selectedCustomerIds.filter(id => id !== customer.id));
                              }
                            }}
                            className="cursor-pointer"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{customer.name}</span>
                            {customer.allTags && customer.allTags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {customer.autoTags?.map((tag: string, idx: number) => (
                                  <Badge key={`auto-${idx}`} variant="default" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {customer.manualTags?.map((tag: string, idx: number) => (
                                  <Badge key={`manual-${idx}`} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.trafficSource ? (
                            <Badge variant="outline">{customer.trafficSource}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          ¥{Number(customer.accountBalance || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {customer.firstOrderDate 
                            ? formatDateBJ(customer.firstOrderDate) 
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium text-blue-600">
                          ¥{Number(customer.totalSpent || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium text-purple-600">
                          {customer.classCount || 0}次
                        </TableCell>
                        <TableCell>
                          {customer.lastOrderDate ? formatDateBJ(customer.lastOrderDate) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetail(customer)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(customer.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? "未找到匹配的客户" : "暂无客户数据"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 新增客户对话框 */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增客户</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">客户姓名 *</Label>
                <Input id="name" {...register("name")} placeholder="请输入客户姓名" />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="wechat">微信号 *</Label>
                <Input id="wechat" {...register("wechat")} placeholder="请输入微信号" />
                {errors.wechat && <p className="text-sm text-destructive mt-1">{errors.wechat.message}</p>}
              </div>
              <div>
                <Label htmlFor="phone">联系电话</Label>
                <Input id="phone" {...register("phone")} placeholder="请输入联系电话" />
              </div>
              <div>
                <Label htmlFor="trafficSource">流量来源</Label>
                <Input id="trafficSource" {...register("trafficSource")} placeholder="请输入流量来源" />
              </div>
              <div>
                <Label htmlFor="notes">备注</Label>
                <Input id="notes" {...register("notes")} placeholder="请输入备注信息" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={createCustomer.isPending}>
                  {createCustomer.isPending ? "创建中..." : "创建"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 编辑客户对话框 */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑客户</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">客户姓名 *</Label>
                <Input id="edit-name" {...register("name")} placeholder="请输入客户姓名" />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="edit-wechat">微信号 *</Label>
                <Input id="edit-wechat" {...register("wechat")} placeholder="请输入微信号" />
                {errors.wechat && <p className="text-sm text-destructive mt-1">{errors.wechat.message}</p>}
              </div>
              <div>
                <Label htmlFor="edit-phone">联系电话</Label>
                <Input id="edit-phone" {...register("phone")} placeholder="请输入联系电话" />
              </div>
              <div>
                <Label htmlFor="edit-trafficSource">流量来源</Label>
                <Input id="edit-trafficSource" {...register("trafficSource")} placeholder="请输入流量来源" />
              </div>
              <div>
                <Label htmlFor="edit-notes">备注</Label>
                <Input id="edit-notes" {...register("notes")} placeholder="请输入备注信息" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={updateCustomer.isPending}>
                  {updateCustomer.isPending ? "保存中..." : "保存"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 客户详情对话框 */}
        <CustomerDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          customer={selectedCustomer}
        />
      </div>
    </DashboardLayout>
  );
}

// 客户详情对话框组件
function CustomerDetailDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any;
}) {
  const { data: orders } = trpc.orders.list.useQuery(undefined, {
    enabled: open && !!customer,
  });
  const { data: schedules } = trpc.schedules.listWithOrderInfo.useQuery(undefined, {
    enabled: open && !!customer,
  });
  // const { data: transactions } = trpc.customers.getTransactions.useQuery(
  //   { customerId: customer?.id },
  //   { enabled: open && !!customer }
  // );
  const transactions = undefined;

  if (!customer) return null;

  const customerOrders = orders?.filter((order) => 
    order.customerId === customer.id || order.customerName === customer.name
  ) || [];
  const customerSchedules = schedules?.filter((schedule: any) => schedule.customerId === customer.id) || [];

  const totalSpent = customerOrders.reduce(
    (sum, order) => sum + parseFloat(order.paymentAmount || "0"),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>客户详情 - {customer.name}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="orders">关联订单</TabsTrigger>
            <TabsTrigger value="analysis">消费分析</TabsTrigger>
            <TabsTrigger value="tags">标签管理</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
          {/* 基本信息 */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">客户姓名</p>
                <p className="font-medium">{customer.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">联系电话</p>
                <p className="font-medium">{customer.phone || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">微信号</p>
                <p className="font-medium">{customer.wechatId || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">流量来源</p>
                <p className="font-medium">{customer.trafficSource || "-"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">备注</p>
                <p className="font-medium">{customer.notes || "-"}</p>
              </div>
            </CardContent>
          </Card>

          {/* 消费统计 */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">账户余额</p>
                <p className="text-2xl font-bold text-green-600">¥{Number(customer.accountBalance || 0).toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">总消费金额</p>
                <p className="text-2xl font-bold">￥{totalSpent.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">上课次数</p>
                <p className="text-2xl font-bold text-purple-600">{customerOrders.length}次</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">课程排课</p>
                <p className="text-2xl font-bold">{customerSchedules.length}次</p>
              </CardContent>
            </Card>
          </div>
          
          {/* 充值按钮 */}
          <div className="flex justify-end">

          </div>

          {/* 订单历史 */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">订单历史</CardTitle>
            </CardHeader>
            <CardContent>
              {customerOrders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>订单编号</TableHead>
                      <TableHead>支付金额</TableHead>
                      <TableHead>支付时间</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderNo}</TableCell>
                        <TableCell>￥{order.paymentAmount}</TableCell>
                        <TableCell>
                          {order.paymentDate
                            ? formatDateBJ(order.paymentDate)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.status === "paid" ? "default" : "secondary"}>
                            {order.status === "paid" ? "已支付" : order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-4 text-muted-foreground">暂无订单记录</p>
              )}
            </CardContent>
          </Card>

          {/* 账户流水 */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">账户流水</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center py-4 text-muted-foreground">账户流水功能暂未启用</p>
            </CardContent>
          </Card>
          
          {/* 排课记录 */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">排课记录</CardTitle>
            </CardHeader>
            <CardContent>
              {customerSchedules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>课程类型</TableHead>
                      <TableHead>开始时间</TableHead>
                      <TableHead>地点</TableHead>
                      <TableHead>老师</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerSchedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">{schedule.courseType}</TableCell>
                        <TableCell>
                          {formatDateTimeBJ(schedule.startTime)}
                        </TableCell>
                        <TableCell>{schedule.location || "-"}</TableCell>
                        <TableCell>{schedule.teacherName || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-4 text-muted-foreground">暂无排课记录</p>
              )}
            </CardContent>
          </Card>
          </TabsContent>
          
          <TabsContent value="orders" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">关联订单列表</CardTitle>
              </CardHeader>
              <CardContent>
                {customerOrders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>订单号</TableHead>
                        <TableHead>支付金额</TableHead>
                        <TableHead>订单状态</TableHead>
                        <TableHead>创建时间</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNo}</TableCell>
                          <TableCell className="text-green-600">¥{Number(order.paymentAmount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                              {order.status === "completed" ? "已完成" : "进行中"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDateBJ(order.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">暂无订单记录</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analysis" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">RFM分析</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">消费分析功能开发中...</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="tags" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">标签管理</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">标签管理功能开发中...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


