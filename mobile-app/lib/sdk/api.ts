/**
 * 瀛姬App - SDK API 默认实例
 *
 * 统一导出 API 客户端实例，所有页面通过此模块访问 API
 */

import { createApiClient, ApiClient } from './api-client';

const api: ApiClient = createApiClient({
  autoDetect: true,
  tokenStorage: 'asyncStorage',
  debug: __DEV__ ?? false,
  timeout: 30000,
  retryCount: 2,
});

export default api;
export { api, createApiClient };
export type { ApiClient };
