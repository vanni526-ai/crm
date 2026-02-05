# 前端App开发问题一次性永久解决方案

## 问题根源分析

前端App开发中反复遇到的问题,其根本原因是**开发环境与生产环境的差异**以及**缺乏标准化的API调用规范**。

| 问题类型 | 根本原因 | 影响 |
|---------|---------|------|
| 跨域问题(CORS) | 浏览器安全策略限制不同源请求 | API调用失败 |
| 代理问题 | 开发服务器代理配置不一致 | 请求无法到达后端 |
| 端口问题 | 开发/生产环境端口不同 | 接口地址错误 |
| 接口地址问题 | 硬编码URL或环境变量配置错误 | 请求发送到错误地址 |
| 权限问题 | 认证状态未正确传递 | 401/403错误 |
| 缓存问题 | 浏览器/CDN缓存旧数据 | 数据不一致 |
| Token认证问题 | Token传递方式不统一 | 认证失败 |

---

## 统一解决方案架构

### 核心原则

1. **单一数据源**: 所有环境配置集中在一个地方管理
2. **自动适配**: SDK自动检测运行环境并选择正确的配置
3. **统一认证**: 所有请求使用相同的认证机制
4. **错误恢复**: 内置重试和错误处理机制

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    前端App (React Native / Web)              │
├─────────────────────────────────────────────────────────────┤
│                      API Client SDK                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ 环境检测器   │  │ Token管理器 │  │ 请求拦截器          │  │
│  │ (自动选择   │  │ (自动刷新   │  │ (统一错误处理       │  │
│  │  API地址)   │  │  Token)     │  │  重试机制)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      统一请求层                              │
│  - 自动添加Token到URL参数(?token=xxx)                       │
│  - 自动处理CORS(使用URL Token绕过)                          │
│  - 自动重试失败请求                                          │
│  - 自动刷新过期Token                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      后端API服务器                           │
│  - 支持URL Token认证(?token=xxx)                            │
│  - 支持Authorization头认证(Bearer xxx)                      │
│  - 支持Session Cookie认证                                    │
│  - CORS配置允许所有必要的头部                                │
└─────────────────────────────────────────────────────────────┘
```

---

## API客户端SDK使用指南

### 安装和初始化

```typescript
// api-client.ts - 复制此文件到你的前端项目

import { ApiClient } from './sdk/api-client';

// 初始化客户端(只需一次)
const api = new ApiClient({
  // 自动检测环境,无需手动配置
  autoDetect: true,
  
  // 或者手动指定(可选)
  baseUrl: 'https://your-api-domain.com',
  
  // Token存储方式(默认AsyncStorage)
  tokenStorage: 'asyncStorage', // 或 'localStorage' 或 'memory'
});

export default api;
```

### 登录和认证

```typescript
import api from './api-client';

// 登录
const loginResult = await api.auth.login({
  username: 'test',
  password: '123456',
});

if (loginResult.success) {
  // Token自动保存,后续请求自动携带
  console.log('登录成功');
}

// 检查登录状态
const isLoggedIn = await api.auth.isLoggedIn();

// 登出
await api.auth.logout();
```

### 调用API

```typescript
import api from './api-client';

// 创建订单 - 无需关心Token传递,SDK自动处理
const order = await api.orders.userCreate({
  customerName: '客户姓名',
  paymentAmount: '1000.00',
  deliveryCity: '上海',
});

// 查询我的订单
const myOrders = await api.orders.myOrders({
  status: 'pending',
  limit: 20,
});

// 获取课程列表
const courses = await api.courses.list();
```

### 错误处理

```typescript
import api from './api-client';

try {
  const result = await api.orders.userCreate(data);
} catch (error) {
  if (error.code === 'UNAUTHORIZED') {
    // Token过期,SDK会自动尝试刷新
    // 如果刷新失败,跳转到登录页
    navigation.navigate('Login');
  } else if (error.code === 'NETWORK_ERROR') {
    // 网络错误,SDK已自动重试3次
    Alert.alert('网络错误', '请检查网络连接');
  } else {
    // 其他错误
    Alert.alert('错误', error.message);
  }
}
```

---

## 环境配置

### 开发环境 vs 生产环境

SDK会自动检测运行环境并选择正确的API地址:

| 环境 | 检测方式 | API地址 |
|------|---------|---------|
| 本地开发(Web) | `localhost` 或 `127.0.0.1` | `http://localhost:3000` |
| 本地开发(App模拟器) | `10.0.2.2`(Android) 或 `localhost`(iOS) | 自动转换为正确地址 |
| Manus沙箱预览 | URL包含`manus.computer` | 当前页面origin |
| 生产环境 | 其他情况 | 配置的生产API地址 |

