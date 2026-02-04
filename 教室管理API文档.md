# 教室管理API接口文档

## 概述

本文档描述了课程交付CRM系统中教室管理相关的API接口,供前端移动端App对接使用。

**后端API地址**: `https://crm.bdsm.com.cn`

---

## 接口列表

### 1. 获取城市列表

获取所有城市信息,包括城市ID、名称等基础信息。

**接口路径**: `/api/trpc/classrooms.getCities`  
**请求方法**: `GET`  
**认证要求**: 无需登录(公开接口)

#### 请求参数

无

#### 返回数据结构

```json
{
  "result": {
    "data": {
      "json": [
        {
          "id": 1,
          "name": "上海",
          "areaCode": "021",
          "partnerFeeRatio": "0.00",
          "isActive": true,
          "createdAt": "2026-02-03T16:13:03.000Z",
          "updatedAt": "2026-02-03T16:13:03.000Z"
        }
      ]
    }
  }
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | number | 城市ID |
| `name` | string | 城市名称 |
| `areaCode` | string \| null | 区号 |
| `partnerFeeRatio` | string | 合伙人费比例(如"0.30"表示30%) |
| `isActive` | boolean | 是否启用 |
| `createdAt` | string | 创建时间(ISO 8601格式) |
| `updatedAt` | string | 更新时间(ISO 8601格式) |

---

### 2. 获取指定城市的教室列表

获取某个城市下的所有教室信息。

**接口路径**: `/api/trpc/classrooms.list`  
**请求方法**: `GET`  
**认证要求**: 无需登录(公开接口)

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `input` | object | 是 | 查询参数对象 |
| `input.json.cityId` | number | 是 | 城市ID |

#### 请求示例

```
GET /api/trpc/classrooms.list?input={"json":{"cityId":1}}
```

#### 返回数据结构

```json
{
  "result": {
    "data": {
      "json": [
        {
          "id": 1,
          "cityId": 1,
          "name": "404教室",
          "address": "上海市浦东新区世纪大道1000号测试大厦10楼A座",
          "notes": null,
          "isActive": false,
          "createdAt": "2026-02-03T16:29:08.000Z",
          "updatedAt": "2026-02-03T16:32:19.000Z"
        },
        {
          "id": 2,
          "cityId": 1,
          "name": "1101教室",
          "address": "上海市黄浦区南京东路100号11楼",
          "notes": "地铁2号线南京东路站3号口",
          "isActive": true,
          "createdAt": "2026-02-03T16:13:03.000Z",
          "updatedAt": "2026-02-03T16:13:03.000Z"
        }
      ]
    }
  }
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | number | 教室ID |
| `cityId` | number | 所属城市ID |
| `name` | string | 教室名称 |
| `address` | string | 教室详细地址 |
| `notes` | string \| null | 备注信息(如交通提示、特殊说明等) |
| `isActive` | boolean | 是否启用 |
| `createdAt` | string | 创建时间(ISO 8601格式) |
| `updatedAt` | string | 更新时间(ISO 8601格式) |

---

### 3. 获取所有教室列表(含城市信息)

获取所有教室信息,包含关联的城市名称。

**接口路径**: `/api/trpc/classrooms.listAll`  
**请求方法**: `GET`  
**认证要求**: 无需登录(公开接口)

#### 请求参数

无

#### 返回数据结构

```json
{
  "result": {
    "data": {
      "json": [
        {
          "id": 1,
          "cityId": 1,
          "cityName": "上海",
          "name": "404教室",
          "address": "上海市浦东新区世纪大道1000号测试大厦10楼A座",
          "notes": null,
          "isActive": false,
          "createdAt": "2026-02-03T16:29:08.000Z",
          "updatedAt": "2026-02-03T16:32:19.000Z"
        }
      ]
    }
  }
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | number | 教室ID |
| `cityId` | number | 所属城市ID |
| `cityName` | string | 所属城市名称 |
| `name` | string | 教室名称 |
| `address` | string | 教室详细地址 |
| `notes` | string \| null | 备注信息 |
| `isActive` | boolean | 是否启用 |
| `createdAt` | string | 创建时间(ISO 8601格式) |
| `updatedAt` | string | 更新时间(ISO 8601格式) |

---

## 前端使用示例

### 使用fetch API

```typescript
// 1. 获取城市列表
const citiesResponse = await fetch('https://crm.bdsm.com.cn/api/trpc/classrooms.getCities');
const citiesData = await citiesResponse.json();
const cities = citiesData.result.data.json;

// 2. 获取指定城市的教室列表
const cityId = 1; // 上海
const classroomsResponse = await fetch(
  `https://crm.bdsm.com.cn/api/trpc/classrooms.list?input=${encodeURIComponent(JSON.stringify({ json: { cityId } }))}`
);
const classroomsData = await classroomsResponse.json();
const classrooms = classroomsData.result.data.json;

// 3. 获取所有教室列表
const allClassroomsResponse = await fetch('https://crm.bdsm.com.cn/api/trpc/classrooms.listAll');
const allClassroomsData = await allClassroomsResponse.json();
const allClassrooms = allClassroomsData.result.data.json;
```

### 使用tRPC客户端

```typescript
import { trpc } from './lib/api-client';

// 1. 获取城市列表
const cities = await trpc.classrooms.getCities.query();

// 2. 获取指定城市的教室列表
const classrooms = await trpc.classrooms.list.query({ cityId: 1 });

// 3. 获取所有教室列表
const allClassrooms = await trpc.classrooms.listAll.query();
```

---

## 典型使用场景

### 场景1: 课程预约 - 选择上课地点

```typescript
// 步骤1: 获取城市列表,让用户选择城市
const cities = await trpc.classrooms.getCities.query();
// 显示城市选择器: 上海、北京、深圳...

// 步骤2: 用户选择城市后,获取该城市的教室列表
const selectedCityId = 1; // 用户选择了上海
const classrooms = await trpc.classrooms.list.query({ cityId: selectedCityId });
// 显示教室选择器: 404教室、1101教室...

// 步骤3: 用户选择教室后,显示详细地址
const selectedClassroom = classrooms.find(c => c.id === selectedClassroomId);
console.log(`上课地址: ${selectedClassroom.address}`);
if (selectedClassroom.notes) {
  console.log(`交通提示: ${selectedClassroom.notes}`);
}
```

### 场景2: 地图展示 - 显示所有教室位置

```typescript
// 获取所有教室列表(含城市信息)
const allClassrooms = await trpc.classrooms.listAll.query();

// 按城市分组
const classroomsByCity = allClassrooms.reduce((acc, classroom) => {
  if (!acc[classroom.cityName]) {
    acc[classroom.cityName] = [];
  }
  acc[classroom.cityName].push(classroom);
  return acc;
}, {} as Record<string, typeof allClassrooms>);

// 在地图上标记所有教室位置
allClassrooms.forEach(classroom => {
  // 使用 classroom.address 进行地理编码
  // 在地图上添加标记点
  addMarker({
    title: `${classroom.cityName} - ${classroom.name}`,
    address: classroom.address,
    notes: classroom.notes
  });
});
```

---

## 数据更新说明

- 教室数据由管理后台维护,前端App仅读取
- 建议缓存城市列表(变化频率低)
- 教室列表建议每次进入课程预约页面时重新获取(确保地址信息最新)
- 所有接口返回的时间戳均为UTC时间,前端需根据用户时区转换显示

---

## 错误处理

所有接口遵循tRPC标准错误格式:

```json
{
  "error": {
    "message": "错误描述",
    "code": "BAD_REQUEST",
    "data": {
      "code": "BAD_REQUEST",
      "httpStatus": 400
    }
  }
}
```

常见错误码:
- `BAD_REQUEST`: 请求参数错误
- `NOT_FOUND`: 资源不存在
- `INTERNAL_SERVER_ERROR`: 服务器内部错误

---

## 联系方式

如有接口问题或需求变更,请联系后端开发团队。

**文档版本**: v1.0  
**最后更新**: 2026-02-04
