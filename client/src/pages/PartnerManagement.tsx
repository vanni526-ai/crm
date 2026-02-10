import { useState } from "react";
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
import { Pencil, Trash2, Plus, Search } from "lucide-react";

export default function PartnerManagement() {

  const utils = trpc.useUtils();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // 查询所有合伙人
  const { data: partners, isLoading } = trpc.partnerManagement.list.useQuery();

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

  // 筛选合伙人
  const filteredPartners = partners?.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">合伙人管理</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新增合伙人
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新增合伙人</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="userId">用户ID *</Label>
                  <Input id="userId" name="userId" type="number" required />
                </div>
                <div>
                  <Label htmlFor="name">姓名 *</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="profitRatio">利润分成比例 *</Label>
                  <Input id="profitRatio" name="profitRatio" placeholder="0.50" required />
                </div>
                <div>
                  <Label htmlFor="brandFee">品牌使用费</Label>
                  <Input id="brandFee" name="brandFee" placeholder="0" />
                </div>
                <div>
                  <Label htmlFor="techServiceFee">技术服务费</Label>
                  <Input id="techServiceFee" name="techServiceFee" placeholder="0" />
                </div>
                <div>
                  <Label htmlFor="deferredPaymentTotal">延期支付总额</Label>
                  <Input id="deferredPaymentTotal" name="deferredPaymentTotal" placeholder="0" />
                </div>
                <div>
                  <Label htmlFor="contractStartDate">合同开始日期</Label>
                  <Input id="contractStartDate" name="contractStartDate" type="date" />
                </div>
                <div>
                  <Label htmlFor="contractEndDate">合同结束日期</Label>
                  <Input id="contractEndDate" name="contractEndDate" type="date" />
                </div>
                <div>
                  <Label htmlFor="accountName">账户名称</Label>
                  <Input id="accountName" name="accountName" />
                </div>
                <div>
                  <Label htmlFor="bankName">开户行</Label>
                  <Input id="bankName" name="bankName" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="accountNumber">账号</Label>
                  <Input id="accountNumber" name="accountNumber" />
                </div>
              </div>
              <div>
                <Label htmlFor="profitRule">分成规则</Label>
                <Textarea id="profitRule" name="profitRule" rows={3} />
              </div>
              <div>
                <Label htmlFor="deferredPaymentRule">延期支付规则</Label>
                <Textarea id="deferredPaymentRule" name="deferredPaymentRule" rows={2} />
              </div>
              <div>
                <Label htmlFor="notes">备注</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "创建中..." : "创建"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 搜索栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索合伙人姓名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
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
                <TableHead>利润分成比例</TableHead>
                <TableHead>品牌使用费</TableHead>
                <TableHead>技术服务费</TableHead>
                <TableHead>合同期限</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners?.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell className="font-medium">{partner.name}</TableCell>
                  <TableCell>{(Number(partner.profitRatio) * 100).toFixed(0)}%</TableCell>
                  <TableCell>¥{Number(partner.brandFee).toFixed(2)}</TableCell>
                  <TableCell>¥{Number(partner.techServiceFee).toFixed(2)}</TableCell>
                  <TableCell>
                    {partner.contractStartDate && partner.contractEndDate
                      ? `${new Date(partner.contractStartDate).toLocaleDateString()} - ${new Date(partner.contractEndDate).toLocaleDateString()}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={partner.isActive ? "default" : "secondary"}>
                      {partner.isActive ? "活跃" : "停用"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPartnerId(partner.id);
                          setEditOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(partner.id)}
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
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">城市管理功能开发中...</p>
                </div>
              </TabsContent>

              <TabsContent value="orders">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">订单统计功能开发中...</p>
                </div>
              </TabsContent>

              <TabsContent value="expenses">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">费用明细功能开发中...</p>
                </div>
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
  );
}
