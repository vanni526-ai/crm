# 后端API需求文档 - 密码重置功能

## 检查结果总结

经过检查和测试，前端已实现的密码重置功能已获得后端API支持：

### ✅ 1. 忘记密码接口（auth.resetPassword）

**状态**: ✅ 已实现并测试通过

**测试结果**:
```json
{"result":{"data":{"json":{"success":true}}}}
```

**前端调用位置**: 
- `app/forgot-password.tsx` (第107行)
- `lib/sdk/api-client.ts` (第557-566行)

**功能说明**: 用户忘记密码时，通过手机号+短信验证码+新密码来重置密码

---

### ✅ 2. 修改密码接口（auth.changePassword）

**状态**: ✅ 已修复并测试通过

**测试结果**:
```json
{"result":{"data":{"json":{"success":true}}}}
```

**前端调用位置**:
- `app/change-password.tsx` (第98行)
- `lib/sdk/api-client.ts` (第542-551行)

**功能说明**: 已登录用户通过旧密码+新密码来修改密码

---

## 详细接口规范

### 1. 忘记密码接口

**接口路径**: `auth.resetPassword`

**请求方法**: POST

**请求参数**:
```typescript
{
  phone: string;        // 手机号
  code: string;         // 短信验证码
  newPassword: string;  // 新密码
}
```

**参数说明**:
- `phone`: 用户注册的手机号，格式：11位数字
- `code`: 短信验证码，测试环境可固定为 "123456"
- `newPassword`: 新密码，长度至少6位

**响应数据**:
```typescript
{
  success: boolean;   // 是否成功
  error?: string;     // 错误信息（可选）
}
```

**业务逻辑**:
1. 验证手机号是否已注册
2. 验证短信验证码是否正确（测试环境固定为123456）
3. 验证新密码格式是否符合要求
4. 更新用户密码（需要加密存储）
5. 返回成功或失败信息

**错误场景**:
- 手机号未注册 → `{ success: false, error: "手机号未注册" }`
- 验证码错误 → `{ success: false, error: "验证码错误" }`
- 密码格式不符 → `{ success: false, error: "密码长度至少6位" }`

**前端使用示例**:
```typescript
const result = await api.auth.resetPassword({
  phone: "13800138000",
  code: "123456",
  newPassword: "newpass123"
});

if (result.success) {
  // 重置成功，跳转到登录页
  router.replace("/login");
} else {
  // 显示错误信息
  Alert.alert("重置失败", result.error);
}
```

---

### 2. 修改密码接口

**接口路径**: `auth.changePassword`

**请求方法**: POST

**请求参数**:
```typescript
{
  oldPassword: string;  // 旧密码
  newPassword: string;  // 新密码
}
```

**参数说明**:
- `oldPassword`: 用户当前的密码，用于验证身份
- `newPassword`: 新密码，长度至少6位

**响应数据**:
```typescript
{
  success: boolean;   // 是否成功
  error?: string;     // 错误信息（可选）
}
```

**业务逻辑**:
1. 验证用户是否已登录（通过session或token）
2. 验证旧密码是否正确
3. 验证新密码格式是否符合要求
4. 验证新密码与旧密码不相同
5. 更新用户密码（需要加密存储）
6. 清除用户所有session（强制重新登录）
7. 返回成功或失败信息

**错误场景**:
- 未登录 → `{ success: false, error: "请先登录" }`
- 旧密码错误 → `{ success: false, error: "旧密码错误" }`
- 新密码格式不符 → `{ success: false, error: "密码长度至少6位" }`
- 新旧密码相同 → `{ success: false, error: "新密码不能与旧密码相同" }`

**前端使用示例**:
```typescript
const result = await api.auth.changePassword({
  oldPassword: "oldpass123",
  newPassword: "newpass456"
});

if (result.success) {
  // 修改成功，跳转到登录页
  router.replace("/login");
} else {
  // 显示错误信息
  Alert.alert("修改失败", result.error);
}
```

---

## 安全建议

### 1. 密码加密
- 使用 bcrypt 或 argon2 进行密码哈希
- 不要在数据库中存储明文密码
- 密码哈希的 salt rounds 建议设置为 10-12

### 2. 短信验证码
- 生产环境需要接入真实的短信服务
- 验证码有效期建议设置为 5-10 分钟
- 同一手机号限制发送频率（如1分钟1次）
- 验证码使用后立即失效

### 3. 密码强度
- 建议要求密码长度至少8位
- 建议要求密码包含字母、数字、特殊字符
- 可以添加密码强度评分功能

### 4. 账户安全
- 修改密码后清除所有session，强制重新登录
- 记录密码修改日志（时间、IP地址）
- 连续输错密码后锁定账户（如5次）

---

## 测试用例

### 忘记密码接口测试

**测试用例1: 正常重置密码**
```
请求:
{
  "phone": "13800138000",
  "code": "123456",
  "newPassword": "newpass123"
}

期望响应:
{
  "success": true
}
```

**测试用例2: 手机号未注册**
```
请求:
{
  "phone": "19999999999",
  "code": "123456",
  "newPassword": "newpass123"
}

期望响应:
{
  "success": false,
  "error": "手机号未注册"
}
```

**测试用例3: 验证码错误**
```
请求:
{
  "phone": "13800138000",
  "code": "000000",
  "newPassword": "newpass123"
}

期望响应:
{
  "success": false,
  "error": "验证码错误"
}
```

### 修改密码接口测试

**测试用例1: 正常修改密码**
```
请求:
{
  "oldPassword": "oldpass123",
  "newPassword": "newpass456"
}

期望响应:
{
  "success": true
}
```

**测试用例2: 旧密码错误**
```
请求:
{
  "oldPassword": "wrongpass",
  "newPassword": "newpass456"
}

期望响应:
{
  "success": false,
  "error": "旧密码错误"
}
```

**测试用例3: 新旧密码相同**
```
请求:
{
  "oldPassword": "samepass123",
  "newPassword": "samepass123"
}

期望响应:
{
  "success": false,
  "error": "新密码不能与旧密码相同"
}
```

---

## 优先级

1. **高优先级**: `auth.resetPassword`（忘记密码）
   - 用户无法登录时的唯一解决方案
   - 影响用户体验和账户安全

2. **中优先级**: `auth.changePassword`（修改密码）
   - 接口已存在，只需修复参数格式问题
   - 已登录用户可以通过客服重置密码作为临时方案

---

## 联系方式

如有问题，请联系前端开发人员：
- 前端项目路径: `/home/ubuntu/course-booking-mobile`
- 相关文件:
  - `app/forgot-password.tsx` - 忘记密码页面
  - `app/change-password.tsx` - 修改密码页面
  - `lib/sdk/api-client.ts` - API客户端SDK
