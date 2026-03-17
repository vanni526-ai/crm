import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { acceptCourse, getCourseById, getCourses } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import api from "../lib/sdk/api.js";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    login: publicProcedure
      .input(
        z.object({
          username: z.string(),
          password: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          console.log('[Auth] Attempting login with username:', input.username);
          
          // 调用 CRM 系统的登录 API
          const CRM_API_URL = 'https://crm.bdsm.com.cn/api/trpc';
          const url = `${CRM_API_URL}/auth.login`;
          console.log('[Auth] Calling CRM login API...');
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            body: JSON.stringify({ json: input }),
          });
          
          console.log('[Auth] CRM response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('[Auth] CRM error response:', errorText);
            throw new Error(`CRM login failed: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('[Auth] CRM response:', JSON.stringify(data).substring(0, 200));
          
          // 解析 tRPC 响应
          const result = data?.result?.data?.json;
          
          if (!result?.success || !result?.user) {
            console.error('[Auth] Login failed:', result?.message || 'Unknown error');
            throw new Error(result?.message || 'Login failed');
          }
          
          console.log('[Auth] Login successful for user:', result.user.id);
          
          // 设置 session cookie
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, result.token, { ...cookieOptions });
          
          return {
            success: true,
            token: result.token,
            user: result.user,
          };
        } catch (error: any) {
          console.error('[Auth] Login error:', error.message);
          throw new Error(error.message || 'Login failed');
        }
      }),
  }),

  /**
   * 订单管理API（代理到外部CRM系统）
   */
  orders: router({    /**
     * 更新订单支付状态
     */
    updateStatus: protectedProcedure
      .input(
        z.object({
          orderId: z.number(),
          status: z.enum(["pending", "paid", "completed", "cancelled", "refunded"]),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // 调用外部CRM系统的API更新订单状态
        // 注意：这需要外部CRM系统提供相应的API接口
        // 当前作为占位实现，实际需要调用外部API
        console.log(`[Orders] Updating order ${input.orderId} status to ${input.status}`);
        
        // TODO: 实际调用外部CRM API
        // await api.orders.update({ id: input.orderId, status: input.status });
        
        return { success: true };
      }),

    /**
     * 更新订单交付状态（老师接单）
     */
    updateDeliveryStatus: protectedProcedure
      .input(
        z.object({
          orderId: z.number(),
          deliveryStatus: z.enum(["pending", "accepted", "delivered"]),
          acceptedBy: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        console.log(`[Orders] Updating order ${input.orderId} delivery status to ${input.deliveryStatus}`);
        
        // TODO: 实际调用外部CRM API
        // await api.orders.updateDeliveryStatus(input);
        
        return { success: true };
      }),
  }),

  /**
   * 城市账单API（代理到外部CRM系统）
   */
  cityExpense: router({
    /**
     * 获取城市月度费用账单列表
     */
    list: publicProcedure
      .input(
        z.object({
          cityId: z.number().optional(),
          month: z.string().optional(),
          startMonth: z.string().optional(),
          endMonth: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        try {
          console.log('[CityExpense] Fetching bills with params:', input);
          console.log('[CityExpense] User:', ctx.user);
          console.log('[CityExpense] Request headers:', ctx.req.headers.authorization);
          
          // 从请求头中获取CRM Token
          const authHeader = ctx.req.headers.authorization || ctx.req.headers.Authorization;
          let crmToken: string | undefined;
          if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            crmToken = authHeader.slice('Bearer '.length).trim();
          }
          
          if (!crmToken) {
            console.error('[CityExpense] No CRM token found in request headers');
            throw new Error('Please login (10001)');
          }
          
          console.log('[CityExpense] Using CRM token:', crmToken.substring(0, 20) + '...');
          
          // 直接调用外部CRM系统的tRPC API
          const CRM_API_URL = 'https://crm.bdsm.com.cn/api/trpc';
          const params = new URLSearchParams();
          params.set('input', JSON.stringify({ json: input }));
          // 根据对接文档，Token通过URL参数传递
          params.set('token', crmToken);
          
          const url = `${CRM_API_URL}/cityExpense.list?${params.toString()}`;
          console.log('[CityExpense] Request URL:', url.replace(crmToken, crmToken.substring(0, 20) + '...'));
          
          const response = await fetch(url, {
            method: 'GET',  // query procedure使用GET请求
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          console.log('[CityExpense] Response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('[CityExpense] Error response:', errorText);
            throw new Error(`API request failed: ${response.status} ${errorText}`);
          }
          
          const data = await response.json();
          console.log('[CityExpense] Response data:', JSON.stringify(data).substring(0, 200));
          
          // tRPC响应格式: { result: { data: { json: [...] } } }
          const result = data?.result?.data?.json || data?.result?.data || [];
          console.log('[CityExpense] Fetched', result?.length || 0, 'bills');
          
          return result;
        } catch (error: any) {
          console.error('[CityExpense] Failed to fetch bills:', error);
          console.error('[CityExpense] Error details:', error.message, error.stack);
          throw error;
        }
      }),

    /**
     * 获取单个费用账单详情
     */
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        try {
          // 从请求头中获取CRM Token
          const authHeader = ctx.req.headers.authorization || ctx.req.headers.Authorization;
          let crmToken: string | undefined;
          if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            crmToken = authHeader.slice('Bearer '.length).trim();
          }
          
          if (!crmToken) {
            throw new Error('Please login (10001)');
          }
          
          const CRM_API_URL = 'https://crm.bdsm.com.cn/api/trpc';
          const params = new URLSearchParams();
          params.set('input', JSON.stringify({ json: { id: input.id } }));
          // 根据对接文档，Token通过URL参数传递
          params.set('token', crmToken);
          
          const url = `${CRM_API_URL}/cityExpense.getById?${params.toString()}`;
          
          const response = await fetch(url, {
            method: 'GET',  // query procedure使用GET请求
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
          }
          
          const data = await response.json();
          return data?.result?.data?.json || data?.result?.data || null;
        } catch (error) {
          console.error('[CityExpense] Failed to fetch bill detail:', error);
          throw error;
        }
      }),
  }),

  /**
   * 合伙人管理API（代理到外部CRM系统）
   */
  partnerManagement: router({
    /**
     * 通过userId获取partnerId
     */
    getPartnerIdByUserId: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        try {
          console.log('[PartnerManagement] Getting partnerId for userId:', input.userId);
          
          // 从请求头中获取CRM Token
          const authHeader = ctx.req.headers.authorization || ctx.req.headers.Authorization;
          let crmToken: string | undefined;
          if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            crmToken = authHeader.slice('Bearer '.length).trim();
          }
          
          if (!crmToken) {
            throw new Error('Please login (10001)');
          }
          
          const CRM_API_URL = 'https://crm.bdsm.com.cn/api/trpc';
          const params = new URLSearchParams();
          params.set('input', JSON.stringify({ json: input }));
          params.set('token', crmToken);
          
          const url = `${CRM_API_URL}/partnerManagement.getPartnerIdByUserId?${params.toString()}`;
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
          }
          
          const data = await response.json();
          const result = data?.result?.data?.json;
          console.log('[PartnerManagement] Got partnerId:', result?.partnerId);
          return result;
        } catch (error) {
          console.error('[PartnerManagement] Failed to get partnerId:', error);
          throw error;
        }
      }),

    /**
     * 通过partnerId获取管理的城市列表
     */
    getPartnerCities: publicProcedure
      .input(z.object({ partnerId: z.number() }))
      .query(async ({ ctx, input }) => {
        try {
          console.log('[PartnerManagement] Getting cities for partnerId:', input.partnerId);
          
          // 从请求头中获取CRM Token
          const authHeader = ctx.req.headers.authorization || ctx.req.headers.Authorization;
          let crmToken: string | undefined;
          if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            crmToken = authHeader.slice('Bearer '.length).trim();
          }
          
          if (!crmToken) {
            throw new Error('Please login (10001)');
          }
          
          const CRM_API_URL = 'https://crm.bdsm.com.cn/api/trpc';
          const params = new URLSearchParams();
          params.set('input', JSON.stringify({ json: input }));
          params.set('token', crmToken);
          
          const url = `${CRM_API_URL}/partnerManagement.getPartnerCities?${params.toString()}`;
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
          }
          
          const data = await response.json();
          const result = data?.result?.data?.json;
          console.log('[PartnerManagement] Got cities:', result);
          return result;
        } catch (error) {
          console.error('[PartnerManagement] Failed to get partner cities:', error);
          throw error;
        }
      }),

    /**
     * 获取城市费用承担配置
     */
    getCityExpenseCoverage: publicProcedure
      .input(z.object({ partnerId: z.number(), cityId: z.number() }))
      .query(async ({ ctx, input }) => {
        try {
          console.log('[PartnerManagement] Getting expense coverage for partnerId:', input.partnerId, 'cityId:', input.cityId);
          
          // 从请求头中获取CRM Token
          const authHeader = ctx.req.headers.authorization || ctx.req.headers.Authorization;
          let crmToken: string | undefined;
          if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            crmToken = authHeader.slice('Bearer '.length).trim();
          }
          
          if (!crmToken) {
            throw new Error('Please login (10001)');
          }
          
          const CRM_API_URL = 'https://crm.bdsm.com.cn/api/trpc';
          const params = new URLSearchParams();
          params.set('input', JSON.stringify({ json: input }));
          params.set('token', crmToken);
          
          const url = `${CRM_API_URL}/partnerManagement.getCityExpenseCoverage?${params.toString()}`;
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
          }
          
          const data = await response.json();
          const result = data?.result?.data?.json;
          console.log('[PartnerManagement] Got expense coverage:', result);
          return result;
        } catch (error) {
          console.error('[PartnerManagement] Failed to get expense coverage:', error);
          throw error;
        }
      }),
  }),

  courses: router({
    list: publicProcedure.query(() => getCourses()),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getCourseById(input.id)),
    accept: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => acceptCourse(input.id)),
  }),
});

export type AppRouter = typeof appRouter;
