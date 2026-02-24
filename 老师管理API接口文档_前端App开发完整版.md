# 老师管理API接口文档 - 前端App开发完整版

## 文档概述

本文档为前端App开发团队提供完整的老师相关API接口说明，包括老师列表查询、老师详情、城市筛选、可用性查询等所有接口的详细使用方法。

### 技术架构

- **框架**: tRPC (Type-safe RPC framework)
- **基础URL**: `https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/trpc`
- **认证方式**: Session Cookie (通过OAuth登录获取)
- **数据格式**: JSON
- **时区**: 北京时间 (GMT+8)

### 数据表结构说明

系统中老师数据存储在两个关联表中：

1. **users表** - 用户主表，存储所有账号的基本信息
   - 包含字段：id, name, nickname, phone, email, avatarUrl, roles, teacherAttribute, hourlyRate等
   
2. **user_role_cities表** - 角色-城市关联表
   - 存储老师的工作城市信息
   - 字段：userId, role, cities (JSON数组格式)

---

## 一、老师列表查询 API

### 1.1 获取所有老师列表

**接口路径**: `trpc.teachers.list`

**请求方法**: Query

**权限要求**: 公开 (无需特殊权限)

**请求参数**: 无

**返回数据结构**:
```typescript
Array<{
  id: number;                    // 老师用户ID
  name: string;                  // 老师姓名
  nickname: string | null;       // 昵称
  phone: string | null;          // 手机号
  email: string | null;          // 邮箱
  avatarUrl: string | null;      // 头像URL (S3存储)
  teacherAttribute: "S" | "M" | "Switch" | null;  // 老师属性
  customerType: string | null;   // 受众客户类型
  category: string | null;       // 分类 (本部老师/合伙店老师)
  hourlyRate: string | null;     // 课时费标准
  teacherStatus: string;         // 老师状态 (活跃/不活跃)
  teacherNotes: string | null;   // 老师备注
  wechat: string | null;         // 微信号
  aliases: string | null;        // 别名 (JSON数组字符串)
  city: string | null;           // 工作城市 (分号分隔的字符串，如"上海;天津;武汉")
  contractEndDate: Date | null;  // 合同到期时间
  joinDate: Date | null;         // 入职时间
  isActive: boolean;             // 账号是否激活
  roles: string;                 // 用户角色 (逗号分隔，如"老师,合伙人")
}>
```

**HTTP请求示例** (使用fetch):
```javascript
// 方式一：使用tRPC客户端 (推荐)
const response = await fetch('https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/trpc/teachers.list', {
  method: 'GET',
  credentials: 'include', // 包含cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

const result = await response.json();
console.log(result.result.data); // 老师列表数组
```

**React Native示例**:
```javascript
import { useQuery } from '@tanstack/react-query';

function TeacherListScreen() {
  const { data: teachers, isLoading } = useQuery({
    queryKey: ['teachers', 'list'],
    queryFn: async () => {
      const response = await fetch(
        'https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/trpc/teachers.list',
        {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const result = await response.json();
      return result.result.data;
    },
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <FlatList
      data={teachers}
      renderItem={({ item }) => (
        <TeacherCard teacher={item} />
      )}
      keyExtractor={(item) => item.id.toString()}
    />
  );
}
```

---

### 1.2 按城市筛选老师列表

**方法**: 前端本地筛选 (推荐) 或后端查询

**方式一：前端筛选 (推荐)**

获取所有老师列表后，在前端根据`city`字段进行筛选：

```javascript
// 获取所有老师
const allTeachers = await fetchAllTeachers();

// 筛选指定城市的老师
function filterTeachersByCity(teachers, cityName) {
  return teachers.filter(teacher => {
    if (!teacher.city) return false;
    // city字段格式: "上海;天津;武汉"
    const cities = teacher.city.split(';').map(c => c.trim());
    return cities.includes(cityName);
  });
}

// 使用示例
const shanghaiTeachers = filterTeachersByCity(allTeachers, '上海');
const tianjinTeachers = filterTeachersByCity(allTeachers, '天津');
```

**方式二：后端查询 (通过user_role_cities表)**

如果需要后端直接返回指定城市的老师，可以使用以下SQL逻辑（需要添加新的tRPC接口）：

