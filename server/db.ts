import { eq, and, gte, lte, desc, asc, sql, between, isNotNull, isNull, ne, like, or, inArray, count, not } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  customers,
  InsertCustomer,
  orders,
  InsertOrder,
  teachers,
  InsertTeacher,
  schedules,
  InsertSchedule,
  courses,
  InsertCourse,
  teacherPayments,
  InsertTeacherPayment,
  reconciliations,
  InsertReconciliation,
  importLogs,
  InsertImportLog,
  accountTransactions,
  InsertAccountTransaction,
  smartRegisterHistory,
  InsertSmartRegisterHistory,
  salespersons,
  InsertSalesperson,
  gmailImportLogs,
  InsertGmailImportLog,
  gmailImportConfig,
  userNotifications,
  InsertUserNotification,
  gmailImportHistory,
  InsertGmailImportHistory,
  GmailImportHistory,
  cityPartnerConfig,
  auditLogs,
  partnerFeeAuditLogs,
  cities,
  classrooms,
  InsertCity,
  InsertClassroom,
  userRoleCities,
  InsertUserRoleCity,
  UserRoleCity,
  partnerCities,
  partnerExpenses,
  partners,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { formatDateBeijing, BEIJING_TIMEZONE } from "../shared/timezone";
import { UserRole } from "../shared/roles";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ========== 用户管理 ==========

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "nickname", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
      // 同步设置roles字段
      values.roles = user.role;
      updateSet.roles = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
      values.roles = "admin";
      updateSet.roles = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * 自动为用户创建或关联customer记录
 * 在用户注册/登录时调用，确保users和customers表实时同步
 */
export async function autoLinkCustomerToUser(openId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot auto-link customer: database not available");
    return;
  }

  try {
    // 1. 获取用户信息
    const user = await getUserByOpenId(openId);
    if (!user) {
      console.warn(`[Database] User not found for openId: ${openId}`);
      return;
    }

    // 2. 检查是否已有关联的customer
    const existingCustomer = await getCustomerByUserId(user.id);
    if (existingCustomer) {
      console.log(`[Database] Customer already linked for user ${user.id}`);
      return;
    }

    // 3. 通过phone查找现有customer并关联
    if (user.phone) {
      const customerByPhone = await getCustomerByPhone(user.phone);
      if (customerByPhone && !customerByPhone.userId) {
        await db.update(customers)
          .set({ userId: user.id })
          .where(eq(customers.id, customerByPhone.id));
        console.log(`[Database] Linked existing customer ${customerByPhone.id} to user ${user.id} by phone`);
        return;
      }
    }

    // 4. 创建新的customer记录
    const customerName = user.name || user.nickname || user.phone || `用户${user.id}`;
    await createCustomer({
      userId: user.id,
      name: customerName,
      phone: user.phone || undefined,
      trafficSource: "App注册",
      createdBy: user.id,
    });
    console.log(`[Database] Created new customer for user ${user.id}`);
  } catch (error) {
    console.error("[Database] Failed to auto-link customer:", error);
    // 不抛出错误，避免影响用户登录流程
  }
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  
  // 获取所有用户
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
  
  // 对于每个用户,如果有teacher角色,关联teachers表获取城市信息
  const usersWithCity = await Promise.all(
    allUsers.map(async (user) => {
      // 检查roles字段是否包含teacher
      if (user.roles && user.roles.includes('teacher')) {
        const teacher = await db.select().from(teachers).where(eq(teachers.userId, user.id)).limit(1);
        if (teacher.length > 0) {
          return { ...user, city: teacher[0].city };
        }
      }
      return { ...user, city: null };
    })
  );
  
  return usersWithCity;
}

export async function updateUserRole(userId: number, role: UserRole) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ===== User Role Cities Functions =====

/**
 * 获取用户的所有角色-城市关联
 */
export async function getUserRoleCities(userId: number): Promise<UserRoleCity[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userRoleCities).where(eq(userRoleCities.userId, userId));
}

/**
 * 获取用户的特定角色的城市列表
 */
export async function getUserRoleCitiesByRole(
  userId: number,
  role: 'teacher' | 'cityPartner' | 'sales'
): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select()
    .from(userRoleCities)
    .where(and(eq(userRoleCities.userId, userId), eq(userRoleCities.role, role)));
  
  if (result.length === 0) return [];
  try {
    return JSON.parse(result[0].cities);
  } catch {
    return [];
  }
}

/**
 * 设置用户的特定角色的城市列表
 */
export async function setUserRoleCities(
  userId: number,
  role: 'teacher' | 'cityPartner',
  cities: string[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const citiesJson = JSON.stringify(cities);
  
  // 检查是否已存在
  const existing = await db
    .select()
    .from(userRoleCities)
    .where(and(eq(userRoleCities.userId, userId), eq(userRoleCities.role, role)));
  
  if (existing.length > 0) {
    // 更新
    await db
      .update(userRoleCities)
      .set({ cities: citiesJson })
      .where(and(eq(userRoleCities.userId, userId), eq(userRoleCities.role, role)));
  } else {
    // 插入
    await db.insert(userRoleCities).values({
      userId,
      role,
      cities: citiesJson,
    });
  }
}

/**
 * 删除用户的特定角色的城市关联
 */
export async function deleteUserRoleCities(
  userId: number,
  role: 'teacher' | 'cityPartner' | 'sales'
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(userRoleCities)
    .where(and(eq(userRoleCities.userId, userId), eq(userRoleCities.role, role)));
}

/**
 * 更新用户多角色
 * @param userId 用户ID
 * @param roles 角色数组，如 ["admin", "teacher"]
 */
export async function updateUserRoles(userId: number, roles: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 获取用户当前的角色
  const currentUser = await db.select({ roles: users.roles }).from(users).where(eq(users.id, userId)).limit(1);
  const oldRoles = currentUser[0]?.roles ? currentUser[0].roles.split(",") : [];
  
  const rolesStr = roles.length > 0 ? roles.join(",") : "user";
  // 同时更新旧的role字段（取第一个角色作为主角色）
  const primaryRole = roles.includes("admin") ? "admin" : roles.includes("sales") ? "sales" : roles.includes("finance") ? "finance" : "user";
  await db.update(users).set({ roles: rolesStr, role: primaryRole as any }).where(eq(users.id, userId));
  
  // 如果去掉了cityPartner角色,同步禁用partners表中的对应记录
  const hadCityPartner = oldRoles.includes("cityPartner");
  const hasCityPartner = roles.includes("cityPartner");
  
  if (hadCityPartner && !hasCityPartner) {
    // 用户之前有cityPartner角色,现在没有了,禁用partners表记录
    await db.update(partners).set({ isActive: false }).where(eq(partners.userId, userId));
  } else if (!hadCityPartner && hasCityPartner) {
    // 用户之前没有cityPartner角色,现在有了,启用partners表记录
    await db.update(partners).set({ isActive: true }).where(eq(partners.userId, userId));
  }
  
  // 如果去掉了teacher角色,同步禁用teachers表中的对应记录
  const hadTeacher = oldRoles.includes("teacher");
  const hasTeacher = roles.includes("teacher");
  
  if (hadTeacher && !hasTeacher) {
    // 用户之前有teacher角色,现在没有了,禁用teachers表记录
    await db.update(teachers).set({ isActive: false }).where(eq(teachers.userId, userId));
  } else if (!hadTeacher && hasTeacher) {
    // 用户之前没有teacher角色,现在有了,启用teachers表记录（如果不存在则创建）
    const existingTeacher = await db.select().from(teachers).where(eq(teachers.userId, userId)).limit(1);
    if (existingTeacher.length > 0) {
      // 已存在记录,启用
      await db.update(teachers).set({ isActive: true }).where(eq(teachers.userId, userId));
    } else {
      // 不存在记录,创建新记录
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length > 0) {
        // 确保name字段不为null或undefined
        const userName = user[0].name || user[0].nickname || user[0].email || `User_${userId}`;
        const teacherData: any = {
          userId: userId,
          name: userName,
          isActive: true,
        };
        if (user[0].phone) {
          teacherData.phone = user[0].phone;
        }
        await db.insert(teachers).values(teacherData);
      }
    }
  }
  
  // 如果去掉了sales角色,同步禁用salespersons表中的对应记录
  const hadSales = oldRoles.includes("sales");
  const hasSales = roles.includes("sales");
  
  if (hadSales && !hasSales) {
    // 用户之前有sales角色,现在没有了,禁用salespersons表记录
    await db.update(salespersons).set({ isActive: false }).where(eq(salespersons.userId, userId));
  } else if (!hadSales && hasSales) {
    // 用户之前没有sales角色,现在有了,启用salespersons表记录（如果不存在则创建）
    const existingSales = await db.select().from(salespersons).where(eq(salespersons.userId, userId)).limit(1);
    if (existingSales.length > 0) {
      // 已存在记录,启用
      await db.update(salespersons).set({ isActive: true }).where(eq(salespersons.userId, userId));
    } else {
      // 不存在记录,创建新记录
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length > 0) {
        // 确保name字段不为null或undefined
        const userName = user[0].name || user[0].nickname || user[0].email || `User_${userId}`;
        const salesData: any = {
          userId: userId,
          name: userName,
          isActive: true,
        };
        if (user[0].phone) {
          salesData.phone = user[0].phone;
        }
        await db.insert(salespersons).values(salesData);
      }
    }
  }
}

export async function updateUserStatus(userId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ isActive }).where(eq(users.id, userId));
}

// ========== 客户管理 ==========

export async function createCustomer(customer: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(customer);
  return result[0].insertId;
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0] || null;
}

export async function getAllCustomers() {
  const db = await getDb();
  if (!db) return [];
  
  // LEFT JOIN users表获取会员信息(如果客户关联了userId)
  const customersData = await db
    .select({
      // customers表字段
      id: customers.id,
      userId: customers.userId,
      name: customers.name,
      wechatId: customers.wechatId,
      phone: customers.phone,
      trafficSource: customers.trafficSource,
      accountBalance: customers.accountBalance,
      tags: customers.tags,
      notes: customers.notes,
      createdBy: customers.createdBy,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
      deletedAt: customers.deletedAt,
      // users表的会员字段(优先使用users表数据)
      membershipStatus: users.membershipStatus,
      membershipOrderId: users.membershipOrderId,
      membershipActivatedAt: users.membershipActivatedAt,
      membershipExpiresAt: users.membershipExpiresAt,
    })
    .from(customers)
    .leftJoin(users, eq(customers.userId, users.id))
    .where(isNull(customers.deletedAt))
    .orderBy(desc(customers.createdAt));
  
  // 返回客户数据，添加默认值
  return customersData.map(customer => ({
    ...customer,
    totalSpent: "0.00",
    lastOrderDate: null,
    firstOrderDate: null,
    accountBalance: customer.accountBalance || "0.00",
    classCount: 0,
    // 如果没有关联users表,会员状态默认为pending
    membershipStatus: customer.membershipStatus || 'pending',
    membershipOrderId: customer.membershipOrderId || null,
    membershipActivatedAt: customer.membershipActivatedAt || null,
    membershipExpiresAt: customer.membershipExpiresAt || null,
  }));
}

export async function searchCustomers(keyword: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(customers)
    .where(
      sql`${customers.name} LIKE ${`%${keyword}%`} OR ${customers.wechatId} LIKE ${`%${keyword}%`} OR ${customers.phone} LIKE ${`%${keyword}%`}`
    )
    .orderBy(desc(customers.createdAt));
}

/**
 * 根据userId获取业务客户
 */
export async function getCustomerByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(eq(customers.userId, userId)).limit(1);
  return result[0] || null;
}

/**
 * 根据手机号获取业务客户
 */
export async function getCustomerByPhone(phone: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
  return result[0] || null;
}

/**
 * 为App用户获取或创建业务客户
 * 如果用户已有关联的业务客户，返回该客户
 * 如果没有，则自动创建一个新的业务客户并关联
 */
export async function getOrCreateCustomerForUser(user: {
  id: number;
  name?: string | null;
  nickname?: string | null;
  phone?: string | null;
}): Promise<{ customerId: number; customerName: string; isNew: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 1. 先通过userId查找已关联的业务客户
  const existingByUserId = await getCustomerByUserId(user.id);
  if (existingByUserId) {
    return {
      customerId: existingByUserId.id,
      customerName: existingByUserId.name,
      isNew: false,
    };
  }
  
  // 2. 通过手机号查找已存在的业务客户
  if (user.phone) {
    const existingByPhone = await getCustomerByPhone(user.phone);
    if (existingByPhone) {
      // 关联现有客户到用户
      await db.update(customers).set({ userId: user.id }).where(eq(customers.id, existingByPhone.id));
      return {
        customerId: existingByPhone.id,
        customerName: existingByPhone.name,
        isNew: false,
      };
    }
  }
  
  // 3. 创建新的业务客户
  const customerName = user.name || user.nickname || user.phone || `用户${user.id}`;
  const customerId = await createCustomer({
    userId: user.id,
    name: customerName,
    phone: user.phone || undefined,
    trafficSource: "App注册",
    createdBy: user.id,
  });
  
  return {
    customerId,
    customerName,
    isNew: true,
  };
}

/**
 * 删除customer（软删除）并级联更新users表
 * 使用事务确保原子性，防止孤立记录
 */
export async function deleteCustomer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 使用事务确保级联操作的原子性
  return await db.transaction(async (tx) => {
    // 1. 获取customer信息，检查是否存在
    const [customer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    
    if (!customer) {
      throw new Error(`Customer ${id} not found`);
    }
    
    // 2. 如果customer关联了user，需要解除关联
    // 注意：users表不存储customer相关字段，只有customers表存储userId
    // 所以只需要软删除customer即可，不需要更新users表
    
    // 3. 软删除customer记录
    await tx
      .update(customers)
      .set({ deletedAt: new Date() })
      .where(eq(customers.id, id));
    
    console.log(`[deleteCustomer] Customer ${id} (${customer.name}) deleted successfully`);
    if (customer.userId) {
      console.log(`[deleteCustomer] Customer was linked to user ${customer.userId}`);
    }
  });
}

// ========== 订单管理 ==========

export async function checkOrderNoExists(orderNo: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(orders).where(eq(orders.orderNo, orderNo)).limit(1);
  return result.length > 0;
}

export async function createOrder(order: InsertOrder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 检查渠道订单号是否重复
  if (order.channelOrderNo && order.channelOrderNo.trim() !== '') {
    const exists = await checkChannelOrderNoExists(order.channelOrderNo);
    if (exists) {
      const existingOrder = await getOrderByChannelOrderNo(order.channelOrderNo);
      throw new Error(
        `渠道订单号已存在: ${order.channelOrderNo}\n` +
        `关联订单: ${existingOrder?.orderNo || '未知'} (客户: ${existingOrder?.customerName || '未知'})`
      );
    }
  }
  
  const result = await db.insert(orders).values(order);
  return { id: result[0].insertId, ...order };
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0] || null;
}

export async function getTeacherOrders(teacherId: number, deliveryStatus?: string) {
  const db = await getDb();
  if (!db) return [];
  
  // 查找该老师的用户信息
  const teacher = await db.select().from(users).where(eq(users.id, teacherId)).limit(1);
  if (!teacher || teacher.length === 0) return [];
  
  const teacherName = teacher[0].name || teacher[0].nickname;
  if (!teacherName) return [];
  
  // 查询分配给该老师的订单（通过deliveryTeacher字段匹配）
  if (deliveryStatus) {
    return db.select().from(orders)
      .where(and(
        eq(orders.deliveryTeacher, teacherName),
        eq(orders.deliveryStatus, deliveryStatus as any)
      ))
      .orderBy(orders.classDate);
  }
  
  return db.select().from(orders)
    .where(eq(orders.deliveryTeacher, teacherName))
    .orderBy(orders.classDate);
}

