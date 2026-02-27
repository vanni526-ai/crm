# 课程管理API文档

**版本**: v1.1  
**最后更新**: 2026-02-27  
**作者**: Manus AI  
**基础URL**: `https://crm.bdsm.com.cn`

---

## 概述

本文档为**瀛姬App前端开发团队**提供完整的课程管理API接口规范。所有接口基于tRPC协议实现，支持类型安全的端到端通信。课程管理模块提供课程的增删改查、状态管理、热门标记、批量导入导出等完整功能。

### 认证方式

所有需要权限的接口（标记为`protectedProcedure`）需要在请求头中携带JWT Token或Session Cookie：

```http
Authorization: Bearer <your_jwt_token>
```

或使用Session Cookie（httpOnly）：

```typescript
const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'https://crm.bdsm.com.cn/api/trpc',
      credentials: 'include',  // 携带Cookie
    }),
  ],
});
```

### 数据类型定义

```typescript
type Course = {
  id: number;                    // 课程ID
  name: string;                  // 课程名称
  alias: string | null;          // 课程别名（供App显示，优先使用）
  introduction: string | null;   // 课程介绍（限20字）
  description: string | null;    // 课程详细描述
  price: string;                 // 课程价格（decimal存储为string）
  duration: string;              // 课程时长（小时，decimal存储为string）
  level: "入门" | "深度" | "订制" | "剧本";  // 课程程度
  isActive: boolean;             // 是否启用
  isBookable: boolean;           // 是否可预约（false表示不在App显示）
  isHot: number;                 // 是否热门：0=不热门，1=热门
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
};
```

---

## 接口列表

### 1. 获取课程列表

**接口路径**: `courses.list`  
**请求方法**: `query`  
**权限要求**: 公开接口（无需认证）

#### 请求参数

无

#### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "1V1 女王深度局",
      "alias": "女王深度体验",
      "introduction": "深度体验女王权力",
      "description": "这是一场深度的女王体验课程...",
      "price": "2000.00",
      "duration": "2.00",
      "level": "深度",
      "isActive": true,
      "isBookable": true,
      "isHot": 1,
      "createdAt": "2026-01-15T10:30:00.000Z",
      "updatedAt": "2026-02-27T08:28:00.000Z"
    },
    {
      "id": 2,
      "name": "入门体验课",
      "alias": null,
      "introduction": "适合新手的入门课程",
      "description": "轻松愉快的入门体验...",
      "price": "800.00",
      "duration": "1.50",
      "level": "入门",
      "isActive": true,
      "isBookable": true,
      "isHot": 0,
      "createdAt": "2026-01-20T14:00:00.000Z",
      "updatedAt": "2026-02-20T09:15:00.000Z"
    }
  ],
  "count": 2
}
```

#### 错误响应

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "获取课程列表失败"
  }
}
```

#### React Native示例

```typescript
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

const trpc = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: 'https://crm.bdsm.com.cn/api/trpc',
      credentials: 'include',
    }),
  ],
  transformer: superjson,
});

// 获取课程列表
const result = await trpc.courses.list.query();
console.log('课程列表:', result.data);
console.log('总数:', result.count);
```

---

### 2. 获取单个课程详情

**接口路径**: `courses.getById`  
**请求方法**: `query`  
**权限要求**: 公开接口（无需认证）

#### 请求参数

```typescript
{
  id: number;  // 课程ID
}
```

#### 请求示例

```typescript
const course = await trpc.courses.getById.query({ id: 1 });
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "1V1 女王深度局",
    "alias": "女王深度体验",
    "introduction": "深度体验女王权力",
    "description": "这是一场深度的女王体验课程，包含权力交换、心理调教等多个环节...",
    "price": "2000.00",
    "duration": "2.00",
    "level": "深度",
    "isActive": true,
    "isBookable": true,
    "isHot": 1,
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-02-27T08:28:00.000Z"
  }
}
```

#### 课程不存在响应

```json
{
  "success": false,
  "message": "未找到ID为999的课程",
  "data": null
}
```

---

### 3. 创建课程

**接口路径**: `courses.create`  
**请求方法**: `mutation`  
**权限要求**: 需要认证（protectedProcedure）

#### 请求参数

```typescript
{
  name: string;              // 课程名称（必填，不能为空）
  alias?: string;            // 课程别名（可选）
  introduction?: string;     // 课程介绍（可选，最多20字）
  description?: string;      // 课程描述（可选）
  price: number;             // 课程价格（必填，不能为负数）
  duration: number;          // 课程时长（必填，小时，不能为负数）
  level: "入门" | "深度" | "订制" | "剧本";  // 课程程度（必填）
  isHot?: number;            // 是否热门（可选，0或1，默认0）
}
```

