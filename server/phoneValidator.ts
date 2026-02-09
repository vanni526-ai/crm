import { getDb } from "./db";
import { users, teachers } from "../drizzle/schema";
import { eq, and, ne } from "drizzle-orm";

/**
 * 检查手机号是否已被使用
 * @param phone 手机号
 * @param excludeUserId 排除的用户ID（用于编辑时排除当前用户）
 * @param excludeTeacherId 排除的老师ID（用于编辑时排除当前老师）
 * @returns { isUnique: boolean, conflictType: 'user' | 'teacher' | null, conflictId: number | null }
 */
export async function checkPhoneUnique(
  phone: string,
  excludeUserId?: number,
  excludeTeacherId?: number
): Promise<{
  isUnique: boolean;
  conflictType: "user" | "teacher" | null;
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

  // 检查users表
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

  // 检查teachers表
  const teacherConditions = [eq(teachers.phone, phone)];
  if (excludeTeacherId) {
    teacherConditions.push(ne(teachers.id, excludeTeacherId));
  }

  const existingTeachers = await db
    .select()
    .from(teachers)
    .where(and(...teacherConditions))
    .limit(1);

  if (existingTeachers.length > 0) {
    return {
      isUnique: false,
      conflictType: "teacher",
      conflictId: existingTeachers[0].id,
      conflictName: existingTeachers[0].name || "未知老师",
    };
  }

  return { isUnique: true, conflictType: null, conflictId: null };
}
