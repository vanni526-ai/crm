# 前端App测试账号

**文档版本:** 2.0 (已更新)  
**更新日期:** 2026-02-04  
**状态:** ✅ 已验证可用

---

## 测试账号信息

### 测试账号1 (推荐使用)

| 字段 | 值 |
|------|-----|
| **用户名** | `appuser` |
| **手机号** | `13800138001` ⚠️ 已更新(原为13800138000) |
| **邮箱** | `appuser@test.com` |
| **密码** | `123456` |
| **角色** | user (普通用户) |
| **状态** | 启用 |

### 测试账号2

| 字段 | 值 |
|------|-----|
| **用户名** | `testuser` |
| **手机号** | `13900139000` |
| **邮箱** | `testuser@test.com` |
| **密码** | `123456` ⚠️ 已更新(原为test123) |
| **角色** | user (普通用户) |
| **状态** | 启用 |

---

## 重要变更说明

### ⚠️ 账号信息已更新

1. **appuser手机号变更**: 
   - 原手机号`13800138000`已被管理员账号占用
   - 新手机号`13800138001`
   - **建议使用用户名或邮箱登录**

2. **testuser密码变更**:
   - 原密码`test123`已统一更新为`123456`
   - 所有测试账号密码统一为`123456`

3. **验证状态**: ✅ 所有账号已通过登录测试验证

---

## 登录方式

系统支持以下三种登录方式(任选其一):

1. **用户名登录** (推荐)
   ```
   username: appuser
   password: 123456
   ```

2. **手机号登录**
   ```
   username: 13800138001
   password: 123456
   ```

3. **邮箱登录**
   ```
   username: appuser@test.com
   password: 123456
   ```

---

## 登录接口说明

### 接口信息

- **接口路径**: `/api/trpc/auth.loginWithUserAccount`
- **请求方法**: `POST`
- **完整URL**: `https://crm.bdsm.com.cn/api/trpc/auth.loginWithUserAccount?batch=1`
- **Content-Type**: `application/json`

### 请求格式

```json
{
  "0": {
    "json": {
      "username": "appuser",
      "password": "123456"
    }
  }
}
```

**参数说明**:
- `username`: 用户名/手机号/邮箱(任选其一)
- `password`: 密码

### 成功响应

```json
[
  {
    "result": {
      "data": {
        "json": {
          "success": true,
          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "user": {
            "id": 14430230,
            "openId": "test_app_user_001",
            "name": "appuser",
            "nickname": "App测试用户",
            "email": "appuser@test.com",
            "phone": "13800138001",
            "role": "user",
            "isActive": true
          }
        }
      }
    }
  }
]
```

**响应字段说明**:
- `success`: 登录是否成功
- `token`: JWT认证令牌(有效期24小时)
- `user`: 用户信息对象
  - `id`: 用户ID
  - `name`: 用户名
  - `phone`: 手机号
  - `email`: 邮箱
  - `role`: 用户角色
  - `isActive`: 账号是否启用

### 失败响应

```json
[
  {
    "error": {
      "json": {
        "message": "用户名或密码错误",
        "code": -32603,
        "data": {
          "code": "INTERNAL_SERVER_ERROR",
          "httpStatus": 500
        }
      }
    }
  }
]
```

---

## 前端集成示例

### 方式1: 使用tRPC客户端(推荐)

```typescript
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/routers';

// 创建tRPC客户端
const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'https://crm.bdsm.com.cn/api/trpc',
    }),
  ],
});

// 登录函数
async function login(username: string, password: string) {
  try {
    const result = await trpc.auth.loginWithUserAccount.mutate({
      username,
      password,
    });

    if (result.success) {
      console.log('登录成功!');
      console.log('Token:', result.token);
      console.log('用户信息:', result.user);

      // 保存Token到本地存储
      await AsyncStorage.setItem('authToken', result.token);
      await AsyncStorage.setItem('user', JSON.stringify(result.user));

      return { success: true, user: result.user, token: result.token };
    } else {
      console.log('登录失败');
      return { success: false, error: '登录失败' };
    }
  } catch (error) {
    console.error('登录错误:', error);
    return { success: false, error: error.message };
  }
}

// 使用示例
const result = await login('appuser', '123456');
if (result.success) {
  // 登录成功,跳转到主页
  navigation.navigate('Home');
}
```

### 方式2: 使用fetch API

