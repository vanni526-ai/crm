# 课程预约API文档(完整版)

**版本**: 2.0  
**日期**: 2026-02-03  
**基础URL**: `https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc`

## 概述

课程预约API提供了完整的课程预约管理功能,包括创建预约、查询预约列表、取消预约等核心业务流程。支持时间冲突检测,确保老师时间不会重复预约。

---

## 接口列表

### 1. 创建课程预约

创建一个新的课程预约记录,自动验证数据有效性并检测时间冲突。

**接口路径**: `POST /schedules.createAppointment`

**权限要求**: 公开接口(无需登录)

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| userId | number | 否 | 用户ID(已登录用户传入) | 30001 |
| cityId | number | 是 | 城市ID | 1 |
| teacherId | number | 是 | 老师ID | 330002 |
| courseId | number | 是 | 课程ID | 2 |
| scheduledDate | string | 是 | 预约日期(YYYY-MM-DD格式) | "2026-02-15" |
| scheduledTime | string | 是 | 预约时间(HH:mm格式) | "14:00" |
| contactName | string | 是 | 联系人姓名 | "张三" |
| contactPhone | string | 是 | 联系电话 | "13800138000" |
| notes | string | 否 | 备注信息 | "需要提前准备道具" |

**请求示例**:

```bash
curl -X POST "https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc/schedules.createAppointment" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": 30001,
      "cityId": 1,
      "teacherId": 330002,
      "courseId": 2,
      "scheduledDate": "2026-02-15",
      "scheduledTime": "14:00",
      "contactName": "张三",
      "contactPhone": "13800138000",
      "notes": "测试预约"
    }
  }'
```

**成功响应**:

```json
{
  "result": {
    "data": {
      "json": {
        "success": true,
        "scheduleId": 330001,
        "message": "预约成功"
      }
    }
  }
}
```

**错误响应**:

```json
{
  "error": {
    "json": {
      "message": "该老师在此时间段已有其他预约,请选择其他时间或老师",
      "code": -32009,
      "data": {
        "code": "CONFLICT",
        "httpStatus": 409
      }
    }
  }
}
```

---

### 2. 查询预约列表

查询用户的预约记录列表,支持按状态和日期范围筛选。

**接口路径**: `GET /schedules.listAppointments`

**权限要求**: 公开接口(无需登录)

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| userId | number | 是 | 用户ID | 30001 |
| status | string | 否 | 预约状态(scheduled/completed/cancelled) | "scheduled" |
| startDate | string | 否 | 开始日期(YYYY-MM-DD) | "2026-02-01" |
| endDate | string | 否 | 结束日期(YYYY-MM-DD) | "2026-02-28" |

**请求示例**:

```bash
curl "https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc/schedules.listAppointments?input=%7B%22json%22%3A%7B%22userId%22%3A30001%7D%7D"
```

**成功响应**:

```json
{
  "result": {
    "data": {
      "json": {
        "success": true,
        "data": [
          {
            "id": 330002,
            "cityId": "济南",
            "teacherId": 330002,
            "teacherName": "测试老师A",
            "courseType": "1V1 女王深度局",
            "scheduledDate": "2026-02-14T00:00:00.000Z",
            "scheduledTime": "10:00",
            "startTime": "2026-02-15T15:00:00.000Z",
            "endTime": "2026-02-15T16:00:00.000Z",
            "status": "scheduled",
            "contactName": "测试用户",
            "contactPhone": "13800138000",
            "notes": "测试预约",
            "createdAt": "2026-02-03T06:16:28.000Z"
          }
        ],
        "count": 1
      }
    }
  }
}
```

**返回字段说明**:

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | number | 预约ID |
| cityId | string | 城市名称 |
| teacherId | number | 老师ID |
| teacherName | string | 老师姓名 |
| courseType | string | 课程名称 |
| scheduledDate | string | 预约日期(ISO 8601) |
| scheduledTime | string | 预约时间(HH:mm) |
| startTime | string | 开始时间(ISO 8601) |
| endTime | string | 结束时间(ISO 8601) |
| status | string | 预约状态 |
| contactName | string | 联系人姓名 |
| contactPhone | string | 联系电话 |
| notes | string | 备注信息 |
| createdAt | string | 创建时间(ISO 8601) |

---

### 3. 取消预约

用户取消已预约的课程,验证预约状态和用户权限。

**接口路径**: `POST /schedules.cancelAppointment`

**权限要求**: 公开接口(无需登录)

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| scheduleId | number | 是 | 预约ID | 330002 |
| userId | number | 是 | 用户ID | 30001 |

**请求示例**:

```bash
curl -X POST "https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc/schedules.cancelAppointment" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "scheduleId": 330002,
      "userId": 30001
    }
  }'
```

**成功响应**:

```json
{
  "result": {
    "data": {
      "json": {
        "success": true,
        "message": "预约已取消"
      }
    }
  }
}
```

**错误响应**:

```json
{
  "error": {
    "json": {
      "message": "预约不存在或已取消",
      "code": -32600,
      "data": {
        "code": "BAD_REQUEST",
        "httpStatus": 400
      }
    }
  }
}
```

---

## 业务逻辑说明

### 创建预约流程

