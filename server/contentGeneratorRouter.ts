/**
 * 内容生成路由
 * 提供AI驱动的内容生成API
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  generateCourseIntro,
  generateMarketingMessage,
  generateFollowUpScript,
} from "./contentGenerator";

export const contentGeneratorRouter = router({
  /**
   * 生成课程介绍文案
   */
  generateCourseIntro: protectedProcedure
    .input(
      z.object({
        courseName: z.string().min(1, "课程名称不能为空"),
        courseType: z.string().optional(),
        targetAudience: z.string().optional(),
        highlights: z.array(z.string()).optional(),
        duration: z.string().optional(),
        price: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const content = await generateCourseIntro(input);
        return {
          success: true,
          content,
        };
      } catch (error: any) {
        console.error("生成课程介绍失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "生成课程介绍失败",
        });
      }
    }),

  /**
   * 生成营销短信/邮件
   */
  generateMarketingMessage: protectedProcedure
    .input(
      z.object({
        type: z.enum(["sms", "email"]),
        purpose: z.enum(["promotion", "reminder", "followup", "holiday"]),
        customerName: z.string().optional(),
        courseName: z.string().optional(),
        discount: z.string().optional(),
        deadline: z.string().optional(),
        customContent: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const content = await generateMarketingMessage(input);
        return {
          success: true,
          content,
        };
      } catch (error: any) {
        console.error("生成营销内容失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "生成营销内容失败",
        });
      }
    }),

  /**
   * 生成客户跟进话术
   */
  generateFollowUpScript: protectedProcedure
    .input(
      z.object({
        customerName: z.string().min(1, "客户姓名不能为空"),
        customerStatus: z.enum(["new", "interested", "hesitant", "inactive"]),
        lastContact: z.string().optional(),
        previousCourse: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const content = await generateFollowUpScript(input);
        return {
          success: true,
          content,
        };
      } catch (error: any) {
        console.error("生成跟进话术失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "生成跟进话术失败",
        });
      }
    }),

  /**
   * 获取内容生成模板列表
   */
  getTemplates: protectedProcedure.query(async () => {
    return {
      courseIntro: {
        name: "课程介绍文案",
        description: "为课程生成吸引人的介绍文案",
        fields: ["courseName", "courseType", "targetAudience", "highlights", "duration", "price"],
      },
      marketingMessage: {
        name: "营销短信/邮件",
        description: "生成个性化的营销内容",
        types: [
          { value: "sms", label: "短信" },
          { value: "email", label: "邮件" },
        ],
        purposes: [
          { value: "promotion", label: "促销活动" },
          { value: "reminder", label: "课程提醒" },
          { value: "followup", label: "客户跟进" },
          { value: "holiday", label: "节日问候" },
        ],
      },
      followUpScript: {
        name: "客户跟进话术",
        description: "根据客户状态生成跟进话术",
        statuses: [
          { value: "new", label: "新客户" },
          { value: "interested", label: "有意向" },
          { value: "hesitant", label: "犹豫中" },
          { value: "inactive", label: "沉默客户" },
        ],
      },
    };
  }),
});
