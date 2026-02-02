import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { importRouter } from "./importRouter";
import { salespersonRouter } from "./salespersonRouter";
import { gmailAutoImportRouter } from "./gmailAutoImportRouter";
import { trafficSourceConfigRouter } from "./trafficSourceConfigRouter";
import { transportFeeFixRouter } from "./transportFeeFixRouter";
import { parsingLearningRouter } from "./parsingLearningRouter";
import { reconciliationRouter } from "./reconciliationRouter";
import { customerRouter } from "./customerRouter";
import { financeRouter } from "./financeRouter";
import { cityRouter } from "./cityRouter";
import { accountRouter } from "./accountRouter";
import { permissionRouter } from "./permissionRouter";
import { authRouter } from "./authRouter";
import { recommendCity, getRecommendedCity } from "./cityRecommendation";

import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { getDb, getOrderById } from "./db";
import { generateOrderNo } from "./orderNoGenerator";
import { generateOrderId } from "./orderIdGenerator";
import { validateChannelOrderNo } from "./channelOrderNoUtils";
import { validateTeacherFee } from "./teacherFeeValidator";
import { orders } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// 权限检查中间件
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
  }
  return next({ ctx });
});

const salesOrAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "sales") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要销售或管理员权限" });
  }
  return next({ ctx });
});

const financeOrAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "finance") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要财务或管理员权限" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  salespersons: salespersonRouter,
  customers: customerRouter,
  finance: financeRouter,
  city: cityRouter,
  accounts: accountRouter,
  permissions: permissionRouter,
  auth: authRouter,
  gmailAutoImport: gmailAutoImportRouter,
  trafficSourceConfig: trafficSourceConfigRouter,
  transportFeeFix: transportFeeFixRouter,
  parsingLearning: parsingLearningRouter,
  reconciliation: reconciliationRouter,

  // 数据质量检查
  dataQuality: router({
    // 检查订单数据质量
    checkOrders: protectedProcedure.query(async () => {
      return db.checkOrderDataQuality();
    }),

    // 获取未配置城市列表
    getUnconfiguredCities: protectedProcedure.query(async () => {
      return db.getUnconfiguredCities();
    }),
  }),

  // 审计日志
  auditLogs: router({
    // 获取所有审计日志
    getAll: protectedProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit || 100;
        const offset = input?.offset || 0;
        return db.getAllAuditLogs(limit, offset);
      }),

    // 按操作类型获取审计日志
    getByType: protectedProcedure
      .input(z.object({
        operationType: z.string(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const limit = input.limit || 50;
        return db.getAuditLogsByType(input.operationType, limit);
      }),

    // 按操作人获取审计日志
    getByOperator: protectedProcedure
      .input(z.object({
        operatorId: z.number(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const limit = input.limit || 50;
        return db.getAuditLogsByOperator(input.operatorId, limit);
      }),

    // 按日期范围获取审计日志
    getByDateRange: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);
        return db.getAuditLogsByDateRange(startDate, endDate);
      }),

    // 获取审计日志统计
    getStats: protectedProcedure.query(async () => {
      return db.getAuditLogStats();
    }),
  }),


  // 用户管理(仅管理员)
  users: router({
    list: protectedProcedure.query(async () => {
      return db.getAllUsers();
    }),
    
    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["admin", "sales", "finance", "user"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),
    
    updateStatus: adminProcedure
      .input(z.object({
        userId: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserStatus(input.userId, input.isActive);
        return { success: true };
      }),
  }),


  // 订单管理
  orders: router({
    list: protectedProcedure
      .input(z.object({
        paymentChannel: z.string().optional(),
        channelOrderNo: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        // 如果有渠道订单号搜索
        if (input?.channelOrderNo && input.channelOrderNo.trim() !== '') {
          return db.searchOrdersByChannelOrderNo(input.channelOrderNo);
        }
        
        // 如果有支付渠道筛选
        if (input?.paymentChannel && input.paymentChannel !== 'all') {
          return db.getOrdersByPaymentChannel(input.paymentChannel);
        }
        
        // 销售只能看自己的订单
        if (ctx.user.role === "sales") {
          return db.getOrdersBySales(ctx.user.id);
        }
        return db.getAllOrders();
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getOrderById(input.id);
      }),
    
    parseTransferNotes: salesOrAdminProcedure
      .input(z.object({
        text: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { parseTransferNotes } = await import("./transferNoteParser");
        const results = await parseTransferNotes(input.text);
        return results;
      }),
    
    parseWechatBill: salesOrAdminProcedure
      .input(z.object({
        rows: z.array(z.object({
          transactionTime: z.string(),
          transactionType: z.string(),
          counterparty: z.string(),
          goods: z.string(),
          incomeExpense: z.string(),
          amount: z.string(),
          paymentMethod: z.string(),
          status: z.string(),
          transactionNo: z.string(),
          merchantNo: z.string(),
          notes: z.string(),
        })),
        template: z.enum(["wechat", "alipay", "custom"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { parseWechatBillBatch } = await import("./wechatBillParser");
        const results = await parseWechatBillBatch(input.rows, input.template || "wechat");
        return { success: true, data: results };
      }),
    
    create: salesOrAdminProcedure
      .input(z.object({
        orderNo: z.string().optional(),
        customerId: z.number().optional(), // 客户ID(用于余额扣款)
        customerName: z.string().optional(), // 允许客户名为空
        salespersonId: z.number().optional(), // 销售人员ID(关联salespersons表)
        salesPerson: z.string().optional(),
        trafficSource: z.string().optional(),
        paymentAmount: z.string(),
        courseAmount: z.string(),
        accountBalance: z.string().optional(),
        useAccountBalance: z.boolean().optional(), // 是否使用账户余额支付
        paymentCity: z.string().optional(),
        paymentChannel: z.string().optional(),
        channelOrderNo: z.string().optional(),
        paymentDate: z.string().optional(),
        paymentTime: z.string().optional(),
        teacherFee: z.string().optional(),
        transportFee: z.string().optional(),
        otherFee: z.string().optional(),
        partnerFee: z.string().optional(),
        finalAmount: z.string().optional(),
        deliveryCity: z.string().optional(),
        deliveryRoom: z.string().optional(),
        deliveryTeacher: z.string().optional(),
        deliveryCourse: z.string().optional(),
        classDate: z.string().optional(),
        classTime: z.string().optional(),
        status: z.enum(["pending", "paid", "completed", "cancelled", "refunded"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // 验证客户名不能是老师名(如果提供了客户名)
        if (input.customerName && input.customerName.trim() !== '') {
          const teacherNames = await db.getAllTeacherNames();
          if (teacherNames.includes(input.customerName.trim())) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `客户名不能使用老师名字: ${input.customerName}`,
            });
          }
        }
        
        // 验证老师费用不能超过课程金额
        const teacherFeeNum = input.teacherFee ? parseFloat(input.teacherFee) : 0;
        const courseAmountNum = input.courseAmount ? parseFloat(input.courseAmount) : 0;
        const teacherFeeValidation = validateTeacherFee(teacherFeeNum, courseAmountNum);
        if (!teacherFeeValidation.isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: teacherFeeValidation.error || "老师费用验证失败",
          });
        }
        
        // 检查渠道订单号是否重复
        if (input.channelOrderNo && input.channelOrderNo.trim() !== '') {
          const exists = await db.checkChannelOrderNoExists(input.channelOrderNo);
          if (exists) {
            const existingOrder = await db.getOrderByChannelOrderNo(input.channelOrderNo);
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `渠道订单号已存在: ${input.channelOrderNo}\n关联订单: ${existingOrder?.orderNo || '未知'} (客户: ${existingOrder?.customerName || '未知'})`,
            });
          }
        }
        
        // 如果没有提供订单号,自动生成
        let orderNo = input.orderNo || generateOrderNo(input.paymentCity || input.deliveryCity);
        
        // 查重验证,如果订单号已存在,添加随机后缀
        let suffix = 1;
        while (await db.checkOrderNoExists(orderNo)) {
          const suffixStr = String(suffix).padStart(3, '0'); // 生成三位数后缀 001, 002, ...
          orderNo = generateOrderNo(input.paymentCity || input.deliveryCity, suffixStr);
          suffix++;
          
          // 防止无限循环,最多尝试999次
          if (suffix > 999) {
            throw new TRPCError({ 
              code: "INTERNAL_SERVER_ERROR", 
              message: "订单号生成失败,请稍后重试" 
            });
          }
        }
        
        // 如果需要使用账户余额支付,先执行扣款
        if (input.useAccountBalance && input.customerId) {
          const paymentAmount = parseFloat(input.paymentAmount);
          try {
            await db.consumeCustomerAccount({
              customerId: input.customerId,
              amount: paymentAmount,
              orderId: 0, // 临时值,后面会更新
              orderNo,
              operatorId: ctx.user.id,
              operatorName: ctx.user.name || ctx.user.nickname || "未知",
            });
          } catch (error: any) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: error.message || "余额扣款失败",
            });
          }
        }
        
        // 自动计算合伙人费(如果没有手动指定)
        let partnerFee = input.partnerFee;
        if (!partnerFee && input.deliveryCity && input.courseAmount && input.teacherFee !== undefined) {
          const calculatedFee = await db.calculatePartnerFee(
            input.deliveryCity,
            parseFloat(input.courseAmount),
            parseFloat(input.teacherFee || "0")
          );
          partnerFee = calculatedFee.toString();
        }
        
        const orderData: any = {
          orderNo,
          customerId: input.customerId || undefined,
          customerName: input.customerName,
          salespersonId: input.salespersonId || undefined,
          salesId: ctx.user.id,
          salesPerson: input.salesPerson || undefined,
          trafficSource: input.trafficSource || undefined,
          paymentAmount: input.paymentAmount,
          courseAmount: input.courseAmount,
          accountBalance: input.accountBalance || undefined,
          paymentCity: input.paymentCity || undefined,
          paymentChannel: input.paymentChannel || undefined,
          channelOrderNo: input.channelOrderNo || undefined,
          paymentDate: input.paymentDate ? new Date(input.paymentDate) : undefined,
          paymentTime: input.paymentTime || undefined,
          teacherFee: input.teacherFee || undefined,
          transportFee: input.transportFee || undefined,
          otherFee: input.otherFee || undefined,
          partnerFee: partnerFee?.toString() || undefined,
          finalAmount: input.finalAmount || undefined,
          deliveryCity: input.deliveryCity || undefined,
          deliveryRoom: input.deliveryRoom || undefined,
          deliveryTeacher: input.deliveryTeacher || undefined,
          deliveryCourse: input.deliveryCourse || undefined,
          classDate: input.classDate ? new Date(input.classDate) : undefined,
          classTime: input.classTime || undefined,
          status: input.status || undefined,
          notes: input.notes || undefined,
        };
        const id = await db.createOrder(orderData);
        return { id, success: true };
      }),
    
    batchCreate: salesOrAdminProcedure
      .input(z.object({
        template: z.enum(["wechat", "alipay", "custom"]),
        orders: z.array(z.object({
          salesperson: z.string().optional(),
          customerName: z.string(),
          deliveryTeacher: z.string().optional(),
          deliveryCourse: z.string().optional(),
          deliveryCity: z.string().optional(),
          deliveryRoom: z.string().optional(),
          classDate: z.string().optional(),
          classTime: z.string().optional(),
          paymentAmount: z.string(),
          paymentMethod: z.string().optional(),
          courseAmount: z.string().optional(),
          channelOrderNo: z.string().optional(),
          teacherFee: z.string().optional(),
          transportFee: z.string().optional(),
          notes: z.string().optional(),
          // 结构化备注字段(使用nullish()同时允许null和undefined)
          noteTags: z.string().nullish(),
          discountInfo: z.string().nullish(),
          couponInfo: z.string().nullish(),
          membershipInfo: z.string().nullish(),
          paymentStatus: z.string().nullish(),
          specialNotes: z.string().nullish(),
          isVoided: z.boolean().nullish(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        let successCount = 0;
        let failCount = 0;
        
        // 获取所有销售人员用于查找ID
        const allSalespersons = await db.getAllSalespersons();
        
        for (const orderData of input.orders) {
          try {
            // 生成订单号
            const orderNo = generateOrderId(
              orderData.deliveryCity, 
              undefined, 
              orderData.paymentMethod || undefined
            );
            
            // 辅助函数:过滤无效值(将null转换为undefined)
            const filterValue = (val: string | null | undefined) => {
              if (!val || val === "?" || val.trim() === "") return undefined;
              return val;
            };
            
            // 查找销售人员ID
            let salespersonId: number | undefined = ctx.user.id; // 默认使用当前用户
            let salesPerson: string | undefined = undefined;
            
            if (orderData.salesperson) {
              // 根据销售人员名字(花名或真实姓名)查找ID
              const sp = allSalespersons.find(s => 
                s.nickname === orderData.salesperson || 
                s.name === orderData.salesperson
              );
              if (sp) {
                salespersonId = sp.id;
                salesPerson = sp.nickname || sp.name; // 优先使用花名
              } else {
                // 如果找不到匹配的销售人员,仍然保存名字
                salesPerson = orderData.salesperson;
              }
            }
            
            // 自动计算合伙人费
            let partnerFee: string | undefined;
            const deliveryCity = filterValue(orderData.deliveryCity);
            const courseAmount = orderData.courseAmount || orderData.paymentAmount;
            const teacherFee = filterValue(orderData.teacherFee);
            
            if (deliveryCity && courseAmount && teacherFee) {
              const calculatedFee = await db.calculatePartnerFee(
                deliveryCity,
                parseFloat(courseAmount),
                parseFloat(teacherFee)
              );
              partnerFee = calculatedFee.toString();
            }
            
            await db.createOrder({
              orderNo,
              customerName: orderData.customerName,
              salesId: salespersonId,
              salesPerson: salesPerson,
              deliveryTeacher: filterValue(orderData.deliveryTeacher),
              deliveryCourse: filterValue(orderData.deliveryCourse),
              deliveryCity,
              deliveryRoom: filterValue(orderData.deliveryRoom),
              classDate: orderData.classDate ? new Date(orderData.classDate) : undefined,
              classTime: filterValue(orderData.classTime),
              paymentAmount: orderData.paymentAmount,
              courseAmount,
              channelOrderNo: filterValue(orderData.channelOrderNo),
              teacherFee,
              transportFee: filterValue(orderData.transportFee),
              partnerFee,
              notes: filterValue(orderData.notes),
              // 结构化备注字段
              noteTags: filterValue(orderData.noteTags),
              discountInfo: filterValue(orderData.discountInfo),
              couponInfo: filterValue(orderData.couponInfo),
              membershipInfo: filterValue(orderData.membershipInfo),
              paymentStatus: filterValue(orderData.paymentStatus),
              specialNotes: filterValue(orderData.specialNotes),
              isVoided: orderData.isVoided || false,
            });
            successCount++;
          } catch (error) {
            failCount++;
            console.error("创建订单失败:", error);
          }
        }
        
        // 记录导入历史
        await db.createSmartRegisterHistory({
          template: input.template,
          totalRows: input.orders.length,
          successCount,
          failCount,
          operatorId: ctx.user.id,
          operatorName: ctx.user.name,
        });
        
        return { successCount, failCount };
      }),
    
    update: salesOrAdminProcedure
      .input(z.object({
        id: z.number(),
        orderNo: z.string().optional(),
        customerName: z.string().optional(),
        salespersonId: z.number().optional(),
        salesPerson: z.string().optional(),
        trafficSource: z.string().optional(),
        paymentAmount: z.string().optional(),
        courseAmount: z.string().optional(),
        accountBalance: z.string().optional(),
        paymentCity: z.string().optional(),
        paymentChannel: z.string().optional(),
        channelOrderNo: z.string().optional(),
        paymentDate: z.string().optional(),
        paymentTime: z.string().optional(),
        teacherFee: z.string().optional(),
        transportFee: z.string().optional(),
        otherFee: z.string().optional(),
        partnerFee: z.string().optional(),
        finalAmount: z.string().optional(),
        deliveryCity: z.string().optional(),
        deliveryRoom: z.string().optional(),
        deliveryTeacher: z.string().optional(),
        deliveryCourse: z.string().optional(),
        classDate: z.string().optional(),
        classTime: z.string().optional(),
        status: z.enum(["pending", "paid", "completed", "cancelled", "refunded"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        
        // 过滤掉空字符串和undefined,只保留有效值
        const processedData: any = {};
        for (const [key, value] of Object.entries(updateData)) {
          // 跳过undefined和空字符串(但保留数字0)
          if (value === undefined || value === "") {
            continue;
          }
          processedData[key] = value;
        }
        
        // 处理日期字段:只有非空字符串才转换
        if (processedData.paymentDate && processedData.paymentDate !== "") {
          processedData.paymentDate = new Date(processedData.paymentDate);
        }
        if (processedData.classDate && processedData.classDate !== "") {
          processedData.classDate = new Date(processedData.classDate);
        }
        
        // 如果更新了交付城市、课程金额或老师费用,自动重算合伙人费(除非手动指定)
        if (!updateData.partnerFee && (updateData.deliveryCity || updateData.courseAmount || updateData.teacherFee !== undefined)) {
          // 获取当前订单信息
          const currentOrder = await db.getOrderById(id);
          if (currentOrder) {
            const deliveryCity = updateData.deliveryCity || currentOrder.deliveryCity;
            const courseAmount = updateData.courseAmount || currentOrder.courseAmount;
            const teacherFee = updateData.teacherFee !== undefined ? updateData.teacherFee : currentOrder.teacherFee;
            
            if (deliveryCity && courseAmount && teacherFee !== null) {
              const calculatedFee = await db.calculatePartnerFee(
                deliveryCity,
                parseFloat(courseAmount),
                parseFloat(teacherFee || "0")
              );
              processedData.partnerFee = calculatedFee.toString();
            }
          }
        }
        
        await db.updateOrder(id, processedData);
        return { success: true };
      }),
    
    delete: salesOrAdminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteOrder(input.id);
        return { success: true };
      }),
    
    batchDelete: salesOrAdminProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await db.batchDeleteOrders(input.ids);
        return { success: true, count: input.ids.length };
      }),
    
    batchUpdateStatus: salesOrAdminProcedure
      .input(z.object({ 
        ids: z.array(z.number()),
        status: z.enum(["pending", "paid", "completed", "cancelled", "refunded"]),
      }))
      .mutation(async ({ input }) => {
        await db.batchUpdateOrderStatus(input.ids, input.status);
        return { success: true, count: input.ids.length };
      }),
    
    // 批量更新订单号（添加支付方式前缀）
    batchUpdateOrderIds: adminProcedure
      .mutation(async () => {
        const orders = await db.getAllOrders();
        let updatedCount = 0;
        
        for (const order of orders) {
          // 跳过已经有前缀的订单号
          if (order.orderNo && (order.orderNo.startsWith('pay') || order.orderNo.startsWith('we') || order.orderNo.startsWith('xj'))) {
            continue;
          }
          
          // 根据支付渠道确定前缀
          let prefix = '';
          const channel = order.paymentChannel?.toLowerCase() || '';
          
          if (channel.includes('支付宝') || channel.includes('alipay')) {
            prefix = 'pay';
          } else if (channel.includes('富掌柜') || channel.includes('微信') || channel.includes('wechat')) {
            prefix = 'we';
          } else if (channel.includes('现金') || channel.includes('cash')) {
            prefix = 'xj';
          } else {
            // 未知支付方式，保持原样
            continue;
          }
          
          // 更新订单号
          const newOrderNo = prefix + order.orderNo;
          await db.updateOrderNo(order.id, newOrderNo);
          updatedCount++;
        }
        
        return { success: true, updatedCount };
      }),
    
    getByDateRange: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return db.getOrdersByDateRange(input.startDate, input.endDate);
      }),
    

    // 批量补全渠道订单号
    batchFillChannelOrderNo: adminProcedure
      .input(z.object({
        onlyMissing: z.boolean().optional(),
        validateFormat: z.boolean().optional(),
        autoIdentifyChannel: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { batchFillChannelOrderNo } = await import("./channelOrderNoBatchFill");
        const result = await batchFillChannelOrderNo(input);
        return result;
      }),
    
    // 预览批量补全结果
    previewBatchFillChannelOrderNo: adminProcedure
      .input(z.object({
        onlyMissing: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const { previewBatchFillChannelOrderNo } = await import("./channelOrderNoBatchFill");
        const result = await previewBatchFillChannelOrderNo(input);
        return result;
      }),
    
    // 批量修正渠道订单号
    batchUpdateChannelOrderNo: salesOrAdminProcedure
      .input(z.object({
        orderIds: z.array(z.number()),
        channelOrderNo: z.string().optional(), // 如果为空则清空
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接失败");
        
        let successCount = 0;
        const errors: string[] = [];
        
        for (const orderId of input.orderIds) {
          try {
            await db.update(orders)
              .set({ channelOrderNo: input.channelOrderNo || null })
              .where(eq(orders.id, orderId));
            successCount++;
          } catch (err: any) {
            errors.push(`订单ID ${orderId}: ${err.message}`);
          }
        }
        
        return {
          success: true,
          successCount,
          failedCount: input.orderIds.length - successCount,
          errors,
        };
      }),
    
    // 批量验证渠道订单号格式
    batchValidateChannelOrderNo: protectedProcedure
      .input(z.object({
        orderIds: z.array(z.number()),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接失败");
        
        const results = [];
        
        for (const orderId of input.orderIds) {
          const order = await getOrderById(orderId);
          if (!order) continue;
          
          const validation = validateChannelOrderNo(order.channelOrderNo || "");
          results.push({
            orderId: order.id,
            orderNo: order.orderNo,
            customerName: order.customerName,
            channelOrderNo: order.channelOrderNo,
            isValid: validation.isValid,
            channelName: validation.channelName,
            warning: validation.warning,
          });
        }
        
        return results;
      }),
    
    // 导出对账报表
    exportReconciliationReport: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        paymentChannel: z.string().optional(),
      }))
      .query(async ({ input }) => {
        let orders = await db.getReconciliationReport(input.startDate, input.endDate);
        
        // 如果指定了支付渠道,进行筛选
        if (input.paymentChannel && input.paymentChannel !== 'all') {
          orders = orders.filter(order => order.paymentChannel === input.paymentChannel);
        }
        
        // 按支付渠道分组统计
        const groupedByChannel: Record<string, any> = {};
        let totalAmount = 0;
        let totalCount = 0;
        
        for (const order of orders) {
          const channel = order.paymentChannel || '未知';
          if (!groupedByChannel[channel]) {
            groupedByChannel[channel] = {
              channel,
              orders: [],
              totalAmount: 0,
              count: 0,
            };
          }
          
          const amount = parseFloat(order.paymentAmount || '0');
          groupedByChannel[channel].orders.push(order);
          groupedByChannel[channel].totalAmount += amount;
          groupedByChannel[channel].count++;
          totalAmount += amount;
          totalCount++;
        }
        
        return {
          startDate: input.startDate,
          endDate: input.endDate,
          totalAmount,
          totalCount,
          groupedByChannel: Object.values(groupedByChannel),
          allOrders: orders,
        };
      }),

    // 批量重新计算合伙人费(针对选中的订单)
    batchCalculatePartnerFee: protectedProcedure
      .input(z.object({
        orderIds: z.array(z.number())
      }))
      .mutation(async ({ input, ctx }) => {
        const { orderIds } = input;
        
        let updatedCount = 0;
        let unchangedCount = 0;
        let errorCount = 0;
        const updates: any[] = [];
        const errorMessages: string[] = [];
        
        for (const orderId of orderIds) {
          try {
            // 获取订单信息
            const order = await db.getOrderById(orderId);
            if (!order) {
              errorCount++;
              errorMessages.push(`订单ID ${orderId} 不存在`);
              continue;
            }
            
            // 跳过没有必要字段的订单
            if (!order.deliveryCity || !order.courseAmount || order.teacherFee === null) {
              unchangedCount++;
              continue;
            }
            
            const courseAmount = parseFloat(order.courseAmount);
            const teacherFee = parseFloat(order.teacherFee || "0");
            
            // 计算新的合伙人费
            const newPartnerFee = await db.calculatePartnerFee(
              order.deliveryCity,
              courseAmount,
              teacherFee
            );
            
            const oldPartnerFee = parseFloat(order.partnerFee || "0");
            
            // 如果合伙人费有变化，记录更新
            if (Math.abs(newPartnerFee - oldPartnerFee) > 0.01) {
              updates.push({
                orderId: order.id,
                orderNo: order.orderNo,
                customerName: order.customerName,
                deliveryCity: order.deliveryCity,
                courseAmount: courseAmount,
                teacherFee: teacherFee,
                oldPartnerFee: oldPartnerFee,
                newPartnerFee: newPartnerFee,
              });
              
              // 更新数据库
              await db.updateOrder(order.id, {
                partnerFee: newPartnerFee.toString()
              });
              
              updatedCount++;
            } else {
              unchangedCount++;
            }
          } catch (error) {
            console.error(`处理订单 ${orderId} 时出错:`, error);
            errorCount++;
            errorMessages.push(`订单ID ${orderId}: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        }
        
        return {
          success: true,
          totalOrders: orderIds.length,
          updatedCount,
          unchangedCount,
          errorCount,
          updates,
          errorMessages,
        };
      }),

    // 导出Excel
    exportExcel: protectedProcedure
      .input(
        z.object({
          orderIds: z.array(z.number()).optional(), // 可选:指定订单ID列表
          startDate: z.string().optional(), // 可选:开始日期
          endDate: z.string().optional(), // 可选:结束日期
        })
      )
      .mutation(async ({ input }) => {
        try {
          const ExcelJS = (await import("exceljs")).default;
          
          // 获取订单数据
          let orders;
          if (input.orderIds && input.orderIds.length > 0) {
            // 按ID列表获取
            orders = await db.getOrdersByIds(input.orderIds);
          } else if (input.startDate && input.endDate) {
            // 按日期范围获取
            orders = await db.getOrdersByDateRange(input.startDate, input.endDate);
          } else {
            // 获取所有订单
            orders = await db.getAllOrders();
          }

          // 创建Excel工作簿
          const workbook = new ExcelJS.Workbook();
          workbook.creator = "课程交付CRM系统";
          workbook.created = new Date();

          const sheet = workbook.addWorksheet("订单列表");

          // 设置表头
          sheet.columns = [
            { header: "订单号", key: "orderNo", width: 20 },
            { header: "销售人", key: "salesPerson", width: 12 },
            { header: "流量来源", key: "trafficSource", width: 15 },
            { header: "客户名", key: "customerName", width: 15 },
            { header: "支付金额", key: "paymentAmount", width: 12 },
            { header: "课程金额", key: "courseAmount", width: 12 },
            { header: "账户余额", key: "accountBalance", width: 12 },
            { header: "支付城市", key: "paymentCity", width: 12 },
            { header: "渠道订单号", key: "channelOrderNo", width: 25 },
            { header: "老师费用", key: "teacherFee", width: 12 },
            { header: "车费", key: "transportFee", width: 10 },
            { header: "其他费用", key: "otherFee", width: 12 },
            { header: "合伙人费", key: "partnerFee", width: 12 },
            { header: "金串到账金额", key: "finalAmount", width: 15 },
            { header: "支付日期", key: "paymentDate", width: 12 },
            { header: "支付时间", key: "paymentTime", width: 12 },
            { header: "交付城市", key: "deliveryCity", width: 12 },
            { header: "交付教室", key: "deliveryRoom", width: 20 },
            { header: "交付老师", key: "deliveryTeacher", width: 15 },
            { header: "交付课程", key: "deliveryCourse", width: 20 },
            { header: "上课日期", key: "classDate", width: 12 },
            { header: "上课时间", key: "classTime", width: 12 },
            { header: "备注", key: "notes", width: 30 },
          ];

          // 填充数据
          orders.forEach((order: any) => {
            sheet.addRow({
              orderNo: order.orderNo || "",
              salesPerson: order.salesPerson || "",
              trafficSource: order.trafficSource || "",
              customerName: order.customerName || "",
              paymentAmount: order.paymentAmount || "",
              courseAmount: order.courseAmount || "",
              accountBalance: order.accountBalance || "",
              paymentCity: order.paymentCity || "",
              channelOrderNo: order.channelOrderNo || "",
              teacherFee: order.teacherFee || "",
              transportFee: order.transportFee || "",
              otherFee: order.otherFee || "",
              partnerFee: order.partnerFee || "",
              finalAmount: order.finalAmount || "",
              paymentDate: order.paymentDate || "",
              paymentTime: order.paymentTime || "",
              deliveryCity: order.deliveryCity || "",
              deliveryRoom: order.deliveryRoom || "",
              deliveryTeacher: order.deliveryTeacher || "",
              deliveryCourse: order.deliveryCourse || "",
              classDate: order.classDate ? new Date(order.classDate).toLocaleDateString("zh-CN") : "",
              classTime: order.classTime || "",
              notes: order.notes || "",
            });
          });

          // 设置表头样式
          sheet.getRow(1).font = { bold: true };
          sheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0E0E0" },
          };

          // 生成Excel文件的Buffer
          const buffer = await workbook.xlsx.writeBuffer();

          // 将Buffer转换为Base64字符串
          const base64 = Buffer.from(buffer).toString("base64");

          return {
            success: true,
            data: base64,
            filename: `订单列表_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.xlsx`,
          };
        } catch (error) {
          console.error("导出Excel失败:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "导出Excel失败",
          });
        }
      }),

  }),

  // 老师管理
  teachers: router({
    list: protectedProcedure.query(async () => {
      return db.getAllTeachers();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getTeacherById(input.id);
      }),
    
    create: adminProcedure
      .input(z.object({
        name: z.string(),
        phone: z.string().optional(),
        status: z.string().optional(),
        customerType: z.string().optional(),
        notes: z.string().optional(),
        category: z.string().optional(),
        city: z.string().optional(),
        // 兼容旧字段
        nickname: z.string().optional(),
        email: z.string().optional(),
        wechat: z.string().optional(),
        hourlyRate: z.string().optional(),
        bankAccount: z.string().optional(),
        bankName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createTeacher(input);
        return { id, success: true };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          phone: z.string().optional(),
          status: z.string().optional(),
          customerType: z.string().optional(),
          notes: z.string().optional(),
          category: z.string().optional(),
          city: z.string().optional(),
          contractEndDate: z.union([z.string(), z.date()]).optional().transform(val => val ? (typeof val === 'string' ? new Date(val) : val) : undefined),
          joinDate: z.union([z.string(), z.date()]).optional().transform(val => val ? (typeof val === 'string' ? new Date(val) : val) : undefined),
          aliases: z.string().optional(), // 别名(逗号分隔)
          // 兼容旧字段
          nickname: z.string().optional(),
          email: z.string().optional(),
          wechat: z.string().optional(),
          hourlyRate: z.string().optional(),
          bankAccount: z.string().optional(),
          bankName: z.string().optional(),
          isActive: z.boolean().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateTeacher(input.id, input.data);
        return { success: true };
      }),

    // 批量删除
    batchDelete: adminProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await db.batchDeleteTeachers(input.ids);
        return { success: true, deletedCount: input.ids.length };
      }),

    // 批量更新状态
    batchUpdateStatus: adminProcedure
      .input(z.object({ 
        ids: z.array(z.number()),
        status: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.batchUpdateTeacherStatus(input.ids, input.status);
        return { success: true, updatedCount: input.ids.length };
      }),

    // Excel导入
    importFromExcel: adminProcedure
      .input(z.object({
        teachers: z.array(z.object({
          name: z.string(),
          phone: z.string().optional(),
          status: z.string().optional(),
          customerType: z.string().optional(),
          notes: z.string().optional(),
          category: z.string().optional(),
          city: z.string().optional(),
          contractEndDate: z.union([z.string(), z.date()]).optional().transform(val => val ? (typeof val === 'string' ? new Date(val) : val) : undefined),
          joinDate: z.union([z.string(), z.date()]).optional().transform(val => val ? (typeof val === 'string' ? new Date(val) : val) : undefined),
        })),
      }))
      .mutation(async ({ input }) => {
        const results = await db.batchCreateTeachers(input.teachers);
        return { 
          success: true, 
          importedCount: results.length,
          teachers: results,
        };
      }),

    // 获取所有老师名字(用于验证)
    getAllTeacherNames: protectedProcedure.query(async () => {
      return db.getAllTeacherNames();
    }),

    // 获取单个老师统计数据
    getStats: protectedProcedure
      .input(z.object({
        teacherId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        return db.getTeacherStats(input.teacherId, input.startDate, input.endDate);
      }),

    // 获取所有老师统计数据
    getAllStats: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAllTeachersStats(input?.startDate, input?.endDate);
      }),
  }),

  // 课程排课
  schedules: router({
    list: protectedProcedure
      .input(z.object({
        startTime: z.date().optional(),
        endTime: z.date().optional(),
      }).optional())
      .query(async ({ input }) => {
        if (input?.startTime && input?.endTime) {
          return db.getSchedulesByDateRange(input.startTime, input.endTime);
        }
        // 如果没有提供时间范围,返回最近一个月的排课
        const now = new Date();
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return db.getSchedulesByDateRange(oneMonthAgo, now);
      }),
    
    listWithOrderInfo: protectedProcedure
      .query(async () => {
        return db.getSchedulesWithOrderInfo();
      }),
    
    getByTeacher: protectedProcedure
      .input(z.object({ teacherId: z.number() }))
      .query(async ({ input }) => {
        return db.getSchedulesByTeacher(input.teacherId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        orderId: z.number().optional(),
        // 客户信息
        customerName: z.string(),
        wechatId: z.string().optional(),
        // 销售信息
        salesName: z.string().optional(),
        trafficSource: z.string().optional(),
        // 支付信息
        paymentAmount: z.string().optional(),
        courseAmount: z.string().optional(),
        accountBalance: z.string().optional(),
        paymentCity: z.string().optional(),
        channelOrderNo: z.string().optional(),
        overflowOrderNo: z.string().optional(),
        refundNo: z.string().optional(),
        paymentDate: z.date().optional(),
        paymentTime: z.string().optional(),
        // 费用信息
        teacherFee: z.string().optional(),
        transportFee: z.string().optional(),
        otherFee: z.string().optional(),
        partnerFee: z.string().optional(),
        receivedAmount: z.string().optional(), // 金串到账金额
        // 交付信息
        deliveryCity: z.string().optional(),
        deliveryClassroom: z.string().optional(),
        deliveryTeacher: z.string().optional(),
        deliveryCourse: z.string().optional(),
        // 课程信息
        teacherId: z.number().optional(),
        teacherName: z.string().optional(),
        courseType: z.string(),
        classDate: z.date().optional(),
        classTime: z.string().optional(),
        startTime: z.date(),
        endTime: z.date(),
        city: z.string().optional(),
        location: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createSchedule(input);
        return { id, success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSchedule(input.id);
        return { success: true };
      }),
    
    // 月度合伙人费用统计
    getMonthlyPartnerSettlement: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ input }) => {
        const { getMonthlyPartnerSettlement } = await import("./partnerSettlement");
        return getMonthlyPartnerSettlement(input.year, input.month);
      }),
    
    // 按日期范围统计合伙人费用
    getPartnerSettlementByDateRange: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        const { getPartnerSettlementByDateRange } = await import("./partnerSettlement");
        return getPartnerSettlementByDateRange(input.startDate, input.endDate);
      }),
  }),

  // 老师费用结算
  teacherPayments: router({
    list: financeOrAdminProcedure.query(async () => {
      return db.getTeacherPaymentsByTeacher(0); // TODO: 需要修改为获取所有
    }),
    
    getByTeacher: financeOrAdminProcedure
      .input(z.object({ teacherId: z.number() }))
      .query(async ({ input }) => {
        return db.getTeacherPaymentsByTeacher(input.teacherId);
      }),
    
    create: financeOrAdminProcedure
      .input(z.object({
        teacherId: z.number(),
        orderId: z.number().optional(),
        scheduleId: z.number().optional(),
        amount: z.string(),
        paymentMethod: z.enum(["wechat", "alipay", "bank", "cash", "other"]).optional(),
        transactionNo: z.string().optional(),
        paymentTime: z.date().optional(),
        status: z.enum(["pending", "paid"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createTeacherPayment({
          ...input,
          recordedBy: ctx.user.id,
        });
        return { id, success: true };
      }),
    
    updateStatus: financeOrAdminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "paid"]),
        paymentTime: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateTeacherPaymentStatus(input.id, input.status, input.paymentTime);
        return { success: true };
      }),
  }),

  // 财务对账
  reconciliations: router({
    list: financeOrAdminProcedure.query(async () => {
      return db.getAllReconciliations();
    }),
    
    create: financeOrAdminProcedure
      .input(z.object({
        periodStart: z.string(),
        periodEnd: z.string(),
        totalIncome: z.string(),
        totalExpense: z.string(),
        teacherFeeTotal: z.string().optional(),
        transportFeeTotal: z.string().optional(),
        otherFeeTotal: z.string().optional(),
        partnerFeeTotal: z.string().optional(),
        profit: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createReconciliation({
          periodStart: new Date(input.periodStart),
          periodEnd: new Date(input.periodEnd),
          totalIncome: input.totalIncome,
          totalExpense: input.totalExpense,
          teacherFeeTotal: input.teacherFeeTotal,
          transportFeeTotal: input.transportFeeTotal,
          otherFeeTotal: input.otherFeeTotal,
          partnerFeeTotal: input.partnerFeeTotal,
          profit: input.profit,
          notes: input.notes,
          createdBy: ctx.user.id,
        });
        return { id, success: true };
      }),
    
    update: financeOrAdminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          status: z.enum(["draft", "confirmed"]).optional(),
          notes: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateReconciliation(input.id, input.data);
        return { success: true };
      }),
  }),

  // 数据统计分析
  analytics: router({
    orderStats: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return db.getOrderStatsByDateRange(input.startDate, input.endDate);
      }),
    
    cityRevenue: protectedProcedure.query(async () => {
      return db.getCityRevenue();
    }),
        cityRevenueTrend: publicProcedure
      .query(async () => {
        return db.getCityRevenueTrend();
      }),
    
    teacherMonthlyStats: publicProcedure
      .query(async () => {
        return db.getTeacherMonthlyStats();
      }),
    
    trafficSourceMonthlyStats: publicProcedure
      .query(async () => {
        return db.getTrafficSourceMonthlyStats();
      }),
    
    trafficSourceAnalysis: publicProcedure
      .query(async () => {
        return db.getTrafficSourceAnalysis();
      }),
    
    salesPersonPaymentStats: publicProcedure
      .query(async () => {
        return db.getSalesPersonPaymentStats();
      }),
    
    customerBalanceRanking: publicProcedure
      .query(async () => {
        return db.getCustomerBalanceRanking();
      }),
    
    cityFinancialStats: protectedProcedure
      .input(z.object({
        dateRange: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getCityFinancialStats(input?.dateRange);
      }),   customerStats: protectedProcedure.query(async () => {
      return db.getCustomerStats();
    }),
    
    churnRiskCustomers: protectedProcedure.query(async () => {
      return db.getChurnRiskCustomers();
    }),
    
    inactiveCustomers: protectedProcedure
      .input(z.object({ days: z.number().default(30) }))
      .query(async ({ input }) => {
        return db.getInactiveCustomers(input.days);
      }),
    
    // 城市合伙人费配置
    getAllCityPartnerConfig: protectedProcedure
      .query(async () => {
        return db.getAllCityPartnerConfig();
      }),
    
    updateCityPartnerConfig: adminProcedure
      .input(z.object({
        id: z.number(),
        areaCode: z.string().optional(),
        partnerFeeRate: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateCityPartnerConfig(id, data, ctx.user.id);
        return { success: true };
      }),
    
    // 城市管理
    getAllCitiesWithStats: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const options = input ? {
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        } : undefined;
        return db.getAllCitiesWithStats(options);
      }),
    
    createCityConfig: adminProcedure
      .input(z.object({
        city: z.string(),
        areaCode: z.string().optional(),
        partnerFeeRate: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createCityConfig(input, ctx.user.id);
        return { success: true };
      }),
    
    deleteCityConfig: adminProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteCityConfig(input.id);
        return { success: true };
      }),
    
    // 城市智能推荐
    recommendCity: protectedProcedure
      .input(z.object({
        customerName: z.string().optional(),
        salesPersonName: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return recommendCity(input.customerName, input.salesPersonName);
      }),
    
    getRecommendedCity: protectedProcedure
      .input(z.object({
        customerName: z.string().optional(),
        salesPersonName: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return getRecommendedCity(input.customerName, input.salesPersonName);
      }),
    
    calculatePartnerFee: protectedProcedure
      .input(z.object({
        city: z.string().nullable(),
        courseAmount: z.number(),
        teacherFee: z.number(),
      }))
      .query(async ({ input }) => {
        const partnerFee = await db.calculatePartnerFee(
          input.city,
          input.courseAmount,
          input.teacherFee
        );
        return { partnerFee };
      }),
    
    // 批量重新计算合伙人费(针对选中的订单)
    batchCalculatePartnerFee: protectedProcedure
      .input(z.object({
        orderIds: z.array(z.number())
      }))
      .mutation(async ({ input, ctx }) => {
        const { orderIds } = input;
        
        let updatedCount = 0;
        let unchangedCount = 0;
        let errorCount = 0;
        const updates: any[] = [];
        const errorMessages: string[] = [];
        
        for (const orderId of orderIds) {
          try {
            // 获取订单信息
            const order = await db.getOrderById(orderId);
            if (!order) {
              errorCount++;
              errorMessages.push(`订单ID ${orderId} 不存在`);
              continue;
            }
            
            // 跳过没有必要字段的订单
            if (!order.deliveryCity || !order.courseAmount || order.teacherFee === null) {
              unchangedCount++;
              continue;
            }
            
            const courseAmount = parseFloat(order.courseAmount);
            const teacherFee = parseFloat(order.teacherFee || "0");
            
            // 计算新的合伙人费
            const newPartnerFee = await db.calculatePartnerFee(
              order.deliveryCity,
              courseAmount,
              teacherFee
            );
            
            const oldPartnerFee = parseFloat(order.partnerFee || "0");
            
            // 如果合伙人费有变化，记录更新
            if (Math.abs(newPartnerFee - oldPartnerFee) > 0.01) {
              updates.push({
                orderId: order.id,
                orderNo: order.orderNo,
                customerName: order.customerName,
                deliveryCity: order.deliveryCity,
                courseAmount: courseAmount,
                teacherFee: teacherFee,
                oldPartnerFee: oldPartnerFee,
                newPartnerFee: newPartnerFee,
              });
              
              // 更新数据库
              await db.updateOrder(order.id, {
                partnerFee: newPartnerFee.toString()
              });
              
              updatedCount++;
            } else {
              unchangedCount++;
            }
          } catch (error) {
            console.error(`处理订单 ${orderId} 时出错:`, error);
            errorCount++;
            errorMessages.push(`订单ID ${orderId}: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        }
        
        // 记录审计日志
        try {
          await db.createAuditLog({
            operationType: "batch_calculate_partner_fee",
            operationDescription: `批量重新计算合伙人费: 共${orderIds.length}个订单, 更新${updatedCount}个, 未变${unchangedCount}个, 失败${errorCount}个`,
            operatorId: ctx.user.id,
            operatorName: ctx.user.name || ctx.user.nickname || "未知",
            affectedCount: updatedCount,
            details: {
              orderIds,
              updates,
              errorMessages,
            },
            status: errorCount > 0 ? (updatedCount > 0 ? "partial" : "failed") : "success",
            errorMessage: errorMessages.length > 0 ? errorMessages.join("; ") : undefined,
          });
        } catch (auditError) {
          console.error("记录审计日志失败:", auditError);
        }
        
        return {
          success: true,
          totalOrders: orderIds.length,
          updatedCount,
          unchangedCount,
          errorCount,
          updates,
          errorMessages,
        };
      }),
    
    recalculateAllPartnerFees: adminProcedure
      .mutation(async () => {
        // 查询所有需要重算的订单
        const allOrders = await db.getAllOrders();
        
        let updatedCount = 0;
        let unchangedCount = 0;
        let errorCount = 0;
        const updates: any[] = [];
        
        for (const order of allOrders) {
          try {
            // 跳过没有必要字段的订单
            if (!order.deliveryCity || !order.courseAmount || order.teacherFee === null) {
              continue;
            }
            
            const courseAmount = parseFloat(order.courseAmount);
            const teacherFee = parseFloat(order.teacherFee || "0");
            
            // 计算新的合伙人费
            const newPartnerFee = await db.calculatePartnerFee(
              order.deliveryCity,
              courseAmount,
              teacherFee
            );
            
            const oldPartnerFee = parseFloat(order.partnerFee || "0");
            
            // 如果合伙人费有变化，记录更新
            if (Math.abs(newPartnerFee - oldPartnerFee) > 0.01) {
              updates.push({
                orderNo: order.orderNo,
                customerName: order.customerName,
                deliveryCity: order.deliveryCity,
                courseAmount: courseAmount,
                teacherFee: teacherFee,
                oldPartnerFee: oldPartnerFee,
                newPartnerFee: newPartnerFee,
              });
              
              // 更新数据库
              await db.updateOrder(order.id, {
                partnerFee: newPartnerFee.toString()
              });
              
              updatedCount++;
            } else {
              unchangedCount++;
            }
          } catch (error) {
            console.error(`处理订单 ${order.orderNo} 时出错:`, error);
            errorCount++;
          }
        }
        
        return {
          success: true,
          totalOrders: allOrders.length,
          updatedCount,
          unchangedCount,
          errorCount,
          updates,
        };
      }),
  }),

  // 数据导入
  import: importRouter,

  // 元数据查询 - 为前端APP提供基础数据列表
  metadata: router({
    // 获取所有唯一城市列表
    getCities: protectedProcedure.query(async () => {
      try {
        const cities = await db.getUniqueCities();
        return {
          success: true,
          data: cities,
          count: cities.length,
        };
      } catch (error) {
        console.error("获取城市列表失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "获取城市列表失败",
        });
      }
    }),

    // 获取所有唯一课程类型列表
    getCourses: protectedProcedure.query(async () => {
      try {
        const courses = await db.getUniqueCourses();
        return {
          success: true,
          data: courses,
          count: courses.length,
        };
      } catch (error) {
        console.error("获取课程列表失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "获取课程列表失败",
        });
      }
    }),

    // 获取所有唯一教室列表
    getClassrooms: protectedProcedure.query(async () => {
      try {
        const classrooms = await db.getUniqueClassrooms();
        return {
          success: true,
          data: classrooms,
          count: classrooms.length,
        };
      } catch (error) {
        console.error("获取教室列表失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "获取教室列表失败",
        });
      }
    }),

    // 获取所有唯一老师名称列表
    getTeacherNames: protectedProcedure.query(async () => {
      try {
        const teacherNames = await db.getUniqueTeacherNames();
        return {
          success: true,
          data: teacherNames,
          count: teacherNames.length,
        };
      } catch (error) {
        console.error("获取老师名称列表失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "获取老师名称列表失败",
        });
      }
    }),

    // 获取所有销售人员列表
    getSalespeople: protectedProcedure.query(async () => {
      try {
        const salespeople = await db.getAllSalespersons();
        return {
          success: true,
          data: salespeople,
          count: salespeople.length,
        };
      } catch (error) {
        console.error("获取销售人员列表失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "获取销售人员列表失败",
        });
      }
    }),

    // 获取所有唯一老师分类列表(S、M、SW等)
    getTeacherCategories: protectedProcedure.query(async () => {
      try {
        const categories = await db.getUniqueTeacherCategories();
        return {
          success: true,
          data: categories,
          count: categories.length,
        };
      } catch (error) {
        console.error("获取老师分类列表失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "获取老师分类列表失败",
        });
      }
    }),

    // 获取所有唯一课程价格列表
    getCourseAmounts: protectedProcedure.query(async () => {
      try {
        const amounts = await db.getUniqueCourseAmounts();
        return {
          success: true,
          data: amounts,
          count: amounts.length,
        };
      } catch (error) {
        console.error("获取课程价格列表失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "获取课程价格列表失败",
        });
      }
    }),

    // 获取所有元数据(一次性获取所有基础数据)
    getAll: protectedProcedure.query(async () => {
      try {
        const [cities, courses, classrooms, teacherNames, salespeople, teacherCategories, courseAmounts] = await Promise.all([
          db.getUniqueCities(),
          db.getUniqueCourses(),
          db.getUniqueClassrooms(),
          db.getUniqueTeacherNames(),
          db.getAllSalespersons(),
          db.getUniqueTeacherCategories(),
          db.getUniqueCourseAmounts(),
        ]);

        return {
          success: true,
          data: {
            cities,
            courses,
            classrooms,
            teacherNames,
            salespeople,
            teacherCategories,
            courseAmounts,
          },
          counts: {
            cities: cities.length,
            courses: courses.length,
            classrooms: classrooms.length,
            teacherNames: teacherNames.length,
            salespeople: salespeople.length,
            teacherCategories: teacherCategories.length,
            courseAmounts: courseAmounts.length,
          },
        };
      } catch (error) {
        console.error("获取元数据失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "获取元数据失败",
        });
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
