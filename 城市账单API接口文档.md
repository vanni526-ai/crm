# 城市账单API接口文档

本文档描述了前端App调用城市账单相关数据的所有tRPC接口。

---

## 基础信息

**Base URL**: `https://crm.bdsm.com.cn/api/trpc`

**认证方式**: Session Cookie (通过Manus OAuth登录后自动获得)

**tRPC路由前缀**: `cityExpense`

---

## 接口列表

### 1. 获取城市月度费用账单列表

获取城市月度费用账单列表,支持按城市、月份筛选,返回包含销售额、订单数、合伙人分红等完整数据。

**接口路径**: `cityExpense.list`

**请求方法**: `query`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| cityId | number | 否 | 城市ID | 1 |
| month | string | 否 | 月份(YYYY-MM格式) | "2026-01" |
| startMonth | string | 否 | 起始月份(YYYY-MM格式) | "2025-01" |
| endMonth | string | 否 | 结束月份(YYYY-MM格式) | "2026-12" |

**响应数据**:

```typescript
type CityExpenseListResponse = Array<{
  id: number;                    // 账单ID
  cityId: number;                // 城市ID
  cityName: string;              // 城市名称
  month: string;                 // 月份(YYYY-MM)
  
  // 费用项目
  rentFee: string;               // 房租
  propertyFee: string;           // 物业费
  utilityFee: string;            // 水电费
  consumablesFee: string;        // 道具耗材
  cleaningFee: string;           // 保洁费
  phoneFee: string;              // 话费
  deferredPayment: string;       // 合同后付款
  expressFee: string;            // 快递费
  promotionFee: string;          // 推广费
  otherFee: string;              // 其他费用
  teacherFee: string;            // 老师费用(自动计算)
  transportFee: string;          // 车费(自动计算)
  
  // 汇总数据
  totalExpense: string;          // 总费用
  partnerShare: string;          // 合伙人承担
  salesAmount: string;           // 销售额(自动计算)
  orderCount: number;            // 订单数(自动计算)
  partnerDividend: string;       // 合伙人分红(自动计算)
  costShareRatio: string;        // 费用分摊比例(%)
  
  // 其他信息
  notes: string | null;          // 备注
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
}>;
```

**计算公式说明**:

- **老师费用**: 从订单数据中汇总该城市该月份的所有老师费用
- **车费**: 从订单数据中汇总该城市该月份的所有车费
- **总费用**: 房租 + 物业费 + 水电费 + 道具耗材 + 保洁费 + 话费 + 快递费 + 推广费 + 其他费用 + 老师费用 + 车费(注意:合同后付款不计入总费用)
- **合伙人承担**: 勾选费用总和 × 费用分摊比例 / 100
- **销售额**: 从订单数据中汇总该城市该月份的所有支付金额
- **订单数**: 该城市该月份的订单总数
- **合伙人分红**: (销售额 × 费用分摊比例 / 100) - 合伙人承担 - 合同后付款

**调用示例**:

```typescript
// 获取所有账单
const allBills = await trpc.cityExpense.list.query();

// 获取天津市的账单
const tianjinBills = await trpc.cityExpense.list.query({ cityId: 1 });

// 获取2026年1月的账单
const januaryBills = await trpc.cityExpense.list.query({ month: "2026-01" });

// 获取2025年全年的账单
const yearBills = await trpc.cityExpense.list.query({
  startMonth: "2025-01",
  endMonth: "2025-12"
});
```

---

### 2. 获取单个费用账单详情

根据账单ID获取单个费用账单的详细信息。

**接口路径**: `cityExpense.getById`

**请求方法**: `query`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| id | number | 是 | 账单ID | 1 |

**响应数据**:

```typescript
type CityExpenseDetail = {
  id: number;
  cityId: number;
  cityName: string;
  month: string;
  rentFee: string;
  propertyFee: string;
  utilityFee: string;
  consumablesFee: string;
  cleaningFee: string;
  phoneFee: string;
  deferredPayment: string;
  expressFee: string;
  promotionFee: string;
  otherFee: string;
  teacherFee: string;
  transportFee: string;
  totalExpense: string;
  partnerShare: string;
  notes: string | null;
  uploadedBy: number;
  createdAt: Date;
  updatedAt: Date;
};
```

