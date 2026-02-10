import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Search, Calendar } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// 费用明细Tab组件
function ExpenseManagementTab({ partnerId }: { partnerId: number }) {
  const utils = trpc.useUtils();
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  
  // 查询所有城市
  const { data: allCities } = trpc.city.getAll.useQuery();
  
  // 查询费用明细列表
  const { data: expenses, isLoading } = trpc.partnerManagement.getExpenses.useQuery(
    { partnerId },
    { enabled: !!partnerId }
  );
  
  // 创建/更新费用明细
  const upsertExpenseMutation = trpc.partnerManagement.upsertExpense.useMutation({
    onSuccess: () => {
      toast.success("保存成功");
      setAddExpenseOpen(false);
      utils.partnerManagement.getExpenses.invalidate({ partnerId });
      setSelectedCityId(null);
      setSelectedMonth("");
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });
  
  const handleSubmitExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!selectedCityId || !selectedMonth) {
      toast.error("请选择城市和月份");
      return;
    }
    
    upsertExpenseMutation.mutate({
      partnerId,
      cityId: selectedCityId,
      month: selectedMonth,
      rentFee: formData.get("rentFee") as string || "0",
      propertyFee: formData.get("propertyFee") as string || "0",
      utilityFee: formData.get("utilityFee") as string || "0",
      consumablesFee: formData.get("consumablesFee") as string || "0",
      teacherFee: formData.get("teacherFee") as string || "0",
      transportFee: formData.get("transportFee") as string || "0",
      otherFee: formData.get("otherFee") as string || "0",
      deferredPayment: formData.get("deferredPayment") as string || "0",
      notes: formData.get("notes") as string || "",
    });
  };
  
  // 按月份分组费用明细
  const expensesByMonth = expenses?.reduce((acc: any, expense: any) => {
    const monthKey = new Date(expense.month).toISOString().slice(0, 7);
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(expense);
    return acc;
  }, {});
  
  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">加载中...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">费用明细管理</h3>
        <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              添加费用记录
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>添加月度费用</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>城市 *</Label>
                  <Select value={selectedCityId?.toString() || ""} onValueChange={(v) => setSelectedCityId(Number(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择城市" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCities?.map((city: any) => (
                        <SelectItem key={city.id} value={city.id.toString()}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>月份 *</Label>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rentFee">房租</Label>
                  <Input id="rentFee" name="rentFee" type="number" step="0.01" defaultValue="0" />
                </div>
                <div>
                  <Label htmlFor="propertyFee">物业</Label>
                  <Input id="propertyFee" name="propertyFee" type="number" step="0.01" defaultValue="0" />
                </div>
                <div>
                  <Label htmlFor="utilityFee">水电</Label>
                  <Input id="utilityFee" name="utilityFee" type="number" step="0.01" defaultValue="0" />
                </div>
                <div>
                  <Label htmlFor="consumablesFee">耗材</Label>
                  <Input id="consumablesFee" name="consumablesFee" type="number" step="0.01" defaultValue="0" />
                </div>
                <div>
                  <Label htmlFor="teacherFee">老师费用</Label>
                  <Input id="teacherFee" name="teacherFee" type="number" step="0.01" defaultValue="0" />
                </div>
                <div>
                  <Label htmlFor="transportFee">车费</Label>
                  <Input id="transportFee" name="transportFee" type="number" step="0.01" defaultValue="0" />
                </div>
                <div>
                  <Label htmlFor="otherFee">其他费用</Label>
                  <Input id="otherFee" name="otherFee" type="number" step="0.01" defaultValue="0" />
                </div>
                <div>
                  <Label htmlFor="deferredPayment">合同后付款</Label>
                  <Input id="deferredPayment" name="deferredPayment" type="number" step="0.01" defaultValue="0" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">备注</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAddExpenseOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={upsertExpenseMutation.isPending}>
                  {upsertExpenseMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* 费用明细列表 */}
      {expensesByMonth && Object.keys(expensesByMonth).length > 0 ? (
        <div className="space-y-6">
          {Object.keys(expensesByMonth)
            .sort()
            .reverse()
            .map((monthKey) => (
              <div key={monthKey}>
                <h4 className="text-md font-semibold mb-3">{monthKey}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>城市</TableHead>
                      <TableHead className="text-right">房租</TableHead>
                      <TableHead className="text-right">物业</TableHead>
                      <TableHead className="text-right">水电</TableHead>
                      <TableHead className="text-right">耗材</TableHead>
                      <TableHead className="text-right">老师费用</TableHead>
                      <TableHead className="text-right">车费</TableHead>
                      <TableHead className="text-right">其他</TableHead>
                      <TableHead className="text-right">后付款</TableHead>
                      <TableHead className="text-right">总费用</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expensesByMonth[monthKey].map((expense: any) => {
                      const totalFee = 
                        parseFloat(expense.rentFee || "0") +
                        parseFloat(expense.propertyFee || "0") +
                        parseFloat(expense.utilityFee || "0") +
                        parseFloat(expense.consumablesFee || "0") +
                        parseFloat(expense.teacherFee || "0") +
                        parseFloat(expense.transportFee || "0") +
                        parseFloat(expense.otherFee || "0") +
                        parseFloat(expense.deferredPayment || "0");
                      
                      return (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.cityId}</TableCell>
                          <TableCell className="text-right">￥{parseFloat(expense.rentFee || "0").toFixed(2)}</TableCell>
                          <TableCell className="text-right">￥{parseFloat(expense.propertyFee || "0").toFixed(2)}</TableCell>
                          <TableCell className="text-right">￥{parseFloat(expense.utilityFee || "0").toFixed(2)}</TableCell>
                          <TableCell className="text-right">￥{parseFloat(expense.consumablesFee || "0").toFixed(2)}</TableCell>
                          <TableCell className="text-right">￥{parseFloat(expense.teacherFee || "0").toFixed(2)}</TableCell>
                          <TableCell className="text-right">￥{parseFloat(expense.transportFee || "0").toFixed(2)}</TableCell>
                          <TableCell className="text-right">￥{parseFloat(expense.otherFee || "0").toFixed(2)}</TableCell>
                          <TableCell className="text-right">￥{parseFloat(expense.deferredPayment || "0").toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">￥{totalFee.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">暂无费用记录</p>
      )}
    </div>
  );
}

// 城市管理Tab组件
function CityManagementTab({ partnerId }: { partnerId: number }) {
  const utils = trpc.useUtils();
  const [selectedCityIds, setSelectedCityIds] = useState<number[]>([]);
  
  // 查询所有城市
  const { data: allCities } = trpc.city.getAll.useQuery();
  
  // 查询合伙人已分配的城市
  const { data: partnerCities, isLoading: citiesLoading } = trpc.partnerManagement.getPartnerCities.useQuery(
    { partnerId },
    { enabled: !!partnerId }
  );
  
  // 查询城市订单统计
  const { data: cityStats, isLoading: statsLoading } = trpc.partnerManagement.getCityOrderStats.useQuery(
    { partnerId },
    { enabled: !!partnerId }
  );
  
  // 分配城市
  const assignCitiesMutation = trpc.partnerManagement.assignCities.useMutation({
    onSuccess: () => {
      toast.success("城市分配成功");
      utils.partnerManagement.getPartnerCities.invalidate({ partnerId });
      utils.partnerManagement.getCityOrderStats.invalidate({ partnerId });
      setSelectedCityIds([]);
    },
    onError: (error) => {
      toast.error(`分配失败: ${error.message}`);
    },
  });
  
  // 初始化已选中的城市
  useEffect(() => {
    if (partnerCities && partnerCities.length > 0) {
      setSelectedCityIds(partnerCities.map(pc => pc.cityId!));
    }
  }, [partnerCities]);
  
  const handleCityToggle = (cityId: number) => {
    setSelectedCityIds(prev => 
      prev.includes(cityId) 
        ? prev.filter(id => id !== cityId)
        : [...prev, cityId]
    );
  };
  
  const handleSaveCities = () => {
    assignCitiesMutation.mutate({
      partnerId,
      cityIds: selectedCityIds,
    });
  };
  
  if (citiesLoading || statsLoading) {
    return <div className="p-4 text-center text-muted-foreground">加载中...</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* 城市选择 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">分配城市</h3>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {allCities?.map((city: any) => (
            <label
              key={city.id}
              className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedCityIds.includes(city.id)}
                onChange={() => handleCityToggle(city.id)}
                className="w-4 h-4"
              />
              <span className="text-sm">{city.name}</span>
            </label>
          ))}
        </div>
        <Button onClick={handleSaveCities} disabled={assignCitiesMutation.isPending}>
          {assignCitiesMutation.isPending ? "保存中..." : "保存城市分配"}
        </Button>
      </div>
      
      {/* 城市订单统计 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">城市订单统计</h3>
        {cityStats && cityStats.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>城市</TableHead>
                <TableHead className="text-right">订单数</TableHead>
                <TableHead className="text-right">课程金额</TableHead>
                <TableHead className="text-right">老师费用</TableHead>
                <TableHead className="text-right">车费</TableHead>
                <TableHead className="text-right">合伙人费</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cityStats.map((stat) => (
                <TableRow key={stat.cityId}>
                  <TableCell className="font-medium">{stat.cityName}</TableCell>
                  <TableCell className="text-right">{stat.orderCount}</TableCell>
                  <TableCell className="text-right">￥{parseFloat(stat.totalAmount).toFixed(2)}</TableCell>
                  <TableCell className="text-right">￥{parseFloat(stat.totalTeacherFee).toFixed(2)}</TableCell>
                  <TableCell className="text-right">￥{parseFloat(stat.totalTransportFee).toFixed(2)}</TableCell>
                  <TableCell className="text-right">￥{parseFloat(stat.totalPartnerFee).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">暂无订单数据</p>
        )}
      </div>
    </div>
  );
}

export default function PartnerManagement() {

  const utils = trpc.useUtils();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  
  // 时间筛选器状态
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  
  // 计算时间范围
  const getDateRange = () => {
    const now = new Date();
    let startDate = "";
    let endDate = "";
    
    if (dateFilter === "thisMonth") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    } else if (dateFilter === "thisYear") {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
      endDate = new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0];
    } else if (dateFilter === "custom") {
      startDate = customStartDate;
      endDate = customEndDate;
    }
    
    return { startDate, endDate };
  };
  
  const { startDate, endDate } = getDateRange();

  // 查询合伙人统计数据
  const { data: partnerStats, isLoading } = trpc.partnerManagement.getPartnerStats.useQuery(
    startDate || endDate ? { startDate, endDate } : undefined
  );
  
  // 查询所有合伙人(用于创建/编辑)
  const { data: partners } = trpc.partnerManagement.list.useQuery();

  // 查询单个合伙人详情
  const { data: partnerDetail } = trpc.partnerManagement.getById.useQuery(
    { id: selectedPartnerId! },
    { enabled: !!selectedPartnerId }
  );

  // 创建合伙人
  const createMutation = trpc.partnerManagement.create.useMutation({
    onSuccess: () => {
      toast.success("创建成功");
      setCreateOpen(false);
      utils.partnerManagement.list.invalidate();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 更新合伙人
  const updateMutation = trpc.partnerManagement.update.useMutation({
    onSuccess: () => {
      toast.success("更新成功");
      setEditOpen(false);
      utils.partnerManagement.list.invalidate();
      if (selectedPartnerId) {
        utils.partnerManagement.getById.invalidate({ id: selectedPartnerId });
      }
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // 删除合伙人
  const deleteMutation = trpc.partnerManagement.delete.useMutation({
    onSuccess: () => {
      toast.success("删除成功");
      utils.partnerManagement.list.invalidate();
      setSelectedPartnerId(null);
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });
  const filteredPartnerStats = partnerStats?.filter((stat) =>
    stat.partnerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createMutation.mutate({
      userId: Number(formData.get("userId")),
      name: formData.get("name") as string,
      profitRatio: formData.get("profitRatio") as string,
      profitRule: formData.get("profitRule") as string,
      brandFee: formData.get("brandFee") as string || "0",
      techServiceFee: formData.get("techServiceFee") as string || "0",
      deferredPaymentTotal: formData.get("deferredPaymentTotal") as string || "0",
      deferredPaymentRule: formData.get("deferredPaymentRule") as string || "",
      contractStartDate: formData.get("contractStartDate") as string,
      contractEndDate: formData.get("contractEndDate") as string,
      accountName: formData.get("accountName") as string || "",
      bankName: formData.get("bankName") as string || "",
      accountNumber: formData.get("accountNumber") as string || "",
      notes: formData.get("notes") as string || "",
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!partnerDetail) return;
    
    const formData = new FormData(e.currentTarget);
    
    updateMutation.mutate({
      id: partnerDetail.id,
      profitRatio: formData.get("profitRatio") as string,
      profitRule: formData.get("profitRule") as string,
      brandFee: formData.get("brandFee") as string,
      techServiceFee: formData.get("techServiceFee") as string,
      deferredPaymentTotal: formData.get("deferredPaymentTotal") as string,
      deferredPaymentRule: formData.get("deferredPaymentRule") as string,
      contractStartDate: formData.get("contractStartDate") as string,
      contractEndDate: formData.get("contractEndDate") as string,
      accountName: formData.get("accountName") as string,
      bankName: formData.get("bankName") as string,
      accountNumber: formData.get("accountNumber") as string,
      notes: formData.get("notes") as string,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这个合伙人吗？")) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return <div className="p-8">加载中...</div>;
  }

  return (
    <DashboardLayout>
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">合伙人管理</h1>
      </div>

      {/* 搜索栏和筛选器 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索合伙人姓名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="选择时间范围" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部时间</SelectItem>
                  <SelectItem value="thisMonth">本月</SelectItem>
                  <SelectItem value="thisYear">今年</SelectItem>
                  <SelectItem value="custom">自定义</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {dateFilter === "custom" && (
              <>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-[150px]"
                  placeholder="开始日期"
                />
                <span className="text-muted-foreground">至</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-[150px]"
                  placeholder="结束日期"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 合伙人列表 */}
      <Card>
        <CardHeader>
          <CardTitle>合伙人列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>城市</TableHead>
                <TableHead>订单数</TableHead>
                <TableHead>课程金额</TableHead>
                <TableHead>老师费用</TableHead>
                <TableHead>车费</TableHead>
                <TableHead>房租</TableHead>
                <TableHead>物业</TableHead>
                <TableHead>水电</TableHead>
                <TableHead>耗材</TableHead>
                <TableHead>后付款</TableHead>
                <TableHead>分红金额</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartnerStats?.map((stat) => (
                <TableRow key={stat.partnerId}>
                  <TableCell className="font-medium">{stat.partnerName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{stat.cities || "-"}</TableCell>
                  <TableCell>{stat.orderCount}</TableCell>
                  <TableCell>￥{Number(stat.courseAmount).toFixed(2)}</TableCell>
                  <TableCell>￥{Number(stat.teacherFee).toFixed(2)}</TableCell>
                  <TableCell>￥{Number(stat.transportFee).toFixed(2)}</TableCell>
                  <TableCell>￥{Number(stat.rentFee).toFixed(2)}</TableCell>
                  <TableCell>￥{Number(stat.propertyFee).toFixed(2)}</TableCell>
                  <TableCell>￥{Number(stat.utilityFee).toFixed(2)}</TableCell>
                  <TableCell>￥{Number(stat.consumablesFee).toFixed(2)}</TableCell>
                  <TableCell>￥{Number(stat.deferredPayment).toFixed(2)}</TableCell>
                  <TableCell className="font-semibold text-green-600">￥{Number(stat.partnerFee).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPartnerId(stat.partnerId);
                          setEditOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(stat.partnerId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 编辑对话框 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑合伙人 - {partnerDetail?.name}</DialogTitle>
          </DialogHeader>
          {partnerDetail && (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="basic">基本信息</TabsTrigger>
                <TabsTrigger value="contract">合同信息</TabsTrigger>
                <TabsTrigger value="cities">城市管理</TabsTrigger>
                <TabsTrigger value="orders">订单统计</TabsTrigger>
                <TabsTrigger value="expenses">费用明细</TabsTrigger>
                <TabsTrigger value="account">收款账户</TabsTrigger>
              </TabsList>

              <TabsContent value="basic">
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>姓名</Label>
                      <Input value={partnerDetail.name} disabled className="bg-muted" />
                    </div>
                    <div>
                      <Label htmlFor="profitRatio">利润分成比例 *</Label>
                      <Input
                        id="profitRatio"
                        name="profitRatio"
                        defaultValue={partnerDetail.profitRatio}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="profitRule">分成规则</Label>
                    <Textarea
                      id="profitRule"
                      name="profitRule"
                      defaultValue={partnerDetail.profitRule || ""}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">备注</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={partnerDetail.notes || ""}
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                      取消
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "保存中..." : "保存"}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="contract">
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="brandFee">品牌使用费</Label>
                      <Input
                        id="brandFee"
                        name="brandFee"
                        defaultValue={partnerDetail.brandFee || ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="techServiceFee">技术服务费</Label>
                      <Input
                        id="techServiceFee"
                        name="techServiceFee"
                        defaultValue={partnerDetail.techServiceFee || ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="deferredPaymentTotal">延期支付总额</Label>
                      <Input
                        id="deferredPaymentTotal"
                        name="deferredPaymentTotal"
                        defaultValue={partnerDetail.deferredPaymentTotal || ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="contractStartDate">合同开始日期</Label>
                      <Input
                        id="contractStartDate"
                        name="contractStartDate"
                        type="date"
                        defaultValue={
                          partnerDetail.contractStartDate
                            ? new Date(partnerDetail.contractStartDate).toISOString().split("T")[0]
                            : ""
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="contractEndDate">合同结束日期</Label>
                      <Input
                        id="contractEndDate"
                        name="contractEndDate"
                        type="date"
                        defaultValue={
                          partnerDetail.contractEndDate
                            ? new Date(partnerDetail.contractEndDate).toISOString().split("T")[0]
                            : ""
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="deferredPaymentRule">延期支付规则</Label>
                    <Textarea
                      id="deferredPaymentRule"
                      name="deferredPaymentRule"
                      defaultValue={partnerDetail.deferredPaymentRule || ""}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                      取消
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "保存中..." : "保存"}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="cities">
                <CityManagementTab partnerId={selectedPartnerId!} />
              </TabsContent>

              <TabsContent value="orders">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">订单统计功能开发中...</p>
                </div>
              </TabsContent>

              <TabsContent value="expenses">
                <ExpenseManagementTab partnerId={selectedPartnerId!} />
              </TabsContent>

              <TabsContent value="account">
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="accountName">账户名称</Label>
                      <Input
                        id="accountName"
                        name="accountName"
                        defaultValue={partnerDetail.accountName || ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bankName">开户行</Label>
                      <Input
                        id="bankName"
                        name="bankName"
                        defaultValue={partnerDetail.bankName || ""}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="accountNumber">账号</Label>
                      <Input
                        id="accountNumber"
                        name="accountNumber"
                        defaultValue={partnerDetail.accountNumber || ""}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                      取消
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "保存中..." : "保存"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
