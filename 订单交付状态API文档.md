# 订单交付状态API接口文档

## 概述

本文档描述了课程交付CRM系统中订单交付状态相关的所有API接口。系统采用 **tRPC** 框架，所有接口通过 `trpc.orders.*` 调用。

---

## 一、订单交付状态API (`trpc.orders.*`)

### 1.1 更新订单交付状态（简单版）

**接口**: `trpc.orders.updateDeliveryStatus.useMutation()`

**类型**: Mutation

**权限**: 销售人员或管理员

**功能**: 更新订单的交付状态，当状态变为 `accepted` 时自动记录接单老师和接单时间

**请求参数**:
```typescript
{
  id: number;  // 订单ID
  deliveryStatus: "pending" | "accepted" | "delivered";  // 交付状态
}
```

**返回数据**:
```typescript
{
  success: boolean;
  message: string;  // "订单交付状态更新成功"
}
```

**自动处理逻辑**:
- 当 `deliveryStatus` 变为 `"accepted"` 时，自动记录：
  - `acceptedBy`: 当前登录用户的ID
  - `acceptedAt`: 当前时间戳
- 当 `deliveryStatus` 变回 `"pending"` 时，自动清除：
  - `acceptedBy`: null
  - `acceptedAt`: null

**使用示例**:
```typescript
const updateDeliveryStatus = trpc.orders.updateDeliveryStatus.useMutation({
  onSuccess: () => {
    toast.success("交付状态已更新");
    utils.orders.list.invalidate();
  },
  onError: (error) => {
    toast.error(error.message || "更新交付状态失败");
  },
});

// 老师接单
updateDeliveryStatus.mutate({
  id: orderId,
  deliveryStatus: "accepted",
});
```

---

### 1.2 更新订单字段（通用版）

**接口**: `trpc.orders.updateFields.useMutation()`

**类型**: Mutation

**权限**: 销售人员或管理员

**功能**: 一次性更新订单的多个交付相关字段

**请求参数**:
```typescript
{
  id: number;  // 订单ID
  data: {
    status?: "pending" | "paid" | "completed" | "cancelled" | "refunded";  // 订单状态
    deliveryStatus?: "pending" | "accepted" | "delivered";  // 交付状态
    deliveryTeacher?: string;  // 交付老师
    deliveryCity?: string;  // 交付城市
    deliveryRoom?: string;  // 交付教室
    deliveryCourse?: string;  // 交付课程
  };
}
```

**返回数据**:
```typescript
{
  success: boolean;
  message: string;
}
```

**使用示例**:
```typescript
const updateOrderFields = trpc.orders.updateFields.useMutation({
  onSuccess: () => {
    toast.success("订单信息已更新");
    utils.orders.list.invalidate();
  },
});

// 老师接单并填写交付信息
updateOrderFields.mutate({
  id: orderId,
  data: {
    deliveryStatus: "accepted",
    deliveryTeacher: "张老师",
    deliveryCity: "上海",
    deliveryRoom: "教室A",
    deliveryCourse: "课程名称",
  },
});
```

---

### 1.3 查询老师待接单订单

**接口**: `trpc.orders.getTeacherOrders.useQuery()`

**类型**: Query

**权限**: 已登录用户

**功能**: 查询已支付但未交付的订单（供老师端使用）

**请求参数**:
```typescript
{
  page?: number;  // 页码，默认1
  pageSize?: number;  // 每页数量，默认10
}
```

**返回数据**:
```typescript
{
  orders: Array<{
    id: number;
    orderNo: string;
    customerName: string | null;
    courseAmount: string;
    deliveryCity: string | null;
    deliveryTeacher: string | null;
    deliveryCourse: string | null;
    classDate: Date | null;
    classTime: string | null;
    status: string;
    deliveryStatus: "pending" | "accepted" | "delivered";
    acceptedBy: number | null;
    acceptedAt: Date | null;
    createdAt: Date;
  }>;
  total: number;
}
```

**使用示例**:
```typescript
const { data, isLoading } = trpc.orders.getTeacherOrders.useQuery({
  page: 1,
  pageSize: 20,
});
```

---

## 二、数据结构定义

### 2.1 订单交付状态枚举

```typescript
export type DeliveryStatus = "pending" | "accepted" | "delivered";

export const DELIVERY_STATUS_TEXT: Record<DeliveryStatus, string> = {
  pending: "待接单",
  accepted: "已接单",
  delivered: "已交付",
};

export const DELIVERY_STATUS_COLOR: Record<DeliveryStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
};
```

### 2.2 订单完整类型定义

详见 `/home/ubuntu/course_crm/client/src/types/order.ts`

**关键字段**:
```typescript
interface Order {
  // ... 其他字段
  
  // 交付状态相关
  deliveryStatus: DeliveryStatus;  // 交付状态
  acceptedAt?: Date | null;  // 接单时间
  acceptedBy?: number | null;  // 接单老师ID
  deliveryTeacher?: string | null;  // 交付老师名称
  deliveryCity?: string | null;  // 交付城市
  deliveryRoom?: string | null;  // 交付教室
  deliveryCourse?: string | null;  // 交付课程
  classDate?: Date | null;  // 上课日期
  classTime?: string | null;  // 上课时间
}
```

