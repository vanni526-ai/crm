# 课程交付CRM系统 - 前端App对接完整指南

**文档版本**: v1.0  
**最后更新**: 2026-02-13  
**作者**: Manus AI

---

## 文档概述

本文档为前端App开发者提供完整的后台对接指南,涵盖认证方式、API接口、路由配置、代理设置等所有关键信息。无论您使用React Native、Flutter还是其他移动端框架,都可以通过本文档快速完成后台集成,实现零配置对接。

---

## 一、后台服务基本信息

### 1.1 服务地址

课程交付CRM系统后台服务的**固定地址**为:

```
https://crm.bdsm.com.cn
```

**重要提示**: 这是生产环境的固定地址,所有API请求都应该指向这个地址。请勿使用开发环境的临时地址(如`3000-xxx.manus.computer`),因为这些地址会随着沙盒重启而变化。

### 1.2 API协议

后台使用**tRPC**作为API协议,这是一个类型安全的RPC框架。tRPC通过HTTP POST请求与后端通信,所有API请求的路径格式为:

```
POST https://crm.bdsm.com.cn/api/trpc/{router}.{procedure}
```

例如,调用`auth.loginWithUserAccount`接口的完整URL为:

```
POST https://crm.bdsm.com.cn/api/trpc/auth.loginWithUserAccount
```

### 1.3 跨域配置

后台已经配置了CORS(跨域资源共享),允许来自任何域名的请求。前端App无需进行额外的跨域配置,可以直接调用API。

---

## 二、认证系统详解

课程交付CRM系统支持**两种并行的认证方式**:

1. **Manus OAuth登录**(用于Web端,通过Manus平台统一认证)
2. **用户名密码登录**(用于App端,传统的账号密码认证)

这两种认证方式返回的Token格式和验证逻辑**完全相同**,后端会自动识别Token类型并进行验证。

### 2.1 认证方式对比

| 特性 | Manus OAuth登录 | 用户名密码登录 |
|------|----------------|---------------|
| **适用场景** | Web端(浏览器) | App端(移动应用) |
| **认证流程** | OAuth 2.0授权码流程 | 直接用户名密码验证 |
| **Token存储** | Session Cookie | 自定义存储(localStorage/AsyncStorage) |
| **Token传递** | Cookie自动携带 | Header或URL参数 |
| **Token格式** | JWT(HS256签名) | JWT(HS256签名) |
| **Token有效期** | 1年 | 7天(可配置) |
| **登录接口** | `/api/oauth/login` | `/api/trpc/auth.loginWithUserAccount` |

### 2.2 用户名密码登录(推荐App端使用)

#### 2.2.1 登录接口

**接口路径**: `auth.loginWithUserAccount`  
**请求方法**: POST  
**完整URL**: `https://crm.bdsm.com.cn/api/trpc/auth.loginWithUserAccount`

**请求参数**:

```typescript
{
  username: string;  // 用户名/手机号/邮箱(支持三种方式登录)
  password: string;  // 密码
}
```

**响应数据**:

```typescript
{
  success: boolean;  // 登录是否成功
  token: string;     // JWT Token(用于后续API请求认证)
  user: {
    id: number;           // 用户ID
    openId: string;       // 用户唯一标识
    name: string;         // 用户姓名
    nickname: string | null;  // 用户昵称
    email: string | null;     // 邮箱
    phone: string | null;     // 手机号
    role: string;             // 角色(admin/user/teacher等)
    roles: string;            // 多角色(逗号分隔)
    isActive: boolean;        // 账号是否启用
    createdAt: string;        // 创建时间
    updatedAt: string;        // 更新时间
    lastSignedIn: string;     // 最后登录时间
  }
}
```

**示例代码**(JavaScript/TypeScript):

```typescript
// 登录请求
const response = await fetch('https://crm.bdsm.com.cn/api/trpc/auth.loginWithUserAccount', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'test',      // 用户名
    password: '123456',    // 密码
  }),
});

const data = await response.json();

if (data.result.data.success) {
  const token = data.result.data.token;
  const user = data.result.data.user;
  
  // 保存Token到本地存储
  localStorage.setItem('auth_token', token);
  localStorage.setItem('user_info', JSON.stringify(user));
  
  console.log('登录成功:', user.name);
} else {
  console.error('登录失败');
}
```

