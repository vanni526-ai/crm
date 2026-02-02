# 课程管理API文档

## 概述

课程管理模块提供完整的课程CRUD功能,支持课程的创建、查询、更新、删除和启用/停用操作。

**基础URL**: `https://3000-i5pob32lur63e8ezns4ea-466ba960.manus-asia.computer/api/trpc`

**认证方式**: Session Cookie (httpOnly)

---

## API接口列表

### 1. 获取课程列表

**接口**: `courses.list`

**方法**: `GET`

**权限**: 公开访问(无需登录)

**请求参数**: 无

**返回数据**:
```typescript
{
  success: boolean;
  data: Array<{
    id: number;
    name: string;
    introduction: string | null;  // 课程介绍(限制20字)
    description: string | null;
    price: number | null;
    duration: number | null;  // 课程时长(小时)
    level: string | null;     // 课程程度: 入门/深度/订制/剧本
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  count: number;
}
```

**示例请求**:
```typescript
// React Native示例
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './path-to-server-router-types';

const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'https://3000-i5pob32lur63e8ezns4ea-466ba960.manus-asia.computer/api/trpc',
      credentials: 'include',
    }),
  ],
});

// 获取课程列表
const result = await trpc.courses.list.query();
console.log('课程列表:', result.data);
console.log('总数:', result.count);
```

---

### 2. 获取单个课程详情

**接口**: `courses.getById`

**方法**: `GET`

**权限**: 公开访问(无需登录)

**请求参数**:
```typescript
{
  id: number;  // 课程ID
}
```

**返回数据**:
```typescript
{
  success: boolean;
  data: {
    id: number;
    name: string;
    introduction: string | null;  // 课程介绍(限制20字)
    description: string | null;
    price: number | null;
    duration: number | null;
    level: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  message?: string;  // 错误时返回
}
```

**示例请求**:
```typescript
// 获取ID为1的课程详情
const result = await trpc.courses.getById.query({ id: 1 });

if (result.success) {
  console.log('课程详情:', result.data);
} else {
  console.error('错误:', result.message);
}
```

---

### 3. 创建课程

**接口**: `courses.create`

**方法**: `POST`

**权限**: 需要登录(admin或有权限的用户)

**请求参数**:
```typescript
{
  name: string;              // 必填,课程名称
  introduction?: string;     // 可选,课程介绍(不超过20字)
  description?: string;      // 可选,课程描述
  price?: number;            // 可选,课程价格
  duration?: number;         // 可选,课程时长(小时)
  level?: string;            // 可选,课程程度(入门/深度/订制/剧本)
}
```

**返回数据**:
```typescript
{
  success: boolean;
  data: {
    id: number;              // 新创建的课程ID
    name: string;
    introduction: string | null;  // 课程介绍(限制20字)
    description: string | null;
    price: number | null;
    duration: number | null;
    level: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  message: string;
}
```

**示例请求**:
```typescript
// 创建新课程
const result = await trpc.courses.create.mutate({
  name: "Python入门课程",
  description: "适合零基础学员的Python编程入门课程",
  price: 299.99,
  duration: 2.5,
  level: "入门"
});

if (result.success) {
  console.log('创建成功,课程ID:', result.data.id);
} else {
  console.error('创建失败:', result.message);
}
```

---

### 4. 更新课程

**接口**: `courses.update`

**方法**: `POST`

**权限**: 需要登录(admin或有权限的用户)

**请求参数**:
```typescript
{
  id: number;                // 必填,课程ID
  name?: string;             // 可选,课程名称
  introduction?: string;     // 可选,课程介绍(不超过20字)
  description?: string;      // 可选,课程描述
  price?: number;            // 可选,课程价格
  duration?: number;         // 可选,课程时长
  level?: string;            // 可选,课程程度
}
```

**返回数据**:
```typescript
{
  success: boolean;
  message: string;
}
```

**示例请求**:
```typescript
// 更新课程信息
const result = await trpc.courses.update.mutate({
  id: 1,
  name: "Python进阶课程",
  price: 399.99
});

if (result.success) {
  console.log('更新成功');
} else {
  console.error('更新失败:', result.message);
}
```

---

### 5. 删除课程

**接口**: `courses.delete`

**方法**: `POST`

**权限**: 需要登录(admin或有权限的用户)

**请求参数**:
```typescript
{
  id: number;  // 课程ID
}
```

**返回数据**:
```typescript
{
  success: boolean;
  message: string;
}
```

**示例请求**:
```typescript
// 删除课程
const result = await trpc.courses.delete.mutate({ id: 1 });

if (result.success) {
  console.log('删除成功');
} else {
  console.error('删除失败:', result.message);
}
```

---

### 6. 启用/停用课程

**接口**: `courses.toggleActive`

**方法**: `POST`

**权限**: 需要登录(admin或有权限的用户)

**请求参数**:
```typescript
{
  id: number;  // 课程ID
}
```

**返回数据**:
```typescript
{
  success: boolean;
  data: {
    isActive: boolean;  // 切换后的状态
  };
  message: string;
}
```

**示例请求**:
```typescript
// 切换课程启用状态
const result = await trpc.courses.toggleActive.mutate({ id: 1 });

if (result.success) {
  console.log('当前状态:', result.data.isActive ? '启用' : '停用');
} else {
  console.error('操作失败:', result.message);
}
```

