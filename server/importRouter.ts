import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import {
  parseAlipayCSV,
  parseWechatExcel,
  parseAlipayXML,
  parseICS,
  type AlipayCSVRecord,
  type WechatExcelRecord,
  type AlipayXMLRecord,
  type ICSEvent,
} from "./fileParser";
import { parseOrderExcel, parseDate, type OrderExcelRow } from "./orderExcelParser";
import type { InsertOrder } from "../drizzle/schema";
import { generateOrderNo } from "./cityAreaCodes";

// 权限检查:销售或管理员可以导入
const importProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "sales" && ctx.user.role !== "finance") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员、销售或财务权限" });
  }
  return next({ ctx });
});

export const importRouter = router({
  // 解析CSV文件(支付宝交易明细)
  parseCSV: importProcedure
    .input(
      z.object({
        fileContent: z.string(), // base64编码的文件内容
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const buffer = Buffer.from(input.fileContent, "base64");
        const records = await parseAlipayCSV(buffer);

        // 记录导入日志
        const logId = await db.createImportLog({
          fileName: "alipay_transactions.csv",
          fileType: "csv",
          dataType: "preview",
          totalRows: records.length,
          successRows: records.length,
          failedRows: 0,
          importedBy: ctx.user.id,
        });

        return {
          success: true,
          recordCount: records.length,
          records: records.slice(0, 10), // 返回前10条预览
          logId,
        };
      } catch (error: any) {
        await db.createImportLog({
          fileName: "alipay_transactions.csv",
          fileType: "csv",
          dataType: "preview",
          totalRows: 0,
          successRows: 0,
          failedRows: 0,
          errorLog: error.message,
          importedBy: ctx.user.id,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `CSV解析失败: ${error.message}`,
        });
      }
    }),

  // 导入CSV数据到订单表
  importCSVToOrders: importProcedure
    .input(
      z.object({
        fileContent: z.string(),
        customerId: z.number().optional(), // 可选的默认客户ID
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const buffer = Buffer.from(input.fileContent, "base64");
        const records = await parseAlipayCSV(buffer);

        let successCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (const record of records) {
          try {
            // 只导入收入类型的交易
            if (record.inOut !== "收入" || record.status !== "交易成功") {
              continue;
            }

            // 检查订单是否已存在
            const existingOrder = await db.getOrderById(parseInt(record.orderNo) || 0);
            if (existingOrder) {
              continue; // 跳过已存在的订单
            }

            // 创建订单
            await db.createOrder({
              orderNo: record.merchantOrderNo || record.orderNo,
              customerId: input.customerId || 0, // 需要关联客户
              paymentAmount: record.amount,
              courseAmount: record.amount,
              paymentChannel: "支付宝",
              channelOrderNo: record.orderNo,
              paymentDate: record.paymentTime ? new Date(record.paymentTime) : null,
              status: "paid",
              salesId: ctx.user.id,
              notes: `${record.productName} - ${record.counterparty}`,
            });

            successCount++;
          } catch (error: any) {
            failedCount++;
            errors.push(`订单${record.orderNo}: ${error.message}`);
          }
        }

        await db.createImportLog({
          fileName: "alipay_transactions.csv",
          fileType: "csv",
          dataType: "orders",
          totalRows: records.length,
          successRows: successCount,
          failedRows: failedCount,
          errorLog: errors.length > 0 ? errors.slice(0, 5).join("; ") : undefined,
          importedBy: ctx.user.id,
        });

        return {
          success: true,
          totalRecords: records.length,
          successCount,
          failedCount,
          errors: errors.slice(0, 10),
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `导入失败: ${error.message}`,
        });
      }
    }),

  // 解析Excel文件(微信支付账单)
  parseExcel: importProcedure
    .input(
      z.object({
        fileContent: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const buffer = Buffer.from(input.fileContent, "base64");
        const records = await parseWechatExcel(buffer);

        await db.createImportLog({
          fileName: "wechat_transactions.xlsx",
          fileType: "excel",
          dataType: "preview",
          totalRows: records.length,
          successRows: records.length,
          failedRows: 0,
          importedBy: ctx.user.id,
        });

        return {
          success: true,
          recordCount: records.length,
          records: records.slice(0, 10),
        };
      } catch (error: any) {
        await db.createImportLog({
          fileName: "wechat_transactions.xlsx",
          fileType: "excel",
          dataType: "preview",
          totalRows: 0,
          successRows: 0,
          failedRows: 0,
          errorLog: error.message,
          importedBy: ctx.user.id,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Excel解析失败: ${error.message}`,
        });
      }
    }),

  // 导入Excel数据到订单表
  importExcelToOrders: importProcedure
    .input(
      z.object({
        fileContent: z.string(),
        customerId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const buffer = Buffer.from(input.fileContent, "base64");
        const records = await parseWechatExcel(buffer);

        let successCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (const record of records) {
          try {
            if (record.inOut !== "收入" || record.status !== "支付成功") {
              continue;
            }

            await db.createOrder({
              orderNo: record.merchantOrderNo || record.orderNo,
              customerId: input.customerId || 0,
              paymentAmount: record.amount,
              courseAmount: record.amount,
              paymentChannel: "微信支付",
              channelOrderNo: record.orderNo,
              paymentDate: record.transactionTime ? new Date(record.transactionTime) : null,
              status: "paid",
              salesId: ctx.user.id,
              notes: `${record.productName} - ${record.counterparty}`,
            });

            successCount++;
          } catch (error: any) {
            failedCount++;
            errors.push(`订单${record.orderNo}: ${error.message}`);
          }
        }

        await db.createImportLog({
          fileName: "wechat_transactions.xlsx",
          fileType: "excel",
          dataType: "orders",
          totalRows: records.length,
          successRows: successCount,
          failedRows: failedCount,
          errorLog: errors.length > 0 ? errors.slice(0, 5).join("; ") : undefined,
          importedBy: ctx.user.id,
        });

        return {
          success: true,
          totalRecords: records.length,
          successCount,
          failedCount,
          errors: errors.slice(0, 10),
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `导入失败: ${error.message}`,
        });
      }
    }),

  // 解析ICS文件(日历排课)
  parseICS: importProcedure
    .input(
      z.object({
        fileContent: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const buffer = Buffer.from(input.fileContent, "base64");
        const events = await parseICS(buffer);

        await db.createImportLog({
          fileName: "calendar.ics",
          fileType: "ics",
          dataType: "preview",
          totalRows: events.length,
          successRows: events.length,
          failedRows: 0,
          importedBy: ctx.user.id,
        });

        return {
          success: true,
          recordCount: events.length,
          events: events.slice(0, 10),
        };
      } catch (error: any) {
        await db.createImportLog({
          fileName: "calendar.ics",
          fileType: "ics",
          dataType: "preview",
          totalRows: 0,
          successRows: 0,
          failedRows: 0,
          errorLog: error.message,
          importedBy: ctx.user.id,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `ICS解析失败: ${error.message}`,
        });
      }
    }),

  // 导入ICS数据到排课表
  importICSToSchedules: importProcedure
    .input(
      z.object({
        fileContent: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const buffer = Buffer.from(input.fileContent, "base64");
        const events = await parseICS(buffer);

        let successCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (const event of events) {
          try {
            // 从summary中提取客户名(第一个空格前的内容)
            const summaryParts = event.summary.split(' ');
            const customerName = summaryParts[0] || '未知客户';
            
            // 提取日期和时间
            const classDateStr = event.startTime.toISOString().split('T')[0];
            const classDate = new Date(classDateStr); // 转换为Date对象
            const startHour = event.startTime.getHours().toString().padStart(2, '0');
            const startMin = event.startTime.getMinutes().toString().padStart(2, '0');
            const endHour = event.endTime.getHours().toString().padStart(2, '0');
            const endMin = event.endTime.getMinutes().toString().padStart(2, '0');
            const classTime = `${startHour}:${startMin}-${endHour}:${endMin}`;
            
            await db.createSchedule({
              courseType: event.summary,
              startTime: event.startTime,
              endTime: event.endTime,
              location: event.location,
              teacherName: event.organizer,
              notes: event.description,
              customerId: 0, // 需要关联客户
              customerName, // 从 summary 中提取的客户名
              deliveryTeacher: event.organizer, // 交付老师使用organizer
              deliveryCourse: event.summary, // 交付课程使用summary
              classDate, // 上课日期
              classTime, // 上课时间
            });

            successCount++;
          } catch (error: any) {
            failedCount++;
            errors.push(`事件${event.summary}: ${error.message}`);
          }
        }

        await db.createImportLog({
          fileName: "calendar.ics",
          fileType: "ics",
          dataType: "schedules",
          totalRows: events.length,
          successRows: successCount,
          failedRows: failedCount,
          errorLog: errors.length > 0 ? errors.slice(0, 5).join("; ") : undefined,
          importedBy: ctx.user.id,
        });

        return {
          success: true,
          totalRecords: events.length,
          successCount,
          failedCount,
          errors: errors.slice(0, 10),
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `导入失败: ${error.message}`,
        });
      }
    }),

  // 解析订单Excel文件(完整订单数据)
  parseOrderExcel: importProcedure
    .input(
      z.object({
        fileContent: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const buffer = Buffer.from(input.fileContent, "base64");
        const records = await parseOrderExcel(buffer);

        await db.createImportLog({
          fileName: "orders.xlsx",
          fileType: "excel",
          dataType: "preview",
          totalRows: records.length,
          successRows: records.length,
          failedRows: 0,
          importedBy: ctx.user.id,
        });

        return {
          success: true,
          recordCount: records.length,
          records: records.slice(0, 10), // 返回前10条预览
        };
      } catch (error: any) {
        await db.createImportLog({
          fileName: "orders.xlsx",
          fileType: "excel",
          dataType: "preview",
          totalRows: 0,
          successRows: 0,
          failedRows: 0,
          errorLog: error.message,
          importedBy: ctx.user.id,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `订单Excel解析失败: ${error.message}`,
        });
      }
    }),

  // 导入订单Excel数据到订单表
  importOrderExcelToOrders: importProcedure
    .input(
      z.object({
        fileContent: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const buffer = Buffer.from(input.fileContent, "base64");
        const records = await parseOrderExcel(buffer);

        let successCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        // 小批量插入:每次50条,平衡速度和稳定性
        const BATCH_SIZE = 50;
        for (let batchStart = 0; batchStart < records.length; batchStart += BATCH_SIZE) {
          const batchEnd = Math.min(batchStart + BATCH_SIZE, records.length);
          const batch = records.slice(batchStart, batchEnd);
          
          const ordersToInsert: InsertOrder[] = [];
          
          // 准备批次数据
          for (let i = 0; i < batch.length; i++) {
            const record = batch[i];
            
            try {
              const paymentDate = parseDate(record.支付日期);
              const classDate = parseDate(record.上课日期);
              
              // 使用新的订单号生成规则(加入城市区号)
              const orderNo = record.订单号 || generateOrderNo(record.交付城市);
              
              const orderData: InsertOrder = {
                orderNo,
                customerName: record.客户微信号 || record.销售人 || "未知客户",
                customerWechat: record.客户微信号,
                salesPerson: record.销售人,
                trafficSource: record.流量来源,
                paymentAmount: record.课程金额.toString(),
                courseAmount: record.课程金额.toString(),
                downPayment: record.首付金额.toString(),
                finalPayment: record.尾款金额.toString(),
                rechargeAmount: record.充值金额.toString(),
                accountBalance: record.账户余额.toString(),
                teacherFee: record.老师费用.toString(),
                transportFee: record.车费.toString(),
                otherFee: record.其他费用.toString(),
                partnerFee: record.合伙人费用.toString(),
                netIncome: record.净收入.toString(),
                paymentChannel: record.支付渠道,
                channelOrderNo: record.订单号,
                paymentDate,
                paymentTime: record.支付时间,
                classDate,
                classTime: record.上课时间,
                deliveryCity: record.交付城市,
                deliveryRoom: record.交付教室,
                deliveryTeacher: record.交付老师,
                deliveryCourse: record.交付课程,
                status: record.状态 === "已支付" ? "paid" : record.状态 === "已完成" ? "completed" : "pending",
                confidence: record.置信度 ? record.置信度.toString() : null,
                notes: record.备注,
                originalText: record.原始文本,
                customerId: 0,
                salesId: ctx.user.id,
              } as InsertOrder;
              
              ordersToInsert.push(orderData);
            } catch (error: any) {
              failedCount++;
              errors.push(`批次${Math.floor(batchStart / BATCH_SIZE) + 1}第${i + 1}条: ${error.message}`);
            }
          }
          
          // 批量插入该批次数据
          if (ordersToInsert.length > 0) {
            try {
              const result = await db.batchCreateOrders(ordersToInsert);
              successCount += result.insertedCount;
            } catch (error: any) {
              failedCount += ordersToInsert.length;
              errors.push(`批次${Math.floor(batchStart / BATCH_SIZE) + 1}插入失败: ${error.message}`);
            }
          }
        }

        await db.createImportLog({
          fileName: "orders.xlsx",
          fileType: "excel",
          dataType: "orders",
          totalRows: records.length,
          successRows: successCount,
          failedRows: failedCount,
          errorLog: errors.length > 0 ? errors.slice(0, 5).join("; ") : undefined,
          importedBy: ctx.user.id,
        });

        return {
          success: true,
          totalRecords: records.length,
          successCount,
          failedCount,
          errors: errors.slice(0, 10),
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `导入失败: ${error.message}`,
        });
      }
    }),

  // 获取导入历史记录
  getLogs: protectedProcedure.query(async () => {
    return db.getImportLogs();
  }),
});
