import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc.js";
import { getDb } from "./db.js";
import { classrooms } from "../drizzle/schema.js";
import { eq, and, asc } from "drizzle-orm";

export const classroomsRouter = router({
  /**
   * 获取指定城市的教室列表
   * 按sortOrder升序排列（用于教室分配的优先级）
   */
  list: publicProcedure
    .input(z.object({
      cityId: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      const { cityId } = input;
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const result = await db
        .select({
          id: classrooms.id,
          name: classrooms.name,
          sortOrder: classrooms.sortOrder,
          capacity: classrooms.capacity,
          address: classrooms.address,
          isActive: classrooms.isActive,
        })
        .from(classrooms)
        .where(and(
          eq(classrooms.cityId, cityId),
          eq(classrooms.isActive, true)
        ))
        .orderBy(asc(classrooms.sortOrder));

      return {
        success: true,
        data: result,
      };
    }),
});
