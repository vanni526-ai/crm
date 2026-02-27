# 账号注销功能 API 文档

## 概述

本文档描述了账号注销功能的所有API接口，包括登录拦截、账号恢复、注销状态查询等功能。

---

## 1. 登录拦截（自动触发）

### 功能说明

当用户尝试登录时，系统会自动检查账号的`isDeleted`状态：
- `isDeleted = 0`：正常登录
- `isDeleted = 1`：阻止登录，返回注销中状态信息
- `isDeleted = 2`：阻止登录，提示账号已永久删除

### 实现位置

`server/_core/sdk.ts` 中的 `authenticateRequest` 函数

### 错误响应格式

当账号处于注销中状态（`isDeleted = 1`）时，返回：

```json
{
  "error": {
    "code": "ACCOUNT_PENDING_DELETION",
    "message": "账号处于注销缓冲期，还有28天可恢复",
    "data": {
      "userId": 123,
      "phone": "138****0000",
      "daysRemaining": 28,
      "deletedAt": "2026-02-26T10:30:00.000Z",
      "recoveryDeadline": "2026-03-28T10:30:00.000Z"
    }
  }
}
```

当账号已永久删除（`isDeleted = 2`）时，返回：

```json
{
  "error": {
    "code": "ACCOUNT_DELETED",
    "message": "账号已永久删除，无法恢复"
  }
}
```

---

## 2. 账号恢复接口

### 接口路径

`auth.restoreAccount`

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| userId | number | 是 | 用户ID |
| phone | string | 是 | 手机号（用于验证身份） |
| verificationCode | string | 是 | 验证码 |

### 请求示例

```typescript
const result = await trpc.auth.restoreAccount.mutate({
  userId: 123,
  phone: "13800138000",
  verificationCode: "123456"
});
```

### 成功响应

```json
{
  "success": true,
  "message": "账号已成功恢复",
  "user": {
    "id": 123,
    "name": "张三",
    "phone": "13800138000",
    "email": "zhangsan@example.com",
    "roles": "user"
  }
}
```

### 错误响应

**用户不存在**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "用户不存在"
  }
}
```

**手机号不匹配**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "手机号不匹配"
  }
}
```

**账号未处于注销状态**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "账号未处于注销状态"
  }
}
```

**恢复期限已过**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "恢复期限已过，账号已永久删除"
  }
}
```

---

## 3. 注销状态查询接口

### 接口路径

`auth.getDeletionStatus`

### 请求参数

无（使用当前登录用户的信息）

### 请求示例

```typescript
const status = await trpc.auth.getDeletionStatus.useQuery();
```

### 成功响应

**正常状态**
```json
{
  "isDeleted": 0,
  "status": "active",
  "message": "账号正常"
}
```

**注销中状态（30天缓冲期）**
```json
{
  "isDeleted": 1,
  "status": "pending_deletion",
  "deletedAt": "2026-02-26T10:30:00.000Z",
  "recoveryDeadline": "2026-03-28T10:30:00.000Z",
  "daysRemaining": 28,
  "message": "账号处于注销缓冲期，还有28天可恢复"
}
```

**已脱敏状态**
```json
{
  "isDeleted": 2,
  "status": "anonymized",
  "anonymizedAt": "2026-03-28T10:30:00.000Z",
  "message": "账号已永久删除"
}
```

### 错误响应

**未登录**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未登录"
  }
}
```

---

## 4. 前端集成示例

### React + tRPC 示例

```typescript
import { trpc } from "@/lib/trpc";
import { useState } from "react";

