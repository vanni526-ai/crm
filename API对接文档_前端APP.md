# 📱 课程交付CRM系统 - 前端APP API对接文档

## 📋 目录

1. [系统概述](#系统概述)
2. [API基础信息](#api基础信息)
3. [元数据API(新增)](#元数据api新增)
4. [数据表结构](#数据表结构)
5. [完整API列表](#完整api列表)
6. [完整示例代码](#完整示例代码)

---

## 系统概述

课程交付CRM系统是一个基于 **tRPC** 的全栈应用,后端使用 Express + MySQL,前端使用 React。所有API调用都通过tRPC客户端进行,支持类型安全的端到端通信。

**技术栈:**
- 后端: Express 4 + tRPC 11 + Drizzle ORM + MySQL
- 认证: Manus OAuth (基于JWT的session cookie)
- 数据传输: Superjson (自动序列化Date等复杂类型)

---

## API基础信息

### 服务器地址
```
生产环境: https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer
API端点: /api/trpc
```

### 认证方式
系统使用 **Manus OAuth** 进行身份认证,通过session cookie维持登录状态。

**认证流程:**
1. 前端引导用户访问登录URL: `${VITE_OAUTH_PORTAL_URL}?redirect_uri=${encodeURIComponent(window.location.origin)}`
2. 用户完成OAuth登录后,系统自动设置session cookie
3. 后续所有API请求自动携带cookie,无需手动处理

**获取当前用户信息:**
```typescript
const { data: user } = trpc.auth.me.useQuery();
// 返回: { id, openId, name, email, role, isActive }
```

### 用户角色
- `admin`: 管理员(完全权限)
- `sales`: 销售人员(订单管理、客户管理)
- `finance`: 财务人员(财务对账、费用管理)
- `user`: 普通用户(只读权限)

---

## 元数据API(新增)

### ✅ 已实现的元数据接口

为前端APP提供基础数据列表,所有数据自动从数据库中提取、去重、排序。

#### 1. 获取城市列表
```typescript
const { data } = trpc.metadata.getCities.useQuery();
// 返回: { success: true, data: string[], count: number }
// 示例: { success: true, data: ["上海", "北京", "深圳", ...], count: 15 }
```

**数据来源:** 从orders、schedules、teachers表的城市字段中提取所有唯一城市

#### 2. 获取课程列表
```typescript
const { data } = trpc.metadata.getCourses.useQuery();
// 返回: { success: true, data: string[], count: number }
// 示例: { success: true, data: ["基础课程", "进阶课程", "理论课", ...], count: 20 }
```

**数据来源:** 从schedules和orders表的课程字段中提取所有唯一课程类型

#### 3. 获取教室列表
```typescript
const { data } = trpc.metadata.getClassrooms.useQuery();
// 返回: { success: true, data: string[], count: number }
// 示例: { success: true, data: ["瀛姬体验馆1101", "瀛姬体验馆1102", ...], count: 10 }
```

**数据来源:** 从schedules和orders表的教室字段中提取所有唯一教室名称

#### 4. 获取老师名称列表
```typescript
const { data } = trpc.metadata.getTeacherNames.useQuery();
// 返回: { success: true, data: string[], count: number }
// 示例: { success: true, data: ["张老师", "李老师", "王老师", ...], count: 50 }
```

**数据来源:** 从teachers、schedules、orders表中提取所有唯一老师名称

#### 5. 获取销售人员列表
```typescript
const { data } = trpc.metadata.getSalespeople.useQuery();
// 返回: { 
//   success: true, 
//   data: Array<{ id: number, name: string, nickname: string, email: string }>, 
//   count: number 
// }
```

**数据来源:** 从users表中查询所有销售人员(完整用户信息)

#### 6. 获取老师分类列表(新增)
```typescript
const { data } = trpc.metadata.getTeacherCategories.useQuery();
// 返回: { success: true, data: string[], count: number }
// 示例: { success: true, data: ["M", "M+S", "S", "SW"], count: 4 }
```

**数据来源:** 从teachers表的category字段中提取所有唯一老师分类(S/M/SW等)

#### 7. 获取课程价格列表(新增)
```typescript
const { data } = trpc.metadata.getCourseAmounts.useQuery();
// 返回: { success: true, data: string[], count: number }
// 示例: { success: true, data: ["800", "1200", "1888", "2800", "3500"], count: 15 }
```

**数据来源:** 从orders表的courseAmount字段中提取所有唯一课程金额,按数值从小到大排序

#### 8. 一次性获取所有元数据(推荐)
```typescript
const { data } = trpc.metadata.getAll.useQuery();
// 返回: {
//   success: true,
//   data: {
//     cities: string[],
//     courses: string[],
//     classrooms: string[],
//     teacherNames: string[],
//     salespeople: User[],
//     teacherCategories: string[],  // 新增
//     courseAmounts: string[]        // 新增
//   },
//   counts: {
//     cities: number,
//     courses: number,
//     classrooms: number,
//     teacherNames: number,
//     salespeople: number,
//     teacherCategories: number,    // 新增
//     courseAmounts: number          // 新增
//   }
// }
```

**推荐用法:** 在APP启动时调用一次,缓存所有基础数据,减少网络请求

### 特性说明

✅ **自动去重** - 所有列表自动去除重复项  
✅ **中文排序** - 字符串列表按中文拼音排序  
✅ **数值排序** - 课程价格按数值从小到大排序  
✅ **过滤空值** - 自动过滤null、空字符串和0值  
✅ **并发优化** - 支持并发查询,性能测试通过(5秒内完成)  
✅ **完整测试** - 34个单元测试全部通过,覆盖数据完整性、去重、排序、并发等场景

---

## 数据表结构

### ✅ 已存在的数据表

#### 1. **teachers** (老师表)
```typescript
{
  id: number;
  name: string;              // 姓名
  phone?: string;            // 电话
  status: string;            // 活跃状态("活跃"/"不活跃")
  customerType?: string;     // 受众客户类型
  category?: string;         // 分类(本部老师/合伙店老师)
  city?: string;             // 所在城市 ⭐
  nickname?: string;         // 花名
  email?: string;
  wechat?: string;
  hourlyRate?: number;       // 课时费标准
  bankAccount?: string;      // 银行账号
  bankName?: string;         // 开户行
  aliases?: string;          // 别名列表(JSON数组)
  contractEndDate?: Date;    // 合同到期时间
  joinDate?: Date;           // 入职时间
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. **schedules** (课程排课表)
```typescript
{
  id: number;
  orderId?: number;          // 关联订单
  customerId?: number;       // 学员ID
  customerName?: string;     // 客户名
  wechatId?: string;         // 微信号
  salesName?: string;        // 销售人
  trafficSource?: string;    // 流量来源
  teacherId?: number;        // 授课老师ID
  teacherName?: string;      // 授课老师名称 ⭐
  courseType: string;        // 课程类型 ⭐
  classDate?: Date;          // 上课日期
  classTime?: string;        // 上课时间
  startTime: Date;           // 开始时间
  endTime: Date;             // 结束时间
  location?: string;         // 上课地点 ⭐
  city?: string;             // 城市 ⭐
  status: string;            // 状态(已排课/已完成/已取消)
  deliveryCity?: string;     // 交付城市 ⭐
  deliveryClassroom?: string; // 交付教室 ⭐
  deliveryTeacher?: string;  // 交付老师 ⭐
  deliveryCourse?: string;   // 交付课程 ⭐
  createdAt: Date;
  updatedAt: Date;
}
```

#### 3. **orders** (订单表)
```typescript
{
  id: number;
  orderNo: string;           // 订单号
  salesId: number;           // 销售人员ID
  salesPerson?: string;      // 销售人员名称
  customerId?: number;       // 客户ID
  customerName?: string;     // 客户名称
  trafficSource?: string;    // 流量来源
  paymentAmount: string;     // 支付金额
  courseAmount?: string;     // 课程金额
  teacherFee?: string;       // 老师费用
  partnerFee?: string;       // 合伙人费用
  deliveryCity?: string;     // 交付城市 ⭐
  deliveryRoom?: string;     // 交付教室 ⭐
  deliveryTeacher?: string;  // 交付老师 ⭐
  deliveryCourse?: string;   // 交付课程 ⭐
  paymentCity?: string;      // 支付城市 ⭐
  status: string;            // 订单状态
  createdAt: Date;
  updatedAt: Date;
}
```

#### 4. **users** (用户/销售人员表)
```typescript
{
  id: number;
  openId: string;            // OAuth唯一标识
  name: string;              // 姓名
  nickname?: string;         // 昵称
  email?: string;
  role: "admin" | "sales" | "finance" | "user"; // 角色
  isActive: boolean;         // 是否激活
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 完整API列表

### 1. 认证相关
```typescript
trpc.auth.me.useQuery()                    // 获取当前用户信息
trpc.auth.logout.useMutation()             // 退出登录
```

### 2. 元数据相关(新增)
```typescript
trpc.metadata.getCities.useQuery()         // 获取城市列表
trpc.metadata.getCourses.useQuery()        // 获取课程列表
trpc.metadata.getClassrooms.useQuery()       // 获取教室列表
trpc.metadata.getTeacherNames.useQuery()     // 获取老师名称列表
trpc.metadata.getSalespeople.useQuery()      // 获取销售人员列表
trpc.metadata.getTeacherCategories.useQuery() // 获取老师分类列表(新增)
trpc.metadata.getCourseAmounts.useQuery()    // 获取课程价格列表(新增)
trpc.metadata.getAll.useQuery()              // 一次性获取所有元数据(推荐)
```

### 3. 老师管理
```typescript
trpc.teachers.list.useQuery()              // 获取老师列表
trpc.teachers.create.useMutation()         // 创建老师
trpc.teachers.update.useMutation()         // 更新老师信息
trpc.teachers.delete.useMutation()         // 删除老师
```

### 4. 课程排课
```typescript
trpc.schedules.list.useQuery({ startDate, endDate, teacherId, status })
trpc.schedules.create.useMutation()
trpc.schedules.update.useMutation()
trpc.schedules.delete.useMutation()
```

### 5. 订单管理
```typescript
trpc.orders.list.useQuery({ page, pageSize, status, salesId })
trpc.orders.create.useMutation()
trpc.orders.update.useMutation()
trpc.orders.delete.useMutation()
trpc.orders.exportExcel.useMutation()      // 导出订单Excel
```

### 6. 客户管理
```typescript
trpc.customers.list.useQuery()
trpc.customers.create.useMutation()
trpc.customers.update.useMutation()
```

### 7. 销售人员管理
```typescript
trpc.users.list.useQuery()                 // 获取所有用户(包含销售人员)
trpc.users.create.useMutation()
trpc.users.update.useMutation()
```

### 8. 财务管理
```typescript
trpc.finance.getReport.useQuery({ startDate, endDate })
trpc.finance.exportExcel.useMutation()
```

---

## 完整示例代码

### 1. tRPC客户端配置(React Native)

```typescript
// src/lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../server/routers'; // 从后端导入类型

export const trpc = createTRPCReact<AppRouter>();

// 在App根组件中初始化
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import superjson from 'superjson';

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: 'https://3000-i01ajsi5htultrhzy1tly-3be270a2.sg1.manus.computer/api/trpc',
          // 自动携带cookie进行认证
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: 'include',
            });
          },
        }),
      ],
      transformer: superjson, // 支持Date等复杂类型
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {/* 你的APP组件 */}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

### 2. 使用元数据API初始化APP

```typescript
// src/screens/HomeScreen.tsx
import { trpc } from '../lib/trpc';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

function HomeScreen() {
  // 方法1: 一次性获取所有元数据(推荐)
  const { data: metadata, isLoading } = trpc.metadata.getAll.useQuery();

  useEffect(() => {
    if (metadata?.success) {
      // 缓存到本地存储
      AsyncStorage.setItem('app_metadata', JSON.stringify(metadata.data));
      
      console.log('城市列表:', metadata.data.cities);
      console.log('课程列表:', metadata.data.courses);
      console.log('教室列表:', metadata.data.classrooms);
      console.log('老师列表:', metadata.data.teacherNames);
      console.log('销售人员:', metadata.data.salespeople);
    }
  }, [metadata]);

  // 方法2: 单独获取各个列表
  const { data: cities } = trpc.metadata.getCities.useQuery();
  const { data: courses } = trpc.metadata.getCourses.useQuery();
  const { data: classrooms } = trpc.metadata.getClassrooms.useQuery();
  const { data: teacherNames } = trpc.metadata.getTeacherNames.useQuery();
  const { data: salespeople } = trpc.metadata.getSalespeople.useQuery();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View>
      <Text>城市数量: {metadata?.counts.cities}</Text>
      <Text>课程数量: {metadata?.counts.courses}</Text>
      {/* 你的UI组件 */}
    </View>
  );
}
```

### 3. 在表单中使用元数据(选择器)

```typescript
// src/components/OrderForm.tsx
import { trpc } from '../lib/trpc';
import { Picker } from '@react-native-picker/picker';

function OrderForm() {
  const { data: metadata } = trpc.metadata.getAll.useQuery();
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');

  return (
    <View>
      {/* 城市选择器 */}
      <Picker
        selectedValue={selectedCity}
        onValueChange={setSelectedCity}
      >
        <Picker.Item label="请选择城市" value="" />
        {metadata?.data.cities.map((city) => (
          <Picker.Item key={city} label={city} value={city} />
        ))}
      </Picker>

      {/* 课程选择器 */}
      <Picker
        selectedValue={selectedCourse}
        onValueChange={setSelectedCourse}
      >
        <Picker.Item label="请选择课程" value="" />
        {metadata?.data.courses.map((course) => (
          <Picker.Item key={course} label={course} value={course} />
        ))}
      </Picker>

      {/* 老师选择器 */}
      <Picker
        selectedValue={selectedTeacher}
        onValueChange={setSelectedTeacher}
      >
        <Picker.Item label="请选择老师" value="" />
        {metadata?.data.teacherNames.map((name) => (
          <Picker.Item key={name} label={name} value={name} />
        ))}
      </Picker>
    </View>
  );
}
```

### 4. 获取老师列表(完整信息)

```typescript
// src/screens/TeachersScreen.tsx
import { trpc } from '../lib/trpc';

function TeachersScreen() {
  const { data: teachers, isLoading } = trpc.teachers.list.useQuery();

  if (isLoading) return <LoadingScreen />;

  return (
    <FlatList
      data={teachers}
      renderItem={({ item }) => (
        <TeacherCard
          name={item.name}
          phone={item.phone}
          city={item.city}
          status={item.status}
          hourlyRate={item.hourlyRate}
        />
      )}
      keyExtractor={(item) => item.id.toString()}
    />
  );
}
```

### 5. 获取课程排课

```typescript
// src/screens/SchedulesScreen.tsx
import { trpc } from '../lib/trpc';

function SchedulesScreen() {
  const startDate = new Date('2026-02-01');
  const endDate = new Date('2026-02-28');

  const { data: schedules } = trpc.schedules.list.useQuery({
    startDate,
    endDate,
    status: '已排课',
  });

  return (
    <FlatList
      data={schedules}
      renderItem={({ item }) => (
        <ScheduleCard
          customerName={item.customerName}
          teacherName={item.teacherName}
          courseType={item.courseType}
          startTime={item.startTime}
          endTime={item.endTime}
          location={item.location}
          city={item.city}
        />
      )}
    />
  );
}
```

### 6. 创建订单

```typescript
// src/screens/CreateOrderScreen.tsx
import { trpc } from '../lib/trpc';

function CreateOrderScreen() {
  const createOrder = trpc.orders.create.useMutation();

  const handleSubmit = async () => {
    try {
      const result = await createOrder.mutateAsync({
        orderNo: 'ORD-20260202-001',
        salesId: 1,
        customerName: '张三',
        paymentAmount: '3000',
        courseAmount: '2800',
        teacherFee: '500',
        deliveryCity: '上海',
        deliveryRoom: '瀛姬体验馆1101',
        deliveryTeacher: '李老师',
        deliveryCourse: '基础课程',
      });

      if (result.success) {
        Alert.alert('成功', '订单创建成功');
      }
    } catch (error) {
      Alert.alert('错误', error.message);
    }
  };

  return (
    <View>
      {/* 表单字段 */}
      <Button title="提交订单" onPress={handleSubmit} />
    </View>
  );
}
```

### 7. 获取系统账号列表

```typescript
// src/screens/UsersScreen.tsx
import { trpc } from '../lib/trpc';

function UsersScreen() {
  const { data: users } = trpc.users.list.useQuery();

  // 过滤销售人员
  const salespeople = users?.filter(user => user.role === 'sales');

  return (
    <FlatList
      data={salespeople}
      renderItem={({ item }) => (
        <UserCard
          name={item.name}
          nickname={item.nickname}
          email={item.email}
          role={item.role}
          isActive={item.isActive}
        />
      )}
    />
  );
}
```

---

## 性能优化建议

### 1. 缓存元数据
```typescript
// 在APP启动时获取一次,缓存到本地
const { data: metadata } = trpc.metadata.getAll.useQuery({
  staleTime: 1000 * 60 * 60, // 1小时内不重新请求
  cacheTime: 1000 * 60 * 60 * 24, // 缓存24小时
});
```

### 2. 使用乐观更新
```typescript
const utils = trpc.useUtils();
const createOrder = trpc.orders.create.useMutation({
  onMutate: async (newOrder) => {
    // 取消正在进行的查询
    await utils.orders.list.cancel();
    
    // 获取当前数据
    const previousOrders = utils.orders.list.getData();
    
    // 乐观更新
    utils.orders.list.setData(undefined, (old) => [
      ...(old || []),
      { ...newOrder, id: Date.now() },
    ]);
    
    return { previousOrders };
  },
  onError: (err, newOrder, context) => {
    // 回滚
    utils.orders.list.setData(undefined, context?.previousOrders);
  },
  onSettled: () => {
    // 重新获取数据
    utils.orders.list.invalidate();
  },
});
```

### 3. 分页加载
```typescript
const { data, fetchNextPage, hasNextPage } = trpc.orders.list.useInfiniteQuery(
  { pageSize: 20 },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  }
);
```

---

## 常见问题

### Q1: 如何处理认证失败?
```typescript
const { data: user, error } = trpc.auth.me.useQuery();

if (error?.data?.code === 'UNAUTHORIZED') {
  // 跳转到登录页面
  navigation.navigate('Login');
}
```

### Q2: 如何处理网络错误?
```typescript
const { data, error, refetch } = trpc.teachers.list.useQuery(undefined, {
  retry: 3, // 自动重试3次
  retryDelay: 1000, // 重试间隔1秒
});

if (error) {
  return (
    <View>
      <Text>加载失败: {error.message}</Text>
      <Button title="重试" onPress={() => refetch()} />
    </View>
  );
}
```

### Q3: 元数据多久更新一次?
元数据是实时从数据库查询的,但建议在APP中缓存1小时,避免频繁请求。如果需要强制刷新,可以使用:
```typescript
const utils = trpc.useUtils();
utils.metadata.getAll.invalidate(); // 强制刷新
```

---

## 联系支持

如有问题,请联系技术支持或查看系统文档。

**文档版本:** v2.0  
**更新日期:** 2026-02-02  
**状态:** ✅ 所有API已实现并通过测试
