# 用户权限和城市权限API文档 - 前端App开发

**文档版本:** v1.0  
**最后更新:** 2026-02-13  
**作者:** Manus AI  
**适用范围:** 瀛姬App前端开发

---

## 目录

1. [概述](#概述)
2. [数据模型](#数据模型)
3. [用户角色说明](#用户角色说明)
4. [城市权限存储机制](#城市权限存储机制)
5. [认证和用户信息接口](#认证和用户信息接口)
6. [用户管理接口](#用户管理接口)
7. [权限判断逻辑](#权限判断逻辑)
8. [完整示例代码](#完整示例代码)
9. [常见问题FAQ](#常见问题faq)

---

## 概述

课程交付CRM系统采用**基于角色的访问控制(RBAC)**机制,支持多角色和城市权限管理。本文档详细说明了用户角色、城市权限的存储方式、相关API接口以及前端App如何获取和使用这些权限信息。

### 核心特性

- **多角色支持**: 一个用户可以同时拥有多个角色(如既是老师又是城市合伙人)
- **城市权限**: 老师和城市合伙人角色可以关联多个城市
- **灵活的权限控制**: 不同角色对应不同的数据访问权限
- **Token认证**: 使用JWT Token进行身份认证

---

## 数据模型

### User (用户)

用户基础信息数据结构。

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 用户ID |
| openId | string | 是 | 用户唯一标识 |
| name | string | 否 | 用户姓名 |
| nickname | string | 否 | 用户昵称(花名) |
| email | string | 否 | 邮箱 |
| phone | string | 否 | 手机号 |
| password | string | 否 | 加密后的密码(不返回给前端) |
| role | string | 是 | 主角色(兼容旧字段) |
| roles | string | 是 | 多角色字符串(逗号分隔,如"admin,teacher") |
| isActive | boolean | 是 | 账号是否启用 |
| createdAt | Date | 是 | 创建时间 |
| updatedAt | Date | 是 | 更新时间 |
| lastSignedIn | Date | 是 | 最后登录时间 |

### UserRoleCity (用户角色-城市关联)

用户角色与城市的关联关系数据结构。

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 关联ID |
| userId | number | 是 | 用户ID |
| role | string | 是 | 角色类型(teacher/cityPartner/sales) |
| cities | string | 是 | 城市列表(JSON数组字符串,如'["深圳","广州"]') |
| createdAt | Date | 是 | 创建时间 |
| updatedAt | Date | 是 | 更新时间 |

---

## 用户角色说明

系统支持以下六种用户角色,每个用户可以同时拥有多个角色。

| 角色代码 | 角色名称 | 说明 | 是否需要城市关联 |
|----------|----------|------|------------------|
| `admin` | 管理员 | 拥有系统所有权限,可以管理所有数据 | 否 |
| `sales` | 销售 | 可以创建和管理自己的订单、客户 | 否 |
| `finance` | 财务 | 可以进行财务统计、对账等操作 | 否 |
| `teacher` | 老师 | 可以查看和接单自己城市的订单 | **是** |
| `cityPartner` | 城市合伙人 | 可以查看自己城市的分红明细 | **是** |
| `user` | 普通用户 | 可以下单、查看自己的订单和余额 | 否 |

### 角色权限说明

**管理员(admin)**
- 查看和管理所有数据
- 创建、编辑、删除用户账号
- 配置系统设置
- 查看所有城市的数据

**销售(sales)**
- 创建和管理自己的订单
- 查看和管理自己的客户
- 查看自己的销售业绩

**财务(finance)**
- 查看所有订单的财务数据
- 进行财务统计和对账
- 导出财务报表

**老师(teacher)**
- 查看自己所在城市的待接单订单
- 接单和完成订单
- 查看自己的收入明细
- **必须关联至少一个城市**

**城市合伙人(cityPartner)**
- 查看自己所在城市的分红明细
- 查看城市业绩统计
- **必须关联至少一个城市**

**普通用户(user)**
- 下单购买课程
- 查看自己的订单
- 查看和管理自己的账户余额
- 查看账户流水

---

## 城市权限存储机制

### 存储方式

城市权限通过**独立的关联表**(`user_role_cities`)存储,支持一个用户的不同角色关联不同的城市列表。

**示例场景:**
- 用户A作为**老师**在深圳、广州工作
- 同时作为**城市合伙人**在天津、宁波运营
- 这两个角色的城市列表是独立管理的

### 数据库表结构

```sql
CREATE TABLE user_role_cities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,                    -- 用户ID
  role ENUM('teacher', 'cityPartner', 'sales') NOT NULL,  -- 角色类型
  cities TEXT NOT NULL,                   -- 城市列表(JSON数组)
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX user_role_idx (userId, role),
  INDEX user_id_idx (userId)
);
```

### 数据示例

假设用户ID为10的用户同时是老师和城市合伙人:

| id | userId | role | cities | createdAt | updatedAt |
|----|--------|------|--------|-----------|-----------|
| 1 | 10 | teacher | ["深圳","广州"] | 2024-01-01 | 2024-01-01 |
| 2 | 10 | cityPartner | ["天津","宁波"] | 2024-01-01 | 2024-01-01 |

### 前端数据格式

API返回给前端的城市权限数据格式为:

```typescript
{
  roleCities: {
    teacher: ["深圳", "广州"],
    cityPartner: ["天津", "宁波"]
  }
}
```

---

## 认证和用户信息接口

### 1. 用户登录

**接口名称:** `auth.loginWithUserAccount`  
**接口路径:** `https://crm.bdsm.com.cn/api/trpc/auth.loginWithUserAccount`  
**请求方法:** POST  
**认证要求:** 无需认证

**描述:** 用户使用用户名/手机号/邮箱和密码登录系统,获取Token和用户信息。

**请求参数:**

```typescript
{
  username: string;  // 用户名/手机号/邮箱(支持三种方式)
  password: string;  // 密码
}
```

**响应数据:**

```typescript
{
  success: boolean;
  token: string;     // JWT Token
  user: {
    id: number;
    openId: string;
    name: string;
    nickname: string;
    email: string;
    phone: string;
    role: string;           // 主角色(兼容旧字段)
    roles: string[];        // 多角色数组
    isActive: boolean;
  }
}
```

**响应示例:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 10,
    "openId": "user_abc123",
    "name": "张三",
    "nickname": "阿三",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "role": "teacher",
    "roles": ["teacher", "cityPartner"],
    "isActive": true
  }
}
```

**使用示例:**

```typescript
import { getApiClient } from '../lib/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const login = async (username: string, password: string) => {
  try {
    const client = await getApiClient();
    const result = await client.auth.loginWithUserAccount.mutate({
      username,
      password,
    });

    if (result.success) {
      // 保存Token
      await AsyncStorage.setItem('auth_token', result.token);
      
      // 保存用户信息
      await AsyncStorage.setItem('user_info', JSON.stringify(result.user));
      
      console.log('登录成功');
      console.log('用户角色:', result.user.roles);
      
      return result;
    }
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
};
```

### 2. 获取当前用户信息

**接口名称:** `auth.me`  
**接口路径:** `https://crm.bdsm.com.cn/api/trpc/auth.me`  
**请求方法:** POST  
**认证要求:** 需要Token认证

**描述:** 获取当前登录用户的基础信息(不包含城市权限)。

**请求参数:** 无

**响应数据:**

```typescript
{
  id: number;
  openId: string;
  name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  roles: string;      // 逗号分隔的角色字符串
  isActive: boolean;
} | null
```

**响应示例:**

```json
{
  "id": 10,
  "openId": "user_abc123",
  "name": "张三",
  "nickname": "阿三",
  "email": "zhangsan@example.com",
  "phone": "13800138000",
  "role": "teacher",
  "roles": "teacher,cityPartner",
  "isActive": true
}
```

**使用示例:**

```typescript
const getCurrentUser = async () => {
  const client = await getApiClient();
  const user = await client.auth.me.query();
  
  if (user) {
    console.log('当前用户:', user.name);
    console.log('角色列表:', user.roles.split(','));
    return user;
  }
  
  return null;
};
```

### 3. 刷新Token

**接口名称:** `auth.refreshToken`  
**接口路径:** `https://crm.bdsm.com.cn/api/trpc/auth.refreshToken`  
**请求方法:** POST  
**认证要求:** 需要提供旧Token

**描述:** 刷新过期的Token,延长登录状态。Token过期后7天内可以刷新。

**请求参数:**

```typescript
{
  token: string;  // 当前Token(可以是过期的)
}
```

**响应数据:**

```typescript
{
  success: boolean;
  token: string;       // 新Token
  expiresIn: number;   // 过期时间(秒)
  user: {
    id: number;
    openId: string;
    name: string;
    role: string;
    roles: string[];
  }
}
```

**使用示例:**

```typescript
const refreshToken = async () => {
  try {
    const oldToken = await AsyncStorage.getItem('auth_token');
    if (!oldToken) return false;

    const client = await getApiClient();
    const result = await client.auth.refreshToken.mutate({ token: oldToken });

    if (result.success) {
      // 保存新Token
      await AsyncStorage.setItem('auth_token', result.token);
      console.log('Token刷新成功');
      return true;
    }
  } catch (error) {
    console.error('Token刷新失败:', error);
    return false;
  }
};
```

---

## 用户管理接口

### 4. 获取用户详情(含城市权限)

**接口名称:** `userManagement.getById`  
**接口路径:** `https://crm.bdsm.com.cn/api/trpc/userManagement.getById`  
**请求方法:** POST  
**认证要求:** 需要管理员权限

**描述:** 获取指定用户的详细信息,包括角色-城市关联数据。这是**获取城市权限的主要接口**。

**请求参数:**

```typescript
{
  id: number;  // 用户ID
}
```

**响应数据:**

```typescript
{
  id: number;
  openId: string;
  name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  roles: string;                    // 逗号分隔的角色字符串
  roleCities: Record<string, string[]>;  // 角色-城市关联
  isActive: boolean;
  createdAt: Date;
  lastSignedIn: Date;
}
```

**响应示例:**

```json
{
  "id": 10,
  "openId": "user_abc123",
  "name": "张三",
  "nickname": "阿三",
  "email": "zhangsan@example.com",
  "phone": "13800138000",
  "role": "teacher",
  "roles": "teacher,cityPartner",
  "roleCities": {
    "teacher": ["深圳", "广州"],
    "cityPartner": ["天津", "宁波"]
  },
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastSignedIn": "2024-02-13T10:00:00.000Z"
}
```

**使用示例:**

```typescript
const getUserWithCities = async (userId: number) => {
  const client = await getApiClient();
  const user = await client.userManagement.getById.query({ id: userId });
  
  console.log('用户角色:', user.roles.split(','));
  console.log('老师城市:', user.roleCities.teacher || []);
  console.log('合伙人城市:', user.roleCities.cityPartner || []);
  
  return user;
};
```

### 5. 获取用户列表(支持城市筛选)

**接口名称:** `userManagement.list`  
**接口路径:** `https://crm.bdsm.com.cn/api/trpc/userManagement.list`  
**请求方法:** POST  
**认证要求:** 需要管理员权限

**描述:** 获取用户列表,支持按城市、角色、状态筛选,返回结果包含城市权限信息。

**请求参数:**

```typescript
{
  city?: string;      // 城市筛选(可选)
  role?: string;      // 角色筛选(可选)
  isActive?: boolean; // 状态筛选(可选)
}
```

**响应数据:**

```typescript
Array<{
  id: number;
  openId: string;
  name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  roles: string;
  roleCities: Record<string, string[]>;
  isActive: boolean;
  createdAt: Date;
  lastSignedIn: Date;
}>
```

**响应示例:**

```json
[
  {
    "id": 10,
    "openId": "user_abc123",
    "name": "张三",
    "nickname": "阿三",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "role": "teacher",
    "roles": "teacher,cityPartner",
    "roleCities": {
      "teacher": ["深圳", "广州"],
      "cityPartner": ["天津", "宁波"]
    },
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastSignedIn": "2024-02-13T10:00:00.000Z"
  }
]
```

**使用示例:**

```typescript
// 获取所有用户
const getAllUsers = async () => {
  const client = await getApiClient();
  const users = await client.userManagement.list.query();
  return users;
};

// 获取深圳的所有老师
const getShenzhenTeachers = async () => {
  const client = await getApiClient();
  const users = await client.userManagement.list.query({
    city: '深圳',
    role: 'teacher',
  });
  return users;
};

// 获取重庆的城市合伙人
const getChongqingPartners = async () => {
  const client = await getApiClient();
  const users = await client.userManagement.list.query({
    city: '重庆',
    role: 'cityPartner',
  });
  return users;
};
```

---

## 权限判断逻辑

### 角色判断

前端App需要根据用户角色显示不同的功能和数据。

```typescript
// 工具函数:检查用户是否拥有指定角色
const hasRole = (user: any, role: string): boolean => {
  if (!user || !user.roles) return false;
  const userRoles = user.roles.split(',').map((r: string) => r.trim());
  return userRoles.includes(role);
};

// 工具函数:检查用户是否拥有任意一个指定角色
const hasAnyRole = (user: any, roles: string[]): boolean => {
  return roles.some(role => hasRole(user, role));
};

// 使用示例
const user = await getCurrentUser();

if (hasRole(user, 'admin')) {
  console.log('用户是管理员');
}

if (hasRole(user, 'teacher')) {
  console.log('用户是老师');
}

if (hasRole(user, 'cityPartner')) {
  console.log('用户是城市合伙人');
}

if (hasAnyRole(user, ['admin', 'sales'])) {
  console.log('用户是管理员或销售');
}
```

### 城市权限判断

对于老师和城市合伙人角色,需要根据城市权限过滤数据。

```typescript
// 工具函数:获取用户特定角色的城市列表
const getUserCitiesByRole = async (userId: number, role: 'teacher' | 'cityPartner'): Promise<string[]> => {
  try {
    const client = await getApiClient();
    const user = await client.userManagement.getById.query({ id: userId });
    return user.roleCities[role] || [];
  } catch (error) {
    console.error('获取城市权限失败:', error);
    return [];
  }
};

// 工具函数:检查用户是否有权访问指定城市的数据
const canAccessCity = (user: any, city: string, role: 'teacher' | 'cityPartner'): boolean => {
  if (!user || !user.roleCities) return false;
  const cities = user.roleCities[role] || [];
  return cities.includes(city);
};

// 使用示例
const user = await getUserWithCities(10);

// 获取老师的城市列表
const teacherCities = user.roleCities.teacher || [];
console.log('老师城市:', teacherCities);

// 获取城市合伙人的城市列表
const partnerCities = user.roleCities.cityPartner || [];
console.log('合伙人城市:', partnerCities);

// 检查是否有权访问重庆的数据
if (canAccessCity(user, '重庆', 'cityPartner')) {
  console.log('可以查看重庆的分红明细');
}
```

### 数据过滤示例

根据城市权限过滤订单、分红等数据。

```typescript
// 示例:城市合伙人查看分红明细时,只显示自己城市的数据
const getMyProfitRecords = async () => {
  const client = await getApiClient();
  
  // 1. 获取当前用户信息
  const currentUser = await client.auth.me.query();
  if (!currentUser) throw new Error('未登录');
  
  // 2. 获取用户的城市权限
  const userDetail = await client.userManagement.getById.query({ 
    id: currentUser.id 
  });
  const myCities = userDetail.roleCities.cityPartner || [];
  
  // 3. 获取所有分红记录
  const allRecords = await client.partnerManagement.getProfitRecords.query();
  
  // 4. 过滤出自己城市的记录
  const myRecords = allRecords.filter(record => 
    myCities.includes(record.city)
  );
  
  return myRecords;
};

// 示例:老师查看待接单订单时,只显示自己城市的订单
const getMyPendingOrders = async () => {
  const client = await getApiClient();
  
  // 1. 获取当前用户信息
  const currentUser = await client.auth.me.query();
  if (!currentUser) throw new Error('未登录');
  
  // 2. 获取用户的城市权限
  const userDetail = await client.userManagement.getById.query({ 
    id: currentUser.id 
  });
  const myCities = userDetail.roleCities.teacher || [];
  
  // 3. 获取所有待接单订单
  const allOrders = await client.orders.getTeacherOrders.query({
    deliveryStatus: 'pending'
  });
  
  // 4. 过滤出自己城市的订单
  const myOrders = allOrders.filter(order => 
    myCities.includes(order.deliveryCity)
  );
  
  return myOrders;
};
```

---

## 完整示例代码

### 权限管理工具类

```typescript
// utils/permission.ts
import { getApiClient } from '../lib/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: number;
  openId: string;
  name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  roles: string;
  isActive: boolean;
}

export interface UserWithCities extends User {
  roleCities: Record<string, string[]>;
  createdAt: Date;
  lastSignedIn: Date;
}

/**
 * 权限管理类
 */
export class PermissionManager {
  private static instance: PermissionManager;
  private currentUser: User | null = null;
  private userCities: Record<string, string[]> = {};

  private constructor() {}

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * 初始化用户信息(登录后调用)
   */
  async init(): Promise<void> {
    try {
      const client = await getApiClient();
      const user = await client.auth.me.query();
      
      if (user) {
        this.currentUser = user;
        
        // 获取城市权限
        const userDetail = await client.userManagement.getById.query({ 
          id: user.id 
        });
        this.userCities = userDetail.roleCities;
        
        console.log('[PermissionManager] 初始化成功');
        console.log('用户角色:', this.getRoles());
        console.log('城市权限:', this.userCities);
      }
    } catch (error) {
      console.error('[PermissionManager] 初始化失败:', error);
    }
  }

  /**
   * 清除用户信息(登出时调用)
   */
  clear(): void {
    this.currentUser = null;
    this.userCities = {};
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * 获取用户角色列表
   */
  getRoles(): string[] {
    if (!this.currentUser) return [];
    return this.currentUser.roles.split(',').map(r => r.trim());
  }

  /**
   * 检查是否拥有指定角色
   */
  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  /**
   * 检查是否拥有任意一个指定角色
   */
  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.getRoles();
    return roles.some(role => userRoles.includes(role));
  }

  /**
   * 检查是否是管理员
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * 检查是否是老师
   */
  isTeacher(): boolean {
    return this.hasRole('teacher');
  }

  /**
   * 检查是否是城市合伙人
   */
  isCityPartner(): boolean {
    return this.hasRole('cityPartner');
  }

  /**
   * 检查是否是销售
   */
  isSales(): boolean {
    return this.hasRole('sales');
  }

  /**
   * 获取指定角色的城市列表
   */
  getCitiesByRole(role: 'teacher' | 'cityPartner'): string[] {
    return this.userCities[role] || [];
  }

  /**
   * 获取老师的城市列表
   */
  getTeacherCities(): string[] {
    return this.getCitiesByRole('teacher');
  }

  /**
   * 获取城市合伙人的城市列表
   */
  getPartnerCities(): string[] {
    return this.getCitiesByRole('cityPartner');
  }

  /**
   * 检查是否有权访问指定城市的数据
   */
  canAccessCity(city: string, role: 'teacher' | 'cityPartner'): boolean {
    // 管理员可以访问所有城市
    if (this.isAdmin()) return true;
    
    const cities = this.getCitiesByRole(role);
    return cities.includes(city);
  }

  /**
   * 过滤数据:只保留有权访问的城市的数据
   */
  filterByCity<T extends { city?: string; deliveryCity?: string }>(
    data: T[],
    role: 'teacher' | 'cityPartner'
  ): T[] {
    // 管理员可以查看所有数据
    if (this.isAdmin()) return data;
    
    const cities = this.getCitiesByRole(role);
    if (cities.length === 0) return [];
    
    return data.filter(item => {
      const itemCity = item.city || item.deliveryCity;
      return itemCity && cities.includes(itemCity);
    });
  }
}

// 导出单例
export const permissionManager = PermissionManager.getInstance();
```

### 登录页面示例

```typescript
// screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { getApiClient, refreshApiClient } from '../lib/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { permissionManager } from '../utils/permission';

export const LoginScreen = ({ navigation }: any) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('提示', '请输入用户名和密码');
      return;
    }

    try {
      setLoading(true);
      const client = await getApiClient();
      
      const result = await client.auth.loginWithUserAccount.mutate({
        username,
        password,
      });

      if (result.success) {
        // 1. 保存Token
        await AsyncStorage.setItem('auth_token', result.token);
        
        // 2. 保存用户信息
        await AsyncStorage.setItem('user_info', JSON.stringify(result.user));
        
        // 3. 刷新API客户端(使用新Token)
        await refreshApiClient();
        
        // 4. 初始化权限管理器
        await permissionManager.init();
        
        // 5. 根据角色跳转到不同页面
        const roles = result.user.roles;
        
        if (roles.includes('admin')) {
          navigation.replace('AdminDashboard');
        } else if (roles.includes('teacher')) {
          navigation.replace('TeacherDashboard');
        } else if (roles.includes('cityPartner')) {
          navigation.replace('PartnerDashboard');
        } else if (roles.includes('sales')) {
          navigation.replace('SalesDashboard');
        } else {
          navigation.replace('UserDashboard');
        }
        
        Alert.alert('成功', '登录成功');
      }
    } catch (error: any) {
      console.error('登录失败:', error);
      Alert.alert('错误', error.message || '登录失败,请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 32 }}>
        瀛姬App
      </Text>

      <TextInput
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
        }}
        placeholder="用户名/手机号/邮箱"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <TextInput
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 8,
          padding: 12,
          marginBottom: 24,
        }}
        placeholder="密码"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={{
          backgroundColor: '#007AFF',
          padding: 16,
          borderRadius: 8,
          alignItems: 'center',
        }}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
            登录
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};
```

### 城市合伙人分红明细页面示例

```typescript
// screens/PartnerProfitScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getApiClient } from '../lib/api-client';
import { permissionManager } from '../utils/permission';

interface ProfitRecord {
  id: number;
  city: string;
  month: string;
  amount: string;
  orderCount: number;
}

export const PartnerProfitScreen = () => {
  const [records, setRecords] = useState<ProfitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [myCities, setMyCities] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedCity]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 1. 获取我的城市列表
      const cities = permissionManager.getPartnerCities();
      setMyCities(cities);
      
      if (cities.length === 0) {
        Alert.alert('提示', '您还没有关联任何城市');
        return;
      }
      
      // 2. 获取分红记录
      const client = await getApiClient();
      const allRecords = await client.partnerManagement.getProfitRecords.query();
      
      // 3. 过滤出我的城市的记录
      let filteredRecords = allRecords.filter(record => 
        cities.includes(record.city)
      );
      
      // 4. 如果选择了特定城市,进一步过滤
      if (selectedCity !== 'all') {
        filteredRecords = filteredRecords.filter(record => 
          record.city === selectedCity
        );
      }
      
      setRecords(filteredRecords);
    } catch (error) {
      console.error('加载分红明细失败:', error);
      Alert.alert('错误', '加载失败,请重试');
    } finally {
      setLoading(false);
    }
  };

  const renderCityFilter = () => (
    <View style={{ flexDirection: 'row', padding: 16, gap: 8 }}>
      <TouchableOpacity
        style={{
          padding: 12,
          backgroundColor: selectedCity === 'all' ? '#007AFF' : 'white',
          borderRadius: 8,
        }}
        onPress={() => setSelectedCity('all')}
      >
        <Text style={{ color: selectedCity === 'all' ? 'white' : '#333' }}>
          全部城市
        </Text>
      </TouchableOpacity>
      
      {myCities.map(city => (
        <TouchableOpacity
          key={city}
          style={{
            padding: 12,
            backgroundColor: selectedCity === city ? '#007AFF' : 'white',
            borderRadius: 8,
          }}
          onPress={() => setSelectedCity(city)}
        >
          <Text style={{ color: selectedCity === city ? 'white' : '#333' }}>
            {city}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRecord = ({ item }: { item: ProfitRecord }) => (
    <View
      style={{
        padding: 16,
        backgroundColor: 'white',
        marginBottom: 8,
        borderRadius: 8,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
            {item.city} - {item.month}
          </Text>
          <Text style={{ color: '#666', marginTop: 4 }}>
            订单数: {item.orderCount}
          </Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#52C41A' }}>
          ¥{item.amount}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {renderCityFilter()}
      
      <FlatList
        data={records}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRecord}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ color: '#999' }}>暂无分红记录</Text>
          </View>
        }
      />
    </View>
  );
};
```

---

## 常见问题FAQ

### Q1: 如何获取当前用户的城市权限?

**A:** 使用`userManagement.getById`接口获取用户详情,其中包含`roleCities`字段。

```typescript
const client = await getApiClient();
const currentUser = await client.auth.me.query();
const userDetail = await client.userManagement.getById.query({ 
  id: currentUser.id 
});

// 获取老师城市
const teacherCities = userDetail.roleCities.teacher || [];

// 获取合伙人城市
const partnerCities = userDetail.roleCities.cityPartner || [];
```

### Q2: 为什么`auth.me`接口不返回城市权限?

**A:** `auth.me`接口只返回基础用户信息,不包含城市权限。这是出于性能考虑,因为城市权限存储在独立的关联表中,需要额外查询。如果需要城市权限,请使用`userManagement.getById`接口。

### Q3: 如何判断用户是否有权查看某个城市的数据?

**A:** 使用`PermissionManager`工具类的`canAccessCity`方法:

```typescript
import { permissionManager } from '../utils/permission';

// 初始化权限管理器(登录后调用一次)
await permissionManager.init();

// 检查是否有权访问重庆的数据
if (permissionManager.canAccessCity('重庆', 'cityPartner')) {
  // 可以查看重庆的分红明细
}
```

### Q4: 一个用户可以同时是老师和城市合伙人吗?

**A:** 可以。系统支持多角色,一个用户可以同时拥有多个角色,每个角色可以关联不同的城市列表。

例如:
- 作为老师在深圳、广州工作
- 作为城市合伙人在天津、宁波运营

### Q5: 管理员需要配置城市权限吗?

**A:** 不需要。管理员角色拥有所有权限,可以查看和管理所有城市的数据,无需单独配置城市权限。

### Q6: 如何过滤数据只显示用户有权访问的城市?

**A:** 使用`PermissionManager`的`filterByCity`方法:

```typescript
// 获取所有订单
const allOrders = await client.orders.list.query();

// 过滤出老师有权访问的城市的订单
const myOrders = permissionManager.filterByCity(allOrders, 'teacher');
```

### Q7: Token过期后如何处理?

**A:** 使用`auth.refreshToken`接口刷新Token:

```typescript
try {
  const oldToken = await AsyncStorage.getItem('auth_token');
  const client = await getApiClient();
  const result = await client.auth.refreshToken.mutate({ token: oldToken });
  
  if (result.success) {
    await AsyncStorage.setItem('auth_token', result.token);
  }
} catch (error) {
  // Token刷新失败,跳转到登录页
  navigation.navigate('Login');
}
```

### Q8: 如何在App启动时检查登录状态?

**A:** 在App启动时检查Token并初始化权限管理器:

```typescript
const checkLoginStatus = async () => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      navigation.navigate('Login');
      return;
    }
    
    // 验证Token
    const client = await getApiClient();
    const user = await client.auth.me.query();
    
    if (user) {
      // 初始化权限管理器
      await permissionManager.init();
      
      // 跳转到主页
      navigation.navigate('Home');
    } else {
      navigation.navigate('Login');
    }
  } catch (error) {
    // Token无效,跳转到登录页
    navigation.navigate('Login');
  }
};
```

### Q9: 如何实现角色切换功能?

**A:** 系统不支持运行时角色切换。用户的角色是在后台管理系统中配置的,前端只能读取和使用这些角色信息。如果需要修改用户角色,需要联系管理员在后台操作。

### Q10: 城市权限数据会缓存吗?

**A:** `PermissionManager`会在内存中缓存城市权限数据,避免重复请求。但是当用户登出或App重启时,缓存会被清除,需要重新初始化。

---

## 附录

### A. 角色权限对照表

| 功能模块 | admin | sales | finance | teacher | cityPartner | user |
|---------|-------|-------|---------|---------|-------------|------|
| 查看所有订单 | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| 查看自己的订单 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| 创建订单 | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| 接单 | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| 查看分红明细 | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| 用户管理 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 财务统计 | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| 查看账户余额 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### B. API接口速查表

| 接口名称 | 路径 | 用途 | 需要认证 |
|---------|------|------|----------|
| auth.loginWithUserAccount | /api/trpc/auth.loginWithUserAccount | 用户登录 | ❌ |
| auth.me | /api/trpc/auth.me | 获取当前用户信息 | ✅ |
| auth.refreshToken | /api/trpc/auth.refreshToken | 刷新Token | ✅ |
| userManagement.getById | /api/trpc/userManagement.getById | 获取用户详情(含城市权限) | ✅ |
| userManagement.list | /api/trpc/userManagement.list | 获取用户列表 | ✅ |

### C. 数据结构速查

**User (基础用户信息)**
```typescript
{
  id: number;
  openId: string;
  name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  roles: string;  // 逗号分隔
  isActive: boolean;
}
```

**UserWithCities (含城市权限的用户信息)**
```typescript
{
  ...User,
  roleCities: {
    teacher?: string[];      // 老师城市列表
    cityPartner?: string[];  // 合伙人城市列表
  };
  createdAt: Date;
  lastSignedIn: Date;
}
```

---

**文档版本:** v1.0  
**创建时间:** 2026-02-13  
**作者:** Manus AI  
**适用范围:** 瀛姬App前端开发

如有任何问题或需要补充的内容,请联系后端开发团队。
