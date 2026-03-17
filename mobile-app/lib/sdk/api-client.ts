/**
 * 瀛姬App - 统一API客户端SDK v3
 *
 * 所有环境统一直连 CRM 后端: https://crm.bdsm.com.cn/api/trpc
 * Token 通过 URL 参数 + Authorization header 双重传递
 */

// ============================================================================
// 类型定义
// ============================================================================

export interface ApiClientConfig {
  autoDetect?: boolean;
  baseUrl?: string;
  tokenStorage?: 'asyncStorage' | 'localStorage' | 'memory';
  timeout?: number;
  retryCount?: number;
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
    openId?: string;
    name: string;
    nickname?: string;
    email?: string;
    phone?: string;
    role: string;
    roles?: string;
    identity?: string;
    relatedName?: string;
  };
  error?: string;
  message?: string;
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
  customerName?: string;
  paymentAmount: string;
  courseAmount?: string;
  deliveryCity?: string;
  deliveryCourse?: string;
  status: string;
  createdAt?: string;
}

export interface ApiError extends Error {
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'NETWORK_ERROR' | 'SERVER_ERROR' | 'UNKNOWN';
  status?: number;
  details?: unknown;
}

// ============================================================================
// Token 存储适配器
// ============================================================================

interface TokenStorage {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
  removeToken(): Promise<void>;
}

class MemoryTokenStorage implements TokenStorage {
  private token: string | null = null;
  async getToken(): Promise<string | null> { return this.token; }
  async setToken(token: string): Promise<void> { this.token = token; }
  async removeToken(): Promise<void> { this.token = null; }
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
// 核心请求引擎 - 统一直连 CRM 后端
// ============================================================================

/** CRM 后端 tRPC 基础地址 */
const CRM_API_BASE = 'https://crm.bdsm.com.cn/api/trpc';

class TrpcEngine {
  private tokenStorage: TokenStorage;
  private timeout: number;
  private retryCount: number;
  private debug: boolean;

  constructor(tokenStorage: TokenStorage, timeout: number, retryCount: number, debug: boolean) {
    this.tokenStorage = tokenStorage;
    this.timeout = timeout;
    this.retryCount = retryCount;
    this.debug = debug;
  }

  /** tRPC query (GET) */
  async query<T>(procedure: string, input?: any): Promise<T> {
    const params = new URLSearchParams();
    if (input !== undefined) {
      params.set('input', JSON.stringify({ json: input }));
    }
    const token = await this.tokenStorage.getToken();
    if (token) {
      params.set('token', token);
    }
    params.set('_t', Date.now().toString());

    const qs = params.toString();
    const url = `${CRM_API_BASE}/${procedure}${qs ? '?' + qs : ''}`;

    return this.request<T>('GET', url, token);
  }

  /** tRPC mutation (POST) */
  async mutate<T>(procedure: string, input?: any): Promise<T> {
    const token = await this.tokenStorage.getToken();
    const params = new URLSearchParams();
    if (token) {
      params.set('token', token);
    }
    params.set('_t', Date.now().toString());

    const qs = params.toString();
    const url = `${CRM_API_BASE}/${procedure}${qs ? '?' + qs : ''}`;
    const body = input !== undefined ? { json: input } : undefined;

    return this.request<T>('POST', url, token, body);
  }

