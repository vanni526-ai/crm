/**
 * 课程交付CRM系统 - 统一API客户端SDK
 * 
 * 一次性解决以下问题:
 * - 跨域问题(CORS)
 * - 代理问题
 * - 端口问题
 * - 接口地址问题
 * - 权限问题
 * - 缓存问题
 * - Token认证问题
 * 
 * 使用方法:
 * ```typescript
 * import { createApiClient } from './api-client';
 * const api = createApiClient();
 * 
 * // 登录
 * await api.auth.login({ username: 'test', password: '123456' });
 * 
 * // 调用API
 * const orders = await api.orders.myOrders();
 * ```
 */

// ============================================================================
// 类型定义
// ============================================================================

export interface ApiClientConfig {
  /** 是否自动检测环境并选择API地址 */
  autoDetect?: boolean;
  /** 手动指定API基础地址 */
  baseUrl?: string;
  /** Token存储方式 */
  tokenStorage?: 'asyncStorage' | 'localStorage' | 'memory';
  /** 请求超时时间(毫秒) */
  timeout?: number;
  /** 失败重试次数 */
  retryCount?: number;
  /** 是否启用调试日志 */
  debug?: boolean;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    openId: string;
    name: string;
    role: string;
  };
  error?: string;
}

export interface CreateOrderInput {
  customerName: string;
  paymentAmount: string;
  courseAmount?: string;
  deliveryCity?: string;
  deliveryCourse?: string;
  teacherName?: string;
  teacherFee?: string;
  carFee?: string;
  classDate?: string;
  classTime?: string;
  notes?: string;
}

export interface Order {
  id: number;
  orderNo: string;
  customerName: string;
  paymentAmount: string;
  courseAmount: string;
  deliveryCity: string;
  deliveryCourse: string;
  status: string;
  createdAt: string;
}

export interface ApiError extends Error {
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'NETWORK_ERROR' | 'SERVER_ERROR' | 'UNKNOWN';
  status?: number;
  details?: unknown;
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
  private readonly key = 'crm_auth_token';

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
  private readonly key = 'crm_auth_token';
  private AsyncStorage: any = null;

  constructor() {
    // 延迟加载AsyncStorage,避免在Web环境报错
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.AsyncStorage = require('@react-native-async-storage/async-storage').default;
    } catch {
      // 如果加载失败,回退到内存存储
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
// 环境检测器
// ============================================================================

class EnvironmentDetector {
  /**
   * 自动检测当前运行环境并返回正确的API基础地址
   */
  static detectBaseUrl(): string {
    // 1. 检查是否在React Native环境
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
      return this.getReactNativeBaseUrl();
    }

    // 2. 检查是否在浏览器环境
    if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
      return this.getBrowserBaseUrl();
    }

    // 3. Node.js环境(测试)
    return 'http://localhost:3000';
  }

  private static getReactNativeBaseUrl(): string {
    // React Native环境下,需要使用实际的服务器地址
    // 开发时使用本地IP,生产时使用生产服务器地址
    
    // 检查是否有全局配置
    if (typeof global !== 'undefined' && (global as any).__CRM_API_URL__) {
      return (global as any).__CRM_API_URL__;
    }

    // 默认使用生产地址(需要在App启动时配置)
    return 'https://3000-irlkkknuolzcky4z8bb9y-38095cbd.sg1.manus.computer';
  }