```sql
SELECT u.* 
FROM users u
INNER JOIN user_role_cities urc ON u.id = urc.userId
WHERE urc.role = '老师'
  AND JSON_CONTAINS(urc.cities, '"上海"')
  AND u.deletedAt IS NULL
  AND u.isActive = true;
```

**建议实现新接口**: `trpc.teachers.getByCity`

```typescript
// 接口定义 (需要在后端添加)
getByCity: publicProcedure
  .input(z.object({
    cityName: z.string(), // 城市名称，如"上海"
  }))
  .query(async ({ input }) => {
    // 查询该城市的所有老师
    const teachers = await db.getTeachersByCity(input.cityName);
    return teachers;
  }),
```

**前端调用示例**:
```javascript
const response = await fetch(
  'https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/trpc/teachers.getByCity?input=' + 
  encodeURIComponent(JSON.stringify({ cityName: '上海' })),
  {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }
);
const result = await response.json();
const shanghaiTeachers = result.result.data;
```

---

### 1.3 获取指定城市、时间段内可用的老师

**接口路径**: `trpc.teachers.getAvailable`

**请求方法**: Query

**权限要求**: 公开

**功能说明**: 
- 查询指定城市、指定时间段内可用的老师
- 自动过滤已有预约的老师
- 自动过滤设置了"不接客"时段的老师

**请求参数**:
```typescript
{
  cityId: number;        // 城市ID (需要先查询城市列表获取)
  date: string;          // 日期，格式: YYYY-MM-DD，如 "2026-02-25"
  startTime: string;     // 开始时间，格式: HH:mm，如 "14:00"
  duration: number;      // 课程时长(小时)，如 2
}
```

**返回数据结构**:
```typescript
{
  success: boolean;
  data: Array<{
    id: number;                    // 老师用户ID
    name: string;                  // 老师姓名
    nickname: string | null;       // 昵称
    avatarUrl: string | null;      // 头像URL
    teacherAttribute: "S" | "M" | "Switch" | null;  // 老师属性
    hourlyRate: string | null;     // 课时费标准
  }>;
}
```

**HTTP请求示例**:
```javascript
const params = {
  cityId: 1,           // 上海的城市ID
  date: '2026-02-25',
  startTime: '14:00',
  duration: 2,         // 2小时
};

const response = await fetch(
  'https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/trpc/teachers.getAvailable?input=' +
  encodeURIComponent(JSON.stringify(params)),
  {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }
);

const result = await response.json();
const availableTeachers = result.result.data.data;
```

**React Native完整示例**:
```javascript
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';

function AvailableTeachersScreen({ route }) {
  const { cityId, date, startTime, duration } = route.params;

  const { data, isLoading, error } = useQuery({
    queryKey: ['teachers', 'available', cityId, date, startTime, duration],
    queryFn: async () => {
      const params = { cityId, date, startTime, duration };
      const response = await fetch(
        `https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/trpc/teachers.getAvailable?input=${encodeURIComponent(JSON.stringify(params))}`,
        {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const result = await response.json();
      return result.result.data.data;
    },
  });

  if (isLoading) return <Text>加载中...</Text>;
  if (error) return <Text>加载失败: {error.message}</Text>;
  if (!data || data.length === 0) return <Text>该时间段暂无可用老师</Text>;

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.teacherCard}
          onPress={() => handleSelectTeacher(item)}
        >
          <Image source={{ uri: item.avatarUrl || DEFAULT_AVATAR }} style={styles.avatar} />
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.attribute}>属性: {item.teacherAttribute || '未设置'}</Text>
            <Text style={styles.rate}>课时费: ¥{item.hourlyRate || '未设置'}/小时</Text>
          </View>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id.toString()}
    />
  );
}
```

---

## 二、老师详情查询 API

### 2.1 获取单个老师详情

**接口路径**: `trpc.teachers.getById`

**请求方法**: Query

**权限要求**: 公开

**请求参数**:
```typescript
{
  id: number;  // 老师用户ID
}
```

**返回数据结构**: 与`teachers.list`接口返回的单个老师对象结构相同