export async function getOrdersByIds(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return [];
  return db.select().from(orders).where(sql`${orders.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);
}

export async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getOrdersBySales(salesId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.salesId, salesId)).orderBy(desc(orders.createdAt));
}

export async function getOrdersByCustomerName(customerName: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.customerName, customerName)).orderBy(desc(orders.createdAt));
}

export async function getOrdersBySalesPerson(salesPerson: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.salesPerson, salesPerson)).orderBy(desc(orders.createdAt));
}

export async function getOrdersByDateRange(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orders)
    .where(
      sql`${orders.paymentDate} >= ${startDate} AND ${orders.paymentDate} <= ${endDate}`
    )
    .orderBy(desc(orders.paymentDate));
}

export async function updateOrder(id: number, data: Partial<InsertOrder>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 如果更新了老师费用或课程金额,需要验证
  if (data.teacherFee !== undefined || data.courseAmount !== undefined) {
    // 获取现有订单数据
    const existingOrder = await getOrderById(id);
    if (!existingOrder) throw new Error("订单不存在");
    
    // 使用新值或现有值
    const teacherFee = data.teacherFee !== undefined ? parseFloat(data.teacherFee as any) : parseFloat(existingOrder.teacherFee as any || "0");
    const courseAmount = data.courseAmount !== undefined ? parseFloat(data.courseAmount as any) : parseFloat(existingOrder.courseAmount as any || "0");
    
    // 验证老师费用
    const { validateTeacherFee } = await import("./teacherFeeValidator");
    const validation = validateTeacherFee(teacherFee, courseAmount);
    if (!validation.isValid) {
      throw new Error(validation.error || "老师费用验证失败");
    }
  }
  
  await db.update(orders).set(data).where(eq(orders.id, id));
  
  // 返回更新后的订单
  const updated = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return updated[0];
}

/**
 * 更新订单支付状态
 * @param id 订单ID
 * @param status 支付状态
 */
export async function updateOrderStatus(id: number, status: "pending" | "paid" | "completed" | "cancelled" | "refunded") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(orders).set({ status }).where(eq(orders.id, id));
  return { success: true, message: "订单状态更新成功" };
}

/**
 * 更新订单交付状态
 * @param id 订单ID
 * @param deliveryStatus 交付状态
 * @param userId 接单老师ID（可选，当状态变为accepted时自动记录）
 */
export async function updateOrderDeliveryStatus(
  id: number, 
  deliveryStatus: "pending" | "accepted" | "delivered",
  userId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { deliveryStatus };
  
  // 如果状态变为"已接单"，自动记录接单信息
  if (deliveryStatus === "accepted" && userId) {
    updateData.acceptedBy = userId;
    updateData.acceptedAt = new Date();
  }
  
  // 如果状态变回"待接单"，清除接单信息
  if (deliveryStatus === "pending") {
    updateData.acceptedBy = null;
    updateData.acceptedAt = null;
  }
  
  await db.update(orders).set(updateData).where(eq(orders.id, id));
  return { success: true, message: "订单交付状态更新成功" };
}

/**
 * 老师端查询订单 - 查询已支付但未交付的订单
 * @param teacherName 老师名称(可选)
 * @param city 城市(可选)
 * @returns 订单列表
 */
export async function getTeacherPendingOrders(teacherName?: string, city?: string) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "paid"), // 已支付
        eq(orders.deliveryStatus, "pending") // 未交付
      )
    );
  
  // 如果指定了老师名称,过滤
  if (teacherName) {
    query = db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, "paid"),
          eq(orders.deliveryStatus, "pending"),
          eq(orders.deliveryTeacher, teacherName)
        )
      );
  }
  
  // 如果指定了城市,过滤
  if (city) {
    query = db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, "paid"),
          eq(orders.deliveryStatus, "pending"),
          teacherName ? eq(orders.deliveryTeacher, teacherName) : undefined,
          eq(orders.deliveryCity, city)
        )
      );
  }
  
  const result = await query;
  return result;
}

export async function updateOrderNo(id: number, orderNo: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({ orderNo }).where(eq(orders.id, id));
}

export async function deleteOrder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    await db.delete(orders).where(eq(orders.id, id));
  } catch (error) {
    console.error('[DB] deleteOrder failed:', { id, error });
    throw new Error(`Failed to delete order ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 根据渠道订单号删除订单
 * @param channelOrderNo - 渠道订单号
 * @returns 删除的订单信息
 */
export async function deleteOrderByChannelOrderNo(channelOrderNo: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 先获取订单信息用于返回
  const order = await getOrderByChannelOrderNo(channelOrderNo);
  if (!order) {
    return null;
  }
  
  // 删除订单
  await db.delete(orders).where(eq(orders.channelOrderNo, channelOrderNo));
  
  return order;
}

// ========== 城市财务统计 ==========

export async function getCityFinancialStats(dateRange?: string, customStartDate?: string, customEndDate?: string) {
  const db = await getDb();
  if (!db) return [];

  // 根据时间范围过滤订单
  let query = db.select().from(orders);
  
  // 优先使用自定义日期范围
  if (customStartDate && customEndDate) {
    query = query.where(
      sql`${orders.classDate} >= ${customStartDate} AND ${orders.classDate} <= ${customEndDate}`
    ) as any;
  } else if (dateRange) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'thisWeek': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1); // 周一
        weekStart.setHours(0, 0, 0, 0);
        startDate = weekStart;
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'thisQuarter': {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        endDate = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0, 23, 59, 59);
        break;
      }
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      default:
        startDate = new Date(0); // 全部
    }

    const startDateStr = formatDateBeijing(startDate);
    const endDateStr = formatDateBeijing(endDate);
    
    query = query.where(
      sql`${orders.classDate} >= ${startDateStr} AND ${orders.classDate} <= ${endDateStr}`
    ) as any;
  }

  const allOrders = await query;

  // 按城市聚合统计
  const cityStats: Record<string, {
    city: string;
    orderCount: number;
    totalRevenue: number;
    teacherFee: number;
    transportFee: number;
    rentFee: number;
    propertyFee: number;
    utilityFee: number;
    consumablesFee: number;
    cleaningFee: number;
    phoneFee: number;
    expressFee: number;
    promotionFee: number;
    otherFee: number;
    totalExpense: number;
    partnerShare: number;
    deferredPayment: number;
    profit: number;
    profitMargin: number;
  }> = {};

  allOrders.forEach((order) => {
    const city = order.deliveryCity || '未知城市';
    
    if (!cityStats[city]) {
      cityStats[city] = {
        city,
        orderCount: 0,
        totalRevenue: 0,
        teacherFee: 0,
        transportFee: 0,
        rentFee: 0,
        propertyFee: 0,
        utilityFee: 0,
        consumablesFee: 0,
        cleaningFee: 0,
        phoneFee: 0,
        expressFee: 0,
        promotionFee: 0,
        otherFee: 0,
        totalExpense: 0,
        partnerShare: 0,
        deferredPayment: 0,
        profit: 0,
        profitMargin: 0,
      };
    }

    const revenue = parseFloat(order.paymentAmount || '0');
    const teacherFee = parseFloat(order.teacherFee || '0');
    const transportFee = parseFloat(order.transportFee || '0');

    cityStats[city].orderCount += 1;
    cityStats[city].totalRevenue += revenue;
    cityStats[city].teacherFee += teacherFee;
    cityStats[city].transportFee += transportFee;
  });

  // 从 partner_expenses 表获取城市费用数据(房租、物业费、水电费等)
  // 需要JOIN cities表获取城市名称
  const partnerExpensesData = await db
    .select({
      expense: partnerExpenses,
      cityName: cities.name,
    })
    .from(partnerExpenses)
    .leftJoin(cities, eq(partnerExpenses.cityId, cities.id));
  
  partnerExpensesData.forEach(({ expense, cityName }) => {
    const city = cityName || '未知城市';
    
    if (!cityStats[city]) {
      cityStats[city] = {
        city,
        orderCount: 0,
        totalRevenue: 0,
        teacherFee: 0,
        transportFee: 0,
        rentFee: 0,
        propertyFee: 0,
        utilityFee: 0,
        consumablesFee: 0,
        cleaningFee: 0,
        phoneFee: 0,
        expressFee: 0,
        promotionFee: 0,
        otherFee: 0,
        totalExpense: 0,
        partnerShare: 0,
        deferredPayment: 0,
        profit: 0,
        profitMargin: 0,
      };
    }
    
    cityStats[city].rentFee += parseFloat(expense.rentFee || '0');
    cityStats[city].propertyFee += parseFloat(expense.propertyFee || '0');
    cityStats[city].utilityFee += parseFloat(expense.utilityFee || '0');
    cityStats[city].consumablesFee += parseFloat(expense.consumablesFee || '0');
    cityStats[city].cleaningFee += parseFloat(expense.cleaningFee || '0');
    cityStats[city].phoneFee += parseFloat(expense.phoneFee || '0');
    cityStats[city].expressFee += parseFloat(expense.expressFee || '0');
    cityStats[city].promotionFee += parseFloat(expense.promotionFee || '0');
    cityStats[city].otherFee += parseFloat(expense.otherFee || '0');
    cityStats[city].partnerShare += parseFloat(expense.partnerShare || '0');
    cityStats[city].deferredPayment += parseFloat(expense.deferredPayment || '0');
  });

  // 计算总费用、净利润和利润率
  Object.values(cityStats).forEach((stat) => {
    // 总费用 = 老师费用 + 车费 + 房租 + 物业费 + 水电费 + 道具耗材 + 保洁费 + 话费 + 快递费 + 推广费 + 其他费用
    // 注意:不包含合同后付款
    stat.totalExpense = stat.teacherFee + stat.transportFee + stat.rentFee + stat.propertyFee + 
                        stat.utilityFee + stat.consumablesFee + stat.cleaningFee + stat.phoneFee + 
                        stat.expressFee + stat.promotionFee + stat.otherFee;
    
    // 净利润 = 销售额 - 总费用 + 合伙人承担 + 合同后付款
    stat.profit = stat.totalRevenue - stat.totalExpense + stat.partnerShare + stat.deferredPayment;
    stat.profitMargin = stat.totalRevenue > 0 ? (stat.profit / stat.totalRevenue) * 100 : 0;
  });

  // 按销售额降序排列
  return Object.values(cityStats).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// ========== 老师管理 ==========

export async function createTeacher(teacher: InsertTeacher) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(teachers).values(teacher);
  return result[0].insertId;
}

export async function getTeacherById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(teachers).where(eq(teachers.id, id)).limit(1);
  return result[0] || null;
}

export async function getAllTeachers() {
  const db = await getDb();
  if (!db) return [];
  const DEFAULT_AVATAR_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663214896586/JopHWzeEmqAYxCyT.png";
  
  // 1. 从u users表读取角色包含teacher的用户，过滤已删除记录
  const results = await db.select({
    id: users.id,
    name: users.name,
    nickname: users.nickname,
    phone: users.phone,
    customerType: users.customerType,
    isActive: sql<number>`1`, // users表没有isActive字段，默认为1
    avatarUrl: users.avatarUrl,
    teacherAttribute: users.teacherAttribute,
  }).from(users).where(
    and(
      like(users.roles, '%teacher%'),
      isNull(users.deletedAt) // 过滤已删除记录
    )
  ).orderBy(desc(users.createdAt));
  
  // 2. 获取所有老师的城市数据
  const teacherIds = results.map(t => t.id);
  if (teacherIds.length === 0) return [];
  
  const roleCitiesData = await db
    .select()
    .from(userRoleCities)
    .where(
      and(
        inArray(userRoleCities.userId, teacherIds),
        eq(userRoleCities.role, 'teacher')
      )
    );
  
  // 3. 构建userId到cities的映射
  const userCitiesMap = new Map<number, string>();
  roleCitiesData.forEach(rc => {
    try {
      const citiesArray = JSON.parse(rc.cities);
      userCitiesMap.set(rc.userId, Array.isArray(citiesArray) ? citiesArray.join(';') : rc.cities);
    } catch {
      userCitiesMap.set(rc.userId, rc.cities);
    }
  });
  
  // 4. 合并数据，如果avatarUrl为null,使用统一默认头像
  return results.map(teacher => ({
    ...teacher,
    avatarUrl: teacher.avatarUrl || DEFAULT_AVATAR_URL,
    city: userCitiesMap.get(teacher.id) || null,
  }));
}

// 用于内部解析器的完整老师列表(包含aliases等字段)
export async function getAllTeachersForParser() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teachers).where(eq(teachers.isActive, true)).orderBy(desc(teachers.createdAt));
}

