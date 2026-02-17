# 课程交付CRM系统 - 沙盒迁移指南

## 项目概述

**项目名称**：课程交付CRM系统 (course_crm)  
**技术栈**：React 19 + Tailwind 4 + Express 4 + tRPC 11 + Drizzle ORM + MySQL  
**打包日期**：2026-02-17  
**打包版本**：ab647453

---

## 迁移包内容

### 1. 项目源代码包
- **文件名**：`course_crm_project.tar.gz`
- **大小**：1.6MB
- **内容**：完整的项目源代码（已排除node_modules、.git、dist等大文件目录）

### 2. 数据库Schema
- **位置**：`course_crm/drizzle/schema.ts`
- **表数量**：37个数据表
- **主要模块**：
  - 用户管理（users, user_role_cities）
  - 合伙人管理（partners, partner_cities）
  - 城市管理（cities, city_monthly_expenses）
  - 订单管理（orders, order_items）
  - 课程管理（courses, classrooms）
  - 客户管理（customers）
  - 财务管理（accountTransactions, accountAuditLogs）
  - Gmail导入（gmailImportHistory, gmail_import_config）
  - 审计日志（auditLogs）

---

## 迁移步骤

### 步骤1：解压项目文件

```bash
# 解压项目源代码
tar -xzf course_crm_project.tar.gz
cd course_crm
```

### 步骤2：安装依赖

```bash
# 安装项目依赖
pnpm install
```

### 步骤3：配置环境变量

项目使用Manus平台的自动注入环境变量，以下环境变量会自动配置：

**系统自动注入的环境变量**：
- `DATABASE_URL` - MySQL/TiDB连接字符串
- `JWT_SECRET` - Session cookie签名密钥
- `VITE_APP_ID` - Manus OAuth应用ID
- `OAUTH_SERVER_URL` - Manus OAuth后端地址
- `VITE_OAUTH_PORTAL_URL` - Manus登录门户URL
- `OWNER_OPEN_ID`, `OWNER_NAME` - 项目所有者信息
- `BUILT_IN_FORGE_API_URL` - Manus内置API地址
- `BUILT_IN_FORGE_API_KEY` - Manus内置API密钥（服务端）
- `VITE_FRONTEND_FORGE_API_KEY` - Manus内置API密钥（前端）
- `VITE_FRONTEND_FORGE_API_URL` - Manus内置API地址（前端）

**无需手动配置**，系统会自动处理。

### 步骤4：初始化数据库

```bash
# 推送数据库Schema到远程数据库
pnpm db:push
```

这个命令会：
1. 读取 `drizzle/schema.ts` 中的表结构定义
2. 生成SQL迁移脚本
3. 自动执行迁移，创建所有37个数据表

### 步骤5：启动开发服务器

```bash
# 启动开发服务器
pnpm dev
```

服务器会自动启动在3000端口（如果3000端口被占用，会自动切换到其他可用端口）。

### 步骤6：配置Nginx反向代理（推荐）

**为什么需要Nginx？**

后端使用动态端口检测机制，端口可能会变化（3000ₒ3001ₒ3002）。使用Nginx反向代理后，前端始终访问固定的80端口，无需关心后端实际端口。

```bash
# 1. 安装Nginx
sudo apt-get update
sudo apt-get install -y nginx

# 2. 启用项目配置
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /home/ubuntu/course_crm/nginx.conf /etc/nginx/sites-enabled/course_crm

# 3. 测试配置
sudo nginx -t

# 4. 启动Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 5. 验证配置
curl http://localhost:80/health
```

**配置说明**：
- 前端访问：`http://localhost:80` 或 `https://80-{sandbox-id}.manus.computer`
- Nginx代理到：`http://localhost:3000`（后端实际端口）
- 支持WebSocket（Vite HMR热更新）
- 支持大文件上传（50MB）

详细配置请参考：`docs/nginx-reverse-proxy-guide.md`

### 步骤7：验证迁移结果

1. **访问Web应用**：打开浏览器访问开发服务器URL
2. **检查登录功能**：使用Manus OAuth登录
3. **验证核心功能**：
   - 用户管理：查看用户列表、添加/编辑用户
   - 合伙人管理：查看合伙人列表、城市分配
   - 订单管理：查看订单列表、创建订单
   - 财务管理：查看账户余额、交易记录

---

## 数据迁移（可选）

如果需要迁移现有数据，可以使用以下方法：

### 方法1：使用数据库管理UI

1. 在原沙盒中，进入项目管理UI → Database面板
2. 导出所有表的数据为SQL文件
3. 在新沙盒中，进入项目管理UI → Database面板
4. 导入SQL文件

### 方法2：使用SQL脚本

```bash
# 在原沙盒中导出数据
mysqldump -h <host> -u <user> -p<password> <database> > backup.sql

# 在新沙盒中导入数据
mysql -h <host> -u <user> -p<password> <database> < backup.sql
```

**注意**：数据库连接信息可以在项目管理UI → Settings → Database中查看。

---

## 前端 App 集成（React Native / Capacitor）

### CORS 配置

后端已经配置了 CORS 白名单，自动允许以下来源访问：

