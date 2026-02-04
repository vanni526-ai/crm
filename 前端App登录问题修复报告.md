# 前端App登录问题修复报告

**文档版本:** 1.0  
**修复日期:** 2026-02-04  
**状态:** ✅ 已修复并验证

---

## 问题概述

前端移动端App在对接后端登录接口时遇到以下问题:

1. **用户名`appuser`不存在** - 登录失败,提示"用户名不存在"
2. **手机号`13800138000`密码错误** - 登录失败,提示"密码错误"
3. **测试账号密码不匹配** - 文档中提供的密码与实际数据库中的密码不一致

---

## 问题原因分析

### 1. appuser账号创建失败

**原因**: 之前的账号创建脚本虽然显示"账号已存在",但实际上数据库中并没有创建`appuser`账号。

**数据库查询结果**:
```sql
SELECT * FROM users WHERE name = 'appuser';
-- 返回: 0 rows (账号不存在)
```

### 2. 手机号冲突

**原因**: 手机号`13800138000`已经被两个账号占用:
- `admin` (管理员账号)
- `test_user_management` (测试用户账号)

**数据库查询结果**:
```sql
SELECT id, name, phone FROM users WHERE phone = '13800138000';
-- 返回:
-- | id       | name                  | phone        |
-- |----------|-----------------------|--------------|
-- | 13860030 | admin                 | 13800138000  |
-- | 13860073 | test_user_management  | 13800138000  |
```

### 3. 密码不匹配

**原因**: `testuser`账号的实际密码是`test123`,而文档中提供的密码是`123456`。

**密码验证测试结果**:
```
testuser / test123  ✅ 验证成功
testuser / 123456   ❌ 验证失败
```

---

## 修复方案

### 1. 创建appuser账号

使用新的手机号`13800138001`避免冲突,创建完整的`appuser`测试账号:

```javascript
// 创建账号
INSERT INTO users (
  openId, name, nickname, email, phone, 
  password, role, isActive, createdAt, updatedAt, lastSignedIn
) VALUES (
  'test_app_user_001',
  'appuser',
  'App测试用户',
  'appuser@test.com',
  '13800138001',
  '$2b$10$...',  // bcrypt加密后的密码(123456)
  'user',
  true,
  NOW(), NOW(), NOW()
);
```

### 2. 更新testuser密码

将`testuser`账号的密码统一更新为`123456`:

```javascript
// 更新密码
UPDATE users 
SET password = '$2b$10$...',  // bcrypt加密后的密码(123456)
    updatedAt = NOW()
WHERE name = 'testuser';
```

### 3. 验证所有测试账号

运行密码验证测试,确保所有账号可以正常登录:

```
✅ appuser / 123456 - 验证成功
✅ 13800138001 / 123456 - 验证成功
✅ testuser / 123456 - 验证成功
✅ 13900139000 / 123456 - 验证成功
```

---

## 修复后的测试账号信息

### 测试账号1 (推荐使用)

| 字段 | 值 |
|------|-----|
| **用户名** | `appuser` |
| **手机号** | `13800138001` ⚠️ 已更新 |
| **邮箱** | `appuser@test.com` |
| **密码** | `123456` |
| **角色** | user |
| **状态** | 启用 |

### 测试账号2

| 字段 | 值 |
|------|-----|
| **用户名** | `testuser` |
| **手机号** | `13900139000` |
| **邮箱** | `testuser@test.com` |
| **密码** | `123456` ⚠️ 已更新 |
| **角色** | user |
| **状态** | 启用 |

---

## 登录测试验证

### 测试环境

- **后端API地址**: `https://crm.bdsm.com.cn`
- **登录接口**: `POST /api/trpc/auth.loginWithUserAccount`
- **测试时间**: 2026-02-04 14:18:55 GMT+8

### 测试用例1: 用户名登录

**请求**:
```json
POST /api/trpc/auth.loginWithUserAccount?batch=1
Content-Type: application/json

{
  "0": {
    "json": {
      "username": "appuser",
      "password": "123456"
    }
  }
}
```

**响应**:
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

**测试结果**: ✅ 登录成功

### 测试用例2: 手机号登录

**请求**:
```json
{
  "0": {
    "json": {
      "username": "13800138001",
      "password": "123456"
    }
  }
}
```

**测试结果**: ✅ 登录成功 (返回相同的用户信息)

### 测试用例3: 邮箱登录

