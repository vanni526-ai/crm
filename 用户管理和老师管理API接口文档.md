# 用户管理和老师管理 API 接口文档

## 概述

本文档描述了课程交付CRM系统中用户管理和老师管理的所有前端API接口。系统采用 **tRPC** 框架，所有接口通过 `trpc.*.useQuery()` 或 `trpc.*.useMutation()` 调用。

### 架构说明

- **单一数据源**: `users` 表是所有账号的主表，`teachers` 表是老师角色的扩展表
- **角色管理**: 用户可以拥有多个角色（teacher, cityPartner, sales, admin, user），以逗号分隔存储在 `roles` 字段
- **创建老师**: 必须通过用户管理创建账号并添加 `teacher` 角色，系统会自动在 `teachers` 表创建关联记录
- **编辑限制**: 老师管理页面只能编辑合同相关信息，基本信息（姓名、电话、头像、城市、状态）必须在用户管理中修改

---

## 一、用户管理 API (`trpc.userManagement.*`)

### 1.1 获取用户列表

**接口**: `trpc.userManagement.list.useQuery()`

**类型**: Query

**权限**: 管理员

**请求参数**: 无

**返回数据**:
```typescript
Array<{
  id: number;
  openId: string;
  name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  role: string;              // 主要角色（兼容旧字段）
  roles: string;             // 多角色，逗号分隔，如 "teacher,cityPartner"
  isActive: boolean;
  createdAt: Date;
  lastSignedIn: Date | null;
}>
```

**使用示例**:
```typescript
const { data: users, isLoading } = trpc.userManagement.list.useQuery();
```

---

### 1.2 获取单个用户详情

**接口**: `trpc.userManagement.getById.useQuery()`

**类型**: Query

**权限**: 管理员

**请求参数**:
```typescript
{
  id: number;  // 用户ID
}
```

**返回数据**:
```typescript
{
  id: number;
  openId: string;
  name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  roles: string;
  roleCities: Record<string, string[]>;  // 角色-城市关联，如 { "teacher": ["深圳", "上海"], "cityPartner": ["天津"] }
  isActive: boolean;
  createdAt: Date;
  lastSignedIn: Date | null;
}
```

**使用示例**:
```typescript
const { data: user } = trpc.userManagement.getById.useQuery({ id: 123 });
```

---

### 1.3 创建新用户

**接口**: `trpc.userManagement.create.useMutation()`

**类型**: Mutation

**权限**: 管理员

**请求参数**:
```typescript
{
  name: string;              // 必填，用户名
  nickname?: string;         // 可选，昵称
  email?: string;            // 可选，邮箱（需符合邮箱格式）
  phone?: string;            // 可选，手机号（全局唯一）
  password: string;          // 必填，密码（至少6位）
  role?: string;             // 可选，单个角色（兼容旧版）
  roles?: string;            // 可选，多角色，逗号分隔，如 "teacher,cityPartner"
}
```

**返回数据**:
```typescript
{
  success: boolean;
  message: string;
}
```

**特殊逻辑**:
- 手机号会进行全局唯一性验证（检查 `users` 和 `teachers` 表）
- 如果 `roles` 包含 `teacher`，会自动在 `teachers` 表创建关联记录
- 密码会自动加密存储

**使用示例**:
```typescript
const createUser = trpc.userManagement.create.useMutation({
  onSuccess: () => {
    toast.success("用户创建成功");
    utils.userManagement.list.invalidate();
  },
});

createUser.mutate({
  name: "张三",
  phone: "13800138000",
  password: "123456",
  roles: "teacher,cityPartner",
});
```

---

### 1.4 更新用户信息

**接口**: `trpc.userManagement.update.useMutation()`

**类型**: Mutation

**权限**: 管理员

