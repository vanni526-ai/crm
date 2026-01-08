import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { parseGmailOrderContent } from "./gmailOrderParser";
import {
  createGmailImportLog,
  getAllGmailImportLogs,
  getGmailImportLogById,
  createOrder,
  checkOrderNoExists,
  checkChannelOrderNoExists,
  getOrderByChannelOrderNo,
  getDb,
} from "./db";
import { gmailImportLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { validateChannelOrderNo, identifyPaymentChannel } from "./channelOrderNoUtils";
import { validateTeacherFee } from "./teacherFeeValidator";

export const gmailAutoImportRouter = router({
  /**
   * 获取所有导入日志
   */
  getLogs: protectedProcedure.query(async () => {
    return getAllGmailImportLogs();
  }),

  /**
   * 获取导入历史(别名,与Logs相同)
   */
  getImportHistory: protectedProcedure.query(async () => {
    return getAllGmailImportLogs();
  }),

  /**
   * 获取导入统计数据
   */
  getImportStats: protectedProcedure.query(async () => {
    const logs = await getAllGmailImportLogs();
    
    const totalImports = logs.length;
    const totalOrders = logs.reduce((sum, log) => sum + (log.totalOrders || 0), 0);
    const successOrders = logs.reduce((sum, log) => sum + (log.successOrders || 0), 0);
    const failedOrders = logs.reduce((sum, log) => sum + (log.failedOrders || 0), 0);
    const successRate = totalOrders > 0 ? (successOrders / totalOrders * 100).toFixed(1) : "0.0";
    
    return {
      totalImports,
      totalOrders,
      successOrders,
      failedOrders,
      successRate: parseFloat(successRate),
    };
  }),

  /**
   * 获取失败原因统计
   */
  getFailureStats: protectedProcedure.query(async () => {
    const logs = await getAllGmailImportLogs();
    
    // 简单返回空数据,后续可以扩展
    return [];
  }),

  /**
   * 获取单个导入日志详情
   */
  getLogDetail: protectedProcedure
    .input(z.object({ logId: z.number() }))
    .query(async ({ input }) => {
      const log = await getGmailImportLogById(input.logId);
      return { log };
    }),

  /**
   * 粘贴导入 - 用户手动粘贴邮件内容进行导入
   */
  pasteImport: protectedProcedure
    .input(
      z.object({
        emailContent: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log("开始粘贴导入...");
        
        // 解析邮件内容
        const parsedOrders = await parseGmailOrderContent(input.emailContent);
        console.log(`解析到 ${parsedOrders.length} 个订单`);
        
        if (parsedOrders.length === 0) {
          throw new Error("未找到订单信息，请检查邮件内容格式");
        }
        
        // 创建导入日志
        const logId = await createGmailImportLog({
          emailSubject: "手动粘贴导入",
          emailDate: new Date(),
          threadId: `manual-${Date.now()}`,
          totalOrders: parsedOrders.length,
          successOrders: 0,
          failedOrders: 0,
          status: "success",
          importedBy: ctx.user.id,
          emailContent: input.emailContent.substring(0, 5000),
        });
        
        // 批量创建订单
        let successCount = 0;
        let skippedCount = 0;
        const errorMessages: string[] = [];
        const warnings: string[] = [];
        const warningFlags: string[] = []; // 警告标记数组
        
        for (const orderData of parsedOrders) {
          try {
            // 生成订单号
            const orderNo = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
            
            // 检查订单号是否已存在
            const exists = await checkOrderNoExists(orderNo);
            if (exists) {
              skippedCount++;
              errorMessages.push(`订单号 ${orderNo} 已存在`);
              continue;
            }
            
            // 验证老师费用不能超过课程金额
            const teacherFeeValidation = validateTeacherFee(
              orderData.teacherFee || 0,
              orderData.courseAmount || 0
            );
            if (!teacherFeeValidation.isValid) {
              skippedCount++;
              errorMessages.push(
                `订单 ${orderData.customerName || orderData.salesperson}: ${teacherFeeValidation.error}`
              );
              continue;
            }
            
            // 验证渠道订单号格式并识别支付渠道
            let channelOrderNo = orderData.channelOrderNo || "";
            let paymentChannel = orderData.paymentMethod || "";
            let validationWarning = "";
            
            // 检测缺失渠道订单号
            if (!channelOrderNo || channelOrderNo.trim() === '') {
              warningFlags.push("missing_channel_order_no");
              warnings.push(`订单 ${orderData.customerName || orderData.salesperson}: ⚠️ 缺失渠道订单号`);
            }
            
            // 检查渠道订单号是否重复
            if (channelOrderNo && channelOrderNo.trim() !== '') {
              const channelOrderExists = await checkChannelOrderNoExists(channelOrderNo);
              if (channelOrderExists) {
                const existingOrder = await getOrderByChannelOrderNo(channelOrderNo);
                skippedCount++;
                errorMessages.push(
                  `渠道订单号已存在: ${channelOrderNo} ` +
                  `(关联订单: ${existingOrder?.orderNo || '未知'}, 客户: ${existingOrder?.customerName || '未知'})`
                );
                continue;
              }
            }
            
            if (channelOrderNo) {
              const validation = validateChannelOrderNo(channelOrderNo);
              
              // 如果没有手动指定支付渠道,使用智能识别的结果
              if (!paymentChannel && validation.isValid) {
                paymentChannel = validation.channelName;
              }
              
              // 记录格式警告
              if (validation.warning) {
                validationWarning = validation.warning;
                warnings.push(`订单 ${orderData.customerName || orderData.salesperson}: ${validation.warning}`);
              }
            }
            
            // 创建订单
            await createOrder({
              orderNo,
              customerName: orderData.customerName,
              salesPerson: orderData.salesperson,
              salesId: ctx.user.id,
              trafficSource: orderData.deviceWechat || "",
              paymentAmount: orderData.paymentAmount.toString(),
              courseAmount: orderData.courseAmount.toString(),
              accountBalance: orderData.accountBalance?.toString() || "0",
              teacherFee: orderData.teacherFee?.toString() || "0",
              transportFee: orderData.carFee?.toString() || "0",
              channelOrderNo,
              paymentChannel,
              deliveryCity: orderData.city || "",
              deliveryRoom: orderData.classroom || "",
              deliveryTeacher: orderData.teacher || "",
              deliveryCourse: orderData.course || "",
              classDate: new Date(orderData.classDate),
              classTime: orderData.classTime || "",
              notes: `${orderData.notes || ""}${validationWarning ? `\n\n⚠️ ${validationWarning}` : ""}

原始文本: ${orderData.originalText || ""}`,
              status: "paid",
            });
            
            successCount++;
          } catch (err: any) {
            errorMessages.push(`订单导入失败: ${err.message}`);
          }
        }
        
        console.log(`导入完成: 成功 ${successCount}, 跳过 ${skippedCount}`);
        
        // 更新导入日志的警告标记
        if (warningFlags.length > 0) {
          const db = await getDb();
          if (db) {
            await db.update(gmailImportLogs)
              .set({ warningFlags: Array.from(new Set(warningFlags)) })
              .where(eq(gmailImportLogs.id, logId));
          }
        }
        
        return {
          successCount,
          skippedCount,
          totalCount: parsedOrders.length,
          errors: errorMessages,
          warnings,
        };
      } catch (error: any) {
        console.error("粘贴导入失败:", error);
        throw new Error(error.message || "导入失败");
      }
    }),

  /**
   * 删除单条导入记录
   */
  deleteImportLog: protectedProcedure
    .input(z.object({ logId: z.number() }))
    .mutation(async ({ input }) => {
      // 简单实现,后续可以扩展
      return { success: true };
    }),

  /**
   * 批量删除导入记录
   */
  batchDeleteImportLogs: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      // 简单实现,后续可以扩展
      return { deletedCount: input.ids.length };
    }),

  /**
   * 删除所有导入记录
   */
  deleteAllImportLogs: protectedProcedure
    .mutation(async () => {
      // 简单实现,后续可以扩展
      return { success: true };
    }),

  /**
   * 重新解析邮件
   */
  reprocessEmail: protectedProcedure
    .input(z.object({ 
      logId: z.number(),
      emailContent: z.string()
    }))
    .mutation(async ({ input }) => {
      // 简单实现,后续可以扩展
      return { successCount: 1, failCount: 0 };
    }),
});
