# 课程交付CRM系统 — 阿里云迁移前全盘检查报告

**检查日期**：2026-02-28  
**检查范围**：数据库结构 · 后端接口 · 前端UI · 迁移清单  
**当前版本**：Checkpoint `3e0aa53b`（最新）

---

## 一、整体评估

| 维度 | 状态 | 说明 |
|------|------|------|
| TypeScript编译 | ✅ 通过 | `tsc --noEmit` 零错误 |
| 生产构建 | ✅ 通过 | `pnpm build` 成功，耗时约80s |
| 认证系统 | ✅ 已改造 | 已切换为手机号/用户名+密码登录，JWT自签 |
| 数据库Schema | ✅ 完整 | 46张表，含会员系统3张新表 |
| 核心业务接口 | ✅ 正常 | 所有tRPC路由已注册 |
| Manus平台依赖 | ⚠️ 需处理 | 存在6类平台专属依赖，迁移前需逐一替换 |
| 前端路由 | ✅ 完整 | 30+个路由，/membership已注册 |
| CORS配置 | ✅ 已适配 | 已包含 `crm.bdsm.com.cn` 及 `*.bdsm.com.cn` |

---

## 二、数据库层检查

### 2.1 表结构完整性

系统共包含 **46张业务表**，覆盖全部功能模块：

| 模块 | 表名 | 状态 |
|------|------|------|
| 用户与权限 | `users`、`userRoleCities`、`systemAccounts`、`accountPermissions`、`accountAuditLogs` | ✅ |
| 客户管理 | `customers`、`accountTransactions` | ✅ |
| 订单管理 | `orders`、`orderItems`、`matchedScheduleOrders`、`importLogs` | ✅ |
| 老师管理 | `teachers`、`teacherPayments`、`teacherUnavailability` | ✅ |
| 排课管理 | `schedules` | ✅ |
| 财务对账 | `reconciliations`、`reconciliationItems` | ✅ |
| 销售管理 | `salespersons`、`salesCommissionConfigs`、`salesCityPerformance` | ✅ |
| 合伙人管理 | `partners`、`partnerExpenses`、`partnerProfitRecords`、`partnerCities`、`partnerFeeAuditLogs` | ✅ |
| 城市管理 | `cities`、`cityPartnerConfig`、`cityMonthlyExpenses` | ✅ |
| 课程管理 | `courses`、`classrooms` | ✅ |
| 会员系统 | `membershipPlans`、`membershipOrders`、`membershipConfig` | ✅ |
| 系统功能 | `auditLogs`、`userNotifications`、`fieldMappings`、`parsingCorrections` 等 | ✅ |

### 2.2 users表会员字段（方案A）

会员状态统一存储在 `users` 表，已包含以下字段：

```
membershipStatus  ENUM('pending','active','expired')  DEFAULT 'pending'
isMember          BOOLEAN                              DEFAULT false
membershipOrderId INT                                  关联membershipOrders.id
membershipActivatedAt  TIMESTAMP
membershipExpiresAt    TIMESTAMP
```

### 2.3 认证相关字段

`users` 表已包含 `phone`、`password`（bcrypt加密）字段，所有现有用户初始密码已设置为 `123456` 的bcrypt哈希值。

### 2.4 待确认事项

> **⚠️ 注意**：`systemAccounts` 表（后台账号管理）与 `users` 表（业务用户）是两套独立的账号体系。登录页面 `LocalLogin.tsx` 当前调用的是 `auth.loginWithUserAccount`，该接口查询的是 `users` 表。若需要后台账号（`systemAccounts`）也能登录，需确认两套体系的使用场景。

---

## 三、后端接口层检查

### 3.1 已注册的tRPC路由（共29个命名空间）

所有路由已在 `server/routers.ts` 中正确注册：

```
system, discovery, salespersons, customers, finance, city,
permissions, auth, userManagement, normalizeOrder, upload,
excelReport, notification, salesCityPerformance, teacherPayment,
partnerManagement, cityExpense, orderParse, dataCleaning,
membership, schedules, analytics, classrooms, teachers,
booking, payment, import, reconciliation, parsingLearning
```