1. **参数验证**: 验证所有必填参数是否完整
2. **城市验证**: 检查cityId对应的城市是否存在
3. **老师验证**: 检查teacherId对应的老师是否存在且激活
4. **课程验证**: 检查courseId对应的课程是否存在且激活
5. **时间冲突检测**: 检查老师在该时间段是否已有其他预约
6. **时间计算**: 根据预约日期、时间和课程时长计算开始和结束时间
7. **创建记录**: 在schedules表中创建预约记录
8. **返回结果**: 返回预约成功信息和scheduleId

### 时间冲突检测规则

- 检查同一老师在同一时间段是否已有预约
- 时间段包含课程时长计算
- 冲突检测只针对状态为"scheduled"的预约
- 如有冲突,返回CONFLICT错误

### 取消预约规则

- 验证预约是否属于该用户
- 验证预约状态是否为"scheduled"
- 更新预约状态为"cancelled"
- 记录取消时间

---

## 前置接口

### 1. 获取城市列表

**接口**: `GET /cityPartnerConfig.list`

**响应示例**:
```json
{
  "result": {
    "data": {
      "json": {
        "success": true,
        "data": [
          {
            "id": 1,
            "city": "上海",
            "partnerFeeRate": "0.00",
            "areaCode": "021",
            "isActive": true
          }
        ],
        "count": 16
      }
    }
  }
}
```

### 2. 获取老师列表

**接口**: `GET /teachers.list`

**响应示例**:
```json
{
  "result": {
    "data": {
      "json": [
        {
          "id": 330002,
          "name": "测试老师A",
          "customerType": null,
          "notes": null
        }
      ]
    }
  }
}
```

### 3. 获取课程列表

**接口**: `GET /courses.list`

**响应示例**:
```json
{
  "result": {
    "data": {
      "json": {
        "success": true,
        "data": [
          {
            "id": 2,
            "name": "1V1 女王深度局",
            "introduction": null,
            "description": null,
            "price": "3000.00",
            "duration": "1.00",
            "level": "深度",
            "isActive": true
          }
        ],
        "count": 30
      }
    }
  }
}
```

---

## 完整测试流程

### 1. 创建预约

```bash
curl -X POST "https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc/schedules.createAppointment" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": 30001,
      "cityId": 1,
      "teacherId": 330002,
      "courseId": 2,
      "scheduledDate": "2026-02-20",
      "scheduledTime": "14:00",
      "contactName": "张三",
      "contactPhone": "13800138000",
      "notes": "测试完整流程"
    }
  }'
```

### 2. 查询预约列表

```bash
curl "https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc/schedules.listAppointments?input=%7B%22json%22%3A%7B%22userId%22%3A30001%7D%7D"
```

### 3. 取消预约

```bash
curl -X POST "https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc/schedules.cancelAppointment" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "scheduleId": 330003,
      "userId": 30001
    }
  }'
```

### 4. 验证取消状态

```bash
curl "https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc/schedules.listAppointments?input=%7B%22json%22%3A%7B%22userId%22%3A30001%2C%22status%22%3A%22cancelled%22%7D%7D"
```

### 5. 测试时间冲突

```bash
# 第一次创建预约
curl -X POST "https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc/schedules.createAppointment" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": 30001,
      "cityId": 1,
      "teacherId": 330002,
      "courseId": 2,
      "scheduledDate": "2026-02-25",
      "scheduledTime": "10:00",
      "contactName": "李四",
      "contactPhone": "13900139000"
    }
  }'

# 第二次创建相同时间的预约(应该失败)
curl -X POST "https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc/schedules.createAppointment" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": 30002,
      "cityId": 1,
      "teacherId": 330002,
      "courseId": 2,
      "scheduledDate": "2026-02-25",
      "scheduledTime": "10:00",
      "contactName": "王五",
      "contactPhone": "13700137000"
    }
  }'
```

---

## 错误码说明

| 错误码 | HTTP状态码 | 说明 | 触发场景 |
|--------|-----------|------|---------|
| NOT_FOUND | 404 | 资源不存在 | 城市/老师/课程ID无效 |
| CONFLICT | 409 | 资源冲突 | 老师时间冲突 |
| BAD_REQUEST | 400 | 请求参数错误 | 参数验证失败/预约不存在/无权限 |
| INTERNAL_SERVER_ERROR | 500 | 服务器内部错误 | 数据库错误/未知错误 |

---

## 注意事项

1. **时间格式**
   - 所有日期使用YYYY-MM-DD格式
   - 所有时间使用HH:mm格式(24小时制)
   - 响应中的时间戳使用ISO 8601格式

2. **时区处理**
   - 服务器使用UTC时区
   - 前端需要根据用户时区转换显示

3. **状态说明**
   - `scheduled`: 已预约(待完成)
   - `completed`: 已完成
   - `cancelled`: 已取消

4. **时间冲突检测**
   - 系统自动检测老师在同一时间段的预约
   - 冲突检测包含课程时长计算
   - 建议前端显示老师可用时间段

5. **数据完整性**
   - 创建预约前必须验证城市、老师、课程ID有效性
   - 建议前端缓存城市、老师、课程列表数据
   - 定期刷新缓存数据确保准确性

---

## 更新日志

- **2026-02-03 v2.0**: 添加查询预约列表、取消预约、时间冲突检测功能
- **2026-02-03 v1.0**: 初始版本,包含创建预约功能