**示例代码**(React Native):

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// 登录请求
const login = async (username: string, password: string) => {
  try {
    const response = await fetch('https://crm.bdsm.com.cn/api/trpc/auth.loginWithUserAccount', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (data.result.data.success) {
      const token = data.result.data.token;
      const user = data.result.data.user;
      
      // 保存Token到AsyncStorage
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_info', JSON.stringify(user));
      
      return { success: true, user };
    } else {
      return { success: false, error: '登录失败' };
    }
  } catch (error) {
    console.error('登录请求失败:', error);
    return { success: false, error: '网络错误' };
  }
};
```

#### 2.2.2 Token格式

用户名密码登录返回的Token是一个**JWT(JSON Web Token)**,使用**HS256算法**签名。Token的payload包含以下字段:

```typescript
{
  id: number;        // 用户ID
  openId: string;    // 用户唯一标识
  name: string;      // 用户姓名
  role: string;      // 角色
  roles: string;     // 多角色
  iat: number;       // 签发时间(Unix时间戳)
  exp: number;       // 过期时间(Unix时间戳)
}
```

**重要**: Token的有效期为**7天**,过期后需要重新登录。

#### 2.2.3 Token传递方式

后端支持**三种Token传递方式**,优先级从高到低为:

1. **URL查询参数**(推荐,可绕过Cloudflare限制)
2. **Authorization Header**
3. **Session Cookie**

**方式1: URL查询参数**(推荐)

```typescript
// 在API请求URL中添加token参数
const url = `https://crm.bdsm.com.cn/api/trpc/orders.list?token=${token}`;

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ /* 请求参数 */ }),
});
```

**方式2: Authorization Header**

```typescript
fetch('https://crm.bdsm.com.cn/api/trpc/orders.list', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,  // Bearer Token
  },
  body: JSON.stringify({ /* 请求参数 */ }),
});
```

**方式3: X-Auth-Token Header**(备选)

```typescript
fetch('https://crm.bdsm.com.cn/api/trpc/orders.list', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Auth-Token': `Bearer ${token}`,  // 自定义Header
  },
  body: JSON.stringify({ /* 请求参数 */ }),
});
```

**推荐使用方式1(URL查询参数)**,因为:
- 可以绕过Cloudflare的某些限制
- 兼容性最好,适用于所有HTTP客户端
- 无需修改请求头,配置简单

### 2.3 Manus OAuth登录(Web端使用)

Manus OAuth登录主要用于Web端,通过Manus平台统一认证。登录流程如下:

1. 用户点击登录按钮,跳转到Manus OAuth登录页面
2. 用户在Manus平台完成登录(支持Google、Apple、Microsoft等第三方登录)
3. Manus平台回调到应用,携带授权码(code)
4. 应用后端使用授权码换取access_token
5. 应用后端使用access_token获取用户信息
6. 应用后端生成Session Cookie,返回给前端
7. 前端后续请求自动携带Session Cookie进行认证

**注意**: Manus OAuth登录返回的Session Cookie与用户名密码登录返回的JWT Token**格式相同**,都是JWT,后端会自动识别并验证。

### 2.4 认证状态检查

#### 2.4.1 获取当前用户信息

**接口路径**: `auth.me`  
**请求方法**: POST  
**完整URL**: `https://crm.bdsm.com.cn/api/trpc/auth.me?token={your_token}`

**请求参数**: 无

**响应数据**:

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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
}
```

**示例代码**:

```typescript
// 检查认证状态
const checkAuth = async () => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    return { authenticated: false };
  }

  try {
    const response = await fetch(`https://crm.bdsm.com.cn/api/trpc/auth.me?token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (data.result.data) {
      return { authenticated: true, user: data.result.data };
    } else {
      // Token无效或过期
      localStorage.removeItem('auth_token');
      return { authenticated: false };
    }
  } catch (error) {
    console.error('认证检查失败:', error);
    return { authenticated: false };
  }
};
```

#### 2.4.2 登出

**接口路径**: `auth.logout`  
**请求方法**: POST  
**完整URL**: `https://crm.bdsm.com.cn/api/trpc/auth.logout?token={your_token}`

**请求参数**: 无

**响应数据**:

```typescript
{
  success: boolean;
}
```

**示例代码**:

```typescript
// 登出
const logout = async () => {
  const token = localStorage.getItem('auth_token');
  
  try {
    await fetch(`https://crm.bdsm.com.cn/api/trpc/auth.logout?token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
  } catch (error) {
    console.error('登出请求失败:', error);
  } finally {
    // 无论请求是否成功,都清除本地Token
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
  }
};
```

---

## 三、API接口规范

### 3.1 tRPC调用规范

所有API请求都遵循tRPC协议,请求格式为:

```
POST https://crm.bdsm.com.cn/api/trpc/{router}.{procedure}?token={your_token}
Content-Type: application/json