```typescript
async function loginWithFetch(username: string, password: string) {
  try {
    const response = await fetch(
      'https://crm.bdsm.com.cn/api/trpc/auth.loginWithUserAccount?batch=1',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "0": {
            "json": {
              "username": username,
              "password": password
            }
          }
        }),
      }
    );

    const data = await response.json();

    if (data[0]?.result?.data?.json?.success) {
      const { token, user } = data[0].result.data.json;
      console.log('登录成功!');
      console.log('Token:', token);
      console.log('用户信息:', user);

      // 保存Token
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      return { success: true, user, token };
    } else if (data[0]?.error) {
      console.log('登录失败:', data[0].error.json.message);
      return { success: false, error: data[0].error.json.message };
    } else {
      return { success: false, error: '未知错误' };
    }
  } catch (error) {
    console.error('登录错误:', error);
    return { success: false, error: error.message };
  }
}

// 使用示例
const result = await loginWithFetch('appuser', '123456');
```

---

## Token使用说明

### 1. Token有效期

- **有效期**: 24小时
- **过期处理**: Token过期后需要重新登录
- **刷新机制**: 当前版本不支持Token刷新

### 2. Token验证

登录成功后,后续API请求会自动携带Token(通过Cookie):

```typescript
// tRPC会自动处理Token,无需手动添加
const orders = await trpc.orders.list.query();
```

### 3. 获取当前用户信息

```typescript
// 使用tRPC
const currentUser = await trpc.auth.me.query();
console.log('当前用户:', currentUser);
```

### 4. 登出

```typescript
// 使用tRPC
await trpc.auth.logout.mutate();

// 清除本地存储
await AsyncStorage.removeItem('authToken');
await AsyncStorage.removeItem('user');
```

---

## 测试流程建议

### 1. 登录测试

```typescript
// 测试用户名登录
await login('appuser', '123456');

// 测试手机号登录
await login('13800138001', '123456');

// 测试邮箱登录
await login('appuser@test.com', '123456');
```

### 2. 下单测试

登录成功后,测试创建订单:

```typescript
const order = await trpc.orders.create.mutate({
  customerName: '测试客户',
  customerPhone: '13900000000',
  courseName: '测试课程',
  courseDate: '2026-02-10',
  deliveryCity: '上海',
  deliveryClassroom: '上海404',
  teacherName: '测试老师1',
  amount: 1000,
  paymentChannel: '微信',
  // ... 其他订单字段
});

console.log('订单创建成功:', order);
```

### 3. 查询订单测试

```typescript
// 查询订单列表
const orders = await trpc.orders.list.query({
  page: 1,
  pageSize: 10,
});

console.log('订单列表:', orders);

// 查询订单详情
const orderDetail = await trpc.orders.getById.query({ id: order.id });
console.log('订单详情:', orderDetail);
```

---

## 常见问题

### Q1: 为什么appuser的手机号不是13800138000?

**A**: 原手机号已被管理员账号占用,为避免冲突使用了新手机号`13800138001`。建议使用**用户名**或**邮箱**登录。

### Q2: Token过期后如何处理?

**A**: Token过期后会返回401错误,需要重新调用登录接口获取新Token。建议在App中实现自动重新登录机制。

### Q3: 是否支持记住登录状态?

**A**: 可以将Token保存到本地存储(AsyncStorage),下次启动App时检查Token是否有效,如果有效则自动登录。

### Q4: 密码是否区分大小写?

**A**: 是的,密码区分大小写。`123456`和`123456`是不同的密码。

### Q5: 是否支持注册新用户?

**A**: 当前版本不支持用户注册功能。如需测试账号,请联系管理员创建。

---

## 安全建议

1. **不要在生产环境使用测试账号**: 这些账号仅用于开发和测试
2. **不要在代码中硬编码密码**: 使用环境变量或配置文件
3. **Token安全存储**: 使用加密存储(如react-native-keychain)保存Token
4. **定期更换测试账号密码**: 避免长期使用相同密码
5. **限制测试账号权限**: 测试账号应只有user角色,不应有admin权限

---

## 相关文档

- [前端App订单和支付API文档](/home/ubuntu/course_crm/前端App订单和支付API文档.md)
- [教室管理API文档](/home/ubuntu/course_crm/教室管理API文档.md)
- [前端App登录问题修复报告](/home/ubuntu/course_crm/前端App登录问题修复报告.md)

---

**文档更新时间:** 2026-02-04 14:20:00 GMT+8  
**验证状态:** ✅ 所有账号已通过登录测试  
**可用性:** ✅ 前端App可以正常对接使用
