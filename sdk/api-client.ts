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

export interface RegisterInput {
  phone: string;      // 手机号(11位)
  password: string;   // 密码(6-20位)
  name?: string;      // 用户名(可选)
  nickname?: string;  // 昵称(可选)
}

export interface ChangePasswordInput {
  oldPassword: string;  // 旧密码
  newPassword: string;  // 新密码(6-20位)
}

export interface ChangePasswordResult {
  success: boolean;
  error?: string;       // 错误信息（可选）
}

export interface ResetPasswordInput {
  phone: string;        // 手机号(11位)
  code: string;         // 短信验证码(测试环境固定123456)
  newPassword: string;  // 新密码(6-20位)
}

export interface ResetPasswordResult {
  success: boolean;
  error?: string;       // 错误信息（可选）
}

export interface RegisterResult {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    openId: string;
    phone: string;
    name: string;
    role: string;
    roles: string; // 多角色，逗号分隔，如 "admin,teacher"
  };
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
    roles: string; // 多角色，逗号分隔，如 "admin,teacher"
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
  deliveryStatus: 'undelivered' | 'delivered';
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
   * 新用户注册(手机号+密码)
   */
  async register(input: RegisterInput): Promise<RegisterResult> {
    try {
      const result = await this.trpc.mutate<RegisterResult>('auth.register', input);
      
      if (result.success && result.token) {
        await this.tokenStorage.setToken(result.token);
      }

      return result;
    } catch (err) {
      return {
        success: false,
        message: (err as Error).message,
      };
    }
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
   * 修改密码(需要登录状态)
   * @param input 包含oldPassword, newPassword
   * @returns 修改结果，成功后前端应跳转登录页
   */
  async changePassword(input: ChangePasswordInput): Promise<ChangePasswordResult> {
    try {
      const result = await this.trpc.mutate<ChangePasswordResult>('auth.changePassword', input);
      
      // 修改密码成功后清除本地Token，强制重新登录
      if (result.success) {
        await this.tokenStorage.removeToken();
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
   * 忘记密码 - 通过手机号+验证码重置密码
   * @param input 包含phone, code, newPassword
   * @returns 重置结果，成功后前端应跳转登录页
   */
  async resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResult> {
    try {
      const result = await this.trpc.mutate<ResetPasswordResult>('auth.resetPassword', input);
      return result;
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
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

  /**
   * 更新订单交付状态
   * @param id 订单ID
   * @param deliveryStatus 交付状态: 'undelivered'(未交付) | 'delivered'(已交付)
   */
  async updateDeliveryStatus(id: number, deliveryStatus: 'undelivered' | 'delivered'): Promise<{ success: boolean }> {
    return this.trpc.mutate('orders.updateDeliveryStatus', { id, deliveryStatus });
  }
}

class CoursesApi {
  private trpc: TrpcClient;

  constructor(trpc: TrpcClient) {
    this.trpc = trpc;
  }

  /**
   * 获取课程列表
   * @returns 课程列表,包含id、name、price、description等字段
   */
  async list(): Promise<{ success: boolean; data: any[] }> {
    return this.trpc.query('courses.list');
  }

  /**
   * 根据ID获取课程详情
   * @param id 课程ID
   */
  async getById(id: number): Promise<{ success: boolean; data: any }> {
    return this.trpc.query('courses.getById', { id });
  }
}

class TeachersApi {
  private trpc: TrpcClient;

  constructor(trpc: TrpcClient) {
    this.trpc = trpc;
  }

  /**
   * 获取老师列表
   * @returns 老师列表,包含id、name、city、customerType、isActive等字段
   */
  async list(): Promise<any[]> {
    return this.trpc.query('teachers.list');
  }

  /**
   * 根据ID获取老师详情
   * @param id 老师ID
   */
  async getById(id: number): Promise<any> {
    return this.trpc.query('teachers.getById', { id });
  }
}

class ClassroomsApi {
  private trpc: TrpcClient;

  constructor(trpc: TrpcClient) {
    this.trpc = trpc;
  }

  /**
   * 获取所有教室列表
   * @returns 教室列表,包含id、name、cityId、cityName、address等字段
   */
  async list(): Promise<any[]> {
    return this.trpc.query('classrooms.list');
  }

  /**
   * 根据城市ID获取教室列表
   * @param cityId 城市ID
   */
  async getByCityId(cityId: number): Promise<any[]> {
    return this.trpc.query('classrooms.getByCityId', { cityId });
  }

  /**
   * 根据城市名称获取教室列表
   * @param cityName 城市名称
   */
  async getByCityName(cityName: string): Promise<any[]> {
    return this.trpc.query('classrooms.getByCityName', { cityName });
  }
}

class MetadataApi {
  private trpc: TrpcClient;

  constructor(trpc: TrpcClient) {
    this.trpc = trpc;
  }

  /**
   * 获取所有元数据(城市、课程、教室、老师名、销售人员等)
   * 推荐在App启动时调用一次,缓存结果
   */
  async getAll(): Promise<{
    success: boolean;
    data: {
      cities: string[];
      courses: string[];
      classrooms: string[];
      teacherNames: string[];
      salespeople: string[];
      teacherCategories: string[];
      courseAmounts: string[];
    };
    counts: {
      cities: number;
      courses: number;
      classrooms: number;
      teacherNames: number;
      salespeople: number;
    };
  }> {
    return this.trpc.query('metadata.getAll');
  }

  /**
   * 获取城市列表
   */
  async getCities(): Promise<{ success: boolean; data: string[]; count: number }> {
    return this.trpc.query('metadata.getCities');
  }
}

class CitiesApi {
  private trpc: TrpcClient;

  constructor(trpc: TrpcClient) {
    this.trpc = trpc;
  }

  /**
   * 获取城市列表(从metadata接口)
   * @returns 城市名称数组
   */
  async list(): Promise<{ success: boolean; data: string[]; count: number }> {
    return this.trpc.query('metadata.getCities');
  }

  /**
   * 获取城市合伙人配置列表
   * @returns 城市配置数组,包含id、city、partnerFeeRate、isActive等字段
   */
  async getPartnerConfigs(): Promise<{ success: boolean; data: any[]; count: number }> {
    return this.trpc.query('cityPartnerConfig.list');
  }

  /**
   * 根据城市名获取合伙人配置
   * @param city 城市名称
   */
  async getPartnerConfigByCity(city: string): Promise<{ success: boolean; data: any; message?: string }> {
    return this.trpc.query('cityPartnerConfig.getByCity', { city });
  }
}

// ============================================================================
// 账户余额模块
// ============================================================================

/** 余额信息 */
export interface BalanceInfo {
  balance: string;        // 余额(字符串,保留两位小数)
  customerId: number | null;
  customerName: string | null;
}

/** 账户流水记录 */
export interface AccountTransaction {
  id: number;
  customerId: number;
  type: 'recharge' | 'consume' | 'refund';
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  orderId?: number | null;
  orderNo?: string | null;
  notes?: string | null;
  operatorId?: number | null;
  operatorName?: string | null;
  createdAt: string;
}

/** 充值/退款结果 */
export interface BalanceChangeResult {
  balanceBefore: string;
  balanceAfter: string;
}

class AccountApi {
  private trpc: TrpcClient;

  constructor(trpc: TrpcClient) {
    this.trpc = trpc;
  }

  /**
   * 查询当前登录用户的账户余额
   * 需要登录状态(Token)
   * @returns { success: true, data: BalanceInfo }
   */
  async getMyBalance(): Promise<{ success: boolean; data: BalanceInfo }> {
    return this.trpc.query('account.getMyBalance');
  }

  /**
   * 查询当前登录用户的账户流水
   * 需要登录状态(Token)
   * @param params 分页参数: limit(每页条数,默认20), offset(偏移量,默认0)
   * @returns { success: true, data: { transactions: AccountTransaction[], total: number } }
   */
  async getMyTransactions(params?: { limit?: number; offset?: number }): Promise<{
    success: boolean;
    data: { transactions: AccountTransaction[]; total: number };
  }> {
    return this.trpc.query('account.getMyTransactions', params || {});
  }

  /**
   * 查询指定客户的余额(管理员/销售用)
   * @param customerId 业务客户ID
   * @returns { success: true, data: BalanceInfo } 或 { success: false, error: '...' }
   */
  async getCustomerBalance(customerId: number): Promise<{ success: boolean; data?: BalanceInfo; error?: string }> {
    return this.trpc.query('account.getCustomerBalance', { customerId });
  }

  /**
   * 查询指定客户的流水(管理员/销售用)
   * @param customerId 业务客户ID
   * @param params 分页参数
   * @returns { success: true, data: { transactions, total } }
   */
  async getCustomerTransactions(customerId: number, params?: { limit?: number; offset?: number }): Promise<{
    success: boolean;
    data: { transactions: AccountTransaction[]; total: number };
  }> {
    return this.trpc.query('account.getCustomerTransactions', { customerId, ...params });
  }

  /**
   * 客户充值(管理员/销售操作)
   * @param customerId 业务客户ID
   * @param amount 充值金额(必须大于0)
   * @param notes 备注(可选)
   * @returns { success: true, data: BalanceChangeResult } 或 { success: false, error: '...' }
   */
  async recharge(customerId: number, amount: number, notes?: string): Promise<{
    success: boolean;
    data?: BalanceChangeResult;
    error?: string;
  }> {
    return this.trpc.mutate('account.recharge', { customerId, amount, notes });
  }

  /**
   * 客户退款(管理员操作)
   * @param customerId 业务客户ID
   * @param amount 退款金额(必须大于0)
   * @param orderId 关联订单ID
   * @param orderNo 关联订单号
   * @returns { success: true, data: BalanceChangeResult } 或 { success: false, error: '...' }
   */
  async refund(customerId: number, amount: number, orderId: number, orderNo: string): Promise<{
    success: boolean;
    data?: BalanceChangeResult;
    error?: string;
  }> {
    return this.trpc.mutate('account.refund', { customerId, amount, orderId, orderNo });
  }
}

// ============================================================================
// 申请通知模块
// ============================================================================

/** 通知类型 */
export type NotificationType = 'general' | 'complaint' | 'suggestion' | 'consultation' | 'application';

/** 通知状态 */
export type NotificationStatus = 'unread' | 'read' | 'replied' | 'archived';

/** 提交留言输入 */
export interface SubmitNotificationInput {
  userId: number;                  // 用户ID
  userName?: string;               // 用户名称(可选)
  userPhone?: string;              // 用户手机号(可选)
  type?: NotificationType;         // 留言类型(默认general)
  title?: string;                  // 标题(可选,最多200字)
  content: string;                 // 留言内容(必填,最多5000字)
}

/** 通知详情 */
export interface UserNotification {
  id: number;
  userId: number;
  userName: string | null;
  userPhone: string | null;
  type: NotificationType;
  title: string | null;
  content: string;
  status: NotificationStatus;
  adminReply: string | null;
  repliedBy: number | null;
  repliedAt: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 通知列表结果 */
export interface NotificationListResult {
  items: UserNotification[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================================
// 销售人员管理模块
// ============================================================================

/** 销售人员信息 */
export interface Salesperson {
  id: number;
  name: string;
  nickname?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  commissionRate?: string | null;
  city?: string | null;
  notes?: string | null;
  isActive: boolean;
  totalOrders?: number;
  totalSales?: string | null;
  createdAt: string;
}

/** 销售统计数据 */
export interface SalesStatistics {
  totalOrders: number;
  totalSales: string;
  monthlyData?: Array<{ month: string; orders: number; sales: string }>;
}

class SalespersonsApi {
  private trpc: TrpcClient;

  constructor(trpc: TrpcClient) {
    this.trpc = trpc;
  }

  /** 获取所有销售人员列表 */
  async list(): Promise<Salesperson[]> {
    return this.trpc.query('salespersons.list');
  }

  /** 搜索销售人员 */
  async search(keyword: string): Promise<Salesperson[]> {
    return this.trpc.query('salespersons.search', { keyword });
  }

  /** 创建销售人员 */
  async create(input: {
    name: string;
    nickname?: string;
    phone?: string;
    email?: string;
    wechat?: string;
    commissionRate?: number;
    city?: string;
    notes?: string;
  }): Promise<{ id: number; success: boolean }> {
    return this.trpc.mutate('salespersons.create', input);
  }

  /** 更新销售人员 */
  async update(input: {
    id: number;
    name?: string;
    nickname?: string;
    phone?: string;
    email?: string;
    wechat?: string;
    commissionRate?: number;
    city?: string;
    notes?: string;
  }): Promise<{ success: boolean }> {
    return this.trpc.mutate('salespersons.update', input);
  }

  /** 删除销售人员 */
  async delete(id: number): Promise<{ success: boolean }> {
    return this.trpc.mutate('salespersons.delete', { id });
  }

  /** 更新销售人员状态(启用/停用) */
  async updateStatus(id: number, isActive: boolean): Promise<{ success: boolean }> {
    return this.trpc.mutate('salespersons.updateStatus', { id, isActive });
  }

  /** 获取销售统计数据 */
  async getStatistics(params?: {
    salespersonId?: number;
    startDate?: string;
    endDate?: string;
    groupBy?: 'month' | 'year';
  }): Promise<any> {
    return this.trpc.query('salespersons.getStatistics', params || {});
  }

  /** 获取月度销售额 */
  async getMonthlySales(params: {
    salespersonId?: number;
    year: number;
  }): Promise<any> {
    return this.trpc.query('salespersons.getMonthlySales', params);
  }

  /** 获取年度销售额 */
  async getYearlySales(params?: {
    salespersonId?: number;
    startYear?: number;
    endYear?: number;
  }): Promise<any> {
    return this.trpc.query('salespersons.getYearlySales', params || {});
  }

  /** 更新所有销售人员统计数据 */
  async updateAllStats(): Promise<{ success: boolean; data: any[]; message: string }> {
    return this.trpc.mutate('salespersons.updateAllStats');
  }

  /** 更新单个销售人员统计数据 */
  async updateStats(id: number): Promise<{ success: boolean }> {
    return this.trpc.mutate('salespersons.updateStats', { id });
  }
}

// ============================================================================
// 排课预约模块
// ============================================================================

/** 排课信息 */
export interface Schedule {
  id: number;
  orderId?: number | null;
  customerName?: string | null;
  wechatId?: string | null;
  salesName?: string | null;
  teacherId?: number | null;
  teacherName?: string | null;
  courseType: string;
  city?: string | null;
  location?: string | null;
  classDate?: string | null;
  classTime?: string | null;
  startTime: string;
  endTime: string;
  status?: string | null;
  notes?: string | null;
  createdAt: string;
}

/** 预约输入 */
export interface CreateAppointmentInput {
  userId?: number;
  cityId: number;
  teacherId: number;
  courseId: number;
  scheduledDate: string;  // YYYY-MM-DD
  scheduledTime: string;  // HH:mm
  contactName: string;
  contactPhone: string;
  notes?: string;
}

class SchedulesApi {
  private trpc: TrpcClient;

  constructor(trpc: TrpcClient) {
    this.trpc = trpc;
  }

  /** 获取排课列表 */
  async list(params?: { startTime?: Date; endTime?: Date }): Promise<Schedule[]> {
    return this.trpc.query('schedules.list', params || {});
  }

  /** 获取排课列表(含订单信息) */
  async listWithOrderInfo(): Promise<any[]> {
    return this.trpc.query('schedules.listWithOrderInfo');
  }

  /** 按老师获取排课 */
  async getByTeacher(teacherId: number): Promise<Schedule[]> {
    return this.trpc.query('schedules.getByTeacher', { teacherId });
  }

  /** 创建课程预约(App用户) */
  async createAppointment(input: CreateAppointmentInput): Promise<{
    success: boolean;
    scheduleId: number;
    message: string;
  }> {
    return this.trpc.mutate('schedules.createAppointment', input);
  }

  /** 查询用户预约列表(App用户) */
  async listAppointments(params: {
    userId: number;
    status?: 'scheduled' | 'completed' | 'cancelled';
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: any[]; count: number }> {
    return this.trpc.query('schedules.listAppointments', params);
  }

  /** 取消预约(App用户) */
  async cancelAppointment(scheduleId: number, userId: number): Promise<{ success: boolean }> {
    return this.trpc.mutate('schedules.cancelAppointment', { scheduleId, userId });
  }

  /** 月度合伙人费用统计 */
  async getMonthlyPartnerSettlement(year: number, month: number): Promise<any> {
    return this.trpc.query('schedules.getMonthlyPartnerSettlement', { year, month });
  }

  /** 按日期范围统计合伙人费用 */
  async getPartnerSettlementByDateRange(startDate: Date, endDate: Date): Promise<any> {
    return this.trpc.query('schedules.getPartnerSettlementByDateRange', { startDate, endDate });
  }
}

// ============================================================================
// 客户管理模块
// ============================================================================

/** 客户信息 */
export interface Customer {
  id: number;
  name?: string | null;
  phone?: string | null;
  totalSpent?: string | null;
  classCount?: number | null;
  lastOrderDate?: string | null;
  firstOrderDate?: string | null;
  trafficSource?: string | null;
  createdAt: string;
}

class CustomersApi {
  private trpc: TrpcClient;

  constructor(trpc: TrpcClient) {
    this.trpc = trpc;
  }

  /** 获取客户列表(支持多种筛选条件) */
  async list(params?: {
    minSpent?: number;
    maxSpent?: number;
    minClassCount?: number;
    maxClassCount?: number;
    lastConsumptionDays?: number;
    trafficSource?: string;
    highValue?: boolean;
    churned?: boolean;
    sortBy?: 'totalSpent' | 'classCount' | 'lastOrderDate' | 'firstOrderDate' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Customer[]> {
    return this.trpc.query('customers.list', params || {});
  }

  /** 刷新所有客户统计数据(异步) */
  async refreshAllStats(): Promise<{ taskId: string }> {
    return this.trpc.mutate('customers.refreshAllStats');
  }

  /** 获取异步任务进度 */
  async getProgress(taskId: string): Promise<any> {
    return this.trpc.query('customers.getProgress', { taskId });
  }
}

// ============================================================================
// 财务对账模块
// ============================================================================

/** 对账记录 */
export interface Reconciliation {
  id: number;
  periodStart: string;
  periodEnd: string;
  totalIncome: string;
  totalExpense: string;
  teacherFeeTotal?: string | null;
  transportFeeTotal?: string | null;
  otherFeeTotal?: string | null;
  partnerFeeTotal?: string | null;
  profit: string;
  status: 'draft' | 'confirmed';
  notes?: string | null;
  createdAt: string;
}

/** 智能匹配结果 */
export interface MatchResult {
  scheduleId: number;
  orderId: number;
  confidence: number;
  reason: string;
}

class FinanceApi {
  private trpc: TrpcClient;

  constructor(trpc: TrpcClient) {
    this.trpc = trpc;
  }

  /** 导出财务报表Excel */
  async exportExcel(params?: { startDate?: string; endDate?: string }): Promise<{
    success: boolean;
    data: string;
    filename: string;
  }> {
    return this.trpc.mutate('finance.exportExcel', params || {});
  }
}

class ReconciliationsApi {
  private trpc: TrpcClient;

  constructor(trpc: TrpcClient) {
    this.trpc = trpc;
  }

  /** 获取所有对账记录 */
  async list(): Promise<Reconciliation[]> {
    return this.trpc.query('reconciliations.list');
  }

  /** 创建对账记录 */
  async create(input: {
    periodStart: string;
    periodEnd: string;
    totalIncome: string;
    totalExpense: string;
    teacherFeeTotal?: string;
    transportFeeTotal?: string;
    otherFeeTotal?: string;
    partnerFeeTotal?: string;
    profit: string;
    notes?: string;
  }): Promise<{ success: boolean }> {
    return this.trpc.mutate('reconciliations.create', input);
  }

  /** 更新对账记录 */
  async update(id: number, data: { status?: 'draft' | 'confirmed'; notes?: string }): Promise<{ success: boolean }> {
    return this.trpc.mutate('reconciliations.update', { id, data });
  }

  /** 智能对账匹配 */
  async intelligentMatch(params?: { scheduleIds?: number[]; orderIds?: number[] }): Promise<{
    success: boolean;
    matchedCount: number;
    matches: MatchResult[];
    message: string;
  }> {
    return this.trpc.mutate('reconciliation.intelligentMatch', params || {});
  }

  /** 手动创建匹配关系 */
  async createMatch(scheduleId: number, orderId: number): Promise<{ success: boolean }> {
    return this.trpc.mutate('reconciliation.createMatch', { scheduleId, orderId });
  }

  /** 获取所有匹配关系 */
  async getAllMatches(): Promise<any[]> {
    return this.trpc.query('reconciliation.getAllMatches');
  }

  /** 获取未匹配的课程日程 */
  async getUnmatchedSchedules(): Promise<any[]> {
    return this.trpc.query('reconciliation.getUnmatchedSchedules');
  }

  /** 获取未匹配的订单 */
  async getUnmatchedOrders(): Promise<any[]> {
    return this.trpc.query('reconciliation.getUnmatchedOrders');
  }

  /** 月度对账报表 */
  async getMonthlyReport(params: {
    startDate: string;
    endDate: string;
    city?: string;
    salesPerson?: string;
  }): Promise<any> {
    return this.trpc.query('reconciliation.getMonthlyReport', params);
  }
}

// ============================================================================
// 数据统计分析模块
// ============================================================================

class AnalyticsApi {
  private trpc: TrpcClient;

  constructor(trpc: TrpcClient) {
    this.trpc = trpc;
  }

  /** 订单统计 */
  async orderStats(startDate: string, endDate: string): Promise<any> {
    return this.trpc.query('analytics.orderStats', { startDate, endDate });
  }

  /** 城市收入统计 */
  async cityRevenue(): Promise<any> {
    return this.trpc.query('analytics.cityRevenue');
  }

  /** 城市收入趋势 */
  async cityRevenueTrend(): Promise<any> {
    return this.trpc.query('analytics.cityRevenueTrend');
  }

  /** 老师月度统计 */
  async teacherMonthlyStats(): Promise<any> {
    return this.trpc.query('analytics.teacherMonthlyStats');
  }

  /** 流量来源月度统计 */
  async trafficSourceMonthlyStats(): Promise<any> {
    return this.trpc.query('analytics.trafficSourceMonthlyStats');
  }

  /** 流量来源分析 */
  async trafficSourceAnalysis(): Promise<any> {
    return this.trpc.query('analytics.trafficSourceAnalysis');
  }

  /** 销售人员支付统计 */
  async salesPersonPaymentStats(): Promise<any> {
    return this.trpc.query('analytics.salesPersonPaymentStats');
  }

  /** 客户余额排名 */
  async customerBalanceRanking(): Promise<any> {
    return this.trpc.query('analytics.customerBalanceRanking');
  }

  /** 城市财务统计 */
  async cityFinancialStats(dateRange?: string): Promise<any> {
    return this.trpc.query('analytics.cityFinancialStats', { dateRange });
  }

  /** 客户统计 */
  async customerStats(): Promise<any> {
    return this.trpc.query('analytics.customerStats');
  }

  /** 流失风险客户 */
  async churnRiskCustomers(): Promise<any> {
    return this.trpc.query('analytics.churnRiskCustomers');
  }

  /** 不活跃客户 */
  async inactiveCustomers(days?: number): Promise<any> {
    return this.trpc.query('analytics.inactiveCustomers', { days });
  }

  /** 获取所有城市合伙人费配置 */
  async getAllCityPartnerConfig(): Promise<any> {
    return this.trpc.query('analytics.getAllCityPartnerConfig');
  }

  /** 计算合伙人费 */
  async calculatePartnerFee(city: string | null, courseAmount: number, teacherFee: number): Promise<{ partnerFee: number }> {
    return this.trpc.query('analytics.calculatePartnerFee', { city, courseAmount, teacherFee });
  }

  /** 获取所有城市及统计 */
  async getAllCitiesWithStats(params?: { startDate?: string; endDate?: string }): Promise<any> {
    return this.trpc.query('analytics.getAllCitiesWithStats', params || {});
  }
}

// ============================================================================
// Excel报表导出模块
// ============================================================================

class ExcelReportApi {
  private trpc: TrpcClient;

  constructor(trpc: TrpcClient) {
    this.trpc = trpc;
  }

  /** 导出综合财务报表 */
  async exportFinancialReport(params?: { startDate?: string; endDate?: string }): Promise<{
    success: boolean;
    data: string;
    filename: string;
  }> {
    return this.trpc.mutate('excelReport.exportFinancialReport', params || {});
  }

  /** 导出城市业绩报表 */
  async exportCityReport(params?: { startDate?: string; endDate?: string }): Promise<{
    success: boolean;
    data: string;
    filename: string;
  }> {
    return this.trpc.mutate('excelReport.exportCityReport', params || {});
  }

  /** 导出老师结算报表 */
  async exportTeacherSettlementReport(params?: { startDate?: string; endDate?: string }): Promise<{
    success: boolean;
    data: string;
    filename: string;
  }> {
    return this.trpc.mutate('excelReport.exportTeacherSettlementReport', params || {});
  }

  /** 导出订单数据 */
  async exportOrderData(params?: { startDate?: string; endDate?: string }): Promise<{
    success: boolean;
    data: string;
    filename: string;
  }> {
    return this.trpc.mutate('excelReport.exportOrderData', params || {});
  }

  /** 获取可用报表类型 */
  async getAvailableReports(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    available: boolean;
  }>> {
    return this.trpc.query('excelReport.getAvailableReports');
  }
}

class NotificationsApi {
  private trpc: TrpcClient;

  constructor(trpc: TrpcClient) {
    this.trpc = trpc;
  }

  /**
   * 提交留言/申请通知(App用户调用)
   * @param input 留言内容
   * @returns { success: true, id: number }
   */
  async submit(input: SubmitNotificationInput): Promise<{ success: boolean; id: number }> {
    return this.trpc.mutate('notifications.submit', input);
  }

  /**
   * 查询当前用户的留言列表(App用户调用)
   * @param userId 用户ID
   * @param params 分页参数
   * @returns { items, total, page, pageSize }
   */
  async myList(userId: number, params?: { page?: number; pageSize?: number }): Promise<NotificationListResult> {
    return this.trpc.query('notifications.myList', { userId, ...params });
  }

  /**
   * 查询所有通知列表(管理员调用,需要登录)
   * @param params 筛选和分页参数
   * @returns { items, total, page, pageSize }
   */
  async list(params?: {
    status?: NotificationStatus;
    type?: NotificationType;
    userId?: number;
    page?: number;
    pageSize?: number;
  }): Promise<NotificationListResult> {
    return this.trpc.query('notifications.list', params || {});
  }

  /**
   * 获取单条通知详情(管理员调用,需要登录)
   * @param id 通知ID
   */
  async detail(id: number): Promise<UserNotification> {
    return this.trpc.query('notifications.detail', { id });
  }

  /**
   * 标记通知为已读(管理员调用,需要登录)
   * @param id 通知ID
   */
  async markRead(id: number): Promise<{ success: boolean }> {
    return this.trpc.mutate('notifications.markRead', { id });
  }

  /**
   * 批量标记通知为已读(管理员调用,需要登录)
   * @param ids 通知ID数组
   */
  async batchMarkRead(ids: number[]): Promise<{ success: boolean; count: number }> {
    return this.trpc.mutate('notifications.batchMarkRead', { ids });
  }

  /**
   * 回复通知(管理员调用,需要登录)
   * @param id 通知ID
   * @param adminReply 回复内容
   */
  async reply(id: number, adminReply: string): Promise<{ success: boolean }> {
    return this.trpc.mutate('notifications.reply', { id, adminReply });
  }

  /**
   * 归档通知(管理员调用,需要登录)
   * @param id 通知ID
   */
  async archive(id: number): Promise<{ success: boolean }> {
    return this.trpc.mutate('notifications.archive', { id });
  }

  /**
   * 删除通知(管理员调用,需要登录)
   * @param id 通知ID
   */
  async delete(id: number): Promise<{ success: boolean }> {
    return this.trpc.mutate('notifications.delete', { id });
  }

  /**
   * 获取未读通知数量(管理员调用,需要登录)
   * @returns { count: number }
   */
  async unreadCount(): Promise<{ count: number }> {
    return this.trpc.query('notifications.unreadCount');
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
  public readonly teachers: TeachersApi;
  public readonly classrooms: ClassroomsApi;
  public readonly metadata: MetadataApi;
  public readonly account: AccountApi;
  public readonly notifications: NotificationsApi;
  public readonly salespersons: SalespersonsApi;
  public readonly schedules: SchedulesApi;
  public readonly customers: CustomersApi;
  public readonly finance: FinanceApi;
  public readonly reconciliations: ReconciliationsApi;
  public readonly analytics: AnalyticsApi;
  public readonly excelReport: ExcelReportApi;

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

    // 初始API模块
    this.auth = new AuthApi(this.trpc, this.tokenStorage);
    this.orders = new OrdersApi(this.trpc);
    this.courses = new CoursesApi(this.trpc);
    this.cities = new CitiesApi(this.trpc);
    this.teachers = new TeachersApi(this.trpc);
    this.classrooms = new ClassroomsApi(this.trpc);
    this.metadata = new MetadataApi(this.trpc);
    this.account = new AccountApi(this.trpc);
    this.notifications = new NotificationsApi(this.trpc);
    this.salespersons = new SalespersonsApi(this.trpc);
    this.schedules = new SchedulesApi(this.trpc);
    this.customers = new CustomersApi(this.trpc);
    this.finance = new FinanceApi(this.trpc);
    this.reconciliations = new ReconciliationsApi(this.trpc);
    this.analytics = new AnalyticsApi(this.trpc);
    this.excelReport = new ExcelReportApi(this.trpc);
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
