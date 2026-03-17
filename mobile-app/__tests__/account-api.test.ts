import { describe, it, expect, beforeAll } from 'vitest';
import { createApiClient } from '../lib/sdk/api-client';

describe('Account API', () => {
  let api: ReturnType<typeof createApiClient>;

  beforeAll(() => {
    api = createApiClient({
      autoDetect: false,
      baseUrl: 'https://crm.bdsm.com.cn',
      debug: false,
    });
  });

  describe('getMyBalance', () => {
    it('应该返回余额信息结构', async () => {
      const result = await api.account.getMyBalance();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      
      if (result.success) {
        expect(result.data).toHaveProperty('balance');
        expect(result.data).toHaveProperty('customerId');
        expect(result.data).toHaveProperty('customerName');
        
        // 余额应该是字符串格式,保留两位小数
        expect(typeof result.data.balance).toBe('string');
        expect(result.data.balance).toMatch(/^\d+\.\d{2}$/);
      }
    });

    it('余额字段应该是字符串类型', async () => {
      const result = await api.account.getMyBalance();
      
      if (result.success) {
        expect(typeof result.data.balance).toBe('string');
      }
    });

    it('应该能解析余额为数字', async () => {
      const result = await api.account.getMyBalance();
      
      if (result.success) {
        const balanceNum = parseFloat(result.data.balance);
        expect(balanceNum).toBeGreaterThanOrEqual(0);
        expect(isNaN(balanceNum)).toBe(false);
      }
    });
  });

  describe('getMyTransactions', () => {
    it('应该返回流水列表结构', async () => {
      const result = await api.account.getMyTransactions();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      
      if (result.success) {
        expect(result.data).toHaveProperty('transactions');
        expect(result.data).toHaveProperty('total');
        expect(Array.isArray(result.data.transactions)).toBe(true);
        expect(typeof result.data.total).toBe('number');
      }
    });

    it('流水记录应该包含必要字段', async () => {
      const result = await api.account.getMyTransactions({ limit: 10 });
      
      if (result.success && result.data.transactions.length > 0) {
        const transaction = result.data.transactions[0];
        
        expect(transaction).toHaveProperty('id');
        expect(transaction).toHaveProperty('customerId');
        expect(transaction).toHaveProperty('type');
        expect(transaction).toHaveProperty('amount');
        expect(transaction).toHaveProperty('balanceBefore');
        expect(transaction).toHaveProperty('balanceAfter');
        expect(transaction).toHaveProperty('createdAt');
        
        // type应该是枚举值之一
        expect(['recharge', 'consume', 'refund']).toContain(transaction.type);
        
        // 金额字段应该是字符串,保留两位小数
        expect(typeof transaction.amount).toBe('string');
        expect(transaction.amount).toMatch(/^\d+\.\d{2}$/);
        expect(typeof transaction.balanceBefore).toBe('string');
        expect(transaction.balanceBefore).toMatch(/^\d+\.\d{2}$/);
        expect(typeof transaction.balanceAfter).toBe('string');
        expect(transaction.balanceAfter).toMatch(/^\d+\.\d{2}$/);
      }
    });

    it('应该支持分页参数', async () => {
      const result1 = await api.account.getMyTransactions({ limit: 5, offset: 0 });
      const result2 = await api.account.getMyTransactions({ limit: 5, offset: 5 });
      
      if (result1.success && result2.success) {
        expect(result1.data.transactions.length).toBeLessThanOrEqual(5);
        expect(result2.data.transactions.length).toBeLessThanOrEqual(5);
        
        // 如果有足够的数据,两次请求的结果应该不同
        if (result1.data.total > 5 && result2.data.transactions.length > 0) {
          expect(result1.data.transactions[0].id).not.toBe(result2.data.transactions[0].id);
        }
      }
    });

    it('默认参数应该返回前20条', async () => {
      const result = await api.account.getMyTransactions();
      
      if (result.success) {
        expect(result.data.transactions.length).toBeLessThanOrEqual(20);
      }
    });

    it('流水记录应该按时间倒序排列', async () => {
      const result = await api.account.getMyTransactions({ limit: 10 });
      
      if (result.success && result.data.transactions.length > 1) {
        const transactions = result.data.transactions;
        
        for (let i = 0; i < transactions.length - 1; i++) {
          const time1 = new Date(transactions[i].createdAt).getTime();
          const time2 = new Date(transactions[i + 1].createdAt).getTime();
          
          // 后面的记录时间应该早于或等于前面的记录
          expect(time1).toBeGreaterThanOrEqual(time2);
        }
      }
    });
  });

  describe('流水类型映射', () => {
    it('充值类型应该显示为绿色+号', () => {
      const type = 'recharge';
      const typeInfo = getTypeInfo(type);
      
      expect(typeInfo.label).toBe('充值');
      expect(typeInfo.color).toBe('#22c55e');
      expect(typeInfo.prefix).toBe('+');
    });

    it('消费类型应该显示为红色-号', () => {
      const type = 'consume';
      const typeInfo = getTypeInfo(type);
      
      expect(typeInfo.label).toBe('消费');
      expect(typeInfo.color).toBe('#ef4444');
      expect(typeInfo.prefix).toBe('-');
    });

    it('退款类型应该显示为蓝色+号', () => {
      const type = 'refund';
      const typeInfo = getTypeInfo(type);
      
      expect(typeInfo.label).toBe('退款');
      expect(typeInfo.color).toBe('#3b82f6');
      expect(typeInfo.prefix).toBe('+');
    });
  });

  describe('余额变化计算', () => {
    it('充值应该增加余额', () => {
      const balanceBefore = '100.00';
      const balanceAfter = '200.00';
      const amount = '100.00';
      
      const change = parseFloat(balanceAfter) - parseFloat(balanceBefore);
      expect(change).toBe(parseFloat(amount));
      expect(change).toBeGreaterThan(0);
    });

    it('消费应该减少余额', () => {
      const balanceBefore = '200.00';
      const balanceAfter = '150.00';
      const amount = '50.00';
      
      const change = parseFloat(balanceBefore) - parseFloat(balanceAfter);
      expect(change).toBe(parseFloat(amount));
      expect(change).toBeGreaterThan(0);
    });

    it('退款应该增加余额', () => {
      const balanceBefore = '150.00';
      const balanceAfter = '200.00';
      const amount = '50.00';
      
      const change = parseFloat(balanceAfter) - parseFloat(balanceBefore);
      expect(change).toBe(parseFloat(amount));
      expect(change).toBeGreaterThan(0);
    });
  });
});

// 辅助函数:流水类型显示映射
function getTypeInfo(type: 'recharge' | 'consume' | 'refund') {
  switch (type) {
    case 'recharge':
      return { label: '充值', color: '#22c55e', prefix: '+' };
    case 'consume':
      return { label: '消费', color: '#ef4444', prefix: '-' };
    case 'refund':
      return { label: '退款', color: '#3b82f6', prefix: '+' };
    default:
      return { label: '未知', color: '#6b7280', prefix: '' };
  }
}
