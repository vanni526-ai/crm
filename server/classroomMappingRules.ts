/**
 * 教室名称标准化映射规则
 * 
 * 用于Gmail导入时将非标准的教室名称映射到数据库中的标准教室名称
 */

/**
 * 教室映射规则接口
 */
export interface ClassroomMappingRule {
  /** 输入模式（支持正则表达式） */
  pattern: string | RegExp;
  /** 标准城市名 */
  standardCity: string;
  /** 标准教室名 */
  standardClassroom: string;
  /** 规则描述 */
  description: string;
}

/**
 * 上海教室映射规则
 * 长风是上海的街道名，需要映射到上海的标准教室
 */
const shanghaiClassroomRules: ClassroomMappingRule[] = [
  // 长风区域 + 房间号 → 上海标准教室
  {
    pattern: /^长风.*?(\d{3,4})$/,
    standardCity: "上海",
    standardClassroom: "上海$1", // $1 是捕获的房间号
    description: "长风区域教室映射（如：长风1101 → 上海1101）"
  },
  // 直接房间号 → 上海标准教室
  {
    pattern: /^(404|1101)$/,
    standardCity: "上海",
    standardClassroom: "上海$1",
    description: "上海房间号直接映射（如：404 → 上海404）"
  },
  // 404教室 / 1101教室 → 上海标准教室
  {
    pattern: /^(404|1101)教室$/,
    standardCity: "上海",
    standardClassroom: "上海$1",
    description: "上海教室名称映射（如：404教室 → 上海404）"
  },
  // 捕运大厦 → 上海办公楼
  {
    pattern: /^捕运大厦.*$/,
    standardCity: "上海",
    standardClassroom: "上海捕运大厦16D",
    description: "上海办公楼映射"
  }
];

/**
 * 其他城市教室映射规则
 * 当输入只有城市名或"城市+教室"时，映射到该城市的标准教室
 */
const cityClassroomRules: ClassroomMappingRule[] = [
  // 深圳
  {
    pattern: /^深圳(教室)?$/,
    standardCity: "深圳",
    standardClassroom: "深圳1309",
    description: "深圳教室映射（深圳/深圳教室 → 深圳1309）"
  },
  // 苏州
  {
    pattern: /^苏州(教室)?$/,
    standardCity: "苏州",
    standardClassroom: "苏州教室",
    description: "苏州教室映射"
  },
  // 郑州
  {
    pattern: /^郑州(教室)?$/,
    standardCity: "郑州",
    standardClassroom: "郑州教室",
    description: "郑州教室映射"
  },
  // 石家庄
  {
    pattern: /^石家庄(教室)?$/,
    standardCity: "石家庄",
    standardClassroom: "石家庄教室",
    description: "石家庄教室映射"
  },
  // 宁波
  {
    pattern: /^宁波(教室)?$/,
    standardCity: "宁波",
    standardClassroom: "宁波教室",
    description: "宁波教室映射"
  },
  // 济南
  {
    pattern: /^济南(教室)?$/,
    standardCity: "济南",
    standardClassroom: "济南教室",
    description: "济南教室映射"
  },
  // 无锡
  {
    pattern: /^无锡(教室)?$/,
    standardCity: "无锡",
    standardClassroom: "无锡教室",
    description: "无锡教室映射"
  },
  // 大连
  {
    pattern: /^大连(教室)?$/,
    standardCity: "大连",
    standardClassroom: "大连教室",
    description: "大连教室映射"
  },
  // 太原
  {
    pattern: /^太原(教室)?$/,
    standardCity: "太原",
    standardClassroom: "太原教室",
    description: "太原教室映射"
  },
  // 东莞
  {
    pattern: /^东莞(教室)?$/,
    standardCity: "东莞",
    standardClassroom: "东莞教室",
    description: "东莞教室映射"
  },
  // 南京
  {
    pattern: /^南京(教室)?$/,
    standardCity: "南京",
    standardClassroom: "南京教室",
    description: "南京教室映射"
  },
  // 武汉
  {
    pattern: /^武汉(教室)?$/,
    standardCity: "武汉",
    standardClassroom: "武汉教室",
    description: "武汉教室映射"
  },
  // 天津
  {
    pattern: /^天津(1501|教室|场|上)?$|^\(天津\)$/,
    standardCity: "天津",
    standardClassroom: "天津1501",
    description: "天津教室映射（天津/天津教室/天津1501/天津场/天津上/(天津) → 天津1501）"
  }
];

/**
 * 所有教室映射规则（按优先级排序）
 */
export const allClassroomMappingRules: ClassroomMappingRule[] = [
  ...shanghaiClassroomRules,
  ...cityClassroomRules
];

/**
 * 标准化教室名称
 * @param inputClassroom 输入的教室名称
 * @param inputCity 输入的城市名称（可选）
 * @returns 标准化后的 { city, classroom } 或 null（无法映射）
 */
export function standardizeClassroom(
  inputClassroom: string,
  inputCity?: string
): { city: string; classroom: string } | null {
  if (!inputClassroom) return null;

  const trimmedInput = inputClassroom.trim();

  // 遍历所有映射规则
  for (const rule of allClassroomMappingRules) {
    let matched = false;
    let standardClassroom = rule.standardClassroom;

    if (typeof rule.pattern === "string") {
      // 字符串精确匹配
      matched = trimmedInput === rule.pattern;
    } else {
      // 正则表达式匹配
      const match = trimmedInput.match(rule.pattern);
      if (match) {
        matched = true;
        // 替换捕获组（如 $1, $2）
        standardClassroom = rule.standardClassroom.replace(/\$(\d+)/g, (_, num) => {
          return match[parseInt(num)] || "";
        });
      }
    }

    if (matched) {
      return {
        city: rule.standardCity,
        classroom: standardClassroom
      };
    }
  }

  // 如果没有匹配到规则，但输入的教室名已经是标准格式（城市+教室），则直接返回
  if (inputCity && trimmedInput.startsWith(inputCity)) {
    return {
      city: inputCity,
      classroom: trimmedInput
    };
  }

  // 无法映射，返回null
  return null;
}

/**
 * 生成LLM prompt中的教室映射规则说明
 */
export function generateClassroomMappingPrompt(): string {
  const ruleDescriptions = allClassroomMappingRules.map((rule, index) => {
    return `   ${index + 1}. ${rule.description}`;
  });

  return `⚠️ 教室名称标准化规则（必须遵守）:
${ruleDescriptions.join('\n')}
   
   **重要提示**:
   - 如果教室名称包含区域名（如"长风"），需要识别出房间号并映射到标准城市
   - 如果只提到城市名（如"深圳"、"深圳教室"），需要映射到该城市的标准教室
   - 标准教室名称格式通常为"城市+房间号"或"城市+教室"
   - 如果无法确定标准教室名称，保留原始输入`;
}