**请求参数**:
```typescript
{
  id: number;                // 必填，用户ID
  name?: string;             // 可选，用户名
  nickname?: string;         // 可选，昵称
  email?: string;            // 可选，邮箱
  phone?: string;            // 可选，手机号
  role?: string;             // 可选，单个角色
  roles?: string;            // 可选，多角色，逗号分隔
  roleCities?: Record<string, string[]>;  // 可选，角色-城市关联
}
```

**返回数据**:
```typescript
{
  success: boolean;
  message: string;
}
```

**特殊逻辑**:
- 手机号会进行唯一性验证（排除当前用户）
- 如果 `roles` 发生变化，会自动同步 `teachers` 表：
  - 添加 `teacher` 角色 → 在 `teachers` 表创建或激活记录
  - 移除 `teacher` 角色 → 在 `teachers` 表设置为不激活
- 如果提供 `roleCities`，会保存到 `user_role_cities` 表

**使用示例**:
```typescript
const updateUser = trpc.userManagement.update.useMutation({
  onSuccess: () => {
    toast.success("用户信息更新成功");
    utils.userManagement.list.invalidate();
  },
});

updateUser.mutate({
  id: 123,
  name: "张三",
  roles: "teacher,cityPartner",
  roleCities: {
    teacher: ["深圳", "上海"],
    cityPartner: ["天津"],
  },
});
```

---

### 1.5 更新用户角色

**接口**: `trpc.userManagement.updateRoles.useMutation()`

**类型**: Mutation

**权限**: 管理员

**请求参数**:
```typescript
{
  id: number;      // 用户ID
  roles: string;   // 多角色，逗号分隔，至少一个
}
```

**返回数据**:
```typescript
{
  success: boolean;
  message: string;
}
```

**特殊逻辑**:
- 与 `update` 接口类似，会自动同步 `teachers` 表

**使用示例**:
```typescript
updateRoles.mutate({
  id: 123,
  roles: "teacher,admin",
});
```

---

### 1.6 重置用户密码

**接口**: `trpc.userManagement.resetPassword.useMutation()`

**类型**: Mutation

**权限**: 管理员

**请求参数**:
```typescript
{
  id: number;           // 用户ID
  newPassword: string;  // 新密码（至少6位）
}
```

**返回数据**:
```typescript
{
  success: boolean;
  message: string;
}
```

**使用示例**:
```typescript
resetPassword.mutate({
  id: 123,
  newPassword: "newpass123",
});
```

---

### 1.7 启用/禁用用户账号

**接口**: `trpc.userManagement.toggleActive.useMutation()`

**类型**: Mutation

**权限**: 管理员

**请求参数**:
```typescript
{
  id: number;         // 用户ID
  isActive: boolean;  // true=启用, false=禁用
}
```

**返回数据**:
```typescript
{
  success: boolean;
  message: string;
}
```

**使用示例**:
```typescript
toggleActive.mutate({
  id: 123,
  isActive: false,
});
```

---

### 1.8 获取用户的角色-城市关联

**接口**: `trpc.userManagement.getRoleCities.useQuery()`

**类型**: Query

**权限**: 管理员

**请求参数**:
```typescript
{
  userId: number;
}
```

**返回数据**:
```typescript
Array<{
  userId: number;
  role: string;      // "teacher" | "cityPartner" | "sales"
  cities: string;    // JSON字符串，如 '["深圳","上海"]'
}>
```

**使用示例**:
```typescript
const { data: roleCities } = trpc.userManagement.getRoleCities.useQuery({ userId: 123 });
```

---

### 1.9 删除用户

**接口**: `trpc.userManagement.delete.useMutation()`

**类型**: Mutation

**权限**: 管理员

**请求参数**:
```typescript
{
  id: number;  // 用户ID
}
```

**返回数据**:
```typescript
{
  success: boolean;
  message: string;
}
```

**使用示例**:
```typescript
deleteUser.mutate({ id: 123 });
```

---

## 二、老师管理 API (`trpc.teachers.*`)

### 2.1 获取老师列表

**接口**: `trpc.teachers.list.useQuery()`

**类型**: Query

**权限**: 公开（前端App使用）

