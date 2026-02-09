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
import { Search, Plus, Key, Edit, UserPlus, X, ChevronDown } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// 角色定义
const ALL_ROLES = [
  { value: "admin", label: "管理员", color: "bg-red-100 text-red-800" },
  { value: "teacher", label: "老师", color: "bg-purple-100 text-purple-800" },
  { value: "user", label: "普通用户", color: "bg-gray-100 text-gray-800" },
  { value: "sales", label: "销售", color: "bg-blue-100 text-blue-800" },
  { value: "cityPartner", label: "城市合伙人", color: "bg-yellow-100 text-yellow-800" },
];

function getRoleInfo(roleValue: string) {
  return ALL_ROLES.find((r) => r.value === roleValue) || {
    value: roleValue,
    label: roleValue,
    color: "bg-gray-100 text-gray-800",
  };
}

// 多角色选择组件（下拉多选样式）
function RolesSelector({
  selectedRoles,
  onChange,
}: {
  selectedRoles: string[];
  onChange: (roles: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleRemove = (roleValue: string) => {
    if (selectedRoles.length > 1) {
      onChange(selectedRoles.filter((r) => r !== roleValue));
    } else {
      toast.error("至少需要保留一个角色");
    }
  };

  const handleSelect = (roleValue: string) => {
    if (!selectedRoles.includes(roleValue)) {
      onChange([...selectedRoles, roleValue]);
    }
    setIsOpen(false);
  };

  const availableRoles = ALL_ROLES.filter(
    (role) => !selectedRoles.includes(role.value)
  );

  return (
    <div className="space-y-2">
      {/* 已选角色显示 */}
      <div className="flex flex-wrap gap-2">
        {selectedRoles.map((roleValue) => {
          const roleInfo = getRoleInfo(roleValue);
          return (
            <span
              key={roleValue}
              className={`${roleInfo.color} px-2 py-1 rounded text-xs flex items-center gap-1`}
            >
              {roleInfo.label}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemove(roleValue);
                }}
                className="ml-1 hover:bg-black/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
      </div>

      {/* 下拉选择器 */}
      {availableRoles.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-3 py-2 text-left border rounded-md bg-white hover:bg-gray-50 flex items-center justify-between"
          >
            <span className="text-sm text-gray-500">选择角色...</span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
              {availableRoles.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => handleSelect(role.value)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                >
                  <span className={`px-2 py-0.5 rounded text-xs ${role.color}`}>
                    {role.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function UserManagement() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  // 为每个角色维护独立的城市列表
  const [roleCitiesMap, setRoleCitiesMap] = useState<Record<string, string[]>>({});
  
  // 筛选器状态
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>(""); // "all" | "active" | "inactive"

  // 查询用户列表（带筛选参数）
  const { data: users, isLoading, refetch } = trpc.userManagement.list.useQuery({
    city: filterCity || undefined,
    role: filterRole || undefined,
    isActive: filterStatus === "active" ? true : filterStatus === "inactive" ? false : undefined,
  });
  
  // 查询城市列表
  const { data: cities } = trpc.analytics.getAllCities.useQuery();

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
      roles: editRoles.join(","), // 将数组转换为逗号分隔的字符串
      roleCities: Object.keys(roleCitiesMap).length > 0 ? roleCitiesMap : undefined, // 角色-城市关联
    });
  };
  
  const handleEditUser = (user: any) => {
    setEditingUser(user);
    // 初始化角色数据（从逗号分隔的字符串转换为数组）
    const rolesStr = user.roles || user.role || "user";
    const userRoles = rolesStr.split(",").map((r: string) => r.trim());
    setEditRoles(userRoles);
    // 初始化角色-城市数据
    if (user.roleCities && typeof user.roleCities === 'object') {
      setRoleCitiesMap(user.roleCities);
    } else {
      setRoleCitiesMap({});
    }
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

        {/* 搜索栏和筛选器 */}
        <Card className="p-4 space-y-4">
          {/* 搜索框 */}
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

          {/* 筛选器 */}
          <div className="flex gap-3 items-center">
            <span className="text-sm text-muted-foreground">筛选：</span>
            
            {/* 城市筛选 */}
            <Select value={filterCity || "all"} onValueChange={(value) => setFilterCity(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="所有城市" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有城市</SelectItem>
                {cities?.map((city) => (
                  <SelectItem key={city.id} value={city.name}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 角色筛选 */}
            <Select value={filterRole || "all"} onValueChange={(value) => setFilterRole(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="所有角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有角色</SelectItem>
                {ALL_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 状态筛选 */}
            <Select value={filterStatus || "all"} onValueChange={(value) => setFilterStatus(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="所有状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有状态</SelectItem>
                <SelectItem value="active">已启用</SelectItem>
                <SelectItem value="inactive">已禁用</SelectItem>
              </SelectContent>
            </Select>

            {/* 重置筛选按钮 */}
            {(filterCity || filterRole || filterStatus) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterCity("");
                  setFilterRole("");
                  setFilterStatus("");
                }}
              >
                <X className="w-4 h-4 mr-1" />
                重置筛选
              </Button>
            )}
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
                        ? new Date(user.lastSignedIn).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
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
                    <Label>角色与城市 *</Label>
                    <div className="mt-2 p-4 border rounded-md space-y-3">
                      {/* 老师角色行 */}
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-2 w-24 flex-shrink-0">
                          <input
                            type="checkbox"
                            id="role-teacher"
                            checked={editRoles.includes('teacher')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditRoles([...editRoles, 'teacher']);
                              } else {
                                setEditRoles(editRoles.filter(r => r !== 'teacher'));
                                setRoleCitiesMap({ ...roleCitiesMap, teacher: [] });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <label htmlFor="role-teacher" className="text-sm font-medium cursor-pointer">老师</label>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {(roleCitiesMap['teacher'] || []).map((cityName) => (
                              <span key={cityName} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                                {cityName}
                                <button type="button" onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setRoleCitiesMap({ ...roleCitiesMap, teacher: (roleCitiesMap['teacher'] || []).filter(c => c !== cityName) });
                                }} className="ml-1 hover:bg-black/10 rounded-full p-0.5">
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                          {editRoles.includes('teacher') && cities && cities.length > 0 && (
                            <Select value={undefined} onValueChange={(value) => {
                              if (value && !(roleCitiesMap['teacher'] || []).includes(value)) {
                                setRoleCitiesMap({ ...roleCitiesMap, teacher: [...(roleCitiesMap['teacher'] || []), value] });
                              }
                            }}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="添加城市..." /></SelectTrigger>
                              <SelectContent>
                                {cities.filter(city => !(roleCitiesMap['teacher'] || []).includes(city.name)).map(city => (
                                  <SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>

                      {/* 合伙人角色行 */}
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-2 w-24 flex-shrink-0">
                          <input
                            type="checkbox"
                            id="role-cityPartner"
                            checked={editRoles.includes('cityPartner')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditRoles([...editRoles, 'cityPartner']);
                              } else {
                                setEditRoles(editRoles.filter(r => r !== 'cityPartner'));
                                setRoleCitiesMap({ ...roleCitiesMap, cityPartner: [] });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <label htmlFor="role-cityPartner" className="text-sm font-medium cursor-pointer">合伙人</label>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {(roleCitiesMap['cityPartner'] || []).map((cityName) => (
                              <span key={cityName} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                                {cityName}
                                <button type="button" onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setRoleCitiesMap({ ...roleCitiesMap, cityPartner: (roleCitiesMap['cityPartner'] || []).filter(c => c !== cityName) });
                                }} className="ml-1 hover:bg-black/10 rounded-full p-0.5">
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                          {editRoles.includes('cityPartner') && cities && cities.length > 0 && (
                            <Select value={undefined} onValueChange={(value) => {
                              if (value && !(roleCitiesMap['cityPartner'] || []).includes(value)) {
                                setRoleCitiesMap({ ...roleCitiesMap, cityPartner: [...(roleCitiesMap['cityPartner'] || []), value] });
                              }
                            }}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="添加城市..." /></SelectTrigger>
                              <SelectContent>
                                {cities.filter(city => !(roleCitiesMap['cityPartner'] || []).includes(city.name)).map(city => (
                                  <SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>

                      {/* 销售角色行 */}
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-2 w-24 flex-shrink-0">
                          <input
                            type="checkbox"
                            id="role-sales"
                            checked={editRoles.includes('sales')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditRoles([...editRoles, 'sales']);
                              } else {
                                setEditRoles(editRoles.filter(r => r !== 'sales'));
                                setRoleCitiesMap({ ...roleCitiesMap, sales: [] });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <label htmlFor="role-sales" className="text-sm font-medium cursor-pointer">销售</label>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {(roleCitiesMap['sales'] || []).map((cityName) => (
                              <span key={cityName} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                                {cityName}
                                <button type="button" onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setRoleCitiesMap({ ...roleCitiesMap, sales: (roleCitiesMap['sales'] || []).filter(c => c !== cityName) });
                                }} className="ml-1 hover:bg-black/10 rounded-full p-0.5">
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                          {editRoles.includes('sales') && cities && cities.length > 0 && (
                            <Select value={undefined} onValueChange={(value) => {
                              if (value && !(roleCitiesMap['sales'] || []).includes(value)) {
                                setRoleCitiesMap({ ...roleCitiesMap, sales: [...(roleCitiesMap['sales'] || []), value] });
                              }
                            }}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="添加城市..." /></SelectTrigger>
                              <SelectContent>
                                {cities.filter(city => !(roleCitiesMap['sales'] || []).includes(city.name)).map(city => (
                                  <SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">用于老师和城市合伙人角色的业绩统计（老师和合伙人可以不在同城市）</p>
                    </div>
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
