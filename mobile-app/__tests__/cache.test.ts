import { describe, it, expect, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cache, CACHE_KEYS } from '../lib/cache';

describe('Cache', () => {
  beforeEach(async () => {
    // 清空所有缓存
    await Cache.clear();
  });

  describe('set and get', () => {
    it('should set and get cache data', async () => {
      const testData = { name: 'Test', value: 123 };
      await Cache.set('test_key', testData);
      
      const result = await Cache.get('test_key');
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent key', async () => {
      const result = await Cache.get('non_existent_key');
      expect(result).toBeNull();
    });

    it('should handle different data types', async () => {
      // String
      await Cache.set('string_key', 'hello');
      expect(await Cache.get('string_key')).toBe('hello');
      
      // Number
      await Cache.set('number_key', 42);
      expect(await Cache.get('number_key')).toBe(42);
      
      // Boolean
      await Cache.set('boolean_key', true);
      expect(await Cache.get('boolean_key')).toBe(true);
      
      // Array
      await Cache.set('array_key', [1, 2, 3]);
      expect(await Cache.get('array_key')).toEqual([1, 2, 3]);
      
      // Object
      await Cache.set('object_key', { a: 1, b: 2 });
      expect(await Cache.get('object_key')).toEqual({ a: 1, b: 2 });
    });
  });

  describe('expiration', () => {
    it('should return null for expired cache', async () => {
      // 设置100ms过期
      await Cache.set('expired_key', 'test', 100);
      
      // 等待150ms
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const result = await Cache.get('expired_key');
      expect(result).toBeNull();
    });

    it('should return data before expiration', async () => {
      // 设置1秒过期
      await Cache.set('valid_key', 'test', 1000);
      
      // 立即读取
      const result = await Cache.get('valid_key');
      expect(result).toBe('test');
    });

    it('should use default TTL (1 day)', async () => {
      await Cache.set('default_ttl_key', 'test');
      
      // 检查缓存数据结构
      const cacheString = await AsyncStorage.getItem('@course_booking_cache:default_ttl_key');
      expect(cacheString).not.toBeNull();
      
      const cacheData = JSON.parse(cacheString!);
      expect(cacheData.ttl).toBe(24 * 60 * 60 * 1000); // 1天
    });
  });

  describe('remove', () => {
    it('should remove cache data', async () => {
      await Cache.set('remove_key', 'test');
      expect(await Cache.get('remove_key')).toBe('test');
      
      await Cache.remove('remove_key');
      expect(await Cache.get('remove_key')).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all cache data', async () => {
      await Cache.set('key1', 'value1');
      await Cache.set('key2', 'value2');
      await Cache.set('key3', 'value3');
      
      await Cache.clear();
      
      expect(await Cache.get('key1')).toBeNull();
      expect(await Cache.get('key2')).toBeNull();
      expect(await Cache.get('key3')).toBeNull();
    });

    it('should not clear non-cache keys', async () => {
      // 设置一个非缓存的key
      await AsyncStorage.setItem('other_key', 'other_value');
      
      // 设置缓存key
      await Cache.set('cache_key', 'cache_value');
      
      // 清空缓存
      await Cache.clear();
      
      // 非缓存key应该还在
      expect(await AsyncStorage.getItem('other_key')).toBe('other_value');
      
      // 缓存key应该被清空
      expect(await Cache.get('cache_key')).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for existing cache', async () => {
      await Cache.set('exists_key', 'test');
      expect(await Cache.has('exists_key')).toBe(true);
    });

    it('should return false for non-existent cache', async () => {
      expect(await Cache.has('non_existent_key')).toBe(false);
    });

    it('should return false for expired cache', async () => {
      await Cache.set('expired_key', 'test', 100);
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(await Cache.has('expired_key')).toBe(false);
    });
  });

  describe('CACHE_KEYS', () => {
    it('should have correct cache key constants', () => {
      expect(CACHE_KEYS.MY_BOOKINGS).toBe('my_bookings');
      expect(CACHE_KEYS.CITY_LIST).toBe('city_list');
      expect(CACHE_KEYS.CLASSROOM_LIST(123)).toBe('classroom_list_123');
    });
  });

  describe('error handling', () => {
    it('should handle JSON parse errors gracefully', async () => {
      // 手动设置一个无效的JSON
      await AsyncStorage.setItem('@course_booking_cache:invalid_json', 'invalid json');
      
      const result = await Cache.get('invalid_json');
      expect(result).toBeNull();
    });
  });
});