**请求参数**: 无

**返回数据**:
```typescript
Array<{
  id: number;
  userId: number;            // 关联的用户ID
  name: string;              // 从 users 表同步
  nickname: string | null;   // 从 users 表同步
  phone: string | null;      // 从 users 表同步
  avatarUrl: string | null;  // 头像URL
  status: string;            // "活跃" | "不激活"
  category: string | null;   // 分类（本部老师/合伙店老师）
  city: string | null;       // 城市（JSON数组字符串）
  customerType: string | null;  // 受众客户类型
  notes: string | null;      // 备注
  aliases: string | null;    // 别名（逗号分隔）
  contractEndDate: Date | null;  // 合同到期时间
  joinDate: Date | null;     // 入职时间
  // 统计数据
  classCount: number;        // 授课次数
  totalHours: number;        // 总课时
  totalIncome: number;       // 总收入
}>
```

**使用示例**:
```typescript
const { data: teachers, isLoading } = trpc.teachers.list.useQuery();
```

---

### 2.2 获取单个老师详情

**接口**: `trpc.teachers.getById.useQuery()`

**类型**: Query

**权限**: 公开（前端App使用）

**请求参数**:
```typescript
{
  id: number;  // 老师ID（teachers表的id）
}
```

**返回数据**: 与 `list` 接口相同的单个老师对象

**使用示例**:
```typescript
const { data: teacher } = trpc.teachers.getById.useQuery({ id: 123 });
```

---

### 2.3 创建老师（已废弃）

**接口**: `trpc.teachers.create.useMutation()`

**状态**: ⚠️ **已废弃** - 请使用 `userManagement.create` 并添加 `teacher` 角色

**类型**: Mutation

**权限**: 管理员

**请求参数**:
```typescript
{
  userId: number;              // 关联的用户ID
  category?: string;           // 分类
  customerType?: string;       // 受众客户类型
  notes?: string;              // 备注
  contractEndDate?: string | Date;  // 合同到期时间
  joinDate?: string | Date;    // 入职时间
  aliases?: string;            // 别名
}
```

**说明**: 此接口仅用于向已存在的用户添加老师扩展信息，不应在前端直接调用。

---

### 2.4 更新老师信息

**接口**: `trpc.teachers.update.useMutation()`

**类型**: Mutation

**权限**: 管理员

**请求参数**:
```typescript
{
  id: number;  // 老师ID
  data: {
    category?: string;           // 分类
    customerType?: string;       // 受众客户类型
    notes?: string;              // 备注
    contractEndDate?: string | Date;  // 合同到期时间
    joinDate?: string | Date;    // 入职时间
    aliases?: string;            // 别名（逗号分隔）
    avatarUrl?: string;          // 头像URL（通过头像编辑对话框更新）
  }
}
```

**返回数据**:
```typescript
{
  success: boolean;
}
```

**重要说明**:
- ⚠️ **只允许更新合同相关信息**
- **基本信息**（姓名、电话、城市、状态）必须在 `userManagement.update` 中修改
- `avatarUrl` 字段用于头像编辑对话框，会同时更新 `users` 表

**使用示例**:
```typescript
const updateTeacher = trpc.teachers.update.useMutation({
  onSuccess: () => {
    toast.success("老师信息更新成功");
    utils.teachers.list.invalidate();
  },
});

updateTeacher.mutate({
  id: 123,
  data: {
    category: "本部老师",
    contractEndDate: new Date("2025-12-31"),
    aliases: "橘子,小橘,橘子老师",
  },
});
```

---

### 2.5 批量删除老师

**接口**: `trpc.teachers.batchDelete.useMutation()`

**类型**: Mutation

**权限**: 管理员

**请求参数**:
```typescript
{
  ids: number[];  // 老师ID数组
}
```

**返回数据**:
```typescript
{
  success: boolean;
  deletedCount: number;
}
```

**使用示例**:
```typescript
batchDelete.mutate({ ids: [1, 2, 3] });
```

