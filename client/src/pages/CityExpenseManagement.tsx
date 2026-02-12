import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Calendar, Download, Upload, FileDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CityExpenseManagement() {
  const utils = trpc.useUtils();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  // 筛选条件
  const [selectedCityId, setSelectedCityId] = useState<number | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  
  // 表单数据
  const [formData, setFormData] = useState({
    cityId: 0,
    cityName: "",
    month: format(new Date(), "yyyy-MM"),
    rentFee: "",
    propertyFee: "",
    utilityFee: "",
    consumablesFee: "",
    cleaningFee: "",
    phoneFee: "",
    deferredPayment: "",
    expressFee: "",
    promotionFee: "",
    otherFee: "",
    teacherFee: "0.00",
    transportFee: "0.00",
    notes: "",
  });
  
  // 获取城市列表
  const { data: cities } = trpc.cityExpense.getCities.useQuery();
  
  // 获取费用账单列表
  const { data: expenses, isLoading } = trpc.cityExpense.list.useQuery({
    cityId: selectedCityId,
    month: selectedMonth || undefined,
  });
  
  // 创建/更新费用账单
  const upsertMutation = trpc.cityExpense.upsert.useMutation({
    onSuccess: (data) => {
      toast.success(data.isNew ? "费用账单创建成功" : "费用账单更新成功");
      utils.cityExpense.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });
  
  // 删除费用账单
  const deleteMutation = trpc.cityExpense.delete.useMutation({
    onSuccess: () => {
      toast.success("费用账单删除成功");
      utils.cityExpense.list.invalidate();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });
  
  // 下载模板
  const downloadTemplateMutation = trpc.cityExpense.downloadTemplate.useMutation({
    onSuccess: (data) => {
      const link = document.createElement("a");
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data.data}`;
      link.download = data.filename;
      link.click();
      toast.success("模板下载成功");
    },
    onError: (error) => {
      toast.error(`模板下载失败: ${error.message}`);
    },
  });
  
  // 批量导入
  const batchImportMutation = trpc.cityExpense.batchImport.useMutation({
    onSuccess: (result) => {
      toast.success(`导入完成！成功: ${result.success} 条，失败: ${result.failed} 条`);
      if (result.failedRecords.length > 0) {
        console.log("失败记录:", result.failedRecords);
      }
      utils.cityExpense.list.invalidate();
      setIsImporting(false);
    },
    onError: (error) => {
      toast.error(`导入失败: ${error.message}`);
      setIsImporting(false);
    },
  });
  
  // 导出数据
  const exportDataMutation = trpc.cityExpense.exportData.useMutation({
    onSuccess: (data) => {
      const link = document.createElement("a");
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data.data}`;
      link.download = data.filename;
      link.click();
      toast.success("数据导出成功");
    },
    onError: (error) => {
      toast.error(`导出失败: ${error.message}`);
    },
  });
  
  const resetForm = () => {
    setFormData({
      cityId: 0,
      cityName: "",
      month: format(new Date(), "yyyy-MM"),
      rentFee: "",
      propertyFee: "",
      utilityFee: "",
      consumablesFee: "",
      cleaningFee: "",
      phoneFee: "",
      deferredPayment: "",
      expressFee: "",
      promotionFee: "",
      otherFee: "",
      teacherFee: "0.00",
      transportFee: "0.00",
      notes: "",
    });
    setEditingExpense(null);
  };
  
  const handleOpenDialog = (expense?: any) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        cityId: expense.cityId,
        cityName: expense.cityName,
        month: expense.month,
        rentFee: expense.rentFee || "",
        propertyFee: expense.propertyFee || "",
        utilityFee: expense.utilityFee || "",
        consumablesFee: expense.consumablesFee || "",
        cleaningFee: expense.cleaningFee || "",
        phoneFee: expense.phoneFee || "",
        deferredPayment: expense.deferredPayment || "",
        expressFee: expense.expressFee || "",
        promotionFee: expense.promotionFee || "",
        otherFee: expense.otherFee || "",
        teacherFee: expense.teacherFee || "0.00",
        transportFee: expense.transportFee || "0.00",
        notes: expense.notes || "",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };
  
  const handleSubmit = () => {
    if (!formData.cityId || !formData.cityName || !formData.month) {
      toast.error("请选择城市和月份");
      return;
    }
    
    upsertMutation.mutate(formData);
  };
  
  const handleDelete = (id: number) => {
    if (confirm("确定要删除这条费用账单吗？")) {
      deleteMutation.mutate({ id });
    }
  };
  
  const handleDownloadTemplate = () => {
    downloadTemplateMutation.mutate();
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const base64Data = base64.split(",")[1];
      setIsImporting(true);
      batchImportMutation.mutate({ fileData: base64Data });
    };
    reader.readAsDataURL(file);
    
    // 重置input以便能多次上传同一文件
    event.target.value = "";
  };
  
  const handleExport = () => {
    exportDataMutation.mutate({
      cityId: selectedCityId,
      month: selectedMonth || undefined,
    });
  };
  
  const handleCityChange = (cityId: string) => {
    const city = cities?.find(c => c.id === parseInt(cityId));
    if (city) {
      setFormData({
        ...formData,
        cityId: city.id,
        cityName: city.name,
      });
    }
  };
  
  // 计算总费用 = 房租 + 物业费 + 水电费 + 道具耗材 + 保洁费 + 话费 + 快递费 + 推广费 + 其他费用 + 老师费用 + 车费
  // 注意:合同后付款不计入总费用
  const calculateTotal = () => {
    return (
      parseFloat(formData.rentFee || "0") +
      parseFloat(formData.propertyFee || "0") +
      parseFloat(formData.utilityFee || "0") +
      parseFloat(formData.consumablesFee || "0") +
      parseFloat(formData.cleaningFee || "0") +
      parseFloat(formData.phoneFee || "0") +
      parseFloat(formData.expressFee || "0") +
      parseFloat(formData.promotionFee || "0") +
      parseFloat(formData.otherFee || "0") +
      parseFloat(formData.teacherFee || "0") +
      parseFloat(formData.transportFee || "0")
    ).toFixed(2);
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">城市费用账单管理</h1>
            <p className="text-muted-foreground mt-1">管理每个城市的月度费用支出记录</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate} disabled={downloadTemplateMutation.isPending}>
              <FileDown className="h-4 w-4 mr-2" />
              {downloadTemplateMutation.isPending ? "下载中..." : "下载模板"}
            </Button>
            <Button variant="outline" onClick={() => document.getElementById("file-upload")?.click()} disabled={isImporting}>
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? "导入中..." : "批量导入"}
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
            <Button variant="outline" onClick={handleExport} disabled={exportDataMutation.isPending}>
              <Download className="h-4 w-4 mr-2" />
              {exportDataMutation.isPending ? "导出中..." : "导出"}
            </Button>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                添加费用账单
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingExpense ? "编辑费用账单" : "添加费用账单"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>城市 *</Label>
                    <Select
                      value={formData.cityId.toString()}
                      onValueChange={handleCityChange}
                      disabled={!!editingExpense}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择城市" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities?.map((city) => (
                          <SelectItem key={city.id} value={city.id.toString()}>
                            {city.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
              <div className="space-y-2">
                <Label>月份</Label>
                <Select value={selectedMonth || "all"} onValueChange={(val) => setSelectedMonth(val === "all" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部月份" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部月份</SelectItem>
                    {expenses && Array.from(new Set(expenses.map(e => e.month))).sort().reverse().map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>房租</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.rentFee}
                      onChange={(e) => setFormData({ ...formData, rentFee: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>物业费</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.propertyFee}
                      onChange={(e) => setFormData({ ...formData, propertyFee: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>水电费</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.utilityFee}
                      onChange={(e) => setFormData({ ...formData, utilityFee: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>道具耗材</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.consumablesFee}
                      onChange={(e) => setFormData({ ...formData, consumablesFee: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>保洁费</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.cleaningFee}
                      onChange={(e) => setFormData({ ...formData, cleaningFee: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>话费</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.phoneFee}
                      onChange={(e) => setFormData({ ...formData, phoneFee: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>合同后付款</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.deferredPayment}
                      onChange={(e) => setFormData({ ...formData, deferredPayment: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>快递费</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.expressFee}
                      onChange={(e) => setFormData({ ...formData, expressFee: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>推广费</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.promotionFee}
                      onChange={(e) => setFormData({ ...formData, promotionFee: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>其他费用</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.otherFee}
                      onChange={(e) => setFormData({ ...formData, otherFee: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>老师费用（自动计算）</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.teacherFee || "0.00"}
                      disabled
                      className="bg-blue-50"
                    />
                    <p className="text-xs text-muted-foreground">根据订单数据自动汇总</p>
                  </div>
                  <div className="space-y-2">
                    <Label>车费（自动计算）</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.transportFee || "0.00"}
                      disabled
                      className="bg-blue-50"
                    />
                    <p className="text-xs text-muted-foreground">根据订单数据自动汇总</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>备注</Label>
                  <Textarea
                    placeholder="输入备注信息..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">总费用：</span>
                    <span className="text-2xl font-bold text-primary">¥{calculateTotal()}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* 筛选条件 */}
        <Card>
          <CardHeader>
            <CardTitle>筛选条件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="w-[200px]">
                <Label>城市</Label>
                <Select
                  value={selectedCityId?.toString() || "all"}
                  onValueChange={(value) => setSelectedCityId(value === "all" ? undefined : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部城市" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部城市</SelectItem>
                    {cities?.map((city) => (
                      <SelectItem key={city.id} value={city.id.toString()}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[200px]">
                <Label>月份</Label>
                <Select value={selectedMonth || "all"} onValueChange={(val) => setSelectedMonth(val === "all" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部月份" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部月份</SelectItem>
                    {expenses && Array.from(new Set(expenses.map(e => e.month))).sort().reverse().map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 费用账单列表 */}
        <Card>
          <CardHeader>
            <CardTitle>费用账单列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>城市</TableHead>
                    <TableHead className="text-right">费用分摄比例</TableHead>
                    <TableHead>月份</TableHead>
                    <TableHead className="text-right">房租</TableHead>
                    <TableHead className="text-right">物业费</TableHead>
                    <TableHead className="text-right">水电费</TableHead>
                    <TableHead className="text-right">道具耗材</TableHead>
                    <TableHead className="text-right">保洁费</TableHead>
                    <TableHead className="text-right">话费</TableHead>
                    <TableHead className="text-right">合同后付款</TableHead>
                    <TableHead className="text-right">快递费</TableHead>
                    <TableHead className="text-right">推广费</TableHead>
                    <TableHead className="text-right">其他费用</TableHead>
                    <TableHead className="text-right">老师费用</TableHead>
                    <TableHead className="text-right">车费</TableHead>
                    <TableHead className="text-right">总费用</TableHead>
                    <TableHead className="text-right">合伙人承担</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={18} className="text-center text-muted-foreground">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : expenses && expenses.length > 0 ? (
                    expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.cityName}</TableCell>
                        <TableCell className="text-right">
                          {expense.costShareRatio ? `${parseFloat(expense.costShareRatio).toFixed(0)}%` : '-'}
                        </TableCell>
                        <TableCell>{expense.month}</TableCell>
                        <TableCell className="text-right">￥{parseFloat(expense.rentFee || "0").toLocaleString()}</TableCell>
                        <TableCell className="text-right">¥{parseFloat(expense.propertyFee || "0").toLocaleString()}</TableCell>
                        <TableCell className="text-right">¥{parseFloat(expense.utilityFee || "0").toLocaleString()}</TableCell>
                        <TableCell className="text-right">¥{parseFloat(expense.consumablesFee || "0").toLocaleString()}</TableCell>
                        <TableCell className="text-right">¥{parseFloat(expense.cleaningFee || "0").toLocaleString()}</TableCell>
                        <TableCell className="text-right">¥{parseFloat(expense.phoneFee || "0").toLocaleString()}</TableCell>
                        <TableCell className="text-right">¥{parseFloat(expense.deferredPayment || "0").toLocaleString()}</TableCell>
                        <TableCell className="text-right">¥{parseFloat(expense.expressFee || "0").toLocaleString()}</TableCell>
                        <TableCell className="text-right">¥{parseFloat(expense.promotionFee || "0").toLocaleString()}</TableCell>
                        <TableCell className="text-right">¥{parseFloat(expense.otherFee || "0").toLocaleString()}</TableCell>
                        <TableCell className="text-right">¥{parseFloat(expense.teacherFee || "0").toLocaleString()}</TableCell>
                        <TableCell className="text-right">¥{parseFloat(expense.transportFee || "0").toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">¥{parseFloat(expense.totalExpense || "0").toLocaleString()}</TableCell>
                        <TableCell className="text-right text-blue-600 font-medium">¥{parseFloat(expense.partnerShare || "0").toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(expense)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(expense.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={18} className="text-center text-muted-foreground">
                        暂无费用账单数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
