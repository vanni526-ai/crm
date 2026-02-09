import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, setUserRoleCities, getUserRoleCities } from "./db";
import { users, teachers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./passwordUtils";
import { USER_ROLE_VALUES } from "../shared/roles";

// 角色常量（已弃用，使用shared/roles.ts中的USER_ROLE_VALUES）
const VALID_ROLES = USER_ROLE_VALUES;

// 权限检查中间件 - 只有管理员可以管理用户
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  // 支持多角色：检查roles字段或回退到role字段
  const userRoles = (ctx.user as any).roles || ctx.user.role || "";
  const hasAdmin = userRoles.split(",").map((r: string) => r.trim()).includes("admin");
  if (!hasAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
  }
  return next({ ctx });
});

export const userManagementRouter = router({
  // 获取所有用户列表
  list: adminProcedure.query(async () => {
    const drizzle = await getDb();
    if (!drizzle) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "数据库连接失败",
      });
    }

    const userList = await drizzle.select().from(users);

    // 不返回密码字段
    return userList.map((user) => ({
      id: user.id,
      openId: user.openId,
      name: user.name,
      nickname: user.nickname,
      email: user.email,
      phone: user.phone,
      role: user.role,
      roles: (user as any).roles || user.role || "user",
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastSignedIn: user.lastSignedIn,
    }));
  }),

  // 获取单个用户详情
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      const userList = await drizzle
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (userList.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      const user = userList[0];

      // 获取角色-城市关联
      const roleCitiesData = await getUserRoleCities(user.id);
      const roleCities: Record<string, string[]> = {};
      for (const rc of roleCitiesData) {
        try {
          roleCities[rc.role] = JSON.parse(rc.cities);
        } catch {
          roleCities[rc.role] = [];
        }
      }

      // 不返回密码字段
      return {
        id: user.id,
        openId: user.openId,
        name: user.name,
        nickname: user.nickname,
        email: user.email,
        phone: user.phone,
        role: user.role,
        roles: (user as any).roles || user.role || "user",
        roleCities, // 角色-城市关联
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastSignedIn: user.lastSignedIn,
      };
    }),

  // 创建新用户
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "用户名不能为空"),
        nickname: z.string().optional(),
        email: z.string().email("邮箱格式不正确").optional(),
        phone: z.string().optional(),
        password: z.string().min(6, "密码至少6位"),
        role: z.enum(USER_ROLE_VALUES as [string, ...string[]]).optional(),
        roles: z.string().optional(), // 多角色，逗号分隔
      })
    )
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      // 手机号唯一性验证
      if (input.phone) {
        const { checkPhoneUnique } = await import("./phoneValidator");
        const phoneCheck = await checkPhoneUnique(input.phone);
        if (!phoneCheck.isUnique) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `手机号已被使用（${phoneCheck.conflictType === "user" ? "用户管理" : "老师管理"}中的 ${phoneCheck.conflictName}）`,
          });
        }
      }

      // 加密密码
      const hashedPassword = await hashPassword(input.password);

      // 生成openId(使用时间戳+随机数)
      const openId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // 解析角色
      const rolesStr = input.roles || input.role || "user";
      const primaryRole = rolesStr.split(",")[0].trim();

      // 创建用户
      const [result] = await drizzle.insert(users).values({
        openId,
        name: input.name,
        nickname: input.nickname || null,
        email: input.email || null,
        phone: input.phone || null,
        password: hashedPassword,
        role: primaryRole as any,
        roles: rolesStr,
        isActive: true,
      } as any);

      const newUserId = result.insertId;

      // 如果角色包含teacher，同步到老师管理
      if (rolesStr.includes('teacher')) {
        await drizzle.insert(teachers).values({
          userId: newUserId,
          name: input.name,
          phone: input.phone || '无',
          status: '活跃',
          isActive: true,
        } as any);
      }

      return {
        success: true,
        message: "用户创建成功",
      };
    }),

  // 更新用户信息
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1, "用户名不能为空").optional(),
        nickname: z.string().optional(),
        email: z.string().email("邮箱格式不正确").optional(),
        phone: z.string().optional(),
        role: z.enum(USER_ROLE_VALUES as [string, ...string[]]).optional(),
        roles: z.string().optional(), // 多角色，逗号分隔
        roleCities: z.record(z.string(), z.array(z.string())).optional(), // 角色-城市关联，如 { "teacher": ["深圳"], "cityPartner": ["天津"] }
      })
    )
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      const { id, roles, roleCities, ...updateData } = input;

      // 手机号唯一性验证（排除当前用户）
      if (updateData.phone) {
        const { checkPhoneUnique } = await import("./phoneValidator");
        const phoneCheck = await checkPhoneUnique(updateData.phone, id);
        if (!phoneCheck.isUnique) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `手机号已被使用（${phoneCheck.conflictType === "user" ? "用户管理" : "老师管理"}中的 ${phoneCheck.conflictName}）`,
          });
        }
      }

      // 查询更新前的角色
      const [usersBefore] = await drizzle.select().from(users).where(eq(users.id, id)).limit(1);
      const oldRoles = usersBefore?.roles || '';
      const hadTeacherRole = oldRoles.includes('teacher');

      // 如果传了roles，同步更新role字段
      const setData: any = { ...updateData };
      if (roles) {
        setData.roles = roles;
        setData.role = roles.split(",")[0].trim();
      }

      await drizzle.update(users).set(setData).where(eq(users.id, id));

      // 保存角色-城市关联
      if (roleCities) {
        for (const [role, cities] of Object.entries(roleCities)) {
          if (role === 'teacher' || role === 'cityPartner' || role === 'sales') {
            await setUserRoleCities(id, role as 'teacher' | 'cityPartner' | 'sales', cities as string[]);
          }
        }
      }

      // 处理老师角色变更
      if (roles) {
        const hasTeacherRole = roles.includes('teacher');
        
        // 查找关联的老师记录
        const [teacherRecords] = await drizzle.select().from(teachers).where(eq(teachers.userId, id)).limit(1);
        
        if (hadTeacherRole && !hasTeacherRole) {
          // 移除老师角色：设置为不激活
          if (teacherRecords) {
            await drizzle.update(teachers).set({ isActive: false, status: '不活跃' } as any).where(eq(teachers.userId, id));
          }
        } else if (!hadTeacherRole && hasTeacherRole) {
          // 添加老师角色
          if (teacherRecords) {
            // 已存在记录，恢复激活
            await drizzle.update(teachers).set({ isActive: true, status: '活跃' } as any).where(eq(teachers.userId, id));
          } else {
            // 不存在记录，创建新记录
            await drizzle.insert(teachers).values({
              userId: id,
              name: updateData.name || usersBefore?.name || '未知',
              phone: updateData.phone || usersBefore?.phone || '无',
              status: '活跃',
              isActive: true,
            } as any);
          }
        }
      }

      return {
        success: true,
        message: "用户信息更新成功",
      };
    }),

  // 更新用户角色（多角色）
  updateRoles: adminProcedure
    .input(
      z.object({
        id: z.number(),
        roles: z.string().min(1, "至少需要一个角色"),
      })
    )
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      // 查询更新前的角色
      const [usersBefore] = await drizzle.select().from(users).where(eq(users.id, input.id)).limit(1);
      const oldRoles = usersBefore?.roles || '';
      const hadTeacherRole = oldRoles.includes('teacher');
      const hasTeacherRole = input.roles.includes('teacher');

      const primaryRole = input.roles.split(",")[0].trim();

      await drizzle
        .update(users)
        .set({
          role: primaryRole as any,
          roles: input.roles,
        } as any)
        .where(eq(users.id, input.id));

      // 处理老师角色变更
      const [teacherRecords] = await drizzle.select().from(teachers).where(eq(teachers.userId, input.id)).limit(1);
      
      if (hadTeacherRole && !hasTeacherRole) {
        // 移除老师角色：设置为不激活
        if (teacherRecords) {
          await drizzle.update(teachers).set({ isActive: false, status: '不活跃' } as any).where(eq(teachers.userId, input.id));
        }
      } else if (!hadTeacherRole && hasTeacherRole) {
        // 添加老师角色
        if (teacherRecords) {
          // 已存在记录，恢复激活
          await drizzle.update(teachers).set({ isActive: true, status: '活跃' } as any).where(eq(teachers.userId, input.id));
        } else {
          // 不存在记录，创建新记录
          await drizzle.insert(teachers).values({
            userId: input.id,
            name: usersBefore?.name || '未知',
            phone: usersBefore?.phone || '无',
            status: '活跃',
            isActive: true,
          } as any);
        }
      }

      return {
        success: true,
        message: "角色更新成功",
      };
    }),

  // 重置用户密码
  resetPassword: adminProcedure
    .input(
      z.object({
        id: z.number(),
        newPassword: z.string().min(6, "密码至少6位"),
      })
    )
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      // 加密新密码
      const hashedPassword = await hashPassword(input.newPassword);

      await drizzle
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, input.id));

      return {
        success: true,
        message: "密码重置成功",
      };
    }),

  // 启用/禁用用户账号
  toggleActive: adminProcedure
    .input(
      z.object({
        id: z.number(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      await drizzle
        .update(users)
        .set({ isActive: input.isActive })
        .where(eq(users.id, input.id));

      return {
        success: true,
        message: input.isActive ? "账号已启用" : "账号已禁用",
      };
    }),

  // 获取用户的角色-城市关联
  getRoleCities: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const roleCities = await getUserRoleCities(input.userId);
      return roleCities;
    }),

  // 删除用户
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      // 检查用户是否存在
      const [existingUser] = await drizzle
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      await drizzle.delete(users).where(eq(users.id, input.id));

      return {
        success: true,
        message: "用户删除成功",
      };
    }),
});
