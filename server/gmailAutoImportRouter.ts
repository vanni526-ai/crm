import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { parseGmailOrderContent } from "./gmailOrderParser";
import {
  createGmailImportLog,
  getAllGmailImportLogs,
  getGmailImportLogById,
  getGmailImportStats,
  checkThreadIdExists,
  deleteGmailImportLog,
  deleteAllGmailImportLogs,
  checkOrderNoExists,
  createOrder,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { orders } from "../drizzle/schema";

/**
 * Gmail自动导入路由
 */
export const gmailAutoImportRouter = router({
  /**
   * 解析Gmail邮件内容并提取订单信息
   */
  parseGmailEmail: protectedProcedure
    .input(
      z.object({
        emailContent: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const parsedOrders = await parseGmailOrderContent(input.emailContent);
        return {
          success: true,
          orders: parsedOrders,
          count: parsedOrders.length,
        };
      } catch (error: any) {
        console.error("解析Gmail邮件失败:", error);
        return {
          success: false,
          error: error.message || "解析失败",
          orders: [],
          count: 0,
        };
      }
    }),

  /**
   * 批量创建订单(从 Gmail解析结果)
   */
  batchCreateFromGmail: protectedProcedure
    .input(
      z.object({
        emailSubject: z.string().optional(),
        emailDate: z.string().optional(),
        threadId: z.string().optional(),
        emailContent: z.string().optional(),
        orders: z.array(
          z.object({
            salesperson: z.string(),
            deviceWechat: z.string(),
            customerName: z.string(),
            classDate: z.string(),
            classTime: z.string(),
            course: z.string(),
            teacher: z.string(),
            city: z.string(),
            classroom: z.string(),
            paymentAmount: z.number(),
            courseAmount: z.number(),
            downPayment: z.number(),
            finalPayment: z.number(),
            teacherFee: z.number(),
            carFee: z.number(),
            accountBalance: z.number(),
            notes: z.string(),
            originalText: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const results = [];
      let successCount = 0;
      let failCount = 0;
      const errorMessages: string[] = [];

      for (const orderData of input.orders) {
        try {
          // 生成唯一订单号
          const cityAreaCodes: Record<string, string> = {
            "上海": "021",
            "北京": "010",
            "天津": "022",
            "成都": "028",
            "泉州": "0595",
            "无锡": "0510",
            "武汉": "027",
            "济南": "0531",
          };
          const areaCode = cityAreaCodes[orderData.city] || "000";
          const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
          let orderNo = `${timestamp}-${areaCode}`;
          
          // 检查订单号是否已存在
          let suffix = 1;
          while (await checkOrderNoExists(orderNo)) {
            orderNo = `${timestamp}-${areaCode}-${String(suffix).padStart(3, "0")}`;
            suffix++;
            if (suffix > 999) break;
          }

          // 创建订单
          const newOrder = await createOrder({
            orderNo,
            customerName: orderData.customerName,
            salesPerson: orderData.salesperson,
            salesId: ctx.user.id, // 使用当前用户ID作为销售ID
            trafficSource: orderData.deviceWechat, // 设备微信号作为流量来源
            paymentAmount: orderData.paymentAmount.toString(),
            courseAmount: orderData.courseAmount.toString(),
            accountBalance: orderData.accountBalance.toString(), // 账户余额
            teacherFee: orderData.teacherFee.toString(),
            transportFee: orderData.carFee.toString(),
            deliveryCity: orderData.city,
            deliveryRoom: orderData.classroom,
            deliveryTeacher: orderData.teacher,
            deliveryCourse: orderData.course,
            classDate: new Date(orderData.classDate),
            classTime: orderData.classTime,
            notes: `${orderData.notes}\n\n原始文本: ${orderData.originalText}`,
            status: "paid", // 默认已支付状态
          });

          results.push({
            success: true,
            orderNo,
            customerName: orderData.customerName,
          });
          successCount++;
        } catch (error: any) {
          console.error("创建订单失败:", error);
          const errorMsg = `客户: ${orderData.customerName}, 错误: ${error.message || "创建失败"}`;
          errorMessages.push(errorMsg);
          results.push({
            success: false,
            customerName: orderData.customerName,
            error: error.message || "创建失败",
          });
          failCount++;
        }
      }

      // 记录导入日志
      if (input.threadId) {
        try {
          const status = failCount === 0 ? "success" : (successCount > 0 ? "partial" : "failed");
          await createGmailImportLog({
            emailSubject: input.emailSubject || "未知邮件",
            emailDate: input.emailDate ? new Date(input.emailDate) : new Date(),
            threadId: input.threadId,
            totalOrders: input.orders.length,
            successOrders: successCount,
            failedOrders: failCount,
            status,
            errorLog: errorMessages.length > 0 ? errorMessages.join("\n") : null,
            emailContent: input.emailContent || null,
            parsedData: input.orders as any,
            importedBy: ctx.user.id,
          });
        } catch (error) {
          console.error("记录导入日志失败:", error);
        }
      }

      // 如果有失败订单,通知管理员
      if (failCount > 0) {
        try {
          await notifyOwner({
            title: "Gmail订单导入异常",
            content: `邮件: ${input.emailSubject || "未知"}\n总订单数: ${input.orders.length}\n成功: ${successCount}\n失败: ${failCount}\n\n错误详情:\n${errorMessages.join("\n")}`,
          });
        } catch (error) {
          console.error("发送通知失败:", error);
        }
      }

      return {
        success: true,
        successCount,
        failCount,
        total: input.orders.length,
        results,
      };
    }),

  /**
   * 获取所有Gmail导入历史
   */
  getImportHistory: protectedProcedure.query(async () => {
    const logs = await getAllGmailImportLogs();
    return {
      logs,
      total: logs.length,
    };
  }),

  /**
   * 获取Gmail导入统计数据
   */
  getImportStats: protectedProcedure.query(async () => {
    const stats = await getGmailImportStats();
    return stats || {
      totalImports: 0,
      totalOrders: 0,
      successOrders: 0,
      failedOrders: 0,
      successRate: 0,
    };
  }),

  /**
   * 获取单条导入记录详情
   */
  getImportLogDetail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const log = await getGmailImportLogById(input.id);
      return log;
    }),

  /**
   * 删除单条导入记录
   */
  deleteImportLog: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteGmailImportLog(input.id);
      return { success: true };
    }),

  /**
   * 批量删除导入记录
   */
  batchDeleteImportLogs: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      const { ids } = input;
      if (ids.length === 0) return { deletedCount: 0 };

      for (const id of ids) {
        await deleteGmailImportLog(id);
      }

      return { deletedCount: ids.length };
    }),

  /**
   * 清空所有导入记录
   */
  deleteAllImportLogs: protectedProcedure.mutation(async () => {
    await deleteAllGmailImportLogs();
      return { success: true };
    }),

  /**
   * 检查邮件是否已处理
   */
  checkEmailProcessed: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ input }) => {
      const exists = await checkThreadIdExists(input.threadId);
      return { processed: exists };
    }),

  /**
   * 重新解析邮件并导入订单
   */
  reprocessEmail: protectedProcedure
    .input(z.object({ 
      logId: z.number(),
      emailContent: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 获取原始记录
      const originalLog = await getGmailImportLogById(input.logId);
      if (!originalLog) {
        throw new Error("导入记录不存在");
      }

      // 重新解析
      const parsedOrders = await parseGmailOrderContent(input.emailContent);

      // 批量创建订单
      const results = [];
      let successCount = 0;
      let failCount = 0;
      const errorMessages: string[] = [];

      for (const orderData of parsedOrders) {
        try {
          const cityAreaCodes: Record<string, string> = {
            "上海": "021", "北京": "010", "天津": "022", "重庆": "023",
            "武汉": "027", "成都": "028", "西安": "029", "南京": "025",
            "杭州": "0571", "苏州": "0512", "无锡": "0510", "宁波": "0574",
            "温州": "0577", "嘉兴": "0573", "金华": "0579", "绍兴": "0575",
            "济南": "0531", "青岛": "0532", "烟台": "0535", "潍坊": "0536",
          };

          const areaCode = cityAreaCodes[orderData.city] || "000";
          const now = new Date();
          const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
          const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
          let orderNo = `${dateStr}${timeStr}${areaCode}`;

          let attempts = 0;
          while (await checkOrderNoExists(orderNo) && attempts < 10) {
            const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
            orderNo = `${dateStr}${timeStr}${areaCode}${randomSuffix}`;
            attempts++;
          }

          await createOrder({
            orderNo,
            customerName: orderData.customerName,
            salesPerson: orderData.salesperson,
            salesId: ctx.user.id,
            trafficSource: orderData.deviceWechat,
            paymentAmount: orderData.paymentAmount.toString(),
            courseAmount: orderData.courseAmount.toString(),
            teacherFee: orderData.teacherFee.toString(),
            transportFee: orderData.carFee.toString(),
            classDate: orderData.classDate ? new Date(orderData.classDate) : undefined,
            classTime: orderData.classTime,
            deliveryCity: orderData.city,
            deliveryRoom: orderData.classroom,
            deliveryTeacher: orderData.teacher,
            deliveryCourse: orderData.course,
            notes: orderData.notes,
            status: "paid",
          });

          results.push({
            success: true,
            orderNo,
            customerName: orderData.customerName,
          });
          successCount++;
        } catch (error: any) {
          const errorMsg = `客户: ${orderData.customerName}, 错误: ${error.message || "创建失败"}`;
          errorMessages.push(errorMsg);
          results.push({
            success: false,
            customerName: orderData.customerName,
            error: error.message || "创建失败",
          });
          failCount++;
        }
      }

      // 更新导入记录
      const status = failCount === 0 ? "success" : (successCount > 0 ? "partial" : "failed");
      await createGmailImportLog({
        emailSubject: originalLog.emailSubject + " (重新解析)",
        emailDate: originalLog.emailDate,
        threadId: originalLog.threadId + "_reprocess_" + Date.now(),
        totalOrders: parsedOrders.length,
        successOrders: successCount,
        failedOrders: failCount,
        status,
        errorLog: errorMessages.length > 0 ? errorMessages.join("\n") : null,
        emailContent: input.emailContent,
        parsedData: parsedOrders as any,
        importedBy: ctx.user.id,
      });

      return {
        success: true,
        successCount,
        failCount,
        total: parsedOrders.length,
        results,
      };
    }),

  /**
   * 获取配置
   */
  getConfig: protectedProcedure
    .input(z.object({ configKey: z.string() }))
    .query(async ({ input }) => {
      const { getGmailImportConfig } = await import("./db");
      return getGmailImportConfig(input.configKey);
    }),

  /**
   * 获取所有配置
   */
  getAllConfigs: protectedProcedure.query(async () => {
    const { getAllGmailImportConfigs } = await import("./db");
    return getAllGmailImportConfigs();
  }),

  /**
   * 保存或更新配置
   */
  upsertConfig: protectedProcedure
    .input(
      z.object({
        configKey: z.string(),
        configValue: z.any(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { upsertGmailImportConfig } = await import("./db");
      const id = await upsertGmailImportConfig(input);
      return { id, success: true };
    }),

  /**
   * 删除配置
   */
  deleteConfig: protectedProcedure
    .input(z.object({ configKey: z.string() }))
    .mutation(async ({ input }) => {
      const { deleteGmailImportConfig } = await import("./db");
      const success = await deleteGmailImportConfig(input.configKey);
      return { success };
    }),

  /**
   * 获取失败原因统计
   */
  getFailureStats: protectedProcedure.query(async () => {
    const logs = await getAllGmailImportLogs();
    
    const failureReasons: Record<string, number> = {};
    let totalFailed = 0;

    for (const log of logs) {
      if (log.status === "failed" || log.status === "partial") {
        totalFailed++;
        
        // 解析错误日志提取失败原因
        if (log.errorLog) {
          const errorLines = log.errorLog.split("\n");
          for (const line of errorLines) {
            if (line.includes("解析失败")) {
              failureReasons["解析失败"] = (failureReasons["解析失败"] || 0) + 1;
            } else if (line.includes("字段缺失") || line.includes("缺少")) {
              failureReasons["字段缺失"] = (failureReasons["字段缺失"] || 0) + 1;
            } else if (line.includes("重复") || line.includes("已存在")) {
              failureReasons["重复订单"] = (failureReasons["重复订单"] || 0) + 1;
            } else if (line.includes("格式错误")) {
              failureReasons["格式错误"] = (failureReasons["格式错误"] || 0) + 1;
            } else if (line.trim()) {
              failureReasons["其他错误"] = (failureReasons["其他错误"] || 0) + 1;
            }
          }
        }
      }
    }

    return {
      totalFailed,
      failureReasons,
    };
  }),

  /**
   * 编辑导入记录中的订单数据
   */
  updateImportLogData: protectedProcedure
    .input(z.object({
      logId: z.number(),
      orderIndex: z.number(),
      updatedOrder: z.object({
        salesperson: z.string().optional(),
        deviceWechat: z.string().optional(),
        customerName: z.string().optional(),
        classDate: z.string().optional(),
        classTime: z.string().optional(),
        course: z.string().optional(),
        teacher: z.string().optional(),
        city: z.string().optional(),
        classroom: z.string().optional(),
        paymentAmount: z.number().optional(),
        courseAmount: z.number().optional(),
        teacherFee: z.number().optional(),
        carFee: z.number().optional(),
        notes: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const { logId, orderIndex, updatedOrder } = input;
      
      // 获取导入日志
      const log = await getGmailImportLogById(logId);
      if (!log) {
        throw new Error("导入记录不存在");
      }

      // 解析parsedData
      const parsedData = log.parsedData as any[];
      if (!parsedData || orderIndex >= parsedData.length) {
        throw new Error("订单索引无效");
      }

      // 更新订单数据
      const oldOrder = parsedData[orderIndex];
      const newOrder = { ...oldOrder, ...updatedOrder };
      parsedData[orderIndex] = newOrder;

      // TODO: 实现编辑功能需要更复杂的数据库操作，暂时返回提示
      return { success: false, message: "编辑功能开发中，请使用重新解析功能" };
    }),

  /**
   * 手动触发Gmail导入
   */
  manualImport: protectedProcedure
    .input(z.object({
      searchQuery: z.string().optional().default("打款群"),
      maxResults: z.number().optional().default(5),
    }))
    .mutation(async ({ input, ctx }) => {
      const { searchGmailMessages, readGmailThread, extractEmailContent } = await import("./gmailMcpImporter");
      const { parseGmailOrderContent } = await import("./gmailOrderParser");

      try {
        // 1. 搜索Gmail邮件
        const searchResult = await searchGmailMessages(input.searchQuery, input.maxResults);
        
        if (!searchResult || !searchResult.messages || searchResult.messages.length === 0) {
          return {
            success: false,
            message: "未找到相关邮件，请检查Gmail中是否有包含\"" + input.searchQuery + "\"的邮件",
            totalEmails: 0,
            processedEmails: 0,
            totalOrders: 0,
            successOrders: 0,
            failedOrders: 0,
          };
        }

        const messages = searchResult.messages;
        let totalOrders = 0;
        let successOrders = 0;
        let failedOrders = 0;
        let processedEmails = 0;

        // 2. 处理每封邮件
        for (const message of messages) {
          try {
            const threadId = message.threadId;
            
            // 检查是否已处理
            const exists = await checkThreadIdExists(threadId);
            if (exists) {
              console.log(`邮件 ${threadId} 已处理，跳过`);
              continue;
            }

            // 读取邮件内容
            const emailData = await readGmailThread(threadId);
            const emailContent = extractEmailContent(emailData);

            if (!emailContent) {
              console.log(`邮件 ${threadId} 内容为空，跳过`);
              continue;
            }

            // 解析订单
            const parsedOrders = await parseGmailOrderContent(emailContent);
            totalOrders += parsedOrders.length;

            // 创建订单
            for (const orderData of parsedOrders) {
              try {
                const cityAreaCodes: Record<string, string> = {
                  "上海": "021", "北京": "010", "天津": "022", "重庆": "023",
                  "武汉": "027", "成都": "028", "西安": "029", "南京": "025",
                  "杭州": "0571", "苏州": "0512", "无锡": "0510", "宁波": "0574",
                  "温州": "0577", "嘉兴": "0573", "金华": "0579", "绍兴": "0575",
                  "济南": "0531", "青岛": "0532", "烟台": "0535", "潍坊": "0536",
                };

                const areaCode = cityAreaCodes[orderData.city] || "000";
                const now = new Date();
                const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
                const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
                let orderNo = `${dateStr}${timeStr}${areaCode}`;

                let attempts = 0;
                while (await checkOrderNoExists(orderNo) && attempts < 10) {
                  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
                  orderNo = `${dateStr}${timeStr}${areaCode}${randomSuffix}`;
                  attempts++;
                }

                await createOrder({
                  orderNo,
                  customerName: orderData.customerName,
                  salesPerson: orderData.salesperson,
                  salesId: ctx.user.id,
                  trafficSource: orderData.deviceWechat,
                  paymentAmount: orderData.paymentAmount.toString(),
                  courseAmount: orderData.courseAmount.toString(),
                  teacherFee: orderData.teacherFee.toString(),
                  transportFee: orderData.carFee.toString(),
                  classDate: orderData.classDate ? new Date(orderData.classDate) : undefined,
                  classTime: orderData.classTime,
                  deliveryCity: orderData.city,
                  deliveryRoom: orderData.classroom,
                  deliveryTeacher: orderData.teacher,
                  deliveryCourse: orderData.course,
                  notes: orderData.notes,
                  status: "paid",
                });

                successOrders++;
              } catch (error: any) {
                console.error("创建订单失败:", error);
                failedOrders++;
              }
            }

            // 记录导入日志
            const status = failedOrders === 0 ? "success" : (successOrders > 0 ? "partial" : "failed");
            await createGmailImportLog({
              emailSubject: message.subject || "未知邮件",
              emailDate: message.date ? new Date(message.date) : new Date(),
              threadId,
              totalOrders: parsedOrders.length,
              successOrders: parsedOrders.length - failedOrders,
              failedOrders,
              status,
              errorLog: failedOrders > 0 ? `失败订单数: ${failedOrders}` : null,
              emailContent,
              parsedData: parsedOrders as any,
              importedBy: ctx.user.id,
            });

            processedEmails++;
          } catch (error: any) {
            console.error("处理邮件失败:", error);
          }
        }

        return {
          success: true,
          message: `导入完成！处理${processedEmails}封邮件，解析${totalOrders}个订单，成功${successOrders}个，失败${failedOrders}个`,
          totalEmails: messages.length,
          processedEmails,
          totalOrders,
          successOrders,
          failedOrders,
        };
      } catch (error: any) {
        console.error("手动导入失败:", error);
        return {
          success: false,
          message: `导入失败: ${error.message}`,
          totalEmails: 0,
          processedEmails: 0,
          totalOrders: 0,
          successOrders: 0,
          failedOrders: 0,
        };
      }
    }),

  /**
   * 获取上周导入统计数据(用于周报)
   */
  getWeeklyStats: publicProcedure.query(async () => {
    // 计算上周的开始和结束时间(周一00:00到周日23:59)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=周日, 1=周一, ...
    const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek + 6; // 距离上周一的天数
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - daysToLastMonday);
    lastMonday.setHours(0, 0, 0, 0);
    
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);

    // 查询上周的导入记录
    const allLogs = await getAllGmailImportLogs();
    const logs = allLogs.filter(log => {
      const logTime = new Date(log.emailDate).getTime();
      return logTime >= lastMonday.getTime() && logTime <= lastSunday.getTime();
    });

    // 统计数据
    const totalImports = logs.length;
    const successfulImports = logs.filter(log => log.status === 'success').length;
    const failedImports = logs.filter(log => log.status === 'failed').length;
    const totalOrders = logs.reduce((sum, log) => sum + (log.successOrders || 0), 0);
    const successRate = totalImports > 0 
      ? ((successfulImports / totalImports) * 100).toFixed(1) 
      : '0.0';

    return {
      weekStart: lastMonday.toISOString().split('T')[0],
      weekEnd: lastSunday.toISOString().split('T')[0],
      totalImports,
      successfulImports,
      failedImports,
      totalOrders,
      successRate: `${successRate}%`,
      logs: logs.map(log => ({
        timestamp: new Date(log.emailDate).toLocaleString('zh-CN'),
        status: log.status,
        ordersCreated: log.successOrders || 0,
        errorMessage: log.errorLog,
      })),
    };
  }),
});