#### 请求示例

```typescript
const result = await trpc.courses.create.mutate({
  name: "新课程名称",
  alias: "课程别名",
  introduction: "简短介绍",
  description: "详细描述内容...",
  price: 1500,
  duration: 2.5,
  level: "深度",
  isHot: 1
});
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": 28
  },
  "message": "课程创建成功"
}
```

#### 错误响应

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "课程名称不能为空"
  }
}
```

---

### 4. 更新课程

**接口路径**: `courses.update`  
**请求方法**: `mutation`  
**权限要求**: 需要认证（protectedProcedure）

#### 请求参数

```typescript
{
  id: number;                // 课程ID（必填）
  name?: string;             // 课程名称（可选）
  alias?: string;            // 课程别名（可选）
  introduction?: string;     // 课程介绍（可选，最多20字）
  description?: string;      // 课程描述（可选）
  price?: number;            // 课程价格（可选）
  duration?: number;         // 课程时长（可选）
  level?: "入门" | "深度" | "订制" | "剧本";  // 课程程度（可选）
  isHot?: number;            // 是否热门（可选，0或1）
}
```

#### 请求示例

```typescript
// 更新课程名称和热门状态
const result = await trpc.courses.update.mutate({
  id: 1,
  name: "更新后的课程名称",
  isHot: 1
});

// 只更新热门状态
const result = await trpc.courses.update.mutate({
  id: 1,
  isHot: 0
});
```

#### 响应示例

```json
{
  "success": true,
  "message": "课程更新成功"
}
```

---

### 5. 切换课程启用状态

**接口路径**: `courses.toggleActive`  
**请求方法**: `mutation`  
**权限要求**: 需要认证（protectedProcedure）

#### 请求参数

```typescript
{
  id: number;  // 课程ID
}
```

#### 请求示例

```typescript
const result = await trpc.courses.toggleActive.mutate({ id: 1 });
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "isActive": false
  },
  "message": "课程已停用"
}
```

---

### 6. 删除课程

**接口路径**: `courses.delete`  
**请求方法**: `mutation`  
**权限要求**: 需要认证（protectedProcedure）

#### 请求参数

```typescript
{
  id: number;  // 课程ID
}
```

#### 请求示例

```typescript
const result = await trpc.courses.delete.mutate({ id: 1 });
```

#### 响应示例

```json
{
  "success": true,
  "message": "课程删除成功"
}
```

---

### 7. 批量导入课程

**接口路径**: `courses.importFromExcel`  
**请求方法**: `mutation`  
**权限要求**: 需要认证（protectedProcedure）

#### 请求参数

```typescript
{
  courses: Array<{
    name: string;              // 课程名称（必填）
    alias?: string;            // 课程别名（可选）
    introduction?: string;     // 课程介绍（可选，最多20字）
    description?: string;      // 课程描述（可选）
    price: number;             // 课程价格（必填）
    duration: number;          // 课程时长（必填）
    level: "入门" | "深度" | "订制" | "剧本";  // 课程程度（必填）
    isHot?: number;            // 是否热门（可选，0或1，默认0）
  }>;
}
```

#### 请求示例

```typescript
const result = await trpc.courses.importFromExcel.mutate({
  courses: [
    {
      name: "课程1",
      alias: "别名1",
      introduction: "介绍1",
      description: "描述1",
      price: 1000,
      duration: 2,
      level: "入门",
      isHot: 0
    },
    {
      name: "课程2",
      alias: "别名2",
      introduction: "介绍2",
      description: "描述2",
      price: 2000,
      duration: 3,
      level: "深度",
      isHot: 1
    }
  ]
});
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "success": 2,
    "failed": 0,
    "errors": []
  },
  "message": "导入完成: 成功 2 条, 失败 0 条"
}
```

#### 部分失败响应

```json
{
  "success": true,
  "data": {
    "success": 1,
    "failed": 1,
    "errors": [
      "课程2: 课程名称不能为空"
    ]
  },
  "message": "导入完成: 成功 1 条, 失败 1 条"
}
```

---

## 前端集成指南

### tRPC客户端配置

```typescript
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

