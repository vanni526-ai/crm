# 课程管理 API 接口文档

**版本**：v2.1（新增 `teacherFee` 老师费用字段）
**协议**：tRPC over HTTP（`POST /api/trpc/{procedure}`）
**认证**：部分接口需要登录态 Cookie（`session` 字段），通过 `auth.loginWithUserAccount` 获取。

---

## 通用说明

### 请求格式

所有接口均通过 `POST /api/trpc/{namespace}.{method}` 调用，请求体为 JSON：

```json
{
  "json": { /* 接口参数 */ }
}
```

批量调用（Batch）可在 URL 后加 `?batch=1`，请求体改为：

```json
{
  "0": { "json": { /* 第一个接口参数 */ } }
}
```

### 响应格式

成功响应：
```json
{
  "result": {
    "data": {
      "json": { /* 返回数据 */ }
    }
  }
}
```

错误响应：
```json
{
  "error": {
    "json": {
      "message": "错误描述",
      "code": -32600,
      "data": {
        "code": "BAD_REQUEST",
        "httpStatus": 400,
        "path": "courses.create"
      }
    }
  }
}
```

### 权限说明

| 权限级别 | 说明 |
|---|---|
| 公开（public） | 无需登录，任何客户端可直接调用 |
| 登录（protected） | 需要有效的 `session` Cookie，通过手机号+密码登录后获取 |

---

## 接口列表

| 接口路径 | 类型 | 权限 | 说明 |
|---|---|---|---|
| `courses.list` | Query | 公开 | 获取所有课程列表 |
| `courses.getById` | Query | 公开 | 根据 ID 获取课程详情 |
| `courses.create` | Mutation | 登录 | 创建新课程 |
| `courses.update` | Mutation | 登录 | 更新课程信息 |
| `courses.toggleActive` | Mutation | 登录 | 切换课程启用/停用状态 |
| `courses.delete` | Mutation | 登录 | 删除课程 |
| `courses.importFromExcel` | Mutation | 登录 | 批量导入课程 |

---

## 接口详情

### 1. `courses.list` — 获取所有课程列表

**类型**：Query（GET）
**权限**：公开，无需登录

**请求 URL**：
```
GET /api/trpc/courses.list
```

**请求参数**：无

**响应示例**：
```json
{
  "result": {
    "data": {
      "json": {
        "success": true,
        "count": 2,
        "data": [
          {
            "id": 1,
            "name": "1V1 女王深度局",
            "alias": "深度局",
            "introduction": "深度体验课程",
            "description": "详细课程描述...",
            "price": "3000.00",
            "duration": "3",
            "level": "深度",
            "isActive": true,
            "isHot": 1,
            "teacherFee": "300.00",
            "createdAt": "2026-01-01T00:00:00.000Z",
            "updatedAt": "2026-03-02T00:00:00.000Z"
          }
        ]
      }
    }
  }
}
```

**响应字段说明**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `success` | boolean | 是否成功 |
| `count` | number | 课程总数 |
| `data` | array | 课程列表 |
| `data[].id` | number | 课程 ID |
| `data[].name` | string | 课程名称 |
| `data[].alias` | string \| null | 课程别名（供前端 App 显示） |
| `data[].introduction` | string \| null | 课程介绍（不超过 20 字） |
| `data[].description` | string \| null | 课程详细描述 |
| `data[].price` | string \| null | 课程价格（元），字符串格式 |
| `data[].duration` | string \| null | 课程时长（小时），字符串格式 |
| `data[].level` | string \| null | 课程程度：`入门` / `深度` / `订制` / `剧本` |
| `data[].isActive` | boolean | 是否启用 |
| `data[].isHot` | number | 是否热门：`1` 热门 / `0` 普通 |
| **`data[].teacherFee`** | **string \| null** | **老师费用（元/节），字符串格式，新增字段** |
| `data[].createdAt` | Date | 创建时间（UTC） |
| `data[].updatedAt` | Date | 最后更新时间（UTC） |

---

### 2. `courses.getById` — 根据 ID 获取课程详情

**类型**：Query（GET）
**权限**：公开，无需登录

**请求 URL**：
```
GET /api/trpc/courses.getById?input={"json":{"id":1}}
```

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | number | 是 | 课程 ID |

