# 前端登录认证API接口文档

本文档提供课程交付CRM系统的完整登录认证相关API接口说明,供前端APP开发使用。

---

## 📋 目录

1. [接口基础信息](#接口基础信息)
2. [认证相关API](#认证相关api)
3. [用户管理API](#用户管理api)
4. [元数据API](#元数据api)
5. [tRPC客户端配置](#trpc客户端配置)
6. [前端使用示例](#前端使用示例)
7. [错误处理](#错误处理)
8. [测试账号](#测试账号)

---

## 接口基础信息

### API基础URL
```
https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc
```

### 技术栈
- **协议**: tRPC (TypeScript RPC)
- **传输**: HTTP POST
- **数据格式**: JSON
- **认证方式**: JWT Token (存储在Cookie或Header中)

### 数据类型定义

```typescript
// 用户角色
type UserRole = "admin" | "sales" | "finance" | "user";

// 用户信息
interface User {
  id: number;
  name: string;              // 用户名
  nickname?: string;         // 花名
  email?: string;            // 邮箱
  phone?: string;            // 手机号
  role: UserRole;            // 角色
  isActive: boolean;         // 是否启用
  openId: string;            // 唯一标识
  lastSignedIn?: Date;       // 最后登录时间
  createdAt: Date;           // 创建时间
  updatedAt: Date;           // 更新时间
}

// API响应格式
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
```

---

## 认证相关API

### 1. 用户登录 `auth.loginWithUserAccount`

使用用户名/手机号/邮箱和密码登录系统。

**请求参数**
```typescript
{
  username: string;  // 用户名/手机号/邮箱
  password: string;  // 密码
}
```

**响应数据**
```typescript
{
  success: boolean;
  message: string;
  token?: string;    // JWT Token (可选,也可能存储在Cookie中)
  user?: {
    id: number;
    name: string;
    nickname?: string;
    email?: string;
    phone?: string;
    role: UserRole;
  }
}
```

**示例**
```typescript
// 请求
const result = await trpc.auth.loginWithUserAccount.mutate({
  username: "test_admin",
  password: "admin123"
});

// 响应
{
  "success": true,
  "message": "登录成功",
  "user": {
    "id": 1,
    "name": "test_admin",
    "nickname": "测试管理员",
    "email": "admin@test.com",
    "phone": "13800138001",
    "role": "admin"
  }
}
```

**错误情况**
- 用户不存在: `{ success: false, message: "用户不存在" }`
- 密码错误: `{ success: false, message: "密码错误" }`
- 账号已禁用: `{ success: false, message: "账号已被禁用,请联系管理员" }`

---

### 2. 获取当前用户信息 `auth.me`

获取当前登录用户的详细信息。

**请求参数**
```typescript
// 无参数,通过Cookie或Header中的Token识别用户
```

**响应数据**
```typescript
{
  id: number;
  name: string;
  nickname?: string;
  email?: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  openId: string;
  lastSignedIn?: Date;
}
```

**示例**
```typescript
// 请求
const user = await trpc.auth.me.useQuery();

// 响应
{
  "id": 1,
  "name": "test_admin",
  "nickname": "测试管理员",
  "email": "admin@test.com",
  "phone": "13800138001",
  "role": "admin",
  "isActive": true,
  "openId": "test_admin_1738480000000",
  "lastSignedIn": "2026-02-02T08:00:00.000Z"
}
```

**错误情况**
- 未登录: 返回 `null` 或抛出 `UNAUTHORIZED` 错误

---

### 3. 退出登录 `auth.logout`

退出当前登录状态,清除认证信息。

**请求参数**
```typescript
// 无参数
```

**响应数据**
```typescript
{
  success: boolean;
  message: string;
}
```

**示例**
```typescript
// 请求
const result = await trpc.auth.logout.useMutation();

// 响应
{
  "success": true,
  "message": "已退出登录"
}
```

---

## 用户管理API

### 1. 获取用户列表 `userManagement.list`

获取所有用户列表(需要管理员权限)。

**请求参数**
```typescript
// 无参数
```

**响应数据**
```typescript
User[]  // 用户数组,不包含密码字段
```

**示例**
```typescript
// 请求
const users = await trpc.userManagement.list.useQuery();

// 响应
[
  {
    "id": 1,
    "name": "test_admin",
    "nickname": "测试管理员",
    "email": "admin@test.com",
    "phone": "13800138001",
    "role": "admin",
    "isActive": true,
    "openId": "test_admin_1738480000000",
    "lastSignedIn": "2026-02-02T08:00:00.000Z",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-02-02T08:00:00.000Z"
  },
  {
    "id": 2,
    "name": "test_user",
    "nickname": "测试用户",
    "email": "user@test.com",
    "phone": "13900139001",
    "role": "user",
    "isActive": true,
    "openId": "test_user_1738480000000",
    "lastSignedIn": null,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-02-02T08:00:00.000Z"
  }
]
```

**权限要求**: 需要 `admin` 角色

---

### 2. 创建用户 `userManagement.create`

创建新用户账号(需要管理员权限)。

**请求参数**
```typescript
{
  name: string;              // 用户名(必填,唯一)
  password: string;          // 密码(必填,至少6位)
  nickname?: string;         // 花名(可选)
  email?: string;            // 邮箱(可选,格式验证)
  phone?: string;            // 手机号(可选)
  role: UserRole;            // 角色(必填)
}
```

**响应数据**
```typescript
{
  success: boolean;
  message: string;
  userId?: number;           // 新创建的用户ID
}
```

**示例**
```typescript
// 请求
const result = await trpc.userManagement.create.mutate({
  name: "new_user",
  password: "password123",
  nickname: "新用户",
  email: "newuser@example.com",
  phone: "13800138888",
  role: "user"
});

// 响应
{
  "success": true,
  "message": "用户创建成功",
  "userId": 3
}
```

**错误情况**
- 用户名已存在: `{ success: false, message: "用户名已存在" }`
- 密码太短: `{ success: false, message: "密码至少6位" }`
- 邮箱格式错误: `{ success: false, message: "邮箱格式不正确" }`

**权限要求**: 需要 `admin` 角色

---

### 3. 更新用户信息 `userManagement.update`

更新用户信息(需要管理员权限)。

**请求参数**
```typescript
{
  id: number;                // 用户ID(必填)
  name?: string;             // 用户名(可选)
  nickname?: string;         // 花名(可选)
  email?: string;            // 邮箱(可选)
  phone?: string;            // 手机号(可选)
  role?: UserRole;           // 角色(可选)
}
```

**响应数据**
```typescript
{
  success: boolean;
  message: string;
}
```

**示例**
```typescript
// 请求
const result = await trpc.userManagement.update.mutate({
  id: 2,
  nickname: "更新后的昵称",
  email: "updated@example.com",
  role: "sales"
});

// 响应
{
  "success": true,
  "message": "用户更新成功"
}
```

**错误情况**
- 用户不存在: `{ success: false, message: "用户不存在" }`

**权限要求**: 需要 `admin` 角色

---

### 4. 重置用户密码 `userManagement.resetPassword`

重置指定用户的密码(需要管理员权限)。

**请求参数**
```typescript
{
  id: number;                // 用户ID(必填)
  newPassword: string;       // 新密码(必填,至少6位)
}
```

**响应数据**
```typescript
{
  success: boolean;
  message: string;
}
```

**示例**
```typescript
// 请求
const result = await trpc.userManagement.resetPassword.mutate({
  id: 2,
  newPassword: "newpassword123"
});

// 响应
{
  "success": true,
  "message": "密码重置成功"
}
```

**错误情况**
- 用户不存在: `{ success: false, message: "用户不存在" }`
- 密码太短: `{ success: false, message: "密码至少6位" }`

**权限要求**: 需要 `admin` 角色

---

### 5. 启用/禁用用户 `userManagement.toggleActive`

启用或禁用用户账号(需要管理员权限)。

**请求参数**
```typescript
{
  id: number;                // 用户ID(必填)
  isActive: boolean;         // 是否启用(必填)
}
```

**响应数据**
```typescript
{
  success: boolean;
  message: string;
}
```

**示例**
```typescript
// 请求 - 禁用用户
const result = await trpc.userManagement.toggleActive.mutate({
  id: 2,
  isActive: false
});

// 响应
{
  "success": true,
  "message": "账号已禁用"
}

// 请求 - 启用用户
const result2 = await trpc.userManagement.toggleActive.mutate({
  id: 2,
  isActive: true
});

// 响应
{
  "success": true,
  "message": "账号已启用"
}
```

**权限要求**: 需要 `admin` 角色

---

### 6. 删除用户 `userManagement.delete`

删除指定用户(需要管理员权限)。

**请求参数**
```typescript
{
  id: number;                // 用户ID(必填)
}
```

**响应数据**
```typescript
{
  success: boolean;
  message: string;
}
```

**示例**
```typescript
// 请求
const result = await trpc.userManagement.delete.mutate({
  id: 2
});

// 响应
{
  "success": true,
  "message": "用户删除成功"
}
```

**错误情况**
- 用户不存在: `{ success: false, message: "用户不存在" }`

**权限要求**: 需要 `admin` 角色

**注意**: 实际使用中建议使用"禁用"功能而不是删除,以保留历史数据。

---

## 元数据API

这些API用于获取系统中的基础数据列表,供前端下拉选择等场景使用。

### 1. 获取所有元数据 `metadata.getAll`

一次性获取所有元数据(推荐使用,减少请求次数)。

**请求参数**
```typescript
// 无参数
```

**响应数据**
```typescript
{
  cities: string[];           // 城市列表
  courses: string[];          // 课程列表
  classrooms: string[];       // 教室列表
  teacherNames: string[];     // 老师名称列表
  teacherCategories: string[]; // 老师分类列表(S/M/SW等)
  courseAmounts: number[];    // 课程价格列表
  salespeople: Array<{        // 销售人员列表
    id: number;
    name: string;
    nickname?: string;
  }>;
}
```

**示例**
```typescript
// 请求
const metadata = await trpc.metadata.getAll.useQuery();

// 响应
{
  "cities": ["上海", "北京", "杭州", "深圳", "武汉"],
  "courses": ["基础课", "进阶课", "理论课", "面销"],
  "classrooms": ["上海1101", "北京2201", "杭州3301"],
  "teacherNames": ["安雅", "淼淼", "YY", "晚晚", "璐璐"],
  "teacherCategories": ["S", "M", "SW"],
  "courseAmounts": [0, 1200, 1888, 2000, 2400, 2800, 3500],
  "salespeople": [
    { "id": 1, "name": "ivy", "nickname": "瀛姬依依" },
    { "id": 2, "name": "jojo", "nickname": "瀛姬九淑" }
  ]
}
```

---

### 2. 获取城市列表 `metadata.getCities`

获取所有唯一的城市列表。

**响应数据**: `string[]`

**示例**
```typescript
const cities = await trpc.metadata.getCities.useQuery();
// ["上海", "北京", "杭州", "深圳", "武汉"]
```

---

### 3. 获取课程列表 `metadata.getCourses`

获取所有唯一的课程类型列表。

**响应数据**: `string[]`

**示例**
```typescript
const courses = await trpc.metadata.getCourses.useQuery();
// ["基础课", "进阶课", "理论课", "面销"]
```

---

### 4. 获取教室列表 `metadata.getClassrooms`

获取所有唯一的教室/地点列表。

**响应数据**: `string[]`

**示例**
```typescript
const classrooms = await trpc.metadata.getClassrooms.useQuery();
// ["上海1101", "北京2201", "杭州3301"]
```

---

### 5. 获取老师名称列表 `metadata.getTeacherNames`

获取所有唯一的老师名称列表。

**响应数据**: `string[]`

**示例**
```typescript
const teachers = await trpc.metadata.getTeacherNames.useQuery();
// ["安雅", "淼淼", "YY", "晚晚", "璐璐"]
```

---

### 6. 获取老师分类列表 `metadata.getTeacherCategories`

获取所有唯一的老师分类(S/M/SW等)。

**响应数据**: `string[]`

**示例**
```typescript
const categories = await trpc.metadata.getTeacherCategories.useQuery();
// ["S", "M", "SW"]
```

---

### 7. 获取课程价格列表 `metadata.getCourseAmounts`

获取所有唯一的课程金额,按数值排序。

**响应数据**: `number[]`

**示例**
```typescript
const amounts = await trpc.metadata.getCourseAmounts.useQuery();
// [0, 1200, 1888, 2000, 2400, 2800, 3500]
```

---

### 8. 获取销售人员列表 `metadata.getSalespeople`

获取所有销售人员信息。

**响应数据**
```typescript
Array<{
  id: number;
  name: string;
  nickname?: string;
}>
```

**示例**
```typescript
const salespeople = await trpc.metadata.getSalespeople.useQuery();
// [
//   { "id": 1, "name": "ivy", "nickname": "瀛姬依依" },
//   { "id": 2, "name": "jojo", "nickname": "瀛姬九淑" }
// ]
```

---

## tRPC客户端配置

### React Native配置

```typescript
// trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from './path-to-server-router-types';

export const trpc = createTRPCReact<AppRouter>();

// 在App.tsx中配置
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: 'https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc',
          // 可选: 添加认证头
          headers() {
            return {
              authorization: `Bearer ${getToken()}`,
            };
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {/* Your app components */}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

---

## 前端使用示例

### 1. 登录流程

```typescript
import { useState } from 'react';
import { trpc } from './trpc';

function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const loginMutation = trpc.auth.loginWithUserAccount.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        // 保存用户信息到本地存储
        AsyncStorage.setItem('user', JSON.stringify(data.user));
        // 跳转到主页
        navigation.navigate('Home');
      } else {
        Alert.alert('登录失败', data.message);
      }
    },
    onError: (error) => {
      Alert.alert('登录失败', error.message);
    },
  });

  const handleLogin = () => {
    loginMutation.mutate({ username, password });
  };

  return (
    <View>
      <TextInput
        placeholder="用户名/手机号/邮箱"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        placeholder="密码"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button
        title={loginMutation.isPending ? "登录中..." : "登录"}
        onPress={handleLogin}
        disabled={loginMutation.isPending}
      />
    </View>
  );
}
```

---

### 2. 获取当前用户信息

```typescript
function ProfileScreen() {
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  if (isLoading) {
    return <ActivityIndicator />;
  }

  if (!user) {
    // 未登录,跳转到登录页
    navigation.navigate('Login');
    return null;
  }

  return (
    <View>
      <Text>用户名: {user.name}</Text>
      <Text>花名: {user.nickname}</Text>
      <Text>邮箱: {user.email}</Text>
      <Text>手机号: {user.phone}</Text>
      <Text>角色: {user.role}</Text>
    </View>
  );
}
```

---

### 3. 用户管理(管理员功能)

```typescript
function UserManagementScreen() {
  const { data: users, isLoading, refetch } = trpc.userManagement.list.useQuery();
  
  const toggleActiveMutation = trpc.userManagement.toggleActive.useMutation({
    onSuccess: () => {
      refetch(); // 刷新列表
    },
  });

  const handleToggleActive = (userId: number, isActive: boolean) => {
    toggleActiveMutation.mutate({ id: userId, isActive });
  };

  if (isLoading) {
    return <ActivityIndicator />;
  }

  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <View>
          <Text>{item.name} - {item.nickname}</Text>
          <Switch
            value={item.isActive}
            onValueChange={(value) => handleToggleActive(item.id, value)}
          />
        </View>
      )}
    />
  );
}
```

---

### 4. 获取元数据

```typescript
function OrderCreateScreen() {
  // 一次性获取所有元数据(推荐)
  const { data: metadata } = trpc.metadata.getAll.useQuery();

  return (
    <View>
      <Picker
        selectedValue={selectedCity}
        onValueChange={(value) => setSelectedCity(value)}
      >
        {metadata?.cities.map((city) => (
          <Picker.Item key={city} label={city} value={city} />
        ))}
      </Picker>

      <Picker
        selectedValue={selectedCourse}
        onValueChange={(value) => setSelectedCourse(value)}
      >
        {metadata?.courses.map((course) => (
          <Picker.Item key={course} label={course} value={course} />
        ))}
      </Picker>

      <Picker
        selectedValue={selectedAmount}
        onValueChange={(value) => setSelectedAmount(value)}
      >
        {metadata?.courseAmounts.map((amount) => (
          <Picker.Item key={amount} label={`¥${amount}`} value={amount} />
        ))}
      </Picker>
    </View>
  );
}
```

---

### 5. 修改密码

```typescript
function ChangePasswordScreen({ userId }: { userId: number }) {
  const [newPassword, setNewPassword] = useState('');
  
  const resetPasswordMutation = trpc.userManagement.resetPassword.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        Alert.alert('成功', '密码修改成功');
        navigation.goBack();
      }
    },
    onError: (error) => {
      Alert.alert('失败', error.message);
    },
  });

  const handleSubmit = () => {
    if (newPassword.length < 6) {
      Alert.alert('错误', '密码至少6位');
      return;
    }
    resetPasswordMutation.mutate({ id: userId, newPassword });
  };

  return (
    <View>
      <TextInput
        placeholder="新密码(至少6位)"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />
      <Button
        title={resetPasswordMutation.isPending ? "提交中..." : "修改密码"}
        onPress={handleSubmit}
        disabled={resetPasswordMutation.isPending}
      />
    </View>
  );
}
```

---

## 错误处理

### tRPC错误类型

```typescript
import { TRPCClientError } from '@trpc/client';

