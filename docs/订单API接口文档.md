# 订单API接口文档

**文档版本**: 1.0  
**最后更新**: 2026-02-18  
**API基础地址**: `https://crm.bdsm.com.cn/api/trpc`

## 目录

1. [接口概述](#接口概述)
2. [认证方式](#认证方式)
3. [订单查询接口](#订单查询接口)
4. [订单创建接口](#订单创建接口)
5. [订单更新接口](#订单更新接口)
6. [订单删除接口](#订单删除接口)
7. [订单统计接口](#订单统计接口)
8. [批量操作接口](#批量操作接口)
9. [数据模型](#数据模型)
10. [错误码说明](#错误码说明)

---

## 接口概述

订单管理系统提供完整的订单CRUD操作接口，支持单个订单创建、批量导入、订单查询、状态更新、统计分析等功能。所有接口基于tRPC协议，使用JSON格式传输数据。

**核心功能**：

- 订单创建：支持单个订单创建和批量导入
- 订单查询：支持多维度筛选和分页查询
- 订单更新：支持订单信息修改和状态变更
- 订单统计：支持财务统计、业绩分析、对账管理
- 权限控制：基于角色的访问控制（管理员、销售、财务、老师）

---

## 认证方式

所有订单接口均需要用户认证。系统支持两种认证方式：

### 1. Session Cookie认证（推荐）

用户登录后，系统会设置Session Cookie，后续请求自动携带Cookie进行认证。

```typescript
// 登录接口
const response = await fetch('https://crm.bdsm.com.cn/api/trpc/auth.login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // 重要：携带Cookie
  body: JSON.stringify({
    username: 'your_username',
    password: 'your_password'
  })
});
```

### 2. Token认证（移动端推荐）

移动端App可以通过URL参数传递Token进行认证，绕过Cloudflare限制。

```typescript
const token = 'your_auth_token';
const apiUrl = `https://crm.bdsm.com.cn/api/trpc/orders.list?token=${token}`;
```

**获取Token**：

1. 调用登录接口获取Session
2. 从响应Cookie中提取Token
3. 将Token存储在本地（localStorage/SecureStore）
4. 后续请求通过URL参数传递Token

---

## 订单查询接口

### 1. 查询订单列表

**接口路径**: `orders.list`  
**请求方法**: Query  
**权限要求**: 已登录用户

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| paymentChannel | string | 否 | 支付渠道筛选（如：微信、支付宝） |
| channelOrderNo | string | 否 | 渠道订单号搜索 |

**响应数据**:

```typescript
{
  orders: Order[],  // 订单列表
  total: number,    // 总数量
  hasMore: boolean  // 是否有更多数据
}
```

**示例请求**:

```typescript
// 查询所有订单
const result = await trpc.orders.list.query();

// 按支付渠道筛选
const result = await trpc.orders.list.query({
  paymentChannel: '微信'
});

// 按渠道订单号搜索
const result = await trpc.orders.list.query({
  channelOrderNo: 'WX20260218001'
});
```

**权限说明**:

- 管理员：查看所有订单
- 销售人员：仅查看自己创建的订单
- 财务人员：查看所有订单
- 老师：查看自己接单的订单

---

### 2. 查询单个订单详情

**接口路径**: `orders.getById`  
**请求方法**: Query  
**权限要求**: 已登录用户

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 订单ID |

**响应数据**:

```typescript
Order | null  // 订单详情对象，不存在返回null
```

**示例请求**:

```typescript
const order = await trpc.orders.getById.query({ id: 12345 });

if (order) {
  console.log('订单号:', order.orderNo);
  console.log('客户名:', order.customerName);
  console.log('支付金额:', order.paymentAmount);
}
```

---

### 3. 高级筛选查询

**接口路径**: `orders.getFiltered`  
**请求方法**: Query  
**权限要求**: 已登录用户

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| startDate | string | 否 | 开始日期（YYYY-MM-DD） |
| endDate | string | 否 | 结束日期（YYYY-MM-DD） |
| city | string | 否 | 交付城市 |
| teacher | string | 否 | 交付老师 |
| salesperson | string | 否 | 销售人员 |
| status | string | 否 | 订单状态 |
| deliveryStatus | string | 否 | 交付状态 |
| paymentChannel | string | 否 | 支付渠道 |
| limit | number | 否 | 每页数量（默认50） |
| offset | number | 否 | 偏移量（默认0） |

**响应数据**:

```typescript
{
  orders: Order[],  // 订单列表
  total: number,    // 总数量
  hasMore: boolean  // 是否有更多数据
}
```

**示例请求**:

```typescript
// 查询2026年2月上海地区的订单
const result = await trpc.orders.getFiltered.query({
  startDate: '2026-02-01',
  endDate: '2026-02-28',
  city: '上海',
  limit: 20,
  offset: 0
});

// 查询某个销售人员的已完成订单
const result = await trpc.orders.getFiltered.query({
  salesperson: '张三',
  status: 'completed',
  limit: 50
});
```

---

## 订单创建接口

### 1. 创建单个订单（重点）

**接口路径**: `orders.create`  
**请求方法**: Mutation  
**权限要求**: 销售人员或管理员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| orderNo | string | 否 | 订单号（不填自动生成） | "ORD1769234555645602" |
| customerId | number | 否 | 客户ID（用于余额扣款） | 123 |
| customerName | string | 否 | 客户姓名 | "张三" |
| salespersonId | number | 否 | 销售人员ID | 5 |
| salesPerson | string | 否 | 销售人员姓名 | "李四" |
| trafficSource | string | 否 | 流量来源 | "瀛姬喵喵" |
| paymentAmount | string | 是 | 支付金额 | "1000.00" |
| courseAmount | string | 是 | 课程金额 | "1000.00" |
| accountBalance | string | 否 | 账户余额 | "500.00" |
| useAccountBalance | boolean | 否 | 是否使用账户余额 | true |
| paymentCity | string | 否 | 支付城市 | "上海" |
| paymentChannel | string | 否 | 支付渠道 | "微信" |
| channelOrderNo | string | 否 | 渠道订单号 | "WX20260218001" |
| paymentDate | string | 否 | 支付日期 | "2026-02-18" |
| paymentTime | string | 否 | 支付时间 | "14:30:00" |
| teacherFee | string | 否 | 老师费用 | "300.00" |
| transportFee | string | 否 | 车费 | "50.00" |
| otherFee | string | 否 | 其他费用 | "20.00" |
| partnerFee | string | 否 | 合伙人费用（自动计算） | "210.00" |
| finalAmount | string | 否 | 最终金额 | "1000.00" |
| deliveryCity | string | 否 | 交付城市 | "上海" |
| deliveryRoom | string | 否 | 交付教室 | "长风北岸1101" |
| deliveryTeacher | string | 否 | 交付老师 | "王老师" |
| deliveryCourse | string | 否 | 交付课程 | "BDSM入门课" |
| classDate | string | 否 | 上课日期 | "2026-02-20" |
| classTime | string | 否 | 上课时间 | "19:00-21:00" |
| status | string | 否 | 订单状态 | "paid" |
| deliveryStatus | string | 否 | 交付状态 | "pending" |
| notes | string | 否 | 备注 | "学员要求女老师" |

**订单状态枚举**:

- `pending`: 待支付
- `paid`: 已支付
- `completed`: 已完成
- `cancelled`: 已取消
- `refunded`: 已退款

**交付状态枚举**:

- `pending`: 待接单
- `accepted`: 已接单
- `delivered`: 已交付

**响应数据**:

```typescript
{
  id: number,        // 订单ID
  orderNo: string,   // 订单号
  ...                // 其他订单字段
}
```

**示例请求**:

```typescript
// 创建一个完整的订单
const order = await trpc.orders.create.mutate({
  customerName: '张三',
  salesPerson: '李四',
  trafficSource: '瀛姬喵喵',
  paymentAmount: '1000.00',
  courseAmount: '1000.00',
  paymentChannel: '微信',
  channelOrderNo: 'WX20260218001',
  paymentDate: '2026-02-18',
  paymentTime: '14:30:00',
  teacherFee: '300.00',
  transportFee: '50.00',
  deliveryCity: '上海',
  deliveryRoom: '长风北岸1101',
  deliveryTeacher: '王老师',
  deliveryCourse: 'BDSM入门课',
  classDate: '2026-02-20',
  classTime: '19:00-21:00',
  status: 'paid',
  deliveryStatus: 'pending',
  notes: '学员要求女老师'
});

console.log('订单创建成功，订单号:', order.orderNo);
```

**业务规则**:

1. **订单号生成规则**：
   - 不填写orderNo时自动生成
   - 格式：`ORD + 时间戳 + 随机数`
   - 示例：`ORD1769234555645602`

2. **客户名验证**：
   - 客户名不能使用老师名字
   - 系统会自动检查老师名单并拒绝重复

3. **老师费用验证**：
   - 老师费用不能超过课程金额
   - 理论课老师费用默认为0（除非特别标注）

4. **合伙人费用计算**：
   - 公式：`(课程金额 - 老师费用) × 城市费率`
   - 城市费率：
     - 武汉：40%
     - 天津：50%
     - 其他城市：30%
     - 深圳：0%（金串全资）

5. **账户余额扣款**：
   - 设置`useAccountBalance=true`时从客户账户余额扣款
   - 需要提供`customerId`
   - 余额不足时创建失败

6. **自动关联客户**：
   - 系统会根据客户名自动查找或创建客户记录
   - 自动更新客户的累计消费和上课次数

**错误处理**:

```typescript
try {
  const order = await trpc.orders.create.mutate({
    customerName: '王老师',  // 错误：使用了老师名字
    paymentAmount: '1000.00',
    courseAmount: '1000.00'
  });
} catch (error) {
  if (error.code === 'BAD_REQUEST') {
    console.error('创建失败:', error.message);
    // 输出：客户名不能使用老师名字: 王老师
  }
}
```

---

### 2. 批量创建订单

**接口路径**: `orders.batchCreate`  
**请求方法**: Mutation  
**权限要求**: 销售人员或管理员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| template | string | 是 | 模板类型（wechat/alipay/custom） |
| orders | Order[] | 是 | 订单列表 |

**订单对象字段**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| salesperson | string | 否 | 销售人员 |
| customerName | string | 是 | 客户姓名 |
| deliveryTeacher | string | 否 | 交付老师 |
| deliveryCourse | string | 否 | 交付课程 |
| deliveryCity | string | 否 | 交付城市 |
| deliveryRoom | string | 否 | 交付教室 |
| classDate | string | 否 | 上课日期 |
| classTime | string | 否 | 上课时间 |
| paymentAmount | string | 是 | 支付金额 |
| paymentMethod | string | 否 | 支付方式 |
| courseAmount | string | 否 | 课程金额 |
| channelOrderNo | string | 否 | 渠道订单号 |
| teacherFee | string | 否 | 老师费用 |
| transportFee | string | 否 | 车费 |
| notes | string | 否 | 备注 |
| noteTags | string | 否 | 备注标签 |
| discountInfo | string | 否 | 优惠信息 |
| couponInfo | string | 否 | 优惠券信息 |
| membershipInfo | string | 否 | 会员信息 |
| paymentStatus | string | 否 | 支付状态 |
| specialNotes | string | 否 | 特殊备注 |
| isVoided | boolean | 否 | 是否作废 |

**响应数据**:

```typescript
{
  successCount: number,  // 成功数量
  failCount: number,     // 失败数量
  errors: string[]       // 错误信息列表
}
```

**示例请求**:

```typescript
const result = await trpc.orders.batchCreate.mutate({
  template: 'wechat',
  orders: [
    {
      customerName: '张三',
      paymentAmount: '1000.00',
      courseAmount: '1000.00',
      deliveryCity: '上海',
      classDate: '2026-02-20'
    },
    {
      customerName: '李四',
      paymentAmount: '1500.00',
      courseAmount: '1500.00',
      deliveryCity: '北京',
      classDate: '2026-02-21'
    }
  ]
});

console.log(`成功导入 ${result.successCount} 条订单`);
console.log(`失败 ${result.failCount} 条订单`);
if (result.errors.length > 0) {
  console.log('错误信息:', result.errors);
}
```

---

## 订单更新接口

### 1. 更新订单信息

**接口路径**: `orders.update`  
**请求方法**: Mutation  
**权限要求**: 销售人员或管理员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 订单ID |
| ...其他字段 | ... | 否 | 需要更新的字段（同创建接口） |

**响应数据**:

```typescript
Order  // 更新后的订单对象
```

**示例请求**:

```typescript
// 更新订单的交付信息
const updatedOrder = await trpc.orders.update.mutate({
  id: 12345,
  deliveryTeacher: '李老师',
  classDate: '2026-02-25',
  classTime: '14:00-16:00',
  notes: '学员改期到2月25日'
});
```

---

### 2. 更新订单状态

**接口路径**: `orders.updateStatus`  
**请求方法**: Mutation  
**权限要求**: 销售人员或管理员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 订单ID |
| status | string | 是 | 订单状态（pending/paid/completed/cancelled/refunded） |

**响应数据**:

```typescript
Order  // 更新后的订单对象
```

**示例请求**:

```typescript
// 将订单标记为已完成
const order = await trpc.orders.updateStatus.mutate({
  id: 12345,
  status: 'completed'
});
```

---

### 3. 更新交付状态

**接口路径**: `orders.updateDeliveryStatus`  
**请求方法**: Mutation  
**权限要求**: 销售人员或管理员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 订单ID |
| deliveryStatus | string | 是 | 交付状态（pending/accepted/delivered） |

**响应数据**:

```typescript
Order  // 更新后的订单对象
```

**示例请求**:

```typescript
// 老师接单
const order = await trpc.orders.updateDeliveryStatus.mutate({
  id: 12345,
  deliveryStatus: 'accepted'
});

// 系统会自动记录当前用户为接单老师
```

---

## 订单删除接口

### 1. 删除订单

**接口路径**: `orders.delete`  
**请求方法**: Mutation  
**权限要求**: 管理员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 订单ID |

**响应数据**:

```typescript
{
  success: boolean,  // 是否成功
  message: string    // 提示信息
}
```

**示例请求**:

```typescript
const result = await trpc.orders.delete.mutate({ id: 12345 });

if (result.success) {
  console.log('订单删除成功');
}
```

---

### 2. 根据渠道订单号删除订单

**接口路径**: `orders.deleteByChannelOrderNo`  
**请求方法**: Mutation  
**权限要求**: 管理员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| channelOrderNo | string | 是 | 渠道订单号 |

**响应数据**:

```typescript
{
  success: boolean,  // 是否成功
  deletedCount: number,  // 删除数量
  message: string    // 提示信息
}
```

**示例请求**:

```typescript
// 删除作废订单（用于Gmail导入的作废订单处理）
const result = await trpc.orders.deleteByChannelOrderNo.mutate({
  channelOrderNo: 'WX20260218001'
});

console.log(`删除了 ${result.deletedCount} 条订单`);
```

---

## 订单统计接口

### 1. 按日期范围统计

**接口路径**: `orders.getByDateRange`  
**请求方法**: Query  
**权限要求**: 已登录用户

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| startDate | string | 是 | 开始日期（YYYY-MM-DD） |
| endDate | string | 是 | 结束日期（YYYY-MM-DD） |

**响应数据**:

```typescript
{
  startDate: string,
  endDate: string,
  totalAmount: number,  // 总金额
  totalCount: number,   // 总数量
  groupedByChannel: {   // 按支付渠道分组
    channel: string,
    orders: Order[],
    totalAmount: number,
    count: number
  }[],
  allOrders: Order[]    // 所有订单
}
```

**示例请求**:

```typescript
const stats = await trpc.orders.getByDateRange.query({
  startDate: '2026-02-01',
  endDate: '2026-02-28'
});

console.log(`2月份总收入: ￥${stats.totalAmount}`);
console.log(`2月份订单数: ${stats.totalCount}`);

stats.groupedByChannel.forEach(group => {
  console.log(`${group.channel}: ${group.count}单, ￥${group.totalAmount}`);
});
```

---

### 2. 导出订单Excel

**接口路径**: `orders.exportExcel`  
**请求方法**: Query  
**权限要求**: 已登录用户

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |
| city | string | 否 | 城市筛选 |

**响应数据**:

```typescript
Buffer  // Excel文件二进制数据
```

**示例请求**:

```typescript
// 前端下载Excel
const handleExport = async () => {
  const response = await fetch(
    `https://crm.bdsm.com.cn/api/trpc/orders.exportExcel?` +
    `startDate=2026-02-01&endDate=2026-02-28`,
    { credentials: 'include' }
  );
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '订单报表.xlsx';
  a.click();
};
```

---

## 批量操作接口

### 1. 批量重新计算合伙人费

**接口路径**: `orders.batchCalculatePartnerFee`  
**请求方法**: Mutation  
**权限要求**: 已登录用户

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| orderIds | number[] | 是 | 订单ID列表 |

**响应数据**:

```typescript
{
  updatedCount: number,    // 更新数量
  unchangedCount: number,  // 未变化数量
  errorCount: number,      // 错误数量
  updates: {               // 更新详情
    orderId: number,
    oldPartnerFee: string,
    newPartnerFee: string,
    city: string,
    rate: number
  }[],
  errorMessages: string[]  // 错误信息
}
```

**示例请求**:

```typescript
const result = await trpc.orders.batchCalculatePartnerFee.mutate({
  orderIds: [12345, 12346, 12347]
});

console.log(`更新了 ${result.updatedCount} 条订单`);
console.log(`未变化 ${result.unchangedCount} 条订单`);
console.log(`错误 ${result.errorCount} 条订单`);
```

---

## 数据模型

### Order对象结构

```typescript
interface Order {
  // 基础信息
  id: number;                    // 订单ID
  orderNo: string;               // 订单号
  createdAt: string;             // 创建时间
  updatedAt: string;             // 更新时间
  
  // 客户信息
  customerId: number | null;     // 客户ID
  customerName: string | null;   // 客户姓名
  
  // 销售信息
  salespersonId: number | null;  // 销售人员ID
  salesPerson: string | null;    // 销售人员姓名
  trafficSource: string | null;  // 流量来源
  
  // 支付信息
  paymentAmount: string;         // 支付金额
  courseAmount: string;          // 课程金额
  accountBalance: string | null; // 账户余额
  paymentCity: string | null;    // 支付城市
  paymentChannel: string | null; // 支付渠道
  channelOrderNo: string | null; // 渠道订单号
  paymentDate: string | null;    // 支付日期
  paymentTime: string | null;    // 支付时间
  
  // 费用信息
  teacherFee: string | null;     // 老师费用
  transportFee: string | null;   // 车费
  otherFee: string | null;       // 其他费用
  partnerFee: string | null;     // 合伙人费用
  finalAmount: string | null;    // 最终金额
  
  // 详细费用（新增）
  consumablesFee: string | null; // 耗材费
  rentFee: string | null;        // 租金
  propertyFee: string | null;    // 物业费
  utilityFee: string | null;     // 水电费
  
  // 交付信息
  deliveryCity: string | null;   // 交付城市
  deliveryRoom: string | null;   // 交付教室
  deliveryTeacher: string | null;// 交付老师
  deliveryCourse: string | null; // 交付课程
  classDate: string | null;      // 上课日期
  classTime: string | null;      // 上课时间
  
  // 状态信息
  status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded';
  deliveryStatus: 'pending' | 'accepted' | 'delivered';
  
  // 备注信息
  notes: string | null;          // 备注
  noteTags: string | null;       // 备注标签
  discountInfo: string | null;   // 优惠信息
  couponInfo: string | null;     // 优惠券信息
  membershipInfo: string | null; // 会员信息
  specialNotes: string | null;   // 特殊备注
}
```

---

## 错误码说明

### HTTP状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### tRPC错误码

| 错误码 | 说明 | 示例 |
|--------|------|------|
| BAD_REQUEST | 请求参数错误 | 客户名不能使用老师名字 |
| UNAUTHORIZED | 未认证 | 请先登录 |
| FORBIDDEN | 权限不足 | 需要管理员权限 |
| NOT_FOUND | 资源不存在 | 订单不存在 |
| INTERNAL_SERVER_ERROR | 服务器错误 | 数据库连接失败 |

### 业务错误码

| 错误码 | 说明 |
|--------|------|
| CUSTOMER_IS_TEACHER | 客户名不能使用老师名字 |
| TEACHER_FEE_EXCEEDS_COURSE_AMOUNT | 老师费用不能超过课程金额 |
| INSUFFICIENT_BALANCE | 账户余额不足 |
| DUPLICATE_CHANNEL_ORDER_NO | 渠道订单号重复 |
| INVALID_DATE_FORMAT | 日期格式错误 |
| CITY_NOT_CONFIGURED | 城市未配置合伙人费率 |

---

## 附录

### A. 城市合伙人费率配置

| 城市 | 费率 | 说明 |
|------|------|------|
| 武汉 | 40% | (课程金额 - 老师费用) × 40% |
| 天津 | 50% | (课程金额 - 老师费用) × 50% |
| 济南 | 30% | (课程金额 - 老师费用) × 30% |
| 石家庄 | 30% | (课程金额 - 老师费用) × 30% |
| 大连 | 30% | (课程金额 - 老师费用) × 30% |
| 宁波 | 30% | (课程金额 - 老师费用) × 30% |
| 太原 | 30% | (课程金额 - 老师费用) × 30% |
| 郑州 | 30% | (课程金额 - 老师费用) × 30% |
| 东莞 | 30% | (课程金额 - 老师费用) × 30% |
| 南京 | 30% | (课程金额 - 老师费用) × 30% |
| 无锡 | 30% | (课程金额 - 老师费用) × 30% |
| 深圳 | 0% | 金串全资，无合伙人费用 |

### B. 订单号生成规则

订单号格式：`ORD + 13位时间戳 + 3位随机数`

示例：`ORD1769234555645602`

- `ORD`：固定前缀
- `1769234555645`：时间戳（毫秒）
- `602`：3位随机数

### C. 日期时间格式

所有日期时间字段统一使用以下格式：

- 日期：`YYYY-MM-DD`（如：2026-02-18）
- 时间：`HH:mm:ss`（如：14:30:00）
- 日期时间：`YYYY-MM-DD HH:mm:ss`（如：2026-02-18 14:30:00）

### D. 金额格式

所有金额字段统一使用字符串类型，保留两位小数：

- 正确：`"1000.00"`
- 错误：`1000`、`"1000"`、`"1000.0"`

---

**文档结束**

如有疑问，请联系技术支持：+8619117252555