---

### 2.6 批量更新状态

**接口**: `trpc.teachers.batchUpdateStatus.useMutation()`

**类型**: Mutation

**权限**: 管理员

**请求参数**:
```typescript
{
  ids: number[];    // 老师ID数组
  status: string;   // "活跃" | "不激活"
}
```

**返回数据**:
```typescript
{
  success: boolean;
  updatedCount: number;
}
```

**使用示例**:
```typescript
batchUpdateStatus.mutate({
  ids: [1, 2, 3],
  status: "活跃",
});
```

---

### 2.7 Excel导入

**接口**: `trpc.teachers.importFromExcel.useMutation()`

**类型**: Mutation

**权限**: 管理员

**请求参数**:
```typescript
{
  teachers: Array<{
    name: string;
    phone?: string;
    status?: string;
    customerType?: string;
    notes?: string;
    category?: string;
    city?: string;              // 多个城市用分号分隔
    contractEndDate?: string | Date;
    joinDate?: string | Date;
  }>;
}
```

**返回数据**:
```typescript
{
  success: boolean;
  importedCount: number;
  teachers: Array<any>;
}
```

**使用示例**:
```typescript
importFromExcel.mutate({
  teachers: [
    { name: "张三", phone: "13800138000", status: "活跃" },
    { name: "李四", phone: "13800138001", status: "活跃" },
  ],
});
```

---

### 2.8 获取所有老师名字

**接口**: `trpc.teachers.getAllTeacherNames.useQuery()`

**类型**: Query

**权限**: 需要登录

**请求参数**: 无

**返回数据**:
```typescript
Array<{
  id: number;
  name: string;
}>
```

**使用场景**: 用于表单验证、自动补全等

**使用示例**:
```typescript
const { data: teacherNames } = trpc.teachers.getAllTeacherNames.useQuery();
```

---

### 2.9 获取单个老师统计数据

**接口**: `trpc.teachers.getStats.useQuery()`

**类型**: Query

**权限**: 需要登录

**请求参数**:
```typescript
{
  teacherId: number;
  startDate?: Date;  // 可选，统计开始日期
  endDate?: Date;    // 可选，统计结束日期
}
```

**返回数据**:
```typescript
{
  classCount: number;     // 授课次数
  totalHours: number;     // 总课时
  totalIncome: number;    // 总收入
}
```

**使用示例**:
```typescript
const { data: stats } = trpc.teachers.getStats.useQuery({
  teacherId: 123,
  startDate: new Date("2025-01-01"),
  endDate: new Date("2025-12-31"),
});
```

---

### 2.10 获取所有老师统计数据

**接口**: `trpc.teachers.getAllStats.useQuery()`

**类型**: Query

**权限**: 需要登录

**请求参数**:
```typescript
{
  startDate?: Date;  // 可选
  endDate?: Date;    // 可选
}
```

**返回数据**:
```typescript
Array<{
  teacherId: number;
  teacherName: string;
  classCount: number;
  totalHours: number;
  totalIncome: number;
}>
```

**使用示例**:
```typescript
const { data: allStats } = trpc.teachers.getAllStats.useQuery({
  startDate: new Date("2025-01-01"),
  endDate: new Date("2025-12-31"),
});
```

---

## 三、辅助 API

### 3.1 获取所有城市列表

**接口**: `trpc.analytics.getAllCities.useQuery()`

**类型**: Query

**权限**: 需要登录

**请求参数**: 无

**返回数据**:
```typescript
Array<{
  name: string;
}>
```

**使用场景**: 用于城市选择器

**使用示例**:
```typescript
const { data: cities } = trpc.analytics.getAllCities.useQuery();
```

---

### 3.2 上传头像

**接口**: `trpc.upload.uploadAvatar.useMutation()`

**类型**: Mutation

**权限**: 需要登录

**请求参数**:
```typescript
{
  file: File;  // 图片文件
}
```

