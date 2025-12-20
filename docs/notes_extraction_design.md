# 备注字段智能提取设计文档

## 目标
从订单备注中自动识别和提取结构化信息,便于统计分析和业务洞察。

## 数据结构设计

### 新增字段(orders表)
```typescript
{
  // 原有字段
  notes: string,  // 原始备注文本
  
  // 新增结构化字段
  noteTags: string,  // JSON数组,存储提取的标签
  // 示例: ["优惠活动:第二节半价", "复购:第3次", "会员:充值客户"]
  
  discountInfo: string,  // JSON对象,折扣信息
  // 示例: {"type": "活动折扣", "rate": 0.5, "description": "第二节半价"}
  
  couponInfo: string,  // JSON对象,优惠券信息
  // 示例: {"source": "抖音", "amount": 100, "description": "满1000-100"}
  
  membershipInfo: string,  // JSON对象,会员信息
  // 示例: {"type": "充值会员", "balance": 5100, "deduction": 3300}
  
  paymentStatus: string,  // 支付状态标签
  // 可选值: "全款已付", "定金已付", "部分未付", "待付款"
  
  specialNotes: string,  // 特殊要求/备注
  // 示例: "时间改变", "临时换老师"
}
```

## 提取规则

### 1. 优惠活动识别
**关键词:**
- "半价"、"第二节半价"、"第三节半价"
- "送"、"九送二"、"六送一"、"十送三"
- "折"、"8折"、"9折"
- "活动"、"疯狂周三"、"12.12活动"

**提取逻辑:**
- 识别折扣比例(如"第二节半价" → 50%折扣)
- 识别赠送规则(如"九送二" → 买9送2)
- 生成标签: "优惠活动:第二节半价"

### 2. 优惠券识别
**关键词:**
- "券"、"优惠券"、"抵扣券"
- "核销"、"已核销"
- "抖音来客"、"满减"

**提取逻辑:**
- 识别优惠券来源(抖音、美团、市场部等)
- 识别优惠券金额(如"满1000-100" → 抵扣100元)
- 生成couponInfo对象

### 3. 会员/充值识别
**关键词:**
- "充值客户"、"会员"、"余额"
- 余额计算表达式(如"余额8400-1500=6900")

**提取逻辑:**
- 识别会员类型
- 提取余额信息和扣款记录
- 生成membershipInfo对象

### 4. 复购识别
**关键词:**
- "复购"、"第X次复购"
- "还剩X节"、"剩余X节"

**提取逻辑:**
- 识别复购次数
- 识别剩余课时
- 生成标签: "复购:第3次"

### 5. 支付状态识别
**关键词:**
- "全款已付"、"已付"
- "定金已付"、"尾款未付"
- "未付"、"待付"

**提取逻辑:**
- 识别支付状态
- 提取定金/尾款金额
- 设置paymentStatus字段

### 6. 特殊要求识别
**关键词:**
- "时间改变"、"临时换老师"
- "特殊要求"、"备注"

**提取逻辑:**
- 提取特殊说明文本
- 设置specialNotes字段

### 7. 巡游/外地识别
**关键词:**
- "巡游"、"外地"
- 城市名 + "上"(如"北京上"、"成都上")
- 巡游提成比例(如"巡游30%")

**提取逻辑:**
- 识别巡游城市
- 提取巡游提成比例
- 生成标签: "巡游:成都(30%)"

## 实现方案

### 1. 创建提取函数
```typescript
// server/notesExtractor.ts
export function extractNotesInfo(notes: string) {
  const tags: string[] = [];
  let discountInfo = null;
  let couponInfo = null;
  let membershipInfo = null;
  let paymentStatus = "";
  let specialNotes = "";
  
  // 各种提取逻辑...
  
  return {
    tags,
    discountInfo,
    couponInfo,
    membershipInfo,
    paymentStatus,
    specialNotes
  };
}
```

### 2. 集成到智能登记
在`transferNoteParser.ts`中,解析完订单后自动调用提取函数:
```typescript
orders.forEach(order => {
  if (order.notes) {
    const extracted = extractNotesInfo(order.notes);
    order.noteTags = JSON.stringify(extracted.tags);
    order.discountInfo = extracted.discountInfo ? JSON.stringify(extracted.discountInfo) : null;
    // ...其他字段
  }
});
```

### 3. 前端显示
在订单详情页面显示结构化信息:
- 标签云显示noteTags
- 优惠信息卡片显示折扣/优惠券
- 会员信息显示余额和扣款
- 特殊备注高亮显示

### 4. 统计分析
添加统计页面:
- 优惠券使用统计(按来源、金额)
- 折扣活动效果分析
- 会员消费分析
- 复购率统计

## 测试用例

### 测试用例1: 优惠活动
输入: "参加第二个小时半价"
期望输出:
- tags: ["优惠活动:第二节半价"]
- discountInfo: {"type": "活动折扣", "rate": 0.5, "description": "第二节半价"}

### 测试用例2: 优惠券
输入: "抖音来客1200已核销 满1000-100券,抵扣100"
期望输出:
- tags: ["优惠券:抖音来客", "优惠券:满减100"]
- couponInfo: {"source": "抖音", "amount": 100, "description": "满1000-100"}

### 测试用例3: 会员充值
输入: "充值客户 余额8400-1500-1200=5700"
期望输出:
- tags: ["会员:充值客户"]
- membershipInfo: {"type": "充值会员", "balance": 5700, "deduction": 2700}

### 测试用例4: 复购
输入: "第三次复购 九送二 还剩4.5节"
期望输出:
- tags: ["复购:第3次", "优惠活动:九送二", "剩余课时:4.5节"]

### 测试用例5: 支付状态
输入: "定金2300已付 尾款1900未付"
期望输出:
- paymentStatus: "部分未付"
- tags: ["定金:2300", "尾款未付:1900"]

## 优先级
1. **P0 (必须)**: 优惠活动、优惠券、支付状态
2. **P1 (重要)**: 会员信息、复购识别
3. **P2 (可选)**: 特殊要求、巡游识别