  private static getBrowserBaseUrl(): string {
    const { hostname, port, protocol, origin } = window.location;

    // 本地开发环境
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:${port || '3000'}`;
    }

    // Manus沙箱预览环境
    if (hostname.includes('manus.computer') || hostname.includes('manus-asia.computer')) {
      return origin;
    }

    // 生产环境
    return origin;
  }

  /**
   * 检测当前环境类型
   */
  static getEnvironmentType(): 'react-native' | 'browser' | 'node' {
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
      return 'react-native';
    }
    if (typeof window !== 'undefined') {
      return 'browser';
    }
    return 'node';
  }
}

// ============================================================================
// 请求拦截器
// ============================================================================

class RequestInterceptor {
  private tokenStorage: TokenStorage;
  private debug: boolean;

  constructor(tokenStorage: TokenStorage, debug: boolean = false) {
    this.tokenStorage = tokenStorage;
    this.debug = debug;
  }

  /**
   * 构建完整的请求URL,包含Token和防缓存参数
   */
  async buildUrl(baseUrl: string, path: string, params?: Record<string, any>): Promise<string> {
    const url = new URL(path, baseUrl);

    // 添加查询参数
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    // 添加Token到URL参数(绕过CORS限制)
    const token = await this.tokenStorage.getToken();
    if (token) {
      url.searchParams.set('token', token);
    }

    // 添加时间戳防止缓存
    url.searchParams.set('_t', Date.now().toString());

    if (this.debug) {
      console.log('[ApiClient] Request URL:', url.toString());
    }

    return url.toString();
  }

  /**
   * 构建请求头
   */
  async buildHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 同时在Header中添加Token(作为备用)
    const token = await this.tokenStorage.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Auth-Token'] = token;
    }

    return headers;
  }
}

// ============================================================================
// 错误处理器
// ============================================================================

class ErrorHandler {
  /**
   * 将HTTP响应错误转换为ApiError
   */
  static fromResponse(response: Response, body?: any): ApiError {
    const error = new Error() as ApiError;
    error.status = response.status;
    error.details = body;

    switch (response.status) {
      case 401:
        error.code = 'UNAUTHORIZED';
        error.message = '认证失败,请重新登录';
        break;
      case 403:
        error.code = 'FORBIDDEN';
        error.message = '没有权限执行此操作';
        break;
      case 404:
        error.code = 'NOT_FOUND';
        error.message = '请求的资源不存在';
        break;
      case 500:
      case 502:
      case 503:
        error.code = 'SERVER_ERROR';
        error.message = '服务器错误,请稍后重试';
        break;
      default:
        error.code = 'UNKNOWN';
        error.message = body?.message || `请求失败(${response.status})`;
    }

    return error;
  }

  /**
   * 将网络错误转换为ApiError
   */
  static fromNetworkError(err: Error): ApiError {
    const error = new Error() as ApiError;
    error.code = 'NETWORK_ERROR';
    error.message = '网络连接失败,请检查网络';
    error.details = err;
    return error;
  }
}

// ============================================================================
// tRPC客户端
// ============================================================================

class TrpcClient {
  private baseUrl: string;
  private interceptor: RequestInterceptor;
  private timeout: number;
  private retryCount: number;
  private debug: boolean;

  constructor(
    baseUrl: string,
    interceptor: RequestInterceptor,
    timeout: number = 30000,
    retryCount: number = 3,
    debug: boolean = false
  ) {
    this.baseUrl = baseUrl;
    this.interceptor = interceptor;
    this.timeout = timeout;
    this.retryCount = retryCount;
    this.debug = debug;
  }

  /**
   * 执行tRPC查询
   */
  async query<T>(procedure: string, input?: any): Promise<T> {
    const path = `/api/trpc/${procedure}`;
    const params: Record<string, any> = {};
    
    if (input !== undefined) {
      params.input = JSON.stringify({ json: input });
    }

    return this.request<T>('GET', path, params);
  }

  /**
   * 执行tRPC变更
   */
  async mutate<T>(procedure: string, input?: any): Promise<T> {
    const path = `/api/trpc/${procedure}`;
    const body = input !== undefined ? { json: input } : undefined;

    return this.request<T>('POST', path, undefined, body);
  }

  /**
   * 执行HTTP请求
   */
  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    params?: Record<string, any>,
    body?: any
  ): Promise<T> {
    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        const url = await this.interceptor.buildUrl(this.baseUrl, path, params);
        const headers = await this.interceptor.buildHeaders();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        if (this.debug) {
          console.log(`[ApiClient] ${method} ${url}`, body);
        }

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseBody = await response.json();

        if (!response.ok) {
          throw ErrorHandler.fromResponse(response, responseBody);
        }

        // tRPC响应格式
        if (responseBody.result?.data?.json !== undefined) {
          return responseBody.result.data.json as T;
        }

        return responseBody as T;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          lastError = ErrorHandler.fromNetworkError(new Error('请求超时'));
        } else if ((err as ApiError).code) {
          lastError = err as ApiError;
          // 认证错误不重试
          if (lastError.code === 'UNAUTHORIZED' || lastError.code === 'FORBIDDEN') {
            throw lastError;
          }
        } else {
          lastError = ErrorHandler.fromNetworkError(err as Error);
        }

        if (this.debug) {
          console.warn(`[ApiClient] Request failed (attempt ${attempt + 1}/${this.retryCount + 1}):`, lastError);
        }

        // 等待后重试
        if (attempt < this.retryCount) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }
}

// ============================================================================
// API模块
// ============================================================================

class AuthApi {
  private trpc: TrpcClient;
  private tokenStorage: TokenStorage;

  constructor(trpc: TrpcClient, tokenStorage: TokenStorage) {
    this.trpc = trpc;
    this.tokenStorage = tokenStorage;
  }

  /**
   * 用户名密码登录
   */
  async login(input: LoginInput): Promise<LoginResult> {
    try {
      const result = await this.trpc.mutate<LoginResult>('auth.loginWithUserAccount', input);
      
      if (result.success && result.token) {
        await this.tokenStorage.setToken(result.token);
      }

      return result;
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  }

  /**
   * 检查是否已登录
   */
  async isLoggedIn(): Promise<boolean> {
    const token = await this.tokenStorage.getToken();
    if (!token) return false;

    try {
      const user = await this.trpc.query<any>('auth.me');
      return !!user;
    } catch {
      return false;
    }
  }

  /**
   * 获取当前用户信息
   */
  async me(): Promise<any> {
    return this.trpc.query('auth.me');
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    await this.tokenStorage.removeToken();
    try {
      await this.trpc.mutate('auth.logout');
    } catch {
      // 忽略登出错误
    }
  }

  /**
   * 刷新Token
   * @returns 刷新结果,包含新Token和过期时间
   */
  async refreshToken(): Promise<{ success: boolean; token?: string; expiresIn?: number }> {
    try {
      const currentToken = await this.tokenStorage.getToken();
      if (!currentToken) {
        return { success: false };
      }

      const result = await this.trpc.mutate<{ success: boolean; token: string; expiresIn: number }>(
        'auth.refreshToken',
        { token: currentToken }
      );
      
      if (result.success && result.token) {
        await this.tokenStorage.setToken(result.token);
        return {
          success: true,
          token: result.token,
          expiresIn: result.expiresIn,
        };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  }

  /**
   * 检查Token是否即将过期(小于1小时)
   */
  async isTokenExpiringSoon(): Promise<boolean> {
    const token = await this.tokenStorage.getToken();
    if (!token) return true;

    try {
      // 解析JWT获取过期时间
      const parts = token.split('.');
      if (parts.length !== 3) return true;

      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp * 1000; // 转换为毫秒
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      return exp - now < oneHour;
    } catch {
      return true;
    }
  }

  /**
   * 自动刷新Token(如果即将过期)
   * 建议在App启动时和每次API调用前调用
   */
  async autoRefreshIfNeeded(): Promise<void> {
    if (await this.isTokenExpiringSoon()) {
      await this.refreshToken();
    }
  }

  /**
   * 获取Token过期时间
   * @returns 过期时间戳(毫秒),如果无Token则返回null
   */
  async getTokenExpiry(): Promise<number | null> {
    const token = await this.tokenStorage.getToken();
    if (!token) return null;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload.exp * 1000;
    } catch {
      return null;
    }
  }
}

class OrdersApi {
  private trpc: TrpcClient;

  constructor(trpc: TrpcClient) {
    this.trpc = trpc;
  }

  /**
   * 创建订单(用户下单)
   */
  async userCreate(input: CreateOrderInput): Promise<{ id: number; orderNo: string; success: boolean }> {
    return this.trpc.mutate('orders.userCreate', input);
  }

  /**
   * 获取当前用户的订单列表
   */
  async myOrders(params?: {
    status?: 'all' | 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded';
    limit?: number;
    offset?: number;
  }): Promise<{ orders: Order[]; total: number }> {
    return this.trpc.query('orders.myOrders', params || {});
  }

  /**
   * 获取订单详情
   */
  async getById(id: number): Promise<Order> {
    return this.trpc.query('orders.getById', { id });
  }
}

class CoursesApi {
  private trpc: TrpcClient;

  constructor(trpc: TrpcClient) {
    this.trpc = trpc;
  }

  /**
   * 获取课程列表
   */
  async list(): Promise<any[]> {
    return this.trpc.query('courses.list');
  }
}

class CitiesApi {
  private trpc: TrpcClient;

  constructor(trpc: TrpcClient) {
    this.trpc = trpc;
  }

  /**
   * 获取城市列表
   */
  async list(): Promise<any[]> {
    return this.trpc.query('cities.list');
  }
}

// ============================================================================
// API客户端主类
// ============================================================================

export class ApiClient {
  private config: Required<ApiClientConfig>;
  private tokenStorage: TokenStorage;
  private trpc: TrpcClient;

  public readonly auth: AuthApi;
  public readonly orders: OrdersApi;
  public readonly courses: CoursesApi;
  public readonly cities: CitiesApi;

  constructor(config: ApiClientConfig = {}) {
    // 合并默认配置
    this.config = {
      autoDetect: config.autoDetect ?? true,
      baseUrl: config.baseUrl ?? '',
      tokenStorage: config.tokenStorage ?? 'asyncStorage',
      timeout: config.timeout ?? 30000,
      retryCount: config.retryCount ?? 3,
      debug: config.debug ?? false,
    };

    // 初始化Token存储
    this.tokenStorage = this.createTokenStorage();

    // 确定API基础地址
    const baseUrl = this.config.autoDetect
      ? EnvironmentDetector.detectBaseUrl()
      : this.config.baseUrl;

    if (this.config.debug) {
      console.log('[ApiClient] Initialized with baseUrl:', baseUrl);
      console.log('[ApiClient] Environment:', EnvironmentDetector.getEnvironmentType());
    }

    // 初始化请求拦截器
    const interceptor = new RequestInterceptor(this.tokenStorage, this.config.debug);

    // 初始化tRPC客户端
    this.trpc = new TrpcClient(
      baseUrl,
      interceptor,
      this.config.timeout,
      this.config.retryCount,
      this.config.debug
    );

    // 初始化API模块
    this.auth = new AuthApi(this.trpc, this.tokenStorage);
    this.orders = new OrdersApi(this.trpc);
    this.courses = new CoursesApi(this.trpc);
    this.cities = new CitiesApi(this.trpc);
  }

  private createTokenStorage(): TokenStorage {
    switch (this.config.tokenStorage) {
      case 'localStorage':
        return new LocalStorageTokenStorage();
      case 'memory':
        return new MemoryTokenStorage();
      case 'asyncStorage':
      default:
        // 在非React Native环境下回退到localStorage
        if (EnvironmentDetector.getEnvironmentType() !== 'react-native') {
          return new LocalStorageTokenStorage();
        }
        return new AsyncStorageTokenStorage();
    }
  }

  /**
   * 获取当前API基础地址
   */
  getBaseUrl(): string {
    return this.config.autoDetect
      ? EnvironmentDetector.detectBaseUrl()
      : this.config.baseUrl;
  }

  /**
   * 获取当前环境类型
   */
  getEnvironmentType(): string {
    return EnvironmentDetector.getEnvironmentType();
  }

  /**
   * 手动设置Token(用于从其他来源恢复登录状态)
   */
  async setToken(token: string): Promise<void> {
    await this.tokenStorage.setToken(token);
  }

  /**
   * 获取当前Token
   */
  async getToken(): Promise<string | null> {
    return this.tokenStorage.getToken();
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
 * // 自动检测环境
 * const api = createApiClient();
 * 
 * // 手动指定配置
 * const api = createApiClient({
 *   baseUrl: 'https://api.example.com',
 *   debug: true,
 * });
 * ```
 */
export function createApiClient(config?: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

// 默认导出
export default createApiClient;
