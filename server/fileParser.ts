import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { parseString } from "xml2js";
import ical from "ical";
import { promisify } from "util";

const parseXML = promisify(parseString);

// ========== CSV解析 (支付宝交易明细) ==========

export interface AlipayCSVRecord {
  orderNo: string;
  merchantOrderNo: string;
  createTime: string;
  paymentTime: string;
  updateTime: string;
  transactionSource: string;
  transactionType: string;
  counterparty: string;
  productName: string;
  amount: string;
  inOut: string;
  status: string;
  serviceFee: string;
  refundAmount: string;
  remarks: string;
  fundStatus: string;
}

export async function parseAlipayCSV(fileBuffer: Buffer): Promise<AlipayCSVRecord[]> {
  const content = fileBuffer.toString("utf-8");
  
  // 跳过前面的说明行,找到表头
  const lines = content.split("\n");
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("交易号") || lines[i].includes("商家订单号")) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex === -1) {
    throw new Error("无法找到CSV表头");
  }
  
  const csvContent = lines.slice(headerIndex).join("\n");
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  
  return records.map((record: any) => ({
    orderNo: record["交易号"] || record["交易流水号"] || "",
    merchantOrderNo: record["商家订单号"] || "",
    createTime: record["交易创建时间"] || "",
    paymentTime: record["付款时间"] || "",
    updateTime: record["最近修改时间"] || "",
    transactionSource: record["交易来源地"] || "",
    transactionType: record["类型"] || "",
    counterparty: record["交易对方"] || "",
    productName: record["商品名称"] || "",
    amount: record["金额（元）"] || record["金额"] || "0",
    inOut: record["收/支"] || "",
    status: record["交易状态"] || "",
    serviceFee: record["服务费（元）"] || "0",
    refundAmount: record["成功退款（元）"] || "0",
    remarks: record["备注"] || "",
    fundStatus: record["资金状态"] || "",
  }));
}

// ========== Excel解析 (微信支付账单) ==========

export interface WechatExcelRecord {
  transactionTime: string;
  transactionType: string;
  counterparty: string;
  productName: string;
  inOut: string;
  amount: string;
  paymentMethod: string;
  status: string;
  orderNo: string;
  merchantOrderNo: string;
  remarks: string;
}

export async function parseWechatExcel(fileBuffer: Buffer): Promise<WechatExcelRecord[]> {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // 找到表头行
  let headerIndex = -1;
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (row.some((cell) => cell && cell.toString().includes("交易时间"))) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex === -1) {
    throw new Error("无法找到Excel表头");
  }
  
  const headers = jsonData[headerIndex] as string[];
  const dataRows = jsonData.slice(headerIndex + 1);
  
  return dataRows
    .filter((row: any) => row && row.length > 0)
    .map((row: any) => {
      const record: any = {};
      headers.forEach((header, index) => {
        record[header] = row[index] || "";
      });
      
      return {
        transactionTime: record["交易时间"] || "",
        transactionType: record["交易类型"] || "",
        counterparty: record["交易对方"] || "",
        productName: record["商品"] || "",
        inOut: record["收/支"] || "",
        amount: record["金额(元)"] || "0",
        paymentMethod: record["支付方式"] || "",
        status: record["当前状态"] || "",
        orderNo: record["交易单号"] || "",
        merchantOrderNo: record["商户单号"] || "",
        remarks: record["备注"] || "",
      };
    });
}

// ========== XML解析 (支付宝卖出交易) ==========

export interface AlipayXMLRecord {
  orderNo: string;
  merchantOrderNo: string;
  createTime: string;
  paymentTime: string;
  productName: string;
  amount: string;
  status: string;
  buyerAccount: string;
}

export async function parseAlipayXML(fileBuffer: Buffer): Promise<AlipayXMLRecord[]> {
  const content = fileBuffer.toString("utf-8");
  const result: any = await parseXML(content);
  
  // 解析XML结构
  const records: AlipayXMLRecord[] = [];
  
  if (result && result.root && result.root.item) {
    const items = Array.isArray(result.root.item) ? result.root.item : [result.root.item];
    
    items.forEach((item: any) => {
      records.push({
        orderNo: item.tradeNo?.[0] || "",
        merchantOrderNo: item.outTradeNo?.[0] || "",
        createTime: item.createTime?.[0] || "",
        paymentTime: item.payTime?.[0] || "",
        productName: item.subject?.[0] || "",
        amount: item.totalAmount?.[0] || "0",
        status: item.tradeStatus?.[0] || "",
        buyerAccount: item.buyerLogonId?.[0] || "",
      });
    });
  }
  
  return records;
}

