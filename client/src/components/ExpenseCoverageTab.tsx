import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ExpenseCoverageTabProps {
  partnerId: number;
}

// 费用项目配置
const EXPENSE_ITEMS = [
  { key: "rentFee", label: "房租" },
  { key: "propertyFee", label: "物业费" },
  { key: "utilityFee", label: "水电费" },
  { key: "consumablesFee", label: "道具耗材" },
  { key: "cleaningFee", label: "保洁费" },
  { key: "phoneFee", label: "话费" },
  { key: "deferredPayment", label: "合同后付款" },
  { key: "courierFee", label: "快递费" },
  { key: "promotionFee", label: "推广费" },
  { key: "teacherFee", label: "老师费用" },
  { key: "transportFee", label: "车费" },
  { key: "otherFee", label: "其他费用" },
] as const;

type ExpenseKey = typeof EXPENSE_ITEMS[number]["key"];

export function ExpenseCoverageTab({ partnerId }: ExpenseCoverageTabProps) {
  const [coverage, setCoverage] = useState<Record<ExpenseKey, boolean>>({
    rentFee: false,
    propertyFee: false,
    utilityFee: false,
    consumablesFee: false,
    cleaningFee: false,
    phoneFee: false,
    deferredPayment: false,
    courierFee: false,
    promotionFee: false,
    teacherFee: false,
    transportFee: false,
    otherFee: false,
  });

  const [hasChanges, setHasChanges] = useState(false);

  // 获取费用承担配置
  const { data, isLoading } = trpc.partnerManagement.getExpenseCoverage.useQuery(
    { partnerId },
    { enabled: !!partnerId }
  );

  // 更新费用承担配置
  const updateMutation = trpc.partnerManagement.updateExpenseCoverage.useMutation({
    onSuccess: () => {
      toast.success("费用承担配置已保存");
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error(`保存失败：${error.message}`);
    },
  });

  // 加载数据时更新状态
  useEffect(() => {
    if (data) {
      setCoverage(data as Record<ExpenseKey, boolean>);
      setHasChanges(false);
    }
  }, [data]);

  const handleToggle = (key: ExpenseKey) => {
    setCoverage((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      partnerId,
      expenseCoverage: coverage,
    });
  };

  const handleSelectAll = () => {
    const allSelected = EXPENSE_ITEMS.every((item) => coverage[item.key]);
    const newCoverage = EXPENSE_ITEMS.reduce((acc, item) => {
      acc[item.key] = !allSelected;
      return acc;
    }, {} as Record<ExpenseKey, boolean>);
    setCoverage(newCoverage);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedCount = EXPENSE_ITEMS.filter((item) => coverage[item.key]).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>费用承担配置</CardTitle>
          <CardDescription>
            选择该合伙人需要承担的费用项目。勾选的费用项目将按照合伙人的费用分摊比例计算进合伙人承担总费用。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 统计信息 */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">已选择费用项目</p>
              <p className="text-2xl font-bold">
                {selectedCount} / {EXPENSE_ITEMS.length}
              </p>
            </div>
            <Button variant="outline" onClick={handleSelectAll}>
              {selectedCount === EXPENSE_ITEMS.length ? "取消全选" : "全选"}
            </Button>
          </div>

          {/* 费用项目列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXPENSE_ITEMS.map((item) => (
              <div
                key={item.key}
                className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                onClick={() => handleToggle(item.key)}
              >
                <Checkbox
                  id={item.key}
                  checked={coverage[item.key]}
                  onCheckedChange={() => handleToggle(item.key)}
                  onClick={(e) => e.stopPropagation()}
                />
                <label
                  htmlFor={item.key}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {item.label}
                </label>
              </div>
            ))}
          </div>

          {/* 保存按钮 */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              保存配置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 说明卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">配置说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• 费用承担配置将应用于该合伙人管理的所有城市</p>
          <p>• 城市费用账单中的"合伙人承担总费用"将根据此配置自动计算</p>
          <p>• 计算公式：合伙人承担总费用 = Σ(勾选的费用项目金额 × 费用分摊比例)</p>
          <p>• 修改配置后，所有月份的账单将按新配置重新计算</p>
        </CardContent>
      </Card>
    </div>
  );
}
