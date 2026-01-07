import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as reconciliationDb from "./reconciliationDb";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";

// 权限检查:管理员或财务可以访问对账功能
const reconciliationProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "finance") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员或财务权限" });
  }
  return next({ ctx });
});

export const reconciliationRouter = router({
  /**
   * 智能匹配课程日程与订单
   */
  intelligentMatch: reconciliationProcedure
    .input(
      z.object({
        scheduleIds: z.array(z.number()).optional(), // 可选:指定要匹配的课程日程ID
        orderIds: z.array(z.number()).optional(), // 可选:指定要匹配的订单ID
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // 获取未匹配的课程日程和订单
        let unmatchedSchedules = await reconciliationDb.getUnmatchedSchedules();
        let unmatchedOrders = await reconciliationDb.getUnmatchedOrders();

        // 如果指定了ID,则只匹配指定的记录
        if (input.scheduleIds && input.scheduleIds.length > 0) {
          unmatchedSchedules = unmatchedSchedules.filter(s => input.scheduleIds!.includes(s.id));
        }
        if (input.orderIds && input.orderIds.length > 0) {
          unmatchedOrders = unmatchedOrders.filter(o => input.orderIds!.includes(o.id));
        }

        if (unmatchedSchedules.length === 0 || unmatchedOrders.length === 0) {
          return {
            success: true,
            matchedCount: 0,
            matches: [],
            message: "没有需要匹配的记录",
          };
        }

        // 构建LLM提示词
        const schedulesData = unmatchedSchedules.map(s => ({
          id: s.id,
          customerName: s.customerName,
          deliveryTeacher: s.deliveryTeacher,
          deliveryCourse: s.deliveryCourse,
          classDate: s.classDate?.toISOString().split('T')[0],
          classTime: s.classTime,
          courseAmount: s.courseAmount,
          channelOrderNo: s.channelOrderNo,
          location: s.location,
        }));

        const ordersData = unmatchedOrders.map(o => ({
          id: o.id,
          orderNo: o.orderNo,
          customerName: o.customerName,
          deliveryTeacher: o.deliveryTeacher,
          deliveryCourse: o.deliveryCourse,
          classDate: o.classDate?.toISOString().split('T')[0],
          classTime: o.classTime,
          courseAmount: o.courseAmount,
          channelOrderNo: o.channelOrderNo,
          deliveryCity: o.deliveryCity,
        }));

        const prompt = `你是一个财务对账专家。请根据以下课程日程和订单数据,找出匹配的记录。

匹配规则(按优先级):
1. 渠道订单号(channelOrderNo)完全匹配
2. 客户名 + 上课日期 + 老师名 + 课程金额都匹配
3. 客户名 + 上课日期 + 老师名匹配(允许金额有小幅差异)
4. 客户名 + 上课日期匹配,且课程名称相似

课程日程数据:
${JSON.stringify(schedulesData, null, 2)}

订单数据:
${JSON.stringify(ordersData, null, 2)}

请返回匹配结果,格式如下:
{
  "matches": [
    {
      "scheduleId": 课程日程ID,
      "orderId": 订单ID,
      "confidence": 置信度(0-100),
      "reason": "匹配原因说明"
    }
  ]
}

注意:
- 只返回置信度 >= 60 的匹配
- 一个课程日程只能匹配一个订单
- 置信度计算:渠道订单号匹配=100,完全匹配=95,部分匹配=70-90,模糊匹配=60-70
`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "你是一个财务对账专家,擅长通过多维度信息匹配课程日程和订单。" },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "match_result",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        scheduleId: { type: "number" },
                        orderId: { type: "number" },
                        confidence: { type: "number" },
                        reason: { type: "string" },
                      },
                      required: ["scheduleId", "orderId", "confidence", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["matches"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0].message.content;
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
        const result = JSON.parse(contentStr || "{}");
        const matches = result.matches || [];

        // 过滤掉置信度低于60的匹配
        const validMatches = matches.filter((m: any) => m.confidence >= 60);

        // 批量创建匹配关系
        if (validMatches.length > 0) {
          await reconciliationDb.batchCreateMatches(
            validMatches.map((m: any) => ({
              scheduleId: m.scheduleId,
              orderId: m.orderId,
              matchMethod: "llm_intelligent",
              confidence: m.confidence,
              matchDetails: JSON.stringify({ reason: m.reason }),
            }))
          );
        }

        return {
          success: true,
          matchedCount: validMatches.length,
          matches: validMatches,
          message: `成功匹配 ${validMatches.length} 条记录`,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `智能匹配失败: ${error.message}`,
        });
      }
    }),

  /**
   * 手动创建匹配关系
   */
  createMatch: reconciliationProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        orderId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await reconciliationDb.createMatch({
          scheduleId: input.scheduleId,
          orderId: input.orderId,
          matchMethod: "manual",
          confidence: 100,
          isVerified: true,
          verifiedBy: ctx.user.id,
        });

        return { success: true, message: "匹配关系创建成功" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `创建匹配关系失败: ${error.message}`,
        });
      }
    }),

  /**
   * 更新匹配关系
   */
  updateMatch: reconciliationProcedure
    .input(
      z.object({
        matchId: z.number(),
        orderId: z.number().optional(),
        isVerified: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await reconciliationDb.updateMatch(input.matchId, {
          orderId: input.orderId,
          isVerified: input.isVerified,
          verifiedBy: input.isVerified ? ctx.user.id : undefined,
        });

        return { success: true, message: "匹配关系更新成功" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `更新匹配关系失败: ${error.message}`,
        });
      }
    }),

  /**
   * 删除匹配关系
   */
  deleteMatch: reconciliationProcedure
    .input(z.object({ matchId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await reconciliationDb.deleteMatch(input.matchId);
        return { success: true, message: "匹配关系删除成功" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `删除匹配关系失败: ${error.message}`,
        });
      }
    }),

  /**
   * 获取所有匹配关系
   */
  getAllMatches: reconciliationProcedure.query(async () => {
    try {
      const matches = await reconciliationDb.getAllMatches();
      return matches;
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `获取匹配关系失败: ${error.message}`,
      });
    }
  }),

  /**
   * 获取未匹配的课程日程
   */
  getUnmatchedSchedules: reconciliationProcedure.query(async () => {
    try {
      const schedules = await reconciliationDb.getUnmatchedSchedules();
      return schedules;
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `获取未匹配课程日程失败: ${error.message}`,
      });
    }
  }),

  /**
   * 获取未匹配的订单
   */
  getUnmatchedOrders: reconciliationProcedure.query(async () => {
    try {
      const orders = await reconciliationDb.getUnmatchedOrders();
      return orders;
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `获取未匹配订单失败: ${error.message}`,
      });
    }
  }),

  /**
   * 生成月度对账报表
   */
  getMonthlyReport: reconciliationProcedure
    .input(
      z.object({
        startDate: z.string(), // YYYY-MM-DD
        endDate: z.string(), // YYYY-MM-DD
        city: z.string().optional(),
        salesPerson: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const report = await reconciliationDb.getMonthlyReconciliationReport({
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          city: input.city,
          salesPerson: input.salesPerson,
        });

        return report;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `生成对账报表失败: ${error.message}`,
        });
      }
    }),
});