### 手动覆盖配置

```typescript
// 如果需要手动指定API地址
const api = new ApiClient({
  autoDetect: false,
  baseUrl: 'https://custom-api.example.com',
});
```

---

## Token认证机制

### 为什么使用URL Token?

经过测试发现,Cloudflare CDN会过滤HTTP头中的`Authorization`字段,导致Token无法传递到后端。解决方案是将Token放在URL参数中:

```
GET /api/trpc/orders.list?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token生命周期

```
登录 → 获取Token(24小时有效) → 保存到本地存储
                                    ↓
                              每次请求自动携带
                                    ↓
                              Token即将过期(剩余1小时)
                                    ↓
                              自动刷新Token
                                    ↓
                              Token过期且刷新失败
                                    ↓
                              跳转到登录页
```

### Token存储位置

| 平台 | 存储方式 | 说明 |
|------|---------|------|
| React Native | AsyncStorage | 持久化存储,App重启后仍有效 |
| Web | localStorage | 持久化存储,关闭浏览器后仍有效 |
| 内存 | 变量 | 仅当前会话有效,刷新后失效 |

---

## 常见问题解决

### 1. CORS错误

**症状**: 控制台显示 `Access-Control-Allow-Origin` 错误

**原因**: 浏览器阻止跨域请求

**解决**: SDK已通过URL Token绕过此问题,无需额外配置

### 2. 401 Unauthorized

**症状**: API返回401错误

**原因**: Token无效或过期

**解决**: 
- 检查是否已登录: `await api.auth.isLoggedIn()`
- 尝试重新登录: `await api.auth.login(credentials)`

### 3. Network Error

**症状**: 请求失败,无响应

**原因**: 网络问题或API地址错误

**解决**:
- 检查网络连接
- 确认API地址正确: `console.log(api.getBaseUrl())`

### 4. 缓存问题

**症状**: 数据不是最新的

**原因**: 浏览器或CDN缓存

**解决**: SDK已在每个请求添加时间戳参数防止缓存

### 5. 开发环境代理问题

**症状**: 本地开发时请求失败

**原因**: 代理配置错误

**解决**: SDK自动检测环境,无需配置代理

---

## 最佳实践

### 1. 统一使用SDK

```typescript
// ✅ 正确: 使用SDK
import api from './api-client';
const orders = await api.orders.list();

// ❌ 错误: 直接使用fetch
const response = await fetch('/api/orders');
```

### 2. 集中管理Token

```typescript
// ✅ 正确: 让SDK管理Token
await api.auth.login(credentials);
// Token自动保存和使用

// ❌ 错误: 手动管理Token
const token = await AsyncStorage.getItem('token');
fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
```

### 3. 使用类型安全

```typescript
// ✅ 正确: 使用TypeScript类型
interface CreateOrderInput {
  customerName: string;
  paymentAmount: string;
  deliveryCity: string;
}

const order = await api.orders.userCreate(input as CreateOrderInput);
```

### 4. 错误边界

```typescript
// ✅ 正确: 统一错误处理
try {
  const result = await api.orders.userCreate(data);
} catch (error) {
  handleApiError(error);
}

// 统一错误处理函数
function handleApiError(error: ApiError) {
  switch (error.code) {
    case 'UNAUTHORIZED':
      navigation.navigate('Login');
      break;
    case 'NETWORK_ERROR':
      showNetworkErrorToast();
      break;
    default:
      showErrorAlert(error.message);
  }
}
```

---

## 检查清单

在开发前端App时,确保以下配置正确:

- [ ] 已复制`api-client.ts`到项目中
- [ ] 已初始化ApiClient实例
- [ ] 已实现登录流程
- [ ] 已测试Token自动刷新
- [ ] 已实现统一错误处理
- [ ] 已测试网络断开重连
- [ ] 已测试App后台切换
- [ ] 已测试生产环境API地址

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| 1.0.0 | 2026-02-05 | 初始版本,解决CORS、Token、缓存等问题 |
