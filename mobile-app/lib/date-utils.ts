/**
 * Date and time utility functions for formatting timestamps
 */

/**
 * Format options for Beijing time display
 */
export type DateFormatType = 
  | 'full'           // 2024/2/6 18:30:45
  | 'datetime'       // 2024/2/6 18:30
  | 'date'           // 2024/2/6
  | 'time'           // 18:30:45
  | 'short-time'     // 18:30
  | 'chinese-full'   // 2024年2月6日 18:30:45
  | 'chinese-date'   // 2024年2月6日
  | 'relative';      // 刚刚 / 5分钟前 / 今天 18:30 / 昨天 18:30 / 2024/2/6

/**
 * Convert UTC timestamp to Beijing time string
 * 
 * @param timestamp - UTC timestamp (number or ISO string)
 * @param format - Display format type (default: 'datetime')
 * @returns Formatted Beijing time string
 * 
 * @example
 * ```ts
 * formatBeijingTime(1707217845000) // "2024/2/6 18:30"
 * formatBeijingTime('2024-02-06T10:30:45Z', 'full') // "2024/2/6 18:30:45"
 * formatBeijingTime(Date.now(), 'chinese-date') // "2024年2月6日"
 * ```
 */
export function formatBeijingTime(
  timestamp: number | string,
  format: DateFormatType = 'datetime'
): string {
  const date = new Date(timestamp);
  
  // Check for invalid date
  if (isNaN(date.getTime())) {
    return '无效时间';
  }

  // Get Beijing time components using proper timezone conversion
  const beijingDateStr = date.toLocaleString('en-US', { 
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parse the formatted string to get components
  // Format: "MM/DD/YYYY, HH:MM:SS"
  const [datePart, timePart] = beijingDateStr.split(', ');
  const [month, day, year] = datePart.split('/').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  
  // Now we have the Beijing time components directly from parsing

  // Format helpers
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${year}/${month}/${day}`;
  const timeStr = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const shortTimeStr = `${pad(hours)}:${pad(minutes)}`;
  const chineseDateStr = `${year}年${month}月${day}日`;

  switch (format) {
    case 'full':
      return `${dateStr} ${timeStr}`;
    
    case 'datetime':
      return `${dateStr} ${shortTimeStr}`;
    
    case 'date':
      return dateStr;
    
    case 'time':
      return timeStr;
    
    case 'short-time':
      return shortTimeStr;
    
    case 'chinese-full':
      return `${chineseDateStr} ${timeStr}`;
    
    case 'chinese-date':
      return chineseDateStr;
    
    case 'relative':
      // Create a Date object for relative time calculation
      const beijingDateObj = new Date(year, month - 1, day, hours, minutes, seconds);
      return formatRelativeTime(beijingDateObj);
    
    default:
      return `${dateStr} ${shortTimeStr}`;
  }
}

/**
 * Format time as relative string (e.g., "刚刚", "5分钟前", "今天 18:30")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  // 刚刚 (within 1 minute)
  if (diffMinutes < 1) {
    return '刚刚';
  }

  // X分钟前 (within 1 hour)
  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  }

  // X小时前 (within 24 hours)
  if (diffHours < 24 && now.getDate() === date.getDate()) {
    return `${diffHours}小时前`;
  }

  // 今天 HH:mm (same day)
  if (now.getDate() === date.getDate() && 
      now.getMonth() === date.getMonth() && 
      now.getFullYear() === date.getFullYear()) {
    return `今天 ${timeStr}`;
  }

  // 昨天 HH:mm (yesterday)
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.getDate() === date.getDate() && 
      yesterday.getMonth() === date.getMonth() && 
      yesterday.getFullYear() === date.getFullYear()) {
    return `昨天 ${timeStr}`;
  }

  // YYYY/M/D (older dates)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * Get current Beijing time as Date object
 */
export function getBeijingTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
}

/**
 * Check if a date is today (Beijing time)
 */
export function isToday(timestamp: number | string): boolean {
  const date = new Date(timestamp);
  const now = getBeijingTime();
  
  return date.getDate() === now.getDate() &&
         date.getMonth() === now.getMonth() &&
         date.getFullYear() === now.getFullYear();
}

/**
 * Check if a date is within the last N days (Beijing time)
 */
export function isWithinDays(timestamp: number | string, days: number): boolean {
  const date = new Date(timestamp);
  const now = getBeijingTime();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  
  return diffDays >= 0 && diffDays <= days;
}
