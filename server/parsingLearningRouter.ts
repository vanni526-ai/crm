import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { parsingCorrections, promptOptimizationHistory, parsingLearningConfig } from "../drizzle/schema";
import { getDb } from "./db";
import { desc, eq, and } from "drizzle-orm";

/**
 * 解析规则学习路由
 * 收集用户修正数据,分析错误模式,自动优化prompt
 */
export const parsingLearningRouter = router({
  /**
   * 记录用户修正
   */
  recordCorrection: protectedProcedure
    .input(z.object({
      originalText: z.string(),
      fieldName: z.string(),
      llmValue: z.string().nullable(),
      correctedValue: z.string(),
      correctionType: z.enum(['field_missing', 'field_wrong', 'format_error', 'logic_error', 'manual_edit']),
      context: z.record(z.string(), z.any()).optional(), // 其他字段的值作为上下文
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await db.insert(parsingCorrections).values([{
        originalText: input.originalText,
        fieldName: input.fieldName,
        llmValue: input.llmValue,
        correctedValue: input.correctedValue,
        correctionType: input.correctionType,
        context: input.context ? JSON.stringify(input.context) : null,
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.nickname || '未知用户',
        isLearned: false,
      }]);

      return { success: true };
    }),

  /**
   * 记录订单编辑修正(用于手动编辑订单的学习)
   */
  recordOrderEdit: protectedProcedure
    .input(z.object({
      orderId: z.number(),
      originalText: z.string(), // 订单的原始文本(备注或原始数据来源)
      fieldName: z.string(), // 修改的字段名
      oldValue: z.string().nullable(), // 修改前的值
      newValue: z.string(), // 修改后的值
      reason: z.string().optional(), // 修改原因(用户输入)
      context: z.record(z.string(), z.any()).optional(), // 订单其他字段作为上下文
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      // 构造originalText: 包含修改原因和上下文
      let originalText = input.originalText;
      if (input.reason) {
        originalText += `\n\n修改原因: ${input.reason}`;
      }
      
      await db.insert(parsingCorrections).values([{
        originalText,
        fieldName: input.fieldName,
        llmValue: input.oldValue,
        correctedValue: input.newValue,
        correctionType: 'manual_edit',
        context: input.context ? JSON.stringify(input.context) : null,
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.nickname || '未知用户',
        isLearned: false,
      }]);

      return { success: true };
    }),

  /**
   * 获取未学习的修正记录
   */
  getUnlearnedCorrections: protectedProcedure
    .input(z.object({
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const corrections = await db
        .select()
        .from(parsingCorrections)
        .where(eq(parsingCorrections.isLearned, false))
        .orderBy(desc(parsingCorrections.createdAt))
        .limit(input.limit);

      return corrections;
    }),

  /**
   * 标记修正记录为已学习
   */
  markAsLearned: protectedProcedure
    .input(z.object({
      correctionIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      for (const id of input.correctionIds) {
        await db
          .update(parsingCorrections)
          .set({
            isLearned: true,
            learnedAt: new Date(),
          })
          .where(eq(parsingCorrections.id, id));
      }

      return { success: true };
    }),

  /**
   * 获取修正统计
   */
  getCorrectionStats: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const allCorrections = await db
        .select()
        .from(parsingCorrections);

      const stats = {
        total: allCorrections.length,
        unlearned: allCorrections.filter(c => !c.isLearned).length,
        byField: {} as Record<string, number>,
        byType: {} as Record<string, number>,
      };

      allCorrections.forEach((c: any) => {
        // 按字段统计
        if (!stats.byField[c.fieldName]) {
          stats.byField[c.fieldName] = 0;
        }
        stats.byField[c.fieldName]++;

        // 按类型统计
        if (!stats.byType[c.correctionType]) {
          stats.byType[c.correctionType] = 0;
        }
        stats.byType[c.correctionType]++;
      });

      return stats;
    }),

  /**
   * 获取prompt优化历史
   */
  getOptimizationHistory: protectedProcedure
    .input(z.object({
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const history = await db
        .select()
        .from(promptOptimizationHistory)
        .orderBy(desc(promptOptimizationHistory.createdAt))
        .limit(input.limit);

      return history;
    }),

  /**
   * 创建prompt优化记录
   */
  createOptimization: protectedProcedure
    .input(z.object({
      version: z.string(),
      optimizationType: z.enum(['add_example', 'update_rule', 'fix_error_pattern']),
      changeDescription: z.string(),
      newExamples: z.array(z.string()).optional(),
      correctionCount: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const result = await db.insert(promptOptimizationHistory).values([{
        version: input.version,
        optimizationType: input.optimizationType,
        changeDescription: input.changeDescription,
        newExamples: input.newExamples ? JSON.stringify(input.newExamples) : null,
        correctionCount: input.correctionCount,
        isActive: true,
        createdBy: ctx.user.id,
      }]);

      return { success: true, id: result[0].insertId };
    }),

  /**
   * 触发自动优化
   */
  triggerAutoOptimization: protectedProcedure
    .input(z.object({
      minCorrections: z.number().default(10),
    }))
    .mutation(async ({ input }) => {
      const { autoOptimizePrompt } = await import("./promptOptimizer");
      const result = await autoOptimizePrompt(input.minCorrections);
      return result;
    }),

  /**
   * 分析修正模式(不触发优化)
   */
  analyzePatterns: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const corrections = await db
        .select()
        .from(parsingCorrections)
        .where(eq(parsingCorrections.isLearned, false));

      if (corrections.length === 0) {
        return { corrections: 0, patterns: [], recommendations: [] };
      }

      const { analyzeCorrectionPatterns } = await import("./promptOptimizer");
      const analysis = await analyzeCorrectionPatterns(corrections);

      return {
        corrections: corrections.length,
        ...analysis,
      };
    }),

  /**
   * 获取配置
   */
  getConfig: protectedProcedure
    .input(z.object({
      configKey: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const configs = await db
        .select()
        .from(parsingLearningConfig)
        .where(eq(parsingLearningConfig.configKey, input.configKey));

      if (configs.length === 0) {
        return null;
      }

      return {
        ...configs[0],
        configValue: JSON.parse(configs[0].configValue),
      };
    }),

  /**
   * 设置配置
   */
  setConfig: protectedProcedure
    .input(z.object({
      configKey: z.string(),
      configValue: z.any(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // 检查配置是否存在
      const existing = await db
        .select()
        .from(parsingLearningConfig)
        .where(eq(parsingLearningConfig.configKey, input.configKey));

      if (existing.length > 0) {
        // 更新配置
        await db
          .update(parsingLearningConfig)
          .set({
            configValue: JSON.stringify(input.configValue),
            description: input.description,
            updatedBy: ctx.user.id,
          })
          .where(eq(parsingLearningConfig.configKey, input.configKey));
      } else {
        // 创建配置
        await db.insert(parsingLearningConfig).values([{
          configKey: input.configKey,
          configValue: JSON.stringify(input.configValue),
          description: input.description,
          updatedBy: ctx.user.id,
        }]);
      }

      return { success: true };
    }),

  /**
   * 批量标注修正记录
   */
  batchAnnotate: protectedProcedure
    .input(z.object({
      correctionIds: z.array(z.number()),
      annotationType: z.enum(["typical_error", "edge_case", "common_pattern", "none"]),
      annotationNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // 批量更新标注
      for (const id of input.correctionIds) {
        await db
          .update(parsingCorrections)
          .set({
            annotationType: input.annotationType,
            annotationNote: input.annotationNote,
            annotatedBy: ctx.user.id,
            annotatedAt: new Date(),
          })
          .where(eq(parsingCorrections.id, id));
      }

      return {
        success: true,
        count: input.correctionIds.length,
      };
    }),
});
