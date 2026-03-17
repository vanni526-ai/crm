/**
 * 增强缓存管理器
 * 
 * 在原有 Cache 基础上增加：
 * - 更多数据类型的缓存支持
 * - 缓存预热
 * - 缓存统计
 * - 自动过期清理
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import errorLogger from './error-logger';

// 缓存键常量（扩展）
export const ENHANCED_CACHE_KEYS = {
  // 基础数据
  CITY_LIST: 'cache_city_list',
  COURSE_LIST: 'cache_course_list',
  TEACHER_LIST: 'cache_teacher_list',
  CLASSROOM_LIST: 'cache_classroom_list',
  // 用户数据
  USER_PROFILE: 'cache_user_profile',
  USER_BALANCE: 'cache_user_balance',
  USER_ORDERS: 'cache_user_orders',
  // 管理数据
  ADMIN_ORDERS: 'cache_admin_orders',
  ADMIN_USERS: 'cache_admin_users',
  ADMIN_TEACHERS: 'cache_admin_teachers',
  COURSES: 'cache_courses',
  // 统计数据
  SALES_PERFORMANCE: 'cache_sales_performance',
  TEACHER_INCOME: 'cache_teacher_income',
  FINANCE_STATS: 'cache_finance_stats',
} as const;

// 缓存有效期配置（毫秒）
const CACHE_TTL: Record<string, number> = {
  [ENHANCED_CACHE_KEYS.CITY_LIST]: 24 * 60 * 60 * 1000,       // 1天
  [ENHANCED_CACHE_KEYS.COURSE_LIST]: 12 * 60 * 60 * 1000,     // 12小时
  [ENHANCED_CACHE_KEYS.TEACHER_LIST]: 6 * 60 * 60 * 1000,     // 6小时
  [ENHANCED_CACHE_KEYS.CLASSROOM_LIST]: 24 * 60 * 60 * 1000,  // 1天
  [ENHANCED_CACHE_KEYS.USER_PROFILE]: 30 * 60 * 1000,         // 30分钟
  [ENHANCED_CACHE_KEYS.USER_BALANCE]: 5 * 60 * 1000,          // 5分钟
  [ENHANCED_CACHE_KEYS.USER_ORDERS]: 5 * 60 * 1000,           // 5分钟
  [ENHANCED_CACHE_KEYS.ADMIN_ORDERS]: 3 * 60 * 1000,          // 3分钟
  [ENHANCED_CACHE_KEYS.ADMIN_USERS]: 10 * 60 * 1000,          // 10分钟
  [ENHANCED_CACHE_KEYS.ADMIN_TEACHERS]: 10 * 60 * 1000,       // 10分钟
  [ENHANCED_CACHE_KEYS.COURSES]: 12 * 60 * 60 * 1000,         // 12小时
  [ENHANCED_CACHE_KEYS.SALES_PERFORMANCE]: 5 * 60 * 1000,     // 5分钟
  [ENHANCED_CACHE_KEYS.TEACHER_INCOME]: 5 * 60 * 1000,        // 5分钟
  [ENHANCED_CACHE_KEYS.FINANCE_STATS]: 5 * 60 * 1000,         // 5分钟
};

const DEFAULT_TTL = 10 * 60 * 1000; // 默认10分钟

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class EnhancedCacheManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private hitCount = 0;
  private missCount = 0;

  /**
   * 获取缓存数据
   */
  async get<T>(key: string): Promise<T | null> {
    // 先检查内存缓存
    const memEntry = this.memoryCache.get(key);
    if (memEntry && !this.isExpired(memEntry)) {
      this.hitCount++;
      return memEntry.data as T;
    }

    // 再检查持久化缓存
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (!this.isExpired(entry)) {
          // 回填内存缓存
          this.memoryCache.set(key, entry);
          this.hitCount++;
          return entry.data;
        }
        // 过期则清除
        await AsyncStorage.removeItem(key);
      }
    } catch (err) {
      errorLogger.warn('EnhancedCache', `Failed to read cache for key: ${key}`, { error: err });
    }

    this.missCount++;
    return null;
  }

  /**
   * 设置缓存数据
   */
  async set<T>(key: string, data: T, customTtl?: number): Promise<void> {
    const ttl = customTtl || CACHE_TTL[key] || DEFAULT_TTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    // 写入内存缓存
    this.memoryCache.set(key, entry);

    // 写入持久化缓存
    try {
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (err) {
      errorLogger.warn('EnhancedCache', `Failed to write cache for key: ${key}`, { error: err });
    }
  }

  /**
   * 删除缓存
   */
  async remove(key: string): Promise<void> {
    this.memoryCache.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // 忽略
    }
  }

  /**
   * 清除所有缓存
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    const keys = Object.values(ENHANCED_CACHE_KEYS);
    try {
      await AsyncStorage.multiRemove(keys);
    } catch {
      // 忽略
    }
  }

  /**
   * 带缓存的数据获取
   * 先尝试从缓存获取，缓存未命中则调用 fetcher 获取并缓存
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    customTtl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, customTtl);
    return data;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { hitCount: number; missCount: number; hitRate: string; memorySize: number } {
    const total = this.hitCount + this.missCount;
    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? `${((this.hitCount / total) * 100).toFixed(1)}%` : '0%',
      memorySize: this.memoryCache.size,
    };
  }

  /**
   * 检查缓存是否过期
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }
}

// 导出单例
export const enhancedCache = new EnhancedCacheManager();
export default enhancedCache;
