# React Native 快速集成指南

本指南帮助您在React Native项目中快速集成CRM API客户端SDK,一次性解决所有常见的开发问题。

## 第一步:复制SDK文件

将`api-client.ts`文件复制到您的React Native项目中:

```bash
# 在您的React Native项目根目录
mkdir -p src/sdk
cp /path/to/api-client.ts src/sdk/
```

## 第二步:安装依赖

```bash
# 安装AsyncStorage(用于Token持久化存储)
npm install @react-native-async-storage/async-storage
# 或
yarn add @react-native-async-storage/async-storage
```

## 第三步:创建API实例

在项目中创建一个全局API实例:

```typescript
// src/api/index.ts
import { createApiClient } from '../sdk/api-client';

// 创建API客户端实例
const api = createApiClient({
  // 开发时启用调试日志
  debug: __DEV__,
  
  // 可选:手动指定API地址(默认自动检测)
  // baseUrl: 'https://your-api-domain.com',
});

export default api;
```

## 第四步:实现登录

```typescript
// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import api from '../api';

export function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('错误', '请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      const result = await api.auth.login({ username, password });
      
      if (result.success) {
        // 登录成功,跳转到主页
        navigation.replace('Home');
      } else {
        Alert.alert('登录失败', result.error || '用户名或密码错误');
      }
    } catch (error) {
      Alert.alert('网络错误', '请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <TextInput
        placeholder="用户名"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="密码"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
      />
      <Button
        title={loading ? '登录中...' : '登录'}
        onPress={handleLogin}
        disabled={loading}
      />
    </View>
  );
}
```

## 第五步:检查登录状态

```typescript
// src/screens/SplashScreen.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import api from '../api';

export function SplashScreen({ navigation }) {
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    const isLoggedIn = await api.auth.isLoggedIn();
    
    if (isLoggedIn) {
      navigation.replace('Home');
    } else {
      navigation.replace('Login');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
```

## 第六步:调用API

```typescript
// src/screens/OrdersScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, Button, Alert } from 'react-native';
import api from '../api';

export function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const result = await api.orders.myOrders({ limit: 20 });
      setOrders(result.orders);
    } catch (error) {
      if (error.code === 'UNAUTHORIZED') {
        // Token过期,跳转到登录页
        navigation.replace('Login');
      } else {
        Alert.alert('错误', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async () => {
    try {
      const result = await api.orders.userCreate({
        customerName: '测试客户',
        paymentAmount: '1000.00',
        deliveryCity: '上海',
        deliveryCourse: '基础课程',
      });
      
      Alert.alert('成功', `订单创建成功: ${result.orderNo}`);
      loadOrders(); // 刷新列表
    } catch (error) {
      Alert.alert('错误', error.message);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Button title="创建订单" onPress={createOrder} />
      <FlatList
        data={orders}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderBottomWidth: 1 }}>
            <Text>订单号: {item.orderNo}</Text>
            <Text>客户: {item.customerName}</Text>
            <Text>金额: ¥{item.paymentAmount}</Text>
          </View>
        )}
        refreshing={loading}
        onRefresh={loadOrders}
      />
    </View>
  );
}
```

## 第七步:统一错误处理

创建一个统一的错误处理Hook:

```typescript
// src/hooks/useApiError.ts
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export function useApiError() {
  const navigation = useNavigation();

  const handleError = useCallback((error: any) => {
    switch (error.code) {
      case 'UNAUTHORIZED':
        Alert.alert('登录已过期', '请重新登录', [
          { text: '确定', onPress: () => navigation.replace('Login') }
        ]);
        break;
      case 'FORBIDDEN':
        Alert.alert('权限不足', '您没有权限执行此操作');
        break;
      case 'NETWORK_ERROR':
        Alert.alert('网络错误', '请检查网络连接后重试');
        break;
      default:
        Alert.alert('错误', error.message || '操作失败');
    }
  }, [navigation]);

  return { handleError };
}

// 使用方式
function MyComponent() {
  const { handleError } = useApiError();

  const fetchData = async () => {
    try {
      const data = await api.orders.myOrders();
      // 处理数据
    } catch (error) {
      handleError(error);
    }
  };
}
```

## 常见问题

### Q: 开发时如何连接本地服务器?

A: SDK会自动检测环境。如果需要手动指定:

```typescript
const api = createApiClient({
  autoDetect: false,
  baseUrl: 'http://192.168.1.100:3000', // 您的本地IP
});
```

### Q: 如何在模拟器中测试?

A: 
- **Android模拟器**: 使用`10.0.2.2`代替`localhost`
- **iOS模拟器**: 直接使用`localhost`

SDK已自动处理这些差异。

### Q: Token存储在哪里?

A: 默认使用AsyncStorage存储,App重启后仍然有效。

### Q: 如何实现自动刷新Token?

A: SDK会在Token即将过期时自动尝试刷新。如果刷新失败,会抛出`UNAUTHORIZED`错误。

## 完整示例项目结构

```
src/
├── api/
│   └── index.ts          # API客户端实例
├── sdk/
│   └── api-client.ts     # SDK源码
├── hooks/
│   └── useApiError.ts    # 错误处理Hook
├── screens/
│   ├── SplashScreen.tsx  # 启动页
│   ├── LoginScreen.tsx   # 登录页
│   ├── HomeScreen.tsx    # 主页
│   └── OrdersScreen.tsx  # 订单页
└── App.tsx               # 入口文件
```

## 测试账号

- 用户名: `test`
- 密码: `123456`
