import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Edit, Eye, FileUp, Upload } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface VenueContractCardProps {
  partnerCityId: number;
  contractData?: {
    venueContractFileUrl?: string;
    venueRentAmount?: string;
    venueDeposit?: string;
    venueLeaseStartDate?: Date;
    venueLeaseEndDate?: Date;
    venuePaymentCycle?: "monthly" | "bimonthly" | "quarterly" | "semiannual" | "annual";
  };
  onUpdate?: () => void;
}

export default function VenueContractCard({ partnerCityId, contractData, onUpdate }: VenueContractCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    venueContractFileUrl: "",
    venueRentAmount: "",
    venueDeposit: "",
    venueLeaseStartDate: "",
    venueLeaseEndDate: "",
    venuePaymentCycle: "monthly" as "monthly" | "bimonthly" | "quarterly" | "semiannual" | "annual",
  });

  useEffect(() => {
    if (contractData) {
      setFormData({
        venueContractFileUrl: contractData.venueContractFileUrl || "",
        venueRentAmount: contractData.venueRentAmount || "",
        venueDeposit: contractData.venueDeposit || "",
        venueLeaseStartDate: contractData.venueLeaseStartDate
          ? new Date(contractData.venueLeaseStartDate).toISOString().split("T")[0]
          : "",
        venueLeaseEndDate: contractData.venueLeaseEndDate
          ? new Date(contractData.venueLeaseEndDate).toISOString().split("T")[0]
          : "",
        venuePaymentCycle: contractData.venuePaymentCycle || "monthly",
      });
    }
  }, [contractData]);

  const updateVenueContractMutation = trpc.partnerManagement.updateVenueContract.useMutation({
    onSuccess: () => {
      toast.success("场地合同信息已更新");
      setEditDialogOpen(false);
      onUpdate?.();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("只支持PDF格式的合同文件");
      return;
    }

    setUploading(true);
    try {
      // 创建FormData并上传到S3
      const formDataToUpload = new FormData();
      formDataToUpload.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formDataToUpload,
      });

      if (!response.ok) {
        throw new Error("文件上传失败");
      }

      const { url } = await response.json();
      setFormData((prev) => ({ ...prev, venueContractFileUrl: url }));
      toast.success("合同文件上传成功");
    } catch (error: any) {
      toast.error(`上传失败: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    updateVenueContractMutation.mutate({
      partnerCityId,
      venueContractFileUrl: formData.venueContractFileUrl || undefined,
      venueRentAmount: formData.venueRentAmount ? parseFloat(formData.venueRentAmount) : undefined,
      venueDeposit: formData.venueDeposit ? parseFloat(formData.venueDeposit) : undefined,
      venueLeaseStartDate: formData.venueLeaseStartDate || undefined,
      venueLeaseEndDate: formData.venueLeaseEndDate || undefined,
      venuePaymentCycle: formData.venuePaymentCycle,
    });
  };

  // 计算下次支付日期和剩余天数
  const calculateNextPayment = () => {
    if (!formData.venueLeaseStartDate || !formData.venuePaymentCycle) {
      return null;
    }

    const startDate = new Date(formData.venueLeaseStartDate);
    const nextDate = new Date(startDate);

    switch (formData.venuePaymentCycle) {
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case "bimonthly":
        nextDate.setMonth(nextDate.getMonth() + 2);
        break;
      case "quarterly":
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case "semiannual":
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case "annual":
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);

    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      date: nextDate,
      days: diffDays,
    };
  };

  const nextPayment = calculateNextPayment();

  const getPaymentCycleName = (cycle: string) => {
    const names: Record<string, string> = {
      monthly: "月付",
      bimonthly: "两月付",
      quarterly: "季付",
      semiannual: "半年付",
      annual: "年付",
    };
    return names[cycle] || cycle;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>场地合同</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditDialogOpen(true)}
          >
            <Edit className="w-4 h-4 mr-2" />
            编辑
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {contractData && (contractData.venueRentAmount || contractData.venueContractFileUrl) ? (
            <>
              {contractData.venueContractFileUrl && (
                <div>
                  <Label className="text-muted-foreground">合同文件</Label>
                  <div className="mt-1">
                    <a
                      href={contractData.venueContractFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      查看房租合同PDF
                    </a>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">房租金额</Label>
                  <div className="mt-1 text-xl font-semibold">
                    ￥{contractData.venueRentAmount ? parseFloat(contractData.venueRentAmount).toFixed(2) : "0.00"}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">押金</Label>
                  <div className="mt-1 text-xl font-semibold">
                    ￥{contractData.venueDeposit ? parseFloat(contractData.venueDeposit).toFixed(2) : "0.00"}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">起租日期</Label>
                  <div className="mt-1">
                    {contractData.venueLeaseStartDate
                      ? new Date(contractData.venueLeaseStartDate).toLocaleDateString()
                      : "未设置"}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">到期日期</Label>
                  <div className="mt-1">
                    {contractData.venueLeaseEndDate
                      ? new Date(contractData.venueLeaseEndDate).toLocaleDateString()
                      : "未设置"}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">付款方式</Label>
                  <div className="mt-1">
                    {contractData.venuePaymentCycle
                      ? getPaymentCycleName(contractData.venuePaymentCycle)
                      : "未设置"}
                  </div>
                </div>
                {nextPayment && (
                  <div>
                    <Label className="text-muted-foreground">距离下次支付</Label>
                    <div className="mt-1 text-xl font-semibold text-primary">
                      {nextPayment.days}天
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {nextPayment.date.toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              暂无场地合同信息
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑场地合同</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>房租合同文件 (PDF)</Label>
              <div className="mt-2 flex items-center gap-2">
                {formData.venueContractFileUrl ? (
                  <>
                    <a
                      href={formData.venueContractFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      查看已上传合同
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => document.getElementById("venue-contract-upload")?.click()}
                      disabled={uploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? "上传中..." : "重新上传"}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("venue-contract-upload")?.click()}
                    disabled={uploading}
                  >
                    <FileUp className="w-4 h-4 mr-2" />
                    {uploading ? "上传中..." : "上传合同"}
                  </Button>
                )}
                <input
                  id="venue-contract-upload"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>房租金额 (元)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.venueRentAmount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, venueRentAmount: e.target.value }))}
                  placeholder="请输入房租金额"
                />
              </div>
              <div>
                <Label>押金 (元)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.venueDeposit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, venueDeposit: e.target.value }))}
                  placeholder="请输入押金"
                />
              </div>
              <div>
                <Label>起租日期</Label>
                <Input
                  type="date"
                  value={formData.venueLeaseStartDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, venueLeaseStartDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>到期日期</Label>
                <Input
                  type="date"
                  value={formData.venueLeaseEndDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, venueLeaseEndDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>付款方式</Label>
                <Select
                  value={formData.venuePaymentCycle}
                  onValueChange={(value: any) => setFormData((prev) => ({ ...prev, venuePaymentCycle: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">月付</SelectItem>
                    <SelectItem value="bimonthly">两月付</SelectItem>
                    <SelectItem value="quarterly">季付</SelectItem>
                    <SelectItem value="semiannual">半年付</SelectItem>
                    <SelectItem value="annual">年付</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {nextPayment && (
                <div>
                  <Label>距离下次支付</Label>
                  <div className="mt-2 text-xl font-semibold text-primary">
                    {nextPayment.days}天
                  </div>
                  <div className="text-sm text-muted-foreground">
                    下次支付日期: {nextPayment.date.toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={updateVenueContractMutation.isPending}>
              {updateVenueContractMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
