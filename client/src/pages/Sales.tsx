import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
import { Search, Plus, Download, Upload, TrendingUp, Zap } from "lucide-react";

export default function Sales() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSalesperson, setEditingSalesperson] = useState<any>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isSmartRegisterOpen, setIsSmartRegisterOpen] = useState(false);

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

  // 删除销售人员
  const deleteMutation = trpc.salespersons.delete.useMutation({
    onSuccess: () => {
      toast.success("销售人员已删除");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  // 过滤销售人员
  const filteredSalespersons = salespersons?.filter((sp) => {
    if (!searchKeyword) return true;
    const keyword = searchKeyword.toLowerCase();
    return (
      sp.name?.toLowerCase().includes(keyword) ||
      sp.nickname?.toLowerCase().includes(keyword) ||
      sp.phone?.toLowerCase().includes(keyword) ||
      sp.wechat?.toLowerCase().includes(keyword)
    );
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      nickname: formData.get("nickname") as string || undefined,
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

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这个销售人员吗?")) {
      deleteMutation.mutate({ id });
    }
  };

  // 导出CSV
  const handleExport = () => {
    if (!salespersons || salespersons.length === 0) {
      toast.error("没有数据可导出");
      return;
    }

    // 创建CSV内容
    const headers = ["姓名", "花名", "电话", "邮箱", "微信号", "提成比例(%)", "城市", "状态", "备注"];
    const rows = salespersons.map(sp => [
      sp.name || "",
      sp.nickname || "",
      sp.phone || "",
      sp.email || "",
      sp.wechat || "",
      sp.commissionRate || "",
      sp.city || "",
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
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">销售管理</h1>
        <div className="flex gap-2">
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
      </Card>

      {/* 销售人员列表 */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>姓名</TableHead>
              <TableHead>花名</TableHead>
              <TableHead>电话</TableHead>
              <TableHead>微信</TableHead>
              <TableHead>提成比例</TableHead>
              <TableHead>城市</TableHead>
              <TableHead>订单数</TableHead>
              <TableHead>销售额</TableHead>
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
            ) : filteredSalespersons?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  暂无销售人员
                </TableCell>
              </TableRow>
            ) : (
              filteredSalespersons?.map((sp) => (
                <TableRow key={sp.id}>
                  <TableCell className="font-medium">{sp.name}</TableCell>
                  <TableCell>{sp.nickname || "-"}</TableCell>
                  <TableCell>{sp.phone || "-"}</TableCell>
                  <TableCell>{sp.wechat || "-"}</TableCell>
                  <TableCell>{sp.commissionRate ? `${sp.commissionRate}%` : "-"}</TableCell>
                  <TableCell>{sp.city || "-"}</TableCell>
                  <TableCell>
                    {allStatistics?.orders?.filter(o => o.salespersonId === sp.id).length || 0}
                  </TableCell>
                  <TableCell>
                    ¥{allStatistics?.orders
                      ?.filter(o => o.salespersonId === sp.id)
                      .reduce((sum, o) => sum + Number(o.paymentAmount), 0)
                      .toFixed(2) || "0.00"}
                  </TableCell>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sp.id)}
                      >
                        删除
                      </Button>
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
                <Label htmlFor="city">城市</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={editingSalesperson?.city}
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
  );
}
