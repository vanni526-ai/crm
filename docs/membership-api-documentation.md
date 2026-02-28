# 瀛姬App 会员费H5页面 接口文档

**版本**: v1.0.0  
**更新时间**: 2026-02-28  
**基础URL**: `https://your-domain.com`  
**协议**: HTTPS  
**数据格式**: JSON (tRPC over HTTP)

---

## 目录

1. [概述](#1-概述)
2. [认证机制](#2-认证机制)
3. [接口列表](#3-接口列表)
4. [tRPC 接口详情](#4-trpc-接口详情)
   - [4.1 查询会员套餐列表](#41-查询会员套餐列表)
   - [4.2 查询当前用户会员状态](#42-查询当前用户会员状态)
   - [4.3 创建会员订单](#43-创建会员订单)
   - [4.4 会员订单预下单](#44-会员订单预下单)
   - [4.5 查询会员订单状态](#45-查询会员订单状态)
   - [4.6 取消会员订单](#46-取消会员订单)
   - [4.7 查询会员订单列表](#47-查询会员订单列表)
5. [Webhook 回调接口](#5-webhook-回调接口)
   - [5.1 微信支付回调](#51-微信支付回调)
   - [5.2 支付宝回调](#52-支付宝回调)
6. [数据模型](#6-数据模型)
7. [业务流程](#7-业务流程)
8. [错误码说明](#8-错误码说明)
9. [前端集成指南](#9-前端集成指南)
10. [环境变量配置](#10-环境变量配置)

---

## 1. 概述

本文档描述了瀛姬App会员费H5页面所需的全部后端接口。会员系统支持以下功能：

- 展示多种会员套餐（月度/季度/年度）
- 支持微信支付H5、支付宝H5、账户余额三种支付方式
- 会员状态实时同步至 `users` 表（方案A：统一存储）
- 支持续费自动延长到期时间
- 完整的支付回调验签和幂等性处理

**架构说明**：

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 接口协议 | tRPC v11 | 类型安全的RPC框架，前后端共享类型 |
| 认证方式 | Session Cookie (JWT) | 通过 Manus OAuth 完成登录 |
| 数据库 | MySQL / TiDB | 使用 Drizzle ORM |
| 支付回调 | Express REST | Webhook 独立路由，不走 tRPC |

---

## 2. 认证机制

所有 tRPC 接口均通过 Session Cookie 进行认证。用户登录后，服务端会设置 `session` Cookie，后续请求自动携带。

**未登录时的响应**：

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "请先登录"
  }
}
```

**前端获取登录状态**：

```typescript
import { useAuth } from "@/_core/hooks/useAuth";

const { user, loading, isAuthenticated } = useAuth();
```

---

## 3. 接口列表

### tRPC 接口（需认证）

| 接口名称 | 方法 | 路径 | 认证 | 说明 |
|----------|------|------|------|------|
| listPlans | Query | `/api/trpc/membership.listPlans` | 不需要 | 查询套餐列表 |
| getStatus | Query | `/api/trpc/membership.getStatus` | 需要 | 查询会员状态 |
| createOrder | Mutation | `/api/trpc/membership.createOrder` | 需要 | 创建会员订单 |
| prepay | Mutation | `/api/trpc/membership.prepay` | 需要 | 预下单获取支付参数 |
| getOrderStatus | Query | `/api/trpc/membership.getOrderStatus` | 需要 | 查询订单支付状态 |
| cancelOrder | Mutation | `/api/trpc/membership.cancelOrder` | 需要 | 取消待支付订单 |
| listOrders | Query | `/api/trpc/membership.listOrders` | 需要 | 查询订单历史 |

### Webhook 接口（无需认证，需验签）

| 接口名称 | 方法 | 路径 | 说明 |
|----------|------|------|------|
| 微信支付回调 | POST | `/api/webhook/membership-wechat-notify` | 微信支付异步通知 |
| 支付宝回调 | POST | `/api/webhook/membership-alipay-notify` | 支付宝异步通知 |

---

## 4. tRPC 接口详情

> **调用方式说明**：tRPC 接口通过 HTTP POST 请求调用，路径格式为 `/api/trpc/{routerName}.{procedureName}`。Query 类型接口也可通过 GET 请求调用（参数放在 `input` query string 中）。

---

### 4.1 查询会员套餐列表

**接口**：`membership.listPlans`  
**类型**：Query（无需认证）  
**说明**：获取所有启用的会员套餐，按排序字段升序排列。

**请求参数**：无

**响应示例**：

```json
{
  "result": {
    "data": [
      {
        "id": 1,
        "name": "月度会员",
        "description": "每月自动续费，随时可取消",
        "duration": 30,
        "price": "99.00",
        "originalPrice": "129.00",
        "benefits": ["专属课程折扣", "优先预约权", "会员专属活动"],
        "isActive": true,
        "sortOrder": 1
      },
      {
        "id": 2,
        "name": "季度会员",
        "description": "3个月会员，比月度更优惠",
        "duration": 90,
        "price": "259.00",
        "originalPrice": "387.00",
        "benefits": ["专属课程折扣", "优先预约权", "会员专属活动", "生日特权"],
        "isActive": true,
        "sortOrder": 2
      },
      {
        "id": 3,
        "name": "年度会员",
        "description": "12个月会员，最超值选择",
        "duration": 365,
        "price": "899.00",
        "originalPrice": "1548.00",
        "benefits": ["专属课程折扣", "优先预约权", "会员专属活动", "生日特权", "专属客服"],
        "isActive": true,
        "sortOrder": 3
      }
    ]
  }
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 套餐ID |
| name | string | 套餐名称 |
| description | string \| null | 套餐描述 |
| duration | number | 有效天数 |
| price | string | 实际售价（元，保留2位小数） |
| originalPrice | string \| null | 原价（用于展示划线价） |
| benefits | string[] | 权益列表 |
| isActive | boolean | 是否启用 |
| sortOrder | number | 排序权重（升序） |

---

### 4.2 查询当前用户会员状态

**接口**：`membership.getStatus`  
**类型**：Query（需要认证）  
**说明**：获取当前登录用户的会员状态信息。

**请求参数**：无

**响应示例（已是会员）**：

```json
{
  "result": {
    "data": {
      "isMember": true,
      "membershipStatus": "active",
      "membershipActivatedAt": "2026-01-01T00:00:00.000Z",
      "membershipExpiresAt": "2027-01-01T00:00:00.000Z",
      "daysRemaining": 307
    }
  }
}
```

**响应示例（非会员）**：

```json
{
  "result": {
    "data": {
      "isMember": false,
      "membershipStatus": "pending",
      "membershipActivatedAt": null,
      "membershipExpiresAt": null,
      "daysRemaining": 0
    }
  }
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| isMember | boolean | 是否为有效会员 |
| membershipStatus | string | 状态：`pending`（未购买）/ `active`（有效）/ `expired`（已过期） |
| membershipActivatedAt | string \| null | 激活时间（ISO 8601 UTC） |
| membershipExpiresAt | string \| null | 到期时间（ISO 8601 UTC） |
| daysRemaining | number | 剩余天数（已过期或未购买为0） |

---

### 4.3 创建会员订单

**接口**：`membership.createOrder`  
**类型**：Mutation（需要认证）  
**说明**：根据选择的套餐创建待支付的会员订单，返回订单ID和订单号供后续预下单使用。

**请求参数**：

```json
{
  "planId": 2
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| planId | number | 是 | 套餐ID，来自 `listPlans` 接口 |

**响应示例**：

```json
{
  "result": {
    "data": {
      "orderId": 1001,
      "orderNo": "MEM20260228001001",
      "planId": 2,
      "planName": "季度会员",
      "amount": "259.00",
      "status": "pending"
    }
  }
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| orderId | number | 订单ID（内部使用） |
| orderNo | string | 订单号（格式：MEM + 日期 + 序号） |
| planId | number | 套餐ID |
| planName | string | 套餐名称 |
| amount | string | 应付金额（元） |
| status | string | 订单状态，初始为 `pending` |

**错误情况**：

| 错误码 | 说明 |
|--------|------|
| NOT_FOUND | 套餐不存在或已下架 |
| CONFLICT | 已有待支付的会员订单，请先完成或取消 |

---

### 4.4 会员订单预下单

**接口**：`membership.prepay`  
**类型**：Mutation（需要认证）  
**说明**：向支付服务商发起预下单请求，获取前端拉起支付所需的参数。支持微信支付H5、支付宝H5和账户余额三种方式。

**请求参数**：

```json
{
  "orderId": 1001,
  "paymentChannel": "wechat",
  "redirectUrl": "https://your-h5-domain.com/membership?status=success"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderId | number | 是 | 订单ID，来自 `createOrder` 接口 |
| paymentChannel | string | 是 | 支付渠道：`wechat` / `alipay` / `balance` |
| redirectUrl | string | 否 | 支付完成后的跳转URL（H5支付必填） |

**响应示例（微信H5支付）**：

```json
{
  "result": {
    "data": {
      "paymentChannel": "wechat",
      "mwebUrl": "https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb?prepay_id=xxx&package=xxx",
      "prepayId": "wx28123456789012345678901234567890",
      "orderNo": "MEM20260228001001"
    }
  }
}
```

**响应示例（支付宝H5支付）**：

```json
{
  "result": {
    "data": {
      "paymentChannel": "alipay",
      "payUrl": "https://openapi.alipay.com/gateway.do?...",
      "orderNo": "MEM20260228001001"
    }
  }
}
```

**响应示例（账户余额支付）**：

```json
{
  "result": {
    "data": {
      "paymentChannel": "balance",
      "success": true,
      "message": "余额支付成功",
      "orderNo": "MEM20260228001001"
    }
  }
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| paymentChannel | string | 支付渠道 |
| mwebUrl | string | 微信H5支付跳转URL（仅微信渠道返回） |
| prepayId | string | 微信预支付ID（仅微信渠道返回） |
| payUrl | string | 支付宝支付跳转URL（仅支付宝渠道返回） |
| success | boolean | 余额支付是否成功（仅余额渠道返回） |
| message | string | 余额支付结果说明（仅余额渠道返回） |
| orderNo | string | 订单号 |

**错误情况**：

| 错误码 | 说明 |
|--------|------|
| NOT_FOUND | 订单不存在 |
| FORBIDDEN | 订单不属于当前用户 |
| BAD_REQUEST | 订单状态不是 pending，无法支付 |
| PAYMENT_FAILED | 余额不足或支付服务商调用失败 |

---

### 4.5 查询会员订单状态

**接口**：`membership.getOrderStatus`  
**类型**：Query（需要认证）  
**说明**：查询指定会员订单的支付状态。前端在拉起支付后，应每隔3秒轮询此接口，直到状态变为 `paid` 或超时（建议最长轮询5分钟）。

**请求参数**：

```json
{
  "orderId": 1001
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderId | number | 是 | 订单ID |

**响应示例**：

```json
{
  "result": {
    "data": {
      "orderId": 1001,
      "orderNo": "MEM20260228001001",
      "status": "paid",
      "paymentChannel": "wechat",
      "paidAt": "2026-02-28T05:30:00.000Z",
      "membershipExpiresAt": "2026-05-28T05:30:00.000Z"
    }
  }
}
```

**status 枚举值**：

| 值 | 说明 |
|----|------|
| pending | 待支付 |
| paid | 已支付（会员已激活） |
| cancelled | 已取消 |
| refunded | 已退款 |

---

### 4.6 取消会员订单

**接口**：`membership.cancelOrder`  
**类型**：Mutation（需要认证）  
**说明**：取消待支付的会员订单。只有 `pending` 状态的订单可以取消。

**请求参数**：

```json
{
  "orderId": 1001
}
```

**响应示例**：

```json
{
  "result": {
    "data": {
      "success": true,
      "message": "订单已取消"
    }
  }
}
```

**错误情况**：

| 错误码 | 说明 |
|--------|------|
| NOT_FOUND | 订单不存在 |
| FORBIDDEN | 订单不属于当前用户 |
| BAD_REQUEST | 订单状态不是 pending，无法取消 |

---

### 4.7 查询会员订单列表

**接口**：`membership.listOrders`  
**类型**：Query（需要认证）  
**说明**：查询当前用户的会员订单历史，按创建时间倒序排列。

**请求参数**：

```json
{
  "page": 1,
  "pageSize": 10
}
```

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | 否 | 1 | 页码（从1开始） |
| pageSize | number | 否 | 10 | 每页条数（最大50） |

**响应示例**：

```json
{
  "result": {
    "data": {
      "total": 3,
      "page": 1,
      "pageSize": 10,
      "items": [
        {
          "id": 1003,
          "orderNo": "MEM20260228001003",
          "planName": "年度会员",
          "amount": "899.00",
          "status": "paid",
          "paymentChannel": "wechat",
          "paidAt": "2026-02-28T05:30:00.000Z",
          "expiresAt": "2027-02-28T05:30:00.000Z",
          "createdAt": "2026-02-28T05:25:00.000Z"
        }
      ]
    }
  }
}
```

---

## 5. Webhook 回调接口

> **重要**：Webhook 接口不走 tRPC，是独立的 Express REST 接口。支付服务商将在支付成功后主动调用这些接口，后端收到后更新订单状态并激活会员。

---

### 5.1 微信支付回调

**路径**：`POST /api/webhook/membership-wechat-notify`  
**调用方**：微信支付服务器  
**说明**：微信支付成功后，微信服务器会向此地址发送 POST 请求。

**请求体（微信发送）**：

```xml
<xml>
  <appid><![CDATA[wx1234567890abcdef]]></appid>
  <mch_id><![CDATA[1234567890]]></mch_id>
  <out_trade_no><![CDATA[MEM20260228001001]]></out_trade_no>
  <transaction_id><![CDATA[4200001234202602281234567890]]></transaction_id>
  <trade_state><![CDATA[SUCCESS]]></trade_state>
  <total_fee>25900</total_fee>
  <sign><![CDATA[ABC123...]]></sign>
</xml>
```

**关键字段**：

| 字段 | 说明 |
|------|------|
| out_trade_no | 商户订单号（即 orderNo） |
| transaction_id | 微信支付交易号 |
| trade_state | 交易状态（SUCCESS 表示成功） |
| sign | 签名（后端需验证） |

**响应要求**：

- 成功处理：返回字符串 `SUCCESS`（HTTP 200）
- 处理失败：返回字符串 `FAIL`（HTTP 400 或 500）
- 微信会在收到非 `SUCCESS` 响应时重试，最多重试8次

**处理逻辑**：

1. 验证微信签名（使用 `WECHAT_API_KEY` 环境变量）
2. 检查 `trade_state === "SUCCESS"`
3. 幂等性检查：若订单已是 `paid` 状态，直接返回 `SUCCESS`
4. 更新 `membershipOrders` 表：`status=paid`，记录 `channelOrderNo` 和 `paymentDate`
5. 查询套餐 `duration` 字段，计算会员到期时间
6. 更新 `users` 表：`isMember=true`，`membershipStatus=active`，`membershipExpiresAt=到期时间`

---

### 5.2 支付宝回调

**路径**：`POST /api/webhook/membership-alipay-notify`  
**调用方**：支付宝服务器  
**说明**：支付宝支付成功后，支付宝服务器会向此地址发送 POST 请求（表单格式）。

**请求体（支付宝发送，application/x-www-form-urlencoded）**：

```
out_trade_no=MEM20260228001001
&trade_no=2026022822001234567890
&trade_status=TRADE_SUCCESS
&total_amount=259.00
&sign=BASE64_ENCODED_SIGNATURE
&sign_type=RSA2
```

**关键字段**：

| 字段 | 说明 |
|------|------|
| out_trade_no | 商户订单号（即 orderNo） |
| trade_no | 支付宝交易号 |
| trade_status | 交易状态（TRADE_SUCCESS 或 TRADE_FINISHED 表示成功） |
| sign | RSA2 签名（后端需用支付宝公钥验证） |

**响应要求**：

- 成功处理：返回字符串 `success`（小写，HTTP 200）
- 处理失败：返回字符串 `failure`（小写）
- 支付宝会在收到非 `success` 响应时重试，24小时内重试8次

---

## 6. 数据模型

### membership_plans（会员套餐表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键，自增 |
| name | VARCHAR(100) | 套餐名称 |
| description | TEXT | 套餐描述 |
| duration | INT | 有效天数（如30/90/365） |
| price | DECIMAL(10,2) | 实际售价（元） |
| originalPrice | DECIMAL(10,2) | 原价（可空，用于划线价） |
| benefits | JSON | 权益列表（字符串数组） |
| isActive | BOOLEAN | 是否启用 |
| sortOrder | INT | 排序权重（升序） |
| createdAt | TIMESTAMP | 创建时间 |
| updatedAt | TIMESTAMP | 更新时间 |

### membershipOrders（会员订单表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键，自增 |
| orderNo | VARCHAR(50) | 订单号（唯一，格式：MEM+日期+序号） |
| userId | INT | 用户ID（关联 users 表） |
| planId | INT | 套餐ID（关联 membership_plans 表） |
| planName | VARCHAR(100) | 套餐名称（冗余，防止套餐被修改后历史订单显示异常） |
| amount | DECIMAL(10,2) | 实际支付金额（元） |
| status | ENUM | 订单状态：`pending`/`paid`/`cancelled`/`refunded` |
| paymentChannel | ENUM | 支付渠道：`wechat`/`alipay`/`balance`（可空） |
| channelOrderNo | VARCHAR(100) | 支付渠道交易号（可空） |
| paymentDate | TIMESTAMP | 支付成功时间（可空） |
| activatedAt | TIMESTAMP | 会员激活时间（可空） |
| expiresAt | TIMESTAMP | 本次购买对应的到期时间（可空） |
| createdAt | TIMESTAMP | 创建时间 |
| updatedAt | TIMESTAMP | 更新时间 |

### users 表（会员相关字段）

| 字段 | 类型 | 说明 |
|------|------|------|
| isMember | BOOLEAN | 是否为有效会员 |
| membershipStatus | ENUM | 会员状态：`pending`/`active`/`expired` |
| membershipOrderId | INT | 最近一次会员订单ID（可空） |
| membershipActivatedAt | TIMESTAMP | 最近一次激活时间（可空） |
| membershipExpiresAt | TIMESTAMP | 会员到期时间（可空） |

> **说明**：customers 表通过 `userId` 字段关联 users 表，查询客户会员状态时 JOIN users 表获取，不在 customers 表冗余存储会员信息（方案A）。

---

## 7. 业务流程

### 7.1 完整支付流程

```
用户 → 打开H5页面 → 调用 listPlans 展示套餐
     → 选择套餐 → 调用 createOrder 创建订单
     → 选择支付方式 → 调用 prepay 预下单
     → 跳转到微信/支付宝完成支付
     → 支付服务商回调 Webhook
     → 后端更新订单状态 + 激活会员
     → 前端轮询 getOrderStatus 检测到 paid
     → 展示支付成功页面
```

### 7.2 续费逻辑

- 若用户当前会员**未过期**：新到期时间 = 当前到期时间 + 套餐天数
- 若用户当前会员**已过期**或**从未购买**：新到期时间 = 支付时间 + 套餐天数

### 7.3 账户余额支付流程

账户余额支付为同步操作，无需 Webhook 回调：

```
调用 prepay（paymentChannel: "balance"）
→ 后端检查余额是否充足
→ 扣减余额
→ 直接更新订单状态为 paid
→ 激活会员
→ 返回 success: true
→ 前端直接展示成功页面（无需轮询）
```

---

## 8. 错误码说明

tRPC 接口使用标准错误码：

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| UNAUTHORIZED | 401 | 未登录或 Session 已过期 |
| FORBIDDEN | 403 | 无权限操作（如操作他人订单） |
| NOT_FOUND | 404 | 资源不存在（套餐、订单等） |
| BAD_REQUEST | 400 | 请求参数错误或业务规则不满足 |
| CONFLICT | 409 | 资源冲突（如已有待支付订单） |
| INTERNAL_SERVER_ERROR | 500 | 服务器内部错误 |

**错误响应格式**：

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "套餐不存在或已下架",
    "data": {
      "httpStatus": 404,
      "path": "membership.createOrder"
    }
  }
}
```

---

## 9. 前端集成指南

### 9.1 安装依赖

```bash
# React Native / Expo
npm install @trpc/client @trpc/react-query @tanstack/react-query superjson
```

### 9.2 tRPC 客户端配置

```typescript
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "./server/routers"; // 从后端导入类型

export const trpc = createTRPCReact<AppRouter>();
```

### 9.3 完整支付流程示例（React Native）

```typescript
import { useState } from "react";
import { Linking } from "react-native";
import { trpc } from "./lib/trpc";

export function MembershipPayment() {
  const [orderId, setOrderId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  // 1. 获取套餐列表
  const { data: plans } = trpc.membership.listPlans.useQuery();

  // 2. 创建订单
  const createOrder = trpc.membership.createOrder.useMutation({
    onSuccess: (data) => {
      setOrderId(data.orderId);
    },
  });

  // 3. 预下单
  const prepay = trpc.membership.prepay.useMutation({
    onSuccess: async (data) => {
      if (data.paymentChannel === "wechat" && data.mwebUrl) {
        // 跳转到微信H5支付
        await Linking.openURL(data.mwebUrl);
        // 开始轮询订单状态
        startPolling(orderId!);
      } else if (data.paymentChannel === "alipay" && data.payUrl) {
        // 跳转到支付宝H5支付
        await Linking.openURL(data.payUrl);
        startPolling(orderId!);
      } else if (data.paymentChannel === "balance" && data.success) {
        // 余额支付成功，直接刷新状态
        utils.membership.getStatus.invalidate();
        alert("支付成功！会员已激活");
      }
    },
  });

  // 4. 轮询订单状态
  const { data: orderStatus, refetch } = trpc.membership.getOrderStatus.useQuery(
    { orderId: orderId! },
    {
      enabled: !!orderId,
      refetchInterval: (data) => {
        // 未支付时每3秒轮询一次，支付后停止
        return data?.status === "pending" ? 3000 : false;
      },
      onSuccess: (data) => {
        if (data.status === "paid") {
          utils.membership.getStatus.invalidate();
          alert("支付成功！会员已激活");
        }
      },
    }
  );

  const handleBuy = async (planId: number) => {
    // 创建订单
    const order = await createOrder.mutateAsync({ planId });
    // 预下单（微信H5支付）
    await prepay.mutateAsync({
      orderId: order.orderId,
      paymentChannel: "wechat",
      redirectUrl: "https://your-h5-domain.com/membership?status=success",
    });
  };

  return (
    // ... 渲染套餐列表和支付按钮
  );
}

function startPolling(orderId: number) {
  // 轮询逻辑已在 useQuery 的 refetchInterval 中处理
  console.log(`开始轮询订单 ${orderId} 的支付状态`);
}
```

### 9.4 H5 页面访问路径

| 环境 | URL |
|------|-----|
| 开发环境 | `http://localhost:3000/membership` |
| 生产环境 | `https://your-domain.com/membership` |

---

## 10. 环境变量配置

在生产环境中，需要配置以下环境变量：

| 变量名 | 说明 | 是否必填 |
|--------|------|----------|
| `WECHAT_PAY_APP_ID` | 微信支付 AppID | 使用微信支付时必填 |
| `WECHAT_PAY_MCH_ID` | 微信支付商户号 | 使用微信支付时必填 |
| `WECHAT_API_KEY` | 微信支付 API 密钥（用于签名验证） | 使用微信支付时必填 |
| `ALIPAY_APP_ID` | 支付宝 AppID | 使用支付宝时必填 |
| `ALIPAY_PRIVATE_KEY` | 支付宝应用私钥（RSA2） | 使用支付宝时必填 |
| `ALIPAY_PUBLIC_KEY` | 支付宝公钥（用于回调验签） | 使用支付宝时必填 |
| `MEMBERSHIP_WEBHOOK_BASE_URL` | Webhook 回调的公网基础URL | 必填 |

**Webhook 回调地址配置**：

在微信支付商户后台和支付宝开放平台，分别配置以下回调地址：

```
微信支付回调：https://your-domain.com/api/webhook/membership-wechat-notify
支付宝回调：https://your-domain.com/api/webhook/membership-alipay-notify
```

> **注意**：回调地址必须是公网可访问的 HTTPS 地址，不能使用 IP 地址或 localhost。

---

*文档由 Manus AI 生成 | 版本 v1.0.0 | 2026-02-28*
