# 认证模块接口文档

> **版本**：v2.0（2026-03-02）  
> **基础路径**：`/api/trpc/auth`  
> **协议**：tRPC over HTTP（JSON-RPC 风格）  
> **认证方式**：Bearer Token（`Authorization: Bearer <token>`）或 HttpOnly Session Cookie（`session`）

---

## 目录

| 接口名称 | 方法类型 | 权限 | 说明 |
|---|---|---|---|
| `auth.loginWithUserAccount` | Mutation | 公开 | 手机号 + 密码登录（**主登录接口**） |
| `auth.logout` | Mutation | 公开 | 退出登录 |
| `auth.me` | Query | 公开 | 获取当前登录用户信息 |
| `auth.refreshToken` | Mutation | 公开 | 刷新 Token |
| `auth.changePassword` | Mutation | 需登录 | 修改密码 |
| `auth.resetPassword` | Mutation | 公开 | 重置密码（忘记密码） |
| `auth.register` | Mutation | 公开 | 新用户注册 |
| `auth.restoreAccount` | Mutation | 公开 | 恢复已注销账号 |
| `auth.getDeletionStatus` | Query | 需登录 | 查询账号注销状态 |

---

## 1. 手机号 + 密码登录

**接口**：`auth.loginWithUserAccount`  
**类型**：Mutation（POST）  
**权限**：公开，无需登录

### 说明

这是系统**唯一支持的登录方式**。用户必须使用注册时绑定的手机号和密码进行登录，不支持用户名或邮箱登录。登录成功后，服务端同时返回 JWT Token 并写入 HttpOnly Session Cookie，两种方式均可用于后续接口鉴权。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `phone` | `string` | 是 | 手机号（唯一标识，11位） |
| `password` | `string` | 是 | 登录密码（明文，传输层 HTTPS 加密） |

### 请求示例

```json
{
  "phone": "13800138001",
  "password": "your_password"
}
```

### 响应字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `success` | `boolean` | 是否登录成功，始终为 `true`（失败时抛出错误） |
| `token` | `string` | JWT Token，有效期 **24 小时** |
| `user.id` | `number` | 用户 ID |
| `user.openId` | `string` | 系统内部唯一标识 |
| `user.name` | `string` | 用户名 |
| `user.nickname` | `string` | 昵称 |
| `user.email` | `string` | 邮箱 |
| `user.phone` | `string` | 手机号 |
| `user.role` | `string` | 主角色（`admin` / `sales` / `finance` / `teacher` / `user`） |
| `user.roles` | `string[]` | 角色列表（支持多角色，如 `["admin", "finance"]`） |
| `user.isActive` | `boolean` | 账号是否启用 |

### 响应示例

```json
{
  "result": {
    "data": {
      "success": true,
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": 1,
        "openId": "user_abc123",
        "name": "张三",
        "nickname": "小张",
        "email": "zhangsan@example.com",
        "phone": "13800138001",
        "role": "admin",
        "roles": ["admin"],
        "isActive": true
      }
    }
  }
}
```

### Cookie 说明

登录成功后，服务端自动写入 `session` Cookie：

| 属性 | 值 |
|---|---|
| 名称 | `session` |
| 内容 | JWT Token（与响应体中 `token` 相同） |
| HttpOnly | `true`（前端 JS 不可读取） |
| Secure | 生产环境为 `true` |
| SameSite | `lax` |
| 有效期 | **7 天**（Cookie 存活时间，Token 本身 24 小时过期） |

### 错误码

| HTTP 状态 | tRPC 错误码 | 错误消息 | 说明 |
|---|---|---|---|
| 401 | `UNAUTHORIZED` | `手机号不存在，请确认后重试` | 手机号未注册 |
| 401 | `UNAUTHORIZED` | `该账号未设置密码，请联系管理员` | 账号由管理员创建但未设置密码 |
| 401 | `UNAUTHORIZED` | `密码错误` | 密码不匹配 |
| 401 | `UNAUTHORIZED` | `账号已被禁用，请联系管理员` | 账号 `isActive = false` |
| 500 | `INTERNAL_SERVER_ERROR` | `数据库连接失败` | 服务器内部错误 |

---

