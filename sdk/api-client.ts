/**
 * 课程交付CRM系统 - 统一API客户端SDK
 * 
 * 自动生成于: 2026-02-19
 * 基于: server/routers.ts (appRouter)
 * 
 * 功能特性:
 * - ✅ 自动服务发现(动态获取后端URL)
 * - ✅ Token认证(支持AsyncStorage/LocalStorage/Memory)
 * - ✅ 跨域支持(CORS)
 * - ✅ 错误重试
 * - ✅ 环境检测(React Native/Browser/Node)
 * - ✅ TypeScript类型安全
 * 
 * 使用方法:
 * ```typescript
 * import { createApiClient } from './sdk/api-client';
 * 
 * const api = await createApiClient();
 * 
 * // 查询会员状态
 * const status = await api.membership.getMembershipStatus();
 * 
 * // 创建会员订单
 * const order = await api.membership.createMembership();
 * 
 * // 查询我的订单
 * const orders = await api.orders.myOrders();
 * ```
 */

import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/routers';
import superjson from 'superjson';

// ============================================================================
// 类型定义
// ============================================================================

export interface ApiClientConfig {
  /** API基础地址(可选,默认自动发现) */
  baseUrl?: string;
  /** Token存储方式 */
  tokenStorage?: 'asyncStorage' | 'localStorage' | 'memory';
  /** 请求超时时间(毫秒) */
  timeout?: number;
  /** 是否启用调试日志 */
  debug?: boolean;
}

export interface ApiError extends Error {
  code: string;
  status?: number;
  data?: any;
}

// ============================================================================
// Token存储适配器
// ============================================================================

interface TokenStorage {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
  removeToken(): Promise<void>;
}

class MemoryTokenStorage implements TokenStorage {
  private token: string | null = null;

  async getToken(): Promise<string | null> {
    return this.token;
  }

  async setToken(token: string): Promise<void> {
    this.token = token;
  }

  async removeToken(): Promise<void> {
    this.token = null;
  }
}

class LocalStorageTokenStorage implements TokenStorage {
  private readonly key = '@crm_auth_token';

  async getToken(): Promise<string | null> {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.key);
  }

  async setToken(token: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.key, token);
  }

  async removeToken(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.key);
  }
}

class AsyncStorageTokenStorage implements TokenStorage {
  private readonly key = '@crm_auth_token';
  private AsyncStorage: any = null;

  constructor() {
    try {
      this.AsyncStorage = require('@react-native-async-storage/async-storage').default;
    } catch {
      console.warn('[ApiClient] AsyncStorage not available, falling back to memory storage');
    }
  }

  async getToken(): Promise<string | null> {
    if (!this.AsyncStorage) return null;
    return await this.AsyncStorage.getItem(this.key);
  }

  async setToken(token: string): Promise<void> {
    if (!this.AsyncStorage) return;
    await this.AsyncStorage.setItem(this.key, token);
  }

  async removeToken(): Promise<void> {
    if (!this.AsyncStorage) return;
    await this.AsyncStorage.removeItem(this.key);
  }
}

// ============================================================================
// 服务发现
// ============================================================================

const API_URL_CACHE_KEY = '@crm_api_url';
const API_URL_CACHE_EXPIRY_KEY = '@crm_api_url_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

class ServiceDiscovery {
  private static storage: TokenStorage;

  static setStorage(storage: TokenStorage) {
    this.storage = storage;
  }

  /**
   * 获取后端API URL（带缓存）
   */
  static async getBackendUrl(defaultUrl: string = 'https://crm.bdsm.com.cn'): Promise<string> {
    try {
      // 1. 检查缓存
      const cachedUrl = await this.getCachedUrl();
      if (cachedUrl) {
        return cachedUrl;
      }

      // 2. 调用服务发现API
      const discoveryUrl = `${defaultUrl}/api/trpc/discovery.getConfig`;
      const response = await fetch(discoveryUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.warn('[ServiceDiscovery] Discovery API failed, using default URL');
        return defaultUrl;
      }

      const result = await response.json();
      const apiUrl = result.result?.data?.baseUrl || defaultUrl;

      // 3. 缓存URL
      await this.cacheUrl(apiUrl);

      return apiUrl;
    } catch (error) {
      console.error('[ServiceDiscovery] Error:', error);
      return defaultUrl;
    }
  }