**调用示例**:

```typescript
const billDetail = await trpc.cityExpense.getById.query({ id: 1 });
```

---

### 3. 获取指定城市和月份的费用账单

根据城市ID和月份获取费用账单,如果不存在则返回null。

**接口路径**: `cityExpense.getByCityAndMonth`

**请求方法**: `query`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| cityId | number | 是 | 城市ID | 1 |
| month | string | 是 | 月份(YYYY-MM格式) | "2026-01" |

**响应数据**:

```typescript
type CityExpenseDetail | null
```

**调用示例**:

```typescript
const bill = await trpc.cityExpense.getByCityAndMonth.query({
  cityId: 1,
  month: "2026-01"
});

if (bill) {
  console.log("账单已存在:", bill);
} else {
  console.log("账单不存在");
}
```

---

### 4. 创建或更新费用账单

创建新的费用账单或更新已存在的账单。如果指定城市和月份的账单已存在,则更新;否则创建新账单。

**接口路径**: `cityExpense.upsert`

**请求方法**: `mutation`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| cityId | number | 是 | 城市ID | 1 |
| cityName | string | 是 | 城市名称 | "天津" |
| month | string | 是 | 月份(YYYY-MM格式) | "2026-01" |
| rentFee | string | 否 | 房租 | "3100.00" |
| propertyFee | string | 否 | 物业费 | "0.00" |
| utilityFee | string | 否 | 水电费 | "0.00" |
| consumablesFee | string | 否 | 道具耗材 | "1884.60" |
| cleaningFee | string | 否 | 保洁费 | "0.00" |
| phoneFee | string | 否 | 话费 | "0.00" |
| deferredPayment | string | 否 | 合同后付款 | "0.00" |
| expressFee | string | 否 | 快递费 | "0.00" |
| promotionFee | string | 否 | 推广费 | "0.00" |
| otherFee | string | 否 | 其他费用 | "607.78" |
| notes | string | 否 | 备注 | "本月费用正常" |

**响应数据**:

```typescript
type UpsertResponse = {
  id: number;        // 账单ID
  isNew: boolean;    // 是否为新创建的账单
};
```

**注意事项**:

1. 老师费用和车费会自动从订单数据中计算,无需手动传入
2. 总费用会自动计算,无需手动传入
3. 合伙人承担会根据费用分摊比例自动计算,无需手动传入
4. 所有金额字段默认为"0.00"

**调用示例**:

```typescript
const result = await trpc.cityExpense.upsert.mutate({
  cityId: 1,
  cityName: "天津",
  month: "2026-01",
  rentFee: "3100.00",
  propertyFee: "0.00",
  utilityFee: "0.00",
  consumablesFee: "1884.60",
  cleaningFee: "0.00",
  phoneFee: "0.00",
  deferredPayment: "0.00",
  expressFee: "0.00",
  promotionFee: "0.00",
  otherFee: "607.78",
  notes: "本月费用正常"
});

if (result.isNew) {
  console.log("创建新账单成功,ID:", result.id);
} else {
  console.log("更新账单成功,ID:", result.id);
}
```

---

### 5. 删除费用账单

根据账单ID删除费用账单。

**接口路径**: `cityExpense.delete`

**请求方法**: `mutation`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| id | number | 是 | 账单ID | 1 |

**响应数据**:

```typescript
type DeleteResponse = {
  success: boolean;
};
```

**调用示例**:

```typescript
const result = await trpc.cityExpense.delete.mutate({ id: 1 });

if (result.success) {
  console.log("删除成功");
}
```

---

### 6. 获取所有城市列表

获取所有激活状态的城市列表,用于下拉选择器等场景。

**接口路径**: `cityExpense.getCities`

**请求方法**: `query`

**请求参数**: 无

**响应数据**:

