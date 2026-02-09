import { getDb } from "./db";
import { users, teachers } from "../drizzle/schema";
import { eq, and, ne } from "drizzle-orm";

/**
 * 检查手机号是否已被使用（只检查users表）
 * @param phone 手机号
 * @param excludeUserId 排除的用户ID（用于编辑时排除当前用户）
 * @returns { isUnique: boolean, conflictType: 'user' | null, conflictId: number | null }
 */
export async function checkPhoneUnique(
  phone: string,
  excludeUserId?: number
): Promise<{
  isUnique: boolean;
  conflictType: "user" | null;
  conflictId: number | null;
  conflictName?: string;
}> {
  if (!phone || phone.trim() === "") {
    return { isUnique: true, conflictType: null, conflictId: null };
  }

  const db = await getDb();
  if (!db) {
    throw new Error("数据库连接失败");
  }

  // 只检查users表，teachers表不再存储手机号
  const userConditions = [eq(users.phone, phone)];
  if (excludeUserId) {
    userConditions.push(ne(users.id, excludeUserId));
  }

  const existingUsers = await db
    .select()
    .from(users)
    .where(and(...userConditions))
    .limit(1);

  if (existingUsers.length > 0) {
    return {
      isUnique: false,
      conflictType: "user",
      conflictId: existingUsers[0].id,
      conflictName: existingUsers[0].name || "未知用户",
    };
  }

  return { isUnique: true, conflictType: null, conflictId: null };
}