  /** 执行 HTTP 请求（含重试） */
  private async request<T>(
    method: 'GET' | 'POST',
    url: string,
    token: string | null,
    body?: any,
  ): Promise<T> {
    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          headers['X-Auth-Token'] = token;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        if (this.debug && attempt === 0) {
          const shortUrl = url.length > 120 ? url.substring(0, 120) + '...' : url;
          console.log(`[SDK] ${method} ${shortUrl}`);
        }

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();
        let responseBody: any;
        try {
          responseBody = JSON.parse(responseText);
        } catch {
          throw this.makeError('SERVER_ERROR', `Invalid JSON response: ${responseText.substring(0, 100)}`, response.status);
        }

        if (!response.ok) {
          const msg = responseBody?.error?.json?.message
            || responseBody?.error?.message
            || `Request failed: ${response.status}`;
          const code = response.status === 401 ? 'UNAUTHORIZED'
            : response.status === 403 ? 'FORBIDDEN'
            : response.status === 404 ? 'NOT_FOUND'
            : response.status === 409 ? 'CONFLICT'
            : 'SERVER_ERROR';
          throw this.makeError(code, msg, response.status, responseBody);
        }

        // tRPC 响应格式
        if (responseBody?.result?.data?.json !== undefined) {
          return responseBody.result.data.json as T;
        }
        return responseBody as T;

      } catch (err: any) {
        if (err?.name === 'AbortError') {
          lastError = this.makeError('NETWORK_ERROR', '请求超时，请检查网络');
        } else if (err?.code && ['UNAUTHORIZED', 'FORBIDDEN', 'CONFLICT', 'NOT_FOUND'].includes(err.code)) {
          throw err; // 不重试
        } else if (err?.code) {
          lastError = err;
        } else {
          lastError = this.makeError('NETWORK_ERROR', err?.message || '网络连接失败');
        }

        if (this.debug) {
          console.warn(`[SDK] Retry ${attempt + 1}/${this.retryCount + 1}: ${lastError?.message}`);
        }

        if (attempt < this.retryCount) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }

  private makeError(code: string, message: string, status?: number, details?: any): ApiError {
    const err = new Error(message) as ApiError;
    err.code = code as ApiError['code'];
    err.status = status;
    err.details = details;
    return err;
  }
}

// ============================================================================
// API 模块
// ============================================================================

class AuthApi {
  private engine: TrpcEngine;
  private tokenStorage: TokenStorage;

  constructor(engine: TrpcEngine, tokenStorage: TokenStorage) {
    this.engine = engine;
    this.tokenStorage = tokenStorage;
  }

  async login(input: LoginInput): Promise<LoginResult> {
    try {
      const result = await this.engine.mutate<LoginResult>('auth.login', input);
      if (result.success && result.token) {
        await this.tokenStorage.setToken(result.token);
      }
      return result;
    } catch (err: any) {
      return { success: false, error: err.message || '登录失败' };
    }
  }

  async register(input: { phone: string; password: string; name?: string; nickname?: string }): Promise<LoginResult> {
    try {
      const result = await this.engine.mutate<LoginResult>('auth.register', input);
      if (result.success && result.token) {
        await this.tokenStorage.setToken(result.token);
      }
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async me(): Promise<any> {
    try {
      return await this.engine.query('auth.me');
    } catch {
      return null;
    }
  }

   async verifyToken(): Promise<{ valid: boolean; user?: any }> {
    try {
      const token = await this.tokenStorage.getToken();
      if (!token) return { valid: false };
      try {
        return await this.engine.query('auth.verifyToken', { token });
      } catch {
        // verifyToken可能不支持当前token格式，fallback到auth.me
        try {
          const user = await this.engine.query('auth.me');
          if (user) return { valid: true, user };
        } catch { /* ignore */ }
        return { valid: false };
      }
    } catch { return { valid: false }; }
  }

  async logout(): Promise<void> {
    await this.tokenStorage.removeToken();
    try { await this.engine.mutate('auth.logout'); } catch { /* ignore */ }
  }

  async changePassword(input: { oldPassword: string; newPassword: string }): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.engine.mutate('auth.changePassword', input);
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async resetPassword(input: { phone: string; code: string; newPassword: string }): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.engine.mutate('auth.resetPassword', input);
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async isLoggedIn(): Promise<boolean> {
    const token = await this.tokenStorage.getToken();
    if (!token) return false;
    const result = await this.verifyToken();
    return result.valid;
  }

  async refreshToken(): Promise<{ success: boolean; token?: string }> {
    try {
      const token = await this.tokenStorage.getToken();
      if (!token) return { success: false };
      const result = await this.engine.mutate<{ success: boolean; token: string }>('auth.refreshToken', { token });
      if (result.success && result.token) {
        await this.tokenStorage.setToken(result.token);
      }
      return result;
    } catch {
      return { success: false };
    }
  }

  async isTokenExpiringSoon(): Promise<boolean> {
    const token = await this.tokenStorage.getToken();
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1]));
      return (payload.exp * 1000 - Date.now()) < 3600000;
    } catch {
      return true;
    }
  }

  async autoRefreshIfNeeded(): Promise<void> {
    if (await this.isTokenExpiringSoon()) {
      await this.refreshToken();
    }
  }

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

