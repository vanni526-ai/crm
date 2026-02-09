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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search, Key, Edit, UserPlus, X, ChevronDown } from "lucide-react";

// 角色定义
const ALL_ROLES = [
  { value: "admin", label: "管理员", color: "bg-red-100 text-red-800" },
  { value: "teacher", label: "老师", color: "bg-purple-100 text-purple-800" },
  { value: "user", label: "普通用户", color: "bg-gray-100 text-gray-800" },
  { value: "sales", label: "销售", color: "bg-blue-100 text-blue-800" },
  { value: "cityPartner", label: "城市合伙人", color: "bg-amber-100 text-amber-800" },
] as const;

// 解析角色字符串为数组
function parseRoles(rolesStr: string | null | undefined): string[] {
  if (!rolesStr) return ["user"];
  return rolesStr.split(",").map((r) => r.trim()).filter(Boolean);
}

// 获取角色显示信息
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
            <Badge
              key={roleValue}
              className={`${roleInfo.color} flex items-center gap-1`}
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
            </Badge>
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

export default function UserManagementContent() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);

  // 多角色选择状态
  const [createRoles, setCreateRoles] = useState<string[]>(["user"]);
  const [editRoles, setEditRoles] = useState<string[]>(["user"]);
  
  // 城市选择状态（每个角色独立的城市列表）
  const [editTeacherCities, setEditTeacherCities] = useState<string[]>([]);
  const [editPartnerCities, setEditPartnerCities] = useState<string[]>([]);
  const [editSalesCities, setEditSalesCities] = useState<string[]>([]);

  // 查询用户列表
  const { data: users, isLoading, refetch } = trpc.userManagement.list.useQuery();
  
  // 查询城市列表
  const { data: cities } = trpc.analytics.getAllCities.useQuery();

  // 创建用户
  const createMutation = trpc.userManagement.create.useMutation({
    onSuccess: () => {
      toast.success("用户创建成功");
      setIsCreateDialogOpen(false);
      setCreateRoles(["user"]);
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
      setEditRoles(["user"]);
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // 更新角色
  const updateRolesMutation = trpc.userManagement.updateRoles?.useMutation?.({
    onSuccess: () => {
      toast.success("角色更新成功");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`角色更新失败: ${error.message}`);
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
      nickname: (formData.get("nickname") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      role: createRoles[0] as any, // 主角色（兼容旧接口）
      roles: createRoles.join(","), // 多角色
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingUser.id,
      name: formData.get("name") as string,
      nickname: (formData.get("nickname") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      role: editRoles[0] as any, // 主角色（兼容旧接口）
      roles: editRoles.join(","), // 多角色
      roleCities: {
        ...(editTeacherCities.length > 0 ? { teacher: editTeacherCities } : {}),
        ...(editPartnerCities.length > 0 ? { cityPartner: editPartnerCities } : {}),
        ...(editSalesCities.length > 0 ? { sales: editSalesCities } : {}),
      },
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

  const trpcUtils = trpc.useUtils();

  const handleEditUser = async (user: any) => {
    setEditingUser(user);
    setEditRoles(parseRoles(user.roles || user.role));
    
    // 重置所有角色的城市列表
    setEditTeacherCities([]);
    setEditPartnerCities([]);
    setEditSalesCities([]);
    
    // 从user_role_cities表加载每个角色的城市列表
    try {
      const roleCitiesData = await trpcUtils.userManagement.getRoleCities.fetch({ userId: user.id });
      const roleCitiesMap: Record<string, string[]> = {};
      roleCitiesData.forEach((rc: any) => {
        if (!roleCitiesMap[rc.role]) {
          roleCitiesMap[rc.role] = [];
        }
        roleCitiesMap[rc.role].push(rc.cityName);
      });
      
      setEditTeacherCities(roleCitiesMap['teacher'] || []);
      setEditPartnerCities(roleCitiesMap['cityPartner'] || []);
      setEditSalesCities(roleCitiesMap['sales'] || []);
    } catch (error) {
      console.error('Failed to load role cities:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        <Button onClick={() => { setIsCreateDialogOpen(true); setCreateRoles(["user"]); }}>
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
              filteredUsers.map((user) => {
                const userRoles = parseRoles((user as any).roles || user.role);
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono">{user.id}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.nickname || "-"}</TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {userRoles.map((role) => {
                          const info = getRoleInfo(role);
                          return (
                            <span
                              key={role}
                              className={`px-2 py-0.5 rounded text-xs ${info.color}`}
                            >
                              {info.label}
                            </span>
                          );
                        })}
                      </div>
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
                );
              })
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
                <Label>角色 *（可多选）</Label>
                <div className="mt-2 p-3 border rounded-md">
                  <RolesSelector
                    selectedRoles={createRoles}
                    onChange={setCreateRoles}
                  />
                </div>
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
                              setEditTeacherCities([]);
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <label htmlFor="role-teacher" className="text-sm font-medium cursor-pointer">老师</label>
                      </div>
                      {editRoles.includes('teacher') && (
                        <div className="flex-1 space-y-2">
                          {editTeacherCities.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {editTeacherCities.map((city) => (
                                <Badge key={city} variant="secondary" className="bg-purple-100 text-purple-800">
                                  {city}
                                  <button
                                    type="button"
                                    onClick={() => setEditTeacherCities(editTeacherCities.filter(c => c !== city))}
                                    className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                          <select
                            className="w-full p-2 border rounded-md text-sm"
                            value=""
                            onChange={(e) => {
                              const city = e.target.value;
                              if (city && !editTeacherCities.includes(city)) {
                                setEditTeacherCities([...editTeacherCities, city]);
                              }
                            }}
                          >
                            <option value="">添加城市...</option>
                            {cities?.map((city) => (
                              <option key={city.name} value={city.name}>{city.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
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
                              setEditPartnerCities([]);
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <label htmlFor="role-cityPartner" className="text-sm font-medium cursor-pointer">合伙人</label>
                      </div>
                      {editRoles.includes('cityPartner') && (
                        <div className="flex-1 space-y-2">
                          {editPartnerCities.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {editPartnerCities.map((city) => (
                                <Badge key={city} variant="secondary" className="bg-amber-100 text-amber-800">
                                  {city}
                                  <button
                                    type="button"
                                    onClick={() => setEditPartnerCities(editPartnerCities.filter(c => c !== city))}
                                    className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                          <select
                            className="w-full p-2 border rounded-md text-sm"
                            value=""
                            onChange={(e) => {
                              const city = e.target.value;
                              if (city && !editPartnerCities.includes(city)) {
                                setEditPartnerCities([...editPartnerCities, city]);
                              }
                            }}
                          >
                            <option value="">添加城市...</option>
                            {cities?.map((city) => (
                              <option key={city.name} value={city.name}>{city.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
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
                              setEditSalesCities([]);
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <label htmlFor="role-sales" className="text-sm font-medium cursor-pointer">销售</label>
                      </div>
                      {editRoles.includes('sales') && (
                        <div className="flex-1 space-y-2">
                          {editSalesCities.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {editSalesCities.map((city) => (
                                <Badge key={city} variant="secondary" className="bg-blue-100 text-blue-800">
                                  {city}
                                  <button
                                    type="button"
                                    onClick={() => setEditSalesCities(editSalesCities.filter(c => c !== city))}
                                    className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                          <select
                            className="w-full p-2 border rounded-md text-sm"
                            value=""
                            onChange={(e) => {
                              const city = e.target.value;
                              if (city && !editSalesCities.includes(city)) {
                                setEditSalesCities([...editSalesCities, city]);
                              }
                            }}
                          >
                            <option value="">添加城市...</option>
                            {cities?.map((city) => (
                              <option key={city.name} value={city.name}>{city.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">用于老师和城市合伙人角色的业绩统计（老师和合伙人可以在不同城市）</p>
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
  );
}
