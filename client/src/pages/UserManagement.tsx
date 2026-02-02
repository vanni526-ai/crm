import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Search, Plus, Key, Edit, UserPlus } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function UserManagement() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);

  // 查询用户列表
  const { data: users, isLoading, refetch } = trpc.userManagement.list.useQuery();

  // 创建用户
  const createMutation = trpc.userManagement.create.useMutation({
    onSuccess: () => {
      toast.success("用户创建成功");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 更新用户
  const updateMutation = trpc.userManagement.update.useMutation({
    onSuccess: () => {
      toast.success("用户更新成功");
      setEditingUser(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // 重置密码
  const resetPasswordMutation = trpc.userManagement.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("密码重置成功");
      setIsResetPasswordDialogOpen(false);
      setResetPasswordUserId(null);
    },
    onError: (error) => {
      toast.error(`重置失败: ${error.message}`);
    },
  });

  // 启用/禁用账号
  const toggleActiveMutation = trpc.userManagement.toggleActive.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  // 过滤用户
  const filteredUsers = users?.filter((user) => {
    if (!searchKeyword) return true;
    const keyword = searchKeyword.toLowerCase();
    return (
      user.name?.toLowerCase().includes(keyword) ||
      user.nickname?.toLowerCase().includes(keyword) ||
      user.email?.toLowerCase().includes(keyword) ||
      user.phone?.toLowerCase().includes(keyword)
    );
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get("name") as string,
      password: formData.get("password") as string,
      nickname: formData.get("nickname") as string || undefined,
      email: formData.get("email") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      role: formData.get("role") as "admin" | "sales" | "finance" | "user",
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingUser.id,
      name: formData.get("name") as string,
      nickname: formData.get("nickname") as string || undefined,
      email: formData.get("email") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      role: formData.get("role") as "admin" | "sales" | "finance" | "user",
    });
  };

  const handleResetPassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (resetPasswordUserId) {
      resetPasswordMutation.mutate({
        id: resetPasswordUserId,
        newPassword: formData.get("newPassword") as string,
      });
    }
  };

  const handleToggleActive = (userId: number, isActive: boolean) => {
    toggleActiveMutation.mutate({ id: userId, isActive });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">登录管理</h1>
            <p className="text-muted-foreground mt-1">
              管理系统用户账号和权限
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            创建用户
          </Button>
        </div>

        {/* 搜索栏 */}
        <Card className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="搜索用户名、花名、邮箱、手机号..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </Card>

        {/* 用户列表 */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户编号</TableHead>
                <TableHead>用户名</TableHead>
                <TableHead>花名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最后登录</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono">{user.id}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.nickname || "-"}</TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          user.role === "admin"
                            ? "bg-red-100 text-red-800"
                            : user.role === "sales"
                            ? "bg-blue-100 text-blue-800"
                            : user.role === "finance"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.role === "admin"
                          ? "管理员"
                          : user.role === "sales"
                          ? "销售"
                          : user.role === "finance"
                          ? "财务"
                          : "普通用户"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.isActive}
                          onCheckedChange={(checked) =>
                            handleToggleActive(user.id, checked)
                          }
                        />
                        <span className="text-sm">
                          {user.isActive ? "启用" : "禁用"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.lastSignedIn
                        ? new Date(user.lastSignedIn).toLocaleString("zh-CN")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingUser(user)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          编辑
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setResetPasswordUserId(user.id);
                            setIsResetPasswordDialogOpen(true);
                          }}
                        >
                          <Key className="w-3 h-3 mr-1" />
                          重置密码
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    暂无用户数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* 创建用户对话框 */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建新用户</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">用户名 *</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="password">密码 *</Label>
                  <Input id="password" name="password" type="password" required minLength={6} />
                  <p className="text-xs text-muted-foreground mt-1">至少6位字符</p>
                </div>
                <div>
                  <Label htmlFor="nickname">花名</Label>
                  <Input id="nickname" name="nickname" />
                </div>
                <div>
                  <Label htmlFor="email">邮箱</Label>
                  <Input id="email" name="email" type="email" />
                </div>
                <div>
                  <Label htmlFor="phone">手机号</Label>
                  <Input id="phone" name="phone" />
                </div>
                <div>
                  <Label htmlFor="role">角色 *</Label>
                  <Select name="role" defaultValue="user">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">普通用户</SelectItem>
                      <SelectItem value="sales">销售</SelectItem>
                      <SelectItem value="finance">财务</SelectItem>
                      <SelectItem value="admin">管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "创建中..." : "创建"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 编辑用户对话框 */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑用户</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <form onSubmit={handleUpdateSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name">用户名 *</Label>
                    <Input
                      id="edit-name"
                      name="name"
                      defaultValue={editingUser.name}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-nickname">花名</Label>
                    <Input
                      id="edit-nickname"
                      name="nickname"
                      defaultValue={editingUser.nickname || ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">邮箱</Label>
                    <Input
                      id="edit-email"
                      name="email"
                      type="email"
                      defaultValue={editingUser.email || ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-phone">手机号</Label>
                    <Input
                      id="edit-phone"
                      name="phone"
                      defaultValue={editingUser.phone || ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-role">角色 *</Label>
                    <Select name="role" defaultValue={editingUser.role}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">普通用户</SelectItem>
                        <SelectItem value="sales">销售</SelectItem>
                        <SelectItem value="finance">财务</SelectItem>
                        <SelectItem value="admin">管理员</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingUser(null)}
                  >
                    取消
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "更新中..." : "更新"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* 重置密码对话框 */}
        <Dialog
          open={isResetPasswordDialogOpen}
          onOpenChange={setIsResetPasswordDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>重置密码</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleResetPassword}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="newPassword">新密码 *</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground mt-1">至少6位字符</p>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsResetPasswordDialogOpen(false);
                    setResetPasswordUserId(null);
                  }}
                >
                  取消
                </Button>
                <Button type="submit" disabled={resetPasswordMutation.isPending}>
                  {resetPasswordMutation.isPending ? "重置中..." : "重置密码"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
