/**
 * 统一时区工具函数
 * 所有时间统一使用北京时间（Asia/Shanghai, UTC+8）
 */

export const BEIJING_TIMEZONE = "Asia/Shanghai";
export const BEIJING_OFFSET_HOURS = 8;
export const BEIJING_OFFSET_MS = BEIJING_OFFSET_HOURS * 60 * 60 * 1000;

/**
 * 获取当前北京时间的 Date 对象
 * 注意：返回的 Date 对象内部仍然是 UTC，但其值对应北京时间的时刻
 */
export function nowBeijing(): Date {
  return new Date();
}

/**
 * 将日期格式化为北京时间的日期字符串 (YYYY-MM-DD)
 */
export function formatDateBeijing(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("zh-CN", { timeZone: BEIJING_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-");
}

/**
 * 将日期格式化为北京时间的日期时间字符串 (YYYY-MM-DD HH:mm:ss)
 */
export function formatDateTimeBeijing(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN", {
    timeZone: BEIJING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * 将日期格式化为北京时间的短日期字符串 (MM/DD)
 */
export function formatShortDateBeijing(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("zh-CN", { timeZone: BEIJING_TIMEZONE, month: "2-digit", day: "2-digit" });
}

/**
 * 将日期格式化为北京时间的时间字符串 (HH:mm)
 */
export function formatTimeBeijing(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("zh-CN", { timeZone: BEIJING_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false });
}

/**
 * 获取北京时间的今天日期字符串 (YYYY-MM-DD)
 */
export function todayBeijing(): string {
  return formatDateBeijing(new Date());
}

/**
 * 获取北京时间的本月第一天日期字符串 (YYYY-MM-DD)
 */
export function startOfMonthBeijing(date?: Date): string {
  const d = date || new Date();
  const bjStr = d.toLocaleString("zh-CN", { timeZone: BEIJING_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = bjStr.split("/");
  return `${parts[0]}-${parts[1]}-01`;
}

/**
 * 获取北京时间的年份
 */
export function getYearBeijing(date?: Date): number {
  const d = date || new Date();
  return parseInt(d.toLocaleString("zh-CN", { timeZone: BEIJING_TIMEZONE, year: "numeric" }));
}

/**
 * 获取北京时间的月份 (1-12)
 */
export function getMonthBeijing(date?: Date): number {
  const d = date || new Date();
  return parseInt(d.toLocaleString("zh-CN", { timeZone: BEIJING_TIMEZONE, month: "numeric" }));
}

/**
 * 获取北京时间的日期 (1-31)
 */
export function getDayBeijing(date?: Date): number {
  const d = date || new Date();
  return parseInt(d.toLocaleString("zh-CN", { timeZone: BEIJING_TIMEZONE, day: "numeric" }));
}

/**
 * 将 ISO 日期字符串转换为北京时间显示的日期字符串
 * 用于前端展示
 */
export function toBeijingDisplay(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  return formatDateBeijing(isoString);
}

/**
 * 将 ISO 日期时间字符串转换为北京时间显示的日期时间字符串
 * 用于前端展示
 */
export function toBeijingDateTimeDisplay(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  return formatDateTimeBeijing(isoString);
}

/**
 * 获取北京时间的 ISO 日期字符串 (YYYY-MM-DD)
 * 用于数据库查询和存储
 */
export function toBeijingDateStr(date: Date): string {
  return formatDateBeijing(date);
}
