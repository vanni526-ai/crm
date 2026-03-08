/**
 * statementMatchRouter.ts
 * 收款流水导入 + 智能匹配订单
 *
 * 支持：
 *   - 微信收款流水（CSV，GBK 编码，跳过前3行注释）
 *   - 支付宝收款流水（Excel .xlsx）
 *
 * 匹配策略：
 *   1. 按金额 + 日期（±1天容差）+ 渠道 匹配订单
 *   2. 支持一张订单多笔收款（首付+尾款）累加
 *   3. 匹配结果分三类：全款已付 / 部分付款 / 未付款
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { eq, and, gte, lte, or } from "drizzle-orm";
import { orders } from "../drizzle/schema";

// ─── 类型定义 ──────────────────────────────────────────────────────────────────

export interface StatementRow {
  /** 交易时间（ISO 字符串或 YYYY-MM-DD HH:mm:ss） */
  tradeTime: string;
  /** 交易日期 YYYY-MM-DD */
  tradeDate: string;
  /** 收款金额（正数） */
  amount: number;
  /** 渠道：wechat | alipay */
  channel: "wechat" | "alipay";
  /** 渠道流水号 */
  tradeNo: string;
  /** 备注/摘要 */
  remark: string;
  /** 原始行（调试用） */
  raw?: string;
}

export interface MatchedOrder {
  orderId: number;
  orderNo: string;
  customerName: string | null;
  salesPerson: string | null;
  deliveryCourse: string | null;
  deliveryCity: string | null;
  deliveryTeacher: string | null;
  classDate: string | null;
  courseAmount: number;
  /** 所有匹配到的流水行 */
  matchedRows: StatementRow[];
  /** 已收金额合计 */
  receivedAmount: number;
  /** 差额（courseAmount - receivedAmount） */
  gap: number;
  /** 匹配状态 */
  matchStatus: "paid" | "partial" | "unpaid";
  notes: string | null;
  paymentChannel: string | null;
  channelOrderNo: string | null;
  paymentDate: string | null;
}

// ─── 流水解析工具 ──────────────────────────────────────────────────────────────

/**
 * 解析微信收款流水 CSV（GBK 编码，前3行为注释，第4行为表头）
 * 关键列：交易时间 | 交易类型 | 收/支 | 金额(元) | 交易单号 | 商户单号 | 备注
 */
