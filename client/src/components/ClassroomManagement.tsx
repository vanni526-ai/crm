import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, MapPin, Building2 } from "lucide-react";
import { toast } from "sonner";

interface ClassroomManagementProps {
  cityId: number;
  cityName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClassroomManagement({ cityId, cityName, open, onOpenChange }: ClassroomManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    notes: "",
  });

  const { data: classrooms, isLoading, refetch } = trpc.classrooms.getByCityName.useQuery({ cityName });
  const createMutation = trpc.classrooms.create.useMutation();
  const updateMutation = trpc.classrooms.update.useMutation();
  const deleteMutation = trpc.classrooms.delete.useMutation();
  const toggleActiveMutation = trpc.classrooms.toggleActive.useMutation();

  const handleCreate = async () => {
    if (!formData.name || !formData.address) {
      toast.error("请填写教室名称和地址");
      return;
    }

    try {
      await createMutation.mutateAsync({
        cityId,
        cityName,
        name: formData.name,
        address: formData.address,
        notes: formData.notes,
      });
      toast.success("教室创建成功");
      setIsCreateDialogOpen(false);
      setFormData({ name: "", address: "", notes: "" });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "创建失败");
    }
  };

  const handleUpdate = async () => {
    if (!editingClassroom) return;

    try {
      await updateMutation.mutateAsync({
        id: editingClassroom.id,
        name: formData.name,
        address: formData.address,
        notes: formData.notes,
      });
      toast.success("教室更新成功");
      setEditingClassroom(null);
      setFormData({ name: "", address: "", notes: "" });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "更新失败");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`确定要删除教室"${name}"吗?`)) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("教室删除成功");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "删除失败");
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      await toggleActiveMutation.mutateAsync({ id });
      toast.success("状态切换成功");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "操作失败");
    }
  };

  const openEditDialog = (classroom: any) => {
    setEditingClassroom(classroom);
    setFormData({
      name: classroom.name,
      address: classroom.address,
      notes: classroom.notes || "",
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {cityName} - 教室管理
            </DialogTitle>
            <DialogDescription>
              管理该城市的所有教室信息,包括教室名称和详细地址
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                共 {classrooms?.length || 0} 个教室
              </div>
              <Button
                onClick={() => {
                  setFormData({ name: "", address: "", notes: "" });
                  setIsCreateDialogOpen(true);
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                添加教室
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : classrooms && classrooms.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>教室名称</TableHead>
                    <TableHead>教室地址</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classrooms.map((classroom) => (
                    <TableRow key={classroom.id}>
                      <TableCell className="font-medium">{classroom.name}</TableCell>
                      <TableCell>
                        <div className="flex items-start gap-1 max-w-md">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <span className="text-sm">{classroom.address}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={classroom.isActive ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => handleToggleActive(classroom.id)}
                        >
                          {classroom.isActive ? "启用" : "停用"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(classroom)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(classroom.id, classroom.name)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无教室数据,点击"添加教室"开始添加
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 创建/编辑教室对话框 */}
      <Dialog
        open={isCreateDialogOpen || !!editingClassroom}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingClassroom(null);
            setFormData({ name: "", address: "", notes: "" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClassroom ? "编辑教室" : "添加教室"}</DialogTitle>
            <DialogDescription>
              {editingClassroom ? "修改教室信息" : `为${cityName}添加新教室`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">教室名称 *</Label>
              <Input
                id="name"
                placeholder="如: 404教室、1101教室"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="address">教室地址 *</Label>
              <Textarea
                id="address"
                placeholder="请输入教室详细地址"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                placeholder="选填,如交通提示、特殊说明等"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setEditingClassroom(null);
                setFormData({ name: "", address: "", notes: "" });
              }}
            >
              取消
            </Button>
            <Button onClick={editingClassroom ? handleUpdate : handleCreate}>
              {editingClassroom ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
