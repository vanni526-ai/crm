# 瀛姬App v4 - Mobile Application

## 项目说明

瀛姬App是基于Expo + React Native构建的移动端应用，对接CRM后端API。

## 技术栈

- **框架**: Expo SDK 54 + React Native 0.81
- **路由**: Expo Router v6
- **样式**: NativeWind (TailwindCSS for RN)
- **API**: tRPC + React Query
- **语言**: TypeScript

## 后端API

- **CRM后端**: https://crm.bdsm.com.cn/api/trpc
- **认证方式**: Token通过URL参数 + Authorization Header双重传递

## 五个角色界面

| 角色 | 路由 | 说明 |
|------|------|------|
| 用户端 | `/(tabs)` | 普通用户：课程浏览、预约、钱包 |
| 销售端 | `/(sales)` | 销售人员：客户管理、订单、业绩 |
| 老师端 | `/(teacher)` | 教师：课程管理、排课、收入 |
| 管理员端 | `/(admin)` | 管理员：数据概览、用户管理 |
| 合伙人端 | `/(partner)` | 城市合伙人：佣金、分红、门店数据 |

## 开发运行

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev:metro

# TypeScript检查
pnpm check

# Web构建
npx expo export --platform web
```

## 版本历史

- **v4** (2026-03-18): 修复所有API路由问题，添加19个fallback实现，零TypeScript错误
- **v3**: 初始版本

## API修复说明

v4版本修复了以下问题：
1. 19个CRM后端不存在的路由，全部实现fallback替代方案
2. Token认证问题（verifyToken fallback到auth.me）
3. tRPC hooks的token传递（URL参数+双重获取）
4. 缺失的API方法（changePassword、resetPassword、recharge）
