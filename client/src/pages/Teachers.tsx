import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Eye, Edit, Upload, Download, Trash2, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as XLSX from "xlsx";
import DashboardLayout from "@/components/DashboardLayout";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import AvatarEditDialog from "@/components/AvatarEditDialog";

// 默认头像URL
const DEFAULT_AVATAR_URL = "/avatars/default-avatar.png";

const teacherSchema = z.object({
  name: z.string().optional(), // 编辑时disabled，不参与validation
  phone: z.string().optional(), // 编辑时disabled，不参与validation
  status: z.string().optional(), // 编辑时disabled，不参与validation
  teacherAttribute: z.enum(["S", "M", "Switch"]).optional().or(z.literal("")),
  customerType: z.string().optional(),
  notes: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(), // 城市字段改为可选，由多选组件管理
  aliases: z.string().optional(), // 别名(逗号分隔)
  contractEndDate: z.string().optional(), // 合同到期时间
  joinDate: z.string().optional(), // 入职时间
  // 兼容旧字段
  nickname: z.string().optional(),
  email: z.string().email("请输入有效的邮箱地址").optional().or(z.literal("")),
  wechat: z.string().optional(),
  hourlyRate: z.string().optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  avatarUrl: z.string().optional(), // 头像URL
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
  
  // 查询城市列表
  const { data: citiesData } = trpc.analytics.getAllCitiesWithStats.useQuery();
  const cities = citiesData?.map(c => c.city) || [];
  
  // 城市选择状态
  const [editCities, setEditCities] = useState<string[]>([]);
  


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

  const updateTeacherStatusMutation = trpc.teachers.updateStatus.useMutation({
    onSuccess: () => {
      utils.teachers.list.invalidate();
      toast.success("老师状态更新成功");
    },
    onError: (error) => {
      toast.error(error.message || "状态更新失败");
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



  // 导入结果弹窗状态
  const [importResultOpen, setImportResultOpen] = useState(false);
  const [importResultData, setImportResultData] = useState<{
    updated: number;
    skipped: number;
    notFoundErrors: string[];
  } | null>(null);

  const importMutation = trpc.teachers.importFromExcel.useMutation({
    onSuccess: (data) => {
      utils.teachers.list.invalidate();
      const { stats, notFoundErrors } = data;
      // 显示汇总弹窗
      setImportResultData({
        updated: stats?.updated ?? 0,
        skipped: stats?.skipped ?? 0,
        notFoundErrors: notFoundErrors ?? [],
      });
      setImportResultOpen(true);
      setImporting(false);
    },
    onError: (error) => {
      toast.error(error.message || "导入失败");
      setImporting(false);
    },
  });


  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [batchStatusDialogOpen, setBatchStatusDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [importing, setImporting] = useState(false);
  const [newStatus, setNewStatus] = useState("活跃");
  const [sortField, setSortField] = useState<'name' | 'classCount' | 'totalHours' | 'totalIncome' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarEditOpen, setAvatarEditOpen] = useState(false);
  const [avatarEditTeacher, setAvatarEditTeacher] = useState<any>(null);
  
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



  const handleEdit = (teacher: any) => {
    setSelectedTeacher(teacher);
    setValue("name", teacher.name);
    setValue("phone", teacher.phone || "");
    setValue("status", teacher.status || "活跃");
    setValue("customerType", teacher.customerType || "");
    setValue("notes", teacher.notes || "");
    setValue("category", teacher.category || "");
    setValue("city", teacher.city || "");
    // 解析城市数据
    if (teacher.city) {
      try {
        const parsed = JSON.parse(teacher.city);
        setEditCities(Array.isArray(parsed) ? parsed : [teacher.city]);
      } catch {
        setEditCities(teacher.city.split(";").map((c: string) => c.trim()).filter(Boolean));
      }
    } else {
      setEditCities([]);
    }
    // 将aliases数组转换为逗号分隔的字符串
    const aliasesStr = teacher.aliases ? 
      (typeof teacher.aliases === 'string' ? teacher.aliases : JSON.parse(teacher.aliases).join(', ')) : 
      '';
    setValue("aliases", aliasesStr);
    setValue("contractEndDate", teacher.contractEndDate || "");
    setValue("joinDate", teacher.joinDate || "");
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
    // 只提交合同相关字段，基本信息在用户管理中修改
    const updateData = {
      category: data.category,
      customerType: data.customerType,
      aliases: data.aliases,
      notes: data.notes,
      teacherAttribute: data.teacherAttribute || undefined,
      contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : undefined,
      joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
    };
    updateTeacher.mutate({
      id: selectedTeacher.id,
      data: updateData,
    });
  };

  // 头像上传mutation
  const uploadAvatarMutation = trpc.upload.uploadAvatar.useMutation({
    onSuccess: (data) => {
      setValue("avatarUrl", data.url);
      setAvatarPreview(data.url);
      setUploadingAvatar(false);
      toast.success("头像上传成功");
    },
    onError: (error) => {
      setUploadingAvatar(false);
      toast.error(error.message || "头像上传失败");
    },
  });

  // 处理头像文件选择
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error("请选择图片文件");
      return;
    }

    // 验证文件大小(2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("图片大小不能超过2MB，请选择更小的图片");
      return;
    }

    // 读取图片并打开裁剪对话框
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  // 处理裁剪完成
  const handleCropComplete = async (croppedImageBlob: Blob) => {
    // 将Blob转换为File
    const croppedFile = new File([croppedImageBlob], "avatar.jpg", { type: "image/jpeg" });
    setAvatarFile(croppedFile);

    // 预览
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(croppedFile);

    // 自动上传
    await handleUploadAvatar(croppedFile);
  };

  // 上传头像
  const handleUploadAvatar = async (fileToUpload?: File) => {
    const file = fileToUpload || avatarFile;
    if (!file) {
      toast.error("请选择头像文件");
      return;
    }

    setUploadingAvatar(true);

    // 读取文件为base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      uploadAvatarMutation.mutate({
        base64Data,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleViewDetail = (teacher: any) => {
    setSelectedTeacher(teacher);
    setDetailOpen(true);
  };

  const handleAvatarClick = (teacher: any) => {
    setAvatarEditTeacher(teacher);
    setAvatarEditOpen(true);
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
        
        // 使用 sheet_to_json 解析，自动识别表头行
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        jsonData.forEach((row: any) => {
          // 必须有 ID 字段，且必须是有效数字
          const idValue = row['ID'] || row['id'];
          if (!idValue || isNaN(Number(idValue))) {
            // ID 缺失或无效，记录错误
            const rowName = row['姓名'] || row['昵称'] || JSON.stringify(row).slice(0, 30);
            allTeachers.push({ __missingId: true, __rowHint: rowName });
            return;
          }

          // 只提取 15 个允许更新的字段 + ID
          const teacher: any = {
            id: Number(idValue),
            nickname: row['昵称'] !== undefined ? String(row['昵称']) : undefined,
            phone: row['电话号码'] !== undefined && row['电话号码'] !== '' ? String(row['电话号码']) : undefined,
            email: row['邮箱'] !== undefined ? String(row['邮箱']) : undefined,
            wechat: row['微信号'] !== undefined ? String(row['微信号']) : undefined,
            isActive: row['活跃状态'] !== undefined && row['活跃状态'] !== ''
              ? (String(row['活跃状态']).trim() !== '休息')
              : undefined,
            teacherAttribute: row['老师属性'] !== undefined ? String(row['老师属性']) : undefined,
            customerType: row['受众'] !== undefined && row['受众'] !== ''
              ? String(row['受众'])
              : (row['客户类型'] !== undefined ? String(row['客户类型']) : undefined),
            category: row['类别'] !== undefined ? String(row['类别']) : undefined,
            hourlyRate: row['时薪'] !== undefined && row['时薪'] !== '' ? String(row['时薪']) : undefined,
            bankAccount: row['银行账户'] !== undefined ? String(row['银行账户']) : undefined,
            bankName: row['开户行'] !== undefined ? String(row['开户行']) : undefined,
            aliases: row['别名'] !== undefined ? String(row['别名']) : undefined,
            notes: row['备注'] !== undefined ? String(row['备注']) : undefined,
          };

          // 处理日期字段
          const contractEndDateStr = row['合同到期时间'];
          if (contractEndDateStr && contractEndDateStr !== '') {
            const d = new Date(contractEndDateStr);
            if (!isNaN(d.getTime())) teacher.contractEndDate = d;
          }
          const joinDateStr = row['入职时间'];
          if (joinDateStr && joinDateStr !== '') {
            const d = new Date(joinDateStr);
            if (!isNaN(d.getTime())) teacher.joinDate = d;
          }

          allTeachers.push(teacher);
        });
      });
      
      // 分离 ID 缺失的记录
      const missingIdRows = allTeachers.filter((t: any) => t.__missingId);
      const validTeachers = allTeachers.filter((t: any) => !t.__missingId);

      if (missingIdRows.length > 0) {
        missingIdRows.forEach((t: any) => {
          toast.error(`行「${t.__rowHint}」缺少 ID 字段，已跳过。请在 ID 列填入系统用户ID`);
        });
      }

      if (validTeachers.length === 0) {
        toast.error("未找到含有效 ID 的老师数据，请确保 Excel 中包含 ID 列并填入用户ID");
        setImporting(false);
        return;
      }
      
      toast.info(`已解析 ${validTeachers.length} 条有效记录，正在导入...`);
      importMutation.mutate({ teachers: validTeachers });
      
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

  // Excel模板下载（单Sheet，仅ID+15个可更新字段，无地区列）
  const handleDownloadTemplate = () => {
    // 字段顺序：ID（必填，匹配键）+ 15个可更新字段
    const headers = [
      'ID',         // 必填，系统匹配键
      '昵称',
      '电话号码',
      '邮箱',
      '微信号',
      '活跃状态',   // 活跃 或 休息
      '老师属性',   // S / M / Switch
      '受众',         // 成人 / 青少年 / 儿童
      '客户类型',
      '类别',
      '时薪',
      '银行账户',
      '开户行',
      '合同到期时间', // YYYY-MM-DD
      '入职时间',     // YYYY-MM-DD
      '别名',
      '备注',
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, ws, '老师信息');

    const fileName = `老师导入模板_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('模板下载成功，请在 ID 列填入系统用户ID，其他字段按需填写');
  };

  // Excel导出（单Sheet全部数据）
  const handleExport = () => {
    if (!teachers || teachers.length === 0) {
      toast.error("没有数据可导出");
      return;
    }

    // 字段顺序与导入模板一致：ID + 15个可更新字段（无姓名列）
    const headers = ['ID', '昵称', '电话号码', '邮箱', '微信号', '活跃状态', '老师属性', '受众', '客户类型', '类别', '时薪', '银行账户', '开户行', '合同到期时间', '入职时间', '别名', '备注'];

    // 所有老师数据放入同一个Sheet
    const rows = teachers.map((teacher: any) => [
      teacher.id,
      teacher.nickname || '',
      teacher.phone || '',
      teacher.email || '',
      teacher.wechat || '',
      teacher.isActive !== false ? '活跃' : '休息',
      teacher.teacherAttribute || '',
      teacher.customerType || '',  // 受众
      '',                           // 客户类型（备用字段）
      teacher.category || '',
      teacher.hourlyRate || '',
      teacher.bankAccount || '',
      teacher.bankName || '',
      teacher.contractEndDate ? new Date(teacher.contractEndDate).toISOString().split('T')[0] : '',
      teacher.joinDate ? new Date(teacher.joinDate).toISOString().split('T')[0] : '',
      teacher.aliases || '',
      teacher.notes || '',
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, '老师信息');

    const fileName = `老师信息_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("导出成功，共 " + teachers.length + " 条记录");
  };

  // 排序功能
  const handleSort = (field: 'name' | 'classCount' | 'totalHours' | 'totalIncome') => {
    if (sortField === field) {
      // 切换排序顺序
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 新字段，默认降序
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 过滤和排序老师
  const filteredTeachers = teachers?.filter((teacher: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      teacher.name?.toLowerCase().includes(term) ||
      teacher.nickname?.toLowerCase().includes(term) ||
      teacher.phone?.toLowerCase().includes(term) ||
      teacher.customerType?.toLowerCase().includes(term) ||
      teacher.city?.toLowerCase().includes(term)
    );
  });

  const sortedTeachers = filteredTeachers?.slice().sort((a: any, b: any) => {
    if (!sortField) return 0;
    
    let aValue: any;
    let bValue: any;
    
    if (sortField === 'name') {
      aValue = a.name || '';
      bValue = b.name || '';
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue, 'zh-CN')
        : bValue.localeCompare(aValue, 'zh-CN');
    } else {
      // 统计数据排序
      const aStats = allStats?.find(s => s.teacherId === a.id);
      const bStats = allStats?.find(s => s.teacherId === b.id);
      
      if (sortField === 'classCount') {
        aValue = aStats?.classCount || 0;
        bValue = bStats?.classCount || 0;
      } else if (sortField === 'totalHours') {
        aValue = aStats?.totalHours || 0;
        bValue = bStats?.totalHours || 0;
      } else if (sortField === 'totalIncome') {
        aValue = aStats?.totalIncome || 0;
        bValue = bStats?.totalIncome || 0;
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
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
              <Upload className="w-4 h-4 mr-2" />
              导出Excel
            </Button>
            <Button onClick={handleDownloadTemplate} variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              下载模板
            </Button>
            <Button onClick={handleImportClick} variant="outline" disabled={importing}>
              <Download className="w-4 h-4 mr-2" />
              {importing ? "导入中..." : "导入Excel"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

          </div>
        </div>

          {/* 统计卡片 */}
        <div className="space-y-4">
          {/* 时间范围切换和刷新按钮 */}
          <div className="flex justify-between items-center">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => utils.teachers.getAllStats.invalidate()}
              disabled={statsLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
              刷新统计数据
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
                    <TableHead className="w-16">头像</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('name')}
                        className="h-8 px-2 hover:bg-accent"
                      >
                        姓名
                        {sortField === 'name' && (
                          sortOrder === 'asc' ? <ArrowUp className="ml-1 w-3 h-3" /> : <ArrowDown className="ml-1 w-3 h-3" />
                        )}
                        {sortField !== 'name' && <ArrowUpDown className="ml-1 w-3 h-3 opacity-30" />}
                      </Button>
                    </TableHead>
                    <TableHead>昵称</TableHead>
                    <TableHead>电话</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>老师属性</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>城市</TableHead>
                    <TableHead>合同到期</TableHead>
                    <TableHead>入职时间</TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('classCount')}
                        className="h-8 px-2 hover:bg-accent"
                      >
                        授课次数
                        {sortField === 'classCount' && (
                          sortOrder === 'asc' ? <ArrowUp className="ml-1 w-3 h-3" /> : <ArrowDown className="ml-1 w-3 h-3" />
                        )}
                        {sortField !== 'classCount' && <ArrowUpDown className="ml-1 w-3 h-3 opacity-30" />}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('totalHours')}
                        className="h-8 px-2 hover:bg-accent"
                      >
                        总课时
                        {sortField === 'totalHours' && (
                          sortOrder === 'asc' ? <ArrowUp className="ml-1 w-3 h-3" /> : <ArrowDown className="ml-1 w-3 h-3" />
                        )}
                        {sortField !== 'totalHours' && <ArrowUpDown className="ml-1 w-3 h-3 opacity-30" />}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('totalIncome')}
                        className="h-8 px-2 hover:bg-accent"
                      >
                        总收入
                        {sortField === 'totalIncome' && (
                          sortOrder === 'asc' ? <ArrowUp className="ml-1 w-3 h-3" /> : <ArrowDown className="ml-1 w-3 h-3" />
                        )}
                        {sortField !== 'totalIncome' && <ArrowUpDown className="ml-1 w-3 h-3 opacity-30" />}
                      </Button>
                    </TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTeachers?.map((teacher: any) => (
                    <TableRow key={teacher.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(teacher.id)}
                          onCheckedChange={(checked) => handleSelectOne(teacher.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <Avatar 
                          className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleAvatarClick(teacher)}
                        >
                          <AvatarImage src={teacher.avatarUrl || DEFAULT_AVATAR_URL} alt={teacher.name} />
                          <AvatarFallback>{teacher.name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{teacher.id}</TableCell>
                      <TableCell className="font-medium">{teacher.name}</TableCell>
                      <TableCell className="text-muted-foreground">{teacher.nickname || '-'}</TableCell>
                      <TableCell>{teacher.phone || '-'}</TableCell>
                      <TableCell>
                        <Switch
                          checked={teacher.status === '活跃'}
                          onCheckedChange={(checked) => {
                            const newStatus = checked ? '活跃' : '不活跃';
                            updateTeacherStatusMutation.mutate({
                              id: teacher.id,
                              status: newStatus,
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {teacher.teacherAttribute ? (
                          <Badge variant="outline">{teacher.teacherAttribute}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{teacher.category || '-'}</TableCell>
                      <TableCell>{teacher.city || '-'}</TableCell>
                      <TableCell>
                        {teacher.contractEndDate ? (() => {
                          const endDate = new Date(teacher.contractEndDate);
                          const today = new Date();
                          const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
                          const isExpired = daysUntilExpiry < 0;
                          return (
                            <span className={isExpiringSoon || isExpired ? 'text-red-600 font-bold' : ''}>
                              {teacher.contractEndDate}
                              {isExpiringSoon && ` (还剩${daysUntilExpiry}天)`}
                              {isExpired && ' (已过期)'}
                            </span>
                          );
                        })() : '-'}
                      </TableCell>
                      <TableCell>{teacher.joinDate || '-'}</TableCell>
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



        {/* 编辑老师对话框 */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑老师信息</DialogTitle>
              <p className="text-sm text-muted-foreground mt-2">
                基本信息（姓名、电话、头像、城市、状态）仅供查看，请在<strong>用户管理</strong>中编辑。
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">姓名 *</Label>
                  <Input id="edit-name" {...register("name")} disabled className="bg-muted" />
                </div>
                <div>
                  <Label htmlFor="edit-phone">电话号码</Label>
                  <Input id="edit-phone" {...register("phone")} disabled className="bg-muted" />
                </div>
                <div>
                  <Label htmlFor="edit-status">活跃状态</Label>
                  <Input id="edit-status" {...register("status")} disabled className="bg-muted" />
                </div>
                <div>
                  <Label htmlFor="edit-teacherAttribute">老师属性</Label>
                  <select 
                    id="edit-teacherAttribute" 
                    {...register("teacherAttribute")} 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">未设置</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="Switch">Switch</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="edit-category">分类</Label>
                  <Input id="edit-category" {...register("category")} />
                </div>
                <div className="col-span-2">
                  <Label>城市（只读）</Label>
                  <div className="mt-2 p-3 border rounded-md bg-muted">
                    {editCities.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {editCities.map((city) => (
                          <Badge key={city} variant="secondary">
                            {city}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">未设置城市</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-customerType">受众客户类型</Label>
                  <Input id="edit-customerType" {...register("customerType")} />
                </div>
                <div>
                  <Label htmlFor="edit-contractEndDate">合同到期时间</Label>
                  <Input id="edit-contractEndDate" type="date" {...register("contractEndDate")} />
                </div>
                <div>
                  <Label htmlFor="edit-joinDate">入职时间</Label>
                  <Input id="edit-joinDate" type="date" {...register("joinDate")} />
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
              
              {/* 头像上传 */}
              <div>
                <Label>老师头像</Label>
                <div className="flex items-center gap-4 mt-2">
                  {(avatarPreview || selectedTeacher?.avatarUrl) && (
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={avatarPreview || selectedTeacher?.avatarUrl || DEFAULT_AVATAR_URL} />
                      <AvatarFallback>{selectedTeacher?.name?.[0]}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        选择图片
                      </Button>
                      {avatarFile && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleUploadAvatar()}
                          disabled={uploadingAvatar}
                        >
                          {uploadingAvatar ? "上传中..." : "上传"}
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      支持 JPG、PNG 格式，大小不超过2MB，选择后可裁剪调整
                    </p>
                  </div>
                </div>
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

        {/* 图片裁剪对话框 */}
        <ImageCropDialog
          open={showCropDialog}
          onOpenChange={setShowCropDialog}
          imageSrc={imageToCrop || ""}
          onCropComplete={handleCropComplete}
        />

        {/* 头像编辑对话框 */}
        <AvatarEditDialog
          open={avatarEditOpen}
          onOpenChange={setAvatarEditOpen}
          teacher={avatarEditTeacher}
          onSuccess={() => {
            utils.teachers.list.invalidate();
          }}
        />

        {/* 导入结果汇总弹窗 */}
        <Dialog open={importResultOpen} onOpenChange={setImportResultOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>导入结果</DialogTitle>
            </DialogHeader>
            {importResultData && (
              <div className="space-y-4">
                {/* 统计概览 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{importResultData.updated}</p>
                    <p className="text-sm text-green-700 dark:text-green-300">成功更新</p>
                  </div>
                  <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3 text-center">
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{importResultData.skipped}</p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">跳过未处理</p>
                  </div>
                </div>

                {/* 跳过原因列表 */}
                {importResultData.notFoundErrors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      跳过原因（{importResultData.notFoundErrors.length} 条）：
                    </p>
                    <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-2 space-y-1">
                      {importResultData.notFoundErrors.map((err: string, idx: number) => (
                        <div key={idx} className="text-xs text-destructive flex gap-2">
                          <span className="shrink-0 font-medium">{idx + 1}.</span>
                          <span>{err}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      请先在「用户管理」中创建对应账号并分配老师角色，再重新导入。
                    </p>
                  </div>
                )}

                {importResultData.notFoundErrors.length === 0 && importResultData.updated > 0 && (
                  <p className="text-sm text-green-600 dark:text-green-400">所有记录均已成功更新。</p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setImportResultOpen(false)}>确定</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
