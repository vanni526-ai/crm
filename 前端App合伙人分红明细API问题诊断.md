# 前端App合伙人分红明细API问题诊断和解决方案

**问题报告时间:** 2026-02-13  
**问题截图分析:** 前端App在访问合伙人分红明细页面时遇到401 Unauthorized错误  
**错误URL:** `https://3008-irdoay10osn1nh8z3rz11-af676c2c.sg1.manus.computer/api/trpc/cit.input=...`

---

## 一、问题根本原因分析

通过分析错误截图和后端代码,发现以下关键问题:

### 1.1 API路由名称错误

**错误的API调用:**
```
GET /api/trpc/cit.input=...
```

**问题分析:**
- 前端App调用的API路由是 `cit`,但后端并没有定义这个路由
- 从错误URL看,这可能是一个拼写错误或者前端代码中的路由名称配置错误
- 正确的合伙人分红相关API路由应该是 `partnerManagement.*`

### 1.2 Token认证问题

**从截图中看到:**
```
[Commission] Token in AsyncStorage: eyJhbGci0iJIUzI1NiIs...
```

**问题分析:**
- 前端App已经在AsyncStorage中存储了Token
- 但是API请求返回401 Unauthorized,说明Token没有正确传递到后端
- 或者Token的传递方式不符合后端的验证要求

### 1.3 API地址问题

**错误的API地址:**
```
https://3008-irdoay10osn1nh8z3rz11-af676c2c.sg1.manus.computer
```

**问题分析:**
- 前端App使用的是开发环境的临时地址(3008端口)
- 这个地址会随着沙盒重启而变化,不应该在生产环境使用
- **正确的固定地址应该是:** `https://crm.bdsm.com.cn`

---

## 二、正确的API接口信息

### 2.1 合伙人分红明细相关API

根据后端代码和API文档,合伙人分红明细的正确API路由为:

#### 获取合伙人分红流水记录
**接口路径:** `partnerManagement.getProfitRecords`  
**完整URL:** `https://crm.bdsm.com.cn/api/trpc/partnerManagement.getProfitRecords`  
**请求方法:** POST  
**认证要求:** 需要登录认证(protectedProcedure)

**请求参数:**
```typescript
{
  partnerId: number;                        // 必填，合伙人ID
  status?: "pending" | "completed" | "failed";  // 可选，状态筛选
  startDate?: string;                       // 可选，起始日期（YYYY-MM-DD）
  endDate?: string;                         // 可选，结束日期（YYYY-MM-DD）
}
```

**响应示例:**
```json
[
  {
    "id": 1,
    "partnerId": 1,
    "expenseId": 1,
    "amount": "14250.00",
    "transferDate": "2024-02-10",
    "transferMethod": "wechat",
    "transactionNo": "WX20240210123456",
    "status": "completed",
    "notes": "1月份分红",
    "recordedBy": 1,
    "createdAt": "2024-02-10T00:00:00.000Z"
  }
]
```

#### 获取合伙人费用明细
**接口路径:** `partnerManagement.getExpensesByPartner`  
**完整URL:** `https://crm.bdsm.com.cn/api/trpc/partnerManagement.getExpensesByPartner`  
**请求方法:** POST  
**认证要求:** 需要登录认证(protectedProcedure)

**请求参数:**
```typescript
{
  partnerId: number;        // 必填，合伙人ID
  startDate?: string;       // 可选，起始日期（YYYY-MM-DD）
  endDate?: string;         // 可选，结束日期（YYYY-MM-DD）
}
```

---

## 三、Token认证的正确传递方式

后端支持**三种Token传递方式**,优先级从高到低为:

### 3.1 方式1: URL查询参数(推荐)

```typescript
const token = await AsyncStorage.getItem('auth_token');
const url = `https://crm.bdsm.com.cn/api/trpc/partnerManagement.getProfitRecords?token=${token}`;

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    partnerId: 1,
    // 其他参数...
  }),
});
```

**为什么推荐这种方式:**
- 可以绕过Cloudflare的某些限制
- 兼容性最好,适用于所有HTTP客户端
- 无需修改请求头,配置简单

### 3.2 方式2: Authorization Header

```typescript
const token = await AsyncStorage.getItem('auth_token');

