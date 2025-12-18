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
import { Search, Plus, Download, Upload, TrendingUp } from "lucide-react";

export default function Sales() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSalesperson, setEditingSalesperson] = useState<any>(null);

  // 查询销售人员列表
  const { data: salespersons, isLoading, refetch } = trpc.salespersons.list.useQuery();

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

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">销售管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            导入
          </Button>
          <Button variant="outline" size="sm">
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
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            ) : filteredSalespersons?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
    </div>
  );
}
