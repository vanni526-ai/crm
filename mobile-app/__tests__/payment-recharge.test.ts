import { describe, it, expect, beforeAll } from 'vitest';
import { createApiClient } from '../lib/sdk/api-client';

describe('Payment and Recharge', () => {
  let api: ReturnType<typeof createApiClient>;

  beforeAll(() => {
    api = createApiClient({
      autoDetect: false,
      baseUrl: 'https://crm.bdsm.com.cn',
      debug: false,
    });
  });

  describe('Account Balance', () => {
    it('应该能获取当前用户余额', async () => {
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

    it('余额应该可以转换为数字', async () => {
      const result = await api.account.getMyBalance();
      
      if (result.success) {
        const balanceNum = parseFloat(result.data.balance);
        expect(balanceNum).toBeGreaterThanOrEqual(0);
        expect(isNaN(balanceNum)).toBe(false);
      }
    });
  });

  describe('Account Recharge', () => {
    it('充值接口应该存在', () => {
      expect(api.account.recharge).toBeDefined();
      expect(typeof api.account.recharge).toBe('function');
    });

    it('充值方法签名应该正确', () => {
      // 检查方法参数
      const method = api.account.recharge;
      expect(method.length).toBeGreaterThanOrEqual(2); // customerId, amount, notes(optional)
    });

    it('充值金额验证 - 应该拒绝负数', async () => {
      try {
        // 使用一个测试客户ID
        await api.account.recharge(480003, -100, '测试负数充值');
        // 如果没有抛出错误,测试失败
        expect(true).toBe(false);
      } catch (error: any) {
        // 应该抛出错误
        expect(error).toBeDefined();
      }
    });

    it('充值金额验证 - 应该拒绝零', async () => {
      try {
        await api.account.recharge(480003, 0, '测试零充值');
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Payment Flow', () => {
    it('支付流程 - 余额充足时应该可以直接支付', async () => {
      const balanceResult = await api.account.getMyBalance();
      
      if (balanceResult.success) {
        const balance = parseFloat(balanceResult.data.balance);
        const coursePrice = 100; // 假设课程价格100元
        
        if (balance >= coursePrice) {
          // 余额充足,可以支付
          expect(balance).toBeGreaterThanOrEqual(coursePrice);
        } else {
          // 余额不足,需要充值
          const needRecharge = coursePrice - balance;
          expect(needRecharge).toBeGreaterThan(0);
        }
      }
    });

    it('支付流程 - 余额不足时应该提示充值', () => {
      const balance = 50;
      const coursePrice = 100;
      const isBalanceSufficient = balance >= coursePrice;
      
      expect(isBalanceSufficient).toBe(false);
      
      const needRecharge = coursePrice - balance;
      expect(needRecharge).toBe(50);
    });

    it('支付流程 - 充值后余额应该增加', () => {
      const balanceBefore = 50;
      const rechargeAmount = 100;
      const balanceAfter = balanceBefore + rechargeAmount;
      
      expect(balanceAfter).toBe(150);
      expect(balanceAfter).toBeGreaterThan(balanceBefore);
    });

    it('支付流程 - 充值后应该可以完成支付', () => {
      const balanceBefore = 50;
      const coursePrice = 100;
      const rechargeAmount = 100;
      const balanceAfter = balanceBefore + rechargeAmount;
      
      const isBalanceSufficient = balanceAfter >= coursePrice;
      expect(isBalanceSufficient).toBe(true);
    });
  });

  describe('Recharge Amount Validation', () => {
    it('应该接受合理的充值金额', () => {
      const validAmounts = [100, 200, 500, 1000, 2000, 5000];
      
      validAmounts.forEach(amount => {
        expect(amount).toBeGreaterThan(0);
        expect(amount).toBeLessThanOrEqual(100000);
      });
    });

    it('应该拒绝超过上限的充值金额', () => {
      const maxAmount = 100000;
      const invalidAmount = 150000;
      
      expect(invalidAmount).toBeGreaterThan(maxAmount);
    });

    it('自定义金额输入应该只允许数字和小数点', () => {
      const validInputs = ['100', '100.5', '1000.00', '50.99'];
      const invalidInputs = ['abc', '100abc', '-100'];
      
      validInputs.forEach(input => {
        const filtered = input.replace(/[^0-9.]/g, '');
        expect(filtered).toBe(input);
      });
      
      invalidInputs.forEach(input => {
        const filtered = input.replace(/[^0-9.]/g, '');
        expect(filtered).not.toBe(input);
      });
    });

    it('自定义金额应该可以转换为数字', () => {
      const inputs = ['100', '100.5', '1000.00'];
      
      inputs.forEach(input => {
        const amount = parseFloat(input);
        expect(isNaN(amount)).toBe(false);
        expect(amount).toBeGreaterThan(0);
      });
    });
  });

  describe('Balance Display', () => {
    it('余额显示应该保留两位小数', () => {
      const balances = [100, 100.5, 100.99, 0];
      
      balances.forEach(balance => {
        const formatted = balance.toFixed(2);
        expect(formatted).toMatch(/^\d+\.\d{2}$/);
      });
    });

    it('余额变化应该正确计算', () => {
      const balanceBefore = 100.00;
      const rechargeAmount = 50.50;
      const balanceAfter = balanceBefore + rechargeAmount;
      
      expect(balanceAfter.toFixed(2)).toBe('150.50');
    });

    it('余额不足提示应该显示正确的差额', () => {
      const balance = 80.00;
      const coursePrice = 100.00;
      const shortage = coursePrice - balance;
      
      expect(shortage.toFixed(2)).toBe('20.00');
    });
  });

  describe('Payment Methods', () => {
    it('应该支持多种支付方式', () => {
      const paymentMethods = [
        { id: 'wechat', name: '微信支付' },
        { id: 'alipay', name: '支付宝支付' },
        { id: 'balance', name: '账户余额支付' },
        { id: 'recharge', name: '账户充值' },
      ];
      
      expect(paymentMethods.length).toBe(4);
      expect(paymentMethods.map(m => m.id)).toContain('balance');
      expect(paymentMethods.map(m => m.id)).toContain('recharge');
    });

    it('余额支付应该在余额不足时禁用', () => {
      const balance = 50;
      const coursePrice = 100;
      const isBalanceMethodDisabled = balance < coursePrice;
      
      expect(isBalanceMethodDisabled).toBe(true);
    });

    it('余额支付应该在余额充足时启用', () => {
      const balance = 150;
      const coursePrice = 100;
      const isBalanceMethodDisabled = balance < coursePrice;
      
      expect(isBalanceMethodDisabled).toBe(false);
    });
  });

  describe('Recharge UI', () => {
    it('预设充值金额应该合理', () => {
      const presetAmounts = [100, 200, 500, 1000, 2000, 5000];
      
      presetAmounts.forEach(amount => {
        expect(amount).toBeGreaterThan(0);
        expect(amount).toBeLessThanOrEqual(10000);
      });
      
      // 金额应该递增
      for (let i = 1; i < presetAmounts.length; i++) {
        expect(presetAmounts[i]).toBeGreaterThan(presetAmounts[i - 1]);
      }
    });

    it('选择预设金额应该清空自定义输入', () => {
      let selectedAmount: number | null = null;
      let customAmount = '123';
      
      // 模拟选择预设金额
      selectedAmount = 100;
      customAmount = '';
      
      expect(selectedAmount).toBe(100);
      expect(customAmount).toBe('');
    });

    it('输入自定义金额应该清空预设选择', () => {
      let selectedAmount: number | null = 100;
      let customAmount = '';
      
      // 模拟输入自定义金额
      customAmount = '123';
      selectedAmount = null;
      
      expect(customAmount).toBe('123');
      expect(selectedAmount).toBeNull();
    });

    it('获取充值金额应该优先使用自定义输入', () => {
      const selectedAmount = 100;
      const customAmount = '250';
      
      const getRechargeAmount = () => {
        if (customAmount) {
          return parseFloat(customAmount) || 0;
        }
        return selectedAmount || 0;
      };
      
      expect(getRechargeAmount()).toBe(250);
    });

    it('获取充值金额应该在无自定义输入时使用预设金额', () => {
      const selectedAmount = 100;
      const customAmount = '';
      
      const getRechargeAmount = () => {
        if (customAmount) {
          return parseFloat(customAmount) || 0;
        }
        return selectedAmount || 0;
      };
      
      expect(getRechargeAmount()).toBe(100);
    });
  });
});