**HTTP请求示例**:
```javascript
const teacherId = 15362124;

const response = await fetch(
  `https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/trpc/teachers.getById?input=${encodeURIComponent(JSON.stringify({ id: teacherId }))}`,
  {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }
);

const result = await response.json();
const teacher = result.result.data;
```

**React Native示例**:
```javascript
function TeacherDetailScreen({ route }) {
  const { teacherId } = route.params;

  const { data: teacher, isLoading } = useQuery({
    queryKey: ['teacher', teacherId],
    queryFn: async () => {
      const response = await fetch(
        `https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/trpc/teachers.getById?input=${encodeURIComponent(JSON.stringify({ id: teacherId }))}`,
        {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const result = await response.json();
      return result.result.data;
    },
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container}>
      <Image 
        source={{ uri: teacher.avatarUrl || DEFAULT_AVATAR }} 
        style={styles.avatar} 
      />
      <Text style={styles.name}>{teacher.name}</Text>
      {teacher.nickname && <Text style={styles.nickname}>昵称: {teacher.nickname}</Text>}
      <Text style={styles.phone}>手机: {teacher.phone}</Text>
      <Text style={styles.cities}>工作城市: {teacher.city || '未设置'}</Text>
      <Text style={styles.attribute}>属性: {teacher.teacherAttribute || '未设置'}</Text>
      <Text style={styles.rate}>课时费: ¥{teacher.hourlyRate || '未设置'}/小时</Text>
      {teacher.teacherNotes && (
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>备注:</Text>
          <Text style={styles.notes}>{teacher.teacherNotes}</Text>
        </View>
      )}
    </ScrollView>
  );
}
```

---

## 三、老师统计数据 API

### 3.1 获取单个老师的统计数据

**接口路径**: `trpc.teachers.getStats`

**请求方法**: Query

**权限要求**: 需要登录

**请求参数**:
```typescript
{
  teacherId: number;           // 老师ID
  startDate?: Date;            // 可选，统计开始日期
  endDate?: Date;              // 可选，统计结束日期
}
```

**返回数据结构**:
```typescript
{
  classCount: number;          // 授课次数
  totalHours: number;          // 总课时
  totalIncome: number;         // 总收入
}
```

**HTTP请求示例**:
```javascript
const params = {
  teacherId: 15362124,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-12-31'),
};

const response = await fetch(
  `https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/trpc/teachers.getStats?input=${encodeURIComponent(JSON.stringify(params))}`,
  {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }
);

const result = await response.json();
const stats = result.result.data;
```

---

### 3.2 获取所有老师的统计数据

**接口路径**: `trpc.teachers.getAllStats`

**请求方法**: Query

**权限要求**: 需要登录

**请求参数**:
```typescript
{
  startDate?: Date;            // 可选，统计开始日期
  endDate?: Date;              // 可选，统计结束日期
}
```

**返回数据结构**:
```typescript
Array<{
  teacherId: number;           // 老师ID
  teacherName: string;         // 老师姓名
  classCount: number;          // 授课次数
  totalHours: number;          // 总课时
  totalIncome: number;         // 总收入
}>
```

---

## 四、老师名称列表 API

### 4.1 获取所有老师名称列表

**接口路径**: `trpc.metadata.getTeacherNames`

**请求方法**: Query

**权限要求**: 公开

**功能说明**: 获取系统中所有老师的姓名列表，用于下拉选择、自动补全等场景

**请求参数**: 无

**返回数据结构**:
```typescript
{
  success: boolean;
  data: string[];              // 老师姓名数组
  count: number;               // 老师数量
}
```

**HTTP请求示例**:
```javascript
const response = await fetch(
  'https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/trpc/metadata.getTeacherNames',
  {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }
);

const result = await response.json();
const teacherNames = result.result.data.data;
console.log(`系统中共有 ${result.result.data.count} 位老师`);
```

