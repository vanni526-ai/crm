# 前端测试结果

## 测试日期
2026-02-16

## 测试目的
验证合伙人管理新增合伙人时城市显示问题的修复效果

## 测试步骤

### 1. 城市管理中新建测试城市
- ✅ 成功创建"测试城市A"
- 截图：已保存

### 2. 合伙人管理中新增合伙人并选择测试城市
- ✅ 成功创建"测试合伙人A"
- 手机号：18800000001
- 选择城市：测试城市A
- 截图：已保存

### 3. 验证用户列表中显示正确的账号和城市勾选
- ✅ 用户列表中找到测试合伙人A（用户编号：17370118）
- ✅ 角色正确：普通用户、城市合伙人
- ✅ 状态正确：启用
- ✅ 编辑对话框中确认城市正确勾选"测试城市A"
- 截图：已保存

### 4. 验证合伙人管理中显示正确的合伙人和城市
- ⚠️ 初次创建时显示"未分配城市"（因为contractStatus未设置）
- ✅ 修复代码后（添加contractStatus='active'）
- ✅ 数据库查询确认：partner_cities记录存在，contractStatus='active'
- ✅ 重启服务器后修复生效

## 根本原因分析

**问题：** 合伙人管理的create接口在创建partner_cities记录时，没有设置contractStatus字段，导致该字段为NULL或默认值。而getPartnerStats接口有过滤条件`eq(partnerCities.contractStatus, 'active')`，会过滤掉contractStatus不是'active'的记录。

**修复：** 在partnerManagementRouter的create接口中（第180-187行），添加`contractStatus: 'active'`。

## 修复代码位置

文件：`/home/ubuntu/course_crm/server/partnerManagementRouter.ts`

修改前（第180-187行）：
```typescript
await drizzle.insert(partnerCities).values({
  partnerId: newPartner.id,
  cityId: cityId,
  currentProfitStage: 1,
  isInvestmentRecovered: false,
  createdBy: ctx.user.id,
} as any);
```

修改后：
```typescript
await drizzle.insert(partnerCities).values({
  partnerId: newPartner.id,
  cityId: cityId,
  contractStatus: 'active',  // ✅ 添加此行
  currentProfitStage: 1,
  isInvestmentRecovered: false,
  createdBy: ctx.user.id,
} as any);
```

## 测试结论

✅ **修复成功！** 

1. 用户管理和合伙人管理之间的数据同步正常
2. 新增合伙人时城市显示正确
3. 所有测试步骤通过

## 后续建议

1. 为partnerManagementRouter的create接口添加单元测试，确保contractStatus='active'
2. 添加数据完整性检查，防止类似问题再次发生
3. 考虑在数据库层面设置contractStatus的默认值为'active'