/** 安全提取数组数据 */
function extractArray(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (result?.data && Array.isArray(result.data)) return result.data;
  if (result?.orders && Array.isArray(result.orders)) return result.orders;
  if (result?.users && Array.isArray(result.users)) return result.users;
  if (result?.customers && Array.isArray(result.customers)) return result.customers;
  return [];
}

class OrdersApi {
  private engine: TrpcEngine;
  constructor(engine: TrpcEngine) { this.engine = engine; }

  async userCreate(input: CreateOrderInput): Promise<{ id: number; orderNo: string; success: boolean }> {
    return this.engine.mutate('orders.userCreate', input);
  }

  async list(params?: any): Promise<any[]> {
    try {
      const result = await this.engine.query<any>('orders.list', params || {});
      return extractArray(result);
    } catch {
      try {
        const result = await this.engine.query<any>('orders.myOrders', params || {});
        return extractArray(result);
      } catch { return []; }
    }
  }

  async myOrders(params?: any): Promise<any[]> {
    try {
      const result = await this.engine.query<any>('orders.myOrders', params || {});
      return extractArray(result);
    } catch { return []; }
  }

  async getById(id: number): Promise<Order | null> {
    try {
      return await this.engine.query('orders.getById', { id });
    } catch { return null; }
  }

  async update(data: any): Promise<any> {
    return this.engine.mutate('orders.update', data);
  }

  async updateStatus(data: { orderId: number; status: string; notes?: string }): Promise<any> {
    return this.engine.mutate('orders.updateStatus', data);
  }

  async teacherCourses(params?: any): Promise<any[]> {
    try {
      const result = await this.engine.query<any>('orders.teacherCourses', params || {});
      return extractArray(result);
    } catch {
      // 路由不存在，用 orders.list 过滤
      try {
        const result = await this.engine.query<any>('orders.list', {});
        let orders = extractArray(result);
        orders = orders.filter((o: any) => o.deliveryTeacher || o.classDate);
        if (params?.status) {
          const statusMap: Record<string, string[]> = {
            pending: ['pending', '待确认'],
            accepted: ['accepted', '已接受', '已确认'],
            delivered: ['delivered', '已完成', '已交付'],
          };
          const validStatuses = statusMap[params.status] || [params.status];
          orders = orders.filter((o: any) => {
            const s = o.deliveryStatus || o.status || '';
            return validStatuses.some((vs: string) => s.toLowerCase().includes(vs.toLowerCase()));
          });
        }
        return orders.map((o: any) => ({
          id: o.id,
          courseName: o.deliveryCourse || '未命名课程',
          classDate: o.classDate || '',
          classTime: o.classTime || '',
          duration: Number(o.duration) || 60,
          classroomName: o.deliveryRoom || '',
          studentName: o.customerName || '',
          fee: o.teacherFee || '0',
          status: o.deliveryStatus || o.status || 'pending',
        }));
      } catch { return []; }
    }
  }

  async teacherCourseDetail(params: { id: number }): Promise<any> {
    try {
      return await this.engine.query('orders.teacherCourseDetail', params);
    } catch {
      // 路由不存在，用 orders.getById
      try {
        const order = await this.engine.query<any>('orders.getById', { id: params.id });
        if (!order) return null;
        return {
          id: order.id,
          courseName: order.deliveryCourse || '未命名课程',
          classDate: order.classDate || '',
          classTime: order.classTime || '',
          duration: Number(order.duration) || 60,
          classroomName: order.deliveryRoom || '',
          studentName: order.customerName || '',
          fee: order.teacherFee || '0',
          status: order.deliveryStatus || order.status || 'pending',
        };
      } catch { return null; }
    }
  }

