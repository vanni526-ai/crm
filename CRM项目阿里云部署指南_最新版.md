# 课程交付CRM系统 - 阿里云部署完整指南（最新版）

**文档版本**: 2.0  
**创建日期**: 2026-02-27  
**作者**: Manus AI  
**部署域名**: crm.bdsm.com.cn

---

## 概述

本文档提供课程交付CRM系统在阿里云的完整部署方案，使用您的自有域名**crm.bdsm.com.cn**，确保前端APP团队和Web端都能正确调用后端API接口。

### 项目技术栈

- **前端**: React 19 + Vite + Tailwind CSS 4
- **后端**: Node.js 22 + Express 4 + tRPC 11
- **数据库**: MySQL 8.0 / TiDB
- **认证**: Manus OAuth + JWT
- **部署域名**: crm.bdsm.com.cn
- **API基础URL**: https://crm.bdsm.com.cn/api

---

## 一、域名和SSL证书准备

### 1.1 域名解析配置

由于您已经拥有`www.bdsm.com.cn`域名，现在需要添加子域名`crm.bdsm.com.cn`。

#### 添加DNS记录

1. 登录阿里云域名控制台：https://dns.console.aliyun.com
2. 找到域名`bdsm.com.cn`，点击"解析设置"
3. 添加A记录：
   - **记录类型**：A
   - **主机记录**：crm
   - **记录值**：ECS服务器公网IP（稍后获取）
   - **TTL**：10分钟

### 1.2 SSL证书申请

为`crm.bdsm.com.cn`申请免费SSL证书。

**申请步骤**：
1. 访问SSL证书控制台：https://yundun.console.aliyun.com/?p=cas
2. 购买免费证书（DV单域名）
3. 填写域名：`crm.bdsm.com.cn`
4. 选择验证方式：DNS验证（推荐）
5. 按照提示添加DNS TXT记录
6. 等待验证通过后下载证书（选择Nginx格式）

---

## 二、阿里云资源准备

### 2.1 服务器选购（ECS）

根据业务规模选择合适的ECS实例配置。

#### 推荐配置

| 业务规模 | CPU | 内存 | 硬盘 | 带宽 | 月费用（约） |
|---------|-----|------|------|------|------------|
| 小型（<100用户） | 2核 | 4GB | 40GB SSD | 3Mbps | ¥200-300 |
| 中型（100-500用户） | 4核 | 8GB | 100GB SSD | 5Mbps | ¥500-800 |
| 大型（>500用户） | 8核 | 16GB | 200GB SSD | 10Mbps | ¥1500-2000 |

#### 购买步骤

1. 登录阿里云ECS控制台：https://ecs.console.aliyun.com
2. 点击"创建实例"
3. **地域选择**：建议选择华东（杭州）或华南（深圳）
4. **实例规格**：选择ecs.c6.large（2核4GB）或更高
5. **镜像**：Ubuntu 22.04 64位
6. **网络配置**：
   - 选择VPC网络
   - 分配公网IP
   - 带宽选择按固定带宽（3-5Mbps）
7. **安全组配置**：开放以下端口
   - 22（SSH）
   - 80（HTTP）
   - 443（HTTPS）
   - 3000（Node.js应用，可选，仅用于调试）
8. 设置root密码
9. 确认订单并支付

**重要**：购买完成后，记录ECS服务器的**公网IP地址**，用于DNS解析。

### 2.2 数据库选购

#### 方案A：使用阿里云RDS MySQL（推荐）

**推荐配置**：
- 规格：2核4GB（rds.mysql.s2.large）
- 存储：100GB SSD
- 版本：MySQL 8.0
- 月费用：约¥500-800

**购买步骤**：
1. 访问RDS控制台：https://rdsnext.console.aliyun.com
2. 创建实例，选择MySQL 8.0
3. 选择与ECS相同的地域和可用区
4. 配置白名单：添加ECS服务器的内网IP
5. 创建数据库：`course_crm`
6. 创建账号：`crm_user`，授予`course_crm`数据库的读写权限

#### 方案B：自建MySQL（成本低）

在ECS服务器上自行安装MySQL，适合预算有限的场景。详细步骤见后文"服务器环境配置"章节。

