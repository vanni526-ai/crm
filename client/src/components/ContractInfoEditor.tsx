import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Eye } from "lucide-react";

interface ContractInfoEditorProps {
  contractFileUrl: string;
  initialData: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export default function ContractInfoEditor({
  contractFileUrl,
  initialData,
  onSave,
  onCancel,
  isSaving,
}: ContractInfoEditorProps) {
  const [formData, setFormData] = useState(initialData || {});

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      {/* 合同文件链接 */}
      <Card>
        <CardHeader>
          <CardTitle>合同文件</CardTitle>
        </CardHeader>
        <CardContent>
          <a
            href={contractFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            查看合同PDF
          </a>
        </CardContent>
      </Card>

      {/* 合同基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle>合同基本信息</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>合同签署日期</Label>
            <Input
              type="date"
              value={formData.contractSignDate || ""}
              onChange={(e) => handleChange("contractSignDate", e.target.value)}
            />
          </div>
          <div>
            <Label>合同起始日期</Label>
            <Input
              type="date"
              value={formData.contractStartDate || ""}
              onChange={(e) => handleChange("contractStartDate", e.target.value)}
            />
          </div>
          <div>
            <Label>合同结束日期</Label>
            <Input
              type="date"
              value={formData.contractEndDate || ""}
              onChange={(e) => handleChange("contractEndDate", e.target.value)}
            />
          </div>
          <div>
            <Label>法人代表</Label>
            <Input
              value={formData.legalRepresentative || ""}
              onChange={(e) => handleChange("legalRepresentative", e.target.value)}
              placeholder="请输入法人代表姓名"
            />
          </div>
        </CardContent>
      </Card>

      {/* 股权结构 */}
      <Card>
        <CardHeader>
          <CardTitle>股权结构（工商股权）</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>合伙人股权比例（%）</Label>
            <Input
              type="number"
              value={formData.equityRatioPartner || ""}
              onChange={(e) => handleChange("equityRatioPartner", parseFloat(e.target.value))}
              placeholder="如：60"
            />
          </div>
          <div>
            <Label>品牌方股权比例（%）</Label>
            <Input
              type="number"
              value={formData.equityRatioBrand || ""}
              onChange={(e) => handleChange("equityRatioBrand", parseFloat(e.target.value))}
              placeholder="如：40"
            />
          </div>
        </CardContent>
      </Card>

      {/* 分红比例 - 第1阶段 */}
      <Card>
        <CardHeader>
          <CardTitle>第1阶段分红比例（0-12个月）</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>合伙人分红比例（%）</Label>
            <Input
              type="number"
              value={formData.profitRatioStage1Partner || ""}
              onChange={(e) => handleChange("profitRatioStage1Partner", parseFloat(e.target.value))}
              placeholder="如：30"
            />
          </div>
          <div>
            <Label>品牌方分红比例（%）</Label>
            <Input
              type="number"
              value={formData.profitRatioStage1Brand || ""}
              onChange={(e) => handleChange("profitRatioStage1Brand", parseFloat(e.target.value))}
              placeholder="如：70"
            />
          </div>
        </CardContent>
      </Card>

      {/* 分红比例 - 第2阶段A */}
      <Card>
        <CardHeader>
          <CardTitle>第2阶段A分红比例（13-24个月，未回本）</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>合伙人分红比例（%）</Label>
            <Input
              type="number"
              value={formData.profitRatioStage2APartner || ""}
              onChange={(e) => handleChange("profitRatioStage2APartner", parseFloat(e.target.value))}
              placeholder="如：30"
            />
          </div>
          <div>
            <Label>品牌方分红比例（%）</Label>
            <Input
              type="number"
              value={formData.profitRatioStage2ABrand || ""}
              onChange={(e) => handleChange("profitRatioStage2ABrand", parseFloat(e.target.value))}
              placeholder="如：70"
            />
          </div>
        </CardContent>
      </Card>

      {/* 分红比例 - 第2阶段B */}
      <Card>
        <CardHeader>
          <CardTitle>第2阶段B分红比例（13-24个月，已回本）</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>合伙人分红比例（%）</Label>
            <Input
              type="number"
              value={formData.profitRatioStage2BPartner || ""}
              onChange={(e) => handleChange("profitRatioStage2BPartner", parseFloat(e.target.value))}
              placeholder="如：20"
            />
          </div>
          <div>
            <Label>品牌方分红比例（%）</Label>
            <Input
              type="number"
              value={formData.profitRatioStage2BBrand || ""}
              onChange={(e) => handleChange("profitRatioStage2BBrand", parseFloat(e.target.value))}
              placeholder="如：80"
            />
          </div>
        </CardContent>
      </Card>

      {/* 分红比例 - 第3阶段 */}
      <Card>
        <CardHeader>
          <CardTitle>第3阶段分红比例（25个月后）</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>合伙人分红比例（%）</Label>
            <Input
              type="number"
              value={formData.profitRatioStage3Partner || ""}
              onChange={(e) => handleChange("profitRatioStage3Partner", parseFloat(e.target.value))}
              placeholder="如：20"
            />
          </div>
          <div>
            <Label>品牌方分红比例（%）</Label>
            <Input
              type="number"
              value={formData.profitRatioStage3Brand || ""}
              onChange={(e) => handleChange("profitRatioStage3Brand", parseFloat(e.target.value))}
              placeholder="如：80"
            />
          </div>
        </CardContent>
      </Card>

      {/* 投资费用 */}
      <Card>
        <CardHeader>
          <CardTitle>投资费用明细（单位：元）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 品牌使用费（总金额） */}
          <div className="p-4 bg-primary/5 rounded-lg space-y-4">
            <div>
              <Label className="font-semibold">品牌使用费（总金额）</Label>
              <Input
                type="number"
                value={formData.brandUsageFee || ""}
                onChange={(e) => handleChange("brandUsageFee", parseFloat(e.target.value))}
                placeholder="如：50000"
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-2">包含：管理费 + 运营岗位费 + 老师招聘培训费 + 营销推广费</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>管理费</Label>
                <Input
                  type="number"
                  value={formData.managementFee || ""}
                  onChange={(e) => handleChange("managementFee", parseFloat(e.target.value))}
                  placeholder="如：5000"
                />
              </div>
              <div>
                <Label>运营岗位费</Label>
                <Input
                  type="number"
                  value={formData.operationPositionFee || ""}
                  onChange={(e) => handleChange("operationPositionFee", parseFloat(e.target.value))}
                  placeholder="如：18000"
                />
              </div>
              <div>
                <Label>老师招聘及培训费</Label>
                <Input
                  type="number"
                  value={formData.teacherRecruitmentFee || ""}
                  onChange={(e) => handleChange("teacherRecruitmentFee", parseFloat(e.target.value))}
                  placeholder="如：7000"
                />
              </div>
              <div>
                <Label>营销推广费</Label>
                <Input
                  type="number"
                  value={formData.marketingFee || ""}
                  onChange={(e) => handleChange("marketingFee", parseFloat(e.target.value))}
                  placeholder="如：20000"
                />
              </div>
            </div>
          </div>
          
          {/* 品牌授权押金（单独） */}
          <div>
            <Label>品牌授权押金</Label>
            <Input
              type="number"
              value={formData.brandAuthDeposit || ""}
              onChange={(e) => handleChange("brandAuthDeposit", parseFloat(e.target.value))}
              placeholder="如：5000"
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* 收款账户信息 */}
      <Card>
        <CardHeader>
          <CardTitle>收款账户信息</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>账户名称</Label>
            <Input
              value={formData.partnerAccountHolder || ""}
              onChange={(e) => handleChange("partnerAccountHolder", e.target.value)}
              placeholder="请输入账户名称"
            />
          </div>
          <div>
            <Label>开户行</Label>
            <Input
              value={formData.partnerBankName || ""}
              onChange={(e) => handleChange("partnerBankName", e.target.value)}
              placeholder="请输入开户行"
            />
          </div>
          <div className="col-span-2">
            <Label>银行账号</Label>
            <Input
              value={formData.partnerBankAccount || ""}
              onChange={(e) => handleChange("partnerBankAccount", e.target.value)}
              placeholder="请输入银行账号"
            />
          </div>
        </CardContent>
      </Card>

      {/* 分红支付规则 */}
      <Card>
        <CardHeader>
          <CardTitle>分红支付规则</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label>每月分红支付日</Label>
            <Input
              type="number"
              value={formData.profitPaymentDay || ""}
              onChange={(e) => handleChange("profitPaymentDay", parseInt(e.target.value))}
              placeholder="如：25（表示每月25日）"
              min="1"
              max="31"
            />
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "保存中..." : "保存合同信息"}
        </Button>
      </div>
    </div>
  );
}
