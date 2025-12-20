import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Eye, Edit, Upload, Download, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as XLSX from "xlsx";
import DashboardLayout from "@/components/DashboardLayout";

const teacherSchema = z.object({
  name: z.string().min(1, "老师姓名不能为空"),
  phone: z.string().optional(),
  status: z.string().optional(),
  customerType: z.string().optional(),
  notes: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  aliases: z.string().optional(), // 别名(逗号分隔)
  // 兼容旧字段
  nickname: z.string().optional(),
  email: z.string().email("请输入有效的邮箱地址").optional().or(z.literal("")),
  wechat: z.string().optional(),
  hourlyRate: z.string().optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

export default function Teachers() {
  const utils = trpc.useUtils();
  const { data: teachers, isLoading } = trpc.teachers.list.useQuery();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 统计数据查询
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'quarter' | 'year'>('all');
  const [statsStartDate, setStatsStartDate] = useState<Date | undefined>();
  const [statsEndDate, setStatsEndDate] = useState<Date | undefined>();
  
  const { data: allStats, isLoading: statsLoading } = trpc.teachers.getAllStats.useQuery({
    startDate: statsStartDate,
    endDate: statsEndDate,
  });
  
  const createTeacher = trpc.teachers.create.useMutation({
    onSuccess: () => {
      utils.teachers.list.invalidate();
      toast.success("老师创建成功");
      setCreateOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.message || "创建失败");
    },
  });

  const updateTeacher = trpc.teachers.update.useMutation({
    onSuccess: () => {
      utils.teachers.list.invalidate();
      toast.success("老师信息更新成功");
      setEditOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.message || "更新失败");
    },
  });

  const batchDeleteMutation = trpc.teachers.batchDelete.useMutation({
    onSuccess: (data) => {
      utils.teachers.list.invalidate();
      toast.success(`成功删除${data.deletedCount}位老师`);
      setSelectedIds([]);
    },
    onError: (error) => {
      toast.error(error.message || "批量删除失败");
    },
  });

  const batchUpdateStatusMutation = trpc.teachers.batchUpdateStatus.useMutation({
    onSuccess: (data) => {
      utils.teachers.list.invalidate();
      toast.success(`成功更新${data.updatedCount}位老师的状态`);
      setSelectedIds([]);
      setBatchStatusDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "批量更新失败");
    },
  });

  const importMutation = trpc.teachers.importFromExcel.useMutation({
    onSuccess: (data) => {
      utils.teachers.list.invalidate();
      toast.success(`成功导入${data.importedCount}位老师`);
      setImporting(false);
    },
    onError: (error) => {
      toast.error(error.message || "导入失败");
      setImporting(false);
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [batchStatusDialogOpen, setBatchStatusDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [importing, setImporting] = useState(false);
  const [newStatus, setNewStatus] = useState("活跃");
  
  // 处理时间范围切换
  const handleDateRangeChange = (range: 'all' | 'month' | 'quarter' | 'year') => {
    setDateRange(range);
    const now = new Date();
    
    if (range === 'all') {
      setStatsStartDate(undefined);
      setStatsEndDate(undefined);
    } else if (range === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStatsStartDate(startOfMonth);
      setStatsEndDate(now);
    } else if (range === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      setStatsStartDate(startOfQuarter);
      setStatsEndDate(now);
    } else if (range === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      setStatsStartDate(startOfYear);
      setStatsEndDate(now);
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
  });

  const handleCreate = (data: TeacherFormData) => {
    createTeacher.mutate(data);
  };

  const handleEdit = (teacher: any) => {
    setSelectedTeacher(teacher);
    setValue("name", teacher.name);
    setValue("phone", teacher.phone || "");
    setValue("status", teacher.status || "活跃");
    setValue("customerType", teacher.customerType || "");
    setValue("notes", teacher.notes || "");
    setValue("category", teacher.category || "");
    setValue("city", teacher.city || "");
    // 将aliases数组转换为逗号分隔的字符串
    const aliasesStr = teacher.aliases ? 
      (typeof teacher.aliases === 'string' ? teacher.aliases : JSON.parse(teacher.aliases).join(', ')) : 
      '';
    setValue("aliases", aliasesStr);
    setValue("nickname", teacher.nickname || "");
    setValue("email", teacher.email || "");
    setValue("wechat", teacher.wechat || "");
    setValue("hourlyRate", teacher.hourlyRate || "");
    setValue("bankAccount", teacher.bankAccount || "");
    setValue("bankName", teacher.bankName || "");
    setEditOpen(true);
  };

  const handleUpdate = (data: TeacherFormData) => {
    if (!selectedTeacher) return;
    // 只提交编辑对话框中存在的字段
    const updateData = {
      name: data.name,
      phone: data.phone,
      status: data.status,
      category: data.category,
      city: data.city,
      customerType: data.customerType,
      aliases: data.aliases,
      notes: data.notes,
    };
    updateTeacher.mutate({
      id: selectedTeacher.id,
      data: updateData,
    });
  };

  const handleViewDetail = (teacher: any) => {
    setSelectedTeacher(teacher);
    setDetailOpen(true);
  };

  // 多选功能
  const handleSelectAll = (checked: boolean) => {
    if (checked && teachers) {
      setSelectedIds(teachers.map((t: any) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedIds.length === 0) {
      toast.error("请先选择要删除的老师");
      return;
    }
    if (confirm(`确定要删除选中的${selectedIds.length}位老师吗?`)) {
      batchDeleteMutation.mutate({ ids: selectedIds });
    }
  };

  // 批量更新状态
  const handleBatchUpdateStatus = () => {
    if (selectedIds.length === 0) {
      toast.error("请先选择要更新的老师");
      return;
    }
    setBatchStatusDialogOpen(true);
  };

  const confirmBatchUpdateStatus = () => {
    batchUpdateStatusMutation.mutate({ ids: selectedIds, status: newStatus });
  };

  // Excel导入
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    toast.info("正在解析Excel文件...");
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      const allTeachers: any[] = [];
      
      // 处理每个工作表
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        
        // 智能识别格式:检查第一行是否是标题行(非列名)
        const allRows: any[] = XLSX.utils.sheet_to_json(worksheet, { range: 0, header: 1 });
        const firstRow: any[] = allRows[0] || [];
        const hasExtraTitle = firstRow.length > 0 && 
          !firstRow.includes('姓名') && 
          !firstRow.includes('name') &&
          (firstRow[0]?.toString().includes('老师') || firstRow[0]?.toString().includes('合伙'));
        
        // 根据是否有额外标题行决定跳过的行数
        const skipRows = hasExtraTitle ? 2 : 1;
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { range: skipRows });
        
        jsonData.forEach((row: any) => {
          console.log('解析行数据:', row);
          const teacher = {
            name: row['姓名'] || row['name'] || '',
            phone: row['电话号码'] || row['phone'] ? String(row['电话号码'] || row['phone']) : '',
            status: row['活跃状态'] || row['status'] || '活跃',
            customerType: row['受众客户类型'] || row['customerType'] || '',
            notes: row['备注'] || row['notes'] || '',
            category: sheetName.includes('本部') ? '本部老师' : sheetName.includes('合伙店') ? '合伙店老师' : '其他',
            city: row['地区'] || (sheetName.includes('天津') ? '天津' : sheetName.includes('上海') ? '上海' : ''),
          };
          
          console.log('解析后的老师数据:', teacher);
          
          // 只添加有姓名的记录
          if (teacher.name && teacher.name.trim()) {
            allTeachers.push(teacher);
          }
        });
      });
      
      if (allTeachers.length === 0) {
        toast.error("未找到有效的老师数据");
        setImporting(false);
        return;
      }
      
      toast.info(`已解析${allTeachers.length}条老师记录,正在导入...`);
      importMutation.mutate({ teachers: allTeachers });
      
    } catch (error: any) {
      console.error('导入错误:', error);
      toast.error("文件解析失败: " + error.message);
      setImporting(false);
    }
    
    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Excel导出
  const handleExport = () => {
    if (!teachers || teachers.length === 0) {
      toast.error("没有数据可导出");
      return;
    }

    // 按分类分组
    const categories: Record<string, any[]> = {};
    teachers.forEach((teacher: any) => {
      const category = teacher.category || '其他';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({
        '姓名': teacher.name,
        '电话号码': teacher.phone || '',
        '活跃状态': teacher.status || '活跃',
        '受众客户类型': teacher.customerType || '',
        '备注': teacher.notes || '',
      });
    });

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    
    // 为每个分类创建工作表
    Object.entries(categories).forEach(([category, data]) => {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, category);
    });

    // 下载文件
    const fileName = `老师信息_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast.success("导出成功");
  };

  // 过滤老师
  const filteredTeachers = teachers?.filter((teacher: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      teacher.name?.toLowerCase().includes(term) ||
      teacher.phone?.toLowerCase().includes(term) ||
      teacher.customerType?.toLowerCase().includes(term) ||
      teacher.city?.toLowerCase().includes(term)
    );
  });

  // 计算总体统计数据
  const totalStats = allStats?.reduce(
    (acc, stat) => ({
      classCount: acc.classCount + (stat.classCount || 0),
      totalHours: acc.totalHours + (stat.totalHours || 0),
      totalIncome: acc.totalIncome + (stat.totalIncome || 0),
    }),
    { classCount: 0, totalHours: 0, totalIncome: 0 }
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题和操作按钮 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">老师管理</h1>
            <p className="text-muted-foreground mt-1">管理老师信息,支持批量导入导出</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              导出Excel
            </Button>
            <Button 
              onClick={() => window.open('/teacher-import-template.xlsx', '_blank')}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              下载模板
            </Button>
            <Button onClick={handleImportClick} variant="outline" disabled={importing}>
              <Upload className="w-4 h-4 mr-2" />
              {importing ? "导入中..." : "导入Excel"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              新增老师
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="space-y-4">
          {/* 时间范围切换 */}
          <div className="flex gap-2">
            <Button
              variant={dateRange === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDateRangeChange('all')}
            >
              全部
            </Button>
            <Button
              variant={dateRange === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDateRangeChange('month')}
            >
              本月
            </Button>
            <Button
              variant={dateRange === 'quarter' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDateRangeChange('quarter')}
            >
              本季度
            </Button>
            <Button
              variant={dateRange === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDateRangeChange('year')}
            >
              本年
            </Button>
          </div>

          {/* 总体统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  总授课次数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '-' : totalStats?.classCount || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {dateRange === 'all' ? '全部时间' : dateRange === 'month' ? '本月' : dateRange === 'quarter' ? '本季度' : '本年'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  总课时
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '-' : `${totalStats?.totalHours || 0}h`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {dateRange === 'all' ? '全部时间' : dateRange === 'month' ? '本月' : dateRange === 'quarter' ? '本季度' : '本年'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  总收入
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '-' : `￥${(totalStats?.totalIncome || 0).toFixed(2)}`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {dateRange === 'all' ? '全部时间' : dateRange === 'month' ? '本月' : dateRange === 'quarter' ? '本季度' : '本年'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 批量操作栏 */}
        {selectedIds.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">已选择 {selectedIds.length} 位老师</span>
                <div className="flex gap-2">
                  <Button onClick={handleBatchUpdateStatus} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    批量修改状态
                  </Button>
                  <Button onClick={handleBatchDelete} variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    批量删除
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 搜索栏 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="搜索老师姓名、电话、客户类型、城市..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
          </CardHeader>
        </Card>

        {/* 老师列表 */}
        <Card>
          <CardHeader>
            <CardTitle>老师列表 ({filteredTeachers?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">加载中...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === teachers?.length && teachers?.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>电话</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>城市</TableHead>
                    <TableHead>授课次数</TableHead>
                    <TableHead>总课时</TableHead>
                    <TableHead>总收入</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers?.map((teacher: any) => (
                    <TableRow key={teacher.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(teacher.id)}
                          onCheckedChange={(checked) => handleSelectOne(teacher.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{teacher.name}</TableCell>
                      <TableCell>{teacher.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={teacher.status === '活跃' ? 'default' : 'secondary'}>
                          {teacher.status || '活跃'}
                        </Badge>
                      </TableCell>
                      <TableCell>{teacher.category || '-'}</TableCell>
                      <TableCell>{teacher.city || '-'}</TableCell>
                      <TableCell>
                        {allStats?.find(s => s.teacherId === teacher.id)?.classCount || 0}
                      </TableCell>
                      <TableCell>
                        {allStats?.find(s => s.teacherId === teacher.id)?.totalHours || 0}h
                      </TableCell>
                      <TableCell>
                        ￥{(allStats?.find(s => s.teacherId === teacher.id)?.totalIncome || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(teacher)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(teacher)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 创建老师对话框 */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新增老师</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">姓名 *</Label>
                  <Input id="name" {...register("name")} />
                  {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="phone">电话号码</Label>
                  <Input id="phone" {...register("phone")} />
                </div>
                <div>
                  <Label htmlFor="status">活跃状态</Label>
                  <Input id="status" {...register("status")} placeholder="活跃/不活跃" />
                </div>
                <div>
                  <Label htmlFor="category">分类</Label>
                  <Input id="category" {...register("category")} placeholder="本部老师/合伙店老师" />
                </div>
                <div>
                  <Label htmlFor="city">城市</Label>
                  <Input id="city" {...register("city")} />
                </div>
                <div>
                  <Label htmlFor="customerType">受众客户类型</Label>
                  <Input id="customerType" {...register("customerType")} />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">备注</Label>
                <Textarea id="notes" {...register("notes")} rows={3} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={createTeacher.isPending}>
                  {createTeacher.isPending ? "创建中..." : "创建"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 编辑老师对话框 */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑老师信息</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">姓名 *</Label>
                  <Input id="edit-name" {...register("name")} />
                  {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="edit-phone">电话号码</Label>
                  <Input id="edit-phone" {...register("phone")} />
                </div>
                <div>
                  <Label htmlFor="edit-status">活跃状态</Label>
                  <Input id="edit-status" {...register("status")} />
                </div>
                <div>
                  <Label htmlFor="edit-category">分类</Label>
                  <Input id="edit-category" {...register("category")} />
                </div>
                <div>
                  <Label htmlFor="edit-city">城市</Label>
                  <Input id="edit-city" {...register("city")} />
                </div>
                <div>
                  <Label htmlFor="edit-customerType">受众客户类型</Label>
                  <Input id="edit-customerType" {...register("customerType")} />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-aliases">别名(逗号分隔)</Label>
                <Input 
                  id="edit-aliases" 
                  {...register("aliases")} 
                  placeholder="例如: 橘子,小橘,橘子老师"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  设置别名后，智能登记和Gmail导入可以通过别名识别老师
                </p>
              </div>
              <div>
                <Label htmlFor="edit-notes">备注</Label>
                <Textarea id="edit-notes" {...register("notes")} rows={3} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={updateTeacher.isPending}>
                  {updateTeacher.isPending ? "更新中..." : "更新"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 查看详情对话框 */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>老师详情</DialogTitle>
            </DialogHeader>
            {selectedTeacher && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>姓名</Label>
                    <p className="text-sm mt-1">{selectedTeacher.name}</p>
                  </div>
                  <div>
                    <Label>电话</Label>
                    <p className="text-sm mt-1">{selectedTeacher.phone || '-'}</p>
                  </div>
                  <div>
                    <Label>状态</Label>
                    <p className="text-sm mt-1">
                      <Badge variant={selectedTeacher.status === '活跃' ? 'default' : 'secondary'}>
                        {selectedTeacher.status || '活跃'}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <Label>分类</Label>
                    <p className="text-sm mt-1">{selectedTeacher.category || '-'}</p>
                  </div>
                  <div>
                    <Label>城市</Label>
                    <p className="text-sm mt-1">{selectedTeacher.city || '-'}</p>
                  </div>
                  <div>
                    <Label>受众客户类型</Label>
                    <p className="text-sm mt-1">{selectedTeacher.customerType || '-'}</p>
                  </div>
                </div>
                <div>
                  <Label>备注</Label>
                  <p className="text-sm mt-1">{selectedTeacher.notes || '-'}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setDetailOpen(false)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 批量修改状态对话框 */}
        <Dialog open={batchStatusDialogOpen} onOpenChange={setBatchStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>批量修改状态</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>新状态</Label>
                <Input
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  placeholder="活跃/不活跃"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                将为选中的 {selectedIds.length} 位老师更新状态
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchStatusDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={confirmBatchUpdateStatus} disabled={batchUpdateStatusMutation.isPending}>
                {batchUpdateStatusMutation.isPending ? "更新中..." : "确认更新"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