---

## 三、更新DNS解析

### 3.1 添加A记录

在阿里云域名控制台，为`crm.bdsm.com.cn`添加A记录，指向ECS服务器公网IP。

### 3.2 验证解析

```bash
# 等待DNS生效（通常5-10分钟）
ping crm.bdsm.com.cn
```

如果返回ECS服务器IP，说明解析成功。

---

## 四、服务器环境配置

### 4.1 连接服务器

使用SSH连接到ECS服务器：

```bash
ssh root@<ECS公网IP>
```

### 4.2 安装基础软件

#### 更新系统

```bash
apt update && apt upgrade -y
```

#### 安装Node.js 22

```bash
# 安装nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# 安装Node.js 22
nvm install 22
nvm use 22
node -v  # 验证版本
```

#### 安装pnpm

```bash
npm install -g pnpm
pnpm -v  # 验证版本
```

#### 安装Git

```bash
apt install git -y
git --version
```

#### 安装Nginx

```bash
apt install nginx -y
systemctl start nginx
systemctl enable nginx
nginx -v  # 验证版本
```

#### 安装PM2（进程管理工具）

```bash
npm install -g pm2
pm2 -v  # 验证版本
```

### 4.3 安装MySQL（如果使用自建数据库）

```bash
# 安装MySQL 8.0
apt install mysql-server -y

# 启动MySQL
systemctl start mysql
systemctl enable mysql

# 安全配置
mysql_secure_installation

# 创建数据库和用户
mysql -u root -p
```

在MySQL命令行中执行：

```sql
CREATE DATABASE course_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'crm_user'@'localhost' IDENTIFIED BY '强密码';
GRANT ALL PRIVILEGES ON course_crm.* TO 'crm_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 五、代码部署

### 5.1 从GitHub克隆代码

```bash
# 创建项目目录
mkdir -p /var/www
cd /var/www

# 克隆代码（替换为您的GitHub仓库地址）
git clone https://github.com/your-username/course_crm.git
cd course_crm
```

### 5.2 配置环境变量

创建生产环境配置文件：

```bash
cp .env.example .env
nano .env
```

编辑`.env`文件，**重点配置以下变量**：

```bash
# ===== 数据库配置 =====
# 如果使用RDS，替换为RDS内网地址
DATABASE_URL=mysql://crm_user:强密码@localhost:3306/course_crm

# ===== JWT密钥 =====
JWT_SECRET=your_random_jwt_secret_here

# ===== Manus OAuth配置 =====
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# ===== 应用配置（重要！）=====
NODE_ENV=production
PORT=3000

# ⚠️ 前端APP和Web端都使用这个URL调用API
VITE_APP_URL=https://crm.bdsm.com.cn

# 应用标题和Logo
VITE_APP_TITLE=课程交付CRM系统
VITE_APP_LOGO=https://cdn.bdsm.com.cn/logo.png

# ===== 其他服务配置（根据需要添加）=====
# REDIS_URL=redis://localhost:6379
# SMTP_HOST=smtp.aliyun.com
# SMTP_PORT=465
```

**关键说明**：
- `VITE_APP_URL=https://crm.bdsm.com.cn`：这是前端APP和Web端调用API的基础URL
- 所有API请求都会发送到：`https://crm.bdsm.com.cn/api/*`
- 前端APP团队在配置时，使用这个URL作为API基础地址

### 5.3 安装依赖

```bash
pnpm install
```

### 5.4 数据库迁移

```bash
# 推送数据库schema
pnpm db:push

# 如果需要导入初始数据（从Manus或其他环境迁移）
# mysql -u crm_user -p course_crm < backup.sql
```

### 5.5 构建前端

```bash
pnpm build
```

构建完成后，静态文件会生成在`client/dist`目录。

### 5.6 启动应用

使用PM2启动Node.js应用：

```bash
pm2 start server/index.js --name course_crm
pm2 save
pm2 startup
```

验证应用是否正常运行：

```bash
pm2 status
curl http://localhost:3000/api/health
```

---

## 六、Nginx配置（重要）

### 6.1 上传SSL证书