function AccountDeletionFlow() {
  const [userId, setUserId] = useState<number>(0);
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  // 查询注销状态
  const { data: status } = trpc.auth.getDeletionStatus.useQuery();

  // 恢复账号
  const restoreMutation = trpc.auth.restoreAccount.useMutation({
    onSuccess: (data) => {
      alert(data.message);
      // 刷新页面或跳转到首页
      window.location.href = "/";
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const handleRestore = () => {
    restoreMutation.mutate({
      userId,
      phone,
      verificationCode,
    });
  };

  // 显示注销状态
  if (status?.isDeleted === 1) {
    return (
      <div>
        <h2>账号处于注销缓冲期</h2>
        <p>还有 {status.daysRemaining} 天可恢复</p>
        <button onClick={() => {
          // 显示恢复对话框
        }}>
          恢复账号
        </button>
      </div>
    );
  }

  return <div>账号正常</div>;
}
```

### 登录拦截处理示例

```typescript
import { trpc } from "@/lib/trpc";

// 在登录后检查账号状态
async function handleLogin() {
  try {
    // 尝试登录
    await trpc.auth.login.mutate({ username, password });
  } catch (error: any) {
    // 检查是否是账号注销错误
    if (error.data?.code === "ACCOUNT_PENDING_DELETION") {
      const { userId, phone, daysRemaining, recoveryDeadline } = error.data.data;
      
      // 显示恢复对话框
      const shouldRestore = confirm(
        `您的账号处于注销缓冲期，还有${daysRemaining}天可恢复。\n` +
        `恢复截止日期：${new Date(recoveryDeadline).toLocaleString()}\n\n` +
        `是否立即恢复账号？`
      );

      if (shouldRestore) {
        // 跳转到账号恢复页面
        window.location.href = `/restore-account?userId=${userId}&phone=${phone}`;
      }
    } else if (error.data?.code === "ACCOUNT_DELETED") {
      alert("账号已永久删除，无法恢复");
    } else {
      alert(error.message);
    }
  }
}
```

---

## 5. 数据库字段说明

### users 表新增字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| isDeleted | TINYINT(1) | 注销状态：0=正常，1=注销中，2=已脱敏 |
| deletedAt | DATETIME | 注销发起时间 |
| deletionReason | VARCHAR(255) | 注销原因 |
| anonymizedAt | DATETIME | 数据脱敏时间 |

---

## 6. 业务流程说明

### 注销流程

1. 用户发起注销请求（前端APP完成）
2. 系统标记 `isDeleted = 1`，记录 `deletedAt`
3. 用户尝试登录时被拦截，返回注销中状态信息
4. 30天内用户可通过验证码恢复账号

### 恢复流程

1. 用户在登录时收到注销中提示
2. 用户点击"恢复账号"
3. 输入手机号和验证码
4. 调用 `auth.restoreAccount` 接口
5. 系统验证通过后，恢复账号（`isDeleted = 0`）

### 自动脱敏流程

1. 定时任务每天凌晨2点执行
2. 查找 `isDeleted = 1` 且 `deletedAt` 超过30天的用户
3. 脱敏个人信息（手机号、邮箱、姓名等）
4. 标记 `isDeleted = 2`，记录 `anonymizedAt`

---

## 7. 安全说明

1. **验证码验证**：当前版本暂未实现验证码验证，实际生产环境需要集成短信验证服务
2. **手机号验证**：恢复账号时必须提供正确的手机号，防止恶意恢复
3. **30天缓冲期**：超过30天后账号自动脱敏，无法恢复
4. **审计日志**：所有注销和恢复操作都应记录审计日志（待实现）

---

## 8. 测试用例

已编写单元测试文件：`server/auth.deletion.test.ts`

测试用例：
1. ✅ 应该能够标记用户为注销中状态
2. ✅ 应该能够恢复注销中的用户
3. ✅ 应该能够标记用户为已脱敏状态
4. ✅ 应该能够计算剩余恢复天数

运行测试：
```bash
pnpm test auth.deletion.test.ts
```

---

## 9. 待实现功能

1. **验证码服务集成**：集成短信验证码服务
2. **审计日志**：记录所有注销和恢复操作
3. **定时任务**：实现自动脱敏定时任务
4. **前端页面**：实现账号恢复页面

---

## 10. 常见问题

**Q: 用户注销后还能登录吗？**
A: 不能。注销后（`isDeleted = 1`）用户尝试登录会被拦截，返回注销中状态信息。

**Q: 30天后账号会被彻底删除吗？**
A: 不会彻底删除，而是脱敏处理（`isDeleted = 2`）。用户记录保留，但个人信息被匿名化。

**Q: 恢复账号需要多久？**
A: 恢复是即时的，验证通过后立即恢复账号状态。

**Q: 如果用户忘记手机号怎么办？**
A: 当前版本必须提供正确的手机号才能恢复。未来可以考虑增加其他验证方式（如邮箱、身份证等）。

---

## 更新日志

- **2026-02-27**: 初始版本，实现登录拦截、账号恢复、注销状态查询功能