**返回数据**:
```typescript
{
  url: string;  // 上传后的头像URL
}
```

**使用示例**:
```typescript
const uploadAvatar = trpc.upload.uploadAvatar.useMutation({
  onSuccess: (data) => {
    console.log("头像URL:", data.url);
  },
});

uploadAvatar.mutate({ file: avatarFile });
```

---

## 四、常见使用场景

### 4.1 创建新老师账号

**步骤**:
1. 使用 `userManagement.create` 创建用户，`roles` 字段包含 `teacher`
2. 系统自动在 `teachers` 表创建关联记录
3. 如需设置城市，调用 `userManagement.update` 并传入 `roleCities`

```typescript
// 步骤1: 创建用户
createUser.mutate({
  name: "张三",
  phone: "13800138000",
  password: "123456",
  roles: "teacher",
});

// 步骤2: 设置城市（可选）
updateUser.mutate({
  id: newUserId,
  roleCities: {
    teacher: ["深圳", "上海"],
  },
});
```

---

### 4.2 编辑老师信息

**基本信息**（姓名、电话、城市、状态）:
```typescript
// 在用户管理中修改
updateUser.mutate({
  id: userId,
  name: "新姓名",
  phone: "13800138001",
  roleCities: {
    teacher: ["北京"],
  },
});
```

**合同信息**（分类、合同日期、别名等）:
```typescript
// 在老师管理中修改
updateTeacher.mutate({
  id: teacherId,
  data: {
    category: "本部老师",
    contractEndDate: new Date("2025-12-31"),
    aliases: "橘子,小橘",
  },
});
```

---

### 4.3 移除老师角色

```typescript
// 从用户的roles中移除teacher
updateUser.mutate({
  id: userId,
  roles: "cityPartner,sales",  // 不包含teacher
});
// 系统会自动将teachers表中的记录设置为不激活
```

---

## 五、注意事项

1. **手机号唯一性**: 手机号在整个系统中必须唯一，创建和更新时都会验证

2. **角色同步**: 
   - 添加 `teacher` 角色 → 自动创建 `teachers` 表记录
   - 移除 `teacher` 角色 → 自动设置 `teachers` 表记录为不激活

3. **数据权限**:
   - 用户管理的所有接口需要管理员权限
   - 老师列表和详情接口是公开的（供前端App使用）
   - 老师的修改、删除接口需要管理员权限

4. **前端实现建议**:
   - 使用乐观更新提升用户体验
   - 编辑对话框中基本信息字段设置为 `disabled`
   - 在老师管理页面添加提示："如需添加新老师，请前往用户管理"

5. **数据一致性**:
   - `teachers` 表的基本信息（name, phone等）会从 `users` 表同步
   - 编辑老师时只提交合同相关字段，避免数据不一致

---

## 六、类型定义参考

```typescript
// 用户角色
type UserRole = "admin" | "teacher" | "cityPartner" | "sales" | "user";

// 用户对象
interface User {
  id: number;
  openId: string;
  name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  roles: string;  // 逗号分隔的角色列表
  isActive: boolean;
  createdAt: Date;
  lastSignedIn: Date | null;
}

// 老师对象
interface Teacher {
  id: number;
  userId: number;
  name: string;
  nickname: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: "活跃" | "不激活";
  category: string | null;
  city: string | null;
  customerType: string | null;
  notes: string | null;
  aliases: string | null;
  contractEndDate: Date | null;
  joinDate: Date | null;
  classCount: number;
  totalHours: number;
  totalIncome: number;
}

// 角色-城市关联
interface RoleCities {
  [role: string]: string[];  // { "teacher": ["深圳", "上海"], "cityPartner": ["天津"] }
}
```

---

## 七、版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2025-02-09 | 初始版本，重构后的用户管理和老师管理API |

---

**文档生成时间**: 2025-02-09

**相关文档**:
- [订单接口文档.md](./订单接口文档.md)
- [数据库Schema文档](../drizzle/schema.ts)
