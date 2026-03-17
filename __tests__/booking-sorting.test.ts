/**
 * 我的预约页面排序功能测试
 * 
 * 测试范围：
 * 1. 按上课日期升序排列
 * 2. 最近要上课的订单排在最上方
 * 3. 日期+时间组合排序
 */

import { describe, it, expect } from 'vitest';

// 模拟订单数据类型
interface BookingDetail {
  id: string;
  orderNo: string;
  classDate: string;
  classTime: string;
  deliveryCourse: string;
  deliveryTeacher: string;
  createdAt: string;
}

describe('我的预约排序功能测试', () => {
  describe('按上课日期升序排列', () => {
    it('应该将最近的上课日期排在最前面', () => {
      const bookings: BookingDetail[] = [
        {
          id: '1',
          orderNo: 'ORDER-001',
          classDate: '2026-02-10',
          classTime: '14:00',
          deliveryCourse: '课程A',
          deliveryTeacher: '老师A',
          createdAt: '2026-02-01',
        },
        {
          id: '2',
          orderNo: 'ORDER-002',
          classDate: '2026-02-06',
          classTime: '10:00',
          deliveryCourse: '课程B',
          deliveryTeacher: '老师B',
          createdAt: '2026-02-02',
        },
        {
          id: '3',
          orderNo: 'ORDER-003',
          classDate: '2026-02-08',
          classTime: '15:00',
          deliveryCourse: '课程C',
          deliveryTeacher: '老师C',
          createdAt: '2026-02-03',
        },
      ];

      // 按上课日期升序排列
      bookings.sort((a, b) => {
        const dateTimeA = `${a.classDate} ${a.classTime}`.trim();
        const dateTimeB = `${b.classDate} ${b.classTime}`.trim();
        
        const timeA = new Date(dateTimeA).getTime() || 0;
        const timeB = new Date(dateTimeB).getTime() || 0;
        
        return timeA - timeB;
      });

      // 验证排序结果：2月6日 -> 2月8日 -> 2月10日
      expect(bookings[0].id).toBe('2'); // 2月6日
      expect(bookings[1].id).toBe('3'); // 2月8日
      expect(bookings[2].id).toBe('1'); // 2月10日
    });

    it('应该按日期+时间组合排序，同一天内按时间排序', () => {
      const bookings: BookingDetail[] = [
        {
          id: '1',
          orderNo: 'ORDER-001',
          classDate: '2026-02-06',
          classTime: '15:00',
          deliveryCourse: '课程A',
          deliveryTeacher: '老师A',
          createdAt: '2026-02-01',
        },
        {
          id: '2',
          orderNo: 'ORDER-002',
          classDate: '2026-02-06',
          classTime: '10:00',
          deliveryCourse: '课程B',
          deliveryTeacher: '老师B',
          createdAt: '2026-02-02',
        },
        {
          id: '3',
          orderNo: 'ORDER-003',
          classDate: '2026-02-06',
          classTime: '12:30',
          deliveryCourse: '课程C',
          deliveryTeacher: '老师C',
          createdAt: '2026-02-03',
        },
      ];

      // 按上课日期+时间升序排列
      bookings.sort((a, b) => {
        const dateTimeA = `${a.classDate} ${a.classTime}`.trim();
        const dateTimeB = `${b.classDate} ${b.classTime}`.trim();
        
        const timeA = new Date(dateTimeA).getTime() || 0;
        const timeB = new Date(dateTimeB).getTime() || 0;
        
        return timeA - timeB;
      });

      // 验证排序结果：10:00 -> 12:30 -> 15:00
      expect(bookings[0].id).toBe('2'); // 10:00
      expect(bookings[1].id).toBe('3'); // 12:30
      expect(bookings[2].id).toBe('1'); // 15:00
    });

    it('应该忽略创建时间，只按上课日期排序', () => {
      const bookings: BookingDetail[] = [
        {
          id: '1',
          orderNo: 'ORDER-001',
          classDate: '2026-02-10',
          classTime: '14:00',
          deliveryCourse: '课程A',
          deliveryTeacher: '老师A',
          createdAt: '2026-02-05', // 最晚创建
        },
        {
          id: '2',
          orderNo: 'ORDER-002',
          classDate: '2026-02-06',
          classTime: '10:00',
          deliveryCourse: '课程B',
          deliveryTeacher: '老师B',
          createdAt: '2026-02-01', // 最早创建
        },
      ];

      // 按上课日期升序排列（忽略创建时间）
      bookings.sort((a, b) => {
        const dateTimeA = `${a.classDate} ${a.classTime}`.trim();
        const dateTimeB = `${b.classDate} ${b.classTime}`.trim();
        
        const timeA = new Date(dateTimeA).getTime() || 0;
        const timeB = new Date(dateTimeB).getTime() || 0;
        
        return timeA - timeB;
      });

      // 验证：即使ORDER-001创建时间更晚，但因为上课日期更晚，所以排在后面
      expect(bookings[0].id).toBe('2'); // 2月6日（虽然创建时间早）
      expect(bookings[1].id).toBe('1'); // 2月10日（虽然创建时间晚）
    });

    it('应该处理不同月份的日期排序', () => {
      const bookings: BookingDetail[] = [
        {
          id: '1',
          orderNo: 'ORDER-001',
          classDate: '2026-03-05',
          classTime: '14:00',
          deliveryCourse: '课程A',
          deliveryTeacher: '老师A',
          createdAt: '2026-02-01',
        },
        {
          id: '2',
          orderNo: 'ORDER-002',
          classDate: '2026-02-28',
          classTime: '10:00',
          deliveryCourse: '课程B',
          deliveryTeacher: '老师B',
          createdAt: '2026-02-02',
        },
        {
          id: '3',
          orderNo: 'ORDER-003',
          classDate: '2026-02-15',
          classTime: '15:00',
          deliveryCourse: '课程C',
          deliveryTeacher: '老师C',
          createdAt: '2026-02-03',
        },
      ];

      // 按上课日期升序排列
      bookings.sort((a, b) => {
        const dateTimeA = `${a.classDate} ${a.classTime}`.trim();
        const dateTimeB = `${b.classDate} ${b.classTime}`.trim();
        
        const timeA = new Date(dateTimeA).getTime() || 0;
        const timeB = new Date(dateTimeB).getTime() || 0;
        
        return timeA - timeB;
      });

      // 验证排序结果：2月15日 -> 2月28日 -> 3月5日
      expect(bookings[0].id).toBe('3'); // 2月15日
      expect(bookings[1].id).toBe('2'); // 2月28日
      expect(bookings[2].id).toBe('1'); // 3月5日
    });

    it('应该处理空日期或时间的情况', () => {
      const bookings: BookingDetail[] = [
        {
          id: '1',
          orderNo: 'ORDER-001',
          classDate: '2026-02-10',
          classTime: '14:00',
          deliveryCourse: '课程A',
          deliveryTeacher: '老师A',
          createdAt: '2026-02-01',
        },
        {
          id: '2',
          orderNo: 'ORDER-002',
          classDate: '',
          classTime: '',
          deliveryCourse: '课程B',
          deliveryTeacher: '老师B',
          createdAt: '2026-02-02',
        },
        {
          id: '3',
          orderNo: 'ORDER-003',
          classDate: '2026-02-06',
          classTime: '10:00',
          deliveryCourse: '课程C',
          deliveryTeacher: '老师C',
          createdAt: '2026-02-03',
        },
      ];

      // 按上课日期升序排列
      bookings.sort((a, b) => {
        const dateTimeA = `${a.classDate} ${a.classTime}`.trim();
        const dateTimeB = `${b.classDate} ${b.classTime}`.trim();
        
        const timeA = new Date(dateTimeA).getTime() || 0;
        const timeB = new Date(dateTimeB).getTime() || 0;
        
        return timeA - timeB;
      });

      // 验证：空日期的订单应该排在最前面（时间戳为0）
      expect(bookings[0].id).toBe('2'); // 空日期
      expect(bookings[1].id).toBe('3'); // 2月6日
      expect(bookings[2].id).toBe('1'); // 2月10日
    });
  });

  describe('真实场景测试', () => {
    it('应该正确排序混合的订单数据', () => {
      const bookings: BookingDetail[] = [
        {
          id: '1',
          orderNo: '20260205073959-000',
          classDate: '2026-02-06',
          classTime: '15:00',
          deliveryCourse: 'TK挠痒体验课',
          deliveryTeacher: '宥香',
          createdAt: '2026-02-05 07:39:59',
        },
        {
          id: '2',
          orderNo: '20260204123456-001',
          classDate: '2026-02-10',
          classTime: '10:00',
          deliveryCourse: 'SM基础课程',
          deliveryTeacher: '莉娜',
          createdAt: '2026-02-04 12:34:56',
        },
        {
          id: '3',
          orderNo: '20260203111111-002',
          classDate: '2026-02-07',
          classTime: '14:30',
          deliveryCourse: '绳缚入门',
          deliveryTeacher: '小雪',
          createdAt: '2026-02-03 11:11:11',
        },
        {
          id: '4',
          orderNo: '20260202222222-003',
          classDate: '2026-02-06',
          classTime: '11:00',
          deliveryCourse: '滴蜡体验',
          deliveryTeacher: '艾米',
          createdAt: '2026-02-02 22:22:22',
        },
      ];

      // 按上课日期升序排列
      bookings.sort((a, b) => {
        const dateTimeA = `${a.classDate} ${a.classTime}`.trim();
        const dateTimeB = `${b.classDate} ${b.classTime}`.trim();
        
        const timeA = new Date(dateTimeA).getTime() || 0;
        const timeB = new Date(dateTimeB).getTime() || 0;
        
        return timeA - timeB;
      });

      // 验证排序结果
      expect(bookings[0].id).toBe('4'); // 2月6日 11:00
      expect(bookings[1].id).toBe('1'); // 2月6日 15:00
      expect(bookings[2].id).toBe('3'); // 2月7日 14:30
      expect(bookings[3].id).toBe('2'); // 2月10日 10:00
    });
  });
});