const trpc = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: 'https://crm.bdsm.com.cn/api/trpc',
      credentials: 'include',  // 重要：携带Cookie
    }),
  ],
  transformer: superjson,  // 重要：支持Date等复杂类型
});
```

### React Native Hook 使用示例

```typescript
import { trpc } from '@/lib/trpc';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';

function CourseList() {
  // 获取课程列表
  const { data, isLoading, refetch } = trpc.courses.list.useQuery();
  const courses = data?.data || [];

  // 更新课程
  const updateMutation = trpc.courses.update.useMutation({
    onSuccess: () => {
      refetch(); // 刷新列表
    },
  });

  // 切换热门状态
  const handleToggleHot = (id: number, currentIsHot: number) => {
    const newIsHot = currentIsHot === 1 ? 0 : 1;
    updateMutation.mutate({ id, isHot: newIsHot });
  };

  if (isLoading) return <Text>加载中...</Text>;

  return (
    <FlatList
      data={courses}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item: course }) => (
        <View>
          <Text>{course.alias || course.name}</Text>
          <Text>价格: ¥{parseFloat(course.price).toFixed(2)}</Text>
          <Text>时长: {parseFloat(course.duration)}小时</Text>
          <Text>程度: {course.level}</Text>
          {course.isHot === 1 && <Text>🔥 热门</Text>}
          <TouchableOpacity onPress={() => handleToggleHot(course.id, course.isHot)}>
            <Text>{course.isHot === 1 ? '取消热门' : '设为热门'}</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}
```

---

## 业务逻辑说明

### 课程显示规则

1. **App显示条件**: 课程必须同时满足 `isActive=true` 和 `isBookable=true` 才会在前端App中显示
2. **热门标记**: `isHot=1` 的课程应在App中优先展示或添加"🔥热门"标签
3. **课程别名**: 如果设置了 `alias`，建议在App中优先显示别名，原名称可作为副标题或详情页显示

### 课程名称显示优先级

```typescript
// 推荐的显示逻辑
const displayName = course.alias || course.name;
```

### 价格和时长处理

- `price` 和 `duration` 字段在数据库中以 `decimal` 类型存储，API返回时为字符串格式
- 前端显示时需要使用 `parseFloat()` 转换为数字，并使用 `toFixed(2)` 格式化价格

```typescript
// 价格格式化
const formattedPrice = `¥${parseFloat(course.price).toFixed(2)}`;

// 时长格式化
const formattedDuration = `${parseFloat(course.duration)}小时`;
```

### 课程程度说明

| 程度 | 说明 | 适用场景 |
|------|------|----------|
| 入门 | 适合新手的基础课程 | 首次体验、了解基本概念 |
| 深度 | 进阶课程，需要一定基础 | 深入体验、技能提升 |
| 订制 | 根据客户需求定制 | 个性化需求、特殊场景 |
| 剧本 | 剧本式体验课程 | 沉浸式体验、角色扮演 |

### 热门课程排序建议

```typescript
// 推荐的排序逻辑
const sortedCourses = courses.sort((a, b) => {
  // 1. 热门课程优先
  if (a.isHot !== b.isHot) {
    return b.isHot - a.isHot;
  }
  // 2. 同为热门时，按更新时间降序
  if (a.isHot === 1 && b.isHot === 1) {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  }
  // 3. 非热门课程按创建时间降序
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
});
```

---

## 错误码说明

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| `BAD_REQUEST` | 请求参数错误 | 检查参数格式和必填项 |
| `UNAUTHORIZED` | 未认证或Token无效 | 引导用户重新登录 |
| `FORBIDDEN` | 权限不足 | 提示用户权限不足 |
| `NOT_FOUND` | 资源不存在 | 提示课程不存在或已删除 |
| `INTERNAL_SERVER_ERROR` | 服务器内部错误 | 提示用户稍后重试 |

---

## 认证说明

### 需要认证的接口

- `courses.create` - 创建课程
- `courses.update` - 更新课程
- `courses.delete` - 删除课程
- `courses.toggleActive` - 启用/停用课程
- `courses.importFromExcel` - 批量导入课程

### 公开接口（无需登录）

- `courses.list` - 获取课程列表
- `courses.getById` - 获取课程详情

### 如何认证

#### 方式1：使用传统用户名密码登录

```typescript
const loginResult = await trpc.auth.loginWithUserAccount.mutate({
  account: "admin",
  password: "admin123"
});

