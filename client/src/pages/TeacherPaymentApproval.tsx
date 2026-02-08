import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2, XCircle, CreditCard, Loader2 } from "lucide-react";

export default function TeacherPaymentApproval() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [currentPaymentId, setCurrentPaymentId] = useState<number | null>(null);
  const [approveNotes, setApproveNotes] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay" | "bank" | "cash" | "other">("wechat");
  const [transactionNo, setTransactionNo] = useState("");
  const [payNotes, setPayNotes] = useState("");

  // 查询待审批列表
  const { data: pendingPayments = [], refetch: refetchPending } = trpc.teacherPayments.getPendingPayments.useQuery();

  // 查询审批历史
  const { data: approvedPayments = [], refetch: refetchHistory } = trpc.teacherPayments.getMyPayments.useQuery(
    { status: "approved" },
    { enabled: false }
  );

  const { data: paidPayments = [] } = trpc.teacherPayments.getMyPayments.useQuery(
    { status: "paid" },
    { enabled: false }
  );

  // 审批mutation
  const approveMutation = trpc.teacherPayments.approve.useMutation({
    onSuccess: () => {
      toast.success("审批成功");
      refetchPending();
      refetchHistory();
      setSelectedIds([]);
      setApproveDialogOpen(false);
      setApproveNotes("");
    },
    onError: (error) => {
      toast.error(`审批失败: ${error.message}`);
    },
  });

  // 标记已支付mutation
  const markAsPaidMutation = trpc.teacherPayments.markAsPaid.useMutation({
    onSuccess: () => {
      toast.success("已标记为已支付");
      refetchHistory();
      setPayDialogOpen(false);
      setPaymentMethod("wechat");
      setTransactionNo("");
      setPayNotes("");
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  // 处理全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(pendingPayments.map((p: any) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  // 处理单选
  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    }
  };

  // 批量审批
  const handleBatchApprove = () => {
    if (selectedIds.length === 0) {
      toast.error("请选择要审批的记录");
      return;
    }
    setApproveDialogOpen(true);
  };

  // 确认批量审批
  const confirmBatchApprove = async () => {
    for (const id of selectedIds) {
      await approveMutation.mutateAsync({
        id,
        approved: true,
        notes: approveNotes,
      });
    }
  };

  // 单条审批
  const handleSingleApprove = (id: number) => {
    setSelectedIds([id]);
    setApproveDialogOpen(true);
  };

  // 单条拒绝
  const handleSingleReject = (id: number) => {
    setCurrentPaymentId(id);
    setRejectDialogOpen(true);
  };

  // 确认拒绝
  const confirmReject = async () => {
    if (!currentPaymentId) return;
    await approveMutation.mutateAsync({
      id: currentPaymentId,
      approved: false,
      notes: rejectNotes,
    });
    setRejectDialogOpen(false);
    setRejectNotes("");
    setCurrentPaymentId(null);
  };

  // 标记为已支付
  const handleMarkAsPaid = (id: number) => {
    setCurrentPaymentId(id);
    setPayDialogOpen(true);
  };

  // 确认支付
  const confirmPay = async () => {
    if (!currentPaymentId) return;
    await markAsPaidMutation.mutateAsync({
      id: currentPaymentId,
      paymentMethod,
      transactionNo,
      notes: payNotes,
    });
    setCurrentPaymentId(null);
  };

  const paymentMethodLabels = {
    wechat: "微信",
    alipay: "支付宝",
    bank: "银行转账",
    cash: "现金",
    other: "其他",
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">课时费审批</h1>
        <p className="text-muted-foreground">管理老师课时费的审批和支付</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">待审批 ({pendingPayments.length})</TabsTrigger>
          <TabsTrigger value="history">审批历史</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>待审批列表</CardTitle>
                  <CardDescription>审批老师提交的课时费申请</CardDescription>
                </div>
                <Button onClick={handleBatchApprove} disabled={selectedIds.length === 0}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  批量审批 ({selectedIds.length})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pendingPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暂无待审批记录</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.length === pendingPayments.length && pendingPayments.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>老师姓名</TableHead>
                      <TableHead>订单号</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>申请时间</TableHead>
                      <TableHead>备注</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(payment.id)}
                            onCheckedChange={(checked) => handleSelectOne(payment.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>{payment.teacherName || "未知"}</TableCell>
                        <TableCell>{payment.orderNo || "-"}</TableCell>
                        <TableCell className="font-medium">¥{Number(payment.amount).toFixed(2)}</TableCell>
                        <TableCell>{new Date(payment.createdAt).toLocaleString("zh-CN")}</TableCell>
                        <TableCell className="max-w-xs truncate">{payment.notes || "-"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="default" onClick={() => handleSingleApprove(payment.id)}>
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            审批
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleSingleReject(payment.id)}>
                            <XCircle className="mr-1 h-3 w-3" />
                            拒绝
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>审批历史</CardTitle>
              <CardDescription>查看已审批和已支付的记录</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>老师姓名</TableHead>
                    <TableHead>订单号</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>审批时间</TableHead>
                    <TableHead>支付方式</TableHead>
                    <TableHead>交易单号</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...approvedPayments, ...paidPayments].map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.teacherName || "未知"}</TableCell>
                      <TableCell>{payment.orderNo || "-"}</TableCell>
                      <TableCell className="font-medium">¥{Number(payment.amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            payment.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {payment.status === "paid" ? "已支付" : "已审批"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {payment.approvedAt ? new Date(payment.approvedAt).toLocaleString("zh-CN") : "-"}
                      </TableCell>
                      <TableCell>{payment.paymentMethod ? paymentMethodLabels[payment.paymentMethod as keyof typeof paymentMethodLabels] : "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{payment.transactionNo || "-"}</TableCell>
                      <TableCell className="text-right">
                        {payment.status === "approved" && (
                          <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid(payment.id)}>
                            <CreditCard className="mr-1 h-3 w-3" />
                            标记已支付
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {approvedPayments.length === 0 && paidPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        暂无审批历史
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 审批对话框 */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>审批课时费</DialogTitle>
            <DialogDescription>
              确认审批 {selectedIds.length} 条课时费申请？审批后将进入待支付状态。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approve-notes">审批备注（可选）</Label>
              <Textarea
                id="approve-notes"
                placeholder="填写审批意见..."
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmBatchApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认审批
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 拒绝对话框 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝课时费申请</DialogTitle>
            <DialogDescription>请填写拒绝原因</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-notes">拒绝原因</Label>
              <Textarea
                id="reject-notes"
                placeholder="填写拒绝原因..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmReject} disabled={approveMutation.isPending || !rejectNotes}>
              {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认拒绝
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 支付对话框 */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>标记为已支付</DialogTitle>
            <DialogDescription>填写支付信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment-method">支付方式</Label>
              <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wechat">微信</SelectItem>
                  <SelectItem value="alipay">支付宝</SelectItem>
                  <SelectItem value="bank">银行转账</SelectItem>
                  <SelectItem value="cash">现金</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction-no">交易单号</Label>
              <Input
                id="transaction-no"
                placeholder="填写交易单号..."
                value={transactionNo}
                onChange={(e) => setTransactionNo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-notes">支付备注（可选）</Label>
              <Textarea
                id="pay-notes"
                placeholder="填写支付备注..."
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmPay} disabled={markAsPaidMutation.isPending}>
              {markAsPaidMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认支付
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