---

## 数据库表结构

**表名**: `courses`

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | INTEGER | 课程ID | PRIMARY KEY, AUTO_INCREMENT |
| name | TEXT | 课程名称 | NOT NULL |
| introduction | VARCHAR(20) | 课程介绍 | 可选,最多20字 |
| description | TEXT | 课程描述 | 可选 |
| price | REAL | 课程价格 | 可选 |
| duration | REAL | 课程时长(小时) | 可选 |
| level | TEXT | 课程程度 | 可选,枚举值:入门/深度/订制/剧本 |
| isActive | INTEGER | 启用状态 | NOT NULL, DEFAULT 1 (布尔值) |
| createdAt | INTEGER | 创建时间 | NOT NULL, UNIX时间戳(毫秒) |
| updatedAt | INTEGER | 更新时间 | NOT NULL, UNIX时间戳(毫秒) |

---

## 错误处理

所有API接口在发生错误时都会返回:
```typescript
{
  success: false;
  message: string;  // 错误描述
}
```

**常见错误**:
- `未找到课程` - 课程ID不存在
- `课程名称不能为空` - 创建/更新时未提供课程名称
- `UNAUTHORIZED` - 需要登录但未登录
- `FORBIDDEN` - 权限不足

---

## 认证说明

### 需要认证的接口
- `courses.create` - 创建课程
- `courses.update` - 更新课程
- `courses.delete` - 删除课程
- `courses.toggleActive` - 启用/停用课程

### 公开接口(无需登录)
- `courses.list` - 获取课程列表
- `courses.getById` - 获取课程详情

### 如何认证

1. **使用传统用户名密码登录**:
```typescript
const loginResult = await trpc.auth.loginWithUserAccount.mutate({
  account: "admin",
  password: "admin123"
});

if (loginResult.success) {
  // 登录成功,后续请求会自动携带Cookie
  console.log('登录成功:', loginResult.user);
}
```

2. **使用OAuth登录**:
参考《前端登录认证API接口文档.md》

3. **验证登录状态**:
```typescript
const meResult = await trpc.auth.me.query();
if (meResult.user) {
  console.log('当前用户:', meResult.user);
} else {
  console.log('未登录');
}
```

---

## React Native完整示例

```typescript
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './path-to-server-router-types';

// 初始化tRPC客户端
const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'https://3000-i5pob32lur63e8ezns4ea-466ba960.manus-asia.computer/api/trpc',
      credentials: 'include',  // 重要:携带Cookie
    }),
  ],
});

// 示例:课程管理完整流程
async function courseManagementExample() {
  try {
    // 1. 登录
    const loginResult = await trpc.auth.loginWithUserAccount.mutate({
      account: "admin",
      password: "admin123"
    });
    
    if (!loginResult.success) {
      console.error('登录失败');
      return;
    }
    
    // 2. 获取课程列表
    const listResult = await trpc.courses.list.query();
    console.log('课程列表:', listResult.data);
    
    // 3. 创建新课程
    const createResult = await trpc.courses.create.mutate({
      name: "React Native开发实战",
      description: "从零开始学习React Native移动应用开发",
      price: 499.99,
      duration: 3.0,
      level: "深度"
    });
    
    if (createResult.success) {
      const newCourseId = createResult.data.id;
      console.log('创建成功,课程ID:', newCourseId);
      
      // 4. 获取课程详情
      const detailResult = await trpc.courses.getById.query({ id: newCourseId });
      console.log('课程详情:', detailResult.data);
      
      // 5. 更新课程
      await trpc.courses.update.mutate({
        id: newCourseId,
        price: 599.99
      });
      
      // 6. 切换启用状态
      const toggleResult = await trpc.courses.toggleActive.mutate({ id: newCourseId });
      console.log('当前状态:', toggleResult.data.isActive ? '启用' : '停用');
      
      // 7. 删除课程
      await trpc.courses.delete.mutate({ id: newCourseId });
      console.log('删除成功');
    }
    
  } catch (error) {
    console.error('操作失败:', error);
  }
}
```

---

## 测试账号

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| test_admin | admin123 | admin | 管理员账号,拥有所有权限 |
| test_user | user123 | user | 普通用户账号 |

---

## 注意事项

1. **CORS配置**: 后端已配置CORS,允许前端APP跨域访问
2. **Cookie携带**: 所有请求必须设置`credentials: 'include'`以携带认证Cookie
3. **时间格式**: 所有时间字段返回JavaScript Date对象(通过superjson自动转换)
4. **课程程度**: level字段建议使用枚举值:`入门`、`深度`、`订制`、`剧本`
5. **价格精度**: price字段为浮点数,建议保留2位小数
6. **时长单位**: duration字段单位为小时,支持小数(如2.5表示2.5小时)

---

## 相关文档

- [前端登录认证API接口文档.md](./前端登录认证API接口文档.md) - 登录认证相关API
- [API对接文档_前端APP.md](./API对接文档_前端APP.md) - 完整API对接文档
- [后端用户管理指南.md](./后端用户管理指南.md) - 用户管理相关API

---

## 更新日志

- **2026-02-02**: 添加课程介绍字段(introduction),限制20字
- **2025-01-28**: 初始版本,包含完整的课程CRUD功能
