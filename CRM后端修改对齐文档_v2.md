# CRM 后端修改对齐文档 v2

> **文档用途**：本文档记录了前端 App 沙盒对 CRM 后端代码所做的全部修改，供后端开发团队在 GitHub 仓库中 1:1 同步，防止后续迭代版本覆盖已有修改导致问题复现。
>
> **版本**：v2 (2026-03-05)
> **核心变更**：引入内部令牌机制，彻底解耦重置密码的验证码校验。

---

## 一、修改总览

| # | 修改文件 | 修改类型 | 关联问题 | 风险等级 | 防覆盖方案 |
|---|---|---|---|---|---|
| 1 | `server/authRouter.ts` | **修改** | `resetPassword` 验证码校验 | **高** | **内部令牌校验** |
| 2 | `client/src/components/DashboardLayout.tsx` | **修改** | 未登录跳转逻辑 | **中** | **防护注释** |
| 3 | `server/smsService.ts` | 新增文件 | 重置密码短信验证码功能 | 中 | 代码注释说明 |
| 4 | `package.json` | 修改 | 新增阿里云短信 SDK 依赖 | 低 | N/A |
| 5 | `.env` | 修改 | 新增阿里云/内部令牌环境变量 | 低 | N/A |

---

## 二、高风险项处置方案（核心）

### 1. `server/authRouter.ts`：`resetPassword` 验证码校验（高风险）

**问题**：App 的验证码由 API 代理层校验，CRM 内存中没有验证码。如果 CRM 侧保留 `verifySmsCode` 校验，会永远失败。但如果直接删除校验，CRM 团队在迭代时极易误加回。

**解决方案（内部令牌）**：

1.  **API 代理层**：在校验完用户验证码后，不再传递用户的验证码，而是向 CRM 转发一个**内部令牌**（`INTERNAL_RESET_TOKEN`）。
2.  **CRM `resetPassword`**：不再调用 `verifySmsCode`，而是只校验 `input.code === process.env.INTERNAL_RESET_TOKEN`。

**操作**：找到 `resetPassword` mutation 中的验证码校验代码块，**替换**为内部令牌校验。

**修改前**（删除这段代码）：

```typescript
// 3. 验证短信验证码（阿里云短信）
const codeCheck = verifySmsCode(input.phone, input.code);
if (!codeCheck.valid) {
  return {
    success: false,
    error: codeCheck.message,
  };
}
```

**修改后**（替换为以下代码）：

```typescript
// 3. 验证内部令牌
// 验证码已由 API 代理层校验，此处只校验代理层注入的内部令牌
// ⚠️ 【架构约定——请勿修改此处逻辑】
// 此处必须校验 INTERNAL_RESET_TOKEN，不得改回 verifySmsCode 或其他校验
if (input.code !== process.env.INTERNAL_RESET_TOKEN) {
  // 记录异常调用，说明有外部请求在尝试绕过代理层直接调用
  console.warn(`[AUTH] resetPassword: 无效的内部令牌，疑似绕过代理层调用, phone=${input.phone}`);
  return {
    success: false,
    error: "无效的请求，请通过官方 App 操作",
  };
}
```

### 2. `client/src/components/DashboardLayout.tsx`：未登录跳转逻辑（中风险）

**问题**：CRM 前端团队在迭代布局时，可能不知道"直接跳转登录页"是刻意为之，会将其改回 Manus OAuth 的英文中间页。

**解决方案（防护注释）**：在代码中添加醒目的注释，说明修改原因和架构约定。

**操作**：找到 `DashboardLayout.tsx` 中的 `if (!user)` 判断，添加防护注释。

```typescript
if (!user) {
  // ⚠️ 【架构约定——请勿修改此处逻辑】
  // 原始实现使用 Manus OAuth 中间页（显示 "Sign in to continue" 英文页）。
  // 已改为 window.location.replace("/login") 直接跳转，原因：
  //   1. App 用户使用手机号+密码登录，不使用 Manus OAuth
  //   2. 中间页会导致登录流程中断，用户体验差
  //   3. 如改回 OAuth 中间页，会导致未登录用户看到英文界面而非登录页
  window.location.replace("/login");
  return <DashboardLayoutSkeleton />;
}
```

---

## 三、其他修改说明

### 3. 新增 `server/smsService.ts`

此文件封装了阿里云短信发送和校验逻辑，供 CRM H5 页面使用。**App 不直接调用**。CRM 团队可按需维护。

### 4. `package.json` 依赖

确保 `dependencies` 中包含：

```json
"@alicloud/dysmsapi20170525": "^4.5.0",
"@alicloud/tea-util": "^1.4.11"
```

### 5. `.env` 环境变量

确保 `.env` 文件中包含以下两个变量：

```env
# 阿里云短信服务（用于 CRM H5 页面发送验证码）
ALIYUN_SMS_ACCESS_KEY_ID=<请向运维获取，与 OSS 使用同一个 AccessKey>
ALIYUN_SMS_ACCESS_KEY_SECRET=<请向运维获取>

# 内部令牌（API代理→CRM 重置密码校验）
INTERNAL_RESET_TOKEN=INTERNAL_RESET_151566d87fb4b4d525e48cd0a05e5f4fa8161b971d6f78781b640b30af0c38a9
```

---

## 四、架构约定（交接核心）

**重置密码验证码的最终流程：**

```
App 用户
  │
  ├─ 1. 发送验证码 → auth.sendSms → [API 代理] → 存入代理内存
  │
  └─ 2. 重置密码 → auth.resetPassword → [API 代理] ← 拦截！
         ├─ 1. 用代理内存校验用户验证码
         ├─ 2. 校验通过后，将 code 替换为 INTERNAL_RESET_TOKEN
         └─ 3. 转发给 CRM
                ↓
            [CRM authRouter.ts resetPassword]
                ├─ 校验 input.code === INTERNAL_RESET_TOKEN
                └─ 更新密码
```

**CRM 团队需要遵守的两个核心约定：**

1.  **`resetPassword` 必须**校验 `input.code === process.env.INTERNAL_RESET_TOKEN`。
2.  **`DashboardLayout.tsx` 必须**保留 `window.location.replace("/login")` 的直接跳转逻辑。

*文档由前端 App 沙盒自动生成，请 CRM 团队严格按此文档对齐 GitHub 1:1 修改 GitHub 仓库。*