## 2. 退出登录

**接口**：`auth.logout`  
**类型**：Mutation（POST）  
**权限**：公开

### 说明

清除服务端写入的 `session` Cookie，完成退出登录。前端应在收到成功响应后清除本地存储的 Token，并跳转至登录页。

### 请求参数

无。

### 响应示例

```json
{
  "result": {
    "data": {
      "success": true
    }
  }
}
```

---

## 3. 获取当前用户信息

**接口**：`auth.me`  
**类型**：Query（GET）  
**权限**：公开（未登录时返回 `null`）

### 说明

通过请求中携带的 Cookie 或 Bearer Token 识别当前登录用户，返回用户信息。若未登录，返回 `null`。前端可用此接口判断登录状态。

### 请求参数

无。

### 响应示例（已登录）

```json
{
  "result": {
    "data": {
      "id": 1,
      "name": "张三",
      "role": "admin",
      "roles": ["admin"]
    }
  }
}
```

### 响应示例（未登录）

```json
{
  "result": {
    "data": null
  }
}
```

---

## 4. 刷新 Token

**接口**：`auth.refreshToken`  
**类型**：Mutation（POST）  
**权限**：公开

### 说明

使用已有 Token（可以是已过期但未超过 7 天的 Token）换取新 Token。新 Token 有效期重置为 24 小时。若 Token 过期超过 7 天，则需要重新登录。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `token` | `string` | 是 | 当前 JWT Token（可已过期） |

### 响应字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `success` | `boolean` | 是否刷新成功 |
| `token` | `string` | 新的 JWT Token |
| `expiresIn` | `number` | Token 有效期（秒），固定为 `86400`（24 小时） |
| `user.id` | `number` | 用户 ID |
| `user.name` | `string` | 用户名 |
| `user.role` | `string` | 主角色 |
| `user.roles` | `string[]` | 角色列表 |

### 错误码

| tRPC 错误码 | 错误消息 | 说明 |
|---|---|---|
| `UNAUTHORIZED` | `Token已过期太久，请重新登录` | Token 过期超过 7 天 |
| `UNAUTHORIZED` | `用户不存在` | Token 对应用户已被删除 |
| `UNAUTHORIZED` | `账号已被禁用` | 账号被管理员禁用 |
| `UNAUTHORIZED` | `Token无效，请重新登录` | Token 签名错误或格式异常 |

---

## 5. 修改密码

**接口**：`auth.changePassword`  
**类型**：Mutation（POST）  
**权限**：**需要登录**（Bearer Token 或 Cookie）

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `oldPassword` | `string` | 是 | 当前密码 |
| `newPassword` | `string` | 是 | 新密码（6~20 位） |

### 响应字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `success` | `boolean` | 是否修改成功 |
| `error` | `string` | 失败原因（仅 `success = false` 时存在） |

### 错误消息

| 错误消息 | 说明 |
|---|---|
| `旧密码错误` | 当前密码验证失败 |
| `新密码不能与旧密码相同` | 新旧密码一致 |
| `该账号未设置密码，无法修改` | 账号无密码记录 |
| `账号已被禁用` | 账号被禁用 |

---

## 6. 重置密码（忘记密码）

**接口**：`auth.resetPassword`  
**类型**：Mutation（POST）  
**权限**：公开

> **注意**：当前验证码验证为测试模式，固定验证码为 `123456`。生产环境需接入真实短信服务。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `phone` | `string` | 是 | 注册手机号（11 位，格式：`1[3-9]XXXXXXXXX`） |
| `code` | `string` | 是 | 短信验证码（测试固定为 `123456`） |
| `newPassword` | `string` | 是 | 新密码（6~20 位） |

### 响应字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `success` | `boolean` | 是否重置成功 |
| `error` | `string` | 失败原因（仅失败时存在） |

---

## 7. 新用户注册

**接口**：`auth.register`  
**类型**：Mutation（POST）  
**权限**：公开

### 说明

注册成功后自动登录，返回 JWT Token 并写入 Session Cookie，同时自动在业务客户表中创建对应记录。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `phone` | `string` | 是 | 手机号（11 位，格式：`1[3-9]XXXXXXXXX`） |
| `password` | `string` | 是 | 密码（6~20 位） |
| `name` | `string` | 否 | 用户名（默认使用手机号） |
| `nickname` | `string` | 否 | 昵称 |

