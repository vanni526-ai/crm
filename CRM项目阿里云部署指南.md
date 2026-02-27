# 课程交付CRM系统 - 阿里云部署完整指南

**文档版本**: 1.0  
**创建日期**: 2026-02-27  
**作者**: Manus AI

---

## 概述

本文档提供课程交付CRM系统在阿里云的完整部署方案，包括服务器选购、环境配置、代码部署、数据库迁移、域名配置、SSL证书、监控告警等全流程指导。

### 项目技术栈

- **前端**: React 19 + Vite + Tailwind CSS 4
- **后端**: Node.js 22 + Express 4 + tRPC 11
- **数据库**: MySQL 8.0 / TiDB
- **认证**: Manus OAuth + JWT
- **部署方式**: Docker容器化部署（推荐）或传统部署

---

## 一、阿里云资源准备

### 1.1 服务器选购（ECS）

根据业务规模选择合适的ECS实例配置。

#### 推荐配置

| 业务规模 | CPU | 内存 | 硬盘 | 带宽 | 月费用（约） |
|---------|-----|------|------|------|------------|
| 小型（<100用户） | 2核 | 4GB | 40GB SSD | 3Mbps | ¥200-300 |
| 中型（100-500用户） | 4核 | 8GB | 100GB SSD | 5Mbps | ¥500-800 |
| 大型（>500用户） | 8核 | 16GB | 200GB SSD | 10Mbps | ¥1500-2000 |

#### 操作系统选择

推荐使用 **Ubuntu 22.04 LTS** 或 **CentOS 8 Stream**，本文档以Ubuntu 22.04为例。

#### 购买步骤

1. 登录阿里云控制台：https://ecs.console.aliyun.com
2. 点击"创建实例"
3. 选择地域（建议选择距离用户最近的地域，如华东、华南）
4. 选择实例规格（如ecs.c6.large：2核4GB）
5. 选择镜像：Ubuntu 22.04 64位
6. 配置网络和安全组（开放22、80、443、3000端口）
7. 设置root密码
8. 确认订单并支付

### 1.2 数据库选购

#### 方案A：使用阿里云RDS MySQL（推荐）

RDS提供自动备份、高可用、监控告警等企业级功能，适合生产环境。

**推荐配置**：
- 规格：2核4GB（rds.mysql.s2.large）
- 存储：100GB SSD
- 版本：MySQL 8.0
- 月费用：约¥500-800

**购买步骤**：
1. 访问RDS控制台：https://rdsnext.console.aliyun.com
2. 创建实例，选择MySQL 8.0
3. 配置白名单（添加ECS服务器IP）
4. 创建数据库账号和数据库

#### 方案B：自建MySQL（成本低）

在ECS服务器上自行安装MySQL，适合预算有限的场景。

**优点**：成本低，灵活性高  
**缺点**：需要自行维护，无自动备份和高可用

### 1.3 域名和SSL证书

#### 域名购买

1. 访问阿里云域名服务：https://wanwang.aliyun.com
2. 搜索并购买域名（如crm.yingji.com）
3. 完成实名认证和ICP备案（中国大陆服务器必须备案）

#### SSL证书申请

阿里云提供免费的DV SSL证书（单域名，有效期1年）。

**申请步骤**：
1. 访问SSL证书控制台：https://yundun.console.aliyun.com/?p=cas
2. 购买免费证书（DV单域名）
3. 填写域名信息并验证
4. 下载证书文件（Nginx格式）

---

## 二、服务器环境配置

### 2.1 连接服务器

使用SSH连接到ECS服务器：

```bash
ssh root@<服务器公网IP>
```

### 2.2 安装基础软件

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

### 2.3 安装MySQL（如果使用自建数据库）

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

## 三、代码部署

### 3.1 从GitHub克隆代码

```bash
# 创建项目目录
mkdir -p /var/www
cd /var/www

# 克隆代码（替换为您的GitHub仓库地址）
git clone https://github.com/your-username/course_crm.git
cd course_crm
```

### 3.2 配置环境变量

创建生产环境配置文件：

