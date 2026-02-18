import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { orders } from "../drizzle/schema";
import { eq, isNotNull, ne } from "drizzle-orm";
import { standardizeClassroom } from "./classroomMappingRules";
import { standardizeTeacherName } from "./teacherMappingRules";
import { standardizeCityName } from "./cityMappingRules";
import { TRPCError } from "@trpc/server";

/**
 * 数据清洗路由
 * 用于扫描和修复历史订单中不符合标准的教室、老师和城市名称
 */
export const dataCleaningRouter = router({
  /**
   * 扫描需要清洗的订单
   * 返回所有deliveryRoom、deliveryTeacher、deliveryCity字段不符合标准的订单列表
   */
  scanOrders: protectedProcedure.query(async () => {
    const database = await getDb();
    if (!database) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "数据库连接失败",
      });
    }
    
    // 查询所有订单（不限制条件，扫描所有字段）
    const allOrders = await database
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        deliveryCity: orders.deliveryCity,
        deliveryRoom: orders.deliveryRoom,
        deliveryTeacher: orders.deliveryTeacher,
        classDate: orders.classDate,
        customerName: orders.customerName,
      })
      .from(orders)
      .orderBy(orders.id);

    // 筛选需要清洗的订单
    const ordersToClean: Array<{
      id: number;
      orderNo: string;
      originalCity: string | null;
      originalRoom: string | null;
      originalTeacher: string | null;
      standardizedCity: string | null;
      standardizedRoom: string | null;
      standardizedTeacher: string | null;
      classDate: Date | string | null;
      customerName: string | null;
    }> = [];

    for (const order of allOrders) {
      let needsCleaning = false;
      let standardizedCity: string | null = order.deliveryCity;
      let standardizedRoom: string | null = order.deliveryRoom;
      let standardizedTeacher: string | null = order.deliveryTeacher;

      // 1. 标准化教室名称
      if (order.deliveryRoom) {
        const classroomStandardized = standardizeClassroom(
          order.deliveryRoom,
          order.deliveryCity || undefined
        );
        if (classroomStandardized) {
          if (
            classroomStandardized.classroom !== order.deliveryRoom ||
            classroomStandardized.city !== order.deliveryCity
          ) {
            needsCleaning = true;
            standardizedCity = classroomStandardized.city;
            standardizedRoom = classroomStandardized.classroom;
          }
        }
      }

      // 2. 标准化老师名称
      if (order.deliveryTeacher) {
        const teacherStandardized = await standardizeTeacherName(order.deliveryTeacher);
        if (teacherStandardized && teacherStandardized !== order.deliveryTeacher) {
          needsCleaning = true;
          standardizedTeacher = teacherStandardized;
        }
      }

      // 3. 标准化城市名称
      if (standardizedCity) {
        const cityStandardized = await standardizeCityName(standardizedCity);
        if (cityStandardized && cityStandardized !== standardizedCity) {
          needsCleaning = true;
          standardizedCity = cityStandardized;
        }
      }

      // 如果任何字段需要清洗，添加到列表
      if (needsCleaning) {
        ordersToClean.push({
          id: order.id,
          orderNo: order.orderNo || `ORD${order.id}`,
          originalCity: order.deliveryCity,
          originalRoom: order.deliveryRoom,
          originalTeacher: order.deliveryTeacher,
          standardizedCity,
          standardizedRoom,
          standardizedTeacher,
          classDate: order.classDate,
          customerName: order.customerName,
        });
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
              deliveryTeacher: orders.deliveryTeacher,
            })
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1);

          if (!order) {
            failCount++;
            errors.push({ orderId, error: "订单不存在" });
            continue;
          }

          // 准备更新数据
          const updateData: Partial<{
            deliveryCity: string;
            deliveryRoom: string;
            deliveryTeacher: string;
            updatedAt: Date;
          }> = {};

          // 1. 标准化教室名称
          if (order.deliveryRoom) {
            const classroomStandardized = standardizeClassroom(
              order.deliveryRoom,
              order.deliveryCity || undefined
            );
            if (classroomStandardized) {
              if (
                classroomStandardized.classroom !== order.deliveryRoom ||
                classroomStandardized.city !== order.deliveryCity
              ) {
                updateData.deliveryCity = classroomStandardized.city;
                updateData.deliveryRoom = classroomStandardized.classroom;
              }
            }
          }

          // 2. 标准化老师名称
          if (order.deliveryTeacher) {
            const teacherStandardized = await standardizeTeacherName(order.deliveryTeacher);
            if (teacherStandardized && teacherStandardized !== order.deliveryTeacher) {
              updateData.deliveryTeacher = teacherStandardized;
            }
          }

          // 3. 标准化城市名称
          if (updateData.deliveryCity) {
            const cityStandardized = await standardizeCityName(updateData.deliveryCity);
            if (cityStandardized && cityStandardized !== updateData.deliveryCity) {
              updateData.deliveryCity = cityStandardized;
            }
          }

          // 如果没有需要更新的字段，跳过
          if (Object.keys(updateData).length === 0) {
            failCount++;
            errors.push({ orderId, error: "没有需要清洗的字段" });
            continue;
          }

          // 更新订单
          updateData.updatedAt = new Date();
          await database
            .update(orders)
            .set(updateData)
            .where(eq(orders.id, orderId));

          successCount++;
          console.log(
            `[数据清洗] 订单${orderId} 清洗成功:`,
            updateData
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
