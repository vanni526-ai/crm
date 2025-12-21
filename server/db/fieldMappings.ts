import { getDb } from "../db";
import { fieldMappings, InsertFieldMapping } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * 获取所有字段映射配置
 */
export async function getAllFieldMappings(type?: "salesperson_alias" | "city_code" | "teacher_alias" | "course_alias") {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  if (type) {
    return db.select().from(fieldMappings).where(eq(fieldMappings.type, type));
  }

  return db.select().from(fieldMappings);
}

/**
 * 创建字段映射配置
 */
export async function createFieldMapping(data: InsertFieldMapping) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const [result] = await db.insert(fieldMappings).values(data);
  return result;
}

/**
 * 更新字段映射配置
 */
export async function updateFieldMapping(id: number, data: Partial<InsertFieldMapping>) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  await db.update(fieldMappings).set(data).where(eq(fieldMappings.id, id));
}

/**
 * 删除字段映射配置
 */
export async function deleteFieldMapping(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  await db.delete(fieldMappings).where(eq(fieldMappings.id, id));
}

/**
 * 根据类型和原始值查找映射
 */
export async function findFieldMapping(type: string, sourceValue: string) {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db
    .select()
    .from(fieldMappings)
    .where(
      and(
        eq(fieldMappings.type, type as any),
        eq(fieldMappings.sourceValue, sourceValue),
        eq(fieldMappings.isActive, true)
      )
    )
    .limit(1);

  return result || null;
}