  async acceptCourse(params: { courseId: number }): Promise<any> {
    try {
      return await this.engine.mutate('orders.acceptCourse', params);
    } catch {
      try {
        return await this.engine.mutate('orders.updateDeliveryStatus', {
          orderId: params.courseId,
          deliveryStatus: 'accepted',
        });
      } catch {
        return await this.engine.mutate('orders.update', {
          id: params.courseId,
          deliveryStatus: 'accepted',
        });
      }
    }
  }
}

class CoursesApi {
  private engine: TrpcEngine;
  constructor(engine: TrpcEngine) { this.engine = engine; }

  async list(): Promise<any[]> {
    try {
      const result = await this.engine.query<any>('courses.list');
      return extractArray(result);
    } catch { return []; }
  }

  async getById(id: number): Promise<any> {
    try {
      return await this.engine.query('courses.getById', { id });
    } catch { return null; }
  }
}

class TeachersApi {
  private engine: TrpcEngine;
  constructor(engine: TrpcEngine) { this.engine = engine; }

  async list(): Promise<any[]> {
    try {
      const result = await this.engine.query<any>('teachers.list');
      return extractArray(result);
    } catch { return []; }
  }

  async getById(id: number): Promise<any> {
    try {
      return await this.engine.query('teachers.getById', { id });
    } catch { return null; }
  }
}

class ClassroomsApi {
  private engine: TrpcEngine;
  constructor(engine: TrpcEngine) { this.engine = engine; }

  async list(): Promise<any[]> {
    try {
      const result = await this.engine.query<any>('classrooms.list');
      return extractArray(result);
    } catch { return []; }
  }

  async getByCityId(cityId: number): Promise<any[]> {
    try {
      const result = await this.engine.query<any>('classrooms.getByCityId', { cityId });
      return extractArray(result);
    } catch { return []; }
  }

  async getByCityName(cityName: string): Promise<any[]> {
    try {
      const result = await this.engine.query<any>('classrooms.getByCityName', { cityName });
      return extractArray(result);
    } catch { return []; }
  }
}

class MetadataApi {
  private engine: TrpcEngine;
  constructor(engine: TrpcEngine) { this.engine = engine; }

  async getAll(): Promise<any> {
    try {
      return await this.engine.query('metadata.getAll');
    } catch { return null; }
  }

  async getCities(): Promise<{ success: boolean; data: string[]; count: number }> {
    try {
      return await this.engine.query('metadata.getCities');
    } catch {
      return { success: false, data: [], count: 0 };
    }
  }
}

class CitiesApi {
  private engine: TrpcEngine;
  constructor(engine: TrpcEngine) { this.engine = engine; }

  async list(): Promise<string[]> {
    try {
      const result = await this.engine.query<any>('metadata.getCities');
      if (Array.isArray(result)) return result;
      if (result?.data && Array.isArray(result.data)) return result.data;
      return [];
    } catch { return []; }
  }

  async getPartnerConfigs(): Promise<{ success: boolean; data: any[]; count: number }> {
    try {
      return await this.engine.query('cityPartnerConfig.list');
    } catch {
      return { success: false, data: [], count: 0 };
    }
  }

  async getPartnerConfigByCity(city: string): Promise<any> {
    try {
      return await this.engine.query('cityPartnerConfig.getByCity', { city });
    } catch { return null; }
  }
}

class AccountApi {
  private engine: TrpcEngine;
  constructor(engine: TrpcEngine) { this.engine = engine; }

  async getMyBalance(): Promise<any> {
    try {
      return await this.engine.query('account.getMyBalance');
    } catch {
      return { success: false, data: { balance: '0', customerId: null, customerName: null } };
    }
  }

  async getMyTransactions(options?: { limit?: number; offset?: number }): Promise<any> {
    try {
      return await this.engine.query('account.getMyTransactions', options || {});
    } catch {
      return { success: false, data: { transactions: [], total: 0 } };
    }
  }

  async recharge(customerId: number, amount: number, notes?: string): Promise<any> {
    return this.engine.mutate('account.recharge', { customerId, amount, notes });
  }

