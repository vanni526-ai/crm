# cityExpense.list API HTTP调用测试指南

## 问题诊断

用户报告的错误：
```json
{
  "error": {
    "json": {
      "message": "[\n  {\n    \"expected\": \"object\",\n    \"code\": \"invalid_type\",\n    \"path\": [],\n    \"message\": \"Invalid input: expected object, received undefined\"\n  }\n]",
      "code": -32600
    }
  }
}
```

## 根本原因

tRPC的HTTP GET请求需要特殊的参数编码格式：
1. 参数必须放在`input`查询参数中
2. `input`参数的值必须是**JSON序列化后再URL编码**的字符串
3. 对于空参数，需要传递`input={}`而不是不传参数

## 修复方案

### 1. 后端修复

修改`server/cityExpenseRouter.ts`的参数schema：

**修复前（错误）：**
```typescript
.input(z.object({...}).optional().default({}))
```

**修复后（正确）：**
```typescript
.input(z.object({...}).default({}))
```

同时在query函数中添加默认值：
```typescript
.query(async ({ input = {}, ctx }) => {
```

### 2. 前端调用方式

#### 方式1：使用tRPC客户端（推荐）
```javascript
// 使用tRPC客户端自动处理参数编码
const result = await trpc.cityExpense.list.query({ month: "2026-01" });
```

#### 方式2：标准HTTP GET请求

**空参数调用：**
```bash
curl -X GET "http://localhost:3000/api/trpc/cityExpense.list?input=%7B%7D" \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

**带参数调用：**
```bash
# 参数: {"month":"2026-01"}
# JSON序列化: {"month":"2026-01"}
# URL编码: %7B%22month%22%3A%222026-01%22%7D

curl -X GET "http://localhost:3000/api/trpc/cityExpense.list?input=%7B%22month%22%3A%222026-01%22%7D" \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

**带多个参数调用：**
```bash
# 参数: {"cityId":3,"month":"2026-01"}
# URL编码: %7B%22cityId%22%3A3%2C%22month%22%3A%222026-01%22%7D

curl -X GET "http://localhost:3000/api/trpc/cityExpense.list?input=%7B%22cityId%22%3A3%2C%22month%22%3A%222026-01%22%7D" \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

#### 方式3：JavaScript/TypeScript代码

```javascript
// 使用fetch API
async function callCityExpenseList(params = {}) {
  const input = encodeURIComponent(JSON.stringify(params));
  const response = await fetch(
    `http://localhost:3000/api/trpc/cityExpense.list?input=${input}`,
    {
      method: 'GET',
      credentials: 'include', // 自动携带cookie
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.json.message);
  }
  
  return data.result.data;
}

// 使用示例
const bills = await callCityExpenseList({ month: "2026-01" });
console.log(bills);
```

#### 方式4：React Native代码

```javascript
import { useEffect, useState } from 'react';

function useCityExpenseList(params = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const input = encodeURIComponent(JSON.stringify(params));
        const response = await fetch(
          `http://localhost:3000/api/trpc/cityExpense.list?input=${input}`,
          {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error.json.message);
        }
        
        setData(result.result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [JSON.stringify(params)]);
  
  return { data, loading, error };
}

// 使用示例
function MyComponent() {
  const { data, loading, error } = useCityExpenseList({ month: "2026-01" });
  
  if (loading) return <Text>加载中...</Text>;
  if (error) return <Text>错误: {error}</Text>;
  
  return (
    <View>
      {data.map(bill => (
        <Text key={bill.id}>
          {bill.cityName}: ¥{bill.salesAmount}
        </Text>
      ))}
    </View>
  );
}
```

## 认证问题

tRPC API使用session cookie进行认证，移动App需要：

1. **首次登录获取session cookie**
2. **后续请求自动携带cookie**

### 登录流程

```javascript
// 1. 跳转到OAuth登录页面
const loginUrl = `${API_BASE_URL}/api/oauth/login`;
// 使用WebView或系统浏览器打开loginUrl

// 2. 登录成功后，session cookie会自动保存
// 3. 后续所有请求使用credentials: 'include'自动携带cookie
```

## 预期返回格式

```json
{
  "result": {
    "data": [
      {
        "id": 30003,
        "cityId": 3,
        "cityName": "重庆",
        "month": "2026-01",
        "orderCount": 5,
        "salesAmount": "20845.00",
        "partnerDividend": "2047.75"
      }
    ]
  }
}
```

## 常见错误

### 错误1：received undefined
**原因：** 参数schema定义不正确或参数未正确编码
**解决：** 使用`.default({})`而不是`.optional().default({})`

### 错误2：UNAUTHORIZED
**原因：** 未携带session cookie或session已过期
**解决：** 确保使用`credentials: 'include'`并先完成登录

### 错误3：参数格式错误
**原因：** input参数未进行JSON序列化或URL编码
**解决：** 使用`encodeURIComponent(JSON.stringify(params))`

## 测试命令

```bash
# 1. 测试空参数
curl -X GET "http://localhost:3000/api/trpc/cityExpense.list?input=%7B%7D"

# 2. 测试带month参数
curl -X GET "http://localhost:3000/api/trpc/cityExpense.list?input=%7B%22month%22%3A%222026-01%22%7D"

# 3. 测试带cityId和month参数
curl -X GET "http://localhost:3000/api/trpc/cityExpense.list?input=%7B%22cityId%22%3A3%2C%22month%22%3A%222026-01%22%7D"
```

## 参数编码工具

### JavaScript
```javascript
const params = { month: "2026-01" };
const encoded = encodeURIComponent(JSON.stringify(params));
console.log(encoded);
// 输出: %7B%22month%22%3A%222026-01%22%7D
```

### Python
```python
import urllib.parse
import json

params = {"month": "2026-01"}
encoded = urllib.parse.quote(json.dumps(params))
print(encoded)
# 输出: %7B%22month%22%3A%222026-01%22%7D
```

### 在线工具
- JSON编码: https://www.json.org/
- URL编码: https://www.urlencoder.org/
