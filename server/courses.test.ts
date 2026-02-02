import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Courses API", () => {
  let testCourseId: number;

  describe("Public Access (list and getById)", () => {
    it("should allow unauthenticated access to courses.list", async () => {
      const ctx = createContext(null);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.courses.list();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should return course list with correct structure", async () => {
      const ctx = createContext(null);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.courses.list();
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("count");
    });
  });

  describe("Protected Operations (create/update/delete/toggleActive)", () => {
    const adminUser: AuthenticatedUser = {
      id: 1,
      openId: "test-admin",
      name: "测试管理员",
      email: "admin@test.com",
      role: "admin",
      isActive: true,
      loginMethod: "manus",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    it("should create a new course", async () => {
      const ctx = createContext(adminUser);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.courses.create({
        name: "测试课程",
        description: "这是一个测试课程",
        price: 299.99,
        duration: 2.5,
        level: "入门",
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id");
      testCourseId = result.data.id;
    });

    it("should get course by ID", async () => {
      const ctx = createContext(null);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.courses.getById({ id: testCourseId });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("name", "测试课程");
      expect(result.data).toHaveProperty("price");
      expect(result.data).toHaveProperty("duration");
      expect(result.data).toHaveProperty("level", "入门");
    });

    it("should update course", async () => {
      const ctx = createContext(adminUser);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.courses.update({
        id: testCourseId,
        name: "更新后的课程名称",
        price: 399.99,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("成功");
    });

    it("should toggle course active status", async () => {
      const ctx = createContext(adminUser);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.courses.toggleActive({
        id: testCourseId,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("isActive");
    });

    it("should delete course", async () => {
      const ctx = createContext(adminUser);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.courses.delete({
        id: testCourseId,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("成功");
    });
  });

  describe("Error Handling", () => {
    it("should return error for non-existent course", async () => {
      const ctx = createContext(null);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.courses.getById({ id: 999999 });
      expect(result.success).toBe(false);
      expect(result.message).toContain("未找到");
    });
  });
});
