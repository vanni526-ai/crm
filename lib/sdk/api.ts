/**
 * API客户端单例实例
 * 
 * 使用方法:
 * ```typescript
 * import api from '@/lib/sdk/api';
 * 
 * // 登录
 * await api.auth.login({ username: 'test', password: '123456' });
 * 
 * // 调用API
 * const orders = await api.orders.myOrders();
 * ```
 */

import { createApiClient } from './api-client';

// 创建API客户端实例
const api = createApiClient({
  autoDetect: true,  // 自动检测环境
  tokenStorage: 'asyncStorage',  // 自动选择存储方式（React Native使用AsyncStorage，Web使用localStorage）
  debug: true,  // 启用调试日志
  timeout: 30000,
  retryCount: 3,
});

export default api;
