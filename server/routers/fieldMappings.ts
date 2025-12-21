import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as fieldMappingsDb from "../db/fieldMappings";

export const fieldMappingsRouter = router({
  /**
   * 获取所有字段映射配置
   */
  list: protectedProcedure
    .input(
      z.object({
        type: z.enum(["salesperson_alias", "city_code", "teacher_alias", "course_alias"]).optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      return await fieldMappingsDb.getAllFieldMappings(input?.type);
    }),

  /**
   * 创建字段映射配置
   */
  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(["salesperson_alias", "city_code", "teacher_alias", "course_alias"]),
        sourceValue: z.string().min(1, "原始值不能为空"),
        targetValue: z.string().min(1, "目标值不能为空"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await fieldMappingsDb.createFieldMapping({
        type: input.type,
        sourceValue: input.sourceValue,
        targetValue: input.targetValue,
        description: input.description,
        createdBy: ctx.user.id,
      });
    }),

  /**
   * 更新字段映射配置
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        sourceValue: z.string().min(1, "原始值不能为空").optional(),
        targetValue: z.string().min(1, "目标值不能为空").optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      await fieldMappingsDb.updateFieldMapping(id, updates);
      return { success: true };
    }),

  /**
   * 删除字段映射配置
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await fieldMappingsDb.deleteFieldMapping(input.id);
      return { success: true };
    }),
});