```typescript
type CitiesResponse = Array<{
  id: number;      // 城市ID
  name: string;    // 城市名称
}>;
```

**调用示例**:

```typescript
const cities = await trpc.cityExpense.getCities.query();

// 渲染下拉选择器
cities.forEach(city => {
  console.log(`${city.id}: ${city.name}`);
});
```

---

## 数据结构说明

### 费用项目字段

所有费用项目字段均为字符串类型,格式为带两位小数的数字字符串(例如:"3100.00")。

| 字段名 | 说明 | 是否计入总费用 | 是否可能被合伙人承担 |
|--------|------|----------------|---------------------|
| rentFee | 房租 | ✅ | ✅ |
| propertyFee | 物业费 | ✅ | ✅ |
| utilityFee | 水电费 | ✅ | ✅ |
| consumablesFee | 道具耗材 | ✅ | ✅ |
| cleaningFee | 保洁费 | ✅ | ✅ |
| phoneFee | 话费 | ✅ | ✅ |
| deferredPayment | 合同后付款 | ❌ | ❌ |
| expressFee | 快递费 | ✅ | ✅ |
| promotionFee | 推广费 | ✅ | ✅ |
| otherFee | 其他费用 | ✅ | ✅ |
| teacherFee | 老师费用(自动计算) | ✅ | ✅ |
| transportFee | 车费(自动计算) | ✅ | ✅ |

### 费用分摊比例(costShareRatio)

费用分摊比例根据合伙人所处的分红阶段自动确定:

- **阶段1**(0-12个月): 使用`profitRatioStage1Partner`
- **阶段2未回本**(13-24个月,未回本): 使用`profitRatioStage2APartner`
- **阶段2已回本**(13-24个月,已回本): 使用`profitRatioStage2BPartner`
- **阶段3**(25个月后): 使用`profitRatioStage3Partner`

### 合伙人承担(partnerShare)

合伙人承担金额的计算逻辑:

1. 从合伙人管理中获取该城市的"费用承担配置"(expenseCoverage),确定哪些费用项目被勾选
2. 计算所有被勾选费用项目的总和(coveredExpenseTotal)
3. 合伙人承担 = coveredExpenseTotal × costShareRatio / 100

例如:
- 如果只勾选了"房租"和"老师费用"
- 房租=3100,老师费用=14845,费用分摊比例=50%
- 则合伙人承担 = (3100 + 14845) × 50% / 100 = 8972.50

### 合伙人分红(partnerDividend)

合伙人分红的计算公式:

```
合伙人分红 = (销售额 × 费用分摊比例 / 100) - 合伙人承担 - 合同后付款
```

例如(天津):
- 销售额=77626,费用分摊比例=50%,合伙人承担=10743.69,合同后付款=0
- 合伙人分红 = (77626 × 50 / 100) - 10743.69 - 0 = 28069.31

---

## 错误处理

所有接口在发生错误时会抛出TRPCError,包含以下信息:

```typescript
type TRPCError = {
  code: string;        // 错误代码(如"NOT_FOUND", "INTERNAL_SERVER_ERROR")
  message: string;     // 错误信息
};
```

常见错误代码:

| 错误代码 | 说明 | 示例场景 |
|---------|------|---------|
| NOT_FOUND | 资源不存在 | 查询不存在的账单ID |
| INTERNAL_SERVER_ERROR | 服务器内部错误 | 数据库连接失败 |
| BAD_REQUEST | 请求参数错误 | 传入无效的月份格式 |
| UNAUTHORIZED | 未授权 | 未登录或Session过期 |

**错误处理示例**:

```typescript
try {
  const bill = await trpc.cityExpense.getById.query({ id: 999 });
} catch (error) {
  if (error.data?.code === "NOT_FOUND") {
    console.error("账单不存在");
  } else {
    console.error("发生错误:", error.message);
  }
}
```

---

## 完整使用示例

### 示例1: 获取并展示城市账单列表

