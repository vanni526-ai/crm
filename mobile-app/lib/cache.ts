import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 缓存配置
 */
const CACHE_CONFIG = {
  // 默认缓存时间：1天（24小时）
  DEFAULT_TTL: 24 * 60 * 60 * 1000,
  // 缓存键前缀
  KEY_PREFIX: '@course_booking_cache:',
};

/**
 * 缓存数据结构
 */
interface CacheData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * 缓存工具类
 */
export class Cache {
  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 缓存数据
   * @param ttl 过期时间（毫秒），默认1天
   */
  static async set<T>(key: string, data: T, ttl: number = CACHE_CONFIG.DEFAULT_TTL): Promise<void> {
    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      const cacheKey = CACHE_CONFIG.KEY_PREFIX + key;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error(`[Cache] Failed to set cache for key: ${key}`, error);
    }
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存数据，如果不存在或已过期则返回null
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = CACHE_CONFIG.KEY_PREFIX + key;
      const cacheString = await AsyncStorage.getItem(cacheKey);
      
      if (!cacheString) {
        return null;
      }

      const cacheData: CacheData<T> = JSON.parse(cacheString);
      const now = Date.now();
      const isExpired = now - cacheData.timestamp > cacheData.ttl;

      if (isExpired) {
        // 缓存已过期，删除并返回null
        await this.remove(key);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.error(`[Cache] Failed to get cache for key: ${key}`, error);
      return null;
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  static async remove(key: string): Promise<void> {
    try {
      const cacheKey = CACHE_CONFIG.KEY_PREFIX + key;
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.error(`[Cache] Failed to remove cache for key: ${key}`, error);
    }
  }

  /**
   * 清空所有缓存
   */
  static async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_CONFIG.KEY_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('[Cache] Failed to clear all caches', error);
    }
  }

  /**
   * 检查缓存是否存在且未过期
   * @param key 缓存键
   * @returns true表示缓存存在且未过期
   */
  static async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }
}

/**
 * 缓存键常量
 */
export const CACHE_KEYS = {
  // 我的预约列表
  MY_BOOKINGS: 'my_bookings',
  // 城市列表
  CITY_LIST: 'city_list',
  // 教室列表（按城市缓存）
  CLASSROOM_LIST: (cityId: number) => `classroom_list_${cityId}`,
};