---

## 三、常见使用场景

### 3.1 老师接单流程

**场景**: 老师在移动端或Web端查看待接单订单，点击"接单"按钮

**推荐方案**: 使用 `updateFields` API 一次性更新所有信息

```typescript
const handleAcceptOrder = (orderId: number) => {
  updateOrderFields.mutate({
    id: orderId,
    data: {
      deliveryStatus: "accepted",
      deliveryTeacher: currentUser.name,
      deliveryCity: selectedCity,
      classDate: selectedDate,
      classTime: selectedTime,
    },
  });
};
```

### 3.2 快速切换交付状态

**场景**: 在订单列表中快速切换交付状态（待接单 → 已接单 → 已交付）

**推荐方案**: 使用 `updateDeliveryStatus` API

```typescript
const handleToggleStatus = (order: Order) => {
  const statusMap = {
    pending: "accepted",
    accepted: "delivered",
    delivered: "pending",
  } as const;
  
  updateDeliveryStatus.mutate({
    id: order.id,
    deliveryStatus: statusMap[order.deliveryStatus],
  });
};
```

### 3.3 标记订单已交付

**场景**: 老师完成课程后，标记订单为"已交付"

**推荐方案**: 使用 `updateDeliveryStatus` API

```typescript
const handleMarkDelivered = (orderId: number) => {
  updateDeliveryStatus.mutate({
    id: orderId,
    deliveryStatus: "delivered",
  });
};
```

---

## 四、注意事项

### 4.1 自动记录接单信息

- ✅ 当调用 `updateDeliveryStatus` 将状态变为 `"accepted"` 时，系统会自动记录：
  - `acceptedBy`: 当前登录用户的ID
  - `acceptedAt`: 当前时间戳
- ⚠️ 前端无需手动传入这些字段，后端会自动处理

### 4.2 权限控制

- 所有订单交付状态API都需要 `salesOrAdminProcedure` 权限
- 普通用户（`user` 角色）无法调用这些API
- 老师（`teacher` 角色）需要同时拥有 `sales` 或 `admin` 角色才能接单

### 4.3 数据一致性

- `acceptedBy` 字段存储的是 `users` 表的用户ID，不是老师名称
- `deliveryTeacher` 字段存储的是老师名称（字符串），用于显示
- 如需查询接单老师的详细信息，需要通过 `acceptedBy` 关联 `users` 表

### 4.4 课程数据结构

- 系统中有 `schedules` 表（课程排课表）
- `schedules` 表已包含 `orderId` 字段（关联订单ID）
- 如需在课程列表中显示订单号，建议在查询时 JOIN `orders` 表获取 `orderNo`
- 不推荐在 `schedules` 表添加冗余的 `orderNo` 字段

---

## 五、前端集成建议

### 5.1 类型定义

在前端项目中导入类型定义：

```typescript
import type { 
  Order, 
  DeliveryStatus, 
  UpdateOrderDeliveryStatusParams,
  UpdateOrderFieldsParams,
  DELIVERY_STATUS_TEXT,
  DELIVERY_STATUS_COLOR,
} from "@/types/order";
```

### 5.2 状态显示

使用预定义的文本和颜色映射：

```typescript
<Badge className={DELIVERY_STATUS_COLOR[order.deliveryStatus]}>
  {DELIVERY_STATUS_TEXT[order.deliveryStatus]}
</Badge>
```

### 5.3 乐观更新

对于频繁操作的状态切换，建议使用乐观更新：

```typescript
const updateDeliveryStatus = trpc.orders.updateDeliveryStatus.useMutation({
  onMutate: async (newData) => {
    // 取消正在进行的查询
    await utils.orders.list.cancel();
    
    // 保存当前数据快照
    const previousOrders = utils.orders.list.getData();
    
    // 乐观更新
    utils.orders.list.setData(undefined, (old) => 
      old?.map(order => 
        order.id === newData.id 
          ? { ...order, deliveryStatus: newData.deliveryStatus }
          : order
      )
    );
    
    return { previousOrders };
  },
  onError: (err, newData, context) => {
    // 回滚到之前的数据
    utils.orders.list.setData(undefined, context?.previousOrders);
    toast.error("更新失败");
  },
  onSettled: () => {
    // 重新获取数据
    utils.orders.list.invalidate();
  },
});
```

---

## 六、相关文档

- [用户管理和老师管理API接口文档.md](./用户管理和老师管理API接口文档.md)
- [订单交付状态API检查结果.md](./订单交付状态API检查结果.md)
- [数据库Schema文档](../drizzle/schema.ts)
- [前端类型定义](../client/src/types/order.ts)

---

**文档生成时间**: 2025-02-09

**版本**: v1.0