export async function updateTeacher(id: number, data: Partial<InsertTeacher> & { aliases?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 将aliases字符串转换为JSON数组
  const updateData: any = { ...data };
  if (data.aliases !== undefined) {
    if (data.aliases && data.aliases.trim() !== '') {
      // 将逗号分隔的字符串转换为数组
      const aliasesArray = data.aliases.split(',').map(a => a.trim()).filter(a => a !== '');
      updateData.aliases = JSON.stringify(aliasesArray);
    } else {
      updateData.aliases = null;
    }
  }
  
  await db.update(teachers).set(updateData).where(eq(teachers.id, id));
}

// 批量删除老师（软删除users表记录）
export async function batchDeleteTeachers(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  console.log('[batchDeleteTeachers] 开始删除老师: ids=', ids);
  
  // 软删除users表中的老师记录
  await db
    .update(users)
    .set({ deletedAt: new Date() })
    .where(inArray(users.id, ids));
  
  console.log('[batchDeleteTeachers] 删除成功: count=', ids.length);
}

// 批量更新老师状态
export async function batchUpdateTeacherStatus(ids: number[], status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(teachers).set({ status }).where(inArray(teachers.id, ids));
}

// 批量创建老师
export async function batchCreateTeachers(teacherList: InsertTeacher[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = [];
  const stats = { created: 0, updated: 0, skipped: 0 };
  
  for (const teacher of teacherList) {
    // 1. 使用姓名+城市查重,检查是否已存在同名同城市的老师
    const cityName = teacher.city ? teacher.city.split(';')[0].trim() : '';
    let existingTeacher = null;
    
    if (cityName) {
      // 有城市信息,查找同名同城市的老师
      existingTeacher = await db.select().from(teachers)
        .where(and(
          eq(teachers.name, teacher.name),
          sql`${teachers.city} LIKE ${`%${cityName}%`}`
        ))
        .limit(1);
    } else {
      // 没有城市信息,只按姓名查找
      existingTeacher = await db.select().from(teachers)
        .where(eq(teachers.name, teacher.name))
        .limit(1);
    }
    
    let teacherId: number;
    
    if (existingTeacher && existingTeacher.length > 0) {
      // 老师已存在,更新现有记录
      teacherId = existingTeacher[0].id;
      await db.update(teachers).set({
        phone: teacher.phone || existingTeacher[0].phone,
        isActive: teacher.isActive ?? existingTeacher[0].isActive,
        customerType: teacher.customerType || existingTeacher[0].customerType,
        city: teacher.city || existingTeacher[0].city,
        contractEndDate: teacher.contractEndDate || existingTeacher[0].contractEndDate,
        joinDate: teacher.joinDate || existingTeacher[0].joinDate,
        notes: teacher.notes || existingTeacher[0].notes,
        updatedAt: new Date(),
      }).where(eq(teachers.id, teacherId));
      stats.updated++;
    } else {
      // 老师不存在,创建新记录
      const teacherResult = await db.insert(teachers).values(teacher);
      teacherId = teacherResult[0].insertId;
      stats.created++;
    }
    
    // 2. 创建对应的users记录
    // 检查是否已存在同名用户
    const existingUser = await db.select().from(users).where(eq(users.name, teacher.name)).limit(1);
    
    let userId: number;
    if (existingUser.length > 0) {
      // 用户已存在,使用现有用户ID
      userId = existingUser[0].id;
      
      // 更新用户角色(添加老师角色)
      const currentRoles = existingUser[0].roles ? existingUser[0].roles.split(',') : [];
      if (!currentRoles.includes('teacher')) {
        currentRoles.push('teacher');
      }
      if (!currentRoles.includes('user')) {
        currentRoles.push('user');
      }
      await db.update(users).set({ 
        roles: currentRoles.join(','),
        phone: teacher.phone || existingUser[0].phone,
      }).where(eq(users.id, userId));
    } else {
      // 创建新用户
      // 生成唯一的openId(使用teacher_+时间戳+随机数)
      const openId = `teacher_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      const userResult = await db.insert(users).values({
        openId,
        name: teacher.name,
        phone: teacher.phone || null,
        password: '123456', // 默认密码
        roles: 'user,teacher', // 普通用户+老师
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      userId = userResult[0].insertId;
    }
    
    // 3. 如果有城市信息,创建userRoleCities关联记录
    if (teacher.city) {
      const cityNames = teacher.city.split(';').map(c => c.trim()).filter(c => c !== '');
      
      if (cityNames.length > 0) {
        // 检查是否已存在teacher角色的城市关联
        const existingRoleCity = await db.select().from(userRoleCities)
          .where(and(
            eq(userRoleCities.userId, userId),
            eq(userRoleCities.role, 'teacher')
          ))
          .limit(1);
        
        if (existingRoleCity.length > 0) {
          // 已存在,合并城市列表
          const existingCities = JSON.parse(existingRoleCity[0].cities);
          const mergedCities = Array.from(new Set([...existingCities, ...cityNames]));
          await db.update(userRoleCities)
            .set({ cities: JSON.stringify(mergedCities) })
            .where(eq(userRoleCities.id, existingRoleCity[0].id));
        } else {
          // 不存在,创建新关联
          await db.insert(userRoleCities).values({
            userId,
            role: 'teacher',
            cities: JSON.stringify(cityNames),
            createdAt: new Date(),
          });
        }
      }
    }
    
    results.push({ id: teacherId, name: teacher.name, userId });
  }
  
  return { results, stats };
}

// 获取所有老师名字(用于验证)
export async function getAllTeacherNames() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ name: teachers.name, aliases: teachers.aliases }).from(teachers).where(eq(teachers.isActive, true));
  
  // 收集所有名字(包括真实名和别名)
  const allNames: string[] = [];
  result.forEach(r => {
    allNames.push(r.name);
    if (r.aliases) {
      try {
        const aliases = JSON.parse(r.aliases);
        if (Array.isArray(aliases)) {
          allNames.push(...aliases);
        }
      } catch (e) {
        // 忽略JSON解析错误
      }
    }
  });
  
  return allNames;
}

// 检查名字是否为老师名
export async function isTeacherName(name: string | null | undefined): Promise<boolean> {
  if (!name || name.trim() === '') return false;
  const teacherNames = await getAllTeacherNames();
  return teacherNames.includes(name.trim());
}

// 获取老师统计数据(从orders表统计)
export async function getTeacherStats(teacherId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return null;

  // 先获取老师信息
  const teacher = await db.select().from(teachers).where(eq(teachers.id, teacherId)).limit(1);
  if (!teacher || teacher.length === 0) {
    return {
      classCount: 0,
      totalHours: 0,
      totalIncome: 0,
    };
  }
  const teacherName = teacher[0].name;

  // 从orders表统计授课次数和收入(根据deliveryTeacher字段匹配老师名)
  const orderConditions = [];
  orderConditions.push(eq(orders.deliveryTeacher, teacherName));
  
  // 排除已取消的订单
  orderConditions.push(ne(orders.status, "cancelled"));
  
  if (startDate && endDate) {
    orderConditions.push(gte(orders.classDate, startDate));
    orderConditions.push(lte(orders.classDate, endDate));
  }

  const orderStats = await db
    .select({
      count: sql<number>`COUNT(*)`,
      totalIncome: sql<number>`COALESCE(SUM(${orders.teacherFee}), 0)`,
    })
    .from(orders)
    .where(and(...orderConditions));

  // 计算总课时(从classTime字段解析,格式如"11:00-13:00")
  const orderRecords = await db
    .select({
      classTime: orders.classTime,
    })
    .from(orders)
    .where(and(...orderConditions));

  let totalHours = 0;
  for (const record of orderRecords) {
    if (record.classTime) {
      const hours = parseClassTimeToHours(record.classTime);
      totalHours += hours;
    }
  }

  return {
    classCount: Number(orderStats[0]?.count) || 0,
    totalHours: totalHours,
    totalIncome: Number(orderStats[0]?.totalIncome) || 0,
  };
}

// 辅助函数:解析上课时间字符串为小时数
function parseClassTimeToHours(classTime: string): number {
  try {
    // 支持格式: "11:00-13:00", "11:00~13:00", "11:00～13:00", "11.00-13.00"
    const timeRange = classTime.replace(/[~～]/g, '-').replace(/\./g, ':');
    const match = timeRange.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    
    if (!match) return 0;
    
    const startHour = parseInt(match[1]);
    const startMinute = parseInt(match[2]);
    const endHour = parseInt(match[3]);
    const endMinute = parseInt(match[4]);
    
    let startTotalMinutes = startHour * 60 + startMinute;
    let endTotalMinutes = endHour * 60 + endMinute;
    
    // 如果结束时间小于开始时间,说明跨越了午夜,给结束时间加1440分钟(24小时)
    if (endTotalMinutes < startTotalMinutes) {
      endTotalMinutes += 1440; // 24 * 60 = 1440分钟
    }
    
    const durationMinutes = endTotalMinutes - startTotalMinutes;
    
    return durationMinutes / 60; // 转换为小时
  } catch (error) {
    console.error('[parseClassTimeToHours] Error parsing classTime:', classTime, error);
    return 0;
  }
}

// 获取所有老师的统计数据
export async function getAllTeachersStats(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  const allTeachers = await getAllTeachers();
  const stats = await Promise.all(
    allTeachers.map(async (teacher) => {
      const teacherStats = await getTeacherStats(teacher.id, startDate, endDate);
      return {
        teacherId: teacher.id,
        teacherName: teacher.name,
        ...teacherStats,
      };
    })
  );

  return stats;
}

// ========== 课程排课 ==========

export async function createSchedule(schedule: InsertSchedule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(schedules).values(schedule);
  return result[0].insertId;
}

export async function getScheduleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
  return result[0] || null;
}

export async function getSchedulesByDateRange(startTime: Date, endTime: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(schedules)
    .where(and(gte(schedules.startTime, startTime), lte(schedules.startTime, endTime)))
    .orderBy(schedules.startTime);
}

export async function getSchedulesByTeacher(teacherId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schedules).where(eq(schedules.teacherId, teacherId)).orderBy(desc(schedules.startTime));
}

export async function getSchedulesWithOrderInfo() {
  const db = await getDb();
  if (!db) return [];
  
  // 查询所有有渠道订单号的排课记录
  const allSchedules = await db.select().from(schedules).orderBy(desc(schedules.startTime));
  
  // 为每个排课记录匹配订单信息
  const schedulesWithOrders = await Promise.all(
    allSchedules.map(async (schedule) => {
      let matchedOrder = null;
      
      // 如果有渠道订单号，尝试匹配订单
      if (schedule.channelOrderNo) {
        const orderResult = await db
          .select()
          .from(orders)
          .where(eq(orders.channelOrderNo, schedule.channelOrderNo))
          .limit(1);
        
        matchedOrder = orderResult[0] || null;
      }
      
      return {
        ...schedule,
        matchedOrder,
      };
    })
  );
  
  return schedulesWithOrders;
}

export async function deleteSchedule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(schedules).where(eq(schedules.id, id));
}

export async function getSchedulesByUserId(
  userId: number,
  filters?: {
    status?: "scheduled" | "completed" | "cancelled";
    startDate?: string;
    endDate?: string;
  }
) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select({
      id: schedules.id,
      cityId: schedules.city,
      teacherId: schedules.teacherId,
      teacherName: schedules.teacherName,
      courseType: schedules.courseType,
      scheduledDate: schedules.classDate,
      scheduledTime: schedules.classTime,
      startTime: schedules.startTime,
      endTime: schedules.endTime,
      status: schedules.status,
      contactName: schedules.customerName,
      contactPhone: schedules.wechatId,
      notes: schedules.notes,
      createdAt: schedules.createdAt,
    })
    .from(schedules)
    .where(eq(schedules.customerId, userId));

  // 应用筛选条件
  const conditions = [eq(schedules.customerId, userId)];

  if (filters?.status) {
    conditions.push(eq(schedules.status, filters.status));
  }

  if (filters?.startDate) {
    conditions.push(gte(schedules.startTime, new Date(filters.startDate)));
  }

  if (filters?.endDate) {
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999); // 设置为当天的最后一刻
    conditions.push(lte(schedules.startTime, endDate));
  }

  if (conditions.length > 1) {
    query = db
      .select({
        id: schedules.id,
        cityId: schedules.city,
        teacherId: schedules.teacherId,
        teacherName: schedules.teacherName,
        courseType: schedules.courseType,
        scheduledDate: schedules.classDate,
        scheduledTime: schedules.classTime,
        startTime: schedules.startTime,
        endTime: schedules.endTime,
        status: schedules.status,
        contactName: schedules.customerName,
        contactPhone: schedules.wechatId,
        notes: schedules.notes,
        createdAt: schedules.createdAt,
      })
      .from(schedules)
      .where(and(...conditions));
  }

  return query.orderBy(desc(schedules.startTime));
}

export async function cancelSchedule(scheduleId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 验证预约是否存在且属于该用户
  const schedule = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.id, scheduleId), eq(schedules.customerId, userId)))
    .limit(1);

  if (!schedule || schedule.length === 0) {
    throw new Error("预约不存在或无权取消");
  }

  if (schedule[0].status === "cancelled") {
    throw new Error("预约已取消");
  }

  if (schedule[0].status === "completed") {
    throw new Error("已完成的预约无法取消");
  }

  // 检查取消时限(预约开始时间前24小时)
  const now = new Date();
  const startTime = new Date(schedule[0].startTime);
  const hoursDiff = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursDiff < 24) {
    throw new Error("预约开始前24小时内无法取消");
  }

  // 更新状态为cancelled
  await db
    .update(schedules)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(schedules.id, scheduleId));

  return true;
}

export async function checkTeacherTimeConflict(
  teacherId: number,
  startTime: Date,
  endTime: Date,
  excludeScheduleId?: number
) {
  const db = await getDb();
  if (!db) return false;

  let query = db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.teacherId, teacherId),
        eq(schedules.status, "scheduled"),
        or(
          // 新预约的开始时间在现有预约时间范围内
          and(gte(schedules.startTime, startTime), lte(schedules.startTime, endTime)),
          // 新预约的结束时间在现有预约时间范围内
          and(gte(schedules.endTime, startTime), lte(schedules.endTime, endTime)),
          // 新预约完全包含现有预约
          and(lte(schedules.startTime, startTime), gte(schedules.endTime, endTime))
        )
      )
    );

  const conflicts = await query;

  // 如果是更新操作,排除当前预约
  if (excludeScheduleId) {
    return conflicts.filter((s) => s.id !== excludeScheduleId).length > 0;
  }

  return conflicts.length > 0;
}

// ========== 老师费用 ==========

export async function createTeacherPayment(payment: InsertTeacherPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(teacherPayments).values(payment);
  return result[0].insertId;
}

export async function getTeacherPaymentsByTeacher(teacherId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(teacherPayments)
    .where(eq(teacherPayments.teacherId, teacherId))
    .orderBy(desc(teacherPayments.createdAt));
}

export async function updateTeacherPaymentStatus(id: number, status: "pending" | "paid", paymentTime?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const data: any = { status };
  if (paymentTime) data.paymentTime = paymentTime;
  await db.update(teacherPayments).set(data).where(eq(teacherPayments.id, id));
}

// ========== 财务对账 ==========

export async function createReconciliation(reconciliation: InsertReconciliation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reconciliations).values(reconciliation);
  return result[0].insertId;
}

export async function getAllReconciliations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reconciliations).orderBy(desc(reconciliations.periodStart));
}

export async function updateReconciliation(id: number, data: Partial<InsertReconciliation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reconciliations).set(data).where(eq(reconciliations.id, id));
}

// ========== 数据统计 ==========

export async function getOrderStatsByDateRange(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      totalOrders: sql<number>`COUNT(*)`,
      totalPaymentAmount: sql<number>`SUM(${orders.paymentAmount})`,
      totalTeacherFee: sql<number>`SUM(${orders.teacherFee})`,
      totalTransportFee: sql<number>`SUM(${orders.transportFee})`,
      totalOtherFee: sql<number>`SUM(${orders.otherFee})`,
      totalPartnerFee: sql<number>`SUM(${orders.partnerFee})`,
      totalFinalAmount: sql<number>`SUM(${orders.finalAmount})`,
      // 净利润 = 销售额 - 老师费用 - 车费 - 其他费用 - 合伙人费用
      netProfit: sql<number>`SUM(${orders.paymentAmount}) - SUM(${orders.teacherFee}) - SUM(${orders.transportFee}) - SUM(${orders.otherFee}) - SUM(${orders.partnerFee})`,
    })
    .from(orders)
    .where(
      sql`${orders.classDate} >= ${startDate} AND ${orders.classDate} <= ${endDate}`
    );

  return result[0];
}

export async function getSalesPerformance(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      salesId: orders.salesId,
      totalOrders: sql<number>`COUNT(*)`,
      totalAmount: sql<number>`SUM(${orders.paymentAmount})`,
    })
    .from(orders)
    .where(
      sql`${orders.paymentDate} >= ${startDate} AND ${orders.paymentDate} <= ${endDate}`
    )
    .groupBy(orders.salesId);
}

export async function getCityRevenue() {
  const db = await getDb();
  if (!db) return [];

  // 获取所有订单
  const allOrders = await db
    .select({
      paymentCity: orders.paymentCity,
      paymentAmount: orders.paymentAmount,
      teacherFee: orders.teacherFee,
    })
    .from(orders)
    .where(sql`${orders.status} != 'cancelled'`);

  // 按城市分组计算收益
  const cityRevenueMap = new Map<string, { revenue: number; orderCount: number }>();
  
  for (const order of allOrders) {
    const city = order.paymentCity || '未知城市';
    const paymentAmount = parseFloat(order.paymentAmount?.toString() || '0');
    const teacherFee = parseFloat(order.teacherFee?.toString() || '0');
    const baseRevenue = paymentAmount - teacherFee;
    
    // 根据城市计算收益比例
    let ratio = 0.3; // 默认比例
    if (city === '天津') {
      ratio = 0.5;
    } else if (city === '武汉') {
      ratio = 0.4;
    } else if (city === '上海') {
      ratio = 1.0;
    }
    
    const revenue = baseRevenue * ratio;
    
    if (!cityRevenueMap.has(city)) {
      cityRevenueMap.set(city, { revenue: 0, orderCount: 0 });
    }
    
    const cityData = cityRevenueMap.get(city)!;
    cityData.revenue += revenue;
    cityData.orderCount += 1;
  }
  
  // 转换为数组并按收益排序
  return Array.from(cityRevenueMap.entries())
    .map(([city, data]) => ({
      city,
      revenue: data.revenue.toFixed(2),
      orderCount: data.orderCount,
    }))
    .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue));
}

export async function getCityRevenueTrend() {
  const db = await getDb();
  if (!db) return { months: [], cities: [] };

  // 计算最近6个月的日期范围
  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  // 获取最近6个月的订单
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const allOrders = await db
    .select({
      paymentCity: orders.paymentCity,
      paymentAmount: orders.paymentAmount,
      teacherFee: orders.teacherFee,
      paymentDate: orders.paymentDate,
    })
    .from(orders)
    .where(
      sql`${orders.status} != 'cancelled' AND ${orders.paymentDate} >= ${formatDateBeijing(sixMonthsAgo)}`
    );

  // 按城市和月份分组计算收益
  const cityMonthRevenueMap = new Map<string, Map<string, number>>();
  
  for (const order of allOrders) {
    if (!order.paymentDate) continue;
    
    const city = order.paymentCity || '未知城市';
    const paymentAmount = parseFloat(order.paymentAmount?.toString() || '0');
    const teacherFee = parseFloat(order.teacherFee?.toString() || '0');
    const baseRevenue = paymentAmount - teacherFee;
    
    // 根据城市计算收益比例
    let ratio = 0.3;
    if (city === '天津') {
      ratio = 0.5;
    } else if (city === '武汉') {
      ratio = 0.4;
    } else if (city === '上海') {
      ratio = 1.0;
    }
    
    const revenue = baseRevenue * ratio;
    
    // 获取月份
    const date = new Date(order.paymentDate);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!cityMonthRevenueMap.has(city)) {
      cityMonthRevenueMap.set(city, new Map());
    }
    
    const monthRevenueMap = cityMonthRevenueMap.get(city)!;
    monthRevenueMap.set(month, (monthRevenueMap.get(month) || 0) + revenue);
  }
  
  // 转换为前端需要的格式
  const cities = Array.from(cityMonthRevenueMap.entries()).map(([city, monthRevenueMap]) => {
    const data = months.map(month => {
      const revenue = monthRevenueMap.get(month) || 0;
      return parseFloat(revenue.toFixed(2));
    });
    
    return {
      city,
      data,
    };
  });
  
  // 按总收益排序,只返回前5个城市
  cities.sort((a, b) => {
    const sumA = a.data.reduce((acc, val) => acc + val, 0);
    const sumB = b.data.reduce((acc, val) => acc + val, 0);
    return sumB - sumA;
  });
  
  return {
    months,
    cities: cities.slice(0, 5),
  };
}

// ========== 顾客统计 ==========

export async function getCustomerStats() {
  const db = await getDb();
  if (!db) return {
    totalCustomers: 0,
    returningCustomers: 0,
    memberCustomers: 0,
    todayNewCustomers: 0,
    todayReturningCustomers: 0,
  };

  const todayStr = formatDateBeijing(new Date());

  // 累计顾客数(所有客户)
  const totalCustomersResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(customers);
  const totalCustomers = totalCustomersResult[0]?.count || 0;

  // 累计回头客(有多个订单的客户)
  const returningCustomersResult = await db
    .select({
      customerId: orders.customerId,
      orderCount: sql<number>`COUNT(*)`
    })
    .from(orders)
    .where(sql`${orders.customerId} IS NOT NULL AND ${orders.status} NOT IN ('pending', 'cancelled')`)
    .groupBy(orders.customerId)
    .having(sql`COUNT(*) > 1`);
  const returningCustomers = returningCustomersResult.length;

  // 累计会员(这里暂时用有3个或以上订单的客户作为会员)
  const memberCustomersResult = await db
    .select({
      customerId: orders.customerId,
      orderCount: sql<number>`COUNT(*)`
    })
    .from(orders)
    .where(sql`${orders.customerId} IS NOT NULL AND ${orders.status} NOT IN ('pending', 'cancelled')`)
    .groupBy(orders.customerId)
    .having(sql`COUNT(*) >= 3`);
  const memberCustomers = memberCustomersResult.length;

  // 今日新客(今天创建的客户)
  const todayNewCustomersResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(customers)
    .where(sql`DATE(${customers.createdAt}) = ${todayStr}`);
  const todayNewCustomers = todayNewCustomersResult[0]?.count || 0;

  // 今日老客(今天有订单的回头客)
  const todayReturningCustomersResult = await db
    .select({
      customerId: orders.customerId,
    })
    .from(orders)
    .where(
      sql`${orders.customerId} IS NOT NULL AND DATE(${orders.paymentDate}) = ${todayStr} AND ${orders.status} NOT IN ('pending', 'cancelled')`
    )
    .groupBy(orders.customerId);
  
  // 检查这些客户是否是回头客
  let todayReturningCustomers = 0;
  for (const row of todayReturningCustomersResult) {
    const orderCountResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(
        sql`${orders.customerId} = ${row.customerId} AND ${orders.status} NOT IN ('pending', 'cancelled')`
      );
    if ((orderCountResult[0]?.count || 0) > 1) {
      todayReturningCustomers++;
    }
  }

  return {
    totalCustomers,
    returningCustomers,
    memberCustomers,
    todayNewCustomers,
    todayReturningCustomers,
  };
}

// ========== 流失预警 ==========

export async function getChurnRiskCustomers() {
  const db = await getDb();
  if (!db) return [];

  // 计算30天前的日期
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = formatDateBeijing(thirtyDaysAgo);

  // 查找所有有过订单的客户（老客）
  const allCustomersWithOrders = await db
    .select({
      customerId: orders.customerId,
      customerName: orders.customerName,
      lastOrderDate: sql<string>`MAX(${orders.paymentDate})`,
      orderCount: sql<number>`COUNT(*)`,
      totalAmount: sql<string>`SUM(${orders.paymentAmount})`,
    })
    .from(orders)
    .where(
      sql`${orders.customerId} IS NOT NULL AND ${orders.status} NOT IN ('pending', 'cancelled')`
    )
    .groupBy(orders.customerId, orders.customerName);

  // 筛选出超过30天未下单的老客户
  const churnRiskCustomers = allCustomersWithOrders.filter(customer => {
    if (!customer.lastOrderDate) return false;
    const lastOrderDate = new Date(customer.lastOrderDate);
    return lastOrderDate < thirtyDaysAgo;
  });

  // 获取客户详细信息
  const result = await Promise.all(
    churnRiskCustomers.map(async (customer) => {
      const customerInfo = await db
        .select()
        .from(customers)
        .where(eq(customers.id, customer.customerId!))
        .limit(1);

      const daysSinceLastOrder = Math.floor(
        (Date.now() - new Date(customer.lastOrderDate!).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        customerId: customer.customerId,
        customerName: customer.customerName,
        phone: customerInfo[0]?.phone || null,
        wechatId: customerInfo[0]?.wechatId || null,
        lastOrderDate: customer.lastOrderDate,
        daysSinceLastOrder,
        orderCount: customer.orderCount,
        totalAmount: parseFloat(customer.totalAmount || '0'),
      };
    })
  );

  // 按距离最后一次订单的天数排序（降序）
  result.sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder);

  return result;
}

// ========== 订单批量操作 ==========

export async function batchDeleteOrders(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    for (const id of ids) {
      await db.delete(orders).where(eq(orders.id, id));
    }
  } catch (error) {
    console.error('[DB] batchDeleteOrders failed:', { ids, error });
    throw new Error(`Failed to batch delete orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function batchUpdateOrderStatus(
  ids: number[], 
  status: "pending" | "paid" | "completed" | "cancelled" | "refunded"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  for (const id of ids) {
    await db.update(orders).set({ status }).where(eq(orders.id, id));
  }
}

// ========== 数据导入日志 ==========

export async function createImportLog(log: InsertImportLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(importLogs).values(log);
  return result[0].insertId;
}

export async function getImportLogs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(importLogs).orderBy(desc(importLogs.createdAt)).limit(50);
}

// ========== 数据看板统计 ==========

// 交付老师月度统计(上课数量和收益金额)
export async function getTeacherMonthlyStats() {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const result = await db
    .select({
      teacher: orders.deliveryTeacher,
      classCount: sql<number>`count(*)`,
      totalRevenue: sql<string>`sum(CAST(${orders.paymentAmount} AS DECIMAL(10,2)) - COALESCE(CAST(${orders.teacherFee} AS DECIMAL(10,2)), 0))`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, startOfMonth),
        ne(orders.status, "cancelled"),
        isNotNull(orders.deliveryTeacher)
      )
    )
    .groupBy(orders.deliveryTeacher);
  
  return result.map(r => ({
    teacher: r.teacher || '未知',
    classCount: r.classCount,
    totalRevenue: parseFloat(r.totalRevenue || '0'),
  })).sort((a, b) => b.classCount - a.classCount);
}

// 流量来源月度统计
export async function getTrafficSourceMonthlyStats() {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const result = await db
    .select({
      source: orders.trafficSource,
      orderCount: sql<number>`count(*)`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, startOfMonth),
        ne(orders.status, "cancelled"),
        isNotNull(orders.trafficSource)
      )
    )
    .groupBy(orders.trafficSource);
  
  return result.map(r => ({
    source: r.source || '未知',
    orderCount: r.orderCount,
  })).sort((a, b) => b.orderCount - a.orderCount);
}

// 流量来源详细统计(包含成交额和转化率)
export async function getTrafficSourceAnalysis() {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const result = await db
    .select({
      source: orders.trafficSource,
      orderCount: sql<number>`count(*)`,
      totalRevenue: sql<string>`COALESCE(SUM(CAST(${orders.paymentAmount} AS DECIMAL(10,2))), 0)`,
      paidOrderCount: sql<number>`SUM(CASE WHEN ${orders.status} = 'paid' THEN 1 ELSE 0 END)`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, startOfMonth),
        ne(orders.status, "cancelled"),
        isNotNull(orders.trafficSource)
      )
    )
    .groupBy(orders.trafficSource);
  
  return result.map(r => {
    const orderCount = r.orderCount || 0;
    const paidOrderCount = r.paidOrderCount || 0;
    const conversionRate = orderCount > 0 ? (paidOrderCount / orderCount) * 100 : 0;
    
    return {
      source: r.source || '未知',
      orderCount,
      totalRevenue: parseFloat(r.totalRevenue || '0'),
      conversionRate: Math.round(conversionRate * 100) / 100, // 保留两位小数
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue); // 按成交额排序
}

// 销售人员支付金额统计
export async function getSalesPersonPaymentStats() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      salesPerson: orders.salesPerson,
      totalPayment: sql<string>`sum(CAST(${orders.paymentAmount} AS DECIMAL(10,2)))`,
      orderCount: sql<number>`count(*)`,
    })
    .from(orders)
    .where(
      and(
        ne(orders.status, "cancelled"),
        isNotNull(orders.salesPerson)
      )
    )
    .groupBy(orders.salesPerson);
  
  return result.map(r => ({
    salesPerson: r.salesPerson || '未知',
    totalPayment: parseFloat(r.totalPayment || '0'),
    orderCount: r.orderCount,
  })).sort((a, b) => b.totalPayment - a.totalPayment);
}

