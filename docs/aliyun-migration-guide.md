# 课程交付CRM系统 — 阿里云迁移操作手册

> **架构方案**：轻量应用服务器（ECS）+ RDS MySQL + OSS 对象存储
> **适用版本**：checkpoint `8ce8d228`（已完成LLM清理 + OSS SDK替换）
> **预计耗时**：2–4 小时（含数据迁移）

---

## 一、整体架构

```
用户浏览器
    │  HTTPS (443)
    ▼
Nginx（ECS 80/443）
    │  反向代理 /api → 3000
    ▼
Express + tRPC（ECS 3000，PM2 守护）
    │                    │
    ▼                    ▼
RDS MySQL（内网）   OSS Bucket（头像/文件）
```

**各组件职责：**

| 组件 | 规格建议 | 用途 |
|------|---------|------|
| 轻量应用服务器 | 2核2G / CentOS 8 或 Ubuntu 22.04 | 跑 Node.js 后端 + Nginx |
| RDS MySQL | 1核1G（基础版）/ MySQL 8.0 | 存储所有业务数据 |
| OSS Bucket | 按量计费 | 头像、上传文件存储 |

---

## 二、前置准备（你需要先完成）

### 2.1 购买资源

在阿里云控制台完成以下购买（涉及付款，需你操作）：

1. **轻量应用服务器**：选 Ubuntu 22.04 镜像，开放端口 22（SSH）、80（HTTP）、443（HTTPS）
2. **RDS MySQL 8.0**：选基础版，**与 ECS 在同一地域和 VPC**（内网互通）
3. **OSS Bucket**：新建 Bucket，选与 ECS 同地域，**读写权限建议选"私有"**

### 2.2 准备 RAM 子账号权限

确保 RAM 子账号具备以下权限策略：

```
AliyunOSSFullAccess        ← 操作 OSS
AliyunECSFullAccess        ← 操作 ECS（可选，SSH 登录后不需要）
AliyunRDSFullAccess        ← 操作 RDS（可选，控制台操作后不需要）
```

### 2.3 收集连接信息（迁移前填好）

```
ECS 公网 IP：_______________
ECS SSH 用户名：root（或 ubuntu）
ECS SSH 密码/密钥：_______________

RDS 内网地址：_______________.mysql.rds.aliyuncs.com
RDS 端口：3306
RDS 数据库名：course_crm（建议）
RDS 用户名：_______________
RDS 密码：_______________

OSS Bucket 名称：_______________
OSS Region：oss-cn-_____________（如 oss-cn-hangzhou）
OSS AccessKey ID：_______________
OSS AccessKey Secret：_______________
```

---

## 三、ECS 服务器初始化

通过 SSH 登录 ECS 后，依次执行以下命令。

### 3.1 安装 Node.js 22

```bash
# 使用 NodeSource 官方源
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证
node -v   # 应显示 v22.x.x
npm -v
```

### 3.2 安装 pnpm 和 PM2

```bash
npm install -g pnpm pm2

# 设置 PM2 开机自启
pm2 startup
# 按提示执行输出的命令（通常是 sudo env PATH=... pm2 startup systemd ...）
```

### 3.3 安装 Nginx

```bash
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 3.4 安装 Git

```bash
sudo apt-get install -y git
```

---

## 四、部署应用代码

### 4.1 克隆代码（从 GitHub）

```bash
cd /home/ubuntu   # 或 /root
git clone https://github.com/你的用户名/course_crm.git
cd course_crm
```

> **注意**：如果仓库是私有的，需要先配置 SSH Key 或使用 Personal Access Token。

### 4.2 安装依赖

```bash
pnpm install --frozen-lockfile
```

### 4.3 配置环境变量

```bash
cp .env.example .env   # 如果没有 .env.example，直接创建
nano .env
```

填入以下内容（替换为你的真实值）：

```env
# 数据库（RDS 内网地址）
DATABASE_URL=mysql://用户名:密码@RDS内网地址:3306/course_crm

# JWT 密钥（随机生成，至少32位）
JWT_SECRET=请替换为随机字符串_至少32位

# 阿里云 OSS
OSS_ACCESS_KEY_ID=你的AccessKeyID
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
OSS_BUCKET=你的Bucket名称
OSS_REGION=oss-cn-hangzhou

# 应用配置
NODE_ENV=production
PORT=3000

# Manus OAuth（如果不再使用Manus登录，可留空或删除）
# VITE_APP_ID=
# OAUTH_SERVER_URL=
# VITE_OAUTH_PORTAL_URL=
```

> **安全提示**：`.env` 文件不要提交到 Git，确认 `.gitignore` 中已包含 `.env`。

### 4.4 执行数据库迁移

```bash
# 推送 Drizzle Schema 到 RDS
pnpm db:push
```

如果提示连接失败，检查：
- RDS 白名单是否添加了 ECS 的**内网 IP**
- DATABASE_URL 格式是否正确

### 4.5 构建前端

```bash
pnpm build
```

构建产物在 `dist/` 目录。

### 4.6 用 PM2 启动服务

```bash
# 启动
pm2 start dist/index.js --name course_crm

# 保存 PM2 进程列表（重启后自动恢复）
pm2 save