**React Native示例 (用于搜索框自动补全)**:
```javascript
import React, { useState } from 'react';
import { TextInput, FlatList, TouchableOpacity, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';

function TeacherSearchInput({ onSelectTeacher }) {
  const [searchText, setSearchText] = useState('');

  const { data: teacherNames } = useQuery({
    queryKey: ['metadata', 'teacherNames'],
    queryFn: async () => {
      const response = await fetch(
        'https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/trpc/metadata.getTeacherNames',
        {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const result = await response.json();
      return result.result.data.data;
    },
  });

  const filteredNames = teacherNames?.filter(name =>
    name.toLowerCase().includes(searchText.toLowerCase())
  ) || [];

  return (
    <View>
      <TextInput
        placeholder="搜索老师姓名"
        value={searchText}
        onChangeText={setSearchText}
        style={styles.searchInput}
      />
      {searchText && filteredNames.length > 0 && (
        <FlatList
          data={filteredNames}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                onSelectTeacher(item);
                setSearchText('');
              }}
            >
              <Text style={styles.suggestion}>{item}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item, index) => index.toString()}
          style={styles.suggestionList}
        />
      )}
    </View>
  );
}
```

---

## 五、城市数据 API

### 5.1 获取所有城市列表

**接口路径**: `trpc.metadata.getAll`

**请求方法**: Query

**权限要求**: 公开

**功能说明**: 获取系统中所有元数据，包括城市、课程、教室、老师名称等

**请求参数**: 无

**返回数据结构**:
```typescript
{
  success: boolean;
  data: {
    cities: string[];              // 城市名称数组
    courses: string[];             // 课程名称数组
    classrooms: string[];          // 教室名称数组
    teacherNames: string[];        // 老师姓名数组
    salespeople: string[];         // 销售人员姓名数组
    teacherCategories: string[];   // 老师分类数组
    courseAmounts: string[];       // 课程金额数组
  };
  counts: {
    cities: number;
    courses: number;
    classrooms: number;
    teacherNames: number;
    salespeople: number;
    teacherCategories: number;
    courseAmounts: number;
  };
}
```

**HTTP请求示例**:
```javascript
const response = await fetch(
  'https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/trpc/metadata.getAll',
  {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }
);

const result = await response.json();
const cities = result.result.data.data.cities;
const teacherNames = result.result.data.data.teacherNames;
```

**React Native示例 (城市选择器)**:
```javascript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';

function CitySelector({ onSelectCity }) {
  const [modalVisible, setModalVisible] = useState(false);

  const { data: metadata } = useQuery({
    queryKey: ['metadata', 'all'],
    queryFn: async () => {
      const response = await fetch(
        'https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/trpc/metadata.getAll',
        {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const result = await response.json();
      return result.result.data.data;
    },
  });

  return (
    <View>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.selectorButton}
      >
        <Text>选择城市</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <FlatList
            data={metadata?.cities || []}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onSelectCity(item);
                  setModalVisible(false);
                }}
                style={styles.cityItem}
              >
                <Text style={styles.cityText}>{item}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item, index) => index.toString()}
          />
          <TouchableOpacity
            onPress={() => setModalVisible(false)}
            style={styles.closeButton}
          >
            <Text>关闭</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
```

---

## 六、老师头像上传 API

### 6.1 上传老师头像

**接口路径**: `trpc.teachers.update`

**请求方法**: Mutation

**权限要求**: 管理员

**功能说明**: 更新老师头像URL（头像文件需先上传到S3，获取URL后再调用此接口）

**请求参数**:
```typescript
{
  id: number;                    // 老师ID
  data: {
    avatarUrl: string;           // 头像URL (S3存储地址)
  }
}
```

**返回数据结构**:
```typescript
{
  success: boolean;
}
```

**完整流程示例** (包含S3上传):

```javascript
// 步骤1: 上传图片到S3
async function uploadImageToS3(imageFile) {
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await fetch(
    'https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/upload',
    {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }
  );

  const result = await response.json();
  return result.url; // 返回S3 URL
}

// 步骤2: 更新老师头像URL
async function updateTeacherAvatar(teacherId, avatarUrl) {
  const response = await fetch(
    'https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/trpc/teachers.update',
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: teacherId,
        data: { avatarUrl },
      }),
    }
  );

  const result = await response.json();
  return result.result.data.success;
}

// 完整流程
async function handleAvatarUpload(teacherId, imageFile) {
  try {
    // 1. 上传图片到S3
    const avatarUrl = await uploadImageToS3(imageFile);
    
    // 2. 更新老师头像URL
    const success = await updateTeacherAvatar(teacherId, avatarUrl);
    
    if (success) {
      console.log('头像更新成功');
    }
  } catch (error) {
    console.error('头像上传失败:', error);
  }
}
```