```typescript
import { trpc } from "@/lib/trpc";

// 在React组件中使用
function CityBillsList() {
  const { data: bills, isLoading } = trpc.cityExpense.list.useQuery({
    month: "2026-01"
  });

  if (isLoading) return <div>加载中...</div>;

  return (
    <table>
      <thead>
        <tr>
          <th>城市</th>
          <th>月份</th>
          <th>销售额</th>
          <th>订单数</th>
          <th>总费用</th>
          <th>合伙人承担</th>
          <th>合伙人分红</th>
        </tr>
      </thead>
      <tbody>
        {bills?.map(bill => (
          <tr key={bill.id}>
            <td>{bill.cityName}</td>
            <td>{bill.month}</td>
            <td>¥{parseFloat(bill.salesAmount).toLocaleString()}</td>
            <td>{bill.orderCount}</td>
            <td>¥{parseFloat(bill.totalExpense).toLocaleString()}</td>
            <td>¥{parseFloat(bill.partnerShare).toLocaleString()}</td>
            <td className="text-red-600 font-semibold">
              ¥{parseFloat(bill.partnerDividend).toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 示例2: 创建或更新账单

```typescript
import { trpc } from "@/lib/trpc";

function CreateBillForm() {
  const utils = trpc.useUtils();
  const upsertMutation = trpc.cityExpense.upsert.useMutation({
    onSuccess: () => {
      // 刷新列表
      utils.cityExpense.list.invalidate();
      alert("保存成功");
    },
    onError: (error) => {
      alert("保存失败: " + error.message);
    }
  });

  const handleSubmit = (formData: FormData) => {
    upsertMutation.mutate({
      cityId: parseInt(formData.get("cityId") as string),
      cityName: formData.get("cityName") as string,
      month: formData.get("month") as string,
      rentFee: formData.get("rentFee") as string,
      propertyFee: formData.get("propertyFee") as string,
      utilityFee: formData.get("utilityFee") as string,
      // ... 其他字段
    });
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(new FormData(e.currentTarget));
    }}>
      {/* 表单字段 */}
      <button type="submit" disabled={upsertMutation.isLoading}>
        {upsertMutation.isLoading ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
```

### 示例3: 删除账单

```typescript
import { trpc } from "@/lib/trpc";

function DeleteBillButton({ billId }: { billId: number }) {
  const utils = trpc.useUtils();
  const deleteMutation = trpc.cityExpense.delete.useMutation({
    onSuccess: () => {
      utils.cityExpense.list.invalidate();
      alert("删除成功");
    }
  });

  const handleDelete = () => {
    if (confirm("确定要删除这条账单吗?")) {
      deleteMutation.mutate({ id: billId });
    }
  };

  return (
    <button onClick={handleDelete} disabled={deleteMutation.isLoading}>
      {deleteMutation.isLoading ? "删除中..." : "删除"}
    </button>
  );
}
```

---

## 注意事项

1. **认证要求**: 所有接口都需要用户登录后才能访问,请确保用户已通过Manus OAuth完成登录
2. **金额格式**: 所有金额字段均为字符串类型,格式为带两位小数的数字字符串(例如:"3100.00")
3. **月份格式**: 月份字段必须使用"YYYY-MM"格式(例如:"2026-01")
4. **自动计算**: 老师费用、车费、总费用、合伙人承担、销售额、订单数、合伙人分红均由后端自动计算,无需前端传入
5. **数据一致性**: 创建或更新账单时,老师费用和车费会从订单数据中实时汇总,确保数据一致性
6. **合同后付款**: 合同后付款不计入总费用,但会从合伙人分红中扣除

---

## 更新日志

### 2026-02-13
- 新增合伙人分红字段(partnerDividend)
- 调整合伙人分红计算公式,增加扣除合同后付款
- 新增销售额(salesAmount)和订单数(orderCount)字段
- 优化list接口,返回完整的账单数据包括销售额、订单数、合伙人分红

### 2026-02-12
- 初始版本发布
- 实现基础CRUD接口
- 实现自动计算老师费用和车费
- 实现费用分摊比例自动获取
