import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Order Batch Delete Functionality", () => {
  it("should batch delete orders successfully", async () => {
    // Get some test orders
    const orders = await db.getAllOrders();
    console.log(`Found ${orders.length} orders in database`);
    
    if (orders.length < 2) {
      console.log("Not enough orders to test batch delete, skipping...");
      return;
    }
    
    // Take the first 2 orders
    const testOrderIds = orders.slice(0, 2).map(o => o.id);
    console.log(`Testing batch delete with order IDs: ${testOrderIds.join(", ")}`);
    
    // Batch delete
    await db.batchDeleteOrders(testOrderIds);
    console.log(`Batch delete completed`);
    
    // Verify orders are deleted
    const remainingOrders = await db.getAllOrders();
    const deletedOrdersStillExist = remainingOrders.filter(o => testOrderIds.includes(o.id));
    
    expect(deletedOrdersStillExist.length).toBe(0);
    console.log(`✅ Orders successfully deleted, ${remainingOrders.length} orders remaining`);
  });
});
