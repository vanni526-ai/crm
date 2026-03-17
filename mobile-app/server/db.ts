import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { Course, courses, InsertCourse, InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * 获取课程列表
 * @param status 课程状态过滤
 * @param teacherId 老师ID过滤（用于获取已接单课程）
 */
export async function getCourses(status?: string, teacherId?: number): Promise<Course[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get courses: database not available");
    return [];
  }

  try {
    let query = db.select().from(courses);

    const conditions = [];
    if (status) {
      conditions.push(eq(courses.status, status as any));
    }
    if (teacherId) {
      conditions.push(eq(courses.teacherId, teacherId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query;
    return result;
  } catch (error) {
    console.error("[Database] Failed to get courses:", error);
    throw error;
  }
}

/**
 * 根据ID获取课程详情
 */
export async function getCourseById(id: number): Promise<Course | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get course: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get course:", error);
    throw error;
  }
}

/**
 * 老师接单
 * @param courseId 课程ID
 * @param teacherId 老师ID
 * @param teacherName 老师姓名
 */
export async function acceptCourse(
  courseId: number,
  teacherId: number,
  teacherName: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot accept course: database not available");
    return false;
  }

  try {
    // 检查课程是否存在且状态为 pending
    const course = await getCourseById(courseId);
    if (!course || course.status !== "pending") {
      return false;
    }

    // 更新课程状态为 accepted
    await db
      .update(courses)
      .set({
        status: "accepted",
        teacherId,
        teacherName,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, courseId));

    return true;
  } catch (error) {
    console.error("[Database] Failed to accept course:", error);
    throw error;
  }
}

/**
 * 创建课程（用于测试）
 */
export async function createCourse(course: InsertCourse): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create course: database not available");
    return 0;
  }

  try {
    const result = await db.insert(courses).values(course);
    return Number(result[0].insertId);
  } catch (error) {
    console.error("[Database] Failed to create course:", error);
    throw error;
  }
}
