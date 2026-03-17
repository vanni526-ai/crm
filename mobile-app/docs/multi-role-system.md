# 多角色系统文档

## 概述

课程预约App支持多角色系统，允许同一用户拥有多个身份（管理员、老师、学员、销售、合伙人）。系统会根据用户的角色数量智能跳转到对应页面。

## 角色定义

系统支持5种用户角色：

| 角色值 | 中文名称 | 首页路由 | 说明 |
|--------|----------|----------|------|
| `admin` | 管理员 | `/(admin)` | 系统超级管理员，拥有所有权限 |
| `teacher` | 老师 | `/(teacher)` | 授课老师 |
| `user` | 学员 | `/(tabs)` | App注册的普通用户（默认角色） |
| `sales` | 销售 | `/(sales)` | 销售人员 |
| `cityPartner` | 合伙人 | `/(partner)` | 城市合伙人 |

## 核心功能

### 1. 角色解析

系统提供了一套完整的角色解析工具函数：

```typescript
import { parseRoles, hasRole, hasAnyRole, getRoleLabel, getRoleHomeRoute } from '@/src/constants/roles';

// 解析角色字符串为数组
const roles = parseRoles("admin,teacher"); // ["admin", "teacher"]

// 检查用户是否拥有某个角色
const isAdmin = hasRole("admin,teacher", "admin"); // true

// 检查用户是否拥有任一角色
const hasManagementRole = hasAnyRole("admin,teacher", ["admin", "sales"]); // true

// 获取角色的中文名称
const label = getRoleLabel("admin"); // "管理员"

// 获取角色的首页路由
const route = getRoleHomeRoute("admin"); // "/(admin)"
```

### 2. 登录后智能跳转

用户登录后，系统会根据角色数量自动跳转：

- **单角色用户**：直接进入对应的首页
  - 学员 → `/(tabs)` 学员首页
  - 老师 → `/(teacher)` 老师首页
  - 管理员 → `/(admin)` 管理员首页
  - 销售 → `/(sales)` 销售首页
  - 合伙人 → `/(partner)` 合伙人首页

- **多角色用户**：跳转到 `/role-selection` 身份选择页面，让用户选择要使用的身份

### 3. 身份切换

多角色用户可以在"我的"页面看到"我的身份"菜单项，点击后可以切换身份。

- 当前选择的身份会显示在菜单项下方（蓝色文字）
- 切换身份后会跳转到对应的首页
- 选择的身份会保存到 `AsyncStorage`，下次登录时自动恢复

### 4. useUserRoles Hook

系统提供了 `useUserRoles` Hook 来管理用户角色状态：

```typescript
import { useUserRoles } from '@/src/hooks/use-user-roles';

function MyComponent() {
  const {
    user,              // 用户信息
    roles,             // 角色数组 ["admin", "teacher"]
    currentRole,       // 当前选择的角色 "admin"
    isAdmin,           // 是否是管理员
    isTeacher,         // 是否是老师
    isSales,           // 是否是销售
    isCityPartner,     // 是否是合伙人
    isUser,            // 是否是学员
    hasMultipleRoles,  // 是否有多个角色
    setCurrentRole,    // 设置当前角色
    refreshUser,       // 刷新用户信息
  } = useUserRoles();

  return (
    <View>
      {hasMultipleRoles && <RoleSwitcher />}
      {isAdmin && <AdminPanel />}
      {isTeacher && <TeacherSchedule />}
    </View>
  );
}
```

## 各角色首页功能

### 学员首页 `/(tabs)`

- 首页：课程预约入口
- 我的预约：查看订单列表
- 我的：个人中心、余额、消费记录

### 老师首页 `/(teacher)`

- 今日课程概览
- 待上课程数量
- 本月收入统计
- 快捷功能：
  - 我的课程
  - 收入统计
  - 个人资料
  - 教室使用指南
  - 上课协议
  - 培训入口

### 管理员首页 `/(admin)`

- 系统概览（总用户、今日订单、今日收入）
- 管理功能：
  - 用户管理
  - 订单管理
  - 课程管理
  - 老师管理
  - 财务管理

### 销售首页 `/(sales)`