**请求**:
```json
{
  "0": {
    "json": {
      "username": "appuser@test.com",
      "password": "123456"
    }
  }
}
```

**测试结果**: ✅ 登录成功 (返回相同的用户信息)

---

## 前端集成建议

### 1. 使用tRPC客户端(推荐)

```typescript
import { createTRPCClient, httpBatchLink } from '@trpc/client';

const trpc = createTRPCClient({
  links: [
    httpBatchLink({
      url: 'https://crm.bdsm.com.cn/api/trpc',
    }),
  ],
});

// 登录
const result = await trpc.auth.loginWithUserAccount.mutate({
  username: 'appuser',
  password: '123456',
});

if (result.success) {
  console.log('登录成功!');
  console.log('Token:', result.token);
  console.log('用户信息:', result.user);
  
  // 保存Token到本地存储
  await AsyncStorage.setItem('authToken', result.token);
  await AsyncStorage.setItem('user', JSON.stringify(result.user));
}
```

### 2. 使用fetch API

```typescript
const response = await fetch('https://crm.bdsm.com.cn/api/trpc/auth.loginWithUserAccount?batch=1', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    "0": {
      "json": {
        "username": "appuser",
        "password": "123456"
      }
    }
  })
});

const data = await response.json();

if (data[0]?.result?.data?.json?.success) {
  const { token, user } = data[0].result.data.json;
  console.log('登录成功!');
  console.log('Token:', token);
  console.log('用户信息:', user);
}
```

### 3. Token使用

登录成功后,后续所有需要认证的API请求都需要携带Token:

```typescript
// 方式1: 使用Cookie(自动携带)
// tRPC会自动设置Cookie,无需手动处理

// 方式2: 使用Authorization Header
const response = await fetch('https://crm.bdsm.com.cn/api/trpc/orders.create?batch=1', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`  // 如果后端支持
  },
  body: JSON.stringify({
    "0": {
      "json": {
        // 订单数据
      }
    }
  })
});
```

---

## 常见问题解答

### Q1: 为什么appuser的手机号变成了13800138001?

**A**: 原手机号`13800138000`已被管理员账号占用,为避免冲突,使用了新手机号`13800138001`。前端App应使用**用户名**或**邮箱**登录,而不是手机号。

### Q2: Token的有效期是多久?

**A**: JWT Token的有效期是**24小时**。过期后需要重新登录获取新Token。

### Q3: 如何判断Token是否过期?

**A**: 
1. 解析JWT Token查看`exp`字段(过期时间戳)
2. 或者在API请求失败时检查错误码,如果是401 Unauthorized则表示Token过期

### Q4: 是否支持刷新Token?

**A**: 当前版本不支持刷新Token。Token过期后需要重新登录。

### Q5: 密码是否区分大小写?

**A**: 是的,密码区分大小写。`123456`和`123456`是不同的密码。

---

## 后续优化建议

1. **实现Token刷新机制**: 避免用户频繁重新登录
2. **添加记住登录状态**: 使用Refresh Token延长登录有效期
3. **实现注册功能**: 允许用户自主注册账号
4. **添加密码重置功能**: 支持忘记密码找回
5. **实现第三方登录**: 支持微信、支付宝等第三方登录方式

---

## 附录

### A. 数据库表结构

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openId VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  nickname VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  password VARCHAR(255),  -- bcrypt加密
  role ENUM('admin', 'sales', 'finance', 'user') DEFAULT 'user',
  isActive BOOLEAN DEFAULT true,
  createdAt DATETIME,
  updatedAt DATETIME,
  lastSignedIn DATETIME
);
```

### B. 密码加密方式

使用**bcrypt**算法,加密强度为10轮:

```javascript
import bcrypt from 'bcryptjs';

// 加密密码
const hashedPassword = await bcrypt.hash('123456', 10);

// 验证密码
const isMatch = await bcrypt.compare('123456', hashedPassword);
```

### C. 相关文档

- [前端App测试账号文档](/home/ubuntu/course_crm/前端App测试账号.md)
- [订单和支付API文档](/home/ubuntu/course_crm/前端App订单和支付API文档.md)
- [教室管理API文档](/home/ubuntu/course_crm/教室管理API文档.md)

---

**修复完成时间:** 2026-02-04 14:19:00 GMT+8  
**验证状态:** ✅ 所有测试用例通过  
**可用性:** ✅ 前端App可以正常对接使用
