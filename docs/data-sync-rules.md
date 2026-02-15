# 用户管理和合伙人管理数据同步规则

## 概述

本文档定义了用户管理（User Management）和合伙人管理（Partner Management）之间的完整数据同步规则，确保两个模块之间的数据一致性。

## 数据模型关系

```
users (用户表)
  ├── id (主键)
  ├── name (用户名)
  ├── phone (手机号)
  ├── roles (角色列表，包含cityPartner)
  ├── isActive (是否激活)
  └── ...

partners (合伙人表)
  ├── id (主键)
  ├── userId (外键 → users.id)
  ├── name (合伙人名称，同步自users.name)
  ├── phone (合伙人手机号，同步自users.phone)
  ├── isActive (是否激活，同步自users.isActive)
  └── ...

partner_cities (合伙人城市关联表)
  ├── id (主键)
  ├── partnerId (外键 → partners.id)
  ├── cityId (外键 → cities.id)
  ├── contractStatus (合同状态：draft/active/terminated)
  └── ...

user_role_cities (用户角色城市关联表)
  ├── userId (外键 → users.id)
  ├── role (角色名称，如cityPartner)
  ├── cityId (外键 → cities.id)
  └── ...
```

## 同步规则

### 1. 用户管理 → 合伙人管理

#### 1.1 新增cityPartner角色

**触发条件：** 用户管理中为用户添加cityPartner角色

**同步操作：**
1. 检查是否已存在partners记录（通过userId）
2. 如果不存在，创建新的partners记录：
   - userId = 用户ID
   - name = 用户名
   - phone = 用户手机号
   - isActive = true
   - profitRatio = 默认值（如0.30）
3. 如果存在但isActive=false，恢复激活：
   - isActive = true
   - 同步更新name和phone
4. 如果指定了城市，创建partner_cities记录：
   - partnerId = 合伙人ID
   - cityId = 城市ID
   - contractStatus = 'active' ⚠️ **重要：必须是active，不是draft**
   - currentProfitStage = 1
   - isInvestmentRecovered = false

**实现位置：** `server/userManagementRouter.ts` - update接口（第434-507行）

#### 1.2 修改用户名或手机号

**触发条件：** 用户管理中修改用户的name或phone字段

**同步操作：**
1. 检查用户是否有cityPartner角色
2. 如果有，查找关联的partners记录
3. 同步更新partners表：
   - name = 新用户名（如果修改了）
   - phone = 新手机号（如果修改了）

**实现位置：** `server/userManagementRouter.ts` - update接口（第511-519行）

#### 1.3 修改城市关联

**触发条件：** 用户管理中修改用户的roleCities.cityPartner字段

**同步操作：**
1. 获取当前已关联的城市列表（从partner_cities表）
2. 获取新的城市列表（从输入参数）
3. 添加新城市：
   - 对于新城市列表中不在旧城市列表中的城市
   - 创建partner_cities记录，contractStatus = 'active'
4. 删除不再关联的城市（可选，目前已注释）：
   - 对于旧城市列表中不在新城市列表中的城市
   - 删除对应的partner_cities记录

**实现位置：** `server/userManagementRouter.ts` - update接口（第516-558行）

#### 1.4 启用/禁用用户

**触发条件：** 用户管理中修改用户的isActive字段

**同步操作：**
1. ⚠️ **当前未实现** - 需要添加
2. 应该同步更新partners.isActive字段

**TODO：** 需要在update接口中添加isActive同步逻辑

#### 1.5 取消cityPartner角色

**触发条件：** 用户管理中移除用户的cityPartner角色

**同步操作：**
1. 查找关联的partners记录
2. 删除所有partner_cities记录（partnerId匹配）
3. 设置partners.isActive = false（软删除）

**实现位置：** `server/userManagementRouter.ts` - update接口（第429-436行）

#### 1.6 删除用户（硬删除）

**触发条件：** 用户管理中删除用户

**同步操作：**
1. 查找关联的partners记录
2. 如果存在：
   - 删除所有partner_cities记录（partnerId匹配）
   - 删除partners记录
3. 删除users记录

**实现位置：** `server/userManagementRouter.ts` - delete接口（第754-767行）

### 2. 合伙人管理 → 用户管理

#### 2.1 创建合伙人

**触发条件：** 合伙人管理中创建新合伙人

**同步操作：**
- ⚠️ **当前未实现** - 需要确认是否需要同步
- 合伙人管理创建合伙人时，必须关联到已存在的用户（通过userId）
- 不应该自动创建users记录

**实现位置：** `server/partnerManagementRouter.ts` - create接口

#### 2.2 修改合伙人信息

