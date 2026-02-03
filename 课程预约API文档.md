# 课程预约API文档

**版本**: 1.0  
**日期**: 2026-02-03  
**基础URL**: `https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc`

## 概述

课程预约API提供了创建课程预约的功能,支持前端课程预约App的核心业务流程。用户可以选择城市、老师、课程和时间,提交预约请求。

## 接口列表

### 1. 创建课程预约

创建一个新的课程预约记录。

**接口路径**: `POST /schedules.createAppointment`

**权限要求**: 公开接口(无需登录)

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| userId | number | 否 | 用户ID(已登录用户传入,未登录传null) | 30001 |
| cityId | number | 是 | 城市ID | 180002 |
| teacherId | number | 是 | 老师ID | 330002 |
| courseId | number | 是 | 课程ID | 2 |
| scheduledDate | string | 是 | 预约日期(YYYY-MM-DD格式) | "2026-02-10" |
| scheduledTime | string | 是 | 预约时间(HH:mm格式) | "14:00" |
| contactName | string | 是 | 联系人姓名 | "张三" |
| contactPhone | string | 是 | 联系电话 | "13800138000" |
| notes | string | 否 | 备注信息 | "希望安排在安静的教室" |

**请求示例**:

```bash
POST /api/trpc/schedules.createAppointment
Content-Type: application/json

{
  "json": {
    "userId": 30001,
    "cityId": 180002,
    "teacherId": 330002,
    "courseId": 2,
    "scheduledDate": "2026-02-10",
    "scheduledTime": "14:00",
    "contactName": "张三",
    "contactPhone": "13800138000",
    "notes": "测试预约"
  }
}
```

**成功响应**:

```json
{
  "result": {
    "data": {
      "json": {
        "success": true,
        "scheduleId": 300001,
        "message": "预约成功"
      }
    }
  }
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|---|---|---|
| success | boolean | 操作是否成功 |
| scheduleId | number | 创建的预约记录ID |
| message | string | 操作结果消息 |

**错误响应**:

1. **城市不存在**:
```json
{
  "error": {
    "json": {
      "message": "城市不存在",
      "code": -32004,
      "data": {
        "code": "NOT_FOUND",
        "httpStatus": 404
      }
    }
  }
}
```

2. **老师不存在**:
```json
{
  "error": {
    "json": {
      "message": "老师不存在",
      "code": -32004,
      "data": {
        "code": "NOT_FOUND",
        "httpStatus": 404
      }
    }
  }
}
```

3. **课程不存在**:
```json
{
  "error": {
    "json": {
      "message": "课程不存在",
      "code": -32004,
      "data": {
        "code": "NOT_FOUND",
        "httpStatus": 404
      }
    }
  }
}
```

4. **参数验证失败**:
```json
{
  "error": {
    "json": {
      "message": "Invalid input",
      "code": -32600,
      "data": {
        "code": "BAD_REQUEST",
        "httpStatus": 400
      }
    }
  }
}
```

## 业务逻辑说明

### 预约流程

1. **参数验证**: 验证所有必填参数是否完整
2. **城市验证**: 检查cityId对应的城市是否存在且激活
3. **老师验证**: 检查teacherId对应的老师是否存在
4. **课程验证**: 检查courseId对应的课程是否存在且激活
5. **时间计算**: 根据预约日期、时间和课程时长计算开始和结束时间
6. **创建记录**: 在schedules表中创建预约记录
7. **返回结果**: 返回预约成功信息和scheduleId

### 数据存储

预约记录存储在`schedules`表中,包含以下关键字段:

| 字段名 | 说明 |
|---|---|
| id | 预约记录ID(自增主键) |
| customerId | 用户ID(可选) |
| customerName | 联系人姓名 |
| wechatId | 联系电话(存储在wechatId字段) |
| teacherId | 老师ID |
| teacherName | 老师姓名 |
| courseType | 课程名称 |
| city | 城市名称 |
| classDate | 上课日期 |
| classTime | 上课时间 |
| startTime | 开始时间(timestamp) |
| endTime | 结束时间(timestamp) |
| status | 预约状态(scheduled/completed/cancelled) |
| notes | 备注信息 |
| createdAt | 创建时间 |
| updatedAt | 更新时间 |

### 时间计算规则

- **开始时间**: `scheduledDate + scheduledTime`
- **结束时间**: `开始时间 + 课程时长(小时)`

例如:
- 预约日期: 2026-02-10
- 预约时间: 14:00
- 课程时长: 1.0小时
- 开始时间: 2026-02-10 14:00:00
- 结束时间: 2026-02-10 15:00:00

## 前置接口

在调用创建预约接口之前,前端需要先调用以下接口获取可选项:

### 1. 获取城市列表

**接口**: `GET /cityPartnerConfig.list`

**说明**: 获取所有可用城市列表,用于城市选择下拉框

**响应示例**:
```json
{
  "result": {
    "data": {
      "json": {
        "success": true,
        "data": [
          {
            "id": 180002,
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

**说明**: 获取所有可用老师列表,用于老师选择下拉框

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

**说明**: 获取所有可用课程列表,用于课程选择下拉框

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

## 测试用例

### 成功案例

**测试场景**: 创建一个正常的课程预约

```bash
curl -X POST "https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc/schedules.createAppointment" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "cityId": 180002,
      "teacherId": 330002,
      "courseId": 2,
      "scheduledDate": "2026-02-10",
      "scheduledTime": "14:00",
      "contactName": "张三",
      "contactPhone": "13800138000",
      "notes": "测试预约"
    }
  }'
```

**预期结果**: 返回成功响应,scheduleId为新创建的预约记录ID

### 失败案例

**测试场景1**: 使用不存在的城市ID

```bash
curl -X POST "https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc/schedules.createAppointment" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "cityId": 999999,
      "teacherId": 330002,
      "courseId": 2,
      "scheduledDate": "2026-02-10",
      "scheduledTime": "14:00",
      "contactName": "张三",
      "contactPhone": "13800138000"
    }
  }'
```

**预期结果**: 返回错误响应,"城市不存在"

**测试场景2**: 缺少必填参数

```bash
curl -X POST "https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc/schedules.createAppointment" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "cityId": 180002,
      "teacherId": 330002
    }
  }'
```

**预期结果**: 返回参数验证失败错误

## 注意事项

1. **时间格式**: scheduledDate必须使用YYYY-MM-DD格式,scheduledTime必须使用HH:mm格式
2. **ID验证**: cityId、teacherId、courseId必须是有效的ID,系统会验证这些ID对应的记录是否存在
3. **联系方式**: contactPhone字段存储在数据库的wechatId字段中
4. **用户ID**: userId是可选的,未登录用户可以不传或传null
5. **时区**: 所有时间均使用服务器时区(GMT+8)
6. **状态**: 新创建的预约记录状态默认为"scheduled"(已预约)

## 后续扩展

未来可能添加的功能:

1. **查询预约列表**: `schedules.list` - 查询用户的预约记录
2. **查询预约详情**: `schedules.getById` - 根据scheduleId查询预约详情
3. **取消预约**: `schedules.cancel` - 取消已预约的课程
4. **修改预约**: `schedules.update` - 修改预约时间或其他信息
5. **预约状态更新**: `schedules.updateStatus` - 更新预约状态(完成/取消)

## 技术支持

如有问题,请联系技术支持团队。
