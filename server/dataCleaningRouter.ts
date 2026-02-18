import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { orders } from "../drizzle/schema";
import { eq, isNotNull, ne } from "drizzle-orm";
import { standardizeClassroom } from "./classroomMappingRules";
import { TRPCError } from "@trpc/server";

/**
 * 数据清洗路由
 * 用于扫描和修复历史订单中不符合标准的教室名称
 */
export const dataCleaningRouter = router({
  /**
   * 扫描需要清洗的订单
   * 返回所有deliveryRoom字段不符合标准的订单列表
   */
  scanOrders: protectedProcedure.query(async () => {
    const database = await getDb();
    if (!database) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "数据库连接失败",
      });
    }
    
    // 查询所有有教室信息的订单
    const allOrders = await database
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        deliveryCity: orders.deliveryCity,
        deliveryRoom: orders.deliveryRoom,
        classDate: orders.classDate,
        customerName: orders.customerName,
      })
      .from(orders)
      .where(isNotNull(orders.deliveryRoom))
      .orderBy(orders.id);

    // 筛选需要清洗的订单
    const ordersToClean: Array<{
      id: number;
      orderNo: string;
      originalCity: string | null;
      originalRoom: string;
      standardizedCity: string;
      standardizedRoom: string;
      classDate: Date | string | null;
      customerName: string | null;
    }> = [];

    for (const order of allOrders) {
      if (!order.deliveryRoom) continue;

      // 尝试标准化教室名称
      const standardized = standardizeClassroom(
        order.deliveryRoom,
        order.deliveryCity || undefined
      );

      // 如果标准化后的结果与原始数据不同，则需要清洗
      if (standardized) {
        const needsCleaning =
          standardized.classroom !== order.deliveryRoom ||
          standardized.city !== order.deliveryCity;

        if (needsCleaning) {
          ordersToClean.push({
            id: order.id,
            orderNo: order.orderNo || `ORD${order.id}`,
            originalCity: order.deliveryCity,
            originalRoom: order.deliveryRoom,
            standardizedCity: standardized.city,
            standardizedRoom: standardized.classroom,
            classDate: order.classDate,
            customerName: order.customerName,
          });
        }
      }
    }

    return {
      total: ordersToClean.length,
      orders: ordersToClean,
    };
  }),

  /**
   * 批量清洗订单数据
   * 执行数据清洗并更新数据库
   */
  cleanOrders: protectedProcedure
    .input(
      z.object({
        orderIds: z.array(z.number()).min(1, "至少选择一个订单"),
      })
    )
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }
      const { orderIds } = input;

      let successCount = 0;
      let failCount = 0;
      const errors: Array<{ orderId: number; error: string }> = [];

      for (const orderId of orderIds) {
        try {
          // 查询订单
          const [order] = await database
            .select({
              id: orders.id,
              deliveryCity: orders.deliveryCity,
              deliveryRoom: orders.deliveryRoom,
            })
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1);

          if (!order) {
            failCount++;
            errors.push({ orderId, error: "订单不存在" });
            continue;
          }

          if (!order.deliveryRoom) {
            failCount++;
            errors.push({ orderId, error: "订单没有教室信息" });
            continue;
          }

          // 标准化教室名称
          const standardized = standardizeClassroom(
            order.deliveryRoom,
            order.deliveryCity || undefined
          );

          if (!standardized) {
            failCount++;
            errors.push({ orderId, error: "无法标准化教室名称" });
            continue;
          }

          // 更新订单
          await database
            .update(orders)
            .set({
              deliveryCity: standardized.city,
              deliveryRoom: standardized.classroom,
              updatedAt: new Date(),
            })
            .where(eq(orders.id, orderId));

          successCount++;
          console.log(
            `[数据清洗] 订单${orderId}: "${order.deliveryRoom}" → "${standardized.classroom}" (城市: ${standardized.city})`
          );
        } catch (error) {
          failCount++;
          errors.push({
            orderId,
            error: error instanceof Error ? error.message : "未知错误",
          });
          console.error(`[数据清洗] 订单${orderId}清洗失败:`, error);
        }
      }

      return {
        success: true,
        successCount,
        failCount,
        errors,
        message: `成功清洗${successCount}个订单${failCount > 0 ? `，失败${failCount}个` : ""}`,
      };
    }),

  /**
   * 预览单个订单的清洗结果
   */
  previewClean: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }
      const { orderId } = input;

      const [order] = await database
        .select({
          id: orders.id,
          orderNo: orders.orderNo,
          deliveryCity: orders.deliveryCity,
          deliveryRoom: orders.deliveryRoom,
        })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "订单不存在",
        });
      }

      if (!order.deliveryRoom) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "订单没有教室信息",
        });
      }

      const standardized = standardizeClassroom(
        order.deliveryRoom,
        order.deliveryCity || undefined
      );

      if (!standardized) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "无法标准化教室名称",
        });
      }

      return {
        orderId: order.id,
        orderNo: order.orderNo || `ORD${order.id}`,
        original: {
          city: order.deliveryCity,
          room: order.deliveryRoom,
        },
        standardized: {
          city: standardized.city,
          room: standardized.classroom,
        },
        needsCleaning:
          standardized.classroom !== order.deliveryRoom ||
          standardized.city !== order.deliveryCity,
      };
    }),
});
