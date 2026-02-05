import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import DashboardLayout from "@/components/DashboardLayout";

type Course = {
  id: number;
  name: string;
  introduction: string | null;
  description: string | null;
  price: string | null;
  duration: string | null;
  level: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export default function Courses() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    name: "",
    introduction: "",
    description: "",
    price: "",
    duration: "",
    level: "入门",
  });

  // 查询课程列表
  const { data: coursesData, isLoading, refetch } = trpc.courses.list.useQuery();
  const courses = coursesData?.data || [];

  // 创建课程
  const createMutation = trpc.courses.create.useMutation({
    onSuccess: () => {
      toast.success("创建成功", { description: "课程已创建" });
      refetch();
      closeDialog();
    },
    onError: (error) => {
      toast.error("创建失败", { description: error.message });
    },
  });

  // 更新课程
  const updateMutation = trpc.courses.update.useMutation({
    onSuccess: () => {
      toast.success("更新成功", { description: "课程已更新" });
      refetch();
      closeDialog();
    },
    onError: (error) => {
      toast.error("更新失败", { description: error.message });
    },
  });

  // 删除课程
  const deleteMutation = trpc.courses.delete.useMutation({
    onSuccess: () => {
      toast.success("删除成功", { description: "课程已删除" });
      refetch();
    },
    onError: (error) => {
      toast.error("删除失败", { description: error.message });
    },
  });

  // 切换启用状态
  const toggleActiveMutation = trpc.courses.toggleActive.useMutation({
    onSuccess: (result) => {
      toast.success("状态已更新", {
        description: result.data.isActive ? "课程已启用" : "课程已停用",
      });
      refetch();
    },
    onError: (error) => {
      toast.error("操作失败", { description: error.message });
    },
  });

  // 打开新增对话框
  const openCreateDialog = () => {
    setEditingCourse(null);
    setFormData({
      name: "",
      introduction: "",
      description: "",
      price: "",
      duration: "",
      level: "入门",
    });
    setIsDialogOpen(true);
  };

  // 打开编辑对话框
  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      introduction: course.introduction || "",
      description: course.description || "",
      price: course.price || "",
      duration: course.duration || "",
      level: course.level || "入门",
    });
    setIsDialogOpen(true);
  };

  // 关闭对话框
  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingCourse(null);
    setFormData({
      name: "",
      introduction: "",
      description: "",
      price: "",
      duration: "",
      level: "入门",
    });
  };

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("错误", { description: "课程名称不能为空" });
      return;
    }

    const baseData = {
      name: formData.name.trim(),
      introduction: formData.introduction.trim() || undefined,
      description: formData.description.trim() || undefined,
    };

    if (editingCourse) {
      // 更新操作:所有字段可选
      updateMutation.mutate({
        id: editingCourse.id,
        ...baseData,
        price: formData.price ? parseFloat(formData.price) : undefined,
        duration: formData.duration ? parseFloat(formData.duration) : undefined,
        level: formData.level as "入门" | "深度" | "订制" | "剧本" | undefined,
      });
    } else {
      // 创建操作:price、duration、level必填
      if (!formData.price || !formData.duration || !formData.level) {
        toast.error("错误", { description: "价格、时长和课程程度为必填项" });
        return;
      }
      createMutation.mutate({
        ...baseData,
        price: parseFloat(formData.price),
        duration: parseFloat(formData.duration),
        level: formData.level as "入门" | "深度" | "订制" | "剧本",
      });
    }
  };

  // 删除课程
  const handleDelete = (id: number, name: string) => {
    if (confirm(`确定要删除课程"${name}"吗?`)) {
      deleteMutation.mutate({ id });
    }
  };

  // 切换启用状态
  const handleToggleActive = (id: number) => {
    toggleActiveMutation.mutate({ id });
  };

  // 批量导入课程
  const importMutation = trpc.courses.importFromExcel.useMutation({
    onSuccess: (result) => {
      toast.success("导入完成", {
        description: result.message,
      });
      if (result.data.errors.length > 0) {
        console.error("导入错误:", result.data.errors);
      }
      refetch();
      setIsImportDialogOpen(false);
    },
    onError: (error) => {
      toast.error("导入失败", { description: error.message });
    },
  });

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 读取Excel文件
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // 查找表头行(包含"课程名称"的行)
      let headerRowIndex = -1;
      for (let i = 0; i < jsonData.length; i++) {
        if (jsonData[i].some((cell: any) => cell === "课程名称")) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        toast.error("错误", { description: "未找到表头行,请确保有“课程名称”列" });
        return;
      }

      // 解析课程数据
      const courses = [];
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row[0]) continue; // 跳过空行

        courses.push({
          name: row[0],
          level: row[1] || "入门",
          price: parseFloat(row[2]) || 0,
          duration: parseFloat(row[3]) || 1,
        });
      }

      if (courses.length === 0) {
        toast.error("错误", { description: "未找到有效的课程数据" });
        return;
      }

      // 调用导入API
      importMutation.mutate({ courses });
    } catch (error: any) {
      toast.error("错误", { description: `解析Excel文件失败: ${error.message}` });
    }

    // 清空文件输入
    e.target.value = "";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">课程管理</h1>
          <p className="text-muted-foreground mt-1">管理所有课程信息</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsImportDialogOpen(true)} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            导入课程
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            新增课程
          </Button>
        </div>
      </div>

      {/* 课程列表 */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>课程名称</TableHead>
              <TableHead>课程程度</TableHead>
              <TableHead>价格(元)</TableHead>
              <TableHead>时长(小时)</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  暂无课程数据
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {course.level || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {course.price !== null ? `¥${parseFloat(course.price).toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell>{course.duration !== null ? `${parseFloat(course.duration)}h` : "-"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={course.isActive}
                      onCheckedChange={() => handleToggleActive(course.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(course.createdAt).toLocaleDateString("zh-CN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(course)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(course.id, course.name)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 新增/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCourse ? "编辑课程" : "新增课程"}</DialogTitle>
            <DialogDescription>
              {editingCourse ? "修改课程信息" : "填写课程信息以创建新课程"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">课程名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入课程名称"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="introduction">课程介绍</Label>
                <Input
                  id="introduction"
                  value={formData.introduction}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 20) {
                      setFormData({ ...formData, introduction: value });
                    }
                  }}
                  placeholder="请输入课程介绍(不超过20字)"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.introduction.length}/20 字
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="level">课程程度</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) => setFormData({ ...formData, level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="入门">入门</SelectItem>
                    <SelectItem value="深度">深度</SelectItem>
                    <SelectItem value="订制">订制</SelectItem>
                    <SelectItem value="剧本">剧本</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">价格(元)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="duration">时长(小时)</Label>
                  <Input
                    id="duration"
                    type="number"
                    step="0.5"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="0.0"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">课程描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="请输入课程描述(可选)"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                取消
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingCourse ? "保存" : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 导入对话框 */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导入课程</DialogTitle>
            <DialogDescription>
              从Excel文件批量导入课程数据
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="file">选择Excel文件</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
              />
              <p className="text-sm text-muted-foreground">
                支持的格式: .xlsx, .xls
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
