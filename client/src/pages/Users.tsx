import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Edit, UserCheck, UserX, Shield, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Users() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.userManagement.list.useQuery();
  
  const updateMutation = trpc.userManagement.update.useMutation({
    onSuccess: () => {
      utils.userManagement.list.invalidate();
      toast.success("更新成功");
      setRoleDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "更新失败");
    },
  });

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: "",
    password: "",
    name: "",
    nickname: "",
    email: "",
    role: "user" as "admin" | "sales" | "finance" | "user",
  });

  const createMutation = trpc.userManagement.create.useMutation({
    onSuccess: () => {
      utils.userManagement.list.invalidate();
      toast.success("用户创建成功");
      setCreateDialogOpen(false);
      setNewUserData({
        username: "",
        password: "",
        name: "",
        nickname: "",
        email: "",
        role: "user",
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "创建失败");
    },
  });

  const handleCreateUser = () => {
    if (!newUserData.username || !newUserData.password || !newUserData.name) {
      toast.error("请填写必填字段");
      return;
    }
    createMutation.mutate(newUserData);
  };

  const handleEditRole = (user: any) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setRoleDialogOpen(true);
  };

  const handleUpdateRole = () => {
    if (!selectedUser || !newRole) return;
    updateMutation.mutate({
      id: selectedUser.id,
      role: newRole as "admin" | "sales" | "finance" | "user",
    });
  };

  const handleToggleStatus = (user: any) => {
    const action = user.isActive ? "禁用" : "启用";
    if (confirm(`确定要${action}用户 ${user.name} 吗?`)) {
      updateMutation.mutate({
        id: user.id,
        isActive: !user.isActive,
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      admin: "destructive",
      sales: "default",
      finance: "secondary",
      user: "outline",
    };
    const labels: Record<string, string> = {
      admin: "管理员",
      sales: "销售",
      finance: "财务",
      user: "普通用户",
    };
    return <Badge variant={variants[role] || "outline"}>{labels[role] || role}</Badge>;
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default">正常</Badge>
    ) : (
      <Badge variant="destructive">已禁用</Badge>
    );
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => {
      const matchesSearch =
        !searchTerm ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = 
        statusFilter === "all" || 
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "inactive" && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // 如果当前用户不是管理员,显示无权限提示
  if (currentUser?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">无权访问</h2>
            <p className="text-muted-foreground">您没有权限访问用户管理页面</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">用户管理</h1>
            <p className="text-muted-foreground mt-2">管理系统用户和权限</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新增用户
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>用户列表</CardTitle>
              <div className="flex items-center space-x-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="筛选角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部角色</SelectItem>
                    <SelectItem value="admin">管理员</SelectItem>
                    <SelectItem value="sales">销售</SelectItem>
                    <SelectItem value="finance">财务</SelectItem>
                    <SelectItem value="user">普通用户</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="筛选状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="active">正常</SelectItem>
                    <SelectItem value="inactive">已禁用</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索用户名、邮箱..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-[250px]"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户名</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>登录方式</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>最后登录</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers && filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.name || "-"}
                          {user.id === currentUser?.id && (
                            <Badge variant="outline" className="ml-2">
                              当前用户
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{user.email || "-"}</TableCell>
                        <TableCell>{user.loginMethod || "-"}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getStatusBadge(user.isActive)}</TableCell>
                        <TableCell>
                          {user.lastSignedIn
                            ? new Date(user.lastSignedIn).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRole(user)}
                              disabled={user.id === currentUser?.id}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(user)}
                              disabled={user.id === currentUser?.id}
                            >
                              {user.isActive ? (
                                <UserX className="h-4 w-4 text-destructive" />
                              ) : (
                                <UserCheck className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {searchTerm || roleFilter !== "all" || statusFilter !== "all"
                          ? "未找到匹配的用户"
                          : "暂无用户数据"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 修改角色对话框 */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>修改用户角色</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div>
                  <Label>用户名</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedUser.name}</p>
                </div>
                <div>
                  <Label>邮箱</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedUser.email}</p>
                </div>
                <div>
                  <Label htmlFor="role">角色 *</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择角色" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">管理员</SelectItem>
                      <SelectItem value="sales">销售</SelectItem>
                      <SelectItem value="finance">财务</SelectItem>
                      <SelectItem value="user">普通用户</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>管理员:</strong> 拥有所有权限,可管理用户和查看所有数据
                    <br />
                    <strong>销售:</strong> 可登记订单、查看客户信息
                    <br />
                    <strong>财务:</strong> 可查看财务对账、管理老师费用
                    <br />
                    <strong>普通用户:</strong> 只能查看基本信息
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleUpdateRole} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 新增用户对话框 */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>新增用户</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">用户名 *</Label>
                <Input
                  id="username"
                  value={newUserData.username}
                  onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                  placeholder="至少3个字符"
                />
              </div>
              <div>
                <Label htmlFor="password">密码 *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  placeholder="至少6个字符"
                />
              </div>
              <div>
                <Label htmlFor="name">姓名 *</Label>
                <Input
                  id="name"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  placeholder="请输入姓名"
                />
              </div>
              <div>
                <Label htmlFor="nickname">花名</Label>
                <Input
                  id="nickname"
                  value={newUserData.nickname}
                  onChange={(e) => setNewUserData({ ...newUserData, nickname: e.target.value })}
                  placeholder="可选"
                />
              </div>
              <div>
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="可选"
                />
              </div>
              <div>
                <Label htmlFor="newUserRole">角色 *</Label>
                <Select value={newUserData.role} onValueChange={(value: any) => setNewUserData({ ...newUserData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理员</SelectItem>
                    <SelectItem value="sales">销售</SelectItem>
                    <SelectItem value="finance">财务</SelectItem>
                    <SelectItem value="user">普通用户</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateUser} disabled={createMutation.isPending}>
                {createMutation.isPending ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
