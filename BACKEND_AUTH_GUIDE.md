# 后端登录接口对接指南

本文档说明如何使用课程交付CRM系统的传统用户名密码登录功能。

## 📋 功能概述

系统已实现完整的用户名密码登录功能,支持:
- ✅ 用户名/手机号/邮箱登录
- ✅ 密码加密存储(bcrypt)
- ✅ JWT Token认证
- ✅ 账号启用/禁用控制
- ✅ 用户管理API(CRUD操作)
- ✅ 测试账号已创建

---

## 🔐 登录接口

### API: `auth.loginWithUserAccount`

**请求参数:**
```typescript
{
  username: string;  // 用户名、手机号或邮箱
  password: string;  // 密码
}
```

**返回数据:**
```typescript
{
  success: boolean;
  token: string;      // JWT Token
  user: {
    id: number;
    openId: string;
    name: string;
    nickname?: string;
    email?: string;
    phone?: string;
    role: "admin" | "sales" | "finance" | "user";
    isActive: boolean;
    lastSignedIn?: Date;
  };
}
```

**错误情况:**
- 用户不存在: `throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" })`
- 密码错误: `throw new TRPCError({ code: "UNAUTHORIZED", message: "密码错误" })`
- 账号禁用: `throw new TRPCError({ code: "FORBIDDEN", message: "账号已被禁用" })`
- 未设置密码: `throw new TRPCError({ code: "BAD_REQUEST", message: "该账号未设置密码,请联系管理员" })`

---

## 👤 用户管理API

### 1. 获取用户列表

**API:** `userManagement.list`

**返回数据:**
```typescript
Array<{
  id: number;
  name: string;
  nickname?: string;
  email?: string;
  phone?: string;
  role: "admin" | "sales" | "finance" | "user";
  isActive: boolean;
  lastSignedIn?: Date;
}>
```

### 2. 创建用户

**API:** `userManagement.create`

**请求参数:**
```typescript
{
  name: string;       // 用户名(必填)
  password: string;   // 密码(必填,至少6位)
  nickname?: string;  // 花名
  email?: string;     // 邮箱
  phone?: string;     // 手机号
  role: "admin" | "sales" | "finance" | "user";  // 角色(默认user)
}
```

**返回数据:**
```typescript
{
  success: boolean;
  message: string;
}
```

### 3. 更新用户信息

**API:** `userManagement.update`

**请求参数:**
```typescript
{
  id: number;         // 用户ID(必填)
  name?: string;      // 用户名
  nickname?: string;  // 花名
  email?: string;     // 邮箱
  phone?: string;     // 手机号
  role?: "admin" | "sales" | "finance" | "user";  // 角色
}
```

### 4. 重置密码

**API:** `userManagement.resetPassword`

**请求参数:**
```typescript
{
  id: number;         // 用户ID(必填)
  newPassword: string;  // 新密码(必填,至少6位)
}
```

### 5. 启用/禁用账号

**API:** `userManagement.toggleActive`

**请求参数:**
```typescript
{
  id: number;         // 用户ID(必填)
  isActive: boolean;  // 启用状态(必填)
}
```

**返回数据:**
```typescript
{
  success: boolean;
  message: string;  // "账号已启用" 或 "账号已禁用"
}
```

### 6. 删除用户

**API:** `userManagement.delete`

**请求参数:**
```typescript
{
  id: number;  // 用户ID(必填)
}
```

---

## 🧪 测试账号

系统已创建以下测试账号供前端对接测试:

| 用户名 | 密码 | 手机号 | 邮箱 | 角色 | 说明 |
|--------|------|--------|------|------|------|
| test | 123456 | 13800138001 | test@example.com | user | 普通用户 |
| admin | admin123 | 13800138000 | admin@example.com | admin | 管理员 |

**支持的登录方式:**
- 用户名登录: `test` + `123456`
- 手机号登录: `13800138001` + `123456`
- 邮箱登录: `test@example.com` + `123456`

---

## 📝 前端使用示例

### React Native (tRPC)

```typescript
import { trpc } from './lib/trpc';

// 登录
const loginMutation = trpc.auth.loginWithUserAccount.useMutation({
  onSuccess: (data) => {
    // 保存token到本地存储
    AsyncStorage.setItem('auth_token', data.token);
    AsyncStorage.setItem('user', JSON.stringify(data.user));
    
    // 跳转到首页
    navigation.navigate('Home');
  },
  onError: (error) => {
    Alert.alert('登录失败', error.message);
  },
});

// 调用登录
const handleLogin = () => {
  loginMutation.mutate({
    username: username,  // 用户名/手机号/邮箱
    password: password,
  });
};

// 获取用户列表(管理员功能)
const { data: users } = trpc.userManagement.list.useQuery();

// 创建用户
const createUserMutation = trpc.userManagement.create.useMutation({
  onSuccess: () => {
    Alert.alert('成功', '用户创建成功');
  },
});

// 启用/禁用账号
const toggleActiveMutation = trpc.userManagement.toggleActive.useMutation({
  onSuccess: (data) => {
    Alert.alert('成功', data.message);
  },
});
```

### 普通HTTP请求

```typescript
// 登录
const response = await fetch('https://your-domain.com/api/trpc/auth.loginWithUserAccount', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'test',
    password: '123456',
  }),
});

const result = await response.json();
if (result.success) {
  // 保存token
  const token = result.token;
  const user = result.user;
}
```

---

## 🔒 权限说明

### 角色权限

| 角色 | 权限说明 |
|------|----------|
| **admin** | 管理员,拥有所有权限,包括用户管理 |
| **sales** | 销售人员,可管理自己的订单和客户 |
| **finance** | 财务人员,可查看财务报表和对账 |
| **user** | 普通用户,只读权限 |

### API权限控制

- `userManagement.*` 所有API需要**admin**角色
- 普通用户无法访问用户管理功能
- 禁用的账号无法登录

---

## 🛠️ 数据库字段

### users表新增字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| password | VARCHAR(255) | 加密后的密码(bcrypt) |
| phone | VARCHAR(20) | 手机号 |

---

## ✅ 测试验证

后端已完成以下测试:

1. ✅ 使用用户名登录
2. ✅ 使用手机号登录
3. ✅ 使用邮箱登录
4. ✅ 密码错误时抛出错误
5. ✅ 用户不存在时抛出错误
6. ✅ 禁用的账号不能登录
7. ✅ 未设置密码的账号不能登录

所有测试用例已通过,后端API可以直接使用。

---

## 📞 联系方式

如有问题请联系后端开发团队。
