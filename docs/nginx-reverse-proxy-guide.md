# Nginx反向代理配置指南

## 问题背景

**问题描述**：后端开发服务器使用动态端口检测机制，当3000端口被占用时会自动切换到3001、3002等端口。这导致前端App无法稳定连接后端API。

**根本原因**：
1. 后端代码中的`findAvailablePort`函数会自动寻找可用端口
2. 每次重启服务器时，如果3000端口被占用，端口号会发生变化
3. 前端App配置的API地址是固定的，无法自动适配端口变化

## 解决方案

使用**Nginx反向代理**，前端App始终访问固定的80端口，Nginx负责将请求转发到后端实际运行的端口。

### 方案优势

- ✅ **前端配置简单**：前端App只需配置固定的80端口
- ✅ **后端灵活性**：后端可以在任意端口运行，Nginx自动转发
- ✅ **生产环境兼容**：与生产环境的部署方式一致
- ✅ **支持高级功能**：负载均衡、SSL终止、缓存等

---

## 配置步骤

### 1. 安装Nginx

```bash
sudo apt-get update
sudo apt-get install -y nginx
```

### 2. 创建Nginx配置文件

配置文件位置：`/home/ubuntu/course_crm/nginx.conf`

```nginx
server {
    listen 80;
    server_name localhost;

    # 客户端最大请求体大小（支持文件上传）
    client_max_body_size 50M;

    # 代理超时设置
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # WebSocket支持（用于Vite HMR热更新）
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 禁用缓存，确保实时更新
        proxy_buffering off;
        proxy_cache off;
    }

    # API路由（tRPC）
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 支持大文件上传
        proxy_request_buffering off;
    }

    # 健康检查端点
    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
}
```

### 3. 启用配置并启动Nginx

```bash
# 删除默认配置
sudo rm -f /etc/nginx/sites-enabled/default

# 链接项目配置
sudo ln -sf /home/ubuntu/course_crm/nginx.conf /etc/nginx/sites-enabled/course_crm

# 测试配置语法
sudo nginx -t

# 启动Nginx
sudo systemctl start nginx

# 设置开机自启
sudo systemctl enable nginx
```

### 4. 验证配置

```bash
# 测试健康检查
curl http://localhost:80/health

# 测试API代理
curl http://localhost:80/api/trpc/auth.me

# 检查端口监听
netstat -tlnp | grep -E ':(80|3000)'
```

---

## 前端App配置

### API Base URL配置

前端App应该配置API地址为：

```typescript
// 开发环境
const API_BASE_URL = 'http://localhost:80';

// 生产环境（Manus沙盒）
const API_BASE_URL = 'https://80-{sandbox-id}.manus.computer';
```

### 示例代码

```typescript
import { CRMApiClient } from './crm-api-sdk';

const client = new CRMApiClient({
  baseURL: process.env.NODE_ENV === 'production'
    ? 'https://80-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer'
    : 'http://localhost:80',
  token: localStorage.getItem('auth_token')
});
```

---

## 常见问题

### Q1：如果后端端口从3000变成3001怎么办？

**A**：需要手动修改`nginx.conf`中的`proxy_pass`地址，然后重新加载Nginx：

```bash
# 编辑配置文件
sudo vim /home/ubuntu/course_crm/nginx.conf

# 修改 proxy_pass http://localhost:3000; 为 proxy_pass http://localhost:3001;

# 重新加载配置
sudo nginx -s reload
```

**更好的方案**：使用环境变量动态配置后端端口（需要Nginx Plus或OpenResty）。

### Q2：Nginx启动失败怎么办？

**A**：检查以下几点：

1. **端口冲突**：80端口是否被其他进程占用
   ```bash
   sudo netstat -tlnp | grep :80
   sudo lsof -i :80
   ```

2. **配置语法错误**：
   ```bash
   sudo nginx -t
   ```

3. **查看错误日志**：
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

### Q3：WebSocket连接失败怎么办？

**A**：确认Nginx配置中包含以下WebSocket支持：

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### Q4：如何查看Nginx访问日志？

**A**：

```bash
# 访问日志
sudo tail -f /var/log/nginx/access.log

# 错误日志
sudo tail -f /var/log/nginx/error.log
```

### Q5：如何重启Nginx？

**A**：

```bash
# 重新加载配置（不中断服务）
sudo nginx -s reload

# 完全重启
sudo systemctl restart nginx

# 停止服务
sudo systemctl stop nginx

# 启动服务
sudo systemctl start nginx
```

---

## 生产环境部署

在生产环境中，建议使用以下配置：

### 1. 启用HTTPS

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 其他配置同上...
}

# HTTP重定向到HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 2. 启用Gzip压缩

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```

### 3. 启用缓存

```nginx
# 静态资源缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 4. 安全加固

```nginx
# 隐藏Nginx版本号
server_tokens off;

# 防止点击劫持
add_header X-Frame-Options "SAMEORIGIN" always;

# XSS保护
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;

# CSP策略
add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
```

---

## 监控和维护

### 性能监控

```bash
# 查看Nginx状态
sudo systemctl status nginx

# 查看连接数
sudo netstat -an | grep :80 | wc -l

# 查看进程资源占用
ps aux | grep nginx
```

### 日志轮转

Nginx默认已配置日志轮转（logrotate），日志文件会自动压缩归档。

配置文件位置：`/etc/logrotate.d/nginx`

---

## 总结

通过Nginx反向代理，我们成功解决了后端端口不一致的问题：

- ✅ 前端App始终访问固定的80端口
- ✅ 后端可以在任意端口运行（3000、3001等）
- ✅ 支持WebSocket（Vite HMR热更新）
- ✅ 支持大文件上传（50MB）
- ✅ 生产环境兼容

**前端App API配置**：
- 开发环境：`http://localhost:80`
- 生产环境：`https://80-{sandbox-id}.manus.computer`

**后端无需修改**，继续在3000+端口运行即可。
