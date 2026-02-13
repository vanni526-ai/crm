# 客户管理API接口文档 - 前端App开发

**文档版本:** v1.0  
**最后更新:** 2026-02-13  
**作者:** Manus AI  
**适用范围:** 瀛姬App前端开发

---

## 目录

1. [接口概述](#接口概述)
2. [认证方式](#认证方式)
3. [数据模型](#数据模型)
4. [客户列表接口](#客户列表接口)
5. [账户余额管理接口](#账户余额管理接口)
6. [账户流水查询接口](#账户流水查询接口)
7. [客户统计接口](#客户统计接口)
8. [错误码说明](#错误码说明)
9. [完整示例代码](#完整示例代码)

---

## 接口概述

本文档描述了课程交付CRM系统中客户管理相关的所有API接口,专门用于前端App开发。这些接口基于**tRPC框架**实现,采用类型安全的远程过程调用方式。所有接口均需要用户登录认证。

### 基础信息

| 项目 | 说明 |
|------|------|
| **协议** | HTTPS |
| **基础地址** | `https://crm.bdsm.com.cn` |
| **API路径前缀** | `/api/trpc/` |
| **请求方式** | POST (tRPC统一使用POST) |
| **数据格式** | JSON |
| **字符编码** | UTF-8 |
| **时区** | Asia/Shanghai (GMT+8) |

### 重要提示

- **固定地址**: 所有API请求必须使用固定地址 `https://crm.bdsm.com.cn`,不要使用开发环境的临时地址
- **Token传递**: 推荐通过URL查询参数传递Token (`?token=${token}`),可绕过Cloudflare限制
- **错误处理**: 所有接口返回的错误都遵循tRPC标准错误格式

---

## 认证方式

所有客户管理接口均需要通过JWT Token进行身份认证。前端App需要先调用登录接口获取Token,后续请求携带Token进行认证。

### 登录接口

**接口路径:** `auth.loginWithUserAccount`  
**完整URL:** `https://crm.bdsm.com.cn/api/trpc/auth.loginWithUserAccount`  
**请求方法:** POST

**请求参数:**

```typescript
{
  username: string;  // 用户名/手机号/邮箱(支持三种方式登录)
  password: string;  // 密码
}
```

**响应数据:**

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

### Token传递方式

后端支持**三种Token传递方式**,优先级从高到低:

#### 方式1: URL查询参数 (推荐)

```typescript
const token = await AsyncStorage.getItem('auth_token');
const url = `https://crm.bdsm.com.cn/api/trpc/customers.list?token=${token}`;

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ /* 请求参数 */ }),
});
```

**推荐原因:**
- 可以绕过Cloudflare的某些限制
- 兼容性最好,适用于所有HTTP客户端
- 无需修改请求头,配置简单

#### 方式2: Authorization Header

```typescript
fetch('https://crm.bdsm.com.cn/api/trpc/customers.list', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,  // Bearer Token
  },
  body: JSON.stringify({ /* 请求参数 */ }),
});
```

#### 方式3: X-Auth-Token Header (备选)

```typescript
fetch('https://crm.bdsm.com.cn/api/trpc/customers.list', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Auth-Token': `Bearer ${token}`,
  },
  body: JSON.stringify({ /* 请求参数 */ }),
});
```

---

## 数据模型

### Customer (客户)

客户基础信息数据结构。

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 客户ID |
| userId | number | 否 | 关联的用户ID(App用户) |
| name | string | 是 | 客户姓名 |
| phone | string | 否 | 手机号 |
| wechatId | string | 否 | 微信号 |
| accountBalance | string | 否 | 账户余额(单位:元) |
| totalSpent | string | 否 | 累计消费金额(单位:元) |
| classCount | number | 否 | 上课次数 |
| firstOrderDate | Date | 否 | 首次上课时间 |
| lastOrderDate | Date | 否 | 最后消费时间 |
| trafficSource | string | 否 | 流量来源 |
| notes | string | 否 | 备注 |
| createdBy | number | 是 | 创建人ID |
| createdAt | Date | 是 | 创建时间 |
| updatedAt | Date | 是 | 更新时间 |

### AccountTransaction (账户流水)

客户账户流水记录数据结构。

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 流水ID |
| customerId | number | 是 | 客户ID |
| type | string | 是 | 交易类型(recharge/consume/refund) |
| amount | string | 是 | 交易金额(单位:元) |
| balanceBefore | string | 是 | 交易前余额 |
| balanceAfter | string | 是 | 交易后余额 |
| orderId | number | 否 | 关联订单ID(消费/退款时) |
| orderNo | string | 否 | 关联订单号(消费/退款时) |
| notes | string | 否 | 备注 |
| operatorId | number | 是 | 操作人ID |
| operatorName | string | 是 | 操作人姓名 |
| createdAt | Date | 是 | 创建时间 |

**交易类型说明:**
- `recharge`: 充值
- `consume`: 消费(订单扣款)
- `refund`: 退款

---

## 客户列表接口

### 1. 获取客户列表

**接口名称:** `customers.list`  
**接口路径:** `https://crm.bdsm.com.cn/api/trpc/customers.list`  
**请求方法:** POST  
**认证要求:** 需要登录认证

**描述:** 获取客户列表,支持多种筛选条件和排序方式。

**请求参数:**

```typescript
{
  // 筛选条件
  minSpent?: number;              // 最小累计消费(单位:元)
  maxSpent?: number;              // 最大累计消费(单位:元)
  minClassCount?: number;         // 最小上课次数
  maxClassCount?: number;         // 最大上课次数
  lastConsumptionDays?: number;   // 最后消费天数(例如30表示30天内)
  trafficSource?: string;         // 流量来源(模糊匹配)
  
  // 快捷筛选
  highValue?: boolean;            // 高价值客户(累计消费>5000或上课次数>5)
  churned?: boolean;              // 流失客户(最后消费>30天且累计消费>0)
  
  // 排序
  sortBy?: "totalSpent" | "classCount" | "lastOrderDate" | "firstOrderDate" | "createdAt";
  sortOrder?: "asc" | "desc";     // 排序方向(默认desc)
}
```

**响应数据:**

```typescript
Customer[]  // 客户列表数组
```

**响应示例:**

```json
[
  {
    "id": 1,
    "userId": 10,
    "name": "张三",
    "phone": "13800138000",
    "wechatId": "zhangsan_wx",
    "accountBalance": "1500.00",
    "totalSpent": "8500.00",
    "classCount": 12,
    "firstOrderDate": "2024-01-15T00:00:00.000Z",
    "lastOrderDate": "2024-02-10T00:00:00.000Z",
    "trafficSource": "瀛姬沐沐",
    "notes": "VIP客户",
    "createdBy": 1,
    "createdAt": "2024-01-15T00:00:00.000Z",
    "updatedAt": "2024-02-10T00:00:00.000Z"
  },
  {
    "id": 2,
    "userId": null,
    "name": "李四",
    "phone": "13900139000",
    "wechatId": "lisi_wx",
    "accountBalance": "500.00",
    "totalSpent": "3200.00",
    "classCount": 5,
    "firstOrderDate": "2024-01-20T00:00:00.000Z",
    "lastOrderDate": "2024-02-08T00:00:00.000Z",
    "trafficSource": "朋友推荐",
    "notes": "",
    "createdBy": 1,
    "createdAt": "2024-01-20T00:00:00.000Z",
    "updatedAt": "2024-02-08T00:00:00.000Z"
  }
]
```

**使用示例 (React Native):**

```typescript
import { getApiClient } from '../lib/api-client';

// 获取所有客户
const getAllCustomers = async () => {
  const client = await getApiClient();
  const customers = await client.customers.list.query();
  return customers;
};

// 获取高价值客户
const getHighValueCustomers = async () => {
  const client = await getApiClient();
  const customers = await client.customers.list.query({
    highValue: true,
    sortBy: 'totalSpent',
    sortOrder: 'desc',
  });
  return customers;
};

// 获取流失客户
const getChurnedCustomers = async () => {
  const client = await getApiClient();
  const customers = await client.customers.list.query({
    churned: true,
    sortBy: 'lastOrderDate',
    sortOrder: 'asc',
  });
  return customers;
};

// 按累计消费筛选
const getCustomersBySpent = async (minSpent: number, maxSpent: number) => {
  const client = await getApiClient();
  const customers = await client.customers.list.query({
    minSpent,
    maxSpent,
    sortBy: 'totalSpent',
    sortOrder: 'desc',
  });
  return customers;
};
```

---

## 账户余额管理接口

### 2. 查询当前用户的账户余额

**接口名称:** `account.getMyBalance`  
**接口路径:** `https://crm.bdsm.com.cn/api/trpc/account.getMyBalance`  
**请求方法:** POST  
**认证要求:** 需要登录认证

**描述:** App用户查询自己的账户余额。系统会根据登录Token自动获取用户信息,并查询关联的业务客户账户余额。

**请求参数:** 无

**响应数据:**

```typescript
{
  success: boolean;
  data: {
    balance: string;        // 账户余额(单位:元)
    customerId: number | null;  // 客户ID(如果没有关联客户则为null)
    customerName: string | null; // 客户姓名
  }
}
```

**响应示例:**

```json
{
  "success": true,
  "data": {
    "balance": "1500.00",
    "customerId": 1,
    "customerName": "张三"
  }
}
```

**使用示例 (React Native):**

```typescript
import { getApiClient } from '../lib/api-client';

const getMyBalance = async () => {
  try {
    const client = await getApiClient();
    const result = await client.account.getMyBalance.query();
    
    if (result.success) {
      console.log('账户余额:', result.data.balance);
      console.log('客户ID:', result.data.customerId);
      console.log('客户姓名:', result.data.customerName);
      return result.data;
    }
  } catch (error) {
    console.error('查询余额失败:', error);
    throw error;
  }
};
```

### 3. 查询指定客户的账户余额 (管理员/销售)

**接口名称:** `account.getCustomerBalance`  
**接口路径:** `https://crm.bdsm.com.cn/api/trpc/account.getCustomerBalance`  
**请求方法:** POST  
**认证要求:** 需要登录认证

**描述:** 管理员或销售人员查询指定客户的账户余额。

**请求参数:**

```typescript
{
  customerId: number;  // 客户ID
}
```

**响应数据:**

```typescript
{
  success: boolean;
  data?: {
    balance: string;        // 账户余额
    customerId: number;     // 客户ID
    customerName: string;   // 客户姓名
  };
  error?: string;  // 错误信息(当success为false时)
}
```

**响应示例:**

```json
{
  "success": true,
  "data": {
    "balance": "1500.00",
    "customerId": 1,
    "customerName": "张三"
  }
}
```

**使用示例 (React Native):**

```typescript
const getCustomerBalance = async (customerId: number) => {
  const client = await getApiClient();
  const result = await client.account.getCustomerBalance.query({ customerId });
  
  if (result.success && result.data) {
    return result.data;
  } else {
    throw new Error(result.error || '查询失败');
  }
};
```

### 4. 客户充值 (管理员/销售操作)

**接口名称:** `account.recharge`  
**接口路径:** `https://crm.bdsm.com.cn/api/trpc/account.recharge`  
**请求方法:** POST  
**认证要求:** 需要登录认证

**描述:** 管理员或销售人员为客户充值。充值操作会自动记录账户流水。

**请求参数:**

```typescript
{
  customerId: number;     // 客户ID
  amount: number;         // 充值金额(必须大于0)
  notes?: string;         // 备注(可选)
}
```

**响应数据:**

```typescript
{
  success: boolean;
  data?: {
    balanceBefore: string;  // 充值前余额
    balanceAfter: string;   // 充值后余额
  };
  error?: string;  // 错误信息
}
```

**响应示例:**

```json
{
  "success": true,
  "data": {
    "balanceBefore": "1500.00",
    "balanceAfter": "2500.00"
  }
}
```

**使用示例 (React Native):**

```typescript
const rechargeCustomer = async (customerId: number, amount: number, notes?: string) => {
  const client = await getApiClient();
  const result = await client.account.recharge.mutate({
    customerId,
    amount,
    notes,
  });
  
  if (result.success && result.data) {
    console.log('充值成功');
    console.log('充值前余额:', result.data.balanceBefore);
    console.log('充值后余额:', result.data.balanceAfter);
    return result.data;
  } else {
    throw new Error(result.error || '充值失败');
  }
};
```

### 5. 客户退款 (管理员操作)

**接口名称:** `account.refund`  
**接口路径:** `https://crm.bdsm.com.cn/api/trpc/account.refund`  
**请求方法:** POST  
**认证要求:** 需要登录认证(仅管理员)

**描述:** 管理员为客户退款。退款操作会自动记录账户流水,并关联到原订单。

**请求参数:**

```typescript
{
  customerId: number;     // 客户ID
  amount: number;         // 退款金额(必须大于0)
  orderId: number;        // 关联的订单ID
  orderNo: string;        // 关联的订单号
}
```

**响应数据:**

```typescript
{
  success: boolean;
  data?: {
    balanceBefore: string;  // 退款前余额
    balanceAfter: string;   // 退款后余额
  };
  error?: string;  // 错误信息
}
```

**响应示例:**

```json
{
  "success": true,
  "data": {
    "balanceBefore": "1500.00",
    "balanceAfter": "2300.00"
  }
}
```

**使用示例 (React Native):**

```typescript
const refundCustomer = async (
  customerId: number,
  amount: number,
  orderId: number,
  orderNo: string
) => {
  const client = await getApiClient();
  const result = await client.account.refund.mutate({
    customerId,
    amount,
    orderId,
    orderNo,
  });
  
  if (result.success && result.data) {
    console.log('退款成功');
    console.log('退款前余额:', result.data.balanceBefore);
    console.log('退款后余额:', result.data.balanceAfter);
    return result.data;
  } else {
    throw new Error(result.error || '退款失败');
  }
};
```

---

## 账户流水查询接口

### 6. 查询当前用户的账户流水

**接口名称:** `account.getMyTransactions`  
**接口路径:** `https://crm.bdsm.com.cn/api/trpc/account.getMyTransactions`  
**请求方法:** POST  
**认证要求:** 需要登录认证

**描述:** App用户查询自己的账户流水记录,支持分页。

**请求参数:**

```typescript
{
  limit?: number;   // 每页数量(默认20)
  offset?: number;  // 偏移量(默认0)
}
```

**响应数据:**

```typescript
{
  success: boolean;
  data: {
    transactions: AccountTransaction[];  // 流水记录数组
    total: number;                       // 总记录数
  }
}
```

**响应示例:**

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1,
        "customerId": 1,
        "type": "recharge",
        "amount": "1000.00",
        "balanceBefore": "500.00",
        "balanceAfter": "1500.00",
        "orderId": null,
        "orderNo": null,
        "notes": "管理员充值",
        "operatorId": 1,
        "operatorName": "管理员",
        "createdAt": "2024-02-10T10:00:00.000Z"
      },
      {
        "id": 2,
        "customerId": 1,
        "type": "consume",
        "amount": "800.00",
        "balanceBefore": "1500.00",
        "balanceAfter": "700.00",
        "orderId": 123,
        "orderNo": "ORD20240210001",
        "notes": "订单消费",
        "operatorId": 1,
        "operatorName": "张三",
        "createdAt": "2024-02-11T14:30:00.000Z"
      }
    ],
    "total": 2
  }
}
```

**使用示例 (React Native):**

```typescript
import { useState, useEffect } from 'react';
import { getApiClient } from '../lib/api-client';

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const client = await getApiClient();
      const result = await client.account.getMyTransactions.query({
        limit: pageSize,
        offset: page * pageSize,
      });

      if (result.success) {
        setTransactions(result.data.transactions);
        setTotal(result.data.total);
      }
    } catch (error) {
      console.error('加载流水失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [page]);

  // 加载更多
  const loadMore = () => {
    if (transactions.length < total) {
      setPage(page + 1);
    }
  };

  return (
    // UI渲染...
  );
};
```

### 7. 查询指定客户的账户流水 (管理员/销售)

**接口名称:** `account.getCustomerTransactions`  
**接口路径:** `https://crm.bdsm.com.cn/api/trpc/account.getCustomerTransactions`  
**请求方法:** POST  
**认证要求:** 需要登录认证

**描述:** 管理员或销售人员查询指定客户的账户流水记录,支持分页。

**请求参数:**

```typescript
{
  customerId: number;  // 客户ID
  limit?: number;      // 每页数量(默认20)
  offset?: number;     // 偏移量(默认0)
}
```

**响应数据:**

```typescript
{
  success: boolean;
  data: {
    transactions: AccountTransaction[];  // 流水记录数组
    total: number;                       // 总记录数
  }
}
```

**响应示例:** (同上)

**使用示例 (React Native):**

```typescript
const getCustomerTransactions = async (
  customerId: number,
  limit: number = 20,
  offset: number = 0
) => {
  const client = await getApiClient();
  const result = await client.account.getCustomerTransactions.query({
    customerId,
    limit,
    offset,
  });

  if (result.success) {
    return result.data;
  } else {
    throw new Error('查询流水失败');
  }
};
```

---

## 客户统计接口

### 8. 刷新所有客户数据

**接口名称:** `customers.refreshAllStats`  
**接口路径:** `https://crm.bdsm.com.cn/api/trpc/customers.refreshAllStats`  
**请求方法:** POST  
**认证要求:** 需要登录认证

**描述:** 重新计算所有客户的累计消费、上课次数等统计数据。这是一个异步操作,会返回一个任务ID用于查询进度。

**请求参数:** 无

**响应数据:**

```typescript
{
  taskId: string;  // 任务ID,用于查询进度
}
```

**响应示例:**

```json
{
  "taskId": "task_1234567890"
}
```

**使用示例 (React Native):**

```typescript
const refreshCustomerStats = async () => {
  const client = await getApiClient();
  const result = await client.customers.refreshAllStats.mutate();
  console.log('刷新任务已启动,任务ID:', result.taskId);
  return result.taskId;
};
```

### 9. 查询任务进度

**接口名称:** `customers.getProgress`  
**接口路径:** `https://crm.bdsm.com.cn/api/trpc/customers.getProgress`  
**请求方法:** POST  
**认证要求:** 需要登录认证

**描述:** 查询异步任务的执行进度。

**请求参数:**

```typescript
{
  taskId: string;  // 任务ID
}
```

**响应数据:**

```typescript
{
  status: "pending" | "running" | "completed" | "failed";  // 任务状态
  progress?: number;      // 进度百分比(0-100)
  message?: string;       // 进度消息
  error?: string;         // 错误信息(失败时)
  current?: number;       // 当前处理数量
  total?: number;         // 总数量
}
```

**响应示例:**

```json
{
  "status": "running",
  "progress": 45,
  "message": "正在更新客户数据...",
  "current": 45,
  "total": 100
}
```

**使用示例 (React Native):**

```typescript
const checkTaskProgress = async (taskId: string) => {
  const client = await getApiClient();
  const progress = await client.customers.getProgress.query({ taskId });
  
  console.log('任务状态:', progress.status);
  console.log('进度:', progress.progress);
  console.log('消息:', progress.message);
  
  return progress;
};

// 轮询任务进度
const pollTaskProgress = async (taskId: string) => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const progress = await checkTaskProgress(taskId);
        
        if (progress.status === 'completed') {
          clearInterval(interval);
          resolve(progress);
        } else if (progress.status === 'failed') {
          clearInterval(interval);
          reject(new Error(progress.error || '任务失败'));
        }
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, 2000); // 每2秒查询一次
  });
};
```

---

## 错误码说明

### tRPC标准错误格式

所有接口返回的错误都遵循tRPC标准错误格式:

```typescript
{
  error: {
    code: string;     // 错误码
    message: string;  // 错误消息
    data?: any;       // 额外的错误数据
  }
}
```

### 常见错误码

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| `UNAUTHORIZED` | 未授权,Token无效或过期 | 清除Token,跳转到登录页面 |
| `FORBIDDEN` | 权限不足 | 提示用户权限不足 |
| `BAD_REQUEST` | 请求参数错误 | 检查请求参数是否正确 |
| `NOT_FOUND` | 资源不存在 | 提示用户资源不存在 |
| `INTERNAL_SERVER_ERROR` | 服务器内部错误 | 提示用户稍后重试 |
| `TIMEOUT` | 请求超时 | 提示用户网络超时,稍后重试 |

### 错误处理示例

```typescript
const handleApiError = (error: any) => {
  if (error.data?.code === 'UNAUTHORIZED') {
    // Token过期或无效,清除Token并跳转登录
    AsyncStorage.removeItem('auth_token');
    navigation.navigate('Login');
    Alert.alert('提示', '登录已过期,请重新登录');
  } else if (error.data?.code === 'FORBIDDEN') {
    Alert.alert('错误', '您没有权限执行此操作');
  } else if (error.data?.code === 'BAD_REQUEST') {
    Alert.alert('错误', error.message || '请求参数错误');
  } else if (error.data?.code === 'NOT_FOUND') {
    Alert.alert('错误', '资源不存在');
  } else {
    Alert.alert('错误', error.message || '操作失败,请稍后重试');
  }
};

// 使用示例
try {
  const result = await client.customers.list.query();
} catch (error) {
  handleApiError(error);
}
```

---

## 完整示例代码

### API客户端配置

```typescript
// lib/api-client.ts
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppRouter } from '../server/routers';

// 固定的API基础地址
const API_BASE_URL = 'https://crm.bdsm.com.cn';

// 创建tRPC客户端
export const createApiClient = async () => {
  // 从AsyncStorage获取Token
  const token = await AsyncStorage.getItem('auth_token');
  
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${API_BASE_URL}/api/trpc`,
        // 通过URL参数传递Token(推荐方式)
        fetch: (url, options) => {
          if (token) {
            const separator = url.toString().includes('?') ? '&' : '?';
            const urlWithToken = `${url}${separator}token=${token}`;
            return fetch(urlWithToken, options);
          }
          return fetch(url, options);
        },
        // 设置请求头
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    ],
  });
};

