# 瀛姬 App × 会员 H5 对接方案

**文档版本**：v1.0  
**更新时间**：2026-03-02  
**适用范围**：瀛姬 App 前端开发团队  
**H5 地址**：`https://crm.bdsm.com.cn/membership`

---

## 一、整体流程概述

用户在 App 内点击「开通会员」入口后，App 以 WebView 方式打开 H5 会员页面，并在 URL 中携带用户的登录 Token，H5 页面自动完成免登录认证。用户在 H5 内选择支付方式并完成支付后，点击「我已完成支付」按钮，H5 向后端查询最新会员状态。用户关闭 WebView 返回 App 后，App 主动调用会员状态接口刷新本地状态，完成整个开通流程。

```
App（用户已登录）
    ↓ 打开 WebView，URL 携带 token
https://crm.bdsm.com.cn/membership?token=<JWT>
    ↓ H5 自动调用 auth.loginWithToken 建立 session
    ↓ 用户选择支付方式，点击「确认支付」
    ↓ 跳转微信/支付宝支付页面
    ↓ 支付完成，用户点击「我已完成支付」
    ↓ H5 查询订单状态，确认后显示「开通成功」
用户返回 App
    ↓ App 调用 membership.getStatus 刷新会员状态
    ↓ 显示「会员已激活」
```

---

## 二、App 端接入步骤

### 2.1 打开 H5 页面

App 打开 WebView 时，在 URL Query 中附带用户的登录 JWT Token：

```
https://crm.bdsm.com.cn/membership?token=<用户JWT>
```

**注意事项：**

- Token 为用户登录时后端返回的 JWT，格式为标准 Bearer Token 字符串（不含 `Bearer ` 前缀）。
- Token 有效期为 7 天，过期后 H5 会自动跳转到登录页（`/login?redirect=/membership`）。
- H5 收到 token 后会自动建立 session cookie，无需 App 额外处理 Cookie。
- H5 建立 session 成功后，会通过 `window.history.replaceState` 清除 URL 中的 token 参数，防止 token 泄露。

### 2.2 WebView 配置要求

| 配置项 | 要求 |
|---|---|
| Cookie 支持 | 必须开启（H5 使用 session cookie 维持登录状态） |
| JavaScript | 必须开启 |
| 域名白名单 | 需放行 `crm.bdsm.com.cn` |
| 支付跳转 | 需允许跳转到微信/支付宝 scheme（`weixin://`、`alipays://`） |
| HTTPS | 必须支持 HTTPS |

### 2.3 用户返回 App 后刷新会员状态

用户关闭 WebView 返回 App 时，App 需主动调用以下接口查询最新会员状态：

**接口**：`GET /api/trpc/membership.getStatus`  
**认证**：Bearer Token（`Authorization: Bearer <JWT>`）

**响应示例：**

```json
{
  "result": {
    "data": {
      "isMember": true,
      "membershipStatus": "active",
      "expiresAt": "2027-03-02T00:00:00.000Z",
      "daysRemaining": 365,
      "planName": "年度会员"
    }
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|---|---|---|
| `isMember` | boolean | 是否为有效会员 |
| `membershipStatus` | string | `active`（有效）/ `expired`（已过期）/ `none`（未开通） |
| `expiresAt` | string \| null | 会员到期时间（ISO 8601 UTC 格式） |
| `daysRemaining` | number \| null | 剩余天数 |
| `planName` | string \| null | 套餐名称 |

---

## 三、H5 页面流程说明

### 3.1 页面状态流转

```
landing（落地页）
    ↓ 点击「立即开通会员」
payment（支付页）
    ↓ 选择支付方式，点击「确认支付」
paying（等待支付确认页）
    ↓ 点击「我已完成支付」或轮询到支付成功
