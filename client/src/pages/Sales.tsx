import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Plus, Download, Upload, TrendingUp, Zap, BarChart3, Calendar, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function Sales() {
  const [, navigate] = useLocation();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSalesperson, setEditingSalesperson] = useState<any>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isSmartRegisterOpen, setIsSmartRegisterOpen] = useState(false);
  
  // 时间筛选和排序状态
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [sortField, setSortField] = useState<string>("orderCount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // 查询销售人员列表
  const { data: salespersons, isLoading, refetch } = trpc.salespersons.list.useQuery();
  
  // 查询所有销售人员的统计数据
  const { data: allStatistics } = trpc.salespersons.getStatistics.useQuery({});

  // 创建销售人员
  const createMutation = trpc.salespersons.create.useMutation({
    onSuccess: () => {
      toast.success("销售人员创建成功");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 更新销售人员
  const updateMutation = trpc.salespersons.update.useMutation({
    onSuccess: () => {
      toast.success("销售人员更新成功");
      setEditingSalesperson(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // 删除功能已移除：请在用户管理页面取消销售角色

  // 更新所有销售人员的销售数据
  const updateStatsMutation = trpc.salespersons.updateAllStats.useMutation({
    onSuccess: (result) => {
      toast.success(result.message || "销售数据更新成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // 获取时间范围
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (dateFilter) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        startDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      case "custom":
        if (customStartDate) startDate = new Date(customStartDate);
        if (customEndDate) {
          const endDateStr = customEndDate + " 23:59:59";
          endDate = new Date(endDateStr);
        }
        break;
      default:
        return { startDate: null, endDate: null };
    }

    return { startDate, endDate };
  };

  // 过滤和排序销售人员
  const filteredAndSortedSalespersons = useMemo(() => {
    if (!salespersons || !allStatistics?.orders) return [];

    const { startDate, endDate } = getDateRange();

    // 过滤订单
    const filteredOrders = allStatistics.orders.filter((order) => {
      if (startDate && endDate && order.classDate) {
        const orderDate = new Date(order.classDate);
        if (orderDate < startDate || orderDate > endDate) return false;
      }
      return true;
    });

    // 计算每个销售人员的统计数据
    const salesWithStats = salespersons.map((sp) => {
      const spOrders = filteredOrders.filter(
        (o) =>
          o.salespersonId === sp.id ||
          o.salesPerson === sp.name ||
          o.salesPerson === sp.nickname
      );
      const orderCount = spOrders.length;
      const totalAmount = spOrders.reduce((sum, o) => sum + Number(o.paymentAmount), 0);

      return {
        ...sp,
        orderCount,
        totalAmount,
      };
    });

    // 关键词过滤
    const keywordFiltered = salesWithStats.filter((sp) => {
      if (!searchKeyword) return true;
      const keyword = searchKeyword.toLowerCase();
      return (
        sp.name?.toLowerCase().includes(keyword) ||
        sp.nickname?.toLowerCase().includes(keyword) ||
        sp.phone?.toLowerCase().includes(keyword) ||
        sp.wechat?.toLowerCase().includes(keyword)
      );
    });

    // 排序
    return keywordFiltered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "orderCount":
          aValue = a.orderCount;
          bValue = b.orderCount;
          break;
        case "totalAmount":
          aValue = a.totalAmount;
          bValue = b.totalAmount;
          break;
        case "commissionRate":
          aValue = a.commissionRate || 0;
          bValue = b.commissionRate || 0;
          break;

        case "name":
          aValue = a.name || "";
          bValue = b.name || "";
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });
  }, [salespersons, allStatistics, searchKeyword, dateFilter, customStartDate, customEndDate, sortField, sortOrder]);

  // 排序处理
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // 获取排序图标
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="w-4 h-4 ml-1 inline" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1 inline" />
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // 处理别名字段，将逗号分隔的字符串转换为JSON数组
    const aliasesInput = formData.get("aliases") as string;
    const aliasesArray = aliasesInput
      ? aliasesInput.split(',').map(a => a.trim()).filter(a => a.length > 0)
      : [];
    
    const data = {
      name: formData.get("name") as string,
      nickname: formData.get("nickname") as string || undefined,
      aliases: aliasesArray.length > 0 ? JSON.stringify(aliasesArray) : undefined,
      phone: formData.get("phone") as string || undefined,
      email: formData.get("email") as string || undefined,
      wechat: formData.get("wechat") as string || undefined,
      commissionRate: formData.get("commissionRate") ? parseFloat(formData.get("commissionRate") as string) : undefined,
      city: formData.get("city") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    };

    if (editingSalesperson) {
      updateMutation.mutate({ id: editingSalesperson.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  // handleDelete 函数已移除

  // 导出CSV
  const handleExport = () => {
    if (!salespersons || salespersons.length === 0) {
      toast.error("没有数据可导出");
      return;
    }

    // 创建CSV内容
    const headers = ["姓名", "花名", "电话", "邮箱", "微信号", "提成比例(%)", "状态", "备注"];
    const rows = salespersons.map(sp => [
      sp.name || "",
      sp.nickname || "",
      sp.phone || "",
      sp.email || "",
      sp.wechat || "",
      sp.commissionRate || "",
      sp.isActive ? "在职" : "离职",
      sp.notes || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // 下载文件
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `销售人员列表_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`已导出 ${salespersons.length} 条记录`);
  };

  // 处理导入文件
  const handleImport = async () => {
    if (!importFile) {
      toast.error("请选择要导入的CSV文件");
      return;
    }

    try {
      const text = await importFile.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("文件格式错误，至少需要表头和一条数据");
        return;
      }

      // 跳过表头行
      const dataLines = lines.slice(1);
      const importData = [];

      for (const line of dataLines) {
        // 解析CSV行（处理引号）
        const matches = line.match(/"([^"]*)"|([^,]+)/g);
        if (!matches || matches.length < 1) continue;

        const values = matches.map(v => v.replace(/^"|"$/g, "").trim());
        const [name, nickname, phone, email, wechat, commissionRate, city, status, notes] = values;

        if (!name) continue; // 姓名是必填项

        importData.push({
          name,
          nickname: nickname || undefined,
          phone: phone || undefined,
          email: email || undefined,
          wechat: wechat || undefined,
          commissionRate: commissionRate ? parseFloat(commissionRate) : undefined,
          city: city || undefined,
          notes: notes || undefined,
        });
      }

      if (importData.length === 0) {
        toast.error("没有有效的数据可导入");
        return;
      }

      // 批量创建
      let successCount = 0;
      let failCount = 0;

      for (const data of importData) {
        try {
          await createMutation.mutateAsync(data);
          successCount++;
        } catch (error) {
          failCount++;
          console.error("导入失败:", data, error);
        }
      }

      toast.success(`导入完成！成功: ${successCount} 条，失败: ${failCount} 条`);
      setIsImportDialogOpen(false);
      setImportFile(null);
      refetch();
    } catch (error) {
      toast.error("导入失败，请检查文件格式");
      console.error(error);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">销售管理</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/sales-city-performance")}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            城市业绩
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => updateStatsMutation.mutate()}
            disabled={updateStatsMutation.isPending}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            {updateStatsMutation.isPending ? "更新中..." : "更新销售数据"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsSmartRegisterOpen(true)}>
            <Zap className="w-4 h-4 mr-2" />
            智能登记
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            导入
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新建销售
          </Button>
        </div>
      </div>

      {/* 搜索栏 */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="搜索销售人员姓名、花名、电话、微信..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* 时间筛选器 */}
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">时间筛选:</span>
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择时间范围" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部时间</SelectItem>
                <SelectItem value="today">今日</SelectItem>
                <SelectItem value="week">本周</SelectItem>
                <SelectItem value="month">本月</SelectItem>
                <SelectItem value="year">今年</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
            
            {dateFilter === "custom" && (
              <>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-[160px]"
                  placeholder="开始日期"
                />
                <span className="text-muted-foreground">至</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-[160px]"
                  placeholder="结束日期"
                />
              </>
            )}
          </div>
        </div>
      </Card>

      {/* 销售人员列表 */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort("name")}
              >
                姓名{getSortIcon("name")}
              </TableHead>
              <TableHead>花名</TableHead>
              <TableHead>电话</TableHead>
              <TableHead>微信</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort("commissionRate")}
              >
                提成比例{getSortIcon("commissionRate")}
              </TableHead>

              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort("orderCount")}
              >
                订单数{getSortIcon("orderCount")}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort("totalAmount")}
              >
                销售额{getSortIcon("totalAmount")}
              </TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            ) : filteredAndSortedSalespersons?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  暂无销售人员
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedSalespersons?.map((sp: any) => (
                <TableRow key={sp.id}>
                  <TableCell className="font-medium">{sp.name}</TableCell>
                  <TableCell>{sp.nickname || "-"}</TableCell>
                  <TableCell>{sp.phone || "-"}</TableCell>
                  <TableCell>{sp.wechat || "-"}</TableCell>
                  <TableCell>{sp.commissionRate ? `${sp.commissionRate}%` : "-"}</TableCell>

                  <TableCell>{sp.orderCount || 0}</TableCell>
                  <TableCell>¥{sp.totalAmount?.toFixed(2) || "0.00"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      sp.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {sp.isActive ? "在职" : "离职"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSalesperson(sp)}
                      >
                        编辑
                      </Button>
                      {/* 删除按钮已移除：请在用户管理页面取消销售角色 */}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 创建/编辑对话框 */}
      <Dialog open={isCreateDialogOpen || !!editingSalesperson} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingSalesperson(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSalesperson ? "编辑销售人员" : "新建销售人员"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">姓名 *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingSalesperson?.name}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nickname">花名</Label>
                <Input
                  id="nickname"
                  name="nickname"
                  defaultValue={editingSalesperson?.nickname}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="aliases">别名（多个别名用逗号分隔）</Label>
                <Input
                  id="aliases"
                  name="aliases"
                  placeholder="例如：ivy,山竹,妖渊"
                  defaultValue={editingSalesperson?.aliases ? JSON.parse(editingSalesperson.aliases).join(',') : ''}
                />
                <p className="text-xs text-muted-foreground">
                  别名用于智能登记时识别销售人员，多个别名用逗号分隔
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">电话</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={editingSalesperson?.phone}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingSalesperson?.email}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wechat">微信号</Label>
                <Input
                  id="wechat"
                  name="wechat"
                  defaultValue={editingSalesperson?.wechat}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="commissionRate">提成比例 (%)</Label>
                <Input
                  id="commissionRate"
                  name="commissionRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  defaultValue={editingSalesperson?.commissionRate}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">备注</Label>
                <Input
                  id="notes"
                  name="notes"
                  defaultValue={editingSalesperson?.notes}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingSalesperson(null);
                }}
              >
                取消
              </Button>
              <Button type="submit">
                {editingSalesperson ? "保存" : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 导入对话框 */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导入销售人员</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>选择CSV文件</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-muted-foreground">
                CSV文件格式：姓名,花名,电话,邮箱,微信号,提成比例(%),城市,状态,备注
              </p>
              <p className="text-sm text-muted-foreground">
                示例：张三,小张,13800138000,zhang@example.com,zhangsan_wx,10,北京,在职,优秀销售
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportFile(null);
              }}
            >
              取消
            </Button>
            <Button onClick={handleImport}>
              开始导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 智能登记对话框 */}
      <Dialog open={isSmartRegisterOpen} onOpenChange={setIsSmartRegisterOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>智能登记销售业绩</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm text-muted-foreground">
              快速记录销售成交信息，系统将自动创建订单并关联销售人员。
            </div>
            <div className="grid gap-2">
              <Label>销售人员</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">选择销售人员</option>
                {salespersons?.filter(sp => sp.isActive).map(sp => (
                  <option key={sp.id} value={sp.id}>{sp.name} {sp.nickname ? `(${sp.nickname})` : ""}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>客户名称</Label>
              <Input placeholder="输入客户姓名" />
            </div>
            <div className="grid gap-2">
              <Label>课程名称</Label>
              <Input placeholder="输入课程名称" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>课程金额</Label>
                <Input type="number" placeholder="0.00" />
              </div>
              <div className="grid gap-2">
                <Label>支付金额</Label>
                <Input type="number" placeholder="0.00" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>备注</Label>
              <Input placeholder="选填" />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSmartRegisterOpen(false)}
            >
              取消
            </Button>
            <Button onClick={() => {
              toast.info("此功能将在后续版本完善，请使用订单管理中的智能登记功能");
              setIsSmartRegisterOpen(false);
            }}>
              创建订单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
