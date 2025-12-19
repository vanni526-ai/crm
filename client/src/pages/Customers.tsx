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
import { Plus, Search, Edit, Trash2, Eye, Phone, Mail, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
  const { data: customers, isLoading } = trpc.customers.list.useQuery();
  const createCustomer = trpc.customers.create.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate();
      toast.success("客户创建成功");
      setCreateOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.message || "创建失败");
    },
  });
  const updateCustomer = trpc.customers.update.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate();
      toast.success("客户更新成功");
      setEditOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.message || "更新失败");
    },
  });
  const deleteCustomer = trpc.customers.delete.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate();
      toast.success("客户删除成功");
    },
    onError: (error) => {
      toast.error(error.message || "删除失败");
    },
  });

  const batchDeleteCustomers = trpc.customers.batchDelete.useMutation({
    onSuccess: (data) => {
      utils.customers.list.invalidate();
      toast.success(`批量删除成功，共删除 ${data.count} 个客户`);
      setSelectedCustomerIds([]);
    },
    onError: (error) => {
      toast.error(error.message || "批量删除失败");
    },
  });

  const importFromOrders = trpc.customers.importFromOrders.useMutation({
    onSuccess: (data) => {
      utils.customers.list.invalidate();
      toast.success(
        `导入完成！成功: ${data.success} 个，跳过: ${data.skipped} 个，失败: ${data.failed} 个`
      );
    },
    onError: (error) => {
      toast.error(error.message || "导入失败");
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);

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
            <h1 className="text-3xl font-bold">客户管理</h1>
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
              onClick={() => {
                if (confirm("确定要从订单列表中自动导入客户吗？"))
                  importFromOrders.mutate();
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

        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="搜索客户姓名、电话、微信..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
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
                    <TableHead>账户余额</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>累计消费</TableHead>
                    <TableHead>最后消费</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
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
                        <TableCell>{new Date(customer.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium text-blue-600">
                          ¥{Number(customer.totalSpent || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : "-"}
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
  const { data: schedules } = trpc.schedules.list.useQuery(undefined, {
    enabled: open && !!customer,
  });
  const { data: transactions } = trpc.customers.getTransactions.useQuery(
    { customerId: customer?.id },
    { enabled: open && !!customer }
  );

  if (!customer) return null;

  const customerOrders = orders?.filter((order) => order.customerId === customer.id) || [];
  const customerSchedules = schedules?.filter((schedule) => schedule.customerId === customer.id) || [];

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
                <p className="text-sm text-muted-foreground">订单数量</p>
                <p className="text-2xl font-bold">{customerOrders.length}</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">课程次数</p>
                <p className="text-2xl font-bold">{customerSchedules.length}</p>
              </CardContent>
            </Card>
          </div>
          
          {/* 充值按钮 */}
          <div className="flex justify-end">
            <RechargeButton customerId={customer.id} customerName={customer.name} />
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
                            ? new Date(order.paymentDate).toLocaleDateString()
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
              {transactions && transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>类型</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>余额变动</TableHead>
                      <TableHead>备注</TableHead>
                      <TableHead>时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <Badge variant={tx.type === "recharge" ? "default" : tx.type === "consume" ? "destructive" : "secondary"}>
                            {tx.type === "recharge" ? "充值" : tx.type === "consume" ? "消费" : "退款"}
                          </Badge>
                        </TableCell>
                        <TableCell className={Number(tx.amount) > 0 ? "text-green-600" : "text-red-600"}>
                          {Number(tx.amount) > 0 ? "+" : ""}¥{Number(tx.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          ¥{Number(tx.balanceBefore).toFixed(2)} → ¥{Number(tx.balanceAfter).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm">{tx.notes || "-"}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(tx.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-4 text-muted-foreground">暂无流水记录</p>
              )}
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
                          {new Date(schedule.startTime).toLocaleString()}
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
                          <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
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

// 充值按钮组件
function RechargeButton({ customerId, customerName }: { customerId: number; customerName: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const utils = trpc.useUtils();
  
  const rechargeMutation = trpc.customers.recharge.useMutation({
    onSuccess: () => {
      toast.success("充值成功");
      setOpen(false);
      setAmount("");
      setNotes("");
      utils.customers.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "充值失败");
    },
  });
  
  const handleRecharge = () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("请输入有效的充值金额");
      return;
    }
    rechargeMutation.mutate({
      customerId,
      amount: amountNum,
      notes: notes || undefined,
    });
  };
  
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        充值
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>客户充值 - {customerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">充值金额 *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="请输入充值金额"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">备注</Label>
              <Input
                id="notes"
                placeholder="请输入备注信息(可选)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleRecharge} disabled={rechargeMutation.isPending}>
              {rechargeMutation.isPending ? "充值中..." : "确认充值"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