// 客户账户余额排名
export async function getCustomerBalanceRanking() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      customerName: orders.customerName,
      accountBalance: sql<string>`max(CAST(${orders.accountBalance} AS DECIMAL(10,2)))`,
    })
    .from(orders)
    .where(
      and(
        isNotNull(orders.customerName),
        isNotNull(orders.accountBalance),
        ne(orders.accountBalance, ''),
        ne(orders.accountBalance, '0')
      )
    )
    .groupBy(orders.customerName);
  
  return result.map(r => ({
    customerName: r.customerName || '未知',
    accountBalance: parseFloat(r.accountBalance || '0'),
  }))
  .filter(r => r.accountBalance > 0)
  .sort((a, b) => b.accountBalance - a.accountBalance)
  .slice(0, 20); // 只返回前20名
}

// ==================== 账户流水管理 ====================

/**
 * 获取客户的账户流水列表
 */
export async function getCustomerTransactions(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select()
    .from(accountTransactions)
    .where(eq(accountTransactions.customerId, customerId))
    .orderBy(desc(accountTransactions.createdAt));
}

/**
 * 创建账户流水记录
 */
export async function createAccountTransaction(data: InsertAccountTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const [result] = await db.insert(accountTransactions).values(data);
  return result;
}

/**
 * 客户充值(事务操作:更新余额+记录流水)
 */
export async function rechargeCustomerAccount(params: {
  customerId: number;
  amount: number;
  notes?: string;
  operatorId: number;
  operatorName: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // 使用事务确保原子性
  return await db.transaction(async (tx) => {
    // 1. 获取当前余额
    const [customer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, params.customerId));
    
    if (!customer) {
      throw new Error("客户不存在");
    }
    
    const balanceBefore = Number(customer.accountBalance);
    const balanceAfter = balanceBefore + params.amount;
    
    // 2. 更新客户余额
    await tx
      .update(customers)
      .set({ accountBalance: balanceAfter.toFixed(2) })
      .where(eq(customers.id, params.customerId));
    
    // 3. 记录流水
    await tx.insert(accountTransactions).values({
      customerId: params.customerId,
      customerName: customer.name,
      type: "recharge",
      amount: params.amount.toFixed(2),
      balanceBefore: balanceBefore.toFixed(2),
      balanceAfter: balanceAfter.toFixed(2),
      notes: params.notes,
      operatorId: params.operatorId,
      operatorName: params.operatorName,
    });
    
    return { balanceBefore, balanceAfter };
  });
}

/**
 * 订单消费扣款(事务操作:更新余额+记录流水)
 */
export async function consumeCustomerAccount(params: {
  customerId: number;
  amount: number;
  orderId: number;
  orderNo: string;
  operatorId: number;
  operatorName: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // 使用事务确保原子性
  return await db.transaction(async (tx) => {
    // 1. 获取当前余额
    const [customer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, params.customerId));
    
    if (!customer) {
      throw new Error("客户不存在");
    }
    
    const balanceBefore = Number(customer.accountBalance);
    
    // 2. 检查余额是否足够
    if (balanceBefore < params.amount) {
      throw new Error(`余额不足,当前余额￥${balanceBefore.toFixed(2)},需要￥${params.amount.toFixed(2)}`);
    }
    
    const balanceAfter = balanceBefore - params.amount;
    
    // 3. 更新客户余额
    await tx
      .update(customers)
      .set({ accountBalance: balanceAfter.toFixed(2) })
      .where(eq(customers.id, params.customerId));
    
    // 4. 记录流水
    await tx.insert(accountTransactions).values({
      customerId: params.customerId,
      customerName: customer.name,
      type: "consume",
      amount: (-params.amount).toFixed(2),
      balanceBefore: balanceBefore.toFixed(2),
      balanceAfter: balanceAfter.toFixed(2),
      relatedOrderId: params.orderId,
      relatedOrderNo: params.orderNo,
      notes: `订单消费:${params.orderNo}`,
      operatorId: params.operatorId,
      operatorName: params.operatorName,
    });
    
    return { balanceBefore, balanceAfter };
  });
}

/**
 * 订单退款(事务操作:更新余额+记录流水)
 */
export async function refundCustomerAccount(params: {
  customerId: number;
  amount: number;
  orderId: number;
  orderNo: string;
  operatorId: number;
  operatorName: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // 使用事务确保原子性
  return await db.transaction(async (tx) => {
    // 1. 获取当前余额
    const [customer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, params.customerId));
    
    if (!customer) {
      throw new Error("客户不存在");
    }
    
    const balanceBefore = Number(customer.accountBalance);
    const balanceAfter = balanceBefore + params.amount;
    
    // 2. 更新客户余额
    await tx
      .update(customers)
      .set({ accountBalance: balanceAfter.toFixed(2) })
      .where(eq(customers.id, params.customerId));
    
    // 3. 记录流水
    await tx.insert(accountTransactions).values({
      customerId: params.customerId,
      customerName: customer.name,
      type: "refund",
      amount: params.amount.toFixed(2),
      balanceBefore: balanceBefore.toFixed(2),
      balanceAfter: balanceAfter.toFixed(2),
      relatedOrderId: params.orderId,
      relatedOrderNo: params.orderNo,
      notes: `订单退款:${params.orderNo}`,
      operatorId: params.operatorId,
      operatorName: params.operatorName,
    });
    
    return { balanceBefore, balanceAfter };
  });
}

// ============ Smart Register History ============

export async function createSmartRegisterHistory(data: InsertSmartRegisterHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const result = await db.insert(smartRegisterHistory).values(data);
  return result;
}

export async function getSmartRegisterHistory(limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  return db
    .select()
    .from(smartRegisterHistory)
    .orderBy(desc(smartRegisterHistory.createdAt))
    .limit(limit);
}

// ============ Salesperson Management ============

export async function getAllSalespersons() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  return db
    .select()
    .from(salespersons)
    .orderBy(desc(salespersons.createdAt));
}

export async function searchSalespersons(keyword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  return db
    .select()
    .from(salespersons)
    .where(
      or(
        like(salespersons.name, `%${keyword}%`),
        like(salespersons.nickname, `%${keyword}%`),
        like(salespersons.phone, `%${keyword}%`),
        like(salespersons.wechat, `%${keyword}%`)
      )
    )
    .orderBy(desc(salespersons.createdAt));
}

export async function createSalesperson(data: InsertSalesperson) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const result = await db.insert(salespersons).values(data);
  return result[0].insertId;
}

export async function updateSalesperson(id: number, data: Partial<InsertSalesperson>) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  await db
    .update(salespersons)
    .set(data)
    .where(eq(salespersons.id, id));
}

export async function deleteSalesperson(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // 软删除:设置为不活跃
  await db
    .update(salespersons)
    .set({ isActive: false })
    .where(eq(salespersons.id, id));
}

export async function updateSalespersonStatus(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  await db
    .update(salespersons)
    .set({ isActive })
    .where(eq(salespersons.id, id));
}

// 获取销售统计数据
export async function getSalesStatistics(params: {
  salespersonId?: number;
  startDate?: string;
  endDate?: string;
  groupBy?: "month" | "year";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // 基础查询条件 - 统计所有非取消状态的订单
  const conditions: any[] = [ne(orders.status, "cancelled")];
  
  if (params.salespersonId) {
    // 同时匹配salespersonId和salesPerson文本（name/nickname）
    const spList = await db.select().from(salespersons).where(eq(salespersons.id, params.salespersonId)).limit(1);
    const sp = spList[0];
    if (sp) {
      const spConditions: any[] = [eq(orders.salespersonId, params.salespersonId)];
      if (sp.name) spConditions.push(eq(orders.salesPerson, sp.name));
      if (sp.nickname && sp.nickname !== sp.name) spConditions.push(eq(orders.salesPerson, sp.nickname));
      conditions.push(or(...spConditions));
    } else {
      conditions.push(eq(orders.salespersonId, params.salespersonId));
    }
  }
  
  if (params.startDate) {
    conditions.push(sql`${orders.paymentDate} >= ${params.startDate}`);
  }
  
  if (params.endDate) {
    conditions.push(sql`${orders.paymentDate} <= ${params.endDate}`);
  }
  
  // 查询订单数据
  const orderList = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.paymentDate));
  
  // 计算统计数据
  const totalSales = orderList.reduce((sum, order) => sum + Number(order.paymentAmount), 0);
  const totalOrders = orderList.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  
  return {
    totalSales,
    totalOrders,
    avgOrderValue,
    orders: orderList,
  };
}

// 获取月度销售额
export async function getMonthlySales(salespersonId: number | undefined, year: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  
  const conditions: any[] = [
    eq(orders.status, "paid"),
    sql`${orders.paymentDate} >= ${startDate}`,
    sql`${orders.paymentDate} <= ${endDate}`,
  ];
  
  if (salespersonId) {
    // 同时匹配salespersonId和salesPerson文本（name/nickname）
    const spList = await db.select().from(salespersons).where(eq(salespersons.id, salespersonId)).limit(1);
    const sp = spList[0];
    if (sp) {
      const spConditions: any[] = [eq(orders.salespersonId, salespersonId)];
      if (sp.name) spConditions.push(eq(orders.salesPerson, sp.name));
      if (sp.nickname && sp.nickname !== sp.name) spConditions.push(eq(orders.salesPerson, sp.nickname));
      conditions.push(or(...spConditions));
    } else {
      conditions.push(eq(orders.salespersonId, salespersonId));
    }
  }
  
  const orderList = await db
    .select()
    .from(orders)
    .where(and(...conditions));
  
  // 按月份分组统计
  const monthlySales: { month: number; sales: number; orders: number }[] = [];
  
  for (let month = 1; month <= 12; month++) {
    const monthOrders = orderList.filter(order => {
      if (!order.paymentDate) return false;
      const orderMonth = new Date(order.paymentDate).getMonth() + 1;
      return orderMonth === month;
    });
    
    const sales = monthOrders.reduce((sum, order) => sum + Number(order.paymentAmount), 0);
    
    monthlySales.push({
      month,
      sales,
      orders: monthOrders.length,
    });
  }
  
  return monthlySales;
}

// 获取年度销售额
export async function getYearlySales(
  salespersonId: number | undefined,
  startYear?: number,
  endYear?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const currentYear = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })).getFullYear();
  const start = startYear || currentYear - 2;
  const end = endYear || currentYear;
  
  const conditions: any[] = [
    eq(orders.status, "paid"),
    sql`${orders.paymentDate} >= ${`${start}-01-01`}`,
    sql`${orders.paymentDate} <= ${`${end}-12-31`}`,
  ];
  
  if (salespersonId) {
    // 同时匹配salespersonId和salesPerson文本（name/nickname）
    const spList = await db.select().from(salespersons).where(eq(salespersons.id, salespersonId)).limit(1);
    const sp = spList[0];
    if (sp) {
      const spConditions: any[] = [eq(orders.salespersonId, salespersonId)];
      if (sp.name) spConditions.push(eq(orders.salesPerson, sp.name));
      if (sp.nickname && sp.nickname !== sp.name) spConditions.push(eq(orders.salesPerson, sp.nickname));
      conditions.push(or(...spConditions));
    } else {
      conditions.push(eq(orders.salespersonId, salespersonId));
    }
  }
  
  const orderList = await db
    .select()
    .from(orders)
    .where(and(...conditions));
  
  // 按年份分组统计
  const yearlySales: { year: number; sales: number; orders: number }[] = [];
  
  for (let year = start; year <= end; year++) {
    const yearOrders = orderList.filter(order => {
      if (!order.paymentDate) return false;
      const orderYear = new Date(order.paymentDate).getFullYear();
      return orderYear === year;
    });
    
    const sales = yearOrders.reduce((sum, order) => sum + Number(order.paymentAmount), 0);
    
    yearlySales.push({
      year,
      sales,
      orders: yearOrders.length,
    });
  }
  
  return yearlySales;
}

