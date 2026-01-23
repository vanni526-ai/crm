# 项目压缩包内容说明

## 文件结构

```
course_crm_android.tar.gz (2.3MB)
└── course_crm/
    ├── android/                    # Android原生项目
    │   ├── app/                    # Android应用模块
    │   │   ├── src/main/
    │   │   │   ├── assets/         # Web资源将同步到这里
    │   │   │   ├── java/           # Java/Kotlin源码
    │   │   │   ├── res/            # Android资源文件
    │   │   │   └── AndroidManifest.xml
    │   │   └── build.gradle        # 应用构建配置
    │   ├── gradle/                 # Gradle wrapper
    │   ├── build.gradle            # 项目构建配置
    │   └── settings.gradle         # 项目设置
    │
    ├── client/                     # Web前端源码
    │   ├── public/                 # 静态资源
    │   ├── src/
    │   │   ├── components/         # React组件
    │   │   ├── contexts/           # React上下文
    │   │   ├── hooks/              # 自定义Hooks
    │   │   ├── lib/                # 工具库
    │   │   ├── pages/              # 页面组件
    │   │   ├── App.tsx             # 应用入口
    │   │   ├── main.tsx            # React挂载
    │   │   └── index.css           # 全局样式
    │   └── index.html              # HTML模板
    │
    ├── server/                     # 后端服务源码
    │   ├── _core/                  # 核心框架代码
    │   ├── routers.ts              # tRPC路由定义
    │   ├── db.ts                   # 数据库操作
    │   ├── gmailAutoImportRouter.ts # Gmail导入功能
    │   ├── customerRouter.ts       # 客户管理API
    │   ├── cityRouter.ts           # 城市管理API
    │   ├── financeRouter.ts        # 财务管理API
    │   └── *.test.ts               # 测试文件
    │
    ├── drizzle/                    # 数据库Schema和迁移
    │   ├── schema.ts               # 数据表定义
    │   └── migrations/             # 数据库迁移文件
    │
    ├── shared/                     # 前后端共享代码
    │   ├── constants.ts            # 常量定义
    │   └── types.ts                # 类型定义
    │
    ├── capacitor.config.ts         # Capacitor配置
    ├── package.json                # Node.js依赖
    ├── tsconfig.json               # TypeScript配置
    ├── vite.config.ts              # Vite构建配置
    ├── tailwind.config.ts          # TailwindCSS配置
    │
    ├── BUILD_ANDROID.md            # 详细构建指南
    ├── QUICK_START_ANDROID.md      # 快速开始指南
    ├── ENV_CONFIG.md               # 环境变量配置说明
    ├── PACKAGE_CONTENTS.md         # 本文档
    └── README.md                   # 项目说明
```

## 已排除的文件

为了减小压缩包体积,以下文件/目录已被排除:

- `node_modules/` - Node.js依赖包(需要运行 `pnpm install` 重新安装)
- `.git/` - Git版本控制历史
- `dist/` - 构建输出(需要运行 `pnpm build` 重新生成)
- `android/build/` - Android构建输出
- `android/.gradle/` - Gradle缓存
- `android/app/build/` - Android应用构建输出
- `storage/` - 本地存储文件

## 使用步骤

### 1. 解压缩

```bash
tar -xzf course_crm_android.tar.gz
cd course_crm
```

### 2. 安装依赖

```bash
pnpm install
```

这将安装所有Node.js依赖包,大约需要1-5分钟,取决于网络速度。

### 3. 配置环境变量

参考 `ENV_CONFIG.md` 文档配置必要的环境变量。

### 4. 构建Web应用

```bash
pnpm build
```

这将构建前端和后端代码到 `dist/` 目录。

### 5. 同步到Android项目

```bash
npx cap sync android
```

这将把Web资源复制到Android项目中。

### 6. 打开Android Studio

```bash
npx cap open android
```

或手动打开Android Studio,选择 `course_crm/android` 目录。

### 7. 构建APK

在Android Studio中:
- 点击菜单 `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
- 等待构建完成
- APK文件位置: `android/app/build/outputs/apk/debug/app-debug.apk`

## 文档说明

### BUILD_ANDROID.md
完整的Android构建指南,包括:
- 系统要求和环境配置
- 详细的构建步骤
- 应用配置说明
- 常见问题解决方案
- 发布到Google Play的指南

### QUICK_START_ANDROID.md
5分钟快速开始指南,适合有经验的开发者快速上手。

### ENV_CONFIG.md
环境变量配置详细说明,包括:
- 所有环境变量列表
- 配置方法(开发/生产环境)
- Android App API地址配置
- 安全建议
- 故障排查

### README.md
项目整体说明,包括功能介绍、技术栈、开发指南等。

## 技术栈

### 前端
- React 19
- TypeScript
- Vite
- TailwindCSS 4
- shadcn/ui组件库
- tRPC客户端
- Recharts图表库

### 后端
- Node.js
- Express 4
- tRPC 11
- Drizzle ORM
- MySQL/TiDB数据库

### 移动端
- Capacitor 8
- Android SDK 34 (Android 14)
- Gradle 8

### 开发工具
- pnpm包管理器
- ESLint代码检查
- Vitest测试框架

## 项目特性

### 核心功能
- 📦 订单管理(创建、编辑、删除、查询)
- 👥 客户管理(客户信息、消费统计、流失分析)
- 👨‍🏫 老师管理(老师信息、费用计算、课时统计)
- 🏙️ 城市管理(城市配置、业绩分析、趋势图表)
- 💰 财务管理(收支明细、城市财务统计、报表导出)
- 📊 数据分析(销售趋势、利润分析、客户价值分析)

### 高级功能
- 📧 Gmail自动导入订单(使用LLM解析邮件内容)
- 🔄 作废订单自动删除
- 📈 城市业绩趋势图表
- 📋 Excel数据导出(财务报表、城市报表)
- 🔍 高级筛选和排序
- 💳 合伙人费用自动计算

### 技术特性
- 🔐 Manus OAuth认证
- 🎨 响应式设计(支持手机、平板、桌面)
- 🌓 深色/浅色主题切换
- ⚡ 实时数据更新
- 🧪 完整的单元测试
- 📱 Android App支持

## 系统要求

### 开发环境
- Node.js 18+
- pnpm 8+
- Java JDK 17
- Android Studio
- MySQL 8+ 或 TiDB

### 运行环境
- Linux/macOS/Windows服务器
- MySQL 8+ 或 TiDB数据库
- 2GB+ RAM
- 10GB+ 磁盘空间

### Android设备要求
- Android 5.1+ (API Level 22+)
- 100MB+ 存储空间
- 网络连接(访问后端API)

## 许可证

本项目为私有项目,仅供授权用户使用。

## 支持

如有问题,请参考:
1. `BUILD_ANDROID.md` - 构建相关问题
2. `ENV_CONFIG.md` - 配置相关问题
3. `README.md` - 功能和开发相关问题

## 版本信息

- 项目版本: 1.0.0
- Capacitor版本: 8.0.1
- 构建日期: 2026-01-23
- 压缩包大小: 2.3MB
- 解压后大小: ~10MB (不含node_modules)
- 完整安装大小: ~500MB (含node_modules)