```bash
# 创建SSL目录
mkdir -p /etc/nginx/ssl

# 上传证书文件（使用scp或直接复制粘贴）
nano /etc/nginx/ssl/crm.bdsm.com.cn.pem  # 粘贴证书内容
nano /etc/nginx/ssl/crm.bdsm.com.cn.key  # 粘贴私钥内容

# 设置权限
chmod 600 /etc/nginx/ssl/crm.bdsm.com.cn.key
```

### 6.2 创建Nginx配置文件

```bash
nano /etc/nginx/sites-available/course_crm
```

添加以下配置：

```nginx
# HTTP重定向到HTTPS
server {
    listen 80;
    server_name crm.bdsm.com.cn;
    return 301 https://$server_name$request_uri;
}

# HTTPS主配置
server {
    listen 443 ssl http2;
    server_name crm.bdsm.com.cn;

    # SSL证书配置
    ssl_certificate /etc/nginx/ssl/crm.bdsm.com.cn.pem;
    ssl_certificate_key /etc/nginx/ssl/crm.bdsm.com.cn.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 静态文件目录（前端构建产物）
    root /var/www/course_crm/client/dist;
    index index.html;

    # 日志配置
    access_log /var/log/nginx/crm_access.log;
    error_log /var/log/nginx/crm_error.log;

    # 前端路由（SPA）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ⚠️ API代理（重要！前端APP和Web端都通过这个路径调用API）
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS配置（允许前端APP跨域访问）
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
        
        # 处理OPTIONS预检请求
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

### 6.3 启用配置并重启Nginx

```bash
# 创建软链接
ln -s /etc/nginx/sites-available/course_crm /etc/nginx/sites-enabled/

# 删除默认配置（可选）
rm /etc/nginx/sites-enabled/default

# 测试配置
nginx -t

# 重启Nginx
systemctl restart nginx
```

---

## 七、前端APP接口调用配置

### 7.1 API基础URL

前端APP团队在配置时，使用以下API基础URL：

```
https://crm.bdsm.com.cn/api
```

### 7.2 接口路径示例

| 功能 | 接口路径 | 完整URL |
|------|---------|---------|
| 用户登录 | `/api/auth/login` | `https://crm.bdsm.com.cn/api/auth/login` |
| 获取用户信息 | `/api/auth/me` | `https://crm.bdsm.com.cn/api/auth/me` |
| 获取城市列表 | `/api/cities/list` | `https://crm.bdsm.com.cn/api/cities/list` |
| 获取老师列表 | `/api/teachers/list` | `https://crm.bdsm.com.cn/api/teachers/list` |
| 获取课程列表 | `/api/schedules/list` | `https://crm.bdsm.com.cn/api/schedules/list` |
| 创建订单 | `/api/orders/create` | `https://crm.bdsm.com.cn/api/orders/create` |

### 7.3 tRPC客户端配置（React Native）

如果前端APP使用tRPC客户端，配置示例：

```typescript
// lib/api-client.ts
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/routers';

// API基础URL
const API_BASE_URL = 'https://crm.bdsm.com.cn/api/trpc';

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: API_BASE_URL,
      headers: async () => {
        // 从本地存储获取token
        const token = await AsyncStorage.getItem('auth_token');
        return {
          authorization: token ? `Bearer ${token}` : '',
        };
      },
    }),
  ],
});
```

### 7.4 REST API调用示例（React Native）

如果前端APP使用REST API，配置示例：

```typescript
// lib/api.ts
const API_BASE_URL = 'https://crm.bdsm.com.cn/api';

export async function fetchTeacherList() {
  const response = await fetch(`${API_BASE_URL}/teachers/list`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch teachers');
  }
  
  return response.json();
}
```

### 7.5 CORS配置说明

Nginx配置中已经添加了CORS头，允许前端APP跨域访问：

```nginx
add_header 'Access-Control-Allow-Origin' '*' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
```

这意味着前端APP可以直接调用`https://crm.bdsm.com.cn/api/*`，无需担心跨域问题。

---

## 八、数据迁移

### 8.1 从Manus导出数据

如果您的CRM系统当前部署在Manus平台，需要先导出数据。

#### 方法A：使用Manus Database面板导出

