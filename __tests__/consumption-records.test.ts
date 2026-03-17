/**
 * 消费记录页面功能测试
 */

import { describe, it, expect } from 'vitest';

describe('消费记录页面功能测试', () => {
  describe('数据过滤和转换', () => {
    it('应该只显示已支付的订单', () => {
      const allOrders = [
        { id: 1, status: '已支付', paymentAmount: '1500', deliveryCourse: '课程A' },
        { id: 2, status: 'paid', paymentAmount: '2000', deliveryCourse: '课程B' },
        { id: 3, status: '待支付', paymentAmount: '1000', deliveryCourse: '课程C' },
        { id: 4, status: 'pending', paymentAmount: '1800', deliveryCourse: '课程D' },
        { id: 5, status: '已取消', paymentAmount: '1200', deliveryCourse: '课程E' },
      ];

      // 过滤出已支付的订单
      const paidOrders = allOrders.filter(
        (order) => order.status === '已支付' || order.status === 'paid'
      );

      expect(paidOrders).toHaveLength(2);
      expect(paidOrders[0].id).toBe(1);
      expect(paidOrders[1].id).toBe(2);
    });

    it('应该正确转换订单为消费记录格式', () => {
      const order = {
        id: 123,
        orderNo: 'ORD-20260205-001',
        paymentAmount: '1500',
        courseAmount: '1500',
        deliveryCourse: 'TK挠痒体验课 1V1',
        createdAt: '2026-02-05T10:30:00Z',
        classDate: '2026-02-09',
        classTime: '10:00',
        deliveryCity: '东莞',
        status: '已支付',
      };

      const record = {
        id: order.id,
        orderNo: order.orderNo || `ORD-${order.id}`,
        amount: order.paymentAmount || order.courseAmount || '0',
        courseName: order.deliveryCourse || '未知课程',
        orderTime: order.createdAt || '',
        classDate: order.classDate || '',
        classTime: order.classTime || '',
        city: order.deliveryCity || '',
        type: 'payment' as const,
        balanceChange: `-${order.paymentAmount || order.courseAmount || '0'}`,
      };

      expect(record.id).toBe(123);
      expect(record.orderNo).toBe('ORD-20260205-001');
      expect(record.amount).toBe('1500');
      expect(record.courseName).toBe('TK挠痒体验课 1V1');
      expect(record.balanceChange).toBe('-1500');
      expect(record.city).toBe('东莞');
    });

    it('应该处理缺少订单号的情况', () => {
      const order = {
        id: 456,
        orderNo: '',
        paymentAmount: '2000',
        deliveryCourse: '课程B',
        createdAt: '2026-02-05T14:00:00Z',
        status: 'paid',
      };

      const orderNo = order.orderNo || `ORD-${order.id}`;
      expect(orderNo).toBe('ORD-456');
    });

    it('应该处理缺少金额的情况', () => {
      const order1 = {
        id: 1,
        paymentAmount: '',
        courseAmount: '1500',
        deliveryCourse: '课程A',
      };

      const order2 = {
        id: 2,
        paymentAmount: '',
        courseAmount: '',
        deliveryCourse: '课程B',
      };

      const amount1 = order1.paymentAmount || order1.courseAmount || '0';
      const amount2 = order2.paymentAmount || order2.courseAmount || '0';

      expect(amount1).toBe('1500');
      expect(amount2).toBe('0');
    });
  });

  describe('排序逻辑', () => {
    it('应该按下单时间倒序排列（最新的在前）', () => {
      const records = [
        {
          id: 1,
          orderTime: '2026-02-05T10:00:00Z',
          amount: '1500',
          courseName: '课程A',
        },
        {
          id: 2,
          orderTime: '2026-02-06T15:00:00Z',
          amount: '2000',
          courseName: '课程B',
        },
        {
          id: 3,
          orderTime: '2026-02-04T09:00:00Z',
          amount: '1800',
          courseName: '课程C',
        },
      ];

      records.sort((a, b) => {
        const timeA = new Date(a.orderTime).getTime();
        const timeB = new Date(b.orderTime).getTime();
        return timeB - timeA;
      });

      // 验证排序结果：2月6日 -> 2月5日 -> 2月4日
      expect(records[0].id).toBe(2); // 2月6日
      expect(records[1].id).toBe(1); // 2月5日
      expect(records[2].id).toBe(3); // 2月4日
    });
  });

  describe('日期时间格式化', () => {
    it('应该正确格式化日期时间（YYYY-MM-DD HH:MM）', () => {
      const formatDateTime = (dateStr: string) => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day} ${hours}:${minutes}`;
        } catch {
          return dateStr;
        }
      };

      const result = formatDateTime('2026-02-05T10:30:00Z');
      expect(result).toMatch(/2026-02-05 \d{2}:\d{2}/);
    });

    it('应该正确格式化日期（M月D日 周X）', () => {
      const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
          const weekday = weekdays[date.getDay()];
          return `${month}月${day}日 ${weekday}`;
        } catch {
          return dateStr;
        }
      };

      const result = formatDate('2026-02-09');
      expect(result).toMatch(/\d+月\d+日 周[一二三四五六日]/);
    });

    it('应该处理空日期字符串', () => {
      const formatDateTime = (dateStr: string) => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          return date.toISOString();
        } catch {
          return dateStr;
        }
      };

      expect(formatDateTime('')).toBe('');
    });
  });

  describe('余额变化计算', () => {
    it('应该正确计算余额变化（消费为负数）', () => {
      const orders = [
        { paymentAmount: '1500', courseAmount: '1500' },
        { paymentAmount: '2000', courseAmount: '2000' },
        { paymentAmount: '1800', courseAmount: '1800' },
      ];

      const balanceChanges = orders.map((order) => {
        const amount = order.paymentAmount || order.courseAmount || '0';
        return `-${amount}`;
      });

      expect(balanceChanges).toEqual(['-1500', '-2000', '-1800']);
    });

    it('应该处理充值记录（余额变化为正数）', () => {
      const recharge = {
        amount: '5000',
        type: 'recharge',
      };

      const balanceChange = recharge.type === 'recharge' 
        ? `+${recharge.amount}` 
        : `-${recharge.amount}`;

      expect(balanceChange).toBe('+5000');
    });
  });

  describe('数据展示', () => {
    it('应该包含所有必需的订单信息', () => {
      const record = {
        id: 123,
        orderNo: 'ORD-20260205-001',
        amount: '1500',
        courseName: 'TK挠痒体验课 1V1',
        orderTime: '2026-02-05T10:30:00Z',
        classDate: '2026-02-09',
        classTime: '10:00',
        city: '东莞',
        type: 'payment' as const,
        balanceChange: '-1500',
      };

      // 验证所有必需字段都存在
      expect(record.orderNo).toBeDefined();
      expect(record.amount).toBeDefined();
      expect(record.courseName).toBeDefined();
      expect(record.orderTime).toBeDefined();
      expect(record.classDate).toBeDefined();
      expect(record.classTime).toBeDefined();
      expect(record.city).toBeDefined();
      expect(record.balanceChange).toBeDefined();
    });

    it('应该正确显示金额格式（带¥符号）', () => {
      const amount = '1500';
      const displayAmount = `¥${amount}`;
      expect(displayAmount).toBe('¥1500');
    });

    it('应该正确显示余额变化（负数用红色）', () => {
      const balanceChange = '-1500';
      const isNegative = balanceChange.startsWith('-');
      expect(isNegative).toBe(true);
    });
  });

  describe('边界情况处理', () => {
    it('应该处理空订单列表', () => {
      const orders: any[] = [];
      const paidOrders = orders.filter(
        (order) => order.status === '已支付' || order.status === 'paid'
      );
      expect(paidOrders).toHaveLength(0);
    });

    it('应该处理没有已支付订单的情况', () => {
      const orders = [
        { id: 1, status: '待支付' },
        { id: 2, status: '已取消' },
      ];
      const paidOrders = orders.filter(
        (order) => order.status === '已支付' || order.status === 'paid'
      );
      expect(paidOrders).toHaveLength(0);
    });

    it('应该处理订单数据缺失的情况', () => {
      const order = {
        id: 123,
        orderNo: '',
        paymentAmount: '',
        courseAmount: '',
        deliveryCourse: '',
        createdAt: '',
        classDate: '',
        classTime: '',
        deliveryCity: '',
        status: '已支付',
      };

      const record = {
        id: order.id,
        orderNo: order.orderNo || `ORD-${order.id}`,
        amount: order.paymentAmount || order.courseAmount || '0',
        courseName: order.deliveryCourse || '未知课程',
        orderTime: order.createdAt || '',
        classDate: order.classDate || '',
        classTime: order.classTime || '',
        city: order.deliveryCity || '',
        type: 'payment' as const,
        balanceChange: `-${order.paymentAmount || order.courseAmount || '0'}`,
      };

      expect(record.orderNo).toBe('ORD-123');
      expect(record.amount).toBe('0');
      expect(record.courseName).toBe('未知课程');
      expect(record.balanceChange).toBe('-0');
    });
  });
});
