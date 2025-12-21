/**
 * Gmail自动导入服务
 * 从Gmail拉取邮件并自动解析创建订单
 */

import {
  searchGmailMessages,
  readGmailThreads,
  getHeaderValue,
  extractEmailBody,
  extractEmailAddress,
} from "./gmailMcp";
import { parseGmailOrderContent } from "./gmailOrderParser";
import * as db from "./db";

/**
 * Gmail自动导入结果
 */
export interface GmailAutoImportResult {
  totalEmails: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  details: Array<{
    messageId: string;
    subject: string;
    status: "success" | "failed" | "skipped";
    errorMessage?: string;
    orderId?: number;
  }>;
}

/**
 * Gmail自动导入配置
 */
export interface GmailAutoImportConfig {
  query?: string; // Gmail搜索查询
  maxResults?: number; // 最大导入数量
  operatorId: number; // 操作人ID
  operatorName: string; // 操作人姓名
}

/**
 * 执行Gmail自动导入
 * @param config 导入配置
 * @returns 导入结果
 */
export async function executeGmailAutoImport(
  config: GmailAutoImportConfig
): Promise<GmailAutoImportResult> {
  const result: GmailAutoImportResult = {
    totalEmails: 0,
    successCount: 0,
    failedCount: 0,
    skippedCount: 0,
    details: [],
  };

  try {
    // 1. 搜索Gmail邮件
    const messages = await searchGmailMessages(
      config.query,
      config.maxResults || 50
    );

    result.totalEmails = messages.length;

    if (messages.length === 0) {
      return result;
    }

    // 2. 提取thread IDs
    const threadIds = messages.map((msg) => msg.threadId);

    // 3. 读取邮件详情(分批处理,每批最多100个)
    const batchSize = 100;
    const threads = [];
    for (let i = 0; i < threadIds.length; i += batchSize) {
      const batch = threadIds.slice(i, i + batchSize);
      const batchThreads = await readGmailThreads(batch, true);
      threads.push(...batchThreads);
    }

    // 4. 处理每个邮件线程
    for (const thread of threads) {
      // 获取线程中的第一封邮件(通常是主邮件)
      const message = thread.messages[0];
      if (!message) continue;

      const headers = message.payload?.headers;
      const messageId = getHeaderValue(headers, "Message-ID") || message.id;
      const subject = getHeaderValue(headers, "Subject") || "";
      const fromHeader = getHeaderValue(headers, "From") || "";
      const fromEmail = extractEmailAddress(fromHeader);

      // 检查是否已导入
      const exists = await db.checkMessageIdExists(messageId);
      if (exists) {
        result.skippedCount++;
        result.details.push({
          messageId,
          subject,
          status: "skipped",
          errorMessage: "邮件已导入",
        });
        continue;
      }

      try {
        // 提取邮件正文
        const emailBody = extractEmailBody(message);

        // 解析订单信息
        const parsedOrders = await parseGmailOrderContent(emailBody);

        if (!parsedOrders || parsedOrders.length === 0) {
          // 解析失败,记录失败状态
          await db.createGmailImportHistory({
            messageId,
            threadId: thread.id,
            subject,
            fromEmail,
            importStatus: "failed",
            errorMessage: "无法解析订单信息",
            operatorId: config.operatorId,
            operatorName: config.operatorName,
          });

          result.failedCount++;
          result.details.push({
            messageId,
            subject,
            status: "failed",
            errorMessage: "无法解析订单信息",
          });
          continue;
        }

        // 创建订单(只处理第一个解析出的订单)
        const orderData = parsedOrders[0];
        const createdOrder = await db.createOrder({
          orderNo: `ORD${Date.now()}${Math.floor(Math.random() * 10000)}`,
          customerName: orderData.customerName,
          salesId: config.operatorId, // 使用操作人作为销售ID
          salesPerson: orderData.salesperson,
          paymentAmount: orderData.paymentAmount.toString(),
          courseAmount: orderData.courseAmount.toString(),
          accountBalance: orderData.accountBalance.toString(),
          teacherFee: orderData.teacherFee.toString(),
          transportFee: orderData.carFee.toString(),
          deliveryCity: orderData.city,
          deliveryRoom: orderData.classroom,
          deliveryTeacher: orderData.teacher,
          deliveryCourse: orderData.course,
          classDate: orderData.classDate ? new Date(orderData.classDate) : undefined,
          classTime: orderData.classTime,
          channelOrderNo: orderData.channelOrderNo || undefined,
          notes: orderData.notes,
          status: "pending",
          // 结构化备注字段(默认为undefined)
          noteTags: undefined,
          discountInfo: undefined,
          couponInfo: undefined,
          membershipInfo: undefined,
          paymentStatus: undefined,
          specialNotes: undefined,
          isVoided: false,
        });

        // 记录导入成功
        await db.createGmailImportHistory({
          messageId,
          threadId: thread.id,
          subject,
          fromEmail,
          orderId: createdOrder.id,
          importStatus: "success",
          operatorId: config.operatorId,
          operatorName: config.operatorName,
        });

        result.successCount++;
        result.details.push({
          messageId,
          subject,
          status: "success",
          orderId: createdOrder.id,
        });
      } catch (error) {
        // 处理失败,记录错误
        const errorMessage = error instanceof Error ? error.message : String(error);

        await db.createGmailImportHistory({
          messageId,
          threadId: thread.id,
          subject,
          fromEmail,
          importStatus: "failed",
          errorMessage,
          operatorId: config.operatorId,
          operatorName: config.operatorName,
        });

        result.failedCount++;
        result.details.push({
          messageId,
          subject,
          status: "failed",
          errorMessage,
        });
      }
    }

    return result;
  } catch (error) {
    console.error("Gmail自动导入失败:", error);
    throw new Error(`Gmail自动导入失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 预览将要导入的Gmail邮件
 * @param query Gmail搜索查询
 * @param maxResults 最大结果数
 * @returns 邮件预览列表
 */
export async function previewGmailMessages(query?: string, maxResults: number = 50) {
  try {
    // 搜索邮件
    const messages = await searchGmailMessages(query, maxResults);

    if (messages.length === 0) {
      return [];
    }

    // 读取邮件详情
    const threadIds = messages.map((msg) => msg.threadId);
    const threads = await readGmailThreads(threadIds.slice(0, 100), false); // 预览时不需要完整消息

    // 提取预览信息
    return threads.map((thread) => {
      const message = thread.messages[0];
      if (!message) return null;

      const headers = message.payload?.headers;
      const messageId = getHeaderValue(headers, "Message-ID") || message.id;
      const subject = getHeaderValue(headers, "Subject") || "";
      const fromHeader = getHeaderValue(headers, "From") || "";
      const fromEmail = extractEmailAddress(fromHeader);
      const date = getHeaderValue(headers, "Date") || "";

      return {
        messageId,
        threadId: thread.id,
        subject,
        from: fromEmail,
        date,
        snippet: message.snippet || "",
      };
    }).filter(Boolean);
  } catch (error) {
    console.error("预览Gmail邮件失败:", error);
    throw new Error(`预览Gmail邮件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}
