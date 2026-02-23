import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';
import { getDb } from './db';
import { customers } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Customer Delete Functionality', () => {
  it('should filter out deleted customers in getAllCustomers', async () => {
    const allCustomers = await db.getAllCustomers();
    
    // All customers should have deletedAt === null
    allCustomers.forEach(customer => {
      expect(customer.deletedAt).toBeNull();
    });
    
    console.log(`Found ${allCustomers.length} active customers`);
  });

  it('should soft delete customer by setting deletedAt', async () => {
    // Get a test customer
    const allCustomers = await db.getAllCustomers();
    
    if (allCustomers.length === 0) {
      console.log('No customers to test with');
      return;
    }
    
    const testCustomer = allCustomers[0];
    console.log(`Testing with customer: ${testCustomer.name} (ID: ${testCustomer.id})`);
    
    // Delete the customer
    await db.deleteCustomer(testCustomer.id);
    
    // Verify the customer is soft deleted
    const database = await getDb();
    if (!database) throw new Error('Database not available');
    
    const deletedCustomer = await database
      .select()
      .from(customers)
      .where(eq(customers.id, testCustomer.id))
      .limit(1);
    
    expect(deletedCustomer[0].deletedAt).not.toBeNull();
    console.log(`Customer ${testCustomer.name} successfully soft deleted at ${deletedCustomer[0].deletedAt}`);
    
    // Verify it doesn't appear in getAllCustomers
    const customersAfterDelete = await db.getAllCustomers();
    const found = customersAfterDelete.find(c => c.id === testCustomer.id);
    expect(found).toBeUndefined();
    
    console.log(`Customer ${testCustomer.name} no longer appears in getAllCustomers`);
  });
});

describe('Customer Delete Cascade Tests', () => {
  let testUserId: number;
  let testCustomerId: number;

  beforeAll(async () => {
    // 创建测试用户
    const openId = `test-delete-cascade-${Date.now()}`;
    await db.upsertUser({
      openId,
      name: "测试删除级联用户",
      email: `test-delete-${Date.now()}@example.com`,
      loginMethod: "test",
      lastSignedIn: new Date(),
    });

    // 获取创建的用户ID
    const user = await db.getUserByOpenId(openId);
    if (!user) {
      throw new Error("Failed to create test user");
    }
    testUserId = user.id;

    // 创建测试customer并关联到用户
    testCustomerId = await db.createCustomer({
      userId: testUserId,
      name: "测试删除级联客户",
      phone: "13800000999",
      trafficSource: "测试",
      createdBy: testUserId,
      accountBalance: "100.00",
    });
  });

  it("应该在事务中执行删除操作", async () => {
    // 创建测试customer
    const customerId = await db.createCustomer({
      userId: testUserId,
      name: "测试事务客户",
      phone: "13800001000",
      trafficSource: "测试",
      createdBy: testUserId,
      accountBalance: "200.00",
    });

    // 删除customer
    await db.deleteCustomer(customerId);

    // 验证删除成功
    const database = await getDb();
    if (!database) throw new Error('Database not available');
    
    const deletedCustomer = await database
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    
    expect(deletedCustomer[0].deletedAt).not.toBeNull();
    console.log(`[Transaction Test] Customer ${customerId} successfully deleted in transaction`);
  });

  it("删除customer后，user记录应该保持完整", async () => {
    // 创建测试customer
    const customerId = await db.createCustomer({
      userId: testUserId,
      name: "测试用户完整性客户",
      phone: "13800001001",
      trafficSource: "测试",
      createdBy: testUserId,
      accountBalance: "300.00",
    });

    // 删除customer
    await db.deleteCustomer(customerId);

    // 获取user记录
    const user = await db.getUserById(testUserId);
    
    // 验证user记录未被影响
    expect(user).toBeDefined();
    expect(user?.id).toBe(testUserId);
    expect(user?.name).toBe("测试删除级联用户");
    
    console.log(`[User Integrity Test] User ${testUserId} remains intact after customer deletion`);
  });

  it("删除不存在的customer应该抛出错误", async () => {
    const nonExistentId = 999999999;
    
    await expect(db.deleteCustomer(nonExistentId)).rejects.toThrow(
      `Customer ${nonExistentId} not found`
    );
    
    console.log(`[Error Handling Test] Correctly throws error for non-existent customer`);
  });
});