```bash
cp .env.example .env
nano .env
```

编辑`.env`文件，配置以下关键变量：

```bash
# 数据库配置
DATABASE_URL=mysql://crm_user:强密码@localhost:3306/course_crm

# JWT密钥（生成随机字符串）
JWT_SECRET=your_random_jwt_secret_here

# Manus OAuth配置
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# 前端URL
VITE_APP_URL=https://crm.yingji.com

# 其他配置
NODE_ENV=production
PORT=3000
```

### 3.3 安装依赖

```bash
pnpm install
```

### 3.4 数据库迁移

```bash
# 推送数据库schema
pnpm db:push

# 如果需要导入初始数据
# mysql -u crm_user -p course_crm < backup.sql
```

### 3.5 构建前端

```bash
pnpm build
```

构建完成后，静态文件会生成在`client/dist`目录。

### 3.6 启动应用

使用PM2启动Node.js应用：

```bash
pm2 start server/index.js --name course_crm
pm2 save
pm2 startup
```

验证应用是否正常运行：

```bash
pm2 status
curl http://localhost:3000
```

---

## 四、Nginx配置

### 4.1 创建Nginx配置文件

```bash
nano /etc/nginx/sites-available/course_crm
```

添加以下配置：

```nginx
server {
    listen 80;
    server_name crm.yingji.com;

    # 重定向HTTP到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name crm.yingji.com;

    # SSL证书配置
    ssl_certificate /etc/nginx/ssl/crm.yingji.com.pem;
    ssl_certificate_key /etc/nginx/ssl/crm.yingji.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 静态文件目录
    root /var/www/course_crm/client/dist;
    index index.html;

    # 前端路由（SPA）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理
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
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 4.2 上传SSL证书

```bash
# 创建SSL目录
mkdir -p /etc/nginx/ssl

# 上传证书文件（使用scp或直接复制粘贴）
nano /etc/nginx/ssl/crm.yingji.com.pem  # 粘贴证书内容
nano /etc/nginx/ssl/crm.yingji.com.key  # 粘贴私钥内容

# 设置权限
chmod 600 /etc/nginx/ssl/crm.yingji.com.key
```

### 4.3 启用配置并重启Nginx

```bash
# 创建软链接
ln -s /etc/nginx/sites-available/course_crm /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启Nginx
systemctl restart nginx
```

---

## 五、域名解析配置

### 5.1 添加DNS记录

1. 登录阿里云域名控制台
2. 找到您的域名，点击"解析"
3. 添加A记录：
   - 记录类型：A
   - 主机记录：crm（或@表示根域名）
   - 记录值：ECS服务器公网IP
   - TTL：10分钟

### 5.2 验证解析

```bash
# 等待DNS生效（通常5-10分钟）
ping crm.yingji.com
```

---

## 六、数据迁移

### 6.1 从Manus导出数据

如果您的CRM系统当前部署在Manus平台，需要先导出数据。

#### 导出数据库

在Manus项目的Database面板中，使用SQL导出功能：

```sql
-- 导出所有表数据
SELECT * FROM users INTO OUTFILE '/tmp/users.csv' FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n';
-- 重复以上步骤导出其他表
```

或者使用Manus提供的数据库连接信息，通过MySQL客户端导出：

```bash
mysqldump -h <manus_db_host> -u <username> -p <database_name> > backup.sql
```

### 6.2 导入数据到阿里云

```bash
# 上传备份文件到服务器
scp backup.sql root@<服务器IP>:/tmp/

# 导入数据
mysql -u crm_user -p course_crm < /tmp/backup.sql
```

### 6.3 验证数据

```bash
mysql -u crm_user -p course_crm
```

在MySQL命令行中检查数据：

```sql
SHOW TABLES;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM orders;
-- 检查其他表
```

---

## 七、环境变量和密钥配置

### 7.1 Manus OAuth配置

如果您的应用使用Manus OAuth，需要在Manus平台配置回调URL。

1. 登录Manus开发者平台
2. 找到您的应用
3. 更新OAuth回调URL为：`https://crm.yingji.com/api/oauth/callback`

