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
import { parseICSOrderContent, type ParsedICSOrder } from "./icsOrderParser";
import { generateOrderNo } from "./orderNoGenerator";

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

  // 解析ICS文件为订单格式(使用LLM)
  parseICSToOrders: importProcedure
    .input(
      z.object({
        fileContent: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const buffer = Buffer.from(input.fileContent, "base64");
        const events = await parseICS(buffer);
        const orders = await parseICSOrderContent(events);

        await db.createImportLog({
          fileName: "calendar.ics",
          fileType: "ics",
          dataType: "preview",
          totalRows: orders.length,
          successRows: orders.length,
          failedRows: 0,
          importedBy: ctx.user.id,
        });

        return {
          success: true,
          recordCount: orders.length,
          orders: orders.slice(0, 10), // 只返回前10条预览
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
          message: `ICS订单解析失败: ${error.message}`,
        });
      }
    }),

  // 导入ICS数据到订单表
  importICSToOrders: importProcedure
    .input(
      z.object({
        fileContent: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const buffer = Buffer.from(input.fileContent, "base64");
        const events = await parseICS(buffer);
        const orders = await parseICSOrderContent(events);

        let successCount = 0;
        let failedCount = 0;
        const errors: string[] = [];
        const createdOrders: number[] = [];

        for (const order of orders) {
          try {
            // 查找销售人员ID
            let salespersonId: number | undefined;
            if (order.salesperson) {
              const salespersons = await db.searchSalespersons(order.salesperson);
              salespersonId = salespersons.length > 0 ? salespersons[0].id : undefined;
            }

            // 查找或创建客户
            let customerId: number | undefined;
            if (order.customerName) {
              const existingCustomers = await db.searchCustomers(order.customerName);
              if (existingCustomers.length > 0) {
                customerId = existingCustomers[0].id;
              } else {
                // 自动创建客户
                customerId = await db.createCustomer({
                  name: order.customerName,
                  trafficSource: order.deviceWechat || "ICS导入",
                  createdBy: ctx.user.id,
                });
              }
            }

            // 计算合伙人费用
            const partnerFee = await db.calculatePartnerFee(
              order.city || "",
              order.courseAmount,
              order.teacherFee
            );

            // 生成订单号
            const orderNo = generateOrderNo(order.city);

            // 创建订单
            const result = await db.createOrder({
              orderNo,
              salesId: ctx.user.id,
              customerId: customerId || undefined,
              customerName: order.customerName || undefined,
              salespersonId: salespersonId || undefined,
              salesPerson: order.salesperson || undefined,
              trafficSource: order.deviceWechat || "ICS导入",
              paymentAmount: order.paymentAmount.toString(),
              courseAmount: order.courseAmount.toString(),
              accountBalance: order.accountBalance > 0 ? order.accountBalance.toString() : "0.00",
              paymentCity: order.city || undefined,
              paymentChannel: order.paymentMethod || undefined,
              channelOrderNo: order.channelOrderNo || undefined,
              paymentDate: order.classDate ? new Date(order.classDate) : undefined,
              paymentTime: order.classTime || undefined,
              teacherFee: order.teacherFee > 0 ? order.teacherFee.toString() : "0.00",
              transportFee: order.carFee > 0 ? order.carFee.toString() : "0.00",
              partnerFee: partnerFee > 0 ? partnerFee.toString() : "0.00",
              deliveryCity: order.city || undefined,
              deliveryRoom: order.classroom || undefined,
              deliveryTeacher: order.teacher || undefined,
              deliveryCourse: order.course || undefined,
              classDate: order.classDate ? new Date(order.classDate) : undefined,
              classTime: order.classTime || undefined,
              status: "paid",
              notes: order.notes || undefined,
            });

            createdOrders.push(result.id);
            successCount++;
          } catch (error: any) {
            failedCount++;
            errors.push(`订单导入失败(${order.customerName || "未知客户"}): ${error.message}`);
          }
        }

        await db.createImportLog({
          fileName: "calendar.ics",
          fileType: "ics",
          dataType: "order",
          totalRows: orders.length,
          successRows: successCount,
          failedRows: failedCount,
          errorLog: errors.length > 0 ? errors.join("\n") : undefined,
          importedBy: ctx.user.id,
        });

        return {
          success: true,
          totalCount: orders.length,
          successCount,
          failedCount,
          createdOrders,
          errors,
        };
      } catch (error: any) {
        await db.createImportLog({
          fileName: "calendar.ics",
          fileType: "ics",
          dataType: "order",
          totalRows: 0,
          successRows: 0,
          failedRows: 0,
          errorLog: error.message,
          importedBy: ctx.user.id,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `ICS订单导入失败: ${error.message}`,
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

  // 获取导入历史记录
  getLogs: protectedProcedure.query(async () => {
    return db.getImportLogs();
  }),
});
