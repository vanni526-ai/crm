import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileUp, Calculator, Download, Eye } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function PartnerManagement() {
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [uploadingContract, setUploadingContract] = useState(false);

  // 查询合伙人列表
  const { data: partners, isLoading: partnersLoading } = trpc.partnerManagement.list.useQuery();
  
  // 查询合伙人统计数据
  const { data: partnerStats } = trpc.partnerManagement.getPartnerStats.useQuery();

  // 查询合伙人关联的城市
  const { data: partnerCities } = trpc.partnerManagement.getPartnerCities.useQuery(
    { partnerId: selectedPartnerId! },
    { enabled: !!selectedPartnerId }
  );

  // 查询合同信息
  const { data: contractInfo, refetch: refetchContract } = trpc.partnerManagement.getContractInfo.useQuery(
    { partnerId: selectedPartnerId!, cityId: selectedCityId! },
    { enabled: !!selectedPartnerId && !!selectedCityId }
  );

  // 上传合同
  const uploadContractMutation = trpc.partnerManagement.uploadContract.useMutation({
    onSuccess: () => {
      toast.success("合同上传成功，信息已自动识别");
      setContractDialogOpen(false);
      refetchContract();
    },
    onError: (error) => {
      toast.error(`合同上传失败: ${error.message}`);
    },
  });

  // 计算分红阶段
  const calculateProfitStageMutation = trpc.partnerManagement.calculateProfitStage.useMutation({
    onSuccess: (data) => {
      toast.success(`分红阶段已更新：第${data.currentProfitStage}阶段`);
      refetchContract();
    },
    onError: (error) => {
      toast.error(`计算失败: ${error.message}`);
    },
  });

  // 处理合同文件上传
  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("只支持PDF格式的合同文件");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("文件大小不能超过10MB");
      return;
    }

    setUploadingContract(true);

    try {
      // 读取文件为Base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const base64Data = base64.split(",")[1]; // 去掉data:application/pdf;base64,前缀

        await uploadContractMutation.mutateAsync({
          partnerId: selectedPartnerId!,
          cityId: selectedCityId!,
          fileBase64: base64Data,
          fileName: file.name,
        });

        setUploadingContract(false);
      };
      reader.onerror = () => {
        toast.error("文件读取失败");
        setUploadingContract(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setUploadingContract(false);
    }
  };

  // 处理分红阶段计算
  const handleCalculateProfitStage = () => {
    if (!selectedPartnerId || !selectedCityId) {
      toast.error("请先选择合伙人和城市");
      return;
    }

    calculateProfitStageMutation.mutate({
      partnerId: selectedPartnerId,
      cityId: selectedCityId,
    });
  };

  // 获取分红阶段文本
  const getProfitStageText = (stage: number, isRecovered: boolean) => {
    if (stage === 1) return "第1阶段（0-12个月）";
    if (stage === 2) {
      return isRecovered ? "第2阶段B（13-24个月，已回本）" : "第2阶段A（13-24个月，未回本）";
    }
    return "第3阶段（25个月后）";
  };

  // 获取合同状态Badge
  const getContractStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      draft: { label: "草稿", variant: "secondary" },
      active: { label: "生效中", variant: "default" },
      expired: { label: "已过期", variant: "destructive" },
      terminated: { label: "已终止", variant: "outline" },
    };
    const config = statusMap[status] || statusMap.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="container py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">合伙人管理</h1>
            <p className="text-muted-foreground mt-1">管理合伙人信息、合同、分红等</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：合伙人列表 */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>合伙人列表</CardTitle>
              <CardDescription>共 {partners?.length || 0} 个合伙人</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {partnersLoading ? (
                  <div className="text-center text-muted-foreground py-8">加载中...</div>
                ) : partners && partners.length > 0 ? (
                  partners.map((partner) => {
                    const stats = partnerStats?.find((s) => s.partnerId === partner.id);
                    return (
                      <div
                        key={partner.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedPartnerId === partner.id
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-accent"
                        }`}
                        onClick={() => {
                          setSelectedPartnerId(partner.id);
                          setSelectedCityId(null);
                        }}
                      >
                        <div className="font-medium">{partner.name}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {stats?.cities || "未分配城市"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          订单：{stats?.orderCount || 0} | 销售额：¥{stats?.courseAmount || "0.00"}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-muted-foreground py-8">暂无合伙人</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 右侧：详情区域 */}
          <Card className="lg:col-span-2">
            {selectedPartnerId ? (
              <Tabs defaultValue="cities" className="w-full">
                <CardHeader>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="cities">城市管理</TabsTrigger>
                    <TabsTrigger value="contract">合同信息</TabsTrigger>
                    <TabsTrigger value="account">收款账户</TabsTrigger>
                    <TabsTrigger value="profit">分红记录</TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent>
                  {/* 城市管理Tab */}
                  <TabsContent value="cities" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">关联城市</h3>
                    </div>
                    <div className="space-y-2">
                      {partnerCities && partnerCities.length > 0 ? (
                        partnerCities.map((city) => (
                          <div
                            key={city.id}
                            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                              selectedCityId === city.cityId
                                ? "bg-primary/10 border-primary"
                                : "hover:bg-accent"
                            }`}
                            onClick={() => setSelectedCityId(city.cityId)}
                          >
                            <div className="font-medium">{city.cityName}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              点击查看合同信息
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          该合伙人暂未关联城市
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* 合同信息Tab */}
                  <TabsContent value="contract" className="space-y-4">
                    {selectedCityId ? (
                      contractInfo ? (
                        <div className="space-y-6">
                          {/* 合同基本信息 */}
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-semibold">合同基本信息</h3>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCalculateProfitStage}
                                  disabled={calculateProfitStageMutation.isPending}
                                >
                                  <Calculator className="w-4 h-4 mr-2" />
                                  {calculateProfitStageMutation.isPending ? "计算中..." : "更新分红阶段"}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => setContractDialogOpen(true)}
                                >
                                  <FileUp className="w-4 h-4 mr-2" />
                                  上传新合同
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-muted-foreground">合同状态</Label>
                                <div className="mt-1">
                                  {getContractStatusBadge(contractInfo.contractStatus)}
                                </div>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">合同签署日期</Label>
                                <div className="mt-1">
                                  {contractInfo.contractSignDate
                                    ? new Date(contractInfo.contractSignDate).toLocaleDateString()
                                    : "未设置"}
                                </div>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">合同起始日期</Label>
                                <div className="mt-1">
                                  {contractInfo.contractStartDate
                                    ? new Date(contractInfo.contractStartDate).toLocaleDateString()
                                    : "未设置"}
                                </div>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">合同结束日期</Label>
                                <div className="mt-1">
                                  {contractInfo.contractEndDate
                                    ? new Date(contractInfo.contractEndDate).toLocaleDateString()
                                    : "未设置"}
                                </div>
                              </div>
                              {contractInfo.contractFileUrl && (
                                <div className="col-span-2">
                                  <Label className="text-muted-foreground">合同文件</Label>
                                  <div className="mt-1">
                                    <a
                                      href={contractInfo.contractFileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline flex items-center gap-2"
                                    >
                                      <Eye className="w-4 h-4" />
                                      查看合同PDF
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 股权结构 */}
                          <div>
                            <h3 className="text-lg font-semibold mb-4">股权结构（工商股权）</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-muted-foreground">合伙人股权比例</Label>
                                <div className="mt-1 text-2xl font-bold">
                                  {contractInfo.equityRatioPartner || 0}%
                                </div>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">品牌方股权比例</Label>
                                <div className="mt-1 text-2xl font-bold">
                                  {contractInfo.equityRatioBrand || 0}%
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 分红阶段和比例 */}
                          <div>
                            <h3 className="text-lg font-semibold mb-4">当前分红阶段</h3>
                            <div className="p-4 bg-primary/10 rounded-lg">
                              <div className="text-lg font-medium">
                                {getProfitStageText(
                                  contractInfo.currentProfitStage || 1,
                                  contractInfo.isInvestmentRecovered || false
                                )}
                              </div>
                              <div className="mt-2 flex gap-8">
                                <div>
                                  <span className="text-muted-foreground">合伙人分红：</span>
                                  <span className="text-xl font-bold ml-2">
                                    {contractInfo.currentProfitStage === 1
                                      ? contractInfo.profitRatioStage1Partner
                                      : contractInfo.currentProfitStage === 2
                                      ? contractInfo.isInvestmentRecovered
                                        ? contractInfo.profitRatioStage2BPartner
                                        : contractInfo.profitRatioStage2APartner
                                      : contractInfo.profitRatioStage3Partner || 0}
                                    %
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">品牌方分红：</span>
                                  <span className="text-xl font-bold ml-2">
                                    {contractInfo.currentProfitStage === 1
                                      ? contractInfo.profitRatioStage1Brand
                                      : contractInfo.currentProfitStage === 2
                                      ? contractInfo.isInvestmentRecovered
                                        ? contractInfo.profitRatioStage2BBrand
                                        : contractInfo.profitRatioStage2ABrand
                                      : contractInfo.profitRatioStage3Brand || 0}
                                    %
                                  </span>
                                </div>
                              </div>
                              {contractInfo.isInvestmentRecovered !== undefined && (
                                <div className="mt-2">
                                  <Badge variant={contractInfo.isInvestmentRecovered ? "default" : "secondary"}>
                                    {contractInfo.isInvestmentRecovered ? "已回本" : "未回本"}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 投资费用 */}
                          <div>
                            <h3 className="text-lg font-semibold mb-4">投资费用明细</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-muted-foreground">品牌使用费</Label>
                                <div className="mt-1">¥{contractInfo.brandUsageFee || "0.00"}</div>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">品牌授权押金</Label>
                                <div className="mt-1">¥{contractInfo.brandAuthDeposit || "0.00"}</div>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">管理费</Label>
                                <div className="mt-1">¥{contractInfo.managementFee || "0.00"}</div>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">运营岗位费</Label>
                                <div className="mt-1">¥{contractInfo.operationPositionFee || "0.00"}</div>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">老师招聘及培训费</Label>
                                <div className="mt-1">¥{contractInfo.teacherRecruitmentFee || "0.00"}</div>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">营销推广费</Label>
                                <div className="mt-1">¥{contractInfo.marketingFee || "0.00"}</div>
                              </div>
                              <div className="col-span-2">
                                <Label className="text-muted-foreground">总预估成本</Label>
                                <div className="mt-1 text-2xl font-bold">
                                  ¥{contractInfo.totalEstimatedCost || "0.00"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground mb-4">该城市暂无合同信息</p>
                          <Button onClick={() => setContractDialogOpen(true)}>
                            <FileUp className="w-4 h-4 mr-2" />
                            上传合同
                          </Button>
                        </div>
                      )
                    ) : (
                      <div className="text-center text-muted-foreground py-12">
                        请先在"城市管理"中选择一个城市
                      </div>
                    )}
                  </TabsContent>

                  {/* 收款账户Tab */}
                  <TabsContent value="account" className="space-y-4">
                    {selectedCityId && contractInfo ? (
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold">收款账户信息</h3>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <Label className="text-muted-foreground">开户行</Label>
                            <div className="mt-1">{contractInfo.partnerBankName || "未设置"}</div>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">银行账号</Label>
                            <div className="mt-1">{contractInfo.partnerBankAccount || "未设置"}</div>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">账户名</Label>
                            <div className="mt-1">{contractInfo.partnerAccountHolder || "未设置"}</div>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">支付宝账号</Label>
                            <div className="mt-1">{contractInfo.partnerAlipayAccount || "未设置"}</div>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">微信账号</Label>
                            <div className="mt-1">{contractInfo.partnerWechatAccount || "未设置"}</div>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">每月分红支付日</Label>
                            <div className="mt-1">每月 {contractInfo.profitPaymentDay || 25} 日</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-12">
                        请先在"城市管理"中选择一个城市
                      </div>
                    )}
                  </TabsContent>

                  {/* 分红记录Tab */}
                  <TabsContent value="profit" className="space-y-4">
                    <div className="text-center text-muted-foreground py-12">
                      分红记录功能开发中...
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            ) : (
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  请从左侧选择一个合伙人查看详情
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* 合同上传对话框 */}
        <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>上传合同文件</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>选择PDF合同文件</Label>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={handleContractUpload}
                  disabled={uploadingContract}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  支持PDF格式，文件大小不超过10MB。上传后将自动识别合同内容。
                </p>
              </div>
              {uploadingContract && (
                <div className="text-center text-muted-foreground">
                  正在上传和识别合同，请稍候...
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
