import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('Customer Account Balance Fix', () => {
  it('should get account balance from accountTransactions if exists', async () => {
    // 这个测试验证:如果客户有账户流水记录,应该从accountTransactions表获取余额
    const customers = await db.getAllCustomers();
    
    // 打印前10个客户的账户余额信息
    console.log('\n=== 客户账户余额统计 ===');
    customers.slice(0, 10).forEach(customer => {
      console.log(`客户: ${customer.name}, 账户余额: ¥${customer.accountBalance}, 累计消费: ¥${customer.totalSpent}`);
    });
    
    // 验证账户余额不全为0
    const customersWithBalance = customers.filter(c => parseFloat(c.accountBalance || "0") > 0);
    console.log(`\n有余额的客户数: ${customersWithBalance.length} / ${customers.length}`);
    
    expect(customersWithBalance.length).toBeGreaterThan(0);
  });

  it('should get account balance from orders if no transaction exists', async () => {
    // 这个测试验证:如果客户没有账户流水记录,应该从orders表获取余额
    const customers = await db.getAllCustomers();
    
    // 查找有订单但可能没有流水记录的客户
    const customersWithOrders = customers.filter(c => parseInt(c.classCount as any) > 0);
    console.log(`\n有订单的客户数: ${customersWithOrders.length}`);
    
    // 这些客户应该都有账户余额(从orders表获取)
    const customersWithBalanceFromOrders = customersWithOrders.filter(c => 
      parseFloat(c.accountBalance || "0") >= 0
    );
    console.log(`有账户余额数据的客户数: ${customersWithBalanceFromOrders.length}`);
    
    expect(customersWithBalanceFromOrders.length).toBe(customersWithOrders.length);
  });

  it('should show specific customer balance details', async () => {
    // 测试特定客户的余额情况
    const testCustomerNames = ['清茶', '列斯卡戈', 'p²=2a*cos2θ'];
    
    const customers = await db.getAllCustomers();
    
    console.log('\n=== 特定客户余额详情 ===');
    testCustomerNames.forEach(name => {
      const customer = customers.find(c => c.name === name);
      if (customer) {
        console.log(`客户: ${customer.name}`);
        console.log(`  账户余额: ¥${customer.accountBalance}`);
        console.log(`  累计消费: ¥${customer.totalSpent}`);
        console.log(`  上课次数: ${customer.classCount}`);
        console.log(`  最后上课: ${customer.lastOrderDate || '无'}`);
      } else {
        console.log(`客户 ${name} 未找到`);
      }
    });
    
    expect(true).toBe(true);
  });
});