// ========== ICS解析 (日历排课信息) ==========

export interface ICSEvent {
  summary: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
  organizer: string;
  attendees: string[];
}

export async function parseICS(fileBuffer: Buffer): Promise<ICSEvent[]> {
  const content = fileBuffer.toString("utf-8");
  const events = ical.parseICS(content);
  
  // 辅助函数:从原始ICS内容中提取DTSTART和DTEND
  const extractRawDateTime = (summary: string): { startTime: Date; endTime: Date } | null => {
    // 转义特殊字符
    const summaryEscaped = summary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 向后查找: 从SUMMARY往前查找最近的DTSTART和DTEND
    const summaryIndex = content.indexOf(`SUMMARY:${summary}`);
    if (summaryIndex === -1) return null;
    
    // 在SUMMARY之前的500个字符内查找DTSTART和DTEND
    const beforeSummary = content.substring(Math.max(0, summaryIndex - 500), summaryIndex);
    const dtstartMatch = beforeSummary.match(/DTSTART(?:;TZID=[^:]+)?:(\d{8}T\d{6})/);
    const dtendMatch = beforeSummary.match(/DTEND(?:;TZID=[^:]+)?:(\d{8}T\d{6})/);
    
    if (dtstartMatch && dtendMatch) {
      // 解析ICS日期时间格式: 20250713T190000
      const parseICSDate = (dateStr: string) => {
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1; // JS月份从0开始
        const day = parseInt(dateStr.substring(6, 8));
        const hour = parseInt(dateStr.substring(9, 11));
        const minute = parseInt(dateStr.substring(11, 13));
        const second = parseInt(dateStr.substring(13, 15));
        // 直接使用本地时间,不做时区转换(ICS文件中已经是Asia/Shanghai时区)
        return new Date(year, month, day, hour, minute, second);
      };
      
      return {
        startTime: parseICSDate(dtstartMatch[1]),
        endTime: parseICSDate(dtendMatch[1])
      };
    }
    
    return null;
  };
  
  const result: ICSEvent[] = [];
  
  for (const key in events) {
    const event = events[key];
    if (event.type === "VEVENT") {
      // 提取organizer的名称
      let organizerName = "";
      if (event.organizer) {
        if (typeof event.organizer === "object" && event.organizer.params && event.organizer.params.CN) {
          // 去除引号
          organizerName = event.organizer.params.CN.replace(/"/g, "");
        } else if (typeof event.organizer === "string") {
          organizerName = event.organizer;
        }
      }

      // 优先从原始ICS内容中提取时间(避免时区转换问题)
      const rawDateTime = extractRawDateTime(event.summary || "");
      let startTime: Date;
      let endTime: Date;
      
      if (rawDateTime) {
        startTime = rawDateTime.startTime;
        endTime = rawDateTime.endTime;
      } else {
        // 回退到ical库解析的时间
        startTime = event.start instanceof Date ? event.start : new Date(event.start || Date.now());
        endTime = event.end instanceof Date ? event.end : new Date(event.end || Date.now());
      }

      result.push({
        summary: event.summary || "",
        description: event.description || "",
        location: event.location || "",
        startTime,
        endTime,
        organizer: organizerName,
        attendees: event.attendee ? (Array.isArray(event.attendee) ? event.attendee.map(String) : [String(event.attendee)]) : [],
      });
    }
  }
  
  return result;
}

// ========== 通用文件解析入口 ==========

export async function parseFile(
  fileBuffer: Buffer,
  fileType: "csv" | "excel" | "xml" | "ics"
): Promise<any[]> {
  switch (fileType) {
    case "csv":
      return parseAlipayCSV(fileBuffer);
    case "excel":
      return parseWechatExcel(fileBuffer);
    case "xml":
      return parseAlipayXML(fileBuffer);
    case "ics":
      return parseICS(fileBuffer);
    default:
      throw new Error(`不支持的文件类型: ${fileType}`);
  }
}