// 导出单例客户端
let apiClient: ReturnType<typeof createTRPCProxyClient<AppRouter>> | null = null;

export const getApiClient = async () => {
  if (!apiClient) {
    apiClient = await createApiClient();
  }
  return apiClient;
};

// 当Token更新时重新创建客户端
export const refreshApiClient = async () => {
  apiClient = await createApiClient();
  return apiClient;
};
```

### 客户管理页面示例

```typescript
// screens/CustomerManagementScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getApiClient } from '../lib/api-client';

interface Customer {
  id: number;
  name: string;
  phone: string;
  accountBalance: string;
  totalSpent: string;
  classCount: number;
  lastOrderDate: string;
}

export const CustomerManagementScreen = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'highValue' | 'churned'>('all');

  // 加载客户列表
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const client = await getApiClient();

      let queryParams = {};
      if (filter === 'highValue') {
        queryParams = { highValue: true, sortBy: 'totalSpent', sortOrder: 'desc' };
      } else if (filter === 'churned') {
        queryParams = { churned: true, sortBy: 'lastOrderDate', sortOrder: 'asc' };
      } else {
        queryParams = { sortBy: 'createdAt', sortOrder: 'desc' };
      }

      const result = await client.customers.list.query(queryParams);
      setCustomers(result);
    } catch (error: any) {
      console.error('加载客户列表失败:', error);
      Alert.alert('错误', error.message || '加载失败,请重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [filter]);

  // 下拉刷新
  const onRefresh = () => {
    setRefreshing(true);
    loadCustomers();
  };

  // 渲染客户项
  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={{
        padding: 16,
        backgroundColor: 'white',
        marginBottom: 8,
        borderRadius: 8,
      }}
      onPress={() => {
        // 跳转到客户详情页
        // navigation.navigate('CustomerDetail', { customerId: item.id });
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.name}</Text>
          <Text style={{ color: '#666', marginTop: 4 }}>{item.phone}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#007AFF' }}>
            ¥{item.accountBalance}
          </Text>
          <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
            余额
          </Text>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', marginTop: 12, gap: 16 }}>
        <View>
          <Text style={{ color: '#999', fontSize: 12 }}>累计消费</Text>
          <Text style={{ fontSize: 14, marginTop: 2 }}>¥{item.totalSpent}</Text>
        </View>
        <View>
          <Text style={{ color: '#999', fontSize: 12 }}>上课次数</Text>
          <Text style={{ fontSize: 14, marginTop: 2 }}>{item.classCount}次</Text>
        </View>
        <View>
          <Text style={{ color: '#999', fontSize: 12 }}>最后消费</Text>
          <Text style={{ fontSize: 14, marginTop: 2 }}>
            {item.lastOrderDate
              ? new Date(item.lastOrderDate).toLocaleDateString()
              : '无'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* 筛选按钮 */}
      <View style={{ flexDirection: 'row', padding: 16, gap: 8 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            padding: 12,
            backgroundColor: filter === 'all' ? '#007AFF' : 'white',
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={() => setFilter('all')}
        >
          <Text style={{ color: filter === 'all' ? 'white' : '#333' }}>
            全部客户
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{
            flex: 1,
            padding: 12,
            backgroundColor: filter === 'highValue' ? '#007AFF' : 'white',
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={() => setFilter('highValue')}
        >
          <Text style={{ color: filter === 'highValue' ? 'white' : '#333' }}>
            高价值客户
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{
            flex: 1,
            padding: 12,
            backgroundColor: filter === 'churned' ? '#007AFF' : 'white',
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={() => setFilter('churned')}
        >
          <Text style={{ color: filter === 'churned' ? 'white' : '#333' }}>
            流失客户
          </Text>
        </TouchableOpacity>
      </View>

      {/* 客户列表 */}
      <FlatList
        data={customers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCustomerItem}
        contentContainerStyle={{ padding: 16 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ color: '#999' }}>暂无客户数据</Text>
          </View>
        }
      />
    </View>
  );
};
```

### 账户余额页面示例

```typescript
// screens/AccountBalanceScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getApiClient } from '../lib/api-client';

interface Transaction {
  id: number;
  type: 'recharge' | 'consume' | 'refund';
  amount: string;
  balanceAfter: string;
  notes: string;
  createdAt: string;
}

export const AccountBalanceScreen = () => {
  const [balance, setBalance] = useState('0.00');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 加载余额和流水
  const loadData = async () => {
    try {
      const client = await getApiClient();

      // 查询余额
      const balanceResult = await client.account.getMyBalance.query();
      if (balanceResult.success) {
        setBalance(balanceResult.data.balance);
      }

      // 查询流水
      const transactionsResult = await client.account.getMyTransactions.query({
        limit: 50,
        offset: 0,
      });
      if (transactionsResult.success) {
        setTransactions(transactionsResult.data.transactions);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // 获取交易类型显示文本
  const getTypeText = (type: string) => {
    switch (type) {
      case 'recharge':
        return '充值';
      case 'consume':
        return '消费';
      case 'refund':
        return '退款';
      default:
        return type;
    }
  };

  // 获取交易类型颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'recharge':
      case 'refund':
        return '#52C41A'; // 绿色(收入)
      case 'consume':
        return '#FF4D4F'; // 红色(支出)
      default:
        return '#333';
    }
  };

  // 渲染流水项
  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <View
      style={{
        padding: 16,
        backgroundColor: 'white',
        marginBottom: 8,
        borderRadius: 8,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
            {getTypeText(item.type)}
          </Text>
          <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
          {item.notes && (
            <Text style={{ color: '#666', fontSize: 14, marginTop: 4 }}>
              {item.notes}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: getTypeColor(item.type),
            }}
          >
            {item.type === 'consume' ? '-' : '+'}¥{item.amount}
          </Text>
          <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
            余额: ¥{item.balanceAfter}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* 余额卡片 */}
      <View
        style={{
          backgroundColor: '#007AFF',
          padding: 24,
          margin: 16,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: 'white', fontSize: 14, opacity: 0.8 }}>
          账户余额
        </Text>
        <Text
          style={{
            color: 'white',
            fontSize: 36,
            fontWeight: 'bold',
            marginTop: 8,
          }}
        >
          ¥{balance}
        </Text>
      </View>

      {/* 流水列表 */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
          账户流水
        </Text>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTransactionItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: '#999' }}>暂无流水记录</Text>
            </View>
          }
        />
      </View>
    </View>
  );
};
```

---

## 附录

### A. 快速开始清单

1. ✅ 配置API基础地址: `https://crm.bdsm.com.cn`
2. ✅ 实现Token存储和传递机制(推荐URL参数方式)
3. ✅ 创建tRPC客户端配置文件
4. ✅ 实现登录功能并保存Token
5. ✅ 实现错误处理和Token过期自动跳转
6. ✅ 开始调用客户管理相关接口

### B. 调试技巧

1. **使用网络调试工具**: React Native Debugger、Flipper、Charles Proxy
2. **添加详细日志**: 在API调用前后打印请求参数和响应数据
3. **检查Token有效性**: 先调用`auth.me`接口验证Token
4. **使用Postman测试**: 可以先在Postman中测试API接口
5. **查看后端日志**: 如果有权限,可以查看后端服务器日志

### C. 性能优化建议

1. **使用分页**: 列表接口支持分页,避免一次性加载大量数据
2. **实现缓存**: 对不常变化的数据(如客户列表)实现本地缓存
3. **防抖和节流**: 对搜索、筛选等操作实现防抖或节流
4. **懒加载**: 使用FlatList的懒加载功能,提升列表性能
5. **离线支持**: 考虑实现离线数据缓存,提升用户体验

### D. 安全建议

1. **Token安全存储**: 使用AsyncStorage安全存储Token
2. **HTTPS通信**: 所有API请求必须使用HTTPS
3. **Token过期处理**: 实现Token过期自动跳转登录
4. **敏感信息加密**: 对敏感信息(如密码)进行加密传输
5. **防止中间人攻击**: 实现证书锁定(Certificate Pinning)

---

**文档版本:** v1.0  
**创建时间:** 2026-02-13  
**作者:** Manus AI  
**适用范围:** 瀛姬App前端开发

如有任何问题或需要补充的内容,请联系后端开发团队。
