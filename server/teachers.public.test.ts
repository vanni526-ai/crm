import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Teachers API - Public Access", () => {
  it("should allow unauthenticated access to teachers.list", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    const result = await caller.teachers.list();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("should allow unauthenticated access to teachers.getById", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    
    // 先获取列表找到一个有效的ID
    const teachers = await caller.teachers.list();
    
    if (teachers.length > 0) {
      const firstTeacher = teachers[0];
      const result = await caller.teachers.getById({ id: firstTeacher.id });
      
      expect(result).toBeDefined();
      expect(result.id).toBe(firstTeacher.id);
    }
  });
});
