# 前端App跨沙盒API对接完整解决方案

**版本**: 1.0  
**日期**: 2026-02-03  
**适用场景**: 前端课程预约App在新沙盒中对接course_crm后端API

---

## 📋 问题描述

每次将前端App项目导入新的Manus沙盒后,会遇到以下API对接问题:

1. **端口错误** - 后端端口可能不同
2. **域名错误** - 每个沙盒的域名都不同(如`3000-xxx.sg1.manus.computer`)
3. **CORS跨域失败** - 后端CORS配置的白名单域名失效
4. **格式错误** - API响应格式不一致
5. **字段命名问题** - 字段名称不匹配

## 🎯 根本原因

**前端和后端分离在不同沙盒**,每次新沙盒的域名都会变化,导致硬编码的API地址失效。

---

## 💡 三种解决方案对比

| 方案 | 优点 | 缺点 | 推荐指数 | 适用场景 |
|------|------|------|----------|----------|
| **方案1: 使用Manus发布的固定域名** | 一次配置永久有效<br>生产环境可用<br>性能稳定<br>支持自定义域名 | 需要发布项目 | ⭐⭐⭐⭐⭐ | **生产环境和开发环境** |
| **方案2: 使用环境变量动态配置** | 灵活性高<br>支持多环境<br>不需要修改代码 | 每次需要配置环境变量 | ⭐⭐⭐⭐ | 多环境部署 |
| **方案3: 前端实现API代理** | 避免CORS问题<br>使用相对路径 | 每次需要修改配置<br>只适用于开发环境 | ⭐⭐⭐ | 仅开发环境 |

---

## 🏆 方案1: 使用Manus发布的固定域名 (最推荐)

### 原理

将course_crm后端发布到Manus平台,获得一个**永久不变的固定域名**,前端配置这个固定域名作为API地址。

### 操作步骤

#### 步骤1: 发布course_crm后端项目

1. 打开course_crm项目
2. 点击右上角的"Publish"按钮
3. 等待发布完成
4. 获得固定域名(如`https://your-app.manus.space`)

#### 步骤2: 配置后端CORS

在`server/_core/index.ts`中配置CORS,允许所有Manus沙盒域名:

```typescript
app.use(cors({
  origin: function (origin, callback) {
    // 允许所有 manus.computer 域名
    if (!origin || origin.match(/\.manus\.computer$/) || origin.match(/\.manus\.space$/)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

#### 步骤3: 配置前端API地址

在前端项目中创建`src/config/api.js`:

```javascript
// src/config/api.js
export const API_CONFIG = {
  // 生产环境使用固定域名
  BASE_URL: 'https://your-app.manus.space/api/trpc',
  
  // 如果需要支持开发环境,可以使用环境变量
  // BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://your-app.manus.space/api/trpc',
};
```

#### 步骤4: 在前端代码中使用

```javascript
// src/services/api.js
import { API_CONFIG } from '../config/api';