// ========== Gmail导入日志管理 ==========

export async function createGmailImportLog(log: InsertGmailImportLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(gmailImportLogs).values(log);
  return result[0].insertId;
}

export async function getAllGmailImportLogs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gmailImportLogs).orderBy(desc(gmailImportLogs.createdAt));
}

export async function getGmailImportLogById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(gmailImportLogs).where(eq(gmailImportLogs.id, id)).limit(1);
  return result[0] || null;
}

export async function getGmailImportLogsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(gmailImportLogs)
    .where(
      and(
        gte(gmailImportLogs.createdAt, startDate),
        lte(gmailImportLogs.createdAt, endDate)
      )
    )
    .orderBy(desc(gmailImportLogs.createdAt));
}

export async function getGmailImportStats() {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select({
      totalImports: sql<number>`COUNT(*)`,
      totalOrders: sql<number>`SUM(${gmailImportLogs.totalOrders})`,
      successOrders: sql<number>`SUM(${gmailImportLogs.successOrders})`,
      failedOrders: sql<number>`SUM(${gmailImportLogs.failedOrders})`,
      successRate: sql<number>`ROUND(SUM(${gmailImportLogs.successOrders}) * 100.0 / NULLIF(SUM(${gmailImportLogs.totalOrders}), 0), 2)`,
    })
    .from(gmailImportLogs);
    
  return result[0] || null;
}

export async function checkThreadIdExists(threadId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(gmailImportLogs)
    .where(eq(gmailImportLogs.threadId, threadId))
    .limit(1);
  return result.length > 0;
}

export async function deleteGmailImportLog(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(gmailImportLogs).where(eq(gmailImportLogs.id, id));
  return true;
}

export async function deleteAllGmailImportLogs() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(gmailImportLogs);
  return true;
}

// ==================== Gmail导入配置管理 ====================

export async function getGmailImportConfig(configKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [config] = await db
    .select()
    .from(gmailImportConfig)
    .where(eq(gmailImportConfig.configKey, configKey))
    .limit(1);
  return config || null;
}

export async function getAllGmailImportConfigs() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(gmailImportConfig);
}

export async function upsertGmailImportConfig(data: {
  configKey: string;
  configValue: any;
  description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getGmailImportConfig(data.configKey);
  
  if (existing) {
    await db
      .update(gmailImportConfig)
      .set({
        configValue: data.configValue,
        description: data.description,
        updatedAt: new Date(),
      })
      .where(eq(gmailImportConfig.configKey, data.configKey));
    return existing.id;
  } else {
    const [result] = await db.insert(gmailImportConfig).values(data);
    return result.insertId;
  }
}

export async function deleteGmailImportConfig(configKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(gmailImportConfig)
    .where(eq(gmailImportConfig.configKey, configKey));
  return true;
}

// ========== 客户生命周期 ==========

export async function getInactiveCustomers(days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  // 获取所有有订单记录的客户
  const customersWithOrders = await db
    .select({
      customerId: orders.customerId,
      lastOrderDate: sql<Date>`MAX(${orders.createdAt})`,
      customerName: sql<string>`(SELECT name FROM customers WHERE id = ${orders.customerId})`,
    })
    .from(orders)
    .where(sql`${orders.customerId} IS NOT NULL`)
    .groupBy(orders.customerId)
    .having(sql`MAX(${orders.createdAt}) < ${cutoffDate}`);
  
  return customersWithOrders;
}

// ========== 客户批量导入 ==========

export async function importCustomersFromOrders(createdBy: number) {
  const db = await getDb();
  if (!db) return { success: 0, skipped: 0, failed: 0 };
  
  // 获取所有老师名
  const teacherNames = await getAllTeacherNames();
  const teacherNameSet = new Set(teacherNames);
  
  // 获取所有订单
  const allOrders = await db.select().from(orders);
  
  // 提取唯一的客户名和流量来源
  const uniqueCustomers = new Map<string, { name: string; trafficSource?: string }>();
  
  for (const order of allOrders) {
    // 过滤空客户名和老师名
    if (order.customerName && 
        !uniqueCustomers.has(order.customerName) && 
        !teacherNameSet.has(order.customerName)) {
      uniqueCustomers.set(order.customerName, {
        name: order.customerName,
        trafficSource: order.trafficSource || undefined,
      });
    }
  }
  
  // 获取现有客户列表
  const existingCustomers = await db.select({ name: customers.name }).from(customers);
  const existingNames = new Set(existingCustomers.map(c => c.name));
  
  let success = 0;
  let skipped = 0;
  let failed = 0;
  
  // 批量创建客户
  for (const customerData of Array.from(uniqueCustomers.values())) {
    if (existingNames.has(customerData.name)) {
      skipped++;
      continue;
    }
    
    try {
      await db.insert(customers).values({
        name: customerData.name,
        trafficSource: customerData.trafficSource,
        createdBy,
      });
      success++;
    } catch (error) {
      console.error(`Failed to create customer ${customerData.name}:`, error);
      failed++;
    }
  }
  
  return { success, skipped, failed, total: uniqueCustomers.size };
}

// ========== Gmail导入历史管理 ==========

/**
 * 创建Gmail导入历史记录
 */
export async function createGmailImportHistory(data: InsertGmailImportHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const [result] = await db.insert(gmailImportHistory).values(data);
  return result.insertId;
}

/**
 * 检查Message ID是否已导入
 */
export async function checkMessageIdExists(messageId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const result = await db
    .select({ id: gmailImportHistory.id })
    .from(gmailImportHistory)
    .where(eq(gmailImportHistory.messageId, messageId))
    .limit(1);
  
  return result.length > 0;
}

/**
 * 获取所有Gmail导入历史记录
 */
export async function getAllGmailImportHistory(limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  return await db
    .select()
    .from(gmailImportHistory)
    .orderBy(desc(gmailImportHistory.importedAt))
    .limit(limit)
    .offset(offset);
}

/**
 * 获取Gmail导入统计
 */
export async function getGmailImportHistoryStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const stats = await db
    .select({
      totalImports: count(),
      successCount: sql<number>`SUM(CASE WHEN ${gmailImportHistory.importStatus} = 'success' THEN 1 ELSE 0 END)`,
      failedCount: sql<number>`SUM(CASE WHEN ${gmailImportHistory.importStatus} = 'failed' THEN 1 ELSE 0 END)`,
      skippedCount: sql<number>`SUM(CASE WHEN ${gmailImportHistory.importStatus} = 'skipped' THEN 1 ELSE 0 END)`,
    })
    .from(gmailImportHistory);
  
  return stats[0] || { totalImports: 0, successCount: 0, failedCount: 0, skippedCount: 0 };
}

/**
 * 按日期范围获取Gmail导入历史
 */
export async function getGmailImportHistoryByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  return await db
    .select()
    .from(gmailImportHistory)
    .where(
      and(
        gte(gmailImportHistory.importedAt, startDate),
        lte(gmailImportHistory.importedAt, endDate)
      )
    )
    .orderBy(desc(gmailImportHistory.importedAt));
}

/**
 * 删除Gmail导入历史记录
 */
export async function deleteGmailImportHistory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  await db.delete(gmailImportHistory).where(eq(gmailImportHistory.id, id));
}

/**
 * 批量删除客户表中所有客户名为老师名的记录
 * @returns 删除的记录数
 */
export async function deleteCustomersWithTeacherNames(): Promise<number> {
  const teacherNames = await getAllTeacherNames();
  
  if (teacherNames.length === 0) {
    return 0;
  }
  
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");
  
  // 删除所有客户名在老师名列表中的客户记录
  await db
    .delete(customers)
    .where(inArray(customers.name, teacherNames));
  
  // 返回删除的记录数
  return teacherNames.length;
}


/**
 * 批量更新历史订单号,添加支付方式前缀
 * @returns 更新的订单数量
 */
export async function batchUpdateOrderNumbers() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // 获取所有订单
  const allOrders = await db.select().from(orders);
  
  let updatedCount = 0;
  
  for (const order of allOrders) {
    // 跳过已经有支付方式前缀的订单号
    if (order.orderNo.startsWith('pay') || order.orderNo.startsWith('we') || order.orderNo.startsWith('xj')) {
      continue;
    }
    
    // 根据备注推断支付方式
    let paymentMethod: string | undefined;
    if (order.notes) {
      const notesLower = order.notes.toLowerCase();
      if (notesLower.includes('支付宝') || notesLower.includes('alipay')) {
        paymentMethod = 'alipay';
      } else if (notesLower.includes('富掌柜') || notesLower.includes('微信') || notesLower.includes('wechat')) {
        paymentMethod = 'wechat';
      } else if (notesLower.includes('现金') || notesLower.includes('cash')) {
        paymentMethod = 'cash';
      }
    }
    
    // 生成新订单号
    const { generateOrderId } = await import('./orderIdGenerator');
    const newOrderNo = generateOrderId(
      order.deliveryCity || undefined,
      order.classDate || undefined,
      paymentMethod
    );
    
    // 更新订单号
    const dbInstance = await getDb();
    if (!dbInstance) throw new Error("Database not initialized");
    await dbInstance.update(orders)
      .set({ orderNo: newOrderNo })
      .where(eq(orders.id, order.id));
    
    updatedCount++;
  }
  
  return updatedCount;
}


// ========== 渠道订单号管理 ==========

/**
 * 检查渠道订单号是否已存在
 * @param channelOrderNo 渠道订单号
 * @returns 是否存在
 */
export async function checkChannelOrderNoExists(channelOrderNo: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db
    .select()
    .from(orders)
    .where(eq(orders.channelOrderNo, channelOrderNo))
    .limit(1);
  
  return result.length > 0;
}

/**
 * 根据渠道订单号查找订单
 * @param channelOrderNo 渠道订单号
 * @returns 订单信息
 */
export async function getOrderByChannelOrderNo(channelOrderNo: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(orders)
    .where(eq(orders.channelOrderNo, channelOrderNo))
    .limit(1);
  
  return result[0] || null;
}

/**
 * 按支付渠道筛选订单
 * @param paymentChannel 支付渠道
 * @returns 订单列表
 */
export async function getOrdersByPaymentChannel(paymentChannel: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(orders)
    .where(eq(orders.paymentChannel, paymentChannel))
    .orderBy(desc(orders.createdAt));
}

/**
 * 搜索渠道订单号(模糊匹配)
 * @param keyword 搜索关键词
 * @returns 订单列表
 */
export async function searchOrdersByChannelOrderNo(keyword: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(orders)
    .where(sql`${orders.channelOrderNo} LIKE ${`%${keyword}%`}`)
    .orderBy(desc(orders.createdAt));
}

/**
 * 获取对账报表数据(按支付渠道分组)
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 对账报表数据
 */
export async function getReconciliationReport(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(orders)
    .where(
      and(
        gte(orders.classDate, new Date(startDate)),
        lte(orders.classDate, new Date(endDate))
      )
    )
    .orderBy(orders.paymentChannel, desc(orders.createdAt));
}

/**
 * 检测可能存在车费识别问题的订单
 * 查找备注中包含"车费"但transportFee为0的订单
 * @returns 问题订单列表
 */
export async function detectTransportFeeIssues() {
  const db = await getDb();
  if (!db) return [];
  
  // 查找备注中包含"车费"关键词,但transportFee为0或null的订单
  const issueOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        sql`${orders.notes} LIKE '%车费%'`,
        or(
          eq(orders.transportFee, "0.00"),
          isNull(orders.transportFee)
        )
      )
    )
    .orderBy(desc(orders.createdAt));
  
  return issueOrders;
}

/**
 * 批量修复车费识别问题
 * 重新解析备注并更新transportFee和teacherFee字段
 * @param orderIds 订单ID列表
 * @returns 修复结果统计
 */
export async function batchFixTransportFee(orderIds: number[]) {
  const db = await getDb();
  if (!db) return { success: 0, failed: 0, errors: [] as string[] };
  
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  
  for (const orderId of orderIds) {
    try {
      // 获取订单详情
      const order = await getOrderById(orderId);
      if (!order || !order.notes) {
        errors.push(`订单 ${orderId}: 未找到或没有备注`);
        failedCount++;
        continue;
      }
      
      // 使用正则表达式从备注中提取车费和老师费用
      const notes = order.notes;
      
      // 提取车费: "报销老师100车费" -> 100
      const transportFeeMatch = notes.match(/报销(?:老师)?(\d+)(?:元)?车费|车费(\d+)(?:元)?/);
      const transportFee = transportFeeMatch ? (transportFeeMatch[1] || transportFeeMatch[2]) : null;
      
      // 提取老师费用: "给老师600" -> 600
      const teacherFeeMatch = notes.match(/给老师(\d+)(?:元)?/);
      const teacherFee = teacherFeeMatch ? teacherFeeMatch[1] : null;
      
      // 更新订单
      const updateData: any = {};
      if (transportFee) {
        updateData.transportFee = transportFee;
      }
      if (teacherFee) {
        updateData.teacherFee = teacherFee;
      }
      
      if (Object.keys(updateData).length > 0) {
        await db
          .update(orders)
          .set(updateData)
          .where(eq(orders.id, orderId));
        successCount++;
      } else {
        errors.push(`订单 ${orderId}: 未能从备注中提取车费或老师费用`);
        failedCount++;
      }
    } catch (error) {
      errors.push(`订单 ${orderId}: ${error instanceof Error ? error.message : '未知错误'}`);
      failedCount++;
    }
  }
  
  return {
    success: successCount,
    failed: failedCount,
    errors,
  };
}

/**
 * 获取流量来源统计数据
 * @param startDate 开始日期(可选)
 * @param endDate 结束日期(可选)
 * @returns 流量来源统计数据
 */
export async function getTrafficSourceStats(startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db
    .select({
      trafficSource: orders.trafficSource,
      orderCount: count(orders.id),
      totalAmount: sql<number>`SUM(${orders.paymentAmount})`,
    })
    .from(orders)
    .where(
      and(
        isNotNull(orders.trafficSource),
        ne(orders.trafficSource, ""),
        eq(orders.isVoided, false)
      )
    )
    .groupBy(orders.trafficSource)
    .orderBy(sql`SUM(${orders.paymentAmount}) DESC`);
  
  // 如果提供了日期范围,添加日期过滤
  if (startDate && endDate) {
    query = db
      .select({
        trafficSource: orders.trafficSource,
        orderCount: count(orders.id),
        totalAmount: sql<number>`SUM(${orders.paymentAmount})`,
      })
      .from(orders)
      .where(
        and(
          isNotNull(orders.trafficSource),
          ne(orders.trafficSource, ""),
          eq(orders.isVoided, false),
          gte(orders.classDate, new Date(startDate)),
          lte(orders.classDate, new Date(endDate))
        )
      )
      .groupBy(orders.trafficSource)
      .orderBy(sql`SUM(${orders.paymentAmount}) DESC`);
  }
  
  const results = await query;
  
  return results.map(row => ({
    trafficSource: row.trafficSource,
    orderCount: Number(row.orderCount),
    totalAmount: Number(row.totalAmount) || 0,
  }));
}


// ========== 城市合伙人费配置管理 ==========

/**
 * 获取所有城市合伙人费配置
 */
export async function getAllCityPartnerConfig() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  return db
    .select()
    .from(cityPartnerConfig)
    .where(eq(cityPartnerConfig.isActive, true))
    .orderBy(cityPartnerConfig.city);
}

/**
 * 根据城市名称获取合伙人费配置
 */
export async function getCityPartnerConfigByCity(city: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const result = await db
    .select()
    .from(cityPartnerConfig)
    .where(
      and(
        eq(cityPartnerConfig.city, city),
        eq(cityPartnerConfig.isActive, true)
      )
    )
    .limit(1);
  
  return result[0] || null;
}

/**
 * 更新城市合伙人费配置
 */
