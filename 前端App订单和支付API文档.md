# 前端App订单和支付API文档

## 文档说明

本文档为前端移动端App提供完整的订单和支付相关API接口说明,包括课程预约、订单创建、支付处理、订单查询等功能。

**后端API基础地址**: `https://crm.bdsm.com.cn`

**API协议**: tRPC 11.7 (类型安全的API客户端)

**认证方式**: 无需登录(公开接口)

---

## API接口列表

### 1. 获取城市列表

获取所有可预约课程的城市列表及教室信息。

**接口路径**: `/api/trpc/classrooms.getCities`

**请求方法**: `GET`

**请求参数**: 无

**返回数据结构**:

```typescript
{
  result: {
    data: {
      json: Array<{
        id: number;          // 城市ID
        name: string;        // 城市名称
        isActive: boolean;   // 是否启用
      }>
    }
  }
}
```

**返回示例**:

```json
{
  "result": {
    "data": {
      "json": [
        {
          "id": 1,
          "name": "上海",
          "isActive": true
        },
        {
          "id": 2,
          "name": "天津",
          "isActive": true
        }
      ]
    }
  }
}
```

---

### 2. 获取指定城市的教室列表

根据城市名称获取该城市的所有可用教室。

**接口路径**: `/api/trpc/classrooms.getByCityName`

**请求方法**: `GET`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| cityName | string | 是 | 城市名称 |

**返回数据结构**:

```typescript
{
  result: {
    data: {
      json: Array<{
        id: number;           // 教室ID
        cityId: number;       // 城市ID
        cityName: string;     // 城市名称
        name: string;         // 教室名称
        address: string;      // 教室地址
        notes: string | null; // 备注(交通提示等)
        isActive: boolean;    // 是否启用
        createdAt: string;    // 创建时间
        updatedAt: string;    // 更新时间
      }>
    }
  }
}
```

**返回示例**:

```json
{
  "result": {
    "data": {
      "json": [
        {
          "id": 1,
          "cityId": 1,
          "cityName": "上海",
          "name": "上海1101",
          "address": "上海普陀区中江路106号北岸长风i幢1101室",
          "notes": null,
          "isActive": true,
          "createdAt": "2026-02-04T01:00:00.000Z",
          "updatedAt": "2026-02-04T01:00:00.000Z"
        },
        {
          "id": 2,
          "cityId": 1,
          "cityName": "上海",
          "name": "上海404",
          "address": "上海普陀区中江路106号北岸长风i幢404室",
          "notes": null,
          "isActive": true,
          "createdAt": "2026-02-04T01:00:00.000Z",
          "updatedAt": "2026-02-04T01:00:00.000Z"
        }
      ]
    }
  }
}
```

---

### 3. 获取所有教室列表

获取系统中所有教室信息(包含所有城市)。

**接口路径**: `/api/trpc/classrooms.listAll`

**请求方法**: `GET`

**请求参数**: 无

**返回数据结构**: 同"获取指定城市的教室列表"

---

### 4. 获取老师列表

获取所有可预约的老师信息。

**接口路径**: `/api/trpc/teachers.list`

**请求方法**: `GET`

**请求参数**: 无

**返回数据结构**:

```typescript
{
  result: {
    data: {
      json: Array<{
        id: number;           // 老师ID
        name: string;         // 老师姓名
        customerType: string; // 受众客户类型
        notes: string;        // 备注
        city: string;         // 所在城市
        isActive: boolean;    // 是否激活
        avatarUrl: string;    // 头像URL(CDN地址)
      }>
    }
  }
}
```

**返回示例**:

```json
{
  "result": {
    "data": {
      "json": [
        {
          "id": 360001,
          "name": "测试老师1",
          "customerType": "",
          "notes": "测试用",
          "city": "大连",
          "isActive": true,
          "avatarUrl": "https://d2xsxph8kpxj0f.cloudfront.net/310519663214896586/jtCSa4Dgw9WMNzinVreVWF/avatars/teacher-1770123334961-kdryzr.jpeg"
        }
      ]
    }
  }
}
```

---

### 5. 获取课程列表

获取所有可预约的课程信息。

**接口路径**: `/api/trpc/courses.list`

**请求方法**: `GET`

**请求参数**: 无

**返回数据结构**:

```typescript
{
  result: {
    data: {
      json: Array<{
        id: number;           // 课程ID
        name: string;         // 课程名称
        description: string;  // 课程描述
        price: string;        // 课程价格(decimal)
        duration: number;     // 课程时长(分钟)
        isActive: boolean;    // 是否启用
        createdAt: string;    // 创建时间
        updatedAt: string;    // 更新时间
      }>
    }
  }
}
```

---

### 6. 创建订单

客户下单创建新订单。

**接口路径**: `/api/trpc/orders.create`

**请求方法**: `POST`

**请求参数**:

```typescript
{
  // 客户信息
  customerName: string;        // 客户姓名(必填)
  customerId?: number;         // 客户ID(可选,如果客户已注册)
  
  // 销售信息
  salesPerson?: string;        // 销售人员花名(可选)
  salespersonId?: number;      // 销售人员ID(可选)
  trafficSource?: string;      // 流量来源(可选)
  
  // 金额信息
  courseAmount: number;        // 课程金额(必填)
  paymentAmount: number;       // 支付金额(必填)
  accountBalance?: number;     // 账户余额(可选,默认0)
  
  // 支付信息
  paymentChannel?: string;     // 支付渠道(富掌柜/微信/支付宝)
  channelOrderNo?: string;     // 渠道订单号
  paymentDate?: string;        // 支付日期(YYYY-MM-DD)
  paymentTime?: string;        // 支付时间(HH:MM:SS)
  
  // 交付信息
  deliveryCity: string;        // 交付城市(必填)
  deliveryClassroomId?: number;// 交付教室ID(可选)
  deliveryTeacher?: string;    // 交付老师(可选)
  deliveryCourse?: string;     // 交付课程(可选)
  classDate?: string;          // 上课日期(YYYY-MM-DD)
  classTime?: string;          // 上课时间(HH:MM-HH:MM)
  
  // 费用明细(可选)
  teacherFee?: number;         // 老师费用
  transportFee?: number;       // 车费
  partnerFee?: number;         // 合伙人费用
  consumablesFee?: number;     // 耗材费用
  rentFee?: number;            // 房租费用
  propertyFee?: number;        // 物业费用
  utilityFee?: number;         // 水电费用
  otherFee?: number;           // 其他费用
  
  // 备注信息
  notes?: string;              // 备注
  noteTags?: string[];         // 备注标签
  discountInfo?: object;       // 折扣信息
  couponInfo?: object;         // 优惠券信息
  membershipInfo?: object;     // 会员信息
  specialNotes?: string;       // 特殊要求
  
  // 订单状态
  status?: 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded'; // 默认pending
}
```

**请求示例**:

```json
{
  "customerName": "张三",
  "courseAmount": 2000,
  "paymentAmount": 2000,
  "paymentChannel": "微信",
  "channelOrderNo": "4200002345678901234567890123",
  "paymentDate": "2026-02-04",
  "paymentTime": "14:30:00",
  "deliveryCity": "上海",
  "deliveryClassroomId": 1,
  "deliveryTeacher": "测试老师1",
  "deliveryCourse": "面销课程",
  "classDate": "2026-02-10",
  "classTime": "14:00-16:00",
  "status": "paid"
}
```

**返回数据结构**:

```typescript
{
  result: {
    data: {
      json: {
        id: number;           // 订单ID
        orderNo: string;      // 订单号
        // ... 其他订单字段
      }
    }
  }
}
```

**返回示例**:

```json
{
  "result": {
    "data": {
      "json": {
        "id": 1001,
        "orderNo": "ORD1770234567890021",
        "customerName": "张三",
        "courseAmount": "2000.00",
        "paymentAmount": "2000.00",
        "status": "paid",
        "createdAt": "2026-02-04T06:30:00.000Z"
      }
    }
  }
}
```

---

### 7. 查询订单列表

查询客户的订单列表。

**接口路径**: `/api/trpc/orders.list`

**请求方法**: `GET`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| customerName | string | 否 | 客户姓名(模糊搜索) |
| customerId | number | 否 | 客户ID(精确匹配) |
| status | string | 否 | 订单状态(pending/paid/completed/cancelled/refunded) |
| startDate | string | 否 | 开始日期(YYYY-MM-DD) |
| endDate | string | 否 | 结束日期(YYYY-MM-DD) |
| limit | number | 否 | 每页数量(默认20) |
| offset | number | 否 | 偏移量(默认0) |

**返回数据结构**:

```typescript
{
  result: {
    data: {
      json: {
        orders: Array<{
          id: number;
          orderNo: string;
          customerName: string;
          courseAmount: string;
          paymentAmount: string;
          paymentChannel: string;
          paymentDate: string;
          deliveryCity: string;
          deliveryTeacher: string;
          deliveryCourse: string;
          classDate: string;
          classTime: string;
          status: string;
          createdAt: string;
          updatedAt: string;
        }>;
        total: number;        // 总数量
      }
    }
  }
}
```

---

### 8. 查询订单详情

根据订单ID或订单号查询订单详细信息。

**接口路径**: `/api/trpc/orders.getById` 或 `/api/trpc/orders.getByOrderNo`

**请求方法**: `GET`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 订单ID(getById) |
| orderNo | string | 是 | 订单号(getByOrderNo) |

**返回数据结构**:

```typescript
{
  result: {
    data: {
      json: {
        id: number;
        orderNo: string;
        customerId: number | null;
        customerName: string;
        salespersonId: number | null;
        salesPerson: string;
        trafficSource: string;
        
        // 金额信息
        paymentAmount: string;
        courseAmount: string;
        accountBalance: string;
        
        // 支付信息
        paymentCity: string;
        paymentChannel: string;
        channelOrderNo: string;
        paymentDate: string;
        paymentTime: string;
        
        // 费用明细
        teacherFee: string;
        transportFee: string;
        partnerFee: string;
        consumablesFee: string;
        rentFee: string;
        propertyFee: string;
        utilityFee: string;
        otherFee: string;
        finalAmount: string;
        
        // 交付信息
        deliveryCity: string;
        deliveryRoom: string;
        deliveryClassroomId: number | null;
        deliveryTeacher: string;
        deliveryCourse: string;
        classDate: string;
        classTime: string;
        
        // 状态和备注
        status: string;
        isVoided: boolean;
        notes: string;
        noteTags: string;
        discountInfo: string;
        couponInfo: string;
        membershipInfo: string;
        paymentStatus: string;
        specialNotes: string;
        
        createdAt: string;
        updatedAt: string;
      }
    }
  }
}
```

---

### 9. 更新订单

更新订单信息(用于修改订单状态、补充信息等)。

**接口路径**: `/api/trpc/orders.update`

**请求方法**: `POST`

**请求参数**:

```typescript
{
  id: number;                  // 订单ID(必填)
  
  // 可更新的字段(所有字段均可选)
  customerName?: string;
  salesPerson?: string;
  trafficSource?: string;
  courseAmount?: number;
  paymentAmount?: number;
  accountBalance?: number;
  paymentChannel?: string;
  channelOrderNo?: string;
  paymentDate?: string;
  paymentTime?: string;
  deliveryCity?: string;
  deliveryClassroomId?: number;
  deliveryTeacher?: string;
  deliveryCourse?: string;
  classDate?: string;
  classTime?: string;
  teacherFee?: number;
  transportFee?: number;
  partnerFee?: number;
  consumablesFee?: number;
  rentFee?: number;
  propertyFee?: number;
  utilityFee?: number;
  otherFee?: number;
  status?: 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded';
  notes?: string;
  specialNotes?: string;
}
```

**返回数据结构**:

```typescript
{
  result: {
    data: {
      json: {
        success: boolean;
        message: string;
      }
    }
  }
}
```

---

### 10. 取消订单

取消订单(将订单状态设置为cancelled)。

**接口路径**: `/api/trpc/orders.cancel`

**请求方法**: `POST`

**请求参数**:

```typescript
{
  id: number;                  // 订单ID(必填)
  reason?: string;             // 取消原因(可选)
}
```

**返回数据结构**:

```typescript
{
  result: {
    data: {
      json: {
        success: boolean;
        message: string;
      }
    }
  }
}
```

---

## 数据字典

### 订单状态(status)

| 状态值 | 说明 |
|--------|------|
| pending | 待支付 |
| paid | 已支付 |
| completed | 已完成 |
| cancelled | 已取消 |
| refunded | 已退款 |

### 支付渠道(paymentChannel)

| 渠道值 | 说明 |
|--------|------|
| 富掌柜 | 富掌柜支付 |
| 微信 | 微信支付 |
| 支付宝 | 支付宝支付 |

---

## 错误处理