**React Native完整示例**:
```javascript
import React from 'react';
import { TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';

function TeacherAvatarUpload({ teacherId, currentAvatarUrl }) {
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (imageUri) => {
      // 1. 准备FormData
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });

      // 2. 上传到S3
      const uploadResponse = await fetch(
        'https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/upload',
        {
          method: 'POST',
          credentials: 'include',
          body: formData,
        }
      );
      const uploadResult = await uploadResponse.json();
      const avatarUrl = uploadResult.url;

      // 3. 更新老师头像URL
      const updateResponse = await fetch(
        'https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/trpc/teachers.update',
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: teacherId,
            data: { avatarUrl },
          }),
        }
      );

      return avatarUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teacher', teacherId]);
      Alert.alert('成功', '头像更新成功');
    },
    onError: (error) => {
      Alert.alert('失败', '头像上传失败: ' + error.message);
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      uploadMutation.mutate(result.assets[0].uri);
    }
  };

  return (
    <TouchableOpacity onPress={pickImage}>
      <Image
        source={{ uri: currentAvatarUrl || DEFAULT_AVATAR }}
        style={styles.avatar}
      />
      {uploadMutation.isLoading && <LoadingOverlay />}
    </TouchableOpacity>
  );
}
```

---

## 七、常见问题 FAQ

### Q1: 如何查询指定城市的老师？

**A**: 有两种方式：

1. **前端筛选** (推荐): 调用`trpc.teachers.list`获取所有老师，然后根据`city`字段在前端筛选
   ```javascript
   const allTeachers = await fetchAllTeachers();
   const shanghaiTeachers = allTeachers.filter(t => 
     t.city && t.city.split(';').includes('上海')
   );
   ```

2. **后端查询**: 使用`trpc.teachers.getAvailable`接口，传入`cityId`参数

### Q2: 如何获取城市ID？

**A**: 调用`trpc.metadata.getAll`接口获取所有城市列表。城市ID需要从`cityPartnerConfig`表查询，或者直接使用城市名称进行筛选。

### Q3: 老师的城市数据存储在哪里？

**A**: 老师的城市数据存储在`user_role_cities`表中，字段名为`cities`，格式为JSON数组字符串，如`'["上海","天津"]'`。在`teachers.list`接口返回的数据中，`city`字段已经转换为分号分隔的字符串格式，如`"上海;天津"`。

### Q4: 如何判断老师是否在某个时间段可用？

**A**: 使用`trpc.teachers.getAvailable`接口，传入城市ID、日期、开始时间和课程时长，系统会自动过滤已有预约和不接客时段的老师。

### Q5: 老师的别名字段如何使用？

**A**: `aliases`字段存储为JSON数组字符串，如`'["橘子","小橘","橘子老师"]'`。前端需要先解析JSON，然后显示或用于搜索匹配。

```javascript
const aliases = teacher.aliases ? JSON.parse(teacher.aliases) : [];
console.log(aliases); // ["橘子", "小橘", "橘子老师"]
```

### Q6: 如何上传老师头像？

**A**: 分两步：
1. 先将图片上传到S3，获取URL
2. 调用`trpc.teachers.update`接口，更新`avatarUrl`字段

详见"六、老师头像上传 API"章节。

### Q7: 老师的统计数据包含哪些内容？

**A**: 包含授课次数(`classCount`)、总课时(`totalHours`)和总收入(`totalIncome`)。可以通过`trpc.teachers.getStats`查询单个老师的统计数据，或通过`trpc.teachers.getAllStats`查询所有老师的统计数据。

### Q8: 如何处理老师数据的缓存？

**A**: 建议使用React Query的缓存机制：
- 老师列表数据缓存5分钟
- 老师详情数据缓存10分钟
- 可用老师查询不缓存（实时查询）

```javascript
const { data } = useQuery({
  queryKey: ['teachers', 'list'],
  queryFn: fetchTeachers,
  staleTime: 5 * 60 * 1000, // 5分钟
  cacheTime: 10 * 60 * 1000, // 10分钟
});
```

---

