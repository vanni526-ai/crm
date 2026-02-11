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
import { FileUp, Calculator, Download, Eye, Edit } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import ContractInfoEditor from "@/components/ContractInfoEditor";

export default function PartnerManagement() {
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [uploadingContract, setUploadingContract] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState("");
  
  // 合同预览和编辑状态
  const [contractPreview, setContractPreview] = useState<any>(null); // 识别结果预览
  const [editingContract, setEditingContract] = useState(false); // 是否处于编辑模式
  const [editFormData, setEditFormData] = useState<any>({}); // 编辑表单数据

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

  // 上传合同（只识别，不保存）
  const uploadContractMutation = trpc.partnerManagement.uploadContract.useMutation({
    onSuccess: (data) => {
      toast.success("合同识别成功，请检查并修改信息");
      setContractDialogOpen(false);
      setUploadingContract(false);
      
      // 设置预览数据
      setContractPreview({
        contractFileUrl: data.contractFileUrl,
        contractInfo: data.contractInfo,
      });
      
      // 初始化编辑表单数据
      setEditFormData(data.contractInfo);
      setEditingContract(true);
    },
    onError: (error) => {
      toast.error(`合同上传失败: ${error.message}`);
      setUploadingContract(false);
    },
  });
  
  // 保存合同信息
  const saveContractMutation = trpc.partnerManagement.saveContractInfo.useMutation({
    onSuccess: () => {
      toast.success("合同信息已保存");
      setContractPreview(null);
      setEditingContract(false);
      setEditFormData({});
      refetchContract();
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
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
              <div className="mt-4">
                <Input
                  placeholder="搜索城市名称..."
                  value={citySearchQuery}
                  onChange={(e) => setCitySearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {partnersLoading ? (
                  <div className="text-center text-muted-foreground py-8">加载中...</div>
                ) : partners && partners.length > 0 ? (
                  partners
                    .filter((partner) => {
                      const stats = partnerStats?.find((s) => s.partnerId === partner.id);
                      const cities = stats?.cities || "";
                      return cities.toLowerCase().includes(citySearchQuery.toLowerCase());
                    })
                    .map((partner) => {
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
                          <div className="font-medium">{stats?.cities || "未分配城市"}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            合伙人：{partner.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            当月分红：¥{stats?.currentMonthProfit || "0.00"}
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
                        partnerCities.map((city) => {
                          // 计算合同剩余有效期
                          let remainingDays: number | null = null;
                          if (city.contractEndDate) {
                            const endDate = new Date(city.contractEndDate);
                            const today = new Date();
                            const diffTime = endDate.getTime() - today.getTime();
                            remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          }
                          
                          return (
                            <div
                              key={city.id}
                              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                                selectedCityId === city.cityId
                                  ? "bg-primary/10 border-primary"
                                  : "hover:bg-accent"
                              }`}
                              onClick={() => setSelectedCityId(city.cityId)}
                            >
                              <div className="flex justify-between items-start">
                                <div className="font-medium">{city.cityName}</div>
                                {remainingDays !== null && (
                                  <Badge variant={remainingDays > 90 ? "default" : remainingDays > 30 ? "secondary" : "destructive"}>
                                    {remainingDays > 0 ? `剩余${remainingDays}天` : "已过期"}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                点击查看合同信息
                              </div>
                            </div>
                          );
                        })
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
                      editingContract && contractPreview ? (
                        <ContractInfoEditor
                          contractFileUrl={contractPreview.contractFileUrl}
                          initialData={contractPreview.contractInfo}
                          onSave={(data) => {
                            saveContractMutation.mutate({
                              partnerId: selectedPartnerId!,
                              cityId: selectedCityId!,
                              contractFileUrl: contractPreview.contractFileUrl,
                              contractInfo: data,
                            });
                          }}
                          onCancel={() => {
                            setEditingContract(false);
                            setContractPreview(null);
                            setEditFormData({});
                          }}
                          isSaving={saveContractMutation.isPending}
                        />
                      ) : contractInfo ? (
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
                                  variant="outline"
                                  onClick={() => {
                                    setEditingContract(true);
                                    setContractPreview({
                                      contractFileUrl: contractInfo.contractFileUrl || "",
                                      contractInfo: contractInfo,
                                    });
                                  }}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  编辑合同
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
                                  {contractInfo.equityRatioPartner ? `${parseFloat(contractInfo.equityRatioPartner)}%` : "未设置"}
                                </div>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">品牌方股权比例</Label>
                                <div className="mt-1 text-2xl font-bold">
                                  {contractInfo.equityRatioBrand ? `${parseFloat(contractInfo.equityRatioBrand)}%` : "未设置"}
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
                                    {(() => {
                                      const ratio = contractInfo.currentProfitStage === 1
                                        ? contractInfo.profitRatioStage1Partner
                                        : contractInfo.currentProfitStage === 2
                                        ? contractInfo.isInvestmentRecovered
                                          ? contractInfo.profitRatioStage2BPartner
                                          : contractInfo.profitRatioStage2APartner
                                        : contractInfo.profitRatioStage3Partner;
                                      return ratio ? `${parseFloat(ratio)}%` : "未设置";
                                    })()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">品牌方分红：</span>
                                  <span className="text-xl font-bold ml-2">
                                    {(() => {
                                      const ratio = contractInfo.currentProfitStage === 1
                                        ? contractInfo.profitRatioStage1Brand
                                        : contractInfo.currentProfitStage === 2
                                        ? contractInfo.isInvestmentRecovered
                                          ? contractInfo.profitRatioStage2BBrand
                                          : contractInfo.profitRatioStage2ABrand
                                        : contractInfo.profitRatioStage3Brand;
                                      return ratio ? `${parseFloat(ratio)}%` : "未设置";
                                    })()}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2">
                                <Badge variant={
                                  contractInfo.isInvestmentRecovered === null || contractInfo.isInvestmentRecovered === undefined
                                    ? "outline"
                                    : contractInfo.isInvestmentRecovered
                                    ? "default"
                                    : "secondary"
                                }>
                                  {contractInfo.isInvestmentRecovered === null || contractInfo.isInvestmentRecovered === undefined
                                    ? "待确认"
                                    : contractInfo.isInvestmentRecovered
                                    ? "已回本"
                                    : "未回本"}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* 投资费用 */}
                          <div>
                            <h3 className="text-lg font-semibold mb-4">投资费用明细</h3>
                            <div className="space-y-4">
                              {/* 品牌使用费（总金额，自动计算） */}
                              <div className="p-4 bg-primary/5 rounded-lg">
                                <Label className="text-muted-foreground font-semibold">品牌使用费（总金额）</Label>
                                <div className="mt-2 text-2xl font-bold">
                                  ￥{(
                                    (contractInfo.managementFee ? parseFloat(contractInfo.managementFee) : 0) +
                                    (contractInfo.operationPositionFee ? parseFloat(contractInfo.operationPositionFee) : 0) +
                                    (contractInfo.teacherRecruitmentFee ? parseFloat(contractInfo.teacherRecruitmentFee) : 0) +
                                    (contractInfo.marketingFee ? parseFloat(contractInfo.marketingFee) : 0)
                                  ).toFixed(2)}
                                </div>
                                <div className="mt-3 text-sm text-muted-foreground space-y-1">
                                  <div className="flex justify-between">
                                    <span>管理费</span>
                                    <span>￥{contractInfo.managementFee ? parseFloat(contractInfo.managementFee).toFixed(2) : "0.00"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>运营岗位费</span>
                                    <span>￥{contractInfo.operationPositionFee ? parseFloat(contractInfo.operationPositionFee).toFixed(2) : "0.00"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>老师招聘及培训费</span>
                                    <span>￥{contractInfo.teacherRecruitmentFee ? parseFloat(contractInfo.teacherRecruitmentFee).toFixed(2) : "0.00"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>营销推广费</span>
                                    <span>￥{contractInfo.marketingFee ? parseFloat(contractInfo.marketingFee).toFixed(2) : "0.00"}</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* 品牌授权押金（单独显示） */}
                              <div>
                                <Label className="text-muted-foreground">品牌授权押金</Label>
                                <div className="mt-1 text-xl font-semibold">
                                  ￥{contractInfo.brandAuthDeposit ? parseFloat(contractInfo.brandAuthDeposit).toFixed(2) : "0.00"}
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
                            <Label className="text-muted-foreground">账户名称</Label>
                            <div className="mt-1">{contractInfo.partnerAccountHolder || "未设置"}</div>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">开户行</Label>
                            <div className="mt-1">{contractInfo.partnerBankName || "未设置"}</div>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">账号</Label>
                            <div className="mt-1">{contractInfo.partnerBankAccount || "未设置"}</div>
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