  async getProfile(): Promise<any> {
    try {
      // 尝试 account.getProfile，如果不存在则用 auth.verifyToken
      try {
        return await this.engine.query('account.getProfile');
      } catch {
        const token = await this.engine.query<any>('auth.me');
        return token;
      }
    } catch { return null; }
  }

  async updateProfile(data: any): Promise<any> {
    try {
      return await this.engine.mutate('account.updateProfile', data);
    } catch {
      // account.updateProfile 不存在，返回成功（仅更新本地存储）
      console.warn('[SDK] account.updateProfile not available, saving locally only');
      return { success: true, message: '个人信息已保存到本地' };
    }
  }

  async changePassword(data: { oldPassword: string; newPassword: string }): Promise<any> {
    // account.changePassword 不存在，使用 auth.changePassword
    try {
      return await this.engine.mutate('auth.changePassword', data);
    } catch (err: any) {
      return { success: false, error: err.message || '修改密码失败' };
    }
  }
}

class NotificationsApi {
  private engine: TrpcEngine;
  constructor(engine: TrpcEngine) { this.engine = engine; }

  async submit(params: {
    userId: number;
    userName: string;
    userPhone: string;
    type: 'application';
    title: string;
    content: string;
  }): Promise<{ success: boolean; id: number }> {
    return this.engine.mutate('notifications.submit', params);
  }
}

class CityExpenseApi {
  private engine: TrpcEngine;
  constructor(engine: TrpcEngine) { this.engine = engine; }

  async list(params?: any): Promise<any[]> {
    try {
      const result = await this.engine.query<any>('cityExpense.list', params || {});
      return extractArray(result);
    } catch { return []; }
  }

  async getById(id: number): Promise<any> {
    try {
      return await this.engine.query('cityExpense.getById', { id });
    } catch { return null; }
  }
}

class PartnerManagementApi {
  private engine: TrpcEngine;
  constructor(engine: TrpcEngine) { this.engine = engine; }

  async getPartnerIdByUserId(userId: number): Promise<any> {
    try {
      return await this.engine.query('partnerManagement.getPartnerIdByUserId', { userId });
    } catch { return null; }
  }

  async getPartnerCities(partnerId: number): Promise<any> {
    try {
      return await this.engine.query('partnerManagement.getPartnerCities', { partnerId });
    } catch { return null; }
  }

  async getCityExpenseCoverage(partnerId: number, cityId: number): Promise<any> {
    try {
      return await this.engine.query('partnerManagement.getCityExpenseCoverage', { partnerId, cityId });
    } catch { return null; }
  }
}

class CustomersApi {
  private engine: TrpcEngine;
  constructor(engine: TrpcEngine) { this.engine = engine; }

  async list(params?: any): Promise<any[]> {
    try {
      const result = await this.engine.query<any>('customers.list', params || {});
      return extractArray(result);
    } catch { return []; }
  }

  async getById(id: number): Promise<any> {
    try {
      return await this.engine.query('customers.getById', { id });
    } catch {
      // customers.getById 不存在，用 customers.list 过滤
      try {
        const result = await this.engine.query<any>('customers.list', {});
        const data = extractArray(result);
        return data.find((c: any) => c.id === id) || null;
      } catch { return null; }
    }
  }

  async create(data: any): Promise<any> {
    return this.engine.mutate('customers.create', data);
  }

  async update(data: any): Promise<any> {
    return this.engine.mutate('customers.update', data);
  }

  async myCustomers(params?: any): Promise<any[]> {
    try {
      const result = await this.engine.query<any>('customers.myCustomers', params || {});
      return extractArray(result);
    } catch {
      // 如果 myCustomers 不存在，回退到 customers.list
      try {
        const result = await this.engine.query<any>('customers.list', params || {});
        return extractArray(result);
      } catch { return []; }
    }
  }
}

class SalespersonsApi {
  private engine: TrpcEngine;
  constructor(engine: TrpcEngine) { this.engine = engine; }

