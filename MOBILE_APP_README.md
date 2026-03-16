# 瀛姬App - 移动端H5界面

## 项目概述

在现有 CRM 管理后台基础上，新增移动端 H5 界面（路由前缀 `/app`），支持四种角色（用户、销售、老师、管理员）在同一个 App 中根据登录角色自动切换对应界面。

## 访问地址

| 入口 | 地址 | 说明 |
|------|------|------|
| 移动端入口 | `https://crm.bdsm.com.cn/app` | 自动根据角色跳转 |
| 移动端登录 | `https://crm.bdsm.com.cn/app/login` | 手机号+密码登录 |
| PC管理后台 | `https://crm.bdsm.com.cn/` | 原有管理后台不受影响 |

## 角色与功能

### 用户端（role: user）

| 路由 | 页面 | 功能说明 |
|------|------|----------|
| `/app/user` | 用户首页 | 欢迎页、会员状态、账户余额、最近预约 |
| `/app/user/booking` | 课程预约 | 选城市→选日期→选老师→选时段→确认预约 |
| `/app/user/orders` | 我的订单 | 订单列表、订单状态筛选、订单详情 |
| `/app/user/wallet` | 我的钱包 | 余额显示、消费流水记录 |
| `/app/user/profile` | 个人中心 | 个人信息、修改密码、退出登录 |

### 销售端（role: sales）

| 路由 | 页面 | 功能说明 |
|------|------|----------|
| `/app/sales` | 销售首页 | 今日新增客户、今日订单数、本月销售额、本月提成预估 |
| `/app/sales/register` | 客户登记 | 新增客户表单（姓名、手机号、微信号、来源渠道、城市、备注） |
| `/app/sales/customers` | 客户列表 | 我负责的客户、搜索、状态筛选（未成交/已成交/已到店） |
| `/app/sales/orders` | 订单查询 | 我名下的订单、订单状态、金额、提成金额 |
| `/app/sales/commission` | 我的提成 | 本月/历史提成明细、阶梯提成进度展示 |

### 老师端（role: teacher）

| 路由 | 页面 | 功能说明 |
|------|------|----------|
| `/app/teacher` | 老师首页 | 今日课程列表、本周排课概览 |
| `/app/teacher/schedule` | 我的排课 | 日历视图、查看所有排课安排 |
| `/app/teacher/courses` | 课程详情 | 查看客户信息、上课地点 |
| `/app/teacher/settlement` | 结算明细 | 本月/历史课时费结算记录 |
| `/app/teacher/profile` | 个人中心 | 个人信息查看 |

### 管理员端（role: admin）

| 路由 | 页面 | 功能说明 |
|------|------|----------|
| `/app/admin` | 数据概览 | 今日统计（订单数、销售额、新客户、活跃老师） |
| `/app/admin/orders` | 快速查看订单 | 订单列表、搜索、状态筛选 |
| `/app/admin/customers` | 快速查看客户 | 客户列表、搜索 |
| `/app/admin/approval` | 快速审批 | 老师费用审批等待审批项 |
| `/app/admin/stats` | 统计分析 | 销售排行、城市业绩、趋势图 |

## 技术架构

### 文件结构

```
client/src/pages/app/
├── AppLogin.tsx              # 移动端登录页
├── AppRedirect.tsx           # /app 入口角色跳转
├── components/
│   ├── MobileLayout.tsx      # 移动端布局 + 底部Tab导航
│   └── GlassCard.tsx         # 通用UI组件（StatCard, PageHeader, EmptyState等）
├── user/
│   ├── UserHome.tsx
│   ├── UserBooking.tsx
│   ├── UserOrders.tsx
│   ├── UserWallet.tsx
│   └── UserProfile.tsx
├── sales/
│   ├── SalesHome.tsx
│   ├── SalesRegister.tsx
│   ├── SalesCustomers.tsx
│   ├── SalesOrders.tsx
│   └── SalesCommission.tsx
├── teacher/
│   ├── TeacherHome.tsx
│   ├── TeacherSchedule.tsx
│   ├── TeacherCourses.tsx
│   ├── TeacherSettlement.tsx
│   └── TeacherProfile.tsx
└── admin/
    ├── AdminHome.tsx
    ├── AdminOrders.tsx
    ├── AdminCustomers.tsx
    ├── AdminApproval.tsx
    └── AdminStats.tsx
```

### 修改的现有文件

| 文件 | 修改内容 |
|------|----------|
| `client/src/App.tsx` | 注册所有 `/app/*` 移动端路由 |
| `client/src/main.tsx` | 未授权跳转逻辑支持 `/app` 路径 |
| `client/src/index.css` | 新增移动端专用CSS样式 |

### 设计特点

- **深色主题**：黑色（#0a0a0f）/ 深紫 / 金色（amber）风格，与瀛姬品牌一致
- **毛玻璃效果**：卡片使用 backdrop-blur + 半透明背景
- **底部Tab导航**：不同角色显示不同的Tab项
- **大按钮设计**：适合手指操作，最小触控区域 44px
- **iOS安全区域**：适配刘海屏和底部安全区域
- **角色自动跳转**：登录后根据角色优先级（admin > sales > teacher > user）跳转

### 后端API复用

移动端完全复用现有后端 tRPC API，无需后端改动：

- `auth.loginWithUserAccount` - 手机号密码登录
- `auth.me` - 获取当前用户信息
- `auth.changePassword` - 修改密码
- `orders.list` - 订单列表
- `customers.list` / `customers.create` - 客户管理
- `city.list` - 城市列表
- `teachers.list` - 老师列表
- `schedules.list` - 排课列表
- `booking.*` - 预约相关
- `teacherPayments.list` - 老师结算
- `analytics.*` - 数据分析

## 测试信息

### 登录方式

使用手机号 + 密码登录（初始密码 `123456`）。

### 角色跳转规则

| 用户角色 | 登录后跳转 |
|----------|-----------|
| admin | `/app/admin` |
| sales | `/app/sales` |
| teacher | `/app/teacher` |
| user | `/app/user` |
| 多角色（如 admin,sales） | 按优先级跳转最高角色 |

### 管理员切换查看

管理员登录后默认进入 `/app/admin`，可以手动修改URL访问其他角色页面（如 `/app/sales`）查看对应界面。

## GitHub

- **PR**: https://github.com/vanni526-ai/crm/pull/1
- **Fork**: https://github.com/aneh001/crm
