# 课程交付CRM系统 - 前端API SDK完整使用指南

**版本**: 1.1.0  
**更新日期**: 2026-02-05  
**作者**: Manus AI

---

## 概述

本文档提供课程交付CRM系统前端API SDK的完整使用指南,包括SDK集成、认证流程、API接口调用、Token自动刷新等功能。SDK设计目标是**一次性、永久性解决**前端App开发中常见的跨域、代理、端口、接口地址、权限、CORS、缓存和Token认证问题。

---

## 目录

1. [快速开始](#快速开始)
2. [SDK安装与配置](#sdk安装与配置)
3. [认证流程](#认证流程)
4. [Token管理](#token管理)
5. [API接口清单](#api接口清单)
6. [错误处理](#错误处理)
7. [最佳实践](#最佳实践)
8. [常见问题](#常见问题)

---

## 快速开始

### 1. 复制SDK文件

将`api-client.ts`文件复制到您的React Native项目的`src/sdk/`目录下。

### 2. 安装依赖

```bash
# React Native项目
npm install @react-native-async-storage/async-storage

# Web项目(无需额外依赖,使用localStorage)
```

### 3. 创建API实例

```typescript
import { createApiClient } from './sdk/api-client';

// 创建API客户端实例
const api = createApiClient({
  autoDetect: true,  // 自动检测环境
  debug: __DEV__,    // 开发模式启用调试日志
});

export default api;
```

### 4. 登录并调用API

```typescript
import api from './api';

// 登录
const loginResult = await api.auth.login({
  username: 'test',
  password: '123456',
});

if (loginResult.success) {
  console.log('登录成功:', loginResult.user);
  
  // 调用API(Token自动携带)
  const orders = await api.orders.myOrders();
  console.log('我的订单:', orders);
}
```

---

## SDK安装与配置

### 配置选项

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `autoDetect` | boolean | true | 是否自动检测环境并选择API地址 |
| `baseUrl` | string | - | 手动指定API基础地址(优先级高于自动检测) |
| `tokenStorage` | string | 'asyncStorage' | Token存储方式: asyncStorage/localStorage/memory |
| `timeout` | number | 30000 | 请求超时时间(毫秒) |
| `retryCount` | number | 3 | 失败自动重试次数 |
| `debug` | boolean | false | 是否启用调试日志 |

### 环境自动检测

SDK会自动检测运行环境并选择正确的API地址:

| 环境 | 检测方式 | API地址 |
|------|---------|---------|
| 本地开发(Web) | `localhost` | `http://localhost:3000` |
| React Native | `navigator.product === 'ReactNative'` | 配置的生产地址 |
| Manus沙箱 | URL包含`manus.computer` | 当前页面origin |
| 生产环境 | 其他情况 | 配置的生产地址 |

### React Native配置示例

```typescript
// src/sdk/api.ts
import { createApiClient } from './api-client';

const api = createApiClient({
  autoDetect: true,
  tokenStorage: 'asyncStorage',  // 使用AsyncStorage存储Token
  timeout: 30000,
  retryCount: 3,
  debug: __DEV__,
});

export default api;
```

### Web项目配置示例

```typescript
// src/sdk/api.ts
import { createApiClient } from './api-client';

const api = createApiClient({
  autoDetect: true,
  tokenStorage: 'localStorage',  // 使用localStorage存储Token
  debug: process.env.NODE_ENV === 'development',
});

export default api;
```

---

## 认证流程

### 登录

```typescript
const result = await api.auth.login({
  username: 'test',      // 用户名/手机号/邮箱
  password: '123456',    // 密码
});

if (result.success) {
  // 登录成功,Token已自动保存
  console.log('用户信息:', result.user);
  // result.user = { id, openId, name, role }
} else {
  // 登录失败
  console.error('登录失败:', result.error);
}
```

### 检查登录状态

```typescript
const isLoggedIn = await api.auth.isLoggedIn();

if (isLoggedIn) {
  // 已登录,可以调用需要认证的API
} else {
  // 未登录,跳转到登录页
  navigation.navigate('Login');
}
```

### 获取当前用户信息

```typescript
const user = await api.auth.me();

if (user) {
  console.log('当前用户:', user.name);
  console.log('用户角色:', user.role);
}
```

### 登出

```typescript
await api.auth.logout();
// Token已清除,用户已登出
```

---

## Token管理

### Token自动刷新

SDK提供Token自动刷新功能,确保用户不会因Token过期而被迫重新登录。

#### 检查Token是否即将过期

```typescript
const isExpiring = await api.auth.isTokenExpiringSoon();
// 返回true表示Token将在1小时内过期
```

#### 手动刷新Token

```typescript
const result = await api.auth.refreshToken();

if (result.success) {
  console.log('Token刷新成功');
  console.log('新Token有效期:', result.expiresIn, '秒');
} else {
  // Token刷新失败,需要重新登录
  navigation.navigate('Login');
}
```

#### 自动刷新Token(推荐)

```typescript
// 在App启动时调用
await api.auth.autoRefreshIfNeeded();

// 或在每次API调用前调用
async function callApi() {
  await api.auth.autoRefreshIfNeeded();
  const orders = await api.orders.myOrders();
  return orders;
}
```

### Token刷新规则

| 规则 | 说明 |
|------|------|
| Token有效期 | 24小时 |
| 刷新窗口 | Token过期后7天内可刷新 |
| 自动刷新阈值 | Token剩余有效期小于1小时时触发自动刷新 |
| 刷新失败处理 | 需要用户重新登录 |

### 获取Token过期时间

```typescript
const expiry = await api.auth.getTokenExpiry();

if (expiry) {
  const expiryDate = new Date(expiry);
  console.log('Token过期时间:', expiryDate.toLocaleString());
}
```

---

## API接口清单

### 接口概览

| 模块 | 接口 | 说明 | 需要登录 |
|------|------|------|----------|
| auth | login | 用户登录 | 否 |
| auth | isLoggedIn | 检查登录状态 | 否 |
| auth | me | 获取当前用户信息 | 是 |
| auth | logout | 登出 | 是 |
| auth | refreshToken | 刷新Token | 是 |
| orders | userCreate | 创建订单 | 是 |
| orders | myOrders | 获取我的订单 | 是 |
| orders | getById | 获取订单详情 | 是 |
| courses | list | 获取课程列表 | 否 |
| courses | getById | 获取课程详情 | 否 |
| teachers | list | 获取老师列表 | 否 |
| teachers | getById | 获取老师详情 | 否 |
| cities | list | 获取城市列表 | 否 |
| cities | getPartnerConfigs | 获取城市合伙人配置 | 否 |
| classrooms | list | 获取教室列表 | 否 |
| classrooms | getByCityId | 按城市ID获取教室 | 否 |
| classrooms | getByCityName | 按城市名获取教室 | 否 |
| metadata | getAll | 获取所有元数据 | 否 |
| metadata | getCities | 获取城市列表 | 否 |

### 认证接口 (auth)

| 接口 | 方法 | 说明 | 参数 |
|------|------|------|------|
| `api.auth.login(input)` | POST | 用户名密码登录 | `{ username, password }` |
| `api.auth.isLoggedIn()` | GET | 检查登录状态 | - |
| `api.auth.me()` | GET | 获取当前用户信息 | - |
| `api.auth.logout()` | POST | 登出 | - |
| `api.auth.refreshToken()` | POST | 刷新Token | - |
| `api.auth.isTokenExpiringSoon()` | - | 检查Token是否即将过期 | - |
| `api.auth.autoRefreshIfNeeded()` | - | 自动刷新Token(如需要) | - |
| `api.auth.getTokenExpiry()` | - | 获取Token过期时间戳 | - |

### 订单接口 (orders)

| 接口 | 方法 | 说明 | 参数 |
|------|------|------|------|
| `api.orders.userCreate(input)` | POST | 用户创建订单 | 见下表 |
| `api.orders.myOrders(params)` | GET | 查询我的订单 | `{ status?, limit?, offset? }` |
| `api.orders.getById(id)` | GET | 获取订单详情 | `id: number` |

#### 创建订单参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `customerName` | string | 是 | 客户姓名 |
| `paymentAmount` | string | 是 | 支付金额 |
| `courseAmount` | string | 否 | 课程金额 |
| `deliveryCity` | string | 否 | 交付城市 |
| `deliveryCourse` | string | 否 | 交付课程 |
| `teacherName` | string | 否 | 老师姓名 |
| `teacherFee` | string | 否 | 老师费用 |
| `carFee` | string | 否 | 车费 |
| `classDate` | string | 否 | 上课日期 |
| `classTime` | string | 否 | 上课时间 |
| `notes` | string | 否 | 备注 |

#### 查询订单参数

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `status` | string | 'all' | 订单状态: all/pending/paid/completed/cancelled/refunded |
| `limit` | number | 20 | 每页数量 |
| `offset` | number | 0 | 偏移量 |

### 课程接口 (courses)

| 接口 | 方法 | 说明 | 参数 |
|------|------|------|------|
| `api.courses.list()` | GET | 获取课程列表 | - |
| `api.courses.getById(id)` | GET | 获取课程详情 | `id: number` |

```typescript
// 获取课程列表
const coursesResult = await api.courses.list();
if (coursesResult.success) {
  console.log('课程列表:', coursesResult.data);
}

// 获取课程详情
const courseDetail = await api.courses.getById(1);
```

### 老师接口 (teachers)

| 接口 | 方法 | 说明 | 参数 |
|------|------|------|------|
| `api.teachers.list()` | GET | 获取老师列表 | - |
| `api.teachers.getById(id)` | GET | 获取老师详情 | `id: number` |

```typescript
// 获取老师列表
const teachers = await api.teachers.list();
console.log('老师列表:', teachers);

// 获取老师详情
const teacher = await api.teachers.getById(1);
```

### 城市接口 (cities)

| 接口 | 方法 | 说明 | 参数 |
|------|------|------|------|
| `api.cities.list()` | GET | 获取城市列表 | - |
| `api.cities.getPartnerConfigs()` | GET | 获取城市合伙人配置 | - |
| `api.cities.getPartnerConfigByCity(city)` | GET | 按城市名获取配置 | `city: string` |

```typescript
// 获取城市列表
const citiesResult = await api.cities.list();
if (citiesResult.success) {
  console.log('城市列表:', citiesResult.data); // ['北京', '上海', ...]
}

// 获取城市合伙人配置
const configsResult = await api.cities.getPartnerConfigs();
if (configsResult.success) {
  configsResult.data.forEach(config => {
    console.log(`${config.city}: 合伙人费率 ${config.partnerFeeRate}`);
  });
}
```

### 教室接口 (classrooms)

| 接口 | 方法 | 说明 | 参数 |
|------|------|------|------|
| `api.classrooms.list()` | GET | 获取所有教室列表 | - |
| `api.classrooms.getByCityId(cityId)` | GET | 按城市ID获取教室 | `cityId: number` |
| `api.classrooms.getByCityName(cityName)` | GET | 按城市名获取教室 | `cityName: string` |

```typescript
// 获取所有教室
const allClassrooms = await api.classrooms.list();

// 按城市名获取教室
const shanghaiClassrooms = await api.classrooms.getByCityName('上海');
```

### 元数据接口 (metadata)

| 接口 | 方法 | 说明 | 参数 |
|------|------|------|------|
| `api.metadata.getAll()` | GET | 获取所有元数据 | - |
| `api.metadata.getCities()` | GET | 获取城市列表 | - |

```typescript
// 获取所有元数据(推荐在App启动时调用一次)
const metadataResult = await api.metadata.getAll();
if (metadataResult.success) {
  const { cities, courses, classrooms, teacherNames, salespeople } = metadataResult.data;
  console.log('城市:', cities);
  console.log('课程:', courses);
  console.log('教室:', classrooms);
  console.log('老师:', teacherNames);
}
```

---

## 错误处理

### 错误类型

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| `UNAUTHORIZED` | 未授权(Token无效或过期) | 跳转登录页 |
| `FORBIDDEN` | 权限不足 | 提示用户无权限 |
| `NOT_FOUND` | 资源不存在 | 提示资源不存在 |
| `NETWORK_ERROR` | 网络错误 | 提示检查网络连接 |
| `SERVER_ERROR` | 服务器错误 | 提示稍后重试 |
| `UNKNOWN` | 未知错误 | 显示错误信息 |

### 错误处理示例

```typescript
import { ApiError } from './sdk/api-client';

try {
  const orders = await api.orders.myOrders();
} catch (error) {
  const apiError = error as ApiError;
  
  switch (apiError.code) {
    case 'UNAUTHORIZED':
      // Token过期或无效,尝试刷新
      const refreshResult = await api.auth.refreshToken();
      if (!refreshResult.success) {
        // 刷新失败,跳转登录
        navigation.navigate('Login');
      }
      break;
      
    case 'NETWORK_ERROR':
      Alert.alert('网络错误', '请检查网络连接后重试');
      break;
      
    case 'SERVER_ERROR':
      Alert.alert('服务器错误', '服务器暂时不可用,请稍后重试');
      break;
      
    default:
      Alert.alert('错误', apiError.message);
  }
}
```

### 全局错误处理

```typescript
// src/utils/apiErrorHandler.ts
import { ApiError } from '../sdk/api-client';
import { Alert } from 'react-native';
import { navigationRef } from '../navigation';
import api from '../sdk/api';

export async function handleApiError(error: unknown): Promise<boolean> {
  const apiError = error as ApiError;
  
  if (apiError.code === 'UNAUTHORIZED') {
    // 尝试刷新Token
    const result = await api.auth.refreshToken();
    if (result.success) {
      return true; // 可以重试请求
    }
    
    // 刷新失败,跳转登录
    navigationRef.current?.navigate('Login');
    return false;
  }
  
  // 显示错误提示
  Alert.alert('错误', apiError.message || '请求失败');
  return false;
}
```

---

## 最佳实践

### 1. 统一使用SDK

所有API调用都通过SDK进行,不要直接使用fetch或axios。

```typescript
// ✅ 正确
const orders = await api.orders.myOrders();

// ❌ 错误
const response = await fetch('/api/trpc/orders.myOrders');
```

### 2. 集中管理Token

让SDK管理Token,不要手动操作Token存储。

```typescript
// ✅ 正确
await api.auth.login({ username, password });
await api.auth.logout();

// ❌ 错误
await AsyncStorage.setItem('token', token);
```

### 3. App启动时检查认证状态

```typescript
// App.tsx
useEffect(() => {
  async function checkAuth() {
    // 自动刷新Token(如需要)
    await api.auth.autoRefreshIfNeeded();
    
    // 检查登录状态
    const isLoggedIn = await api.auth.isLoggedIn();
    
    if (isLoggedIn) {
      navigation.navigate('Home');
    } else {
      navigation.navigate('Login');
    }
  }
  
  checkAuth();
}, []);
```

### 4. 定时刷新Token

```typescript
// 在App根组件中设置定时刷新
useEffect(() => {
  const interval = setInterval(async () => {
    await api.auth.autoRefreshIfNeeded();
  }, 30 * 60 * 1000); // 每30分钟检查一次
  
  return () => clearInterval(interval);
}, []);
```

### 5. 使用TypeScript类型

```typescript
import { CreateOrderInput, Order, LoginResult } from './sdk/api-client';

const orderInput: CreateOrderInput = {
  customerName: '张三',
  paymentAmount: '1000.00',
  deliveryCity: '上海',
};

const result = await api.orders.userCreate(orderInput);
```

---

## 常见问题

### Q1: 为什么使用URL参数传递Token而不是Authorization头?

由于Cloudflare CDN会过滤Authorization HTTP头,SDK采用URL参数传递Token(`?token=xxx`)来绕过这个限制。这是经过测试验证的可靠方案。

### Q2: Token过期后如何处理?

SDK提供自动刷新机制。Token过期后7天内都可以刷新,超过7天需要重新登录。建议在App启动时和定期调用`api.auth.autoRefreshIfNeeded()`。

### Q3: 如何处理网络错误?

SDK内置自动重试机制(默认3次),网络错误会自动重试。如果重试后仍然失败,会抛出`NETWORK_ERROR`错误。

### Q4: 如何在多个页面共享API实例?

创建一个单例API实例并导出:

```typescript
// src/sdk/api.ts
import { createApiClient } from './api-client';

const api = createApiClient({ autoDetect: true });

export default api;

// 在其他文件中使用
import api from '../sdk/api';
```

### Q5: 如何调试API请求?

启用debug模式:

```typescript
const api = createApiClient({
  debug: true,  // 或 __DEV__
});
```

这会在控制台输出所有请求和响应的详细信息。

---

## 测试账号

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| test | 123456 | user | 普通用户测试账号 |

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| 1.1.0 | 2026-02-05 | 添加Token自动刷新功能 |
| 1.0.0 | 2026-02-05 | 初始版本 |

---

## 技术支持

如有问题,请联系开发团队或提交Issue。