**触发条件：** 合伙人管理中修改合伙人的name或phone字段

**同步操作：**
- ⚠️ **当前未实现** - 需要确认是否需要同步
- 建议：合伙人信息应该从users表同步过来，不应该反向同步
- 如果需要修改，应该在用户管理中修改

**实现位置：** `server/partnerManagementRouter.ts` - update接口

#### 2.3 删除合伙人（软删除）

**触发条件：** 合伙人管理中删除合伙人

**同步操作：**
1. 删除所有partner_cities记录（partnerId匹配）
2. 设置partners.isActive = false

**实现位置：** `server/partnerManagementRouter.ts` - delete接口（第398-407行）

## 查询过滤规则

### 合伙人管理页面查询

**getPartnerStats接口：**
1. 只查询isActive=true的partners记录
2. 只查询contractStatus='active'的partner_cities记录
3. 自动过滤掉已删除的用户（通过isActive字段）

**实现位置：** `server/partnerManagementRouter.ts` - getPartnerStats接口（第883-887行，第901行）

### 用户管理页面查询

**getUserList接口：**
1. 查询所有users记录（包括isActive=false的）
2. 根据前端需求可以添加isActive过滤

## 数据一致性保证

### 孤儿记录预防

**问题：** 当用户被删除时，如果没有正确清理partners和partner_cities记录，会产生孤儿记录。

**解决方案：**
1. 在delete接口中添加级联删除逻辑（已实现）
2. 定期运行数据清理脚本，删除孤儿记录

**清理脚本示例：**
```sql
-- 查找孤儿partners记录（userId不存在）
SELECT p.* FROM partners p
LEFT JOIN users u ON u.id = p.userId
WHERE u.id IS NULL;

-- 删除孤儿partners记录
DELETE p FROM partners p
LEFT JOIN users u ON u.id = p.userId
WHERE u.id IS NULL;

-- 查找孤儿partner_cities记录（partnerId不存在）
SELECT pc.* FROM partner_cities pc
LEFT JOIN partners p ON p.id = pc.partnerId
WHERE p.id IS NULL;

-- 删除孤儿partner_cities记录
DELETE pc FROM partner_cities pc
LEFT JOIN partners p ON p.id = pc.partnerId
WHERE p.id IS NULL;
```

### 重复记录预防

**问题：** 同一个用户可能被创建多个partners记录。

**解决方案：**
1. 在创建partners记录前，先检查是否已存在（通过userId）
2. 在partners表的userId字段添加唯一索引（建议）

### contractStatus一致性

**问题：** 用户管理创建的partner_cities记录contractStatus应该是'active'，不是'draft'。

**解决方案：**
1. 所有通过用户管理创建的partner_cities记录，contractStatus必须设置为'active'（已修复）
2. 只有通过合伙人管理手动创建的记录才应该是'draft'状态

## 测试覆盖

### 已实现的测试

**userManagement.fullSync.test.ts：**
- ✅ 删除用户时自动删除partners和partner_cities数据
- ✅ 取消cityPartner角色时自动删除partner_cities数据
- ✅ 修改用户名时自动同步到partners表
- ✅ 修改手机号时自动同步到partners表
- ✅ 删除合伙人时自动删除partner_cities数据

**partnerManagement.filter.test.ts：**
- ✅ getPartnerStats只返回isActive=true的合伙人
- ✅ 删除合伙人后不再显示在列表中
- ✅ 取消cityPartner角色后不再显示在合伙人列表中
- ✅ partner_cities的contractStatus只显示active状态

### 待添加的测试

- [ ] 新增cityPartner角色时自动创建partners和partner_cities记录
- [ ] 修改城市关联时正确添加和删除partner_cities记录
- [ ] 启用/禁用用户时同步partners.isActive字段
- [ ] 孤儿记录清理脚本测试
- [ ] 重复记录预防测试

## 未来优化建议

1. **数据库约束：**
   - 在partners表的userId字段添加唯一索引
   - 在partner_cities表的(partnerId, cityId)添加唯一索引
   - 添加外键约束，确保referential integrity

2. **事务处理：**
   - 所有涉及多表操作的同步逻辑应该包装在数据库事务中
   - 确保要么全部成功，要么全部回滚

3. **审计日志：**
   - 记录所有同步操作的历史记录
   - 便于追溯和恢复

4. **定时任务：**
   - 定期运行孤儿记录清理脚本
   - 定期检查数据一致性

5. **双向同步策略：**
   - 明确数据的"主表"和"从表"
   - 建议：users表是主表，partners表是从表
   - 所有基础信息修改应该在users表进行，然后同步到partners表