### 7.2 生成JWT密钥

```bash
# 生成随机密钥
openssl rand -base64 32
```

将生成的密钥复制到`.env`文件的`JWT_SECRET`变量。

### 7.3 其他API密钥

如果您的应用集成了第三方服务（如支付、短信等），需要在`.env`文件中配置相应的API密钥。

---

## 八、监控和日志

### 8.1 PM2监控

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

### 8.2 Nginx日志

```bash
# 访问日志
tail -f /var/log/nginx/access.log

# 错误日志
tail -f /var/log/nginx/error.log
```

### 8.3 配置日志轮转

创建日志轮转配置：

```bash
nano /etc/logrotate.d/course_crm
```

添加以下内容：

```
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
```

### 8.4 阿里云监控告警

1. 登录阿里云云监控控制台：https://cloudmonitor.console.aliyun.com
2. 添加ECS监控
3. 配置告警规则：
   - CPU使用率 > 80%
   - 内存使用率 > 80%
   - 磁盘使用率 > 80%
   - 网络流量异常

---

## 九、备份策略

### 9.1 数据库自动备份

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
```

设置权限并添加定时任务：

```bash
chmod +x /root/backup_db.sh

# 添加cron任务（每天凌晨2点执行）
crontab -e
```

添加以下行：

```
0 2 * * * /root/backup_db.sh
```

### 9.2 代码备份

```bash
# 备份代码目录
tar -czf /var/backups/course_crm_$(date +%Y%m%d).tar.gz /var/www/course_crm
```

### 9.3 使用阿里云OSS存储备份

安装阿里云OSS工具：

```bash
wget http://gosspublic.alicdn.com/ossutil/1.7.15/ossutil64
chmod 755 ossutil64
./ossutil64 config
```

上传备份到OSS：

```bash
./ossutil64 cp /var/backups/mysql/*.sql.gz oss://your-bucket/backups/
```

---

## 十、安全加固

### 10.1 配置防火墙

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

### 10.2 禁用root SSH登录

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

### 10.3 配置fail2ban

```bash
# 安装fail2ban
apt install fail2ban -y

# 启动服务
systemctl start fail2ban
systemctl enable fail2ban
```

### 10.4 定期更新系统

```bash
# 设置自动安全更新
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

---

## 十一、性能优化

### 11.1 启用HTTP/2

Nginx配置中已启用HTTP/2（`listen 443 ssl http2`）。

### 11.2 配置Redis缓存（可选）

```bash
# 安装Redis
apt install redis-server -y
systemctl start redis
systemctl enable redis

# 修改应用代码，集成Redis缓存
```

### 11.3 CDN加速

使用阿里云CDN加速静态资源：

1. 登录CDN控制台：https://cdn.console.aliyun.com
2. 添加加速域名（如cdn.yingji.com）
3. 配置源站为ECS服务器IP
4. 配置缓存规则
5. 更新DNS解析，将静态资源域名指向CDN

---

## 十二、故障排查

### 12.1 应用无法启动

```bash
# 查看PM2日志
pm2 logs course_crm --lines 100

# 检查端口占用
netstat -tulnp | grep 3000

# 检查环境变量
cat .env
```

### 12.2 数据库连接失败

```bash
# 测试数据库连接
mysql -u crm_user -p -h localhost course_crm

# 检查MySQL状态
systemctl status mysql

# 查看MySQL错误日志
tail -f /var/log/mysql/error.log
```

### 12.3 Nginx 502错误

```bash
# 检查Node.js应用是否运行
pm2 status

# 检查Nginx错误日志
tail -f /var/log/nginx/error.log

# 测试后端API
curl http://localhost:3000/api/health
```

### 12.4 SSL证书问题

```bash
# 验证证书
openssl x509 -in /etc/nginx/ssl/crm.yingji.com.pem -text -noout

# 测试HTTPS
curl -I https://crm.yingji.com
```

---

## 十三、持续部署（CI/CD）

### 13.1 配置GitHub Actions

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
          pm2 restart course_crm
```

### 13.2 配置GitHub Secrets

在GitHub仓库设置中添加以下Secrets：
- `SERVER_HOST`: 服务器IP
- `SERVER_USER`: SSH用户名
- `SSH_PRIVATE_KEY`: SSH私钥

---

## 十四、成本估算

### 14.1 月度成本（中型配置）

| 项目 | 配置 | 月费用 |
|------|------|--------|
| ECS服务器 | 4核8GB | ¥500 |
| RDS MySQL | 2核4GB | ¥600 |
| 带宽 | 5Mbps | ¥150 |
| SSL证书 | 免费DV | ¥0 |
| 域名 | .com | ¥70/年 ≈ ¥6/月 |
| **总计** | - | **¥1256/月** |

### 14.2 成本优化建议

1. 使用包年付费，享受折扣（通常7-8折）
2. 使用自建MySQL代替RDS（节省¥600/月）
3. 使用CDN减少带宽费用
4. 使用预留实例或节省计划

---

## 十五、常见问题

### Q1: 如何从Manus迁移到阿里云？

**A**: 按照以下步骤操作：
1. 在Manus导出数据库备份
2. 在阿里云创建ECS和RDS
3. 部署代码并导入数据
4. 更新DNS解析
5. 测试验证后切换流量

### Q2: 是否必须使用RDS？

**A**: 不是必须的。如果预算有限，可以在ECS上自建MySQL。但RDS提供自动备份、高可用等企业级功能，生产环境推荐使用RDS。

### Q3: 如何实现高可用？

**A**: 可以使用以下方案：
- 使用阿里云SLB（负载均衡）+ 多台ECS
- 使用RDS主备实例
- 使用Redis集群
- 配置CDN加速

### Q4: 如何处理大量并发？

**A**: 可以采取以下优化措施：
- 升级服务器配置
- 使用Redis缓存热点数据
- 使用CDN加速静态资源
- 优化数据库查询和索引
- 使用消息队列处理异步任务

### Q5: 备案需要多久？

**A**: 首次备案通常需要20个工作日左右。建议提前准备备案材料，避免影响上线时间。

---

## 十六、参考资源

- 阿里云ECS文档：https://help.aliyun.com/product/25365.html
- 阿里云RDS文档：https://help.aliyun.com/product/26090.html
- Nginx官方文档：https://nginx.org/en/docs/
- PM2官方文档：https://pm2.keymetrics.io/docs/
- Node.js最佳实践：https://github.com/goldbergyoni/nodebestpractices

---

## 附录A：快速部署脚本

创建一键部署脚本`deploy.sh`：

```bash
#!/bin/bash

echo "开始部署课程交付CRM系统..."

# 更新代码
cd /var/www/course_crm
git pull origin main

# 安装依赖
pnpm install

# 数据库迁移
pnpm db:push

# 构建前端
pnpm build

# 重启应用
pm2 restart course_crm

# 重启Nginx
systemctl reload nginx

echo "部署完成！"
```

使用方法：

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 附录B：环境变量模板

`.env.production`模板：

```bash
# 数据库配置
DATABASE_URL=mysql://crm_user:PASSWORD@localhost:3306/course_crm

# JWT配置
JWT_SECRET=your_random_jwt_secret_here

# Manus OAuth配置
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# 应用配置
NODE_ENV=production
PORT=3000
VITE_APP_URL=https://crm.yingji.com
VITE_APP_TITLE=课程交付CRM系统
VITE_APP_LOGO=https://cdn.yingji.com/logo.png

# 其他服务配置（根据需要添加）
# REDIS_URL=redis://localhost:6379
# SMTP_HOST=smtp.aliyun.com
# SMTP_PORT=465
# SMTP_USER=noreply@yingji.com
# SMTP_PASS=your_smtp_password
```

---

## 结语

本文档提供了课程交付CRM系统在阿里云的完整部署方案。如果在部署过程中遇到问题，请参考故障排查章节或联系技术支持。

祝您部署顺利！

---

**文档版本**: 1.0  
**最后更新**: 2026-02-27  
**作者**: Manus AI