## 八、完整示例：老师列表页面

以下是一个完整的React Native老师列表页面示例，包含城市筛选、搜索、详情查看等功能：

```javascript
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

const API_BASE_URL = 'https://3000-iuqodi4mitv8w5ppfyn9k-4f5fa239.sg1.manus.computer/api/trpc';
const DEFAULT_AVATAR = 'https://via.placeholder.com/100';

function TeacherListScreen() {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [selectedCity, setSelectedCity] = useState('全部');

  // 获取所有老师
  const { data: teachers, isLoading } = useQuery({
    queryKey: ['teachers', 'list'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/teachers.list`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      return result.result.data;
    },
  });

  // 获取城市列表
  const { data: metadata } = useQuery({
    queryKey: ['metadata', 'all'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/metadata.getAll`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      return result.result.data.data;
    },
  });

  // 筛选老师
  const filteredTeachers = useMemo(() => {
    if (!teachers) return [];

    return teachers.filter(teacher => {
      // 城市筛选
      if (selectedCity !== '全部') {
        const cities = teacher.city ? teacher.city.split(';') : [];
        if (!cities.includes(selectedCity)) return false;
      }

      // 搜索筛选
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        return (
          teacher.name?.toLowerCase().includes(searchLower) ||
          teacher.nickname?.toLowerCase().includes(searchLower) ||
          teacher.phone?.includes(searchText)
        );
      }

      return true;
    });
  }, [teachers, selectedCity, searchText]);

  const renderTeacherCard = ({ item: teacher }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('TeacherDetail', { teacherId: teacher.id })}
    >
      <Image
        source={{ uri: teacher.avatarUrl || DEFAULT_AVATAR }}
        style={styles.avatar}
      />
      <View style={styles.info}>
        <Text style={styles.name}>{teacher.name}</Text>
        {teacher.nickname && (
          <Text style={styles.nickname}>昵称: {teacher.nickname}</Text>
        )}
        <Text style={styles.cities}>
          工作城市: {teacher.city || '未设置'}
        </Text>
        <Text style={styles.attribute}>
          属性: {teacher.teacherAttribute || '未设置'}
        </Text>
        {teacher.hourlyRate && (
          <Text style={styles.rate}>课时费: ¥{teacher.hourlyRate}/小时</Text>
        )}
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 搜索框 */}
      <TextInput
        style={styles.searchInput}
        placeholder="搜索老师姓名、昵称或手机号"
        value={searchText}
        onChangeText={setSearchText}
      />

      {/* 城市筛选 */}
      <View style={styles.cityFilter}>
        <TouchableOpacity
          style={[
            styles.cityButton,
            selectedCity === '全部' && styles.cityButtonActive,
          ]}
          onPress={() => setSelectedCity('全部')}
        >
          <Text
            style={[
              styles.cityButtonText,
              selectedCity === '全部' && styles.cityButtonTextActive,
            ]}
          >
            全部
          </Text>
        </TouchableOpacity>
        {metadata?.cities.map(city => (
          <TouchableOpacity
            key={city}
            style={[
              styles.cityButton,
              selectedCity === city && styles.cityButtonActive,
            ]}
            onPress={() => setSelectedCity(city)}
          >
            <Text
              style={[
                styles.cityButtonText,
                selectedCity === city && styles.cityButtonTextActive,
              ]}
            >
              {city}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 老师列表 */}
      <FlatList
        data={filteredTeachers}
        renderItem={renderTeacherCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text>暂无老师数据</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    backgroundColor: '#fff',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    fontSize: 16,
  },
  cityFilter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexWrap: 'wrap',
  },
  cityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
    marginBottom: 8,
  },
  cityButtonActive: {
    backgroundColor: '#2196F3',
  },
  cityButtonText: {
    fontSize: 14,
    color: '#666',
  },
  cityButtonTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  nickname: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  cities: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  attribute: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  rate: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  arrow: {
    fontSize: 24,
    color: '#ccc',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
});

export default TeacherListScreen;
```

---

## 九、技术支持

如有任何问题或需要进一步的技术支持，请联系后端开发团队。

**文档版本**: v1.0
**最后更新**: 2026-02-24
**维护团队**: 课程交付CRM系统后端团队