**响应示例（找到）**：
```json
{
  "result": {
    "data": {
      "json": {
        "success": true,
        "data": {
          "id": 1,
          "name": "1V1 女王深度局",
          "alias": "深度局",
          "introduction": "深度体验课程",
          "description": "详细课程描述...",
          "price": "3000.00",
          "duration": "3",
          "level": "深度",
          "isActive": true,
          "isHot": 1,
          "teacherFee": "300.00",
          "createdAt": "2026-01-01T00:00:00.000Z",
          "updatedAt": "2026-03-02T00:00:00.000Z"
        }
      }
    }
  }
}
```

**响应示例（未找到）**：
```json
{
  "result": {
    "data": {
      "json": {
        "success": false,
        "message": "未找到ID为999的课程",
        "data": null
      }
    }
  }
}
```

---

### 3. `courses.create` — 创建新课程

**类型**：Mutation（POST）
**权限**：需要登录

**请求 URL**：
```
POST /api/trpc/courses.create
```

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `name` | string | 是 | 课程名称，不能为空 |
| `alias` | string | 否 | 课程别名，供前端 App 显示 |
| `introduction` | string | 否 | 课程介绍，最多 20 字 |
| `description` | string | 否 | 课程详细描述 |
| `price` | number | 是 | 课程价格（元），不能为负数 |
| `duration` | number | 是 | 课程时长（小时），不能为负数 |
| `level` | string | 是 | 课程程度：`入门` / `深度` / `订制` / `剧本` |
| `isHot` | number | 否 | 是否热门：`1` 热门 / `0` 普通，默认 `0` |
| **`teacherFee`** | **number** | **否** | **老师费用（元/节），不能为负数，默认 `0`，新增字段** |

**请求示例**：
```json
{
  "json": {
    "name": "1V1 女王深度局",
    "alias": "深度局",
    "introduction": "深度体验课程",
    "price": 3000,
    "duration": 3,
    "level": "深度",
    "teacherFee": 300
  }
}
```

**响应示例**：
```json
{
  "result": {
    "data": {
      "json": {
        "success": true,
        "data": { "id": 1 },
        "message": "课程创建成功"
      }
    }
  }
}
```

**响应字段说明**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `success` | boolean | 是否成功 |
| `data.id` | number | 新创建的课程 ID |
| `message` | string | 操作结果描述 |

---

### 4. `courses.update` — 更新课程信息

**类型**：Mutation（POST）
**权限**：需要登录

**请求 URL**：
```
POST /api/trpc/courses.update
```

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | number | 是 | 要更新的课程 ID |
| `name` | string | 否 | 课程名称 |
| `alias` | string | 否 | 课程别名 |
| `introduction` | string | 否 | 课程介绍，最多 20 字 |
| `description` | string | 否 | 课程详细描述 |
| `price` | number | 否 | 课程价格（元） |
| `duration` | number | 否 | 课程时长（小时） |
| `level` | string | 否 | 课程程度：`入门` / `深度` / `订制` / `剧本` |
| `isHot` | number | 否 | 是否热门：`1` / `0` |
| **`teacherFee`** | **number** | **否** | **老师费用（元/节），新增字段** |

**请求示例（更新老师费用）**：
```json
{
  "json": {
    "id": 1,
    "teacherFee": 350
  }
}
```

**响应示例**：
```json
{
  "result": {
    "data": {
      "json": {
        "success": true,
        "message": "课程更新成功"
      }
    }
  }
}
```

---

### 5. `courses.toggleActive` — 切换课程启用状态

**类型**：Mutation（POST）
**权限**：需要登录

**请求 URL**：
```
POST /api/trpc/courses.toggleActive
```

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | number | 是 | 课程 ID |

**请求示例**：
```json
{
  "json": {
    "id": 1
  }
}
```

**响应示例**：
```json
{
  "result": {
    "data": {
      "json": {
        "success": true,
        "data": { "isActive": false },
        "message": "课程已停用"
      }
    }
  }
}
```

**响应字段说明**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `success` | boolean | 是否成功 |
| `data.isActive` | boolean | 切换后的启用状态 |
| `message` | string | `课程已启用` 或 `课程已停用` |