1. 登录Manus项目管理界面
2. 进入Database面板
3. 使用"Export"功能导出SQL文件

#### 方法B：使用MySQL客户端导出

获取Manus数据库连接信息（在Database面板的Settings中），然后使用mysqldump导出：

```bash
mysqldump -h <manus_db_host> -P <port> -u <username> -p <database_name> > backup.sql
```

### 8.2 导入数据到阿里云

```bash
# 上传备份文件到服务器
scp backup.sql root@<ECS公网IP>:/tmp/

# SSH连接到服务器
ssh root@<ECS公网IP>

# 导入数据
mysql -u crm_user -p course_crm < /tmp/backup.sql
```

### 8.3 验证数据

```bash
mysql -u crm_user -p course_crm
```

在MySQL命令行中检查数据：

```sql
SHOW TABLES;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM teachers;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM schedules;
-- 检查其他表
```

---

## 九、更新Manus OAuth回调URL

如果您的应用使用Manus OAuth，需要在Manus平台更新回调URL。

### 9.1 更新步骤

1. 登录Manus开发者平台：https://portal.manus.im
2. 找到您的应用（App ID在`.env`文件的`VITE_APP_ID`中）
3. 进入应用设置
4. 更新OAuth回调URL为：`https://crm.bdsm.com.cn/api/oauth/callback`
5. 保存设置

### 9.2 验证OAuth登录

访问`https://crm.bdsm.com.cn`，点击登录按钮，测试OAuth登录流程是否正常。

---

## 十、测试验证

### 10.1 Web端测试

1. 访问：`https://crm.bdsm.com.cn`
2. 测试登录功能
3. 测试各个页面和功能模块
4. 检查浏览器控制台是否有错误

### 10.2 API接口测试

使用curl测试API接口：

```bash
# 测试健康检查
curl https://crm.bdsm.com.cn/api/health

# 测试城市列表接口
curl https://crm.bdsm.com.cn/api/cities/list

# 测试老师列表接口
curl https://crm.bdsm.com.cn/api/teachers/list
```

### 10.3 前端APP测试

前端APP团队配置API基础URL为`https://crm.bdsm.com.cn/api`后，测试以下功能：

1. 登录/注册
2. 获取城市列表
3. 获取老师列表
4. 获取课程列表
5. 创建订单
6. 查看订单详情

### 10.4 性能测试

使用浏览器开发者工具或在线工具测试：

- 首页加载速度
- API响应时间
- 静态资源加载速度
- HTTPS证书有效性

---

## 十一、监控和日志

### 11.1 PM2监控

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs course_crm

# 查看详细信息
pm2 show course_crm

# 重启应用
pm2 restart course_crm
```

### 11.2 Nginx日志

```bash
# 访问日志
tail -f /var/log/nginx/crm_access.log

# 错误日志
tail -f /var/log/nginx/crm_error.log
```

### 11.3 配置阿里云监控告警

1. 登录阿里云云监控控制台：https://cloudmonitor.console.aliyun.com
2. 添加ECS监控
3. 配置告警规则：
   - CPU使用率 > 80%
   - 内存使用率 > 80%
   - 磁盘使用率 > 80%
   - 网络流量异常

---

## 十二、备份策略

### 12.1 数据库自动备份

创建备份脚本：

```bash
nano /root/backup_db.sh
```

添加以下内容：

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="course_crm"
DB_USER="crm_user"
DB_PASS="强密码"

mkdir -p $BACKUP_DIR
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${DB_NAME}_${DATE}.sql.gz"
```

设置权限并添加定时任务：

```bash
chmod +x /root/backup_db.sh

# 添加cron任务（每天凌晨2点执行）
crontab -e
```

添加以下行：

```
0 2 * * * /root/backup_db.sh >> /var/log/backup.log 2>&1
```

### 12.2 使用阿里云OSS存储备份

安装阿里云OSS工具：

```bash
wget http://gosspublic.alicdn.com/ossutil/1.7.15/ossutil64
chmod 755 ossutil64
mv ossutil64 /usr/local/bin/ossutil
ossutil config
```

修改备份脚本，添加OSS上传：

```bash
# 在backup_db.sh末尾添加
ossutil cp $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz oss://your-bucket/backups/
```

