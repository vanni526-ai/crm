"use client";

import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Lock, CheckCircle, XCircle, Shield } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

const createAccountSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符"),
  password: z.string().min(6, "密码至少6个字符"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  identity: z.enum(["customer", "teacher", "sales", "finance", "admin"]),
  relatedName: z.string().optional(),
  notes: z.string().optional(),
});

type CreateAccountInput = z.infer<typeof createAccountSchema>;

export default function AccountManagement() {
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPermissionOpen, setIsPermissionOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterIdentity, setFilterIdentity] = useState<string>("");
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>({});

  // 权限检查
  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center gap-4">
              <Shield className="h-8 w-8 text-destructive" />
              <div>
                <CardTitle>权限不足</CardTitle>
                <CardDescription>仅管理员可以访问账号管理</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                您当前的角色是 <strong>{user?.role}</strong>,无法访问此页面。
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const { data: accounts, isLoading, refetch } = trpc.accounts.list.useQuery({
    search: searchTerm || undefined,
    identity: (filterIdentity as any) || undefined,
  });

  const { data: stats } = trpc.accounts.getStats.useQuery();
  const { data: availablePermissions } = trpc.permissions.getAvailablePermissions.useQuery();
  const { data: accountPermissions } = trpc.permissions.getPermissions.useQuery(
    { accountId: selectedAccount?.id },
    { enabled: !!selectedAccount }
  );

  const createAccountMutation = trpc.accounts.create.useMutation({
    onSuccess: () => {
      toast.success("账号创建成功");
      setIsCreateOpen(false);
      refetch();
      reset();
    },
    onError: (error) => {
      toast.error(error.message || "创建失败");
    },
  });

  const updateAccountMutation = trpc.accounts.update.useMutation({
    onSuccess: () => {
      toast.success("账号更新成功");
      setIsEditOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "更新失败");
    },
  });

  const deleteAccountMutation = trpc.accounts.delete.useMutation({
    onSuccess: () => {
      toast.success("账号删除成功");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "删除失败");
    },
  });

  const toggleActiveMutation = trpc.accounts.toggleActive.useMutation({
    onSuccess: () => {
      toast.success("账号状态已更新");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "更新失败");
    },
  });

  const updatePermissionsMutation = trpc.permissions.updatePermissions.useMutation({
    onSuccess: () => {
      toast.success("权限更新成功");
      setIsPermissionOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "权限更新失败");
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
  });

  const onCreateSubmit = (data: CreateAccountInput) => {
    createAccountMutation.mutate({
      ...data,
      email: data.email || undefined,
      phone: data.phone || undefined,
      relatedName: data.relatedName || undefined,
      notes: data.notes || undefined,
    } as any);
  };

  const handleEdit = (account: any) => {
    setSelectedAccount(account);
    setIsEditOpen(true);
  };

  const handlePermissions = (account: any) => {
    setSelectedAccount(account);
    // 初始化权限选择
    const permissionsMap: Record<string, boolean> = {};
    if (availablePermissions) {
      availablePermissions.forEach((perm: any) => {
        const hasPermission = accountPermissions?.some(
          (p: any) => p.permissionKey === perm.key && p.isGranted
        );
        permissionsMap[perm.key] = hasPermission || false;
      });
    }
    setSelectedPermissions(permissionsMap);
    setIsPermissionOpen(true);
  };

  const handleSavePermissions = () => {
    if (!selectedAccount) return;

    const permissions = (availablePermissions || []).map((perm: any) => ({
      permissionKey: perm.key,
      permissionName: perm.name,
      isGranted: selectedPermissions[perm.key] || false,
    }));

    updatePermissionsMutation.mutate({
      accountId: selectedAccount.id,
      permissions,
    });
  };

  const handleTogglePermission = (key: string) => {
    setSelectedPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">账号管理</h1>
            <p className="text-muted-foreground mt-2">管理系统账号和权限</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            创建账号
          </Button>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总账号数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAccounts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">活跃账号</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeAccounts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">管理员</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byIdentity?.admin || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">销售人员</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byIdentity?.sales || 0}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 搜索和筛选 */}
        <Card>
          <CardHeader>
            <CardTitle>搜索和筛选</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>搜索用户名</Label>
                <Input
                  placeholder="输入用户名..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Label>角色类型</Label>
                <select
                  value={filterIdentity}
                  onChange={(e) => setFilterIdentity(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">全部</option>
                  <option value="admin">管理员</option>
                  <option value="sales">销售</option>
                  <option value="finance">财务</option>
                  <option value="teacher">老师</option>
                  <option value="customer">客户</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 账号列表 */}
        <Card>
          <CardHeader>
            <CardTitle>账号列表</CardTitle>
            <CardDescription>{accounts?.length || 0} 个账号</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">加载中...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户名</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts?.map((account: any) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.username}</TableCell>
                      <TableCell>{account.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{account.identity}</Badge>
                      </TableCell>
                      <TableCell>
                        {account.isActive ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            活跃
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            停用
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePermissions(account)}
                          className="gap-1"
                        >
                          <Shield className="h-3 w-3" />
                          权限
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(account)}
                          className="gap-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActiveMutation.mutate({ id: account.id, isActive: !account.isActive })}
                        >
                          {account.isActive ? "停用" : "激活"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("确定要删除此账号吗?")) {
                              deleteAccountMutation.mutate({ id: account.id });
                            }
                          }}
                          className="gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 创建账号对话框 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新账号</DialogTitle>
            <DialogDescription>填写账号信息</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
            <div>
              <Label>用户名 *</Label>
              <Input {...register("username")} placeholder="输入用户名" />
              {errors.username && <p className="text-sm text-red-500">{errors.username.message}</p>}
            </div>
            <div>
              <Label>密码 *</Label>
              <Input {...register("password")} type="password" placeholder="输入密码" />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            <div>
              <Label>邮箱</Label>
              <Input {...register("email")} type="email" placeholder="输入邮箱" />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div>
              <Label>电话</Label>
              <Input {...register("phone")} placeholder="输入电话" />
            </div>
            <div>
              <Label>角色 *</Label>
              <select {...register("identity")} className="w-full px-3 py-2 border rounded-md">
                <option value="admin">管理员</option>
                <option value="sales">销售</option>
                <option value="finance">财务</option>
                <option value="teacher">老师</option>
                <option value="customer">客户</option>
              </select>
              {errors.identity && <p className="text-sm text-red-500">{errors.identity.message}</p>}
            </div>
            <div>
              <Label>关联名称</Label>
              <Input {...register("relatedName")} placeholder="输入关联名称" />
            </div>
            <div>
              <Label>备注</Label>
              <Input {...register("notes")} placeholder="输入备注" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={createAccountMutation.isPending}>
                {createAccountMutation.isPending ? "创建中..." : "创建"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 权限编辑对话框 */}
      <Dialog open={isPermissionOpen} onOpenChange={setIsPermissionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑账号权限</DialogTitle>
            <DialogDescription>
              为 <strong>{selectedAccount?.username}</strong> 分配菜单权限
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {availablePermissions?.map((perm: any) => (
              <div key={perm.key} className="flex items-center gap-3 p-3 border rounded-lg">
                <Checkbox
                  id={perm.key}
                  checked={selectedPermissions[perm.key] || false}
                  onCheckedChange={() => handleTogglePermission(perm.key)}
                />
                <Label htmlFor={perm.key} className="flex-1 cursor-pointer">
                  <span className="font-medium">{perm.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">({perm.key})</span>
                </Label>
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setIsPermissionOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSavePermissions}
              disabled={updatePermissionsMutation.isPending}
            >
              {updatePermissionsMutation.isPending ? "保存中..." : "保存权限"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