# 查看状态
pm2 status
pm2 logs course_crm
```

---

## 五、配置 Nginx 反向代理

### 5.1 创建 Nginx 配置文件

```bash
sudo nano /etc/nginx/sites-available/course_crm
```

粘贴以下内容（替换 `你的域名` 为实际域名，如 `crm.bdsm.com.cn`）：

```nginx
server {
    listen 80;
    server_name 你的域名;

    # 强制跳转 HTTPS（配置 SSL 后启用）
    # return 301 https://$host$request_uri;

    # 静态文件（前端构建产物）
    root /home/ubuntu/course_crm/dist/public;
    index index.html;

    # API 请求反向代理到 Node.js
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # 前端 SPA 路由（所有非 API 请求返回 index.html）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 5.2 启用配置

```bash
sudo ln -s /etc/nginx/sites-available/course_crm /etc/nginx/sites-enabled/
sudo nginx -t          # 测试配置是否正确
sudo systemctl reload nginx
```

### 5.3 配置 HTTPS（Let's Encrypt 免费证书）

```bash
sudo apt-get install -y certbot python3-certbot-nginx

# 申请证书（替换域名）
sudo certbot --nginx -d 你的域名

# 自动续期测试
sudo certbot renew --dry-run
```

Certbot 会自动修改 Nginx 配置，添加 SSL 相关指令。

---

## 六、RDS 数据库配置

### 6.1 在 RDS 控制台操作

1. **创建数据库**：在 RDS 控制台 → 数据库管理 → 创建数据库，名称填 `course_crm`，字符集选 `utf8mb4`
2. **创建账号**：创建一个普通账号，赋予 `course_crm` 数据库的读写权限
3. **白名单配置**：在 RDS → 白名单设置 → 添加 ECS 的**内网 IP 地址**（不是公网 IP）

### 6.2 迁移现有数据（如有）

如果 Manus 平台上已有生产数据需要迁移：

```bash
# 在本地（Manus 沙箱）导出数据
# 注意：需要先获取 Manus 数据库连接信息

# 在 ECS 上导入
mysql -h RDS内网地址 -u 用户名 -p course_crm < backup.sql
```

> **建议**：先用 `pnpm db:push` 建好表结构，再导入数据，避免 Schema 冲突。

---

## 七、OSS 配置

### 7.1 在 OSS 控制台操作

1. **创建 Bucket**：选与 ECS 同地域，读写权限选**私有**（通过预签名 URL 访问）
2. **配置跨域（CORS）**：
   - 来源：`https://你的域名`
   - 允许方法：GET、POST、PUT、DELETE、HEAD
   - 允许 Headers：`*`
3. **上传默认头像**：将 `client/public/avatars/` 下的两个文件上传到 OSS，路径建议 `avatars/default-avatar.png` 和 `avatars/default-teacher-avatar.png`

### 7.2 更新代码中的默认头像路径（可选）

上传到 OSS 后，将 `server/db.ts`、`client/src/components/AvatarEditDialog.tsx`、`client/src/pages/Teachers.tsx` 中的 `/avatars/default-*.png` 替换为 OSS 的访问 URL。

---

## 八、域名配置

### 8.1 DNS 解析

在域名控制台（阿里云万网或其他）添加 A 记录：

| 主机记录 | 记录类型 | 记录值 |
|---------|---------|-------|
| crm（或 @） | A | ECS 公网 IP |

### 8.2 验证

```bash
# DNS 解析生效后（通常5-30分钟）
curl -I http://你的域名
# 应返回 200 或 301
```

---

## 九、上线后验证清单

| 检查项 | 验证方法 | 预期结果 |
|--------|---------|---------|
| 首页加载 | 浏览器访问域名 | 正常显示登录页 |
| 登录功能 | 用管理员账号登录 | 登录成功，跳转首页 |
| 订单管理 | 创建一条测试订单 | 数据写入 RDS |
| 文件上传 | 上传老师头像 | 图片显示正常（OSS） |
| HTTPS | 浏览器地址栏 | 显示绿色锁 |
| PM2 状态 | `pm2 status` | course_crm 为 online |
| Nginx 状态 | `systemctl status nginx` | active (running) |

---

## 十、常用运维命令

```bash
# 查看应用日志
pm2 logs course_crm --lines 100

# 重启应用（代码更新后）
pm2 restart course_crm

# 拉取最新代码并重新部署
cd /home/ubuntu/course_crm
git pull
pnpm install --frozen-lockfile
pnpm build
pm2 restart course_crm

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 查看系统资源
htop
df -h    # 磁盘
free -h  # 内存
```

---

## 十一、迁移顺序建议

按以下顺序执行，每步完成后再进行下一步：

```
1. 购买 ECS + RDS + OSS（你操作）
2. 提供连接信息给我（RAM Key、ECS IP、RDS 地址）
3. 我：初始化 ECS 环境（Node/PM2/Nginx）
4. 我：部署代码 + 配置 .env
5. 我：执行 pnpm db:push 建表
6. 我：配置 Nginx + 启动 PM2
7. 你：在 RDS 控制台配置白名单
8. 你：在 OSS 控制台配置 CORS
9. 我：申请 SSL 证书
10. 你：配置 DNS 解析
11. 共同验证上线
```

---

*文档生成时间：2026-02-28 | 对应代码版本：8ce8d228*