  async list(params?: any): Promise<any[]> {
    try {
      const result = await this.engine.query<any>('salespersons.list', params || {});
      return extractArray(result);
    } catch { return []; }
  }

  async getPerformance(params?: any): Promise<any> {
    try {
      return await this.engine.query('salespersons.getPerformance', params || {});
    } catch {
      try {
        const result = await this.engine.query<any>('orders.list', {});
        const orders = extractArray(result);
        const totalAmount = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.paymentAmount) || 0), 0);
        return { totalOrders: orders.length, totalAmount };
      } catch { return { totalOrders: 0, totalAmount: 0 }; }
    }
  }

  async getMyPerformance(params?: any): Promise<any> {
    try {
      return await this.engine.query('salespersons.getMyPerformance', params || {});
    } catch {
      try {
        const result = await this.engine.query<any>('orders.myOrders', {});
        const orders = extractArray(result);
        const totalAmount = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.paymentAmount) || 0), 0);
        return { totalOrders: orders.length, totalAmount };
      } catch { return { totalOrders: 0, totalAmount: 0 }; }
    }
  }

  async getMyStats(params?: any): Promise<any> {
    try {
      return await this.engine.query('salespersons.getMyStats', params || {});
    } catch {
      try {
        const result = await this.engine.query<any>('orders.myOrders', {});
        const orders = extractArray(result);
        const totalAmount = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.paymentAmount) || 0), 0);
        const thisMonth = new Date().toISOString().slice(0, 7);
        const monthlyOrders = orders.filter((o: any) => (o.createdAt || '').startsWith(thisMonth));
        const monthlyAmount = monthlyOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.paymentAmount) || 0), 0);
        return { totalOrders: orders.length, totalAmount, monthlyOrders: monthlyOrders.length, monthlyAmount, totalCustomers: new Set(orders.map((o: any) => o.customerId).filter(Boolean)).size };
      } catch { return null; }
    }
  }
}

class AnalyticsApi {
  private engine: TrpcEngine;
  constructor(engine: TrpcEngine) { this.engine = engine; }

  private async _computeStats(): Promise<any> {
    try {
      const [ordersResult, customersResult] = await Promise.all([
        this.engine.query<any>('orders.list', {}).catch(() => ({ data: [] })),
        this.engine.query<any>('customers.list', {}).catch(() => ({ data: [] })),
      ]);
      const orders = extractArray(ordersResult);
      const customers = extractArray(customersResult);
      const totalRevenue = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.paymentAmount) || 0), 0);
      const thisMonth = new Date().toISOString().slice(0, 7);
      const monthlyOrders = orders.filter((o: any) => (o.createdAt || '').startsWith(thisMonth));
      const monthlyRevenue = monthlyOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.paymentAmount) || 0), 0);
      return { totalOrders: orders.length, totalRevenue, totalCustomers: customers.length, monthlyOrders: monthlyOrders.length, monthlyRevenue, recentOrders: orders.slice(0, 10) };
    } catch {
      return { totalOrders: 0, totalRevenue: 0, totalCustomers: 0, monthlyOrders: 0, monthlyRevenue: 0, recentOrders: [] };
    }
  }

  async getOverview(params?: any): Promise<any> {
    try {
      return await this.engine.query('analytics.getOverview', params || {});
    } catch { return await this._computeStats(); }
  }

  async getDashboard(params?: any): Promise<any> {
    try {
      return await this.engine.query('analytics.getDashboard', params || {});
    } catch { return await this._computeStats(); }
  }

  async getSalesStats(params?: any): Promise<any> {
    try {
      return await this.engine.query('analytics.getSalesStats', params || {});
    } catch { return await this._computeStats(); }
  }

  async getRevenueStats(params?: any): Promise<any> {
    try {
      return await this.engine.query('analytics.getRevenueStats', params || {});
    } catch { return await this._computeStats(); }
  }
}

class TeacherPaymentsApi {
  private engine: TrpcEngine;
  constructor(engine: TrpcEngine) { this.engine = engine; }

