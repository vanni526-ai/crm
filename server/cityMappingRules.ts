/**
 * 城市名称标准化映射规则
 * 
 * 用于Gmail导入和数据清洗时将非标准的城市名称映射到数据库中的标准城市名称
 */

import { getDb } from "./db";
import { cities } from "../drizzle/schema";

/**
 * 城市名称映射规则接口
 */
export interface CityMappingRule {
  /** 输入模式（支持正则表达式） */
  pattern: string | RegExp;
  /** 标准城市名 */
  standardCity: string;
  /** 规则描述 */
  description: string;
}

/**
 * 城市名称缓存
 */
let cityNamesCache: Set<string> | null = null;

/**
 * 初始化城市名称缓存
 * 从数据库中读取所有城市名称
 */
async function initCityNamesCache(): Promise<void> {
  const database = await getDb();
  if (!database) {
    throw new Error("数据库连接失败");
  }

  const allCities = await database
    .select({
      name: cities.name,
    })
    .from(cities);

  cityNamesCache = new Set(allCities.map((c) => c.name));
}

/**
 * 城市名称映射规则
 * 处理常见的城市简称和别名
 */
const cityAliasRules: CityMappingRule[] = [
  // 北京
  {
    pattern: /^(北京|BJ|bj|beijing)$/i,
    standardCity: "北京",
    description: "北京简称映射"
  },
  // 上海
  {
    pattern: /^(上海|SH|sh|shanghai)$/i,
    standardCity: "上海",
    description: "上海简称映射"
  },
  // 深圳
  {
    pattern: /^(深圳|SZ|sz|shenzhen)$/i,
    standardCity: "深圳",
    description: "深圳简称映射"
  },
  // 广州
  {
    pattern: /^(广州|GZ|gz|guangzhou)$/i,
    standardCity: "广州",
    description: "广州简称映射"
  },
  // 杭州
  {
    pattern: /^(杭州|HZ|hz|hangzhou)$/i,
    standardCity: "杭州",
    description: "杭州简称映射"
  },
  // 成都
  {
    pattern: /^(成都|CD|cd|chengdu)$/i,
    standardCity: "成都",
    description: "成都简称映射"
  },
  // 武汉
  {
    pattern: /^(武汉|WH|wh|wuhan)$/i,
    standardCity: "武汉",
    description: "武汉简称映射"
  },
  // 西安
  {
    pattern: /^(西安|XA|xa|xian)$/i,
    standardCity: "西安",
    description: "西安简称映射"
  },
  // 南京
  {
    pattern: /^(南京|NJ|nj|nanjing)$/i,
    standardCity: "南京",
    description: "南京简称映射"
  },
  // 天津
  {
    pattern: /^(天津|TJ|tj|tianjin)$/i,
    standardCity: "天津",
    description: "天津简称映射"
  },
  // 重庆
  {
    pattern: /^(重庆|CQ|cq|chongqing)$/i,
    standardCity: "重庆",
    description: "重庆简称映射"
  },
  // 苏州
  {
    pattern: /^(苏州|SZ|sz|suzhou)$/i,
    standardCity: "苏州",
    description: "苏州简称映射"
  },
  // 郑州
  {
    pattern: /^(郑州|ZZ|zz|zhengzhou)$/i,
    standardCity: "郑州",
    description: "郑州简称映射"
  },
  // 石家庄
  {
    pattern: /^(石家庄|SJZ|sjz|shijiazhuang)$/i,
    standardCity: "石家庄",
    description: "石家庄简称映射"
  },
  // 宁波
  {
    pattern: /^(宁波|NB|nb|ningbo)$/i,
    standardCity: "宁波",
    description: "宁波简称映射"
  },
  // 济南
  {
    pattern: /^(济南|JN|jn|jinan)$/i,
    standardCity: "济南",
    description: "济南简称映射"
  },
];

/**
 * 标准化城市名称
 * 
 * @param cityName 输入的城市名称（可能是简称或别名）
 * @returns 标准化后的城市名称，如果无法识别则返回null
 */
export async function standardizeCityName(
  cityName: string | null | undefined
): Promise<string | null> {
  if (!cityName || !cityName.trim()) {
    return null;
  }

  // 初始化缓存（如果还未初始化）
  if (!cityNamesCache) {
    await initCityNamesCache();
  }

  const trimmed = cityName.trim();

  // 1. 检查是否已经是标准城市名
  if (cityNamesCache!.has(trimmed)) {
    return trimmed;
  }

  // 2. 尝试使用映射规则
  for (const rule of cityAliasRules) {
    if (typeof rule.pattern === "string") {
      if (trimmed === rule.pattern) {
        // 验证标准城市名是否在数据库中
        if (cityNamesCache!.has(rule.standardCity)) {
          return rule.standardCity;
        }
      }
    } else {
      // RegExp pattern
      if (rule.pattern.test(trimmed)) {
        // 验证标准城市名是否在数据库中
        if (cityNamesCache!.has(rule.standardCity)) {
          return rule.standardCity;
        }
      }
    }
  }

  // 3. 无法识别
  return null;
}

/**
 * 生成城市名称映射提示（用于LLM prompt）
 * 
 * @returns 城市名称映射规则的文本描述
 */
export async function generateCityMappingPrompt(): Promise<string> {
  // 初始化缓存（如果还未初始化）
  if (!cityNamesCache) {
    await initCityNamesCache();
  }

  const lines: string[] = [
    "### 城市名称映射规则",
    "",
    "以下是系统中的标准城市名称，请在解析时使用标准名称：",
    "",
  ];

  // 添加标准城市列表
  lines.push(`标准城市列表：${Array.from(cityNamesCache!).join("、")}`);
  lines.push("");

  // 添加常见简称映射
  lines.push("常见简称和别名映射：");
  for (const rule of cityAliasRules) {
    lines.push(`- ${rule.description}: ${rule.pattern} → ${rule.standardCity}`);
  }

  return lines.join("\n");
}

/**
 * 清除缓存（用于测试或数据更新后重新加载）
 */
export function clearCityNamesCache(): void {
  cityNamesCache = null;
}
