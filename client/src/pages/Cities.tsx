import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { CityMap } from "@/components/CityMap";
import { CityOrdersDialog } from "@/components/CityOrdersDialog";
import { ClassroomManagement } from "@/components/ClassroomManagement";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, MapPin, ArrowUpDown, ArrowUp, ArrowDown, Download, TrendingUp, Building2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

export default function Cities() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<any>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const { data: cities, isLoading, refetch } = trpc.analytics.getAllCitiesWithStats.useQuery();
  const createMutation = trpc.analytics.createCityConfig.useMutation();
  const updateMutation = trpc.analytics.updateCityPartnerConfig.useMutation();
  const deleteMutation = trpc.analytics.deleteCityConfig.useMutation();
  const exportCities = trpc.city.exportCities.useQuery(undefined, { enabled: false });
  const { data: cityTrends } = trpc.city.getCityMonthlyTrends.useQuery();
  const [selectedTrendCity, setSelectedTrendCity] = useState<string | null>(null);
  const [classroomManagementCity, setClassroomManagementCity] = useState<{ id: number; name: string } | null>(null);

  const [formData, setFormData] = useState({
    city: "",
    areaCode: "",
    description: "",
  });

  const handleExport = async () => {
    try {
      const result = await exportCities.refetch();
      if (result.data) {
        // 将Base64数据转换为Blob
        const byteCharacters = atob(result.data.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("导出成功");
      }
    } catch (error) {
      toast.error("导出失败");
    }
  };

  const handleCreate = async () => {
    if (!formData.city) {
      toast.error("请填写城市名称");
      return;
    }

    try {
      await createMutation.mutateAsync(formData);
      toast.success("城市创建成功");
      setIsCreateDialogOpen(false);
      setFormData({ city: "", areaCode: "", description: "" });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "创建失败");
    }
  };

  const handleUpdate = async () => {
    if (!editingCity) return;

    try {
      await updateMutation.mutateAsync({
        id: editingCity.id,
        areaCode: formData.areaCode,
        description: formData.description,
      });
      toast.success("城市更新成功");
      setEditingCity(null);
      setFormData({ city: "", areaCode: "", description: "" });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "更新失败");
    }
  };

  const handleDelete = async (id: number, cityName: string) => {
    if (!confirm(`确定要删除城市"${cityName}"吗?`)) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("城市删除成功");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "删除失败");
    }
  };

  const openEditDialog = (city: any) => {
    setEditingCity(city);
    setFormData({
      city: city.city,
      areaCode: city.areaCode || "",
      description: city.description || "",
    });
  };

  const formatCurrency = (value: number) => {
    return `￥${value.toFixed(2)}`;
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      // 如果已经按该字段排序,切换排序顺序
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 否则设置新的排序字段,默认降序
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  // 排序后的城市数据
  const sortedCities = cities ? [...cities].sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue: any = a[sortField as keyof typeof a];
    let bValue: any = b[sortField as keyof typeof b];
    
    // 处理特殊字段
    if (sortField === 'city') {
      aValue = a.city;
      bValue = b.city;
    } else if (sortField === 'orderCount') {
      aValue = a.orderCount;
      bValue = b.orderCount;
    } else if (sortField === 'totalSales') {
      aValue = a.totalSales;
      bValue = b.totalSales;
    } else if (sortField === 'totalExpense') {
      aValue = a.totalExpense;
      bValue = b.totalExpense;
    } else if (sortField === 'profit') {
      aValue = a.profit;
      bValue = b.profit;
    } else if (sortField === 'profitRate') {
      aValue = a.totalSales > 0 ? (a.profit / a.totalSales) * 100 : 0;
      bValue = b.totalSales > 0 ? (b.profit / b.totalSales) * 100 : 0;
    }
    
    // 比较
    if (typeof aValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    } else {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
  }) : [];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </DashboardLayout>
    );
  }

  const totalStats = cities?.reduce(
    (acc, city) => ({
      orderCount: acc.orderCount + city.orderCount,
      totalSales: acc.totalSales + city.totalSales,
      totalExpense: acc.totalExpense + city.totalExpense,
      profit: acc.profit + city.profit,
    }),
    { orderCount: 0, totalSales: 0, totalExpense: 0, profit: 0 }
  );

  return (
    <DashboardLayout>
    <div className="container py-8">
      {/* 地图可视化 */}
      <div className="mb-6">
        <CityMap onCityClick={(cityName) => {
          setSelectedCity(cityName);
          setShowOrdersDialog(true);
        }} />
      </div>

      {/* 城市业绩趋势图表 */}
      {cityTrends && cityTrends.length > 0 && (
        <Card className="mb-6 overflow-visible">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  城市业绩趋势
                </CardTitle>
                <CardDescription>
                  各城市月度订单量、销售额和利润变化趋势
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <select
                  className="px-3 py-2 border rounded-md text-sm"
                  value={selectedTrendCity || ""}
                  onChange={(e) => setSelectedTrendCity(e.target.value || null)}
                >
                  <option value="">所有城市</option>
                  {Array.from(new Map(cityTrends.map((t) => [t.city, t])).values()).map((trend, idx) => (
                    <option key={`${trend.city}-${idx}`} value={trend.city}>
                      {trend.city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-visible pb-8">
            {(() => {
              // 准备图表数据
              const displayTrends = selectedTrendCity
                ? cityTrends.filter((t) => t.city === selectedTrendCity)
                : cityTrends;

              // 合并所有城市的月度数据
              const monthlyDataMap: Record<string, {
                month: string;
                orderCount: number;
                revenue: number;
                profit: number;
              }> = {};

              displayTrends.forEach((trend) => {
                trend.monthlyData.forEach((data) => {
                  if (!monthlyDataMap[data.month]) {
                    monthlyDataMap[data.month] = {
                      month: data.month,
                      orderCount: 0,
                      revenue: 0,
                      profit: 0,
                    };
                  }
                  monthlyDataMap[data.month].orderCount += data.orderCount;
                  monthlyDataMap[data.month].revenue += data.revenue;
                  monthlyDataMap[data.month].profit += data.profit;
                });
              });

              const chartData = Object.values(monthlyDataMap)
                .sort((a, b) => a.month.localeCompare(b.month))
                .map((data) => ({
                  month: data.month,
                  "订单量": data.orderCount,
                  "销售额": Math.round(data.revenue),
                  "利润": Math.round(data.profit),
                }));

              return (
                <div className="space-y-6">
                  {/* 订单量趋势 */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">订单量趋势</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="订单量"
                          stroke="#8884d8"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 销售额和利润趋势 */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">销售额与利润趋势</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => `¥${value.toLocaleString()}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="销售额"
                          stroke="#82ca9d"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="利润"
                          stroke="#ffc658"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">城市管理</h1>
          <p className="text-muted-foreground mt-1">
            管理所有城市配置和统计数据
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exportCities.isLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            {exportCities.isLoading ? "导出中..." : "导出城市报表"}
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                添加城市
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>添加新城市</DialogTitle>
              <DialogDescription>
                填写城市信息
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="city">城市名称 *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="例如: 北京"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="areaCode">区号</Label>
                <Input
                  id="areaCode"
                  value={formData.areaCode}
                  onChange={(e) => setFormData({ ...formData, areaCode: e.target.value })}
                  placeholder="例如: 010"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">说明</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="备注信息"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 汇总统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总订单数</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats?.orderCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总销售额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats?.totalSales || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总费用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats?.totalExpense || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总利润</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: (totalStats?.profit || 0) >= 0 ? '#10b981' : '#ef4444' }}>
              {formatCurrency(totalStats?.profit || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 城市列表 */}
      <Card>
        <CardHeader>
          <CardTitle>城市列表</CardTitle>
          <CardDescription>
            共 {cities?.length || 0} 个城市
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('city')} className="h-8 p-0 hover:bg-transparent">
                    城市名称
                    {getSortIcon('city')}
                  </Button>
                </TableHead>
                <TableHead>区号</TableHead>
                <TableHead>合伙人费比例</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => handleSort('orderCount')} className="h-8 p-0 hover:bg-transparent">
                    订单数
                    {getSortIcon('orderCount')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => handleSort('totalSales')} className="h-8 p-0 hover:bg-transparent">
                    销售额
                    {getSortIcon('totalSales')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => handleSort('totalExpense')} className="h-8 p-0 hover:bg-transparent">
                    总费用
                    {getSortIcon('totalExpense')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => handleSort('profit')} className="h-8 p-0 hover:bg-transparent">
                    利润
                    {getSortIcon('profit')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => handleSort('profitRate')} className="h-8 p-0 hover:bg-transparent">
                    利润率
                    {getSortIcon('profitRate')}
                  </Button>
                </TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCities.map((city) => (
                <TableRow key={city.id}>
                  <TableCell className="font-medium">{city.city}</TableCell>
                  <TableCell>{city.areaCode || "-"}</TableCell>
                  <TableCell>{city.partnerFeeRate !== null && city.partnerFeeRate !== undefined ? `${city.partnerFeeRate}%` : "-"}</TableCell>
                  <TableCell className="text-right">{city.orderCount}</TableCell>
                  <TableCell className="text-right">{formatCurrency(city.totalSales)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(city.totalExpense)}</TableCell>
                  <TableCell className="text-right" style={{ color: city.profit >= 0 ? '#10b981' : '#ef4444' }}>
                    {formatCurrency(city.profit)}
                  </TableCell>
                  <TableCell className="text-right" style={{ color: city.profitRate >= 0 ? '#10b981' : '#ef4444' }}>
                    {city.profitRate.toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <Badge variant={city.isActive ? "default" : "secondary"}>
                      {city.isActive ? "启用" : "禁用"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(city)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setClassroomManagementCity({ id: city.id, name: city.city })}
                        title="教室管理"
                      >
                        <Building2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(city.id, city.city)}
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

      {/* 城市订单列表对话框 */}
      <CityOrdersDialog
        cityName={selectedCity}
        open={showOrdersDialog}
        onOpenChange={setShowOrdersDialog}
      />

      {/* 编辑对话框 */}
      <Dialog open={!!editingCity} onOpenChange={(open) => !open && setEditingCity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑城市配置</DialogTitle>
            <DialogDescription>
              修改 {editingCity?.city} 的配置信息
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-areaCode">区号</Label>
              <Input
                id="edit-areaCode"
                value={formData.areaCode}
                onChange={(e) => setFormData({ ...formData, areaCode: e.target.value })}
                placeholder="例如: 010"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">说明</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="备注信息"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCity(null)}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "更新中..." : "更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 教室管理对话框 */}
      {classroomManagementCity && (
        <ClassroomManagement
          cityId={classroomManagementCity.id}
          cityName={classroomManagementCity.name}
          open={!!classroomManagementCity}
          onOpenChange={(open) => !open && setClassroomManagementCity(null)}
        />
      )}
    </div>
    </DashboardLayout>
  );
}
