/**
 * 流量来源数据清洗工具函数
 */

/**
 * 流量来源别名映射配置
 */
export interface TrafficSourceAlias {
  pattern: string; // 匹配模式(支持正则)
  standardName: string; // 标准名称
}

/**
 * 标准化流量来源名称
 * 1. 移除时间段信息(如"(11-20点 周天周一休息)")
 * 2. 应用别名映射
 */
export function normalizeTrafficSource(
  rawSource: string,
  aliases: TrafficSourceAlias[] = []
): string {
  if (!rawSource) return "";

  let normalized = rawSource;

  // 1. 移除时间段信息
  // 匹配模式: (11-20点)、（11-20点 周天周一休息）、11:00-20:00等
  normalized = normalized
    .replace(/[（(]\s*\d{1,2}[:：-]\d{1,2}[点时]?.*?[）)]/g, "") // 移除括号内的时间段
    .replace(/\s+\d{1,2}[:：]\d{2}\s*-\s*\d{1,2}[:：]\d{2}\s*$/g, "") // 移除末尾的时间范围
    .trim();

  // 2. 应用别名映射
  for (const alias of aliases) {
    try {
      const regex = new RegExp(alias.pattern, "i");
      if (regex.test(normalized)) {
        normalized = alias.standardName;
        break;
      }
    } catch (e) {
      // 如果正则表达式无效,尝试精确匹配
      if (normalized === alias.pattern) {
        normalized = alias.standardName;
        break;
      }
    }
  }

  return normalized;
}

/**
 * 批量标准化流量来源
 */
export function batchNormalizeTrafficSource(
  sources: string[],
  aliases: TrafficSourceAlias[] = []
): string[] {
  return sources.map((source) => normalizeTrafficSource(source, aliases));
}

/**
 * 提取所有唯一的流量来源(已标准化)
 */
export function extractUniqueTrafficSources(
  sources: string[],
  aliases: TrafficSourceAlias[] = []
): string[] {
  const normalized = batchNormalizeTrafficSource(sources, aliases);
  return Array.from(new Set(normalized)).filter((s) => s !== "");
}