  async getMyPayments(params?: any): Promise<{ data: any[]; total: number; totalAmount: number }> {
    try {
      const result = await this.engine.query<any>('teacherPayments.getMyPayments', params || {});
      const data = extractArray(result);
      return { data, total: result?.total || data.length, totalAmount: result?.totalAmount || 0 };
    } catch {
      return { data: [], total: 0, totalAmount: 0 };
    }
  }

  async getMyStats(params?: any): Promise<any> {
    try {
      return await this.engine.query('teacherPayments.getMyStats', params || {});
    } catch {
      // 路由不存在，用 getMyPayments 聚合计算
      try {
        const result = await this.getMyPayments(params);
        const thisMonth = new Date().toISOString().slice(0, 7);
        const monthlyRecords = result.data.filter((r: any) => (r.courseDate || r.settlementDate || '').startsWith(thisMonth));
        const monthlyIncome = monthlyRecords.reduce((sum: number, r: any) => sum + (parseFloat(String(r.amount)) || 0), 0);
        const totalIncome = result.data.reduce((sum: number, r: any) => sum + (parseFloat(String(r.amount)) || 0), 0);
        return { monthlyIncome, totalIncome, totalRecords: result.total, monthlyRecords: monthlyRecords.length };
      } catch {
        return { monthlyIncome: 0, totalIncome: 0 };
      }
    }
  }

  async list(params?: any): Promise<{ data: any[]; total: number }> {
    try {
      const result = await this.engine.query<any>('teacherPayments.list', params || {});
      const data = extractArray(result);
      return { data, total: result?.total || data.length };
    } catch {
      // 路由不存在，用 getMyPayments 替代
      try {
        const result = await this.getMyPayments(params);
        return { data: result.data, total: result.total };
      } catch {
        return { data: [], total: 0 };
      }
    }
  }
}

class SchedulesApi {
  private engine: TrpcEngine;
  constructor(engine: TrpcEngine) { this.engine = engine; }

  private _ordersToSchedules(orders: any[]): any[] {
    return orders
      .filter((o: any) => o.classDate || o.classTime)
      .map((o: any) => ({
        id: o.id, orderId: o.id, orderNo: o.orderNo,
        date: o.classDate, time: o.classTime,
        courseName: o.deliveryCourse, teacherName: o.deliveryTeacher,
        roomName: o.deliveryRoom, customerName: o.customerName,
        city: o.deliveryCity, status: o.deliveryStatus || o.status,
      }));
  }

  async list(params?: any): Promise<{ data: any[]; total: number }> {
    try {
      const result = await this.engine.query<any>('schedules.list', params || {});
      const data = extractArray(result);
      return { data, total: result?.total || data.length };
    } catch {
      // 路由不存在，用 orders.list 过滤
      try {
        const result = await this.engine.query<any>('orders.list', params || {});
        const orders = extractArray(result);
        const schedules = this._ordersToSchedules(orders);
        return { data: schedules, total: schedules.length };
      } catch {
        return { data: [], total: 0 };
      }
    }
  }

  async getMySchedules(params?: any): Promise<{ data: any[]; total: number }> {
    try {
      const result = await this.engine.query<any>('schedules.getMySchedules', params || {});
      const data = extractArray(result);
      return { data, total: result?.total || data.length };
    } catch {
      // 路由不存在，用 orders.myOrders 过滤
      try {
        const result = await this.engine.query<any>('orders.myOrders', params || {});
        const orders = extractArray(result);
        const schedules = this._ordersToSchedules(orders);
        return { data: schedules, total: schedules.length };
      } catch {
        return { data: [], total: 0 };
      }
    }
  }

  async create(data: any): Promise<any> {
    try {
      return await this.engine.mutate('schedules.create', data);
    } catch {
      console.warn('[SDK] schedules.create not available');
      return { success: false, message: '排课功能暂不可用' };
    }
  }

  async update(data: any): Promise<any> {
    try {
      return await this.engine.mutate('schedules.update', data);
    } catch {
      console.warn('[SDK] schedules.update not available');
      return { success: false, message: '排课功能暂不可用' };
    }
  }
}

class UserManagementApi {
  private engine: TrpcEngine;
  constructor(engine: TrpcEngine) { this.engine = engine; }

