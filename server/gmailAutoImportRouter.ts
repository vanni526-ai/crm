import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { parseGmailOrderContent } from "./gmailOrderParser";
import { createOrder, checkOrderNoExists } from "./db";
import { orders } from "../drizzle/schema";

/**
 * Gmail自动导入路由
 */
export const gmailAutoImportRouter = router({
  /**
   * 解析Gmail邮件内容并提取订单信息
   */
  parseGmailEmail: protectedProcedure
    .input(
      z.object({
        emailContent: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const parsedOrders = await parseGmailOrderContent(input.emailContent);
        return {
          success: true,
          orders: parsedOrders,
          count: parsedOrders.length,
        };
      } catch (error: any) {
        console.error("解析Gmail邮件失败:", error);
        return {
          success: false,
          error: error.message || "解析失败",
          orders: [],
          count: 0,
        };
      }
    }),

  /**
   * 批量创建订单(从Gmail解析结果)
   */
  batchCreateFromGmail: protectedProcedure
    .input(
      z.object({
        orders: z.array(
          z.object({
            salesperson: z.string(),
            deviceWechat: z.string(),
            customerName: z.string(),
            classDate: z.string(),
            classTime: z.string(),
            course: z.string(),
            teacher: z.string(),
            city: z.string(),
            classroom: z.string(),
            paymentAmount: z.number(),
            courseAmount: z.number(),
            downPayment: z.number(),
            finalPayment: z.number(),
            teacherFee: z.number(),
            carFee: z.number(),
            notes: z.string(),
            originalText: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const results = [];
      let successCount = 0;
      let failCount = 0;

      for (const orderData of input.orders) {
        try {
          // 生成唯一订单号
          const cityAreaCodes: Record<string, string> = {
            "上海": "021",
            "北京": "010",
            "天津": "022",
            "成都": "028",
            "泉州": "0595",
            "无锡": "0510",
            "武汉": "027",
            "济南": "0531",
          };
          const areaCode = cityAreaCodes[orderData.city] || "000";
          const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
          let orderNo = `${timestamp}-${areaCode}`;
          
          // 检查订单号是否已存在
          let suffix = 1;
          while (await checkOrderNoExists(orderNo)) {
            orderNo = `${timestamp}-${areaCode}-${String(suffix).padStart(3, "0")}`;
            suffix++;
            if (suffix > 999) break;
          }

          // 创建订单
          const newOrder = await createOrder({
            orderNo,
            customerName: orderData.customerName,
            salesPerson: orderData.salesperson,
            salesId: ctx.user.id, // 使用当前用户ID作为销售ID
            trafficSource: orderData.deviceWechat, // 设备微信号作为流量来源
            paymentAmount: orderData.paymentAmount.toString(),
            courseAmount: orderData.courseAmount.toString(),
            teacherFee: orderData.teacherFee.toString(),
            transportFee: orderData.carFee.toString(),
            deliveryCity: orderData.city,
            deliveryRoom: orderData.classroom,
            deliveryTeacher: orderData.teacher,
            deliveryCourse: orderData.course,
            classDate: new Date(orderData.classDate),
            classTime: orderData.classTime,
            notes: `${orderData.notes}\n\n原始文本: ${orderData.originalText}`,
            status: "paid", // 默认已支付状态
          });

          results.push({
            success: true,
            orderNo,
            customerName: orderData.customerName,
          });
          successCount++;
        } catch (error: any) {
          console.error("创建订单失败:", error);
          results.push({
            success: false,
            customerName: orderData.customerName,
            error: error.message || "创建失败",
          });
          failCount++;
        }
      }

      return {
        success: true,
        successCount,
        failCount,
        total: input.orders.length,
        results,
      };
    }),

  /**
   * 获取最近的Gmail导入历史
   */
  getImportHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ input }) => {
      // TODO: 实现导入历史记录功能
      return {
        history: [],
        total: 0,
      };
    }),
});