if (loginResult.success) {
  // 登录成功，后续请求会自动携带Cookie
  console.log('登录成功:', loginResult.user);
}
```

#### 方式2：使用OAuth登录

参考《前端登录认证API接口文档.md》

#### 验证登录状态

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
import superjson from 'superjson';
import type { AppRouter } from './path-to-server-router-types';

// 初始化tRPC客户端
const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'https://crm.bdsm.com.cn/api/trpc',
      credentials: 'include',  // 重要：携带Cookie
    }),
  ],
  transformer: superjson,
});

// 示例：课程管理完整流程
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
      alias: "RN实战课",
      description: "从零开始学习React Native移动应用开发",
      price: 499.99,
      duration: 3.0,
      level: "深度",
      isHot: 1
    });
    
    if (createResult.success) {
      const newCourseId = createResult.data.id;
      console.log('创建成功，课程ID:', newCourseId);
      
      // 4. 获取课程详情
      const detailResult = await trpc.courses.getById.query({ id: newCourseId });
      console.log('课程详情:', detailResult.data);
      
      // 5. 更新课程
      await trpc.courses.update.mutate({
        id: newCourseId,
        price: 599.99,
        isHot: 0
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

## 常见问题

### Q1: 如何判断课程是否可以预约？

**A**: 检查 `isActive` 和 `isBookable` 两个字段，两者都为 `true` 时才可以预约。

```typescript
const isBookable = course.isActive && course.isBookable;
```

### Q2: 热门课程如何排序？

**A**: 建议在前端按以下优先级排序：
1. `isHot=1` 的课程优先
2. 同为热门课程时，按 `updatedAt` 降序排列
3. 非热门课程按 `createdAt` 降序排列

### Q3: 课程别名为空时如何显示？

**A**: 使用原课程名称 `name` 字段显示，建议代码中使用 `course.alias || course.name`。

### Q4: 如何处理课程价格的小数位？

**A**: 统一使用 `parseFloat(course.price).toFixed(2)` 格式化为两位小数。

### Q5: isHot字段的值是什么类型？

**A**: `isHot` 字段是 `number` 类型，值为 `0`（不热门）或 `1`（热门）。判断时使用 `course.isHot === 1`。

### Q6: 如何批量更新课程的热门状态？

**A**: 可以循环调用 `courses.update` 接口，或者联系后端开发团队添加批量更新接口。

---

## 测试账号

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| test_admin | admin123 | admin | 管理员账号，拥有所有权限 |
| test_user | user123 | user | 普通用户账号 |

---

## 注意事项

1. **CORS配置**: 后端已配置CORS，允许前端App跨域访问
2. **Cookie携带**: 所有请求必须设置 `credentials: 'include'` 以携带认证Cookie
3. **时间格式**: 所有时间字段返回JavaScript Date对象（通过superjson自动转换）
4. **课程程度**: level字段建议使用枚举值：`入门`、`深度`、`订制`、`剧本`
5. **价格精度**: price字段为字符串格式，建议保留2位小数显示
6. **时长单位**: duration字段单位为小时，支持小数（如2.5表示2.5小时）
7. **热门标记**: isHot字段为数字类型（0或1），不是布尔值
8. **课程别名**: alias字段优先显示，为空时使用name字段
9. **批量导入**: 建议单次不超过100条记录，避免请求超时
10. **删除操作**: 删除课程为物理删除，无法恢复，请谨慎操作

---

## 相关文档

- [前端登录认证API接口文档.md](./前端登录认证API接口文档.md) - 登录认证相关API
- [API对接文档_前端APP.md](./API对接文档_前端APP.md) - 完整API对接文档
- [后端用户管理指南.md](./后端用户管理指南.md) - 用户管理相关API

---

## 更新日志

### v1.1 (2026-02-27)

- ✅ 添加 `isHot` 字段，支持热门课程标记（0=不热门，1=热门）
- ✅ 完善课程别名 `alias` 字段的使用说明和显示优先级
- ✅ 更新所有接口的请求和响应示例，包含isHot和alias字段
- ✅ 添加前端集成指南和React Native Hook使用示例
- ✅ 补充业务逻辑说明、热门课程排序建议
- ✅ 添加常见问题解答，包含isHot字段相关问题
- ✅ 更新批量导入接口，支持isHot字段

### v1.0 (2026-02-02)

- ✅ 添加课程介绍字段 `introduction`，限制20字
- ✅ 初始版本，包含完整的课程CRUD功能

---

## 联系方式

如有任何API使用问题或建议，请联系：

- **技术支持**: 通过CRM系统提交工单
- **文档维护**: Manus AI
- **最后更新**: 2026-02-27
