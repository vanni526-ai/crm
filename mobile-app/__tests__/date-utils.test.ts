import { describe, it, expect } from 'vitest';
import {
  formatBeijingTime,
  getBeijingTime,
  isToday,
  isWithinDays,
} from '../lib/date-utils';

describe('formatBeijingTime', () => {
  // Test with a known UTC timestamp: 2024-02-06 10:30:45 UTC = 2024-02-06 18:30:45 Beijing
  const testTimestamp = 1707215445000;
  const testISOString = '2024-02-06T10:30:45Z';

  it('should format timestamp as full datetime', () => {
    const result = formatBeijingTime(testTimestamp, 'full');
    expect(result).toBe('2024/2/6 18:30:45');
  });

  it('should format timestamp as datetime (default)', () => {
    const result = formatBeijingTime(testTimestamp);
    expect(result).toBe('2024/2/6 18:30');
  });

  it('should format timestamp as date only', () => {
    const result = formatBeijingTime(testTimestamp, 'date');
    expect(result).toBe('2024/2/6');
  });

  it('should format timestamp as time only', () => {
    const result = formatBeijingTime(testTimestamp, 'time');
    expect(result).toBe('18:30:45');
  });

  it('should format timestamp as short time', () => {
    const result = formatBeijingTime(testTimestamp, 'short-time');
    expect(result).toBe('18:30');
  });

  it('should format timestamp as chinese full datetime', () => {
    const result = formatBeijingTime(testTimestamp, 'chinese-full');
    expect(result).toBe('2024年2月6日 18:30:45');
  });

  it('should format timestamp as chinese date', () => {
    const result = formatBeijingTime(testTimestamp, 'chinese-date');
    expect(result).toBe('2024年2月6日');
  });

  it('should accept ISO string as input', () => {
    const result = formatBeijingTime(testISOString, 'datetime');
    expect(result).toBe('2024/2/6 18:30');
  });

  it('should handle invalid timestamp', () => {
    const result = formatBeijingTime('invalid', 'datetime');
    expect(result).toBe('无效时间');
  });

  it('should format recent time as relative', () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const fiveMinutesAgo = now - 300000;
    
    const result1 = formatBeijingTime(now, 'relative');
    expect(result1).toBe('刚刚');
    
    const result2 = formatBeijingTime(oneMinuteAgo, 'relative');
    expect(result2).toMatch(/1分钟前/);
    
    const result3 = formatBeijingTime(fiveMinutesAgo, 'relative');
    expect(result3).toMatch(/5分钟前/);
  });
});

describe('getBeijingTime', () => {
  it('should return a Date object', () => {
    const result = getBeijingTime();
    expect(result).toBeInstanceOf(Date);
  });

  it('should return valid Beijing time', () => {
    const result = getBeijingTime();
    expect(result.getTime()).toBeGreaterThan(0);
    expect(isNaN(result.getTime())).toBe(false);
  });
});

describe('isToday', () => {
  it('should return true for current timestamp', () => {
    const now = Date.now();
    expect(isToday(now)).toBe(true);
  });

  it('should return false for yesterday', () => {
    const yesterday = Date.now() - 86400000; // 24 hours ago
    expect(isToday(yesterday)).toBe(false);
  });

  it('should return false for tomorrow', () => {
    const tomorrow = Date.now() + 86400000; // 24 hours later
    expect(isToday(tomorrow)).toBe(false);
  });
});

describe('isWithinDays', () => {
  it('should return true for current timestamp', () => {
    const now = Date.now();
    expect(isWithinDays(now, 7)).toBe(true);
  });

  it('should return true for timestamp within specified days', () => {
    const threeDaysAgo = Date.now() - 3 * 86400000;
    expect(isWithinDays(threeDaysAgo, 7)).toBe(true);
  });

  it('should return false for timestamp beyond specified days', () => {
    const tenDaysAgo = Date.now() - 10 * 86400000;
    expect(isWithinDays(tenDaysAgo, 7)).toBe(false);
  });

  it('should return false for future timestamp', () => {
    const tomorrow = Date.now() + 86400000;
    expect(isWithinDays(tomorrow, 7)).toBe(false);
  });

  it('should handle edge case of exactly N days ago', () => {
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    expect(isWithinDays(sevenDaysAgo, 7)).toBe(true);
  });
});