function parseWechatCSV(content: string): StatementRow[] {
  const lines = content.split("\n").map((l) => l.replace(/\r/g, "").trim());
  // 找到表头行（包含"交易时间"）
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].includes("交易时间")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const headers = lines[headerIdx].split(",").map((h) => h.replace(/"/g, "").trim());
  const colIdx = (name: string) => headers.findIndex((h) => h.includes(name));

  const timeCol = colIdx("交易时间");
  const typeCol = colIdx("收/支");
  const amountCol = colIdx("金额");
  const tradeNoCol = colIdx("交易单号");
  const remarkCol = colIdx("备注");

  const rows: StatementRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith("合计")) continue;

    // 简单 CSV 解析（处理引号内的逗号）
    const cols = parseCsvLine(line);
    if (cols.length < Math.max(timeCol, typeCol, amountCol) + 1) continue;

    const direction = (cols[typeCol] || "").replace(/"/g, "").trim();
    if (direction !== "收入") continue; // 只要收入

    const amountStr = (cols[amountCol] || "").replace(/"/g, "").replace(/¥|,/g, "").trim();
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) continue;

    const tradeTime = (cols[timeCol] || "").replace(/"/g, "").trim();
    const tradeDate = tradeTime.substring(0, 10);
    const tradeNo = (cols[tradeNoCol] || "").replace(/"/g, "").trim();
    const remark = (cols[remarkCol] || "").replace(/"/g, "").trim();

    rows.push({ tradeTime, tradeDate, amount, channel: "wechat", tradeNo, remark, raw: line });
  }
  return rows;
}

/**
 * 解析支付宝收款流水 Excel（base64 编码的 xlsx）
 * 关键列：支付时间 | 客户实付 | 商户订单号 | 收款码名称
 */
function parseAlipayExcel(rows: any[][]): StatementRow[] {
  if (!rows || rows.length < 2) return [];

  // 找表头行
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (row && row.some((c: any) => String(c || "").includes("支付时间") || String(c || "").includes("付款时间"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    // 尝试找包含"客户实付"的行
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i];
      if (row && row.some((c: any) => String(c || "").includes("客户实付"))) {
        headerIdx = i;
        break;
      }
    }
  }
  if (headerIdx === -1) return [];

  const headers = rows[headerIdx].map((h: any) => String(h || "").trim());
  const colIdx = (name: string) => headers.findIndex((h: string) => h.includes(name));

  const timeCol = colIdx("支付时间") !== -1 ? colIdx("支付时间") : colIdx("付款时间");
  const amountCol = colIdx("客户实付") !== -1 ? colIdx("客户实付") : colIdx("实收金额");
  const tradeNoCol = colIdx("商户订单号") !== -1 ? colIdx("商户订单号") : colIdx("交易号");
  const remarkCol = colIdx("收款码名称") !== -1 ? colIdx("收款码名称") : colIdx("备注");

  const result: StatementRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[timeCol]) continue;

    const amountRaw = String(row[amountCol] || "").replace(/,/g, "").trim();
    const amount = parseFloat(amountRaw);
    if (isNaN(amount) || amount <= 0) continue;

    const tradeTime = String(row[timeCol] || "").trim();
    const tradeDate = tradeTime.substring(0, 10).replace(/\//g, "-");
    const tradeNo = String(row[tradeNoCol] || "").trim();
    const remark = String(row[remarkCol] || "").trim();

    result.push({ tradeTime, tradeDate, amount, channel: "alipay", tradeNo, remark });
  }
  return result;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ─── 智能匹配核心逻辑 ─────────────────────────────────────────────────────────

/**
 * 将流水行与订单匹配
 *
 * 匹配规则（按优先级）：
 *   1. 渠道订单号精确匹配（channelOrderNo）
 *   2. 金额 + 日期（±1天）模糊匹配
 *
 * 一张订单可以对应多笔流水（首付+尾款），累加金额后判断支付状态。
 */
async function matchStatementToOrders(
  statementRows: StatementRow[],
  year: number,
  month: number
): Promise<MatchedOrder[]> {
  // 查询当月所有有效订单
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const monthOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.isVoided, false),
        or(
          and(gte(orders.classDate, startDate as any), lte(orders.classDate, endDate as any)),
          and(gte(orders.paymentDate, startDate as any), lte(orders.paymentDate, endDate as any))
        )
      )
    );

  // 为每条流水找到最佳匹配订单
  // 结果：orderId -> 匹配的流水行列表
  const orderMatchMap = new Map<number, StatementRow[]>();

  // 已使用的流水行（防止重复匹配）
  const usedRows = new Set<string>();

  // 第一轮：渠道订单号精确匹配
  for (const row of statementRows) {
    if (!row.tradeNo) continue;
    for (const order of monthOrders) {
      if (!order.channelOrderNo) continue;
          const channelNos = order.channelOrderNo.split(/[;,\s]+/).map((s: string) => s.trim());
          if (channelNos.some((no: string) => no && row.tradeNo.includes(no))) {
        if (!orderMatchMap.has(order.id)) orderMatchMap.set(order.id, []);
        orderMatchMap.get(order.id)!.push(row);
        usedRows.add(row.tradeNo);
        break;
      }
    }
  }

  // 第二轮：金额 + 日期模糊匹配（未被精确匹配的流水行）
  for (const row of statementRows) {
    if (usedRows.has(row.tradeNo)) continue;

    const rowDate = new Date(row.tradeDate);
    const candidates: Array<{ order: typeof monthOrders[number]; score: number }> = [];

    for (const order of monthOrders) {
      // 金额匹配：等于课程金额、首付金额（courseAmount/2）或尾款金额
      const courseAmt = parseFloat(String(order.courseAmount || 0));
      const balanceAmt = parseFloat(String(order.balanceAmount || 0));
      const alreadyReceived = (orderMatchMap.get(order.id) || []).reduce((s, r) => s + r.amount, 0);

      const amountMatches =
        Math.abs(row.amount - courseAmt) < 0.01 ||
        (balanceAmt > 0 && Math.abs(row.amount - balanceAmt) < 0.01) ||
        Math.abs(row.amount - (courseAmt - alreadyReceived)) < 0.01;

      if (!amountMatches) continue;

      // 日期匹配：±3天
      const refDate = order.paymentDate
        ? new Date(String(order.paymentDate))
        : order.classDate
        ? new Date(String(order.classDate))
        : null;

      if (!refDate) continue;
      const dayDiff = Math.abs((rowDate.getTime() - refDate.getTime()) / 86400000);
      if (dayDiff > 3) continue;

      candidates.push({ order, score: 10 - dayDiff });
    }

    if (candidates.length === 1) {
      const { order } = candidates[0];
      if (!orderMatchMap.has(order.id)) orderMatchMap.set(order.id, []);
      orderMatchMap.get(order.id)!.push(row);
      usedRows.add(row.tradeNo);
    }
    // 多个候选时不自动匹配（避免误匹配）
  }

  // 构建结果
  const result: MatchedOrder[] = monthOrders.map((order) => {
    const matched = orderMatchMap.get(order.id) || [];
    const receivedAmount = matched.reduce((s, r) => s + r.amount, 0);
    const courseAmount = parseFloat(String(order.courseAmount || 0));
    const gap = courseAmount - receivedAmount;

    let matchStatus: "paid" | "partial" | "unpaid";
    if (matched.length === 0) {
      matchStatus = "unpaid";
    } else if (Math.abs(gap) < 0.01) {
      matchStatus = "paid";
    } else {
      matchStatus = "partial";
    }

    return {
      orderId: order.id,
      orderNo: order.orderNo,
      customerName: order.customerName,
      salesPerson: order.salesPerson,
      deliveryCourse: order.deliveryCourse,
      deliveryCity: order.deliveryCity,
      deliveryTeacher: order.deliveryTeacher,
      classDate: order.classDate ? String(order.classDate) : null,
      courseAmount,
      matchedRows: matched,
      receivedAmount,
      gap,
      matchStatus,
      notes: order.notes,
      paymentChannel: order.paymentChannel,
      channelOrderNo: order.channelOrderNo,
      paymentDate: order.paymentDate ? String(order.paymentDate) : null,
    };
  });

  return result;
}