{
  // 请求参数
}
```

**响应格式**:

```typescript
{
  result: {
    data: any;  // 实际返回数据
  }
}
```

### 3.2 核心API接口列表

以下是课程交付CRM系统的核心API接口,按功能模块分类:

#### 3.2.1 认证模块(auth)

| 接口名称 | 路径 | 说明 |
|---------|------|------|
| 用户名密码登录 | `auth.loginWithUserAccount` | 使用用户名/手机号/邮箱+密码登录 |
| 获取当前用户 | `auth.me` | 获取当前登录用户信息 |
| 登出 | `auth.logout` | 退出登录 |

#### 3.2.2 订单模块(orders)

| 接口名称 | 路径 | 说明 |
|---------|------|------|
| 订单列表 | `orders.list` | 获取订单列表(支持分页、筛选、排序) |
| 订单详情 | `orders.getById` | 根据ID获取订单详情 |
| 创建订单 | `orders.create` | 创建新订单 |
| 更新订单 | `orders.update` | 更新订单信息 |
| 删除订单 | `orders.delete` | 删除订单 |
| 批量删除订单 | `orders.batchDelete` | 批量删除多个订单 |
| 批量重算合伙人费 | `orders.batchRecalculatePartnerFee` | 批量重新计算合伙人费用 |

#### 3.2.3 客户模块(customers)

| 接口名称 | 路径 | 说明 |
|---------|------|------|
| 客户列表 | `customers.list` | 获取客户列表(支持筛选、排序) |
| 客户详情 | `customers.getById` | 根据ID获取客户详情 |
| 创建客户 | `customers.create` | 创建新客户 |
| 更新客户 | `customers.update` | 更新客户信息 |
| 删除客户 | `customers.delete` | 删除客户 |
| 刷新客户统计 | `customers.refreshAllStats` | 刷新所有客户的统计数据 |

#### 3.2.4 老师模块(teachers)

| 接口名称 | 路径 | 说明 |
|---------|------|------|
| 老师列表 | `teachers.list` | 获取老师列表 |
| 老师详情 | `teachers.getById` | 根据ID获取老师详情 |
| 创建老师 | `teachers.create` | 创建新老师 |
| 更新老师 | `teachers.update` | 更新老师信息 |
| 删除老师 | `teachers.delete` | 删除老师 |
| Excel导入老师 | `teachers.importFromExcel` | 从Excel文件批量导入老师 |

#### 3.2.5 销售模块(salespeople)

| 接口名称 | 路径 | 说明 |
|---------|------|------|
| 销售列表 | `salespeople.list` | 获取销售人员列表 |
| 销售详情 | `salespeople.getById` | 根据ID获取销售人员详情 |
| 创建销售 | `salespeople.create` | 创建新销售人员 |
| 更新销售 | `salespeople.update` | 更新销售人员信息 |
| 删除销售 | `salespeople.delete` | 删除销售人员 |
| 更新销售统计 | `salespeople.updateAllStats` | 更新所有销售人员的统计数据 |

#### 3.2.6 城市模块(cities)

| 接口名称 | 路径 | 说明 |
|---------|------|------|
| 城市列表 | `cities.list` | 获取城市列表 |
| 城市详情 | `cities.getById` | 根据ID获取城市详情 |
| 城市财务统计 | `cities.getFinancialStats` | 获取城市财务统计数据 |
| 城市月度趋势 | `cities.getMonthlyTrends` | 获取城市月度业绩趋势 |
| 导出城市报表 | `cities.export` | 导出城市数据为Excel |

#### 3.2.7 合伙人模块(partners)

| 接口名称 | 路径 | 说明 |
|---------|------|------|
| 合伙人列表 | `partners.list` | 获取合伙人列表 |
| 合伙人详情 | `partners.getById` | 根据ID获取合伙人详情 |
| 合伙人分红统计 | `partners.getDividendStats` | 获取合伙人分红统计 |

#### 3.2.8 财务模块(finance)

| 接口名称 | 路径 | 说明 |
|---------|------|------|
| 财务统计 | `finance.getStats` | 获取财务统计数据 |
| 城市财务统计 | `finance.getCityStats` | 获取城市财务统计 |
| 流量来源分析 | `finance.getTrafficSourceAnalysis` | 获取流量来源分析数据 |
| 导出财务报表 | `finance.exportReport` | 导出财务报表为Excel |

#### 3.2.9 数据分析模块(analytics)

| 接口名称 | 路径 | 说明 |
|---------|------|------|
| 获取所有城市 | `analytics.getAllCities` | 获取所有城市列表(用于下拉选择) |
| 获取所有老师 | `analytics.getAllTeachers` | 获取所有老师列表(用于下拉选择) |
| 获取所有销售 | `analytics.getAllSalespeople` | 获取所有销售人员列表(用于下拉选择) |

### 3.3 API调用示例

#### 3.3.1 获取订单列表

```typescript
const getOrders = async (page = 1, pageSize = 20) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(`https://crm.bdsm.com.cn/api/trpc/orders.list?token=${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      page,
      pageSize,
      // 可选筛选条件
      filters: {
        city: '上海',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
    }),
  });

  const data = await response.json();
  return data.result.data;
};
```

#### 3.3.2 创建订单

```typescript
const createOrder = async (orderData) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(`https://crm.bdsm.com.cn/api/trpc/orders.create?token=${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerName: '张三',
      courseName: 'BDSM基础课程',
      teacherName: '李老师',
      city: '上海',
      classDate: '2026-02-15',
      startTime: '14:00',
      endTime: '16:00',
      totalAmount: 500,
      teacherFee: 200,
      // ... 其他字段
    }),
  });

  const data = await response.json();
  return data.result.data;
};
```

#### 3.3.3 获取客户列表

```typescript
const getCustomers = async () => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(`https://crm.bdsm.com.cn/api/trpc/customers.list?token=${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // 可选筛选条件
      filters: {
        minSpending: 5000,  // 最低消费金额
        trafficSource: '小红书',  // 流量来源
      },
      // 排序
      sortBy: 'totalSpending',  // 按累计消费排序
      sortOrder: 'desc',  // 降序
    }),
  });

  const data = await response.json();
  return data.result.data;
};
```

---

## 四、路由与导航

### 4.1 Web端路由

Web端使用React Router进行路由管理,主要路由如下:

| 路由路径 | 页面名称 | 说明 |
|---------|---------|------|
| `/` | 首页 | 系统首页,显示关键统计数据 |
| `/orders` | 订单管理 | 订单列表、创建、编辑、删除 |
| `/customer-management` | 客户管理 | 客户列表、创建、编辑、删除 |
| `/sales-management` | 销售管理 | 销售人员列表、业绩统计 |
| `/teachers` | 老师管理 | 老师列表、创建、编辑、删除、Excel导入 |
| `/courses` | 课程管理 | 课程列表、排课 |
| `/cities` | 城市管理 | 城市列表、财务统计、地图展示 |
| `/partner-management` | 合伙人管理 | 合伙人列表、分红统计 |
| `/finance` | 财务管理 | 财务统计、报表导出 |
| `/reconciliation` | 财务对账 | 订单对账、费用核算 |
| `/data-import` | 数据导入 | Gmail导入、ICS导入 |

### 4.2 App端导航建议

对于移动端App,建议使用Tab导航或侧边栏导航,主要功能模块包括:

1. **首页**: 关键统计数据、快捷操作
2. **订单**: 订单列表、创建订单、订单详情
3. **客户**: 客户列表、客户详情
4. **老师**: 老师列表、老师详情
5. **财务**: 财务统计、报表查看
6. **我的**: 个人信息、设置、登出

---

## 五、代理配置(可选)

如果您的前端App运行在开发环境(如`localhost:3000`),可能需要配置代理来解决跨域问题。但是,**生产环境不需要代理**,因为后台已经配置了CORS。

### 5.1 开发环境代理配置

#### 5.1.1 Vite代理配置

如果您使用Vite作为开发服务器,可以在`vite.config.ts`中配置代理:

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://crm.bdsm.com.cn',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

配置后,您可以使用相对路径调用API:

```typescript
// 开发环境
fetch('/api/trpc/auth.loginWithUserAccount', { /* ... */ });

// 等同于
fetch('https://crm.bdsm.com.cn/api/trpc/auth.loginWithUserAccount', { /* ... */ });
```

#### 5.1.2 Create React App代理配置

如果您使用Create React App,可以在`package.json`中添加`proxy`字段:

```json
{
  "proxy": "https://crm.bdsm.com.cn"
}
```

或者创建`src/setupProxy.js`文件:

```javascript
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://crm.bdsm.com.cn',
      changeOrigin: true,
    })
  );
};
```

### 5.2 生产环境配置

**生产环境不需要代理配置**,直接使用完整的API地址即可:

```typescript
const API_BASE_URL = 'https://crm.bdsm.com.cn';

fetch(`${API_BASE_URL}/api/trpc/auth.loginWithUserAccount`, { /* ... */ });
```

---

## 六、错误处理

### 6.1 常见错误码

| HTTP状态码 | 说明 | 处理建议 |
|-----------|------|---------|
| 200 | 请求成功 | 正常处理响应数据 |
| 401 | 未授权(Token无效或过期) | 清除本地Token,跳转到登录页面 |
| 403 | 禁止访问(账号被禁用) | 提示用户联系管理员 |
| 404 | 资源不存在 | 提示用户资源不存在 |
| 500 | 服务器内部错误 | 提示用户稍后重试 |

### 6.2 错误处理示例

```typescript
const handleApiError = (error: any) => {
  if (error.response) {
    // 服务器返回错误响应
    const status = error.response.status;
    
    if (status === 401) {
      // Token无效或过期,清除本地Token并跳转到登录页面
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
      window.location.href = '/login';
    } else if (status === 403) {
      alert('账号已被禁用,请联系管理员');
    } else if (status === 404) {
      alert('资源不存在');
    } else if (status === 500) {
      alert('服务器错误,请稍后重试');
    } else {
      alert(`请求失败: ${error.response.data.message || '未知错误'}`);
    }
  } else if (error.request) {
    // 请求已发送但没有收到响应
    alert('网络错误,请检查网络连接');
  } else {
    // 其他错误
    alert(`请求失败: ${error.message}`);
  }
};

// 使用示例
try {
  const response = await fetch('https://crm.bdsm.com.cn/api/trpc/orders.list?token=' + token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  // 处理数据
} catch (error) {
  handleApiError(error);
}
```

---

## 七、最佳实践

### 7.1 Token管理

1. **安全存储**: 将Token存储在安全的位置(localStorage/AsyncStorage),不要存储在明文文件中
2. **自动刷新**: 在Token即将过期前自动刷新(当前Token有效期为7天,建议在第6天刷新)
3. **全局拦截**: 使用HTTP拦截器自动在所有请求中添加Token
4. **错误处理**: 当Token无效时,自动清除本地Token并跳转到登录页面

### 7.2 API调用封装

建议封装一个统一的API客户端,自动处理Token、错误处理、重试等逻辑:

```typescript
class ApiClient {
  private baseUrl = 'https://crm.bdsm.com.cn';
  private token: string | null = null;

  constructor() {
    this.loadToken();
  }

  private loadToken() {
    this.token = localStorage.getItem('auth_token');
  }

  private async request(path: string, body: any = {}) {
    const url = `${this.baseUrl}/api/trpc/${path}${this.token ? `?token=${this.token}` : ''}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token无效,清除并跳转登录
          this.clearAuth();
          throw new Error('认证失败,请重新登录');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.result.data;
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  }

  async login(username: string, password: string) {
    const result = await this.request('auth.loginWithUserAccount', { username, password });
    if (result.success) {
      this.token = result.token;
      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('user_info', JSON.stringify(result.user));
    }
    return result;
  }

  async getOrders(filters?: any) {
    return this.request('orders.list', filters);
  }

  async getCustomers(filters?: any) {
    return this.request('customers.list', filters);
  }

  clearAuth() {
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
  }
}

