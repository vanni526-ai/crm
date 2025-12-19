import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GmailImportConfig() {
  // 城市区号映射
  const [cityAreaCodes, setCityAreaCodes] = useState<Record<string, string>>({});
  const [newCity, setNewCity] = useState("");
  const [newAreaCode, setNewAreaCode] = useState("");

  // 销售人员别名
  const [salesAliases, setSalesAliases] = useState<Record<string, string>>({});
  const [newAlias, setNewAlias] = useState("");
  const [newRealName, setNewRealName] = useState("");

  // 默认费用比例
  const [defaultFees, setDefaultFees] = useState({
    teacherFeeRate: 0.5,
    transportFeeDefault: 200,
  });

  // 常见错误映射
  const [errorMappings, setErrorMappings] = useState<Record<string, string>>({});
  const [newWrongValue, setNewWrongValue] = useState("");
  const [newCorrectValue, setNewCorrectValue] = useState("");

  // 获取所有配置
  const { data: configs, refetch } = trpc.gmailAutoImport.getAllConfigs.useQuery();

  // 保存配置
  const upsertConfigMutation = trpc.gmailAutoImport.upsertConfig.useMutation({
    onSuccess: () => {
      toast.success("配置保存成功");
      refetch();
    },
    onError: (error) => {
      toast.error("保存失败", { description: error.message });
    },
  });

  // 加载配置
  useEffect(() => {
    if (configs) {
      const cityConfig = configs.find((c: any) => c.configKey === "city_area_codes");
      if (cityConfig && typeof cityConfig.configValue === 'object') {
        setCityAreaCodes(cityConfig.configValue as Record<string, string>);
      }

      const aliasConfig = configs.find((c: any) => c.configKey === "sales_aliases");
      if (aliasConfig && typeof aliasConfig.configValue === 'object') {
        setSalesAliases(aliasConfig.configValue as Record<string, string>);
      }

      const feeConfig = configs.find((c: any) => c.configKey === "default_fees");
      if (feeConfig && typeof feeConfig.configValue === 'object') {
        setDefaultFees(feeConfig.configValue as { teacherFeeRate: number; transportFeeDefault: number });
      }

      const errorConfig = configs.find((c: any) => c.configKey === "error_mappings");
      if (errorConfig && typeof errorConfig.configValue === 'object') {
        setErrorMappings(errorConfig.configValue as Record<string, string>);
      }
    }
  }, [configs]);

  // 保存城市区号映射
  const handleSaveCityAreaCodes = () => {
    upsertConfigMutation.mutate({
      configKey: "city_area_codes",
      configValue: cityAreaCodes,
      description: "城市区号映射表,用于生成订单号",
    });
  };

  // 添加城市
  const handleAddCity = () => {
    if (!newCity || !newAreaCode) {
      toast.error("请填写城市和区号");
      return;
    }
    setCityAreaCodes({ ...cityAreaCodes, [newCity]: newAreaCode });
    setNewCity("");
    setNewAreaCode("");
  };

  // 删除城市
  const handleDeleteCity = (city: string) => {
    const updated = { ...cityAreaCodes };
    delete updated[city];
    setCityAreaCodes(updated);
  };

  // 保存销售人员别名
  const handleSaveSalesAliases = () => {
    upsertConfigMutation.mutate({
      configKey: "sales_aliases",
      configValue: salesAliases,
      description: "销售人员别名映射,用于识别不同叫法的销售人员",
    });
  };

  // 添加别名
  const handleAddAlias = () => {
    if (!newAlias || !newRealName) {
      toast.error("请填写别名和真实姓名");
      return;
    }
    setSalesAliases({ ...salesAliases, [newAlias]: newRealName });
    setNewAlias("");
    setNewRealName("");
  };

  // 删除别名
  const handleDeleteAlias = (alias: string) => {
    const updated = { ...salesAliases };
    delete updated[alias];
    setSalesAliases(updated);
  };

  // 保存默认费用比例
  const handleSaveDefaultFees = () => {
    upsertConfigMutation.mutate({
      configKey: "default_fees",
      configValue: defaultFees,
      description: "默认费用比例配置",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center gap-4">
          <Link href="/gmail-import">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Gmail导入配置</h1>
            <p className="text-muted-foreground mt-1">配置解析规则,提高自动导入的准确性</p>
          </div>
        </div>

        <Tabs defaultValue="city" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="city">城市区号</TabsTrigger>
            <TabsTrigger value="sales">销售人员别名</TabsTrigger>
            <TabsTrigger value="fees">默认费用</TabsTrigger>
            <TabsTrigger value="errors">错误映射</TabsTrigger>
          </TabsList>

          {/* 城市区号配置 */}
          <TabsContent value="city">
            <Card>
              <CardHeader>
                <CardTitle>城市区号映射</CardTitle>
                <CardDescription>
                  配置城市对应的区号,用于生成订单号。例如:无锡 → 0510
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 现有映射列表 */}
                <div className="space-y-2">
                  {Object.entries(cityAreaCodes).map(([city, areaCode]) => (
                    <div key={city} className="flex items-center gap-2 p-2 border rounded-md">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium">{city}</span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">{areaCode}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCity(city)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* 添加新映射 */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="newCity">城市</Label>
                    <Input
                      id="newCity"
                      placeholder="例如:无锡"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="newAreaCode">区号</Label>
                    <Input
                      id="newAreaCode"
                      placeholder="例如:0510"
                      value={newAreaCode}
                      onChange={(e) => setNewAreaCode(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddCity}>
                      <Plus className="w-4 h-4 mr-2" />
                      添加
                    </Button>
                  </div>
                </div>

                {/* 保存按钮 */}
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveCityAreaCodes} disabled={upsertConfigMutation.isPending}>
                    {upsertConfigMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    保存配置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 销售人员别名配置 */}
          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>销售人员别名</CardTitle>
                <CardDescription>
                  配置销售人员的不同叫法,帮助系统正确识别。例如:昭昭 → 张昭昭
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 现有别名列表 */}
                <div className="space-y-2">
                  {Object.entries(salesAliases).map(([alias, realName]) => (
                    <div key={alias} className="flex items-center gap-2 p-2 border rounded-md">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium">{alias}</span>
                          <span className="text-xs text-muted-foreground ml-2">(别名)</span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">{realName}</span>
                          <span className="text-xs text-muted-foreground ml-2">(真实姓名)</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAlias(alias)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* 添加新别名 */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="newAlias">别名</Label>
                    <Input
                      id="newAlias"
                      placeholder="例如:昭昭"
                      value={newAlias}
                      onChange={(e) => setNewAlias(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="newRealName">真实姓名</Label>
                    <Input
                      id="newRealName"
                      placeholder="例如:张昭昭"
                      value={newRealName}
                      onChange={(e) => setNewRealName(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddAlias}>
                      <Plus className="w-4 h-4 mr-2" />
                      添加
                    </Button>
                  </div>
                </div>

                {/* 保存按钮 */}
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveSalesAliases} disabled={upsertConfigMutation.isPending}>
                    {upsertConfigMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    保存配置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 默认费用配置 */}
          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <CardTitle>默认费用配置</CardTitle>
                <CardDescription>
                  配置默认的老师费用比例和车费,用于自动计算
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="teacherFeeRate">老师费用比例</Label>
                    <Input
                      id="teacherFeeRate"
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={defaultFees.teacherFeeRate}
                      onChange={(e) =>
                        setDefaultFees({ ...defaultFees, teacherFeeRate: parseFloat(e.target.value) })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      老师费用占课程金额的比例 (0-1之间,例如0.5表示50%)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="transportFeeDefault">默认车费(元)</Label>
                    <Input
                      id="transportFeeDefault"
                      type="number"
                      min="0"
                      value={defaultFees.transportFeeDefault}
                      onChange={(e) =>
                        setDefaultFees({ ...defaultFees, transportFeeDefault: parseInt(e.target.value) })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      当邮件中未提到车费时使用的默认值
                    </p>
                  </div>
                </div>

                {/* 保存按钮 */}
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveDefaultFees} disabled={upsertConfigMutation.isPending}>
                    {upsertConfigMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    保存配置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 常见错误映射配置 */}
          <TabsContent value="errors">
            <Card>
              <CardHeader>
                <CardTitle>常见错误映射</CardTitle>
                <CardDescription>
                  配置常见的同音字错误映射，系统会自动纠正。例如：瀑姬 → 瀛姬
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 现有映射列表 */}
                <div className="space-y-2">
                  {Object.entries(errorMappings).map(([wrongValue, correctValue]) => (
                    <div key={wrongValue} className="flex items-center gap-2 p-2 border rounded-md">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-red-600">{wrongValue}</span>
                          <span className="text-xs text-muted-foreground ml-2">(错误)</span>
                        </div>
                        <div>
                          <span className="text-sm text-green-600">{correctValue}</span>
                          <span className="text-xs text-muted-foreground ml-2">(正确)</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updated = { ...errorMappings };
                          delete updated[wrongValue];
                          setErrorMappings(updated);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  {Object.keys(errorMappings).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      还没有配置错误映射，请添加常见的错误字和正确字的对应关系
                    </p>
                  )}
                </div>

                {/* 添加新映射 */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="newWrongValue">错误的字</Label>
                    <Input
                      id="newWrongValue"
                      placeholder="例如：瀑姬"
                      value={newWrongValue}
                      onChange={(e) => setNewWrongValue(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="newCorrectValue">正确的字</Label>
                    <Input
                      id="newCorrectValue"
                      placeholder="例如：瀛姬"
                      value={newCorrectValue}
                      onChange={(e) => setNewCorrectValue(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => {
                        if (newWrongValue && newCorrectValue) {
                          setErrorMappings({ ...errorMappings, [newWrongValue]: newCorrectValue });
                          setNewWrongValue("");
                          setNewCorrectValue("");
                        }
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      添加
                    </Button>
                  </div>
                </div>

                {/* 保存按钮 */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      upsertConfigMutation.mutate({
                        configKey: "error_mappings",
                        configValue: errorMappings,
                        description: "常见错误字映射表，用于自动纠正同音字错误",
                      });
                    }}
                    disabled={upsertConfigMutation.isPending}
                  >
                    {upsertConfigMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Save className="w-4 h-4 mr-2" />
                    保存配置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
