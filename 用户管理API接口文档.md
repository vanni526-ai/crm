# 用户管理API接口文档

## 概述

本文档描述了课程交付CRM系统中用户管理相关的tRPC API接口，供前端App开发使用。

**后端API地址：** `https://crm.bdsm.com.cn`

**tRPC路由：** `userManagement.*`

**权限要求：** 所有接口都需要管理员权限（admin角色）

---

## 数据结构

### User对象

```typescript
interface User {
  id: number;                    // 用户ID
  openId: string;                // OpenID（系统生成）
  name: string;                  // 用户名（必填）
  nickname?: string;             // 花名（可选）
  email?: string;                // 邮箱（可选）
  phone?: string;                // 手机号（可选）
  role: string;                  // 主要角色（向后兼容）
  roles: string;                 // 所有角色（逗号分隔，如"teacher,cityPartner,sales"）
  roleCities: Record<string, string[]>; // 角色-城市关联，如 { "teacher": ["深圳"], "cityPartner": ["天津"] }
  isActive: boolean;             // 账号状态（true=启用，false=禁用）
  createdAt: string;             // 创建时间
  lastSignedIn?: string;         // 最后登录时间
}
```

### 角色类型

系统支持以下角色（定义在`shared/roles.ts`）：

- `admin` - 管理员
- `teacher` - 老师
- `cityPartner` - 城市合伙人
- `sales` - 销售
- `finance` - 财务
- `普通用户` - 普通用户

**注意：** **只有** `teacher`和`cityPartner`角色需要关联城市信息，`sales`角色不需要。

---

## API接口

### 1. 获取用户列表

**接口：** `userManagement.list`

**方法：** `query`

**权限：** 管理员

**请求参数：**

```typescript
{
  city?: string;      // 城市筛选（可选）
  role?: string;      // 角色筛选（可选）
  isActive?: boolean; // 状态筛选（可选）
}
```

**返回数据：**

```typescript
User[]  // 用户列表数组
```

**示例：**

```typescript
// 获取所有用户
const users = await trpc.userManagement.list.query();

// 获取深圳的老师
const shenzhenTeachers = await trpc.userManagement.list.query({
  city: "深圳",
  role: "teacher"
});

// 获取启用的用户
const activeUsers = await trpc.userManagement.list.query({
  isActive: true
});
```

---

### 2. 获取单个用户详情

**接口：** `userManagement.getById`

**方法：** `query`

**权限：** 管理员

**请求参数：**

```typescript
{
  id: number;  // 用户ID
}
```

**返回数据：**

```typescript
User  // 用户对象
```

**示例：**

```typescript
const user = await trpc.userManagement.getById.query({ id: 123 });
```

---

### 3. 创建新用户

**接口：** `userManagement.create`

**方法：** `mutation`

**权限：** 管理员

**请求参数：**

```typescript
{
  name: string;          // 用户名（必填，不能为空）
  nickname?: string;     // 花名（可选）
  email?: string;        // 邮箱（可选，需符合邮箱格式）
  phone?: string;        // 手机号（可选）
  password: string;      // 密码（必填，至少6位）
  role?: string;         // 主要角色（可选，向后兼容）
  roles?: string;        // 所有角色（可选，逗号分隔）
}
```

**返回数据：**

```typescript
{
  success: boolean;
  message: string;
}
```

**验证规则：**

1. 用户名不能为空
2. 邮箱需符合格式
3. 密码至少6位
4. 手机号唯一性（不能与其他用户或老师重复）
5. 至少选择1个角色

**示例：**

```typescript
const result = await trpc.userManagement.create.mutate({
  name: "张三",
  nickname: "小张",
  email: "zhangsan@example.com",
  phone: "13800138000",
  password: "123456",
  roles: "teacher,sales"
});
```

---

### 4. 更新用户信息

**接口：** `userManagement.update`

**方法：** `mutation`

**权限：** 管理员

**请求参数：**

```typescript
{
  id: number;                              // 用户ID（必填）
  name?: string;                           // 用户名（可选）
  nickname?: string;                       // 花名（可选）
  email?: string;                          // 邮箱（可选）
  phone?: string;                          // 手机号（可选）
  role?: string;                           // 主要角色（可选）
  roles?: string;                          // 所有角色（可选，逗号分隔）
  roleCities?: Record<string, string[]>;   // 角色-城市关联（可选）
}
```

**返回数据：**

```typescript
{
  success: boolean;
  message: string;
}
```

**验证规则：**

1. 用户名不能为空（如果提供）
2. 邮箱需符合格式（如果提供）
3. 手机号唯一性（如果提供）
4. 至少选择1个角色（如果提供roles）
5. **老师/合伙人角色必须选择城市**

**示例：**

```typescript
// 更新基本信息
const result = await trpc.userManagement.update.mutate({
  id: 123,
  name: "张三",
  nickname: "小张",
  email: "zhangsan@example.com"
});

// 更新角色和城市
const result = await trpc.userManagement.update.mutate({
  id: 123,
  roles: "teacher,cityPartner,sales",
  roleCities: {
    teacher: ["深圳", "上海"],
    cityPartner: ["天津"]
  }
});
```

---

### 5. 获取角色-城市关联

**接口：** `userManagement.getRoleCities`

**方法：** `query`

**权限：** 管理员

**请求参数：**

```typescript
{
  userId: number;  // 用户ID
}
```

**返回数据：**