success（支付成功页）
```

### 3.2 支付方式说明

H5 支付页面提供以下四种支付方式：

| 支付方式 | 说明 | 处理逻辑 |
|---|---|---|
| 微信支付 | 跳转微信 H5 支付页面 | 后端返回 `mwebUrl`，H5 跳转后进入「等待确认」状态，轮询订单状态 |
| 支付宝支付 | 提交支付宝表单 | 后端返回 `formHtml`，H5 动态插入表单并提交，进入「等待确认」状态 |
| 账户余额支付 | 直接扣减账户余额 | 后端直接完成扣款，H5 立即跳转「支付成功」页 |
| 账户充值 | 跳转充值页面 | H5 跳转 `/recharge?redirect=/membership`，App 端可拦截此跳转并打开原生充值页面 |

### 3.3 「我已完成支付」按钮

用户从微信/支付宝支付页面返回后，H5 处于「等待支付确认」状态，页面同时进行以下两种检测：

1. **自动轮询**：每 3 秒查询一次订单状态（`membership.getOrderStatus`），若订单状态变为 `paid`，自动跳转「支付成功」页。
2. **手动确认**：用户点击「我已完成支付」按钮，H5 立即查询会员状态，若已激活则跳转「支付成功」页。

---

## 四、后端接口规范

### 4.1 免登录建立 Session

**接口**：`POST /api/trpc/auth.loginWithToken`  
**认证**：无需（公开接口）  
**说明**：App 传入用户 JWT，后端验证后为 H5 建立 session cookie，实现免登录。

**请求参数：**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**成功响应：**

```json
{
  "result": {
    "data": {
      "success": true,
      "message": "登录成功",
      "user": {
        "id": 1,
        "name": "张三",
        "phone": "13381928825",
        "role": "user",
        "isMember": false,
        "membershipStatus": "none",
        "membershipExpiresAt": null
      }
    }
  }
}
```

**错误响应：**

| HTTP 状态码 | 错误码 | 说明 |
|---|---|---|
| 401 | `UNAUTHORIZED` | token 无效或已过期 |
| 401 | `UNAUTHORIZED` | 账号已被禁用 |
| 500 | `INTERNAL_SERVER_ERROR` | 数据库连接失败 |

### 4.2 查询会员状态

**接口**：`GET /api/trpc/membership.getStatus`  
**认证**：需要登录（Bearer Token 或 session cookie）

**成功响应：**

```json
{
  "result": {
    "data": {
      "isMember": true,
      "membershipStatus": "active",
      "expiresAt": "2027-03-02T00:00:00.000Z",
      "daysRemaining": 365,
      "planName": "年度会员"
    }
  }
}
```

### 4.3 查询套餐列表

**接口**：`GET /api/trpc/membership.listPlans`  
**认证**：无需（公开接口）

**成功响应：**

```json
{
  "result": {
    "data": {
      "plans": [
        {
          "id": 1,
          "name": "年度会员",
          "description": "365天无限约课权限",
          "duration": 365,
          "price": 39,
          "originalPrice": 888,
          "benefits": ["专属约课权限", "优质教师资源", "灵活时间安排"]
        }
      ]
    }
  }
}
```

---

## 五、常见问题

**Q：用户 Token 过期了怎么办？**  
A：H5 会自动跳转到登录页（`/login?redirect=/membership`）。App 端建议在打开 WebView 前先检查本地 Token 是否有效，若即将过期则先刷新 Token 再打开 H5。

**Q：App 端如何判断用户已完成支付？**  
A：监听 WebView 的 URL 变化，若 URL 变为 `/membership`（不含 `token` 参数）且用户关闭了 WebView，则调用 `membership.getStatus` 接口查询最新状态。

**Q：微信/支付宝支付跳转后 WebView 被关闭怎么办？**  
A：这是正常现象。用户从微信/支付宝返回 App 后，App 应重新打开 H5 页面（此时 H5 会进入「等待支付确认」状态，用户点击「我已完成支付」即可完成确认），或直接在 App 端调用 `membership.getStatus` 接口查询状态。

**Q：余额支付时账户余额不足怎么办？**  
A：后端会返回错误信息，H5 页面会显示「余额不足」提示，用户可切换为其他支付方式或选择「账户充值」。

**Q：H5 页面如何处理「账户充值」跳转？**  
A：H5 会跳转到 `/recharge?redirect=/membership`，App 端可拦截此 URL，打开原生充值页面。充值完成后，App 重新打开 H5 会员页面即可。

---

## 六、更新日志

| 版本 | 日期 | 变更内容 |
|---|---|---|
| v1.0 | 2026-03-02 | 初始版本，包含免登录跳转、支付页面设计、「我已完成支付」按钮 |

---

*本文档由 CRM 后端团队维护，如有疑问请联系系统管理员。*