### 3.2 认证接口清单

| 接口 | 类型 | 说明 |
|------|------|------|
| `auth.login` | publicProcedure | systemAccounts表登录（后台账号） |
| `auth.loginWithUserAccount` | publicProcedure | users表登录（手机号/用户名/邮箱+密码） |
| `auth.me` | publicProcedure | 获取当前登录用户信息 |
| `auth.logout` | publicProcedure | 登出（清除session cookie） |
| `auth.changePassword` | protectedProcedure | 修改密码 |
| `auth.resetPassword` | publicProcedure | 重置密码 |
| `auth.refreshToken` | publicProcedure | 刷新Token |
| `auth.register` | publicProcedure | 注册（仅管理员可调用） |

### 3.3 认证策略（sdk.ts中的4层策略）

后端认证按优先级依次尝试：

1. **Strategy 1**：URL Query参数中的JWT Token（App端绕过Cloudflare）
2. **Strategy 2**：Authorization Header 或 X-Auth-Token Header（App端）
3. **Strategy 3**：本地 `session` Cookie（`loginWithUserAccount` 写入的自签JWT）✅ **主要使用**
4. **Strategy 4**：Manus OAuth `app_session_id` Cookie（兜底，迁移后可移除）

### 3.4 Manus平台专属依赖清单（⚠️ 迁移必须处理）

以下依赖在迁移到阿里云后将**不可用**，需要替换：

| 依赖项 | 涉及文件 | 影响程度 | 替换方案 |
|--------|---------|---------|---------|
| `invokeLLM()` | `orderParseRouter.ts`、`reconciliationRouter.ts`、`wechatBillParser.ts`、`transferNoteParser.ts`、`promptOptimizer.ts` | **高** | 替换为阿里云通义千问API（`DASHSCOPE_API_KEY`） |
| `storagePut/storageGet()` | `uploadRouter.ts`、`storage.ts` | **高** | 替换为阿里云OSS SDK（`OSS_ACCESS_KEY_ID`等） |
| `manus-mcp-cli` | `gmailMcp.ts`、`gmailMcpImporter.ts` | **中** | Gmail功能已从导航栏移除，可暂不处理 |
| `vite-plugin-manus-runtime` | `vite.config.ts` | **低** | 迁移后移除该插件（仅提供Manus平台UI编辑功能） |
| `BUILT_IN_FORGE_API_KEY/URL` | `server/storage.ts`、`server/_core/llm.ts` | **高** | 随LLM和存储替换一并处理 |
| `files.manuscdn.com` 图片 | `server/db.ts`、`client/src/components/AvatarEditDialog.tsx`、`client/src/pages/Teachers.tsx` | **低** | 替换为阿里云OSS上的默认头像URL |

### 3.5 CORS配置状态

`server/_core/index.ts` 已配置以下允许来源：

- `*.manus.computer`、`*.manus-asia.computer` 等（Manus平台域名）
- `crm.bdsm.com.cn`（生产域名）✅
- `*.bdsm.com.cn`（子域名通配）✅
- `localhost`、`127.0.0.1`（本地开发）✅
- `ALLOWED_ORIGINS` 环境变量（自定义扩展）✅

迁移到阿里云后，若使用新域名，只需在 `ALLOWED_ORIGINS` 环境变量中追加即可，**无需修改代码**。

### 3.6 端口配置

服务器读取 `process.env.PORT`，默认3000，支持自动寻找可用端口，**无硬编码端口**，阿里云部署兼容。

---

## 四、前端UI层检查

### 4.1 路由完整性

App.tsx 中已注册所有路由，关键路由确认：

| 路由 | 组件 | 状态 |
|------|------|------|
| `/` | Home | ✅ |
| `/login` | LocalLogin | ✅ 已改造为本地登录 |
| `/membership` | MembershipH5 | ✅ 已按设计图实现 |
| `/orders` | Orders | ✅ |
| `/customers` | Customers | ✅ |
| `/teachers` | Teachers | ✅ |
| `/schedules` | Schedules | ✅ |
| `/finance` | Finance | ✅ |
| `/users` | Users | ✅ |
| `/partner-management` | PartnerManagement | ✅ |
| `/city-expense-management` | CityExpenseManagement | ✅ |