export async function updateCityPartnerConfig(
  id: number,
  data: {
    areaCode?: string;
    partnerFeeRate?: string;
    description?: string;
    isActive?: boolean;
  },
  updatedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // 1. 获取城市名称
  const config = await db
    .select()
    .from(cityPartnerConfig)
    .where(eq(cityPartnerConfig.id, id))
    .limit(1);
  
  if (config.length === 0) {
    throw new Error("城市配置不存在");
  }
  
  const cityName = config[0].city;
  
  // 2. 更新cityPartnerConfig表
  await db
    .update(cityPartnerConfig)
    .set({
      ...data,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(cityPartnerConfig.id, id));
  
  // 3. 如果更新了areaCode，同步到cities表
  if (data.areaCode !== undefined) {
    await db
      .update(cities)
      .set({ areaCode: data.areaCode })
      .where(eq(cities.name, cityName));
  }
  
  return true;
}

/**
 * 获取所有城市的统计数据
 */
export async function getAllCitiesWithStats(options?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // 获取所有城市配置，并关联partner_cities表获取合伙人分红比例
  const cityConfigs = await db
    .select({
      id: cityPartnerConfig.id,
      city: cityPartnerConfig.city,
      areaCode: cityPartnerConfig.areaCode,
      description: cityPartnerConfig.description,
      isActive: cityPartnerConfig.isActive,
      updatedBy: cityPartnerConfig.updatedBy,
      updatedAt: cityPartnerConfig.updatedAt,
      createdAt: cityPartnerConfig.createdAt,
      // 从 partner_cities 表查询合伙人分红比例
      currentProfitStage: partnerCities.currentProfitStage,
      isInvestmentRecovered: partnerCities.isInvestmentRecovered,
      profitRatioStage1Partner: partnerCities.profitRatioStage1Partner,
      profitRatioStage2APartner: partnerCities.profitRatioStage2APartner,
      profitRatioStage2BPartner: partnerCities.profitRatioStage2BPartner,
      profitRatioStage3Partner: partnerCities.profitRatioStage3Partner,
    })
    .from(cityPartnerConfig)
    .leftJoin(cities, eq(cityPartnerConfig.city, cities.name))
    .leftJoin(partnerCities, eq(cities.id, partnerCities.cityId))
    .orderBy(cityPartnerConfig.city);
  
  // 计算每个城市的当前合伙人分红比例
  const citiesWithPartnerFeeRate = cityConfigs.map(city => {
    let partnerFeeRate: number | null = null;
    
    if (city.currentProfitStage !== null) {
      if (city.currentProfitStage === 1 && city.profitRatioStage1Partner !== null) {
        partnerFeeRate = parseFloat(String(city.profitRatioStage1Partner));
      } else if (city.currentProfitStage === 2) {
        if (city.isInvestmentRecovered && city.profitRatioStage2BPartner !== null) {
          partnerFeeRate = parseFloat(String(city.profitRatioStage2BPartner));
        } else if (!city.isInvestmentRecovered && city.profitRatioStage2APartner !== null) {
          partnerFeeRate = parseFloat(String(city.profitRatioStage2APartner));
        }
      } else if (city.currentProfitStage === 3 && city.profitRatioStage3Partner !== null) {
        partnerFeeRate = parseFloat(String(city.profitRatioStage3Partner));
      }
    }
    
    return {
      id: city.id,
      city: city.city,
      areaCode: city.areaCode,
      description: city.description,
      isActive: city.isActive,
      updatedBy: city.updatedBy,
      updatedAt: city.updatedAt,
      createdAt: city.createdAt,
      partnerFeeRate,
    };
  });

  // 为每个城市统计订单数据
  const citiesWithStats = await Promise.all(
    citiesWithPartnerFeeRate.map(async (city) => {
      // 构建查询条件
      const conditions = [
        eq(orders.deliveryCity, city.city),
        ne(orders.status, "cancelled"),
      ];

      // 添加时间范围筛选
      if (options?.startDate) {
        conditions.push(gte(orders.classDate, options.startDate));
      }
      if (options?.endDate) {
        conditions.push(lte(orders.classDate, options.endDate));
      }

      const stats = await db
        .select({
          orderCount: sql<number>`COUNT(*)`,
          totalSales: sql<number>`COALESCE(SUM(${orders.paymentAmount}), 0)`,
          totalTeacherFee: sql<number>`COALESCE(SUM(${orders.teacherFee}), 0)`,
          totalTransportFee: sql<number>`COALESCE(SUM(${orders.transportFee}), 0)`,
          totalOtherFee: sql<number>`COALESCE(SUM(${orders.otherFee}), 0)`,
          totalPartnerFee: sql<number>`COALESCE(SUM(${orders.partnerFee}), 0)`,
        })
        .from(orders)
        .where(and(...conditions));

      const stat = stats[0];
      const totalExpense = Number(stat.totalTeacherFee) + Number(stat.totalTransportFee) + Number(stat.totalOtherFee) + Number(stat.totalPartnerFee);
      const profit = Number(stat.totalSales) - totalExpense;
      const profitRate = stat.totalSales > 0 ? (profit / Number(stat.totalSales)) * 100 : 0;

      return {
        ...city,
        orderCount: Number(stat.orderCount),
        totalSales: Number(stat.totalSales),
        totalTeacherFee: Number(stat.totalTeacherFee),
        totalTransportFee: Number(stat.totalTransportFee),
        totalOtherFee: Number(stat.totalOtherFee),
        totalPartnerFee: Number(stat.totalPartnerFee),
        totalExpense,
        profit,
        profitRate: Math.round(profitRate * 100) / 100,
      };
    })
  );

  return citiesWithStats;
}

/**
 * 创建城市配置
 */
export async function createCityConfig(
  data: {
    city: string;
    areaCode?: string;
    description?: string;
  },
  createdBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // 检查cities表中是否已存在该城市
  const existingCity = await db
    .select()
    .from(cities)
    .where(eq(cities.name, data.city))
    .limit(1);

  // 如果城市不存在，则在cities表中创建记录
  if (existingCity.length === 0) {
    await db.insert(cities).values({
      name: data.city,
      areaCode: data.areaCode || '',
      isActive: true,
      sortOrder: 0,
    });
  }

  // 然后在cityPartnerConfig表中创建配置记录
  return db.insert(cityPartnerConfig).values({
    ...data,
    updatedBy: createdBy,
  });
}

/**
 * 删除城市配置
 */
export async function deleteCityConfig(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  return db.delete(cityPartnerConfig).where(eq(cityPartnerConfig.id, id));
}

/**
 * 计算合伙人费
 * @param city 城市名称
 * @param courseAmount 课程金额
 * @param teacherFee 老师费用
 * @param transportFee 车费（可选，默认为0）
 * @returns 合伙人费金额
 */
export async function calculatePartnerFee(
  city: string | null,
  courseAmount: number,
  teacherFee: number,
  transportFee: number = 0
) {
  if (!city) return 0;
  
  const config = await getCityPartnerConfigByCity(city);
  if (!config) return 0;
  
  const rate = Number(config.partnerFeeRate) / 100;
  const baseRevenue = courseAmount - teacherFee - transportFee;
  
  // 如果基础收益<=0，返回0（合伙人不承担亏损）
  if (baseRevenue <= 0) return 0;
  
  const partnerFee = baseRevenue * rate;
  
  return Math.round(partnerFee * 100) / 100; // 保留两位小数
}

// ========== 合伙人费审计日志管理 ==========

/**
 * 创建合伙人费审计日志
 */
export async function createAuditLog(data: {
  operationType: string;
  operationDescription: string;
  operatorId: number;
  operatorName: string;
  affectedCount?: number;
  details?: any;
  status?: "success" | "failed" | "partial";
  errorMessage?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(partnerFeeAuditLogs).values({
    operationType: data.operationType,
    operationDescription: data.operationDescription,
    operatorId: data.operatorId,
    operatorName: data.operatorName,
    affectedCount: data.affectedCount || 0,
    details: data.details ? JSON.stringify(data.details) : null,
    status: data.status || "success",
    errorMessage: data.errorMessage || null,
  });
  
  return result[0].insertId;
}

/**
 * 获取所有合伙人费审计日志
 */
export async function getAllAuditLogs(limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(partnerFeeAuditLogs)
    .orderBy(desc(partnerFeeAuditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * 按操作类型获取审计日志
 */
export async function getAuditLogsByType(operationType: string, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(partnerFeeAuditLogs)
    .where(eq(partnerFeeAuditLogs.operationType, operationType))
    .orderBy(desc(partnerFeeAuditLogs.createdAt))
    .limit(limit);
}

/**
 * 按操作人获取审计日志
 */
export async function getAuditLogsByOperator(operatorId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(partnerFeeAuditLogs)
    .where(eq(partnerFeeAuditLogs.operatorId, operatorId))
    .orderBy(desc(partnerFeeAuditLogs.createdAt))
    .limit(limit);
}

/**
 * 按日期范围获取审计日志
 */
export async function getAuditLogsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(partnerFeeAuditLogs)
    .where(
      and(
        gte(partnerFeeAuditLogs.createdAt, startDate),
        lte(partnerFeeAuditLogs.createdAt, endDate)
      )
    )
    .orderBy(desc(partnerFeeAuditLogs.createdAt));
}

/**
 * 获取审计日志统计
 */
export async function getAuditLogStats() {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select({
      totalLogs: sql<number>`COUNT(*)`,
      successCount: sql<number>`SUM(CASE WHEN ${partnerFeeAuditLogs.status} = 'success' THEN 1 ELSE 0 END)`,
      failedCount: sql<number>`SUM(CASE WHEN ${partnerFeeAuditLogs.status} = 'failed' THEN 1 ELSE 0 END)`,
      partialCount: sql<number>`SUM(CASE WHEN ${partnerFeeAuditLogs.status} = 'partial' THEN 1 ELSE 0 END)`,
      totalAffectedRecords: sql<number>`SUM(${partnerFeeAuditLogs.affectedCount})`,
    })
    .from(partnerFeeAuditLogs);
  
  return result[0] || null;
}

// ========== 数据质量检查 ==========

/**
 * 检查订单数据质量问题
 */
export async function checkOrderDataQuality() {
  const db = await getDb();
  if (!db) return null;
  
  const allOrders = await getAllOrders();
  const cityConfigs = await getAllCityPartnerConfig();
  const configuredCities = new Set(cityConfigs.map(c => c.city));
  
  const issues = {
    missingCityConfig: [] as any[],
    abnormalTeacherFee: [] as any[],
    invalidChannelOrderNo: [] as any[],
    missingRequiredFields: [] as any[],
  };
  
  for (const order of allOrders) {
    // 检查缺失城市配置
    if (order.deliveryCity && !configuredCities.has(order.deliveryCity)) {
      issues.missingCityConfig.push({
        orderId: order.id,
        orderNo: order.orderNo,
        customerName: order.customerName,
        deliveryCity: order.deliveryCity,
        issue: `城市"${order.deliveryCity}"未配置合伙人费比例`,
      });
    }
    
    // 检查老师费用异常
    if (order.teacherFee && order.courseAmount) {
      const teacherFee = parseFloat(order.teacherFee);
      const courseAmount = parseFloat(order.courseAmount);
      if (teacherFee > courseAmount) {
        issues.abnormalTeacherFee.push({
          orderId: order.id,
          orderNo: order.orderNo,
          customerName: order.customerName,
          teacherFee,
          courseAmount,
          issue: `老师费用(${teacherFee})超过课程金额(${courseAmount})`,
        });
      }
    }
    
    // 检查渠道订单号格式
    if (order.channelOrderNo && order.channelOrderNo.trim() !== '') {
      const channelOrderNo = order.channelOrderNo.trim();
      // 支付宝通常28位,微信通常32位
      if (channelOrderNo.length < 20 || channelOrderNo.length > 35) {
        issues.invalidChannelOrderNo.push({
          orderId: order.id,
          orderNo: order.orderNo,
          customerName: order.customerName,
          channelOrderNo,
          length: channelOrderNo.length,
          issue: `渠道订单号长度异常(${channelOrderNo.length}位)`,
        });
      }
    }
    
    // 检查缺失必填字段
    const missingFields: string[] = [];
    if (!order.customerName || order.customerName.trim() === '') missingFields.push('客户名');
    if (!order.deliveryCity || order.deliveryCity.trim() === '') missingFields.push('交付城市');
    if (!order.courseAmount || order.courseAmount === '0') missingFields.push('课程金额');
    if (!order.classDate) missingFields.push('上课日期');
    
    if (missingFields.length > 0) {
      issues.missingRequiredFields.push({
        orderId: order.id,
        orderNo: order.orderNo,
        customerName: order.customerName || '(未填写)',
        missingFields,
        issue: `缺失必填字段: ${missingFields.join(', ')}`,
      });
    }
  }
  
  return {
    totalOrders: allOrders.length,
    totalIssues: 
      issues.missingCityConfig.length +
      issues.abnormalTeacherFee.length +
      issues.invalidChannelOrderNo.length +
      issues.missingRequiredFields.length,
    issues,
    summary: {
      missingCityConfigCount: issues.missingCityConfig.length,
      abnormalTeacherFeeCount: issues.abnormalTeacherFee.length,
      invalidChannelOrderNoCount: issues.invalidChannelOrderNo.length,
      missingRequiredFieldsCount: issues.missingRequiredFields.length,
    },
  };
}

/**
 * 获取未配置城市列表
 */
export async function getUnconfiguredCities() {
  const db = await getDb();
  if (!db) return [];
  
  const allOrders = await getAllOrders();
  const cityConfigs = await getAllCityPartnerConfig();
  const configuredCities = new Set(cityConfigs.map(c => c.city));
  
  const unconfiguredCities = new Set<string>();
  const cityOrderCounts: Record<string, number> = {};
  
  for (const order of allOrders) {
    if (order.deliveryCity && !configuredCities.has(order.deliveryCity)) {
      unconfiguredCities.add(order.deliveryCity);
      cityOrderCounts[order.deliveryCity] = (cityOrderCounts[order.deliveryCity] || 0) + 1;
    }
  }
  
  return Array.from(unconfiguredCities).map(city => ({
    city,
    orderCount: cityOrderCounts[city],
  })).sort((a, b) => b.orderCount - a.orderCount);
}


// ========== 销售数据更新 ==========

/**
 * 更新所有销售人员的销售数据
 * 从订单表中统计每个销售人员的订单数和销售额
 */
export async function updateAllSalespersonStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 获取所有销售人员
  const allSalespersons = await db.select().from(salespersons);
  
  const results = [];
  
  for (const salesperson of allSalespersons) {
    // 统计该销售人员的订单数和销售额
    // 使用salespersonId或salesPerson字段匹配
    const stats = await db
      .select({
        orderCount: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`SUM(COALESCE(${orders.paymentAmount}, 0))`,
      })
      .from(orders)
      .where(
        or(
          eq(orders.salespersonId, salesperson.id),
          eq(orders.salesPerson, salesperson.name),
          eq(orders.salesPerson, salesperson.nickname || "")
        )
      );
    
    const orderCount = stats[0]?.orderCount || 0;
    const totalAmount = stats[0]?.totalAmount || 0;
    
    // 更新数据库中的统计字段
    await db
      .update(salespersons)
      .set({
        orderCount,
        totalSales: totalAmount.toString(),
      })
      .where(eq(salespersons.id, salesperson.id));
    
    results.push({
      salespersonId: salesperson.id,
      name: salesperson.name,
      nickname: salesperson.nickname,
      orderCount,
      totalAmount,
    });
  }
  
  return results;
}

/**
 * 更新单个销售人员的销售数据
 */
export async function updateSalespersonStats(salespersonId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 获取销售人员信息
  const salesperson = await db
    .select()
    .from(salespersons)
    .where(eq(salespersons.id, salespersonId))
    .limit(1);
  
  if (!salesperson || salesperson.length === 0) {
    throw new Error("Salesperson not found");
  }
  
  const sp = salesperson[0];
  
  // 统计该销售人员的订单数和销售额
  const stats = await db
    .select({
      orderCount: sql<number>`COUNT(*)`,
      totalAmount: sql<number>`SUM(COALESCE(${orders.paymentAmount}, 0))`,
    })
    .from(orders)
    .where(
      or(
        eq(orders.salespersonId, sp.id),
        eq(orders.salesPerson, sp.name),
        eq(orders.salesPerson, sp.nickname || "")
      )
    );
  
  const orderCount = stats[0]?.orderCount || 0;
  const totalAmount = stats[0]?.totalAmount || 0;
  
  // 更新数据库中的统计字段
  await db
    .update(salespersons)
    .set({
      orderCount,
      totalSales: totalAmount.toString(),
    })
    .where(eq(salespersons.id, sp.id));
  
  return {
    salespersonId: sp.id,
    name: sp.name,
    nickname: sp.nickname,
    orderCount,
    totalAmount,
  };
}



// ========== 城市月度业绩趋势 ==========

export async function getCityMonthlyTrends() {
  const db = await getDb();
  if (!db) return [];

  // 获取所有订单
  const allOrders = await db.select().from(orders);

  // 按城市和月份聚合统计
  const trendsMap: Record<string, Record<string, {
    month: string;
    city: string;
    orderCount: number;
    revenue: number;
    profit: number;
  }>> = {};

  allOrders.forEach((order) => {
    const city = order.deliveryCity || '未知城市';
    const classDate = order.classDate;
    
    if (!classDate) return;

    // 提取年月 (YYYY-MM格式)
    // classDate可能是Date类型或字符串类型
    const dateStr = typeof classDate === 'string' ? classDate : formatDateBeijing(classDate);
    const month = dateStr.substring(0, 7);

    if (!trendsMap[city]) {
      trendsMap[city] = {};
    }

    if (!trendsMap[city][month]) {
      trendsMap[city][month] = {
        month,
        city,
        orderCount: 0,
        revenue: 0,
        profit: 0,
      };
    }

    const revenue = parseFloat(order.paymentAmount || '0');
    const teacherFee = parseFloat(order.teacherFee || '0');
    const transportFee = parseFloat(order.transportFee || '0');
    const partnerFee = parseFloat(order.partnerFee || '0');
    const consumablesFee = parseFloat(order.consumablesFee || '0');
    const rentFee = parseFloat(order.rentFee || '0');
    const propertyFee = parseFloat(order.propertyFee || '0');
    const utilityFee = parseFloat(order.utilityFee || '0');
    const otherFee = parseFloat(order.otherFee || '0');
    
    const totalExpense = teacherFee + transportFee + partnerFee + consumablesFee + rentFee + propertyFee + utilityFee + otherFee;
    const profit = revenue - totalExpense;

    trendsMap[city][month].orderCount += 1;
    trendsMap[city][month].revenue += revenue;
    trendsMap[city][month].profit += profit;
  });

  // 转换为数组格式
  const trends: Array<{
    city: string;
    monthlyData: Array<{
      month: string;
      orderCount: number;
      revenue: number;
      profit: number;
    }>;
  }> = [];

  Object.keys(trendsMap).forEach((city) => {
    const monthlyData = Object.values(trendsMap[city]).sort((a, b) => 
      a.month.localeCompare(b.month)
    );
    
    trends.push({
      city,
      monthlyData,
    });
  });

  // 按城市名称排序
  trends.sort((a, b) => a.city.localeCompare(b.city));

  return trends;
}

/**
 * 从订单表重新计算并更新所有客户的统计信息(优化版)
 * 包括:累计消费、上课次数、首次上课时间、最后上课时间
 * @param onProgress 进度回调函数
 */
export async function refreshCustomerStats(
  onProgress?: (progress: { current: number; total: number; message: string }) => void
) {
  const dbInstance = await getDb();
  if (!dbInstance) {
    return {
      success: false,
      message: '数据库连接不可用',
      totalCustomers: 0,
      updatedCount: 0,
      createdCount: 0,
      skippedCount: 0,
    };
  }

  onProgress?.({ current: 0, total: 100, message: '开始统计订单数据...' });

  // 1. 从订单表统计每个客户的数据
  const customerStats = await dbInstance
    .select({
      customerName: orders.customerName,
      totalSpent: sql<string>`COALESCE(SUM(${orders.courseAmount}), 0)`,
      classCount: sql<number>`COUNT(*)`,
      firstOrderDate: sql<string>`MIN(${orders.classTime})`,
      lastOrderDate: sql<string>`MAX(${orders.classTime})`,
    })
    .from(orders)
    .where(
      and(
        isNotNull(orders.customerName),
        sql`TRIM(${orders.customerName}) != ''`
      )
    )
    .groupBy(orders.customerName);

  const totalCustomers = customerStats.length;
  onProgress?.({ current: 20, total: 100, message: `统计完成,共${totalCustomers}个客户` });

  let updatedCount = 0;
  let createdCount = 0;
  let skippedCount = 0;

  // 2. 获取所有老师名单(排除老师)
  const teachersList = await dbInstance.select({ name: teachers.name }).from(teachers);
  const teacherNames = new Set(teachersList.map((t: { name: string }) => t.name.toLowerCase()));

  onProgress?.({ current: 30, total: 100, message: '开始处理客户数据...' });

  // 3. 过滤掉空客户名和老师
  const validStats = customerStats.filter(stat => {
    if (!stat.customerName || stat.customerName.trim() === '') {
      skippedCount++;
      return false;
    }
    if (teacherNames.has(stat.customerName.toLowerCase())) {
      skippedCount++;
      return false;
    }
    return true;
  });

  onProgress?.({ current: 40, total: 100, message: `过滤完成,有效客户${validStats.length}个` });

  if (validStats.length === 0) {
    onProgress?.({ current: 100, total: 100, message: '没有需要处理的客户' });
    return {
      success: true,
      totalCustomers,
      updatedCount: 0,
      createdCount: 0,
      skippedCount,
      message: '没有需要处理的客户数据',
    };
  }

  // 4. 批量获取现有客户(一次性查询所有)
  const customerNames = validStats.map(s => s.customerName!.toLowerCase());
  const existingCustomers = await dbInstance
    .select({
      id: customers.id,
      name: customers.name,
      nameLower: sql<string>`LOWER(${customers.name})`,
    })
    .from(customers);

  const existingMap = new Map<string, number>();
  existingCustomers.forEach(c => {
    existingMap.set(c.nameLower, c.id);
  });

  onProgress?.({ current: 50, total: 100, message: '查询现有客户完成...' });

  // 5. 分离需要更新和创建的客户
  const toUpdate: number[] = [];
  const toCreate: Array<{
    name: string;
    createdBy: number;
    wechatId: string | null;
    phone: string | null;
    trafficSource: string | null;
    accountBalance: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  for (const stat of validStats) {
    const existingId = existingMap.get(stat.customerName!.toLowerCase());
    
    if (existingId) {
      toUpdate.push(existingId);
    } else {
      // 处理时间格式问题
      let createdAtDate: Date;
      try {
        createdAtDate = stat.firstOrderDate ? new Date(stat.firstOrderDate) : new Date();
        if (isNaN(createdAtDate.getTime())) {
          createdAtDate = new Date();
        }
      } catch {
        createdAtDate = new Date();
      }

      toCreate.push({
        name: stat.customerName!,
        createdBy: 1,
        wechatId: null,
        phone: null,
        trafficSource: null,
        accountBalance: "0.00",
        notes: null,
        createdAt: createdAtDate,
        updatedAt: new Date(),
      });
    }
  }

  onProgress?.({ current: 60, total: 100, message: `准备更新${toUpdate.length}个客户,创建${toCreate.length}个客户` });

  // 6. 批量更新现有客户(分批处理)
  const BATCH_SIZE = 100;
  const updateTime = new Date();

  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = toUpdate.slice(i, i + BATCH_SIZE);
    
    // 使用 IN 查询批量更新
    await dbInstance
      .update(customers)
      .set({ updatedAt: updateTime })
      .where(sql`${customers.id} IN (${sql.join(batch.map(id => sql`${id}`), sql`, `)})`);
    
    updatedCount += batch.length;
    const progress = 60 + Math.floor((updatedCount / toUpdate.length) * 20);
    onProgress?.({ current: progress, total: 100, message: `已更新${updatedCount}/${toUpdate.length}个客户` });
  }

  // 7. 批量创建新客户(分批处理)
  for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
    const batch = toCreate.slice(i, i + BATCH_SIZE);
    await dbInstance.insert(customers).values(batch);
    
    createdCount += batch.length;
    const progress = 80 + Math.floor((createdCount / toCreate.length) * 20);
    onProgress?.({ current: progress, total: 100, message: `已创建${createdCount}/${toCreate.length}个客户` });
  }

  onProgress?.({ current: 100, total: 100, message: '更新完成!' });

  return {
    success: true,
    totalCustomers: customerStats.length,
    updatedCount,
    createdCount,
    skippedCount,
    message: `成功处理${customerStats.length}个客户:更新${updatedCount}个,新建${createdCount}个,跳过${skippedCount}个(老师)`,
  };
}


// ============ Metadata Queries ============

/**
 * 获取所有唯一城市列表
 * 从orders和schedules表中提取所有不重复的城市名称
 */
export async function getUniqueCities() {
  const db = await getDb();
  if (!db) return [];

  try {
    // 从订单表获取交付城市和支付城市
    const orderDeliveryCities = await db
      .selectDistinct({ city: orders.deliveryCity })
      .from(orders)
      .where(sql`${orders.deliveryCity} IS NOT NULL AND ${orders.deliveryCity} != ''`);

    const orderPaymentCities = await db
      .selectDistinct({ city: orders.paymentCity })
      .from(orders)
      .where(sql`${orders.paymentCity} IS NOT NULL AND ${orders.paymentCity} != ''`);

    // 从排课表获取城市
    const scheduleCities = await db
      .selectDistinct({ city: schedules.city })
      .from(schedules)
      .where(sql`${schedules.city} IS NOT NULL AND ${schedules.city} != ''`);

    const scheduleDeliveryCities = await db
      .selectDistinct({ city: schedules.deliveryCity })
      .from(schedules)
      .where(sql`${schedules.deliveryCity} IS NOT NULL AND ${schedules.deliveryCity} != ''`);

    // 从老师表获取城市
    const teacherCities = await db
      .selectDistinct({ city: teachers.city })
      .from(teachers)
      .where(sql`${teachers.city} IS NOT NULL AND ${teachers.city} != ''`);

    // 合并所有城市并去重
    const allCities = [
      ...orderDeliveryCities.map((r) => r.city),
      ...orderPaymentCities.map((r) => r.city),
      ...scheduleCities.map((r) => r.city),
      ...scheduleDeliveryCities.map((r) => r.city),
      ...teacherCities.map((r) => r.city),
    ];

    const uniqueCities = Array.from(new Set(allCities))
      .filter(Boolean)
      .sort((a, b) => a!.localeCompare(b!, "zh-CN"));

    return uniqueCities;
  } catch (error) {
    console.error("获取唯一城市列表失败:", error);
    return [];
  }
}

/**
 * 获取所有唯一课程类型列表
 * 从schedules和orders表中提取所有不重复的课程名称
 */
export async function getUniqueCourses() {
  const db = await getDb();
  if (!db) return [];

  try {
    // 从排课表获取课程类型
    const scheduleCourses = await db
      .selectDistinct({ course: schedules.courseType })
      .from(schedules)
      .where(sql`${schedules.courseType} IS NOT NULL AND ${schedules.courseType} != ''`);

    const scheduleDeliveryCourses = await db
      .selectDistinct({ course: schedules.deliveryCourse })
      .from(schedules)
      .where(sql`${schedules.deliveryCourse} IS NOT NULL AND ${schedules.deliveryCourse} != ''`);

    // 从订单表获取交付课程
    const orderCourses = await db
      .selectDistinct({ course: orders.deliveryCourse })
      .from(orders)
      .where(sql`${orders.deliveryCourse} IS NOT NULL AND ${orders.deliveryCourse} != ''`);

    // 合并所有课程并去重
    const allCourses = [
      ...scheduleCourses.map((r) => r.course),
      ...scheduleDeliveryCourses.map((r) => r.course),
      ...orderCourses.map((r) => r.course),
    ];

    const uniqueCourses = Array.from(new Set(allCourses))
      .filter(Boolean)
      .sort((a, b) => a!.localeCompare(b!, "zh-CN"));

    return uniqueCourses;
  } catch (error) {
    console.error("获取唯一课程列表失败:", error);
    return [];
  }
}

/**
 * 获取所有唯一教室列表
 * 从schedules和orders表中提取所有不重复的教室名称
 */
export async function getUniqueClassrooms() {
  const db = await getDb();
  if (!db) return [];

  try {
    // 从排课表获取教室
    const scheduleLocations = await db
      .selectDistinct({ classroom: schedules.location })
      .from(schedules)
      .where(sql`${schedules.location} IS NOT NULL AND ${schedules.location} != ''`);

    const scheduleClassrooms = await db
      .selectDistinct({ classroom: schedules.deliveryClassroom })
      .from(schedules)
      .where(sql`${schedules.deliveryClassroom} IS NOT NULL AND ${schedules.deliveryClassroom} != ''`);

    // 从订单表获取交付教室
    const orderClassrooms = await db
      .selectDistinct({ classroom: orders.deliveryRoom })
      .from(orders)
      .where(sql`${orders.deliveryRoom} IS NOT NULL AND ${orders.deliveryRoom} != ''`);

    // 合并所有教室并去重
    const allClassrooms = [
      ...scheduleLocations.map((r) => r.classroom),
      ...scheduleClassrooms.map((r) => r.classroom),
      ...orderClassrooms.map((r) => r.classroom),
    ];

    const uniqueClassrooms = Array.from(new Set(allClassrooms))
      .filter(Boolean)
      .sort((a, b) => a!.localeCompare(b!, "zh-CN"));

    return uniqueClassrooms;
  } catch (error) {
    console.error("获取唯一教室列表失败:", error);
    return [];
  }
}

/**
 * 获取所有唯一老师名称列表
 * 从teachers、schedules和orders表中提取所有不重复的老师名称
 */
export async function getUniqueTeacherNames() {
  const db = await getDb();
  if (!db) return [];

  try {
    // 从老师表获取老师名称
    const teacherNames = await db
      .selectDistinct({ name: teachers.name })
      .from(teachers)
      .where(sql`${teachers.name} IS NOT NULL AND ${teachers.name} != ''`);

    // 从排课表获取老师名称
    const scheduleTeacherNames = await db
      .selectDistinct({ name: schedules.teacherName })
      .from(schedules)
      .where(sql`${schedules.teacherName} IS NOT NULL AND ${schedules.teacherName} != ''`);

    const scheduleDeliveryTeachers = await db
      .selectDistinct({ name: schedules.deliveryTeacher })
      .from(schedules)
      .where(sql`${schedules.deliveryTeacher} IS NOT NULL AND ${schedules.deliveryTeacher} != ''`);

    // 从订单表获取交付老师
    const orderTeachers = await db
      .selectDistinct({ name: orders.deliveryTeacher })
      .from(orders)
      .where(sql`${orders.deliveryTeacher} IS NOT NULL AND ${orders.deliveryTeacher} != ''`);

    // 合并所有老师名称并去重
    const allTeacherNames = [
      ...teacherNames.map((r) => r.name),
      ...scheduleTeacherNames.map((r) => r.name),
      ...scheduleDeliveryTeachers.map((r) => r.name),
      ...orderTeachers.map((r) => r.name),
    ];

    const uniqueTeacherNames = Array.from(new Set(allTeacherNames))
      .filter(Boolean)
      .sort((a, b) => a!.localeCompare(b!, "zh-CN"));

    return uniqueTeacherNames;
  } catch (error) {
    console.error("获取唯一老师名称列表失败:", error);
    return [];
  }
}


/**
 * 获取所有唯一老师分类列表
 * 从teachers表中提取所有不重复的老师分类(S、M、SW等)
 */
export async function getUniqueTeacherCategories() {
  const db = await getDb();
  if (!db) return [];

  try {
    // 从老师表获取分类
    const teacherCategories = await db
      .selectDistinct({ category: teachers.category })
      .from(teachers)
      .where(sql`${teachers.category} IS NOT NULL AND ${teachers.category} != ''`);

    const uniqueCategories = Array.from(new Set(teacherCategories.map((r) => r.category)))
      .filter(Boolean)
      .sort((a, b) => a!.localeCompare(b!, "zh-CN"));

    return uniqueCategories;
  } catch (error) {
    console.error("获取唯一老师分类列表失败:", error);
    return [];
  }
}

/**
 * 获取所有唯一课程价格列表
 * 从orders表中提取所有不重复的课程金额,并按数值排序
 */
export async function getUniqueCourseAmounts() {
  const db = await getDb();
  if (!db) return [];

  try {
    // 从订单表获取课程金额
    const courseAmounts = await db
      .selectDistinct({ amount: orders.courseAmount })
      .from(orders)
      .where(sql`${orders.courseAmount} IS NOT NULL AND ${orders.courseAmount} != '' AND ${orders.courseAmount} != '0'`);

    // 转换为数字并排序
    const uniqueAmounts = Array.from(
      new Set(
        courseAmounts
          .map((r) => r.amount)
          .filter(Boolean)
          .map((amt) => parseFloat(amt!))
          .filter((amt) => !isNaN(amt) && amt > 0)
      )
    ).sort((a, b) => a - b);

    // 转换回字符串格式
    return uniqueAmounts.map((amt) => amt.toString());
  } catch (error) {
    console.error("获取唯一课程价格列表失败:", error);
    return [];
  }
}



/**
 * 获取所有城市合伙人费配置
 */
export async function getAllCityPartnerConfigs() {
  const db = await getDb();
  if (!db) return [];

  try {
    const configs = await db
      .select({
        id: cityPartnerConfig.id,
        city: cityPartnerConfig.city,
        partnerFeeRate: cityPartnerConfig.partnerFeeRate,
        areaCode: cityPartnerConfig.areaCode,
        isActive: cityPartnerConfig.isActive,
      })
      .from(cityPartnerConfig)
      .where(
        and(
          eq(cityPartnerConfig.isActive, true),
          isNotNull(cityPartnerConfig.partnerFeeRate),
          not(like(cityPartnerConfig.city, '%测试%'))
        )
      )
      .orderBy(cityPartnerConfig.city);
    
    return configs;
  } catch (error) {
    console.error("获取城市合伙人费配置失败:", error);
    return [];
  }
}


/**
 * 获取所有课程列表
 */
export async function getAllCourses() {
  const db = await getDb();
  if (!db) return [];

  try {
    const courseList = await db
      .select()
      .from(courses)
      .orderBy(courses.createdAt);
    
    return courseList;
  } catch (error) {
    console.error("获取课程列表失败:", error);
    return [];
  }
}

/**
 * 根据ID获取课程详情
 */
export async function getCourseById(id: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, id))
      .limit(1);
    
    return course || null;
  } catch (error) {
    console.error("获取课程详情失败:", error);
    return null;
  }
}

