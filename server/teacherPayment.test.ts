import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Teacher Payment Management", () => {
  let teacherUser: any;
  let financeUser: any;

  beforeAll(async () => {
    const database = await getDb();
    if (!database) throw new Error("数据库不可用");

    // 查找teacher用户
    const teachers = await database
      .select()
      .from(users)
      .where(eq(users.roles, "teacher"))
      .limit(1);

    if (!teachers.length) {
      throw new Error("未找到teacher用户");
    }
    teacherUser = teachers[0];

    // 查找admin用户（作为财务测试用户）
    const admins = await database
      .select()
      .from(users)
      .where(eq(users.roles, "admin"))
      .limit(1);

    if (!admins.length) {
      throw new Error("未找到admin用户");
    }
    financeUser = admins[0]; // admin可以执行财务操作
  });

  describe("老师查询收入", () => {
    it("应该能查询自己的收入记录", async () => {
      const caller = appRouter.createCaller({
        user: teacherUser,
      });

      const payments = await caller.teacherPayments.getMyPayments({});
      expect(Array.isArray(payments)).toBe(true);
    });

    it("应该能按状态筛选收入记录", async () => {
      const caller = appRouter.createCaller({
        user: teacherUser,
      });

      const pendingPayments = await caller.teacherPayments.getMyPayments({
        status: "pending",
      });

      expect(Array.isArray(pendingPayments)).toBe(true);
      pendingPayments.forEach((payment) => {
        expect(payment.status).toBe("pending");
      });
    });

    it("应该能查询收入统计", async () => {
      const caller = appRouter.createCaller({
        user: teacherUser,
      });

      const stats = await caller.teacherPayments.getPaymentStats();

      expect(stats).toHaveProperty("pending");
      expect(stats).toHaveProperty("approved");
      expect(stats).toHaveProperty("paid");
      expect(stats).toHaveProperty("total");
      expect(typeof stats.total.amount).toBe("number");
      expect(typeof stats.total.count).toBe("number");
    });
  });

  describe("财务审批流程", () => {
    it("财务应该能查看待审批列表", async () => {
      const caller = appRouter.createCaller({
        user: financeUser,
      });

      const pendingPayments = await caller.teacherPayments.getPendingPayments();

      expect(Array.isArray(pendingPayments)).toBe(true);
    });
  });

  describe("收入报表统计", () => {
    it("应该能生成月度报表", async () => {
      const caller = appRouter.createCaller({
        user: financeUser,
      });

      const now = new Date();
      const report = await caller.teacherPayments.getMonthlyReport({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      });

      expect(report).toHaveProperty("year");
      expect(report).toHaveProperty("month");
      expect(report).toHaveProperty("teachers");
      expect(report).toHaveProperty("total");
      expect(Array.isArray(report.teachers)).toBe(true);
      expect(typeof report.total.totalAmount).toBe("number");
      expect(typeof report.total.count).toBe("number");
    });
  });

  describe("权限控制", () => {
    it("非teacher用户不能查询老师收入", async () => {
      const caller = appRouter.createCaller({
        user: financeUser,
      });

      await expect(caller.teacherPayments.getMyPayments({})).rejects.toThrow("需要老师权限");
    });

    it("非finance用户不能审批支付", async () => {
      const caller = appRouter.createCaller({
        user: teacherUser,
      });

      await expect(
        caller.teacherPayments.approve({
          id: 1,
          approved: true,
        })
      ).rejects.toThrow("需要财务或管理员权限");
    });

    it("admin用户可以访问财务功能", async () => {
      const caller = appRouter.createCaller({
        user: financeUser,
      });

      const pendingPayments = await caller.teacherPayments.getPendingPayments();
      expect(Array.isArray(pendingPayments)).toBe(true);
    });
  });
});
