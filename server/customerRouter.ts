import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const customerRouter = router({
  // 刷新所有客户数据(重新计算累计消费)
  refreshAllStats: protectedProcedure.mutation(async () => {
    // 获取所有客户(已包含实时计算的totalSpent)
    const customers = await db.getAllCustomers();
    
    // 统计有消费记录的客户数
    const customersWithSpending = customers.filter(c => parseFloat(c.totalSpent || "0") > 0);
    
    return { 
      success: true, 
      totalCustomers: customers.length,
      customersWithSpending: customersWithSpending.length 
    };
  }),
});
