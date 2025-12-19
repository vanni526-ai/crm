import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { parseGmailOrderContent } from "./gmailOrderParser";
import {
  createGmailImportLog,
  checkOrderNoExists,
  createOrder,
} from "./db";

/**
 * Gmail Webhook路由
 * 接收Gmail转发的邮件并自动导入订单
 */
export const gmailWebhookRouter = router({
  /**
   * Webhook端点 - 接收Gmail转发的邮件
   * 这是一个公开端点,不需要认证
   */
  receiveEmail: publicProcedure
    .input(
      z.object({
        subject: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        date: z.string().optional(),
        body: z.string(), // 邮件正文
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log("收到Gmail转发邮件:", {
          subject: input.subject,
          from: input.from,
          bodyLength: input.body.length,
        });

        // 检查邮件主题是否包含"打款群"
        if (input.subject && !input.subject.includes("打款群")) {
          console.log("邮件主题不包含'打款群',跳过处理");
          return {
            success: true,
            message: "邮件主题不符合条件,已跳过",
            ordersCreated: 0,
          };
        }

        // 解析邮件内容
        const parsedOrders = await parseGmailOrderContent(input.body);
        console.log(`解析到 ${parsedOrders.length} 个订单`);

        if (parsedOrders.length === 0) {
          console.log("未找到订单信息");
          return {
            success: true,
            message: "未找到订单信息",
            ordersCreated: 0,
          };
        }

        // 创建导入日志
        const emailDate = input.date ? new Date(input.date) : new Date();
        const logId = await createGmailImportLog({
          emailSubject: input.subject || "Gmail转发",
          emailDate,
          threadId: `webhook-${Date.now()}`,
          totalOrders: parsedOrders.length,
          successOrders: 0,
          failedOrders: 0,
          status: "success",
          importedBy: 1, // 系统自动导入
          emailContent: input.body.substring(0, 5000),
        });

        // 批量创建订单
        let successCount = 0;
        let skippedCount = 0;
        const errorMessages: string[] = [];

        for (const orderData of parsedOrders) {
          try {
            // 生成订单号
            const orderNo = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

            // 检查订单号是否已存在
            const exists = await checkOrderNoExists(orderNo);
            if (exists) {
              skippedCount++;
              errorMessages.push(`订单号 ${orderNo} 已存在`);
              continue;
            }

            // 创建订单
            await createOrder({
              orderNo,
              customerName: orderData.customerName,
              salesPerson: orderData.salesperson,
              classDate: new Date(orderData.classDate),
              classTime: orderData.classTime,
              deliveryCourse: orderData.course,
              paymentAmount: orderData.paymentAmount.toString(),
              courseAmount: orderData.courseAmount.toString(),
              salesId: 1, // 系统自动导入
            });

            successCount++;
          } catch (err: any) {
            console.error("订单创建失败:", err);
            errorMessages.push(`订单导入失败: ${err.message}`);
          }
        }

        console.log(`Webhook导入完成: 成功 ${successCount}, 跳过 ${skippedCount}`);

        return {
          success: true,
          message: `成功导入${successCount}个订单`,
          ordersCreated: successCount,
          ordersSkipped: skippedCount,
          errors: errorMessages,
        };
      } catch (error: any) {
        console.error("Webhook处理失败:", error);
        return {
          success: false,
          message: error.message || "处理失败",
          ordersCreated: 0,
        };
      }
    }),
});