/**
 * 创建课程
 */
export async function createCourse(data: InsertCourse) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  try {
    const [result] = await db.insert(courses).values(data);
    return result.insertId;
  } catch (error) {
    console.error("创建课程失败:", error);
    throw error;
  }
}

/**
 * 更新课程
 */
export async function updateCourse(id: number, data: Partial<InsertCourse>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  try {
    await db.update(courses).set(data).where(eq(courses.id, id));
    return true;
  } catch (error) {
    console.error("更新课程失败:", error);
    throw error;
  }
}

/**
 * 删除课程
 */
export async function deleteCourse(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  try {
    await db.delete(courses).where(eq(courses.id, id));
    return true;
  } catch (error) {
    console.error("删除课程失败:", error);
    throw error;
  }
}

/**
 * 切换课程启用状态
 */
export async function toggleCourseActive(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  try {
    const course = await getCourseById(id);
    if (!course) throw new Error("课程不存在");
    
    await db
      .update(courses)
      .set({ isActive: !course.isActive })
      .where(eq(courses.id, id));
    
    return !course.isActive;
  } catch (error) {
    console.error("切换课程状态失败:", error);
    throw error;
  }
}

// ==================== 城市管理 ====================

/**
 * 获取所有城市列表（包含合伙人分红比例）
 */
