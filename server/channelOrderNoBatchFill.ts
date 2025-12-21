/**
 * 批量补全历史订单的渠道订单号
 */
import { getAllOrders, updateOrder } from "./db";
import { extractChannelOrderNo, validateChannelOrderNo, identifyPaymentChannel } from "./channelOrderNoUtils";

export interface BatchFillResult {
  totalOrders: number;        // 总订单数
  processedOrders: number;    // 已处理订单数
  filledOrders: number;       // 成功补全订单数
  skippedOrders: number;      // 跳过订单数(已有渠道订单号)
  failedOrders: number;       // 失败订单数
  warnings: string[];         // 警告信息
  details: Array<{
    orderId: number;
    orderNo: string;
    customerName: string;
    extractedChannelOrderNo: string;
    identifiedChannel: string;
    validationWarning?: string;
    status: "filled" | "skipped" | "failed";
    reason?: string;
  }>;
}

/**
 * 批量补全历史订单的渠道订单号
 * 从订单备注的原始文本中提取渠道订单号
 * @param options 选项
 * @param options.onlyMissing 是否只处理缺失渠道订单号的订单(默认true)
 * @param options.validateFormat 是否验证格式(默认true)
 * @param options.autoIdentifyChannel 是否自动识别支付渠道(默认true)
 * @returns 批量补全结果
 */
export async function batchFillChannelOrderNo(options: {
  onlyMissing?: boolean;
  validateFormat?: boolean;
  autoIdentifyChannel?: boolean;
} = {}): Promise<BatchFillResult> {
  const {
    onlyMissing = true,
    validateFormat = true,
    autoIdentifyChannel = true,
  } = options;

  const result: BatchFillResult = {
    totalOrders: 0,
    processedOrders: 0,
    filledOrders: 0,
    skippedOrders: 0,
    failedOrders: 0,
    warnings: [],
    details: [],
  };

  try {
    // 获取所有订单
    const allOrders = await getAllOrders();
    result.totalOrders = allOrders.length;

    for (const order of allOrders) {
      // 如果只处理缺失的订单,跳过已有渠道订单号的订单
      if (onlyMissing && order.channelOrderNo) {
        result.skippedOrders++;
        result.details.push({
          orderId: order.id,
          orderNo: order.orderNo,
          customerName: order.customerName || "",
          extractedChannelOrderNo: "",
          identifiedChannel: "",
          status: "skipped",
          reason: "已有渠道订单号",
        });
        continue;
      }

      result.processedOrders++;

      // 从备注中提取渠道订单号
      const notes = order.notes || "";
      const extractedOrderNo = extractChannelOrderNo(notes);

      if (!extractedOrderNo) {
        result.failedOrders++;
        result.details.push({
          orderId: order.id,
          orderNo: order.orderNo,
          customerName: order.customerName || "",
          extractedChannelOrderNo: "",
          identifiedChannel: "",
          status: "failed",
          reason: "备注中未找到渠道订单号",
        });
        continue;
      }

      // 验证格式
      let validationWarning: string | undefined;
      let identifiedChannel = "";

      if (validateFormat) {
        const validation = validateChannelOrderNo(extractedOrderNo);
        validationWarning = validation.warning;

        if (validation.warning) {
          result.warnings.push(
            `订单 ${order.orderNo} (${order.customerName || "无客户名"}): ${validation.warning}`
          );
        }

        // 自动识别支付渠道
        if (autoIdentifyChannel && validation.isValid) {
          identifiedChannel = validation.channelName;
        }
      } else if (autoIdentifyChannel) {
        identifiedChannel = identifyPaymentChannel(extractedOrderNo);
      }

      // 更新订单
      try {
        const updateData: any = {
          channelOrderNo: extractedOrderNo,
        };

        // 如果没有支付渠道且识别出了渠道,自动填充
        if (autoIdentifyChannel && identifiedChannel && !order.paymentChannel) {
          updateData.paymentChannel = identifiedChannel;
        }

        await updateOrder(order.id, updateData);

        result.filledOrders++;
        result.details.push({
          orderId: order.id,
          orderNo: order.orderNo,
          customerName: order.customerName || "",
          extractedChannelOrderNo: extractedOrderNo,
          identifiedChannel,
          validationWarning,
          status: "filled",
        });
      } catch (err: any) {
        result.failedOrders++;
        result.details.push({
          orderId: order.id,
          orderNo: order.orderNo,
          customerName: order.customerName || "",
          extractedChannelOrderNo: extractedOrderNo,
          identifiedChannel,
          status: "failed",
          reason: `更新失败: ${err.message}`,
        });
      }
    }

    return result;
  } catch (error: any) {
    throw new Error(`批量补全失败: ${error.message}`);
  }
}

/**
 * 预览批量补全结果(不实际更新数据库)
 * @param options 选项
 * @returns 预览结果
 */
export async function previewBatchFillChannelOrderNo(options: {
  onlyMissing?: boolean;
} = {}): Promise<{
  totalOrders: number;
  canFillOrders: number;
  cannotFillOrders: number;
  alreadyHasOrders: number;
  preview: Array<{
    orderId: number;
    orderNo: string;
    customerName: string;
    currentChannelOrderNo: string;
    extractedChannelOrderNo: string;
    identifiedChannel: string;
    canFill: boolean;
    reason?: string;
  }>;
}> {
  const { onlyMissing = true } = options;

  const preview = {
    totalOrders: 0,
    canFillOrders: 0,
    cannotFillOrders: 0,
    alreadyHasOrders: 0,
    preview: [] as Array<{
      orderId: number;
      orderNo: string;
      customerName: string;
      currentChannelOrderNo: string;
      extractedChannelOrderNo: string;
      identifiedChannel: string;
      canFill: boolean;
      reason?: string;
    }>,
  };

  const allOrders = await getAllOrders();
  preview.totalOrders = allOrders.length;

  for (const order of allOrders) {
    const currentChannelOrderNo = order.channelOrderNo || "";

    // 如果只处理缺失的订单
    if (onlyMissing && currentChannelOrderNo) {
      preview.alreadyHasOrders++;
      continue;
    }

    // 从备注中提取渠道订单号
    const notes = order.notes || "";
    const extractedOrderNo = extractChannelOrderNo(notes);

    if (!extractedOrderNo) {
      preview.cannotFillOrders++;
      preview.preview.push({
        orderId: order.id,
        orderNo: order.orderNo,
        customerName: order.customerName || "",
        currentChannelOrderNo,
        extractedChannelOrderNo: "",
        identifiedChannel: "",
        canFill: false,
        reason: "备注中未找到渠道订单号",
      });
      continue;
    }

    // 识别支付渠道
    const identifiedChannel = identifyPaymentChannel(extractedOrderNo);

    preview.canFillOrders++;
    preview.preview.push({
      orderId: order.id,
      orderNo: order.orderNo,
      customerName: order.customerName || "",
      currentChannelOrderNo,
      extractedChannelOrderNo: extractedOrderNo,
      identifiedChannel,
      canFill: true,
    });
  }

  return preview;
}
