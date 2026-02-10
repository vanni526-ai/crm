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
  // 获取所有用户列表（支持筛选）
  list: adminProcedure
    .input(z.object({
      city: z.string().optional(),  // 城市筛选
      role: z.string().optional(),  // 角色筛选
      isActive: z.boolean().optional(),  // 状态筛选
    }).optional())
    .query(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      let userList = await drizzle.select().from(users);

      // 应用筛选条件
      if (input) {
        // 状态筛选
        if (input.isActive !== undefined) {
          userList = userList.filter(user => user.isActive === input.isActive);
        }

        // 角色筛选
        if (input.role) {
          userList = userList.filter(user => {
            const userRoles = (user as any).roles || user.role || "";
            return userRoles.split(",").map((r: string) => r.trim()).includes(input.role!);
          });
        }

        // 城市筛选（需要查询roleCities）
        if (input.city) {
          const filteredUsers = [];
          for (const user of userList) {
            const roleCities = await getUserRoleCities(user.id);
            // 检查用户的任何角色是否包含该城市
            const hasCity = Object.values(roleCities).some(cityList => {
              if (Array.isArray(cityList)) {
                return cityList.includes(input.city!);
              }
              return false;
            });
            if (hasCity) {
              filteredUsers.push(user);
            }
          }
          userList = filteredUsers;
        }
      }

      // 不返回密码字段，但返回roleCities数据
      const usersWithRoleCities = await Promise.all(
        userList.map(async (user) => {
          // 获取角色-城市关联并转换为前端期望的格式
          const roleCitiesData = await getUserRoleCities(user.id);
          const roleCities: Record<string, string[]> = {};
          for (const rc of roleCitiesData) {
            try {
              roleCities[rc.role] = JSON.parse(rc.cities);
            } catch {
              roleCities[rc.role] = [];
            }
          }

          return {
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
            roleCities, // 现在格式正确了：Record<string, string[]>
          };
        })
      );
      return usersWithRoleCities;
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
      const rolesArray = rolesStr.split(",").map((r: string) => r.trim());
      
      // 验证：至少选择1个角色
      if (rolesArray.length === 0 || rolesArray.every((r: string) => !r)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "每个账号必须最少1种角色",
        });
      }
      
      const primaryRole = rolesArray[0];

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

      // 如果角色包含teacher，在teachers表创建关联记录（只存储userId和合同信息）
      if (rolesStr.includes('teacher')) {
        await drizzle.insert(teachers).values({
          userId: newUserId,
          // 基础信息从 users 表读取，这里只存储合同相关字段
          status: '活跃',
          isActive: true,
        } as any);
      }
      
      // 如果角色包含cityPartner，在partners表创建关联记录
      if (rolesStr.includes('cityPartner')) {
        const { partners } = await import('../drizzle/schema');
        await drizzle.insert(partners).values({
          userId: newUserId,
          name: input.name,
          phone: input.phone || null,
          profitRatio: '0.30', // 默认30%
          createdBy: 1, // 管理员创建
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
        const rolesArray = roles.split(",").map((r: string) => r.trim());
        
        // 验证：至少选择1个角色
        if (rolesArray.length === 0 || rolesArray.every((r: string) => !r)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "每个账号必须最少1种角色",
          });
        }
        
        // 验证：老师/合伙人必须选择城市
        if (roleCities) {
          for (const role of rolesArray) {
            if (role === 'teacher' || role === 'cityPartner') {
              const cities = roleCities[role];
              if (!cities || cities.length === 0) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `选择${role === 'teacher' ? '老师' : '合伙人'}角色时，必须选择对应的城市`,
                });
              }
            }
          }
        } else {
          // 如果没有传roleCities，但有teacher或cityPartner角色，需要检查数据库中是否已有城市
          for (const role of rolesArray) {
            if (role === 'teacher' || role === 'cityPartner') {
              const existingCities = await getUserRoleCities(id);
              const roleCity = existingCities.find((rc: any) => rc.role === role);
              if (!roleCity || !roleCity.cities || JSON.parse(roleCity.cities).length === 0) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `选择${role === 'teacher' ? '老师' : '合伙人'}角色时，必须选择对应的城市`,
                });
              }
            }
          }
        }
        
        setData.roles = roles;
        setData.role = rolesArray[0];
      }

      await drizzle.update(users).set(setData).where(eq(users.id, id));

      // 保存角色-城市关联
      if (roleCities) {
        for (const [role, cities] of Object.entries(roleCities)) {
          if (role === 'teacher' || role === 'cityPartner') {
            await setUserRoleCities(id, role as 'teacher' | 'cityPartner', cities as string[]);
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
            // 不存在记录，创建新记录（只存储userId和合同信息）
            await drizzle.insert(teachers).values({
              userId: id,
              // 基础信息从 users 表读取
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
      const hadCityPartnerRole = oldRoles.includes('cityPartner');
      const hasCityPartnerRole = input.roles.includes('cityPartner');

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

      // 处理城市合伙人角色变更
      if (hadCityPartnerRole && !hasCityPartnerRole) {
        // 移除城市合伙人角色：从 partners 表删除记录
        await drizzle.execute(`DELETE FROM partners WHERE userId = ${input.id}`);
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