// 使用示例
const api = new ApiClient();

// 登录
const loginResult = await api.login('test', '123456');

// 获取订单列表
const orders = await api.getOrders({ city: '上海' });
```

### 7.3 React Native集成示例

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 创建API Context
const ApiContext = createContext<any>(null);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuth();
  }, []);

  const loadAuth = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('auth_token');
      const savedUser = await AsyncStorage.getItem('user_info');
      
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('加载认证信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('https://crm.bdsm.com.cn/api/trpc/auth.loginWithUserAccount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.result.data.success) {
        const { token: newToken, user: newUser } = data.result.data;
        
        await AsyncStorage.setItem('auth_token', newToken);
        await AsyncStorage.setItem('user_info', JSON.stringify(newUser));
        
        setToken(newToken);
        setUser(newUser);
        
        return { success: true };
      } else {
        return { success: false, error: '登录失败' };
      }
    } catch (error) {
      console.error('登录请求失败:', error);
      return { success: false, error: '网络错误' };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`https://crm.bdsm.com.cn/api/trpc/auth.logout?token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      }
    } catch (error) {
      console.error('登出请求失败:', error);
    } finally {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_info');
      setToken(null);
      setUser(null);
    }
  };

  const apiRequest = async (path: string, body: any = {}) => {
    const url = `https://crm.bdsm.com.cn/api/trpc/${path}${token ? `?token=${token}` : ''}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (response.status === 401) {
          await logout();
          throw new Error('认证失败,请重新登录');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.result.data;
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  };

  return (
    <ApiContext.Provider value={{ token, user, loading, login, logout, apiRequest }}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within ApiProvider');
  }
  return context;
};

// 使用示例
function LoginScreen() {
  const { login } = useApi();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const result = await login(username, password);
    if (result.success) {
      // 登录成功,跳转到主页
      navigation.navigate('Home');
    } else {
      alert(result.error);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="用户名"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        placeholder="密码"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="登录" onPress={handleLogin} />
    </View>
  );
}

function OrderListScreen() {
  const { apiRequest } = useApi();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await apiRequest('orders.list', {});
      setOrders(data);
    } catch (error) {
      alert('加载订单失败');
    }
  };

  return (
    <FlatList
      data={orders}
      renderItem={({ item }) => (
        <View>
          <Text>{item.customerName}</Text>
          <Text>{item.courseName}</Text>
        </View>
      )}
    />
  );
}
```

---

## 八、常见问题FAQ

### 8.1 为什么我的登录请求返回401错误?

**可能原因**:
1. 用户名或密码错误
2. 账号已被禁用
3. Token已过期

**解决方案**:
1. 检查用户名和密码是否正确
2. 联系管理员确认账号状态
3. 清除本地Token,重新登录

### 8.2 为什么我的API请求返回CORS错误?

**可能原因**:
1. 使用了错误的API地址(如开发环境的临时地址)
2. 浏览器缓存了旧的CORS配置

**解决方案**:
1. 确保使用正确的API地址:`https://crm.bdsm.com.cn`
2. 清除浏览器缓存,重新加载页面
3. 如果在开发环境,配置代理(参见第五章)

### 8.3 Token有效期是多久?如何刷新Token?

**回答**:
- 用户名密码登录的Token有效期为**7天**
- Manus OAuth登录的Session Cookie有效期为**1年**
- 当前系统不支持自动刷新Token,Token过期后需要重新登录
- 建议在Token即将过期前(如第6天)提示用户重新登录

### 8.4 如何区分Manus OAuth登录和用户名密码登录?

**回答**:
- 后端会自动识别Token类型,前端无需区分
- 两种登录方式返回的Token格式相同,都是JWT
- 后端验证Token时会自动判断Token的payload字段:
  - 如果包含`id`字段,说明是用户名密码登录
  - 如果包含`openId`字段,说明是Manus OAuth登录

### 8.5 如何在App中实现自动登录?

**回答**:
1. 在App启动时,从本地存储(AsyncStorage)读取Token
2. 调用`auth.me`接口验证Token是否有效
3. 如果Token有效,直接进入主页
4. 如果Token无效或不存在,跳转到登录页面

**示例代码**:

```typescript
useEffect(() => {
  checkAuth();
}, []);

const checkAuth = async () => {
  const token = await AsyncStorage.getItem('auth_token');
  
  if (!token) {
    navigation.navigate('Login');
    return;
  }

  try {
    const response = await fetch(`https://crm.bdsm.com.cn/api/trpc/auth.me?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (data.result.data) {
      // Token有效,进入主页
      navigation.navigate('Home');
    } else {
      // Token无效,跳转登录
      await AsyncStorage.removeItem('auth_token');
      navigation.navigate('Login');
    }
  } catch (error) {
    // 网络错误,跳转登录
    navigation.navigate('Login');
  }
};
```

### 8.6 如何处理Token过期的情况?

**回答**:
1. 在全局HTTP拦截器中捕获401错误
2. 清除本地Token
3. 跳转到登录页面
4. 提示用户重新登录

**示例代码**:

```typescript
const apiRequest = async (path: string, body: any = {}) => {
  const token = await AsyncStorage.getItem('auth_token');
  const url = `https://crm.bdsm.com.cn/api/trpc/${path}${token ? `?token=${token}` : ''}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      // Token过期,清除本地Token并跳转登录
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_info');
      navigation.navigate('Login');
      throw new Error('登录已过期,请重新登录');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.result.data;
  } catch (error) {
    console.error('API请求失败:', error);
    throw error;
  }
};
```

---

## 九、测试账号

为方便前端App开发和测试,系统提供以下测试账号:

| 用户名 | 密码 | 角色 | 说明 |
|-------|------|------|------|
| test | 123456 | user | 普通用户 |
| admin | 123456 | admin | 管理员 |
| appuser | 123456 | user | App测试用户 |

**注意**: 测试账号仅用于开发和测试,请勿在生产环境使用。

---

## 十、技术支持

如果您在对接过程中遇到任何问题,请通过以下方式联系我们:

- **技术文档**: 本文档
- **API文档**: 访问`https://crm.bdsm.com.cn/api/docs`(如果可用)
- **问题反馈**: 通过Manus平台提交工单

---

## 附录A: 完整的API客户端示例

以下是一个完整的TypeScript API客户端示例,包含所有核心功能:

```typescript
/**
 * 课程交付CRM系统 - API客户端
 * 支持用户名密码登录、Token管理、错误处理等
 */

interface LoginResult {
  success: boolean;
  token?: string;
  user?: any;
  error?: string;
}

interface ApiResponse<T> {
  result: {
    data: T;
  };
}

class CrmApiClient {
  private baseUrl = 'https://crm.bdsm.com.cn';
  private token: string | null = null;

  constructor() {
    this.loadToken();
  }

  /**
   * 从本地存储加载Token
   */
  private loadToken() {
    if (typeof localStorage !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  /**
   * 保存Token到本地存储
   */
  private saveToken(token: string) {
    this.token = token;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * 清除Token
   */
  private clearToken() {
    this.token = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
    }
  }

  /**
   * 发送API请求
   */
  private async request<T>(path: string, body: any = {}): Promise<T> {
    const url = `${this.baseUrl}/api/trpc/${path}${this.token ? `?token=${this.token}` : ''}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
          throw new Error('认证失败,请重新登录');
        }
        if (response.status === 403) {
          throw new Error('账号已被禁用,请联系管理员');
        }
        if (response.status === 404) {
          throw new Error('资源不存在');
        }
        if (response.status === 500) {
          throw new Error('服务器错误,请稍后重试');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<T> = await response.json();
      return data.result.data;
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  }

  /**
   * 用户名密码登录
   */
  async login(username: string, password: string): Promise<LoginResult> {
    try {
      const result = await this.request<LoginResult>('auth.loginWithUserAccount', {
        username,
        password,
      });

      if (result.success && result.token) {
        this.saveToken(result.token);
        if (typeof localStorage !== 'undefined' && result.user) {
          localStorage.setItem('user_info', JSON.stringify(result.user));
        }
      }

      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '登录失败',
      };
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser() {
    return this.request('auth.me', {});
  }

  /**
   * 登出
   */
  async logout() {
    try {
      await this.request('auth.logout', {});
    } catch (error) {
      console.error('登出请求失败:', error);
    } finally {
      this.clearToken();
    }
  }

  /**
   * 获取订单列表
   */
  async getOrders(filters?: any) {
    return this.request('orders.list', filters);
  }

  /**
   * 获取订单详情
   */
  async getOrderById(id: number) {
    return this.request('orders.getById', { id });
  }

  /**
   * 创建订单
   */
  async createOrder(orderData: any) {
    return this.request('orders.create', orderData);
  }

  /**
   * 更新订单
   */
  async updateOrder(id: number, orderData: any) {
    return this.request('orders.update', { id, ...orderData });
  }

  /**
   * 删除订单
   */
  async deleteOrder(id: number) {
    return this.request('orders.delete', { id });
  }

  /**
   * 获取客户列表
   */
  async getCustomers(filters?: any) {
    return this.request('customers.list', filters);
  }

  /**
   * 获取客户详情
   */
  async getCustomerById(id: number) {
    return this.request('customers.getById', { id });
  }

  /**
   * 创建客户
   */
  async createCustomer(customerData: any) {
    return this.request('customers.create', customerData);
  }

  /**
   * 更新客户
   */
  async updateCustomer(id: number, customerData: any) {
    return this.request('customers.update', { id, ...customerData });
  }

  /**
   * 获取老师列表
   */
  async getTeachers() {
    return this.request('teachers.list', {});
  }

  /**
   * 获取老师详情
   */
  async getTeacherById(id: number) {
    return this.request('teachers.getById', { id });
  }

  /**
   * 创建老师
   */
  async createTeacher(teacherData: any) {
    return this.request('teachers.create', teacherData);
  }

  /**
   * 更新老师
   */
  async updateTeacher(id: number, teacherData: any) {
    return this.request('teachers.update', { id, ...teacherData });
  }

  /**
   * 获取销售人员列表
   */
  async getSalespeople() {
    return this.request('salespeople.list', {});
  }

  /**
   * 获取城市列表
   */
  async getCities() {
    return this.request('cities.list', {});
  }

  /**
   * 获取城市财务统计
   */
  async getCityFinancialStats(filters?: any) {
    return this.request('cities.getFinancialStats', filters);
  }

  /**
   * 获取财务统计
   */
  async getFinanceStats(filters?: any) {
    return this.request('finance.getStats', filters);
  }

  /**
   * 获取所有城市(用于下拉选择)
   */
  async getAllCities() {
    return this.request('analytics.getAllCities', {});
  }

  /**
   * 获取所有老师(用于下拉选择)
   */
  async getAllTeachers() {
    return this.request('analytics.getAllTeachers', {});
  }

  /**
   * 获取所有销售人员(用于下拉选择)
   */
  async getAllSalespeople() {
    return this.request('analytics.getAllSalespeople', {});
  }
}