### 4.2 Manus OAuth残留（已处理）

| 文件 | 残留内容 | 影响 |
|------|---------|------|
| `client/src/const.ts` | `getLoginUrl()` 已改为返回 `/login` | ✅ 无影响 |
| `client/src/_core/hooks/useAuth.ts` | `localStorage.setItem("manus-runtime-user-info", ...)` | ⚠️ 低风险，仅写入localStorage供Manus平台UI读取，迁移后可删除 |
| `client/src/components/AvatarEditDialog.tsx` | 默认头像URL指向 `files.manuscdn.com` | ⚠️ 迁移后图片可能404，需替换 |
| `client/src/pages/Teachers.tsx` | 同上 | ⚠️ 同上 |
| `vite.config.ts` | `allowedHosts` 仅包含Manus域名 | ⚠️ 生产构建不受影响（仅dev server使用），但建议添加阿里云域名 |

### 4.3 tRPC客户端配置

`client/src/main.tsx` 中tRPC客户端使用相对路径 `/api/trpc`，**无硬编码域名**，迁移后自动适配。

### 4.4 导入导出功能状态

| 模块 | 功能 | 状态 |
|------|------|------|
| 老师管理 | Excel导入（ID匹配更新15字段）/ 导出 / 模板下载 | ✅ |
| 客户管理 | Excel导入（ID匹配更新4字段）/ 导出 / 模板下载 | ✅ |
| 销售管理 | Excel导入（ID匹配更新3字段）/ 导出 / 模板下载 | ✅ |
| 订单管理 | Excel导入（订单号匹配）/ 导出 / 模板下载 | ✅ |

---

## 五、阿里云迁移清单

### 5.1 必须配置的环境变量

迁移到阿里云ECS后，需在服务器环境中配置以下变量：

| 变量名 | 说明 | 是否必须 |
|--------|------|---------|
| `DATABASE_URL` | MySQL连接串，格式：`mysql://user:pass@host:3306/dbname` | **必须** |
| `JWT_SECRET` | Session Cookie签名密钥，建议64位随机字符串 | **必须** |
| `NODE_ENV` | 设置为 `production` | **必须** |
| `PORT` | 服务监听端口，默认3000 | 可选 |
| `ALLOWED_ORIGINS` | 额外允许的CORS来源，逗号分隔 | 可选 |
| `DASHSCOPE_API_KEY` | 阿里云通义千问API密钥（替换LLM功能） | 替换LLM时必须 |
| `OSS_ACCESS_KEY_ID` | 阿里云OSS访问密钥ID（替换文件存储） | 替换存储时必须 |
| `OSS_ACCESS_KEY_SECRET` | 阿里云OSS访问密钥Secret | 替换存储时必须 |
| `OSS_BUCKET` | OSS Bucket名称 | 替换存储时必须 |
| `OSS_REGION` | OSS区域，如 `oss-cn-hangzhou` | 替换存储时必须 |

> **可暂时不配置**（功能降级但不影响核心业务）：`DASHSCOPE_API_KEY`、`OSS_*` — 订单智能解析和文件上传功能会报错，但其他功能正常运行。

### 5.2 需要替换的第三方服务

| 服务 | 当前实现 | 阿里云替换方案 | 优先级 |
|------|---------|--------------|--------|
| LLM（智能解析） | Manus Forge API | 阿里云通义千问 `qwen-turbo` | 中 |
| 文件存储（头像/上传） | Manus Storage Proxy（S3兼容） | 阿里云OSS（SDK兼容S3接口） | 中 |
| 短信验证码 | 未实现（文档已准备） | 阿里云Dypnsapi | 低（可选功能） |
| 微信/支付宝支付 | Mock实现 | 接入真实支付SDK | 低（当前为Mock） |
| Gmail导入 | manus-mcp-cli（已从导航移除） | 可暂不处理 | 低 |

