import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as progressTracker from "./progressTracker";

export const customerRouter = router({
  // 获取客户列表(支持筛选和排序)
  list: protectedProcedure
    .input(
      z.object({
        // 筛选条件
        minSpent: z.number().optional(), // 最小累计消费
        maxSpent: z.number().optional(), // 最大累计消费
        minClassCount: z.number().optional(), // 最小上课次数
        maxClassCount: z.number().optional(), // 最大上课次数
        lastConsumptionDays: z.number().optional(), // 最后消费天数(例如30表示30天内)
        trafficSource: z.string().optional(), // 流量来源
        // 快捷筛选
        highValue: z.boolean().optional(), // 高价值客户(累计消费>5000或上课次数>5)
        churned: z.boolean().optional(), // 流失客户(最后消费>30天且累计消费>0)
        // 排序
        sortBy: z.enum(["totalSpent", "classCount", "lastOrderDate", "firstOrderDate", "createdAt"]).optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      let customers = await db.getAllCustomers();
      
      // 应用筛选
      if (input) {
        // 累计消费范围
        if (input.minSpent !== undefined) {
          customers = customers.filter(c => parseFloat(c.totalSpent || "0") >= input.minSpent!);
        }
        if (input.maxSpent !== undefined) {
          customers = customers.filter(c => parseFloat(c.totalSpent || "0") <= input.maxSpent!);
        }
        
        // 上课次数范围
        if (input.minClassCount !== undefined) {
          customers = customers.filter(c => (c.classCount || 0) >= input.minClassCount!);
        }
        if (input.maxClassCount !== undefined) {
          customers = customers.filter(c => (c.classCount || 0) <= input.maxClassCount!);
        }
        
        // 最后消费时间
        if (input.lastConsumptionDays !== undefined) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - input.lastConsumptionDays);
          customers = customers.filter(c => {
            if (!c.lastOrderDate) return false;
            return new Date(c.lastOrderDate) >= cutoffDate;
          });
        }
        
        // 流量来源
        if (input.trafficSource) {
          customers = customers.filter(c => c.trafficSource?.includes(input.trafficSource!));
        }
        
        // 高价值客户
        if (input.highValue) {
          customers = customers.filter(c => 
            parseFloat(c.totalSpent || "0") > 5000 || (c.classCount || 0) > 5
          );
        }
        
        // 流失客户
        if (input.churned) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          customers = customers.filter(c => {
            const hasSpending = parseFloat(c.totalSpent || "0") > 0;
            const lastOrderDate = c.lastOrderDate ? new Date(c.lastOrderDate) : null;
            return hasSpending && (!lastOrderDate || lastOrderDate < thirtyDaysAgo);
          });
        }
        
        // 应用排序
        if (input.sortBy) {
          const sortOrder = input.sortOrder || "desc";
          customers.sort((a, b) => {
            let aVal: any, bVal: any;
            
            switch (input.sortBy) {
              case "totalSpent":
                aVal = parseFloat(a.totalSpent || "0");
                bVal = parseFloat(b.totalSpent || "0");
                break;
              case "classCount":
                aVal = a.classCount || 0;
                bVal = b.classCount || 0;
                break;
              case "lastOrderDate":
                aVal = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
                bVal = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
                break;
              case "firstOrderDate":
                aVal = a.firstOrderDate ? new Date(a.firstOrderDate).getTime() : 0;
                bVal = b.firstOrderDate ? new Date(b.firstOrderDate).getTime() : 0;
                break;
              case "createdAt":
                aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                break;
              default:
                return 0;
            }
            
            if (sortOrder === "asc") {
              return aVal - bVal;
            } else {
              return bVal - aVal;
            }
          });
        }
      }
      
      return customers;
    }),

  // 刷新所有客户数据(重新计算累计消费) - 异步执行
  refreshAllStats: protectedProcedure.mutation(async () => {
    // 生成taskId
    const taskId = progressTracker.generateTaskId();
    progressTracker.createTask(taskId);
    
    // 异步执行更新任务
    (async () => {
      try {
        await db.refreshCustomerStats((progress) => {
          progressTracker.updateProgress(taskId, progress);
        });
        progressTracker.completeTask(taskId, '客户数据更新完成');
      } catch (error: any) {
        progressTracker.failTask(taskId, error.message || '更新失败');
      } finally {
        progressTracker.cleanupTask(taskId);
      }
    })();
    
    return { taskId };
  }),

  // 获取任务进度
  getProgress: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      const progress = progressTracker.getProgress(input.taskId);
      return progress;
    }),

  // 删除客户
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteCustomer(input.id);
      return { success: true };
    }),

  // 批量删除客户
  batchDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      for (const id of input.ids) {
        await db.deleteCustomer(id);
      }
      return { success: true, count: input.ids.length };
    }),
});
