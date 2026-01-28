# OAuth 登录配置文档

## 概述

本项目使用 Manus OAuth 系统进行身份验证。OAuth 流程由后端和前端协调完成。

## OAuth 登录端点

### 1. 获取登录URL（前端）

**位置**: `client/src/const.ts` 中的 `getLoginUrl()` 函数

**功能**: 生成 OAuth 登录 URL，用户点击此 URL 跳转到 OAuth 服务器进行身份验证

**URL 格式**:
```
{VITE_OAUTH_PORTAL_URL}/app-auth?appId={appId}&redirectUri={redirectUri}&state={state}&type=signIn
```

**参数说明**:
- `VITE_OAUTH_PORTAL_URL`: OAuth 门户 URL（环境变量）
- `appId`: 应用 ID（环境变量 `VITE_APP_ID`）
- `redirectUri`: 回调 URL（见下文）
- `state`: Base64 编码的 redirectUri，用于安全验证
- `type`: 固定值 `signIn`

**示例**:
```
https://oauth.manus.im/app-auth?appId=xxx&redirectUri=https://3000-xxx.manus.computer/api/oauth/callback&state=aHR0cHM6Ly8zMDAwLXh4eC5tYW51cy5jb20vYXBpL29hdXRoL2NhbGxiYWNr&type=signIn
```

### 2. OAuth 回调端点（后端）

**路由**: `/api/oauth/callback`

**方法**: `GET`

**位置**: `server/_core/oauth.ts` 中的 `registerOAuthRoutes()` 函数

**功能**: 处理 OAuth 服务器的回调，交换授权码获取用户信息，创建会话

**查询参数**:
- `code`: OAuth 授权码（必需）
- `state`: 安全状态参数（必需）

**处理流程**:
1. 验证 `code` 和 `state` 参数
2. 调用 `sdk.exchangeCodeForToken(code, state)` 交换授权码获取 token
3. 调用 `sdk.getUserInfo(token)` 获取用户信息
4. 在数据库中创建或更新用户记录
5. 创建会话 token 并设置 Cookie
6. 重定向到首页 `/`

**错误处理**:
- 缺少 `code` 或 `state`: 返回 400 错误
- 用户信息缺少 `openId`: 返回 400 错误
- 其他错误: 返回 500 错误

## 回调 URL 配置

### 格式

```
{window.location.origin}/api/oauth/callback
```

### 示例

**开发环境**:
```
http://localhost:3000/api/oauth/callback
```

**生产环境**:
```
https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/oauth/callback
```

### 动态生成

回调 URL 在 `client/src/const.ts` 中动态生成，以支持不同的部署环境：

```typescript
const redirectUri = `${window.location.origin}/api/oauth/callback`;
```

这确保无论部署在哪个域名，回调 URL 都能正确指向当前服务器。

## 环境变量配置

以下环境变量需要在 `.env` 文件中配置：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VITE_APP_ID` | OAuth 应用 ID | `your-app-id` |
| `VITE_OAUTH_PORTAL_URL` | OAuth 门户 URL | `https://oauth.manus.im` |
| `OAUTH_SERVER_URL` | OAuth 服务器 URL（后端） | `https://api.manus.im` |
| `JWT_SECRET` | JWT 签名密钥 | `your-secret-key` |

## OAuth 流程图

```
用户点击登录
    ↓
前端调用 getLoginUrl() 获取 OAuth URL
    ↓
用户跳转到 OAuth 服务器进行身份验证
    ↓
OAuth 服务器重定向到 /api/oauth/callback?code=xxx&state=xxx
    ↓
后端处理回调：
  1. 验证 code 和 state
  2. 交换授权码获取 token
  3. 获取用户信息
  4. 创建/更新用户记录
  5. 创建会话 token
  6. 设置 Cookie
    ↓
重定向到首页 /
    ↓
用户登录成功
```

## 相关文件

| 文件 | 功能 |
|------|------|
| `client/src/const.ts` | 生成登录 URL |
| `server/_core/oauth.ts` | 处理 OAuth 回调 |
| `server/_core/sdk.ts` | OAuth SDK 实现 |
| `server/_core/index.ts` | 注册 OAuth 路由 |
| `client/src/_core/hooks/useAuth.ts` | 认证状态管理 |

## 常见问题

### Q: 如何自定义回调 URL？
A: 回调 URL 在 `client/src/const.ts` 中动态生成，基于当前窗口的 origin。如需自定义，修改该文件中的 `redirectUri` 生成逻辑。

### Q: OAuth 登录失败如何调试？
A: 
1. 检查浏览器控制台是否有错误信息
2. 检查环境变量是否正确配置
3. 查看后端日志中的 `[OAuth]` 前缀的日志
4. 确保回调 URL 与 OAuth 服务器配置一致

### Q: 支持哪些 OAuth 提供商？
A: 当前支持 Manus OAuth 系统。具体支持的第三方提供商由 Manus OAuth 服务器决定。

## 安全考虑

1. **State 参数**: 使用 Base64 编码的 redirectUri 作为 state，防止 CSRF 攻击
2. **HTTPS**: 生产环境必须使用 HTTPS
3. **Cookie 安全**: 会话 token 通过 HttpOnly Cookie 传递，防止 XSS 攻击
4. **Token 过期**: 会话 token 设置 1 年过期时间（可根据需要调整）