### 5.3 代码层面的迁移改动

以下改动**不影响核心业务**，可在迁移后按需处理：

**优先级高（影响功能可用性）**：

1. **替换 `server/storage.ts`**：将 `BUILT_IN_FORGE_API_URL/KEY` 替换为阿里云OSS SDK
   ```typescript
   // 替换后的storagePut实现
   import OSS from 'ali-oss';
   const client = new OSS({ region, accessKeyId, accessKeySecret, bucket });
   ```

2. **替换 `server/_core/llm.ts`**：将 `invokeLLM` 替换为通义千问API调用

**优先级低（可迁移后逐步处理）**：

3. **替换默认头像URL**：`files.manuscdn.com` → 阿里云OSS上传的默认头像
4. **移除 `vite-plugin-manus-runtime`**：从 `vite.config.ts` 中移除该插件
5. **清理 `useAuth.ts`**：移除 `localStorage.setItem("manus-runtime-user-info", ...)` 这行代码
6. **更新 `vite.config.ts` 的 `allowedHosts`**：添加阿里云域名（仅影响开发模式）

### 5.4 Nginx反向代理配置建议

```nginx
server {
    listen 80;
    server_name crm.bdsm.com.cn;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name crm.bdsm.com.cn;

    ssl_certificate     /etc/ssl/certs/crm.bdsm.com.cn.pem;
    ssl_certificate_key /etc/ssl/private/crm.bdsm.com.cn.key;

    # 前端静态资源（由Node.js服务提供，无需单独配置）
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
    }
}
```

### 5.5 部署命令（阿里云ECS）

```bash
# 1. 克隆代码
git clone https://github.com/your-org/course_crm.git
cd course_crm

# 2. 安装依赖
npm install -g pnpm
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 填入所有必要变量

# 4. 推送数据库Schema
pnpm db:push

# 5. 构建生产版本
pnpm build

# 6. 使用PM2启动（推荐）
npm install -g pm2
pm2 start dist/index.js --name course_crm --env production
pm2 save
pm2 startup

# 7. 验证服务
curl http://localhost:3000/api/trpc/auth.me
```

---

## 六、迁移风险评估

| 风险项 | 风险等级 | 说明 |
|--------|---------|------|
| LLM功能失效 | 🟡 中 | 订单智能解析、账单解析等功能需替换API，但核心CRM功能不受影响 |
| 文件上传失效 | 🟡 中 | 头像上传、文件上传功能需替换OSS，但导入导出（本地处理）不受影响 |
| 支付功能 | 🟡 中 | 当前为Mock实现，迁移后需接入真实支付SDK |
| 认证系统 | 🟢 低 | 已完全切换为本地JWT，无Manus平台依赖 |
| 数据库迁移 | 🟢 低 | Schema已完整，`pnpm db:push` 可自动建表 |
| CORS配置 | 🟢 低 | 已包含 `crm.bdsm.com.cn`，无需修改代码 |
| 前端构建 | 🟢 低 | TypeScript零错误，构建成功 |

---

## 七、迁移前必做清单

- [ ] 确认阿里云ECS规格（推荐：2核4G，CentOS 7.9 / Ubuntu 22.04）
- [ ] 确认阿里云RDS MySQL实例已创建，获取连接串
- [ ] 生成强随机JWT_SECRET（`openssl rand -base64 64`）
- [ ] 确认域名 `crm.bdsm.com.cn` 已解析到ECS公网IP
- [ ] 申请SSL证书（阿里云免费证书或Let's Encrypt）
- [ ] 在ECS上安装Node.js 22.x、pnpm、PM2、Nginx
- [ ] 执行 `pnpm db:push` 建立数据库表结构
- [ ] 从当前Manus数据库导出数据并导入阿里云RDS
- [ ] 配置Nginx反向代理
- [ ] 验证登录功能（使用 `123456` 初始密码）
- [ ] 验证订单管理、客户管理、老师管理核心功能
- [ ] 验证会员H5页面（`/membership`）

---

*本报告由系统自动检查生成，检查时间：2026-02-28*
