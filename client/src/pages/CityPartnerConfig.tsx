import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Pencil, Calculator } from "lucide-react";

export default function CityPartnerConfig() {
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [editRate, setEditRate] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // TODO: 实现getAllCityPartnerConfig接口
  // const { data: configs, isLoading, refetch } = trpc.analytics.getAllCityPartnerConfig.useQuery();
  const configs: any[] = [];
  const isLoading = false;
  const refetch = () => Promise.resolve();
  const updateMutation = trpc.analytics.updateCityPartnerConfig.useMutation({
    onSuccess: () => {
      toast.success("城市合伙人费配置已更新");
      refetch();
      setEditingConfig(null);
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const handleEdit = (config: any) => {
    setEditingConfig(config);
    setEditRate(config.partnerFeeRate);
    setEditDescription(config.description || "");
  };

  const handleSave = () => {
    if (!editingConfig) return;

    const rate = parseFloat(editRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("比例必须在 0-100 之间");
      return;
    }

    // TODO: 实现updateCityPartnerConfig接口
    updateMutation.mutate({
      id: editingConfig.id,
      areaCode: editRate, // 使用areaCode字段代替partnerFeeRate
      description: editDescription,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">城市合伙人费配置</h1>
        <p className="text-muted-foreground mt-2">
          管理各城市的合伙人费计算比例
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            合伙人费计算规则
          </CardTitle>
          <CardDescription>
            合伙人费 = (课程金额 - 老师费用) × 比例
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>城市</TableHead>
                <TableHead>比例</TableHead>
                <TableHead>计算公式</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs?.map((config: any) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">{config.city}</TableCell>
                  <TableCell>
                    <span className="text-lg font-semibold text-primary">
                      {Number(config.partnerFeeRate).toFixed(0)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {config.description || `(课程金额 - 老师费用) × ${Number(config.partnerFeeRate).toFixed(0)}%`}
                  </TableCell>
                  <TableCell>
                    {config.isActive ? (
                      <span className="text-green-600 text-sm">● 启用</span>
                    ) : (
                      <span className="text-gray-400 text-sm">○ 停用</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(config)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      编辑
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {!configs || configs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              暂无配置数据
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编辑对话框 */}
      <Dialog open={!!editingConfig} onOpenChange={(open) => !open && setEditingConfig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑合伙人费配置</DialogTitle>
            <DialogDescription>
              修改 {editingConfig?.city} 的合伙人费比例
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rate">比例 (%)</Label>
              <Input
                id="rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={editRate}
                onChange={(e) => setEditRate(e.target.value)}
                placeholder="输入比例 (0-100)"
              />
              <p className="text-sm text-muted-foreground">
                当前: {editRate}% - 即 (课程金额 - 老师费用) × {editRate}%
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">说明</Label>
              <Input
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="可选的说明文字"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConfig(null)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
