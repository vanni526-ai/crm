# 销售管理与财务管理 API 接口文档

> 本文档为前端 App（销售、老师、合伙人页面）提供完整的后端 API 调用说明。  
> 基础地址：`https://crm.bdsm.com.cn`  
> 协议：tRPC over HTTP（JSON）  
> 认证方式：Bearer Token（通过 `Authorization: Bearer <token>` 请求头传递）

---

## 目录

1. [通用说明](#1-通用说明)
2. [认证接口](#2-认证接口)
3. [销售人员管理](#3-销售人员管理)
4. [订单管理](#4-订单管理)
5. [客户管理](#5-客户管理)
6. [老师管理](#6-老师管理)
7. [课程排课与预约](#7-课程排课与预约)
8. [财务管理](#8-财务管理)
9. [数据统计分析](#9-数据统计分析)
10. [元数据查询](#10-元数据查询)
11. [课程管理](#11-课程管理)
12. [教室管理](#12-教室管理)
13. [申请通知](#13-申请通知)
14. [React Native 集成示例](#14-react-native-集成示例)

---

## 1. 通用说明

### 1.1 请求格式

所有接口通过 tRPC 协议调用，底层为 HTTP 请求。

**Query 请求（读取数据）：**

```
GET /api/trpc/<路由路径>?input=<URL编码的JSON>
```

**Mutation 请求（写入数据）：**

```
POST /api/trpc/<路由路径>
Content-Type: application/json

{"json": <输入参数>}
```

### 1.2 请求头

| 请求头 | 说明 | 示例 |
|--------|------|------|
| `Authorization` | Bearer Token 认证 | `Bearer eyJhbGciOi...` |
| `Content-Type` | 请求体类型（Mutation 必须） | `application/json` |

### 1.3 响应格式

```json
{
  "result": {
    "data": {
      "json": { /* 实际返回数据 */ }
    }
  }
}
```

### 1.4 错误响应

```json
{
  "error": {
    "message": "错误描述",
    "code": -32600,
    "data": {
      "code": "UNAUTHORIZED",
      "httpStatus": 401
    }
  }
}
```

### 1.5 权限等级说明

| 权限等级 | 说明 |
|----------|------|
| `public` | 无需登录即可调用 |
| `protected` | 需要登录（任意角色） |
| `salesOrAdmin` | 需要销售或管理员角色 |
| `financeOrAdmin` | 需要财务或管理员角色 |
| `admin` | 需要管理员角色 |

---

## 2. 认证接口

### 2.1 用户登录（App 用户）

- **路径：** `auth.loginWithUserAccount`
- **方法：** Mutation（POST）
- **权限：** public

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名/手机号/邮箱 |
| password | string | 是 | 密码 |

**响应：**

```json
{
  "success": true,
  "token": "eyJhbGciOi...",
  "user": {
    "id": 1,
    "openId": "user_abc123",
    "name": "张三",
    "nickname": "小张",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "role": "user",
    "roles": ["user"],
    "isActive": true
  }
}
```

### 2.2 系统账号登录（销售/财务/管理员）

- **路径：** `auth.login`
- **方法：** Mutation（POST）
- **权限：** public

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 系统账号用户名 |
| password | string | 是 | 密码 |

**响应：**

```json
{
  "success": true,
  "token": "eyJhbGciOi...",
  "user": {
    "id": 1,
    "name": "admin",
    "nickname": "管理员",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### 2.3 验证 Token

- **路径：** `auth.verifyToken`
- **方法：** Query（GET）
- **权限：** public

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | JWT Token |

**响应：**

```json
{
  "valid": true,
  "user": {
    "id": 1,
    "username": "admin",
    "identity": "admin"
  }
}
```

### 2.4 刷新 Token

- **路径：** `auth.refreshToken`
- **方法：** Mutation（POST）
- **权限：** public

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 当前 Token（可已过期，7天内可刷新） |

**响应：**

```json
{
  "success": true,
  "token": "eyJhbGciOi...(新Token)",
  "expiresIn": 86400,
  "user": {
    "id": 1,
    "openId": "user_abc123",
    "name": "张三",
    "role": "user",
    "roles": ["user"]
  }
}
```

### 2.5 用户注册

- **路径：** `auth.register`
- **方法：** Mutation（POST）
- **权限：** public

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 是 | 手机号（11位，格式：`/^1[3-9]\d{9}$/`） |
| password | string | 是 | 密码（6-20位） |
| name | string | 否 | 用户名 |
| nickname | string | 否 | 昵称 |

**响应：**

```json
{
  "success": true,
  "message": "注册成功",
  "token": "eyJhbGciOi...",
  "user": {
    "id": 1,
    "openId": "user_abc123",
    "phone": "13800138000",
    "name": "张三",
    "role": "user",
    "roles": ["user"]
  }
}
```

### 2.6 修改密码

- **路径：** `auth.changePassword`
- **方法：** Mutation（POST）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| oldPassword | string | 是 | 旧密码 |
| newPassword | string | 是 | 新密码（6-20位） |

**响应：**

```json
{
  "success": true
}
```

### 2.7 忘记密码（手机号重置）

- **路径：** `auth.resetPassword`
- **方法：** Mutation（POST）
- **权限：** public

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 是 | 手机号（11位） |
| code | string | 是 | 短信验证码（测试环境固定 `123456`） |
| newPassword | string | 是 | 新密码（6-20位） |

**响应：**

```json
{
  "success": true
}
```

---

## 3. 销售人员管理

### 3.1 获取所有销售人员

- **路径：** `salespersons.list`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：** 无

**响应：** 销售人员数组

```json
[
  {
    "id": 1,
    "name": "张三",
    "nickname": "小张",
    "phone": "13800138000",
    "email": "zhangsan@example.com",
    "wechat": "zhangsan_wx",
    "commissionRate": "10",
    "city": "北京",
    "notes": "备注",
    "isActive": true,
    "totalOrders": 50,
    "totalSales": "150000.00",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### 3.2 搜索销售人员

- **路径：** `salespersons.search`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 是 | 搜索关键词（匹配姓名） |

### 3.3 创建销售人员

- **路径：** `salespersons.create`
- **方法：** Mutation（POST）
- **权限：** admin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 姓名（不能为空） |
| nickname | string | 否 | 昵称 |
| phone | string | 否 | 手机号 |
| email | string | 否 | 邮箱 |
| wechat | string | 否 | 微信号 |
| commissionRate | number | 否 | 提成比例（0-100） |
| city | string | 否 | 所在城市 |
| notes | string | 否 | 备注 |

**响应：**

```json
{
  "id": 1,
  "success": true
}
```

### 3.4 更新销售人员

- **路径：** `salespersons.update`
- **方法：** Mutation（POST）
- **权限：** admin

**请求参数：** 同创建，额外必填 `id: number`

### 3.5 删除销售人员

- **路径：** `salespersons.delete`
- **方法：** Mutation（POST）
- **权限：** admin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 销售人员ID |

### 3.6 更新销售人员状态

- **路径：** `salespersons.updateStatus`
- **方法：** Mutation（POST）
- **权限：** admin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 销售人员ID |
| isActive | boolean | 是 | 是否激活 |

### 3.7 获取销售统计数据

- **路径：** `salespersons.getStatistics`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| salespersonId | number | 否 | 指定销售人员ID |
| startDate | string | 否 | 开始日期（YYYY-MM-DD） |
| endDate | string | 否 | 结束日期（YYYY-MM-DD） |
| groupBy | string | 否 | 分组方式：`month` 或 `year` |

### 3.8 获取月度销售额

- **路径：** `salespersons.getMonthlySales`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| salespersonId | number | 否 | 指定销售人员ID |
| year | number | 是 | 年份 |

### 3.9 获取年度销售额

- **路径：** `salespersons.getYearlySales`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| salespersonId | number | 否 | 指定销售人员ID |
| startYear | number | 否 | 起始年份 |
| endYear | number | 否 | 结束年份 |

### 3.10 更新所有销售人员统计数据

- **路径：** `salespersons.updateAllStats`
- **方法：** Mutation（POST）
- **权限：** admin

**请求参数：** 无

**响应：**

```json
{
  "success": true,
  "data": [/* 更新后的销售人员数据 */],
  "message": "已更新 10 位销售人员的数据"
}
```

### 3.11 更新单个销售人员统计数据

- **路径：** `salespersons.updateStats`
- **方法：** Mutation（POST）
- **权限：** admin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 销售人员ID |

---

## 4. 订单管理

### 4.1 获取所有订单

- **路径：** `orders.list`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：** 无

**响应：** 订单数组，每条订单包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 订单ID |
| orderNo | string | 订单号 |
| customerId | number | 客户ID |
| customerName | string | 客户名 |
| salespersonId | number | 销售人员ID |
| salesPerson | string | 销售人员名 |
| trafficSource | string | 流量来源 |
| paymentAmount | string | 支付金额 |
| courseAmount | string | 课程金额 |
| accountBalance | string | 账户余额 |
| paymentCity | string | 支付城市 |
| paymentChannel | string | 支付渠道 |
| channelOrderNo | string | 渠道订单号 |
| paymentDate | string | 支付日期 |
| paymentTime | string | 支付时间 |
| teacherFee | string | 老师费用 |
| transportFee | string | 车费 |
| otherFee | string | 其他费用 |
| partnerFee | string | 合伙人费 |
| finalAmount | string | 金串到账金额 |
| deliveryCity | string | 交付城市 |
| deliveryRoom | string | 交付教室 |
| deliveryTeacher | string | 交付老师 |
| deliveryCourse | string | 交付课程 |
| classDate | string | 上课日期 |
| classTime | string | 上课时间 |
| status | string | 订单状态：pending/paid/completed/cancelled/refunded |
| deliveryStatus | string | 交付状态：undelivered/delivered |
| notes | string | 备注 |
| createdAt | string | 创建时间 |

### 4.2 App 用户创建订单

- **路径：** `orders.appCreate`
- **方法：** Mutation（POST）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| customerName | string | 否 | 客户名 |
| paymentAmount | string | 是 | 支付金额 |
| courseAmount | string | 是 | 课程金额 |
| paymentChannel | string | 否 | 支付渠道 |
| channelOrderNo | string | 否 | 渠道订单号 |
| paymentDate | string | 否 | 支付日期 |
| paymentTime | string | 否 | 支付时间 |
| deliveryCity | string | 否 | 交付城市 |
| deliveryRoom | string | 否 | 交付教室 |
| deliveryClassroomId | number | 否 | 教室ID |
| deliveryTeacher | string | 否 | 交付老师 |
| deliveryCourse | string | 否 | 交付课程 |
| classDate | string | 否 | 上课日期 |
| classTime | string | 否 | 上课时间 |
| notes | string | 否 | 备注 |

**响应：**

```json
{
  "id": 1,
  "orderNo": "ORD20260206001",
  "success": true
}
```

### 4.3 获取当前用户的订单列表

- **路径：** `orders.myOrders`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 筛选状态：all/pending/paid/completed/cancelled/refunded |
| limit | number | 否 | 每页数量（默认50） |
| offset | number | 否 | 偏移量（默认0） |

**响应：**

```json
{
  "orders": [/* 订单数组 */],
  "total": 100,
  "hasMore": true
}
```

### 4.4 创建订单（管理端）

- **路径：** `orders.create`
- **方法：** Mutation（POST）
- **权限：** salesOrAdmin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNo | string | 否 | 订单号（不填自动生成） |
| customerId | number | 否 | 客户ID（用于余额扣款） |
| customerName | string | 否 | 客户名 |
| salespersonId | number | 否 | 销售人员ID |
| salesPerson | string | 否 | 销售人员名 |
| trafficSource | string | 否 | 流量来源 |
| paymentAmount | string | 是 | 支付金额 |
| courseAmount | string | 是 | 课程金额 |
| accountBalance | string | 否 | 账户余额 |
| useAccountBalance | boolean | 否 | 是否使用账户余额支付 |
| paymentCity | string | 否 | 支付城市 |
| paymentChannel | string | 否 | 支付渠道 |
| channelOrderNo | string | 否 | 渠道订单号 |
| paymentDate | string | 否 | 支付日期 |
| paymentTime | string | 否 | 支付时间 |
| teacherFee | string | 否 | 老师费用 |
| transportFee | string | 否 | 车费 |
| otherFee | string | 否 | 其他费用 |
| partnerFee | string | 否 | 合伙人费 |
| finalAmount | string | 否 | 金串到账金额 |
| deliveryCity | string | 否 | 交付城市 |
| deliveryRoom | string | 否 | 交付教室 |
| deliveryTeacher | string | 否 | 交付老师 |
| deliveryCourse | string | 否 | 交付课程 |
| classDate | string | 否 | 上课日期 |
| classTime | string | 否 | 上课时间 |
| status | string | 否 | 订单状态 |
| deliveryStatus | string | 否 | 交付状态 |
| notes | string | 否 | 备注 |

### 4.5 更新订单

- **路径：** `orders.update`
- **方法：** Mutation（POST）
- **权限：** salesOrAdmin

**请求参数：** 同创建，额外必填 `id: number`

### 4.6 删除订单

- **路径：** `orders.delete`
- **方法：** Mutation（POST）
- **权限：** salesOrAdmin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 订单ID |

### 4.7 批量删除订单

- **路径：** `orders.batchDelete`
- **方法：** Mutation（POST）
- **权限：** salesOrAdmin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ids | number[] | 是 | 订单ID数组 |

### 4.8 批量更新订单状态

- **路径：** `orders.batchUpdateStatus`
- **方法：** Mutation（POST）
- **权限：** salesOrAdmin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ids | number[] | 是 | 订单ID数组 |
| status | string | 是 | 目标状态：pending/paid/completed/cancelled/refunded |

### 4.9 更新单个订单交付状态

- **路径：** `orders.updateDeliveryStatus`
- **方法：** Mutation（POST）
- **权限：** salesOrAdmin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 订单ID |
| deliveryStatus | string | 是 | 交付状态：undelivered/delivered |

### 4.10 批量更新订单交付状态

- **路径：** `orders.batchUpdateDeliveryStatus`
- **方法：** Mutation（POST）
- **权限：** salesOrAdmin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ids | number[] | 是 | 订单ID数组 |
| deliveryStatus | string | 是 | 交付状态：undelivered/delivered |

### 4.11 按日期范围查询订单

- **路径：** `orders.getByDateRange`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 是 | 开始日期 |
| endDate | string | 是 | 结束日期 |

### 4.12 导出对账报表

- **路径：** `orders.exportReconciliationReport`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 是 | 开始日期 |
| endDate | string | 是 | 结束日期 |
| paymentChannel | string | 否 | 支付渠道筛选（`all` 表示全部） |

**响应：**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "totalAmount": 500000,
  "totalCount": 200,
  "groupedByChannel": [
    {
      "channel": "支付宝",
      "orders": [/* 订单数组 */],
      "totalAmount": 300000,
      "count": 120
    }
  ],
  "allOrders": [/* 全部订单 */]
}
```

### 4.13 导出订单 Excel

- **路径：** `orders.exportExcel`
- **方法：** Mutation（POST）
- **权限：** salesOrAdmin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderIds | number[] | 否 | 指定订单ID（不填导出全部） |

**响应：**

```json
{
  "success": true,
  "data": "UEsDBBQAAAA...(Base64编码的Excel文件)",
  "filename": "订单列表_2026-2-6.xlsx"
}
```

---

## 5. 客户管理

### 5.1 获取客户列表

- **路径：** `customers.list`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| minSpent | number | 否 | 最小累计消费 |
| maxSpent | number | 否 | 最大累计消费 |
| minClassCount | number | 否 | 最小上课次数 |
| maxClassCount | number | 否 | 最大上课次数 |
| lastConsumptionDays | number | 否 | 最后消费天数（如30表示30天内） |
| trafficSource | string | 否 | 流量来源 |
| highValue | boolean | 否 | 高价值客户（累计消费>5000或上课>5次） |
| churned | boolean | 否 | 流失客户（最后消费>30天且有消费） |
| sortBy | string | 否 | 排序字段：totalSpent/classCount/lastOrderDate/firstOrderDate/createdAt |
| sortOrder | string | 否 | 排序方向：asc/desc |

**响应：** 客户数组

```json
[
  {
    "id": 1,
    "name": "李四",
    "phone": "13900139000",
    "totalSpent": "50000.00",
    "classCount": 10,
    "lastOrderDate": "2026-01-15",
    "firstOrderDate": "2025-06-01",
    "trafficSource": "朋友推荐",
    "createdAt": "2025-06-01T00:00:00.000Z"
  }
]
```

### 5.2 刷新所有客户统计数据

- **路径：** `customers.refreshAllStats`
- **方法：** Mutation（POST）
- **权限：** protected

**请求参数：** 无

**响应：**

```json
{
  "taskId": "task_abc123"
}
```

> 此接口为异步执行，返回 taskId 后可通过 `customers.getProgress` 查询进度。

### 5.3 获取任务进度

- **路径：** `customers.getProgress`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| taskId | string | 是 | 任务ID |

---

## 6. 老师管理

### 6.1 获取所有老师

- **路径：** `teachers.list`
- **方法：** Query（GET）
- **权限：** public

**请求参数：** 无

**响应：** 老师数组

```json
[
  {
    "id": 1,
    "name": "王老师",
    "phone": "13700137000",
    "status": "active",
    "customerType": "S",
    "category": "S",
    "city": "北京;上海",
    "notes": "备注",
    "aliases": "小王,王老",
    "avatarUrl": "https://example.com/avatar.jpg",
    "contractEndDate": "2026-12-31",
    "joinDate": "2024-01-01",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 6.2 根据 ID 获取老师

- **路径：** `teachers.getById`
- **方法：** Query（GET）
- **权限：** public

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 老师ID |

### 6.3 创建老师

- **路径：** `teachers.create`
- **方法：** Mutation（POST）
- **权限：** admin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 姓名 |
| phone | string | 否 | 手机号 |
| status | string | 否 | 状态 |
| customerType | string | 否 | 老师类型 |
| notes | string | 否 | 备注 |
| category | string | 否 | 分类（S/M/SW等） |
| city | string | 是 | 城市（多个用分号分隔） |
| avatarUrl | string | 否 | 头像URL |

### 6.4 更新老师

- **路径：** `teachers.update`
- **方法：** Mutation（POST）
- **权限：** admin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 老师ID |
| data | object | 是 | 更新数据（同创建参数，均为可选） |

### 6.5 获取所有老师名字

- **路径：** `teachers.getAllTeacherNames`
- **方法：** Query（GET）
- **权限：** protected

**响应：** 字符串数组 `["王老师", "李老师", ...]`

### 6.6 获取单个老师统计数据

- **路径：** `teachers.getStats`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| teacherId | number | 是 | 老师ID |
| startDate | Date | 否 | 开始日期 |
| endDate | Date | 否 | 结束日期 |

### 6.7 获取所有老师统计数据

- **路径：** `teachers.getAllStats`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | Date | 否 | 开始日期 |
| endDate | Date | 否 | 结束日期 |

---

## 7. 课程排课与预约

### 7.1 获取排课列表

- **路径：** `schedules.list`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startTime | Date | 否 | 开始时间 |
| endTime | Date | 否 | 结束时间 |

### 7.2 获取排课列表（含订单信息）

- **路径：** `schedules.listWithOrderInfo`
- **方法：** Query（GET）
- **权限：** protected

### 7.3 按老师获取排课

- **路径：** `schedules.getByTeacher`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| teacherId | number | 是 | 老师ID |

### 7.4 创建课程预约（App 用户）

- **路径：** `schedules.createAppointment`
- **方法：** Mutation（POST）
- **权限：** public

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | number | 否 | 用户ID |
| cityId | number | 是 | 城市ID |
| teacherId | number | 是 | 老师ID |
| courseId | number | 是 | 课程ID |
| scheduledDate | string | 是 | 预约日期（YYYY-MM-DD） |
| scheduledTime | string | 是 | 预约时间（HH:mm） |
| contactName | string | 是 | 联系人姓名 |
| contactPhone | string | 是 | 联系电话 |
| notes | string | 否 | 备注 |

**响应：**

```json
{
  "success": true,
  "scheduleId": 1,
  "message": "预约成功"
}
```

### 7.5 查询用户预约列表（App 用户）

- **路径：** `schedules.listAppointments`
- **方法：** Query（GET）
- **权限：** public

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | number | 是 | 用户ID |
| status | string | 否 | 状态：scheduled/completed/cancelled |
| startDate | string | 否 | 开始日期（YYYY-MM-DD） |
| endDate | string | 否 | 结束日期（YYYY-MM-DD） |

**响应：**

```json
{
  "success": true,
  "data": [/* 预约数组 */],
  "count": 5
}
```

### 7.6 取消预约（App 用户）

- **路径：** `schedules.cancelAppointment`
- **方法：** Mutation（POST）
- **权限：** public

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| scheduleId | number | 是 | 排课ID |
| userId | number | 是 | 用户ID |

### 7.7 月度合伙人费用统计

- **路径：** `schedules.getMonthlyPartnerSettlement`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| year | number | 是 | 年份 |
| month | number | 是 | 月份（1-12） |

### 7.8 按日期范围统计合伙人费用

- **路径：** `schedules.getPartnerSettlementByDateRange`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | Date | 是 | 开始日期 |
| endDate | Date | 是 | 结束日期 |

---

## 8. 财务管理

### 8.1 老师费用结算 - 按老师查询

- **路径：** `teacherPayments.getByTeacher`
- **方法：** Query（GET）
- **权限：** financeOrAdmin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| teacherId | number | 是 | 老师ID |

### 8.2 老师费用结算 - 创建

- **路径：** `teacherPayments.create`
- **方法：** Mutation（POST）
- **权限：** financeOrAdmin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| teacherId | number | 是 | 老师ID |
| orderId | number | 否 | 关联订单ID |
| scheduleId | number | 否 | 关联排课ID |
| amount | string | 是 | 金额 |
| paymentMethod | string | 否 | 支付方式：wechat/alipay/bank/cash/other |
| transactionNo | string | 否 | 交易号 |
| paymentTime | Date | 否 | 支付时间 |
| status | string | 否 | 状态：pending/paid |
| notes | string | 否 | 备注 |

### 8.3 老师费用结算 - 更新状态

- **路径：** `teacherPayments.updateStatus`
- **方法：** Mutation（POST）
- **权限：** financeOrAdmin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 结算记录ID |
| status | string | 是 | 状态：pending/paid |
| paymentTime | Date | 否 | 支付时间 |

### 8.4 财务对账 - 获取所有对账记录

- **路径：** `reconciliations.list`
- **方法：** Query（GET）
- **权限：** financeOrAdmin

### 8.5 财务对账 - 创建对账记录

- **路径：** `reconciliations.create`
- **方法：** Mutation（POST）
- **权限：** financeOrAdmin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| periodStart | string | 是 | 对账期间开始日期 |
| periodEnd | string | 是 | 对账期间结束日期 |
| totalIncome | string | 是 | 总收入 |
| totalExpense | string | 是 | 总支出 |
| teacherFeeTotal | string | 否 | 老师费用合计 |
| transportFeeTotal | string | 否 | 车费合计 |
| otherFeeTotal | string | 否 | 其他费用合计 |
| partnerFeeTotal | string | 否 | 合伙人费合计 |
| profit | string | 是 | 利润 |
| notes | string | 否 | 备注 |

### 8.6 财务对账 - 更新对账记录

- **路径：** `reconciliations.update`
- **方法：** Mutation（POST）
- **权限：** financeOrAdmin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 对账记录ID |
| data.status | string | 否 | 状态：draft/confirmed |
| data.notes | string | 否 | 备注 |

### 8.7 导出财务报表 Excel

- **路径：** `finance.exportExcel`
- **方法：** Mutation（POST）
- **权限：** financeOrAdmin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |

**响应：**

```json
{
  "success": true,
  "data": "UEsDBBQAAAA...(Base64编码)",
  "filename": "财务报表_2026-2-6.xlsx"
}
```

### 8.8 智能对账匹配

- **路径：** `reconciliation.intelligentMatch`
- **方法：** Mutation（POST）
- **权限：** financeOrAdmin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| scheduleIds | number[] | 否 | 指定课程日程ID |
| orderIds | number[] | 否 | 指定订单ID |

**响应：**

```json
{
  "success": true,
  "matchedCount": 5,
  "matches": [
    {
      "scheduleId": 1,
      "orderId": 10,
      "confidence": 95,
      "reason": "客户名+上课日期+老师名完全匹配"
    }
  ],
  "message": "成功匹配 5 条记录"
}
```

### 8.9 手动创建匹配关系

- **路径：** `reconciliation.createMatch`
- **方法：** Mutation（POST）
- **权限：** financeOrAdmin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| scheduleId | number | 是 | 课程日程ID |
| orderId | number | 是 | 订单ID |

### 8.10 获取所有匹配关系

- **路径：** `reconciliation.getAllMatches`
- **方法：** Query（GET）
- **权限：** financeOrAdmin

### 8.11 获取未匹配的课程日程

- **路径：** `reconciliation.getUnmatchedSchedules`
- **方法：** Query（GET）
- **权限：** financeOrAdmin

### 8.12 获取未匹配的订单

- **路径：** `reconciliation.getUnmatchedOrders`
- **方法：** Query（GET）
- **权限：** financeOrAdmin

### 8.13 月度对账报表

- **路径：** `reconciliation.getMonthlyReport`
- **方法：** Query（GET）
- **权限：** financeOrAdmin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 是 | 开始日期（YYYY-MM-DD） |
| endDate | string | 是 | 结束日期（YYYY-MM-DD） |
| city | string | 否 | 城市筛选 |
| salesPerson | string | 否 | 销售人员筛选 |

### 8.14 Excel 报表导出

#### 综合财务报表

- **路径：** `excelReport.exportFinancialReport`
- **方法：** Mutation（POST）
- **权限：** financeOrAdmin

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |

#### 城市业绩报表

- **路径：** `excelReport.exportCityReport`
- **方法：** Mutation（POST）
- **权限：** financeOrAdmin

#### 老师结算报表

- **路径：** `excelReport.exportTeacherSettlementReport`
- **方法：** Mutation（POST）
- **权限：** financeOrAdmin

#### 订单数据导出

- **路径：** `excelReport.exportOrderData`
- **方法：** Mutation（POST）
- **权限：** protected

#### 获取可用报表类型

- **路径：** `excelReport.getAvailableReports`
- **方法：** Query（GET）
- **权限：** protected

---

## 9. 数据统计分析

### 9.1 订单统计

- **路径：** `analytics.orderStats`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 是 | 开始日期 |
| endDate | string | 是 | 结束日期 |

### 9.2 城市收入统计

- **路径：** `analytics.cityRevenue`
- **方法：** Query（GET）
- **权限：** protected

### 9.3 城市收入趋势

- **路径：** `analytics.cityRevenueTrend`
- **方法：** Query（GET）
- **权限：** public

### 9.4 老师月度统计

- **路径：** `analytics.teacherMonthlyStats`
- **方法：** Query（GET）
- **权限：** public

### 9.5 流量来源月度统计

- **路径：** `analytics.trafficSourceMonthlyStats`
- **方法：** Query（GET）
- **权限：** public

### 9.6 流量来源分析

- **路径：** `analytics.trafficSourceAnalysis`
- **方法：** Query（GET）
- **权限：** public

### 9.7 销售人员支付统计

- **路径：** `analytics.salesPersonPaymentStats`
- **方法：** Query（GET）
- **权限：** public

### 9.8 客户余额排名

- **路径：** `analytics.customerBalanceRanking`
- **方法：** Query（GET）
- **权限：** public

### 9.9 城市财务统计

- **路径：** `analytics.cityFinancialStats`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dateRange | string | 否 | 日期范围 |

### 9.10 客户统计

- **路径：** `analytics.customerStats`
- **方法：** Query（GET）
- **权限：** protected

### 9.11 流失风险客户

- **路径：** `analytics.churnRiskCustomers`
- **方法：** Query（GET）
- **权限：** protected

### 9.12 不活跃客户

- **路径：** `analytics.inactiveCustomers`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| days | number | 否 | 不活跃天数（默认30） |

### 9.13 城市合伙人费配置

- **路径：** `analytics.getAllCityPartnerConfig`
- **方法：** Query（GET）
- **权限：** protected

### 9.14 计算合伙人费

- **路径：** `analytics.calculatePartnerFee`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| city | string | 是 | 城市名（可为 null） |
| courseAmount | number | 是 | 课程金额 |
| teacherFee | number | 是 | 老师费用 |

**响应：**

```json
{
  "partnerFee": 1500
}
```

### 9.15 获取所有城市及统计

- **路径：** `analytics.getAllCitiesWithStats`
- **方法：** Query（GET）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |

---

## 10. 元数据查询

> 以下接口均为 **public** 权限，无需登录即可调用，适合 App 初始化时加载基础数据。

### 10.1 一次性获取所有元数据

- **路径：** `metadata.getAll`
- **方法：** Query（GET）
- **权限：** public

**响应：**

```json
{
  "success": true,
  "data": {
    "cities": ["北京", "上海", "武汉"],
    "courses": ["入门课", "深度课"],
    "classrooms": ["教室A", "教室B"],
    "teacherNames": ["王老师", "李老师"],
    "salespeople": [/* 销售人员数组 */],
    "teacherCategories": ["S", "M", "SW"],
    "courseAmounts": ["2000", "3000", "5000"]
  },
  "counts": {
    "cities": 3,
    "courses": 2,
    "classrooms": 2,
    "teacherNames": 2,
    "salespeople": 5,
    "teacherCategories": 3,
    "courseAmounts": 3
  }
}
```

### 10.2 单独获取各类元数据

| 路径 | 说明 |
|------|------|
| `metadata.getCities` | 获取所有唯一城市列表 |
| `metadata.getCourses` | 获取所有唯一课程类型列表 |
| `metadata.getClassrooms` | 获取所有唯一教室列表 |
| `metadata.getTeacherNames` | 获取所有唯一老师名称列表 |
| `metadata.getSalespeople` | 获取所有销售人员列表 |
| `metadata.getTeacherCategories` | 获取所有唯一老师分类列表 |
| `metadata.getCourseAmounts` | 获取所有唯一课程价格列表 |

每个接口返回格式统一：

```json
{
  "success": true,
  "data": [/* 数据数组 */],
  "count": 10
}
```

---

## 11. 课程管理

### 11.1 获取所有课程

- **路径：** `courses.list`
- **方法：** Query（GET）
- **权限：** public

**响应：**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "入门体验课",
      "introduction": "适合初学者的体验课",
      "description": "详细描述...",
      "price": "2000",
      "duration": "2",
      "level": "入门",
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "count": 5
}
```

### 11.2 根据 ID 获取课程详情

- **路径：** `courses.getById`
- **方法：** Query（GET）
- **权限：** public

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 课程ID |

### 11.3 创建课程

- **路径：** `courses.create`
- **方法：** Mutation（POST）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 课程名称 |
| introduction | string | 否 | 课程介绍（不超过20字） |
| description | string | 否 | 详细描述 |
| price | number | 是 | 课程价格（≥0） |
| duration | number | 是 | 课程时长（小时，≥0） |
| level | string | 是 | 课程等级：入门/深度/订制/剧本 |

### 11.4 更新课程

- **路径：** `courses.update`
- **方法：** Mutation（POST）
- **权限：** protected

**请求参数：** 同创建，额外必填 `id: number`，其余字段均为可选

### 11.5 切换课程启用状态

- **路径：** `courses.toggleActive`
- **方法：** Mutation（POST）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 课程ID |

### 11.6 删除课程

- **路径：** `courses.delete`
- **方法：** Mutation（POST）
- **权限：** protected

---

## 12. 教室管理

### 12.1 获取所有教室

- **路径：** `classrooms.list`
- **方法：** Query（GET）
- **权限：** public

### 12.2 根据城市 ID 获取教室

- **路径：** `classrooms.getByCityId`
- **方法：** Query（GET）
- **权限：** public

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| cityId | number | 是 | 城市ID |

### 12.3 根据城市名称获取教室

- **路径：** `classrooms.getByCityName`
- **方法：** Query（GET）
- **权限：** public

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| cityName | string | 是 | 城市名称 |

### 12.4 根据 ID 获取教室详情

- **路径：** `classrooms.getById`
- **方法：** Query（GET）
- **权限：** public

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 教室ID |

**响应：**

```json
{
  "id": 1,
  "cityId": 1,
  "cityName": "北京",
  "name": "朝阳教室",
  "address": "北京市朝阳区xxx路xxx号",
  "notes": "备注",
  "isActive": true,
  "sortOrder": 0,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### 12.5 创建教室

- **路径：** `classrooms.create`
- **方法：** Mutation（POST）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| cityId | number | 是 | 城市ID |
| cityName | string | 是 | 城市名称 |
| name | string | 是 | 教室名称 |
| address | string | 是 | 教室地址 |
| notes | string | 否 | 备注 |

### 12.6 更新教室

- **路径：** `classrooms.update`
- **方法：** Mutation（POST）
- **权限：** protected

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 教室ID |
| name | string | 否 | 教室名称 |
| address | string | 否 | 教室地址 |
| notes | string | 否 | 备注 |
| isActive | boolean | 否 | 是否启用 |
| sortOrder | number | 否 | 排序 |

---

## 13. 申请通知

### 13.1 提交留言（App 用户）

- **路径：** `notifications.submit`
- **方法：** Mutation（POST）
- **权限：** public

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | number | 是 | 用户ID |
| userName | string | 否 | 用户名 |
| userPhone | string | 否 | 手机号 |
| type | string | 否 | 类型：general/complaint/suggestion/consultation/application（默认general） |
| title | string | 否 | 标题（最多200字） |
| content | string | 是 | 留言内容（1-5000字） |

**响应：**

```json
{
  "success": true,
  "id": 1
}
```

### 13.2 查询自己的留言列表（App 用户）

- **路径：** `notifications.myList`
- **方法：** Query（GET）
- **权限：** public

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | number | 是 | 用户ID |
| page | number | 否 | 页码（默认1） |
| pageSize | number | 否 | 每页数量（默认20，最大50） |

### 13.3 获取未读通知数量

- **路径：** `notifications.unreadCount`
- **方法：** Query（GET）
- **权限：** protected

**响应：**

```json
{
  "count": 5
}
```

---

## 14. React Native 集成示例

### 14.1 安装依赖

```bash
npm install @trpc/client @trpc/react-query @tanstack/react-query superjson
```

### 14.2 创建 tRPC 客户端

```typescript
// lib/trpc-client.ts
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://crm.bdsm.com.cn';

let authToken: string | null = null;

// 初始化时从存储加载 Token
export async function initToken() {
  authToken = await AsyncStorage.getItem('auth_token');
}

export function setToken(token: string) {
  authToken = token;
  AsyncStorage.setItem('auth_token', token);
}

export function clearToken() {
  authToken = null;
  AsyncStorage.removeItem('auth_token');
}

export const trpc = createTRPCProxyClient<any>({
  links: [
    httpBatchLink({
      url: `${BASE_URL}/api/trpc`,
      transformer: superjson,
      headers() {
        return authToken
          ? { Authorization: `Bearer ${authToken}` }
          : {};
      },
    }),
  ],
});
```

### 14.3 使用示例

```typescript
// 登录
const result = await trpc.auth.loginWithUserAccount.mutate({
  username: '13800138000',
  password: '123456',
});
setToken(result.token);

// 获取我的订单
const myOrders = await trpc.orders.myOrders.query({
  status: 'all',
  limit: 20,
  offset: 0,
});

// 获取所有元数据（城市、课程、老师等）
const metadata = await trpc.metadata.getAll.query();

// 获取销售人员列表
const salespersons = await trpc.salespersons.list.query();

// 获取销售统计
const stats = await trpc.salespersons.getStatistics.query({
  salespersonId: 1,
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  groupBy: 'month',
});

// 获取老师列表
const teachers = await trpc.teachers.list.query();

// 获取老师统计
const teacherStats = await trpc.teachers.getStats.query({
  teacherId: 1,
});

// 创建预约
const appointment = await trpc.schedules.createAppointment.mutate({
  cityId: 1,
  teacherId: 1,
  courseId: 1,
  scheduledDate: '2026-03-01',
  scheduledTime: '14:00',
  contactName: '张三',
  contactPhone: '13800138000',
});

// 提交留言
await trpc.notifications.submit.mutate({
  userId: 1,
  userName: '张三',
  type: 'consultation',
  title: '课程咨询',
  content: '请问入门课程适合零基础吗？',
});

// 查询客户列表（高价值客户）
const highValueCustomers = await trpc.customers.list.query({
  highValue: true,
  sortBy: 'totalSpent',
  sortOrder: 'desc',
});

// 城市收入趋势
const cityTrend = await trpc.analytics.cityRevenueTrend.query();

// 流量来源分析
const trafficAnalysis = await trpc.analytics.trafficSourceAnalysis.query();

// 计算合伙人费
const partnerFee = await trpc.analytics.calculatePartnerFee.query({
  city: '武汉',
  courseAmount: 5000,
  teacherFee: 1000,
});
// partnerFee.partnerFee = (5000 - 1000) * 0.4 = 1600
```

### 14.4 或使用 SDK（推荐）

如果使用项目提供的 `sdk/api-client.ts`，可以更简洁地调用：

```typescript
import { createApiClient } from './api-client';

const api = createApiClient({
  baseUrl: 'https://crm.bdsm.com.cn',
  tokenStorage: 'asyncStorage',
});

// 登录
await api.auth.login({ username: '13800138000', password: '123456' });

// 获取我的订单
const orders = await api.orders.myOrders({ status: 'all' });

// 提交留言
await api.notifications.submit({
  userId: 1,
  content: '课程咨询',
});
```

---

## 附录：合伙人费计算规则

| 城市 | 计算公式 |
|------|----------|
| 武汉 | (课程金额 - 老师费用) × 40% |
| 天津 | (课程金额 - 老师费用) × 50% |
| 济南、石家庄、大连、宁波、太原、郑州、东莞、南京、无锡 | (课程金额 - 老师费用) × 30% |
| 其他城市 | 需在城市管理中配置费率 |

---

> 文档版本：v2.0  
> 更新日期：2026-02-06  
> 适用系统：课程交付CRM系统
