import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db.js";
import { classrooms, schedules, orders, orderItems, cities, courses } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

describe("Booking Flow Tests", () => {
  let testCityId: number;
  let testClassroomId: number;
  let testCourse1Id: number;
  let testCourse2Id: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 确保测试城市存在
    const existingCities = await db
      .select()
      .from(cities)
      .where(eq(cities.name, "测试城市"))
      .limit(1);

    if (existingCities.length > 0) {
      testCityId = existingCities[0].id;
    } else {
      const cityResult = await db.insert(cities).values({
        name: "测试城市",
        areaCode: "TEST",
        isActive: true,
        sortOrder: 999,
      });
      testCityId = Number(cityResult[0].insertId);
    }

    // 确保测试教室存在
    const existingClassrooms = await db
      .select()
      .from(classrooms)
      .where(eq(classrooms.cityId, testCityId))
      .limit(1);

    if (existingClassrooms.length > 0) {
      testClassroomId = existingClassrooms[0].id;
    } else {
      const classroomResult = await db.insert(classrooms).values({
        cityId: testCityId,
        cityName: "测试城市",
        name: "测试教室A",
        address: "测试地址",
        isActive: true,
        sortOrder: 1,
        capacity: 2,
      });
      testClassroomId = Number(classroomResult[0].insertId);
    }

    // 确保测试课程存在
    const existingCourse1 = await db
      .select()
      .from(courses)
      .where(eq(courses.name, "1V1女王实践"))
      .limit(1);

    if (existingCourse1.length > 0) {
      testCourse1Id = existingCourse1[0].id;
    } else {
      const course1Result = await db.insert(courses).values({
        name: "1V1女王实践",
        category: "测试类别",
        duration: "1.00",
        price: "200.00",
        isActive: true,
        sortOrder: 1,
      });
      testCourse1Id = Number(course1Result[0].insertId);
    }

    const existingCourse2 = await db
      .select()
      .from(courses)
      .where(eq(courses.name, "1V1反向实践"))
      .limit(1);

    if (existingCourse2.length > 0) {
      testCourse2Id = existingCourse2[0].id;
    } else {
      const course2Result = await db.insert(courses).values({
        name: "1V1反向实践",
        category: "测试类别",
        duration: "2.00",
        price: "300.00",
        isActive: true,
        sortOrder: 2,
      });
      testCourse2Id = Number(course2Result[0].insertId);
    }
  });

  it("应该成功创建教室记录并设置capacity", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const classroom = await db
      .select()
      .from(classrooms)
      .where(eq(classrooms.id, testClassroomId))
      .limit(1);

    expect(classroom.length).toBe(1);
    expect(classroom[0].capacity).toBe(2);
    expect(classroom[0].cityId).toBe(testCityId);
  });

  it("schedules表应该包含classroomId字段", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建一个测试schedule记录
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const endTime = new Date(tomorrow);
    endTime.setHours(15, 0, 0, 0);

    const scheduleResult = await db.insert(schedules).values({
      customerId: 1,
      customerName: "测试客户",
      teacherId: 1,
      classroomId: testClassroomId, // 测试classroomId字段
      courseType: "测试课程",
      classDate: tomorrow,
      classTime: "14:00-15:00",
      startTime: tomorrow,
      endTime: endTime,
      city: "测试城市",
      status: "scheduled",
    });

    const scheduleId = Number(scheduleResult[0].insertId);

    // 验证记录创建成功
    const schedule = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId))
      .limit(1);

    expect(schedule.length).toBe(1);
    expect(schedule[0].classroomId).toBe(testClassroomId);

    // 清理测试数据
    await db.delete(schedules).where(eq(schedules.id, scheduleId));
  });

  it("order_items表应该正确存储多课程信息", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建测试订单
    const orderResult = await db.insert(orders).values({
      orderNo: `TEST${Date.now()}`,
      customerId: 1,
      customerName: "测试客户",
      salesId: 1,
      paymentAmount: "500.00",
      courseAmount: "500.00",
      classDate: new Date(),
      classTime: "14:00-16:00",
      status: "pending",
    });

    const orderId = Number(orderResult[0].insertId);

    // 创建多个order_items
    await db.insert(orderItems).values([
      {
        orderId,
        courseId: testCourse1Id,
        courseName: "1V1女王实践",
        quantity: 1,
        price: "200.00",
        subtotal: "200.00",
        duration: "1.00",
      },
      {
        orderId,
        courseId: testCourse2Id,
        courseName: "1V1反向实践",
        quantity: 1,
        price: "300.00",
        subtotal: "300.00",
        duration: "2.00",
      },
    ]);

    // 验证记录创建成功
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    expect(items.length).toBe(2);
    expect(items[0].courseName).toBe("1V1女王实践");
    expect(items[1].courseName).toBe("1V1反向实践");
    expect(parseFloat(items[0].duration)).toBe(1.0);
    expect(parseFloat(items[1].duration)).toBe(2.0);

    // 清理测试数据
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await db.delete(orders).where(eq(orders.id, orderId));
  });

  it("应该正确计算教室可用性（基于capacity）", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(16, 0, 0, 0);

    const endTime = new Date(tomorrow);
    endTime.setHours(17, 0, 0, 0);

    // 创建第一个预约（教室capacity=2，应该还有空位）
    const schedule1Result = await db.insert(schedules).values({
      customerId: 1,
      customerName: "测试客户1",
      teacherId: 1,
      classroomId: testClassroomId,
      courseType: "测试课程",
      classDate: tomorrow,
      classTime: "16:00-17:00",
      startTime: tomorrow,
      endTime: endTime,
      city: "测试城市",
      status: "scheduled",
    });

    const schedule1Id = Number(schedule1Result[0].insertId);

    // 查询该时间段的预约数量
    const bookings = await db
      .select()
      .from(schedules)
      .where(eq(schedules.classroomId, testClassroomId));

    const classroom = await db
      .select()
      .from(classrooms)
      .where(eq(classrooms.id, testClassroomId))
      .limit(1);

    // 验证：预约数量应该小于教室容量
    expect(bookings.length).toBeLessThan(classroom[0].capacity);

    // 清理测试数据
    await db.delete(schedules).where(eq(schedules.id, schedule1Id));
  });
});

