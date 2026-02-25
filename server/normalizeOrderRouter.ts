/**
 * 订单数据规范化路由
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { orders } from "../drizzle/schema";
import { isNotNull, or, ne, isNull, eq } from "drizzle-orm";
import {
  matchTeacherNickname,
  matchCourseName,
  normalizeClassTime,
  matchClassroom
} from "./normalizeOrderData";

export const normalizeOrderRouter = router({
  /**
   * 生成数据规范化预览报告
   */
  previewNormalization: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(100) // 限制预览数量
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      
      // 查询需要规范化的订单
      const ordersToNormalize = await db
        .select({
          id: orders.id,
          orderNo: orders.orderNo,
          deliveryTeacher: orders.deliveryTeacher,
          deliveryCourse: orders.deliveryCourse,
          classTime: orders.classTime,
          deliveryRoom: orders.deliveryRoom,
          deliveryCity: orders.deliveryCity,
          deliveryClassroomId: orders.deliveryClassroomId
        })
        .from(orders)
        .where(
          or(
            isNotNull(orders.deliveryTeacher),
            isNotNull(orders.deliveryCourse),
            isNotNull(orders.classTime),
            isNotNull(orders.deliveryRoom)
          )
        )
        .limit(input.limit);
      
      // 生成规范化预览
      const preview = [];
      
      for (const order of ordersToNormalize) {
        const result: any = {
          orderId: order.id,
          orderNo: order.orderNo,
          changes: []
        };
        
        // 1. 规范化交付老师
        if (order.deliveryTeacher) {
          const teacherMatch = await matchTeacherNickname(order.deliveryTeacher);
          if (teacherMatch.matched && teacherMatch.standardName !== order.deliveryTeacher) {
            result.changes.push({
              field: 'deliveryTeacher',
              original: order.deliveryTeacher,
              normalized: teacherMatch.standardName,
              similarity: teacherMatch.similarity,
              confidence: teacherMatch.confidence
            });
          } else if (!teacherMatch.matched) {
            result.changes.push({
              field: 'deliveryTeacher',
              original: order.deliveryTeacher,
              normalized: null,
              similarity: teacherMatch.similarity,
              confidence: 'low',
              needsReview: true
            });
          }
        }
        
        // 2. 规范化交付课程
        if (order.deliveryCourse) {
          const courseMatch = await matchCourseName(order.deliveryCourse);
          if (courseMatch.matched && courseMatch.standardName !== order.deliveryCourse) {
            result.changes.push({
              field: 'deliveryCourse',
              original: order.deliveryCourse,
              normalized: courseMatch.standardName,
              similarity: courseMatch.similarity,
              confidence: courseMatch.confidence,
              duration: courseMatch.duration
            });
          } else if (!courseMatch.matched) {
            result.changes.push({
              field: 'deliveryCourse',
              original: order.deliveryCourse,
              normalized: null,
              similarity: courseMatch.similarity,
              confidence: 'low',
              needsReview: true
            });
          }
          
          // 3. 规范化上课时间（如果有课程匹配结果）
          if (order.classTime && courseMatch.duration) {
            const timeNormalize = normalizeClassTime(order.classTime, courseMatch.duration);
            if (timeNormalize.normalized && timeNormalize.standardTime !== order.classTime) {
              result.changes.push({
                field: 'classTime',
                original: order.classTime,
                normalized: timeNormalize.standardTime,
                confidence: timeNormalize.confidence
              });
            }
          }
        }
        
        // 4. 规范化交付教室
        if (order.deliveryRoom) {
          const classroomMatch = await matchClassroom(order.deliveryRoom, order.deliveryCity || null);
          if (classroomMatch.matched && classroomMatch.standardName !== order.deliveryRoom) {
            result.changes.push({
              field: 'deliveryRoom',
              original: order.deliveryRoom,
              normalized: classroomMatch.standardName,
              classroomId: classroomMatch.classroomId,
              similarity: classroomMatch.similarity,
              confidence: classroomMatch.confidence
            });
          } else if (!classroomMatch.matched) {
            result.changes.push({
              field: 'deliveryRoom',
              original: order.deliveryRoom,
              normalized: null,
              similarity: classroomMatch.similarity,
              confidence: 'low',
              needsReview: true
            });
          }
        }
        
        // 只添加有变更的订单
        if (result.changes.length > 0) {
          preview.push(result);
        }
      }
      
      // 统计信息
      const stats = {
        totalOrders: ordersToNormalize.length,
        ordersWithChanges: preview.length,
        changesByField: {
          deliveryTeacher: preview.filter(p => p.changes.some((c: any) => c.field === 'deliveryTeacher')).length,
          deliveryCourse: preview.filter(p => p.changes.some((c: any) => c.field === 'deliveryCourse')).length,
          classTime: preview.filter(p => p.changes.some((c: any) => c.field === 'classTime')).length,
          deliveryRoom: preview.filter(p => p.changes.some((c: any) => c.field === 'deliveryRoom')).length
        },
        needsReview: preview.filter(p => p.changes.some((c: any) => c.needsReview)).length,
        highConfidence: preview.filter(p => p.changes.every((c: any) => c.confidence === 'high')).length,
        mediumConfidence: preview.filter(p => p.changes.some((c: any) => c.confidence === 'medium')).length
      };
      
      return {
        preview,
        stats
      };
    }),
  
  /**
   * 执行数据规范化（批量更新）
   */
  executeNormalization: protectedProcedure
    .input(z.object({
      orderIds: z.array(z.number()), // 要更新的订单ID列表
      changes: z.array(z.object({
        orderId: z.number(),
        field: z.enum(['deliveryTeacher', 'deliveryCourse', 'classTime', 'deliveryRoom', 'deliveryClassroomId']),
        value: z.string().or(z.number()).nullable()
      }))
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      
      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];
      
      // 按订单ID分组变更
      const changesByOrder = new Map<number, any[]>();
      for (const change of input.changes) {
        if (!changesByOrder.has(change.orderId)) {
          changesByOrder.set(change.orderId, []);
        }
        changesByOrder.get(change.orderId)!.push(change);
      }
      
      // 逐个订单更新
      for (const orderId of input.orderIds) {
        try {
          const orderChanges = changesByOrder.get(orderId) || [];
          if (orderChanges.length === 0) continue;
          
          const updateData: any = {};
          for (const change of orderChanges) {
            updateData[change.field] = change.value;
          }
          
          await db
            .update(orders)
            .set(updateData)
            .where(eq(orders.id, orderId));
          
          successCount++;
        } catch (error: any) {
          failureCount++;
          errors.push(`订单ID ${orderId}: ${error.message}`);
        }
      }
      
      return {
        success: true,
        successCount,
        failureCount,
        errors
      };
    })
});
