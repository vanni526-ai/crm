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
    
    create: salesOrAdminProcedure
      .input(z.object({
        orderNo: z.string().optional(),
        customerName: z.string(),
        salesPerson: z.string().optional(),
        trafficSource: z.string().optional(),
        paymentAmount: z.string(),
        courseAmount: z.string(),
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
        
        const orderData: any = {
          ...input,
          orderNo,
          salesId: ctx.user.id,
        };
        if (input.paymentDate) {
          orderData.paymentDate = new Date(input.paymentDate);
        }
        if (input.classDate) {
          orderData.classDate = new Date(input.classDate);
        }
        const id = await db.createOrder(orderData);
        return { id, success: true };
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
    
    cityRevenueTrend: protectedProcedure.query(async () => {
      return db.getCityRevenueTrend();
    }),
    
    customerStats: protectedProcedure.query(async () => {
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
