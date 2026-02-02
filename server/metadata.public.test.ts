import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Metadata API - Public Access", () => {
  it("should allow unauthenticated access to getCities", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    const result = await caller.metadata.getCities();
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("should allow unauthenticated access to getCourses", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    const result = await caller.metadata.getCourses();
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("should allow unauthenticated access to getClassrooms", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    const result = await caller.metadata.getClassrooms();
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("should allow unauthenticated access to getTeacherNames", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    const result = await caller.metadata.getTeacherNames();
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("should allow unauthenticated access to getSalespeople", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    const result = await caller.metadata.getSalespeople();
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("should allow unauthenticated access to getTeacherCategories", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    const result = await caller.metadata.getTeacherCategories();
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("should allow unauthenticated access to getCourseAmounts", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    const result = await caller.metadata.getCourseAmounts();
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("should allow unauthenticated access to getAll", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    const result = await caller.metadata.getAll();
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.cities).toBeDefined();
    expect(result.data.courses).toBeDefined();
    expect(result.data.classrooms).toBeDefined();
    expect(result.data.teacherNames).toBeDefined();
    expect(result.data.salespeople).toBeDefined();
    expect(result.data.teacherCategories).toBeDefined();
    expect(result.data.courseAmounts).toBeDefined();
  });
});
