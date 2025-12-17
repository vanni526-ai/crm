import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("teachers", () => {
  it("should create a teacher successfully", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.teachers.create({
      name: "张老师",
      nickname: "小张",
      phone: "13800138000",
      wechat: "zhanglaoshi",
      email: "zhang@example.com",
      city: "北京",
      hourlyRate: "200.00",
      bankAccount: "6222021234567890",
      bankName: "中国工商银行北京分行",
      notes: "资深瑜伽教练",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeGreaterThan(0);
  });

  it("should list all teachers", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const teachers = await caller.teachers.list();

    expect(Array.isArray(teachers)).toBe(true);
  });

  it("should get teacher by id", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // 先创建一个老师
    const createResult = await caller.teachers.create({
      name: "李老师",
      nickname: "小李",
      phone: "13900139000",
    });

    // 然后查询这个老师
    const teacher = await caller.teachers.getById({ id: createResult.id });

    expect(teacher).toBeDefined();
    expect(teacher?.name).toBe("李老师");
    expect(teacher?.nickname).toBe("小李");
  });

  it("should update teacher information", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // 先创建一个老师
    const createResult = await caller.teachers.create({
      name: "王老师",
      phone: "13700137000",
    });

    // 更新老师信息
    const updateResult = await caller.teachers.update({
      id: createResult.id,
      data: {
        nickname: "小王",
        city: "上海",
        hourlyRate: "300.00",
      },
    });

    expect(updateResult.success).toBe(true);

    // 验证更新后的信息
    const updatedTeacher = await caller.teachers.getById({ id: createResult.id });
    expect(updatedTeacher?.nickname).toBe("小王");
    expect(updatedTeacher?.city).toBe("上海");
    expect(updatedTeacher?.hourlyRate).toBe("300.00");
  });
});