const response = await fetch('https://crm.bdsm.com.cn/api/trpc/partnerManagement.getProfitRecords', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,  // 注意Bearer前缀
  },
  body: JSON.stringify({
    partnerId: 1,
    // 其他参数...
  }),
});
```

### 3.3 方式3: X-Auth-Token Header(备选)

```typescript
const token = await AsyncStorage.getItem('auth_token');

const response = await fetch('https://crm.bdsm.com.cn/api/trpc/partnerManagement.getProfitRecords', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Auth-Token': `Bearer ${token}`,
  },
  body: JSON.stringify({
    partnerId: 1,
    // 其他参数...
  }),
});
```

---

## 四、前端App需要修改的地方

### 4.1 修改API基础地址

**错误的配置:**
```typescript
const API_BASE_URL = 'https://3008-irdoay10osn1nh8z3rz11-af676c2c.sg1.manus.computer';
```

**正确的配置:**
```typescript
const API_BASE_URL = 'https://crm.bdsm.com.cn';
```

### 4.2 修改API路由名称

**错误的调用:**
```typescript
// 假设前端代码中有类似这样的调用
trpc.cit.query({ ... });
```

**正确的调用:**
```typescript
// 获取合伙人分红流水记录
trpc.partnerManagement.getProfitRecords.query({
  partnerId: 1,
  status: 'completed',
  // ...
});

// 获取合伙人费用明细
trpc.partnerManagement.getExpensesByPartner.query({
  partnerId: 1,
  // ...
});
```

### 4.3 确保Token正确传递

**推荐的实现方式:**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// 创建API客户端时配置Token传递
const createApiClient = async () => {
  const token = await AsyncStorage.getItem('auth_token');
  
  return createTRPCProxyClient({
    links: [
      httpBatchLink({
        url: 'https://crm.bdsm.com.cn/api/trpc',
        // 方式1: 通过URL参数传递Token(推荐)
        fetch: (url, options) => {
          const urlWithToken = `${url}${url.includes('?') ? '&' : '?'}token=${token}`;
          return fetch(urlWithToken, options);
        },
        // 或者方式2: 通过Header传递Token
        headers: () => ({
          'Authorization': `Bearer ${token}`,
        }),
      }),
    ],
  });
};
```

---

## 五、完整的修复示例代码

### 5.1 API客户端配置文件

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

### 5.2 合伙人分红明细页面调用示例

```typescript
// screens/CommissionScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { getApiClient } from '../lib/api-client';

interface ProfitRecord {
  id: number;
  partnerId: number;
  amount: string;
  transferDate: string;
  transferMethod: string;
  status: string;
  notes: string;
}

export const CommissionScreen = ({ partnerId }: { partnerId: number }) => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ProfitRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfitRecords();
  }, [partnerId]);

  const loadProfitRecords = async () => {
    try {
      setLoading(true);
      setError(null);

      // 获取API客户端
      const client = await getApiClient();

      // 调用正确的API接口
      const result = await client.partnerManagement.getProfitRecords.query({
        partnerId: partnerId,
        status: 'completed', // 只显示已完成的分红
      });

      setRecords(result);
    } catch (err: any) {
      console.error('加载分红记录失败:', err);
      setError(err.message || '加载失败,请重试');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>加载中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
              ¥{item.amount}
            </Text>
            <Text style={{ color: '#666' }}>
              转账日期: {item.transferDate}
            </Text>
            <Text style={{ color: '#666' }}>
              转账方式: {item.transferMethod}
            </Text>
            {item.notes && (
              <Text style={{ color: '#999', marginTop: 4 }}>
                备注: {item.notes}
              </Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ color: '#999' }}>暂无分红记录</Text>
          </View>
        }
      />
    </View>
  );
};
```

---

## 六、调试建议

### 6.1 检查Token是否有效