---

## 十三、安全加固

### 13.1 配置防火墙

```bash
# 安装ufw
apt install ufw -y

# 允许SSH、HTTP、HTTPS
ufw allow 22
ufw allow 80
ufw allow 443

# 启用防火墙
ufw enable
ufw status
```

### 13.2 禁用root SSH登录

```bash
# 创建普通用户
adduser deploy
usermod -aG sudo deploy

# 配置SSH
nano /etc/ssh/sshd_config
```

修改以下配置：

```
PermitRootLogin no
PasswordAuthentication no  # 强制使用SSH密钥
```

重启SSH服务：

```bash
systemctl restart sshd
```

### 13.3 配置fail2ban

```bash
# 安装fail2ban
apt install fail2ban -y

# 启动服务
systemctl start fail2ban
systemctl enable fail2ban
```

---

## 十四、性能优化

### 14.1 启用HTTP/2

Nginx配置中已启用HTTP/2（`listen 443 ssl http2`）。

### 14.2 配置Redis缓存（可选）

```bash
# 安装Redis
apt install redis-server -y
systemctl start redis
systemctl enable redis

# 在.env文件中添加
echo "REDIS_URL=redis://localhost:6379" >> /var/www/course_crm/.env

# 重启应用
pm2 restart course_crm
```

### 14.3 CDN加速（可选）

使用阿里云CDN加速静态资源：

1. 登录CDN控制台：https://cdn.console.aliyun.com
2. 添加加速域名（如cdn.bdsm.com.cn）
3. 配置源站为`crm.bdsm.com.cn`
4. 配置缓存规则
5. 更新前端代码中的静态资源URL

---

## 十五、故障排查

### 15.1 应用无法启动

```bash
# 查看PM2日志
pm2 logs course_crm --lines 100

# 检查端口占用
netstat -tulnp | grep 3000

# 检查环境变量
cat /var/www/course_crm/.env
```

### 15.2 数据库连接失败

```bash
# 测试数据库连接
mysql -u crm_user -p -h localhost course_crm

# 检查MySQL状态
systemctl status mysql

# 查看MySQL错误日志
tail -f /var/log/mysql/error.log
```

### 15.3 Nginx 502错误

```bash
# 检查Node.js应用是否运行
pm2 status

# 检查Nginx错误日志
tail -f /var/log/nginx/crm_error.log

# 测试后端API
curl http://localhost:3000/api/health
```

### 15.4 SSL证书问题

```bash
# 验证证书
openssl x509 -in /etc/nginx/ssl/crm.bdsm.com.cn.pem -text -noout

# 测试HTTPS
curl -I https://crm.bdsm.com.cn

# 在线测试SSL配置
# 访问：https://www.ssllabs.com/ssltest/
```

### 15.5 前端APP无法调用API

**可能原因**：
1. API基础URL配置错误
2. CORS配置问题
3. 网络防火墙阻止
4. SSL证书问题

**排查步骤**：
```bash
# 1. 测试API是否可访问
curl https://crm.bdsm.com.cn/api/health

# 2. 检查Nginx CORS配置
grep -A 5 "Access-Control-Allow-Origin" /etc/nginx/sites-available/course_crm

# 3. 检查防火墙规则
ufw status

# 4. 查看Nginx错误日志
tail -f /var/log/nginx/crm_error.log
```

---

## 十六、持续部署（CI/CD）

### 16.1 配置GitHub Actions

在项目根目录创建`.github/workflows/deploy.yml`：

```yaml
name: Deploy to Aliyun

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /var/www/course_crm
          git pull origin main
          pnpm install
          pnpm build
          pnpm db:push
          pm2 restart course_crm
          systemctl reload nginx
```

### 16.2 配置GitHub Secrets

在GitHub仓库设置中添加以下Secrets：
- `SERVER_HOST`: ECS服务器公网IP
- `SERVER_USER`: SSH用户名（如deploy）
- `SSH_PRIVATE_KEY`: SSH私钥内容

---

## 十七、成本估算

### 17.1 月度成本（中型配置）

