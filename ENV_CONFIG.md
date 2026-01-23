# 环境变量配置说明

## 概述

本应用使用环境变量来配置后端服务、数据库连接、OAuth认证等关键信息。在部署Android App之前,需要正确配置这些环境变量。

## 环境变量列表

### 数据库配置

```bash
# MySQL/TiDB数据库连接字符串
DATABASE_URL=mysql://username:password@host:port/database
```

**示例:**
```bash
DATABASE_URL=mysql://root:mypassword@localhost:3306/course_crm
```

### 认证配置

```bash
# JWT密钥(用于生成和验证用户会话令牌)
JWT_SECRET=your-secret-key-here

# OAuth服务器URL
OAUTH_SERVER_URL=https://api.manus.im

# 应用ID
VITE_APP_ID=your-app-id

# OAuth登录门户URL
VITE_OAUTH_PORTAL_URL=https://login.manus.im

# 应用所有者信息
OWNER_OPEN_ID=your-owner-open-id
OWNER_NAME=your-owner-name
```

### API配置

```bash
# Manus内置API URL(后端)
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=your-backend-api-key

# Manus内置API URL(前端)
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.im
VITE_FRONTEND_FORGE_API_KEY=your-frontend-api-key
```

### 应用配置

```bash
# 应用标题
VITE_APP_TITLE=课程交付CRM系统

# 应用Logo URL
VITE_APP_LOGO=https://your-domain.com/logo.png

# 分析统计配置
VITE_ANALYTICS_WEBSITE_ID=your-analytics-id
VITE_ANALYTICS_ENDPOINT=https://analytics.manus.im
```

## 配置方法

### 方法一: 使用.env文件(开发环境)

在项目根目录创建 `.env` 文件:

```bash
# .env
DATABASE_URL=mysql://root:password@localhost:3306/course_crm
JWT_SECRET=my-super-secret-key-change-this-in-production
OAUTH_SERVER_URL=https://api.manus.im
VITE_APP_ID=your-app-id
VITE_OAUTH_PORTAL_URL=https://login.manus.im
OWNER_OPEN_ID=your-owner-open-id
OWNER_NAME=Your Name
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=your-backend-api-key
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.im
VITE_FRONTEND_FORGE_API_KEY=your-frontend-api-key
VITE_APP_TITLE=课程交付CRM系统
VITE_APP_LOGO=https://your-domain.com/logo.png
```

**注意:** `.env` 文件不应该提交到Git仓库。已在 `.gitignore` 中配置忽略。

### 方法二: 系统环境变量(生产环境)

在服务器上设置系统环境变量:

**Linux/macOS:**
```bash
export DATABASE_URL="mysql://user:pass@host:3306/db"
export JWT_SECRET="your-secret-key"
# ... 其他变量
```

**Windows:**
```cmd
set DATABASE_URL=mysql://user:pass@host:3306/db
set JWT_SECRET=your-secret-key
```

### 方法三: Docker环境变量

在 `docker-compose.yml` 中配置:

```yaml
services:
  app:
    image: course-crm:latest
    environment:
      - DATABASE_URL=mysql://user:pass@db:3306/course_crm
      - JWT_SECRET=your-secret-key
      - OAUTH_SERVER_URL=https://api.manus.im
      # ... 其他变量
```

## Android App配置

### API基础URL配置

Android App需要知道后端服务器的地址。有两种配置方式:

#### 方式一: 编译时配置(推荐)

在构建Android App之前,修改前端代码中的API基础URL。

编辑 `client/src/lib/trpc.ts`:

```typescript
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://your-backend-server.com';
```

然后在 `.env` 文件中设置:

```bash
VITE_API_BASE_URL=https://your-backend-server.com
```

重新构建:
```bash
pnpm build
npx cap sync android
```

#### 方式二: 运行时配置

在应用启动时从配置文件或远程服务器获取API地址。这需要修改应用代码来实现动态配置。

### Capacitor配置

编辑 `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'com.course.crm',
  appName: '课程交付CRM',
  webDir: 'dist/public',
  server: {
    // 生产环境: 使用打包的静态文件
    // 开发环境: 可以指向本地开发服务器
    // url: 'http://192.168.1.100:3000',
    // cleartext: true
  },
  android: {
    allowMixedContent: true,  // 如果后端使用HTTP而非HTTPS
    webContentsDebuggingEnabled: true  // 允许调试
  }
};
```

## 安全建议

### 1. JWT密钥

- 使用强随机字符串(至少32字符)
- 生产环境和开发环境使用不同的密钥
- 定期轮换密钥

生成安全的JWT密钥:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. 数据库密码

- 使用强密码
- 不要在代码中硬编码
- 使用密钥管理服务(如AWS Secrets Manager、Azure Key Vault)

### 3. API密钥

- 前端API密钥和后端API密钥分开
- 前端密钥权限受限(只读或受限操作)
- 后端密钥拥有完整权限

### 4. HTTPS

- 生产环境必须使用HTTPS
- 配置SSL证书(Let's Encrypt免费证书)
- 在Android App中禁用 `allowMixedContent`

## 环境变量验证

在应用启动时验证必需的环境变量:

编辑 `server/_core/env.ts`:

```typescript
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'OAUTH_SERVER_URL',
  'VITE_APP_ID',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
```

## 故障排查

### 问题: 应用无法连接到后端

**检查项:**
1. 后端服务是否正常运行?
2. API基础URL是否正确?
3. 网络是否可达?(防火墙、安全组规则)
4. CORS配置是否正确?

### 问题: 认证失败

**检查项:**
1. JWT_SECRET是否一致?
2. OAUTH配置是否正确?
3. 回调URL是否包含Android App的scheme?

### 问题: 数据库连接失败

**检查项:**
1. DATABASE_URL格式是否正确?
2. 数据库服务是否运行?
3. 用户名密码是否正确?
4. 网络是否可达?
5. 数据库是否已创建?

## 部署检查清单

- [ ] 所有必需的环境变量已设置
- [ ] JWT_SECRET使用强随机字符串
- [ ] 数据库连接正常
- [ ] 后端服务可以正常启动
- [ ] API基础URL配置正确
- [ ] HTTPS证书已配置(生产环境)
- [ ] CORS配置允许Android App域名
- [ ] 防火墙规则允许必要的端口
- [ ] OAuth回调URL包含Android scheme
- [ ] 日志记录已配置
- [ ] 错误监控已配置

## 相关文档

- [Android构建指南](BUILD_ANDROID.md)
- [快速开始指南](QUICK_START_ANDROID.md)
- [Capacitor官方文档](https://capacitorjs.com/docs)