export async function getAllCities() {
  const db = await getDb();
  if (!db) return [];

  try {
    const cityList = await db
      .select({
        id: cities.id,
        name: cities.name,
        areaCode: cities.areaCode,
        isActive: cities.isActive,
        sortOrder: cities.sortOrder,
        createdAt: cities.createdAt,
        updatedAt: cities.updatedAt,
        // 关联查询partner_cities表获取当前分红阶段的合佩人分红比例
        currentProfitStage: partnerCities.currentProfitStage,
        isInvestmentRecovered: partnerCities.isInvestmentRecovered,
        profitRatioStage1Partner: partnerCities.profitRatioStage1Partner,
        profitRatioStage2APartner: partnerCities.profitRatioStage2APartner,
        profitRatioStage2BPartner: partnerCities.profitRatioStage2BPartner,
        profitRatioStage3Partner: partnerCities.profitRatioStage3Partner,
      })
      .from(cities)
      .leftJoin(partnerCities, eq(cities.id, partnerCities.cityId))
      .where(eq(cities.isActive, true))  // 只返回激活状态的城市
      .orderBy(asc(cities.sortOrder), asc(cities.name));
    
    // 去重:当一个城市有多条partner_cities记录时,leftJoin会返回多行
    // 使用Map去重,保留每个城市的第一条记录
    const uniqueCities = new Map<number, typeof cityList[0]>();
    for (const city of cityList) {
      if (!uniqueCities.has(city.id)) {
        uniqueCities.set(city.id, city);
      }
    }
    
    // 计算每个城市的当前合佩人分红比例
    return Array.from(uniqueCities.values()).map(city => {
      let partnerFeeRate: number | null = null;
      
      // 只有当城市有合伙人合同时才计算分红比例
      if (city.currentProfitStage !== null) {
        if (city.currentProfitStage === 1 && city.profitRatioStage1Partner !== null) {
          partnerFeeRate = parseFloat(String(city.profitRatioStage1Partner));
        } else if (city.currentProfitStage === 2) {
          if (city.isInvestmentRecovered && city.profitRatioStage2BPartner !== null) {
            partnerFeeRate = parseFloat(String(city.profitRatioStage2BPartner));
          } else if (!city.isInvestmentRecovered && city.profitRatioStage2APartner !== null) {
            partnerFeeRate = parseFloat(String(city.profitRatioStage2APartner));
          }
        } else if (city.currentProfitStage === 3 && city.profitRatioStage3Partner !== null) {
          partnerFeeRate = parseFloat(String(city.profitRatioStage3Partner));
        }
      }
      
      return {
        id: city.id,
        name: city.name,
        areaCode: city.areaCode,
        isActive: city.isActive,
        sortOrder: city.sortOrder,
        createdAt: city.createdAt,
        updatedAt: city.updatedAt,
        partnerFeeRate, // 当前合佩人分红比例
      };
    });
  } catch (error) {
    console.error("获取城市列表失败:", error);
    return [];
  }
}

/**
 * 根据ID获取城市详情
 */
export async function getCityById(id: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const [city] = await db
      .select()
      .from(cities)
      .where(eq(cities.id, id))
      .limit(1);
    
    return city || null;
  } catch (error) {
    console.error("获取城市详情失败:", error);
    return null;
  }
}

/**
 * 创建城市
 */
export async function createCity(data: InsertCity) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  try {
    const [result] = await db.insert(cities).values(data);
    return result.insertId;
  } catch (error) {
    console.error("创建城市失败:", error);
    throw error;
  }
}

/**
 * 更新城市
 */
export async function updateCity(id: number, data: Partial<InsertCity>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  try {
    // 1. 获取城市名称
    const city = await db
      .select()
      .from(cities)
      .where(eq(cities.id, id))
      .limit(1);
    
    if (city.length === 0) {
      throw new Error("城市不存在");
    }
    
    const cityName = city[0].name;
    
    // 2. 更新cities表
    await db.update(cities).set(data).where(eq(cities.id, id));
    
    // 3. 如果更新了areaCode，同步到cityPartnerConfig表
    if (data.areaCode !== undefined) {
      await db
        .update(cityPartnerConfig)
        .set({ areaCode: data.areaCode })
        .where(eq(cityPartnerConfig.city, cityName));
    }
    
    return true;
  } catch (error) {
    console.error("更新城市失败:", error);
    throw error;
  }
}

/**
 * 删除城市
 */
export async function deleteCity(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  try {
    // 先删除该城市的所有教室
    await db.delete(classrooms).where(eq(classrooms.cityId, id));
    // 再删除城市
    await db.delete(cities).where(eq(cities.id, id));
    return true;
  } catch (error) {
    console.error("删除城市失败:", error);
    throw error;
  }
}

/**
 * 批量同步区号：从cityPartnerConfig同步到cities
 * 使用SQL原生查询提高性能
 */
export async function syncAreaCodeFromConfigToCities() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // 使用SQL JOIN语句一次性更新所有城市
  const result = await db.execute(`
    UPDATE cities c
    INNER JOIN cityPartnerConfig cpc ON c.name = cpc.city
    SET c.areaCode = cpc.areaCode
    WHERE cpc.isActive = 1 AND cpc.areaCode IS NOT NULL AND cpc.areaCode != ''
  `);
  
  return { 
    total: Number(result[0].affectedRows) || 0, 
    synced: Number(result[0].affectedRows) || 0 
  };
}

/**
 * 批量同步区号：从cities同步到cityPartnerConfig
 * 使用SQL原生查询提高性能
 */
export async function syncAreaCodeFromCitiesToConfig() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // 使用SQL JOIN语句一次性更新所有配置
  const result = await db.execute(`
    UPDATE cityPartnerConfig cpc
    INNER JOIN cities c ON cpc.city = c.name
    SET cpc.areaCode = c.areaCode
    WHERE c.isActive = 1 AND c.areaCode IS NOT NULL AND c.areaCode != ''
  `);
  
  return { 
    total: Number(result[0].affectedRows) || 0, 
    synced: Number(result[0].affectedRows) || 0 
  };
}

// ==================== 教室管理 ====================

/**
 * 获取所有教室列表
 */
export async function getAllClassrooms() {
  const db = await getDb();
  if (!db) return [];

  try {
    const classroomList = await db
      .select()
      .from(classrooms)
      .orderBy(asc(classrooms.cityName), asc(classrooms.sortOrder));
    
    return classroomList;
  } catch (error) {
    console.error("获取教室列表失败:", error);
    return [];
  }
}

/**
 * 根据城市ID获取教室列表
 */
export async function getClassroomsByCityId(cityId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const classroomList = await db
      .select()
      .from(classrooms)
      .where(eq(classrooms.cityId, cityId))
      .orderBy(asc(classrooms.sortOrder), asc(classrooms.name));
    
    return classroomList;
  } catch (error) {
    console.error("获取教室列表失败:", error);
    return [];
  }
}

/**
 * 根据ID获取教室详情
 */
export async function getClassroomById(id: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const [classroom] = await db
      .select()
      .from(classrooms)
      .where(eq(classrooms.id, id))
      .limit(1);
    
    return classroom || null;
  } catch (error) {
    console.error("获取教室详情失败:", error);
    return null;
  }
}

/**
 * 创建教室
 */
export async function createClassroom(data: InsertClassroom) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  try {
    const [result] = await db.insert(classrooms).values(data);
    return result.insertId;
  } catch (error) {
    console.error("创建教室失败:", error);
    throw error;
  }
}

/**
 * 更新教室
 */
export async function updateClassroom(id: number, data: Partial<InsertClassroom>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  try {
    await db.update(classrooms).set(data).where(eq(classrooms.id, id));
    return true;
  } catch (error) {
    console.error("更新教室失败:", error);
    throw error;
  }
}

/**
 * 删除教室
 */
export async function deleteClassroom(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  try {
    await db.delete(classrooms).where(eq(classrooms.id, id));
    return true;
  } catch (error) {
    console.error("删除教室失败:", error);
    throw error;
  }
}

/**
 * 切换教室启用状态
 */
export async function toggleClassroomActive(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  try {
    const classroom = await getClassroomById(id);
    if (!classroom) throw new Error("教室不存在");
    
    await db
      .update(classrooms)
      .set({ isActive: !classroom.isActive })
      .where(eq(classrooms.id, id));
    
    return !classroom.isActive;
  } catch (error) {
    console.error("切换教室状态失败:", error);
    throw error;
  }
}

// 根据城市名称获取教室列表
export async function getClassroomsByCityName(cityName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db.select().from(classrooms).where(eq(classrooms.cityName, cityName)).orderBy(asc(classrooms.sortOrder), asc(classrooms.name));
}


// ==================== 申请通知 ====================

/** 创建用户留言/申请通知 */
export async function createUserNotification(data: {
  userId: number;
  userName?: string;
  userPhone?: string;
  type?: string;
  title?: string;
  content: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.insert(userNotifications).values({
    userId: data.userId,
    userName: data.userName || null,
    userPhone: data.userPhone || null,
    type: data.type || "general",
    title: data.title || null,
    content: data.content,
    status: "unread",
  });
  return { id: result[0].insertId };
}

/** 查询通知列表（管理员用，支持分页和筛选） */
export async function listUserNotifications(params: {
  status?: string;
  type?: string;
  userId?: number;
  page?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const { status, type, userId, page = 1, pageSize = 20 } = params;

  const conditions: any[] = [];
  if (status) conditions.push(eq(userNotifications.status, status));
  if (type) conditions.push(eq(userNotifications.type, type));
  if (userId) conditions.push(eq(userNotifications.userId, userId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db.select()
      .from(userNotifications)
      .where(whereClause)
      .orderBy(
        sql`CASE WHEN ${userNotifications.status} = 'unread' THEN 0 WHEN ${userNotifications.status} = 'read' THEN 1 WHEN ${userNotifications.status} = 'replied' THEN 2 WHEN ${userNotifications.status} = 'archived' THEN 3 ELSE 4 END`,
        desc(userNotifications.createdAt)
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` })
      .from(userNotifications)
      .where(whereClause),
  ]);

  return {
    items,
    total: countResult[0]?.count || 0,
    page,
    pageSize,
  };
}

/** 获取单条通知详情 */
export async function getUserNotificationById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.select().from(userNotifications).where(eq(userNotifications.id, id));
  return result[0] || null;
}

/** 标记通知为已读 */
export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(userNotifications)
    .set({ status: "read", readAt: new Date() })
    .where(eq(userNotifications.id, id));
}

/** 批量标记通知为已读 */
export async function batchMarkNotificationsRead(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(userNotifications)
    .set({ status: "read", readAt: new Date() })
    .where(inArray(userNotifications.id, ids));
}

/** 回复通知 */
export async function replyNotification(id: number, data: { adminReply: string; repliedBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(userNotifications)
    .set({
      adminReply: data.adminReply,
      repliedBy: data.repliedBy,
      repliedAt: new Date(),
      status: "replied",
    })
    .where(eq(userNotifications.id, id));
}

/** 归档通知 */
export async function archiveNotification(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(userNotifications)
    .set({ status: "archived" })
    .where(eq(userNotifications.id, id));
}

/** 删除通知 */
export async function deleteUserNotification(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.delete(userNotifications).where(eq(userNotifications.id, id));
}

/** 获取未读通知数量 */
export async function getUnreadNotificationCount() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(userNotifications)
    .where(eq(userNotifications.status, "unread"));
  return result[0]?.count || 0;
}

/** 查询用户自己的留言列表（App用户用） */
export async function listMyNotifications(userId: number, params: { page?: number; pageSize?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const { page = 1, pageSize = 20 } = params;

  const [items, countResult] = await Promise.all([
    db.select()
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId))
      .orderBy(desc(userNotifications.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` })
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId)),
  ]);

  return {
    items,
    total: countResult[0]?.count || 0,
    page,
    pageSize,
  };
}

// ==================== 合伙人城市管理 ====================

/** 为合伙人分配城市 */
export async function assignPartnerCities(partnerId: number, cityIds: number[], createdBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // 删除现有的城市分配
  await db.delete(partnerCities).where(eq(partnerCities.partnerId, partnerId));
  
  // 插入新的城市分配
  if (cityIds.length > 0) {
    await db.insert(partnerCities).values(
      cityIds.map(cityId => ({
        partnerId,
        cityId,
        createdBy,
      }))
    );
  }
  
  return true;
}

/** 查询合伙人关联的城市列表 */
export async function getPartnerCities(partnerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const result = await db
    .select({
      id: partnerCities.id,
      partnerId: partnerCities.partnerId,
      cityId: partnerCities.cityId,
      cityName: cities.name,
      createdAt: partnerCities.createdAt,
    })
    .from(partnerCities)
    .leftJoin(cities, eq(partnerCities.cityId, cities.id))
    .where(eq(partnerCities.partnerId, partnerId));
  
  return result;
}

/** 查询合伙人的城市订单统计 */
export async function getPartnerCityOrderStats(partnerId: number, options?: {
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // 获取合伙人关联的城市
  const partnerCitiesList = await getPartnerCities(partnerId);
  if (partnerCitiesList.length === 0) {
    return [];
  }
  
  const stats = [];
  for (const city of partnerCitiesList) {
    const conditions = [sql`${orders.deliveryCity} = ${city.cityName}`];
    
    if (options?.startDate) {
      conditions.push(sql`${orders.classDate} >= ${options.startDate}`);
    }
    if (options?.endDate) {
      conditions.push(sql`${orders.classDate} <= ${options.endDate}`);
    }
    
    const result = await db
      .select({
        orderCount: sql<number>`COUNT(*)`,
        totalAmount: sql<string>`COALESCE(SUM(${orders.courseAmount}), 0)`,
        totalTeacherFee: sql<string>`COALESCE(SUM(${orders.teacherFee}), 0)`,
        totalTransportFee: sql<string>`COALESCE(SUM(${orders.transportFee}), 0)`,
        totalPartnerFee: sql<string>`COALESCE(SUM(${orders.partnerFee}), 0)`,
      })
      .from(orders)
      .where(and(...conditions));
    
    stats.push({
      cityId: city.cityId,
      cityName: city.cityName,
      orderCount: result[0]?.orderCount || 0,
      totalAmount: result[0]?.totalAmount || "0",
      totalTeacherFee: result[0]?.totalTeacherFee || "0",
      totalTransportFee: result[0]?.totalTransportFee || "0",
      totalPartnerFee: result[0]?.totalPartnerFee || "0",
    });
  }
  
  return stats;
}

// ==================== 合伙人费用明细管理 ====================

/** 创建/更新合伙人费用明细 */
export async function upsertPartnerExpense(data: {
  partnerId: number;
  cityId: number;
  month: string;
  rentFee: string;
  propertyFee: string;
  utilityFee: string;
  consumablesFee: string;
  teacherFee: string;
  transportFee: string;
  otherFee: string;
  deferredPayment: string;
  notes?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // 检查是否已存在该月份的费用记录
  const existing = await db
    .select()
    .from(partnerExpenses)
    .where(
      and(
        eq(partnerExpenses.partnerId, data.partnerId),
        eq(partnerExpenses.cityId, data.cityId),
        sql`DATE_FORMAT(${partnerExpenses.month}, '%Y-%m') = ${data.month.slice(0, 7)}`
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    // 更新现有记录
    await db
      .update(partnerExpenses)
      .set({
        rentFee: data.rentFee,
        propertyFee: data.propertyFee,
        utilityFee: data.utilityFee,
        consumablesFee: data.consumablesFee,
        teacherFee: data.teacherFee,
        transportFee: data.transportFee,
        otherFee: data.otherFee,
        deferredPayment: data.deferredPayment,
        notes: data.notes,
        updatedAt: new Date(),
      })
      .where(eq(partnerExpenses.id, existing[0].id));
    
    return existing[0];
  } else {
    // 创建新记录
    await db
      .insert(partnerExpenses)
      .values({
        partnerId: data.partnerId,
        cityId: data.cityId,
        month: new Date(data.month.slice(0, 7) + "-01"),
        rentFee: data.rentFee,
        propertyFee: data.propertyFee,
        utilityFee: data.utilityFee,
        consumablesFee: data.consumablesFee,
        teacherFee: data.teacherFee,
        transportFee: data.transportFee,
        otherFee: data.otherFee,
        deferredPayment: data.deferredPayment,
        notes: data.notes,
        createdBy: data.createdBy,
      });
    
    // 查询刚创建的记录(按ID降序获取最新的)
    const created = await db
      .select()
      .from(partnerExpenses)
      .where(
        and(
          eq(partnerExpenses.partnerId, data.partnerId),
          eq(partnerExpenses.cityId, data.cityId)
        )
      )
      .orderBy(desc(partnerExpenses.id))
      .limit(1);
    
    return created.length > 0 ? created[0] : { id: 0 };
  }
}

/** 查询合伙人的费用明细列表 */
export async function getPartnerExpenses(partnerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const result = await db
    .select()
    .from(partnerExpenses)
    .where(eq(partnerExpenses.partnerId, partnerId))
    .orderBy(desc(partnerExpenses.month));
  
  return result;
}

/**
 * 获取老师相关的订单列表
 * 查询deliveryTeacher字段包含老师名字的订单
 */
export async function getOrdersByTeacher(teacherId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // 首先获取老师的名字
  const user = await getUserById(teacherId);
  if (!user) return [];
  
  const teacherName = user.name || user.nickname || '';
  if (!teacherName) return [];
  
  // 查询deliveryTeacher字段包含老师名字的订单
  return db
    .select()
    .from(orders)
    .where(sql`${orders.deliveryTeacher} LIKE ${`%${teacherName}%`}`)
    .orderBy(desc(orders.createdAt));
}