// 导出单例
export const crmApi = new CrmApiClient();

// 使用示例
/*
// 登录
const loginResult = await crmApi.login('test', '123456');
if (loginResult.success) {
  console.log('登录成功:', loginResult.user);
}

// 获取订单列表
const orders = await crmApi.getOrders({ city: '上海' });

// 获取客户列表
const customers = await crmApi.getCustomers();

// 创建订单
const newOrder = await crmApi.createOrder({
  customerName: '张三',
  courseName: 'BDSM基础课程',
  // ... 其他字段
});

// 登出
await crmApi.logout();
*/
```

---

## 附录B: React Native完整集成示例

以下是一个完整的React Native集成示例,包含登录、订单列表、订单详情等功能:

```typescript
// api/CrmApiClient.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

class CrmApiClient {
  private baseUrl = 'https://crm.bdsm.com.cn';
  private token: string | null = null;

  async init() {
    this.token = await AsyncStorage.getItem('auth_token');
  }

  private async saveToken(token: string) {
    this.token = token;
    await AsyncStorage.setItem('auth_token', token);
  }

  private async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_info');
  }

  private async request<T>(path: string, body: any = {}): Promise<T> {
    const url = `${this.baseUrl}/api/trpc/${path}${this.token ? `?token=${this.token}` : ''}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await this.clearToken();
        throw new Error('认证失败,请重新登录');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.result.data;
  }

  async login(username: string, password: string) {
    const result = await this.request<any>('auth.loginWithUserAccount', { username, password });
    
    if (result.success && result.token) {
      await this.saveToken(result.token);
      await AsyncStorage.setItem('user_info', JSON.stringify(result.user));
    }
    
    return result;
  }

  async logout() {
    try {
      await this.request('auth.logout', {});
    } finally {
      await this.clearToken();
    }
  }

  async getCurrentUser() {
    return this.request('auth.me', {});
  }

  async getOrders(filters?: any) {
    return this.request('orders.list', filters);
  }

  async getOrderById(id: number) {
    return this.request('orders.getById', { id });
  }
}

export const crmApi = new CrmApiClient();

// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { crmApi } from '../api/CrmApiClient';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      await crmApi.init();
      const userData = await crmApi.getCurrentUser();
      setUser(userData);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const result = await crmApi.login(username, password);
      if (result.success) {
        setUser(result.user);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const logout = async () => {
    await crmApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export const LoginScreen = ({ navigation }: any) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const success = await login(username, password);
    if (success) {
      navigation.replace('Home');
    } else {
      setError('登录失败,请检查用户名和密码');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>课程交付CRM系统</Text>
      <TextInput
        style={styles.input}
        placeholder="用户名/手机号/邮箱"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="密码"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="登录" onPress={handleLogin} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  error: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
});

// screens/OrderListScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { crmApi } from '../api/CrmApiClient';

export const OrderListScreen = ({ navigation }: any) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await crmApi.getOrders({});
      setOrders(data);
    } catch (error) {
      console.error('加载订单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOrder = ({ item }: any) => (
    <TouchableOpacity
      style={styles.orderItem}
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
    >
      <Text style={styles.orderTitle}>{item.customerName} - {item.courseName}</Text>
      <Text style={styles.orderInfo}>老师: {item.teacherName}</Text>
      <Text style={styles.orderInfo}>日期: {item.classDate}</Text>
      <Text style={styles.orderAmount}>¥{item.totalAmount}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item: any) => item.id.toString()}
        refreshing={loading}
        onRefresh={loadOrders}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderItem: {
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  orderInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 5,
  },
});

// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginScreen } from './screens/LoginScreen';
import { OrderListScreen } from './screens/OrderListScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // 或者显示加载界面
  }

  return (
    <Stack.Navigator>
      {user ? (
        <>
          <Stack.Screen name="Home" component={OrderListScreen} options={{ title: '订单列表' }} />
          {/* 其他已登录页面 */}
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
```

---

## 结语

本文档提供了课程交付CRM系统前端App对接的完整指南,涵盖了认证、API调用、错误处理等所有关键环节。通过遵循本文档的指引,您可以快速完成前端App与后台系统的集成,实现零配置对接。

如果您在对接过程中遇到任何问题,请随时联系技术支持团队。祝您开发顺利!

---

**文档版本**: v1.0  
**最后更新**: 2026-02-13  
**作者**: Manus AI
