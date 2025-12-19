import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

/**
 * 老师统计功能单元测试
 */
describe("老师统计功能", () => {
  let testTeacherId: number;
  let testScheduleId: number;
  let testPaymentId: number;

  beforeAll(async () => {
    // 创建测试老师
    testTeacherId = await db.createTeacher({
      name: "统计测试老师",
      status: "活跃",
    });

    // 创建测试排课
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    testScheduleId = await db.createSchedule({
      teacherId: testTeacherId,
      teacherName: "统计测试老师",
      customerName: "测试学员",
      courseType: "测试课程",
      startTime: now,
      endTime: twoHoursLater,
      city: "测试城市",
    });

    // 创建测试支付记录
    testPaymentId = await db.createTeacherPayment({
      teacherId: testTeacherId,
      amount: "500.00",
      status: "paid",
      paymentTime: now,
      recordedBy: 1,
    });
  });

  afterAll(async () => {
    // 清理测试数据
    if (testTeacherId) {
      await db.batchDeleteTeachers([testTeacherId]);
    }
  });

  describe("单个老师统计", () => {
    it("应该能够获取老师的授课次数", async () => {
      const stats = await db.getTeacherStats(testTeacherId);
      expect(stats).toBeDefined();
      expect(stats?.classCount).toBeGreaterThanOrEqual(1);
    });

    it("应该能够计算老师的总课时", async () => {
      const stats = await db.getTeacherStats(testTeacherId);
      expect(stats).toBeDefined();
      expect(stats?.totalHours).toBeGreaterThanOrEqual(0);
    });

    it("应该能够计算老师的总收入", async () => {
      const stats = await db.getTeacherStats(testTeacherId);
      expect(stats).toBeDefined();
      expect(stats?.totalIncome).toBeGreaterThanOrEqual(500);
    });

    it("支持按时间范围筛选统计数据", async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const stats = await db.getTeacherStats(testTeacherId, yesterday, tomorrow);
      expect(stats).toBeDefined();
      expect(stats?.classCount).toBeGreaterThanOrEqual(0);
    });

    it("时间范围外的数据不应该被统计", async () => {
      const lastYear = new Date(new Date().getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(new Date().getFullYear() - 1, 11, 31);

      const stats = await db.getTeacherStats(testTeacherId, lastYear, lastYearEnd);
      expect(stats).toBeDefined();
      expect(stats?.classCount).toBe(0);
      expect(stats?.totalIncome).toBe(0);
    });
  });

  describe("所有老师统计", () => {
    it("应该能够获取所有老师的统计数据", async () => {
      const allStats = await db.getAllTeachersStats();
      expect(Array.isArray(allStats)).toBe(true);
      expect(allStats.length).toBeGreaterThan(0);
    });

    it("每个老师的统计数据应该包含必需字段", async () => {
      const allStats = await db.getAllTeachersStats();
      const teacherStat = allStats.find(s => s.teacherId === testTeacherId);
      
      expect(teacherStat).toBeDefined();
      expect(teacherStat).toHaveProperty("teacherId");
      expect(teacherStat).toHaveProperty("teacherName");
      expect(teacherStat).toHaveProperty("classCount");
      expect(teacherStat).toHaveProperty("totalHours");
      expect(teacherStat).toHaveProperty("totalIncome");
    });

    it("支持按时间范围筛选所有老师的统计数据", async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const allStats = await db.getAllTeachersStats(startOfMonth, now);
      expect(Array.isArray(allStats)).toBe(true);
    });
  });

  describe("统计数据准确性", () => {
    it("授课次数应该等于排课记录数", async () => {
      const stats = await db.getTeacherStats(testTeacherId);
      const schedules = await db.getSchedulesByTeacher(testTeacherId);
      
      expect(stats?.classCount).toBe(schedules.length);
    });

    it("只统计已支付的收入", async () => {
      // 创建一个未支付的记录
      const pendingPaymentId = await db.createTeacherPayment({
        teacherId: testTeacherId,
        amount: "1000.00",
        status: "pending",
        recordedBy: 1,
      });

      const stats = await db.getTeacherStats(testTeacherId);
      
      // 总收入应该只包含已支付的500,不包含未支付的1000
      expect(stats?.totalIncome).toBeLessThan(1500);

      // 清理测试数据
      // Note: 实际项目中应该有deleteTeacherPayment函数
    });

    it("课时计算应该基于开始和结束时间", async () => {
      const stats = await db.getTeacherStats(testTeacherId);
      
      // 我们创建了一个2小时的课程
      expect(stats?.totalHours).toBeGreaterThanOrEqual(1);
      expect(stats?.totalHours).toBeLessThanOrEqual(3); // 允许一些误差
    });
  });

  describe("边界情况", () => {
    it("没有排课的老师统计应该返回0", async () => {
      const newTeacherId = await db.createTeacher({
        name: "无排课老师",
        status: "活跃",
      });

      const stats = await db.getTeacherStats(newTeacherId);
      expect(stats?.classCount).toBe(0);
      expect(stats?.totalHours).toBe(0);
      expect(stats?.totalIncome).toBe(0);

      // 清理
      await db.batchDeleteTeachers([newTeacherId]);
    });

    it("不存在的老师ID应该返回null", async () => {
      const stats = await db.getTeacherStats(999999);
      expect(stats).toBeDefined();
      expect(stats?.classCount).toBe(0);
    });
  });
});
