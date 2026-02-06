/**
 * 前端统一时区工具函数
 * 所有时间统一使用北京时间（Asia/Shanghai, UTC+8）
 */

export const BEIJING_TIMEZONE = "Asia/Shanghai";

/**
 * 将日期格式化为北京时间的日期字符串 (YYYY/MM/DD 或 YYYY-MM-DD)
 */
export function formatDateBJ(date: Date | string | number | null | undefined, separator: string = "/"): string {
  if (!date) return "-";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("zh-CN", {
    timeZone: BEIJING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\//g, separator);
}

/**
 * 将日期格式化为北京时间的日期时间字符串 (YYYY/MM/DD HH:mm:ss)
 */
export function formatDateTimeBJ(date: Date | string | number | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
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
 * 将日期格式化为北京时间的短日期时间字符串 (YYYY/MM/DD HH:mm)
 */
export function formatDateTimeShortBJ(date: Date | string | number | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN", {
    timeZone: BEIJING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * 将日期格式化为北京时间的时间字符串 (HH:mm)
 */
export function formatTimeBJ(date: Date | string | number | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("zh-CN", {
    timeZone: BEIJING_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * 将日期格式化为北京时间的时间字符串 (HH:mm:ss)
 */
export function formatTimeFullBJ(date: Date | string | number | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("zh-CN", {
    timeZone: BEIJING_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * 获取北京时间的当前年份
 */
export function getYearBJ(): number {
  return parseInt(new Date().toLocaleString("zh-CN", { timeZone: BEIJING_TIMEZONE, year: "numeric" }));
}

/**
 * 获取北京时间的当前月份 (1-12)
 */
export function getMonthBJ(): number {
  return parseInt(new Date().toLocaleString("zh-CN", { timeZone: BEIJING_TIMEZONE, month: "numeric" }));
}

/**
 * 获取北京时间的今天日期字符串 (YYYY-MM-DD)
 */
export function todayBJ(): string {
  return formatDateBJ(new Date(), "-");
}

/**
 * 获取北京时间的本月第一天 (YYYY-MM-DD)
 */
export function startOfMonthBJ(): string {
  const now = new Date();
  const year = getYearBJ();
  const month = getMonthBJ();
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/**
 * 获取北京时间的本年第一天 (YYYY-MM-DD)
 */
export function startOfYearBJ(): string {
  return `${getYearBJ()}-01-01`;
}

/**
 * 将 ISO 字符串格式化为北京时间的相对时间描述
 * 例如："刚刚"、"5分钟前"、"2小时前"、"昨天"、"3天前"
 */
export function formatRelativeTimeBJ(date: Date | string | number | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return formatDateBJ(d);
}
