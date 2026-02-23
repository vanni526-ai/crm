import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

/**
 * schedules 路由模块
 * 老师排班相关接口
 */
export const schedulesRouter = router({
  /**
   * 获取老师排班可用性
   * 老师端接口：强制使用JWT中的userId，忽略前端传入的teacherId
   */
  getTeacherAvailability: protectedProcedure
    .input(
      z.object({
        teacherId: z.number().optional(), // 忽略此参数
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // 检查用户角色
      if (!ctx.user.roles.includes('teacher')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only teachers can access this endpoint',
        });
      }

      // 强制使用JWT中的userId作为teacherId
      const teacherId = ctx.user.id;

      console.log('[schedules.getTeacherAvailability] Teacher ID:', teacherId);
      console.log('[schedules.getTeacherAvailability] Date range:', input?.startDate, '-', input?.endDate);

      // TODO: 实现真实的排班查询逻辑
      // 目前返回模拟数据
      return {
        teacherId,
        teacherName: ctx.user.name,
        availability: [
          {
            date: '2026-02-24',
            timeSlots: [
              { start: '09:00', end: '10:00', available: true },
              { start: '10:00', end: '11:00', available: true },
              { start: '14:00', end: '15:00', available: false },
              { start: '15:00', end: '16:00', available: true },
            ],
          },
          {
            date: '2026-02-25',
            timeSlots: [
              { start: '09:00', end: '10:00', available: true },
              { start: '10:00', end: '11:00', available: false },
              { start: '14:00', end: '15:00', available: true },
              { start: '15:00', end: '16:00', available: true },
            ],
          },
        ],
      };
    }),
});
