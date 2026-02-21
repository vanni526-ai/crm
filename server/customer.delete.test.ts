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