```typescript
Record<string, string[]>  // 角色-城市映射，如 { "teacher": ["深圳"], "cityPartner": ["天津"] }
```

**示例：**

```typescript
const roleCities = await trpc.userManagement.getRoleCities.query({ userId: 123 });
// 返回: { "teacher": ["深圳", "上海"], "cityPartner": ["天津"] }
```

---

### 6. 切换用户状态

**接口：** `userManagement.toggleActive`

**方法：** `mutation`

**权限：** 管理员

**请求参数：**

```typescript
{
  id: number;  // 用户ID
}
```

**返回数据：**

```typescript
{
  success: boolean;
  message: string;
  isActive: boolean;  // 新的状态
}
```

**示例：**

```typescript
const result = await trpc.userManagement.toggleActive.mutate({ id: 123 });
// 如果用户原来是启用状态，调用后会变为禁用状态，反之亦然
```

---

### 7. 重置用户密码

**接口：** `userManagement.resetPassword`

**方法：** `mutation`

**权限：** 管理员

**请求参数：**

```typescript
{
  id: number;          // 用户ID
  newPassword: string; // 新密码（至少6位）
}
```

**返回数据：**

```typescript
{
  success: boolean;
  message: string;
}
```

**示例：**

```typescript
const result = await trpc.userManagement.resetPassword.mutate({
  id: 123,
  newPassword: "newpass123"
});
```

---

## 前端App集成示例

### React Native示例

```typescript
import { trpc } from '@/lib/trpc';

// 1. 获取用户列表
function UserListScreen() {
  const { data: users, isLoading } = trpc.userManagement.list.useQuery();

  if (isLoading) return <Text>加载中...</Text>;

  return (
    <FlatList
      data={users}
      renderItem={({ item }) => (
        <View>
          <Text>{item.name}</Text>
          <Text>{item.roles}</Text>
        </View>
      )}
    />
  );
}

// 2. 创建用户
function CreateUserScreen() {
  const createMutation = trpc.userManagement.create.useMutation();

  const handleCreate = async () => {
    try {
      const result = await createMutation.mutateAsync({
        name: "张三",
        password: "123456",
        roles: "teacher,sales",
      });
      Alert.alert("成功", result.message);
    } catch (error) {
      Alert.alert("错误", error.message);
    }
  };

  return <Button title="创建用户" onPress={handleCreate} />;
}

// 3. 更新用户
function EditUserScreen({ userId }) {
  const updateMutation = trpc.userManagement.update.useMutation();

  const handleUpdate = async () => {
    try {
      const result = await updateMutation.mutateAsync({
        id: userId,
        roles: "teacher,cityPartner",
        roleCities: {
          teacher: ["深圳"],
          cityPartner: ["天津"]
        }
      });
      Alert.alert("成功", result.message);
    } catch (error) {
      Alert.alert("错误", error.message);
    }
  };

  return <Button title="更新用户" onPress={handleUpdate} />;
}
```

---

## 注意事项

### 1. 角色-城市关联规则

- **只有老师（teacher）和合伙人（cityPartner）** 角色需要关联城市
- **销售（sales）角色不需要关联城市**
- 创建或更新用户时，如果选择了teacher或cityPartner角色，**必须**提供对应的城市列表
- 城市列表不能为空

### 2. 手机号唯一性

- 手机号在整个系统中必须唯一（包括用户管理和老师管理）
- 创建或更新用户时，如果手机号已被使用，会返回错误提示

### 3. 老师角色特殊处理

- 当用户被赋予`teacher`角色时，系统会自动在`teachers`表中创建关联记录
- 当移除`teacher`角色时，系统会将关联的老师记录设为不激活状态
- 老师的基础信息（姓名、邮箱、手机号）从`users`表读取

### 4. 密码安全

- 密码在后端会自动加密存储
- 前端获取用户信息时，不会返回密码字段
- 重置密码需要提供新密码（至少6位）

### 5. 权限控制

- 所有用户管理接口都需要管理员权限
- 前端App需要在调用接口前验证当前用户是否为管理员
- 非管理员调用会返回`FORBIDDEN`错误

---

## 错误处理

### 常见错误码

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| `FORBIDDEN` | 权限不足（非管理员） | 提示用户需要管理员权限 |
| `BAD_REQUEST` | 参数验证失败 | 检查输入参数是否符合要求 |
| `NOT_FOUND` | 用户不存在 | 提示用户不存在或已被删除 |
| `INTERNAL_SERVER_ERROR` | 数据库连接失败 | 提示用户稍后重试 |

### 错误处理示例

```typescript
try {
  const result = await trpc.userManagement.update.mutate({
    id: 123,
    roles: "teacher",
    roleCities: {
      teacher: []  // 错误：老师角色必须选择城市
    }
  });
} catch (error) {
  if (error.code === 'BAD_REQUEST') {
    Alert.alert("验证失败", error.message);
    // 显示: "选择老师角色时，必须选择对应的城市"
  } else if (error.code === 'FORBIDDEN') {
    Alert.alert("权限不足", "需要管理员权限");
  } else {
    Alert.alert("错误", "操作失败，请稍后重试");
  }
}
```

---

## 更新日志

### v1.0.0 (2026-02-09)

- 初始版本
- 支持用户列表查询、创建、更新、删除
- 支持多角色管理
- 支持角色-城市关联
- 支持账号状态切换
- 支持密码重置