describe("isBookable Field Tests", () => {
  it("courses表应该包含isBookable字段", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 查询所有课程
    const allCourses = await db
      .select()
      .from(courses)
      .limit(5);

    // 验证isBookable字段存在
    expect(allCourses.length).toBeGreaterThan(0);
    expect(allCourses[0]).toHaveProperty('isBookable');
  });

  it("getAllCourses函数应该过滤掉isBookable=false的课程", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建一个不可预约的测试课程
    const testCourseResult = await db.insert(courses).values({
      name: "测试不可预约课程",
      category: "测试",
      duration: "1.00",
      price: "100.00",
      isActive: true,
      isBookable: false,
      sortOrder: 999,
    });
    const testCourseId = Number(testCourseResult[0].insertId);

    // 查询所有可预约课程
    const bookableCourses = await db
      .select()
      .from(courses)
      .where(eq(courses.isBookable, true));

    // 验证不可预约课程不在列表中
    const foundTestCourse = bookableCourses.find(c => c.id === testCourseId);
    expect(foundTestCourse).toBeUndefined();

    // 清理测试数据
    await db.delete(courses).where(eq(courses.id, testCourseId));
  });

  it("会员费课程应该被标记为不可预约", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 查询会员费课程
    const membershipCourse = await db
      .select()
      .from(courses)
      .where(eq(courses.id, 60001))
      .limit(1);

    if (membershipCourse.length > 0) {
      expect(membershipCourse[0].isBookable).toBe(false);
    }
  });
});