| 项目 | 配置 | 月费用 |
|------|------|--------|
| ECS服务器 | 4核8GB | ¥500 |
| RDS MySQL | 2核4GB | ¥600 |
| 带宽 | 5Mbps | ¥150 |
| SSL证书 | 免费DV | ¥0 |
| 域名 | 已有 | ¥0 |
| **总计** | - | **¥1250/月** |

### 17.2 成本优化建议

1. 使用包年付费，享受折扣（通常7-8折）
2. 使用自建MySQL代替RDS（节省¥600/月）
3. 使用CDN减少带宽费用
4. 使用预留实例或节省计划

---

## 十八、前端APP开发团队配置清单

### 18.1 API配置信息

| 配置项 | 值 |
|--------|-----|
| API基础URL | `https://crm.bdsm.com.cn/api` |
| tRPC端点 | `https://crm.bdsm.com.cn/api/trpc` |
| OAuth回调URL | `https://crm.bdsm.com.cn/api/oauth/callback` |
| WebSocket URL（如有） | `wss://crm.bdsm.com.cn/api/ws` |

### 18.2 环境变量配置

前端APP的`.env`文件配置：

```bash
# API基础URL
API_BASE_URL=https://crm.bdsm.com.cn/api

# Manus OAuth（如果使用）
OAUTH_CLIENT_ID=your_app_id
OAUTH_REDIRECT_URI=your_app_callback_url
```

### 18.3 网络请求配置

确保前端APP的网络请求库配置正确：

```typescript
// axios示例
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://crm.bdsm.com.cn/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器（添加token）
api.interceptors.request.use((config) => {
  const token = getToken(); // 从本地存储获取
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 18.4 测试接口清单

前端APP团队可以使用以下接口进行测试：

```bash
# 健康检查
curl https://crm.bdsm.com.cn/api/health

# 获取城市列表（公开接口）
curl https://crm.bdsm.com.cn/api/cities/list

# 获取老师列表（公开接口）
curl https://crm.bdsm.com.cn/api/teachers/list

# 获取用户信息（需要token）
curl -H "Authorization: Bearer YOUR_TOKEN" https://crm.bdsm.com.cn/api/auth/me
```

---

## 十九、常见问题

### Q1: 前端APP调用API时出现CORS错误怎么办？

**A**: 检查以下几点：
1. Nginx配置中的CORS头是否正确
2. API请求的URL是否正确（必须是`https://crm.bdsm.com.cn/api/*`）
3. 如果是OPTIONS预检请求失败，检查Nginx配置中的OPTIONS处理

### Q2: SSL证书过期怎么办？

**A**: 阿里云免费证书有效期1年，到期前需要重新申请。建议设置日历提醒，提前30天续期。

### Q3: 如何从Manus迁移到阿里云？

**A**: 按照以下步骤操作：
1. 在Manus导出数据库备份
2. 在阿里云完成服务器和数据库配置
3. 部署代码并导入数据
4. 更新DNS解析到阿里云服务器
5. 测试验证所有功能正常
6. 通知前端APP团队更新API基础URL

### Q4: 如何实现高可用？

**A**: 可以使用以下方案：
- 使用阿里云SLB（负载均衡）+ 多台ECS
- 使用RDS主备实例
- 使用Redis集群
- 配置CDN加速

### Q5: 数据库连接数不够怎么办？

**A**: 
1. 检查应用代码是否正确关闭数据库连接
2. 增加MySQL的max_connections配置
3. 使用连接池优化连接管理
4. 升级RDS规格

---

## 二十、部署检查清单

在部署完成后，使用以下清单进行最终检查：

### 20.1 基础设施

- [ ] ECS服务器已购买并运行
- [ ] RDS数据库已创建（或自建MySQL已安装）
- [ ] 域名`crm.bdsm.com.cn`已解析到ECS公网IP
- [ ] SSL证书已申请并上传到服务器

### 20.2 服务器环境

- [ ] Node.js 22已安装
- [ ] pnpm已安装
- [ ] Nginx已安装并运行
- [ ] PM2已安装
- [ ] MySQL已安装并运行（如果自建）

### 20.3 代码部署

