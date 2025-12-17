import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { importRouter } from "./importRouter";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { generateOrderNo } from "./orderNoGenerator";

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
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
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

  // 客户管理
  customers: router({
    list: protectedProcedure.query(async () => {
      return db.getAllCustomers();
    }),
    
    search: protectedProcedure
      .input(z.object({ keyword: z.string() }))
      .query(async ({ input }) => {
        return db.searchCustomers(input.keyword);
      }),
    
    create: salesOrAdminProcedure
      .input(z.object({
        name: z.string(),
        wechatId: z.string().optional(),
        phone: z.string().optional(),
        trafficSource: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createCustomer({
          ...input,
          createdBy: ctx.user.id,
        });
        return { id, success: true };
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getCustomerById(input.id);
      }),
    
    update: salesOrAdminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        wechatId: z.string().optional(),
        phone: z.string().optional(),
        trafficSource: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCustomer(id, data);
        return { success: true };
      }),
    
    delete: salesOrAdminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCustomer(input.id);
        return { success: true };
      }),
    
    // 获取客户账户流水
    getTransactions: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ input }) => {
        return db.getCustomerTransactions(input.customerId);
      }),
    
    // 客户充值
    recharge: salesOrAdminProcedure
      .input(z.object({
        customerId: z.number(),
        amount: z.number().positive(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.rechargeCustomerAccount({
          customerId: input.customerId,
          amount: input.amount,
          notes: input.notes,
          operatorId: ctx.user.id,
          operatorName: ctx.user.name || ctx.user.nickname || "未知",
        });
        return { success: true, ...result };
      }),
  }),

  // 订单管理
  orders: router({
    list: protectedProcedure.query(async ({ ctx }) => {
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
        customerName: z.string(),
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
        
        const orderData: any = {
          orderNo,
          customerId: input.customerId || undefined,
          customerName: input.customerName,
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
          partnerFee: input.partnerFee || undefined,
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
          customerName: z.string(),
          deliveryTeacher: z.string().optional(),
          deliveryCourse: z.string().optional(),
          deliveryCity: z.string().optional(),
          deliveryRoom: z.string().optional(),
          classDate: z.string().optional(),
          classTime: z.string().optional(),
          paymentAmount: z.string(),
          courseAmount: z.string().optional(),
          teacherFee: z.string().optional(),
          notes: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        let successCount = 0;
        let failCount = 0;
        
        for (const orderData of input.orders) {
          try {
            // 生成订单号
            const orderNo = `ORD${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
            
            // 辅助函数:过滤无效值
            const filterValue = (val: string | undefined) => {
              if (!val || val === "?" || val.trim() === "") return undefined;
              return val;
            };
            
            await db.createOrder({
              orderNo,
              customerName: orderData.customerName,
              salesId: ctx.user.id, // 使用当前用户作为销售人
              deliveryTeacher: filterValue(orderData.deliveryTeacher),
              deliveryCourse: filterValue(orderData.deliveryCourse),
              deliveryCity: filterValue(orderData.deliveryCity),
              deliveryRoom: filterValue(orderData.deliveryRoom),
              classDate: orderData.classDate ? new Date(orderData.classDate) : undefined,
              classTime: filterValue(orderData.classTime),
              paymentAmount: orderData.paymentAmount,
              courseAmount: orderData.courseAmount || orderData.paymentAmount,
              teacherFee: filterValue(orderData.teacherFee),
              notes: filterValue(orderData.notes),
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
        const processedData: any = { ...updateData };
        if (updateData.paymentDate) {
          processedData.paymentDate = new Date(updateData.paymentDate);
        }
        if (updateData.classDate) {
          processedData.classDate = new Date(updateData.classDate);
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
    
    
    getByDateRange: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return db.getOrdersByDateRange(input.startDate, input.endDate);
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
        nickname: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        wechat: z.string().optional(),
        hourlyRate: z.string().optional(),
        bankAccount: z.string().optional(),
        bankName: z.string().optional(),
        city: z.string().optional(),
        notes: z.string().optional(),
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
          nickname: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          wechat: z.string().optional(),
          hourlyRate: z.string().optional(),
          bankAccount: z.string().optional(),
          bankName: z.string().optional(),
          city: z.string().optional(),
          isActive: z.boolean().optional(),
          notes: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateTeacher(input.id, input.data);
        return { success: true };
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
    
    salesPerformance: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return db.getSalesPerformance(input.startDate, input.endDate);
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
    
    salesPersonPaymentStats: publicProcedure
      .query(async () => {
        return db.getSalesPersonPaymentStats();
      }),
    
    customerBalanceRanking: publicProcedure
      .query(async () => {
        return db.getCustomerBalanceRanking();
      }),   customerStats: protectedProcedure.query(async () => {
      return db.getCustomerStats();
    }),
    
    churnRiskCustomers: protectedProcedure.query(async () => {
      return db.getChurnRiskCustomers();
    }),
  }),

  // 数据导入
  import: importRouter,
});

export type AppRouter = typeof appRouter;
