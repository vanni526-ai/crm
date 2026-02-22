# 客户管理接口API文档

## 更新说明

**版本：** v1.1  
**更新时间：** 2026-02-22  
**重要变更：** 移除customers表的会员管理字段，统一使用users表管理会员状态

---

## 1. 获取客户列表

### 接口信息

- **路径：** `/api/trpc/customers.list`
- **方法：** GET
- **权限：** 需要登录（protectedProcedure）
- **说明：** 获取所有客户列表，支持筛选和排序

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| minSpent | number | 否 | 最小累计消费金额 |
| maxSpent | number | 否 | 最大累计消费金额 |
| minClassCount | number | 否 | 最小上课次数 |
| maxClassCount | number | 否 | 最大上课次数 |
| lastConsumptionDays | number | 否 | 最后消费天数（例如30表示30天内） |
| trafficSource | string | 否 | 流量来源（花名） |
| highValue | boolean | 否 | 高价值客户（累计消费>5000或上课次数>5） |
| churned | boolean | 否 | 流失客户（最后消费>30天且累计消费>0） |
| sortBy | enum | 否 | 排序字段：totalSpent / classCount / lastOrderDate / firstOrderDate / createdAt |
| sortOrder | enum | 否 | 排序方向：asc（升序）/ desc（降序） |

### 响应数据

#### 数据结构

```typescript
{
  result: {
    data: Array<Customer>
  }
}
```

#### Customer对象字段

| 字段名 | 类型 | 说明 | 数据来源 |
|--------|------|------|----------|
| **id** | number | 客户ID | customers表 |
| **userId** | number \| null | 关联的用户ID | customers表 |
| **name** | string | 客户姓名 | customers表 |
| **wechatId** | string \| null | 微信号 | customers表 |
| **phone** | string \| null | 联系电话 | customers表 |
| **trafficSource** | string \| null | 流量来源（花名） | customers表 |
| **accountBalance** | string | 账户余额 | customers表 |
| **tags** | string \| null | 客户标签（JSON数组） | customers表 |
| **notes** | string \| null | 备注 | customers表 |
| **createdBy** | number | 创建人（销售ID） | customers表 |
| **createdAt** | timestamp | 创建时间 | customers表 |
| **updatedAt** | timestamp | 更新时间 | customers表 |
| **deletedAt** | timestamp \| null | 软删除时间 | customers表 |
| **totalSpent** | string | 累计消费（默认"0.00"） | 计算字段 |
| **lastOrderDate** | date \| null | 最后订单日期 | 计算字段 |
| **firstOrderDate** | date \| null | 首次订单日期 | 计算字段 |
| **classCount** | number | 上课次数（默认0） | 计算字段 |
| **membershipStatus** | enum | **会员状态（从users表获取）** | **users表（LEFT JOIN）** |
| **membershipOrderId** | number \| null | **会员订单ID（从users表获取）** | **users表（LEFT JOIN）** |
| **membershipActivatedAt** | timestamp \| null | **会员激活时间（从users表获取）** | **users表（LEFT JOIN）** |
| **membershipExpiresAt** | timestamp \| null | **会员到期时间（从users表获取）** | **users表（LEFT JOIN）** |

#### membershipStatus枚举值

| 值 | 说明 | 来源逻辑 |
|----|------|----------|
| `pending` | 待激活 | 如果客户未关联userId，或关联的user会员状态为pending |
| `active` | 已激活 | 关联的user会员状态为active |
| `expired` | 已过期 | 关联的user会员状态为expired |

### 重要变更说明

#### ⚠️ 会员字段数据来源变更

**变更前（v1.0）：**
- 会员字段直接从 `customers` 表读取
- `customers` 表包含独立的会员管理字段
- 可能导致与 `users` 表数据不一致

**变更后（v1.1）：**
- 会员字段通过 **LEFT JOIN users表** 获取
- 如果客户关联了 `userId`，优先使用 `users` 表的会员数据
- 如果客户未关联 `userId`，会员状态默认为 `pending`，其他会员字段为 `null`
- **数据来源统一**：所有会员管理都基于 `users` 表

#### 数据一致性保证

1. **关联逻辑：**
   ```sql
   LEFT JOIN users ON customers.userId = users.id
   ```

2. **默认值处理：**
   - 未关联userId：`membershipStatus = 'pending'`
   - 未关联userId：`membershipOrderId = null`
   - 未关联userId：`membershipActivatedAt = null`
   - 未关联userId：`membershipExpiresAt = null`

3. **数据同步：**
   - 当用户在 `users` 表中激活会员时，会员状态自动反映到客户列表
   - 不再需要手动同步 `customers` 表的会员字段

### 示例

#### 请求示例

```http
GET /api/trpc/customers.list?input={"highValue":true,"sortBy":"totalSpent","sortOrder":"desc"}
```

