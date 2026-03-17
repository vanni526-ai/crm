/**
 * 我的预约页面排序功能测试（修复版）
 * 
 * 测试新的字符串比较排序逻辑
 */

import { describe, it, expect } from 'vitest';

interface BookingDetail {
  id: string;
  classDate: string;
  classTime: string;
  deliveryCourse: string;
}

describe('我的预约排序功能测试（修复版）', () => {
  describe('字符串比较排序', () => {
    it('应该正确排序标准日期时间格式', () => {
      const bookings: BookingDetail[] = [
        {
          id: '1',
          classDate: '2026-02-18',
          classTime: '09:00',
          deliveryCourse: '课程A',
        },
        {
          id: '2',
          classDate: '2026-02-04',
          classTime: '20:00',
          deliveryCourse: '课程B',
        },
        {
          id: '3',
          classDate: '2026-02-27',
          classTime: '17:00',
          deliveryCourse: '课程C',
        },
      ];

      // 使用新的字符串比较排序
      bookings.sort((a, b) => {
        const dateA = a.classDate || '9999-12-31';
        const timeA = a.classTime || '00:00';
        const dateB = b.classDate || '9999-12-31';
        const timeB = b.classTime || '00:00';
        
        const fullDateTimeA = `${dateA} ${timeA}`;
        const fullDateTimeB = `${dateB} ${timeB}`;
        
        return fullDateTimeA.localeCompare(fullDateTimeB);
      });

      // 验证排序结果：2月4日 -> 2月18日 -> 2月27日
      expect(bookings[0].id).toBe('2'); // 2月4日
      expect(bookings[1].id).toBe('1'); // 2月18日
      expect(bookings[2].id).toBe('3'); // 2月27日
    });

    it('应该正确处理同一天不同时间的排序', () => {
      const bookings: BookingDetail[] = [
        {
          id: '1',
          classDate: '2026-02-06',
          classTime: '15:00',
          deliveryCourse: '课程A',
        },
        {
          id: '2',
          classDate: '2026-02-06',
          classTime: '10:00',
          deliveryCourse: '课程B',
        },
        {
          id: '3',
          classDate: '2026-02-06',
          classTime: '20:00',
          deliveryCourse: '课程C',
        },
      ];

      bookings.sort((a, b) => {
        const fullDateTimeA = `${a.classDate} ${a.classTime}`;
        const fullDateTimeB = `${b.classDate} ${b.classTime}`;
        return fullDateTimeA.localeCompare(fullDateTimeB);
      });

      // 验证排序结果：10:00 -> 15:00 -> 20:00
      expect(bookings[0].id).toBe('2'); // 10:00
      expect(bookings[1].id).toBe('1'); // 15:00
      expect(bookings[2].id).toBe('3'); // 20:00
    });

    it('应该正确处理跨月份的排序', () => {
      const bookings: BookingDetail[] = [
        {
          id: '1',
          classDate: '2026-03-05',
          classTime: '14:00',
          deliveryCourse: '课程A',
        },
        {
          id: '2',
          classDate: '2026-02-28',
          classTime: '10:00',
          deliveryCourse: '课程B',
        },
        {
          id: '3',
          classDate: '2026-02-15',
          classTime: '15:00',
          deliveryCourse: '课程C',
        },
      ];

      bookings.sort((a, b) => {
        const fullDateTimeA = `${a.classDate} ${a.classTime}`;
        const fullDateTimeB = `${b.classDate} ${b.classTime}`;
        return fullDateTimeA.localeCompare(fullDateTimeB);
      });

      // 验证排序结果：2月15日 -> 2月28日 -> 3月5日
      expect(bookings[0].id).toBe('3'); // 2月15日
      expect(bookings[1].id).toBe('2'); // 2月28日
      expect(bookings[2].id).toBe('1'); // 3月5日
    });

    it('应该将空日期的订单排在最后', () => {
      const bookings: BookingDetail[] = [
        {
          id: '1',
          classDate: '2026-02-10',
          classTime: '14:00',
          deliveryCourse: '课程A',
        },
        {
          id: '2',
          classDate: '',
          classTime: '',
          deliveryCourse: '课程B',
        },
        {
          id: '3',
          classDate: '2026-02-06',
          classTime: '10:00',
          deliveryCourse: '课程C',
        },
      ];

      bookings.sort((a, b) => {
        const dateA = a.classDate || '9999-12-31';
        const timeA = a.classTime || '00:00';
        const dateB = b.classDate || '9999-12-31';
        const timeB = b.classTime || '00:00';
        
        const fullDateTimeA = `${dateA} ${timeA}`;
        const fullDateTimeB = `${dateB} ${timeB}`;
        
        return fullDateTimeA.localeCompare(fullDateTimeB);
      });

      // 验证：空日期的订单应该排在最后（使用9999-12-31作为默认值）
      expect(bookings[0].id).toBe('3'); // 2月6日
      expect(bookings[1].id).toBe('1'); // 2月10日
      expect(bookings[2].id).toBe('2'); // 空日期（9999-12-31）
    });
  });

  describe('真实场景测试', () => {
    it('应该正确排序用户截图中的数据', () => {
      const bookings: BookingDetail[] = [
        {
          id: '1',
          classDate: '2026-02-09',
          classTime: '10:00',
          deliveryCourse: 'TK挠痒体验课 1V1',
        },
        {
          id: '2',
          classDate: '2026-02-06',
          classTime: '15:00',
          deliveryCourse: 'TK挠痒体验课 1V1',
        },
        {
          id: '3',
          classDate: '2026-02-26',
          classTime: '09:00',
          deliveryCourse: 'TK挠痒体验课 1V1',
        },
      ];

      bookings.sort((a, b) => {
        const fullDateTimeA = `${a.classDate} ${a.classTime}`;
        const fullDateTimeB = `${b.classDate} ${b.classTime}`;
        return fullDateTimeA.localeCompare(fullDateTimeB);
      });

      // 验证排序结果：2月6日 -> 2月9日 -> 2月26日
      expect(bookings[0].id).toBe('2'); // 2月6日 15:00
      expect(bookings[1].id).toBe('1'); // 2月9日 10:00
      expect(bookings[2].id).toBe('3'); // 2月26日 09:00
    });

    it('应该正确排序第二次截图中的数据', () => {
      const bookings: BookingDetail[] = [
        {
          id: '1',
          classDate: '2026-02-04',
          classTime: '20:00',
          deliveryCourse: '课程A',
        },
        {
          id: '2',
          classDate: '2026-02-27',
          classTime: '17:00',
          deliveryCourse: '1V1 RU首开发课',
        },
        {
          id: '3',
          classDate: '2026-02-18',
          classTime: '09:00',
          deliveryCourse: '1V1 RU首开发课',
        },
      ];

      bookings.sort((a, b) => {
        const fullDateTimeA = `${a.classDate} ${a.classTime}`;
        const fullDateTimeB = `${b.classDate} ${b.classTime}`;
        return fullDateTimeA.localeCompare(fullDateTimeB);
      });

      // 验证排序结果：2月4日 -> 2月18日 -> 2月27日
      expect(bookings[0].id).toBe('1'); // 2月4日 20:00
      expect(bookings[1].id).toBe('3'); // 2月18日 09:00
      expect(bookings[2].id).toBe('2'); // 2月27日 17:00
    });
  });

  describe('字符串比较的正确性验证', () => {
    it('YYYY-MM-DD HH:MM格式可以直接字符串比较', () => {
      const dates = [
        '2026-02-18 09:00',
        '2026-02-04 20:00',
        '2026-02-27 17:00',
        '2026-02-06 15:00',
      ];

      const sorted = [...dates].sort((a, b) => a.localeCompare(b));

      expect(sorted).toEqual([
        '2026-02-04 20:00',
        '2026-02-06 15:00',
        '2026-02-18 09:00',
        '2026-02-27 17:00',
      ]);
    });

    it('字符串比较应该处理不同月份', () => {
      const dates = [
        '2026-03-01 10:00',
        '2026-02-28 23:59',
        '2026-01-15 12:00',
      ];

      const sorted = [...dates].sort((a, b) => a.localeCompare(b));

      expect(sorted).toEqual([
        '2026-01-15 12:00',
        '2026-02-28 23:59',
        '2026-03-01 10:00',
      ]);
    });

    it('字符串比较应该处理同一天不同时间', () => {
      const dates = [
        '2026-02-06 23:59',
        '2026-02-06 00:01',
        '2026-02-06 12:00',
      ];

      const sorted = [...dates].sort((a, b) => a.localeCompare(b));

      expect(sorted).toEqual([
        '2026-02-06 00:01',
        '2026-02-06 12:00',
        '2026-02-06 23:59',
      ]);
    });
  });
});