// ─── tRPC Router ──────────────────────────────────────────────────────────────

export const statementMatchRouter = router({
  /**
   * 解析并匹配流水文件
   * 前端将文件内容以 base64 传入，后端解析后与当月订单匹配
   */
  parseAndMatch: protectedProcedure
    .input(
      z.object({
        /** 文件内容 base64 */
        fileContent: z.string(),
        /** 文件类型：wechat_csv | alipay_xlsx */
        fileType: z.enum(["wechat_csv", "alipay_xlsx"]),
        /** 对账年份 */
        year: z.number().int().min(2020).max(2030),
        /** 对账月份 1-12 */
        month: z.number().int().min(1).max(12),
      })
    )
    .mutation(async ({ input }) => {
      try {
        let statementRows: StatementRow[] = [];

        if (input.fileType === "wechat_csv") {
          // 微信 CSV：base64 → Buffer → GBK 解码
          const buf = Buffer.from(input.fileContent, "base64");
          // 尝试 UTF-8，如果有乱码再用 iconv-lite
          let content: string;
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
          const iconv = require("iconv-lite") as typeof import("iconv-lite");
            content = iconv.decode(buf, "gbk");
          } catch {
            content = buf.toString("utf-8");
          }
          statementRows = parseWechatCSV(content);
        } else {
          // 支付宝 Excel：base64 → Buffer → xlsx 解析
          const XLSX = await import("xlsx");
          const buf = Buffer.from(input.fileContent, "base64");
          const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          statementRows = parseAlipayExcel(rawRows);
        }

        if (statementRows.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "未能从文件中解析出有效收款记录，请检查文件格式",
          });
        }

        const matchResult = await matchStatementToOrders(statementRows, input.year, input.month);

        const paid = matchResult.filter((r) => r.matchStatus === "paid");
        const partial = matchResult.filter((r) => r.matchStatus === "partial");
        const unpaid = matchResult.filter((r) => r.matchStatus === "unpaid");

        return {
          statementCount: statementRows.length,
          orderCount: matchResult.length,
          paid,
          partial,
          unpaid,
          /** 未匹配到任何订单的流水行 */
          unmatchedRows: statementRows.filter(
            (row) =>
              !matchResult.some((r) =>
                r.matchedRows.some((mr) => mr.tradeNo === row.tradeNo)
              )
          ),
        };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `解析匹配失败: ${error.message}`,
        });
      }
    }),
});