#### 响应示例

```json
{
  "result": {
    "data": [
      {
        "id": 720001,
        "userId": 17370405,
        "name": "韩顗杰",
        "wechatId": null,
        "phone": "18602111141",
        "trafficSource": "App注册",
        "accountBalance": "0.00",
        "tags": null,
        "notes": null,
        "createdBy": 11840819,
        "createdAt": "2026-02-22T10:00:00.000Z",
        "updatedAt": "2026-02-22T10:00:00.000Z",
        "deletedAt": null,
        "totalSpent": "0.00",
        "lastOrderDate": null,
        "firstOrderDate": null,
        "classCount": 0,
        "membershipStatus": "active",
        "membershipOrderId": 2610003,
        "membershipActivatedAt": "2026-02-22T00:00:00.000Z",
        "membershipExpiresAt": "2027-02-22T00:00:00.000Z"
      },
      {
        "id": 720002,
        "userId": null,
        "name": "测试客户",
        "wechatId": "test_wechat",
        "phone": "13800138000",
        "trafficSource": "朋友推荐",
        "accountBalance": "1000.00",
        "tags": "[\"VIP\",\"高价值\"]",
        "notes": "重要客户",
        "createdBy": 11840819,
        "createdAt": "2026-02-20T10:00:00.000Z",
        "updatedAt": "2026-02-20T10:00:00.000Z",
        "deletedAt": null,
        "totalSpent": "0.00",
        "lastOrderDate": null,
        "firstOrderDate": null,
        "classCount": 0,
        "membershipStatus": "pending",
        "membershipOrderId": null,
        "membershipActivatedAt": null,
        "membershipExpiresAt": null
      }
    ]
  }
}
```

### 前端影响

#### ✅ 无需修改前端代码

由于后端API返回的数据结构**保持不变**（仍然包含会员字段），前端代码**无需任何修改**。

#### 前端使用示例

```typescript
// CustomersContent.tsx
const { data: customers } = trpc.customers.list.useQuery();

// 会员状态显示（代码无需修改）
{customer.membershipStatus === 'active' ? (
  <div className="flex flex-col gap-1">
    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
      ✨ 会员
    </Badge>
    {customer.membershipExpiresAt && (
      <span className="text-xs text-muted-foreground">
        到期: {formatDateBJ(customer.membershipExpiresAt)}
      </span>
    )}
  </div>
) : customer.membershipStatus === 'expired' ? (
  <Badge variant="outline" className="text-gray-500">
    已过期
  </Badge>
) : (
  <Badge variant="secondary">
    待激活
  </Badge>
)}
```

### 数据库Schema变更

#### customers表（变更后）

```sql
CREATE TABLE `customers` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int,                          -- 关联users表(可选)
  `name` varchar(100) NOT NULL,
  `wechatId` varchar(100),
  `phone` varchar(20),
  `trafficSource` varchar(100),
  `accountBalance` decimal(10,2) DEFAULT '0.00' NOT NULL,
  `tags` text,
  `notes` text,
  `createdBy` int NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `deletedAt` timestamp,
  
  -- ❌ 已移除的字段：
  -- membershipStatus
  -- membershipOrderId
  -- membershipActivatedAt
  -- membershipExpiresAt
  
  INDEX `user_idx` (`userId`),
  INDEX `wechat_idx` (`wechatId`),
  INDEX `created_by_idx` (`createdBy`)
);
```

#### users表（会员管理主表）

```sql
CREATE TABLE `users` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `name` text,
  `phone` varchar(20),
  `email` varchar(320),
  -- ... 其他字段
  
  -- ✅ 会员管理字段（主表）
  `membershipStatus` enum('pending','active','expired') DEFAULT 'pending' NOT NULL,
  `membershipOrderId` int,
  `membershipActivatedAt` timestamp,
  `membershipExpiresAt` timestamp,
  `isMember` tinyint(1) DEFAULT 0 NOT NULL,
  
  -- ... 其他字段
);
```

---

## 总结

### 主要变更

1. **数据来源统一**：会员信息统一从 `users` 表获取
2. **自动关联**：通过 `customers.userId` 自动关联 `users` 表
3. **数据一致性**：解决了之前 `customers` 表和 `users` 表会员状态不一致的问题
4. **前端兼容**：API返回数据结构保持不变，前端无需修改

### 优势

- ✅ 数据源单一，避免不一致
- ✅ 会员管理逻辑集中在 `users` 表
- ✅ 自动同步，无需手动维护
- ✅ 前端代码无需修改，平滑升级

### 注意事项

- 如果客户未关联 `userId`，会员状态默认为 `pending`
- 会员激活操作应该在 `users` 表进行，会自动反映到客户列表
- 删除客户时不影响 `users` 表的会员数据
