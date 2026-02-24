import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc.js";
import { getDb } from "./db.js";
import { users, userRoleCities, schedules, teacherUnavailability } from "../drizzle/schema.js";
import { eq, and, or, sql, gte, lte, inArray } from "drizzle-orm";

export const teachersRouter = router({
  /**
   * 获取指定城市、时间段内可用的老师列表
   * 过滤条件：
   * 1. 老师角色包含"teacher"
   * 2. 老师关联的城市包含指定城市
   * 3. 老师在指定时间段内没有其他预约
   * 4. 老师没有设置该时间段为"不接客"
   */
  getAvailable: publicProcedure
    .input(z.object({
      cityId: z.number().int().positive(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
      startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:mm
      duration: z.number().positive(), // 课程时长(小时)
    }))
    .query(async ({ input }) => {
      const { cityId, date, startTime, duration } = input;
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // 计算结束时间
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDateTime = new Date(`${date}T${startTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 60 * 1000);
      const endTime = `${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}`;

      // 1. 查找该城市的所有老师
      const cityTeachers = await db
        .select({
          userId: userRoleCities.userId,
        })
        .from(userRoleCities)
        .where(and(
          eq(userRoleCities.role, 'teacher'),
          sql`JSON_CONTAINS(${userRoleCities.cities}, ${JSON.stringify([cityId.toString()])})`
        ));

      const teacherIds = cityTeachers.map(t => t.userId);
      if (teacherIds.length === 0) {
        return { success: true, data: [] };
      }

      // 2. 查找在该时间段有预约的老师（检查schedules表）
      const startTimestamp = `${date} ${startTime}:00`;
      const endTimestamp = `${date} ${endTime}:00`;
      
      const busyTeachers = await db
        .select({
          teacherId: schedules.teacherId,
        })
        .from(schedules)
        .where(and(
          inArray(schedules.teacherId, teacherIds),
          or(
            // 新预约开始时间在现有预约时间段内
            and(
              sql`${schedules.startTime} <= ${startTimestamp}`,
              sql`${schedules.endTime} > ${startTimestamp}`
            ),
            // 新预约结束时间在现有预约时间段内
            and(
              sql`${schedules.startTime} < ${endTimestamp}`,
              sql`${schedules.endTime} >= ${endTimestamp}`
            ),
            // 新预约完全包含现有预约
            and(
              sql`${schedules.startTime} >= ${startTimestamp}`,
              sql`${schedules.endTime} <= ${endTimestamp}`
            )
          )
        ));

      const busyTeacherIds = busyTeachers.map(t => t.teacherId).filter((id): id is number => id !== null);

      // 3. 查找在该时间段设置了"不接客"的老师
      const unavailableTeachers = await db
        .select({
          teacherId: teacherUnavailability.teacherId,
        })
        .from(teacherUnavailability)
        .where(and(
          inArray(teacherUnavailability.teacherId, teacherIds),
          or(
            // 不接客时段与预约时段有重叠
            and(
              lte(teacherUnavailability.startTime, sql`TIMESTAMP(${date}, ${startTime})`),
              gte(teacherUnavailability.endTime, sql`TIMESTAMP(${date}, ${startTime})`)
            ),
            and(
              lte(teacherUnavailability.startTime, sql`TIMESTAMP(${date}, ${endTime})`),
              gte(teacherUnavailability.endTime, sql`TIMESTAMP(${date}, ${endTime})`)
            )
          )
        ));

      const unavailableTeacherIds = unavailableTeachers.map(t => t.teacherId);

      // 4. 过滤出可用的老师ID
      const availableTeacherIds = teacherIds.filter(
        id => !busyTeacherIds.includes(id) && !unavailableTeacherIds.includes(id)
      );

      if (availableTeacherIds.length === 0) {
        return { success: true, data: [] };
      }

      // 5. 查询可用老师的详细信息
      const availableTeachers = await db
        .select({
          id: users.id,
          name: users.name,
          nickname: users.nickname,
          avatarUrl: users.avatarUrl,
          teacherAttribute: users.teacherAttribute,
          hourlyRate: users.hourlyRate,
        })
        .from(users)
        .where(and(
          inArray(users.id, availableTeacherIds),
          eq(users.isActive, true)
        ));

      return {
        success: true,
        data: availableTeachers,
      };
    }),
});
