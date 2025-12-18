import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Eye, Edit } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const teacherSchema = z.object({
  name: z.string().min(1, "老师姓名不能为空"),
  nickname: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("请输入有效的邮箱地址").optional().or(z.literal("")),
  wechat: z.string().optional(),
  hourlyRate: z.string().optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

export default function Teachers() {
  const utils = trpc.useUtils();
  const { data: teachers, isLoading } = trpc.teachers.list.useQuery();
  
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

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
    setValue("nickname", teacher.nickname || "");
    setValue("phone", teacher.phone || "");
    setValue("email", teacher.email || "");
    setValue("wechat", teacher.wechat || "");
    setValue("hourlyRate", teacher.hourlyRate || "");
    setValue("bankAccount", teacher.bankAccount || "");
    setValue("bankName", teacher.bankName || "");
    setValue("city", teacher.city || "");
    setValue("notes", teacher.notes || "");
    setEditOpen(true);
  };

  const handleUpdate = (data: TeacherFormData) => {
    if (!selectedTeacher) return;
    updateTeacher.mutate({
      id: selectedTeacher.id,
      data,
    });
  };

  const handleViewDetail = (teacher: any) => {
    setSelectedTeacher(teacher);
    setDetailOpen(true);
  };

  const filteredTeachers = teachers?.filter((teacher) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      teacher.name.toLowerCase().includes(searchLower) ||
      teacher.nickname?.toLowerCase().includes(searchLower) ||
      teacher.phone?.toLowerCase().includes(searchLower) ||
      teacher.city?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">老师管理</h1>
            <p className="text-muted-foreground mt-2">管理老师档案和信息</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新增老师
          </Button>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>老师列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索老师姓名、花名、电话、城市..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : filteredTeachers && filteredTeachers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>花名</TableHead>
                    <TableHead>联系电话</TableHead>
                    <TableHead>微信</TableHead>
                    <TableHead>所在城市</TableHead>
                    <TableHead>课时费</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">{teacher.name}</TableCell>
                      <TableCell>{teacher.nickname || "-"}</TableCell>
                      <TableCell>{teacher.phone || "-"}</TableCell>
                      <TableCell>{teacher.wechat || "-"}</TableCell>
                      <TableCell>{teacher.city || "-"}</TableCell>
                      <TableCell>
                        {teacher.hourlyRate ? `¥${parseFloat(teacher.hourlyRate).toFixed(2)}/课时` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={teacher.isActive ? "default" : "secondary"}>
                          {teacher.isActive ? "在职" : "离职"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(teacher)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(teacher)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "没有找到匹配的老师" : "暂无老师数据"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 新增老师对话框 */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>新增老师</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>姓名 *</Label>
                  <Input {...register("name")} placeholder="请输入老师姓名" className="mt-2" />
                  {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <Label>花名</Label>
                  <Input {...register("nickname")} placeholder="请输入花名" className="mt-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>联系电话</Label>
                  <Input {...register("phone")} placeholder="请输入联系电话" className="mt-2" />
                </div>
                <div>
                  <Label>微信号</Label>
                  <Input {...register("wechat")} placeholder="请输入微信号" className="mt-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>邮箱</Label>
                  <Input {...register("email")} type="email" placeholder="请输入邮箱" className="mt-2" />
                  {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label>所在城市</Label>
                  <Input {...register("city")} placeholder="请输入所在城市" className="mt-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>课时费标准</Label>
                  <Input {...register("hourlyRate")} placeholder="如:200.00" className="mt-2" />
                </div>
                <div>
                  <Label>银行账号</Label>
                  <Input {...register("bankAccount")} placeholder="请输入银行账号" className="mt-2" />
                </div>
              </div>

              <div>
                <Label>开户行</Label>
                <Input {...register("bankName")} placeholder="请输入开户行" className="mt-2" />
              </div>

              <div>
                <Label>备注</Label>
                <Textarea {...register("notes")} placeholder="请输入备注信息" className="mt-2" rows={3} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  取消
                </Button>
                <Button type="submit">创建</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 编辑老师对话框 */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>编辑老师信息</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>姓名 *</Label>
                  <Input {...register("name")} placeholder="请输入老师姓名" className="mt-2" />
                  {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <Label>花名</Label>
                  <Input {...register("nickname")} placeholder="请输入花名" className="mt-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>联系电话</Label>
                  <Input {...register("phone")} placeholder="请输入联系电话" className="mt-2" />
                </div>
                <div>
                  <Label>微信号</Label>
                  <Input {...register("wechat")} placeholder="请输入微信号" className="mt-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>邮箱</Label>
                  <Input {...register("email")} type="email" placeholder="请输入邮箱" className="mt-2" />
                  {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label>所在城市</Label>
                  <Input {...register("city")} placeholder="请输入所在城市" className="mt-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>课时费标准</Label>
                  <Input {...register("hourlyRate")} placeholder="如:200.00" className="mt-2" />
                </div>
                <div>
                  <Label>银行账号</Label>
                  <Input {...register("bankAccount")} placeholder="请输入银行账号" className="mt-2" />
                </div>
              </div>

              <div>
                <Label>开户行</Label>
                <Input {...register("bankName")} placeholder="请输入开户行" className="mt-2" />
              </div>

              <div>
                <Label>备注</Label>
                <Textarea {...register("notes")} placeholder="请输入备注信息" className="mt-2" rows={3} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  取消
                </Button>
                <Button type="submit">保存</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 老师详情对话框 */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>老师详情</DialogTitle>
            </DialogHeader>
            {selectedTeacher && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">基本信息</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">姓名:</span>
                      <p className="font-medium mt-1">{selectedTeacher.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">花名:</span>
                      <p className="font-medium mt-1">{selectedTeacher.nickname || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">联系电话:</span>
                      <p className="font-medium mt-1">{selectedTeacher.phone || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">微信号:</span>
                      <p className="font-medium mt-1">{selectedTeacher.wechat || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">邮箱:</span>
                      <p className="font-medium mt-1">{selectedTeacher.email || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">所在城市:</span>
                      <p className="font-medium mt-1">{selectedTeacher.city || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">状态:</span>
                      <p className="font-medium mt-1">
                        <Badge variant={selectedTeacher.isActive ? "default" : "secondary"}>
                          {selectedTeacher.isActive ? "在职" : "离职"}
                        </Badge>
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">财务信息</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">课时费标准:</span>
                      <p className="font-medium mt-1 text-green-600">
                        {selectedTeacher.hourlyRate
                          ? `¥${parseFloat(selectedTeacher.hourlyRate).toFixed(2)}/课时`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">银行账号:</span>
                      <p className="font-medium mt-1">{selectedTeacher.bankAccount || "-"}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">开户行:</span>
                      <p className="font-medium mt-1">{selectedTeacher.bankName || "-"}</p>
                    </div>
                  </div>
                </div>

                {selectedTeacher.notes && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">备注</h3>
                    <p className="text-sm text-muted-foreground">{selectedTeacher.notes}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold mb-3">其他信息</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">创建时间:</span>
                      <p className="font-medium mt-1">
                        {new Date(selectedTeacher.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">更新时间:</span>
                      <p className="font-medium mt-1">
                        {new Date(selectedTeacher.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
