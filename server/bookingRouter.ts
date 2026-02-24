import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc.js";
import { getDb } from "./db.js";
import { classrooms, schedules, orders, orderItems, courses } from "../drizzle/schema.js";
import { eq, and, or, sql, inArray, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generateOrderNo } from "./orderNoGenerator.js";

export const bookingRouter = router({
  /**
   * 获取指定城市、时间段的可用教室
   * 按sortOrder优先级返回第一个可用的教室
   */
  getAvailableClassroom: publicProcedure
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

      const startTimestamp = `${date} ${startTime}:00`;
      const endTimestamp = `${date} ${endTime}:00`;

      // 获取该城市的所有教室（按sortOrder升序）
      const cityClassrooms = await db
        .select({
          id: classrooms.id,
          name: classrooms.name,
          sortOrder: classrooms.sortOrder,
          capacity: classrooms.capacity,
        })
        .from(classrooms)
        .where(and(
          eq(classrooms.cityId, cityId),
          eq(classrooms.isActive, true)
        ))
        .orderBy(asc(classrooms.sortOrder));

      if (cityClassrooms.length === 0) {
        return {
          success: true,
          data: null,
          message: '该城市暂无可用教室',
        };
      }

      // 遍历教室，找到第一个可用的
      for (const classroom of cityClassrooms) {
        // 检查该教室在该时间段的预约数量
        const bookings = await db
          .select({ id: schedules.id })
          .from(schedules)
          .where(and(
            eq(schedules.classroomId, classroom.id),
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

        // 如果预约数量小于教室容量，则该教室可用
        if (bookings.length < (classroom.capacity || 1)) {
          return {
            success: true,
            data: {
              id: classroom.id,
              name: classroom.name,
              sortOrder: classroom.sortOrder,
              capacity: classroom.capacity,
              currentBookings: bookings.length,
            },
          };
        }
      }

      // 所有教室都满了
      return {
        success: true,
        data: null,
        message: '该时间段所有教室已满',
      };
    }),

  /**
   * 创建预约
   * 支持多课程预约
   * 自动分配教室（如果未指定）
   * 创建schedules记录和orders记录
   */
  create: protectedProcedure
    .input(z.object({
      cityId: z.number().int().positive(),
      teacherId: z.number().int().positive(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
      startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:mm
      classroomId: z.number().int().positive().optional(), // 可选，不传则自动分配
      courseItems: z.array(z.object({
        courseId: z.number().int().positive(),
        quantity: z.number().int().positive().default(1),
        duration: z.number().positive(), // 课程时长(小时)
        price: z.number().positive(), // 课程单价
      })).min(1),
      customerNote: z.string().max(500).optional(), // 客户备注
    }))
    .mutation(async ({ ctx, input }) => {
      const { cityId, teacherId, date, startTime, classroomId, courseItems, customerNote } = input;
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // 1. 时间验证
      const now = new Date();
      const [hours, minutes] = startTime.split(':').map(Number);
      
      // 检查开始时间是否是整点或半点
      if (minutes !== 0 && minutes !== 30) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '开始时间必须是整点或半点（如10:00或10:30）',
        });
      }

      const bookingDateTime = new Date(`${date}T${startTime}:00`);
      
      // 检查是否是过去的时间
      if (bookingDateTime < now) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '不能预约过去的时间',
        });
      }

      // 检查是否距离当前时间至少2小时
      const minBookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      if (bookingDateTime < minBookingTime) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '预约时间必须在当前时间2小时之后',
        });
      }

      // 检查开始时间是否超过23:00
      if (hours >= 23) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '最晚可预约时间为23:00',
        });
      }

      // 2. 计算总时长和总价格
      const totalDuration = courseItems.reduce((sum, item) => sum + item.duration * item.quantity, 0);
      const totalPrice = courseItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const endDateTime = new Date(bookingDateTime.getTime() + totalDuration * 60 * 60 * 1000);
      const endTime = `${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}`;

      // 检查结束时间是否超过23:00
      if (endDateTime.getHours() >= 23 || (endDateTime.getHours() === 23 && endDateTime.getMinutes() > 0)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `课程结束时间（${endTime}）超过23:00，请调整预约时间或减少课程数量`,
        });
      }

      // 3. 自动分配教室（如果未指定）
      let finalClassroomId = classroomId;
      if (!finalClassroomId) {
        const availableClassrooms = await db
          .select()
          .from(classrooms)
          .where(and(
            eq(classrooms.cityId, cityId),
            eq(classrooms.isActive, true)
          ))
          .orderBy(asc(classrooms.sortOrder))
          .limit(1);
        
        const availableClassroom = availableClassrooms[0];

        if (!availableClassroom) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '该城市暂无可用教室',
          });
        }

        finalClassroomId = availableClassroom.id;
      }

      // 4. 检查教室是否可用
      const startTimestamp = `${date} ${startTime}:00`;
      const endTimestamp = `${date} ${endTime}:00`;

      const classroomBookings = await db
        .select({ id: schedules.id })
        .from(schedules)
        .where(and(
          eq(schedules.classroomId, finalClassroomId),
          or(
            and(
              sql`${schedules.startTime} <= ${startTimestamp}`,
              sql`${schedules.endTime} > ${startTimestamp}`
            ),
            and(
              sql`${schedules.startTime} < ${endTimestamp}`,
              sql`${schedules.endTime} >= ${endTimestamp}`
            ),
            and(
              sql`${schedules.startTime} >= ${startTimestamp}`,
              sql`${schedules.endTime} <= ${endTimestamp}`
            )
          )
        ));

      const classroomResult = await db
        .select()
        .from(classrooms)
        .where(eq(classrooms.id, finalClassroomId!))
        .limit(1);
      
      const classroom = classroomResult[0];

      if (classroomBookings.length >= (classroom?.capacity || 1)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '该教室在此时间段已满',
        });
      }

      // 5. 创建schedules记录
      const scheduleResult = await db.insert(schedules).values({
        customerId: ctx.user.id,
        customerName: ctx.user.name || '',
        teacherId,
        classroomId: finalClassroomId,
        courseType: courseItems.map(item => `课程${item.courseId}`).join(', '),
        classDate: new Date(date),
        classTime: `${startTime}-${endTime}`,
        startTime: new Date(startTimestamp),
        endTime: new Date(endTimestamp),
        city: '', // TODO: 从cityId查询城市名称
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const scheduleId = Number(scheduleResult[0].insertId);

      // 6. 创建 orders记录
      const orderNo = generateOrderNo();
      const orderResult = await db.insert(orders).values({
        orderNo,
        customerId: ctx.user.id,
        customerName: ctx.user.name || '',
        salesId: ctx.user.id, // 必需字段
        paymentAmount: totalPrice.toString(),
        courseAmount: totalPrice.toString(),
        classDate: new Date(date),
        classTime: `${startTime}-${endTime}`,
        status: 'pending',
        notes: customerNote || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const orderId = Number(orderResult[0].insertId);

      // 7. 创建order_items记录
      for (const item of courseItems) {
        await db.insert(orderItems).values({
          orderId,
          courseId: item.courseId,
          courseName: `课程${item.courseId}`, // TODO: 从 courses表查询课程名称
          quantity: item.quantity,
          price: item.price.toString(),
          subtotal: (item.price * item.quantity).toString(),
          duration: item.duration.toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return {
        success: true,
        data: {
          scheduleId,
          orderId,
          orderNo,
          classroomId: finalClassroomId,
          totalDuration,
          totalPrice,
          startTime,
          endTime,
        },
        message: '预约创建成功',
      };
    }),
});