- [ ] 代码已从GitHub克隆到`/var/www/course_crm`
- [ ] `.env`文件已配置，特别是`VITE_APP_URL=https://crm.bdsm.com.cn`
- [ ] 依赖已安装（`pnpm install`）
- [ ] 数据库schema已推送（`pnpm db:push`）
- [ ] 前端已构建（`pnpm build`）
- [ ] 应用已启动（`pm2 start`）

### 20.4 Nginx配置

- [ ] Nginx配置文件已创建
- [ ] SSL证书路径正确
- [ ] API代理配置正确（`/api`路径）
- [ ] CORS头已添加
- [ ] Nginx配置测试通过（`nginx -t`）
- [ ] Nginx已重启

### 20.5 功能测试

- [ ] Web端可以访问`https://crm.bdsm.com.cn`
- [ ] HTTPS证书有效
- [ ] 登录功能正常
- [ ] API接口可以正常调用
- [ ] 前端APP可以调用API（由前端团队测试）

### 20.6 监控和备份

- [ ] PM2监控正常
- [ ] Nginx日志可以查看
- [ ] 阿里云监控告警已配置
- [ ] 数据库自动备份脚本已配置

---

## 附录A：快速部署脚本

创建一键部署脚本`deploy.sh`：

```bash
#!/bin/bash

echo "========================================="
echo "课程交付CRM系统 - 阿里云部署脚本"
echo "域名: crm.bdsm.com.cn"
echo "========================================="

# 更新代码
echo "[1/6] 更新代码..."
cd /var/www/course_crm
git pull origin main

# 安装依赖
echo "[2/6] 安装依赖..."
pnpm install

# 数据库迁移
echo "[3/6] 数据库迁移..."
pnpm db:push

# 构建前端
echo "[4/6] 构建前端..."
pnpm build

# 重启应用
echo "[5/6] 重启应用..."
pm2 restart course_crm

# 重启Nginx
echo "[6/6] 重启Nginx..."
systemctl reload nginx

echo "========================================="
echo "部署完成！"
echo "Web端: https://crm.bdsm.com.cn"
echo "API端点: https://crm.bdsm.com.cn/api"
echo "========================================="
```

使用方法：

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 附录B：环境变量完整模板

`.env.production`完整模板：

```bash
# ===== 数据库配置 =====
DATABASE_URL=mysql://crm_user:PASSWORD@localhost:3306/course_crm

# ===== JWT配置 =====
JWT_SECRET=your_random_jwt_secret_here

# ===== Manus OAuth配置 =====
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OWNER_OPEN_ID=your_owner_open_id
OWNER_NAME=your_owner_name

# ===== 应用配置 =====
NODE_ENV=production
PORT=3000

# ⚠️ 重要：前端APP和Web端都使用这个URL
VITE_APP_URL=https://crm.bdsm.com.cn

# 应用信息
VITE_APP_TITLE=课程交付CRM系统
VITE_APP_LOGO=https://cdn.bdsm.com.cn/logo.png
VITE_APP_ID=your_app_id

# ===== Manus内置服务配置 =====
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your_forge_api_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your_frontend_forge_api_key

# ===== 分析统计（可选）=====
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your_website_id

# ===== Redis配置（可选）=====
# REDIS_URL=redis://localhost:6379

# ===== SMTP配置（可选）=====
# SMTP_HOST=smtp.aliyun.com
# SMTP_PORT=465
# SMTP_USER=noreply@bdsm.com.cn
# SMTP_PASS=your_smtp_password

# ===== 其他第三方服务（根据需要添加）=====
# WECHAT_PAY_MERCHANT_ID=your_merchant_id
# WECHAT_PAY_API_KEY=your_api_key
# ALIPAY_APP_ID=your_app_id
# ALIPAY_PRIVATE_KEY=your_private_key
```

---

## 结语

本文档提供了课程交付CRM系统在阿里云的完整部署方案，使用您的自有域名**crm.bdsm.com.cn**。前端APP团队在配置时，使用`https://crm.bdsm.com.cn/api`作为API基础URL即可。

如果在部署过程中遇到问题，请参考故障排查章节或联系技术支持。

祝您部署顺利！

---

**文档版本**: 2.0  
**最后更新**: 2026-02-27  
**作者**: Manus AI  
**部署域名**: crm.bdsm.com.cn
