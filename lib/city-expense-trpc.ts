import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";

/**
 * 城市账单API的类型定义
 * 基于后端提供的接口文档
 */
export type CityExpenseRouter = {
  cityExpense: {
    list: {
      query: (input?: {
        cityId?: number;
        month?: string;
        startMonth?: string;
        endMonth?: string;
      }) => Promise<Array<{
        id: number;
        cityId: number;
        cityName: string;
        month: string;
        rentFee: string;
        propertyFee: string;
        utilityFee: string;
        consumablesFee: string;
        cleaningFee: string;
        phoneFee: string;
        deferredPayment: string;
        expressFee: string;
        promotionFee: string;
        otherFee: string;
        teacherFee: string;
        transportFee: string;
        totalExpense: string;
        partnerShare: string;
        salesAmount: string;
        orderCount: number;
        partnerDividend: string;
        costShareRatio: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>>;
    };
    getById: {
      query: (input: { id: number }) => Promise<{
        id: number;
        cityId: number;
        cityName: string;
        month: string;
        rentFee: string;
        propertyFee: string;
        utilityFee: string;
        consumablesFee: string;
        cleaningFee: string;
        phoneFee: string;
        deferredPayment: string;
        expressFee: string;
        promotionFee: string;
        otherFee: string;
        teacherFee: string;
        transportFee: string;
        totalExpense: string;
        partnerShare: string;
        notes: string | null;
        uploadedBy: number;
        createdAt: Date;
        updatedAt: Date;
      }>;
    };
    getByCityAndMonth: {
      query: (input: {
        cityId: number;
        month: string;
      }) => Promise<any | null>;
    };
    getCities: {
      query: () => Promise<Array<{
        id: number;
        name: string;
      }>>;
    };
  };
};

/**
 * 创建城市账单API的tRPC客户端
 */
// @ts-ignore - CityExpenseRouter is a custom type shape
export const cityExpenseTrpc: any = createTRPCReact<any>();

/**
 * 创建城市账单tRPC客户端实例
 */
export function createCityExpenseTRPCClient() {
  return cityExpenseTrpc.createClient({
    links: [
      httpBatchLink({
        url: "https://crm.bdsm.com.cn/api/trpc",
        transformer: superjson,
        // 使用 Session Cookie 认证
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
