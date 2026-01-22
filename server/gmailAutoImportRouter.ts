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
  calculatePartnerFee,
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
   * 预览导入 - 解析邮件内容但不写入数据库,返回解析结果供用户预览和编辑
   */
  previewImport: protectedProcedure
    .input(
      z.object({
        emailContent: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log("开始预览导入...");
        
        // 解析邮件内容
        const parsedOrders = await parseGmailOrderContent(input.emailContent);
        console.log(`解析到 ${parsedOrders.length} 个订单`);
        
        if (parsedOrders.length === 0) {
          throw new Error("未找到订单信息,请检查邮件内容格式");
        }
        
        // 为每个订单添加验证信息
        const previewData = await Promise.all(
          parsedOrders.map(async (orderData) => {
            const warnings: string[] = [];
            
            // 检查是否为作废订单
            const isVoidOrder = orderData.customerName?.startsWith("作废");
            
            if (isVoidOrder) {
              // 作废订单标记
              if (orderData.channelOrderNo) {
                const existingOrder = await getOrderByChannelOrderNo(orderData.channelOrderNo);
                if (existingOrder) {
                  warnings.push(
                    `🗑️ 作废订单: 将删除原订单 ${existingOrder.orderNo} (客户: ${existingOrder.customerName || '未知'})`
                  );
                } else {
                  warnings.push(
                    `⚠️ 作废订单: 未找到匹配的原订单 (渠道订单号: ${orderData.channelOrderNo})`
                  );
                }
              } else {
                warnings.push("⚠️ 作废订单: 缺少渠道订单号,无法匹配原订单");
              }
            }
            
            // 验证老师费用
            const teacherFeeValidation = validateTeacherFee(
              orderData.teacherFee || 0,
              orderData.courseAmount || 0
            );
            if (!teacherFeeValidation.isValid) {
              warnings.push(teacherFeeValidation.error || "老师费用异常");
            }
            
            // 验证渠道订单号
            let channelOrderNo = orderData.channelOrderNo || "";
            let paymentChannel = orderData.paymentMethod || "";
            
            if (!channelOrderNo || channelOrderNo.trim() === '') {
              warnings.push("⚠️ 缺失渠道订单号");
            } else {
              // 检查渠道订单号是否重复
              const channelOrderExists = await checkChannelOrderNoExists(channelOrderNo);
              if (channelOrderExists) {
                const existingOrder = await getOrderByChannelOrderNo(channelOrderNo);
                warnings.push(
                  `渠道订单号已存在 (关联订单: ${existingOrder?.orderNo || '未知'})`
                );
              }
              
              // 验证格式
              const validation = validateChannelOrderNo(channelOrderNo);
              if (!paymentChannel && validation.isValid) {
                paymentChannel = validation.channelName;
              }
              if (validation.warning) {
                warnings.push(validation.warning);
              }
            }
            
            return {
              ...orderData,
              paymentChannel,
              warnings,
              isValid: warnings.length === 0 || warnings.every(w => w.startsWith("⚠️")),
            };
          })
        );
        
        return {
          orders: previewData,
          totalCount: previewData.length,
          validCount: previewData.filter(o => o.isValid).length,
          invalidCount: previewData.filter(o => !o.isValid).length,
        };
      } catch (error: any) {
        console.error("预览导入失败:", error);
        throw new Error(error.message || "预览失败");
      }
    }),

  /**
   * 确认导入 - 将预览后的订单数据写入数据库
   */
  confirmImport: protectedProcedure
    .input(
      z.object({
        orders: z.array(
          z.object({
            customerName: z.string().optional(),
            salesperson: z.string().optional(),
            deviceWechat: z.string().optional(),
            paymentAmount: z.number(),
            courseAmount: z.number(),
            accountBalance: z.number().optional(),
            teacherFee: z.number().optional(),
            carFee: z.number().optional(),
            channelOrderNo: z.string().optional(),
            paymentMethod: z.string().optional(),
            city: z.string().optional(),
            classroom: z.string().optional(),
            teacher: z.string().optional(),
            course: z.string().optional(),
            classDate: z.string(),
            classTime: z.string().optional(),
            notes: z.string().optional(),
            originalText: z.string().optional(),
          })
        ),
        emailContent: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log("开始确认导入...");
        
        // 创建导入日志
        const logId = await createGmailImportLog({
          emailSubject: "手动粘贴导入(预览后确认)",
          emailDate: new Date(),
          threadId: `manual-${Date.now()}`,
          totalOrders: input.orders.length,
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
        const warningFlags: string[] = [];
        
        for (const orderData of input.orders) {
          try {
            // 检查是否为作废订单
            const isVoidOrder = orderData.customerName?.startsWith("作废");
            
            if (isVoidOrder && orderData.channelOrderNo) {
              // 作废订单处理: 根据渠道订单号删除原订单
              const { deleteOrderByChannelOrderNo } = await import("./db");
              const deletedOrder = await deleteOrderByChannelOrderNo(orderData.channelOrderNo);
              
              if (deletedOrder) {
                successCount++;
                warnings.push(
                  `✅ 已删除作废订单: 渠道订单号 ${orderData.channelOrderNo}, ` +
                  `原订单号 ${deletedOrder.orderNo}, 客户 ${deletedOrder.customerName || '未知'}`
                );
              } else {
                errorMessages.push(
                  `⚠️ 未找到需要作废的订单: 渠道订单号 ${orderData.channelOrderNo}`
                );
              }
              continue;
            }
            
            // 生成订单号
            const orderNo = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
            
            // 检查订单号是否已存在
            const exists = await checkOrderNoExists(orderNo);
            if (exists) {
              skippedCount++;
              errorMessages.push(`订单号 ${orderNo} 已存在`);
              continue;
            }
            
            // 验证老师费用
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
            
            // 计算合伙人费
            const partnerFee = await calculatePartnerFee(
              orderData.city || "",
              orderData.courseAmount || 0,
              orderData.teacherFee || 0
            );
            
            // 验证渠道订单号
            let channelOrderNo = orderData.channelOrderNo || "";
            let paymentChannel = orderData.paymentMethod || "";
            let validationWarning = "";
            
            if (!channelOrderNo || channelOrderNo.trim() === '') {
              warningFlags.push("missing_channel_order_no");
              warnings.push(`订单 ${orderData.customerName || orderData.salesperson}: ⚠️ 缺失渠道订单号`);
            }
            
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
              
              const validation = validateChannelOrderNo(channelOrderNo);
              if (!paymentChannel && validation.isValid) {
                paymentChannel = validation.channelName;
              }
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
              partnerFee: partnerFee.toString(),
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
          totalCount: input.orders.length,
          errors: errorMessages,
          warnings,
        };
      } catch (error: any) {
        console.error("确认导入失败:", error);
        throw new Error(error.message || "导入失败");
      }
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
            
            // 计算合伙人费
            const partnerFee = await calculatePartnerFee(
              orderData.city || "",
              orderData.courseAmount || 0,
              orderData.teacherFee || 0
            );
            
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
              partnerFee: partnerFee.toString(),
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
