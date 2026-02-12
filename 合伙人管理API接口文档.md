# 合伙人管理API接口文档

**文档版本：** v1.0  
**最后更新：** 2026-02-11  
**作者：** Manus AI  
**适用范围：** 瀛姬App前端开发

---

## 目录

1. [接口概述](#接口概述)
2. [认证方式](#认证方式)
3. [数据模型](#数据模型)
4. [合伙人基础信息接口](#合伙人基础信息接口)
5. [合伙人身份证管理接口](#合伙人身份证管理接口)
6. [合伙人城市管理接口](#合伙人城市管理接口)
7. [合伙人费用管理接口](#合伙人费用管理接口)
8. [合伙人分红管理接口](#合伙人分红管理接口)
9. [合伙人统计接口](#合伙人统计接口)
10. [错误码说明](#错误码说明)

---

## 接口概述

本文档描述了课程交付CRM系统中合伙人管理相关的所有API接口。这些接口基于tRPC框架实现，采用类型安全的远程过程调用方式。所有接口均需要用户登录认证，并且部分接口需要特定角色权限。

**基础信息：**

| 项目 | 说明 |
|------|------|
| 协议 | HTTPS |
| 请求方式 | POST（tRPC统一使用POST） |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |
| 时区 | Asia/Shanghai (GMT+8) |

---

## 认证方式

所有接口均需要通过Session Cookie进行身份认证。前端App需要先调用登录接口获取Session，后续请求会自动携带Cookie。

**登录接口：** `auth.login`

**请求参数：**

```typescript
{
  phone: string;      // 手机号
  password: string;   // 密码
}
```

**响应示例：**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "张三",
    "phone": "13800138000",
    "roles": "user,cityPartner"
  }
}
```

---

## 数据模型

### Partner（合伙人）

合伙人基础信息数据结构。

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 合伙人ID |
| userId | number | 是 | 关联的用户ID |
| name | string | 是 | 合伙人姓名 |
| phone | string | 否 | 手机号（用于登录App） |
| idCardNumber | string | 否 | 身份证号码 |
| idCardFrontUrl | string | 否 | 身份证正面照片URL |
| idCardBackUrl | string | 否 | 身份证反面照片URL |
| profitRatio | string | 是 | 分红比例（百分比，如"30.00"） |
| profitRule | string | 否 | 分红规则描述 |
| brandFee | string | 否 | 品牌加盟费 |
| techServiceFee | string | 否 | 技术服务费 |
| deferredPaymentTotal | string | 否 | 后付款总金额 |
| deferredPaymentRule | string | 否 | 后付款扣款规则 |
| contractStartDate | Date | 否 | 合同起始日期 |
| contractEndDate | Date | 否 | 合同结束日期 |
| contractHistory | string | 否 | 合同修订历史（JSON数组） |
| accountName | string | 否 | 开户名 |
| bankName | string | 否 | 开户行 |
| accountNumber | string | 否 | 账号 |
| isActive | boolean | 是 | 是否激活 |
| notes | string | 否 | 备注 |
| createdBy | number | 是 | 创建人ID |
| createdAt | Date | 是 | 创建时间 |
| updatedAt | Date | 是 | 更新时间 |

### PartnerExpense（合伙人费用明细）

按月记录合伙人的各项费用。

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 费用明细ID |
| partnerId | number | 是 | 合伙人ID |
| cityId | number | 是 | 城市ID |
| month | Date | 是 | 月份（YYYY-MM-01格式） |
| rentFee | string | 否 | 房租 |
| propertyFee | string | 否 | 物业费 |
| utilityFee | string | 否 | 水电费 |
| consumablesFee | string | 否 | 耗材费 |
| teacherFee | string | 否 | 老师费用 |
| transportFee | string | 否 | 车费 |
| otherFee | string | 否 | 其他费用 |
| totalFee | string | 否 | 总费用 |
| deferredPayment | string | 否 | 本月后付款扣款 |
| deferredPaymentBalance | string | 否 | 后付款未结清余额 |
| revenue | string | 否 | 本月营收 |
| profit | string | 否 | 本月利润 |
| profitAmount | string | 否 | 本月分红金额 |
| notes | string | 否 | 备注 |
| createdBy | number | 是 | 创建人ID |
| createdAt | Date | 是 | 创建时间 |
| updatedAt | Date | 是 | 更新时间 |

### PartnerProfitRecord（合伙人分红流水）

记录每次分红转账的详细信息。

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 流水ID |
| partnerId | number | 是 | 合伙人ID |
| expenseId | number | 否 | 关联的费用明细ID |
| amount | string | 是 | 分红金额 |
| transferDate | Date | 是 | 转账日期 |
| transferMethod | string | 是 | 转账方式（wechat/alipay/bank/cash/other） |
| transactionNo | string | 否 | 交易单号 |
| status | string | 是 | 状态（pending/completed/failed） |
| notes | string | 否 | 备注 |
| recordedBy | number | 是 | 记录人ID |
| createdAt | Date | 是 | 创建时间 |

### PartnerCity（合伙人城市关联）

合伙人与城市的关联关系。

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 关联ID |
| partnerId | number | 是 | 合伙人ID |
| cityId | number | 是 | 城市ID |
| cityName | string | 是 | 城市名称 |
| contractEndDate | Date | 否 | 合同结束日期 |
| contractStatus | string | 否 | 合同状态 |
| createdAt | Date | 是 | 创建时间 |

---

## 合伙人基础信息接口

### 1. 获取合伙人列表

**接口名称：** `partnerManagement.list`

**描述：** 获取所有合伙人列表，支持按激活状态筛选。

**请求参数：**

```typescript
{
  isActive?: boolean;  // 可选，是否激活（true/false）
}
```

**响应示例：**

```json
[
  {
    "id": 1,
    "userId": 10,
    "name": "张三",
    "phone": "13800138000",
    "idCardNumber": "110101199001011234",
    "profitRatio": "30.00",
    "contractStartDate": "2024-01-01",
    "contractEndDate": "2025-12-31",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### 2. 获取单个合伙人详情

**接口名称：** `partnerManagement.getById`

**描述：** 根据合伙人ID获取详细信息。

**请求参数：**

```typescript
{
  id: number;  // 合伙人ID
}
```

**响应示例：**

```json
{
  "id": 1,
  "userId": 10,
  "name": "张三",
  "phone": "13800138000",
  "idCardNumber": "110101199001011234",
  "idCardFrontUrl": "https://s3.example.com/id-front-123.jpg",
  "idCardBackUrl": "https://s3.example.com/id-back-123.jpg",
  "profitRatio": "30.00",
  "profitRule": "按月分红，每月10日前结算上月利润",
  "brandFee": "50000.00",
  "techServiceFee": "10000.00",
  "deferredPaymentTotal": "100000.00",
  "deferredPaymentRule": "分12个月扣除，每月8333.33元",
  "contractStartDate": "2024-01-01",
  "contractEndDate": "2025-12-31",
  "accountName": "张三",
  "bankName": "中国工商银行北京分行",
  "accountNumber": "6222021234567890",
  "isActive": true,
  "notes": "优秀合伙人",
  "createdBy": 1,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**错误响应：**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "合伙人不存在"
  }
}
```

---

### 3. 创建合伙人

**接口名称：** `partnerManagement.create`

**描述：** 创建新合伙人，如果不提供userId则自动创建用户账号（默认密码123456）。

**请求参数：**

```typescript
{
  userId?: number;              // 可选，关联的用户ID
  name: string;                 // 必填，合伙人姓名
  phone?: string;               // 可选，手机号（不提供userId时必填）
  idCardNumber?: string;        // 可选，身份证号码
  idCardFrontUrl?: string;      // 可选，身份证正面照片URL
  idCardBackUrl?: string;       // 可选，身份证反面照片URL
  profitRatio: string;          // 必填，分红比例（如"30.00"）
  profitRule?: string;          // 可选，分红规则描述
  brandFee?: string;            // 可选，品牌加盟费
  techServiceFee?: string;      // 可选，技术服务费
  deferredPaymentTotal?: string;    // 可选，后付款总金额
  deferredPaymentRule?: string;     // 可选，后付款扣款规则
  contractStartDate?: string;   // 可选，合同起始日期（YYYY-MM-DD）
  contractEndDate?: string;     // 可选，合同结束日期（YYYY-MM-DD）
  accountName?: string;         // 可选，开户名
  bankName?: string;            // 可选，开户行
  accountNumber?: string;       // 可选，账号
  notes?: string;               // 可选，备注
}
```

**响应示例：**

```json
{
  "id": 2,
  "userId": 11,
  "userCreated": true  // 标记是否新创建了用户
}
```

**错误响应：**

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "该手机号已被使用"
  }
}
```

---

### 4. 更新合伙人信息

**接口名称：** `partnerManagement.update`

**描述：** 更新合伙人信息。如果更新手机号，会自动同步到用户表。

**请求参数：**

```typescript
{
  id: number;                   // 必填，合伙人ID
  name?: string;                // 可选，合伙人姓名
  phone?: string;               // 可选，手机号
  idCardNumber?: string;        // 可选，身份证号码
  idCardFrontUrl?: string;      // 可选，身份证正面照片URL
  idCardBackUrl?: string;       // 可选，身份证反面照片URL
  profitRatio?: string;         // 可选，分红比例
  profitRule?: string;          // 可选，分红规则描述
  brandFee?: string;            // 可选，品牌加盟费
  techServiceFee?: string;      // 可选，技术服务费
  deferredPaymentTotal?: string;    // 可选，后付款总金额
  deferredPaymentRule?: string;     // 可选，后付款扣款规则
  contractStartDate?: string;   // 可选，合同起始日期（YYYY-MM-DD）
  contractEndDate?: string;     // 可选，合同结束日期（YYYY-MM-DD）
  contractHistory?: string;     // 可选，合同修订历史（JSON字符串）
  accountName?: string;         // 可选，开户名
  bankName?: string;            // 可选，开户行
  accountNumber?: string;       // 可选，账号
  isActive?: boolean;           // 可选，是否激活
  notes?: string;               // 可选，备注
}
```

**响应示例：**

```json
{
  "success": true
}
```

**错误响应：**

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "该手机号已被其他用户使用"
  }
}
```

---

### 5. 删除合伙人（软删除）

**接口名称：** `partnerManagement.delete`

**描述：** 软删除合伙人（设置isActive为false）。

**请求参数：**

```typescript
{
  id: number;  // 合伙人ID
}
```

**响应示例：**

```json
{
  "success": true
}
```

---

## 合伙人身份证管理接口

### 6. 上传身份证并识别

**接口名称：** `upload.uploadAndRecognizeIDCard`

**描述：** 上传身份证照片到S3，并使用LLM进行OCR识别（仅正面识别姓名和身份证号）。

**请求参数：**

```typescript
{
  base64Data: string;           // 必填，图片的base64编码数据（包含data:image/...前缀）
  side: "front" | "back";       // 必填，正面或反面
}
```

**响应示例（正面识别成功）：**

```json
{
  "url": "https://s3.example.com/id-front-456.jpg",
  "ocr": {
    "success": true,
    "name": "张三",
    "idCardNumber": "110101199001011234"
  }
}
```

**响应示例（反面或识别失败）：**

```json
{
  "url": "https://s3.example.com/id-back-456.jpg",
  "ocr": {
    "success": false,
    "error": "无法识别身份证信息"
  }
}
```

**错误响应：**

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "图片格式不支持"
  }
}
```

**使用说明：**

1. 前端将图片转换为base64格式（包含`data:image/jpeg;base64,`前缀）
2. 调用此接口上传并识别
3. 接口返回S3 URL和识别结果
4. 如果识别成功，前端可自动填充姓名和身份证号字段
5. 如果识别失败，提示用户手动填写

---

## 合伙人城市管理接口

### 7. 为合伙人分配城市

**接口名称：** `partnerManagement.assignCities`

**描述：** 为合伙人分配管理的城市列表（会先删除现有关联，再添加新关联）。

**请求参数：**

```typescript
{
  partnerId: number;        // 必填，合伙人ID
  cityIds: number[];        // 必填，城市ID数组
}
```

**响应示例：**

```json
{
  "success": true
}
```

---

### 8. 获取合伙人关联的城市列表

**接口名称：** `partnerManagement.getPartnerCities`

**描述：** 获取合伙人管理的所有城市。

**请求参数：**

```typescript
{
  partnerId: number;  // 合伙人ID
}
```

**响应示例：**

```json
[
  {
    "id": 1,
    "partnerId": 1,
    "cityId": 5,
    "cityName": "深圳",
    "contractEndDate": "2025-12-31",
    "contractStatus": "active",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": 2,
    "partnerId": 1,
    "cityId": 8,
    "cityName": "广州",
    "contractEndDate": "2025-12-31",
    "contractStatus": "active",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

## 合伙人费用管理接口

### 9. 获取合伙人费用明细列表

**接口名称：** `partnerManagement.getExpenses`

**描述：** 获取合伙人的费用明细列表，支持按城市和月份筛选。

**请求参数：**

```typescript
{
  partnerId: number;        // 必填，合伙人ID
  cityId?: number;          // 可选，城市ID
  startMonth?: string;      // 可选，起始月份（YYYY-MM-DD）
  endMonth?: string;        // 可选，结束月份（YYYY-MM-DD）
}
```

**响应示例：**

```json
[
  {
    "id": 1,
    "partnerId": 1,
    "cityId": 5,
    "month": "2024-01-01",
    "rentFee": "10000.00",
    "propertyFee": "2000.00",
    "utilityFee": "1000.00",
    "consumablesFee": "500.00",
    "teacherFee": "15000.00",
    "transportFee": "3000.00",
    "otherFee": "1000.00",
    "totalFee": "32500.00",
    "deferredPayment": "8333.33",
    "deferredPaymentBalance": "91666.67",
    "revenue": "80000.00",
    "profit": "47500.00",
    "profitAmount": "14250.00",
    "notes": "1月份费用",
    "createdBy": 1,
    "createdAt": "2024-02-01T00:00:00.000Z",
    "updatedAt": "2024-02-01T00:00:00.000Z"
  }
]
```

---

### 10. 创建或更新费用明细

**接口名称：** `partnerManagement.upsertExpense`

**描述：** 创建新的费用明细或更新已有的费用明细。

**请求参数：**

```typescript
{
  id?: number;                  // 可选，费用明细ID（更新时提供）
  partnerId: number;            // 必填，合伙人ID
  cityId: number;               // 必填，城市ID
  month: string;                // 必填，月份（YYYY-MM-DD）
  rentFee?: string;             // 可选，房租
  propertyFee?: string;         // 可选，物业费
  utilityFee?: string;          // 可选，水电费
  consumablesFee?: string;      // 可选，耗材费
  teacherFee?: string;          // 可选，老师费用
  transportFee?: string;        // 可选，车费
  otherFee?: string;            // 可选，其他费用
  totalFee?: string;            // 可选，总费用
  deferredPayment?: string;     // 可选，本月后付款扣款
  deferredPaymentBalance?: string;  // 可选，后付款未结清余额
  revenue?: string;             // 可选，本月营收
  profit?: string;              // 可选，本月利润
  profitAmount?: string;        // 可选，本月分红金额
  notes?: string;               // 可选，备注
}
```

**响应示例：**

```json
{
  "id": 2
}
```

---

## 合伙人分红管理接口

### 11. 获取合伙人分红流水记录

**接口名称：** `partnerManagement.getProfitRecords`

**描述：** 获取合伙人的分红流水记录，支持按状态和日期筛选。

**请求参数：**

```typescript
{
  partnerId: number;                        // 必填，合伙人ID
  status?: "pending" | "completed" | "failed";  // 可选，状态筛选
  startDate?: string;                       // 可选，起始日期（YYYY-MM-DD）
  endDate?: string;                         // 可选，结束日期（YYYY-MM-DD）
}
```

**响应示例：**

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

---

### 12. 创建分红流水记录

**接口名称：** `partnerManagement.createProfitRecord`

**描述：** 创建新的分红流水记录。

**请求参数：**

```typescript
{
  partnerId: number;                                // 必填，合伙人ID
  expenseId?: number;                               // 可选，关联的费用明细ID
  amount: string;                                   // 必填，分红金额
  transferDate: string;                             // 必填，转账日期（YYYY-MM-DD）
  transferMethod: "wechat" | "alipay" | "bank" | "cash" | "other";  // 必填，转账方式
  transactionNo?: string;                           // 可选，交易单号
  status?: "pending" | "completed" | "failed";      // 可选，状态（默认pending）
  notes?: string;                                   // 可选，备注
}
```

**响应示例：**

```json
{
  "id": 2
}
```

---

### 13. 更新分红流水记录状态

**接口名称：** `partnerManagement.updateProfitRecordStatus`

**描述：** 更新分红流水记录的状态。

**请求参数：**

```typescript
{
  id: number;                                   // 必填，流水记录ID
  status: "pending" | "completed" | "failed";   // 必填，新状态
  notes?: string;                               // 可选，备注
}
```

**响应示例：**

```json
{
  "success": true
}
```

---

## 合伙人统计接口

### 14. 获取合伙人的订单统计（按城市）

**接口名称：** `partnerManagement.getCityOrderStats`

**描述：** 获取合伙人管理的各个城市的订单统计数据。

**请求参数：**

```typescript
{
  partnerId: number;        // 必填，合伙人ID
  startDate?: string;       // 可选，起始日期（YYYY-MM-DD）
  endDate?: string;         // 可选，结束日期（YYYY-MM-DD）
}
```

**响应示例：**

```json
[
  {
    "cityId": 5,
    "cityName": "深圳",
    "orderCount": 45,
    "totalAmount": "135000.00",
    "totalTeacherFee": "45000.00",
    "totalTransportFee": "9000.00",
    "totalPartnerFee": "13500.00"
  },
  {
    "cityId": 8,
    "cityName": "广州",
    "orderCount": 38,
    "totalAmount": "114000.00",
    "totalTeacherFee": "38000.00",
    "totalTransportFee": "7600.00",
    "totalPartnerFee": "11400.00"
  }
]
```

---

### 15. 获取合伙人统计数据（用于列表展示）

**接口名称：** `partnerManagement.getPartnerStats`

**描述：** 获取所有合伙人的统计数据，用于合伙人列表页面展示。

**请求参数：**

```typescript
{
  startDate?: string;       // 可选，起始日期（YYYY-MM-DD）
  endDate?: string;         // 可选，结束日期（YYYY-MM-DD）
}
```

**响应示例：**

```json
[
  {
    "partner": {
      "id": 1,
      "name": "张三",
      "phone": "13800138000",
      "profitRatio": "30.00"
    },
    "cities": ["深圳", "广州"],
    "totalOrderCount": 83,
    "totalCourseAmount": "249000.00",
    "totalTeacherFee": "83000.00",
    "totalTransportFee": "16600.00",
    "totalRentFee": "20000.00",
    "totalPropertyFee": "4000.00",
    "totalUtilityFee": "2000.00",
    "totalConsumablesFee": "1000.00",
    "totalDeferredPayment": "16666.66",
    "totalPartnerFee": "24900.00"
  }
]
```

---

## 错误码说明

所有接口在发生错误时，会返回统一的错误格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述信息"
  }
}
```

**常见错误码：**

| 错误码 | 说明 | 常见原因 |
|--------|------|----------|
| UNAUTHORIZED | 未授权 | 未登录或Session过期 |
| FORBIDDEN | 禁止访问 | 没有权限访问该资源 |
| NOT_FOUND | 资源不存在 | 请求的合伙人、费用或记录不存在 |
| BAD_REQUEST | 请求参数错误 | 参数格式不正确或缺少必填参数 |
| INTERNAL_SERVER_ERROR | 服务器内部错误 | 数据库连接失败或其他服务器错误 |
| CONFLICT | 资源冲突 | 手机号已被使用等冲突情况 |

---

## 附录：完整调用示例

### 示例1：创建新合伙人并上传身份证

```typescript
// 1. 上传身份证正面并识别
const frontResult = await trpc.upload.uploadAndRecognizeIDCard.mutate({
  base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  side: "front"
});

// 2. 上传身份证反面
const backResult = await trpc.upload.uploadAndRecognizeIDCard.mutate({
  base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  side: "back"
});

// 3. 创建合伙人（自动创建用户账号）
const partner = await trpc.partnerManagement.create.mutate({
  name: frontResult.ocr.name,
  phone: "13800138000",
  idCardNumber: frontResult.ocr.idCardNumber,
  idCardFrontUrl: frontResult.url,
  idCardBackUrl: backResult.url,
  profitRatio: "30.00",
  contractStartDate: "2024-01-01",
  contractEndDate: "2025-12-31"
});

console.log("合伙人创建成功，ID:", partner.id);
console.log("用户账号已自动创建，默认密码: 123456");
```

### 示例2：更新合伙人手机号

```typescript
// 更新手机号（会自动同步到用户表）
await trpc.partnerManagement.update.mutate({
  id: 1,
  phone: "13900139000"
});

console.log("手机号更新成功，用户可使用新手机号登录");
```

### 示例3：查询合伙人的月度统计

```typescript
// 获取合伙人2024年1月的订单统计
const stats = await trpc.partnerManagement.getCityOrderStats.query({
  partnerId: 1,
  startDate: "2024-01-01",
  endDate: "2024-01-31"
});

stats.forEach(city => {
  console.log(`${city.cityName}:`, {
    订单数: city.orderCount,
    总金额: city.totalAmount,
    合伙人费用: city.totalPartnerFee
  });
});
```

---

## 技术支持

如有任何问题或建议，请联系技术支持团队。

**文档维护：** Manus AI  
**最后更新：** 2026-02-11