所有API接口在发生错误时会返回以下格式的错误信息:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述信息"
  }
}
```

**常见错误码**:

| 错误码 | 说明 |
|--------|------|
| BAD_REQUEST | 请求参数错误 |
| NOT_FOUND | 资源不存在 |
| INTERNAL_SERVER_ERROR | 服务器内部错误 |
| UNAUTHORIZED | 未授权访问 |
| FORBIDDEN | 禁止访问 |

---

## 前端集成示例

### 使用tRPC客户端

```typescript
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/routers';

// 创建tRPC客户端
const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'https://crm.bdsm.com.cn/api/trpc',
    }),
  ],
});

// 示例1: 获取城市列表
const cities = await trpc.classrooms.getCities.query();
console.log(cities);

// 示例2: 获取上海的教室列表
const classrooms = await trpc.classrooms.getByCityName.query({
  cityName: '上海'
});
console.log(classrooms);

// 示例3: 获取老师列表
const teachers = await trpc.teachers.list.query();
console.log(teachers);

// 示例4: 创建订单
const order = await trpc.orders.create.mutate({
  customerName: '张三',
  courseAmount: 2000,
  paymentAmount: 2000,
  paymentChannel: '微信',
  channelOrderNo: '4200002345678901234567890123',
  paymentDate: '2026-02-04',
  paymentTime: '14:30:00',
  deliveryCity: '上海',
  deliveryClassroomId: 1,
  deliveryTeacher: '测试老师1',
  deliveryCourse: '面销课程',
  classDate: '2026-02-10',
  classTime: '14:00-16:00',
  status: 'paid'
});
console.log('订单创建成功:', order);

// 示例5: 查询订单列表
const orders = await trpc.orders.list.query({
  customerName: '张三',
  status: 'paid',
  limit: 10,
  offset: 0
});
console.log('订单列表:', orders);

// 示例6: 查询订单详情
const orderDetail = await trpc.orders.getById.query({
  id: 1001
});
console.log('订单详情:', orderDetail);

// 示例7: 更新订单
const updateResult = await trpc.orders.update.mutate({
  id: 1001,
  status: 'completed',
  notes: '课程已完成'
});
console.log('订单更新成功:', updateResult);

// 示例8: 取消订单
const cancelResult = await trpc.orders.cancel.mutate({
  id: 1001,
  reason: '客户临时有事'
});
console.log('订单取消成功:', cancelResult);
```

---

## 注意事项

1. **订单号生成规则**: 订单号格式为 `ORD + 时间戳 + 随机数 + 城市区号`,由后端自动生成,前端无需传递。

2. **金额字段**: 所有金额字段在数据库中存储为`decimal(10, 2)`,API返回时为字符串格式(如"2000.00"),前端需要转换为数字类型进行计算。

3. **日期时间格式**: 
   - 日期格式: `YYYY-MM-DD` (如"2026-02-04")
   - 时间格式: `HH:MM:SS` (如"14:30:00")
   - 时间范围格式: `HH:MM-HH:MM` (如"14:00-16:00")

4. **教室关联**: 建议使用`deliveryClassroomId`字段关联教室表,而不是使用`deliveryRoom`文本字段,以确保数据一致性。

5. **费用自动计算**: 创建订单时,如果提供了`deliveryCity`和`teacherFee`,系统会自动根据城市合伙人费率配置计算`partnerFee`(合伙人费用)。

6. **渠道订单号**: `channelOrderNo`字段用于存储第三方支付平台的订单号,建议在支付成功后立即更新此字段,以便后续对账。

7. **订单状态流转**: 
   - `pending` → `paid` (支付成功)
   - `paid` → `completed` (课程完成)
   - `pending/paid` → `cancelled` (取消订单)
   - `paid/completed` → `refunded` (退款)

8. **数据验证**: 前端应在提交订单前进行必要的数据验证,包括:
   - 客户姓名不能为空
   - 课程金额和支付金额必须大于0
   - 交付城市必须在城市列表中
   - 教室ID必须存在且属于指定城市
   - 上课日期不能早于当前日期

---

## 更新日志

### 2026-02-04

- 初始版本发布
- 添加城市和教室查询接口
- 添加老师列表查询接口
- 添加订单创建、查询、更新、取消接口
- 添加完整的数据字典和错误处理说明
- 添加前端集成示例代码

---

## 技术支持

如有任何问题或建议,请联系技术支持团队。

**API基础地址**: https://crm.bdsm.com.cn

**文档版本**: v1.0.0

**最后更新**: 2026-02-04
