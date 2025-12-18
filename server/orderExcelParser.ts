import * as XLSX from "xlsx";

export interface OrderExcelRow {
  销售人: string | null;
  流量来源: string | null;
  客户微信号: string | null;
  课程金额: number;
  首付金额: number;
  尾款金额: number;
  充值金额: number;
  账户余额: number;
  老师费用: number;
  车费: number;
  其他费用: number;
  合伙人费用: number;
  净收入: number;
  支付渠道: string | null;
  订单号: string | null;
  支付日期: string | null;
  支付时间: string | null;
  上课日期: string | null;
  上课时间: string | null;
  交付城市: string | null;
  交付教室: string | null;
  交付老师: string | null;
  交付课程: string | null;
  状态: string | null;
  置信度: number;
  备注: string | null;
  原始文本: string | null;
}

/**
 * 解析订单Excel文件
 * @param buffer Excel文件的Buffer
 * @returns 解析后的订单数据数组
 */
export async function parseOrderExcel(buffer: Buffer): Promise<OrderExcelRow[]> {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 将工作表转换为JSON数组
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    
    // 映射并清理数据
    const orders: OrderExcelRow[] = rawData.map((row) => ({
      销售人: parseString(row["销售人"]),
      流量来源: parseString(row["流量来源"]),
      客户微信号: parseString(row["客户微信号"]),
      课程金额: parseNumber(row["课程金额"]),
      首付金额: parseNumber(row["首付金额"]),
      尾款金额: parseNumber(row["尾款金额"]),
      充值金额: parseNumber(row["充值金额"]),
      账户余额: parseNumber(row["账户余额"]),
      老师费用: parseNumber(row["老师费用"]),
      车费: parseNumber(row["车费"]),
      其他费用: parseNumber(row["其他费用"]),
      合伙人费用: parseNumber(row["合伙人费用"]),
      净收入: parseNumber(row["净收入"]),
      支付渠道: parseString(row["支付渠道"]),
      订单号: parseString(row["订单号"]),
      支付日期: row["支付日期"] || null,
      支付时间: parseString(row["支付时间"]),
      上课日期: row["上课日期"] || null,
      上课时间: parseString(row["上课时间"]),
      交付城市: parseString(row["交付城市"]),
      交付教室: parseString(row["交付教室"]),
      交付老师: parseString(row["交付老师"]),
      交付课程: parseString(row["交付课程"]),
      状态: parseString(row["状态"]),
      置信度: parseNumber(row["置信度"]),
      备注: parseString(row["备注"]),
      原始文本: parseString(row["原始文本"]),
    }));
    
    return orders;
  } catch (error: any) {
    throw new Error(`Excel解析失败: ${error.message}`);
  }
}

/**
 * 解析字符串字段,处理NULL和类型转换
 */
function parseString(value: any): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value);
}

/**
 * 解析数字字段,处理各种可能的格式
 */
function parseNumber(value: any): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  
  if (typeof value === "number") {
    return value;
  }
  
  if (typeof value === "string") {
    // 移除逗号和空格
    const cleaned = value.replace(/[,\s]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
}

/**
 * 解析日期字段,支持多种格式
 */
export function parseDate(value: any): Date | null {
  if (!value) return null;
  
  try {
    // 如果是数字(浮点数)，如 1.24 表示 1月24日, 12.31 表示 12月31日
    if (typeof value === "number") {
      const currentYear = new Date().getFullYear();
      const month = Math.floor(value);
      const day = Math.round((value - month) * 100);
      
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(currentYear, month - 1, day);
      }
      return null;
    }
    
    // 如果是字符串
    if (typeof value === "string") {
      // 尝试直接解析
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // 尝试解析中文日期格式: 2024年12月18日
      const cnMatch = value.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      if (cnMatch) {
        return new Date(parseInt(cnMatch[1]), parseInt(cnMatch[2]) - 1, parseInt(cnMatch[3]));
      }
      
      // 尝试解析斜杠格式: 2024/12/18
      const slashMatch = value.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
      if (slashMatch) {
        return new Date(parseInt(slashMatch[1]), parseInt(slashMatch[2]) - 1, parseInt(slashMatch[3]));
      }
      
      // 尝试解析短横线格式: 2024-12-18
      const dashMatch = value.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (dashMatch) {
        return new Date(parseInt(dashMatch[1]), parseInt(dashMatch[2]) - 1, parseInt(dashMatch[3]));
      }
    }
    
    // 如果是Date对象
    if (value instanceof Date) {
      return value;
    }
    
    return null;
  } catch {
    return null;
  }
}