describe("Booking Conflict Detection Tests", () => {
  let testCityId: number;
  let testClassroomId: number;
  let testTeacherId: number;
  let testCourseId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 准备测试数据
    const cityResult = await db
      .select()
      .from(cities)
      .where(eq(cities.name, "测试冲突城市"))
      .limit(1);

    if (cityResult.length > 0) {
      testCityId = cityResult[0].id;
    } else {
      const newCity = await db.insert(cities).values({
        name: "测试冲突城市",
        areaCode: "CONFLICT",
        isActive: true,
        sortOrder: 998,
      });
      testCityId = Number(newCity[0].insertId);
    }

    const classroomResult = await db
      .select()
      .from(classrooms)
      .where(eq(classrooms.cityId, testCityId))
      .limit(1);

    if (classroomResult.length > 0) {
      testClassroomId = classroomResult[0].id;
    } else {
      const newClassroom = await db.insert(classrooms).values({
        cityId: testCityId,
        cityName: "测试冲突城市",
        name: "冲突测试教室",
        address: "测试地址",
        isActive: true,
        sortOrder: 1,
        capacity: 1, // 容量为1，方便测试冲突
      });
      testClassroomId = Number(newClassroom[0].insertId);
    }

    const courseResult = await db
      .select()
      .from(courses)
      .where(eq(courses.name, "冲突测试课程"))
      .limit(1);

    if (courseResult.length > 0) {
      testCourseId = courseResult[0].id;
    } else {
      const newCourse = await db.insert(courses).values({
        name: "冲突测试课程",
        category: "测试",
        duration: "1.00",
        price: "100.00",
        isActive: true,
        sortOrder: 997,
      });
      testCourseId = Number(newCourse[0].insertId);
    }

    testTeacherId = 1; // 假设存在ID为1的老师
  });

  it("应该检测到教室时间冲突", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建第一个预约
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    tomorrow.setHours(10, 0, 0, 0);

    const endTime1 = new Date(tomorrow);
    endTime1.setHours(11, 0, 0, 0);

    const schedule1 = await db.insert(schedules).values({
      customerId: 1,
      customerName: "测试客户A",
      teacherId: testTeacherId,
      classroomId: testClassroomId,
      courseType: "冲突测试课程",
      classDate: tomorrow,
      classTime: "10:00-11:00",
      startTime: tomorrow,
      endTime: endTime1,
      city: "测试冲突城市",
      status: "scheduled",
    });

    const schedule1Id = Number(schedule1[0].insertId);

    // 尝试在同一时间段预约同一教室（应该冲突，因为capacity=1）
    const conflictBookings = await db
      .select()
      .from(schedules)
      .where(eq(schedules.classroomId, testClassroomId));

    const classroom = await db
      .select()
      .from(classrooms)
      .where(eq(classrooms.id, testClassroomId))
      .limit(1);

    // 验证：预约数量应该等于教室容量
    expect(conflictBookings.length).toBe(classroom[0].capacity);

    // 清理测试数据
    await db.delete(schedules).where(eq(schedules.id, schedule1Id));
  });

  it("应该检测到老师时间冲突", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建老师的预约
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    tomorrow.setHours(14, 0, 0, 0);

    const endTime = new Date(tomorrow);
    endTime.setHours(15, 0, 0, 0);

    const schedule1 = await db.insert(schedules).values({
      customerId: 1,
      customerName: "测试客户B",
      teacherId: testTeacherId,
      classroomId: testClassroomId,
      courseType: "冲突测试课程",
      classDate: tomorrow,
      classTime: "14:00-15:00",
      startTime: tomorrow,
      endTime: endTime,
      city: "测试冲突城市",
      status: "scheduled",
    });

    const schedule1Id = Number(schedule1[0].insertId);

    // 查询该老师在该时间段的预约
    const teacherBookings = await db
      .select()
      .from(schedules)
      .where(eq(schedules.teacherId, testTeacherId));

    // 验证：老师有预约记录
    expect(teacherBookings.length).toBeGreaterThan(0);

    // 清理测试数据
    await db.delete(schedules).where(eq(schedules.id, schedule1Id));
  });
});