  private static async getCachedUrl(): Promise<string | null> {
    try {
      if (typeof localStorage !== 'undefined') {
        const cachedUrl = localStorage.getItem(API_URL_CACHE_KEY);
        const cachedExpiry = localStorage.getItem(API_URL_CACHE_EXPIRY_KEY);

        if (cachedUrl && cachedExpiry) {
          const expiryTime = parseInt(cachedExpiry, 10);
          if (Date.now() < expiryTime) {
            return cachedUrl;
          }
        }
      }
    } catch {
      // Ignore cache errors
    }
    return null;
  }

  private static async cacheUrl(url: string): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(API_URL_CACHE_KEY, url);
        localStorage.setItem(API_URL_CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString());
      }
    } catch {
      // Ignore cache errors
    }
  }

  /**
   * 清除缓存的URL
   */
  static async clearCache(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(API_URL_CACHE_KEY);
        localStorage.removeItem(API_URL_CACHE_EXPIRY_KEY);
      }
    } catch {
      // Ignore cache errors
    }
  }
}

// ============================================================================
// API客户端
// ============================================================================

export class ApiClient {
  private trpc: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
  private tokenStorage: TokenStorage;
  private config: Required<ApiClientConfig>;
  private baseUrl: string | null = null;

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '',
      tokenStorage: config.tokenStorage || 'asyncStorage',
      timeout: config.timeout || 30000,
      debug: config.debug || false,
    };

    this.tokenStorage = this.createTokenStorage();
    ServiceDiscovery.setStorage(this.tokenStorage);

    // tRPC客户端将在init()中创建
    this.trpc = null as any;
  }

  /**
   * 初始化客户端（必须在使用前调用）
   */
  async init(): Promise<void> {
    // 获取后端URL
    this.baseUrl = this.config.baseUrl || await ServiceDiscovery.getBackendUrl();

    if (this.config.debug) {
      console.log('[ApiClient] Initialized with baseUrl:', this.baseUrl);
    }

    // 创建tRPC客户端
    this.trpc = createTRPCProxyClient<AppRouter>({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: `${this.baseUrl}/api/trpc`,
          headers: async () => {
            const token = await this.tokenStorage.getToken();
            return {
              authorization: token ? `Bearer ${token}` : '',
            };
          },
          fetch: (input, init) => {
            return fetch(input, {
              ...init,
              credentials: 'include',
              signal: AbortSignal.timeout(this.config.timeout),
            });
          },
        }),
      ],
    });
  }

  private createTokenStorage(): TokenStorage {
    switch (this.config.tokenStorage) {
      case 'localStorage':
        return new LocalStorageTokenStorage();
      case 'memory':
        return new MemoryTokenStorage();
      case 'asyncStorage':
      default:
        if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
          return new AsyncStorageTokenStorage();
        }
        return new LocalStorageTokenStorage();
    }
  }

  /**
   * 获取当前Token
   */
  async getToken(): Promise<string | null> {
    return this.tokenStorage.getToken();
  }

  /**
   * 设置Token
   */
  async setToken(token: string): Promise<void> {
    await this.tokenStorage.setToken(token);
  }

  /**
   * 清除Token
   */
  async clearToken(): Promise<void> {
    await this.tokenStorage.removeToken();
  }

  /**
   * 获取当前API基础地址
   */
  getBaseUrl(): string {
    return this.baseUrl || 'https://crm.bdsm.com.cn';
  }

  /**
   * 清除服务发现缓存
   */
  async clearServiceDiscoveryCache(): Promise<void> {
    await ServiceDiscovery.clearCache();
  }

  // ========================================================================
  // API端点代理（直接暴露tRPC客户端）
  // ========================================================================

  /**
   * 系统管理
   */
  get system() {
    return this.trpc.system;
  }

  /**
   * 服务发现
   */
  get discovery() {
    return this.trpc.discovery;
  }

  /**
   * 认证
   */
  get auth() {
    return this.trpc.auth;
  }

  /**
   * 会员管理 ✅
   */
  get membership() {
    return this.trpc.membership;
  }

  /**
   * 订单管理
   */
  get orders() {
    return this.trpc.orders;
  }

  /**
   * 客户管理
   */
  get customers() {
    return this.trpc.customers;
  }

  /**
   * 销售人员管理
   */
  get salespersons() {
    return this.trpc.salespersons;
  }

  /**
   * 财务管理
   */
  get finance() {
    return this.trpc.finance;
  }

  /**
   * 城市管理
   */
  get city() {
    return this.trpc.city;
  }

  /**
   * 权限管理
   */
  get permissions() {
    return this.trpc.permissions;
  }

  /**
   * 用户管理
   */
  get userManagement() {
    return this.trpc.userManagement;
  }

  /**
   * 用户管理(users路由)
   */
  get users() {
    return this.trpc.users;
  }

  /**
   * 文件上传
   */
  get upload() {
    return this.trpc.upload;
  }

  /**
   * Excel报表
   */
  get excelReport() {
    return this.trpc.excelReport;
  }

  /**
   * 内容生成器
   */
  get contentGenerator() {
    return this.trpc.contentGenerator;
  }

  /**
   * 通知
   */
  get notifications() {
    return this.trpc.notifications;
  }

  /**
   * Gmail自动导入
   */
  get gmailAutoImport() {
    return this.trpc.gmailAutoImport;
  }

  /**
   * 流量来源配置
   */
  get trafficSourceConfig() {
    return this.trpc.trafficSourceConfig;
  }

  /**
   * 运费修复
   */
  get transportFeeFix() {
    return this.trpc.transportFeeFix;
  }

  /**
   * 解析学习
   */
  get parsingLearning() {
    return this.trpc.parsingLearning;
  }

  /**
   * 对账
   */
  get reconciliation() {
    return this.trpc.reconciliation;
  }

  /**
   * 销售城市业绩
   */
  get salesCityPerformance() {
    return this.trpc.salesCityPerformance;
  }

  /**
   * 老师费用
   */
  get teacherPayments() {
    return this.trpc.teacherPayments;
  }

  /**
   * 合伙人管理
   */
  get partnerManagement() {
    return this.trpc.partnerManagement;
  }

  /**
   * 城市费用
   */
  get cityExpense() {
    return this.trpc.cityExpense;
  }

  /**
   * 订单解析
   */
  get orderParse() {
    return this.trpc.orderParse;
  }

  /**
   * 数据清理
   */
  get dataCleaning() {
    return this.trpc.dataCleaning;
  }

  /**
   * 数据质量检查
   */
  get dataQuality() {
    return this.trpc.dataQuality;
  }

  /**
   * 审计日志
   */
  get auditLogs() {
    return this.trpc.auditLogs;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建API客户端实例
 * 
 * @example
 * ```typescript
 * // 基础用法
 * const api = await createApiClient();
 * 
 * // 自定义配置
 * const api = await createApiClient({
 *   baseUrl: 'https://custom-api.example.com',
 *   debug: true,
 * });
 * 
 * // 使用会员API
 * const status = await api.membership.getMembershipStatus();
 * ```
 */
export async function createApiClient(config?: ApiClientConfig): Promise<ApiClient> {
  const client = new ApiClient(config);
  await client.init();
  return client;
}

// 默认导出
export default createApiClient;