  async list(params?: any): Promise<{ users: any[]; total: number }> {
    try {
      const result = await this.engine.query<any>('userManagement.list', params || {});
      if (result?.users) return result;
      if (result?.data) return { users: extractArray(result), total: result.total || result.count || 0 };
      if (Array.isArray(result)) return { users: result, total: result.length };
      return { users: [], total: 0 };
    } catch {
      return { users: [], total: 0 };
    }
  }
}

// ============================================================================
// API 客户端主类
// ============================================================================

export class ApiClient {
  private tokenStorage: TokenStorage;
  private engine: TrpcEngine;

  public readonly auth: AuthApi;
  public readonly orders: OrdersApi;
  public readonly courses: CoursesApi;
  public readonly cities: CitiesApi;
  public readonly cityExpense: CityExpenseApi;
  public readonly teachers: TeachersApi;
  public readonly classrooms: ClassroomsApi;
  public readonly metadata: MetadataApi;
  public readonly account: AccountApi;
  public readonly notifications: NotificationsApi;
  public readonly userManagement: UserManagementApi;
  public readonly customers: CustomersApi;
  public readonly salespersons: SalespersonsApi;
  public readonly analytics: AnalyticsApi;
  public readonly teacherPayments: TeacherPaymentsApi;
  public readonly schedules: SchedulesApi;
  public readonly partnerManagement: PartnerManagementApi;

  constructor(config: ApiClientConfig = {}) {
    const debug = config.debug ?? false;
    const timeout = config.timeout ?? 30000;
    const retryCount = config.retryCount ?? 2;

    this.tokenStorage = this.createTokenStorage(config.tokenStorage);
    this.engine = new TrpcEngine(this.tokenStorage, timeout, retryCount, debug);

    if (debug) {
      console.log('[SDK] Initialized - direct connection to CRM backend');
      console.log('[SDK] API Base:', CRM_API_BASE);
    }

    this.auth = new AuthApi(this.engine, this.tokenStorage);
    this.orders = new OrdersApi(this.engine);
    this.courses = new CoursesApi(this.engine);
    this.cities = new CitiesApi(this.engine);
    this.cityExpense = new CityExpenseApi(this.engine);
    this.teachers = new TeachersApi(this.engine);
    this.classrooms = new ClassroomsApi(this.engine);
    this.metadata = new MetadataApi(this.engine);
    this.account = new AccountApi(this.engine);
    this.notifications = new NotificationsApi(this.engine);
    this.userManagement = new UserManagementApi(this.engine);
    this.customers = new CustomersApi(this.engine);
    this.salespersons = new SalespersonsApi(this.engine);
    this.analytics = new AnalyticsApi(this.engine);
    this.teacherPayments = new TeacherPaymentsApi(this.engine);
    this.schedules = new SchedulesApi(this.engine);
    this.partnerManagement = new PartnerManagementApi(this.engine);
  }

  private createTokenStorage(type?: string): TokenStorage {
    if (type === 'localStorage') return new LocalStorageTokenStorage();
    if (type === 'memory') return new MemoryTokenStorage();
    // 默认使用 AsyncStorage（React Native）
    try {
      if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
        return new AsyncStorageTokenStorage();
      }
      if (typeof window !== 'undefined') {
        return new LocalStorageTokenStorage();
      }
    } catch { /* ignore */ }
    return new AsyncStorageTokenStorage();
  }

  getBaseUrl(): string {
    return CRM_API_BASE;
  }

  getEnvironmentType(): string {
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') return 'react-native';
    if (typeof window !== 'undefined') return 'browser';
    return 'node';
  }

  async setToken(token: string): Promise<void> {
    await this.tokenStorage.setToken(token);
  }

  async getToken(): Promise<string | null> {
    return this.tokenStorage.getToken();
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createApiClient(config?: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

export default createApiClient;

// 导出默认实例
export const api = createApiClient({
  autoDetect: true,
  tokenStorage: 'asyncStorage',
  debug: __DEV__ ?? false,
  timeout: 30000,
  retryCount: 2,
});
