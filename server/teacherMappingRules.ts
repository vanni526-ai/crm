/**
 * 老师名称标准化映射规则
 * 
 * 用于Gmail导入和数据清洗时将非标准的老师名称映射到数据库中的标准老师名称
 */

import { getDb } from "./db";
import { teachers } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * 老师名称映射缓存
 * key: 别名（小写）
 * value: 标准老师名称
 */
let teacherAliasCache: Map<string, string> | null = null;

/**
 * 初始化老师别名缓存
 * 从数据库中读取所有活跃老师的名称和别名，构建映射表
 */
async function initTeacherAliasCache(): Promise<void> {
  const database = await getDb();
  if (!database) {
    throw new Error("数据库连接失败");
  }

  const allTeachers = await database
    .select({
      name: teachers.name,
      aliases: teachers.aliases,
    })
    .from(teachers)
    .where(eq(teachers.isActive, true));

  teacherAliasCache = new Map();

  for (const teacher of allTeachers) {
    const standardName = teacher.name;
    
    // 添加标准名称到缓存（自映射）
    teacherAliasCache.set(standardName.toLowerCase(), standardName);

    // 添加别名到缓存
    if (teacher.aliases) {
      const aliases = teacher.aliases.split(",").map((a) => a.trim());
      for (const alias of aliases) {
        if (alias) {
          teacherAliasCache.set(alias.toLowerCase(), standardName);
        }
      }
    }
  }
}

/**
 * 标准化老师名称
 * 
 * @param teacherName 输入的老师名称（可能是别名）
 * @returns 标准化后的老师名称，如果无法识别则返回null
 */
export async function standardizeTeacherName(
  teacherName: string | null | undefined
): Promise<string | null> {
  if (!teacherName || !teacherName.trim()) {
    return null;
  }

  // 初始化缓存（如果还未初始化）
  if (!teacherAliasCache) {
    await initTeacherAliasCache();
  }

  const normalized = teacherName.trim().toLowerCase();
  
  // 从缓存中查找标准名称
  const standardName = teacherAliasCache!.get(normalized);
  
  return standardName || null;
}

/**
 * 生成老师名称映射提示（用于LLM prompt）
 * 
 * @returns 老师名称映射规则的文本描述
 */
export async function generateTeacherMappingPrompt(): Promise<string> {
  // 初始化缓存（如果还未初始化）
  if (!teacherAliasCache) {
    await initTeacherAliasCache();
  }

  const lines: string[] = [
    "### 老师名称映射规则",
    "",
    "以下是系统中的标准老师名称及其别名，请在解析时使用标准名称：",
    "",
  ];

  // 按标准名称分组
  const teacherGroups = new Map<string, Set<string>>();
  
  for (const [alias, standardName] of Array.from(teacherAliasCache!.entries())) {
    if (!teacherGroups.has(standardName)) {
      teacherGroups.set(standardName, new Set());
    }
    teacherGroups.get(standardName)!.add(alias);
  }

  // 生成映射规则文本
  for (const [standardName, aliases] of Array.from(teacherGroups.entries())) {
    const aliasesArray = Array.from(aliases).filter((a) => a !== standardName.toLowerCase());
    if (aliasesArray.length > 0) {
      lines.push(`- "${aliasesArray.join('", "')}" → "${standardName}"`);
    } else {
      lines.push(`- "${standardName}" (标准名称)`);
    }
  }

  return lines.join("\n");
}

/**
 * 清除缓存（用于测试或数据更新后重新加载）
 */
export function clearTeacherAliasCache(): void {
  teacherAliasCache = null;
}
