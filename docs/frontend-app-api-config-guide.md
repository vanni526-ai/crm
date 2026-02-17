# 前端App API配置指南 - 跨沙盒访问

## 架构说明

**重要概念**：前端App和后端API运行在**不同的沙盒环境**中，需要通过**公网URL**进行通信。

```
┌─────────────────────┐         ┌─────────────────────┐
│  前端App沙盒         │         │  后端API沙盒         │
│                     │         │                     │
│  React Native App   │  HTTPS  │  Nginx (80端口)     │
│  或 Capacitor App   │ ───────>│    ↓ 反向代理       │
│                     │         │  Node.js (3000端口)  │
└─────────────────────┘         └─────────────────────┘
```

**关键点**：
- ❌ 不能使用 `localhost:80`（只能在同一沙盒内使用）
- ✅ 必须使用完整的公网URL（跨沙盒访问）

---

## API Base URL 配置

### 方案1：直接使用后端3000端口（不推荐）

如果后端端口可能变化（3000→3001→3002），每次变化都需要更新前端配置。

```typescript
// ❌ 不推荐：端口可能变化
const API_BASE_URL = 'https://3000-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer';
```

### 方案2：使用Nginx 80端口（推荐）

后端配置了Nginx反向代理，前端始终访问80端口，无需关心后端实际端口。

```typescript
// ✅ 推荐：固定80端口
const API_BASE_URL = 'https://80-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer';
```

---

## 完整配置示例

### React Native 配置

```typescript
// src/config/api.ts

// 后端沙盒的公网80端口URL
const BACKEND_BASE_URL = 'https://80-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer';

export const API_CONFIG = {
  baseURL: BACKEND_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// 使用示例
import axios from 'axios';

const apiClient = axios.create(API_CONFIG);

// 调用API
const response = await apiClient.get('/api/trpc/auth.me');
```

### Capacitor 配置

```typescript
// src/config/api.ts

// 后端沙盒的公网80端口URL
const BACKEND_BASE_URL = 'https://80-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer';

export const API_CONFIG = {
  baseURL: BACKEND_BASE_URL,
  timeout: 30000,
};

// 使用tRPC客户端
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../server/routers';

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${BACKEND_BASE_URL}/api/trpc`,
      headers: () => ({
        authorization: localStorage.getItem('auth_token') || '',
      }),
    }),
  ],
});

// 调用API
const users = await trpc.users.list.query();
```

---

## 环境变量配置

### 方法1：使用环境变量文件

创建 `.env` 文件：

```bash
# .env
REACT_APP_API_BASE_URL=https://80-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer
```

在代码中使用：

```typescript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://80-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer';
```

### 方法2：使用配置文件

创建 `src/config/env.ts`：

```typescript
export const ENV = {
  // 后端API地址（使用Nginx 80端口）
  API_BASE_URL: 'https://80-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer',
  
  // 其他配置
  APP_NAME: '课程交付CRM',
  APP_VERSION: '1.0.0',
};
```

---

## 验证配置

### 1. 测试健康检查端点

```bash
curl https://80-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer/health
# 应该返回：OK
```

### 2. 测试API端点

```bash
curl https://80-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer/api/trpc/auth.me
# 应该返回：{"result":{"data":{"json":null}}}（未登录状态）
```

### 3. 在前端App中测试

```typescript
// 测试代码
async function testAPI() {
  try {
    const response = await fetch(
      'https://80-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer/health'
    );
    const data = await response.text();
    console.log('API连接成功:', data); // 应该输出：OK
  } catch (error) {
    console.error('API连接失败:', error);
  }
}

testAPI();
```

---

## 常见错误

### 错误1：使用localhost

```typescript
// ❌ 错误：前端App无法访问后端沙盒的localhost
const API_BASE_URL = 'http://localhost:80';
```

**错误信息**：`Network Error` 或 `Connection refused`

**解决方案**：使用完整的公网URL

```typescript
// ✅ 正确
const API_BASE_URL = 'https://80-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer';
```

### 错误2：使用错误的端口

```typescript
// ❌ 错误：后端实际运行在3000端口，但Nginx在80端口
const API_BASE_URL = 'https://3000-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer';
```

**问题**：如果后端端口变化（3000→3001），前端配置需要更新

**解决方案**：使用Nginx的80端口

```typescript
// ✅ 正确：固定80端口
const API_BASE_URL = 'https://80-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer';
```

### 错误3：CORS错误

```
Access to fetch at 'https://80-...' from origin 'https://8081-...' has been blocked by CORS policy
```

**原因**：后端CORS配置不允许前端沙盒的域名

**解决方案**：后端已配置允许所有`*.manus.computer`域名，此错误不应出现。如果出现，检查：

1. 确认后端CORS配置正确（`server/_core/index.ts`）
2. 确认请求头中包含正确的Origin
3. 检查Nginx配置是否正确转发请求头

---

## 调试技巧

### 1. 检查后端Nginx状态

在后端沙盒中运行：

```bash
# 检查Nginx服务状态
sudo systemctl status nginx

# 检查80端口监听
netstat -tlnp | grep :80

# 测试本地访问
curl http://localhost:80/health
```

### 2. 检查网络请求

在前端App中添加日志：

```typescript
import axios from 'axios';

// 添加请求拦截器
axios.interceptors.request.use(
  (config) => {
    console.log('🚀 请求:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ 请求错误:', error);
    return Promise.reject(error);
  }
);

// 添加响应拦截器
axios.interceptors.response.use(
  (response) => {
    console.log('✅ 响应:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ 响应错误:', error.response?.status, error.config?.url);
    return Promise.reject(error);
  }
);
```

### 3. 使用浏览器开发者工具

在Capacitor App中，可以使用Chrome DevTools调试：

```bash
# 在Android设备上启用USB调试
# 在Chrome中访问：chrome://inspect
# 选择你的App进行调试
```

---

## 生产环境部署

在生产环境中，建议使用自定义域名：

```typescript
// 开发环境
const DEV_API_URL = 'https://80-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer';

// 生产环境
const PROD_API_URL = 'https://api.your-domain.com';

export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? PROD_API_URL
  : DEV_API_URL;
```

---

## 总结

**关键配置**：

```typescript
// ✅ 正确的前端App API配置
const API_BASE_URL = 'https://80-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer';
```

**为什么使用80端口？**

1. ✅ **固定端口**：后端实际端口可能变化（3000→3001），但Nginx始终在80端口
2. ✅ **标准端口**：80是HTTP标准端口，443是HTTPS标准端口
3. ✅ **反向代理**：Nginx提供负载均衡、SSL终止、缓存等高级功能
4. ✅ **生产环境兼容**：与生产环境部署方式一致

**测试清单**：

- [ ] 健康检查端点：`/health` 返回 `OK`
- [ ] API端点：`/api/trpc/auth.me` 正常返回
- [ ] 前端App可以成功调用API
- [ ] 登录功能正常工作
- [ ] 数据加载正常显示

如有问题，请参考上述调试技巧或联系技术支持。