---

### 6. `courses.delete` — 删除课程

**类型**：Mutation（POST）
**权限**：需要登录

**请求 URL**：
```
POST /api/trpc/courses.delete
```

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | number | 是 | 要删除的课程 ID |

**请求示例**：
```json
{
  "json": {
    "id": 1
  }
}
```

**响应示例**：
```json
{
  "result": {
    "data": {
      "json": {
        "success": true,
        "message": "课程删除成功"
      }
    }
  }
}
```

---

### 7. `courses.importFromExcel` — 批量导入课程

**类型**：Mutation（POST）
**权限**：需要登录

**请求 URL**：
```
POST /api/trpc/courses.importFromExcel
```

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `courses` | array | 是 | 课程数组，每项结构见下表 |

**`courses` 数组每项字段**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `name` | string | 是 | 课程名称 |
| `alias` | string | 否 | 课程别名 |
| `introduction` | string | 否 | 课程介绍，最多 20 字 |
| `description` | string | 否 | 课程描述 |
| `price` | number | 是 | 课程价格（元） |
| `duration` | number | 是 | 课程时长（小时） |
| `level` | string | 是 | `入门` / `深度` / `订制` / `剧本` |
| `isHot` | number | 否 | `1` 热门 / `0` 普通，默认 `0` |

> **注意**：批量导入接口暂不支持 `teacherFee` 字段，导入后可通过 `courses.update` 单独设置老师费用。

**请求示例**：
```json
{
  "json": {
    "courses": [
      {
        "name": "1V1 女王深度局",
        "alias": "深度局",
        "price": 3000,
        "duration": 3,
        "level": "深度"
      },
      {
        "name": "理论入门课",
        "price": 500,
        "duration": 1.5,
        "level": "入门"
      }
    ]
  }
}
```

**响应示例**：
```json
{
  "result": {
    "data": {
      "json": {
        "success": true,
        "data": {
          "success": 2,
          "failed": 0,
          "errors": []
        },
        "message": "导入完成: 成功 2 条, 失败 0 条"
      }
    }
  }
}
```

**响应字段说明**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `success` | boolean | 整体操作是否成功 |
| `data.success` | number | 成功导入的课程数量 |
| `data.failed` | number | 导入失败的课程数量 |
| `data.errors` | string[] | 失败原因列表，格式为 `"课程名: 错误原因"` |
| `message` | string | 导入结果汇总描述 |

---

## 老师费用计算规则

`teacherFee` 字段表示完成**每节课程**老师可获得的费用（元/节）。在订单中，老师费用的计算规则如下：

> **订单老师费用 = 课程 `teacherFee` × 订单节数（`quantity`）**

**举例**：

| 课程名称 | teacherFee（元/节） | 订单节数 | 订单老师费用 |
|---|---|---|---|
| 1V1 女王深度局 | 300 | 1 | 300 元 |
| 1V1 女王深度局 | 300 | 2 | 600 元 |
| 理论入门课 | 0 | 3 | 0 元 |

> **注意**：理论课（`理论课` 类型课程）的老师费用默认设置为 `0`，除非在课程管理中明确设置了非零值。

---

## 错误码说明

| HTTP 状态码 | tRPC 错误码 | 说明 |
|---|---|---|
| 400 | `BAD_REQUEST` | 请求参数不合法（如缺少必填字段、类型错误） |
| 401 | `UNAUTHORIZED` | 未登录或 Session 已过期 |
| 403 | `FORBIDDEN` | 权限不足（非管理员操作受保护接口） |
| 404 | `NOT_FOUND` | 课程 ID 不存在 |
| 500 | `INTERNAL_SERVER_ERROR` | 服务器内部错误 |

---

## 更新日志

| 版本 | 日期 | 变更内容 |
|---|---|---|
| v2.1 | 2026-03-02 | `courses.create` 和 `courses.update` 新增 `teacherFee`（老师费用）字段；`courses.list` 和 `courses.getById` 返回值新增 `teacherFee` 字段 |
| v2.0 | 2026-03-02 | 登录接口从 `username` 改为 `phone`，仅支持手机号登录 |
| v1.0 | 2026-01-01 | 初始版本 |