- **所有 `*.manus.computer` 域名**：支持任意 Manus 沙盒环境
- **localhost 域名**：支持本地开发环境
- **Expo Go app 协议**：支持移动 App 开发
- **无 origin 请求**：支持移动 App 原生请求

无需手动配置，前端 App 可以直接连接任意 Manus 沙盒环境的后端 API。

**配置位置**：`server/_core/index.ts`

### Android App 构建

项目已配置 Capacitor，可以直接构建 Android 应用：

```bash
# 构建Web应用
pnpm build

# 同步到Android项目
npx cap sync android

# 打开Android Studio
npx cap open android
```

### API集成

前端App使用统一的API客户端SDK，自动处理：
- ✅ 跨域访问（CORS）
- ✅ Token认证（自动注入）
- ✅ 环境检测（自动切换开发/生产环境）
- ✅ 错误重试（自动重试失败请求）
- ✅ Token持久化存储

**SDK位置**：`docs/crm-api-sdk.md`

**API Base URL配置（重要！）**：

**架构说明**：前端App和后端API运行在**不同的沙盒环境**中，必须通过**公网URL**进行通信。

如果配置了Nginx反向代理，前端App应该使用**80端口**：

```typescript
// ✅ 正确：跨沙盒访问，使用完整的公网URL
const API_BASE_URL = 'https://80-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer';

// ❌ 错误：不能使用localhost（只能在同一沙盒内使用）
const API_BASE_URL = 'http://localhost:80';
```

如果**没有**配置Nginx，则使用后端实际端口：

```typescript
// ✅ 正确：跨沙盒访问，使用完整的公网URL
const API_BASE_URL = 'https://3000-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer';

// ❌ 错误：不能使用localhost
const API_BASE_URL = 'http://localhost:3000';
```

**关键点**：
- ❌ 不能使用 `localhost`（只能在同一沙盒内使用）
- ✅ 必须使用完整的公网URL（跨沙盒访问）
- ✅ 推荐使用80端口（固定端口，后端端口变化时无需更新前端配置）

**快速集成示例**：

```typescript
import { CRMApiClient } from './crm-api-sdk';

// 初始化客户端（跨沙盒访问，使用完整的公网URL）
const client = new CRMApiClient({
  baseURL: 'https://80-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer',
  token: localStorage.getItem('auth_token')
});

// 调用API
const users = await client.users.list();
```

**详细配置指南**：`docs/frontend-app-api-config-guide.md`

---

## 常见问题

### Q1：端口冲突怎么办？

**A**：推荐使用Nginx反向代理解决端口问题：

1. **使用Nginx反向代理（推荐）**：
   - 前端始终访问80端口
   - 后端可以在任意端口运行（3000、3001等）
   - 配置方法见上文“步骤6：配置Nginx反向代理”

2. **不使用Nginx（不推荐）**：
   - 开发服务器会自动检测端口占用
   - 如果3000端口被占用，会自动切换到3001、3002等
   - 前端App需要手动更新API地址中的端口号

### Q2：数据库连接失败怎么办？

**A**：检查以下几点：
1. 确认 `DATABASE_URL` 环境变量已正确注入
2. 确认数据库服务正常运行
3. 在项目管理UI → Settings → Database中查看连接信息
4. 尝试重启开发服务器：`pnpm dev`

### Q3：OAuth登录失败怎么办？

**A**：检查以下几点：
1. 确认 `VITE_APP_ID`、`OAUTH_SERVER_URL` 等OAuth相关环境变量已正确注入
2. 确认项目已在Manus平台注册
3. 清除浏览器Cookie和缓存，重新登录

### Q4：前端App无法连接后端怎么办？

**A**：检查以下几点：
1. 确认后端服务器正常运行（访问 `/api/health` 端点）
2. 确认前端App的API baseURL配置正确
3. 确认Token已正确传递（查看网络请求头）
4. 参考 `docs/crm-api-sdk.md` 中的集成指南

### Q5：如何清理测试数据？

**A**：可以通过以下方式清理：
1. 在项目管理UI → Database面板中手动删除记录
2. 使用SQL脚本批量删除：`DELETE FROM <table_name> WHERE ...`
3. 重新运行 `pnpm db:push` 会重置数据库（**警告：会删除所有数据**）

---

## 技术支持

如果在迁移过程中遇到问题，请参考以下文档：

1. **项目文档**：`docs/` 目录下的所有文档
2. **API文档**：`docs/api/` 目录下的各模块API文档
3. **开发指南**：`docs/frontend-app-development-guide.md`
4. **数据同步规则**：`docs/data-sync-rules.md`

---

## 迁移检查清单

- [ ] 解压项目文件
- [ ] 安装依赖 (`pnpm install`)
- [ ] 初始化数据库 (`pnpm db:push`)
- [ ] 启动开发服务器 (`pnpm dev`)
- [ ] 验证Web应用登录功能
- [ ] 验证核心功能（用户管理、合伙人管理、订单管理）
- [ ] （可选）迁移现有数据
- [ ] （可选）构建Android App
- [ ] （可选）集成前端App API客户端

---

**迁移完成！** 🎉

如有任何问题，请参考上述文档或联系技术支持。
