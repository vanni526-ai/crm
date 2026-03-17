/**
 * 缓存管理器
 * 提供双层缓存（内存 + 持久化）功能
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// 缓存版本，用于数据结构变更时自动清除旧缓存
const CACHE_VERSION = '1.0.0';
const VERSION_KEY = '@cache_version';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  version: string;
}

interface CacheOptions {
  /** 缓存过期时间（毫秒） */
  ttl: number;
  /** 是否启用持久化缓存 */
  persistent?: boolean;
}

/**
 * 内存缓存
 */
class MemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map();

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // 版本检查
    if (item.version !== CACHE_VERSION) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getTimestamp(key: string): number | null {
    const item = this.cache.get(key);
    return item ? item.timestamp : null;
  }
}

/**
 * 持久化缓存
 */
class PersistentCache {
  private async checkVersion(): Promise<void> {
    try {
      const version = await AsyncStorage.getItem(VERSION_KEY);
      if (version !== CACHE_VERSION) {
        // 版本不匹配，清除所有缓存
        await AsyncStorage.clear();
        await AsyncStorage.setItem(VERSION_KEY, CACHE_VERSION);
      }
    } catch (error) {
      console.error('Cache version check failed:', error);
    }
  }

  async set<T>(key: string, data: T): Promise<void> {
    try {
      await this.checkVersion();
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      };
      await AsyncStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error(`Failed to set cache for key ${key}:`, error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      await this.checkVersion();
      const value = await AsyncStorage.getItem(key);
      if (!value) return null;

      const item: CacheItem<T> = JSON.parse(value);
      
      // 版本检查
      if (item.version !== CACHE_VERSION) {
        await this.delete(key);
        return null;
      }
      
      return item.data;
    } catch (error) {
      console.error(`Failed to get cache for key ${key}:`, error);
      return null;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value !== null;
    } catch (error) {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to delete cache for key ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
      await AsyncStorage.setItem(VERSION_KEY, CACHE_VERSION);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  async getTimestamp(key: string): Promise<number | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (!value) return null;
      const item: CacheItem<any> = JSON.parse(value);
      return item.timestamp;
    } catch (error) {
      return null;
    }
  }
}

/**
 * 缓存管理器（单例）
 */
class CacheManager {
  private static instance: CacheManager;
  private memoryCache: MemoryCache;
  private persistentCache: PersistentCache;

  private constructor() {
    this.memoryCache = new MemoryCache();
    this.persistentCache = new PersistentCache();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * 获取缓存数据
   * @param key 缓存键
   * @param options 缓存选项
   * @returns 缓存的数据，如果过期或不存在则返回null
   */
  async get<T>(key: string, options: CacheOptions): Promise<T | null> {
    const now = Date.now();

    // 1. 先检查内存缓存
    if (this.memoryCache.has(key)) {
      const timestamp = this.memoryCache.getTimestamp(key);
      if (timestamp && now - timestamp < options.ttl) {
        return this.memoryCache.get<T>(key);
      } else {
        // 内存缓存过期，删除
        this.memoryCache.delete(key);
      }
    }

    // 2. 如果启用持久化，检查持久化缓存
    if (options.persistent) {
      const timestamp = await this.persistentCache.getTimestamp(key);
      if (timestamp && now - timestamp < options.ttl) {
        const data = await this.persistentCache.get<T>(key);
        if (data) {
          // 恢复到内存缓存
          this.memoryCache.set(key, data);
          return data;
        }
      } else if (timestamp) {
        // 持久化缓存过期，删除
        await this.persistentCache.delete(key);
      }
    }

    return null;
  }

  /**
   * 设置缓存数据
   * @param key 缓存键
   * @param data 要缓存的数据
   * @param options 缓存选项
   */
  async set<T>(key: string, data: T, options: CacheOptions): Promise<void> {
    // 1. 设置内存缓存
    this.memoryCache.set(key, data);

    // 2. 如果启用持久化，设置持久化缓存
    if (options.persistent) {
      await this.persistentCache.set(key, data);
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    await this.persistentCache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    await this.persistentCache.clear();
  }

  /**
   * 批量删除缓存（支持前缀匹配）
   * @param prefix 缓存键前缀
   */
  async deleteByPrefix(prefix: string): Promise<void> {
    // 清除内存缓存
    const memoryKeys = Array.from(this.memoryCache['cache'].keys());
    memoryKeys.forEach(key => {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    });

    // 清除持久化缓存
    try {
      const keys = await AsyncStorage.getAllKeys();
      const matchedKeys = keys.filter(key => key.startsWith(prefix));
      await AsyncStorage.multiRemove(matchedKeys);
    } catch (error) {
      console.error(`Failed to delete cache by prefix ${prefix}:`, error);
    }
  }
}

// 导出单例
export const cacheManager = CacheManager.getInstance();

// 导出缓存配置常量
export const CACHE_CONFIG = {
  // 城市列表：7天
  CITIES: {
    key: '@cache_cities',
    ttl: 7 * 24 * 60 * 60 * 1000,
    persistent: true,
  },
  // 老师列表：内存10分钟，持久化24小时
  TEACHERS: {
    memory: {
      ttl: 10 * 60 * 1000,
      persistent: false,
    },
    persistent: {
      ttl: 24 * 60 * 60 * 1000,
      persistent: true,
    },
  },
  // 课程列表：内存10分钟，持久化24小时
  COURSES: {
    memory: {
      ttl: 10 * 60 * 1000,
      persistent: false,
    },
    persistent: {
      ttl: 24 * 60 * 60 * 1000,
      persistent: true,
    },
  },
  // 预约记录：2分钟
  BOOKINGS: {
    key: '@cache_bookings',
    ttl: 2 * 60 * 1000,
    persistent: false,
  },
  // 用户信息：24小时
  USER: {
    key: '@cache_user',
    ttl: 24 * 60 * 60 * 1000,
    persistent: true,
  },
};

// 生成带参数的缓存键
export function getCacheKey(base: string, params?: Record<string, any>): string {
  if (!params) return base;
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `${base}?${sortedParams}`;
}