try {
  await trpc.auth.loginWithUserAccount.mutate({ username, password });
} catch (error) {
  if (error instanceof TRPCClientError) {
    // tRPC错误
    switch (error.data?.code) {
      case 'UNAUTHORIZED':
        Alert.alert('未授权', '请先登录');
        break;
      case 'FORBIDDEN':
        Alert.alert('权限不足', '您没有权限执行此操作');
        break;
      case 'NOT_FOUND':
        Alert.alert('未找到', '用户不存在');
        break;
      case 'BAD_REQUEST':
        Alert.alert('请求错误', error.message);
        break;
      default:
        Alert.alert('错误', error.message);
    }
  } else {
    // 网络错误或其他错误
    Alert.alert('网络错误', '请检查网络连接');
  }
}
```

### 全局错误处理

```typescript
// 在tRPC客户端配置中添加
trpc.createClient({
  links: [
    httpBatchLink({
      url: 'https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc',
      // 全局错误处理
      fetch(url, options) {
        return fetch(url, options).catch((error) => {
          // 网络错误处理
          console.error('Network error:', error);
          throw new Error('网络连接失败,请检查网络设置');
        });
      },
    }),
  ],
});
```

---

## 测试账号

系统已创建以下测试账号供开发使用:

### 管理员账号
- **用户名**: `test_admin`
- **密码**: `admin123`
- **手机号**: `13800138001`
- **邮箱**: `admin@test.com`
- **角色**: 管理员 (admin)
- **权限**: 所有系统权限

### 普通用户账号
- **用户名**: `test_user`
- **密码**: `user123`
- **手机号**: `13900139001`
- **邮箱**: `user@test.com`
- **角色**: 普通用户 (user)
- **权限**: 基本访问权限

---

## 附录

### 角色权限说明

| 角色 | 权限说明 |
|------|---------|
| **admin** (管理员) | 拥有所有系统权限,包括用户管理、数据导入、财务管理等 |
| **sales** (销售) | 可以查看和管理自己的销售记录,注册新订单 |
| **finance** (财务) | 可以查看所有订单,进行财务对账和报表导出 |
| **user** (普通用户) | 基本查看权限,无法修改数据 |

### API调用频率限制

目前系统暂无API调用频率限制,但建议:
- 合理使用缓存,避免重复请求相同数据
- 使用`metadata.getAll`一次性获取所有元数据,而不是多次调用单个API
- 使用tRPC的`useQuery`自动缓存功能

### 数据更新策略

- **实时数据**: 用户信息、订单状态等需要实时获取
- **静态数据**: 城市列表、课程列表等可以缓存较长时间(建议1小时)
- **元数据**: 建议在APP启动时获取一次,存储在本地,定期更新

---

## 技术支持

如有问题,请联系:
- 项目地址: https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer
- API文档更新日期: 2026-02-02

---

**文档版本**: v1.0  
**最后更新**: 2026-02-02
