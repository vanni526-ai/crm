import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Lock, CheckCircle, XCircle } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterIdentity, setFilterIdentity] = useState<string>("");

  const { data: accounts, isLoading, refetch } = trpc.accounts.list.useQuery({
    search: searchTerm || undefined,
    identity: (filterIdentity as any) || undefined,
  });

  const { data: stats } = trpc.accounts.getStats.useQuery();

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

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这个账号吗?")) {
      deleteAccountMutation.mutate({ id });
    }
  };

  const handleToggleActive = (id: number, isActive: boolean) => {
    toggleActiveMutation.mutate({ id, isActive: !isActive });
  };

  const getIdentityLabel = (identity: string) => {
    const labels: Record<string, string> = {
      customer: "客户",
      teacher: "老师",
      sales: "销售",
      finance: "财务",
      admin: "管理员",
    };
    return labels[identity] || identity;
  };

  const getIdentityColor = (identity: string) => {
    const colors: Record<string, string> = {
      customer: "bg-blue-100 text-blue-800",
      teacher: "bg-purple-100 text-purple-800",
      sales: "bg-green-100 text-green-800",
      finance: "bg-orange-100 text-orange-800",
      admin: "bg-red-100 text-red-800",
    };
    return colors[identity] || "bg-gray-100 text-gray-800";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">总账号数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAccounts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">活跃账号</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeAccounts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">客户账号</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byIdentity.customer}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">销售账号</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byIdentity.sales}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">管理员账号</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byIdentity.admin}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 账号列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>账号管理</CardTitle>
                <CardDescription>管理系统中的所有账号</CardDescription>
              </div>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                创建账号
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 搜索和筛选 */}
            <div className="flex gap-4">
              <Input
                placeholder="搜索用户名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <select
                value={filterIdentity}
                onChange={(e) => setFilterIdentity(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="">所有身份</option>
                <option value="customer">客户</option>
                <option value="teacher">老师</option>
                <option value="sales">销售</option>
                <option value="finance">财务</option>
                <option value="admin">管理员</option>
              </select>
            </div>

            {/* 账号表格 */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>用户名</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>身份</TableHead>
                    <TableHead>关联名称</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>最后登录</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : accounts && accounts.length > 0 ? (
                    accounts.map((account: any) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.username}</TableCell>
                        <TableCell>{account.email || "-"}</TableCell>
                        <TableCell>
                          <Badge className={getIdentityColor(account.identity)}>
                            {getIdentityLabel(account.identity)}
                          </Badge>
                        </TableCell>
                        <TableCell>{account.relatedName || "-"}</TableCell>
                        <TableCell>
                          {account.isActive ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              活跃
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="mr-1 h-3 w-3" />
                              停用
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {account.lastLoginAt
                            ? new Date(account.lastLoginAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(account)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(account.id, account.isActive)}
                            >
                              {account.isActive ? (
                                <XCircle className="h-4 w-4 text-red-600" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(account.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        没有找到账号
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 创建账号对话框 */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>创建新账号</DialogTitle>
              <DialogDescription>填写下面的信息来创建一个新账号</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="username">用户名 *</Label>
                <Input
                  id="username"
                  {...register("username")}
                  placeholder="输入用户名"
                />
                {errors.username && <p className="text-red-600 text-sm mt-1">{errors.username.message}</p>}
              </div>

              <div>
                <Label htmlFor="password">密码 *</Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  placeholder="输入密码"
                />
                {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="输入邮箱"
                />
                {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <Label htmlFor="phone">电话</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="输入电话"
                />
              </div>

              <div>
                <Label htmlFor="identity">身份 *</Label>
                <select
                  id="identity"
                  {...register("identity")}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">选择身份</option>
                  <option value="customer">客户</option>
                  <option value="teacher">老师</option>
                  <option value="sales">销售</option>
                  <option value="finance">财务</option>
                  <option value="admin">管理员</option>
                </select>
                {errors.identity && <p className="text-red-600 text-sm mt-1">{errors.identity.message}</p>}
              </div>

              <div>
                <Label htmlFor="relatedName">关联名称</Label>
                <Input
                  id="relatedName"
                  {...register("relatedName")}
                  placeholder="输入关联名称"
                />
              </div>

              <div>
                <Label htmlFor="notes">备注</Label>
                <Input
                  id="notes"
                  {...register("notes")}
                  placeholder="输入备注"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={createAccountMutation.isPending}>
                  {createAccountMutation.isPending ? "创建中..." : "创建"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