```typescript
// 在调用API前先检查Token
const checkToken = async () => {
  const token = await AsyncStorage.getItem('auth_token');
  console.log('Token:', token);
  
  if (!token) {
    console.error('Token不存在,需要重新登录');
    // 跳转到登录页面
    return false;
  }
  
  // 验证Token是否过期
  try {
    const client = await getApiClient();
    const user = await client.auth.me.query();
    console.log('当前用户:', user);
    return true;
  } catch (err) {
    console.error('Token验证失败:', err);
    // Token过期或无效,需要重新登录
    return false;
  }
};
```

### 6.2 使用网络调试工具

推荐使用以下工具查看实际的API请求:

1. **React Native Debugger** - 可以查看所有网络请求
2. **Flipper** - Facebook官方的调试工具,支持网络请求监控
3. **Charles Proxy** - 抓包工具,可以查看HTTPS请求详情

### 6.3 添加详细的错误日志

```typescript
const loadProfitRecords = async () => {
  try {
    console.log('[API] 开始加载分红记录');
    console.log('[API] partnerId:', partnerId);
    
    const client = await getApiClient();
    console.log('[API] 客户端创建成功');
    
    const result = await client.partnerManagement.getProfitRecords.query({
      partnerId: partnerId,
    });
    console.log('[API] 请求成功,记录数:', result.length);
    
    setRecords(result);
  } catch (err: any) {
    console.error('[API] 请求失败:', err);
    console.error('[API] 错误详情:', JSON.stringify(err, null, 2));
    
    // 检查是否是认证错误
    if (err.data?.code === 'UNAUTHORIZED') {
      console.error('[API] 认证失败,需要重新登录');
      // 清除Token并跳转到登录页面
      await AsyncStorage.removeItem('auth_token');
      // navigation.navigate('Login');
    }
    
    setError(err.message || '加载失败');
  }
};
```

---

## 七、常见问题FAQ

### Q1: 为什么我的Token存储了但还是返回401?

**A:** 可能的原因:
1. Token没有正确传递到后端(检查URL参数或Header)
2. Token格式不正确(确保包含`Bearer `前缀,如果使用Header方式)
3. Token已过期(默认有效期7天,需要重新登录)
4. API地址错误(确保使用固定地址`https://crm.bdsm.com.cn`)

### Q2: 如何判断是Token问题还是API路由问题?

**A:** 按以下步骤排查:
1. 先调用`auth.me`接口验证Token是否有效
2. 如果`auth.me`返回401,说明是Token问题
3. 如果`auth.me`正常但其他接口401,检查API路由名称是否正确

### Q3: 开发环境和生产环境的API地址如何切换?

**A:** 建议使用环境变量:
```typescript
const API_BASE_URL = __DEV__ 
  ? 'https://3000-xxx.manus.computer/api/proxy'  // 开发环境(通过代理)
  : 'https://crm.bdsm.com.cn';                   // 生产环境(固定地址)
```

### Q4: 如何处理Token过期的情况?

**A:** 实现自动刷新机制:
```typescript
const apiCall = async (fn: () => Promise<any>) => {
  try {
    return await fn();
  } catch (err: any) {
    if (err.data?.code === 'UNAUTHORIZED') {
      // Token过期,清除并跳转登录
      await AsyncStorage.removeItem('auth_token');
      navigation.navigate('Login');
    }
    throw err;
  }
};
```

---

## 八、总结

**核心问题:**
1. API路由名称错误: `cit` → `partnerManagement.getProfitRecords`
2. API地址错误: 临时地址 → 固定地址`https://crm.bdsm.com.cn`
3. Token传递方式: 需要通过URL参数或Header正确传递

**修复步骤:**
1. 修改API基础地址为`https://crm.bdsm.com.cn`
2. 修改API路由调用为`partnerManagement.getProfitRecords`
3. 确保Token通过URL参数传递(推荐)或Authorization Header传递
4. 添加Token验证和错误处理逻辑

**参考文档:**
- `/home/ubuntu/course_crm/FRONTEND_APP_INTEGRATION_GUIDE.md` - 前端App集成指南
- `/home/ubuntu/course_crm/合伙人管理API接口文档.md` - 合伙人管理API文档

---

**文档版本:** v1.0  
**创建时间:** 2026-02-13  
**作者:** Manus AI