- 本月业绩
- 客户数量
- 本月订单
- 功能入口：
  - 客户管理
  - 销售业绩
  - 订单跟踪
  - 销售工具

### 合伙人首页 `/(partner)`

- 本月业绩
- 本月分成
- 团队人数
- 功能入口：
  - 业绩统计
  - 分成明细
  - 团队管理
  - 客户管理

## 测试说明

### 单元测试

已编写38个单元测试，覆盖所有核心功能：

```bash
pnpm test __tests__/multi-role-system.test.ts
```

测试覆盖：
- ✅ parseRoles 函数（8个测试）
- ✅ hasRole 函数（6个测试）
- ✅ hasAnyRole 函数（5个测试）
- ✅ getRoleLabel 函数（6个测试）
- ✅ getRoleHomeRoute 函数（6个测试）
- ✅ 角色常量（4个测试）
- ✅ 多角色场景（3个测试）

### 手动测试

#### 测试单角色用户

1. 使用只有一个角色的账号登录（如只有 `user` 角色）
2. 登录后应该直接进入对应的首页（学员首页）
3. 在"我的"页面不应该看到"我的身份"菜单项

#### 测试多角色用户

1. 在后台为测试账号添加多个角色（如 `admin,teacher`）
2. 登录后应该看到身份选择页面
3. 选择一个身份后，应该跳转到对应的首页
4. 在"我的"页面应该看到"我的身份"菜单项，显示当前身份
5. 点击"我的身份"可以切换到其他身份

#### 测试身份切换

1. 使用多角色账号登录
2. 选择"老师"身份，进入老师首页
3. 在"我的"页面点击"我的身份"
4. 选择"管理员"身份
5. 应该跳转到管理员首页
6. 退出登录后重新登录，应该记住上次选择的"管理员"身份

## 后端数据结构

用户的角色信息存储在 `roles` 字段中，格式为逗号分隔的字符串：

```json
{
  "id": 1,
  "name": "张三",
  "phone": "15921456877",
  "role": "admin",           // 兼容旧字段，单角色
  "roles": "admin,teacher"   // 多角色，逗号分隔
}
```

登录和注册接口返回的用户信息中包含 `roles` 字段，前端应优先使用 `roles` 字段。

## 注意事项

1. **角色字段优先级**：前端应优先使用 `roles` 字段（多角色），`role` 字段仅用于兼容旧版本
2. **默认角色**：如果 `roles` 字段为空或未定义，系统会默认使用 `user` 角色
3. **角色验证**：`parseRoles` 函数会自动过滤掉无效的角色值
4. **空格处理**：角色字符串中的空格会被自动去除（如 `"admin, teacher"` 会被正确解析）
5. **身份持久化**：当前选择的身份会保存到 `AsyncStorage`，key 为 `current_role`

## 开发指南

### 添加新角色

如果需要添加新角色，需要修改以下文件：

1. `src/constants/roles.ts`
   - 在 `USER_ROLES` 数组中添加新角色
   - 在 `ROLE_LABELS` 中添加中文名称
   - 在 `ROLE_HOME_ROUTES` 中添加首页路由

2. 创建新角色的首页目录和文件
   - 如：`app/(newrole)/index.tsx`

3. 更新类型定义
   - TypeScript 会自动推导新的角色类型

### 角色权限控制

当前阶段不限制页面权限，但前端已做好角色判断的基础架构，可以通过 `useUserRoles` Hook 进行权限控制：

```typescript
function AdminOnlyComponent() {
  const { isAdmin } = useUserRoles();
  
  if (!isAdmin) {
    return <Text>无权访问</Text>;
  }
  
  return <AdminPanel />;
}
```

## 后续开发计划

1. ✅ 多角色系统基础架构
2. ✅ 身份选择和切换功能
3. ⏳ 老师端功能开发
   - 我的课程（待上课/已完成）
   - 课程详情（学员信息、上课时间、地点）
   - 签到功能
   - 收入统计
   - 个人资料管理
   - 上课提醒
   - 教室使用指南
   - 上课协议
   - 培训入口
4. ⏳ 管理员功能开发
5. ⏳ 合伙人功能开发
6. ⏳ 销售功能开发

---

*文档版本: v1.0 | 更新日期: 2026-02-06*