### 响应字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `success` | `boolean` | 是否注册成功 |
| `message` | `string` | 提示消息（`注册成功`） |
| `token` | `string` | JWT Token（注册后自动登录） |
| `user.id` | `number` | 新用户 ID |
| `user.phone` | `string` | 手机号 |
| `user.name` | `string` | 用户名 |
| `user.role` | `string` | 角色（固定为 `user`） |
| `user.roles` | `string[]` | 角色列表（固定为 `["user"]`） |

### 错误码

| tRPC 错误码 | 错误消息 | 说明 |
|---|---|---|
| `CONFLICT` | `该手机号已被注册` | 手机号重复 |

---

## 8. 恢复已注销账号

**接口**：`auth.restoreAccount`  
**类型**：Mutation（POST）  
**权限**：公开

### 说明

账号注销后进入 30 天缓冲期，在此期间可通过此接口恢复账号。超过 30 天后账号永久删除，无法恢复。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `userId` | `number` | 是 | 用户 ID |
| `phone` | `string` | 是 | 注册手机号（用于身份验证） |
| `verificationCode` | `string` | 是 | 验证码（当前为预留字段，暂未强制验证） |

### 错误码

| tRPC 错误码 | 错误消息 | 说明 |
|---|---|---|
| `NOT_FOUND` | `用户不存在` | 用户 ID 无效 |
| `BAD_REQUEST` | `手机号不匹配` | 手机号与账号不符 |
| `BAD_REQUEST` | `账号未处于注销状态` | 账号正常，无需恢复 |
| `BAD_REQUEST` | `恢复期限已过，账号已永久删除` | 超过 30 天缓冲期 |

---

## 9. 查询账号注销状态

**接口**：`auth.getDeletionStatus`  
**类型**：Query（GET）  
**权限**：**需要登录**

### 响应字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `isDeleted` | `0 \| 1 \| 2` | `0`=正常，`1`=注销缓冲期，`2`=已永久删除 |
| `status` | `string` | `active` / `pending_deletion` / `anonymized` |
| `message` | `string` | 状态说明 |
| `daysRemaining` | `number` | 剩余可恢复天数（仅 `isDeleted=1` 时） |
| `recoveryDeadline` | `string` | 恢复截止时间 ISO 格式（仅 `isDeleted=1` 时） |

---

## 鉴权方式说明

系统支持两种鉴权方式，优先级如下：

**方式一：Bearer Token（推荐用于 App 端）**

在请求头中携带 Token：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**方式二：Session Cookie（推荐用于 Web 端）**

登录成功后浏览器自动携带 `session` Cookie，无需手动处理。

---

## Token 结构说明

JWT Payload 包含以下字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `number` | 用户 ID |
| `openId` | `string` | 系统内部唯一标识 |
| `name` | `string` | 用户名 |
| `role` | `string` | 主角色 |
| `roles` | `string` | 角色列表（逗号分隔字符串，如 `"admin,finance"`） |
| `iat` | `number` | 签发时间（Unix 时间戳） |
| `exp` | `number` | 过期时间（Unix 时间戳，签发后 24 小时） |

---

## 角色权限说明

| 角色值 | 说明 |
|---|---|
| `admin` | 管理员，拥有全部权限 |
| `sales` | 销售人员，可管理订单和客户 |
| `finance` | 财务人员，可查看财务对账数据 |
| `teacher` | 老师，可查看自己的课程和费用 |
| `user` | 普通用户（学员），仅可查看自身数据 |

支持多角色，`roles` 字段以逗号分隔，如 `"admin,finance"` 表示同时拥有管理员和财务权限。

---

## 变更记录

| 版本 | 日期 | 变更内容 |
|---|---|---|
| v2.0 | 2026-03-02 | `loginWithUserAccount` 接口移除用户名/邮箱登录支持，**仅保留手机号+密码登录**；请求参数从 `username` 改为 `phone` |
| v1.0 | 2026-01 | 初始版本，支持用户名/手机号/邮箱三种方式登录 |