export async function login(username, password) {
  const response = await fetch(`${API_CONFIG.BASE_URL}/auth.login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      json: { username, password }
    }),
  });
  return response.json();
}
```

### 优点

✅ **一劳永逸** - 发布一次,永久有效,无需每次修改  
✅ **生产可用** - 可以直接用于生产环境  
✅ **性能稳定** - Manus平台提供CDN加速  
✅ **支持自定义域名** - 可以绑定自己的域名(如`api.yourdomain.com`)  
✅ **无需修改前端代码** - 前端代码中只需配置一次固定域名

### 注意事项

1. **发布后域名不变** - 即使重新发布,域名也保持不变
2. **数据库持久化** - 发布的项目使用持久化数据库,数据不会丢失
3. **自动SSL证书** - Manus自动提供HTTPS证书

---

## 🔧 方案2: 使用环境变量动态配置

### 原理

前端使用环境变量配置API地址,每次部署时通过`.env`文件注入不同的API地址。

### 操作步骤

#### 步骤1: 创建环境变量配置文件

在前端项目根目录创建`.env`文件:

```bash
# .env (开发环境)
VITE_API_BASE_URL=https://3000-xxx.sg1.manus.computer/api/trpc
```

```bash
# .env.production (生产环境)
VITE_API_BASE_URL=https://your-app.manus.space/api/trpc
```

#### 步骤2: 在前端代码中使用环境变量

```javascript
// src/config/api.js
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/trpc',
};
```

#### 步骤3: 配置后端CORS

同方案1,配置CORS允许所有`*.manus.computer`域名。

### 优点

✅ **灵活性高** - 可以为不同环境配置不同的API地址  
✅ **支持多环境** - 开发/测试/生产环境可以使用不同的后端  
✅ **不需要修改代码** - 只需修改`.env`文件

### 缺点

❌ **每次需要配置** - 每次在新沙盒中需要修改`.env`文件  
❌ **容易出错** - 忘记修改`.env`文件会导致API调用失败

---

## 🔀 方案3: 前端实现API代理

### 原理

在前端项目的开发服务器中配置代理,将API请求转发到后端服务器,避免CORS问题。

### 操作步骤

#### 步骤1: 配置Vite代理

在前端项目的`vite.config.js`中配置proxy:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://3000-xxx.sg1.manus.computer',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
```

#### 步骤2: 前端代码使用相对路径

```javascript
// src/services/api.js
export async function login(username, password) {
  // 使用相对路径,自动通过代理转发
  const response = await fetch('/api/trpc/auth.login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      json: { username, password }
    }),
  });
  return response.json();
}
```

### 优点

✅ **避免CORS问题** - 代理请求不会触发CORS限制  
✅ **前端代码简洁** - 使用相对路径,不需要配置完整URL

### 缺点

❌ **每次需要修改配置** - 每次在新沙盒中需要修改`vite.config.js`  
❌ **只适用于开发环境** - 生产环境无法使用开发服务器代理  
❌ **性能开销** - 代理会增加请求延迟

---

## 🎖️ 最佳实践推荐

### 推荐方案: 方案1 + 方案2 组合

**开发阶段**:
1. 使用方案2(环境变量)配置当前沙盒的临时API地址
2. 快速开发和测试

**生产阶段**:
1. 发布course_crm后端到Manus平台
2. 获得固定域名
3. 更新前端配置使用固定域名
4. 前端打包发布

### 完整配置示例

```javascript
// src/config/api.js
export const API_CONFIG = {
  // 优先使用环境变量,如果没有则使用固定域名
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://your-app.manus.space/api/trpc',
};
```

```bash
# .env.development (开发环境 - 可选)
VITE_API_BASE_URL=https://3000-xxx.sg1.manus.computer/api/trpc

# .env.production (生产环境)
VITE_API_BASE_URL=https://your-app.manus.space/api/trpc
```

---

## 📝 后端CORS配置完整代码

```typescript
// server/_core/index.ts
import cors from 'cors';

// CORS配置 - 允许所有Manus域名
app.use(cors({
  origin: function (origin, callback) {
    // 允许的域名模式
    const allowedPatterns = [
      /\.manus\.computer$/,  // 所有 manus.computer 子域名
      /\.manus\.space$/,     // 所有 manus.space 子域名
      /^http:\/\/localhost:\d+$/,  // 本地开发
    ];
    
    // 如果没有origin(比如Postman)或匹配允许的模式,则允许
    if (!origin || allowedPatterns.some(pattern => pattern.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

## 🚀 快速开始指南

### 第一次配置(5分钟)

1. **发布后端项目**
   - 打开course_crm项目
   - 点击"Publish"按钮
   - 获得固定域名: `https://your-app.manus.space`

2. **配置前端API地址**
   ```javascript
   // src/config/api.js
   export const API_CONFIG = {
     BASE_URL: 'https://your-app.manus.space/api/trpc',
   };
   ```

3. **完成!** 🎉

### 后续使用(0分钟)

- ✅ 无需任何配置
- ✅ 直接导入前端项目到新沙盒
- ✅ 自动连接到固定的后端API
- ✅ 所有功能正常工作

---

## ❓ 常见问题

### Q1: 发布后端项目会影响开发吗?

**A**: 不会。发布的是生产环境,开发环境仍然可以在沙盒中继续开发。

### Q2: 固定域名会过期吗?

**A**: 不会。Manus发布的域名是永久有效的。

### Q3: 可以绑定自己的域名吗?

**A**: 可以。在Manus项目设置中可以绑定自定义域名(如`api.yourdomain.com`)。

### Q4: 如果需要更新后端代码怎么办?

**A**: 在开发沙盒中修改代码,测试通过后重新发布即可。域名保持不变,前端无需修改。

### Q5: CORS配置会影响安全性吗?

**A**: 配置允许所有`*.manus.computer`域名是安全的,因为这些都是Manus平台的内部域名。如果需要更严格的安全控制,可以在后端添加token验证。

---

## 📞 技术支持

如有问题,请联系技术支持团队或查看Manus官方文档。

---

## 📚 相关文档

- [老师头像上传API调用示例](./老师头像上传API调用示例.md) - 新增
- [课程预约API文档](./课程预约API文档-完整版.md)
- [接口测试数据](./接口测试数据-完整版.md)
- [Manus项目发布指南](https://docs.manus.im/publish)
