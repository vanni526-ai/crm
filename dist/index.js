var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/const.ts
var COOKIE_NAME, ONE_YEAR_MS, AXIOS_TIMEOUT_MS, UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG;
var init_const = __esm({
  "shared/const.ts"() {
    "use strict";
    COOKIE_NAME = "app_session_id";
    ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
    AXIOS_TIMEOUT_MS = 3e4;
    UNAUTHED_ERR_MSG = "Please login (10001)";
    NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
  }
});

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accountAuditLogs: () => accountAuditLogs,
  accountPermissions: () => accountPermissions,
  accountTransactions: () => accountTransactions,
  auditLogs: () => auditLogs,
  cities: () => cities,
  cityMonthlyExpenses: () => cityMonthlyExpenses,
  cityPartnerConfig: () => cityPartnerConfig,
  classrooms: () => classrooms,
  courses: () => courses,
  customers: () => customers,
  fieldMappings: () => fieldMappings,
  gmailErrorFeedback: () => gmailErrorFeedback,
  gmailImportConfig: () => gmailImportConfig,
  gmailImportHistory: () => gmailImportHistory,
  gmailImportLogs: () => gmailImportLogs,
  importLogs: () => importLogs,
  matchedScheduleOrders: () => matchedScheduleOrders,
  membershipConfig: () => membershipConfig,
  membershipOrders: () => membershipOrders,
  membershipPlans: () => membershipPlans,
  orderItems: () => orderItems,
  orders: () => orders,
  parsingCorrections: () => parsingCorrections,
  parsingLearningConfig: () => parsingLearningConfig,
  partnerCities: () => partnerCities,
  partnerExpenses: () => partnerExpenses,
  partnerFeeAuditLogs: () => partnerFeeAuditLogs,
  partnerProfitRecords: () => partnerProfitRecords,
  partners: () => partners,
  promptOptimizationHistory: () => promptOptimizationHistory,
  reconciliations: () => reconciliations,
  salesCommissionConfigs: () => salesCommissionConfigs,
  salespersons: () => salespersons,
  schedules: () => schedules,
  smartRegisterHistory: () => smartRegisterHistory,
  systemAccounts: () => systemAccounts,
  teacherPayments: () => teacherPayments,
  teacherUnavailability: () => teacherUnavailability,
  teachers: () => teachers,
  userNotifications: () => userNotifications,
  userRoleCities: () => userRoleCities,
  users: () => users
});
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, index, date, time, json, unique, tinyint } from "drizzle-orm/mysql-core";
var users, userRoleCities, customers, orders, teachers, schedules, matchedScheduleOrders, teacherPayments, reconciliations, gmailErrorFeedback, gmailImportConfig, gmailImportLogs, importLogs, salespersons, accountTransactions, smartRegisterHistory, gmailImportHistory, fieldMappings, parsingCorrections, promptOptimizationHistory, parsingLearningConfig, cityPartnerConfig, partners, partnerExpenses, partnerProfitRecords, partnerCities, auditLogs, partnerFeeAuditLogs, systemAccounts, accountAuditLogs, accountPermissions, courses, cities, classrooms, userNotifications, salesCommissionConfigs, cityMonthlyExpenses, membershipConfig, teacherUnavailability, orderItems, membershipPlans, membershipOrders;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
      id: int("id").autoincrement().primaryKey(),
      openId: varchar("openId", { length: 64 }).notNull().unique(),
      name: text("name"),
      nickname: varchar("nickname", { length: 50 }),
      // 花名
      email: varchar("email", { length: 320 }),
      phone: varchar("phone", { length: 20 }),
      // 手机号(用于登录)
      password: varchar("password", { length: 255 }),
      // 加密后的密码
      loginMethod: varchar("loginMethod", { length: 64 }),
      role: mysqlEnum("role", ["admin", "sales", "finance", "user", "teacher", "cityPartner"]).default("user").notNull(),
      // 兼容旧字段，保留但不再作为主要角色字段
      roles: varchar("roles", { length: 255 }).default("user").notNull(),
      // 新多角色字段，逗号分隔，如 "admin,teacher"
      isActive: boolean("isActive").default(true).notNull(),
      // 会员相关字段
      membershipStatus: mysqlEnum("membershipStatus", ["pending", "active", "expired"]).default("pending").notNull(),
      // 会员状态: pending(待激活), active(已激活), expired(已过期)
      isMember: boolean("isMember").default(false).notNull(),
      // 是否是会员(兼容旧字段)
      membershipOrderId: int("membershipOrderId"),
      // 会员订单ID（关联订单表）
      membershipActivatedAt: timestamp("membershipActivatedAt"),
      // 会员激活时间
      membershipExpiresAt: timestamp("membershipExpiresAt"),
      // 会员到期时间
      // 老师特有字段(从teachers表迁移)
      avatarUrl: varchar("avatarUrl", { length: 500 }),
      // 头像URL(S3存储)
      aliases: text("aliases"),
      // 别名列表(JSON数组)
      teacherAttribute: mysqlEnum("teacherAttribute", ["S", "M", "Switch"]),
      // 老师属性(S/M/Switch)
      customerType: varchar("customerType", { length: 200 }),
      // 受众客户类型
      category: varchar("category", { length: 50 }),
      // 分类(本部老师/合伙店老师)
      hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }),
      // 课时费标准
      bankAccount: varchar("bankAccount", { length: 100 }),
      // 银行账号
      bankName: varchar("bankName", { length: 100 }),
      // 开户行
      contractEndDate: date("contractEndDate"),
      // 合同到期时间
      joinDate: date("joinDate"),
      // 入职时间
      teacherStatus: varchar("teacherStatus", { length: 20 }).default("\u6D3B\u8DC3"),
      // 老师活跃状态(活跃/不活跃)
      teacherNotes: text("teacherNotes"),
      // 老师备注
      wechat: varchar("wechat", { length: 100 }),
      // 微信号
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
      deletedAt: timestamp("deletedAt"),
      // 软删除时间戳
      isDeleted: int("isDeleted").default(0).notNull(),
      // 注销状态: 0=正常, 1=注销中(30天缓冲期), 2=已脱敏
      deletionReason: text("deletionReason"),
      // 用户填写的注销原因(可选)
      anonymizedAt: timestamp("anonymizedAt")
      // 数据脱敏完成时间
    });
    userRoleCities = mysqlTable("user_role_cities", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      // 关联users表
      role: mysqlEnum("role", ["admin", "teacher", "cityPartner", "sales", "user"]).notNull(),
      // 角色类型
      cities: text("cities").notNull(),
      // 城市列表(JSON数组存储，如 '["深圳","广州"]')
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      userRoleIdx: index("user_role_idx").on(table.userId, table.role),
      userIdIdx: index("user_id_idx").on(table.userId)
    }));
    customers = mysqlTable("customers", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId"),
      // 关联users表(可选,用于App注册用户)
      name: varchar("name", { length: 100 }).notNull(),
      // 客户名
      wechatId: varchar("wechatId", { length: 100 }),
      // 微信号
      phone: varchar("phone", { length: 20 }),
      trafficSource: varchar("trafficSource", { length: 100 }),
      // 流量来源(花名)
      accountBalance: decimal("accountBalance", { precision: 10, scale: 2 }).default("0.00").notNull(),
      // 账户余额
      tags: text("tags"),
      // 客户标签(JSON数组存储)
      notes: text("notes"),
      createdBy: int("createdBy").notNull(),
      // 创建人(销售)
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      deletedAt: timestamp("deletedAt")
      // 软删除时间戳
    }, (table) => ({
      userIdx: index("user_idx").on(table.userId),
      wechatIdx: index("wechat_idx").on(table.wechatId),
      createdByIdx: index("created_by_idx").on(table.createdBy)
    }));
    orders = mysqlTable("orders", {
      id: int("id").autoincrement().primaryKey(),
      orderNo: varchar("orderNo", { length: 50 }).notNull().unique(),
      // 序号
      customerId: int("customerId"),
      // 关联客户(可选)
      customerName: varchar("customerName", { length: 100 }),
      // 客户姓名(手动输入)
      salespersonId: int("salespersonId"),
      // 关联销售人员表(可选)
      salesId: int("salesId").notNull(),
      // 销售人ID(用户ID,保留兼容)
      salesPerson: varchar("salesPerson", { length: 100 }),
      // 销售人(花名)
      trafficSource: varchar("trafficSource", { length: 100 }),
      // 流量来源(花名)
      // 金额相关
      paymentAmount: decimal("paymentAmount", { precision: 10, scale: 2 }).notNull(),
      // 支付金额
      courseAmount: decimal("courseAmount", { precision: 10, scale: 2 }).notNull(),
      // 课程金额
      accountBalance: decimal("accountBalance", { precision: 10, scale: 2 }).default("0.00").notNull(),
      // 账户余额
      // 支付信息
      paymentCity: varchar("paymentCity", { length: 50 }),
      // 支付城市
      paymentChannel: varchar("paymentChannel", { length: 50 }),
      // 支付渠道(富掌柜/微信/支付宝)
      channelOrderNo: text("channelOrderNo"),
      // 渠道订单号;商户订单号;退款单号
      paymentDate: date("paymentDate"),
      // 支付日期
      paymentTime: time("paymentTime"),
      // 支付时间
      // 费用明细
      teacherFee: decimal("teacherFee", { precision: 10, scale: 2 }).default("0.00"),
      // 老师费用
      transportFee: decimal("transportFee", { precision: 10, scale: 2 }).default("0.00"),
      // 车费
      partnerFee: decimal("partnerFee", { precision: 10, scale: 2 }).default("0.00"),
      // 合伙人费用
      consumablesFee: decimal("consumablesFee", { precision: 10, scale: 2 }).default("0.00"),
      // 耗材费用
      rentFee: decimal("rentFee", { precision: 10, scale: 2 }).default("0.00"),
      // 房租费用
      propertyFee: decimal("propertyFee", { precision: 10, scale: 2 }).default("0.00"),
      // 物业费用
      utilityFee: decimal("utilityFee", { precision: 10, scale: 2 }).default("0.00"),
      // 水电费用
      otherFee: decimal("otherFee", { precision: 10, scale: 2 }).default("0.00"),
      // 其他费用
      finalAmount: decimal("finalAmount", { precision: 10, scale: 2 }).default("0.00"),
      // 金串到账金额
      balanceAmount: decimal("balanceAmount", { precision: 10, scale: 2 }).default("0.00"),
      // 尾款金额
      // 交付信息
      deliveryCity: varchar("deliveryCity", { length: 50 }),
      // 交付城市
      deliveryRoom: varchar("deliveryRoom", { length: 100 }),
      // 交付教室(旧字段,保留兼容)
      deliveryClassroomId: int("deliveryClassroomId"),
      // 关联classrooms表
      deliveryTeacher: varchar("deliveryTeacher", { length: 100 }),
      // 交付老师
      deliveryCourse: varchar("deliveryCourse", { length: 200 }),
      // 交付课程
      classDate: date("classDate"),
      // 上课日期
      classTime: varchar("classTime", { length: 50 }),
      // 上课时间(支持时间范围如"14:00-16:00")
      orderType: varchar("orderType", { length: 20 }).default("course").notNull(),
      // 订单类型: course(课程订单), membership(会员订单)
      status: mysqlEnum("status", ["pending", "paid", "has_balance", "completed", "cancelled", "refunded"]).default("pending").notNull(),
      deliveryStatus: mysqlEnum("deliveryStatus", ["pending", "accepted", "delivered"]).default("pending").notNull(),
      // 交付状态：待接单/已接单/已交付
      acceptedAt: timestamp("acceptedAt"),
      // 接单时间
      acceptedBy: int("acceptedBy"),
      // 接单老师ID(关联users表)
      isVoided: boolean("isVoided").default(false).notNull(),
      // 是否作废
      notes: text("notes"),
      // 备注
      // 结构化备注字段
      noteTags: text("noteTags"),
      // 备注标签(JSON数组)
      discountInfo: text("discountInfo"),
      // 折扣信息(JSON对象)
      couponInfo: text("couponInfo"),
      // 优惠券信息(JSON对象)
      membershipInfo: text("membershipInfo"),
      // 会员信息(JSON对象)
      paymentStatus: varchar("paymentStatus", { length: 50 }),
      // 支付状态标签
      specialNotes: text("specialNotes"),
      // 特殊要求/备注
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      customerIdx: index("customer_idx").on(table.customerId),
      salesIdx: index("sales_idx").on(table.salesId),
      statusIdx: index("status_idx").on(table.status),
      paymentDateIdx: index("payment_date_idx").on(table.paymentDate),
      classDateIdx: index("class_date_idx").on(table.classDate)
    }));
    teachers = mysqlTable("teachers", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId"),
      // 关联users表(可选)
      name: varchar("name", { length: 100 }).notNull(),
      // 姓名
      phone: varchar("phone", { length: 20 }),
      // 电话号码
      status: varchar("status", { length: 20 }).default("\u6D3B\u8DC3").notNull(),
      // 活跃状态(活跃/不活跃)
      customerType: varchar("customerType", { length: 200 }),
      // 受众客户类型
      notes: text("notes"),
      // 备注
      category: varchar("category", { length: 50 }),
      // 分类(本部老师/合伙店老师)
      city: varchar("city", { length: 50 }),
      // 所在城市(合伙店老师使用)
      avatarUrl: varchar("avatarUrl", { length: 500 }),
      // 头像URL(S3存储)
      teacherAttribute: mysqlEnum("teacherAttribute", ["S", "M", "Switch"]),
      // 老师属性(S/M/Switch)
      // 保留原有字段以兼容
      nickname: varchar("nickname", { length: 50 }),
      // 花名
      email: varchar("email", { length: 320 }),
      wechat: varchar("wechat", { length: 100 }),
      hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }),
      // 课时费标准
      bankAccount: varchar("bankAccount", { length: 100 }),
      // 银行账号
      bankName: varchar("bankName", { length: 100 }),
      // 开户行
      aliases: text("aliases"),
      // 别名列表(JSON数组)
      contractEndDate: date("contractEndDate"),
      // 合同到期时间
      joinDate: date("joinDate"),
      // 入职时间
      isActive: boolean("isActive").default(true).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      phoneIdx: index("teacher_phone_idx").on(table.phone),
      cityIdx: index("teacher_city_idx").on(table.city),
      nameIdx: index("teacher_name_idx").on(table.name),
      userIdx: index("teacher_user_idx").on(table.userId)
    }));
    schedules = mysqlTable("schedules", {
      id: int("id").autoincrement().primaryKey(),
      orderId: int("orderId"),
      // 关联订单(可选)
      orderItemId: int("orderItemId"),
      // 关联订单项(可选,用于多节课拆分)
      // 客户信息
      customerId: int("customerId"),
      // 学员ID(可选)
      customerName: varchar("customerName", { length: 100 }),
      // 客户名(微信号)
      wechatId: varchar("wechatId", { length: 100 }),
      // 微信号
      // 销售信息
      salesName: varchar("salesName", { length: 100 }),
      // 销售人(花名)
      trafficSource: varchar("trafficSource", { length: 100 }),
      // 流量来源(花名)
      // 支付信息
      paymentAmount: decimal("paymentAmount", { precision: 10, scale: 2 }),
      // 支付金额
      courseAmount: decimal("courseAmount", { precision: 10, scale: 2 }),
      // 课程金额
      accountBalance: decimal("accountBalance", { precision: 10, scale: 2 }),
      // 账户余额
      paymentCity: varchar("paymentCity", { length: 50 }),
      // 支付城市
      channelOrderNo: varchar("channelOrderNo", { length: 100 }),
      // 城道订单号
      overflowOrderNo: varchar("overflowOrderNo", { length: 100 }),
      // 溢户订单号
      refundNo: varchar("refundNo", { length: 100 }),
      // 退款单号
      paymentDate: date("paymentDate"),
      // 支付日期
      paymentTime: varchar("paymentTime", { length: 20 }),
      // 支付时间
      // 费用信息
      teacherFee: decimal("teacherFee", { precision: 10, scale: 2 }),
      // 老师费用
      transportFee: decimal("transportFee", { precision: 10, scale: 2 }),
      // 车费
      otherFee: decimal("otherFee", { precision: 10, scale: 2 }),
      // 其他费用
      partnerFee: decimal("partnerFee", { precision: 10, scale: 2 }),
      // 合伙人费用
      receivedAmount: decimal("receivedAmount", { precision: 10, scale: 2 }),
      // 金串到账金额
      // 交付信息
      deliveryCity: varchar("deliveryCity", { length: 50 }),
      // 交付城市
      deliveryClassroom: varchar("deliveryClassroom", { length: 100 }),
      // 交付教室
      deliveryTeacher: varchar("deliveryTeacher", { length: 100 }),
      // 交付老师
      deliveryCourse: varchar("deliveryCourse", { length: 200 }),
      // 交付课程
      // 课程信息
      teacherId: int("teacherId"),
      // 授课老师ID
      classroomId: int("classroomId"),
      // 教室ID(关联classrooms表)
      teacherName: varchar("teacherName", { length: 100 }),
      // 授课老师名称(手动输入)
      courseType: varchar("courseType", { length: 200 }).notNull(),
      // 课程类型
      classDate: date("classDate"),
      // 上课日期
      classTime: varchar("classTime", { length: 20 }),
      // 上课时间
      startTime: timestamp("startTime").notNull(),
      endTime: timestamp("endTime").notNull(),
      city: varchar("city", { length: 50 }),
      // 城市
      location: varchar("location", { length: 200 }),
      // 教室/地点
      status: mysqlEnum("status", ["scheduled", "completed", "cancelled"]).default("scheduled").notNull(),
      notes: text("notes"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      teacherIdx: index("teacher_idx").on(table.teacherId),
      classroomIdx: index("classroom_idx").on(table.classroomId),
      customerIdx: index("schedule_customer_idx").on(table.customerId),
      startTimeIdx: index("start_time_idx").on(table.startTime),
      cityIdx: index("schedule_city_idx").on(table.city),
      salesIdx: index("sales_idx").on(table.salesName),
      paymentDateIdx: index("payment_date_idx").on(table.paymentDate)
    }));
    matchedScheduleOrders = mysqlTable("matchedScheduleOrders", {
      id: int("id").autoincrement().primaryKey(),
      scheduleId: int("scheduleId").notNull(),
      // 关联课程日程
      orderId: int("orderId").notNull(),
      // 关联订单
      matchMethod: mysqlEnum("matchMethod", ["llm_intelligent", "manual", "channel_order_no"]).notNull(),
      // 匹配方式
      confidence: decimal("confidence", { precision: 5, scale: 2 }),
      // 匹配置信度(0-100)
      matchDetails: text("matchDetails"),
      // 匹配详情(JSON格式,存储匹配依据)
      isVerified: boolean("isVerified").default(false).notNull(),
      // 是否已人工验证
      verifiedBy: int("verifiedBy"),
      // 验证人ID
      verifiedAt: timestamp("verifiedAt"),
      // 验证时间
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      scheduleIdx: index("schedule_idx").on(table.scheduleId),
      orderIdx: index("order_idx").on(table.orderId),
      uniqueMatch: unique("unique_schedule_order").on(table.scheduleId, table.orderId)
    }));
    teacherPayments = mysqlTable("teacherPayments", {
      id: int("id").autoincrement().primaryKey(),
      teacherId: int("teacherId").notNull(),
      orderId: int("orderId"),
      // 关联订单
      scheduleId: int("scheduleId"),
      // 关联排课(可选)
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      // 费用金额
      paymentMethod: mysqlEnum("paymentMethod", ["wechat", "alipay", "bank", "cash", "other"]),
      transactionNo: varchar("transactionNo", { length: 100 }),
      paymentTime: timestamp("paymentTime"),
      status: mysqlEnum("status", ["pending", "approved", "paid"]).default("pending").notNull(),
      // pending:待审批, approved:已审批, paid:已支付
      notes: text("notes"),
      recordedBy: int("recordedBy").notNull(),
      // 登记人(财务)
      approvedBy: int("approvedBy"),
      // 审批人(财务)
      approvedAt: timestamp("approvedAt"),
      // 审批时间
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      teacherIdx: index("teacher_payment_idx").on(table.teacherId),
      orderIdx: index("order_payment_idx").on(table.orderId),
      statusIdx: index("payment_status_idx").on(table.status)
    }));
    reconciliations = mysqlTable("reconciliations", {
      id: int("id").autoincrement().primaryKey(),
      periodStart: date("periodStart").notNull(),
      // 对账周期开始
      periodEnd: date("periodEnd").notNull(),
      // 对账周期结束
      totalIncome: decimal("totalIncome", { precision: 12, scale: 2 }).notNull(),
      // 总收入
      totalExpense: decimal("totalExpense", { precision: 12, scale: 2 }).notNull(),
      // 总支出(老师费用+车费+其他费用+合伙人费用)
      teacherFeeTotal: decimal("teacherFeeTotal", { precision: 12, scale: 2 }).default("0.00"),
      // 老师费用合计
      transportFeeTotal: decimal("transportFeeTotal", { precision: 12, scale: 2 }).default("0.00"),
      // 车费合计
      otherFeeTotal: decimal("otherFeeTotal", { precision: 12, scale: 2 }).default("0.00"),
      // 其他费用合计
      partnerFeeTotal: decimal("partnerFeeTotal", { precision: 12, scale: 2 }).default("0.00"),
      // 合伙人费用合计
      profit: decimal("profit", { precision: 12, scale: 2 }).notNull(),
      // 利润
      status: mysqlEnum("status", ["draft", "confirmed"]).default("draft").notNull(),
      notes: text("notes"),
      createdBy: int("createdBy").notNull(),
      // 创建人(财务)
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      periodIdx: index("period_idx").on(table.periodStart, table.periodEnd)
    }));
    gmailErrorFeedback = mysqlTable("gmail_error_feedback", {
      id: int("id").autoincrement().primaryKey(),
      importLogId: int("import_log_id").notNull(),
      // 关联的导入记录ID
      fieldName: varchar("field_name", { length: 100 }).notNull(),
      // 错误字段名
      wrongValue: text("wrong_value").notNull(),
      // 错误的值
      correctValue: text("correct_value").notNull(),
      // 正确的值
      feedbackType: varchar("feedback_type", { length: 20 }).notNull(),
      // 反馈类型: manual(手动标记), auto(自动学习)
      isLearned: boolean("is_learned").default(false),
      // 是否已学习应用
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    gmailImportConfig = mysqlTable("gmail_import_config", {
      id: int("id").primaryKey().autoincrement(),
      configKey: varchar("configKey", { length: 100 }).notNull().unique(),
      // 配置键
      configValue: json("configValue").notNull(),
      // 配置值(JSON)
      description: text("description"),
      // 配置说明
      createdAt: timestamp("createdAt").defaultNow(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow()
    });
    gmailImportLogs = mysqlTable("gmailImportLogs", (table) => ({
      id: int("id").autoincrement().primaryKey(),
      emailSubject: varchar("emailSubject", { length: 255 }).notNull(),
      // 邮件主题
      emailDate: timestamp("emailDate").notNull(),
      // 邮件日期
      threadId: varchar("threadId", { length: 100 }).notNull(),
      // Gmail线程ID
      totalOrders: int("totalOrders").notNull(),
      // 解析出的订单数
      successOrders: int("successOrders").notNull(),
      // 成功录入的订单数
      failedOrders: int("failedOrders").notNull(),
      // 失败的订单数
      status: mysqlEnum("status", ["success", "partial", "failed"]).notNull(),
      // 导入状态
      errorLog: text("errorLog"),
      // 错误日志
      emailContent: text("emailContent"),
      // 邮件内容(用于查看原始数据)
      parsedData: json("parsedData"),
      // 解析后的订单数据(JSON)
      warningFlags: json("warningFlags"),
      // 警告标记(JSON数组,如["missing_channel_order_no","invalid_amount"])
      importedBy: int("importedBy").notNull(),
      // 导入人(0表示系统自动)
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }), (table) => ({
      threadIdIdx: index("thread_id_idx").on(table.threadId),
      statusIdx: index("status_idx").on(table.status),
      createdAtIdx: index("created_at_idx").on(table.createdAt)
    }));
    importLogs = mysqlTable("importLogs", {
      id: int("id").autoincrement().primaryKey(),
      fileName: varchar("fileName", { length: 255 }).notNull(),
      fileType: varchar("fileType", { length: 20 }).notNull(),
      // csv, excel, xml, ics
      dataType: varchar("dataType", { length: 50 }).notNull(),
      // orders, schedules, etc.
      totalRows: int("totalRows").notNull(),
      successRows: int("successRows").notNull(),
      failedRows: int("failedRows").notNull(),
      errorLog: text("errorLog"),
      importedBy: int("importedBy").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    salespersons = mysqlTable("salespersons", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      // 关联用户表(必须)
      commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("0.00"),
      // 提成比例(%)
      orderCount: int("orderCount").default(0).notNull(),
      // 订单数量(统计字段)
      totalSales: decimal("totalSales", { precision: 12, scale: 2 }).default("0.00").notNull(),
      // 销售总额(统计字段)
      notes: text("notes"),
      // 业务备注
      isActive: boolean("isActive").default(true).notNull(),
      // 是否在职
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      userIdx: index("sales_user_idx").on(table.userId)
    }));
    accountTransactions = mysqlTable("accountTransactions", {
      id: int("id").autoincrement().primaryKey(),
      customerId: int("customerId").notNull(),
      // 客户ID
      customerName: varchar("customerName", { length: 100 }).notNull(),
      // 客户姓名(冗余字段,方便查询)
      type: mysqlEnum("type", ["recharge", "consume", "refund"]).notNull(),
      // 流水类型: 充值/消费/退款
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      // 金额(正数为增加,负数为减少)
      balanceBefore: decimal("balanceBefore", { precision: 10, scale: 2 }).notNull(),
      // 变动前余额
      balanceAfter: decimal("balanceAfter", { precision: 10, scale: 2 }).notNull(),
      // 变动后余额
      relatedOrderId: int("relatedOrderId"),
      // 关联订单ID(消费/退款时)
      relatedOrderNo: varchar("relatedOrderNo", { length: 50 }),
      // 关联订单号(冗余字段)
      notes: text("notes"),
      // 备注
      operatorId: int("operatorId").notNull(),
      // 操作人 ID
      operatorName: varchar("operatorName", { length: 100 }),
      // 操作人姓名(冗余字段)
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (table) => ({
      customerIdx: index("customer_idx").on(table.customerId),
      typeIdx: index("type_idx").on(table.type),
      orderIdx: index("order_idx").on(table.relatedOrderId),
      createdAtIdx: index("created_at_idx").on(table.createdAt)
    }));
    smartRegisterHistory = mysqlTable("smartRegisterHistory", {
      id: int("id").autoincrement().primaryKey(),
      template: mysqlEnum("template", ["wechat", "alipay", "custom"]).notNull(),
      // 数据源模板
      totalRows: int("totalRows").notNull(),
      // 总记录数
      successCount: int("successCount").notNull(),
      // 成功创建数量
      failCount: int("failCount").notNull(),
      // 失败数量
      operatorId: int("operatorId").notNull(),
      // 操作人 ID
      operatorName: varchar("operatorName", { length: 100 }),
      // 操作人姓名(冗余字段)
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (table) => ({
      operatorIdx: index("operator_idx").on(table.operatorId),
      createdAtIdx: index("created_at_idx").on(table.createdAt)
    }));
    gmailImportHistory = mysqlTable("gmailImportHistory", {
      id: int("id").autoincrement().primaryKey(),
      messageId: varchar("messageId", { length: 255 }).notNull().unique(),
      // Gmail Message-ID
      threadId: varchar("threadId", { length: 255 }).notNull(),
      // Gmail Thread-ID
      subject: text("subject"),
      // 邮件标题
      fromEmail: varchar("fromEmail", { length: 255 }),
      // 发件人邮箱
      orderId: int("orderId"),
      // 关联的订单ID
      importStatus: mysqlEnum("importStatus", ["success", "failed", "skipped"]).notNull(),
      // 导入状态
      errorMessage: text("errorMessage"),
      // 失败原因
      operatorId: int("operatorId").notNull(),
      // 操作人 ID
      operatorName: varchar("operatorName", { length: 100 }),
      // 操作人姓名
      importedAt: timestamp("importedAt").defaultNow().notNull()
      // 导入时间
    }, (table) => ({
      messageIdIdx: index("message_id_idx").on(table.messageId),
      threadIdIdx: index("thread_id_idx").on(table.threadId),
      importedAtIdx: index("imported_at_idx").on(table.importedAt),
      operatorIdx: index("operator_idx").on(table.operatorId)
    }));
    fieldMappings = mysqlTable("fieldMappings", {
      id: int("id").autoincrement().primaryKey(),
      type: mysqlEnum("type", ["salesperson_alias", "city_code", "teacher_alias", "course_alias"]).notNull(),
      // 映射类型
      sourceValue: varchar("sourceValue", { length: 100 }).notNull(),
      // 原始值(如"山竹"、"BJ")
      targetValue: varchar("targetValue", { length: 100 }).notNull(),
      // 目标值(如"王舒婷"、"北京")
      description: text("description"),
      // 说明
      isActive: boolean("isActive").default(true).notNull(),
      // 是否启用
      createdBy: int("createdBy").notNull(),
      // 创建人
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      typeIdx: index("type_idx").on(table.type),
      sourceIdx: index("source_idx").on(table.sourceValue)
    }));
    parsingCorrections = mysqlTable("parsingCorrections", {
      id: int("id").autoincrement().primaryKey(),
      originalText: text("originalText").notNull(),
      // 原始输入文本
      fieldName: varchar("fieldName", { length: 50 }).notNull(),
      // 被修正的字段名
      llmValue: text("llmValue"),
      // LLM解析的值
      correctedValue: text("correctedValue").notNull(),
      // 用户修正后的值
      correctionType: mysqlEnum("correctionType", ["field_missing", "field_wrong", "format_error", "logic_error", "manual_edit"]).notNull(),
      // 修正类型
      context: text("context"),
      // 上下文信息(JSON格式,包含其他字段的值)
      userId: int("userId").notNull(),
      // 修正人ID
      userName: varchar("userName", { length: 100 }),
      // 修正人姓名
      isLearned: boolean("isLearned").default(false).notNull(),
      // 是否已用于学习
      learnedAt: timestamp("learnedAt"),
      // 学习时间
      annotationType: mysqlEnum("annotationType", ["typical_error", "edge_case", "common_pattern", "none"]).default("none"),
      // 标注类型
      annotationNote: text("annotationNote"),
      // 标注备注
      annotatedBy: int("annotatedBy"),
      // 标注人 ID
      annotatedAt: timestamp("annotatedAt"),
      // 标注时间
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (table) => ({
      fieldIdx: index("field_idx").on(table.fieldName),
      userIdx: index("user_idx").on(table.userId),
      learnedIdx: index("learned_idx").on(table.isLearned),
      createdAtIdx: index("created_at_idx").on(table.createdAt)
    }));
    promptOptimizationHistory = mysqlTable("promptOptimizationHistory", {
      id: int("id").autoincrement().primaryKey(),
      version: varchar("version", { length: 50 }).notNull(),
      // 版本号(如"v1.0.1")
      optimizationType: mysqlEnum("optimizationType", ["add_example", "update_rule", "fix_error_pattern"]).notNull(),
      // 优化类型
      changeDescription: text("changeDescription").notNull(),
      // 变更描述
      newExamples: text("newExamples"),
      // 新增的示例(JSON数组)
      correctionCount: int("correctionCount").default(0).notNull(),
      // 基于多少条修正记录优化
      isActive: boolean("isActive").default(true).notNull(),
      // 是否启用
      createdBy: int("createdBy").notNull(),
      // 创建人(系统自动=0)
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (table) => ({
      versionIdx: index("version_idx").on(table.version),
      activeIdx: index("active_idx").on(table.isActive),
      createdAtIdx: index("created_at_idx").on(table.createdAt)
    }));
    parsingLearningConfig = mysqlTable("parsingLearningConfig", {
      id: int("id").autoincrement().primaryKey(),
      configKey: varchar("configKey", { length: 50 }).notNull().unique(),
      // 配置键(如"auto_optimize_threshold")
      configValue: text("configValue").notNull(),
      // 配置值(JSON格式)
      description: text("description"),
      // 配置说明
      updatedBy: int("updatedBy").notNull(),
      // 更新人ID
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    cityPartnerConfig = mysqlTable("cityPartnerConfig", {
      id: int("id").autoincrement().primaryKey(),
      city: varchar("city", { length: 50 }).notNull().unique(),
      // 城市名称
      areaCode: varchar("areaCode", { length: 10 }),
      // 电话区号
      partnerFeeRate: decimal("partnerFeeRate", { precision: 5, scale: 2 }),
      // 合伙人费比例(0-100) - 已迁移到合伙人表
      description: text("description"),
      // 说明
      isActive: boolean("isActive").default(true).notNull(),
      // 是否启用
      updatedBy: int("updatedBy").notNull(),
      // 更新人 ID
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (table) => ({
      cityIdx: index("city_idx").on(table.city),
      activeIdx: index("active_idx").on(table.isActive)
    }));
    partners = mysqlTable("partners", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      // 关联users表
      name: varchar("name", { length: 100 }).notNull(),
      // 合伙人姓名
      phone: varchar("phone", { length: 20 }),
      // 手机号(用于登录App)
      idCardNumber: varchar("idCardNumber", { length: 18 }),
      // 身份证号码
      idCardFrontUrl: text("idCardFrontUrl"),
      // 身份证正面照片URL
      idCardBackUrl: text("idCardBackUrl"),
      // 身份证反面照片URL
      // 合同信息
      profitRatio: decimal("profitRatio", { precision: 5, scale: 2 }).notNull(),
      // 分红比例(百分比)
      profitRule: text("profitRule"),
      // 分红规则描述
      brandFee: decimal("brandFee", { precision: 10, scale: 2 }).default("0.00"),
      // 品牌加盟费
      techServiceFee: decimal("techServiceFee", { precision: 10, scale: 2 }).default("0.00"),
      // 技术服务费
      deferredPaymentTotal: decimal("deferredPaymentTotal", { precision: 10, scale: 2 }).default("0.00"),
      // 后付款总金额
      deferredPaymentRule: text("deferredPaymentRule"),
      // 后付款扣款规则
      contractStartDate: date("contractStartDate"),
      // 合同起始日期
      contractEndDate: date("contractEndDate"),
      // 合同结束日期
      contractHistory: text("contractHistory"),
      // 合同修订历史(JSON数组存储)
      // 收款账户
      accountName: varchar("accountName", { length: 100 }),
      // 开户名
      bankName: varchar("bankName", { length: 200 }),
      // 开户行
      accountNumber: varchar("accountNumber", { length: 50 }),
      // 账号
      profitPaymentDay: int("profitPaymentDay").default(25),
      // 每月分红支付日(1-31)
      // 费用承担配置
      expenseCoverage: json("expenseCoverage").$type(),
      // 费用承担配置(JSON格式)
      isActive: boolean("isActive").default(true).notNull(),
      notes: text("notes"),
      createdBy: int("createdBy").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      userIdx: index("partner_user_idx").on(table.userId),
      phoneIdx: index("partner_phone_idx").on(table.phone)
    }));
    partnerExpenses = mysqlTable("partner_expenses", {
      id: int("id").autoincrement().primaryKey(),
      partnerId: int("partnerId").notNull(),
      // 关联partners表
      cityId: int("cityId").notNull(),
      // 关联cities表
      month: date("month").notNull(),
      // 月份(YYYY-MM-01格式)
      // 费用明细
      rentFee: decimal("rentFee", { precision: 10, scale: 2 }).default("0.00"),
      // 房租
      propertyFee: decimal("propertyFee", { precision: 10, scale: 2 }).default("0.00"),
      // 物业费
      utilityFee: decimal("utilityFee", { precision: 10, scale: 2 }).default("0.00"),
      // 水电费
      consumablesFee: decimal("consumablesFee", { precision: 10, scale: 2 }).default("0.00"),
      // 道具耗材
      cleaningFee: decimal("cleaningFee", { precision: 10, scale: 2 }).default("0.00"),
      // 保洁费
      phoneFee: decimal("phoneFee", { precision: 10, scale: 2 }).default("0.00"),
      // 话费
      expressFee: decimal("expressFee", { precision: 10, scale: 2 }).default("0.00"),
      // 快递费
      promotionFee: decimal("promotionFee", { precision: 10, scale: 2 }).default("0.00"),
      // 推广费
      otherFee: decimal("otherFee", { precision: 10, scale: 2 }).default("0.00"),
      // 其他费用
      teacherFee: decimal("teacherFee", { precision: 10, scale: 2 }).default("0.00"),
      // 老师费用(从订单汇总)
      transportFee: decimal("transportFee", { precision: 10, scale: 2 }).default("0.00"),
      // 车费(从订单汇总)
      totalFee: decimal("totalFee", { precision: 10, scale: 2 }).default("0.00"),
      // 总费用
      partnerShare: decimal("partnerShare", { precision: 10, scale: 2 }).default("0.00"),
      // 合伙人承担
      // 合同后付款
      deferredPayment: decimal("deferredPayment", { precision: 10, scale: 2 }).default("0.00"),
      // 本月后付款扣款
      deferredPaymentBalance: decimal("deferredPaymentBalance", { precision: 10, scale: 2 }).default("0.00"),
      // 后付款未结清余额
      // 分红相关
      revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0.00"),
      // 本月营收
      profit: decimal("profit", { precision: 10, scale: 2 }).default("0.00"),
      // 本月利润
      profitAmount: decimal("profitAmount", { precision: 10, scale: 2 }).default("0.00"),
      // 本月分红金额
      notes: text("notes"),
      createdBy: int("createdBy").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      partnerIdx: index("expense_partner_idx").on(table.partnerId),
      monthIdx: index("expense_month_idx").on(table.month),
      partnerMonthIdx: unique("unique_partner_month").on(table.partnerId, table.cityId, table.month)
    }));
    partnerProfitRecords = mysqlTable("partner_profit_records", {
      id: int("id").autoincrement().primaryKey(),
      partnerId: int("partnerId").notNull(),
      // 关联partners表
      expenseId: int("expenseId"),
      // 关联partner_expenses表(可选)
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      // 分红金额
      transferDate: date("transferDate").notNull(),
      // 转账日期
      transferMethod: mysqlEnum("transferMethod", ["wechat", "alipay", "bank", "cash", "other"]).default("bank").notNull(),
      // 转账方式
      transactionNo: varchar("transactionNo", { length: 100 }),
      // 交易流水号
      status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending").notNull(),
      // 状态
      notes: text("notes"),
      recordedBy: int("recordedBy").notNull(),
      // 登记人
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      partnerIdx: index("profit_partner_idx").on(table.partnerId),
      dateIdx: index("profit_date_idx").on(table.transferDate),
      statusIdx: index("profit_status_idx").on(table.status)
    }));
    partnerCities = mysqlTable("partner_cities", {
      id: int("id").autoincrement().primaryKey(),
      partnerId: int("partnerId").notNull(),
      // 关联partners表
      cityId: int("cityId").notNull(),
      // 关联cities表
      // 合同基本信息
      contractStatus: mysqlEnum("contractStatus", ["draft", "active", "expired", "terminated"]).default("draft").notNull(),
      // 合同状态
      contractStartDate: date("contractStartDate"),
      // 合同起始日期
      contractEndDate: date("contractEndDate"),
      // 合同结束日期
      contractSignDate: date("contractSignDate"),
      // 合同签署日期
      contractFileUrl: text("contractFileUrl"),
      // 合同文件URL（S3存储）
      // 股权结构（工商股权，用于法定权利）
      equityRatioPartner: decimal("equityRatioPartner", { precision: 5, scale: 2 }),
      // 合伙人工商股权比例（如60%）
      equityRatioBrand: decimal("equityRatioBrand", { precision: 5, scale: 2 }),
      // 品牌方工商股权比例（如40%）
      // 分红比例（阶段性，与工商股权独立）
      profitRatioStage1Partner: decimal("profitRatioStage1Partner", { precision: 5, scale: 2 }),
      // 第1阶段合伙人分红比例（0-12个月）
      profitRatioStage1Brand: decimal("profitRatioStage1Brand", { precision: 5, scale: 2 }),
      // 第1阶段品牌方分红比例
      profitRatioStage2APartner: decimal("profitRatioStage2APartner", { precision: 5, scale: 2 }),
      // 第2阶段A合伙人分红比例（13-24个月，未回本）
      profitRatioStage2ABrand: decimal("profitRatioStage2ABrand", { precision: 5, scale: 2 }),
      // 第2阶段A品牌方分红比例
      profitRatioStage2BPartner: decimal("profitRatioStage2BPartner", { precision: 5, scale: 2 }),
      // 第2阶段B合伙人分红比例（13-24个月，已回本）
      profitRatioStage2BBrand: decimal("profitRatioStage2BBrand", { precision: 5, scale: 2 }),
      // 第2阶段B品牌方分红比例
      profitRatioStage3Partner: decimal("profitRatioStage3Partner", { precision: 5, scale: 2 }),
      // 第3阶段合伙人分红比例（25个月后）
      profitRatioStage3Brand: decimal("profitRatioStage3Brand", { precision: 5, scale: 2 }),
      // 第3阶段品牌方分红比例
      currentProfitStage: int("currentProfitStage").default(1),
      // 当前所处分红阶段（1/2/3）
      isInvestmentRecovered: boolean("isInvestmentRecovered").default(false),
      // 前12个月是否已回本
      // 投资费用
      brandUsageFee: decimal("brandUsageFee", { precision: 10, scale: 2 }).default("0.00"),
      // 品牌使用费
      brandAuthDeposit: decimal("brandAuthDeposit", { precision: 10, scale: 2 }).default("0.00"),
      // 品牌授权押金
      managementFee: decimal("managementFee", { precision: 10, scale: 2 }).default("0.00"),
      // 管理费
      operationPositionFee: decimal("operationPositionFee", { precision: 10, scale: 2 }).default("0.00"),
      // 运营岗位费
      teacherRecruitmentFee: decimal("teacherRecruitmentFee", { precision: 10, scale: 2 }).default("0.00"),
      // 老师招聘及培训费
      marketingFee: decimal("marketingFee", { precision: 10, scale: 2 }).default("0.00"),
      // 营销推广费
      // 固定成本预估
      estimatedRentDeposit: decimal("estimatedRentDeposit", { precision: 10, scale: 2 }).default("0.00"),
      // 预估租金押金
      estimatedPropertyFee: decimal("estimatedPropertyFee", { precision: 10, scale: 2 }).default("0.00"),
      // 预估物业费
      estimatedUtilityFee: decimal("estimatedUtilityFee", { precision: 10, scale: 2 }).default("0.00"),
      // 预估水电费
      estimatedRegistrationFee: decimal("estimatedRegistrationFee", { precision: 10, scale: 2 }).default("0.00"),
      // 预估注册代理记账费
      estimatedRenovationFee: decimal("estimatedRenovationFee", { precision: 10, scale: 2 }).default("0.00"),
      // 预估装修及基础工具成本
      totalEstimatedCost: decimal("totalEstimatedCost", { precision: 10, scale: 2 }).default("0.00"),
      // 总预估成本
      // 收款账户信息
      partnerAccountHolder: varchar("partnerAccountHolder", { length: 100 }),
      // 收款人姓名
      partnerBankName: varchar("partnerBankName", { length: 200 }),
      // 开户行
      partnerBankAccount: varchar("partnerBankAccount", { length: 50 }),
      // 银行账号
      partnerWechatAccount: varchar("partnerWechatAccount", { length: 100 }),
      // 合伙人微信账号
      // 费用承担配置（城市级别）
      expenseCoverage: json("expenseCoverage").$type(),
      // 场地合同信息
      venueContractFileUrl: text("venueContractFileUrl"),
      // 场地合同文件URL（S3存储）
      venueRentAmount: decimal("venueRentAmount", { precision: 10, scale: 2 }),
      // 房租金额
      venueDeposit: decimal("venueDeposit", { precision: 10, scale: 2 }),
      // 押金
      venueLeaseStartDate: date("venueLeaseStartDate"),
      // 起租日期
      venueLeaseEndDate: date("venueLeaseEndDate"),
      // 到期日期
      venuePaymentCycle: mysqlEnum("venuePaymentCycle", ["monthly", "bimonthly", "quarterly", "semiannual", "annual"]),
      // 付款方式：月付、两月付、季付、半年付、年付
      // 运营信息
      legalRepresentative: varchar("legalRepresentative", { length: 100 }),
      // 法人代表
      supervisor: varchar("supervisor", { length: 100 }),
      // 监事
      financialOfficer: varchar("financialOfficer", { length: 100 }),
      // 财务
      phoneNumbers: text("phoneNumbers"),
      // 运营手机号（JSON数组）
      mediaAccounts: text("mediaAccounts"),
      // 新媒体账号（JSON数组）
      // 分红支付规则
      profitPaymentDay: int("profitPaymentDay").default(25),
      // 每月分红支付日
      profitPaymentRule: text("profitPaymentRule"),
      // 分红支付规则说明
      // 备注
      notes: text("notes"),
      createdBy: int("createdBy").notNull(),
      // 创建人
      updatedBy: int("updatedBy"),
      // 更新人
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      partnerIdx: index("partner_city_partner_idx").on(table.partnerId),
      cityIdx: index("partner_city_city_idx").on(table.cityId),
      uniquePartnerCity: index("unique_partner_city").on(table.partnerId, table.cityId),
      contractStatusIdx: index("contract_status_idx").on(table.contractStatus)
    }));
    auditLogs = mysqlTable("auditLogs", {
      id: int("id").autoincrement().primaryKey(),
      action: mysqlEnum("action", [
        "order_create",
        "order_update",
        "order_delete",
        "user_create",
        "user_role_update",
        "user_status_update",
        "user_delete",
        "data_import",
        "customer_create",
        "customer_update",
        "customer_delete",
        "teacher_create",
        "teacher_update",
        "teacher_delete",
        "schedule_create",
        "schedule_update",
        "schedule_delete"
      ]).notNull(),
      userId: int("userId").notNull(),
      userName: varchar("userName", { length: 100 }),
      userRole: varchar("userRole", { length: 20 }),
      targetType: varchar("targetType", { length: 50 }),
      targetId: int("targetId"),
      targetName: varchar("targetName", { length: 200 }),
      description: text("description").notNull(),
      changes: json("changes"),
      ipAddress: varchar("ipAddress", { length: 45 }),
      userAgent: text("userAgent"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (table) => ({
      actionIdx: index("action_idx").on(table.action),
      userIdx: index("user_idx").on(table.userId),
      targetIdx: index("target_idx").on(table.targetType),
      createdAtIdx: index("created_at_idx").on(table.createdAt)
    }));
    partnerFeeAuditLogs = mysqlTable("partnerFeeAuditLogs", {
      id: int("id").autoincrement().primaryKey(),
      operationType: varchar("operationType", { length: 50 }).notNull(),
      // 操作类型(如"batch_calculate_partner_fee")
      operationDescription: text("operationDescription").notNull(),
      // 操作描述
      operatorId: int("operatorId").notNull(),
      // 操作人ID
      operatorName: varchar("operatorName", { length: 100 }).notNull(),
      // 操作人姓名
      affectedCount: int("affectedCount").default(0).notNull(),
      // 影响的记录数
      details: json("details"),
      // 详细信息(JSON格式,包含受影响的订单ID列表等)
      status: mysqlEnum("status", ["success", "failed", "partial"]).default("success").notNull(),
      // 操作状态
      errorMessage: text("errorMessage"),
      // 错误信息(如果失败)
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (table) => ({
      operationTypeIdx: index("operation_type_idx").on(table.operationType),
      operatorIdx: index("operator_idx").on(table.operatorId),
      createdAtIdx: index("created_at_idx").on(table.createdAt)
    }));
    systemAccounts = mysqlTable("systemAccounts", {
      id: int("id").autoincrement().primaryKey(),
      username: varchar("username", { length: 100 }).notNull().unique(),
      // 用户名
      passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
      // 密码哈希值
      email: varchar("email", { length: 100 }),
      // 邮箱
      phone: varchar("phone", { length: 20 }),
      // 电话
      identity: mysqlEnum("identity", ["customer", "teacher", "sales", "finance", "admin", "store_partner"]).notNull(),
      // 身份类型
      relatedId: int("relatedId"),
      // 关联ID(客户ID/老师ID/销售人员ID等)
      relatedName: varchar("relatedName", { length: 100 }),
      // 关联名称(客户名/老师名/销售名等)
      isActive: boolean("isActive").default(true).notNull(),
      // 是否激活
      // 会员相关字段
      membershipStatus: mysqlEnum("membershipStatus", ["pending", "active", "expired"]).default("pending").notNull(),
      // 会员状态
      isMember: boolean("isMember").default(false).notNull(),
      // 是否是会员(兼容旧字段)
      membershipOrderId: int("membershipOrderId"),
      // 会员订单ID
      membershipActivatedAt: timestamp("membershipActivatedAt"),
      // 会员激活时间
      membershipExpiresAt: timestamp("membershipExpiresAt"),
      // 会员到期时间
      lastLoginAt: timestamp("lastLoginAt"),
      // 最后登录时间
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      // 创建时间
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      // 更新时间
      createdBy: int("createdBy"),
      // 创建人ID
      notes: text("notes")
      // 备注
    }, (table) => ({
      usernameIdx: index("username_idx").on(table.username),
      identityIdx: index("identity_idx").on(table.identity),
      relatedIdIdx: index("related_id_idx").on(table.relatedId),
      isActiveIdx: index("is_active_idx").on(table.isActive)
    }));
    accountAuditLogs = mysqlTable("accountAuditLogs", {
      id: int("id").autoincrement().primaryKey(),
      accountId: int("accountId").notNull(),
      // 账号ID
      operationType: mysqlEnum("operationType", ["create", "update", "delete", "login", "password_change", "activate", "deactivate"]).notNull(),
      // 操作类型
      operatorId: int("operatorId"),
      // 操作人ID
      operatorName: varchar("operatorName", { length: 100 }),
      // 操作人名称
      oldValue: json("oldValue"),
      // 修改前的值
      newValue: json("newValue"),
      // 修改后的值
      ipAddress: varchar("ipAddress", { length: 50 }),
      // IP地址
      userAgent: text("userAgent"),
      // 用户代理
      createdAt: timestamp("createdAt").defaultNow().notNull()
      // 创建时间
    }, (table) => ({
      accountIdIdx: index("account_id_idx").on(table.accountId),
      operationTypeIdx: index("operation_type_idx").on(table.operationType),
      createdAtIdx: index("created_at_idx").on(table.createdAt)
    }));
    accountPermissions = mysqlTable("accountPermissions", {
      id: int("id").autoincrement().primaryKey(),
      accountId: int("accountId").notNull(),
      // 系统账号ID
      permissionKey: varchar("permissionKey", { length: 100 }).notNull(),
      // 权限标识(菜单路径)
      permissionName: varchar("permissionName", { length: 100 }).notNull(),
      // 权限名称(菜单名)
      isGranted: boolean("isGranted").default(true).notNull(),
      // 是否授予该权限
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      accountIdIdx: index("account_id_permission_idx").on(table.accountId),
      permissionKeyIdx: index("permission_key_idx").on(table.permissionKey),
      uniqueAccountPermission: unique("unique_account_permission").on(table.accountId, table.permissionKey)
    }));
    courses = mysqlTable("courses", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      // 课程名称
      introduction: varchar("introduction", { length: 20 }),
      // 课程介绍(限制20字)
      description: text("description"),
      // 课程描述
      price: decimal("price", { precision: 10, scale: 2 }).notNull(),
      // 课程价格
      duration: decimal("duration", { precision: 10, scale: 2 }).notNull(),
      // 课程时长(小时)，支持最大值99999999.99
      level: mysqlEnum("level", ["\u5165\u95E8", "\u6DF1\u5EA6", "\u8BA2\u5236", "\u5267\u672C"]).notNull(),
      // 课程程度
      isActive: boolean("isActive").default(true).notNull(),
      // 是否启用
      isBookable: boolean("isBookable").default(true).notNull(),
      // 是否可预约(false表示不在前端App显示)
      alias: varchar("alias", { length: 100 }),
      // 课程别名(供前端App显示使用)
      isHot: tinyint("isHot").default(0).notNull(),
      // 是否热门: 0=不热门, 1=热门
      teacherFee: decimal("teacherFee", { precision: 10, scale: 2 }),
      // 老师费用(单节课老师所得费用)
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      nameIdx: index("name_idx").on(table.name),
      levelIdx: index("level_idx").on(table.level),
      isActiveIdx: index("is_active_idx").on(table.isActive)
    }));
    cities = mysqlTable("cities", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 50 }).notNull().unique(),
      // 城市名称
      areaCode: varchar("areaCode", { length: 10 }),
      // 电话区号
      isActive: boolean("isActive").default(true).notNull(),
      // 是否启用
      sortOrder: int("sortOrder").default(0),
      // 排序顺序
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      nameIdx: index("city_name_idx").on(table.name),
      activeIdx: index("city_active_idx").on(table.isActive)
    }));
    classrooms = mysqlTable("classrooms", {
      id: int("id").autoincrement().primaryKey(),
      cityId: int("cityId").notNull(),
      // 关联城市ID
      cityName: varchar("cityName", { length: 50 }).notNull(),
      // 城市名称(冗余字段,方便查询)
      name: varchar("name", { length: 100 }).notNull(),
      // 教室名称(如"404教室")
      address: text("address").notNull(),
      // 教室详细地址
      isActive: boolean("isActive").default(true).notNull(),
      // 是否启用
      sortOrder: int("sortOrder").default(0),
      // 排序顺序
      capacity: int("capacity").default(1).notNull(),
      // 教室容量(同时可容纳的课程数)
      notes: text("notes"),
      // 备注
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      cityIdIdx: index("classroom_city_idx").on(table.cityId),
      cityNameIdx: index("classroom_city_name_idx").on(table.cityName),
      activeIdx: index("classroom_active_idx").on(table.isActive)
    }));
    userNotifications = mysqlTable("user_notifications", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      // 提交留言的用户ID
      userName: varchar("userName", { length: 100 }),
      // 用户名称(冗余字段,方便查询)
      userPhone: varchar("userPhone", { length: 20 }),
      // 用户手机号(冗余字段)
      type: varchar("type", { length: 50 }).default("general").notNull(),
      // 留言类型: general(一般留言), complaint(投诉), suggestion(建议), consultation(咨询), application(申请)
      title: varchar("title", { length: 200 }),
      // 留言标题(可选)
      content: text("content").notNull(),
      // 留言内容
      status: varchar("status", { length: 20 }).default("unread").notNull(),
      // 状态: unread(未读), read(已读), replied(已回复), archived(已归档)
      adminReply: text("adminReply"),
      // 管理员回复内容
      repliedBy: int("repliedBy"),
      // 回复人ID
      repliedAt: timestamp("repliedAt"),
      // 回复时间
      readAt: timestamp("readAt"),
      // 已读时间
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      userIdx: index("notification_user_idx").on(table.userId),
      statusIdx: index("notification_status_idx").on(table.status),
      typeIdx: index("notification_type_idx").on(table.type),
      createdAtIdx: index("notification_created_at_idx").on(table.createdAt)
    }));
    salesCommissionConfigs = mysqlTable("sales_commission_configs", {
      id: int("id").autoincrement().primaryKey(),
      salespersonId: int("salespersonId").notNull(),
      // 关联销售人员表
      city: varchar("city", { length: 50 }).notNull(),
      // 城市名称
      commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).notNull(),
      // 提成比例(0-100%)
      notes: text("notes"),
      // 备注
      updatedBy: int("updatedBy").notNull(),
      // 更新人ID
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      salespersonIdx: index("commission_salesperson_idx").on(table.salespersonId),
      cityIdx: index("commission_city_idx").on(table.city),
      uniqueSalespersonCity: unique("unique_salesperson_city").on(table.salespersonId, table.city)
    }));
    cityMonthlyExpenses = mysqlTable("city_monthly_expenses", {
      id: int("id").autoincrement().primaryKey(),
      cityId: int("cityId").notNull(),
      // 关联城市ID
      cityName: varchar("cityName", { length: 50 }).notNull(),
      // 城市名称(冗余字段)
      month: varchar("month", { length: 7 }).notNull(),
      // 月份 (格式: YYYY-MM)
      // 10种费用类型
      rentFee: decimal("rentFee", { precision: 10, scale: 2 }).default("0.00"),
      // 房租
      propertyFee: decimal("propertyFee", { precision: 10, scale: 2 }).default("0.00"),
      // 物业费
      utilityFee: decimal("utilityFee", { precision: 10, scale: 2 }).default("0.00"),
      // 水电费
      consumablesFee: decimal("consumablesFee", { precision: 10, scale: 2 }).default("0.00"),
      // 道具耗材
      cleaningFee: decimal("cleaningFee", { precision: 10, scale: 2 }).default("0.00"),
      // 保洁费
      phoneFee: decimal("phoneFee", { precision: 10, scale: 2 }).default("0.00"),
      // 话费
      deferredPayment: decimal("deferredPayment", { precision: 10, scale: 2 }).default("0.00"),
      // 合同后付款
      expressFee: decimal("expressFee", { precision: 10, scale: 2 }).default("0.00"),
      // 快递费
      promotionFee: decimal("promotionFee", { precision: 10, scale: 2 }).default("0.00"),
      // 推广费
      otherFee: decimal("otherFee", { precision: 10, scale: 2 }).default("0.00"),
      // 其他费用
      teacherFee: decimal("teacherFee", { precision: 10, scale: 2 }).default("0.00"),
      // 老师费用（从订单汇总）
      transportFee: decimal("transportFee", { precision: 10, scale: 2 }).default("0.00"),
      // 车费（从订单汇总）
      totalExpense: decimal("totalExpense", { precision: 10, scale: 2 }).default("0.00"),
      // 总费用（自动计算）
      partnerShare: decimal("partnerShare", { precision: 10, scale: 2 }).default("0.00"),
      // 合伙人承担
      notes: text("notes"),
      // 备注
      uploadedBy: int("uploadedBy").notNull(),
      // 上传人ID
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      cityIdx: index("monthly_expense_city_idx").on(table.cityId),
      monthIdx: index("monthly_expense_month_idx").on(table.month),
      uniqueCityMonth: unique("unique_city_month").on(table.cityId, table.month)
    }));
    membershipConfig = mysqlTable("membershipConfig", {
      id: int("id").primaryKey().autoincrement(),
      configKey: varchar("configKey", { length: 50 }).notNull().unique(),
      // 配置键名，如 "validity_days"
      configValue: varchar("configValue", { length: 255 }).notNull(),
      // 配置值
      description: varchar("description", { length: 255 }),
      // 配置说明
      isActive: boolean("isActive").default(true).notNull(),
      // 是否启用
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    teacherUnavailability = mysqlTable("teacher_unavailability", {
      id: int("id").autoincrement().primaryKey(),
      teacherId: int("teacherId").notNull(),
      // 老师ID
      startTime: timestamp("startTime").notNull(),
      // 不接客开始时间
      endTime: timestamp("endTime").notNull(),
      // 不接客结束时间
      reason: varchar("reason", { length: 200 }),
      // 不接客原因
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      teacherIdx: index("unavail_teacher_idx").on(table.teacherId),
      timeIdx: index("unavail_time_idx").on(table.startTime, table.endTime)
    }));
    orderItems = mysqlTable("order_items", {
      id: int("id").autoincrement().primaryKey(),
      orderId: int("orderId").notNull(),
      // 订单ID
      courseId: int("courseId").notNull(),
      // 课程ID
      courseName: varchar("courseName", { length: 100 }).notNull(),
      // 课程名称(冗余字段,方便查询)
      quantity: int("quantity").default(1).notNull(),
      // 数量
      duration: decimal("duration", { precision: 4, scale: 2 }).notNull(),
      // 课程时长(小时)
      price: decimal("price", { precision: 10, scale: 2 }).notNull(),
      // 课程单价
      subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
      // 小计金额
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      orderIdx: index("order_item_order_idx").on(table.orderId),
      courseIdx: index("order_item_course_idx").on(table.courseId)
    }));
    membershipPlans = mysqlTable("membershipPlans", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      // 套餐名称
      description: text("description"),
      // 套餐描述
      duration: int("duration").notNull(),
      // 有效期（天数）
      price: decimal("price", { precision: 10, scale: 2 }).notNull(),
      // 价格（元）
      originalPrice: decimal("originalPrice", { precision: 10, scale: 2 }),
      // 原价（元）
      benefits: json("benefits"),
      // 会员权益列表（JSON数组）
      isActive: boolean("isActive").default(true).notNull(),
      // 是否启用
      sortOrder: int("sortOrder").default(0).notNull(),
      // 排序顺序
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      isActiveIdx: index("membership_plan_active_idx").on(table.isActive),
      sortOrderIdx: index("membership_plan_sort_idx").on(table.sortOrder)
    }));
    membershipOrders = mysqlTable("membershipOrders", {
      id: int("id").autoincrement().primaryKey(),
      orderNo: varchar("orderNo", { length: 50 }).notNull().unique(),
      // 订单号
      userId: int("userId").notNull(),
      // 用户ID（关联users表）
      planId: int("planId").notNull(),
      // 套餐ID
      planName: varchar("planName", { length: 100 }).notNull(),
      // 套餐名称（冗余）
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      // 支付金额
      status: mysqlEnum("status", ["pending", "paid", "cancelled", "refunded"]).default("pending").notNull(),
      // 订单状态
      paymentChannel: mysqlEnum("paymentChannel", ["wechat", "alipay", "balance"]),
      // 支付渠道
      channelOrderNo: varchar("channelOrderNo", { length: 100 }),
      // 支付渠道订单号
      paymentDate: timestamp("paymentDate"),
      // 支付时间
      activatedAt: timestamp("activatedAt"),
      // 激活时间
      expiresAt: timestamp("expiresAt"),
      // 到期时间
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      userIdIdx: index("membership_order_user_idx").on(table.userId),
      statusIdx: index("membership_order_status_idx").on(table.status),
      orderNoIdx: index("membership_order_no_idx").on(table.orderNo)
    }));
  }
});

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
    };
  }
});

// shared/timezone.ts
function formatDateBeijing(date2) {
  if (!date2) return "-";
  const d = typeof date2 === "string" ? new Date(date2) : date2;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("zh-CN", { timeZone: BEIJING_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-");
}
var BEIJING_TIMEZONE, BEIJING_OFFSET_HOURS, BEIJING_OFFSET_MS;
var init_timezone = __esm({
  "shared/timezone.ts"() {
    "use strict";
    BEIJING_TIMEZONE = "Asia/Shanghai";
    BEIJING_OFFSET_HOURS = 8;
    BEIJING_OFFSET_MS = BEIJING_OFFSET_HOURS * 60 * 60 * 1e3;
  }
});

// server/teacherFeeValidator.ts
var teacherFeeValidator_exports = {};
__export(teacherFeeValidator_exports, {
  batchValidateTeacherFees: () => batchValidateTeacherFees,
  validateTeacherFee: () => validateTeacherFee
});
function validateTeacherFee(teacherFee, courseAmount) {
  if (!teacherFee || teacherFee === 0) {
    return { isValid: true };
  }
  if ((!courseAmount || courseAmount === 0) && teacherFee > 0) {
    return {
      isValid: true,
      warning: "\u8BFE\u7A0B\u91D1\u989D\u4E3A0\u4F46\u8BBE\u7F6E\u4E86\u8001\u5E08\u8D39\u7528,\u8BF7\u786E\u8BA4\u662F\u5426\u4E3A\u7EBF\u4E0B\u6D3B\u52A8\u6216\u5185\u90E8\u57F9\u8BAD"
    };
  }
  if (teacherFee < 0) {
    return {
      isValid: false,
      error: "\u8001\u5E08\u8D39\u7528\u4E0D\u80FD\u4E3A\u8D1F\u6570"
    };
  }
  if (courseAmount !== null && courseAmount !== void 0 && courseAmount < 0) {
    return {
      isValid: false,
      error: "\u8BFE\u7A0B\u91D1\u989D\u4E0D\u80FD\u4E3A\u8D1F\u6570"
    };
  }
  if (courseAmount && courseAmount > 0 && teacherFee > courseAmount) {
    return {
      isValid: false,
      error: `\u8001\u5E08\u8D39\u7528(\uFFE5${teacherFee.toFixed(2)})\u4E0D\u80FD\u8D85\u8FC7\u8BFE\u7A0B\u91D1\u989D(\uFFE5${courseAmount.toFixed(2)})`
    };
  }
  if (courseAmount && courseAmount > 0 && teacherFee > courseAmount * 0.8) {
    return {
      isValid: true,
      warning: `\u8001\u5E08\u8D39\u7528(\uFFE5${teacherFee.toFixed(2)})\u5360\u8BFE\u7A0B\u91D1\u989D(\uFFE5${courseAmount.toFixed(2)})\u7684${(teacherFee / courseAmount * 100).toFixed(0)}%,\u6BD4\u4F8B\u8F83\u9AD8,\u8BF7\u786E\u8BA4\u662F\u5426\u6B63\u786E`
    };
  }
  return { isValid: true };
}
function batchValidateTeacherFees(orders2) {
  return orders2.map((order) => ({
    orderId: order.id,
    orderNo: order.orderNo,
    validation: validateTeacherFee(order.teacherFee, order.courseAmount)
  }));
}
var init_teacherFeeValidator = __esm({
  "server/teacherFeeValidator.ts"() {
    "use strict";
  }
});

// server/orderIdGenerator.ts
var orderIdGenerator_exports = {};
__export(orderIdGenerator_exports, {
  generateOrderId: () => generateOrderId,
  getCityAreaCode: () => getCityAreaCode,
  isValidOrderId: () => isValidOrderId,
  parseOrderId: () => parseOrderId
});
function getCityAreaCode(city) {
  if (!city) return "000";
  return CITY_AREA_CODE_MAP[city] || "000";
}
function generateRandomChars() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
function generateOrderId(city, date2, paymentMethod) {
  const now = date2 || /* @__PURE__ */ new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");
  const dateTime = `${year}${month}${day}${hour}${minute}${second}`;
  const random = generateRandomChars();
  const areaCode = getCityAreaCode(city);
  let paymentPrefix = "";
  if (paymentMethod) {
    if (paymentMethod.includes("\u652F\u4ED8\u5B9D")) {
      paymentPrefix = "pay";
    } else if (paymentMethod.includes("\u5BCC\u638C\u67DC") || paymentMethod.includes("\u5FAE\u4FE1")) {
      paymentPrefix = "we";
    } else if (paymentMethod.includes("\u73B0\u91D1")) {
      paymentPrefix = "xj";
    }
  }
  return `${paymentPrefix}ORD${dateTime}${random}${areaCode}`;
}
function isValidOrderId(orderId) {
  const pattern = /^ORD\d{14}[A-Z0-9]{3}\d{3}$/;
  return pattern.test(orderId);
}
function parseOrderId(orderId) {
  if (!isValidOrderId(orderId)) {
    return { valid: false };
  }
  const dateTime = orderId.substring(3, 17);
  const randomChars = orderId.substring(17, 20);
  const areaCode = orderId.substring(20, 23);
  const city = Object.keys(CITY_AREA_CODE_MAP).find(
    (key) => CITY_AREA_CODE_MAP[key] === areaCode
  );
  return {
    valid: true,
    dateTime,
    randomChars,
    areaCode,
    city
  };
}
var CITY_AREA_CODE_MAP;
var init_orderIdGenerator = __esm({
  "server/orderIdGenerator.ts"() {
    "use strict";
    CITY_AREA_CODE_MAP = {
      "\u4E0A\u6D77": "021",
      "\u5317\u4EAC": "010",
      "\u5929\u6D25": "022",
      "\u5E7F\u5DDE": "020",
      "\u6DF1\u5733": "755",
      // 0755取后3位
      "\u676D\u5DDE": "571",
      // 0571取后3位
      "\u5357\u4EAC": "025",
      "\u6B66\u6C49": "027",
      "\u6210\u90FD": "028",
      "\u897F\u5B89": "029",
      "\u91CD\u5E86": "023",
      "\u82CF\u5DDE": "512",
      // 0512取后3位
      "\u65E0\u9521": "510",
      // 0510取后3位
      "\u5B81\u6CE2": "574",
      // 0574取后3位
      "\u9752\u5C9B": "532",
      // 0532取后3位
      "\u5927\u8FDE": "411",
      // 0411取后3位
      "\u6C88\u9633": "024",
      "\u957F\u6C99": "731",
      // 0731取后3位
      "\u90D1\u5DDE": "371",
      // 0371取后3位
      "\u6D4E\u5357": "531",
      // 0531取后3位
      "\u798F\u5DDE": "591",
      // 0591取后3位
      "\u53A6\u95E8": "592",
      // 0592取后3位
      "\u6606\u660E": "871",
      // 0871取后3位
      "\u5408\u80A5": "551",
      // 0551取后3位
      "\u5357\u660C": "791",
      // 0791取后3位
      "\u77F3\u5BB6\u5E84": "311",
      // 0311取后3位
      "\u54C8\u5C14\u6EE8": "451",
      // 0451取后3位
      "\u957F\u6625": "431",
      // 0431取后3位
      "\u592A\u539F": "351",
      // 0351取后3位
      "\u5170\u5DDE": "931",
      // 0931取后3位
      "\u94F6\u5DDD": "951",
      // 0951取后3位
      "\u897F\u5B81": "971",
      // 0971取后3位
      "\u4E4C\u9C81\u6728\u9F50": "991",
      // 0991取后3位
      "\u62C9\u8428": "891",
      // 0891取后3位
      "\u547C\u548C\u6D69\u7279": "471",
      // 0471取后3位
      "\u5357\u5B81": "771",
      // 0771取后3位
      "\u8D35\u9633": "851",
      // 0851取后3位
      "\u6D77\u53E3": "898",
      // 0898取后3位
      "\u4E09\u4E9A": "899"
      // 0899取后3位
    };
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  archiveNotification: () => archiveNotification,
  assignPartnerCities: () => assignPartnerCities,
  autoLinkCustomerToUser: () => autoLinkCustomerToUser,
  batchCreateTeachers: () => batchCreateTeachers,
  batchDeleteOrders: () => batchDeleteOrders,
  batchDeleteTeachers: () => batchDeleteTeachers,
  batchFixTransportFee: () => batchFixTransportFee,
  batchImportCustomers: () => batchImportCustomers,
  batchImportSalespersons: () => batchImportSalespersons,
  batchMarkNotificationsRead: () => batchMarkNotificationsRead,
  batchUpdateOrderNumbers: () => batchUpdateOrderNumbers,
  batchUpdateOrderStatus: () => batchUpdateOrderStatus,
  batchUpdateTeacherStatus: () => batchUpdateTeacherStatus,
  calculatePartnerFee: () => calculatePartnerFee,
  cancelSchedule: () => cancelSchedule,
  checkChannelOrderNoExists: () => checkChannelOrderNoExists,
  checkMessageIdExists: () => checkMessageIdExists,
  checkOrderDataQuality: () => checkOrderDataQuality,
  checkOrderNoExists: () => checkOrderNoExists,
  checkTeacherTimeConflict: () => checkTeacherTimeConflict,
  checkThreadIdExists: () => checkThreadIdExists,
  consumeCustomerAccount: () => consumeCustomerAccount,
  createAccountTransaction: () => createAccountTransaction,
  createAuditLog: () => createAuditLog,
  createCity: () => createCity,
  createCityConfig: () => createCityConfig,
  createClassroom: () => createClassroom,
  createCourse: () => createCourse,
  createCustomer: () => createCustomer,
  createGmailImportHistory: () => createGmailImportHistory,
  createGmailImportLog: () => createGmailImportLog,
  createImportLog: () => createImportLog,
  createOrder: () => createOrder,
  createReconciliation: () => createReconciliation,
  createSalesperson: () => createSalesperson,
  createSchedule: () => createSchedule,
  createSmartRegisterHistory: () => createSmartRegisterHistory,
  createTeacher: () => createTeacher,
  createTeacherPayment: () => createTeacherPayment,
  createUser: () => createUser,
  createUserNotification: () => createUserNotification,
  deleteAllGmailImportLogs: () => deleteAllGmailImportLogs,
  deleteCity: () => deleteCity,
  deleteCityConfig: () => deleteCityConfig,
  deleteClassroom: () => deleteClassroom,
  deleteCourse: () => deleteCourse,
  deleteCustomer: () => deleteCustomer,
  deleteCustomersWithTeacherNames: () => deleteCustomersWithTeacherNames,
  deleteGmailImportConfig: () => deleteGmailImportConfig,
  deleteGmailImportHistory: () => deleteGmailImportHistory,
  deleteGmailImportLog: () => deleteGmailImportLog,
  deleteOrder: () => deleteOrder,
  deleteOrderByChannelOrderNo: () => deleteOrderByChannelOrderNo,
  deleteSalesperson: () => deleteSalesperson,
  deleteSchedule: () => deleteSchedule,
  deleteUserNotification: () => deleteUserNotification,
  deleteUserRoleCities: () => deleteUserRoleCities,
  detectTransportFeeIssues: () => detectTransportFeeIssues,
  getAllAuditLogs: () => getAllAuditLogs,
  getAllCities: () => getAllCities,
  getAllCitiesWithStats: () => getAllCitiesWithStats,
  getAllCityPartnerConfig: () => getAllCityPartnerConfig,
  getAllCityPartnerConfigs: () => getAllCityPartnerConfigs,
  getAllClassrooms: () => getAllClassrooms,
  getAllCourses: () => getAllCourses,
  getAllCustomers: () => getAllCustomers,
  getAllGmailImportConfigs: () => getAllGmailImportConfigs,
  getAllGmailImportHistory: () => getAllGmailImportHistory,
  getAllGmailImportLogs: () => getAllGmailImportLogs,
  getAllOrders: () => getAllOrders,
  getAllReconciliations: () => getAllReconciliations,
  getAllSalespersons: () => getAllSalespersons,
  getAllTeacherNames: () => getAllTeacherNames,
  getAllTeachers: () => getAllTeachers,
  getAllTeachersForParser: () => getAllTeachersForParser,
  getAllTeachersStats: () => getAllTeachersStats,
  getAllUsers: () => getAllUsers,
  getAuditLogStats: () => getAuditLogStats,
  getAuditLogsByDateRange: () => getAuditLogsByDateRange,
  getAuditLogsByOperator: () => getAuditLogsByOperator,
  getAuditLogsByType: () => getAuditLogsByType,
  getChurnRiskCustomers: () => getChurnRiskCustomers,
  getCityById: () => getCityById,
  getCityFinancialStats: () => getCityFinancialStats,
  getCityMonthlyTrends: () => getCityMonthlyTrends,
  getCityPartnerConfigByCity: () => getCityPartnerConfigByCity,
  getCityRevenue: () => getCityRevenue,
  getCityRevenueTrend: () => getCityRevenueTrend,
  getClassroomById: () => getClassroomById,
  getClassroomsByCityId: () => getClassroomsByCityId,
  getClassroomsByCityName: () => getClassroomsByCityName,
  getCourseById: () => getCourseById,
  getCustomerBalanceRanking: () => getCustomerBalanceRanking,
  getCustomerById: () => getCustomerById,
  getCustomerByPhone: () => getCustomerByPhone,
  getCustomerByUserId: () => getCustomerByUserId,
  getCustomerStats: () => getCustomerStats,
  getCustomerTransactions: () => getCustomerTransactions,
  getDb: () => getDb,
  getGmailImportConfig: () => getGmailImportConfig,
  getGmailImportHistoryByDateRange: () => getGmailImportHistoryByDateRange,
  getGmailImportHistoryStats: () => getGmailImportHistoryStats,
  getGmailImportLogById: () => getGmailImportLogById,
  getGmailImportLogsByDateRange: () => getGmailImportLogsByDateRange,
  getGmailImportStats: () => getGmailImportStats,
  getImportLogs: () => getImportLogs,
  getInactiveCustomers: () => getInactiveCustomers,
  getMonthlySales: () => getMonthlySales,
  getOrCreateCustomerForUser: () => getOrCreateCustomerForUser,
  getOrderByChannelOrderNo: () => getOrderByChannelOrderNo,
  getOrderById: () => getOrderById,
  getOrderStatsByDateRange: () => getOrderStatsByDateRange,
  getOrdersByCustomerName: () => getOrdersByCustomerName,
  getOrdersByDateRange: () => getOrdersByDateRange,
  getOrdersByIds: () => getOrdersByIds,
  getOrdersByPaymentChannel: () => getOrdersByPaymentChannel,
  getOrdersBySales: () => getOrdersBySales,
  getOrdersBySalesPerson: () => getOrdersBySalesPerson,
  getOrdersByTeacher: () => getOrdersByTeacher,
  getPartnerCities: () => getPartnerCities,
  getPartnerCityOrderStats: () => getPartnerCityOrderStats,
  getPartnerExpenses: () => getPartnerExpenses,
  getReconciliationReport: () => getReconciliationReport,
  getSalesPerformance: () => getSalesPerformance,
  getSalesPersonPaymentStats: () => getSalesPersonPaymentStats,
  getSalesStatistics: () => getSalesStatistics,
  getSalespersonById: () => getSalespersonById,
  getScheduleById: () => getScheduleById,
  getSchedulesByDateRange: () => getSchedulesByDateRange,
  getSchedulesByTeacher: () => getSchedulesByTeacher,
  getSchedulesByUserId: () => getSchedulesByUserId,
  getSchedulesWithOrderInfo: () => getSchedulesWithOrderInfo,
  getSmartRegisterHistory: () => getSmartRegisterHistory,
  getTeacherById: () => getTeacherById,
  getTeacherMonthlyStats: () => getTeacherMonthlyStats,
  getTeacherOrders: () => getTeacherOrders,
  getTeacherPaymentsByTeacher: () => getTeacherPaymentsByTeacher,
  getTeacherPendingOrders: () => getTeacherPendingOrders,
  getTeacherStats: () => getTeacherStats,
  getTrafficSourceAnalysis: () => getTrafficSourceAnalysis,
  getTrafficSourceMonthlyStats: () => getTrafficSourceMonthlyStats,
  getTrafficSourceStats: () => getTrafficSourceStats,
  getUnconfiguredCities: () => getUnconfiguredCities,
  getUniqueCities: () => getUniqueCities,
  getUniqueClassrooms: () => getUniqueClassrooms,
  getUniqueCourseAmounts: () => getUniqueCourseAmounts,
  getUniqueCourses: () => getUniqueCourses,
  getUniqueTeacherCategories: () => getUniqueTeacherCategories,
  getUniqueTeacherNames: () => getUniqueTeacherNames,
  getUnreadNotificationCount: () => getUnreadNotificationCount,
  getUserById: () => getUserById,
  getUserByOpenId: () => getUserByOpenId,
  getUserNotificationById: () => getUserNotificationById,
  getUserRoleCities: () => getUserRoleCities,
  getUserRoleCitiesByRole: () => getUserRoleCitiesByRole,
  getYearlySales: () => getYearlySales,
  importCustomersFromOrders: () => importCustomersFromOrders,
  isTeacherName: () => isTeacherName,
  listMyNotifications: () => listMyNotifications,
  listUserNotifications: () => listUserNotifications,
  markNotificationRead: () => markNotificationRead,
  rechargeCustomerAccount: () => rechargeCustomerAccount,
  refreshCustomerStats: () => refreshCustomerStats,
  refundCustomerAccount: () => refundCustomerAccount,
  replyNotification: () => replyNotification,
  searchCustomers: () => searchCustomers,
  searchOrdersByChannelOrderNo: () => searchOrdersByChannelOrderNo,
  searchSalespersons: () => searchSalespersons,
  setUserRoleCities: () => setUserRoleCities,
  syncAreaCodeFromCitiesToConfig: () => syncAreaCodeFromCitiesToConfig,
  syncAreaCodeFromConfigToCities: () => syncAreaCodeFromConfigToCities,
  toggleClassroomActive: () => toggleClassroomActive,
  toggleCourseActive: () => toggleCourseActive,
  updateAllSalespersonStats: () => updateAllSalespersonStats,
  updateCity: () => updateCity,
  updateCityPartnerConfig: () => updateCityPartnerConfig,
  updateClassroom: () => updateClassroom,
  updateCourse: () => updateCourse,
  updateOrder: () => updateOrder,
  updateOrderDeliveryStatus: () => updateOrderDeliveryStatus,
  updateOrderNo: () => updateOrderNo,
  updateOrderStatus: () => updateOrderStatus,
  updateReconciliation: () => updateReconciliation,
  updateSalesperson: () => updateSalesperson,
  updateSalespersonStats: () => updateSalespersonStats,
  updateSalespersonStatus: () => updateSalespersonStatus,
  updateTeacher: () => updateTeacher,
  updateTeacherPaymentStatus: () => updateTeacherPaymentStatus,
  updateTeacherStatus: () => updateTeacherStatus,
  updateUser: () => updateUser,
  updateUserRole: () => updateUserRole,
  updateUserRoles: () => updateUserRoles,
  updateUserStatus: () => updateUserStatus,
  upsertGmailImportConfig: () => upsertGmailImportConfig,
  upsertPartnerExpense: () => upsertPartnerExpense,
  upsertUser: () => upsertUser
});
import { eq, and, gte, lte, desc, asc, sql, isNotNull, isNull, ne, like, or, inArray, count, not } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        timezone: "+08:00"
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "nickname", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
      values.roles = user.role;
      updateSet.roles = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
      values.roles = "admin";
      updateSet.roles = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function autoLinkCustomerToUser(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot auto-link customer: database not available");
    return;
  }
  try {
    const user = await getUserByOpenId(openId);
    if (!user) {
      console.warn(`[Database] User not found for openId: ${openId}`);
      return;
    }
    const existingCustomer = await getCustomerByUserId(user.id);
    if (existingCustomer) {
      console.log(`[Database] Customer already linked for user ${user.id}`);
      return;
    }
    if (user.phone) {
      const customerByPhone = await getCustomerByPhone(user.phone);
      if (customerByPhone && !customerByPhone.userId) {
        await db.update(customers).set({ userId: user.id }).where(eq(customers.id, customerByPhone.id));
        console.log(`[Database] Linked existing customer ${customerByPhone.id} to user ${user.id} by phone`);
        return;
      }
    }
    const customerName = user.name || user.nickname || user.phone || `\u7528\u6237${user.id}`;
    await createCustomer({
      userId: user.id,
      name: customerName,
      phone: user.phone || void 0,
      trafficSource: "App\u6CE8\u518C",
      createdBy: user.id
    });
    console.log(`[Database] Created new customer for user ${user.id}`);
  } catch (error) {
    console.error("[Database] Failed to auto-link customer:", error);
  }
}
async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
  const usersWithCity = await Promise.all(
    allUsers.map(async (user) => {
      if (user.roles && user.roles.includes("teacher")) {
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
async function updateUserRole(userId, role) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const currentUser = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  const oldRole = currentUser[0]?.role;
  await db.update(users).set({ role }).where(eq(users.id, userId));
  if (oldRole === "sales" && role !== "sales") {
    await db.update(salespersons).set({ isActive: false }).where(eq(salespersons.userId, userId));
  } else if (oldRole !== "sales" && role === "sales") {
    const existing = await db.select().from(salespersons).where(eq(salespersons.userId, userId)).limit(1);
    if (existing.length > 0) {
      await db.update(salespersons).set({ isActive: true }).where(eq(salespersons.userId, userId));
    } else {
      await db.insert(salespersons).values({
        userId
        // commissionRate, orderCount, totalSales, isActive 都有默认值，不需要显式指定
      });
    }
  }
}
async function getUserRoleCities(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userRoleCities).where(eq(userRoleCities.userId, userId));
}
async function getUserRoleCitiesByRole(userId, role) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(userRoleCities).where(and(eq(userRoleCities.userId, userId), eq(userRoleCities.role, role)));
  if (result.length === 0) return [];
  try {
    return JSON.parse(result[0].cities);
  } catch {
    return [];
  }
}
async function setUserRoleCities(userId, role, cities3) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const citiesJson = JSON.stringify(cities3);
  const existing = await db.select().from(userRoleCities).where(and(eq(userRoleCities.userId, userId), eq(userRoleCities.role, role)));
  if (existing.length > 0) {
    await db.update(userRoleCities).set({ cities: citiesJson }).where(and(eq(userRoleCities.userId, userId), eq(userRoleCities.role, role)));
  } else {
    await db.insert(userRoleCities).values({
      userId,
      role,
      cities: citiesJson
    });
  }
}
async function deleteUserRoleCities(userId, role) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(userRoleCities).where(and(eq(userRoleCities.userId, userId), eq(userRoleCities.role, role)));
}
async function updateUserRoles(userId, roles) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const currentUser = await db.select({ roles: users.roles }).from(users).where(eq(users.id, userId)).limit(1);
  const oldRoles = currentUser[0]?.roles ? currentUser[0].roles.split(",") : [];
  const rolesStr = roles.length > 0 ? roles.join(",") : "user";
  const primaryRole = roles.includes("admin") ? "admin" : roles.includes("sales") ? "sales" : roles.includes("finance") ? "finance" : "user";
  await db.update(users).set({ roles: rolesStr, role: primaryRole }).where(eq(users.id, userId));
  const hadCityPartner = oldRoles.includes("cityPartner");
  const hasCityPartner = roles.includes("cityPartner");
  if (hadCityPartner && !hasCityPartner) {
    await db.update(partners).set({ isActive: false }).where(eq(partners.userId, userId));
  } else if (!hadCityPartner && hasCityPartner) {
    await db.update(partners).set({ isActive: true }).where(eq(partners.userId, userId));
  }
  const hadTeacher = oldRoles.includes("teacher");
  const hasTeacher = roles.includes("teacher");
  if (hadTeacher && !hasTeacher) {
    await db.update(teachers).set({ isActive: false }).where(eq(teachers.userId, userId));
  } else if (!hadTeacher && hasTeacher) {
    const existingTeacher = await db.select().from(teachers).where(eq(teachers.userId, userId)).limit(1);
    if (existingTeacher.length > 0) {
      await db.update(teachers).set({ isActive: true }).where(eq(teachers.userId, userId));
    } else {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length > 0) {
        const userName = user[0].name || user[0].nickname || user[0].email || `User_${userId}`;
        const teacherData = {
          userId,
          name: userName,
          isActive: true
        };
        if (user[0].phone) {
          teacherData.phone = user[0].phone;
        }
        await db.insert(teachers).values(teacherData);
      }
    }
  }
  const hadSales = oldRoles.includes("sales");
  const hasSales = roles.includes("sales");
  if (hadSales && !hasSales) {
    await db.update(salespersons).set({ isActive: false }).where(eq(salespersons.userId, userId));
  } else if (!hadSales && hasSales) {
    const existingSales = await db.select().from(salespersons).where(eq(salespersons.userId, userId)).limit(1);
    if (existingSales.length > 0) {
      await db.update(salespersons).set({ isActive: true }).where(eq(salespersons.userId, userId));
    } else {
      await db.insert(salespersons).values({
        userId
        // commissionRate, orderCount, totalSales, isActive 都有默认值，不需要显式指定
      });
    }
  }
}
async function updateUserStatus(userId, isActive) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ isActive }).where(eq(users.id, userId));
}
async function createUser(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values(data);
  return result[0].insertId;
}
async function updateUser(userId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, userId));
}
async function createCustomer(customer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(customer);
  return result[0].insertId;
}
async function getCustomerById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0] || null;
}
async function getAllCustomers() {
  const db = await getDb();
  if (!db) return [];
  const customersData = await db.select({
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
    membershipExpiresAt: users.membershipExpiresAt
  }).from(customers).leftJoin(users, eq(customers.userId, users.id)).where(isNull(customers.deletedAt)).orderBy(desc(customers.createdAt));
  return customersData.map((customer) => ({
    ...customer,
    totalSpent: "0.00",
    lastOrderDate: null,
    firstOrderDate: null,
    accountBalance: customer.accountBalance || "0.00",
    classCount: 0,
    // 如果没有关联users表,会员状态默认为pending
    membershipStatus: customer.membershipStatus || "pending",
    membershipOrderId: customer.membershipOrderId || null,
    membershipActivatedAt: customer.membershipActivatedAt || null,
    membershipExpiresAt: customer.membershipExpiresAt || null
  }));
}
async function searchCustomers(keyword) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customers).where(
    sql`${customers.name} LIKE ${`%${keyword}%`} OR ${customers.wechatId} LIKE ${`%${keyword}%`} OR ${customers.phone} LIKE ${`%${keyword}%`}`
  ).orderBy(desc(customers.createdAt));
}
async function getCustomerByUserId(userId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(eq(customers.userId, userId)).limit(1);
  return result[0] || null;
}
async function getCustomerByPhone(phone) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
  return result[0] || null;
}
async function getOrCreateCustomerForUser(user) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existingByUserId = await getCustomerByUserId(user.id);
  if (existingByUserId) {
    return {
      customerId: existingByUserId.id,
      customerName: existingByUserId.name,
      isNew: false
    };
  }
  if (user.phone) {
    const existingByPhone = await getCustomerByPhone(user.phone);
    if (existingByPhone) {
      await db.update(customers).set({ userId: user.id }).where(eq(customers.id, existingByPhone.id));
      return {
        customerId: existingByPhone.id,
        customerName: existingByPhone.name,
        isNew: false
      };
    }
  }
  const customerName = user.name || user.nickname || user.phone || `\u7528\u6237${user.id}`;
  const customerId = await createCustomer({
    userId: user.id,
    name: customerName,
    phone: user.phone || void 0,
    trafficSource: "App\u6CE8\u518C",
    createdBy: user.id
  });
  return {
    customerId,
    customerName,
    isNew: true
  };
}
async function deleteCustomer(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.transaction(async (tx) => {
    const [customer] = await tx.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!customer) {
      throw new Error(`Customer ${id} not found`);
    }
    await tx.update(customers).set({ deletedAt: /* @__PURE__ */ new Date() }).where(eq(customers.id, id));
    console.log(`[deleteCustomer] Customer ${id} (${customer.name}) deleted successfully`);
    if (customer.userId) {
      console.log(`[deleteCustomer] Customer was linked to user ${customer.userId}`);
    }
  });
}
async function checkOrderNoExists(orderNo) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(orders).where(eq(orders.orderNo, orderNo)).limit(1);
  return result.length > 0;
}
async function createOrder(order) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (order.channelOrderNo && order.channelOrderNo.trim() !== "") {
    const exists = await checkChannelOrderNoExists(order.channelOrderNo);
    if (exists) {
      const existingOrder = await getOrderByChannelOrderNo(order.channelOrderNo);
      throw new Error(
        `\u6E20\u9053\u8BA2\u5355\u53F7\u5DF2\u5B58\u5728: ${order.channelOrderNo}
\u5173\u8054\u8BA2\u5355: ${existingOrder?.orderNo || "\u672A\u77E5"} (\u5BA2\u6237: ${existingOrder?.customerName || "\u672A\u77E5"})`
      );
    }
  }
  const result = await db.insert(orders).values(order);
  return { id: result[0].insertId, ...order };
}
async function getOrderById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0] || null;
}
async function getTeacherOrders(teacherId, deliveryStatus) {
  const db = await getDb();
  if (!db) return [];
  const teacher = await db.select().from(users).where(eq(users.id, teacherId)).limit(1);
  if (!teacher || teacher.length === 0) return [];
  const teacherName = teacher[0].name || teacher[0].nickname;
  if (!teacherName) return [];
  if (deliveryStatus) {
    return db.select().from(orders).where(and(
      eq(orders.deliveryTeacher, teacherName),
      eq(orders.deliveryStatus, deliveryStatus)
    )).orderBy(orders.classDate);
  }
  return db.select().from(orders).where(eq(orders.deliveryTeacher, teacherName)).orderBy(orders.classDate);
}
async function getOrdersByIds(ids) {
  const db = await getDb();
  if (!db || ids.length === 0) return [];
  return db.select().from(orders).where(sql`${orders.id} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);
}
async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}
async function getOrdersBySales(salesId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.salesId, salesId)).orderBy(desc(orders.createdAt));
}
async function getOrdersByCustomerName(customerName) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.customerName, customerName)).orderBy(desc(orders.createdAt));
}
async function getOrdersBySalesPerson(salesPerson) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.salesPerson, salesPerson)).orderBy(desc(orders.createdAt));
}
async function getOrdersByDateRange(startDate, endDate) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(
    sql`${orders.paymentDate} >= ${startDate} AND ${orders.paymentDate} <= ${endDate}`
  ).orderBy(desc(orders.paymentDate));
}
async function updateOrder(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.teacherFee !== void 0 || data.courseAmount !== void 0) {
    const existingOrder = await getOrderById(id);
    if (!existingOrder) throw new Error("\u8BA2\u5355\u4E0D\u5B58\u5728");
    const teacherFee = data.teacherFee !== void 0 ? parseFloat(data.teacherFee) : parseFloat(existingOrder.teacherFee || "0");
    const courseAmount = data.courseAmount !== void 0 ? parseFloat(data.courseAmount) : parseFloat(existingOrder.courseAmount || "0");
    const { validateTeacherFee: validateTeacherFee2 } = await Promise.resolve().then(() => (init_teacherFeeValidator(), teacherFeeValidator_exports));
    const validation = validateTeacherFee2(teacherFee, courseAmount);
    if (!validation.isValid) {
      throw new Error(validation.error || "\u8001\u5E08\u8D39\u7528\u9A8C\u8BC1\u5931\u8D25");
    }
  }
  await db.update(orders).set(data).where(eq(orders.id, id));
  const updated = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return updated[0];
}
async function updateOrderStatus(id, status) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({ status }).where(eq(orders.id, id));
  return { success: true, message: "\u8BA2\u5355\u72B6\u6001\u66F4\u65B0\u6210\u529F" };
}
async function updateOrderDeliveryStatus(id, deliveryStatus, userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData = { deliveryStatus };
  if (deliveryStatus === "accepted" && userId) {
    updateData.acceptedBy = userId;
    updateData.acceptedAt = /* @__PURE__ */ new Date();
  }
  if (deliveryStatus === "pending") {
    updateData.acceptedBy = null;
    updateData.acceptedAt = null;
  }
  await db.update(orders).set(updateData).where(eq(orders.id, id));
  return { success: true, message: "\u8BA2\u5355\u4EA4\u4ED8\u72B6\u6001\u66F4\u65B0\u6210\u529F" };
}
async function getTeacherPendingOrders(teacherName, city) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(orders).where(
    and(
      eq(orders.status, "paid"),
      // 已支付
      eq(orders.deliveryStatus, "pending")
      // 未交付
    )
  );
  if (teacherName) {
    query = db.select().from(orders).where(
      and(
        eq(orders.status, "paid"),
        eq(orders.deliveryStatus, "pending"),
        eq(orders.deliveryTeacher, teacherName)
      )
    );
  }
  if (city) {
    query = db.select().from(orders).where(
      and(
        eq(orders.status, "paid"),
        eq(orders.deliveryStatus, "pending"),
        teacherName ? eq(orders.deliveryTeacher, teacherName) : void 0,
        eq(orders.deliveryCity, city)
      )
    );
  }
  const result = await query;
  return result;
}
async function updateOrderNo(id, orderNo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({ orderNo }).where(eq(orders.id, id));
}
async function deleteOrder(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.delete(orders).where(eq(orders.id, id));
  } catch (error) {
    console.error("[DB] deleteOrder failed:", { id, error });
    throw new Error(`Failed to delete order ${id}: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function deleteOrderByChannelOrderNo(channelOrderNo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const order = await getOrderByChannelOrderNo(channelOrderNo);
  if (!order) {
    return null;
  }
  await db.delete(orders).where(eq(orders.channelOrderNo, channelOrderNo));
  return order;
}
async function getCityFinancialStats(dateRange, customStartDate, customEndDate) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(orders);
  if (customStartDate && customEndDate) {
    query = query.where(
      sql`${orders.classDate} >= ${customStartDate} AND ${orders.classDate} <= ${customEndDate}`
    );
  } else if (dateRange) {
    const now = /* @__PURE__ */ new Date();
    let startDate;
    let endDate = now;
    switch (dateRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case "thisWeek": {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        startDate = weekStart;
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case "thisMonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case "thisQuarter": {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        endDate = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0, 23, 59, 59);
        break;
      }
      case "thisYear":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      default:
        startDate = /* @__PURE__ */ new Date(0);
    }
    const startDateStr = formatDateBeijing(startDate);
    const endDateStr = formatDateBeijing(endDate);
    query = query.where(
      sql`${orders.classDate} >= ${startDateStr} AND ${orders.classDate} <= ${endDateStr}`
    );
  }
  const allOrders = await query;
  const cityStats = {};
  allOrders.forEach((order) => {
    const city = order.deliveryCity || "\u672A\u77E5\u57CE\u5E02";
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
        profitMargin: 0
      };
    }
    const revenue = parseFloat(order.paymentAmount || "0");
    const teacherFee = parseFloat(order.teacherFee || "0");
    const transportFee = parseFloat(order.transportFee || "0");
    cityStats[city].orderCount += 1;
    cityStats[city].totalRevenue += revenue;
    cityStats[city].teacherFee += teacherFee;
    cityStats[city].transportFee += transportFee;
  });
  const partnerExpensesData = await db.select({
    expense: partnerExpenses,
    cityName: cities.name
  }).from(partnerExpenses).leftJoin(cities, eq(partnerExpenses.cityId, cities.id));
  partnerExpensesData.forEach(({ expense, cityName }) => {
    const city = cityName || "\u672A\u77E5\u57CE\u5E02";
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
        profitMargin: 0
      };
    }
    cityStats[city].rentFee += parseFloat(expense.rentFee || "0");
    cityStats[city].propertyFee += parseFloat(expense.propertyFee || "0");
    cityStats[city].utilityFee += parseFloat(expense.utilityFee || "0");
    cityStats[city].consumablesFee += parseFloat(expense.consumablesFee || "0");
    cityStats[city].cleaningFee += parseFloat(expense.cleaningFee || "0");
    cityStats[city].phoneFee += parseFloat(expense.phoneFee || "0");
    cityStats[city].expressFee += parseFloat(expense.expressFee || "0");
    cityStats[city].promotionFee += parseFloat(expense.promotionFee || "0");
    cityStats[city].otherFee += parseFloat(expense.otherFee || "0");
    cityStats[city].partnerShare += parseFloat(expense.partnerShare || "0");
    cityStats[city].deferredPayment += parseFloat(expense.deferredPayment || "0");
  });
  Object.values(cityStats).forEach((stat) => {
    stat.totalExpense = stat.teacherFee + stat.transportFee + stat.rentFee + stat.propertyFee + stat.utilityFee + stat.consumablesFee + stat.cleaningFee + stat.phoneFee + stat.expressFee + stat.promotionFee + stat.otherFee;
    stat.profit = stat.totalRevenue - stat.totalExpense + stat.partnerShare + stat.deferredPayment;
    stat.profitMargin = stat.totalRevenue > 0 ? stat.profit / stat.totalRevenue * 100 : 0;
  });
  return Object.values(cityStats).sort((a, b) => b.totalRevenue - a.totalRevenue);
}
async function createTeacher(teacher) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(teachers).values(teacher);
  return result[0].insertId;
}
async function getTeacherById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(teachers).where(eq(teachers.id, id)).limit(1);
  return result[0] || null;
}
async function getAllTeachers() {
  const db = await getDb();
  if (!db) return [];
  const DEFAULT_AVATAR_URL = "/avatars/default-teacher-avatar.png";
  const results = await db.select({
    id: users.id,
    name: users.name,
    nickname: users.nickname,
    phone: users.phone,
    customerType: users.customerType,
    isActive: sql`1`,
    // users表没有isActive字段，默认为1
    avatarUrl: users.avatarUrl,
    teacherAttribute: users.teacherAttribute,
    status: users.teacherStatus,
    // 添加teacherStatus字段，映射为status
    teacherNotes: users.teacherNotes,
    // users表的teacherNotes（多角色用户）
    hourlyRate: users.hourlyRate
    // 课时费标准
  }).from(users).where(
    and(
      like(users.roles, "%teacher%"),
      isNull(users.deletedAt)
      // 过滤已删除记录
    )
  ).orderBy(desc(users.createdAt));
  const teacherIds = results.map((r) => r.id);
  const teacherNotesData = teacherIds.length > 0 ? await db.select({
    userId: teachers.userId,
    notes: sql`MAX(${teachers.notes})`.as("notes")
    // 使用MAX聚合函数符合ONLY_FULL_GROUP_BY模式
  }).from(teachers).where(inArray(teachers.userId, teacherIds)).groupBy(teachers.userId) : [];
  const teacherNotesMap = new Map(teacherNotesData.map((t2) => [t2.userId, t2.notes]));
  if (teacherIds.length === 0) return [];
  const roleCitiesData = await db.select().from(userRoleCities).where(
    and(
      inArray(userRoleCities.userId, teacherIds),
      eq(userRoleCities.role, "teacher")
    )
  );
  const userCitiesMap = /* @__PURE__ */ new Map();
  roleCitiesData.forEach((rc) => {
    try {
      const citiesArray = JSON.parse(rc.cities);
      userCitiesMap.set(rc.userId, Array.isArray(citiesArray) ? citiesArray.join(";") : rc.cities);
    } catch {
      userCitiesMap.set(rc.userId, rc.cities);
    }
  });
  return results.map((teacher) => ({
    ...teacher,
    avatarUrl: teacher.avatarUrl || DEFAULT_AVATAR_URL,
    city: userCitiesMap.get(teacher.id) || null,
    notes: teacher.teacherNotes || teacherNotesMap.get(teacher.id) || null,
    // 合并notes字段：优先使用users.teacherNotes（Excel导入写入此处），兜底使用旧teachers.notes
    teacherNotes: void 0
    // 移除teacherNotes字段，避免混淆
  }));
}
async function getAllTeachersForParser() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teachers).where(eq(teachers.isActive, true)).orderBy(desc(teachers.createdAt));
}
async function updateTeacher(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData = { ...data };
  if (data.aliases !== void 0) {
    if (data.aliases && data.aliases.trim() !== "") {
      const aliasesArray = data.aliases.split(",").map((a) => a.trim()).filter((a) => a !== "");
      updateData.aliases = JSON.stringify(aliasesArray);
    } else {
      updateData.aliases = null;
    }
  }
  if (data.hourlyRate !== void 0) {
    const hourlyRateValue = data.hourlyRate && data.hourlyRate.trim() !== "" ? data.hourlyRate : null;
    await db.update(users).set({ hourlyRate: hourlyRateValue }).where(eq(users.id, id));
    delete updateData.hourlyRate;
  }
  const teachersUpdateData = { ...updateData };
  delete teachersUpdateData.hourlyRate;
  const teachersFields = ["category", "customerType", "notes", "contractEndDate", "joinDate", "aliases", "avatarUrl", "teacherAttribute"];
  const hasTeachersUpdate = teachersFields.some((f) => teachersUpdateData[f] !== void 0);
  if (hasTeachersUpdate) {
    const teacherRecord = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.userId, id)).limit(1);
    if (teacherRecord.length > 0) {
      await db.update(teachers).set(teachersUpdateData).where(eq(teachers.id, teacherRecord[0].id));
    }
  }
}
async function batchDeleteTeachers(ids) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  console.log("[batchDeleteTeachers] \u5F00\u59CB\u5220\u9664\u8001\u5E08: ids=", ids);
  await db.update(users).set({ deletedAt: /* @__PURE__ */ new Date() }).where(inArray(users.id, ids));
  console.log("[batchDeleteTeachers] \u5220\u9664\u6210\u529F: count=", ids.length);
}
async function updateTeacherStatus(id, status) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ teacherStatus: status }).where(eq(users.id, id));
  console.log(`[\u66F4\u65B0\u8001\u5E08\u72B6\u6001] userId=${id}, status=${status}`);
}
async function batchUpdateTeacherStatus(ids, status) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ teacherStatus: status }).where(inArray(users.id, ids));
  console.log(`[\u6279\u91CF\u66F4\u65B0\u8001\u5E08\u72B6\u6001] count=${ids.length}, status=${status}`);
}
async function batchCreateTeachers(teacherList) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = [];
  const stats = { created: 0, updated: 0, skipped: 0 };
  const notFoundErrors = [];
  for (const teacher of teacherList) {
    if (!teacher.id) {
      notFoundErrors.push(`\u7F3A\u5C11ID\u5B57\u6BB5\uFF0C\u5DF2\u8DF3\u8FC7`);
      stats.skipped++;
      continue;
    }
    const existingUser = await db.select().from(users).where(eq(users.id, teacher.id)).limit(1);
    if (!existingUser || existingUser.length === 0) {
      notFoundErrors.push(`ID=${teacher.id}\uFF1A\u627E\u4E0D\u5230\u5BF9\u5E94\u7528\u6237\u8D26\u53F7\uFF0C\u8BF7\u5148\u5728\u300C\u7528\u6237\u7BA1\u7406\u300D\u4E2D\u65B0\u5EFA\u8BE5ID\u7684\u8D26\u53F7\u5E76\u5206\u914D\u8001\u5E08\u89D2\u8272\uFF0C\u518D\u91CD\u65B0\u5BFC\u5165`);
      stats.skipped++;
      continue;
    }
    const updateData = { updatedAt: /* @__PURE__ */ new Date() };
    if (teacher.nickname !== void 0) updateData.nickname = teacher.nickname;
    if (teacher.phone !== void 0) updateData.phone = teacher.phone;
    if (teacher.email !== void 0) updateData.email = teacher.email;
    if (teacher.wechat !== void 0) updateData.wechat = teacher.wechat;
    if (teacher.isActive !== void 0) updateData.isActive = teacher.isActive;
    if (teacher.teacherAttribute !== void 0) updateData.teacherAttribute = teacher.teacherAttribute;
    if (teacher.customerType !== void 0) updateData.customerType = teacher.customerType;
    if (teacher.category !== void 0) updateData.category = teacher.category;
    if (teacher.hourlyRate !== void 0) updateData.hourlyRate = teacher.hourlyRate;
    if (teacher.bankAccount !== void 0) updateData.bankAccount = teacher.bankAccount;
    if (teacher.bankName !== void 0) updateData.bankName = teacher.bankName;
    if (teacher.contractEndDate !== void 0) updateData.contractEndDate = teacher.contractEndDate;
    if (teacher.joinDate !== void 0) updateData.joinDate = teacher.joinDate;
    if (teacher.aliases !== void 0) updateData.aliases = teacher.aliases;
    if (teacher.notes !== void 0) updateData.teacherNotes = teacher.notes;
    await db.update(users).set(updateData).where(eq(users.id, teacher.id));
    stats.updated++;
    results.push({ id: teacher.id, userId: teacher.id });
  }
  return { results, stats, notFoundErrors };
}
async function getAllTeacherNames() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ name: teachers.name, aliases: teachers.aliases }).from(teachers).where(eq(teachers.isActive, true));
  const allNames = [];
  result.forEach((r) => {
    allNames.push(r.name);
    if (r.aliases) {
      try {
        const aliases = JSON.parse(r.aliases);
        if (Array.isArray(aliases)) {
          allNames.push(...aliases);
        }
      } catch (e) {
      }
    }
  });
  return allNames;
}
async function isTeacherName(name) {
  if (!name || name.trim() === "") return false;
  const teacherNames = await getAllTeacherNames();
  return teacherNames.includes(name.trim());
}
async function getTeacherStats(teacherId, startDate, endDate) {
  const db = await getDb();
  if (!db) return null;
  const teacher = await db.select().from(teachers).where(eq(teachers.id, teacherId)).limit(1);
  if (!teacher || teacher.length === 0) {
    return {
      classCount: 0,
      totalHours: 0,
      totalIncome: 0
    };
  }
  const teacherName = teacher[0].name;
  const orderConditions = [];
  orderConditions.push(eq(orders.deliveryTeacher, teacherName));
  orderConditions.push(ne(orders.status, "cancelled"));
  if (startDate && endDate) {
    orderConditions.push(gte(orders.classDate, startDate));
    orderConditions.push(lte(orders.classDate, endDate));
  }
  const orderStats = await db.select({
    count: sql`COUNT(*)`,
    totalIncome: sql`COALESCE(SUM(${orders.teacherFee}), 0)`
  }).from(orders).where(and(...orderConditions));
  const orderRecords = await db.select({
    classTime: orders.classTime
  }).from(orders).where(and(...orderConditions));
  let totalHours = 0;
  for (const record of orderRecords) {
    if (record.classTime) {
      const hours = parseClassTimeToHours(record.classTime);
      totalHours += hours;
    }
  }
  return {
    classCount: Number(orderStats[0]?.count) || 0,
    totalHours,
    totalIncome: Number(orderStats[0]?.totalIncome) || 0
  };
}
function parseClassTimeToHours(classTime) {
  try {
    const timeRange = classTime.replace(/[~～]/g, "-").replace(/\./g, ":");
    const match = timeRange.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!match) return 0;
    const startHour = parseInt(match[1]);
    const startMinute = parseInt(match[2]);
    const endHour = parseInt(match[3]);
    const endMinute = parseInt(match[4]);
    let startTotalMinutes = startHour * 60 + startMinute;
    let endTotalMinutes = endHour * 60 + endMinute;
    if (endTotalMinutes < startTotalMinutes) {
      endTotalMinutes += 1440;
    }
    const durationMinutes = endTotalMinutes - startTotalMinutes;
    return durationMinutes / 60;
  } catch (error) {
    console.error("[parseClassTimeToHours] Error parsing classTime:", classTime, error);
    return 0;
  }
}
async function getAllTeachersStats(startDate, endDate) {
  const db = await getDb();
  if (!db) return [];
  const allTeachers = await getAllTeachers();
  const stats = await Promise.all(
    allTeachers.map(async (teacher) => {
      const teacherStats = await getTeacherStats(teacher.id, startDate, endDate);
      return {
        teacherId: teacher.id,
        teacherName: teacher.name,
        ...teacherStats
      };
    })
  );
  return stats;
}
async function createSchedule(schedule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(schedules).values(schedule);
  return result[0].insertId;
}
async function getScheduleById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
  return result[0] || null;
}
async function getSchedulesByDateRange(startTime, endTime) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schedules).where(and(gte(schedules.startTime, startTime), lte(schedules.startTime, endTime))).orderBy(schedules.startTime);
}
async function getSchedulesByTeacher(teacherId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schedules).where(eq(schedules.teacherId, teacherId)).orderBy(desc(schedules.startTime));
}
async function getSchedulesWithOrderInfo() {
  const db = await getDb();
  if (!db) return [];
  const allSchedules = await db.select().from(schedules).orderBy(desc(schedules.startTime));
  const schedulesWithOrders = await Promise.all(
    allSchedules.map(async (schedule) => {
      let matchedOrder = null;
      if (schedule.channelOrderNo) {
        const orderResult = await db.select().from(orders).where(eq(orders.channelOrderNo, schedule.channelOrderNo)).limit(1);
        matchedOrder = orderResult[0] || null;
      }
      return {
        ...schedule,
        matchedOrder
      };
    })
  );
  return schedulesWithOrders;
}
async function deleteSchedule(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(schedules).where(eq(schedules.id, id));
}
async function getSchedulesByUserId(userId, filters) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select({
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
    createdAt: schedules.createdAt
  }).from(schedules).where(eq(schedules.customerId, userId));
  const conditions = [eq(schedules.customerId, userId)];
  if (filters?.status) {
    conditions.push(eq(schedules.status, filters.status));
  }
  if (filters?.startDate) {
    conditions.push(gte(schedules.startTime, new Date(filters.startDate)));
  }
  if (filters?.endDate) {
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);
    conditions.push(lte(schedules.startTime, endDate));
  }
  if (conditions.length > 1) {
    query = db.select({
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
      createdAt: schedules.createdAt
    }).from(schedules).where(and(...conditions));
  }
  return query.orderBy(desc(schedules.startTime));
}
async function cancelSchedule(scheduleId, userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const schedule = await db.select().from(schedules).where(and(eq(schedules.id, scheduleId), eq(schedules.customerId, userId))).limit(1);
  if (!schedule || schedule.length === 0) {
    throw new Error("\u9884\u7EA6\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u53D6\u6D88");
  }
  if (schedule[0].status === "cancelled") {
    throw new Error("\u9884\u7EA6\u5DF2\u53D6\u6D88");
  }
  if (schedule[0].status === "completed") {
    throw new Error("\u5DF2\u5B8C\u6210\u7684\u9884\u7EA6\u65E0\u6CD5\u53D6\u6D88");
  }
  const now = /* @__PURE__ */ new Date();
  const startTime = new Date(schedule[0].startTime);
  const hoursDiff = (startTime.getTime() - now.getTime()) / (1e3 * 60 * 60);
  if (hoursDiff < 24) {
    throw new Error("\u9884\u7EA6\u5F00\u59CB\u524D24\u5C0F\u65F6\u5185\u65E0\u6CD5\u53D6\u6D88");
  }
  await db.update(schedules).set({
    status: "cancelled",
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(schedules.id, scheduleId));
  return true;
}
async function checkTeacherTimeConflict(teacherId, startTime, endTime, excludeScheduleId) {
  const db = await getDb();
  if (!db) return false;
  let query = db.select().from(schedules).where(
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
  if (excludeScheduleId) {
    return conflicts.filter((s) => s.id !== excludeScheduleId).length > 0;
  }
  return conflicts.length > 0;
}
async function createTeacherPayment(payment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(teacherPayments).values(payment);
  return result[0].insertId;
}
async function getTeacherPaymentsByTeacher(teacherId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teacherPayments).where(eq(teacherPayments.teacherId, teacherId)).orderBy(desc(teacherPayments.createdAt));
}
async function updateTeacherPaymentStatus(id, status, paymentTime) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const data = { status };
  if (paymentTime) data.paymentTime = paymentTime;
  await db.update(teacherPayments).set(data).where(eq(teacherPayments.id, id));
}
async function createReconciliation(reconciliation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reconciliations).values(reconciliation);
  return result[0].insertId;
}
async function getAllReconciliations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reconciliations).orderBy(desc(reconciliations.periodStart));
}
async function updateReconciliation(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reconciliations).set(data).where(eq(reconciliations.id, id));
}
async function getOrderStatsByDateRange(startDate, endDate) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    totalOrders: sql`COUNT(*)`,
    totalPaymentAmount: sql`SUM(${orders.paymentAmount})`,
    totalTeacherFee: sql`SUM(${orders.teacherFee})`,
    totalTransportFee: sql`SUM(${orders.transportFee})`,
    totalOtherFee: sql`SUM(${orders.otherFee})`,
    totalPartnerFee: sql`SUM(${orders.partnerFee})`,
    totalFinalAmount: sql`SUM(${orders.finalAmount})`,
    // 净利润 = 销售额 - 老师费用 - 车费 - 其他费用 - 合伙人费用
    netProfit: sql`SUM(${orders.paymentAmount}) - SUM(${orders.teacherFee}) - SUM(${orders.transportFee}) - SUM(${orders.otherFee}) - SUM(${orders.partnerFee})`
  }).from(orders).where(
    sql`${orders.classDate} >= ${startDate} AND ${orders.classDate} <= ${endDate}`
  );
  return result[0];
}
async function getSalesPerformance(startDate, endDate) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    salesId: orders.salesId,
    totalOrders: sql`COUNT(*)`,
    totalAmount: sql`SUM(${orders.paymentAmount})`
  }).from(orders).where(
    sql`${orders.paymentDate} >= ${startDate} AND ${orders.paymentDate} <= ${endDate}`
  ).groupBy(orders.salesId);
}
async function getCityRevenue() {
  const db = await getDb();
  if (!db) return [];
  const allOrders = await db.select({
    paymentCity: orders.paymentCity,
    paymentAmount: orders.paymentAmount,
    teacherFee: orders.teacherFee
  }).from(orders).where(sql`${orders.status} != 'cancelled'`);
  const cityRevenueMap = /* @__PURE__ */ new Map();
  for (const order of allOrders) {
    const city = order.paymentCity || "\u672A\u77E5\u57CE\u5E02";
    const paymentAmount = parseFloat(order.paymentAmount?.toString() || "0");
    const teacherFee = parseFloat(order.teacherFee?.toString() || "0");
    const baseRevenue = paymentAmount - teacherFee;
    let ratio = 0.3;
    if (city === "\u5929\u6D25") {
      ratio = 0.5;
    } else if (city === "\u6B66\u6C49") {
      ratio = 0.4;
    } else if (city === "\u4E0A\u6D77") {
      ratio = 1;
    }
    const revenue = baseRevenue * ratio;
    if (!cityRevenueMap.has(city)) {
      cityRevenueMap.set(city, { revenue: 0, orderCount: 0 });
    }
    const cityData = cityRevenueMap.get(city);
    cityData.revenue += revenue;
    cityData.orderCount += 1;
  }
  return Array.from(cityRevenueMap.entries()).map(([city, data]) => ({
    city,
    revenue: data.revenue.toFixed(2),
    orderCount: data.orderCount
  })).sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue));
}
async function getCityRevenueTrend() {
  const db = await getDb();
  if (!db) return { months: [], cities: [] };
  const now = /* @__PURE__ */ new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const date2 = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${date2.getFullYear()}-${String(date2.getMonth() + 1).padStart(2, "0")}`);
  }
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const allOrders = await db.select({
    paymentCity: orders.paymentCity,
    paymentAmount: orders.paymentAmount,
    teacherFee: orders.teacherFee,
    paymentDate: orders.paymentDate
  }).from(orders).where(
    sql`${orders.status} != 'cancelled' AND ${orders.paymentDate} >= ${formatDateBeijing(sixMonthsAgo)}`
  );
  const cityMonthRevenueMap = /* @__PURE__ */ new Map();
  for (const order of allOrders) {
    if (!order.paymentDate) continue;
    const city = order.paymentCity || "\u672A\u77E5\u57CE\u5E02";
    const paymentAmount = parseFloat(order.paymentAmount?.toString() || "0");
    const teacherFee = parseFloat(order.teacherFee?.toString() || "0");
    const baseRevenue = paymentAmount - teacherFee;
    let ratio = 0.3;
    if (city === "\u5929\u6D25") {
      ratio = 0.5;
    } else if (city === "\u6B66\u6C49") {
      ratio = 0.4;
    } else if (city === "\u4E0A\u6D77") {
      ratio = 1;
    }
    const revenue = baseRevenue * ratio;
    const date2 = new Date(order.paymentDate);
    const month = `${date2.getFullYear()}-${String(date2.getMonth() + 1).padStart(2, "0")}`;
    if (!cityMonthRevenueMap.has(city)) {
      cityMonthRevenueMap.set(city, /* @__PURE__ */ new Map());
    }
    const monthRevenueMap = cityMonthRevenueMap.get(city);
    monthRevenueMap.set(month, (monthRevenueMap.get(month) || 0) + revenue);
  }
  const cities3 = Array.from(cityMonthRevenueMap.entries()).map(([city, monthRevenueMap]) => {
    const data = months.map((month) => {
      const revenue = monthRevenueMap.get(month) || 0;
      return parseFloat(revenue.toFixed(2));
    });
    return {
      city,
      data
    };
  });
  cities3.sort((a, b) => {
    const sumA = a.data.reduce((acc, val) => acc + val, 0);
    const sumB = b.data.reduce((acc, val) => acc + val, 0);
    return sumB - sumA;
  });
  return {
    months,
    cities: cities3.slice(0, 5)
  };
}
async function getCustomerStats() {
  const db = await getDb();
  if (!db) return {
    totalCustomers: 0,
    returningCustomers: 0,
    memberCustomers: 0,
    todayNewCustomers: 0,
    todayReturningCustomers: 0
  };
  const todayStr = formatDateBeijing(/* @__PURE__ */ new Date());
  const totalCustomersResult = await db.select({ count: sql`COUNT(*)` }).from(customers);
  const totalCustomers = totalCustomersResult[0]?.count || 0;
  const returningCustomersResult = await db.select({
    customerId: orders.customerId,
    orderCount: sql`COUNT(*)`
  }).from(orders).where(sql`${orders.customerId} IS NOT NULL AND ${orders.status} NOT IN ('pending', 'cancelled')`).groupBy(orders.customerId).having(sql`COUNT(*) > 1`);
  const returningCustomers = returningCustomersResult.length;
  const memberCustomersResult = await db.select({
    customerId: orders.customerId,
    orderCount: sql`COUNT(*)`
  }).from(orders).where(sql`${orders.customerId} IS NOT NULL AND ${orders.status} NOT IN ('pending', 'cancelled')`).groupBy(orders.customerId).having(sql`COUNT(*) >= 3`);
  const memberCustomers = memberCustomersResult.length;
  const todayNewCustomersResult = await db.select({ count: sql`COUNT(*)` }).from(customers).where(sql`DATE(${customers.createdAt}) = ${todayStr}`);
  const todayNewCustomers = todayNewCustomersResult[0]?.count || 0;
  const todayReturningCustomersResult = await db.select({
    customerId: orders.customerId
  }).from(orders).where(
    sql`${orders.customerId} IS NOT NULL AND DATE(${orders.paymentDate}) = ${todayStr} AND ${orders.status} NOT IN ('pending', 'cancelled')`
  ).groupBy(orders.customerId);
  let todayReturningCustomers = 0;
  for (const row of todayReturningCustomersResult) {
    const orderCountResult = await db.select({ count: sql`COUNT(*)` }).from(orders).where(
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
    todayReturningCustomers
  };
}
async function getChurnRiskCustomers() {
  const db = await getDb();
  if (!db) return [];
  const thirtyDaysAgo = /* @__PURE__ */ new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = formatDateBeijing(thirtyDaysAgo);
  const allCustomersWithOrders = await db.select({
    customerId: orders.customerId,
    customerName: orders.customerName,
    lastOrderDate: sql`MAX(${orders.paymentDate})`,
    orderCount: sql`COUNT(*)`,
    totalAmount: sql`SUM(${orders.paymentAmount})`
  }).from(orders).where(
    sql`${orders.customerId} IS NOT NULL AND ${orders.status} NOT IN ('pending', 'cancelled')`
  ).groupBy(orders.customerId, orders.customerName);
  const churnRiskCustomers = allCustomersWithOrders.filter((customer) => {
    if (!customer.lastOrderDate) return false;
    const lastOrderDate = new Date(customer.lastOrderDate);
    return lastOrderDate < thirtyDaysAgo;
  });
  const result = await Promise.all(
    churnRiskCustomers.map(async (customer) => {
      const customerInfo = await db.select().from(customers).where(eq(customers.id, customer.customerId)).limit(1);
      const daysSinceLastOrder = Math.floor(
        (Date.now() - new Date(customer.lastOrderDate).getTime()) / (1e3 * 60 * 60 * 24)
      );
      return {
        customerId: customer.customerId,
        customerName: customer.customerName,
        phone: customerInfo[0]?.phone || null,
        wechatId: customerInfo[0]?.wechatId || null,
        lastOrderDate: customer.lastOrderDate,
        daysSinceLastOrder,
        orderCount: customer.orderCount,
        totalAmount: parseFloat(customer.totalAmount || "0")
      };
    })
  );
  result.sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder);
  return result;
}
async function batchDeleteOrders(ids) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    for (const id of ids) {
      await db.delete(orders).where(eq(orders.id, id));
    }
  } catch (error) {
    console.error("[DB] batchDeleteOrders failed:", { ids, error });
    throw new Error(`Failed to batch delete orders: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function batchUpdateOrderStatus(ids, status) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (const id of ids) {
    await db.update(orders).set({ status }).where(eq(orders.id, id));
  }
}
async function createImportLog(log) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(importLogs).values(log);
  return result[0].insertId;
}
async function getImportLogs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(importLogs).orderBy(desc(importLogs.createdAt)).limit(50);
}
async function getTeacherMonthlyStats() {
  const db = await getDb();
  if (!db) return [];
  const now = /* @__PURE__ */ new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const result = await db.select({
    teacher: orders.deliveryTeacher,
    classCount: sql`count(*)`,
    totalRevenue: sql`sum(CAST(${orders.paymentAmount} AS DECIMAL(10,2)) - COALESCE(CAST(${orders.teacherFee} AS DECIMAL(10,2)), 0))`
  }).from(orders).where(
    and(
      gte(orders.createdAt, startOfMonth),
      ne(orders.status, "cancelled"),
      isNotNull(orders.deliveryTeacher)
    )
  ).groupBy(orders.deliveryTeacher);
  return result.map((r) => ({
    teacher: r.teacher || "\u672A\u77E5",
    classCount: r.classCount,
    totalRevenue: parseFloat(r.totalRevenue || "0")
  })).sort((a, b) => b.classCount - a.classCount);
}
async function getTrafficSourceMonthlyStats() {
  const db = await getDb();
  if (!db) return [];
  const now = /* @__PURE__ */ new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const result = await db.select({
    source: orders.trafficSource,
    orderCount: sql`count(*)`
  }).from(orders).where(
    and(
      gte(orders.createdAt, startOfMonth),
      ne(orders.status, "cancelled"),
      isNotNull(orders.trafficSource)
    )
  ).groupBy(orders.trafficSource);
  return result.map((r) => ({
    source: r.source || "\u672A\u77E5",
    orderCount: r.orderCount
  })).sort((a, b) => b.orderCount - a.orderCount);
}
async function getTrafficSourceAnalysis() {
  const db = await getDb();
  if (!db) return [];
  const now = /* @__PURE__ */ new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const result = await db.select({
    source: orders.trafficSource,
    orderCount: sql`count(*)`,
    totalRevenue: sql`COALESCE(SUM(CAST(${orders.paymentAmount} AS DECIMAL(10,2))), 0)`,
    paidOrderCount: sql`SUM(CASE WHEN ${orders.status} = 'paid' THEN 1 ELSE 0 END)`
  }).from(orders).where(
    and(
      gte(orders.createdAt, startOfMonth),
      ne(orders.status, "cancelled"),
      isNotNull(orders.trafficSource)
    )
  ).groupBy(orders.trafficSource);
  return result.map((r) => {
    const orderCount = r.orderCount || 0;
    const paidOrderCount = r.paidOrderCount || 0;
    const conversionRate = orderCount > 0 ? paidOrderCount / orderCount * 100 : 0;
    return {
      source: r.source || "\u672A\u77E5",
      orderCount,
      totalRevenue: parseFloat(r.totalRevenue || "0"),
      conversionRate: Math.round(conversionRate * 100) / 100
      // 保留两位小数
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);
}
async function getSalesPersonPaymentStats() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    salesPerson: orders.salesPerson,
    totalPayment: sql`sum(CAST(${orders.paymentAmount} AS DECIMAL(10,2)))`,
    orderCount: sql`count(*)`
  }).from(orders).where(
    and(
      ne(orders.status, "cancelled"),
      isNotNull(orders.salesPerson)
    )
  ).groupBy(orders.salesPerson);
  return result.map((r) => ({
    salesPerson: r.salesPerson || "\u672A\u77E5",
    totalPayment: parseFloat(r.totalPayment || "0"),
    orderCount: r.orderCount
  })).sort((a, b) => b.totalPayment - a.totalPayment);
}
async function getCustomerBalanceRanking() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    customerName: orders.customerName,
    accountBalance: sql`max(CAST(${orders.accountBalance} AS DECIMAL(10,2)))`
  }).from(orders).where(
    and(
      isNotNull(orders.customerName),
      isNotNull(orders.accountBalance),
      ne(orders.accountBalance, ""),
      ne(orders.accountBalance, "0")
    )
  ).groupBy(orders.customerName);
  return result.map((r) => ({
    customerName: r.customerName || "\u672A\u77E5",
    accountBalance: parseFloat(r.accountBalance || "0")
  })).filter((r) => r.accountBalance > 0).sort((a, b) => b.accountBalance - a.accountBalance).slice(0, 20);
}
async function getCustomerTransactions(customerId) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db.select().from(accountTransactions).where(eq(accountTransactions.customerId, customerId)).orderBy(desc(accountTransactions.createdAt));
}
async function createAccountTransaction(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const [result] = await db.insert(accountTransactions).values(data);
  return result;
}
async function rechargeCustomerAccount(params) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return await db.transaction(async (tx) => {
    const [customer] = await tx.select().from(customers).where(eq(customers.id, params.customerId));
    if (!customer) {
      throw new Error("\u5BA2\u6237\u4E0D\u5B58\u5728");
    }
    const balanceBefore = Number(customer.accountBalance);
    const balanceAfter = balanceBefore + params.amount;
    await tx.update(customers).set({ accountBalance: balanceAfter.toFixed(2) }).where(eq(customers.id, params.customerId));
    await tx.insert(accountTransactions).values({
      customerId: params.customerId,
      customerName: customer.name,
      type: "recharge",
      amount: params.amount.toFixed(2),
      balanceBefore: balanceBefore.toFixed(2),
      balanceAfter: balanceAfter.toFixed(2),
      notes: params.notes,
      operatorId: params.operatorId,
      operatorName: params.operatorName
    });
    return { balanceBefore, balanceAfter };
  });
}
async function consumeCustomerAccount(params) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return await db.transaction(async (tx) => {
    const [customer] = await tx.select().from(customers).where(eq(customers.id, params.customerId));
    if (!customer) {
      throw new Error("\u5BA2\u6237\u4E0D\u5B58\u5728");
    }
    const balanceBefore = Number(customer.accountBalance);
    if (balanceBefore < params.amount) {
      throw new Error(`\u4F59\u989D\u4E0D\u8DB3,\u5F53\u524D\u4F59\u989D\uFFE5${balanceBefore.toFixed(2)},\u9700\u8981\uFFE5${params.amount.toFixed(2)}`);
    }
    const balanceAfter = balanceBefore - params.amount;
    await tx.update(customers).set({ accountBalance: balanceAfter.toFixed(2) }).where(eq(customers.id, params.customerId));
    await tx.insert(accountTransactions).values({
      customerId: params.customerId,
      customerName: customer.name,
      type: "consume",
      amount: (-params.amount).toFixed(2),
      balanceBefore: balanceBefore.toFixed(2),
      balanceAfter: balanceAfter.toFixed(2),
      relatedOrderId: params.orderId,
      relatedOrderNo: params.orderNo,
      notes: `\u8BA2\u5355\u6D88\u8D39:${params.orderNo}`,
      operatorId: params.operatorId,
      operatorName: params.operatorName
    });
    return { balanceBefore, balanceAfter };
  });
}
async function refundCustomerAccount(params) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return await db.transaction(async (tx) => {
    const [customer] = await tx.select().from(customers).where(eq(customers.id, params.customerId));
    if (!customer) {
      throw new Error("\u5BA2\u6237\u4E0D\u5B58\u5728");
    }
    const balanceBefore = Number(customer.accountBalance);
    const balanceAfter = balanceBefore + params.amount;
    await tx.update(customers).set({ accountBalance: balanceAfter.toFixed(2) }).where(eq(customers.id, params.customerId));
    await tx.insert(accountTransactions).values({
      customerId: params.customerId,
      customerName: customer.name,
      type: "refund",
      amount: params.amount.toFixed(2),
      balanceBefore: balanceBefore.toFixed(2),
      balanceAfter: balanceAfter.toFixed(2),
      relatedOrderId: params.orderId,
      relatedOrderNo: params.orderNo,
      notes: `\u8BA2\u5355\u9000\u6B3E:${params.orderNo}`,
      operatorId: params.operatorId,
      operatorName: params.operatorName
    });
    return { balanceBefore, balanceAfter };
  });
}
async function createSmartRegisterHistory(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.insert(smartRegisterHistory).values(data);
  return result;
}
async function getSmartRegisterHistory(limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db.select().from(smartRegisterHistory).orderBy(desc(smartRegisterHistory.createdAt)).limit(limit);
}
async function getAllSalespersons() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const results = await db.select({
    id: salespersons.id,
    userId: salespersons.userId,
    commissionRate: salespersons.commissionRate,
    orderCount: salespersons.orderCount,
    totalSales: salespersons.totalSales,
    notes: salespersons.notes,
    isActive: salespersons.isActive,
    createdAt: salespersons.createdAt,
    updatedAt: salespersons.updatedAt,
    // 从 users 表获取基础信息
    name: users.name,
    nickname: users.nickname,
    phone: users.phone,
    email: users.email,
    wechat: users.wechat,
    aliases: users.aliases
  }).from(salespersons).leftJoin(users, eq(salespersons.userId, users.id)).where(eq(salespersons.isActive, true)).orderBy(desc(salespersons.createdAt));
  return results;
}
async function getSalespersonById(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const results = await db.select().from(salespersons).where(eq(salespersons.id, id)).limit(1);
  return results[0] || null;
}
async function searchSalespersons(keyword) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const results = await db.select({
    id: salespersons.id,
    userId: salespersons.userId,
    commissionRate: salespersons.commissionRate,
    orderCount: salespersons.orderCount,
    totalSales: salespersons.totalSales,
    notes: salespersons.notes,
    isActive: salespersons.isActive,
    createdAt: salespersons.createdAt,
    updatedAt: salespersons.updatedAt,
    // 从 users 表获取基础信息
    name: users.name,
    nickname: users.nickname,
    phone: users.phone,
    email: users.email,
    wechat: users.wechat,
    aliases: users.aliases
  }).from(salespersons).leftJoin(users, eq(salespersons.userId, users.id)).where(
    and(
      eq(salespersons.isActive, true),
      or(
        like(users.name, `%${keyword}%`),
        like(users.nickname, `%${keyword}%`),
        like(users.phone, `%${keyword}%`),
        like(users.wechat, `%${keyword}%`)
      )
    )
  ).orderBy(desc(salespersons.createdAt));
  return results;
}
async function createSalesperson(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.insert(salespersons).values(data);
  return result[0].insertId;
}
async function updateSalesperson(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(salespersons).set(data).where(eq(salespersons.id, id));
}
async function deleteSalesperson(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(salespersons).set({ isActive: false }).where(eq(salespersons.id, id));
}
async function updateSalespersonStatus(id, isActive) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(salespersons).set({ isActive }).where(eq(salespersons.id, id));
}
async function getSalesStatistics(params) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const conditions = [ne(orders.status, "cancelled")];
  if (params.salespersonId) {
    const spList = await db.select({
      id: salespersons.id,
      name: users.name,
      nickname: users.nickname
    }).from(salespersons).leftJoin(users, eq(salespersons.userId, users.id)).where(eq(salespersons.id, params.salespersonId)).limit(1);
    const sp = spList[0];
    if (sp) {
      const spConditions = [eq(orders.salespersonId, params.salespersonId)];
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
  const orderList = await db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.paymentDate));
  const totalSales = orderList.reduce((sum, order) => sum + Number(order.paymentAmount), 0);
  const totalOrders = orderList.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  return {
    totalSales,
    totalOrders,
    avgOrderValue,
    orders: orderList
  };
}
async function getMonthlySales(salespersonId, year) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const conditions = [
    eq(orders.status, "paid"),
    sql`${orders.paymentDate} >= ${startDate}`,
    sql`${orders.paymentDate} <= ${endDate}`
  ];
  if (salespersonId) {
    const spList = await db.select({
      id: salespersons.id,
      name: users.name,
      nickname: users.nickname
    }).from(salespersons).leftJoin(users, eq(salespersons.userId, users.id)).where(eq(salespersons.id, salespersonId)).limit(1);
    const sp = spList[0];
    if (sp) {
      const spConditions = [eq(orders.salespersonId, salespersonId)];
      if (sp.name) spConditions.push(eq(orders.salesPerson, sp.name));
      if (sp.nickname && sp.nickname !== sp.name) spConditions.push(eq(orders.salesPerson, sp.nickname));
      conditions.push(or(...spConditions));
    } else {
      conditions.push(eq(orders.salespersonId, salespersonId));
    }
  }
  const orderList = await db.select().from(orders).where(and(...conditions));
  const monthlySales = [];
  for (let month = 1; month <= 12; month++) {
    const monthOrders = orderList.filter((order) => {
      if (!order.paymentDate) return false;
      const orderMonth = new Date(order.paymentDate).getMonth() + 1;
      return orderMonth === month;
    });
    const sales = monthOrders.reduce((sum, order) => sum + Number(order.paymentAmount), 0);
    monthlySales.push({
      month,
      sales,
      orders: monthOrders.length
    });
  }
  return monthlySales;
}
async function getYearlySales(salespersonId, startYear, endYear) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const currentYear = new Date((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "Asia/Shanghai" })).getFullYear();
  const start = startYear || currentYear - 2;
  const end = endYear || currentYear;
  const conditions = [
    eq(orders.status, "paid"),
    sql`${orders.paymentDate} >= ${`${start}-01-01`}`,
    sql`${orders.paymentDate} <= ${`${end}-12-31`}`
  ];
  if (salespersonId) {
    const spList = await db.select({
      id: salespersons.id,
      name: users.name,
      nickname: users.nickname
    }).from(salespersons).leftJoin(users, eq(salespersons.userId, users.id)).where(eq(salespersons.id, salespersonId)).limit(1);
    const sp = spList[0];
    if (sp) {
      const spConditions = [eq(orders.salespersonId, salespersonId)];
      if (sp.name) spConditions.push(eq(orders.salesPerson, sp.name));
      if (sp.nickname && sp.nickname !== sp.name) spConditions.push(eq(orders.salesPerson, sp.nickname));
      conditions.push(or(...spConditions));
    } else {
      conditions.push(eq(orders.salespersonId, salespersonId));
    }
  }
  const orderList = await db.select().from(orders).where(and(...conditions));
  const yearlySales = [];
  for (let year = start; year <= end; year++) {
    const yearOrders = orderList.filter((order) => {
      if (!order.paymentDate) return false;
      const orderYear = new Date(order.paymentDate).getFullYear();
      return orderYear === year;
    });
    const sales = yearOrders.reduce((sum, order) => sum + Number(order.paymentAmount), 0);
    yearlySales.push({
      year,
      sales,
      orders: yearOrders.length
    });
  }
  return yearlySales;
}
async function createGmailImportLog(log) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(gmailImportLogs).values(log);
  return result[0].insertId;
}
async function getAllGmailImportLogs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gmailImportLogs).orderBy(desc(gmailImportLogs.createdAt));
}
async function getGmailImportLogById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(gmailImportLogs).where(eq(gmailImportLogs.id, id)).limit(1);
  return result[0] || null;
}
async function getGmailImportLogsByDateRange(startDate, endDate) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gmailImportLogs).where(
    and(
      gte(gmailImportLogs.createdAt, startDate),
      lte(gmailImportLogs.createdAt, endDate)
    )
  ).orderBy(desc(gmailImportLogs.createdAt));
}
async function getGmailImportStats() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    totalImports: sql`COUNT(*)`,
    totalOrders: sql`SUM(${gmailImportLogs.totalOrders})`,
    successOrders: sql`SUM(${gmailImportLogs.successOrders})`,
    failedOrders: sql`SUM(${gmailImportLogs.failedOrders})`,
    successRate: sql`ROUND(SUM(${gmailImportLogs.successOrders}) * 100.0 / NULLIF(SUM(${gmailImportLogs.totalOrders}), 0), 2)`
  }).from(gmailImportLogs);
  return result[0] || null;
}
async function checkThreadIdExists(threadId) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(gmailImportLogs).where(eq(gmailImportLogs.threadId, threadId)).limit(1);
  return result.length > 0;
}
async function deleteGmailImportLog(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(gmailImportLogs).where(eq(gmailImportLogs.id, id));
  return true;
}
async function deleteAllGmailImportLogs() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(gmailImportLogs);
  return true;
}
async function getGmailImportConfig(configKey) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [config] = await db.select().from(gmailImportConfig).where(eq(gmailImportConfig.configKey, configKey)).limit(1);
  return config || null;
}
async function getAllGmailImportConfigs() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(gmailImportConfig);
}
async function upsertGmailImportConfig(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getGmailImportConfig(data.configKey);
  if (existing) {
    await db.update(gmailImportConfig).set({
      configValue: data.configValue,
      description: data.description,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(gmailImportConfig.configKey, data.configKey));
    return existing.id;
  } else {
    const [result] = await db.insert(gmailImportConfig).values(data);
    return result.insertId;
  }
}
async function deleteGmailImportConfig(configKey) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(gmailImportConfig).where(eq(gmailImportConfig.configKey, configKey));
  return true;
}
async function getInactiveCustomers(days = 30) {
  const db = await getDb();
  if (!db) return [];
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const customersWithOrders = await db.select({
    customerId: orders.customerId,
    lastOrderDate: sql`MAX(${orders.createdAt})`,
    customerName: sql`(SELECT name FROM customers WHERE id = ${orders.customerId})`
  }).from(orders).where(sql`${orders.customerId} IS NOT NULL`).groupBy(orders.customerId).having(sql`MAX(${orders.createdAt}) < ${cutoffDate}`);
  return customersWithOrders;
}
async function importCustomersFromOrders(createdBy) {
  const db = await getDb();
  if (!db) return { success: 0, skipped: 0, failed: 0 };
  const teacherNames = await getAllTeacherNames();
  const teacherNameSet = new Set(teacherNames);
  const allOrders = await db.select().from(orders);
  const uniqueCustomers = /* @__PURE__ */ new Map();
  for (const order of allOrders) {
    if (order.customerName && !uniqueCustomers.has(order.customerName) && !teacherNameSet.has(order.customerName)) {
      uniqueCustomers.set(order.customerName, {
        name: order.customerName,
        trafficSource: order.trafficSource || void 0
      });
    }
  }
  const existingCustomers = await db.select({ name: customers.name }).from(customers);
  const existingNames = new Set(existingCustomers.map((c) => c.name));
  let success = 0;
  let skipped = 0;
  let failed = 0;
  for (const customerData of Array.from(uniqueCustomers.values())) {
    if (existingNames.has(customerData.name)) {
      skipped++;
      continue;
    }
    try {
      await db.insert(customers).values({
        name: customerData.name,
        trafficSource: customerData.trafficSource,
        createdBy
      });
      success++;
    } catch (error) {
      console.error(`Failed to create customer ${customerData.name}:`, error);
      failed++;
    }
  }
  return { success, skipped, failed, total: uniqueCustomers.size };
}
async function createGmailImportHistory(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const [result] = await db.insert(gmailImportHistory).values(data);
  return result.insertId;
}
async function checkMessageIdExists(messageId) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.select({ id: gmailImportHistory.id }).from(gmailImportHistory).where(eq(gmailImportHistory.messageId, messageId)).limit(1);
  return result.length > 0;
}
async function getAllGmailImportHistory(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return await db.select().from(gmailImportHistory).orderBy(desc(gmailImportHistory.importedAt)).limit(limit).offset(offset);
}
async function getGmailImportHistoryStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const stats = await db.select({
    totalImports: count(),
    successCount: sql`SUM(CASE WHEN ${gmailImportHistory.importStatus} = 'success' THEN 1 ELSE 0 END)`,
    failedCount: sql`SUM(CASE WHEN ${gmailImportHistory.importStatus} = 'failed' THEN 1 ELSE 0 END)`,
    skippedCount: sql`SUM(CASE WHEN ${gmailImportHistory.importStatus} = 'skipped' THEN 1 ELSE 0 END)`
  }).from(gmailImportHistory);
  return stats[0] || { totalImports: 0, successCount: 0, failedCount: 0, skippedCount: 0 };
}
async function getGmailImportHistoryByDateRange(startDate, endDate) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return await db.select().from(gmailImportHistory).where(
    and(
      gte(gmailImportHistory.importedAt, startDate),
      lte(gmailImportHistory.importedAt, endDate)
    )
  ).orderBy(desc(gmailImportHistory.importedAt));
}
async function deleteGmailImportHistory(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.delete(gmailImportHistory).where(eq(gmailImportHistory.id, id));
}
async function deleteCustomersWithTeacherNames() {
  const teacherNames = await getAllTeacherNames();
  if (teacherNames.length === 0) {
    return 0;
  }
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  await db.delete(customers).where(inArray(customers.name, teacherNames));
  return teacherNames.length;
}
async function batchUpdateOrderNumbers() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const allOrders = await db.select().from(orders);
  let updatedCount = 0;
  for (const order of allOrders) {
    if (order.orderNo.startsWith("pay") || order.orderNo.startsWith("we") || order.orderNo.startsWith("xj")) {
      continue;
    }
    let paymentMethod;
    if (order.notes) {
      const notesLower = order.notes.toLowerCase();
      if (notesLower.includes("\u652F\u4ED8\u5B9D") || notesLower.includes("alipay")) {
        paymentMethod = "alipay";
      } else if (notesLower.includes("\u5BCC\u638C\u67DC") || notesLower.includes("\u5FAE\u4FE1") || notesLower.includes("wechat")) {
        paymentMethod = "wechat";
      } else if (notesLower.includes("\u73B0\u91D1") || notesLower.includes("cash")) {
        paymentMethod = "cash";
      }
    }
    const { generateOrderId: generateOrderId2 } = await Promise.resolve().then(() => (init_orderIdGenerator(), orderIdGenerator_exports));
    const newOrderNo = generateOrderId2(
      order.deliveryCity || void 0,
      order.classDate || void 0,
      paymentMethod
    );
    const dbInstance = await getDb();
    if (!dbInstance) throw new Error("Database not initialized");
    await dbInstance.update(orders).set({ orderNo: newOrderNo }).where(eq(orders.id, order.id));
    updatedCount++;
  }
  return updatedCount;
}
async function checkChannelOrderNoExists(channelOrderNo) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(orders).where(eq(orders.channelOrderNo, channelOrderNo)).limit(1);
  return result.length > 0;
}
async function getOrderByChannelOrderNo(channelOrderNo) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(orders).where(eq(orders.channelOrderNo, channelOrderNo)).limit(1);
  return result[0] || null;
}
async function getOrdersByPaymentChannel(paymentChannel) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.paymentChannel, paymentChannel)).orderBy(desc(orders.createdAt));
}
async function searchOrdersByChannelOrderNo(keyword) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(sql`${orders.channelOrderNo} LIKE ${`%${keyword}%`}`).orderBy(desc(orders.createdAt));
}
async function getReconciliationReport(startDate, endDate) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(
    and(
      gte(orders.classDate, new Date(startDate)),
      lte(orders.classDate, new Date(endDate))
    )
  ).orderBy(orders.paymentChannel, desc(orders.createdAt));
}
async function detectTransportFeeIssues() {
  const db = await getDb();
  if (!db) return [];
  const issueOrders = await db.select().from(orders).where(
    and(
      sql`${orders.notes} LIKE '%车费%'`,
      or(
        eq(orders.transportFee, "0.00"),
        isNull(orders.transportFee)
      )
    )
  ).orderBy(desc(orders.createdAt));
  return issueOrders;
}
async function batchFixTransportFee(orderIds) {
  const db = await getDb();
  if (!db) return { success: 0, failed: 0, errors: [] };
  let successCount = 0;
  let failedCount = 0;
  const errors = [];
  for (const orderId of orderIds) {
    try {
      const order = await getOrderById(orderId);
      if (!order || !order.notes) {
        errors.push(`\u8BA2\u5355 ${orderId}: \u672A\u627E\u5230\u6216\u6CA1\u6709\u5907\u6CE8`);
        failedCount++;
        continue;
      }
      const notes = order.notes;
      const transportFeeMatch = notes.match(/报销(?:老师)?(\d+)(?:元)?车费|车费(\d+)(?:元)?/);
      const transportFee = transportFeeMatch ? transportFeeMatch[1] || transportFeeMatch[2] : null;
      const teacherFeeMatch = notes.match(/给老师(\d+)(?:元)?/);
      const teacherFee = teacherFeeMatch ? teacherFeeMatch[1] : null;
      const updateData = {};
      if (transportFee) {
        updateData.transportFee = transportFee;
      }
      if (teacherFee) {
        updateData.teacherFee = teacherFee;
      }
      if (Object.keys(updateData).length > 0) {
        await db.update(orders).set(updateData).where(eq(orders.id, orderId));
        successCount++;
      } else {
        errors.push(`\u8BA2\u5355 ${orderId}: \u672A\u80FD\u4ECE\u5907\u6CE8\u4E2D\u63D0\u53D6\u8F66\u8D39\u6216\u8001\u5E08\u8D39\u7528`);
        failedCount++;
      }
    } catch (error) {
      errors.push(`\u8BA2\u5355 ${orderId}: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
      failedCount++;
    }
  }
  return {
    success: successCount,
    failed: failedCount,
    errors
  };
}
async function getTrafficSourceStats(startDate, endDate) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select({
    trafficSource: orders.trafficSource,
    orderCount: count(orders.id),
    totalAmount: sql`SUM(${orders.paymentAmount})`
  }).from(orders).where(
    and(
      isNotNull(orders.trafficSource),
      ne(orders.trafficSource, ""),
      eq(orders.isVoided, false)
    )
  ).groupBy(orders.trafficSource).orderBy(sql`SUM(${orders.paymentAmount}) DESC`);
  if (startDate && endDate) {
    query = db.select({
      trafficSource: orders.trafficSource,
      orderCount: count(orders.id),
      totalAmount: sql`SUM(${orders.paymentAmount})`
    }).from(orders).where(
      and(
        isNotNull(orders.trafficSource),
        ne(orders.trafficSource, ""),
        eq(orders.isVoided, false),
        gte(orders.classDate, new Date(startDate)),
        lte(orders.classDate, new Date(endDate))
      )
    ).groupBy(orders.trafficSource).orderBy(sql`SUM(${orders.paymentAmount}) DESC`);
  }
  const results = await query;
  return results.map((row) => ({
    trafficSource: row.trafficSource,
    orderCount: Number(row.orderCount),
    totalAmount: Number(row.totalAmount) || 0
  }));
}
async function getAllCityPartnerConfig() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db.select().from(cityPartnerConfig).where(eq(cityPartnerConfig.isActive, true)).orderBy(cityPartnerConfig.city);
}
async function getCityPartnerConfigByCity(city) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.select().from(cityPartnerConfig).where(
    and(
      eq(cityPartnerConfig.city, city),
      eq(cityPartnerConfig.isActive, true)
    )
  ).limit(1);
  return result[0] || null;
}
async function updateCityPartnerConfig(id, data, updatedBy) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const config = await db.select().from(cityPartnerConfig).where(eq(cityPartnerConfig.id, id)).limit(1);
  if (config.length === 0) {
    throw new Error("\u57CE\u5E02\u914D\u7F6E\u4E0D\u5B58\u5728");
  }
  const cityName = config[0].city;
  await db.update(cityPartnerConfig).set({
    ...data,
    updatedBy,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(cityPartnerConfig.id, id));
  if (data.areaCode !== void 0) {
    await db.update(cities).set({ areaCode: data.areaCode }).where(eq(cities.name, cityName));
  }
  return true;
}
async function getAllCitiesWithStats(options) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const cityConfigs = await db.select({
    id: cities.id,
    city: cities.name,
    areaCode: cities.areaCode,
    description: sql`NULL`,
    // cities表没有description字段
    isActive: cities.isActive,
    updatedBy: sql`NULL`,
    // cities表没有updatedBy字段
    updatedAt: cities.updatedAt,
    createdAt: cities.createdAt,
    // 从 partner_cities 表查询合伙人分红比例
    currentProfitStage: partnerCities.currentProfitStage,
    isInvestmentRecovered: partnerCities.isInvestmentRecovered,
    profitRatioStage1Partner: partnerCities.profitRatioStage1Partner,
    profitRatioStage2APartner: partnerCities.profitRatioStage2APartner,
    profitRatioStage2BPartner: partnerCities.profitRatioStage2BPartner,
    profitRatioStage3Partner: partnerCities.profitRatioStage3Partner
  }).from(cities).leftJoin(partnerCities, eq(cities.id, partnerCities.cityId)).where(eq(cities.isActive, true)).orderBy(cities.name);
  const citiesWithPartnerFeeRate = cityConfigs.map((city) => {
    let partnerFeeRate = null;
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
      partnerFeeRate
    };
  });
  const citiesWithStats = await Promise.all(
    citiesWithPartnerFeeRate.map(async (city) => {
      const conditions = [
        eq(orders.deliveryCity, city.city),
        ne(orders.status, "cancelled")
      ];
      if (options?.startDate) {
        conditions.push(gte(orders.classDate, options.startDate));
      }
      if (options?.endDate) {
        conditions.push(lte(orders.classDate, options.endDate));
      }
      const stats = await db.select({
        orderCount: sql`COUNT(*)`,
        totalSales: sql`COALESCE(SUM(${orders.paymentAmount}), 0)`,
        totalTeacherFee: sql`COALESCE(SUM(${orders.teacherFee}), 0)`,
        totalTransportFee: sql`COALESCE(SUM(${orders.transportFee}), 0)`,
        totalOtherFee: sql`COALESCE(SUM(${orders.otherFee}), 0)`,
        totalPartnerFee: sql`COALESCE(SUM(${orders.partnerFee}), 0)`
      }).from(orders).where(and(...conditions));
      const stat = stats[0];
      const totalExpense = Number(stat.totalTeacherFee) + Number(stat.totalTransportFee) + Number(stat.totalOtherFee) + Number(stat.totalPartnerFee);
      const profit = Number(stat.totalSales) - totalExpense;
      const profitRate = stat.totalSales > 0 ? profit / Number(stat.totalSales) * 100 : 0;
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
        profitRate: Math.round(profitRate * 100) / 100
      };
    })
  );
  return citiesWithStats;
}
async function createCityConfig(data, createdBy) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const existingCity = await db.select().from(cities).where(eq(cities.name, data.city)).limit(1);
  if (existingCity.length === 0) {
    await db.insert(cities).values({
      name: data.city,
      areaCode: data.areaCode || "",
      isActive: true,
      sortOrder: 0
    });
  }
  return db.insert(cityPartnerConfig).values({
    ...data,
    updatedBy: createdBy
  });
}
async function deleteCityConfig(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db.delete(cityPartnerConfig).where(eq(cityPartnerConfig.id, id));
}
async function calculatePartnerFee(city, courseAmount, teacherFee, transportFee = 0) {
  if (!city) return 0;
  const config = await getCityPartnerConfigByCity(city);
  if (!config) return 0;
  const rate = Number(config.partnerFeeRate) / 100;
  const baseRevenue = courseAmount - teacherFee - transportFee;
  if (baseRevenue <= 0) return 0;
  const partnerFee = baseRevenue * rate;
  return Math.round(partnerFee * 100) / 100;
}
async function createAuditLog(data) {
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
    errorMessage: data.errorMessage || null
  });
  return result[0].insertId;
}
async function getAllAuditLogs(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(partnerFeeAuditLogs).orderBy(desc(partnerFeeAuditLogs.createdAt)).limit(limit).offset(offset);
}
async function getAuditLogsByType(operationType, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(partnerFeeAuditLogs).where(eq(partnerFeeAuditLogs.operationType, operationType)).orderBy(desc(partnerFeeAuditLogs.createdAt)).limit(limit);
}
async function getAuditLogsByOperator(operatorId, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(partnerFeeAuditLogs).where(eq(partnerFeeAuditLogs.operatorId, operatorId)).orderBy(desc(partnerFeeAuditLogs.createdAt)).limit(limit);
}
async function getAuditLogsByDateRange(startDate, endDate) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(partnerFeeAuditLogs).where(
    and(
      gte(partnerFeeAuditLogs.createdAt, startDate),
      lte(partnerFeeAuditLogs.createdAt, endDate)
    )
  ).orderBy(desc(partnerFeeAuditLogs.createdAt));
}
async function getAuditLogStats() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    totalLogs: sql`COUNT(*)`,
    successCount: sql`SUM(CASE WHEN ${partnerFeeAuditLogs.status} = 'success' THEN 1 ELSE 0 END)`,
    failedCount: sql`SUM(CASE WHEN ${partnerFeeAuditLogs.status} = 'failed' THEN 1 ELSE 0 END)`,
    partialCount: sql`SUM(CASE WHEN ${partnerFeeAuditLogs.status} = 'partial' THEN 1 ELSE 0 END)`,
    totalAffectedRecords: sql`SUM(${partnerFeeAuditLogs.affectedCount})`
  }).from(partnerFeeAuditLogs);
  return result[0] || null;
}
async function checkOrderDataQuality() {
  const db = await getDb();
  if (!db) return null;
  const allOrders = await getAllOrders();
  const cityConfigs = await getAllCityPartnerConfig();
  const configuredCities = new Set(cityConfigs.map((c) => c.city));
  const issues = {
    missingCityConfig: [],
    abnormalTeacherFee: [],
    invalidChannelOrderNo: [],
    missingRequiredFields: []
  };
  for (const order of allOrders) {
    if (order.deliveryCity && !configuredCities.has(order.deliveryCity)) {
      issues.missingCityConfig.push({
        orderId: order.id,
        orderNo: order.orderNo,
        customerName: order.customerName,
        deliveryCity: order.deliveryCity,
        issue: `\u57CE\u5E02"${order.deliveryCity}"\u672A\u914D\u7F6E\u5408\u4F19\u4EBA\u8D39\u6BD4\u4F8B`
      });
    }
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
          issue: `\u8001\u5E08\u8D39\u7528(${teacherFee})\u8D85\u8FC7\u8BFE\u7A0B\u91D1\u989D(${courseAmount})`
        });
      }
    }
    if (order.channelOrderNo && order.channelOrderNo.trim() !== "") {
      const channelOrderNo = order.channelOrderNo.trim();
      if (channelOrderNo.length < 20 || channelOrderNo.length > 35) {
        issues.invalidChannelOrderNo.push({
          orderId: order.id,
          orderNo: order.orderNo,
          customerName: order.customerName,
          channelOrderNo,
          length: channelOrderNo.length,
          issue: `\u6E20\u9053\u8BA2\u5355\u53F7\u957F\u5EA6\u5F02\u5E38(${channelOrderNo.length}\u4F4D)`
        });
      }
    }
    const missingFields = [];
    if (!order.customerName || order.customerName.trim() === "") missingFields.push("\u5BA2\u6237\u540D");
    if (!order.deliveryCity || order.deliveryCity.trim() === "") missingFields.push("\u4EA4\u4ED8\u57CE\u5E02");
    if (!order.courseAmount || order.courseAmount === "0") missingFields.push("\u8BFE\u7A0B\u91D1\u989D");
    if (!order.classDate) missingFields.push("\u4E0A\u8BFE\u65E5\u671F");
    if (missingFields.length > 0) {
      issues.missingRequiredFields.push({
        orderId: order.id,
        orderNo: order.orderNo,
        customerName: order.customerName || "(\u672A\u586B\u5199)",
        missingFields,
        issue: `\u7F3A\u5931\u5FC5\u586B\u5B57\u6BB5: ${missingFields.join(", ")}`
      });
    }
  }
  return {
    totalOrders: allOrders.length,
    totalIssues: issues.missingCityConfig.length + issues.abnormalTeacherFee.length + issues.invalidChannelOrderNo.length + issues.missingRequiredFields.length,
    issues,
    summary: {
      missingCityConfigCount: issues.missingCityConfig.length,
      abnormalTeacherFeeCount: issues.abnormalTeacherFee.length,
      invalidChannelOrderNoCount: issues.invalidChannelOrderNo.length,
      missingRequiredFieldsCount: issues.missingRequiredFields.length
    }
  };
}
async function getUnconfiguredCities() {
  const db = await getDb();
  if (!db) return [];
  const allOrders = await getAllOrders();
  const cityConfigs = await getAllCityPartnerConfig();
  const configuredCities = new Set(cityConfigs.map((c) => c.city));
  const unconfiguredCities = /* @__PURE__ */ new Set();
  const cityOrderCounts = {};
  for (const order of allOrders) {
    if (order.deliveryCity && !configuredCities.has(order.deliveryCity)) {
      unconfiguredCities.add(order.deliveryCity);
      cityOrderCounts[order.deliveryCity] = (cityOrderCounts[order.deliveryCity] || 0) + 1;
    }
  }
  return Array.from(unconfiguredCities).map((city) => ({
    city,
    orderCount: cityOrderCounts[city]
  })).sort((a, b) => b.orderCount - a.orderCount);
}
async function updateAllSalespersonStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const allSalespersons = await db.select({
    id: salespersons.id,
    userId: salespersons.userId,
    name: users.name,
    nickname: users.nickname
  }).from(salespersons).leftJoin(users, eq(salespersons.userId, users.id));
  const results = [];
  for (const salesperson of allSalespersons) {
    const stats = await db.select({
      orderCount: sql`COUNT(*)`,
      totalAmount: sql`SUM(COALESCE(${orders.paymentAmount}, 0))`
    }).from(orders).where(
      or(
        eq(orders.salespersonId, salesperson.id),
        eq(orders.salesPerson, salesperson.name || ""),
        eq(orders.salesPerson, salesperson.nickname || "")
      )
    );
    const orderCount = stats[0]?.orderCount || 0;
    const totalAmount = stats[0]?.totalAmount || 0;
    await db.update(salespersons).set({
      orderCount,
      totalSales: totalAmount.toString()
    }).where(eq(salespersons.id, salesperson.id));
    results.push({
      salespersonId: salesperson.id,
      name: salesperson.name || null,
      nickname: salesperson.nickname || null,
      orderCount,
      totalAmount
    });
  }
  return results;
}
async function updateSalespersonStats(salespersonId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const salesperson = await db.select({
    id: salespersons.id,
    userId: salespersons.userId,
    name: users.name,
    nickname: users.nickname
  }).from(salespersons).leftJoin(users, eq(salespersons.userId, users.id)).where(eq(salespersons.id, salespersonId)).limit(1);
  if (!salesperson || salesperson.length === 0) {
    throw new Error("Salesperson not found");
  }
  const sp = salesperson[0];
  const stats = await db.select({
    orderCount: sql`COUNT(*)`,
    totalAmount: sql`SUM(COALESCE(${orders.paymentAmount}, 0))`
  }).from(orders).where(
    or(
      eq(orders.salespersonId, sp.id),
      eq(orders.salesPerson, sp.name || ""),
      eq(orders.salesPerson, sp.nickname || "")
    )
  );
  const orderCount = stats[0]?.orderCount || 0;
  const totalAmount = stats[0]?.totalAmount || 0;
  await db.update(salespersons).set({
    orderCount,
    totalSales: totalAmount.toString()
  }).where(eq(salespersons.id, sp.id));
  return {
    salespersonId: sp.id,
    name: sp.name || null,
    nickname: sp.nickname || null,
    orderCount,
    totalAmount
  };
}
async function getCityMonthlyTrends() {
  const db = await getDb();
  if (!db) return [];
  const allOrders = await db.select().from(orders);
  const trendsMap = {};
  allOrders.forEach((order) => {
    const city = order.deliveryCity || "\u672A\u77E5\u57CE\u5E02";
    const classDate = order.classDate;
    if (!classDate) return;
    const dateStr = typeof classDate === "string" ? classDate : formatDateBeijing(classDate);
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
        profit: 0
      };
    }
    const revenue = parseFloat(order.paymentAmount || "0");
    const teacherFee = parseFloat(order.teacherFee || "0");
    const transportFee = parseFloat(order.transportFee || "0");
    const partnerFee = parseFloat(order.partnerFee || "0");
    const consumablesFee = parseFloat(order.consumablesFee || "0");
    const rentFee = parseFloat(order.rentFee || "0");
    const propertyFee = parseFloat(order.propertyFee || "0");
    const utilityFee = parseFloat(order.utilityFee || "0");
    const otherFee = parseFloat(order.otherFee || "0");
    const totalExpense = teacherFee + transportFee + partnerFee + consumablesFee + rentFee + propertyFee + utilityFee + otherFee;
    const profit = revenue - totalExpense;
    trendsMap[city][month].orderCount += 1;
    trendsMap[city][month].revenue += revenue;
    trendsMap[city][month].profit += profit;
  });
  const trends = [];
  Object.keys(trendsMap).forEach((city) => {
    const monthlyData = Object.values(trendsMap[city]).sort(
      (a, b) => a.month.localeCompare(b.month)
    );
    trends.push({
      city,
      monthlyData
    });
  });
  trends.sort((a, b) => a.city.localeCompare(b.city));
  return trends;
}
async function refreshCustomerStats(onProgress) {
  const dbInstance = await getDb();
  if (!dbInstance) {
    return {
      success: false,
      message: "\u6570\u636E\u5E93\u8FDE\u63A5\u4E0D\u53EF\u7528",
      totalCustomers: 0,
      updatedCount: 0,
      createdCount: 0,
      skippedCount: 0
    };
  }
  onProgress?.({ current: 0, total: 100, message: "\u5F00\u59CB\u7EDF\u8BA1\u8BA2\u5355\u6570\u636E..." });
  const customerStats = await dbInstance.select({
    customerName: orders.customerName,
    totalSpent: sql`COALESCE(SUM(${orders.courseAmount}), 0)`,
    classCount: sql`COUNT(*)`,
    firstOrderDate: sql`MIN(${orders.classTime})`,
    lastOrderDate: sql`MAX(${orders.classTime})`
  }).from(orders).where(
    and(
      isNotNull(orders.customerName),
      sql`TRIM(${orders.customerName}) != ''`
    )
  ).groupBy(orders.customerName);
  const totalCustomers = customerStats.length;
  onProgress?.({ current: 20, total: 100, message: `\u7EDF\u8BA1\u5B8C\u6210,\u5171${totalCustomers}\u4E2A\u5BA2\u6237` });
  let updatedCount = 0;
  let createdCount = 0;
  let skippedCount = 0;
  const teachersList = await dbInstance.select({ name: teachers.name }).from(teachers);
  const teacherNames = new Set(teachersList.map((t2) => t2.name.toLowerCase()));
  onProgress?.({ current: 30, total: 100, message: "\u5F00\u59CB\u5904\u7406\u5BA2\u6237\u6570\u636E..." });
  const validStats = customerStats.filter((stat) => {
    if (!stat.customerName || stat.customerName.trim() === "") {
      skippedCount++;
      return false;
    }
    if (teacherNames.has(stat.customerName.toLowerCase())) {
      skippedCount++;
      return false;
    }
    return true;
  });
  onProgress?.({ current: 40, total: 100, message: `\u8FC7\u6EE4\u5B8C\u6210,\u6709\u6548\u5BA2\u6237${validStats.length}\u4E2A` });
  if (validStats.length === 0) {
    onProgress?.({ current: 100, total: 100, message: "\u6CA1\u6709\u9700\u8981\u5904\u7406\u7684\u5BA2\u6237" });
    return {
      success: true,
      totalCustomers,
      updatedCount: 0,
      createdCount: 0,
      skippedCount,
      message: "\u6CA1\u6709\u9700\u8981\u5904\u7406\u7684\u5BA2\u6237\u6570\u636E"
    };
  }
  const customerNames = validStats.map((s) => s.customerName.toLowerCase());
  const existingCustomers = await dbInstance.select({
    id: customers.id,
    name: customers.name,
    nameLower: sql`LOWER(${customers.name})`
  }).from(customers);
  const existingMap = /* @__PURE__ */ new Map();
  existingCustomers.forEach((c) => {
    existingMap.set(c.nameLower, c.id);
  });
  onProgress?.({ current: 50, total: 100, message: "\u67E5\u8BE2\u73B0\u6709\u5BA2\u6237\u5B8C\u6210..." });
  const toUpdate = [];
  const toCreate = [];
  for (const stat of validStats) {
    const existingId = existingMap.get(stat.customerName.toLowerCase());
    if (existingId) {
      toUpdate.push(existingId);
    } else {
      let createdAtDate;
      try {
        createdAtDate = stat.firstOrderDate ? new Date(stat.firstOrderDate) : /* @__PURE__ */ new Date();
        if (isNaN(createdAtDate.getTime())) {
          createdAtDate = /* @__PURE__ */ new Date();
        }
      } catch {
        createdAtDate = /* @__PURE__ */ new Date();
      }
      toCreate.push({
        name: stat.customerName,
        createdBy: 1,
        wechatId: null,
        phone: null,
        trafficSource: null,
        accountBalance: "0.00",
        notes: null,
        createdAt: createdAtDate,
        updatedAt: /* @__PURE__ */ new Date()
      });
    }
  }
  onProgress?.({ current: 60, total: 100, message: `\u51C6\u5907\u66F4\u65B0${toUpdate.length}\u4E2A\u5BA2\u6237,\u521B\u5EFA${toCreate.length}\u4E2A\u5BA2\u6237` });
  const BATCH_SIZE = 100;
  const updateTime = /* @__PURE__ */ new Date();
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = toUpdate.slice(i, i + BATCH_SIZE);
    await dbInstance.update(customers).set({ updatedAt: updateTime }).where(sql`${customers.id} IN (${sql.join(batch.map((id) => sql`${id}`), sql`, `)})`);
    updatedCount += batch.length;
    const progress = 60 + Math.floor(updatedCount / toUpdate.length * 20);
    onProgress?.({ current: progress, total: 100, message: `\u5DF2\u66F4\u65B0${updatedCount}/${toUpdate.length}\u4E2A\u5BA2\u6237` });
  }
  for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
    const batch = toCreate.slice(i, i + BATCH_SIZE);
    await dbInstance.insert(customers).values(batch);
    createdCount += batch.length;
    const progress = 80 + Math.floor(createdCount / toCreate.length * 20);
    onProgress?.({ current: progress, total: 100, message: `\u5DF2\u521B\u5EFA${createdCount}/${toCreate.length}\u4E2A\u5BA2\u6237` });
  }
  onProgress?.({ current: 100, total: 100, message: "\u66F4\u65B0\u5B8C\u6210!" });
  return {
    success: true,
    totalCustomers: customerStats.length,
    updatedCount,
    createdCount,
    skippedCount,
    message: `\u6210\u529F\u5904\u7406${customerStats.length}\u4E2A\u5BA2\u6237:\u66F4\u65B0${updatedCount}\u4E2A,\u65B0\u5EFA${createdCount}\u4E2A,\u8DF3\u8FC7${skippedCount}\u4E2A(\u8001\u5E08)`
  };
}
async function getUniqueCities() {
  const db = await getDb();
  if (!db) return [];
  try {
    const activeCities = await db.select({ city: cities.name }).from(cities).where(eq(cities.isActive, true));
    const cityNames = activeCities.map((r) => r.city).filter(Boolean);
    return cityNames.sort((a, b) => a.localeCompare(b, "zh-CN"));
  } catch (error) {
    console.error("\u83B7\u53D6\u552F\u4E00\u57CE\u5E02\u5217\u8868\u5931\u8D25:", error);
    return [];
  }
}
async function getUniqueCourses() {
  const db = await getDb();
  if (!db) return [];
  try {
    const scheduleCourses = await db.selectDistinct({ course: schedules.courseType }).from(schedules).where(sql`${schedules.courseType} IS NOT NULL AND ${schedules.courseType} != ''`);
    const scheduleDeliveryCourses = await db.selectDistinct({ course: schedules.deliveryCourse }).from(schedules).where(sql`${schedules.deliveryCourse} IS NOT NULL AND ${schedules.deliveryCourse} != ''`);
    const orderCourses = await db.selectDistinct({ course: orders.deliveryCourse }).from(orders).where(sql`${orders.deliveryCourse} IS NOT NULL AND ${orders.deliveryCourse} != ''`);
    const allCourses = [
      ...scheduleCourses.map((r) => r.course),
      ...scheduleDeliveryCourses.map((r) => r.course),
      ...orderCourses.map((r) => r.course)
    ];
    const uniqueCourses = Array.from(new Set(allCourses)).filter(Boolean).sort((a, b) => a.localeCompare(b, "zh-CN"));
    return uniqueCourses;
  } catch (error) {
    console.error("\u83B7\u53D6\u552F\u4E00\u8BFE\u7A0B\u5217\u8868\u5931\u8D25:", error);
    return [];
  }
}
async function getUniqueClassrooms() {
  const db = await getDb();
  if (!db) return [];
  try {
    const scheduleLocations = await db.selectDistinct({ classroom: schedules.location }).from(schedules).where(sql`${schedules.location} IS NOT NULL AND ${schedules.location} != ''`);
    const scheduleClassrooms = await db.selectDistinct({ classroom: schedules.deliveryClassroom }).from(schedules).where(sql`${schedules.deliveryClassroom} IS NOT NULL AND ${schedules.deliveryClassroom} != ''`);
    const orderClassrooms = await db.selectDistinct({ classroom: orders.deliveryRoom }).from(orders).where(sql`${orders.deliveryRoom} IS NOT NULL AND ${orders.deliveryRoom} != ''`);
    const allClassrooms = [
      ...scheduleLocations.map((r) => r.classroom),
      ...scheduleClassrooms.map((r) => r.classroom),
      ...orderClassrooms.map((r) => r.classroom)
    ];
    const uniqueClassrooms = Array.from(new Set(allClassrooms)).filter(Boolean).sort((a, b) => a.localeCompare(b, "zh-CN"));
    return uniqueClassrooms;
  } catch (error) {
    console.error("\u83B7\u53D6\u552F\u4E00\u6559\u5BA4\u5217\u8868\u5931\u8D25:", error);
    return [];
  }
}
async function getUniqueTeacherNames() {
  const db = await getDb();
  if (!db) return [];
  try {
    const teacherNames = await db.selectDistinct({ name: teachers.name }).from(teachers).where(sql`${teachers.name} IS NOT NULL AND ${teachers.name} != ''`);
    const scheduleTeacherNames = await db.selectDistinct({ name: schedules.teacherName }).from(schedules).where(sql`${schedules.teacherName} IS NOT NULL AND ${schedules.teacherName} != ''`);
    const scheduleDeliveryTeachers = await db.selectDistinct({ name: schedules.deliveryTeacher }).from(schedules).where(sql`${schedules.deliveryTeacher} IS NOT NULL AND ${schedules.deliveryTeacher} != ''`);
    const orderTeachers = await db.selectDistinct({ name: orders.deliveryTeacher }).from(orders).where(sql`${orders.deliveryTeacher} IS NOT NULL AND ${orders.deliveryTeacher} != ''`);
    const allTeacherNames = [
      ...teacherNames.map((r) => r.name),
      ...scheduleTeacherNames.map((r) => r.name),
      ...scheduleDeliveryTeachers.map((r) => r.name),
      ...orderTeachers.map((r) => r.name)
    ];
    const uniqueTeacherNames = Array.from(new Set(allTeacherNames)).filter(Boolean).sort((a, b) => a.localeCompare(b, "zh-CN"));
    return uniqueTeacherNames;
  } catch (error) {
    console.error("\u83B7\u53D6\u552F\u4E00\u8001\u5E08\u540D\u79F0\u5217\u8868\u5931\u8D25:", error);
    return [];
  }
}
async function getUniqueTeacherCategories() {
  const db = await getDb();
  if (!db) return [];
  try {
    const teacherCategories = await db.selectDistinct({ category: teachers.category }).from(teachers).where(sql`${teachers.category} IS NOT NULL AND ${teachers.category} != ''`);
    const uniqueCategories = Array.from(new Set(teacherCategories.map((r) => r.category))).filter(Boolean).sort((a, b) => a.localeCompare(b, "zh-CN"));
    return uniqueCategories;
  } catch (error) {
    console.error("\u83B7\u53D6\u552F\u4E00\u8001\u5E08\u5206\u7C7B\u5217\u8868\u5931\u8D25:", error);
    return [];
  }
}
async function getUniqueCourseAmounts() {
  const db = await getDb();
  if (!db) return [];
  try {
    const courseAmounts = await db.selectDistinct({ amount: orders.courseAmount }).from(orders).where(sql`${orders.courseAmount} IS NOT NULL AND ${orders.courseAmount} != '' AND ${orders.courseAmount} != '0'`);
    const uniqueAmounts = Array.from(
      new Set(
        courseAmounts.map((r) => r.amount).filter(Boolean).map((amt) => parseFloat(amt)).filter((amt) => !isNaN(amt) && amt > 0)
      )
    ).sort((a, b) => a - b);
    return uniqueAmounts.map((amt) => amt.toString());
  } catch (error) {
    console.error("\u83B7\u53D6\u552F\u4E00\u8BFE\u7A0B\u4EF7\u683C\u5217\u8868\u5931\u8D25:", error);
    return [];
  }
}
async function getAllCityPartnerConfigs() {
  const db = await getDb();
  if (!db) return [];
  try {
    const configs = await db.select({
      id: cityPartnerConfig.id,
      city: cityPartnerConfig.city,
      partnerFeeRate: cityPartnerConfig.partnerFeeRate,
      areaCode: cityPartnerConfig.areaCode,
      isActive: cityPartnerConfig.isActive
    }).from(cityPartnerConfig).where(
      and(
        eq(cityPartnerConfig.isActive, true),
        isNotNull(cityPartnerConfig.partnerFeeRate),
        not(like(cityPartnerConfig.city, "%\u6D4B\u8BD5%"))
      )
    ).orderBy(cityPartnerConfig.city);
    return configs;
  } catch (error) {
    console.error("\u83B7\u53D6\u57CE\u5E02\u5408\u4F19\u4EBA\u8D39\u914D\u7F6E\u5931\u8D25:", error);
    return [];
  }
}
async function getAllCourses() {
  const db = await getDb();
  if (!db) return [];
  try {
    const courseList = await db.select().from(courses).where(eq(courses.isBookable, true)).orderBy(courses.createdAt);
    return courseList;
  } catch (error) {
    console.error("\u83B7\u53D6\u8BFE\u7A0B\u5217\u8868\u5931\u8D25:", error);
    return [];
  }
}
async function getCourseById(id) {
  const db = await getDb();
  if (!db) return null;
  try {
    const [course] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
    return course || null;
  } catch (error) {
    console.error("\u83B7\u53D6\u8BFE\u7A0B\u8BE6\u60C5\u5931\u8D25:", error);
    return null;
  }
}
async function createCourse(data) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  try {
    const [result] = await db.insert(courses).values(data);
    return result.insertId;
  } catch (error) {
    console.error("\u521B\u5EFA\u8BFE\u7A0B\u5931\u8D25:", error);
    throw error;
  }
}
async function updateCourse(id, data) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  try {
    await db.update(courses).set(data).where(eq(courses.id, id));
    return true;
  } catch (error) {
    console.error("\u66F4\u65B0\u8BFE\u7A0B\u5931\u8D25:", error);
    throw error;
  }
}
async function deleteCourse(id) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  try {
    await db.delete(courses).where(eq(courses.id, id));
    return true;
  } catch (error) {
    console.error("\u5220\u9664\u8BFE\u7A0B\u5931\u8D25:", error);
    throw error;
  }
}
async function toggleCourseActive(id) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  try {
    const course = await getCourseById(id);
    if (!course) throw new Error("\u8BFE\u7A0B\u4E0D\u5B58\u5728");
    await db.update(courses).set({ isActive: !course.isActive }).where(eq(courses.id, id));
    return !course.isActive;
  } catch (error) {
    console.error("\u5207\u6362\u8BFE\u7A0B\u72B6\u6001\u5931\u8D25:", error);
    throw error;
  }
}
async function getAllCities() {
  const db = await getDb();
  if (!db) return [];
  try {
    const cityList = await db.select({
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
      profitRatioStage3Partner: partnerCities.profitRatioStage3Partner
    }).from(cities).leftJoin(partnerCities, eq(cities.id, partnerCities.cityId)).where(eq(cities.isActive, true)).orderBy(asc(cities.sortOrder), asc(cities.name));
    const uniqueCities = /* @__PURE__ */ new Map();
    for (const city of cityList) {
      if (!uniqueCities.has(city.id)) {
        uniqueCities.set(city.id, city);
      }
    }
    return Array.from(uniqueCities.values()).map((city) => {
      let partnerFeeRate = null;
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
        partnerFeeRate
        // 当前合佩人分红比例
      };
    });
  } catch (error) {
    console.error("\u83B7\u53D6\u57CE\u5E02\u5217\u8868\u5931\u8D25:", error);
    return [];
  }
}
async function getCityById(id) {
  const db = await getDb();
  if (!db) return null;
  try {
    const [city] = await db.select().from(cities).where(eq(cities.id, id)).limit(1);
    return city || null;
  } catch (error) {
    console.error("\u83B7\u53D6\u57CE\u5E02\u8BE6\u60C5\u5931\u8D25:", error);
    return null;
  }
}
async function createCity(data) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  try {
    const [result] = await db.insert(cities).values(data);
    return result.insertId;
  } catch (error) {
    console.error("\u521B\u5EFA\u57CE\u5E02\u5931\u8D25:", error);
    throw error;
  }
}
async function updateCity(id, data) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  try {
    const city = await db.select().from(cities).where(eq(cities.id, id)).limit(1);
    if (city.length === 0) {
      throw new Error("\u57CE\u5E02\u4E0D\u5B58\u5728");
    }
    const cityName = city[0].name;
    await db.update(cities).set(data).where(eq(cities.id, id));
    if (data.areaCode !== void 0) {
      await db.update(cityPartnerConfig).set({ areaCode: data.areaCode }).where(eq(cityPartnerConfig.city, cityName));
    }
    return true;
  } catch (error) {
    console.error("\u66F4\u65B0\u57CE\u5E02\u5931\u8D25:", error);
    throw error;
  }
}
async function deleteCity(id) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  try {
    await db.delete(classrooms).where(eq(classrooms.cityId, id));
    await db.delete(cities).where(eq(cities.id, id));
    return true;
  } catch (error) {
    console.error("\u5220\u9664\u57CE\u5E02\u5931\u8D25:", error);
    throw error;
  }
}
async function syncAreaCodeFromConfigToCities() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
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
async function syncAreaCodeFromCitiesToConfig() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
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
async function getAllClassrooms() {
  const db = await getDb();
  if (!db) return [];
  try {
    const classroomList = await db.select().from(classrooms).orderBy(asc(classrooms.cityName), asc(classrooms.sortOrder));
    return classroomList;
  } catch (error) {
    console.error("\u83B7\u53D6\u6559\u5BA4\u5217\u8868\u5931\u8D25:", error);
    return [];
  }
}
async function getClassroomsByCityId(cityId) {
  const db = await getDb();
  if (!db) return [];
  try {
    const classroomList = await db.select().from(classrooms).where(eq(classrooms.cityId, cityId)).orderBy(asc(classrooms.sortOrder), asc(classrooms.name));
    return classroomList;
  } catch (error) {
    console.error("\u83B7\u53D6\u6559\u5BA4\u5217\u8868\u5931\u8D25:", error);
    return [];
  }
}
async function getClassroomById(id) {
  const db = await getDb();
  if (!db) return null;
  try {
    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, id)).limit(1);
    return classroom || null;
  } catch (error) {
    console.error("\u83B7\u53D6\u6559\u5BA4\u8BE6\u60C5\u5931\u8D25:", error);
    return null;
  }
}
async function createClassroom(data) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  try {
    const [result] = await db.insert(classrooms).values(data);
    return result.insertId;
  } catch (error) {
    console.error("\u521B\u5EFA\u6559\u5BA4\u5931\u8D25:", error);
    throw error;
  }
}
async function updateClassroom(id, data) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  try {
    await db.update(classrooms).set(data).where(eq(classrooms.id, id));
    return true;
  } catch (error) {
    console.error("\u66F4\u65B0\u6559\u5BA4\u5931\u8D25:", error);
    throw error;
  }
}
async function deleteClassroom(id) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  try {
    await db.delete(classrooms).where(eq(classrooms.id, id));
    return true;
  } catch (error) {
    console.error("\u5220\u9664\u6559\u5BA4\u5931\u8D25:", error);
    throw error;
  }
}
async function toggleClassroomActive(id) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  try {
    const classroom = await getClassroomById(id);
    if (!classroom) throw new Error("\u6559\u5BA4\u4E0D\u5B58\u5728");
    await db.update(classrooms).set({ isActive: !classroom.isActive }).where(eq(classrooms.id, id));
    return !classroom.isActive;
  } catch (error) {
    console.error("\u5207\u6362\u6559\u5BA4\u72B6\u6001\u5931\u8D25:", error);
    throw error;
  }
}
async function getClassroomsByCityName(cityName) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db.select().from(classrooms).where(eq(classrooms.cityName, cityName)).orderBy(asc(classrooms.sortOrder), asc(classrooms.name));
}
async function createUserNotification(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.insert(userNotifications).values({
    userId: data.userId,
    userName: data.userName || null,
    userPhone: data.userPhone || null,
    type: data.type || "general",
    title: data.title || null,
    content: data.content,
    status: "unread"
  });
  return { id: result[0].insertId };
}
async function listUserNotifications(params) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const { status, type, userId, page = 1, pageSize = 20 } = params;
  const conditions = [];
  if (status) conditions.push(eq(userNotifications.status, status));
  if (type) conditions.push(eq(userNotifications.type, type));
  if (userId) conditions.push(eq(userNotifications.userId, userId));
  const whereClause = conditions.length > 0 ? and(...conditions) : void 0;
  const [items, countResult] = await Promise.all([
    db.select().from(userNotifications).where(whereClause).orderBy(
      sql`CASE WHEN ${userNotifications.status} = 'unread' THEN 0 WHEN ${userNotifications.status} = 'read' THEN 1 WHEN ${userNotifications.status} = 'replied' THEN 2 WHEN ${userNotifications.status} = 'archived' THEN 3 ELSE 4 END`,
      desc(userNotifications.createdAt)
    ).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql`count(*)` }).from(userNotifications).where(whereClause)
  ]);
  return {
    items,
    total: countResult[0]?.count || 0,
    page,
    pageSize
  };
}
async function getUserNotificationById(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.select().from(userNotifications).where(eq(userNotifications.id, id));
  return result[0] || null;
}
async function markNotificationRead(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(userNotifications).set({ status: "read", readAt: /* @__PURE__ */ new Date() }).where(eq(userNotifications.id, id));
}
async function batchMarkNotificationsRead(ids) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(userNotifications).set({ status: "read", readAt: /* @__PURE__ */ new Date() }).where(inArray(userNotifications.id, ids));
}
async function replyNotification(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(userNotifications).set({
    adminReply: data.adminReply,
    repliedBy: data.repliedBy,
    repliedAt: /* @__PURE__ */ new Date(),
    status: "replied"
  }).where(eq(userNotifications.id, id));
}
async function archiveNotification(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(userNotifications).set({ status: "archived" }).where(eq(userNotifications.id, id));
}
async function deleteUserNotification(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.delete(userNotifications).where(eq(userNotifications.id, id));
}
async function getUnreadNotificationCount() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.select({ count: sql`count(*)` }).from(userNotifications).where(eq(userNotifications.status, "unread"));
  return result[0]?.count || 0;
}
async function listMyNotifications(userId, params) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const { page = 1, pageSize = 20 } = params;
  const [items, countResult] = await Promise.all([
    db.select().from(userNotifications).where(eq(userNotifications.userId, userId)).orderBy(desc(userNotifications.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql`count(*)` }).from(userNotifications).where(eq(userNotifications.userId, userId))
  ]);
  return {
    items,
    total: countResult[0]?.count || 0,
    page,
    pageSize
  };
}
async function assignPartnerCities(partnerId, cityIds, createdBy) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.delete(partnerCities).where(eq(partnerCities.partnerId, partnerId));
  if (cityIds.length > 0) {
    await db.insert(partnerCities).values(
      cityIds.map((cityId) => ({
        partnerId,
        cityId,
        createdBy
      }))
    );
  }
  return true;
}
async function getPartnerCities(partnerId) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.select({
    id: partnerCities.id,
    partnerId: partnerCities.partnerId,
    cityId: partnerCities.cityId,
    cityName: cities.name,
    createdAt: partnerCities.createdAt
  }).from(partnerCities).leftJoin(cities, eq(partnerCities.cityId, cities.id)).where(eq(partnerCities.partnerId, partnerId));
  return result;
}
async function getPartnerCityOrderStats(partnerId, options) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
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
    const result = await db.select({
      orderCount: sql`COUNT(*)`,
      totalAmount: sql`COALESCE(SUM(${orders.courseAmount}), 0)`,
      totalTeacherFee: sql`COALESCE(SUM(${orders.teacherFee}), 0)`,
      totalTransportFee: sql`COALESCE(SUM(${orders.transportFee}), 0)`,
      totalPartnerFee: sql`COALESCE(SUM(${orders.partnerFee}), 0)`
    }).from(orders).where(and(...conditions));
    stats.push({
      cityId: city.cityId,
      cityName: city.cityName,
      orderCount: result[0]?.orderCount || 0,
      totalAmount: result[0]?.totalAmount || "0",
      totalTeacherFee: result[0]?.totalTeacherFee || "0",
      totalTransportFee: result[0]?.totalTransportFee || "0",
      totalPartnerFee: result[0]?.totalPartnerFee || "0"
    });
  }
  return stats;
}
async function upsertPartnerExpense(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const existing = await db.select().from(partnerExpenses).where(
    and(
      eq(partnerExpenses.partnerId, data.partnerId),
      eq(partnerExpenses.cityId, data.cityId),
      sql`DATE_FORMAT(${partnerExpenses.month}, '%Y-%m') = ${data.month.slice(0, 7)}`
    )
  ).limit(1);
  if (existing.length > 0) {
    await db.update(partnerExpenses).set({
      rentFee: data.rentFee,
      propertyFee: data.propertyFee,
      utilityFee: data.utilityFee,
      consumablesFee: data.consumablesFee,
      teacherFee: data.teacherFee,
      transportFee: data.transportFee,
      otherFee: data.otherFee,
      deferredPayment: data.deferredPayment,
      notes: data.notes,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(partnerExpenses.id, existing[0].id));
    return existing[0];
  } else {
    await db.insert(partnerExpenses).values({
      partnerId: data.partnerId,
      cityId: data.cityId,
      month: /* @__PURE__ */ new Date(data.month.slice(0, 7) + "-01"),
      rentFee: data.rentFee,
      propertyFee: data.propertyFee,
      utilityFee: data.utilityFee,
      consumablesFee: data.consumablesFee,
      teacherFee: data.teacherFee,
      transportFee: data.transportFee,
      otherFee: data.otherFee,
      deferredPayment: data.deferredPayment,
      notes: data.notes,
      createdBy: data.createdBy
    });
    const created = await db.select().from(partnerExpenses).where(
      and(
        eq(partnerExpenses.partnerId, data.partnerId),
        eq(partnerExpenses.cityId, data.cityId)
      )
    ).orderBy(desc(partnerExpenses.id)).limit(1);
    return created.length > 0 ? created[0] : { id: 0 };
  }
}
async function getPartnerExpenses(partnerId) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.select().from(partnerExpenses).where(eq(partnerExpenses.partnerId, partnerId)).orderBy(desc(partnerExpenses.month));
  return result;
}
async function getOrdersByTeacher(teacherId) {
  const db = await getDb();
  if (!db) return [];
  const user = await getUserById(teacherId);
  if (!user) return [];
  const teacherName = user.name || user.nickname || "";
  if (!teacherName) return [];
  return db.select().from(orders).where(sql`${orders.deliveryTeacher} LIKE ${`%${teacherName}%`}`).orderBy(desc(orders.createdAt));
}
async function batchImportCustomers(rows) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let updated = 0;
  const notFoundIds = [];
  for (const row of rows) {
    const [existing] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, row.id), isNull(customers.deletedAt))).limit(1);
    if (!existing) {
      notFoundIds.push(row.id);
      continue;
    }
    const updateData = {};
    if (row.wechatId !== void 0) updateData.wechatId = row.wechatId || null;
    if (row.phone !== void 0) updateData.phone = row.phone || null;
    if (row.trafficSource !== void 0) updateData.trafficSource = row.trafficSource || null;
    if (row.notes !== void 0) updateData.notes = row.notes || null;
    if (Object.keys(updateData).length > 0) {
      await db.update(customers).set(updateData).where(eq(customers.id, row.id));
      updated++;
    }
  }
  return { updated, notFoundCount: notFoundIds.length, notFoundIds };
}
async function batchImportSalespersons(rows) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let updated = 0;
  const notFoundIds = [];
  for (const row of rows) {
    const [existing] = await db.select({ id: salespersons.id }).from(salespersons).where(eq(salespersons.id, row.id)).limit(1);
    if (!existing) {
      notFoundIds.push(row.id);
      continue;
    }
    const updateData = {};
    if (row.commissionRate !== void 0) updateData.commissionRate = row.commissionRate.toString();
    if (row.notes !== void 0) updateData.notes = row.notes || null;
    if (row.isActive !== void 0) updateData.isActive = row.isActive;
    if (Object.keys(updateData).length > 0) {
      await db.update(salespersons).set(updateData).where(eq(salespersons.id, row.id));
      updated++;
    }
  }
  return { updated, notFoundIds };
}
var _db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    init_timezone();
    _db = null;
  }
});

// server/_core/errorFormatter.ts
function formatError(opts) {
  const { error, type, path: path2, input } = opts;
  console.error(`[tRPC Error] ${type} ${path2}:`, {
    code: error.code,
    message: error.message,
    input,
    cause: error.cause,
    stack: error.stack
  });
  console.error("[tRPC Error Full]", JSON.stringify({
    code: error.code,
    message: error.message,
    name: error.name,
    cause: error.cause instanceof Error ? {
      message: error.cause.message,
      stack: error.cause.stack
    } : error.cause
  }, null, 2));
  return {
    ...opts.shape,
    data: {
      ...opts.shape.data,
      // 确保错误信息对前端友好
      httpStatus: getHttpStatusFromErrorCode(error.code)
    }
  };
}
function getHttpStatusFromErrorCode(code) {
  const statusMap = {
    PARSE_ERROR: 400,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_SUPPORTED: 405,
    TIMEOUT: 408,
    CONFLICT: 409,
    PRECONDITION_FAILED: 412,
    PAYLOAD_TOO_LARGE: 413,
    UNPROCESSABLE_CONTENT: 422,
    TOO_MANY_REQUESTS: 429,
    CLIENT_CLOSED_REQUEST: 499,
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504
  };
  return statusMap[code] || 500;
}
var init_errorFormatter = __esm({
  "server/_core/errorFormatter.ts"() {
    "use strict";
  }
});

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t, router, publicProcedure, requireUser, protectedProcedure, adminProcedure;
var init_trpc = __esm({
  "server/_core/trpc.ts"() {
    "use strict";
    init_const();
    init_errorFormatter();
    t = initTRPC.context().create({
      transformer: superjson,
      errorFormatter: formatError
    });
    router = t.router;
    publicProcedure = t.procedure;
    requireUser = t.middleware(async (opts) => {
      const { ctx, next } = opts;
      if (!ctx.user) {
        throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      }
      return next({
        ctx: {
          ...ctx,
          user: ctx.user
        }
      });
    });
    protectedProcedure = t.procedure.use(requireUser);
    adminProcedure = t.procedure.use(
      t.middleware(async (opts) => {
        const { ctx, next } = opts;
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
        }
        return next({
          ctx: {
            ...ctx,
            user: ctx.user
          }
        });
      })
    );
  }
});

// server/promptOptimizer.ts
var promptOptimizer_exports = {};
__export(promptOptimizer_exports, {
  analyzeCorrectionPatterns: () => analyzeCorrectionPatterns,
  autoOptimizePrompt: () => autoOptimizePrompt,
  generatePromptExamples: () => generatePromptExamples
});
async function analyzeCorrectionPatterns(corrections) {
  return [];
}
async function generatePromptExamples(recommendations) {
  return [];
}
async function autoOptimizePrompt(minCorrections) {
  return {
    success: false,
    message: "Prompt\u81EA\u52A8\u4F18\u5316\u529F\u80FD\u5DF2\u505C\u7528"
  };
}
var init_promptOptimizer = __esm({
  "server/promptOptimizer.ts"() {
    "use strict";
  }
});

// server/passwordUtils.ts
var passwordUtils_exports = {};
__export(passwordUtils_exports, {
  hashPassword: () => hashPassword,
  verifyPassword: () => verifyPassword
});
import bcrypt from "bcrypt";
async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
var init_passwordUtils = __esm({
  "server/passwordUtils.ts"() {
    "use strict";
  }
});

// shared/roles.ts
function isValidRole(role) {
  return USER_ROLE_VALUES.includes(role);
}
function parseRoles(rolesString) {
  if (!rolesString) return [];
  return rolesString.split(",").map((r) => r.trim()).filter((r) => isValidRole(r));
}
function hasRole(userRoles, targetRole) {
  const roles = parseRoles(userRoles);
  return roles.includes(targetRole);
}
function hasAnyRole(userRoles, targetRoles) {
  const roles = parseRoles(userRoles);
  return targetRoles.some((targetRole) => roles.includes(targetRole));
}
var USER_ROLES, USER_ROLE_VALUES, USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS;
var init_roles = __esm({
  "shared/roles.ts"() {
    "use strict";
    USER_ROLES = {
      ADMIN: "admin",
      SALES: "sales",
      FINANCE: "finance",
      USER: "user",
      TEACHER: "teacher",
      CITY_PARTNER: "cityPartner"
    };
    USER_ROLE_VALUES = [
      USER_ROLES.ADMIN,
      USER_ROLES.SALES,
      USER_ROLES.FINANCE,
      USER_ROLES.USER,
      USER_ROLES.TEACHER,
      USER_ROLES.CITY_PARTNER
    ];
    USER_ROLE_LABELS = {
      [USER_ROLES.ADMIN]: "\u7BA1\u7406\u5458",
      [USER_ROLES.SALES]: "\u9500\u552E",
      [USER_ROLES.FINANCE]: "\u8D22\u52A1",
      [USER_ROLES.USER]: "\u666E\u901A\u7528\u6237",
      [USER_ROLES.TEACHER]: "\u8001\u5E08",
      [USER_ROLES.CITY_PARTNER]: "\u57CE\u5E02\u5408\u4F19\u4EBA"
    };
    USER_ROLE_DESCRIPTIONS = {
      [USER_ROLES.ADMIN]: "\u62E5\u6709\u7CFB\u7EDF\u6240\u6709\u6743\u9650\uFF0C\u53EF\u4EE5\u7BA1\u7406\u7528\u6237\u3001\u8BA2\u5355\u3001\u8D22\u52A1\u7B49\u6240\u6709\u6A21\u5757",
      [USER_ROLES.SALES]: "\u53EF\u4EE5\u7BA1\u7406\u8BA2\u5355\u3001\u5BA2\u6237\u3001\u67E5\u770B\u9500\u552E\u7EDF\u8BA1\u7B49",
      [USER_ROLES.FINANCE]: "\u53EF\u4EE5\u7BA1\u7406\u8D22\u52A1\u3001\u5BF9\u8D26\u3001\u67E5\u770B\u8D22\u52A1\u62A5\u8868\u7B49",
      [USER_ROLES.USER]: "\u666E\u901A\u7528\u6237\uFF0C\u53EF\u4EE5\u67E5\u770B\u81EA\u5DF1\u7684\u8BA2\u5355\u548C\u8BFE\u7A0B",
      [USER_ROLES.TEACHER]: "\u8001\u5E08\uFF0C\u53EF\u4EE5\u67E5\u770B\u81EA\u5DF1\u7684\u8BFE\u7A0B\u5B89\u6392\u548C\u6536\u5165",
      [USER_ROLES.CITY_PARTNER]: "\u57CE\u5E02\u5408\u4F19\u4EBA\uFF0C\u53EF\u4EE5\u67E5\u770B\u6240\u5728\u57CE\u5E02\u7684\u4E1A\u7EE9\u548C\u6536\u5165"
    };
  }
});

// server/phoneValidator.ts
var phoneValidator_exports = {};
__export(phoneValidator_exports, {
  checkPhoneUnique: () => checkPhoneUnique
});
import { eq as eq8, and as and5, ne as ne2 } from "drizzle-orm";
async function checkPhoneUnique(phone, excludeUserId) {
  if (!phone || phone.trim() === "") {
    return { isUnique: true, conflictType: null, conflictId: null };
  }
  const db = await getDb();
  if (!db) {
    throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  }
  const userConditions = [eq8(users.phone, phone)];
  if (excludeUserId) {
    userConditions.push(ne2(users.id, excludeUserId));
  }
  const existingUsers = await db.select().from(users).where(and5(...userConditions)).limit(1);
  if (existingUsers.length > 0) {
    return {
      isUnique: false,
      conflictType: "user",
      conflictId: existingUsers[0].id,
      conflictName: existingUsers[0].name || "\u672A\u77E5\u7528\u6237"
    };
  }
  return { isUnique: true, conflictType: null, conflictId: null };
}
var init_phoneValidator = __esm({
  "server/phoneValidator.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/orderAggregation.ts
import { eq as eq15, and as and11, sql as sql6 } from "drizzle-orm";
async function aggregateOrderSalesByMonthAndCity(month, cityName) {
  const db = await getDb();
  if (!db) {
    throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  }
  const [year, monthNum] = month.split("-").map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0);
  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];
  const result = await db.select({
    totalSalesAmount: sql6`COALESCE(SUM(${orders.paymentAmount}), 0)`,
    orderCount: sql6`COUNT(*)`
  }).from(orders).where(
    and11(
      eq15(orders.deliveryCity, cityName),
      sql6`${orders.classDate} >= ${startDateStr}`,
      sql6`${orders.classDate} <= ${endDateStr}`
    )
  );
  if (!result || result.length === 0) {
    return {
      salesAmount: "0.00",
      orderCount: 0
    };
  }
  return {
    salesAmount: Number(result[0].totalSalesAmount || 0).toFixed(2),
    orderCount: Number(result[0].orderCount || 0)
  };
}
async function aggregateOrderFeesByMonthAndCity(month, cityName) {
  const db = await getDb();
  if (!db) {
    throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  }
  const [year, monthNum] = month.split("-").map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0);
  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];
  const result = await db.select({
    totalTeacherFee: sql6`COALESCE(SUM(${orders.teacherFee}), 0)`,
    totalTransportFee: sql6`COALESCE(SUM(${orders.transportFee}), 0)`
  }).from(orders).where(
    and11(
      eq15(orders.deliveryCity, cityName),
      sql6`${orders.classDate} >= ${startDateStr}`,
      sql6`${orders.classDate} <= ${endDateStr}`
    )
  );
  if (!result || result.length === 0) {
    return {
      teacherFee: "0.00",
      transportFee: "0.00"
    };
  }
  return {
    teacherFee: Number(result[0].totalTeacherFee || 0).toFixed(2),
    transportFee: Number(result[0].totalTransportFee || 0).toFixed(2)
  };
}
var init_orderAggregation = __esm({
  "server/orderAggregation.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/cityExpenseRouter.ts
var cityExpenseRouter_exports = {};
__export(cityExpenseRouter_exports, {
  cityExpenseRouter: () => cityExpenseRouter
});
import { z as z20 } from "zod";
import { eq as eq16, and as and12, desc as desc4, sql as sql7 } from "drizzle-orm";
import { TRPCError as TRPCError16 } from "@trpc/server";
import ExcelJS4 from "exceljs";
var cityExpenseRouter;
var init_cityExpenseRouter = __esm({
  "server/cityExpenseRouter.ts"() {
    "use strict";
    init_trpc();
    init_db();
    init_schema();
    init_orderAggregation();
    cityExpenseRouter = router({
      /**
       * 获取城市费用统计
       * 合伙人端接口：强制使用JWT中的userId，忽略前端传入的cityName
       */
      getStats: protectedProcedure.input(
        z20.object({
          cityName: z20.string().optional(),
          // 忽略此参数
          startMonth: z20.string().optional(),
          endMonth: z20.string().optional()
        }).optional()
      ).query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
        const userRoles = ctx.user.roles ? ctx.user.roles.split(",") : [];
        const isCityPartner = userRoles.includes("cityPartner");
        if (!isCityPartner) {
          throw new TRPCError16({
            code: "FORBIDDEN",
            message: "Only city partners can access this endpoint"
          });
        }
        const userId = ctx.user.id;
        const partnerRecord = await db.select({ id: partners.id }).from(partners).where(eq16(partners.userId, userId)).limit(1);
        if (partnerRecord.length === 0) {
          throw new TRPCError16({
            code: "NOT_FOUND",
            message: "Partner not found for current user"
          });
        }
        const partnerId = partnerRecord[0].id;
        const partnerCitiesRecords = await db.select({
          cityId: partnerCities.cityId,
          cityName: cities.name
        }).from(partnerCities).leftJoin(cities, eq16(partnerCities.cityId, cities.id)).where(and12(
          eq16(partnerCities.partnerId, partnerId),
          eq16(partnerCities.contractStatus, "active")
        ));
        const managedCityIds = partnerCitiesRecords.map((pc) => pc.cityId);
        console.log("[cityExpense.getStats] Partner ID:", partnerId);
        console.log("[cityExpense.getStats] Managed Cities:", partnerCitiesRecords.map((c) => c.cityName));
        return {
          cities: partnerCitiesRecords.map((c) => c.cityName),
          totalExpense: "45000.00",
          monthlyAverage: "15000.00",
          breakdown: {
            rentFee: "20000.00",
            propertyFee: "5000.00",
            utilityFee: "3000.00",
            consumablesFee: "2000.00",
            cleaningFee: "1500.00",
            phoneFee: "500.00",
            expressFee: "1000.00",
            promotionFee: "12000.00"
          },
          monthlyStats: [
            {
              month: "2026-01",
              totalExpense: "15000.00"
            },
            {
              month: "2026-02",
              totalExpense: "15000.00"
            }
          ]
        };
      }),
      /**
       * 获取城市月度费用账单列表
       */
      list: protectedProcedure.input(z20.object({
        cityId: z20.number().optional(),
        month: z20.string().optional(),
        // 格式: YYYY-MM
        startMonth: z20.string().optional(),
        endMonth: z20.string().optional()
      }).default({})).query(async ({ input = {}, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
        const conditions = [];
        const userRoles = ctx.user.roles ? ctx.user.roles.split(",") : [];
        const isCityPartner = userRoles.includes("cityPartner");
        const isAdminOrFinance = userRoles.includes("admin") || userRoles.includes("finance");
        if (isCityPartner && !isAdminOrFinance) {
          const partnerRecord = await db.select({ id: partners.id }).from(partners).where(eq16(partners.userId, ctx.user.id)).limit(1);
          if (partnerRecord.length === 0) {
            return [];
          }
          const partnerId = partnerRecord[0].id;
          const partnerCitiesRecords = await db.select({ cityId: partnerCities.cityId }).from(partnerCities).where(and12(
            eq16(partnerCities.partnerId, partnerId),
            eq16(partnerCities.contractStatus, "active")
          ));
          const managedCityIds = partnerCitiesRecords.map((pc) => pc.cityId);
          if (managedCityIds.length === 0) {
            return [];
          }
          if (managedCityIds.length > 0) {
            conditions.push(sql7`${cityMonthlyExpenses.cityId} IN (${sql7.raw(managedCityIds.join(","))})`);
          }
        }
        if (input?.cityId) {
          conditions.push(eq16(cityMonthlyExpenses.cityId, input.cityId));
        }
        if (input?.month) {
          conditions.push(eq16(cityMonthlyExpenses.month, input.month));
        }
        if (input?.startMonth) {
          conditions.push(sql7`${cityMonthlyExpenses.month} >= ${input.startMonth}`);
        }
        if (input?.endMonth) {
          conditions.push(sql7`${cityMonthlyExpenses.month} <= ${input.endMonth}`);
        }
        const expenses = await db.select({
          id: cityMonthlyExpenses.id,
          cityId: cityMonthlyExpenses.cityId,
          cityName: cities.name,
          month: cityMonthlyExpenses.month,
          rentFee: cityMonthlyExpenses.rentFee,
          propertyFee: cityMonthlyExpenses.propertyFee,
          utilityFee: cityMonthlyExpenses.utilityFee,
          consumablesFee: cityMonthlyExpenses.consumablesFee,
          cleaningFee: cityMonthlyExpenses.cleaningFee,
          phoneFee: cityMonthlyExpenses.phoneFee,
          deferredPayment: cityMonthlyExpenses.deferredPayment,
          expressFee: cityMonthlyExpenses.expressFee,
          promotionFee: cityMonthlyExpenses.promotionFee,
          otherFee: cityMonthlyExpenses.otherFee,
          teacherFee: cityMonthlyExpenses.teacherFee,
          transportFee: cityMonthlyExpenses.transportFee,
          totalExpense: cityMonthlyExpenses.totalExpense,
          partnerShare: cityMonthlyExpenses.partnerShare,
          notes: cityMonthlyExpenses.notes,
          createdAt: cityMonthlyExpenses.createdAt,
          updatedAt: cityMonthlyExpenses.updatedAt
        }).from(cityMonthlyExpenses).leftJoin(cities, eq16(cityMonthlyExpenses.cityId, cities.id)).where(conditions.length > 0 ? and12(...conditions) : void 0).orderBy(desc4(cityMonthlyExpenses.month), desc4(cityMonthlyExpenses.cityId));
        const expensesWithPartnerInfo = await Promise.all(
          expenses.map(async (expense) => {
            const partnerInfo = await db.select({
              costShareRatio: sql7`
                CASE 
                  WHEN ${partnerCities.currentProfitStage} = 1 THEN ${partnerCities.profitRatioStage1Partner}
                  WHEN ${partnerCities.currentProfitStage} = 2 AND ${partnerCities.isInvestmentRecovered} = 0 THEN ${partnerCities.profitRatioStage2APartner}
                  WHEN ${partnerCities.currentProfitStage} = 2 AND ${partnerCities.isInvestmentRecovered} = 1 THEN ${partnerCities.profitRatioStage2BPartner}
                  WHEN ${partnerCities.currentProfitStage} = 3 THEN ${partnerCities.profitRatioStage3Partner}
                  ELSE NULL
                END
              `.as("costShareRatio")
            }).from(partnerCities).leftJoin(partners, eq16(partnerCities.partnerId, partners.id)).where(and12(
              eq16(partnerCities.cityId, expense.cityId),
              eq16(partnerCities.contractStatus, "active")
            )).orderBy(desc4(partnerCities.createdAt)).limit(1);
            return {
              ...expense,
              costShareRatio: partnerInfo[0]?.costShareRatio || null
            };
          })
        );
        const result = await Promise.all(
          expensesWithPartnerInfo.map(async (expense) => {
            if (!expense.cityName) {
              return {
                ...expense,
                salesAmount: "0.00",
                orderCount: 0
              };
            }
            const { salesAmount, orderCount } = await aggregateOrderSalesByMonthAndCity(
              expense.month,
              expense.cityName
            );
            const partnerDividend = expense.costShareRatio ? (parseFloat(salesAmount) * parseFloat(expense.costShareRatio) / 100 - parseFloat(expense.partnerShare || "0") - parseFloat(expense.deferredPayment || "0")).toFixed(2) : "0.00";
            return {
              ...expense,
              salesAmount,
              orderCount,
              partnerDividend
            };
          })
        );
        return result;
      }),
      /**
       * 获取单个费用账单详情
       */
      getById: protectedProcedure.input(z20.object({
        id: z20.number()
      })).query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
        const result = await db.select().from(cityMonthlyExpenses).where(eq16(cityMonthlyExpenses.id, input.id)).limit(1);
        if (result.length === 0) {
          throw new TRPCError16({
            code: "NOT_FOUND",
            message: "\u8D39\u7528\u8D26\u5355\u4E0D\u5B58\u5728"
          });
        }
        return result[0];
      }),
      /**
       * 获取指定城市和月份的费用账单
       */
      getByCityAndMonth: protectedProcedure.input(z20.object({
        cityId: z20.number(),
        month: z20.string()
        // 格式: YYYY-MM
      })).query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
        const result = await db.select().from(cityMonthlyExpenses).where(and12(
          eq16(cityMonthlyExpenses.cityId, input.cityId),
          eq16(cityMonthlyExpenses.month, input.month)
        )).limit(1);
        return result.length > 0 ? result[0] : null;
      }),
      /**
       * 创建或更新费用账单
       */
      upsert: protectedProcedure.input(z20.object({
        cityId: z20.number(),
        cityName: z20.string(),
        month: z20.string(),
        // 格式: YYYY-MM
        rentFee: z20.string().optional(),
        propertyFee: z20.string().optional(),
        utilityFee: z20.string().optional(),
        consumablesFee: z20.string().optional(),
        cleaningFee: z20.string().optional(),
        phoneFee: z20.string().optional(),
        deferredPayment: z20.string().optional(),
        expressFee: z20.string().optional(),
        promotionFee: z20.string().optional(),
        otherFee: z20.string().optional(),
        notes: z20.string().optional()
      })).mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
        const { teacherFee, transportFee } = await aggregateOrderFeesByMonthAndCity(
          input.month,
          input.cityName
        );
        const totalExpense = (parseFloat(input.rentFee || "0") + parseFloat(input.propertyFee || "0") + parseFloat(input.utilityFee || "0") + parseFloat(input.consumablesFee || "0") + parseFloat(input.cleaningFee || "0") + parseFloat(input.phoneFee || "0") + parseFloat(input.expressFee || "0") + parseFloat(input.promotionFee || "0") + parseFloat(input.otherFee || "0") + parseFloat(teacherFee) + parseFloat(transportFee)).toFixed(2);
        const partnerCityInfo = await db.select({
          costShareRatio: sql7`
            CASE 
              WHEN ${partnerCities.currentProfitStage} = 1 THEN ${partnerCities.profitRatioStage1Partner}
              WHEN ${partnerCities.currentProfitStage} = 2 AND ${partnerCities.isInvestmentRecovered} = 0 THEN ${partnerCities.profitRatioStage2APartner}
              WHEN ${partnerCities.currentProfitStage} = 2 AND ${partnerCities.isInvestmentRecovered} = 1 THEN ${partnerCities.profitRatioStage2BPartner}
              WHEN ${partnerCities.currentProfitStage} = 3 THEN ${partnerCities.profitRatioStage3Partner}
              ELSE NULL
            END
          `.as("costShareRatio"),
          expenseCoverage: partnerCities.expenseCoverage
        }).from(partnerCities).where(and12(
          eq16(partnerCities.cityId, input.cityId),
          eq16(partnerCities.contractStatus, "active")
        )).limit(1);
        const costShareRatio = partnerCityInfo[0]?.costShareRatio ? parseFloat(partnerCityInfo[0].costShareRatio) : 0;
        const expenseCoverage = partnerCityInfo[0]?.expenseCoverage || {};
        let coveredExpenseTotal = 0;
        if (expenseCoverage.rentFee) coveredExpenseTotal += parseFloat(input.rentFee || "0");
        if (expenseCoverage.propertyFee) coveredExpenseTotal += parseFloat(input.propertyFee || "0");
        if (expenseCoverage.utilityFee) coveredExpenseTotal += parseFloat(input.utilityFee || "0");
        if (expenseCoverage.consumablesFee) coveredExpenseTotal += parseFloat(input.consumablesFee || "0");
        if (expenseCoverage.cleaningFee) coveredExpenseTotal += parseFloat(input.cleaningFee || "0");
        if (expenseCoverage.phoneFee) coveredExpenseTotal += parseFloat(input.phoneFee || "0");
        if (expenseCoverage.courierFee) coveredExpenseTotal += parseFloat(input.expressFee || "0");
        if (expenseCoverage.promotionFee) coveredExpenseTotal += parseFloat(input.promotionFee || "0");
        if (expenseCoverage.otherFee) coveredExpenseTotal += parseFloat(input.otherFee || "0");
        if (expenseCoverage.teacherFee) coveredExpenseTotal += parseFloat(teacherFee);
        if (expenseCoverage.transportFee) coveredExpenseTotal += parseFloat(transportFee);
        const partnerShare = (coveredExpenseTotal * costShareRatio / 100).toFixed(2);
        const existing = await db.select().from(cityMonthlyExpenses).where(and12(
          eq16(cityMonthlyExpenses.cityId, input.cityId),
          eq16(cityMonthlyExpenses.month, input.month)
        )).limit(1);
        if (existing.length > 0) {
          await db.update(cityMonthlyExpenses).set({
            rentFee: input.rentFee || "0.00",
            propertyFee: input.propertyFee || "0.00",
            utilityFee: input.utilityFee || "0.00",
            consumablesFee: input.consumablesFee || "0.00",
            cleaningFee: input.cleaningFee || "0.00",
            phoneFee: input.phoneFee || "0.00",
            deferredPayment: input.deferredPayment || "0.00",
            expressFee: input.expressFee || "0.00",
            promotionFee: input.promotionFee || "0.00",
            otherFee: input.otherFee || "0.00",
            teacherFee,
            transportFee,
            totalExpense,
            partnerShare,
            notes: input.notes,
            uploadedBy: ctx.user.id
          }).where(eq16(cityMonthlyExpenses.id, existing[0].id));
          return { id: existing[0].id, isNew: false };
        } else {
          const result = await db.insert(cityMonthlyExpenses).values({
            cityId: input.cityId,
            cityName: input.cityName,
            month: input.month,
            rentFee: input.rentFee || "0.00",
            propertyFee: input.propertyFee || "0.00",
            utilityFee: input.utilityFee || "0.00",
            consumablesFee: input.consumablesFee || "0.00",
            cleaningFee: input.cleaningFee || "0.00",
            phoneFee: input.phoneFee || "0.00",
            deferredPayment: input.deferredPayment || "0.00",
            expressFee: input.expressFee || "0.00",
            promotionFee: input.promotionFee || "0.00",
            otherFee: input.otherFee || "0.00",
            teacherFee,
            transportFee,
            totalExpense,
            partnerShare,
            notes: input.notes,
            uploadedBy: ctx.user.id
          });
          return { id: Number(result[0].insertId), isNew: true };
        }
      }),
      /**
       * 删除费用账单
       */
      delete: protectedProcedure.input(z20.object({
        id: z20.number()
      })).mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
        await db.delete(cityMonthlyExpenses).where(eq16(cityMonthlyExpenses.id, input.id));
        return { success: true };
      }),
      /**
       * 获取所有城市列表（用于下拉选择）
       */
      getCities: protectedProcedure.query(async () => {
        const db = await getDb();
        if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
        const result = await db.select({
          id: cities.id,
          name: cities.name
        }).from(cities).where(eq16(cities.isActive, true)).orderBy(cities.sortOrder, cities.name);
        return result;
      }),
      /**
       * 下载Excel导入模板
       */
      downloadTemplate: protectedProcedure.mutation(async () => {
        const workbook = new ExcelJS4.Workbook();
        const worksheet = workbook.addWorksheet("\u57CE\u5E02\u8D39\u7528\u8D26\u5355");
        worksheet.columns = [
          { header: "\u57CE\u5E02\u540D\u79F0", key: "cityName", width: 15 },
          { header: "\u6708\u4EFD(YYYY-MM)", key: "month", width: 15 },
          { header: "\u623F\u79DF", key: "rentFee", width: 12 },
          { header: "\u7269\u4E1A\u8D39", key: "propertyFee", width: 12 },
          { header: "\u6C34\u7535\u8D39", key: "utilityFee", width: 12 },
          { header: "\u9053\u5177\u8017\u6750", key: "consumablesFee", width: 12 },
          { header: "\u4FDD\u6D01\u8D39", key: "cleaningFee", width: 12 },
          { header: "\u8BDD\u8D39", key: "phoneFee", width: 12 },
          { header: "\u5408\u540C\u540E\u4ED8\u6B3E", key: "deferredPayment", width: 12 },
          { header: "\u5FEB\u9012\u8D39", key: "expressFee", width: 12 },
          { header: "\u63A8\u5E7F\u8D39", key: "promotionFee", width: 12 },
          { header: "\u5176\u4ED6\u8D39\u7528", key: "otherFee", width: 12 },
          { header: "\u5907\u6CE8", key: "notes", width: 30 }
        ];
        worksheet.addRow({
          cityName: "\u5317\u4EAC",
          month: "2025-01",
          rentFee: 1e4,
          propertyFee: 2e3,
          utilityFee: 1500,
          consumablesFee: 3e3,
          cleaningFee: 800,
          phoneFee: 200,
          deferredPayment: 5e3,
          expressFee: 300,
          promotionFee: 2e3,
          otherFee: 500,
          notes: "\u793A\u4F8B\u6570\u636E"
        });
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" }
        };
        const buffer = await workbook.xlsx.writeBuffer();
        return {
          data: Buffer.from(buffer).toString("base64"),
          filename: "\u57CE\u5E02\u8D39\u7528\u8D26\u5355\u5BFC\u5165\u6A21\u677F.xlsx"
        };
      }),
      /**
       * 批量导入Excel数据
       */
      batchImport: protectedProcedure.input(z20.object({
        fileData: z20.string()
        // base64编码的文件数据
      })).mutation(async ({ input, ctx }) => {
        function getCellNumber(cell) {
          const v = cell.value;
          if (v === null || v === void 0) return 0;
          if (typeof v === "number") return v;
          if (typeof v === "object" && "result" in v) {
            const r = v.result;
            return typeof r === "number" ? r : parseFloat(String(r)) || 0;
          }
          const n = parseFloat(String(v).replace(/,/g, ""));
          return isNaN(n) ? 0 : n;
        }
        const db = await getDb();
        if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
        const workbook = new ExcelJS4.Workbook();
        const buffer = Buffer.from(input.fileData, "base64");
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
          throw new TRPCError16({ code: "BAD_REQUEST", message: "Excel\u6587\u4EF6\u683C\u5F0F\u9519\u8BEF" });
        }
        const allCities = await db.select({
          id: cities.id,
          name: cities.name
        }).from(cities).where(eq16(cities.isActive, true));
        const cityMap = new Map(allCities.map((c) => [c.name, c.id]));
        const successRecords = [];
        const failedRecords = [];
        for (let i = 2; i <= worksheet.rowCount; i++) {
          const row = worksheet.getRow(i);
          if (!row.getCell(1).value) continue;
          const cityName = row.getCell(1).value?.toString().trim();
          const month = row.getCell(2).value?.toString().trim();
          if (!cityName || !month) {
            failedRecords.push({ row: i, reason: "\u57CE\u5E02\u540D\u79F0\u6216\u6708\u4EFD\u4E3A\u7A7A" });
            continue;
          }
          const cityId = cityMap.get(cityName);
          if (!cityId) {
            failedRecords.push({ row: i, reason: `\u57CE\u5E02"${cityName}"\u4E0D\u5B58\u5728` });
            continue;
          }
          try {
            const rentFee = getCellNumber(row.getCell(3)).toFixed(2);
            const propertyFee = getCellNumber(row.getCell(4)).toFixed(2);
            const utilityFee = getCellNumber(row.getCell(5)).toFixed(2);
            const consumablesFee = getCellNumber(row.getCell(6)).toFixed(2);
            const cleaningFee = getCellNumber(row.getCell(7)).toFixed(2);
            const phoneFee = getCellNumber(row.getCell(8)).toFixed(2);
            const deferredPayment = getCellNumber(row.getCell(9)).toFixed(2);
            const expressFee = getCellNumber(row.getCell(10)).toFixed(2);
            const promotionFee = getCellNumber(row.getCell(11)).toFixed(2);
            const otherFee = getCellNumber(row.getCell(12)).toFixed(2);
            const notes = row.getCell(13).value?.toString() || "";
            const { teacherFee, transportFee } = await aggregateOrderFeesByMonthAndCity(
              month,
              cityName
            );
            const totalExpense = (parseFloat(rentFee) + parseFloat(propertyFee) + parseFloat(utilityFee) + parseFloat(consumablesFee) + parseFloat(cleaningFee) + parseFloat(phoneFee) + parseFloat(expressFee) + parseFloat(promotionFee) + parseFloat(otherFee) + parseFloat(teacherFee) + parseFloat(transportFee)).toFixed(2);
            const existing = await db.select().from(cityMonthlyExpenses).where(and12(
              eq16(cityMonthlyExpenses.cityId, cityId),
              eq16(cityMonthlyExpenses.month, month)
            )).limit(1);
            if (existing.length > 0) {
              await db.update(cityMonthlyExpenses).set({
                rentFee,
                propertyFee,
                utilityFee,
                consumablesFee,
                cleaningFee,
                phoneFee,
                deferredPayment,
                expressFee,
                promotionFee,
                otherFee,
                teacherFee,
                transportFee,
                totalExpense,
                notes,
                uploadedBy: ctx.user.id
              }).where(eq16(cityMonthlyExpenses.id, existing[0].id));
            } else {
              await db.insert(cityMonthlyExpenses).values({
                cityId,
                cityName,
                month,
                rentFee,
                propertyFee,
                utilityFee,
                consumablesFee,
                cleaningFee,
                phoneFee,
                deferredPayment,
                expressFee,
                promotionFee,
                otherFee,
                teacherFee,
                transportFee,
                totalExpense,
                notes,
                uploadedBy: ctx.user.id
              });
            }
            successRecords.push({ row: i, cityName, month });
          } catch (error) {
            failedRecords.push({ row: i, reason: `\u6570\u636E\u5904\u7406\u9519\u8BEF: ${error}` });
          }
        }
        return {
          success: successRecords.length,
          failed: failedRecords.length,
          failedRecords
        };
      }),
      /**
       * 导出Excel数据
       */
      exportData: protectedProcedure.input(z20.object({
        cityId: z20.number().optional(),
        month: z20.string().optional(),
        startMonth: z20.string().optional(),
        endMonth: z20.string().optional()
      }).optional()).mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
        const conditions = [];
        if (input?.cityId) {
          conditions.push(eq16(cityMonthlyExpenses.cityId, input.cityId));
        }
        if (input?.month) {
          conditions.push(eq16(cityMonthlyExpenses.month, input.month));
        }
        if (input?.startMonth) {
          conditions.push(sql7`${cityMonthlyExpenses.month} >= ${input.startMonth}`);
        }
        if (input?.endMonth) {
          conditions.push(sql7`${cityMonthlyExpenses.month} <= ${input.endMonth}`);
        }
        const result = await db.select().from(cityMonthlyExpenses).where(conditions.length > 0 ? and12(...conditions) : void 0).orderBy(desc4(cityMonthlyExpenses.month), desc4(cityMonthlyExpenses.cityId));
        const workbook = new ExcelJS4.Workbook();
        const worksheet = workbook.addWorksheet("\u57CE\u5E02\u8D39\u7528\u8D26\u5355");
        worksheet.columns = [
          { header: "\u57CE\u5E02\u540D\u79F0", key: "cityName", width: 15 },
          { header: "\u6708\u4EFD", key: "month", width: 15 },
          { header: "\u623F\u79DF", key: "rentFee", width: 12 },
          { header: "\u7269\u4E1A\u8D39", key: "propertyFee", width: 12 },
          { header: "\u6C34\u7535\u8D39", key: "utilityFee", width: 12 },
          { header: "\u9053\u5177\u8017\u6750", key: "consumablesFee", width: 12 },
          { header: "\u4FDD\u6D01\u8D39", key: "cleaningFee", width: 12 },
          { header: "\u8BDD\u8D39", key: "phoneFee", width: 12 },
          { header: "\u5408\u540C\u540E\u4ED8\u6B3E", key: "deferredPayment", width: 12 },
          { header: "\u5FEB\u9012\u8D39", key: "expressFee", width: 12 },
          { header: "\u63A8\u5E7F\u8D39", key: "promotionFee", width: 12 },
          { header: "\u5176\u4ED6\u8D39\u7528", key: "otherFee", width: 12 },
          { header: "\u603B\u8D39\u7528", key: "totalExpense", width: 12 },
          { header: "\u5907\u6CE8", key: "notes", width: 30 }
        ];
        result.forEach((record) => {
          worksheet.addRow({
            cityName: record.cityName,
            month: record.month,
            rentFee: parseFloat(record.rentFee || "0"),
            propertyFee: parseFloat(record.propertyFee || "0"),
            utilityFee: parseFloat(record.utilityFee || "0"),
            consumablesFee: parseFloat(record.consumablesFee || "0"),
            cleaningFee: parseFloat(record.cleaningFee || "0"),
            phoneFee: parseFloat(record.phoneFee || "0"),
            deferredPayment: parseFloat(record.deferredPayment || "0"),
            expressFee: parseFloat(record.expressFee || "0"),
            promotionFee: parseFloat(record.promotionFee || "0"),
            otherFee: parseFloat(record.otherFee || "0"),
            totalExpense: parseFloat(record.totalExpense || "0"),
            notes: record.notes || ""
          });
        });
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" }
        };
        const buffer = await workbook.xlsx.writeBuffer();
        return {
          data: Buffer.from(buffer).toString("base64"),
          filename: `\u57CE\u5E02\u8D26\u5355_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx`
        };
      }),
      /**
       * 重新计算合伙人承担费用
       * 用于在费用覆盖配置变更后,自动更新已存在的账单记录
       */
      recalculatePartnerShare: protectedProcedure.input(z20.object({
        cityId: z20.number(),
        month: z20.string()
        // 格式: YYYY-MM
      })).mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
        try {
          const existing = await db.select().from(cityMonthlyExpenses).where(and12(
            eq16(cityMonthlyExpenses.cityId, input.cityId),
            eq16(cityMonthlyExpenses.month, input.month)
          )).limit(1);
          if (existing.length === 0) {
            return { success: true, message: "\u8D26\u5355\u4E0D\u5B58\u5728,\u65E0\u9700\u91CD\u65B0\u8BA1\u7B97" };
          }
          const record = existing[0];
          const partnerCityInfo = await db.select({
            costShareRatio: sql7`
              CASE 
                WHEN ${partnerCities.currentProfitStage} = 1 THEN ${partnerCities.profitRatioStage1Partner}
                WHEN ${partnerCities.currentProfitStage} = 2 AND ${partnerCities.isInvestmentRecovered} = 0 THEN ${partnerCities.profitRatioStage2APartner}
                WHEN ${partnerCities.currentProfitStage} = 2 AND ${partnerCities.isInvestmentRecovered} = 1 THEN ${partnerCities.profitRatioStage2BPartner}
                WHEN ${partnerCities.currentProfitStage} = 3 THEN ${partnerCities.profitRatioStage3Partner}
                ELSE NULL
              END
            `.as("costShareRatio"),
            expenseCoverage: partnerCities.expenseCoverage
          }).from(partnerCities).where(and12(
            eq16(partnerCities.cityId, input.cityId),
            eq16(partnerCities.contractStatus, "active")
          )).limit(1);
          if (partnerCityInfo.length === 0) {
            await db.update(cityMonthlyExpenses).set({
              partnerShare: "0.00"
            }).where(eq16(cityMonthlyExpenses.id, record.id));
            return { success: true, message: "\u672A\u627E\u5230\u5408\u4F19\u4EBA\u914D\u7F6E,\u5408\u4F19\u4EBA\u627F\u62C5\u8BBE\u4E3A0" };
          }
          const costShareRatio = partnerCityInfo[0]?.costShareRatio ? parseFloat(partnerCityInfo[0].costShareRatio) : 0;
          const expenseCoverage = partnerCityInfo[0]?.expenseCoverage || {};
          let coveredExpenseTotal = 0;
          if (expenseCoverage.rentFee) coveredExpenseTotal += parseFloat(record.rentFee || "0");
          if (expenseCoverage.propertyFee) coveredExpenseTotal += parseFloat(record.propertyFee || "0");
          if (expenseCoverage.utilityFee) coveredExpenseTotal += parseFloat(record.utilityFee || "0");
          if (expenseCoverage.consumablesFee) coveredExpenseTotal += parseFloat(record.consumablesFee || "0");
          if (expenseCoverage.cleaningFee) coveredExpenseTotal += parseFloat(record.cleaningFee || "0");
          if (expenseCoverage.phoneFee) coveredExpenseTotal += parseFloat(record.phoneFee || "0");
          if (expenseCoverage.courierFee) coveredExpenseTotal += parseFloat(record.expressFee || "0");
          if (expenseCoverage.promotionFee) coveredExpenseTotal += parseFloat(record.promotionFee || "0");
          if (expenseCoverage.otherFee) coveredExpenseTotal += parseFloat(record.otherFee || "0");
          if (expenseCoverage.teacherFee) coveredExpenseTotal += parseFloat(record.teacherFee || "0");
          if (expenseCoverage.transportFee) coveredExpenseTotal += parseFloat(record.transportFee || "0");
          const partnerShare = (coveredExpenseTotal * costShareRatio / 100).toFixed(2);
          await db.update(cityMonthlyExpenses).set({
            partnerShare
          }).where(eq16(cityMonthlyExpenses.id, record.id));
          return {
            success: true,
            message: `\u91CD\u65B0\u8BA1\u7B97\u6210\u529F,\u5408\u4F19\u4EBA\u627F\u62C5\u8D39\u7528: \uFFE5${partnerShare}`,
            partnerShare
          };
        } catch (error) {
          console.error("\u91CD\u65B0\u8BA1\u7B97\u5408\u4F19\u4EBA\u627F\u62C5\u8D39\u7528\u5931\u8D25:", error);
          throw new TRPCError16({
            code: "INTERNAL_SERVER_ERROR",
            message: `\u91CD\u65B0\u8BA1\u7B97\u5931\u8D25: ${error.message}`
          });
        }
      }),
      /**
       * 批量重新计算合伙人承担费用
       * 根据筛选条件批量更新账单的合伙人承担费用
       */
      batchRecalculate: protectedProcedure.input(z20.object({
        cityId: z20.number().optional(),
        // 可选:指定城市ID,不指定则刷新所有城市
        month: z20.string().optional()
        // 可选:指定月份,不指定则刷新所有月份
      })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
        try {
          const conditions = [];
          if (input.cityId) {
            conditions.push(eq16(cityMonthlyExpenses.cityId, input.cityId));
          }
          if (input.month) {
            conditions.push(eq16(cityMonthlyExpenses.month, input.month));
          }
          const expenses = await db.select().from(cityMonthlyExpenses).where(conditions.length > 0 ? and12(...conditions) : void 0);
          if (expenses.length === 0) {
            return {
              success: true,
              message: "\u6CA1\u6709\u627E\u5230\u7B26\u5408\u6761\u4EF6\u7684\u8D26\u5355",
              total: 0,
              updated: 0
            };
          }
          let updatedCount = 0;
          const errors = [];
          for (const expense of expenses) {
            try {
              const partnerCityInfo = await db.select().from(partnerCities).where(and12(
                eq16(partnerCities.cityId, expense.cityId),
                eq16(partnerCities.contractStatus, "active")
              )).limit(1);
              if (partnerCityInfo.length === 0) {
                await db.update(cityMonthlyExpenses).set({ partnerShare: "0.00" }).where(eq16(cityMonthlyExpenses.id, expense.id));
                updatedCount++;
                continue;
              }
              const expenseCoverage = partnerCityInfo[0]?.expenseCoverage || {};
              const currentStage = partnerCityInfo[0]?.currentProfitStage || 1;
              let costShareRatio = 0;
              if (currentStage === 1) {
                costShareRatio = parseFloat(partnerCityInfo[0]?.profitRatioStage1Partner || "0");
              } else if (currentStage === 2) {
                const isRecovered = partnerCityInfo[0]?.isInvestmentRecovered || false;
                costShareRatio = isRecovered ? parseFloat(partnerCityInfo[0]?.profitRatioStage2BPartner || "0") : parseFloat(partnerCityInfo[0]?.profitRatioStage2APartner || "0");
              } else if (currentStage === 3) {
                costShareRatio = parseFloat(partnerCityInfo[0]?.profitRatioStage3Partner || "0");
              }
              let coveredExpenseTotal = 0;
              if (expenseCoverage.rentFee) coveredExpenseTotal += parseFloat(expense.rentFee || "0");
              if (expenseCoverage.propertyFee) coveredExpenseTotal += parseFloat(expense.propertyFee || "0");
              if (expenseCoverage.utilityFee) coveredExpenseTotal += parseFloat(expense.utilityFee || "0");
              if (expenseCoverage.cleaningFee) coveredExpenseTotal += parseFloat(expense.cleaningFee || "0");
              if (expenseCoverage.phoneFee) coveredExpenseTotal += parseFloat(expense.phoneFee || "0");
              if (expenseCoverage.consumablesFee) coveredExpenseTotal += parseFloat(expense.consumablesFee || "0");
              if (expenseCoverage.promotionFee) coveredExpenseTotal += parseFloat(expense.promotionFee || "0");
              if (expenseCoverage.otherFee) coveredExpenseTotal += parseFloat(expense.otherFee || "0");
              if (expenseCoverage.teacherFee) coveredExpenseTotal += parseFloat(expense.teacherFee || "0");
              if (expenseCoverage.transportFee) coveredExpenseTotal += parseFloat(expense.transportFee || "0");
              const partnerShare = (coveredExpenseTotal * costShareRatio / 100).toFixed(2);
              await db.update(cityMonthlyExpenses).set({ partnerShare }).where(eq16(cityMonthlyExpenses.id, expense.id));
              updatedCount++;
            } catch (error) {
              errors.push(`${expense.cityName} ${expense.month}: ${error.message}`);
            }
          }
          return {
            success: true,
            message: `\u6279\u91CF\u5237\u65B0\u5B8C\u6210,\u5171\u5904\u7406 ${expenses.length} \u6761\u8D26\u5355,\u6210\u529F\u66F4\u65B0 ${updatedCount} \u6761${errors.length > 0 ? `,\u5931\u8D25 ${errors.length} \u6761` : ""}`,
            total: expenses.length,
            updated: updatedCount,
            errors: errors.length > 0 ? errors : void 0
          };
        } catch (error) {
          console.error("\u6279\u91CF\u91CD\u65B0\u8BA1\u7B97\u5931\u8D25:", error);
          throw new TRPCError16({
            code: "INTERNAL_SERVER_ERROR",
            message: `\u6279\u91CF\u5237\u65B0\u5931\u8D25: ${error.message}`
          });
        }
      })
    });
  }
});

// server/channelOrderNoUtils.ts
function validateAlipayOrderNo(orderNo) {
  return /^\d{28}$/.test(orderNo);
}
function validateWechatOrderNo(orderNo) {
  return /^\d{32}$/.test(orderNo);
}
function validateFZGOrderNo(orderNo) {
  return /^[A-Z0-9]{20,30}$/.test(orderNo) || /^FZG\d{15,25}$/i.test(orderNo);
}
function extractChannelOrderNo(text2) {
  if (!text2) return null;
  const pattern1 = /交易单号\s*([A-Z0-9]{15,35})/i;
  const match1 = text2.match(pattern1);
  if (match1) return match1[1];
  const pattern2 = /订单号\s*([A-Z0-9]{15,35})/i;
  const match2 = text2.match(pattern2);
  if (match2) return match2[1];
  const pattern3 = /渠道订单号[:\uff1a\s]*([A-Z0-9]{15,35})/i;
  const match3 = text2.match(pattern3);
  if (match3) return match3[1];
  return null;
}
function validateChannelOrderNo(orderNo) {
  if (!orderNo || orderNo.trim() === "") {
    return {
      isValid: false,
      channel: "unknown",
      channelName: "\u672A\u77E5",
      format: "\u7A7A\u8BA2\u5355\u53F7"
    };
  }
  const trimmed = orderNo.trim();
  if (validateAlipayOrderNo(trimmed)) {
    return {
      isValid: true,
      channel: "alipay",
      channelName: "\u652F\u4ED8\u5B9D",
      format: "28\u4F4D\u6570\u5B57"
    };
  }
  if (validateWechatOrderNo(trimmed)) {
    return {
      isValid: true,
      channel: "wechat",
      channelName: "\u5FAE\u4FE1\u652F\u4ED8",
      format: "32\u4F4D\u6570\u5B57"
    };
  }
  if (validateFZGOrderNo(trimmed)) {
    return {
      isValid: true,
      channel: "fuzhanggui",
      channelName: "\u5BCC\u638C\u67DC",
      format: "\u5B57\u6BCD\u6570\u5B57\u6DF7\u5408"
    };
  }
  if (/^\d+$/.test(trimmed)) {
    const length = trimmed.length;
    let possibleChannel = "unknown";
    let channelName = "\u672A\u77E5";
    if (length >= 26 && length <= 30) {
      possibleChannel = "alipay";
      channelName = "\u652F\u4ED8\u5B9D(\u7591\u4F3C)";
    } else if (length >= 30 && length <= 34) {
      possibleChannel = "wechat";
      channelName = "\u5FAE\u4FE1\u652F\u4ED8(\u7591\u4F3C)";
    }
    return {
      isValid: false,
      channel: possibleChannel,
      channelName,
      format: `${length}\u4F4D\u6570\u5B57`,
      warning: `\u8BA2\u5355\u53F7\u957F\u5EA6\u5F02\u5E38(${length}\u4F4D),\u8BF7\u6838\u5BF9`
    };
  }
  return {
    isValid: false,
    channel: "unknown",
    channelName: "\u672A\u77E5",
    format: "\u683C\u5F0F\u4E0D\u5339\u914D",
    warning: "\u8BA2\u5355\u53F7\u683C\u5F0F\u65E0\u6CD5\u8BC6\u522B,\u8BF7\u624B\u52A8\u6838\u5BF9"
  };
}
function identifyPaymentChannel(orderNo) {
  const validation = validateChannelOrderNo(orderNo);
  if (validation.isValid) {
    return validation.channelName;
  }
  if (validation.channel !== "unknown") {
    return validation.channelName;
  }
  return "";
}
var init_channelOrderNoUtils = __esm({
  "server/channelOrderNoUtils.ts"() {
    "use strict";
  }
});

// server/permissions.ts
var permissions_exports = {};
__export(permissions_exports, {
  adminProcedure: () => adminProcedure5,
  checkCityAccess: () => checkCityAccess,
  checkResourceOwnership: () => checkResourceOwnership,
  cityPartnerProcedure: () => cityPartnerProcedure,
  enforceCurrentUserId: () => enforceCurrentUserId,
  financeOrAdminProcedure: () => financeOrAdminProcedure3,
  financeProcedure: () => financeProcedure2,
  getDataScope: () => getDataScope,
  getUserCity: () => getUserCity,
  requireRoles: () => requireRoles,
  salesOrAdminProcedure: () => salesOrAdminProcedure,
  salesProcedure: () => salesProcedure,
  teacherProcedure: () => teacherProcedure2,
  userProcedure: () => userProcedure
});
import { TRPCError as TRPCError25 } from "@trpc/server";
function requireRoles(allowedRoles, errorMessage) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError25({
        code: "UNAUTHORIZED",
        message: "\u8BF7\u5148\u767B\u5F55"
      });
    }
    if (hasRole(ctx.user.roles, USER_ROLES.ADMIN)) {
      return next({ ctx });
    }
    if (!hasAnyRole(ctx.user.roles, allowedRoles)) {
      throw new TRPCError25({
        code: "FORBIDDEN",
        message: errorMessage || `\u9700\u8981\u4EE5\u4E0B\u89D2\u8272\u4E4B\u4E00: ${allowedRoles.join(", ")}`
      });
    }
    return next({ ctx });
  });
}
function getDataScope(ctx) {
  const roles = parseRoles(ctx.user.roles);
  return {
    userId: ctx.user.id,
    roles,
    isAdmin: roles.includes(USER_ROLES.ADMIN),
    isUser: roles.includes(USER_ROLES.USER),
    isTeacher: roles.includes(USER_ROLES.TEACHER),
    isCityPartner: roles.includes(USER_ROLES.CITY_PARTNER),
    isSales: roles.includes(USER_ROLES.SALES),
    isFinance: roles.includes(USER_ROLES.FINANCE)
  };
}
function checkResourceOwnership(ctx, resourceOwnerId, errorMessage = "\u65E0\u6743\u8BBF\u95EE\u6B64\u8D44\u6E90") {
  const scope = getDataScope(ctx);
  if (scope.isAdmin) {
    return true;
  }
  if (resourceOwnerId !== ctx.user.id) {
    throw new TRPCError25({
      code: "FORBIDDEN",
      message: errorMessage
    });
  }
  return true;
}
function enforceCurrentUserId(ctx) {
  return ctx.user.id;
}
async function getUserCity(userId) {
  return null;
}
async function checkCityAccess(ctx, targetCity) {
  const scope = getDataScope(ctx);
  if (scope.isAdmin) {
    return true;
  }
  if (scope.isCityPartner) {
    const userCity = await getUserCity(ctx.user.id);
    if (userCity !== targetCity) {
      throw new TRPCError25({
        code: "FORBIDDEN",
        message: "\u65E0\u6743\u8BBF\u95EE\u5176\u4ED6\u57CE\u5E02\u7684\u6570\u636E"
      });
    }
    return true;
  }
  throw new TRPCError25({
    code: "FORBIDDEN",
    message: "\u65E0\u6743\u8BBF\u95EE\u57CE\u5E02\u6570\u636E"
  });
}
var userProcedure, teacherProcedure2, cityPartnerProcedure, salesProcedure, financeProcedure2, adminProcedure5, salesOrAdminProcedure, financeOrAdminProcedure3;
var init_permissions = __esm({
  "server/permissions.ts"() {
    "use strict";
    init_trpc();
    init_roles();
    userProcedure = requireRoles(
      [USER_ROLES.USER],
      "\u9700\u8981\u5B66\u5458\u6743\u9650"
    );
    teacherProcedure2 = requireRoles(
      [USER_ROLES.TEACHER],
      "\u9700\u8981\u8001\u5E08\u6743\u9650"
    );
    cityPartnerProcedure = requireRoles(
      [USER_ROLES.CITY_PARTNER],
      "\u9700\u8981\u57CE\u5E02\u5408\u4F19\u4EBA\u6743\u9650"
    );
    salesProcedure = requireRoles(
      [USER_ROLES.SALES],
      "\u9700\u8981\u9500\u552E\u6743\u9650"
    );
    financeProcedure2 = requireRoles(
      [USER_ROLES.FINANCE],
      "\u9700\u8981\u8D22\u52A1\u6743\u9650"
    );
    adminProcedure5 = requireRoles(
      [USER_ROLES.ADMIN],
      "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650"
    );
    salesOrAdminProcedure = requireRoles(
      [USER_ROLES.SALES, USER_ROLES.ADMIN],
      "\u9700\u8981\u9500\u552E\u6216\u7BA1\u7406\u5458\u6743\u9650"
    );
    financeOrAdminProcedure3 = requireRoles(
      [USER_ROLES.FINANCE, USER_ROLES.ADMIN],
      "\u9700\u8981\u8D22\u52A1\u6216\u7BA1\u7406\u5458\u6743\u9650"
    );
  }
});

// server/channelOrderNoBatchFill.ts
var channelOrderNoBatchFill_exports = {};
__export(channelOrderNoBatchFill_exports, {
  batchFillChannelOrderNo: () => batchFillChannelOrderNo,
  previewBatchFillChannelOrderNo: () => previewBatchFillChannelOrderNo
});
async function batchFillChannelOrderNo(options = {}) {
  const {
    onlyMissing = true,
    validateFormat = true,
    autoIdentifyChannel = true
  } = options;
  const result = {
    totalOrders: 0,
    processedOrders: 0,
    filledOrders: 0,
    skippedOrders: 0,
    failedOrders: 0,
    warnings: [],
    details: []
  };
  try {
    const allOrders = await getAllOrders();
    result.totalOrders = allOrders.length;
    for (const order of allOrders) {
      if (onlyMissing && order.channelOrderNo) {
        result.skippedOrders++;
        result.details.push({
          orderId: order.id,
          orderNo: order.orderNo,
          customerName: order.customerName || "",
          extractedChannelOrderNo: "",
          identifiedChannel: "",
          status: "skipped",
          reason: "\u5DF2\u6709\u6E20\u9053\u8BA2\u5355\u53F7"
        });
        continue;
      }
      result.processedOrders++;
      const notes = order.notes || "";
      const extractedOrderNo = extractChannelOrderNo(notes);
      if (!extractedOrderNo) {
        result.failedOrders++;
        result.details.push({
          orderId: order.id,
          orderNo: order.orderNo,
          customerName: order.customerName || "",
          extractedChannelOrderNo: "",
          identifiedChannel: "",
          status: "failed",
          reason: "\u5907\u6CE8\u4E2D\u672A\u627E\u5230\u6E20\u9053\u8BA2\u5355\u53F7"
        });
        continue;
      }
      let validationWarning;
      let identifiedChannel = "";
      if (validateFormat) {
        const validation = validateChannelOrderNo(extractedOrderNo);
        validationWarning = validation.warning;
        if (validation.warning) {
          result.warnings.push(
            `\u8BA2\u5355 ${order.orderNo} (${order.customerName || "\u65E0\u5BA2\u6237\u540D"}): ${validation.warning}`
          );
        }
        if (autoIdentifyChannel && validation.isValid) {
          identifiedChannel = validation.channelName;
        }
      } else if (autoIdentifyChannel) {
        identifiedChannel = identifyPaymentChannel(extractedOrderNo);
      }
      try {
        const updateData = {
          channelOrderNo: extractedOrderNo
        };
        if (autoIdentifyChannel && identifiedChannel && !order.paymentChannel) {
          updateData.paymentChannel = identifiedChannel;
        }
        await updateOrder(order.id, updateData);
        result.filledOrders++;
        result.details.push({
          orderId: order.id,
          orderNo: order.orderNo,
          customerName: order.customerName || "",
          extractedChannelOrderNo: extractedOrderNo,
          identifiedChannel,
          validationWarning,
          status: "filled"
        });
      } catch (err) {
        result.failedOrders++;
        result.details.push({
          orderId: order.id,
          orderNo: order.orderNo,
          customerName: order.customerName || "",
          extractedChannelOrderNo: extractedOrderNo,
          identifiedChannel,
          status: "failed",
          reason: `\u66F4\u65B0\u5931\u8D25: ${err.message}`
        });
      }
    }
    return result;
  } catch (error) {
    throw new Error(`\u6279\u91CF\u8865\u5168\u5931\u8D25: ${error.message}`);
  }
}
async function previewBatchFillChannelOrderNo(options = {}) {
  const { onlyMissing = true } = options;
  const preview = {
    totalOrders: 0,
    canFillOrders: 0,
    cannotFillOrders: 0,
    alreadyHasOrders: 0,
    preview: []
  };
  const allOrders = await getAllOrders();
  preview.totalOrders = allOrders.length;
  for (const order of allOrders) {
    const currentChannelOrderNo = order.channelOrderNo || "";
    if (onlyMissing && currentChannelOrderNo) {
      preview.alreadyHasOrders++;
      continue;
    }
    const notes = order.notes || "";
    const extractedOrderNo = extractChannelOrderNo(notes);
    if (!extractedOrderNo) {
      preview.cannotFillOrders++;
      preview.preview.push({
        orderId: order.id,
        orderNo: order.orderNo,
        customerName: order.customerName || "",
        currentChannelOrderNo,
        extractedChannelOrderNo: "",
        identifiedChannel: "",
        canFill: false,
        reason: "\u5907\u6CE8\u4E2D\u672A\u627E\u5230\u6E20\u9053\u8BA2\u5355\u53F7"
      });
      continue;
    }
    const identifiedChannel = identifyPaymentChannel(extractedOrderNo);
    preview.canFillOrders++;
    preview.preview.push({
      orderId: order.id,
      orderNo: order.orderNo,
      customerName: order.customerName || "",
      currentChannelOrderNo,
      extractedChannelOrderNo: extractedOrderNo,
      identifiedChannel,
      canFill: true
    });
  }
  return preview;
}
var init_channelOrderNoBatchFill = __esm({
  "server/channelOrderNoBatchFill.ts"() {
    "use strict";
    init_db();
    init_channelOrderNoUtils();
  }
});

// server/_core/serve-static.ts
var serve_static_exports = {};
__export(serve_static_exports, {
  serveStatic: () => serveStatic
});
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
function serveStatic(app) {
  const __dirname = import.meta.dirname ?? (typeof import.meta.url === "string" ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd());
  const possiblePaths = [
    path.resolve(process.cwd(), "public"),
    path.resolve(__dirname, "public"),
    path.resolve(__dirname, "../", "../", "dist", "public"),
    path.resolve(__dirname, "..", "public"),
    "/code/public"
  ];
  let distPath = possiblePaths.find((p) => fs.existsSync(p));
  if (!distPath) {
    console.error(
      `Could not find the build directory. Tried: ${possiblePaths.join(", ")}`
    );
    app.use("*", (_req, res) => {
      res.status(503).json({ error: "Frontend build not found" });
    });
    return;
  }
  console.log(`[Static] Serving from: ${distPath}`);
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: "index.html not found" });
    }
  });
}
var init_serve_static = __esm({
  "server/_core/serve-static.ts"() {
    "use strict";
  }
});

// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/oauth.ts
init_const();
init_db();

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/sdk.ts
init_const();

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const signedInAt = /* @__PURE__ */ new Date();
    const tokenFromQuery = req.query?.token || req.query?.auth_token;
    if (tokenFromQuery) {
      try {
        const secretKey = this.getSessionSecret();
        const { payload } = await jwtVerify(tokenFromQuery, secretKey, {
          algorithms: ["HS256"]
        });
        console.log("[Auth] Authenticated via URL Token:", payload.name || payload.openId);
        if (payload.id) {
          const user2 = await getUserById(payload.id);
          if (!user2) {
            throw new Error("User not found");
          }
          return user2;
        }
        if (payload.openId) {
          const user2 = await getUserByOpenId(payload.openId);
          if (!user2) {
            throw new Error("User not found");
          }
          return user2;
        }
      } catch (error) {
        console.error("[Auth] URL Token verification failed:", error);
      }
    }
    let authHeader = req.headers.authorization || req.headers["x-auth-token"];
    if (Array.isArray(authHeader)) {
      authHeader = authHeader[0];
    }
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const secretKey = this.getSessionSecret();
        const { payload } = await jwtVerify(token, secretKey, {
          algorithms: ["HS256"]
        });
        const userId = payload.id;
        if (typeof userId === "number") {
          const user2 = await getUserById(userId);
          if (user2) {
            await upsertUser({
              openId: user2.openId,
              lastSignedIn: signedInAt
            });
            console.log("[Auth] Authenticated via App Login Token:", user2.name);
            return user2;
          }
        }
        const openId = payload.openId;
        if (typeof openId === "string" && openId.length > 0) {
          const user2 = await getUserByOpenId(openId);
          if (user2) {
            await upsertUser({
              openId: user2.openId,
              lastSignedIn: signedInAt
            });
            console.log("[Auth] Authenticated via Manus OAuth Token:", user2.name);
            return user2;
          }
        }
      } catch (error) {
        console.warn("[Auth] JWT Token verification failed:", String(error));
      }
    }
    const cookies = this.parseCookies(req.headers.cookie);
    const localSessionCookie = cookies.get("session");
    if (localSessionCookie) {
      try {
        const secretKey = this.getSessionSecret();
        const { payload } = await jwtVerify(localSessionCookie, secretKey, {
          algorithms: ["HS256"]
        });
        const userId = payload.id;
        if (typeof userId === "number") {
          const user2 = await getUserById(userId);
          if (user2) {
            if (user2.isDeleted === 1) {
              const deletedAt = user2.deletedAt ? new Date(user2.deletedAt) : /* @__PURE__ */ new Date();
              const recoveryDeadline = new Date(deletedAt);
              recoveryDeadline.setDate(recoveryDeadline.getDate() + 30);
              const daysRemaining = Math.ceil((recoveryDeadline.getTime() - Date.now()) / (1e3 * 60 * 60 * 24));
              if (daysRemaining > 0) {
                const maskedPhone = user2.phone ? user2.phone.substring(0, 3) + "****" + user2.phone.substring(7) : "N/A";
                throw new Error(JSON.stringify({ error: "ACCOUNT_PENDING_DELETION", userId: user2.id, phone: maskedPhone, daysRemaining, message: `\u8D26\u53F7\u5904\u4E8E\u6CE8\u9500\u7F13\u51B2\u671F\uFF0C\u8FD8\u6709${daysRemaining}\u5929\u53EF\u6062\u590D` }));
              }
            }
            if (user2.isDeleted === 2) throw ForbiddenError("\u8D26\u53F7\u5DF2\u6C38\u4E45\u5220\u9664\uFF0C\u65E0\u6CD5\u767B\u5F55");
            await upsertUser({ openId: user2.openId, lastSignedIn: signedInAt });
            console.log("[Auth] Authenticated via local session cookie:", user2.name);
            return user2;
          }
        }
      } catch (error) {
        const msg = String(error);
        if (msg.includes("ACCOUNT_PENDING_DELETION") || msg.includes("\u6C38\u4E45\u5220\u9664")) throw error;
        console.warn("[Auth] Local session cookie verification failed:", msg);
      }
    }
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie or token");
    }
    const sessionUserId = session.openId;
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    if (user.isDeleted === 1) {
      const deletedAt = user.deletedAt ? new Date(user.deletedAt) : /* @__PURE__ */ new Date();
      const recoveryDeadline = new Date(deletedAt);
      recoveryDeadline.setDate(recoveryDeadline.getDate() + 30);
      const now = /* @__PURE__ */ new Date();
      const daysRemaining = Math.ceil((recoveryDeadline.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      if (daysRemaining > 0) {
        const maskedPhone = user.phone ? user.phone.substring(0, 3) + "****" + user.phone.substring(7) : "N/A";
        throw new Error(JSON.stringify({
          error: "ACCOUNT_PENDING_DELETION",
          userId: user.id,
          phone: maskedPhone,
          daysRemaining,
          deletedAt: deletedAt.toISOString(),
          recoveryDeadline: recoveryDeadline.toISOString(),
          message: `\u8D26\u53F7\u5904\u4E8E\u6CE8\u9500\u7F13\u51B2\u671F\uFF0C\u8FD8\u6709${daysRemaining}\u5929\u53EF\u6062\u590D`
        }));
      }
    }
    if (user.isDeleted === 2) {
      throw ForbiddenError("\u8D26\u53F7\u5DF2\u6C38\u4E45\u5220\u9664\uFF0C\u65E0\u6CD5\u767B\u5F55");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    console.log("[Auth] Authenticated via Session Cookie:", user.name);
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      await autoLinkCustomerToUser(userInfo.openId);
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/routers.ts
import { z as z29 } from "zod";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/systemRouter.ts
init_trpc();
init_db();
import { readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  version: publicProcedure.query(() => {
    try {
      const packagePath = join(process.cwd(), "package.json");
      const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
      const version = packageJson.version;
      try {
        const versionPath = join(process.cwd(), "client/public/version.json");
        const versionData = JSON.parse(readFileSync(versionPath, "utf-8"));
        return {
          version,
          // 使用package.json的version
          buildTime: versionData.buildTime,
          branch: versionData.branch,
          isDirty: versionData.isDirty,
          serverTime: (/* @__PURE__ */ new Date()).toISOString()
        };
      } catch {
        return {
          version,
          buildTime: "unknown",
          branch: "unknown",
          isDirty: false,
          serverTime: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    } catch (error) {
      try {
        const gitHash = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
        const isDirty = execSync("git status --porcelain", { encoding: "utf-8" }).trim().length > 0;
        const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
        const version = isDirty ? `${gitHash}-dirty` : gitHash;
        return {
          version,
          buildTime: (/* @__PURE__ */ new Date()).toISOString(),
          branch,
          isDirty,
          serverTime: (/* @__PURE__ */ new Date()).toISOString()
        };
      } catch {
        return {
          version: "unknown",
          buildTime: "unknown",
          branch: "unknown",
          isDirty: false,
          serverTime: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    }
  }),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  }),
  batchUpdateOrderNumbers: adminProcedure.mutation(async () => {
    const updatedCount = await batchUpdateOrderNumbers();
    return {
      success: true,
      updatedCount
    };
  })
});

// server/routers.ts
init_trpc();

// server/importRouter.ts
init_trpc();
init_db();
import { z as z2 } from "zod";
import { TRPCError as TRPCError3 } from "@trpc/server";

// server/fileParser.ts
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { parseString } from "xml2js";
import ical from "ical";
import { promisify } from "util";
var parseXML = promisify(parseString);
async function parseAlipayCSV(fileBuffer) {
  const content = fileBuffer.toString("utf-8");
  const lines = content.split("\n");
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("\u4EA4\u6613\u53F7") || lines[i].includes("\u5546\u5BB6\u8BA2\u5355\u53F7")) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) {
    throw new Error("\u65E0\u6CD5\u627E\u5230CSV\u8868\u5934");
  }
  const csvContent = lines.slice(headerIndex).join("\n");
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  return records.map((record) => ({
    orderNo: record["\u4EA4\u6613\u53F7"] || record["\u4EA4\u6613\u6D41\u6C34\u53F7"] || "",
    merchantOrderNo: record["\u5546\u5BB6\u8BA2\u5355\u53F7"] || "",
    createTime: record["\u4EA4\u6613\u521B\u5EFA\u65F6\u95F4"] || "",
    paymentTime: record["\u4ED8\u6B3E\u65F6\u95F4"] || "",
    updateTime: record["\u6700\u8FD1\u4FEE\u6539\u65F6\u95F4"] || "",
    transactionSource: record["\u4EA4\u6613\u6765\u6E90\u5730"] || "",
    transactionType: record["\u7C7B\u578B"] || "",
    counterparty: record["\u4EA4\u6613\u5BF9\u65B9"] || "",
    productName: record["\u5546\u54C1\u540D\u79F0"] || "",
    amount: record["\u91D1\u989D\uFF08\u5143\uFF09"] || record["\u91D1\u989D"] || "0",
    inOut: record["\u6536/\u652F"] || "",
    status: record["\u4EA4\u6613\u72B6\u6001"] || "",
    serviceFee: record["\u670D\u52A1\u8D39\uFF08\u5143\uFF09"] || "0",
    refundAmount: record["\u6210\u529F\u9000\u6B3E\uFF08\u5143\uFF09"] || "0",
    remarks: record["\u5907\u6CE8"] || "",
    fundStatus: record["\u8D44\u91D1\u72B6\u6001"] || ""
  }));
}
async function parseWechatExcel(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  let headerIndex = -1;
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (row.some((cell) => cell && cell.toString().includes("\u4EA4\u6613\u65F6\u95F4"))) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) {
    throw new Error("\u65E0\u6CD5\u627E\u5230Excel\u8868\u5934");
  }
  const headers = jsonData[headerIndex];
  const dataRows = jsonData.slice(headerIndex + 1);
  return dataRows.filter((row) => row && row.length > 0).map((row) => {
    const record = {};
    headers.forEach((header, index2) => {
      record[header] = row[index2] || "";
    });
    return {
      transactionTime: record["\u4EA4\u6613\u65F6\u95F4"] || "",
      transactionType: record["\u4EA4\u6613\u7C7B\u578B"] || "",
      counterparty: record["\u4EA4\u6613\u5BF9\u65B9"] || "",
      productName: record["\u5546\u54C1"] || "",
      inOut: record["\u6536/\u652F"] || "",
      amount: record["\u91D1\u989D(\u5143)"] || "0",
      paymentMethod: record["\u652F\u4ED8\u65B9\u5F0F"] || "",
      status: record["\u5F53\u524D\u72B6\u6001"] || "",
      orderNo: record["\u4EA4\u6613\u5355\u53F7"] || "",
      merchantOrderNo: record["\u5546\u6237\u5355\u53F7"] || "",
      remarks: record["\u5907\u6CE8"] || ""
    };
  });
}
async function parseICS(fileBuffer) {
  const content = fileBuffer.toString("utf-8");
  const events = ical.parseICS(content);
  const extractRawDateTime = (summary) => {
    const summaryEscaped = summary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const summaryIndex = content.indexOf(`SUMMARY:${summary}`);
    if (summaryIndex === -1) return null;
    const beforeSummary = content.substring(Math.max(0, summaryIndex - 500), summaryIndex);
    const dtstartMatch = beforeSummary.match(/DTSTART(?:;TZID=[^:]+)?:(\d{8}T\d{6})/);
    const dtendMatch = beforeSummary.match(/DTEND(?:;TZID=[^:]+)?:(\d{8}T\d{6})/);
    if (dtstartMatch && dtendMatch) {
      const parseICSDate = (dateStr) => {
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        const hour = parseInt(dateStr.substring(9, 11));
        const minute = parseInt(dateStr.substring(11, 13));
        const second = parseInt(dateStr.substring(13, 15));
        return new Date(year, month, day, hour, minute, second);
      };
      return {
        startTime: parseICSDate(dtstartMatch[1]),
        endTime: parseICSDate(dtendMatch[1])
      };
    }
    return null;
  };
  const result = [];
  for (const key in events) {
    const event = events[key];
    if (event.type === "VEVENT") {
      let organizerName = "";
      if (event.organizer) {
        if (typeof event.organizer === "object" && event.organizer.params && event.organizer.params.CN) {
          organizerName = event.organizer.params.CN.replace(/"/g, "");
        } else if (typeof event.organizer === "string") {
          organizerName = event.organizer;
        }
      }
      const rawDateTime = extractRawDateTime(event.summary || "");
      let startTime;
      let endTime;
      if (rawDateTime) {
        startTime = rawDateTime.startTime;
        endTime = rawDateTime.endTime;
      } else {
        startTime = event.start instanceof Date ? event.start : new Date(event.start || Date.now());
        endTime = event.end instanceof Date ? event.end : new Date(event.end || Date.now());
      }
      result.push({
        summary: event.summary || "",
        description: event.description || "",
        location: event.location || "",
        startTime,
        endTime,
        organizer: organizerName,
        attendees: event.attendee ? Array.isArray(event.attendee) ? event.attendee.map(String) : [String(event.attendee)] : []
      });
    }
  }
  return result;
}

// server/importRouter.ts
var importProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "sales" && ctx.user.role !== "finance") {
    throw new TRPCError3({ code: "FORBIDDEN", message: "\u9700\u8981\u7BA1\u7406\u5458\u3001\u9500\u552E\u6216\u8D22\u52A1\u6743\u9650" });
  }
  return next({ ctx });
});
var importRouter = router({
  // 解析CSV文件(支付宝交易明细)
  parseCSV: importProcedure.input(
    z2.object({
      fileContent: z2.string()
      // base64编码的文件内容
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      const buffer = Buffer.from(input.fileContent, "base64");
      const records = await parseAlipayCSV(buffer);
      const logId = await createImportLog({
        fileName: "alipay_transactions.csv",
        fileType: "csv",
        dataType: "preview",
        totalRows: records.length,
        successRows: records.length,
        failedRows: 0,
        importedBy: ctx.user.id
      });
      return {
        success: true,
        recordCount: records.length,
        records: records.slice(0, 10),
        // 返回前10条预览
        logId
      };
    } catch (error) {
      await createImportLog({
        fileName: "alipay_transactions.csv",
        fileType: "csv",
        dataType: "preview",
        totalRows: 0,
        successRows: 0,
        failedRows: 0,
        errorLog: error.message,
        importedBy: ctx.user.id
      });
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: `CSV\u89E3\u6790\u5931\u8D25: ${error.message}`
      });
    }
  }),
  // 导入CSV数据到订单表
  importCSVToOrders: importProcedure.input(
    z2.object({
      fileContent: z2.string(),
      customerId: z2.number().optional()
      // 可选的默认客户ID
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      const buffer = Buffer.from(input.fileContent, "base64");
      const records = await parseAlipayCSV(buffer);
      let successCount = 0;
      let failedCount = 0;
      const errors = [];
      for (const record of records) {
        try {
          if (record.inOut !== "\u6536\u5165" || record.status !== "\u4EA4\u6613\u6210\u529F") {
            continue;
          }
          const existingOrder = await getOrderById(parseInt(record.orderNo) || 0);
          if (existingOrder) {
            continue;
          }
          await createOrder({
            orderNo: record.merchantOrderNo || record.orderNo,
            customerId: input.customerId || 0,
            // 需要关联客户
            paymentAmount: record.amount,
            courseAmount: record.amount,
            paymentChannel: "\u652F\u4ED8\u5B9D",
            channelOrderNo: record.orderNo,
            paymentDate: record.paymentTime ? new Date(record.paymentTime) : null,
            status: "paid",
            salesId: ctx.user.id,
            notes: `${record.productName} - ${record.counterparty}`
          });
          successCount++;
        } catch (error) {
          failedCount++;
          errors.push(`\u8BA2\u5355${record.orderNo}: ${error.message}`);
        }
      }
      await createImportLog({
        fileName: "alipay_transactions.csv",
        fileType: "csv",
        dataType: "orders",
        totalRows: records.length,
        successRows: successCount,
        failedRows: failedCount,
        errorLog: errors.length > 0 ? errors.slice(0, 5).join("; ") : void 0,
        importedBy: ctx.user.id
      });
      return {
        success: true,
        totalRecords: records.length,
        successCount,
        failedCount,
        errors: errors.slice(0, 10)
      };
    } catch (error) {
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: `\u5BFC\u5165\u5931\u8D25: ${error.message}`
      });
    }
  }),
  // 解析Excel文件(微信支付账单)
  parseExcel: importProcedure.input(
    z2.object({
      fileContent: z2.string()
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      const buffer = Buffer.from(input.fileContent, "base64");
      const records = await parseWechatExcel(buffer);
      await createImportLog({
        fileName: "wechat_transactions.xlsx",
        fileType: "excel",
        dataType: "preview",
        totalRows: records.length,
        successRows: records.length,
        failedRows: 0,
        importedBy: ctx.user.id
      });
      return {
        success: true,
        recordCount: records.length,
        records: records.slice(0, 10)
      };
    } catch (error) {
      await createImportLog({
        fileName: "wechat_transactions.xlsx",
        fileType: "excel",
        dataType: "preview",
        totalRows: 0,
        successRows: 0,
        failedRows: 0,
        errorLog: error.message,
        importedBy: ctx.user.id
      });
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: `Excel\u89E3\u6790\u5931\u8D25: ${error.message}`
      });
    }
  }),
  // 导入Excel数据到订单表
  importExcelToOrders: importProcedure.input(
    z2.object({
      fileContent: z2.string(),
      customerId: z2.number().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      const buffer = Buffer.from(input.fileContent, "base64");
      const records = await parseWechatExcel(buffer);
      let successCount = 0;
      let failedCount = 0;
      const errors = [];
      for (const record of records) {
        try {
          if (record.inOut !== "\u6536\u5165" || record.status !== "\u652F\u4ED8\u6210\u529F") {
            continue;
          }
          await createOrder({
            orderNo: record.merchantOrderNo || record.orderNo,
            customerId: input.customerId || 0,
            paymentAmount: record.amount,
            courseAmount: record.amount,
            paymentChannel: "\u5FAE\u4FE1\u652F\u4ED8",
            channelOrderNo: record.orderNo,
            paymentDate: record.transactionTime ? new Date(record.transactionTime) : null,
            status: "paid",
            salesId: ctx.user.id,
            notes: `${record.productName} - ${record.counterparty}`
          });
          successCount++;
        } catch (error) {
          failedCount++;
          errors.push(`\u8BA2\u5355${record.orderNo}: ${error.message}`);
        }
      }
      await createImportLog({
        fileName: "wechat_transactions.xlsx",
        fileType: "excel",
        dataType: "orders",
        totalRows: records.length,
        successRows: successCount,
        failedRows: failedCount,
        errorLog: errors.length > 0 ? errors.slice(0, 5).join("; ") : void 0,
        importedBy: ctx.user.id
      });
      return {
        success: true,
        totalRecords: records.length,
        successCount,
        failedCount,
        errors: errors.slice(0, 10)
      };
    } catch (error) {
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: `\u5BFC\u5165\u5931\u8D25: ${error.message}`
      });
    }
  }),
  // 解析ICS文件(日历排课)
  parseICS: importProcedure.input(
    z2.object({
      fileContent: z2.string()
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      const buffer = Buffer.from(input.fileContent, "base64");
      const events = await parseICS(buffer);
      await createImportLog({
        fileName: "calendar.ics",
        fileType: "ics",
        dataType: "preview",
        totalRows: events.length,
        successRows: events.length,
        failedRows: 0,
        importedBy: ctx.user.id
      });
      return {
        success: true,
        recordCount: events.length,
        events: events.slice(0, 10)
      };
    } catch (error) {
      await createImportLog({
        fileName: "calendar.ics",
        fileType: "ics",
        dataType: "preview",
        totalRows: 0,
        successRows: 0,
        failedRows: 0,
        errorLog: error.message,
        importedBy: ctx.user.id
      });
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: `ICS\u89E3\u6790\u5931\u8D25: ${error.message}`
      });
    }
  }),
  // 获取导入历史记录
  getLogs: protectedProcedure.query(async () => {
    return getImportLogs();
  })
});

// server/salespersonRouter.ts
init_trpc();
init_db();
import { z as z3 } from "zod";
import { TRPCError as TRPCError4 } from "@trpc/server";
var adminProcedure2 = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError4({ code: "FORBIDDEN", message: "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650" });
  }
  return next({ ctx });
});
var salespersonRouter = router({
  // 获取所有销售人员
  list: protectedProcedure.query(async () => {
    return getAllSalespersons();
  }),
  // 搜索销售人员
  search: protectedProcedure.input(z3.object({ keyword: z3.string() })).query(async ({ input }) => {
    return searchSalespersons(input.keyword);
  }),
  // 创建销售人员：自动同步到users表
  create: adminProcedure2.input(z3.object({
    name: z3.string().min(1, "\u59D3\u540D\u4E0D\u80FD\u4E3A\u7A7A"),
    nickname: z3.string().optional(),
    phone: z3.string().optional(),
    email: z3.string().email().optional().or(z3.literal("")),
    wechat: z3.string().optional(),
    aliases: z3.string().optional(),
    // JSON字符串
    commissionRate: z3.number().min(0).max(100).optional(),
    notes: z3.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const userId = await createUser({
      openId: `sales_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: input.name,
      nickname: input.nickname,
      phone: input.phone,
      email: input.email,
      wechat: input.wechat,
      aliases: input.aliases,
      role: "sales",
      roles: "sales",
      isActive: true
    });
    const salespersonId = await createSalesperson({
      userId,
      commissionRate: input.commissionRate?.toString(),
      notes: input.notes
    });
    return { id: salespersonId, success: true };
  }),
  // 更新销售人员：自动同步到users表（支持部分字段更新）
  update: adminProcedure2.input(z3.object({
    id: z3.number(),
    name: z3.string().min(1, "\u59D3\u540D\u4E0D\u80FD\u4E3A\u7A7A").optional(),
    nickname: z3.string().optional(),
    phone: z3.string().optional(),
    email: z3.string().email().optional().or(z3.literal("")),
    wechat: z3.string().optional(),
    aliases: z3.string().optional(),
    // JSON字符串
    commissionRate: z3.number().min(0).max(100).optional(),
    notes: z3.string().optional()
  })).mutation(async ({ input }) => {
    const { id, ...updates } = input;
    const salesperson = await getSalespersonById(id);
    if (!salesperson) {
      throw new TRPCError4({ code: "NOT_FOUND", message: "\u9500\u552E\u4EBA\u5458\u4E0D\u5B58\u5728" });
    }
    const userUpdates = {};
    const salespersonUpdates = {};
    const userFields = ["name", "nickname", "phone", "email", "wechat", "aliases"];
    for (const field of userFields) {
      if (field in updates && updates[field] !== void 0) {
        userUpdates[field] = updates[field];
      }
    }
    if ("commissionRate" in updates && updates.commissionRate !== void 0) {
      salespersonUpdates.commissionRate = updates.commissionRate.toString();
    }
    if ("notes" in updates && updates.notes !== void 0) {
      salespersonUpdates.notes = updates.notes;
    }
    if (Object.keys(userUpdates).length > 0) {
      await updateUser(salesperson.userId, userUpdates);
    }
    if (Object.keys(salespersonUpdates).length > 0) {
      await updateSalesperson(id, salespersonUpdates);
    }
    return { success: true };
  }),
  // 删除销售人员(软删除,设置为不活跃)
  delete: adminProcedure2.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
    await deleteSalesperson(input.id);
    return { success: true };
  }),
  // 更新销售人员状态
  updateStatus: adminProcedure2.input(z3.object({
    id: z3.number(),
    isActive: z3.boolean()
  })).mutation(async ({ input }) => {
    await updateSalespersonStatus(input.id, input.isActive);
    return { success: true };
  }),
  // 获取销售统计数据
  getStatistics: protectedProcedure.input(z3.object({
    salespersonId: z3.number().optional(),
    startDate: z3.string().optional(),
    endDate: z3.string().optional(),
    groupBy: z3.enum(["month", "year"]).optional()
  })).query(async ({ input }) => {
    return getSalesStatistics(input);
  }),
  // 获取月度销售额
  getMonthlySales: protectedProcedure.input(z3.object({
    salespersonId: z3.number().optional(),
    year: z3.number()
  })).query(async ({ input }) => {
    return getMonthlySales(input.salespersonId, input.year);
  }),
  // 获取年度销售额
  getYearlySales: protectedProcedure.input(z3.object({
    salespersonId: z3.number().optional(),
    startYear: z3.number().optional(),
    endYear: z3.number().optional()
  })).query(async ({ input }) => {
    return getYearlySales(input.salespersonId, input.startYear, input.endYear);
  }),
  // 更新所有销售人员的销售数据
  updateAllStats: adminProcedure2.mutation(async () => {
    const results = await updateAllSalespersonStats();
    return {
      success: true,
      data: results,
      message: `\u5DF2\u66F4\u65B0 ${results.length} \u4F4D\u9500\u552E\u4EBA\u5458\u7684\u6570\u636E`
    };
  }),
  // 更新单个销售人员的销售数据
  updateStats: adminProcedure2.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
    const result = await updateSalespersonStats(input.id);
    return {
      success: true,
      data: result,
      message: `\u5DF2\u66F4\u65B0\u9500\u552E\u4EBA\u5458 ${result.name} \u7684\u6570\u636E`
    };
  }),
  // 批量导入更新销售人员（仅ID匹配，只更新提成比例/备注/在职状态）
  batchImport: adminProcedure2.input(z3.object({
    rows: z3.array(z3.object({
      id: z3.number(),
      commissionRate: z3.number().min(0).max(100).optional(),
      notes: z3.string().optional(),
      isActive: z3.boolean().optional()
    }))
  })).mutation(async ({ input }) => {
    const result = await batchImportSalespersons(input.rows);
    return result;
  })
});

// server/trafficSourceConfigRouter.ts
init_trpc();
init_db();
init_schema();
import { z as z4 } from "zod";
import { eq as eq2 } from "drizzle-orm";
var trafficSourceConfigRouter = router({
  /**
   * 获取流量来源别名配置
   */
  getAliasConfig: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const config = await db.select().from(gmailImportConfig).where(eq2(gmailImportConfig.configKey, "traffic_source_aliases")).limit(1);
    if (config.length === 0) {
      return [];
    }
    return config[0].configValue;
  }),
  /**
   * 更新流量来源别名配置
   */
  updateAliasConfig: protectedProcedure.input(
    z4.object({
      aliases: z4.array(
        z4.object({
          pattern: z4.string(),
          standardName: z4.string()
        })
      )
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(gmailImportConfig).where(eq2(gmailImportConfig.configKey, "traffic_source_aliases")).limit(1);
    if (existing.length === 0) {
      await db.insert(gmailImportConfig).values({
        configKey: "traffic_source_aliases",
        configValue: input.aliases,
        description: "\u6D41\u91CF\u6765\u6E90\u522B\u540D\u6620\u5C04\u914D\u7F6E"
      });
    } else {
      await db.update(gmailImportConfig).set({
        configValue: input.aliases,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(gmailImportConfig.configKey, "traffic_source_aliases"));
    }
    return { success: true };
  }),
  /**
   * 获取流量来源统计数据
   */
  getTrafficSourceStats: protectedProcedure.input(
    z4.object({
      startDate: z4.string().optional(),
      endDate: z4.string().optional()
    }).optional()
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { getTrafficSourceStats: getTrafficSourceStats2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    return getTrafficSourceStats2(input?.startDate, input?.endDate);
  })
});

// server/transportFeeFixRouter.ts
init_trpc();
init_db();
import { z as z5 } from "zod";
var transportFeeFixRouter = router({
  /**
   * 检测可能存在车费识别问题的订单
   * 查找备注中包含"车费"但transportFee为0的订单
   */
  detectIssues: publicProcedure.query(async () => {
    const issues = await detectTransportFeeIssues();
    return issues;
  }),
  /**
   * 批量修复车费识别问题
   * 重新解析备注并更新transportFee和teacherFee字段
   */
  batchFix: publicProcedure.input(z5.object({
    orderIds: z5.array(z5.number())
  })).mutation(async ({ input }) => {
    const result = await batchFixTransportFee(input.orderIds);
    return result;
  }),
  /**
   * 获取单个订单详情(用于预览修复效果)
   */
  getOrderDetail: publicProcedure.input(z5.object({
    orderId: z5.number()
  })).query(async ({ input }) => {
    const order = await getOrderById(input.orderId);
    return order;
  })
});

// server/parsingLearningRouter.ts
init_trpc();
init_schema();
init_db();
import { z as z6 } from "zod";
import { desc as desc2, eq as eq3 } from "drizzle-orm";
var parsingLearningRouter = router({
  /**
   * 记录用户修正
   */
  recordCorrection: protectedProcedure.input(z6.object({
    originalText: z6.string(),
    fieldName: z6.string(),
    llmValue: z6.string().nullable(),
    correctedValue: z6.string(),
    correctionType: z6.enum(["field_missing", "field_wrong", "format_error", "logic_error", "manual_edit"]),
    context: z6.record(z6.string(), z6.any()).optional()
    // 其他字段的值作为上下文
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(parsingCorrections).values([{
      originalText: input.originalText,
      fieldName: input.fieldName,
      llmValue: input.llmValue,
      correctedValue: input.correctedValue,
      correctionType: input.correctionType,
      context: input.context ? JSON.stringify(input.context) : null,
      userId: ctx.user.id,
      userName: ctx.user.name || ctx.user.nickname || "\u672A\u77E5\u7528\u6237",
      isLearned: false
    }]);
    return { success: true };
  }),
  /**
   * 记录订单编辑修正(用于手动编辑订单的学习)
   */
  recordOrderEdit: protectedProcedure.input(z6.object({
    orderId: z6.number(),
    originalText: z6.string(),
    // 订单的原始文本(备注或原始数据来源)
    fieldName: z6.string(),
    // 修改的字段名
    oldValue: z6.string().nullable(),
    // 修改前的值
    newValue: z6.string(),
    // 修改后的值
    reason: z6.string().optional(),
    // 修改原因(用户输入)
    context: z6.record(z6.string(), z6.any()).optional()
    // 订单其他字段作为上下文
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    let originalText = input.originalText;
    if (input.reason) {
      originalText += `

\u4FEE\u6539\u539F\u56E0: ${input.reason}`;
    }
    await db.insert(parsingCorrections).values([{
      originalText,
      fieldName: input.fieldName,
      llmValue: input.oldValue,
      correctedValue: input.newValue,
      correctionType: "manual_edit",
      context: input.context ? JSON.stringify(input.context) : null,
      userId: ctx.user.id,
      userName: ctx.user.name || ctx.user.nickname || "\u672A\u77E5\u7528\u6237",
      isLearned: false
    }]);
    return { success: true };
  }),
  /**
   * 获取未学习的修正记录
   */
  getUnlearnedCorrections: protectedProcedure.input(z6.object({
    limit: z6.number().default(100)
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const corrections = await db.select().from(parsingCorrections).where(eq3(parsingCorrections.isLearned, false)).orderBy(desc2(parsingCorrections.createdAt)).limit(input.limit);
    return corrections;
  }),
  /**
   * 标记修正记录为已学习
   */
  markAsLearned: protectedProcedure.input(z6.object({
    correctionIds: z6.array(z6.number())
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    for (const id of input.correctionIds) {
      await db.update(parsingCorrections).set({
        isLearned: true,
        learnedAt: /* @__PURE__ */ new Date()
      }).where(eq3(parsingCorrections.id, id));
    }
    return { success: true };
  }),
  /**
   * 获取修正统计
   */
  getCorrectionStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const allCorrections = await db.select().from(parsingCorrections);
    const stats = {
      total: allCorrections.length,
      unlearned: allCorrections.filter((c) => !c.isLearned).length,
      byField: {},
      byType: {}
    };
    allCorrections.forEach((c) => {
      if (!stats.byField[c.fieldName]) {
        stats.byField[c.fieldName] = 0;
      }
      stats.byField[c.fieldName]++;
      if (!stats.byType[c.correctionType]) {
        stats.byType[c.correctionType] = 0;
      }
      stats.byType[c.correctionType]++;
    });
    return stats;
  }),
  /**
   * 获取prompt优化历史
   */
  getOptimizationHistory: protectedProcedure.input(z6.object({
    limit: z6.number().default(20)
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const history = await db.select().from(promptOptimizationHistory).orderBy(desc2(promptOptimizationHistory.createdAt)).limit(input.limit);
    return history;
  }),
  /**
   * 创建prompt优化记录
   */
  createOptimization: protectedProcedure.input(z6.object({
    version: z6.string(),
    optimizationType: z6.enum(["add_example", "update_rule", "fix_error_pattern"]),
    changeDescription: z6.string(),
    newExamples: z6.array(z6.string()).optional(),
    correctionCount: z6.number()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.insert(promptOptimizationHistory).values([{
      version: input.version,
      optimizationType: input.optimizationType,
      changeDescription: input.changeDescription,
      newExamples: input.newExamples ? JSON.stringify(input.newExamples) : null,
      correctionCount: input.correctionCount,
      isActive: true,
      createdBy: ctx.user.id
    }]);
    return { success: true, id: result[0].insertId };
  }),
  /**
   * 触发自动优化
   */
  triggerAutoOptimization: protectedProcedure.input(z6.object({
    minCorrections: z6.number().default(10)
  })).mutation(async ({ input }) => {
    const { autoOptimizePrompt: autoOptimizePrompt2 } = await Promise.resolve().then(() => (init_promptOptimizer(), promptOptimizer_exports));
    const result = await autoOptimizePrompt2(input.minCorrections);
    return result;
  }),
  /**
   * 分析修正模式(不触发优化)
   */
  analyzePatterns: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const corrections = await db.select().from(parsingCorrections).where(eq3(parsingCorrections.isLearned, false));
    if (corrections.length === 0) {
      return { corrections: 0, patterns: [], recommendations: [] };
    }
    const { analyzeCorrectionPatterns: analyzeCorrectionPatterns2 } = await Promise.resolve().then(() => (init_promptOptimizer(), promptOptimizer_exports));
    const analysis = await analyzeCorrectionPatterns2(corrections);
    return {
      corrections: corrections.length,
      ...analysis
    };
  }),
  /**
   * 获取配置
   */
  getConfig: protectedProcedure.input(z6.object({
    configKey: z6.string()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const configs = await db.select().from(parsingLearningConfig).where(eq3(parsingLearningConfig.configKey, input.configKey));
    if (configs.length === 0) {
      return null;
    }
    return {
      ...configs[0],
      configValue: JSON.parse(configs[0].configValue)
    };
  }),
  /**
   * 设置配置
   */
  setConfig: protectedProcedure.input(z6.object({
    configKey: z6.string(),
    configValue: z6.any(),
    description: z6.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(parsingLearningConfig).where(eq3(parsingLearningConfig.configKey, input.configKey));
    if (existing.length > 0) {
      await db.update(parsingLearningConfig).set({
        configValue: JSON.stringify(input.configValue),
        description: input.description,
        updatedBy: ctx.user.id
      }).where(eq3(parsingLearningConfig.configKey, input.configKey));
    } else {
      await db.insert(parsingLearningConfig).values([{
        configKey: input.configKey,
        configValue: JSON.stringify(input.configValue),
        description: input.description,
        updatedBy: ctx.user.id
      }]);
    }
    return { success: true };
  }),
  /**
   * 批量标注修正记录
   */
  batchAnnotate: protectedProcedure.input(z6.object({
    correctionIds: z6.array(z6.number()),
    annotationType: z6.enum(["typical_error", "edge_case", "common_pattern", "none"]),
    annotationNote: z6.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    for (const id of input.correctionIds) {
      await db.update(parsingCorrections).set({
        annotationType: input.annotationType,
        annotationNote: input.annotationNote,
        annotatedBy: ctx.user.id,
        annotatedAt: /* @__PURE__ */ new Date()
      }).where(eq3(parsingCorrections.id, id));
    }
    return {
      success: true,
      count: input.correctionIds.length
    };
  })
});

// server/reconciliationRouter.ts
init_trpc();
import { z as z7 } from "zod";
import { TRPCError as TRPCError5 } from "@trpc/server";

// server/reconciliationDb.ts
init_db();
init_schema();
import { eq as eq4, and as and3, isNull as isNull2, gte as gte2, lte as lte2 } from "drizzle-orm";
async function createMatch(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(matchedScheduleOrders).values({
    scheduleId: data.scheduleId,
    orderId: data.orderId,
    matchMethod: data.matchMethod,
    confidence: data.confidence?.toString(),
    matchDetails: data.matchDetails,
    isVerified: data.isVerified ?? false,
    verifiedBy: data.verifiedBy,
    verifiedAt: data.isVerified ? /* @__PURE__ */ new Date() : void 0
  });
  return result;
}
async function updateMatch(matchId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(matchedScheduleOrders).set({
    ...data.orderId !== void 0 && { orderId: data.orderId },
    ...data.confidence !== void 0 && { confidence: data.confidence.toString() },
    ...data.matchDetails !== void 0 && { matchDetails: data.matchDetails },
    ...data.isVerified !== void 0 && { isVerified: data.isVerified },
    ...data.verifiedBy !== void 0 && { verifiedBy: data.verifiedBy },
    ...data.isVerified && { verifiedAt: /* @__PURE__ */ new Date() }
  }).where(eq4(matchedScheduleOrders.id, matchId));
}
async function deleteMatch(matchId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(matchedScheduleOrders).where(eq4(matchedScheduleOrders.id, matchId));
}
async function getAllMatches() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = await db.select({
    match: matchedScheduleOrders,
    schedule: schedules,
    order: orders
  }).from(matchedScheduleOrders).leftJoin(schedules, eq4(matchedScheduleOrders.scheduleId, schedules.id)).leftJoin(orders, eq4(matchedScheduleOrders.orderId, orders.id));
  return results;
}
async function getUnmatchedSchedules() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = await db.select().from(schedules).leftJoin(matchedScheduleOrders, eq4(schedules.id, matchedScheduleOrders.scheduleId)).where(isNull2(matchedScheduleOrders.id));
  return results.map((r) => r.schedules);
}
async function getUnmatchedOrders() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = await db.select().from(orders).leftJoin(matchedScheduleOrders, eq4(orders.id, matchedScheduleOrders.orderId)).where(isNull2(matchedScheduleOrders.id));
  return results.map((r) => r.orders);
}
async function getMonthlyReconciliationReport(params) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let query = db.select({
    match: matchedScheduleOrders,
    schedule: schedules,
    order: orders
  }).from(matchedScheduleOrders).innerJoin(schedules, eq4(matchedScheduleOrders.scheduleId, schedules.id)).innerJoin(orders, eq4(matchedScheduleOrders.orderId, orders.id)).where(
    and3(
      gte2(schedules.classDate, params.startDate),
      lte2(schedules.classDate, params.endDate)
    )
  );
  const results = await query;
  const stats = {
    totalMatches: results.length,
    totalRevenue: 0,
    totalTeacherFee: 0,
    totalTransportFee: 0,
    totalOtherFee: 0,
    totalPartnerFee: 0,
    totalExpense: 0,
    netProfit: 0,
    byCity: {},
    bySalesPerson: {}
  };
  results.forEach(({ schedule, order }) => {
    const revenue = parseFloat(order.courseAmount || "0");
    const teacherFee = parseFloat(schedule.teacherFee || order.teacherFee || "0");
    const transportFee = parseFloat(schedule.transportFee || order.transportFee || "0");
    const otherFee = parseFloat(schedule.otherFee || order.otherFee || "0");
    const partnerFee = parseFloat(schedule.partnerFee || order.partnerFee || "0");
    const expense = teacherFee + transportFee + otherFee + partnerFee;
    stats.totalRevenue += revenue;
    stats.totalTeacherFee += teacherFee;
    stats.totalTransportFee += transportFee;
    stats.totalOtherFee += otherFee;
    stats.totalPartnerFee += partnerFee;
    stats.totalExpense += expense;
    stats.netProfit += revenue - expense;
    const city = schedule.deliveryCity || order.deliveryCity || "\u672A\u77E5";
    if (!stats.byCity[city]) {
      stats.byCity[city] = { revenue: 0, expense: 0, profit: 0, count: 0 };
    }
    stats.byCity[city].revenue += revenue;
    stats.byCity[city].expense += expense;
    stats.byCity[city].profit += revenue - expense;
    stats.byCity[city].count += 1;
    const salesPerson = schedule.salesName || order.salesPerson || "\u672A\u77E5";
    if (!stats.bySalesPerson[salesPerson]) {
      stats.bySalesPerson[salesPerson] = { revenue: 0, expense: 0, profit: 0, count: 0 };
    }
    stats.bySalesPerson[salesPerson].revenue += revenue;
    stats.bySalesPerson[salesPerson].expense += expense;
    stats.bySalesPerson[salesPerson].profit += revenue - expense;
    stats.bySalesPerson[salesPerson].count += 1;
  });
  return {
    stats,
    details: results
  };
}

// server/reconciliationRouter.ts
var reconciliationProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "finance") {
    throw new TRPCError5({ code: "FORBIDDEN", message: "\u9700\u8981\u7BA1\u7406\u5458\u6216\u8D22\u52A1\u6743\u9650" });
  }
  return next({ ctx });
});
var reconciliationRouter = router({
  /**
   * 智能匹配（已停用）
   */
  intelligentMatch: reconciliationProcedure.input(
    z7.object({
      scheduleIds: z7.array(z7.number()).optional(),
      orderIds: z7.array(z7.number()).optional()
    })
  ).mutation(async () => {
    throw new TRPCError5({
      code: "METHOD_NOT_SUPPORTED",
      message: "\u667A\u80FD\u5339\u914D\u529F\u80FD\u5DF2\u505C\u7528\uFF0C\u8BF7\u4F7F\u7528\u624B\u52A8\u5339\u914D\u529F\u80FD"
    });
  }),
  /**
   * 手动创建匹配关系
   */
  createMatch: reconciliationProcedure.input(
    z7.object({
      scheduleId: z7.number(),
      orderId: z7.number()
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      await createMatch({
        scheduleId: input.scheduleId,
        orderId: input.orderId,
        matchMethod: "manual",
        confidence: 100,
        isVerified: true,
        verifiedBy: ctx.user.id
      });
      return { success: true, message: "\u5339\u914D\u5173\u7CFB\u521B\u5EFA\u6210\u529F" };
    } catch (error) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: `\u521B\u5EFA\u5339\u914D\u5173\u7CFB\u5931\u8D25: ${error.message}`
      });
    }
  }),
  /**
   * 更新匹配关系
   */
  updateMatch: reconciliationProcedure.input(
    z7.object({
      matchId: z7.number(),
      orderId: z7.number().optional(),
      isVerified: z7.boolean().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      await updateMatch(input.matchId, {
        orderId: input.orderId,
        isVerified: input.isVerified,
        verifiedBy: input.isVerified ? ctx.user.id : void 0
      });
      return { success: true, message: "\u5339\u914D\u5173\u7CFB\u66F4\u65B0\u6210\u529F" };
    } catch (error) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: `\u66F4\u65B0\u5339\u914D\u5173\u7CFB\u5931\u8D25: ${error.message}`
      });
    }
  }),
  /**
   * 删除匹配关系
   */
  deleteMatch: reconciliationProcedure.input(z7.object({ matchId: z7.number() })).mutation(async ({ input }) => {
    try {
      await deleteMatch(input.matchId);
      return { success: true, message: "\u5339\u914D\u5173\u7CFB\u5220\u9664\u6210\u529F" };
    } catch (error) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: `\u5220\u9664\u5339\u914D\u5173\u7CFB\u5931\u8D25: ${error.message}`
      });
    }
  }),
  /**
   * 获取所有匹配关系
   */
  getAllMatches: reconciliationProcedure.query(async () => {
    try {
      const matches = await getAllMatches();
      return matches;
    } catch (error) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: `\u83B7\u53D6\u5339\u914D\u5173\u7CFB\u5931\u8D25: ${error.message}`
      });
    }
  }),
  /**
   * 获取未匹配的课程日程
   */
  getUnmatchedSchedules: reconciliationProcedure.query(async () => {
    try {
      const schedules2 = await getUnmatchedSchedules();
      return schedules2;
    } catch (error) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: `\u83B7\u53D6\u672A\u5339\u914D\u8BFE\u7A0B\u65E5\u7A0B\u5931\u8D25: ${error.message}`
      });
    }
  }),
  /**
   * 获取未匹配的订单
   */
  getUnmatchedOrders: reconciliationProcedure.query(async () => {
    try {
      const orders2 = await getUnmatchedOrders();
      return orders2;
    } catch (error) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: `\u83B7\u53D6\u672A\u5339\u914D\u8BA2\u5355\u5931\u8D25: ${error.message}`
      });
    }
  }),
  /**
   * 生成月度对账报表
   */
  getMonthlyReport: reconciliationProcedure.input(
    z7.object({
      startDate: z7.string(),
      // YYYY-MM-DD
      endDate: z7.string(),
      // YYYY-MM-DD
      city: z7.string().optional(),
      salesPerson: z7.string().optional()
    })
  ).query(async ({ input }) => {
    try {
      const report = await getMonthlyReconciliationReport({
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        city: input.city,
        salesPerson: input.salesPerson
      });
      return report;
    } catch (error) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: `\u751F\u6210\u5BF9\u8D26\u62A5\u8868\u5931\u8D25: ${error.message}`
      });
    }
  })
});

// server/statementMatchRouter.ts
init_trpc();
init_db();
init_schema();
import { z as z8 } from "zod";
import { TRPCError as TRPCError6 } from "@trpc/server";
import { eq as eq5, and as and4, gte as gte3, lte as lte3, or as or2 } from "drizzle-orm";
function parseWechatCSV(content) {
  const lines = content.split("\n").map((l) => l.replace(/\r/g, "").trim());
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].includes("\u4EA4\u6613\u65F6\u95F4")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];
  const headers = lines[headerIdx].split(",").map((h) => h.replace(/"/g, "").trim());
  const colIdx = (name) => headers.findIndex((h) => h.includes(name));
  const timeCol = colIdx("\u4EA4\u6613\u65F6\u95F4");
  const typeCol = colIdx("\u6536/\u652F");
  const amountCol = colIdx("\u91D1\u989D");
  const tradeNoCol = colIdx("\u4EA4\u6613\u5355\u53F7");
  const remarkCol = colIdx("\u5907\u6CE8");
  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith("\u5408\u8BA1")) continue;
    const cols = parseCsvLine(line);
    if (cols.length < Math.max(timeCol, typeCol, amountCol) + 1) continue;
    const direction = (cols[typeCol] || "").replace(/"/g, "").trim();
    if (direction !== "\u6536\u5165") continue;
    const amountStr = (cols[amountCol] || "").replace(/"/g, "").replace(/¥|,/g, "").trim();
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) continue;
    const tradeTime = (cols[timeCol] || "").replace(/"/g, "").trim();
    const tradeDate = tradeTime.substring(0, 10);
    const tradeNo = (cols[tradeNoCol] || "").replace(/"/g, "").trim();
    const remark = (cols[remarkCol] || "").replace(/"/g, "").trim();
    rows.push({ tradeTime, tradeDate, amount, channel: "wechat", tradeNo, remark, raw: line });
  }
  return rows;
}
function parseAlipayExcel(rows) {
  if (!rows || rows.length < 2) return [];
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (row && row.some((c) => String(c || "").includes("\u652F\u4ED8\u65F6\u95F4") || String(c || "").includes("\u4ED8\u6B3E\u65F6\u95F4"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i];
      if (row && row.some((c) => String(c || "").includes("\u5BA2\u6237\u5B9E\u4ED8"))) {
        headerIdx = i;
        break;
      }
    }
  }
  if (headerIdx === -1) return [];
  const headers = rows[headerIdx].map((h) => String(h || "").trim());
  const colIdx = (name) => headers.findIndex((h) => h.includes(name));
  const timeCol = colIdx("\u652F\u4ED8\u65F6\u95F4") !== -1 ? colIdx("\u652F\u4ED8\u65F6\u95F4") : colIdx("\u4ED8\u6B3E\u65F6\u95F4");
  const amountCol = colIdx("\u5BA2\u6237\u5B9E\u4ED8") !== -1 ? colIdx("\u5BA2\u6237\u5B9E\u4ED8") : colIdx("\u5B9E\u6536\u91D1\u989D");
  const tradeNoCol = colIdx("\u5546\u6237\u8BA2\u5355\u53F7") !== -1 ? colIdx("\u5546\u6237\u8BA2\u5355\u53F7") : colIdx("\u4EA4\u6613\u53F7");
  const remarkCol = colIdx("\u6536\u6B3E\u7801\u540D\u79F0") !== -1 ? colIdx("\u6536\u6B3E\u7801\u540D\u79F0") : colIdx("\u5907\u6CE8");
  const result = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[timeCol]) continue;
    const amountRaw = String(row[amountCol] || "").replace(/,/g, "").trim();
    const amount = parseFloat(amountRaw);
    if (isNaN(amount) || amount <= 0) continue;
    const tradeTime = String(row[timeCol] || "").trim();
    const tradeDate = tradeTime.substring(0, 10).replace(/\//g, "-");
    const tradeNo = String(row[tradeNoCol] || "").trim();
    const remark = String(row[remarkCol] || "").trim();
    result.push({ tradeTime, tradeDate, amount, channel: "alipay", tradeNo, remark });
  }
  return result;
}
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
async function matchStatementToOrders(statementRows, year, month) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u4E0D\u53EF\u7528");
  const monthOrders = await db.select().from(orders).where(
    and4(
      eq5(orders.isVoided, false),
      or2(
        and4(gte3(orders.classDate, startDate), lte3(orders.classDate, endDate)),
        and4(gte3(orders.paymentDate, startDate), lte3(orders.paymentDate, endDate))
      )
    )
  );
  const orderMatchMap = /* @__PURE__ */ new Map();
  const usedRows = /* @__PURE__ */ new Set();
  for (const row of statementRows) {
    if (!row.tradeNo) continue;
    for (const order of monthOrders) {
      if (!order.channelOrderNo) continue;
      const channelNos = order.channelOrderNo.split(/[;,\s]+/).map((s) => s.trim());
      if (channelNos.some((no) => no && row.tradeNo.includes(no))) {
        if (!orderMatchMap.has(order.id)) orderMatchMap.set(order.id, []);
        orderMatchMap.get(order.id).push(row);
        usedRows.add(row.tradeNo);
        break;
      }
    }
  }
  for (const row of statementRows) {
    if (usedRows.has(row.tradeNo)) continue;
    const rowDate = new Date(row.tradeDate);
    const candidates = [];
    for (const order of monthOrders) {
      const courseAmt = parseFloat(String(order.courseAmount || 0));
      const balanceAmt = parseFloat(String(order.balanceAmount || 0));
      const alreadyReceived = (orderMatchMap.get(order.id) || []).reduce((s, r) => s + r.amount, 0);
      const amountMatches = Math.abs(row.amount - courseAmt) < 0.01 || balanceAmt > 0 && Math.abs(row.amount - balanceAmt) < 0.01 || Math.abs(row.amount - (courseAmt - alreadyReceived)) < 0.01;
      if (!amountMatches) continue;
      const refDate = order.paymentDate ? new Date(String(order.paymentDate)) : order.classDate ? new Date(String(order.classDate)) : null;
      if (!refDate) continue;
      const dayDiff = Math.abs((rowDate.getTime() - refDate.getTime()) / 864e5);
      if (dayDiff > 3) continue;
      candidates.push({ order, score: 10 - dayDiff });
    }
    if (candidates.length === 1) {
      const { order } = candidates[0];
      if (!orderMatchMap.has(order.id)) orderMatchMap.set(order.id, []);
      orderMatchMap.get(order.id).push(row);
      usedRows.add(row.tradeNo);
    }
  }
  const result = monthOrders.map((order) => {
    const matched = orderMatchMap.get(order.id) || [];
    const receivedAmount = matched.reduce((s, r) => s + r.amount, 0);
    const courseAmount = parseFloat(String(order.courseAmount || 0));
    const gap = courseAmount - receivedAmount;
    let matchStatus;
    if (matched.length === 0) {
      matchStatus = "unpaid";
    } else if (Math.abs(gap) < 0.01) {
      matchStatus = "paid";
    } else {
      matchStatus = "partial";
    }
    return {
      orderId: order.id,
      orderNo: order.orderNo,
      customerName: order.customerName,
      salesPerson: order.salesPerson,
      deliveryCourse: order.deliveryCourse,
      deliveryCity: order.deliveryCity,
      deliveryTeacher: order.deliveryTeacher,
      classDate: order.classDate ? String(order.classDate) : null,
      courseAmount,
      matchedRows: matched,
      receivedAmount,
      gap,
      matchStatus,
      notes: order.notes,
      paymentChannel: order.paymentChannel,
      channelOrderNo: order.channelOrderNo,
      paymentDate: order.paymentDate ? String(order.paymentDate) : null
    };
  });
  return result;
}
var statementMatchRouter = router({
  /**
   * 解析并匹配流水文件
   * 前端将文件内容以 base64 传入，后端解析后与当月订单匹配
   */
  parseAndMatch: protectedProcedure.input(
    z8.object({
      /** 文件内容 base64 */
      fileContent: z8.string(),
      /** 文件类型：wechat_csv | alipay_xlsx */
      fileType: z8.enum(["wechat_csv", "alipay_xlsx"]),
      /** 对账年份 */
      year: z8.number().int().min(2020).max(2030),
      /** 对账月份 1-12 */
      month: z8.number().int().min(1).max(12)
    })
  ).mutation(async ({ input }) => {
    try {
      let statementRows = [];
      if (input.fileType === "wechat_csv") {
        const buf = Buffer.from(input.fileContent, "base64");
        let content;
        try {
          const iconv = __require("iconv-lite");
          content = iconv.decode(buf, "gbk");
        } catch {
          content = buf.toString("utf-8");
        }
        statementRows = parseWechatCSV(content);
      } else {
        const XLSX2 = await import("xlsx");
        const buf = Buffer.from(input.fileContent, "base64");
        const wb = XLSX2.read(buf, { type: "buffer", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX2.utils.sheet_to_json(ws, { header: 1, defval: "" });
        statementRows = parseAlipayExcel(rawRows);
      }
      if (statementRows.length === 0) {
        throw new TRPCError6({
          code: "BAD_REQUEST",
          message: "\u672A\u80FD\u4ECE\u6587\u4EF6\u4E2D\u89E3\u6790\u51FA\u6709\u6548\u6536\u6B3E\u8BB0\u5F55\uFF0C\u8BF7\u68C0\u67E5\u6587\u4EF6\u683C\u5F0F"
        });
      }
      const matchResult = await matchStatementToOrders(statementRows, input.year, input.month);
      const paid = matchResult.filter((r) => r.matchStatus === "paid");
      const partial = matchResult.filter((r) => r.matchStatus === "partial");
      const unpaid = matchResult.filter((r) => r.matchStatus === "unpaid");
      return {
        statementCount: statementRows.length,
        orderCount: matchResult.length,
        paid,
        partial,
        unpaid,
        /** 未匹配到任何订单的流水行 */
        unmatchedRows: statementRows.filter(
          (row) => !matchResult.some(
            (r) => r.matchedRows.some((mr) => mr.tradeNo === row.tradeNo)
          )
        )
      };
    } catch (error) {
      if (error instanceof TRPCError6) throw error;
      throw new TRPCError6({
        code: "INTERNAL_SERVER_ERROR",
        message: `\u89E3\u6790\u5339\u914D\u5931\u8D25: ${error.message}`
      });
    }
  })
});

// server/customerRouter.ts
init_trpc();
init_db();
import { z as z9 } from "zod";

// server/progressTracker.ts
var progressStore = /* @__PURE__ */ new Map();
function createTask(taskId) {
  progressStore.set(taskId, {
    taskId,
    current: 0,
    total: 100,
    message: "\u51C6\u5907\u5F00\u59CB...",
    completed: false
  });
  return taskId;
}
function updateProgress(taskId, progress) {
  const existing = progressStore.get(taskId);
  if (existing) {
    progressStore.set(taskId, {
      ...existing,
      ...progress
    });
  }
}
function completeTask(taskId, message) {
  const existing = progressStore.get(taskId);
  if (existing) {
    progressStore.set(taskId, {
      ...existing,
      current: existing.total,
      message: message || existing.message,
      completed: true
    });
  }
}
function failTask(taskId, error) {
  const existing = progressStore.get(taskId);
  if (existing) {
    progressStore.set(taskId, {
      ...existing,
      completed: true,
      error
    });
  }
}
function getProgress(taskId) {
  return progressStore.get(taskId) || null;
}
function cleanupTask(taskId) {
  setTimeout(() => {
    progressStore.delete(taskId);
  }, 60 * 60 * 1e3);
}
function generateTaskId() {
  return `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// server/customerRouter.ts
var customerRouter = router({
  // 获取客户列表(支持筛选和排序)
  list: protectedProcedure.input(
    z9.object({
      // 筛选条件
      minSpent: z9.number().optional(),
      // 最小累计消费
      maxSpent: z9.number().optional(),
      // 最大累计消费
      minClassCount: z9.number().optional(),
      // 最小上课次数
      maxClassCount: z9.number().optional(),
      // 最大上课次数
      lastConsumptionDays: z9.number().optional(),
      // 最后消费天数(例如30表示30天内)
      trafficSource: z9.string().optional(),
      // 流量来源
      // 快捷筛选
      highValue: z9.boolean().optional(),
      // 高价值客户(累计消费>5000或上课次数>5)
      churned: z9.boolean().optional(),
      // 流失客户(最后消费>30天且累计消费>0)
      // 排序
      sortBy: z9.enum(["totalSpent", "classCount", "lastOrderDate", "firstOrderDate", "createdAt"]).optional(),
      sortOrder: z9.enum(["asc", "desc"]).optional()
    }).optional()
  ).query(async ({ input }) => {
    let customers3 = await getAllCustomers();
    if (input) {
      if (input.minSpent !== void 0) {
        customers3 = customers3.filter((c) => parseFloat(c.totalSpent || "0") >= input.minSpent);
      }
      if (input.maxSpent !== void 0) {
        customers3 = customers3.filter((c) => parseFloat(c.totalSpent || "0") <= input.maxSpent);
      }
      if (input.minClassCount !== void 0) {
        customers3 = customers3.filter((c) => (c.classCount || 0) >= input.minClassCount);
      }
      if (input.maxClassCount !== void 0) {
        customers3 = customers3.filter((c) => (c.classCount || 0) <= input.maxClassCount);
      }
      if (input.lastConsumptionDays !== void 0) {
        const cutoffDate = /* @__PURE__ */ new Date();
        cutoffDate.setDate(cutoffDate.getDate() - input.lastConsumptionDays);
        customers3 = customers3.filter((c) => {
          if (!c.lastOrderDate) return false;
          return new Date(c.lastOrderDate) >= cutoffDate;
        });
      }
      if (input.trafficSource) {
        customers3 = customers3.filter((c) => c.trafficSource?.includes(input.trafficSource));
      }
      if (input.highValue) {
        customers3 = customers3.filter(
          (c) => parseFloat(c.totalSpent || "0") > 5e3 || (c.classCount || 0) > 5
        );
      }
      if (input.churned) {
        const thirtyDaysAgo = /* @__PURE__ */ new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        customers3 = customers3.filter((c) => {
          const hasSpending = parseFloat(c.totalSpent || "0") > 0;
          const lastOrderDate = c.lastOrderDate ? new Date(c.lastOrderDate) : null;
          return hasSpending && (!lastOrderDate || lastOrderDate < thirtyDaysAgo);
        });
      }
      if (input.sortBy) {
        const sortOrder = input.sortOrder || "desc";
        customers3.sort((a, b) => {
          let aVal, bVal;
          switch (input.sortBy) {
            case "totalSpent":
              aVal = parseFloat(a.totalSpent || "0");
              bVal = parseFloat(b.totalSpent || "0");
              break;
            case "classCount":
              aVal = a.classCount || 0;
              bVal = b.classCount || 0;
              break;
            case "lastOrderDate":
              aVal = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
              bVal = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
              break;
            case "firstOrderDate":
              aVal = a.firstOrderDate ? new Date(a.firstOrderDate).getTime() : 0;
              bVal = b.firstOrderDate ? new Date(b.firstOrderDate).getTime() : 0;
              break;
            case "createdAt":
              aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              break;
            default:
              return 0;
          }
          if (sortOrder === "asc") {
            return aVal - bVal;
          } else {
            return bVal - aVal;
          }
        });
      }
    }
    return customers3;
  }),
  // 刷新所有客户数据(重新计算累计消费) - 异步执行
  refreshAllStats: protectedProcedure.mutation(async () => {
    const taskId = generateTaskId();
    createTask(taskId);
    (async () => {
      try {
        await refreshCustomerStats((progress) => {
          updateProgress(taskId, progress);
        });
        completeTask(taskId, "\u5BA2\u6237\u6570\u636E\u66F4\u65B0\u5B8C\u6210");
      } catch (error) {
        failTask(taskId, error.message || "\u66F4\u65B0\u5931\u8D25");
      } finally {
        cleanupTask(taskId);
      }
    })();
    return { taskId };
  }),
  // 获取任务进度
  getProgress: protectedProcedure.input(z9.object({ taskId: z9.string() })).query(async ({ input }) => {
    const progress = getProgress(input.taskId);
    return progress;
  }),
  // 删除客户
  delete: protectedProcedure.input(z9.object({ id: z9.number() })).mutation(async ({ input }) => {
    await deleteCustomer(input.id);
    return { success: true };
  }),
  // 批量删除客户
  batchDelete: protectedProcedure.input(z9.object({ ids: z9.array(z9.number()) })).mutation(async ({ input }) => {
    for (const id of input.ids) {
      await deleteCustomer(id);
    }
    return { success: true, count: input.ids.length };
  }),
  // 批量导入更新客户（仅ID匹配，只更新微信号/电话/流量来源/备注）
  batchImport: protectedProcedure.input(z9.object({
    rows: z9.array(z9.object({
      id: z9.number(),
      wechatId: z9.string().optional(),
      phone: z9.string().optional(),
      trafficSource: z9.string().optional(),
      notes: z9.string().optional()
    }))
  })).mutation(async ({ input }) => {
    const result = await batchImportCustomers(input.rows);
    return result;
  })
});

// server/financeRouter.ts
init_trpc();
init_timezone();
init_db();
import { z as z10 } from "zod";
import { TRPCError as TRPCError7 } from "@trpc/server";
import ExcelJS from "exceljs";
var financeOrAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "finance") {
    throw new TRPCError7({ code: "FORBIDDEN", message: "\u9700\u8981\u8D22\u52A1\u6216\u7BA1\u7406\u5458\u6743\u9650" });
  }
  return next({ ctx });
});
var financeRouter = router({
  /**
   * 获取合伙人分红统计数据
   */
  getPartnerDividends: financeOrAdminProcedure.input(
    z10.object({
      startDate: z10.string().optional(),
      endDate: z10.string().optional(),
      partnerId: z10.number().optional()
    })
  ).query(async ({ input }) => {
    try {
      const { startDate, endDate, partnerId } = input;
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
      const { partners: partnersTable, partnerCities: partnerCitiesTable, cities: citiesTable, orders: ordersTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq28, and: and19, sql: sql12 } = await import("drizzle-orm");
      const allPartners = await dbInstance.select().from(partnersTable);
      const result = [];
      for (const partner of allPartners) {
        if (partnerId && partner.id !== partnerId) continue;
        const partnerCities3 = await dbInstance.select({
          id: partnerCitiesTable.id,
          partnerId: partnerCitiesTable.partnerId,
          cityId: partnerCitiesTable.cityId,
          cityName: citiesTable.name,
          currentProfitStage: partnerCitiesTable.currentProfitStage,
          isInvestmentRecovered: partnerCitiesTable.isInvestmentRecovered,
          profitRatioStage1Partner: partnerCitiesTable.profitRatioStage1Partner,
          profitRatioStage2APartner: partnerCitiesTable.profitRatioStage2APartner,
          profitRatioStage2BPartner: partnerCitiesTable.profitRatioStage2BPartner,
          profitRatioStage3Partner: partnerCitiesTable.profitRatioStage3Partner
        }).from(partnerCitiesTable).leftJoin(citiesTable, eq28(partnerCitiesTable.cityId, citiesTable.id)).where(eq28(partnerCitiesTable.partnerId, partner.id));
        if (partnerCities3.length === 0) continue;
        const cityNames = partnerCities3.map((pc) => pc.cityName).filter(Boolean);
        const conditions = [
          sql12`${ordersTable.deliveryCity} IN (${sql12.join(cityNames.map((name) => sql12`${name}`), sql12`, `)})`
        ];
        if (startDate) {
          conditions.push(sql12`${ordersTable.classDate} >= ${startDate}`);
        }
        if (endDate) {
          conditions.push(sql12`${ordersTable.classDate} <= ${endDate}`);
        }
        const orders2 = cityNames.length > 0 ? await dbInstance.select().from(ordersTable).where(and19(...conditions)) : [];
        let totalRevenue = 0;
        let totalCost = 0;
        orders2.forEach((order) => {
          totalRevenue += parseFloat(order.courseAmount || "0");
          totalCost += parseFloat(order.teacherFee || "0");
          totalCost += parseFloat(order.transportFee || "0");
          totalCost += parseFloat(order.consumablesFee || "0");
          totalCost += parseFloat(order.rentFee || "0");
          totalCost += parseFloat(order.propertyFee || "0");
          totalCost += parseFloat(order.utilityFee || "0");
          totalCost += parseFloat(order.otherFee || "0");
        });
        const profit = totalRevenue - totalCost;
        const firstCity = partnerCities3[0];
        let profitRatio = 0;
        let profitStage = "\u672A\u8BBE\u7F6E";
        if (firstCity) {
          const stage = firstCity.currentProfitStage || 1;
          profitStage = `\u7B2C${stage}\u9636\u6BB5`;
          if (stage === 1) {
            profitRatio = parseFloat(firstCity.profitRatioStage1Partner || "0");
          } else if (stage === 2) {
            if (firstCity.isInvestmentRecovered) {
              profitRatio = parseFloat(firstCity.profitRatioStage2BPartner || "0");
              profitStage = "\u7B2C2\u9636\u6BB5B\uFF08\u5DF2\u56DE\u672C\uFF09";
            } else {
              profitRatio = parseFloat(firstCity.profitRatioStage2APartner || "0");
              profitStage = "\u7B2C2\u9636\u6BB5A\uFF08\u672A\u56DE\u672C\uFF09";
            }
          } else if (stage === 3) {
            profitRatio = parseFloat(firstCity.profitRatioStage3Partner || "0");
          }
        }
        const dividendAmount = profit * (profitRatio / 100);
        result.push({
          partnerId: partner.id,
          partnerName: partner.name,
          cities: partnerCities3.map((pc) => pc.cityName).join(", "),
          profitStage,
          profitRatio: profitRatio.toFixed(2),
          totalRevenue: totalRevenue.toFixed(2),
          totalCost: totalCost.toFixed(2),
          profit: profit.toFixed(2),
          dividendAmount: dividendAmount.toFixed(2),
          orderCount: orders2.length
        });
      }
      return result;
    } catch (error) {
      console.error("\u83B7\u53D6\u5408\u4F19\u4EBA\u5206\u7EA2\u7EDF\u8BA1\u5931\u8D25:", error);
      throw new TRPCError7({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u83B7\u53D6\u5408\u4F19\u4EBA\u5206\u7EA2\u7EDF\u8BA1\u5931\u8D25"
      });
    }
  }),
  // 导出财务报表为Excel
  exportExcel: financeOrAdminProcedure.input(
    z10.object({
      startDate: z10.string().optional(),
      endDate: z10.string().optional()
    })
  ).mutation(async ({ input }) => {
    try {
      const allOrders = await getAllOrders();
      let filteredOrders = allOrders;
      if (input.startDate || input.endDate) {
        filteredOrders = allOrders.filter((order) => {
          const orderDate = new Date(order.createdAt);
          const start = input.startDate ? new Date(input.startDate) : null;
          const end = input.endDate ? new Date(input.endDate) : null;
          if (start && orderDate < start) return false;
          if (end && orderDate > end) return false;
          return true;
        });
      }
      const cityStats = /* @__PURE__ */ new Map();
      filteredOrders.forEach((order) => {
        const city = order.deliveryCity || order.paymentCity || "\u672A\u77E5\u57CE\u5E02";
        const stats = cityStats.get(city) || {
          orderCount: 0,
          totalSales: 0,
          teacherFee: 0,
          transportFee: 0,
          partnerFee: 0,
          consumablesFee: 0,
          rentFee: 0,
          propertyFee: 0,
          utilityFee: 0,
          otherFee: 0
        };
        stats.orderCount += 1;
        stats.totalSales += parseFloat(order.paymentAmount || "0");
        stats.teacherFee += parseFloat(order.teacherFee || "0");
        stats.transportFee += parseFloat(order.transportFee || "0");
        stats.partnerFee += parseFloat(order.partnerFee || "0");
        stats.consumablesFee += parseFloat(order.consumablesFee || "0");
        stats.rentFee += parseFloat(order.rentFee || "0");
        stats.propertyFee += parseFloat(order.propertyFee || "0");
        stats.utilityFee += parseFloat(order.utilityFee || "0");
        stats.otherFee += parseFloat(order.otherFee || "0");
        cityStats.set(city, stats);
      });
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "\u8BFE\u7A0B\u4EA4\u4ED8CRM\u7CFB\u7EDF";
      workbook.created = /* @__PURE__ */ new Date();
      const citySheet = workbook.addWorksheet("\u57CE\u5E02\u8D22\u52A1\u7EDF\u8BA1");
      citySheet.columns = [
        { header: "\u57CE\u5E02", key: "city", width: 15 },
        { header: "\u8BA2\u5355\u6570", key: "orderCount", width: 12 },
        { header: "\u9500\u552E\u989D", key: "totalSales", width: 15 },
        { header: "\u8001\u5E08\u8D39\u7528", key: "teacherFee", width: 15 },
        { header: "\u8F66\u8D39", key: "transportFee", width: 12 },
        { header: "\u5408\u4F19\u4EBA\u8D39", key: "partnerFee", width: 15 },
        { header: "\u8017\u6750\u8D39\u7528", key: "consumablesFee", width: 15 },
        { header: "\u623F\u79DF\u8D39\u7528", key: "rentFee", width: 15 },
        { header: "\u7269\u4E1A\u8D39\u7528", key: "propertyFee", width: 15 },
        { header: "\u6C34\u7535\u8D39\u7528", key: "utilityFee", width: 15 },
        { header: "\u5176\u4ED6\u8D39\u7528", key: "otherFee", width: 15 },
        { header: "\u603B\u8D39\u7528", key: "totalCost", width: 15 },
        { header: "\u51C0\u5229\u6DA6", key: "netProfit", width: 15 },
        { header: "\u5229\u6DA6\u7387", key: "profitRate", width: 12 }
      ];
      cityStats.forEach((stats, city) => {
        const totalCost = stats.teacherFee + stats.transportFee + stats.partnerFee + stats.consumablesFee + stats.rentFee + stats.propertyFee + stats.utilityFee + stats.otherFee;
        const netProfit = stats.totalSales - totalCost;
        const profitRate = stats.totalSales > 0 ? (netProfit / stats.totalSales * 100).toFixed(2) + "%" : "0%";
        citySheet.addRow({
          city,
          orderCount: stats.orderCount,
          totalSales: `\uFFE5${stats.totalSales.toFixed(2)}`,
          teacherFee: `\uFFE5${stats.teacherFee.toFixed(2)}`,
          transportFee: `\uFFE5${stats.transportFee.toFixed(2)}`,
          partnerFee: `\uFFE5${stats.partnerFee.toFixed(2)}`,
          consumablesFee: `\uFFE5${stats.consumablesFee.toFixed(2)}`,
          rentFee: `\uFFE5${stats.rentFee.toFixed(2)}`,
          propertyFee: `\uFFE5${stats.propertyFee.toFixed(2)}`,
          utilityFee: `\uFFE5${stats.utilityFee.toFixed(2)}`,
          otherFee: `\uFFE5${stats.otherFee.toFixed(2)}`,
          totalCost: `\uFFE5${totalCost.toFixed(2)}`,
          netProfit: `\uFFE5${netProfit.toFixed(2)}`,
          profitRate
        });
      });
      citySheet.getRow(1).font = { bold: true };
      citySheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" }
      };
      const detailSheet = workbook.addWorksheet("\u6536\u652F\u660E\u7EC6");
      detailSheet.columns = [
        { header: "\u65E5\u671F", key: "date", width: 12 },
        { header: "\u8BA2\u5355\u53F7", key: "orderNo", width: 25 },
        { header: "\u652F\u4ED8\u6E20\u9053", key: "paymentChannel", width: 15 },
        { header: "\u63CF\u8FF0", key: "description", width: 30 },
        { header: "\u91D1\u989D", key: "amount", width: 15 },
        { header: "\u7C7B\u578B", key: "type", width: 10 }
      ];
      filteredOrders.forEach((order) => {
        detailSheet.addRow({
          date: formatDateBeijing(order.createdAt),
          orderNo: order.orderNo,
          paymentChannel: order.paymentChannel || "-",
          description: `\u8BA2\u5355\u6536\u6B3E - ${order.customerName}`,
          amount: `\xA5${parseFloat(order.paymentAmount || "0").toFixed(2)}`,
          type: "\u6536\u5165"
        });
        if (order.teacherFee && parseFloat(order.teacherFee) > 0) {
          detailSheet.addRow({
            date: formatDateBeijing(order.createdAt),
            orderNo: order.orderNo,
            paymentChannel: "-",
            description: `\u8001\u5E08\u8D39\u7528 - ${order.deliveryTeacher || "\u672A\u77E5"}`,
            amount: `\xA5${parseFloat(order.teacherFee).toFixed(2)}`,
            type: "\u652F\u51FA"
          });
        }
        if (order.transportFee && parseFloat(order.transportFee) > 0) {
          detailSheet.addRow({
            date: formatDateBeijing(order.createdAt),
            orderNo: order.orderNo,
            paymentChannel: "-",
            description: `\u8F66\u8D39`,
            amount: `\xA5${parseFloat(order.transportFee).toFixed(2)}`,
            type: "\u652F\u51FA"
          });
        }
      });
      detailSheet.getRow(1).font = { bold: true };
      detailSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" }
      };
      const buffer = await workbook.xlsx.writeBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return {
        success: true,
        data: base64,
        filename: `\u8D22\u52A1\u62A5\u8868_${formatDateBeijing(/* @__PURE__ */ new Date())}.xlsx`
      };
    } catch (error) {
      console.error("\u5BFC\u51FAExcel\u5931\u8D25:", error);
      throw new TRPCError7({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u5BFC\u51FAExcel\u5931\u8D25"
      });
    }
  })
});

// server/cityRouter.ts
init_trpc();
init_db();
init_schema();
import ExcelJS2 from "exceljs";
var cityRouter = router({
  // 获取所有城市列表
  getAll: protectedProcedure.query(async () => {
    const cities3 = await getAllCities();
    return cities3;
  }),
  // 获取城市月度业绩趋势数据
  getCityMonthlyTrends: protectedProcedure.query(async () => {
    const monthlyTrends = await getCityMonthlyTrends();
    return monthlyTrends;
  }),
  exportCities: protectedProcedure.query(async () => {
    const cityStats = await getCityFinancialStats();
    const dbInstance = await getDb();
    if (!dbInstance) throw new Error("Database not available");
    const citiesConfig = await dbInstance.select().from(cityPartnerConfig);
    const cityConfigMap = new Map(
      citiesConfig.map((c) => [c.city, c])
    );
    const workbook = new ExcelJS2.Workbook();
    const worksheet = workbook.addWorksheet("\u57CE\u5E02\u7EDF\u8BA1");
    worksheet.columns = [
      { header: "\u57CE\u5E02\u540D\u79F0", key: "city", width: 15 },
      { header: "\u533A\u53F7", key: "areaCode", width: 10 },
      { header: "\u5408\u4F19\u4EBA\u8D39\u6BD4\u4F8B", key: "partnerFeeRate", width: 15 },
      { header: "\u8BA2\u5355\u6570", key: "orderCount", width: 12 },
      { header: "\u9500\u552E\u989D", key: "revenue", width: 15 },
      { header: "\u8001\u5E08\u8D39\u7528", key: "teacherFee", width: 15 },
      { header: "\u8F66\u8D39", key: "transportFee", width: 12 },
      { header: "\u8017\u6750\u8D39\u7528", key: "consumablesFee", width: 15 },
      { header: "\u623F\u79DF\u8D39\u7528", key: "rentFee", width: 15 },
      { header: "\u7269\u4E1A\u8D39\u7528", key: "propertyFee", width: 15 },
      { header: "\u6C34\u7535\u8D39\u7528", key: "utilityFee", width: 15 },
      { header: "\u5176\u4ED6\u8D39\u7528", key: "otherFee", width: 15 },
      { header: "\u603B\u8D39\u7528", key: "totalCost", width: 15 },
      { header: "\u51C0\u5229\u6DA6", key: "profit", width: 15 },
      { header: "\u5229\u6DA6\u7387", key: "profitMargin", width: 12 },
      { header: "\u72B6\u6001", key: "status", width: 10 }
    ];
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" }
    };
    cityStats.forEach((stat) => {
      const config = cityConfigMap.get(stat.city);
      worksheet.addRow({
        city: stat.city,
        areaCode: config?.areaCode || "-",
        partnerFeeRate: config?.partnerFeeRate ? `${(parseFloat(config.partnerFeeRate) * 100).toFixed(2)}%` : "0%",
        orderCount: stat.orderCount,
        revenue: stat.totalRevenue,
        teacherFee: stat.teacherFee,
        transportFee: stat.transportFee,
        consumablesFee: stat.consumablesFee,
        rentFee: stat.rentFee,
        propertyFee: stat.propertyFee,
        utilityFee: stat.utilityFee,
        otherFee: stat.otherFee,
        totalCost: stat.totalExpense,
        profit: stat.profit,
        profitMargin: `${stat.profitMargin.toFixed(2)}%`,
        status: config?.isActive ? "\u542F\u7528" : "\u7981\u7528"
      });
    });
    const numberColumns = ["revenue", "teacherFee", "transportFee", "consumablesFee", "rentFee", "propertyFee", "utilityFee", "otherFee", "totalCost", "profit"];
    numberColumns.forEach((colKey) => {
      const col = worksheet.getColumn(colKey);
      col.numFmt = "\xA5#,##0.00";
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return {
      data: Buffer.from(buffer).toString("base64"),
      filename: `\u57CE\u5E02\u7EDF\u8BA1\u62A5\u8868_${(/* @__PURE__ */ new Date()).toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" })}.xlsx`
    };
  })
});

// server/permissionRouter.ts
init_trpc();
init_db();
init_schema();
import { z as z11 } from "zod";
import { eq as eq6 } from "drizzle-orm";
import { TRPCError as TRPCError8 } from "@trpc/server";
var permissionRouter = router({
  // 获取账号权限
  getPermissions: protectedProcedure.input(z11.object({ accountId: z11.number() })).query(async ({ ctx, input }) => {
    const drizzle2 = await getDb();
    if (!drizzle2) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const permissions = await drizzle2.select().from(accountPermissions).where(eq6(accountPermissions.accountId, input.accountId));
    return permissions;
  }),
  // 更新账号权限
  updatePermissions: protectedProcedure.input(
    z11.object({
      accountId: z11.number(),
      permissions: z11.array(
        z11.object({
          permissionKey: z11.string(),
          permissionName: z11.string(),
          isGranted: z11.boolean()
        })
      )
    })
  ).mutation(async ({ ctx, input }) => {
    const drizzle2 = await getDb();
    if (!drizzle2) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    await drizzle2.delete(accountPermissions).where(eq6(accountPermissions.accountId, input.accountId));
    if (input.permissions.length > 0) {
      await drizzle2.insert(accountPermissions).values(
        input.permissions.map((p) => ({
          accountId: input.accountId,
          permissionKey: p.permissionKey,
          permissionName: p.permissionName,
          isGranted: p.isGranted
        }))
      );
    }
    await drizzle2.insert(accountAuditLogs).values({
      accountId: input.accountId,
      operationType: "update_permissions",
      operatorId: ctx.user.id,
      operatorName: ctx.user.name || "Unknown",
      newValue: JSON.stringify(input.permissions)
    });
    return { success: true };
  }),
  // 获取所有可用权限(菜单列表 - 按类别分组)
  getAvailablePermissions: protectedProcedure.query(async ({ ctx }) => {
    const availablePermissions = [
      {
        category: "\u57FA\u7840\u529F\u80FD",
        icon: "Home",
        permissions: [
          { key: "/", name: "\u9996\u9875", description: "\u67E5\u770B\u4E3B\u63A7\u5236\u677F" }
        ]
      },
      {
        category: "\u9500\u552E\u7BA1\u7406",
        icon: "ShoppingCart",
        permissions: [
          { key: "/orders", name: "\u8BA2\u5355\u7BA1\u7406", description: "\u7BA1\u7406\u8BA2\u5355\u4FE1\u606F" },
          { key: "/customers", name: "\u5BA2\u6237\u7BA1\u7406", description: "\u7BA1\u7406\u5BA2\u6237\u4FE1\u606F" },
          { key: "/sales", name: "\u9500\u552E\u7BA1\u7406", description: "\u7BA1\u7406\u9500\u552E\u4EBA\u5458" }
        ]
      },
      {
        category: "\u8BFE\u7A0B\u7BA1\u7406",
        icon: "BookOpen",
        permissions: [
          { key: "/schedules", name: "\u8BFE\u7A0B\u6392\u8BFE", description: "\u7BA1\u7406\u8BFE\u7A0B\u65E5\u7A0B" },
          { key: "/teachers", name: "\u8001\u5E08\u7BA1\u7406", description: "\u7BA1\u7406\u8001\u5E08\u4FE1\u606F" }
        ]
      },
      {
        category: "\u7CFB\u7EDF\u914D\u7F6E",
        icon: "Settings",
        permissions: [
          { key: "/cities", name: "\u57CE\u5E02\u7BA1\u7406", description: "\u7BA1\u7406\u57CE\u5E02\u914D\u7F6E" }
        ]
      },
      {
        category: "\u8D22\u52A1\u7BA1\u7406",
        icon: "DollarSign",
        permissions: [
          { key: "/finance", name: "\u8D22\u52A1\u7BA1\u7406", description: "\u7BA1\u7406\u8D22\u52A1\u4FE1\u606F" },
          { key: "/reconciliation-match", name: "\u8D22\u52A1\u5BF9\u8D26", description: "\u6267\u884C\u8D22\u52A1\u5BF9\u8D26" }
        ]
      },
      {
        category: "\u6570\u636E\u7BA1\u7406",
        icon: "Database",
        permissions: [
          { key: "/import", name: "\u6570\u636E\u5BFC\u5165", description: "\u5BFC\u5165\u6570\u636E" },
          { key: "/gmail-import", name: "Gmail\u5BFC\u5165", description: "\u4ECE Gmail \u5BFC\u5165" },
          { key: "/parsing-learning", name: "\u89E3\u6790\u5B66\u4E60", description: "\u67E5\u770B\u89E3\u6790\u7ED3\u679C" }
        ]
      },
      {
        category: "\u7CFB\u7EDF\u7BA1\u7406",
        icon: "Shield",
        permissions: [
          { key: "/accounts", name: "\u8D26\u53F7\u7BA1\u7406", description: "\u7BA1\u7406\u7CFB\u7EDF\u8D26\u53F7" }
        ]
      }
    ];
    return availablePermissions;
  }),
  // 获取权限预设(按角色类型)
  getPermissionPresets: protectedProcedure.query(async ({ ctx }) => {
    const presets = [
      {
        name: "\u9500\u552E\u6743\u9650",
        description: "\u9500\u552E\u4EBA\u5458\u7684\u6807\u51C6\u6743\u9650",
        identity: "sales",
        permissions: ["/", "/orders", "/customers", "/sales", "/schedules"]
      },
      {
        name: "\u8D22\u52A1\u6743\u9650",
        description: "\u8D22\u52A1\u4EBA\u5458\u7684\u6807\u51C6\u6743\u9650",
        identity: "finance",
        permissions: ["/", "/orders", "/finance", "/reconciliation-match"]
      },
      {
        name: "\u8001\u5E08\u6743\u9650",
        description: "\u8001\u5E08\u7684\u6807\u51C6\u6743\u9650",
        identity: "teacher",
        permissions: ["/", "/schedules", "/customers"]
      },
      {
        name: "\u7BA1\u7406\u5458\u6743\u9650",
        description: "\u7BA1\u7406\u5458\u7684\u5B8C\u5168\u6743\u9650",
        identity: "admin",
        permissions: ["/", "/orders", "/customers", "/sales", "/schedules", "/teachers", "/cities", "/finance", "/reconciliation-match", "/import", "/gmail-import", "/parsing-learning", "/accounts"]
      },
      {
        name: "\u67E5\u770B\u6743\u9650",
        description: "\u4EC5\u67E5\u770B\u6743\u9650(\u53EA\u8BFB)",
        identity: "viewer",
        permissions: ["/", "/orders", "/customers", "/sales", "/schedules", "/finance"]
      },
      {
        name: "\u95E8\u5E97\u5408\u4F19\u4EBA\u6743\u9650",
        description: "\u95E8\u5E97\u5408\u4F19\u4EBA\u7684\u6807\u51C6\u6743\u9650",
        identity: "store_partner",
        permissions: ["/", "/orders", "/customers", "/sales", "/finance", "/reconciliation-match"]
      }
    ];
    return presets;
  })
});

// server/authRouter.ts
init_trpc();
init_db();
init_schema();
init_passwordUtils();
import { z as z12 } from "zod";
import { TRPCError as TRPCError9 } from "@trpc/server";
import { eq as eq7 } from "drizzle-orm";
import bcrypt2 from "bcryptjs";

// server/smsService.ts
import * as $dysmsapi from "@alicloud/dysmsapi20170525";
import * as $OpenApi from "@alicloud/openapi-client";
import * as $Util from "@alicloud/tea-util";
var Dysmsapi = $dysmsapi.default ?? $dysmsapi;
var smsCodeCache = /* @__PURE__ */ new Map();
function createSmsClient() {
  const config = new $OpenApi.Config({
    accessKeyId: process.env.ALIYUN_SMS_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET,
    endpoint: "dysmsapi.aliyuncs.com"
  });
  return new Dysmsapi(config);
}
async function sendSmsVerificationCode(phone) {
  const existing = smsCodeCache.get(phone);
  if (existing && existing.expiresAt - Date.now() > 4 * 60 * 1e3) {
    return { success: false, message: "\u9A8C\u8BC1\u7801\u5DF2\u53D1\u9001\uFF0C\u8BF7 60 \u79D2\u540E\u518D\u8BD5" };
  }
  const code = Math.floor(1e5 + Math.random() * 9e5).toString();
  try {
    const client = createSmsClient();
    const sendSmsRequest = new $dysmsapi.SendSmsRequest({
      phoneNumbers: phone,
      signName: "\u701B\u59EC",
      templateCode: "SMS_501820654",
      templateParam: JSON.stringify({ code })
    });
    const runtime = new $Util.RuntimeOptions({});
    const response = await client.sendSmsWithOptions(sendSmsRequest, runtime);
    if (response.body?.code === "OK") {
      smsCodeCache.set(phone, {
        code,
        expiresAt: Date.now() + 5 * 60 * 1e3
      });
      return { success: true, message: "\u9A8C\u8BC1\u7801\u5DF2\u53D1\u9001" };
    } else {
      console.error("[SMS] \u53D1\u9001\u5931\u8D25:", response.body?.code, response.body?.message);
      return { success: false, message: `\u77ED\u4FE1\u53D1\u9001\u5931\u8D25\uFF1A${response.body?.message || "\u672A\u77E5\u9519\u8BEF"}` };
    }
  } catch (err) {
    console.error("[SMS] \u53D1\u9001\u5F02\u5E38:", err);
    return { success: false, message: "\u77ED\u4FE1\u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" };
  }
}

// server/authRouter.ts
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
var JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
var TOKEN_EXPIRY = "24h";
var authRouter = router({
  // 本地账户登录
  login: publicProcedure.input(
    z12.object({
      username: z12.string().min(1, "\u7528\u6237\u540D\u4E0D\u80FD\u4E3A\u7A7A"),
      password: z12.string().min(1, "\u5BC6\u7801\u4E0D\u80FD\u4E3A\u7A7A")
    })
  ).mutation(async ({ input }) => {
    const drizzle2 = await getDb();
    if (!drizzle2) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const account = await drizzle2.select().from(systemAccounts).where(eq7(systemAccounts.username, input.username)).limit(1);
    if (account.length === 0) {
      throw new TRPCError9({ code: "UNAUTHORIZED", message: "\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF" });
    }
    const user = account[0];
    if (!user.isActive) {
      throw new TRPCError9({ code: "UNAUTHORIZED", message: "\u8D26\u53F7\u5DF2\u88AB\u505C\u7528" });
    }
    const passwordMatch = await bcrypt2.compare(input.password, user.passwordHash);
    if (!passwordMatch) {
      throw new TRPCError9({ code: "UNAUTHORIZED", message: "\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF" });
    }
    await drizzle2.update(systemAccounts).set({ lastLoginAt: /* @__PURE__ */ new Date() }).where(eq7(systemAccounts.id, user.id));
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        identity: user.identity,
        relatedName: user.relatedName
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    return {
      success: true,
      token,
      user: {
        id: user.id,
        name: user.username,
        nickname: user.relatedName,
        email: user.email,
        role: user.identity
      }
    };
  }),
  // 验证token
  verifyToken: publicProcedure.input(z12.object({ token: z12.string() })).query(async ({ input }) => {
    try {
      const decoded = jwt.verify(input.token, JWT_SECRET);
      const drizzle2 = await getDb();
      if (!drizzle2) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
      const account = await drizzle2.select().from(systemAccounts).where(eq7(systemAccounts.id, decoded.id)).limit(1);
      if (account.length === 0 || !account[0].isActive) {
        throw new TRPCError9({ code: "UNAUTHORIZED", message: "\u8D26\u53F7\u4E0D\u5B58\u5728\u6216\u5DF2\u88AB\u505C\u7528" });
      }
      return {
        valid: true,
        user: decoded
      };
    } catch (error) {
      throw new TRPCError9({ code: "UNAUTHORIZED", message: "Token\u65E0\u6548\u6216\u5DF2\u8FC7\u671F" });
    }
  }),
  // 获取当前登录用户信息
  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),
  // 登出
  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.res?.clearCookie("session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });
    ctx.res?.clearCookie("manus-session", {
      httpOnly: true,
      sameSite: "lax"
    });
    return { success: true };
  }),
  // 刷新Token
  refreshToken: publicProcedure.input(
    z12.object({
      token: z12.string().min(1, "\u8BF7\u63D0\u4F9B\u5F53\u524DToken")
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      const decoded = jwt.verify(input.token, JWT_SECRET, {
        ignoreExpiration: true
        // 允许过期的Token刷新
      });
      const drizzle2 = await getDb();
      if (!drizzle2) {
        throw new TRPCError9({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
        });
      }
      const userList = await drizzle2.select().from(users).where(eq7(users.id, decoded.id)).limit(1);
      if (userList.length === 0) {
        throw new TRPCError9({
          code: "UNAUTHORIZED",
          message: "\u7528\u6237\u4E0D\u5B58\u5728"
        });
      }
      const user = userList[0];
      if (!user.isActive) {
        throw new TRPCError9({
          code: "UNAUTHORIZED",
          message: "\u8D26\u53F7\u5DF2\u88AB\u7981\u7528"
        });
      }
      const tokenExp = decoded.exp * 1e3;
      const now = Date.now();
      const maxRefreshWindow = 7 * 24 * 60 * 60 * 1e3;
      if (now - tokenExp > maxRefreshWindow) {
        throw new TRPCError9({
          code: "UNAUTHORIZED",
          message: "Token\u5DF2\u8FC7\u671F\u592A\u4E45,\u8BF7\u91CD\u65B0\u767B\u5F55"
        });
      }
      const newToken = jwt.sign(
        {
          id: user.id,
          openId: user.openId,
          name: user.name,
          role: user.role,
          roles: user.roles || user.role
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );
      ctx.res?.cookie("session", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1e3
        // 7天
      });
      return {
        success: true,
        token: newToken,
        expiresIn: 24 * 60 * 60,
        // 24小时(秒)
        user: {
          id: user.id,
          openId: user.openId || "",
          name: user.name || "",
          role: user.role,
          roles: (user.roles || user.role).split(",")
        }
      };
    } catch (error) {
      if (error instanceof TRPCError9) {
        throw error;
      }
      throw new TRPCError9({
        code: "UNAUTHORIZED",
        message: "Token\u65E0\u6548,\u8BF7\u91CD\u65B0\u767B\u5F55"
      });
    }
  }),
  // 用户账号登录（仅支持手机号+密码）
  loginWithUserAccount: publicProcedure.input(
    z12.object({
      phone: z12.string().min(1, "\u8BF7\u8F93\u5165\u624B\u673A\u53F7"),
      password: z12.string().min(1, "\u8BF7\u8F93\u5165\u5BC6\u7801")
    })
  ).mutation(async ({ input, ctx }) => {
    const drizzle2 = await getDb();
    if (!drizzle2) {
      throw new TRPCError9({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    const userList = await drizzle2.select().from(users).where(
      eq7(users.phone, input.phone)
    ).limit(1);
    if (userList.length === 0) {
      throw new TRPCError9({
        code: "UNAUTHORIZED",
        message: "\u624B\u673A\u53F7\u4E0D\u5B58\u5728\uFF0C\u8BF7\u786E\u8BA4\u540E\u91CD\u8BD5"
      });
    }
    const user = userList[0];
    if (!user.password) {
      throw new TRPCError9({
        code: "UNAUTHORIZED",
        message: "\u8BE5\u8D26\u53F7\u672A\u8BBE\u7F6E\u5BC6\u7801\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458"
      });
    }
    const isValidPassword = await verifyPassword(input.password, user.password);
    if (!isValidPassword) {
      throw new TRPCError9({
        code: "UNAUTHORIZED",
        message: "\u5BC6\u7801\u9519\u8BEF"
      });
    }
    if (!user.isActive) {
      throw new TRPCError9({
        code: "UNAUTHORIZED",
        message: "\u8D26\u53F7\u5DF2\u88AB\u7981\u7528\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458"
      });
    }
    const token = jwt.sign(
      {
        id: user.id,
        openId: user.openId,
        name: user.name,
        role: user.role,
        roles: user.roles || user.role
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    ctx.res?.cookie("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1e3
      // 7天
    });
    await drizzle2.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date() }).where(eq7(users.id, user.id));
    const userRoles = (user.roles || user.role || "").split(",");
    if (userRoles.includes("user") && user.phone) {
      try {
        await getOrCreateCustomerForUser({
          id: user.id,
          name: user.name,
          nickname: user.nickname,
          phone: user.phone
        });
      } catch (err) {
        console.error("[Login] \u68C0\u67E5/\u521B\u5EFA\u4E1A\u52A1\u5BA2\u6237\u5931\u8D25:", err);
      }
    }
    return {
      success: true,
      token,
      user: {
        id: user.id,
        openId: user.openId || "",
        name: user.name || "",
        nickname: user.nickname || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role,
        roles: (user.roles || user.role).split(","),
        isActive: user.isActive
      }
    };
  }),
  // 修改密码(需要登录状态，通过Token获取用户)
  changePassword: protectedProcedure.input(
    z12.object({
      oldPassword: z12.string().min(1, "\u8BF7\u8F93\u5165\u65E7\u5BC6\u7801"),
      newPassword: z12.string().min(6, "\u5BC6\u7801\u957F\u5EA6\u81F3\u5C116\u4F4D").max(20, "\u5BC6\u7801\u6700\u591A20\u4F4D")
    })
  ).mutation(async ({ input, ctx }) => {
    const drizzle2 = await getDb();
    if (!drizzle2) {
      return {
        success: false,
        error: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      };
    }
    const userId = ctx.user.id;
    const userList = await drizzle2.select().from(users).where(eq7(users.id, userId)).limit(1);
    if (userList.length === 0) {
      return {
        success: false,
        error: "\u7528\u6237\u4E0D\u5B58\u5728"
      };
    }
    const user = userList[0];
    if (!user.isActive) {
      return {
        success: false,
        error: "\u8D26\u53F7\u5DF2\u88AB\u7981\u7528"
      };
    }
    if (!user.password) {
      return {
        success: false,
        error: "\u8BE5\u8D26\u53F7\u672A\u8BBE\u7F6E\u5BC6\u7801\uFF0C\u65E0\u6CD5\u4FEE\u6539"
      };
    }
    const isOldPasswordValid = await verifyPassword(input.oldPassword, user.password);
    if (!isOldPasswordValid) {
      return {
        success: false,
        error: "\u65E7\u5BC6\u7801\u9519\u8BEF"
      };
    }
    const isSamePassword = await verifyPassword(input.newPassword, user.password);
    if (isSamePassword) {
      return {
        success: false,
        error: "\u65B0\u5BC6\u7801\u4E0D\u80FD\u4E0E\u65E7\u5BC6\u7801\u76F8\u540C"
      };
    }
    const hashedNewPassword = await hashPassword(input.newPassword);
    await drizzle2.update(users).set({ password: hashedNewPassword }).where(eq7(users.id, userId));
    return {
      success: true
    };
  }),
  // 发送短信验证码（用于重置密码）
  sendSmsCode: publicProcedure.input(
    z12.object({
      phone: z12.string().min(11, "\u624B\u673A\u53F7\u683C\u5F0F\u9519\u8BEF").max(11, "\u624B\u673A\u53F7\u683C\u5F0F\u9519\u8BEF").regex(/^1[3-9]\d{9}$/, "\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u624B\u673A\u53F7")
    })
  ).mutation(async ({ input }) => {
    const drizzle2 = await getDb();
    if (!drizzle2) {
      throw new TRPCError9({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    const userList = await drizzle2.select().from(users).where(eq7(users.phone, input.phone)).limit(1);
    if (userList.length === 0) {
      return { success: false, error: "\u8BE5\u624B\u673A\u53F7\u672A\u6CE8\u518C" };
    }
    if (!userList[0].isActive) {
      return { success: false, error: "\u8D26\u53F7\u5DF2\u88AB\u7981\u7528\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458" };
    }
    const result = await sendSmsVerificationCode(input.phone);
    if (!result.success) {
      return { success: false, error: result.message };
    }
    return { success: true };
  }),
  // 忘记密码 - 通过手机号+验证码重置密码
  resetPassword: publicProcedure.input(
    z12.object({
      phone: z12.string().min(11, "\u624B\u673A\u53F7\u683C\u5F0F\u9519\u8BEF").max(11, "\u624B\u673A\u53F7\u683C\u5F0F\u9519\u8BEF").regex(/^1[3-9]\d{9}$/, "\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u624B\u673A\u53F7"),
      code: z12.string().min(1, "\u8BF7\u8F93\u5165\u9A8C\u8BC1\u7801"),
      newPassword: z12.string().min(6, "\u5BC6\u7801\u957F\u5EA6\u81F3\u5C116\u4F4D").max(20, "\u5BC6\u7801\u6700\u591A20\u4F4D")
    })
  ).mutation(async ({ input }) => {
    const drizzle2 = await getDb();
    if (!drizzle2) {
      throw new TRPCError9({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    const userList = await drizzle2.select().from(users).where(eq7(users.phone, input.phone)).limit(1);
    if (userList.length === 0) {
      return {
        success: false,
        error: "\u624B\u673A\u53F7\u672A\u6CE8\u518C"
      };
    }
    const user = userList[0];
    if (!user.isActive) {
      return {
        success: false,
        error: "\u8D26\u53F7\u5DF2\u88AB\u7981\u7528\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458"
      };
    }
    if (input.code !== process.env.INTERNAL_RESET_TOKEN) {
      console.warn(`[AUTH] resetPassword: \u65E0\u6548\u7684\u5185\u90E8\u4EE4\u724C\uFF0C\u7591\u4F3C\u7ED5\u8FC7\u4EE3\u7406\u5C42\u8C03\u7528, phone=${input.phone}`);
      return {
        success: false,
        error: "\u65E0\u6548\u7684\u8BF7\u6C42\uFF0C\u8BF7\u901A\u8FC7\u5B98\u65B9 App \u64CD\u4F5C"
      };
    }
    const hashedNewPassword = await hashPassword(input.newPassword);
    await drizzle2.update(users).set({ password: hashedNewPassword }).where(eq7(users.id, user.id));
    return {
      success: true
    };
  }),
  // 新用户注册(手机号+密码)
  register: publicProcedure.input(
    z12.object({
      phone: z12.string().min(11, "\u624B\u673A\u53F7\u683C\u5F0F\u9519\u8BEF").max(11, "\u624B\u673A\u53F7\u683C\u5F0F\u9519\u8BEF").regex(/^1[3-9]\d{9}$/, "\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u624B\u673A\u53F7"),
      password: z12.string().min(6, "\u5BC6\u7801\u81F3\u5C116\u4F4D").max(20, "\u5BC6\u7801\u6700\u591A20\u4F4D"),
      name: z12.string().optional(),
      nickname: z12.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const drizzle2 = await getDb();
    if (!drizzle2) {
      throw new TRPCError9({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    const existingUser = await drizzle2.select().from(users).where(eq7(users.phone, input.phone)).limit(1);
    if (existingUser.length > 0) {
      throw new TRPCError9({
        code: "CONFLICT",
        message: "\u8BE5\u624B\u673A\u53F7\u5DF2\u88AB\u6CE8\u518C"
      });
    }
    const hashedPassword = await hashPassword(input.password);
    const openId = `user_${uuidv4().replace(/-/g, "").substring(0, 16)}`;
    const result = await drizzle2.insert(users).values({
      openId,
      phone: input.phone,
      password: hashedPassword,
      name: input.name || input.phone,
      nickname: input.nickname,
      role: "user",
      roles: "user",
      isActive: true,
      loginMethod: "phone"
    });
    const userId = result[0].insertId;
    try {
      await getOrCreateCustomerForUser({
        id: userId,
        name: input.name || input.phone,
        nickname: input.nickname || null,
        phone: input.phone
      });
    } catch (err) {
      console.error("[Register] \u521B\u5EFA\u4E1A\u52A1\u5BA2\u6237\u5931\u8D25:", err);
    }
    const token = jwt.sign(
      {
        id: userId,
        openId,
        name: input.name || input.phone,
        role: "user",
        roles: "user"
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    ctx.res?.cookie("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1e3
      // 7天
    });
    return {
      success: true,
      message: "\u6CE8\u518C\u6210\u529F",
      token,
      user: {
        id: userId,
        openId,
        phone: input.phone,
        name: input.name || input.phone,
        role: "user",
        roles: ["user"]
      }
    };
  }),
  // 账号恢复接口
  restoreAccount: publicProcedure.input(
    z12.object({
      userId: z12.number(),
      phone: z12.string(),
      verificationCode: z12.string()
    })
  ).mutation(async ({ input }) => {
    const drizzle2 = await getDb();
    if (!drizzle2) {
      throw new TRPCError9({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    const userList = await drizzle2.select().from(users).where(eq7(users.id, input.userId)).limit(1);
    if (userList.length === 0) {
      throw new TRPCError9({
        code: "NOT_FOUND",
        message: "\u7528\u6237\u4E0D\u5B58\u5728"
      });
    }
    const user = userList[0];
    if (user.phone !== input.phone) {
      throw new TRPCError9({
        code: "BAD_REQUEST",
        message: "\u624B\u673A\u53F7\u4E0D\u5339\u914D"
      });
    }
    if (user.isDeleted !== 1) {
      throw new TRPCError9({
        code: "BAD_REQUEST",
        message: "\u8D26\u53F7\u672A\u5904\u4E8E\u6CE8\u9500\u72B6\u6001"
      });
    }
    const deletedAt = user.deletedAt ? new Date(user.deletedAt) : /* @__PURE__ */ new Date();
    const recoveryDeadline = new Date(deletedAt);
    recoveryDeadline.setDate(recoveryDeadline.getDate() + 30);
    const now = /* @__PURE__ */ new Date();
    if (now > recoveryDeadline) {
      throw new TRPCError9({
        code: "BAD_REQUEST",
        message: "\u6062\u590D\u671F\u9650\u5DF2\u8FC7\uFF0C\u8D26\u53F7\u5DF2\u6C38\u4E45\u5220\u9664"
      });
    }
    await drizzle2.update(users).set({
      isDeleted: 0,
      deletedAt: null,
      deletionReason: null
    }).where(eq7(users.id, user.id));
    return {
      success: true,
      message: "\u8D26\u53F7\u5DF2\u6210\u529F\u6062\u590D",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        roles: user.roles
      }
    };
  }),
  // 查询注销状态接口
  getDeletionStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;
    if (!user) {
      throw new TRPCError9({
        code: "UNAUTHORIZED",
        message: "\u672A\u767B\u5F55"
      });
    }
    if (user.isDeleted === 0) {
      return {
        isDeleted: 0,
        status: "active",
        message: "\u8D26\u53F7\u6B63\u5E38"
      };
    }
    if (user.isDeleted === 1) {
      const deletedAt = user.deletedAt ? new Date(user.deletedAt) : /* @__PURE__ */ new Date();
      const recoveryDeadline = new Date(deletedAt);
      recoveryDeadline.setDate(recoveryDeadline.getDate() + 30);
      const now = /* @__PURE__ */ new Date();
      const daysRemaining = Math.ceil(
        (recoveryDeadline.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)
      );
      return {
        isDeleted: 1,
        status: "pending_deletion",
        deletedAt: deletedAt.toISOString(),
        recoveryDeadline: recoveryDeadline.toISOString(),
        daysRemaining,
        message: `\u8D26\u53F7\u5904\u4E8E\u6CE8\u9500\u7F13\u51B2\u671F\uFF0C\u8FD8\u6709${daysRemaining}\u5929\u53EF\u6062\u590D`
      };
    }
    if (user.isDeleted === 2) {
      const anonymizedAt = user.anonymizedAt ? new Date(user.anonymizedAt) : /* @__PURE__ */ new Date();
      return {
        isDeleted: 2,
        status: "anonymized",
        anonymizedAt: anonymizedAt.toISOString(),
        message: "\u8D26\u53F7\u5DF2\u6C38\u4E45\u5220\u9664"
      };
    }
    return {
      isDeleted: user.isDeleted,
      status: "unknown",
      message: "\u672A\u77E5\u72B6\u6001"
    };
  }),
  // App 传 JWT 免登录建立 H5 session
  loginWithToken: publicProcedure.input(
    z12.object({
      token: z12.string().min(1, "token \u4E0D\u80FD\u4E3A\u7A7A")
    })
  ).mutation(async ({ input, ctx }) => {
    let decoded;
    try {
      decoded = jwt.verify(input.token, JWT_SECRET);
    } catch (err) {
      throw new TRPCError9({
        code: "UNAUTHORIZED",
        message: "token \u65E0\u6548\u6216\u5DF2\u8FC7\u671F"
      });
    }
    const drizzle2 = await getDb();
    if (!drizzle2) {
      throw new TRPCError9({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    const userList = await drizzle2.select().from(users).where(eq7(users.id, decoded.id)).limit(1);
    if (userList.length === 0) {
      throw new TRPCError9({
        code: "UNAUTHORIZED",
        message: "\u7528\u6237\u4E0D\u5B58\u5728"
      });
    }
    const user = userList[0];
    if (!user.isActive) {
      throw new TRPCError9({
        code: "UNAUTHORIZED",
        message: "\u8D26\u53F7\u5DF2\u88AB\u7981\u7528\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458"
      });
    }
    const sessionToken = jwt.sign(
      {
        id: user.id,
        openId: user.openId,
        name: user.name,
        role: user.role,
        roles: user.roles || user.role
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    ctx.res?.cookie("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1e3
    });
    const now = /* @__PURE__ */ new Date();
    const isMember = user.membershipStatus === "active" && user.membershipExpiresAt !== null && new Date(user.membershipExpiresAt) > now;
    return {
      success: true,
      message: "\u767B\u5F55\u6210\u529F",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isMember,
        membershipStatus: user.membershipStatus || "none",
        membershipExpiresAt: user.membershipExpiresAt ? new Date(user.membershipExpiresAt).toISOString() : null
      }
    };
  })
});

// server/userManagementRouter.ts
init_trpc();
init_db();
init_schema();
init_passwordUtils();
init_roles();
import { z as z13 } from "zod";
import { TRPCError as TRPCError10 } from "@trpc/server";
import { eq as eq9, and as and6 } from "drizzle-orm";
var adminProcedure3 = protectedProcedure.use(({ ctx, next }) => {
  const userRoles = ctx.user.roles || ctx.user.role || "";
  const hasAdmin = userRoles.split(",").map((r) => r.trim()).includes("admin");
  if (!hasAdmin) {
    throw new TRPCError10({ code: "FORBIDDEN", message: "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650" });
  }
  return next({ ctx });
});
var userManagementRouter = router({
  // 获取所有用户列表（支持筛选）
  list: adminProcedure3.input(z13.object({
    city: z13.string().optional(),
    // 城市筛选
    role: z13.string().optional(),
    // 角色筛选
    isActive: z13.boolean().optional()
    // 状态筛选
  }).optional()).query(async ({ input }) => {
    const drizzle2 = await getDb();
    if (!drizzle2) {
      throw new TRPCError10({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    let userList = await drizzle2.select().from(users);
    if (input) {
      if (input.isActive !== void 0) {
        userList = userList.filter((user) => user.isActive === input.isActive);
      }
      if (input.role) {
        userList = userList.filter((user) => {
          const userRoles = user.roles || user.role || "";
          return userRoles.split(",").map((r) => r.trim()).includes(input.role);
        });
      }
      if (input.city) {
        const filteredUsers = [];
        for (const user of userList) {
          const roleCities = await getUserRoleCities(user.id);
          const hasCity = Object.values(roleCities).some((cityList) => {
            if (Array.isArray(cityList)) {
              return cityList.includes(input.city);
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
    const usersWithRoleCities = await Promise.all(
      userList.map(async (user) => {
        const roleCitiesData = await getUserRoleCities(user.id);
        const roleCities = {};
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
          roles: user.roles || user.role || "user",
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastSignedIn: user.lastSignedIn,
          roleCities,
          // 现在格式正确了：Record<string, string[]>
          // 会员相关字段
          membershipStatus: user.membershipStatus,
          isMember: user.isMember,
          membershipActivatedAt: user.membershipActivatedAt,
          membershipExpiresAt: user.membershipExpiresAt,
          membershipOrderId: user.membershipOrderId
        };
      })
    );
    return usersWithRoleCities;
  }),
  // 获取单个用户详情
  getById: adminProcedure3.input(z13.object({ id: z13.number() })).query(async ({ input }) => {
    const drizzle2 = await getDb();
    if (!drizzle2) {
      throw new TRPCError10({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    const userList = await drizzle2.select().from(users).where(eq9(users.id, input.id)).limit(1);
    if (userList.length === 0) {
      throw new TRPCError10({
        code: "NOT_FOUND",
        message: "\u7528\u6237\u4E0D\u5B58\u5728"
      });
    }
    const user = userList[0];
    const roleCitiesData = await getUserRoleCities(user.id);
    const roleCities = {};
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
      roles: user.roles || user.role || "user",
      roleCities,
      // 角色-城市关联
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastSignedIn: user.lastSignedIn
    };
  }),
  // 创建新用户
  create: adminProcedure3.input(
    z13.object({
      name: z13.string().min(1, "\u7528\u6237\u540D\u4E0D\u80FD\u4E3A\u7A7A"),
      nickname: z13.string().optional(),
      email: z13.union([z13.string().email("\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E"), z13.literal("")]).optional(),
      phone: z13.string().optional(),
      password: z13.string().min(6, "\u5BC6\u7801\u81F3\u5C116\u4F4D"),
      role: z13.enum(USER_ROLE_VALUES).optional(),
      roles: z13.string().optional(),
      // 多角色，逗号分隔
      roleCities: z13.array(z13.object({
        role: z13.string(),
        cities: z13.array(z13.string())
      })).optional()
      // 角色-城市关联
    })
  ).mutation(async ({ input }) => {
    const drizzle2 = await getDb();
    if (!drizzle2) {
      throw new TRPCError10({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    if (input.phone) {
      const { checkPhoneUnique: checkPhoneUnique2 } = await Promise.resolve().then(() => (init_phoneValidator(), phoneValidator_exports));
      const phoneCheck = await checkPhoneUnique2(input.phone);
      if (!phoneCheck.isUnique) {
        throw new TRPCError10({
          code: "BAD_REQUEST",
          message: `\u624B\u673A\u53F7\u5DF2\u88AB\u4F7F\u7528\uFF08${phoneCheck.conflictType === "user" ? "\u7528\u6237\u7BA1\u7406" : "\u8001\u5E08\u7BA1\u7406"}\u4E2D\u7684 ${phoneCheck.conflictName}\uFF09`
        });
      }
    }
    const hashedPassword = await hashPassword(input.password);
    const openId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const rolesStr = input.roles || input.role || "user";
    const rolesArray = rolesStr.split(",").map((r) => r.trim());
    if (rolesArray.length === 0 || rolesArray.every((r) => !r)) {
      throw new TRPCError10({
        code: "BAD_REQUEST",
        message: "\u6BCF\u4E2A\u8D26\u53F7\u5FC5\u987B\u6700\u5C111\u79CD\u89D2\u8272"
      });
    }
    const primaryRole = rolesArray[0];
    const [result] = await drizzle2.insert(users).values({
      openId,
      name: input.name,
      nickname: input.nickname || null,
      email: input.email || null,
      phone: input.phone || null,
      password: hashedPassword,
      role: primaryRole,
      roles: rolesStr,
      isActive: true
    });
    const newUserId = result.insertId;
    if (rolesStr.includes("teacher")) {
      await drizzle2.insert(teachers).values({
        userId: newUserId,
        name: input.name,
        phone: input.phone || null,
        status: "\u6D3B\u8DC3",
        isActive: true
      });
    }
    if (rolesStr.includes("sales")) {
      const { salespersons: salespersons2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      await drizzle2.insert(salespersons2).values({
        userId: newUserId,
        isActive: true
      });
    }
    if (rolesStr.includes("cityPartner")) {
      const { partners: partners2, partnerCities: partnerCities3, cities: cities3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const [partnerResult] = await drizzle2.insert(partners2).values({
        userId: newUserId,
        name: input.name,
        phone: input.phone || null,
        profitRatio: "0.30",
        // 默认30%
        createdBy: 1
        // 管理员创建
      });
      const partnerId = partnerResult.insertId;
      if (input.roleCities && input.roleCities.length > 0) {
        const cityPartnerData = input.roleCities.find((rc) => rc.role === "cityPartner");
        if (cityPartnerData && cityPartnerData.cities.length > 0) {
          for (const cityName of cityPartnerData.cities) {
            const [cityRecord] = await drizzle2.select().from(cities3).where(eq9(cities3.name, cityName)).limit(1);
            if (cityRecord) {
              await drizzle2.insert(partnerCities3).values({
                partnerId,
                cityId: cityRecord.id,
                contractStatus: "active",
                // 修复：用户管理编辑城市时直接设置为active
                currentProfitStage: 1,
                isInvestmentRecovered: false,
                createdBy: 1
              });
            }
          }
        }
      }
    }
    return {
      success: true,
      message: "\u7528\u6237\u521B\u5EFA\u6210\u529F"
    };
  }),
  // 更新用户信息
  update: adminProcedure3.input(
    z13.object({
      id: z13.number(),
      name: z13.string().min(1, "\u7528\u6237\u540D\u4E0D\u80FD\u4E3A\u7A7A").optional(),
      nickname: z13.string().optional(),
      email: z13.union([z13.string().email("\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E"), z13.literal("")]).optional(),
      phone: z13.string().optional(),
      role: z13.enum(USER_ROLE_VALUES).optional(),
      roles: z13.string().optional(),
      // 多角色，逗号分隔
      roleCities: z13.record(z13.string(), z13.array(z13.string())).optional()
      // 角色-城市关联，如 { "teacher": ["深圳"], "cityPartner": ["天津"] }
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      console.log("[UserManagement] \u66F4\u65B0\u8BF7\u6C42: userId=", input.id, "data=", JSON.stringify(input), "operator=", ctx.user.name);
      const drizzle2 = await getDb();
      if (!drizzle2) {
        throw new TRPCError10({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
        });
      }
      const { id, roles, roleCities, ...updateData } = input;
      if (updateData.phone) {
        const { checkPhoneUnique: checkPhoneUnique2 } = await Promise.resolve().then(() => (init_phoneValidator(), phoneValidator_exports));
        const phoneCheck = await checkPhoneUnique2(updateData.phone, id);
        if (!phoneCheck.isUnique) {
          throw new TRPCError10({
            code: "BAD_REQUEST",
            message: `\u624B\u673A\u53F7\u5DF2\u88AB\u4F7F\u7528\uFF08${phoneCheck.conflictType === "user" ? "\u7528\u6237\u7BA1\u7406" : "\u8001\u5E08\u7BA1\u7406"}\u4E2D\u7684 ${phoneCheck.conflictName}\uFF09`
          });
        }
      }
      const [usersBefore] = await drizzle2.select().from(users).where(eq9(users.id, id)).limit(1);
      const oldRoles = usersBefore?.roles || "";
      const hadTeacherRole = oldRoles.includes("teacher");
      const setData = { ...updateData };
      if (roles) {
        const rolesArray = roles.split(",").map((r) => r.trim());
        if (rolesArray.length === 0 || rolesArray.every((r) => !r)) {
          throw new TRPCError10({
            code: "BAD_REQUEST",
            message: "\u6BCF\u4E2A\u8D26\u53F7\u5FC5\u987B\u6700\u5C111\u79CD\u89D2\u8272"
          });
        }
        const hasRoleCities2 = roleCities && Object.keys(roleCities).length > 0;
        if (hasRoleCities2) {
          for (const [role, cities3] of Object.entries(roleCities)) {
            if (role === "teacher" || role === "cityPartner") {
              if (!cities3 || cities3.length === 0) {
                throw new TRPCError10({
                  code: "BAD_REQUEST",
                  message: `\u9009\u62E9${role === "teacher" ? "\u8001\u5E08" : "\u5408\u4F19\u4EBA"}\u89D2\u8272\u65F6\uFF0C\u5FC5\u987B\u9009\u62E9\u5BF9\u5E94\u7684\u57CE\u5E02`
                });
              }
            }
          }
        }
        for (const role of rolesArray) {
          if (role === "teacher" || role === "cityPartner") {
            if (!hasRoleCities2 || !roleCities[role]) {
              const existingCities = await getUserRoleCities(id);
              const roleCity = existingCities.find((rc) => rc.role === role);
              if (!roleCity || !roleCity.cities || JSON.parse(roleCity.cities).length === 0) {
                throw new TRPCError10({
                  code: "BAD_REQUEST",
                  message: `\u9009\u62E9${role === "teacher" ? "\u8001\u5E08" : "\u5408\u4F19\u4EBA"}\u89D2\u8272\u65F6\uFF0C\u5FC5\u987B\u9009\u62E9\u5BF9\u5E94\u7684\u57CE\u5E02`
                });
              }
            }
          }
        }
        setData.roles = roles;
        setData.role = rolesArray[0];
      }
      await drizzle2.update(users).set(setData).where(eq9(users.id, id));
      const hasRoleCities = roleCities && Object.keys(roleCities).length > 0;
      if (hasRoleCities) {
        for (const [role, cities3] of Object.entries(roleCities)) {
          if (role === "teacher" || role === "cityPartner") {
            await setUserRoleCities(id, role, cities3);
          }
        }
      }
      if (roles) {
        const hasTeacherRole = roles.includes("teacher");
        const [teacherRecords] = await drizzle2.select().from(teachers).where(eq9(teachers.userId, id)).limit(1);
        if (hadTeacherRole && !hasTeacherRole) {
          if (teacherRecords) {
            await drizzle2.update(teachers).set({ isActive: false, status: "\u4E0D\u6D3B\u8DC3" }).where(eq9(teachers.userId, id));
          }
        } else if (!hadTeacherRole && hasTeacherRole) {
          if (teacherRecords) {
            await drizzle2.update(teachers).set({ isActive: true, status: "\u6D3B\u8DC3" }).where(eq9(teachers.userId, id));
          } else {
            const [currentUser] = await drizzle2.select().from(users).where(eq9(users.id, id)).limit(1);
            await drizzle2.insert(teachers).values({
              userId: id,
              name: currentUser?.name || "\u672A\u77E5",
              phone: currentUser?.phone || null,
              status: "\u6D3B\u8DC3",
              isActive: true
            });
          }
        }
      }
      if (roles) {
        const hasCityPartnerRole = roles.includes("cityPartner");
        const hadCityPartnerRole = oldRoles.includes("cityPartner");
        const { partners: partners2, partnerCities: partnerCities3, cities: cities3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const [partnerRecords] = await drizzle2.select().from(partners2).where(eq9(partners2.userId, id)).limit(1);
        if (hadCityPartnerRole && !hasCityPartnerRole) {
          if (partnerRecords) {
            await drizzle2.delete(partnerCities3).where(eq9(partnerCities3.partnerId, partnerRecords.id));
            await drizzle2.update(partners2).set({ isActive: false }).where(eq9(partners2.userId, id));
          }
        } else if (!hadCityPartnerRole && hasCityPartnerRole) {
          if (partnerRecords) {
            await drizzle2.update(partners2).set({
              isActive: true,
              name: updateData.name || partnerRecords.name,
              phone: updateData.phone || partnerRecords.phone
            }).where(eq9(partners2.userId, id));
            if (roleCities && roleCities.cityPartner && roleCities.cityPartner.length > 0) {
              const partnerId = partnerRecords.id;
              for (const cityName of roleCities.cityPartner) {
                const [cityRecord] = await drizzle2.select().from(cities3).where(eq9(cities3.name, cityName)).limit(1);
                if (cityRecord) {
                  const [existingPartnerCity] = await drizzle2.select().from(partnerCities3).where(
                    and6(
                      eq9(partnerCities3.partnerId, partnerId),
                      eq9(partnerCities3.cityId, cityRecord.id)
                    )
                  ).limit(1);
                  if (!existingPartnerCity) {
                    await drizzle2.insert(partnerCities3).values({
                      partnerId,
                      cityId: cityRecord.id,
                      contractStatus: "active",
                      // 修复：用户管理编辑城市时直接设置为active
                      currentProfitStage: 1,
                      isInvestmentRecovered: false,
                      createdBy: 1
                    });
                  }
                }
              }
            }
          } else {
            const [newPartner] = await drizzle2.insert(partners2).values({
              userId: id,
              name: updateData.name || usersBefore?.name || "\u672A\u77E5",
              phone: updateData.phone || usersBefore?.phone || null,
              profitRatio: "0.30",
              // 默认30%
              createdBy: 1,
              // 管理员创建
              isActive: true
            });
            if (roleCities && roleCities.cityPartner && roleCities.cityPartner.length > 0) {
              const partnerId = newPartner.insertId;
              for (const cityName of roleCities.cityPartner) {
                const [cityRecord] = await drizzle2.select().from(cities3).where(eq9(cities3.name, cityName)).limit(1);
                if (cityRecord) {
                  await drizzle2.insert(partnerCities3).values({
                    partnerId,
                    cityId: cityRecord.id,
                    contractStatus: "active",
                    // 修复：用户管理编辑城市时直接设置为active
                    currentProfitStage: 1,
                    isInvestmentRecovered: false,
                    createdBy: 1
                  });
                }
              }
            }
          }
        } else if (hasCityPartnerRole && partnerRecords) {
          const partnerUpdateData = {};
          if (updateData.name) partnerUpdateData.name = updateData.name;
          if (updateData.phone) partnerUpdateData.phone = updateData.phone;
          if (Object.keys(partnerUpdateData).length > 0) {
            await drizzle2.update(partners2).set(partnerUpdateData).where(eq9(partners2.userId, id));
          }
          if (roleCities && roleCities.cityPartner) {
            const partnerId = partnerRecords.id;
            const newCityNames = roleCities.cityPartner;
            const existingPartnerCities = await drizzle2.select().from(partnerCities3).where(eq9(partnerCities3.partnerId, partnerId));
            const existingCityIds = existingPartnerCities.map((pc) => pc.cityId);
            const newCityIds = [];
            for (const cityName of newCityNames) {
              const [cityRecord] = await drizzle2.select().from(cities3).where(eq9(cities3.name, cityName)).limit(1);
              if (cityRecord) {
                newCityIds.push(cityRecord.id);
              }
            }
            for (const cityId of newCityIds) {
              if (!existingCityIds.includes(cityId)) {
                await drizzle2.insert(partnerCities3).values({
                  partnerId,
                  cityId,
                  contractStatus: "active",
                  // 修复：用户管理编辑城市时直接设置为active
                  currentProfitStage: 1,
                  isInvestmentRecovered: false,
                  createdBy: 1
                });
              }
            }
          }
        }
      }
      console.log("[UserManagement] \u66F4\u65B0\u6210\u529F: userId=", input.id);
      return {
        success: true,
        message: "\u7528\u6237\u4FE1\u606F\u66F4\u65B0\u6210\u529F"
      };
    } catch (error) {
      console.error("[UserManagement] \u66F4\u65B0\u5931\u8D25: userId=", input.id, "error=", error);
      throw new TRPCError10({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "\u66F4\u65B0\u7528\u6237\u4FE1\u606F\u5931\u8D25"
      });
    }
  }),
  // 更新用户角色（多角色）
  updateRoles: adminProcedure3.input(
    z13.object({
      id: z13.number(),
      roles: z13.string().min(1, "\u81F3\u5C11\u9700\u8981\u4E00\u4E2A\u89D2\u8272")
    })
  ).mutation(async ({ input }) => {
    const drizzle2 = await getDb();
    if (!drizzle2) {
      throw new TRPCError10({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    const [usersBefore] = await drizzle2.select().from(users).where(eq9(users.id, input.id)).limit(1);
    const oldRoles = usersBefore?.roles || "";
    const hadTeacherRole = oldRoles.includes("teacher");
    const hasTeacherRole = input.roles.includes("teacher");
    const hadCityPartnerRole = oldRoles.includes("cityPartner");
    const hasCityPartnerRole = input.roles.includes("cityPartner");
    const primaryRole = input.roles.split(",")[0].trim();
    await drizzle2.update(users).set({
      role: primaryRole,
      roles: input.roles
    }).where(eq9(users.id, input.id));
    const [teacherRecords] = await drizzle2.select().from(teachers).where(eq9(teachers.userId, input.id)).limit(1);
    if (hadTeacherRole && !hasTeacherRole) {
      if (teacherRecords) {
        await drizzle2.update(teachers).set({ isActive: false, status: "\u4E0D\u6D3B\u8DC3" }).where(eq9(teachers.userId, input.id));
      }
    } else if (!hadTeacherRole && hasTeacherRole) {
      if (teacherRecords) {
        await drizzle2.update(teachers).set({ isActive: true, status: "\u6D3B\u8DC3" }).where(eq9(teachers.userId, input.id));
      } else {
        await drizzle2.insert(teachers).values({
          userId: input.id,
          name: usersBefore?.name || "\u672A\u77E5",
          phone: usersBefore?.phone || null,
          status: "\u6D3B\u8DC3",
          isActive: true
        });
      }
    }
    const { partners: partners2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const [partnerRecords] = await drizzle2.select().from(partners2).where(eq9(partners2.userId, input.id)).limit(1);
    if (hadCityPartnerRole && !hasCityPartnerRole) {
      if (partnerRecords) {
        await drizzle2.update(partners2).set({ isActive: false }).where(eq9(partners2.userId, input.id));
      }
    } else if (!hadCityPartnerRole && hasCityPartnerRole) {
      if (partnerRecords) {
        await drizzle2.update(partners2).set({ isActive: true }).where(eq9(partners2.userId, input.id));
      } else {
        await drizzle2.insert(partners2).values({
          userId: input.id,
          name: usersBefore?.name || "\u672A\u77E5",
          phone: usersBefore?.phone || null,
          profitRatio: "0.30",
          // 默认30%
          createdBy: 1,
          // 管理员创建
          isActive: true
        });
      }
    }
    const hadSalesRole = oldRoles.includes("sales");
    const hasSalesRole = input.roles.includes("sales");
    const { salespersons: salespersons2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const [salespersonRecord] = await drizzle2.select().from(salespersons2).where(eq9(salespersons2.userId, input.id)).limit(1);
    if (hadSalesRole && !hasSalesRole) {
      if (salespersonRecord) {
        await drizzle2.update(salespersons2).set({ isActive: false }).where(eq9(salespersons2.userId, input.id));
      }
    } else if (!hadSalesRole && hasSalesRole) {
      if (salespersonRecord) {
        await drizzle2.update(salespersons2).set({ isActive: true }).where(eq9(salespersons2.userId, input.id));
      } else {
        await drizzle2.insert(salespersons2).values({
          userId: input.id,
          isActive: true
        });
      }
    }
    return {
      success: true,
      message: "\u89D2\u8272\u66F4\u65B0\u6210\u529F"
    };
  }),
  // 重置用户密码
  resetPassword: adminProcedure3.input(
    z13.object({
      id: z13.number(),
      newPassword: z13.string().min(6, "\u5BC6\u7801\u81F3\u5C116\u4F4D")
    })
  ).mutation(async ({ input }) => {
    const drizzle2 = await getDb();
    if (!drizzle2) {
      throw new TRPCError10({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    const hashedPassword = await hashPassword(input.newPassword);
    await drizzle2.update(users).set({ password: hashedPassword }).where(eq9(users.id, input.id));
    return {
      success: true,
      message: "\u5BC6\u7801\u91CD\u7F6E\u6210\u529F"
    };
  }),
  // 启用/禁用用户账号
  toggleActive: adminProcedure3.input(
    z13.object({
      id: z13.number(),
      isActive: z13.boolean()
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      console.log("[UserManagement] \u5207\u6362\u72B6\u6001\u8BF7\u6C42: userId=", input.id, "isActive=", input.isActive, "operator=", ctx.user.name);
      const drizzle2 = await getDb();
      if (!drizzle2) {
        throw new TRPCError10({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
        });
      }
      await drizzle2.update(users).set({ isActive: input.isActive }).where(eq9(users.id, input.id));
      const [partnerRecord] = await drizzle2.select().from(partners).where(eq9(partners.userId, input.id)).limit(1);
      if (partnerRecord) {
        await drizzle2.update(partners).set({ isActive: input.isActive }).where(eq9(partners.userId, input.id));
      }
      console.log("[UserManagement] \u5207\u6362\u72B6\u6001\u6210\u529F: userId=", input.id);
      return {
        success: true,
        message: input.isActive ? "\u8D26\u53F7\u5DF2\u542F\u7528" : "\u8D26\u53F7\u5DF2\u7981\u7528"
      };
    } catch (error) {
      console.error("[UserManagement] \u5207\u6362\u72B6\u6001\u5931\u8D25: userId=", input.id, "error=", error);
      throw new TRPCError10({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "\u5207\u6362\u7528\u6237\u72B6\u6001\u5931\u8D25"
      });
    }
  }),
  // 重置密码获取用户的角色-城市关联
  getRoleCities: adminProcedure3.input(z13.object({ userId: z13.number() })).query(async ({ input }) => {
    const roleCities = await getUserRoleCities(input.userId);
    return roleCities;
  }),
  // 删除用户
  delete: adminProcedure3.input(z13.object({ id: z13.number() })).mutation(async ({ input, ctx }) => {
    try {
      console.log("[UserManagement] \u5220\u9664\u8BF7\u6C42: userId=", input.id, "operator=", ctx.user.name);
      const drizzle2 = await getDb();
      if (!drizzle2) {
        throw new TRPCError10({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
        });
      }
      const [existingUser] = await drizzle2.select().from(users).where(eq9(users.id, input.id)).limit(1);
      if (!existingUser) {
        throw new TRPCError10({
          code: "NOT_FOUND",
          message: "\u7528\u6237\u4E0D\u5B58\u5728"
        });
      }
      const { partners: partners2, partnerCities: partnerCities3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const [partnerRecord] = await drizzle2.select().from(partners2).where(eq9(partners2.userId, input.id)).limit(1);
      if (partnerRecord) {
        await drizzle2.delete(partnerCities3).where(eq9(partnerCities3.partnerId, partnerRecord.id));
        await drizzle2.delete(partners2).where(eq9(partners2.userId, input.id));
      }
      await drizzle2.delete(users).where(eq9(users.id, input.id));
      console.log("[UserManagement] \u5220\u9664\u6210\u529F: userId=", input.id);
      return {
        success: true,
        message: "\u7528\u6237\u5220\u9664\u6210\u529F"
      };
    } catch (error) {
      console.error("[UserManagement] \u5220\u9664\u5931\u8D25: userId=", input.id, "error=", error);
      throw new TRPCError10({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "\u5220\u9664\u7528\u6237\u5931\u8D25"
      });
    }
  }),
  // 批量更新老师属性和备注
  batchUpdateTeacherAttributes: adminProcedure3.input(z13.object({
    updates: z13.array(z13.object({
      userId: z13.number(),
      teacherAttribute: z13.enum(["S", "M", "Switch"]).optional(),
      teacherNotes: z13.string().optional()
    }))
  })).mutation(async ({ input }) => {
    const drizzle2 = await getDb();
    if (!drizzle2) {
      throw new TRPCError10({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    for (const update of input.updates) {
      try {
        const [existingUser] = await drizzle2.select().from(users).where(eq9(users.id, update.userId)).limit(1);
        if (!existingUser) {
          results.failed++;
          results.errors.push({
            userId: update.userId,
            error: "\u7528\u6237\u4E0D\u5B58\u5728"
          });
          continue;
        }
        const updateData = {};
        if (update.teacherAttribute) {
          updateData.teacherAttribute = update.teacherAttribute;
        }
        if (update.teacherNotes !== void 0) {
          updateData.teacherNotes = update.teacherNotes;
        }
        if (Object.keys(updateData).length > 0) {
          await drizzle2.update(users).set(updateData).where(eq9(users.id, update.userId));
          results.success++;
          console.log(`[\u6279\u91CF\u66F4\u65B0] \u6210\u529F\u66F4\u65B0\u7528\u6237 ${update.userId}`);
        } else {
          results.failed++;
          results.errors.push({
            userId: update.userId,
            error: "\u65E0\u6709\u9700\u8981\u66F4\u65B0\u7684\u5B57\u6BB5"
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId: update.userId,
          error: error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"
        });
        console.error(`[\u6279\u91CF\u66F4\u65B0] \u66F4\u65B0\u7528\u6237 ${update.userId} \u5931\u8D25:`, error);
      }
    }
    return results;
  })
});

// server/normalizeOrderRouter.ts
init_trpc();
init_db();
init_schema();
import { z as z14 } from "zod";
import { isNotNull as isNotNull3, or as or3, eq as eq11 } from "drizzle-orm";

// server/normalizeOrderData.ts
init_db();
init_schema();
import { like as like2, and as and7, isNotNull as isNotNull2, ne as ne3, eq as eq10 } from "drizzle-orm";
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}
async function matchTeacherNickname(teacherName) {
  if (!teacherName || teacherName.trim() === "") {
    return {
      matched: false,
      originalName: teacherName,
      standardName: null,
      similarity: 0,
      confidence: "low"
    };
  }
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const teachers3 = await db.select({
    id: users.id,
    name: users.name,
    nickname: users.nickname,
    aliases: users.aliases
  }).from(users).where(
    and7(
      like2(users.roles, "%teacher%"),
      isNotNull2(users.nickname),
      ne3(users.nickname, "")
    )
  );
  let bestMatch = null;
  for (const teacher of teachers3) {
    if (teacher.nickname?.toLowerCase().trim() === teacherName.toLowerCase().trim()) {
      return {
        matched: true,
        originalName: teacherName,
        standardName: teacher.nickname,
        similarity: 1,
        confidence: "high"
      };
    }
    const similarity = calculateSimilarity(teacherName, teacher.nickname || "");
    if (!bestMatch || similarity > bestMatch.similarity) {
      bestMatch = { name: teacher.nickname || "", similarity };
    }
    if (teacher.aliases) {
      try {
        const aliases = JSON.parse(teacher.aliases);
        if (Array.isArray(aliases)) {
          for (const alias of aliases) {
            if (alias.toLowerCase().trim() === teacherName.toLowerCase().trim()) {
              return {
                matched: true,
                originalName: teacherName,
                standardName: teacher.nickname,
                similarity: 1,
                confidence: "high"
              };
            }
          }
        }
      } catch (e) {
      }
    }
  }
  if (bestMatch) {
    if (bestMatch.similarity >= 0.8) {
      return {
        matched: true,
        originalName: teacherName,
        standardName: bestMatch.name,
        similarity: bestMatch.similarity,
        confidence: "high"
      };
    } else if (bestMatch.similarity >= 0.6) {
      return {
        matched: true,
        originalName: teacherName,
        standardName: bestMatch.name,
        similarity: bestMatch.similarity,
        confidence: "medium"
      };
    } else {
      return {
        matched: false,
        originalName: teacherName,
        standardName: bestMatch.name,
        similarity: bestMatch.similarity,
        confidence: "low"
      };
    }
  }
  return {
    matched: false,
    originalName: teacherName,
    standardName: null,
    similarity: 0,
    confidence: "low"
  };
}
async function matchCourseName(courseName) {
  if (!courseName || courseName.trim() === "") {
    return {
      matched: false,
      originalName: courseName,
      standardName: null,
      duration: null,
      similarity: 0,
      confidence: "low"
    };
  }
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const allCourses = await db.select({
    id: courses.id,
    courseName: courses.name,
    duration: courses.duration
  }).from(courses).where(eq10(courses.isActive, true));
  let bestMatch = null;
  for (const course of allCourses) {
    if (course.courseName?.toLowerCase().trim() === courseName.toLowerCase().trim()) {
      return {
        matched: true,
        originalName: courseName,
        standardName: course.courseName,
        duration: course.duration,
        similarity: 1,
        confidence: "high"
      };
    }
    const similarity = calculateSimilarity(courseName, course.courseName || "");
    if (!bestMatch || similarity > bestMatch.similarity) {
      bestMatch = { name: course.courseName, duration: course.duration, similarity };
    }
  }
  if (bestMatch) {
    if (bestMatch.similarity >= 0.8) {
      return {
        matched: true,
        originalName: courseName,
        standardName: bestMatch.name,
        duration: bestMatch.duration,
        similarity: bestMatch.similarity,
        confidence: "high"
      };
    } else if (bestMatch.similarity >= 0.6) {
      return {
        matched: true,
        originalName: courseName,
        standardName: bestMatch.name,
        duration: bestMatch.duration,
        similarity: bestMatch.similarity,
        confidence: "medium"
      };
    } else {
      return {
        matched: false,
        originalName: courseName,
        standardName: bestMatch.name,
        duration: bestMatch.duration,
        similarity: bestMatch.similarity,
        confidence: "low"
      };
    }
  }
  return {
    matched: false,
    originalName: courseName,
    standardName: null,
    duration: null,
    similarity: 0,
    confidence: "low"
  };
}
function normalizeClassTime(classTime, courseDuration) {
  if (!classTime || classTime.trim() === "") {
    return {
      normalized: false,
      originalTime: classTime,
      standardTime: null,
      confidence: "low"
    };
  }
  const trimmedTime = classTime.trim();
  const rangePattern = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/;
  if (rangePattern.test(trimmedTime)) {
    return {
      normalized: true,
      originalTime: classTime,
      standardTime: trimmedTime,
      confidence: "high"
    };
  }
  const singleTimePattern = /^(\d{1,2}):(\d{2})$/;
  const match = trimmedTime.match(singleTimePattern);
  if (match && courseDuration) {
    const startHour = parseInt(match[1]);
    const startMinute = parseInt(match[2]);
    const durationMatch = courseDuration.match(/^(\d+(?:\.\d+)?)\s*h$/);
    if (durationMatch) {
      const hours = parseFloat(durationMatch[1]);
      const totalMinutes = startHour * 60 + startMinute + hours * 60;
      const endHour = Math.floor(totalMinutes / 60);
      const endMinute = totalMinutes % 60;
      const standardTime = `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}-${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
      return {
        normalized: true,
        originalTime: classTime,
        standardTime,
        confidence: "high"
      };
    }
  }
  return {
    normalized: false,
    originalTime: classTime,
    standardTime: null,
    confidence: "low"
  };
}
async function matchClassroom(roomName, cityName) {
  if (!roomName || roomName.trim() === "") {
    return {
      matched: false,
      originalName: roomName,
      standardName: null,
      classroomId: null,
      similarity: 0,
      confidence: "low"
    };
  }
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  let cityClassrooms = [];
  if (cityName) {
    cityClassrooms = await db.select({
      id: classrooms.id,
      classroomName: classrooms.name,
      cityName: classrooms.cityName
    }).from(classrooms).where(and7(eq10(classrooms.isActive, true), eq10(classrooms.cityName, cityName)));
    for (const classroom of cityClassrooms) {
      if (classroom.classroomName?.toLowerCase().trim() === roomName.toLowerCase().trim()) {
        return {
          matched: true,
          originalName: roomName,
          standardName: classroom.classroomName,
          classroomId: classroom.id,
          similarity: 1,
          confidence: "high"
        };
      }
    }
  }
  const allClassrooms = await db.select({
    id: classrooms.id,
    classroomName: classrooms.name,
    cityName: classrooms.cityName
  }).from(classrooms).where(eq10(classrooms.isActive, true));
  let bestMatch = null;
  for (const classroom of allClassrooms) {
    if (classroom.classroomName?.toLowerCase().trim() === roomName.toLowerCase().trim()) {
      return {
        matched: true,
        originalName: roomName,
        standardName: classroom.classroomName,
        classroomId: classroom.id,
        similarity: 1,
        confidence: "high"
      };
    }
    const similarity = calculateSimilarity(roomName, classroom.classroomName || "");
    if (!bestMatch || similarity > bestMatch.similarity) {
      bestMatch = { name: classroom.classroomName, id: classroom.id, similarity };
    }
  }
  if (bestMatch) {
    if (bestMatch.similarity >= 0.8) {
      return {
        matched: true,
        originalName: roomName,
        standardName: bestMatch.name,
        classroomId: bestMatch.id,
        similarity: bestMatch.similarity,
        confidence: "high"
      };
    } else if (bestMatch.similarity >= 0.6) {
      return {
        matched: true,
        originalName: roomName,
        standardName: bestMatch.name,
        classroomId: bestMatch.id,
        similarity: bestMatch.similarity,
        confidence: "medium"
      };
    } else {
      return {
        matched: false,
        originalName: roomName,
        standardName: bestMatch.name,
        classroomId: bestMatch.id,
        similarity: bestMatch.similarity,
        confidence: "low"
      };
    }
  }
  return {
    matched: false,
    originalName: roomName,
    standardName: null,
    classroomId: null,
    similarity: 0,
    confidence: "low"
  };
}

// server/normalizeOrderRouter.ts
var normalizeOrderRouter = router({
  /**
   * 生成数据规范化预览报告
   */
  previewNormalization: protectedProcedure.input(z14.object({
    limit: z14.number().optional().default(100)
    // 限制预览数量
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const ordersToNormalize = await db.select({
      id: orders.id,
      orderNo: orders.orderNo,
      deliveryTeacher: orders.deliveryTeacher,
      deliveryCourse: orders.deliveryCourse,
      classTime: orders.classTime,
      deliveryRoom: orders.deliveryRoom,
      deliveryCity: orders.deliveryCity,
      deliveryClassroomId: orders.deliveryClassroomId
    }).from(orders).where(
      or3(
        isNotNull3(orders.deliveryTeacher),
        isNotNull3(orders.deliveryCourse),
        isNotNull3(orders.classTime),
        isNotNull3(orders.deliveryRoom)
      )
    ).limit(input.limit);
    const preview = [];
    for (const order of ordersToNormalize) {
      const result = {
        orderId: order.id,
        orderNo: order.orderNo,
        changes: []
      };
      if (order.deliveryTeacher) {
        const teacherMatch = await matchTeacherNickname(order.deliveryTeacher);
        if (teacherMatch.matched && teacherMatch.standardName !== order.deliveryTeacher) {
          result.changes.push({
            field: "deliveryTeacher",
            original: order.deliveryTeacher,
            normalized: teacherMatch.standardName,
            similarity: teacherMatch.similarity,
            confidence: teacherMatch.confidence
          });
        } else if (!teacherMatch.matched) {
          result.changes.push({
            field: "deliveryTeacher",
            original: order.deliveryTeacher,
            normalized: null,
            similarity: teacherMatch.similarity,
            confidence: "low",
            needsReview: true
          });
        }
      }
      if (order.deliveryCourse) {
        const courseMatch = await matchCourseName(order.deliveryCourse);
        if (courseMatch.matched && courseMatch.standardName !== order.deliveryCourse) {
          result.changes.push({
            field: "deliveryCourse",
            original: order.deliveryCourse,
            normalized: courseMatch.standardName,
            similarity: courseMatch.similarity,
            confidence: courseMatch.confidence,
            duration: courseMatch.duration
          });
        } else if (!courseMatch.matched) {
          result.changes.push({
            field: "deliveryCourse",
            original: order.deliveryCourse,
            normalized: null,
            similarity: courseMatch.similarity,
            confidence: "low",
            needsReview: true
          });
        }
        if (order.classTime && courseMatch.duration) {
          const timeNormalize = normalizeClassTime(order.classTime, courseMatch.duration);
          if (timeNormalize.normalized && timeNormalize.standardTime !== order.classTime) {
            result.changes.push({
              field: "classTime",
              original: order.classTime,
              normalized: timeNormalize.standardTime,
              confidence: timeNormalize.confidence
            });
          }
        }
      }
      if (order.deliveryRoom) {
        const classroomMatch = await matchClassroom(order.deliveryRoom, order.deliveryCity || null);
        if (classroomMatch.matched && classroomMatch.standardName !== order.deliveryRoom) {
          result.changes.push({
            field: "deliveryRoom",
            original: order.deliveryRoom,
            normalized: classroomMatch.standardName,
            classroomId: classroomMatch.classroomId,
            similarity: classroomMatch.similarity,
            confidence: classroomMatch.confidence
          });
        } else if (!classroomMatch.matched) {
          result.changes.push({
            field: "deliveryRoom",
            original: order.deliveryRoom,
            normalized: null,
            similarity: classroomMatch.similarity,
            confidence: "low",
            needsReview: true
          });
        }
      }
      if (result.changes.length > 0) {
        preview.push(result);
      }
    }
    const stats = {
      totalOrders: ordersToNormalize.length,
      ordersWithChanges: preview.length,
      changesByField: {
        deliveryTeacher: preview.filter((p) => p.changes.some((c) => c.field === "deliveryTeacher")).length,
        deliveryCourse: preview.filter((p) => p.changes.some((c) => c.field === "deliveryCourse")).length,
        classTime: preview.filter((p) => p.changes.some((c) => c.field === "classTime")).length,
        deliveryRoom: preview.filter((p) => p.changes.some((c) => c.field === "deliveryRoom")).length
      },
      needsReview: preview.filter((p) => p.changes.some((c) => c.needsReview)).length,
      highConfidence: preview.filter((p) => p.changes.every((c) => c.confidence === "high")).length,
      mediumConfidence: preview.filter((p) => p.changes.some((c) => c.confidence === "medium")).length
    };
    return {
      preview,
      stats
    };
  }),
  /**
   * 执行数据规范化（批量更新）
   */
  executeNormalization: protectedProcedure.input(z14.object({
    orderIds: z14.array(z14.number()),
    // 要更新的订单ID列表
    changes: z14.array(z14.object({
      orderId: z14.number(),
      field: z14.enum(["deliveryTeacher", "deliveryCourse", "classTime", "deliveryRoom", "deliveryClassroomId"]),
      value: z14.string().or(z14.number()).nullable()
    }))
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    let successCount = 0;
    let failureCount = 0;
    const errors = [];
    const changesByOrder = /* @__PURE__ */ new Map();
    for (const change of input.changes) {
      if (!changesByOrder.has(change.orderId)) {
        changesByOrder.set(change.orderId, []);
      }
      changesByOrder.get(change.orderId).push(change);
    }
    for (const orderId of input.orderIds) {
      try {
        const orderChanges = changesByOrder.get(orderId) || [];
        if (orderChanges.length === 0) continue;
        const updateData = {};
        for (const change of orderChanges) {
          updateData[change.field] = change.value;
        }
        await db.update(orders).set(updateData).where(eq11(orders.id, orderId));
        successCount++;
      } catch (error) {
        failureCount++;
        errors.push(`\u8BA2\u5355ID ${orderId}: ${error.message}`);
      }
    }
    return {
      success: true,
      successCount,
      failureCount,
      errors
    };
  })
});

// server/uploadRouter.ts
init_trpc();
import { z as z15 } from "zod";

// server/storage.ts
import OSS from "ali-oss";
function getOSSClient() {
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  const bucket = process.env.OSS_BUCKET;
  const region = process.env.OSS_REGION;
  const endpoint = process.env.OSS_ENDPOINT;
  if (!accessKeyId || !accessKeySecret || !bucket || !region) {
    throw new Error(
      "\u963F\u91CC\u4E91 OSS \u914D\u7F6E\u7F3A\u5931\uFF1A\u8BF7\u8BBE\u7F6E OSS_ACCESS_KEY_ID\u3001OSS_ACCESS_KEY_SECRET\u3001OSS_BUCKET\u3001OSS_REGION \u73AF\u5883\u53D8\u91CF"
    );
  }
  const config = {
    accessKeyId,
    accessKeySecret,
    bucket,
    region
  };
  if (endpoint) {
    config.endpoint = endpoint;
  }
  return new OSS(config);
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const client = getOSSClient();
  const key = normalizeKey(relKey);
  const buffer = typeof data === "string" ? Buffer.from(data, "utf-8") : Buffer.from(data);
  const result = await client.put(key, buffer, {
    headers: {
      "Content-Type": contentType
    }
  });
  const url = result.url;
  return { key, url };
}

// server/uploadRouter.ts
import { TRPCError as TRPCError11 } from "@trpc/server";
var uploadRouter = router({
  /**
   * 上传头像
   * 接收base64编码的图片数据,上传到S3并返回URL
   */
  uploadAvatar: protectedProcedure.input(z15.object({
    base64Data: z15.string(),
    // base64编码的图片数据(包含data:image/...前缀)
    fileName: z15.string().optional()
    // 原始文件名
  })).mutation(async ({ input }) => {
    try {
      const matches = input.base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        throw new TRPCError11({
          code: "BAD_REQUEST",
          message: "\u65E0\u6548\u7684\u56FE\u7247\u6570\u636E\u683C\u5F0F"
        });
      }
      const imageType = matches[1];
      const base64Content = matches[2];
      const buffer = Buffer.from(base64Content, "base64");
      const timestamp2 = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileKey = `avatars/teacher-${timestamp2}-${randomSuffix}.${imageType}`;
      const contentType = `image/${imageType}`;
      const result = await storagePut(fileKey, buffer, contentType);
      return {
        success: true,
        url: result.url,
        key: result.key
      };
    } catch (error) {
      console.error("\u5934\u50CF\u4E0A\u4F20\u5931\u8D25:", error);
      throw new TRPCError11({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "\u5934\u50CF\u4E0A\u4F20\u5931\u8D25"
      });
    }
  }),
  /**
   * 上传文件(通用)
   * 接收base64编码的文件数据,上传到S3并返回URL
   */
  uploadFile: protectedProcedure.input(z15.object({
    base64Data: z15.string(),
    // base64编码的文件数据
    fileName: z15.string(),
    // 原始文件名
    fileType: z15.string()
    // MIME类型
  })).mutation(async ({ input }) => {
    try {
      const base64Content = input.base64Data.replace(/^data:.+;base64,/, "");
      const buffer = Buffer.from(base64Content, "base64");
      const timestamp2 = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const ext = input.fileName.split(".").pop() || "bin";
      const fileKey = `uploads/${timestamp2}-${randomSuffix}.${ext}`;
      const result = await storagePut(fileKey, buffer, input.fileType);
      return {
        success: true,
        url: result.url,
        key: result.key
      };
    } catch (error) {
      console.error("\u6587\u4EF6\u4E0A\u4F20\u5931\u8D25:", error);
      throw new TRPCError11({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "\u6587\u4EF6\u4E0A\u4F20\u5931\u8D25"
      });
    }
  }),
  /**
   * 上传身份证照片并识别
   * 接收base64编码的图片数据,上传到S3并调用OCR识别姓名和身份证号
   */
  uploadAndRecognizeIDCard: protectedProcedure.input(z15.object({
    base64Data: z15.string(),
    // base64编码的图片数据(包含data:image/...前缀)
    side: z15.enum(["front", "back"])
    // 正面或反面
  })).mutation(async ({ input }) => {
    try {
      const matches = input.base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        throw new TRPCError11({
          code: "BAD_REQUEST",
          message: "\u65E0\u6548\u7684\u56FE\u7247\u6570\u636E\u683C\u5F0F"
        });
      }
      const imageType = matches[1];
      const base64Content = matches[2];
      const buffer = Buffer.from(base64Content, "base64");
      const timestamp2 = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileKey = `id-cards/${input.side}-${timestamp2}-${randomSuffix}.${imageType}`;
      const contentType = `image/${imageType}`;
      const result = await storagePut(fileKey, buffer, contentType);
      let ocrResult = null;
      return {
        success: true,
        url: result.url,
        key: result.key,
        ocr: ocrResult
        // OCR识别结果（只有正面才有）
      };
    } catch (error) {
      console.error("\u8EAB\u4EFD\u8BC1\u4E0A\u4F20\u5931\u8D25:", error);
      throw new TRPCError11({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "\u8EAB\u4EFD\u8BC1\u4E0A\u4F20\u5931\u8D25"
      });
    }
  })
});

// server/excelReportRouter.ts
init_trpc();
import { z as z16 } from "zod";
import { TRPCError as TRPCError12 } from "@trpc/server";

// server/excelReportGenerator.ts
init_db();
import ExcelJS3 from "exceljs";
var THEMES = {
  elegant_black: {
    primary: "2D2D2D",
    light: "E5E5E5",
    accent: "2D2D2D",
    positive: "2E7D32",
    negative: "C62828",
    warning: "F57C00"
  },
  corporate_blue: {
    primary: "1F4E79",
    light: "D6E3F0",
    accent: "1F4E79",
    positive: "2E7D32",
    negative: "C62828",
    warning: "F57C00"
  }
};
var THEME = THEMES.corporate_blue;
var SERIF_FONT = "Microsoft YaHei";
var SANS_FONT = "Microsoft YaHei";
var BORDER_COLOR = "D1D1D1";
var OUTER_BORDER = { style: "thin", color: { argb: `FF${BORDER_COLOR}` } };
var HEADER_BOTTOM = { style: "medium", color: { argb: `FF${THEME.primary}` } };
var INNER_HORIZONTAL = { style: "thin", color: { argb: `FF${BORDER_COLOR}` } };
function applyTitleStyle(cell) {
  cell.font = {
    name: SERIF_FONT,
    size: 18,
    bold: true,
    color: { argb: `FF${THEME.primary}` }
  };
  cell.alignment = { horizontal: "left", vertical: "middle" };
}
function applySectionHeaderStyle(cell) {
  cell.font = {
    name: SERIF_FONT,
    size: 14,
    bold: true,
    color: { argb: `FF${THEME.primary}` }
  };
  cell.alignment = { horizontal: "left", vertical: "middle" };
}
function applyTableHeaderStyle(row, startCol, endCol) {
  for (let col = startCol; col <= endCol; col++) {
    const cell = row.getCell(col);
    cell.font = {
      name: SERIF_FONT,
      size: 10,
      bold: true,
      color: { argb: "FFFFFFFF" }
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${THEME.primary}` }
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: OUTER_BORDER,
      bottom: HEADER_BOTTOM,
      left: col === startCol ? OUTER_BORDER : void 0,
      right: col === endCol ? OUTER_BORDER : void 0
    };
  }
}
function applyDataRowStyle(row, startCol, endCol, isLastRow, rowIndex) {
  for (let col = startCol; col <= endCol; col++) {
    const cell = row.getCell(col);
    cell.font = {
      name: SANS_FONT,
      size: 11
    };
    if (rowIndex % 2 === 0) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9F9F9" }
      };
    }
    cell.border = {
      top: INNER_HORIZONTAL,
      bottom: isLastRow ? OUTER_BORDER : INNER_HORIZONTAL,
      left: col === startCol ? OUTER_BORDER : void 0,
      right: col === endCol ? OUTER_BORDER : void 0
    };
  }
}
function applyNotesStyle(cell) {
  cell.font = {
    name: SANS_FONT,
    size: 10,
    italic: true,
    color: { argb: "FF666666" }
  };
  cell.alignment = { horizontal: "left", vertical: "middle" };
}
async function generateFinancialReport(options = {}) {
  const workbook = new ExcelJS3.Workbook();
  workbook.creator = "\u8BFE\u7A0B\u4EA4\u4ED8CRM\u7CFB\u7EDF";
  workbook.created = /* @__PURE__ */ new Date();
  const allOrders = await getAllOrders();
  const filteredOrders = filterOrdersByDate(allOrders, options.startDate, options.endDate);
  await createOverviewSheet(workbook, filteredOrders, options);
  await createCityFinanceSheet(workbook, filteredOrders);
  await createSalesPerformanceSheet(workbook, filteredOrders);
  await createTeacherSettlementSheet(workbook, filteredOrders);
  await createDetailSheet(workbook, filteredOrders);
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    filename: generateFilename("\u8D22\u52A1\u7EFC\u5408\u62A5\u8868", options)
  };
}
async function generateCityReport(options = {}) {
  const workbook = new ExcelJS3.Workbook();
  workbook.creator = "\u8BFE\u7A0B\u4EA4\u4ED8CRM\u7CFB\u7EDF";
  workbook.created = /* @__PURE__ */ new Date();
  const allOrders = await getAllOrders();
  const filteredOrders = filterOrdersByDate(allOrders, options.startDate, options.endDate);
  await createCityOverviewSheet(workbook, filteredOrders, options);
  await createCityFinanceSheet(workbook, filteredOrders);
  await createCityTrendSheet(workbook, filteredOrders);
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    filename: generateFilename("\u57CE\u5E02\u4E1A\u7EE9\u62A5\u8868", options)
  };
}
async function generateTeacherSettlementReport(options = {}) {
  const workbook = new ExcelJS3.Workbook();
  workbook.creator = "\u8BFE\u7A0B\u4EA4\u4ED8CRM\u7CFB\u7EDF";
  workbook.created = /* @__PURE__ */ new Date();
  const allOrders = await getAllOrders();
  const filteredOrders = filterOrdersByDate(allOrders, options.startDate, options.endDate);
  await createTeacherOverviewSheet(workbook, filteredOrders, options);
  await createTeacherSettlementSheet(workbook, filteredOrders);
  await createTeacherDetailSheet(workbook, filteredOrders);
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    filename: generateFilename("\u8001\u5E08\u7ED3\u7B97\u62A5\u8868", options)
  };
}
async function generateOrderExportReport(options = {}) {
  const workbook = new ExcelJS3.Workbook();
  workbook.creator = "\u8BFE\u7A0B\u4EA4\u4ED8CRM\u7CFB\u7EDF";
  workbook.created = /* @__PURE__ */ new Date();
  const allOrders = await getAllOrders();
  const filteredOrders = filterOrdersByDate(allOrders, options.startDate, options.endDate);
  await createOrderExportSheet(workbook, filteredOrders, options);
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    filename: generateFilename("\u8BA2\u5355\u5BFC\u51FA", options)
  };
}
async function createOverviewSheet(workbook, orders2, options) {
  const ws = workbook.addWorksheet("\u6982\u89C8");
  ws.views = [{ showGridLines: false }];
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 20;
  ws.getColumn(5).width = 20;
  let row = 2;
  const titleCell = ws.getCell(`B${row}`);
  titleCell.value = "\u8BFE\u7A0B\u4EA4\u4ED8CRM - \u8D22\u52A1\u7EFC\u5408\u62A5\u8868";
  applyTitleStyle(titleCell);
  row += 1;
  const subtitleCell = ws.getCell(`B${row}`);
  const dateRange = getDateRangeText(options.startDate, options.endDate);
  subtitleCell.value = `\u62A5\u8868\u5468\u671F: ${dateRange}`;
  applyNotesStyle(subtitleCell);
  row += 2;
  applySectionHeaderStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "\u5173\u952E\u6307\u6807";
  row += 1;
  const stats = calculateOverviewStats(orders2);
  const metrics = [
    { label: "\u603B\u9500\u552E\u989D", value: stats.totalSales, format: "currency" },
    { label: "\u8BA2\u5355\u6570\u91CF", value: stats.orderCount, format: "number" },
    { label: "\u603B\u6210\u672C", value: stats.totalCost, format: "currency" },
    { label: "\u51C0\u5229\u6DA6", value: stats.netProfit, format: "currency" }
  ];
  applyTableHeaderStyle(ws.getRow(row), 2, 5);
  ws.getCell(`B${row}`).value = "\u6307\u6807";
  ws.getCell(`C${row}`).value = "\u6570\u503C";
  ws.getCell(`D${row}`).value = "\u5360\u6BD4/\u7387";
  ws.getCell(`E${row}`).value = "\u8D8B\u52BF";
  row += 1;
  const metricRows = [
    { label: "\u603B\u9500\u552E\u989D", value: stats.totalSales, rate: 1, trend: "\u2014" },
    { label: "\u8001\u5E08\u8D39\u7528", value: stats.teacherFee, rate: stats.teacherFee / stats.totalSales, trend: "\u2014" },
    { label: "\u8F66\u8D39", value: stats.transportFee, rate: stats.transportFee / stats.totalSales, trend: "\u2014" },
    { label: "\u5408\u4F19\u4EBA\u8D39\u7528", value: stats.partnerFee, rate: stats.partnerFee / stats.totalSales, trend: "\u2014" },
    { label: "\u5176\u4ED6\u8D39\u7528", value: stats.otherCost, rate: stats.otherCost / stats.totalSales, trend: "\u2014" },
    { label: "\u51C0\u5229\u6DA6", value: stats.netProfit, rate: stats.profitRate, trend: stats.netProfit > 0 ? "\u2191" : "\u2193" }
  ];
  metricRows.forEach((metric, idx) => {
    const currentRow = ws.getRow(row);
    applyDataRowStyle(currentRow, 2, 5, idx === metricRows.length - 1, idx);
    ws.getCell(`B${row}`).value = metric.label;
    ws.getCell(`B${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    ws.getCell(`C${row}`).value = metric.value;
    ws.getCell(`C${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`C${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`D${row}`).value = metric.rate;
    ws.getCell(`D${row}`).numFmt = "0.0%";
    ws.getCell(`D${row}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(`E${row}`).value = metric.trend;
    ws.getCell(`E${row}`).alignment = { horizontal: "center", vertical: "middle" };
    if (metric.trend === "\u2191") {
      ws.getCell(`E${row}`).font = { color: { argb: `FF${THEME.positive}` } };
    } else if (metric.trend === "\u2193") {
      ws.getCell(`E${row}`).font = { color: { argb: `FF${THEME.negative}` } };
    }
    row += 1;
  });
  row += 2;
  applySectionHeaderStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "\u5173\u952E\u6D1E\u5BDF";
  row += 1;
  const insights = generateInsights(stats, orders2);
  insights.forEach((insight) => {
    ws.getCell(`B${row}`).value = `\u2022 ${insight}`;
    applyNotesStyle(ws.getCell(`B${row}`));
    row += 1;
  });
  row += 2;
  applySectionHeaderStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "\u5DE5\u4F5C\u8868\u5BFC\u822A";
  row += 1;
  const sheets = ["\u57CE\u5E02\u8D22\u52A1\u7EDF\u8BA1", "\u9500\u552E\u4E1A\u7EE9", "\u8001\u5E08\u7ED3\u7B97", "\u6536\u652F\u660E\u7EC6"];
  sheets.forEach((sheetName) => {
    const cell = ws.getCell(`B${row}`);
    cell.value = sheetName;
    cell.font = { color: { argb: `FF${THEME.accent}` }, underline: true };
    cell.hyperlink = `#'${sheetName}'!A1`;
    row += 1;
  });
  row += 2;
  ws.getCell(`B${row}`).value = `\u751F\u6210\u65F6\u95F4: ${(/* @__PURE__ */ new Date()).toLocaleString("zh-CN")}`;
  applyNotesStyle(ws.getCell(`B${row}`));
  row += 1;
  ws.getCell(`B${row}`).value = "\u6570\u636E\u6765\u6E90: \u8BFE\u7A0B\u4EA4\u4ED8CRM\u7CFB\u7EDF";
  applyNotesStyle(ws.getCell(`B${row}`));
}
async function createCityFinanceSheet(workbook, orders2) {
  const ws = workbook.addWorksheet("\u57CE\u5E02\u8D22\u52A1\u7EDF\u8BA1");
  ws.views = [{ showGridLines: false }];
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 14;
  ws.getColumn(8).width = 14;
  ws.getColumn(9).width = 14;
  ws.getColumn(10).width = 14;
  ws.getColumn(11).width = 10;
  let row = 2;
  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "\u57CE\u5E02\u8D22\u52A1\u7EDF\u8BA1";
  row += 2;
  const cityStats = calculateCityStats(orders2);
  const headers = ["\u57CE\u5E02", "\u8BA2\u5355\u6570", "\u9500\u552E\u989D", "\u8001\u5E08\u8D39\u7528", "\u8F66\u8D39", "\u5408\u4F19\u4EBA\u8D39", "\u5176\u4ED6\u8D39\u7528", "\u603B\u6210\u672C", "\u51C0\u5229\u6DA6", "\u5229\u6DA6\u7387"];
  applyTableHeaderStyle(ws.getRow(row), 2, 11);
  headers.forEach((header, idx) => {
    ws.getCell(row, idx + 2).value = header;
  });
  row += 1;
  const sortedCities = Array.from(cityStats.entries()).sort((a, b) => b[1].totalSales - a[1].totalSales);
  sortedCities.forEach(([city, stats], idx) => {
    const currentRow = ws.getRow(row);
    applyDataRowStyle(currentRow, 2, 11, idx === sortedCities.length - 1, idx);
    ws.getCell(`B${row}`).value = city;
    ws.getCell(`B${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    ws.getCell(`C${row}`).value = stats.orderCount;
    ws.getCell(`C${row}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(`D${row}`).value = stats.totalSales;
    ws.getCell(`D${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`D${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`E${row}`).value = stats.teacherFee;
    ws.getCell(`E${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`E${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`F${row}`).value = stats.transportFee;
    ws.getCell(`F${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`F${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`G${row}`).value = stats.partnerFee;
    ws.getCell(`G${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`G${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`H${row}`).value = stats.otherCost;
    ws.getCell(`H${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`H${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`I${row}`).value = stats.totalCost;
    ws.getCell(`I${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`I${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`J${row}`).value = stats.netProfit;
    ws.getCell(`J${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`J${row}`).alignment = { horizontal: "right", vertical: "middle" };
    if (stats.netProfit < 0) {
      ws.getCell(`J${row}`).font = { color: { argb: `FF${THEME.negative}` } };
    }
    ws.getCell(`K${row}`).value = stats.profitRate;
    ws.getCell(`K${row}`).numFmt = "0.0%";
    ws.getCell(`K${row}`).alignment = { horizontal: "center", vertical: "middle" };
    if (stats.profitRate < 0) {
      ws.getCell(`K${row}`).font = { color: { argb: `FF${THEME.negative}` } };
    } else if (stats.profitRate > 0.3) {
      ws.getCell(`K${row}`).font = { color: { argb: `FF${THEME.positive}` } };
    }
    row += 1;
  });
  row += 1;
  const totalStats = calculateOverviewStats(orders2);
  ws.getCell(`B${row}`).value = "\u5408\u8BA1";
  ws.getCell(`B${row}`).font = { bold: true };
  ws.getCell(`C${row}`).value = totalStats.orderCount;
  ws.getCell(`C${row}`).font = { bold: true };
  ws.getCell(`D${row}`).value = totalStats.totalSales;
  ws.getCell(`D${row}`).numFmt = "\xA5#,##0.00";
  ws.getCell(`D${row}`).font = { bold: true };
  ws.getCell(`J${row}`).value = totalStats.netProfit;
  ws.getCell(`J${row}`).numFmt = "\xA5#,##0.00";
  ws.getCell(`J${row}`).font = { bold: true };
  ws.getCell(`K${row}`).value = totalStats.profitRate;
  ws.getCell(`K${row}`).numFmt = "0.0%";
  ws.getCell(`K${row}`).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];
}
async function createSalesPerformanceSheet(workbook, orders2) {
  const ws = workbook.addWorksheet("\u9500\u552E\u4E1A\u7EE9");
  ws.views = [{ showGridLines: false }];
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 15;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 12;
  let row = 2;
  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "\u9500\u552E\u4E1A\u7EE9\u7EDF\u8BA1";
  row += 2;
  const salesStats = calculateSalesStats(orders2);
  const headers = ["\u9500\u552E\u4EBA\u5458", "\u8BA2\u5355\u6570", "\u9500\u552E\u989D", "\u5E73\u5747\u5355\u4EF7", "\u5360\u6BD4"];
  applyTableHeaderStyle(ws.getRow(row), 2, 6);
  headers.forEach((header, idx) => {
    ws.getCell(row, idx + 2).value = header;
  });
  row += 1;
  const totalSales = Array.from(salesStats.values()).reduce((sum, s) => sum + s.totalSales, 0);
  const sortedSales = Array.from(salesStats.entries()).sort((a, b) => b[1].totalSales - a[1].totalSales);
  sortedSales.forEach(([salesperson, stats], idx) => {
    const currentRow = ws.getRow(row);
    applyDataRowStyle(currentRow, 2, 6, idx === sortedSales.length - 1, idx);
    ws.getCell(`B${row}`).value = salesperson || "\u672A\u5206\u914D";
    ws.getCell(`B${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    ws.getCell(`C${row}`).value = stats.orderCount;
    ws.getCell(`C${row}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(`D${row}`).value = stats.totalSales;
    ws.getCell(`D${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`D${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`E${row}`).value = stats.avgPrice;
    ws.getCell(`E${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`E${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`F${row}`).value = totalSales > 0 ? stats.totalSales / totalSales : 0;
    ws.getCell(`F${row}`).numFmt = "0.0%";
    ws.getCell(`F${row}`).alignment = { horizontal: "center", vertical: "middle" };
    row += 1;
  });
  ws.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];
}
async function createTeacherSettlementSheet(workbook, orders2) {
  const ws = workbook.addWorksheet("\u8001\u5E08\u7ED3\u7B97");
  ws.views = [{ showGridLines: false }];
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 15;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 14;
  let row = 2;
  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "\u8001\u5E08\u7ED3\u7B97\u660E\u7EC6";
  row += 2;
  const teacherStats = calculateTeacherStats(orders2);
  const headers = ["\u8001\u5E08\u59D3\u540D", "\u8BFE\u65F6\u6570", "\u8BFE\u65F6\u8D39", "\u8F66\u8D39", "\u5E94\u7ED3\u7B97"];
  applyTableHeaderStyle(ws.getRow(row), 2, 6);
  headers.forEach((header, idx) => {
    ws.getCell(row, idx + 2).value = header;
  });
  row += 1;
  const sortedTeachers = Array.from(teacherStats.entries()).sort((a, b) => b[1].totalFee - a[1].totalFee);
  sortedTeachers.forEach(([teacher, stats], idx) => {
    const currentRow = ws.getRow(row);
    applyDataRowStyle(currentRow, 2, 6, idx === sortedTeachers.length - 1, idx);
    ws.getCell(`B${row}`).value = teacher || "\u672A\u5206\u914D";
    ws.getCell(`B${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    ws.getCell(`C${row}`).value = stats.classCount;
    ws.getCell(`C${row}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(`D${row}`).value = stats.teacherFee;
    ws.getCell(`D${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`D${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`E${row}`).value = stats.transportFee;
    ws.getCell(`E${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`E${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`F${row}`).value = stats.totalFee;
    ws.getCell(`F${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`F${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`F${row}`).font = { bold: true };
    row += 1;
  });
  row += 1;
  const totalTeacherFee = Array.from(teacherStats.values()).reduce((sum, s) => sum + s.teacherFee, 0);
  const totalTransportFee = Array.from(teacherStats.values()).reduce((sum, s) => sum + s.transportFee, 0);
  const totalFee = Array.from(teacherStats.values()).reduce((sum, s) => sum + s.totalFee, 0);
  ws.getCell(`B${row}`).value = "\u5408\u8BA1";
  ws.getCell(`B${row}`).font = { bold: true };
  ws.getCell(`D${row}`).value = totalTeacherFee;
  ws.getCell(`D${row}`).numFmt = "\xA5#,##0.00";
  ws.getCell(`D${row}`).font = { bold: true };
  ws.getCell(`E${row}`).value = totalTransportFee;
  ws.getCell(`E${row}`).numFmt = "\xA5#,##0.00";
  ws.getCell(`E${row}`).font = { bold: true };
  ws.getCell(`F${row}`).value = totalFee;
  ws.getCell(`F${row}`).numFmt = "\xA5#,##0.00";
  ws.getCell(`F${row}`).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];
}
async function createDetailSheet(workbook, orders2) {
  const ws = workbook.addWorksheet("\u6536\u652F\u660E\u7EC6");
  ws.views = [{ showGridLines: false }];
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 15;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 14;
  ws.getColumn(8).width = 12;
  ws.getColumn(9).width = 14;
  let row = 2;
  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "\u6536\u652F\u660E\u7EC6";
  row += 2;
  const headers = ["\u65E5\u671F", "\u8BA2\u5355\u53F7", "\u57CE\u5E02", "\u5BA2\u6237", "\u6536\u5165", "\u8001\u5E08\u8D39", "\u8F66\u8D39", "\u5229\u6DA6"];
  applyTableHeaderStyle(ws.getRow(row), 2, 9);
  headers.forEach((header, idx) => {
    ws.getCell(row, idx + 2).value = header;
  });
  row += 1;
  const sortedOrders = [...orders2].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  sortedOrders.forEach((order, idx) => {
    const currentRow = ws.getRow(row);
    applyDataRowStyle(currentRow, 2, 9, idx === sortedOrders.length - 1, idx);
    const income = parseFloat(order.paymentAmount || "0");
    const teacherFee = parseFloat(order.teacherFee || "0");
    const transportFee = parseFloat(order.transportFee || "0");
    const profit = income - teacherFee - transportFee;
    ws.getCell(`B${row}`).value = new Date(order.createdAt).toLocaleDateString("zh-CN");
    ws.getCell(`B${row}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(`C${row}`).value = order.orderNo || "-";
    ws.getCell(`C${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    ws.getCell(`D${row}`).value = order.deliveryCity || order.paymentCity || "-";
    ws.getCell(`D${row}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(`E${row}`).value = order.customerName || "-";
    ws.getCell(`E${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    ws.getCell(`F${row}`).value = income;
    ws.getCell(`F${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`F${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`G${row}`).value = teacherFee;
    ws.getCell(`G${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`G${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`H${row}`).value = transportFee;
    ws.getCell(`H${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`H${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`I${row}`).value = profit;
    ws.getCell(`I${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`I${row}`).alignment = { horizontal: "right", vertical: "middle" };
    if (profit < 0) {
      ws.getCell(`I${row}`).font = { color: { argb: `FF${THEME.negative}` } };
    }
    row += 1;
  });
  ws.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];
  ws.autoFilter = {
    from: { row: 4, column: 2 },
    to: { row: row - 1, column: 9 }
  };
}
async function createCityOverviewSheet(workbook, orders2, options) {
  const ws = workbook.addWorksheet("\u6982\u89C8");
  ws.views = [{ showGridLines: false }];
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 20;
  let row = 2;
  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "\u57CE\u5E02\u4E1A\u7EE9\u62A5\u8868";
  row += 1;
  const dateRange = getDateRangeText(options.startDate, options.endDate);
  applyNotesStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = `\u62A5\u8868\u5468\u671F: ${dateRange}`;
  row += 2;
  const cityStats = calculateCityStats(orders2);
  const topCities = Array.from(cityStats.entries()).sort((a, b) => b[1].totalSales - a[1].totalSales).slice(0, 5);
  applySectionHeaderStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "TOP 5 \u57CE\u5E02";
  row += 1;
  topCities.forEach(([city, stats], idx) => {
    ws.getCell(`B${row}`).value = `${idx + 1}. ${city}`;
    ws.getCell(`C${row}`).value = stats.totalSales;
    ws.getCell(`C${row}`).numFmt = "\xA5#,##0.00";
    row += 1;
  });
}
async function createCityTrendSheet(workbook, orders2) {
  const ws = workbook.addWorksheet("\u6708\u5EA6\u8D8B\u52BF");
  ws.views = [{ showGridLines: false }];
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 12;
  let row = 2;
  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "\u57CE\u5E02\u6708\u5EA6\u8D8B\u52BF";
  row += 2;
  const monthlyStats = calculateMonthlyStats(orders2);
  const months = Array.from(monthlyStats.keys()).sort();
  months.forEach((_, idx) => {
    ws.getColumn(idx + 3).width = 12;
  });
  applyTableHeaderStyle(ws.getRow(row), 2, months.length + 2);
  ws.getCell(`B${row}`).value = "\u57CE\u5E02";
  months.forEach((month, idx) => {
    ws.getCell(row, idx + 3).value = month;
  });
  row += 1;
  const allCities = /* @__PURE__ */ new Set();
  orders2.forEach((order) => {
    const city = order.deliveryCity || order.paymentCity;
    if (city) allCities.add(city);
  });
  const sortedCities = Array.from(allCities).sort();
  sortedCities.forEach((city, idx) => {
    const currentRow = ws.getRow(row);
    applyDataRowStyle(currentRow, 2, months.length + 2, idx === sortedCities.length - 1, idx);
    ws.getCell(`B${row}`).value = city;
    ws.getCell(`B${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    months.forEach((month, monthIdx) => {
      const monthData = monthlyStats.get(month);
      const cityData = monthData?.cities.get(city);
      ws.getCell(row, monthIdx + 3).value = cityData?.totalSales || 0;
      ws.getCell(row, monthIdx + 3).numFmt = "\xA5#,##0";
      ws.getCell(row, monthIdx + 3).alignment = { horizontal: "right", vertical: "middle" };
    });
    row += 1;
  });
}
async function createTeacherOverviewSheet(workbook, orders2, options) {
  const ws = workbook.addWorksheet("\u6982\u89C8");
  ws.views = [{ showGridLines: false }];
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 20;
  let row = 2;
  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "\u8001\u5E08\u7ED3\u7B97\u62A5\u8868";
  row += 1;
  const dateRange = getDateRangeText(options.startDate, options.endDate);
  applyNotesStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = `\u62A5\u8868\u5468\u671F: ${dateRange}`;
  row += 2;
  const teacherStats = calculateTeacherStats(orders2);
  const totalFee = Array.from(teacherStats.values()).reduce((sum, s) => sum + s.totalFee, 0);
  const totalClasses = Array.from(teacherStats.values()).reduce((sum, s) => sum + s.classCount, 0);
  applySectionHeaderStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "\u6C47\u603B\u4FE1\u606F";
  row += 1;
  ws.getCell(`B${row}`).value = "\u8001\u5E08\u603B\u6570";
  ws.getCell(`C${row}`).value = teacherStats.size;
  row += 1;
  ws.getCell(`B${row}`).value = "\u603B\u8BFE\u65F6\u6570";
  ws.getCell(`C${row}`).value = totalClasses;
  row += 1;
  ws.getCell(`B${row}`).value = "\u5E94\u7ED3\u7B97\u603B\u989D";
  ws.getCell(`C${row}`).value = totalFee;
  ws.getCell(`C${row}`).numFmt = "\xA5#,##0.00";
}
async function createTeacherDetailSheet(workbook, orders2) {
  const ws = workbook.addWorksheet("\u8BFE\u65F6\u660E\u7EC6");
  ws.views = [{ showGridLines: false }];
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 15;
  ws.getColumn(4).width = 15;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 12;
  let row = 2;
  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "\u8BFE\u65F6\u660E\u7EC6";
  row += 2;
  const headers = ["\u65E5\u671F", "\u8001\u5E08", "\u5BA2\u6237", "\u57CE\u5E02", "\u8BFE\u65F6\u8D39", "\u8F66\u8D39"];
  applyTableHeaderStyle(ws.getRow(row), 2, 7);
  headers.forEach((header, idx) => {
    ws.getCell(row, idx + 2).value = header;
  });
  row += 1;
  const sortedOrders = [...orders2].filter((o) => o.deliveryTeacher).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  sortedOrders.forEach((order, idx) => {
    const currentRow = ws.getRow(row);
    applyDataRowStyle(currentRow, 2, 7, idx === sortedOrders.length - 1, idx);
    ws.getCell(`B${row}`).value = new Date(order.createdAt).toLocaleDateString("zh-CN");
    ws.getCell(`B${row}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(`C${row}`).value = order.deliveryTeacher || "-";
    ws.getCell(`C${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    ws.getCell(`D${row}`).value = order.customerName || "-";
    ws.getCell(`D${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    ws.getCell(`E${row}`).value = order.deliveryCity || "-";
    ws.getCell(`E${row}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(`F${row}`).value = parseFloat(order.teacherFee || "0");
    ws.getCell(`F${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`F${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`G${row}`).value = parseFloat(order.transportFee || "0");
    ws.getCell(`G${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`G${row}`).alignment = { horizontal: "right", vertical: "middle" };
    row += 1;
  });
  ws.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];
}
async function createOrderExportSheet(workbook, orders2, options) {
  const ws = workbook.addWorksheet("\u8BA2\u5355\u6570\u636E");
  ws.views = [{ showGridLines: false }];
  const columns = [
    { key: "orderNo", header: "\u8BA2\u5355\u53F7", width: 20 },
    { key: "channelOrderNo", header: "\u6E20\u9053\u8BA2\u5355\u53F7", width: 25 },
    { key: "createdAt", header: "\u521B\u5EFA\u65E5\u671F", width: 12 },
    { key: "customerName", header: "\u5BA2\u6237\u59D3\u540D", width: 15 },
    { key: "salesperson", header: "\u9500\u552E\u4EBA\u5458", width: 12 },
    { key: "deliveryCity", header: "\u4EA4\u4ED8\u57CE\u5E02", width: 12 },
    { key: "deliveryTeacher", header: "\u4EA4\u4ED8\u8001\u5E08", width: 12 },
    { key: "courseName", header: "\u8BFE\u7A0B\u540D\u79F0", width: 20 },
    { key: "paymentAmount", header: "\u6536\u6B3E\u91D1\u989D", width: 14 },
    { key: "teacherFee", header: "\u8001\u5E08\u8D39\u7528", width: 14 },
    { key: "transportFee", header: "\u8F66\u8D39", width: 12 },
    { key: "paymentChannel", header: "\u652F\u4ED8\u6E20\u9053", width: 12 },
    { key: "trafficSource", header: "\u6D41\u91CF\u6765\u6E90", width: 15 },
    { key: "notes", header: "\u5907\u6CE8", width: 30 }
  ];
  ws.getColumn(1).width = 3;
  columns.forEach((col, idx) => {
    ws.getColumn(idx + 2).width = col.width;
  });
  let row = 2;
  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "\u8BA2\u5355\u6570\u636E\u5BFC\u51FA";
  row += 1;
  const dateRange = getDateRangeText(options.startDate, options.endDate);
  applyNotesStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = `\u5BFC\u51FA\u65F6\u95F4: ${(/* @__PURE__ */ new Date()).toLocaleString("zh-CN")} | \u6570\u636E\u8303\u56F4: ${dateRange} | \u5171 ${orders2.length} \u6761\u8BB0\u5F55`;
  row += 2;
  applyTableHeaderStyle(ws.getRow(row), 2, columns.length + 1);
  columns.forEach((col, idx) => {
    ws.getCell(row, idx + 2).value = col.header;
  });
  row += 1;
  const sortedOrders = [...orders2].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  sortedOrders.forEach((order, idx) => {
    const currentRow = ws.getRow(row);
    applyDataRowStyle(currentRow, 2, columns.length + 1, idx === sortedOrders.length - 1, idx);
    ws.getCell(`B${row}`).value = order.orderNo || "-";
    ws.getCell(`C${row}`).value = order.channelOrderNo || "-";
    ws.getCell(`D${row}`).value = new Date(order.createdAt).toLocaleDateString("zh-CN");
    ws.getCell(`E${row}`).value = order.customerName || "-";
    ws.getCell(`F${row}`).value = order.salesperson || "-";
    ws.getCell(`G${row}`).value = order.deliveryCity || order.paymentCity || "-";
    ws.getCell(`H${row}`).value = order.deliveryTeacher || "-";
    ws.getCell(`I${row}`).value = order.courseName || "-";
    ws.getCell(`J${row}`).value = parseFloat(order.paymentAmount || "0");
    ws.getCell(`J${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`J${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`K${row}`).value = parseFloat(order.teacherFee || "0");
    ws.getCell(`K${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`K${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`L${row}`).value = parseFloat(order.transportFee || "0");
    ws.getCell(`L${row}`).numFmt = "\xA5#,##0.00";
    ws.getCell(`L${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`M${row}`).value = order.paymentChannel || "-";
    ws.getCell(`N${row}`).value = order.trafficSource || "-";
    ws.getCell(`O${row}`).value = order.notes || "-";
    row += 1;
  });
  ws.views = [{ state: "frozen", ySplit: 5, showGridLines: false }];
  ws.autoFilter = {
    from: { row: 5, column: 2 },
    to: { row: row - 1, column: columns.length + 1 }
  };
}
function filterOrdersByDate(orders2, startDate, endDate) {
  if (!startDate && !endDate) return orders2;
  return orders2.filter((order) => {
    const orderDate = new Date(order.createdAt);
    if (startDate && orderDate < new Date(startDate)) return false;
    if (endDate && orderDate > new Date(endDate)) return false;
    return true;
  });
}
function getDateRangeText(startDate, endDate) {
  if (!startDate && !endDate) return "\u5168\u90E8\u6570\u636E";
  if (startDate && endDate) return `${startDate} \u81F3 ${endDate}`;
  if (startDate) return `${startDate} \u8D77`;
  return `\u81F3 ${endDate}`;
}
function generateFilename(prefix, options) {
  const date2 = (/* @__PURE__ */ new Date()).toLocaleDateString("zh-CN").replace(/\//g, "-");
  return `${prefix}_${date2}.xlsx`;
}
function calculateOverviewStats(orders2) {
  let totalSales = 0;
  let teacherFee = 0;
  let transportFee = 0;
  let partnerFee = 0;
  let otherCost = 0;
  orders2.forEach((order) => {
    totalSales += parseFloat(order.paymentAmount || "0");
    teacherFee += parseFloat(order.teacherFee || "0");
    transportFee += parseFloat(order.transportFee || "0");
    partnerFee += parseFloat(order.partnerFee || "0");
    otherCost += parseFloat(order.consumablesFee || "0") + parseFloat(order.rentFee || "0") + parseFloat(order.propertyFee || "0") + parseFloat(order.utilityFee || "0") + parseFloat(order.otherFee || "0");
  });
  const totalCost = teacherFee + transportFee + partnerFee + otherCost;
  const netProfit = totalSales - totalCost;
  const profitRate = totalSales > 0 ? netProfit / totalSales : 0;
  return {
    orderCount: orders2.length,
    totalSales,
    teacherFee,
    transportFee,
    partnerFee,
    otherCost,
    totalCost,
    netProfit,
    profitRate
  };
}
function calculateCityStats(orders2) {
  const cityStats = /* @__PURE__ */ new Map();
  orders2.forEach((order) => {
    const city = order.deliveryCity || order.paymentCity || "\u672A\u77E5\u57CE\u5E02";
    const stats = cityStats.get(city) || {
      orderCount: 0,
      totalSales: 0,
      teacherFee: 0,
      transportFee: 0,
      partnerFee: 0,
      otherCost: 0,
      totalCost: 0,
      netProfit: 0,
      profitRate: 0
    };
    stats.orderCount += 1;
    stats.totalSales += parseFloat(order.paymentAmount || "0");
    stats.teacherFee += parseFloat(order.teacherFee || "0");
    stats.transportFee += parseFloat(order.transportFee || "0");
    stats.partnerFee += parseFloat(order.partnerFee || "0");
    stats.otherCost += parseFloat(order.consumablesFee || "0") + parseFloat(order.rentFee || "0") + parseFloat(order.propertyFee || "0") + parseFloat(order.utilityFee || "0") + parseFloat(order.otherFee || "0");
    stats.totalCost = stats.teacherFee + stats.transportFee + stats.partnerFee + stats.otherCost;
    stats.netProfit = stats.totalSales - stats.totalCost;
    stats.profitRate = stats.totalSales > 0 ? stats.netProfit / stats.totalSales : 0;
    cityStats.set(city, stats);
  });
  return cityStats;
}
function calculateSalesStats(orders2) {
  const salesStats = /* @__PURE__ */ new Map();
  orders2.forEach((order) => {
    const salesperson = order.salesperson || "\u672A\u5206\u914D";
    const stats = salesStats.get(salesperson) || {
      orderCount: 0,
      totalSales: 0,
      avgPrice: 0
    };
    stats.orderCount += 1;
    stats.totalSales += parseFloat(order.paymentAmount || "0");
    stats.avgPrice = stats.totalSales / stats.orderCount;
    salesStats.set(salesperson, stats);
  });
  return salesStats;
}
function calculateTeacherStats(orders2) {
  const teacherStats = /* @__PURE__ */ new Map();
  orders2.forEach((order) => {
    const teacher = order.deliveryTeacher;
    if (!teacher) return;
    const stats = teacherStats.get(teacher) || {
      classCount: 0,
      teacherFee: 0,
      transportFee: 0,
      totalFee: 0
    };
    stats.classCount += 1;
    stats.teacherFee += parseFloat(order.teacherFee || "0");
    stats.transportFee += parseFloat(order.transportFee || "0");
    stats.totalFee = stats.teacherFee + stats.transportFee;
    teacherStats.set(teacher, stats);
  });
  return teacherStats;
}
function calculateMonthlyStats(orders2) {
  const monthlyStats = /* @__PURE__ */ new Map();
  orders2.forEach((order) => {
    const date2 = new Date(order.createdAt);
    const month = `${date2.getFullYear()}-${String(date2.getMonth() + 1).padStart(2, "0")}`;
    const city = order.deliveryCity || order.paymentCity || "\u672A\u77E5\u57CE\u5E02";
    const monthData = monthlyStats.get(month) || {
      totalSales: 0,
      orderCount: 0,
      cities: /* @__PURE__ */ new Map()
    };
    monthData.totalSales += parseFloat(order.paymentAmount || "0");
    monthData.orderCount += 1;
    const cityData = monthData.cities.get(city) || { totalSales: 0, orderCount: 0 };
    cityData.totalSales += parseFloat(order.paymentAmount || "0");
    cityData.orderCount += 1;
    monthData.cities.set(city, cityData);
    monthlyStats.set(month, monthData);
  });
  return monthlyStats;
}
function generateInsights(stats, orders2) {
  const insights = [];
  if (stats.profitRate > 0.3) {
    insights.push(`\u5229\u6DA6\u7387\u8FBE\u5230 ${(stats.profitRate * 100).toFixed(1)}%,\u8868\u73B0\u4F18\u79C0`);
  } else if (stats.profitRate < 0.1) {
    insights.push(`\u5229\u6DA6\u7387\u4EC5 ${(stats.profitRate * 100).toFixed(1)}%,\u5EFA\u8BAE\u4F18\u5316\u6210\u672C\u7ED3\u6784`);
  }
  const teacherFeeRate = stats.teacherFee / stats.totalSales;
  if (teacherFeeRate > 0.4) {
    insights.push(`\u8001\u5E08\u8D39\u7528\u5360\u6BD4 ${(teacherFeeRate * 100).toFixed(1)}%,\u662F\u4E3B\u8981\u6210\u672C\u9879`);
  }
  insights.push(`\u5171\u5904\u7406 ${stats.orderCount} \u7B14\u8BA2\u5355,\u603B\u9500\u552E\u989D \xA5${stats.totalSales.toFixed(2)}`);
  const avgOrderAmount = stats.totalSales / stats.orderCount;
  insights.push(`\u5E73\u5747\u8BA2\u5355\u91D1\u989D \xA5${avgOrderAmount.toFixed(2)}`);
  return insights;
}

// server/excelReportRouter.ts
var financeOrAdminProcedure2 = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "finance") {
    throw new TRPCError12({ code: "FORBIDDEN", message: "\u9700\u8981\u8D22\u52A1\u6216\u7BA1\u7406\u5458\u6743\u9650" });
  }
  return next({ ctx });
});
var excelReportRouter = router({
  /**
   * 导出综合财务报表
   * 包含:概览、城市统计、销售业绩、老师结算、收支明细
   */
  exportFinancialReport: financeOrAdminProcedure2.input(
    z16.object({
      startDate: z16.string().optional(),
      endDate: z16.string().optional()
    })
  ).mutation(async ({ input }) => {
    try {
      const result = await generateFinancialReport({
        startDate: input.startDate,
        endDate: input.endDate
      });
      return {
        success: true,
        data: result.buffer.toString("base64"),
        filename: result.filename
      };
    } catch (error) {
      console.error("\u5BFC\u51FA\u8D22\u52A1\u62A5\u8868\u5931\u8D25:", error);
      throw new TRPCError12({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u5BFC\u51FA\u8D22\u52A1\u62A5\u8868\u5931\u8D25"
      });
    }
  }),
  /**
   * 导出城市业绩报表
   * 包含:概览、城市统计、月度趋势
   */
  exportCityReport: financeOrAdminProcedure2.input(
    z16.object({
      startDate: z16.string().optional(),
      endDate: z16.string().optional()
    })
  ).mutation(async ({ input }) => {
    try {
      const result = await generateCityReport({
        startDate: input.startDate,
        endDate: input.endDate
      });
      return {
        success: true,
        data: result.buffer.toString("base64"),
        filename: result.filename
      };
    } catch (error) {
      console.error("\u5BFC\u51FA\u57CE\u5E02\u62A5\u8868\u5931\u8D25:", error);
      throw new TRPCError12({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u5BFC\u51FA\u57CE\u5E02\u62A5\u8868\u5931\u8D25"
      });
    }
  }),
  /**
   * 导出老师结算报表
   * 包含:概览、结算明细、课时明细
   */
  exportTeacherSettlementReport: financeOrAdminProcedure2.input(
    z16.object({
      startDate: z16.string().optional(),
      endDate: z16.string().optional()
    })
  ).mutation(async ({ input }) => {
    try {
      const result = await generateTeacherSettlementReport({
        startDate: input.startDate,
        endDate: input.endDate
      });
      return {
        success: true,
        data: result.buffer.toString("base64"),
        filename: result.filename
      };
    } catch (error) {
      console.error("\u5BFC\u51FA\u8001\u5E08\u7ED3\u7B97\u62A5\u8868\u5931\u8D25:", error);
      throw new TRPCError12({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u5BFC\u51FA\u8001\u5E08\u7ED3\u7B97\u62A5\u8868\u5931\u8D25"
      });
    }
  }),
  /**
   * 导出订单数据
   * 完整的订单数据导出,支持筛选
   */
  exportOrderData: protectedProcedure.input(
    z16.object({
      startDate: z16.string().optional(),
      endDate: z16.string().optional()
    })
  ).mutation(async ({ input }) => {
    try {
      const result = await generateOrderExportReport({
        startDate: input.startDate,
        endDate: input.endDate
      });
      return {
        success: true,
        data: result.buffer.toString("base64"),
        filename: result.filename
      };
    } catch (error) {
      console.error("\u5BFC\u51FA\u8BA2\u5355\u6570\u636E\u5931\u8D25:", error);
      throw new TRPCError12({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u5BFC\u51FA\u8BA2\u5355\u6570\u636E\u5931\u8D25"
      });
    }
  }),
  /**
   * 获取可用的报表类型列表
   */
  getAvailableReports: protectedProcedure.query(async ({ ctx }) => {
    const isFinanceOrAdmin = ctx.user.role === "admin" || ctx.user.role === "finance";
    const reports = [
      {
        id: "order",
        name: "\u8BA2\u5355\u6570\u636E\u5BFC\u51FA",
        description: "\u5BFC\u51FA\u5B8C\u6574\u7684\u8BA2\u5355\u6570\u636E,\u652F\u6301\u6309\u65E5\u671F\u7B5B\u9009",
        icon: "FileSpreadsheet",
        available: true
      }
    ];
    if (isFinanceOrAdmin) {
      reports.unshift(
        {
          id: "financial",
          name: "\u7EFC\u5408\u8D22\u52A1\u62A5\u8868",
          description: "\u5305\u542B\u6982\u89C8\u3001\u57CE\u5E02\u7EDF\u8BA1\u3001\u9500\u552E\u4E1A\u7EE9\u3001\u8001\u5E08\u7ED3\u7B97\u7B49\u591A\u4E2A\u7EF4\u5EA6",
          icon: "BarChart3",
          available: true
        },
        {
          id: "city",
          name: "\u57CE\u5E02\u4E1A\u7EE9\u62A5\u8868",
          description: "\u57CE\u5E02\u7EF4\u5EA6\u7684\u4E1A\u7EE9\u5206\u6790\u548C\u6708\u5EA6\u8D8B\u52BF",
          icon: "Building2",
          available: true
        },
        {
          id: "teacher",
          name: "\u8001\u5E08\u7ED3\u7B97\u62A5\u8868",
          description: "\u8001\u5E08\u8BFE\u65F6\u8D39\u548C\u8F66\u8D39\u7684\u7ED3\u7B97\u660E\u7EC6",
          icon: "Users",
          available: true
        }
      );
    }
    return reports;
  })
});

// server/notificationRouter.ts
init_trpc();
init_db();
import { z as z17 } from "zod";
import { TRPCError as TRPCError13 } from "@trpc/server";
var notificationRouter = router({
  /** App用户提交留言/申请通知 */
  submit: publicProcedure.input(z17.object({
    userId: z17.number(),
    userName: z17.string().optional(),
    userPhone: z17.string().optional(),
    type: z17.enum(["general", "complaint", "suggestion", "consultation", "application"]).optional().default("general"),
    title: z17.string().max(200).optional(),
    content: z17.string().min(1, "\u7559\u8A00\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A").max(5e3)
  })).mutation(async ({ input }) => {
    try {
      const result = await createUserNotification({
        userId: input.userId,
        userName: input.userName,
        userPhone: input.userPhone,
        type: input.type,
        title: input.title,
        content: input.content
      });
      return { success: true, id: result.id };
    } catch (error) {
      console.error("\u63D0\u4EA4\u7559\u8A00\u5931\u8D25:", error);
      throw new TRPCError13({ code: "INTERNAL_SERVER_ERROR", message: "\u63D0\u4EA4\u7559\u8A00\u5931\u8D25" });
    }
  }),
  /** App用户查询自己的留言列表 */
  myList: publicProcedure.input(z17.object({
    userId: z17.number(),
    page: z17.number().min(1).optional().default(1),
    pageSize: z17.number().min(1).max(50).optional().default(20)
  })).query(async ({ input }) => {
    try {
      return await listMyNotifications(input.userId, {
        page: input.page,
        pageSize: input.pageSize
      });
    } catch (error) {
      console.error("\u67E5\u8BE2\u7559\u8A00\u5217\u8868\u5931\u8D25:", error);
      throw new TRPCError13({ code: "INTERNAL_SERVER_ERROR", message: "\u67E5\u8BE2\u7559\u8A00\u5217\u8868\u5931\u8D25" });
    }
  }),
  /** 管理员查询所有通知列表 */
  list: protectedProcedure.input(z17.object({
    status: z17.enum(["unread", "read", "replied", "archived"]).optional(),
    type: z17.enum(["general", "complaint", "suggestion", "consultation", "application"]).optional(),
    userId: z17.number().optional(),
    page: z17.number().min(1).optional().default(1),
    pageSize: z17.number().min(1).max(50).optional().default(20)
  })).query(async ({ input }) => {
    try {
      return await listUserNotifications({
        status: input.status,
        type: input.type,
        userId: input.userId,
        page: input.page,
        pageSize: input.pageSize
      });
    } catch (error) {
      console.error("\u67E5\u8BE2\u901A\u77E5\u5217\u8868\u5931\u8D25:", error);
      throw new TRPCError13({ code: "INTERNAL_SERVER_ERROR", message: "\u67E5\u8BE2\u901A\u77E5\u5217\u8868\u5931\u8D25" });
    }
  }),
  /** 管理员获取单条通知详情 */
  detail: protectedProcedure.input(z17.object({ id: z17.number() })).query(async ({ input }) => {
    const notification = await getUserNotificationById(input.id);
    if (!notification) {
      throw new TRPCError13({ code: "NOT_FOUND", message: "\u901A\u77E5\u4E0D\u5B58\u5728" });
    }
    return notification;
  }),
  /** 管理员标记通知为已读 */
  markRead: protectedProcedure.input(z17.object({ id: z17.number() })).mutation(async ({ input }) => {
    await markNotificationRead(input.id);
    return { success: true };
  }),
  /** 管理员批量标记通知为已读 */
  batchMarkRead: protectedProcedure.input(z17.object({ ids: z17.array(z17.number()).min(1) })).mutation(async ({ input }) => {
    await batchMarkNotificationsRead(input.ids);
    return { success: true, count: input.ids.length };
  }),
  /** 管理员回复通知 */
  reply: protectedProcedure.input(z17.object({
    id: z17.number(),
    adminReply: z17.string().min(1, "\u56DE\u590D\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A").max(5e3)
  })).mutation(async ({ ctx, input }) => {
    const notification = await getUserNotificationById(input.id);
    if (!notification) {
      throw new TRPCError13({ code: "NOT_FOUND", message: "\u901A\u77E5\u4E0D\u5B58\u5728" });
    }
    await replyNotification(input.id, {
      adminReply: input.adminReply,
      repliedBy: ctx.user.id
    });
    return { success: true };
  }),
  /** 管理员归档通知 */
  archive: protectedProcedure.input(z17.object({ id: z17.number() })).mutation(async ({ input }) => {
    await archiveNotification(input.id);
    return { success: true };
  }),
  /** 管理员删除通知 */
  delete: protectedProcedure.input(z17.object({ id: z17.number() })).mutation(async ({ input }) => {
    await deleteUserNotification(input.id);
    return { success: true };
  }),
  /** 获取未读通知数量（管理员用，可用于导航角标） */
  unreadCount: protectedProcedure.query(async () => {
    const count2 = await getUnreadNotificationCount();
    return { count: count2 };
  })
});

// server/salesCityPerformanceRouter.ts
init_trpc();
init_db();
init_schema();
import { z as z18 } from "zod";
import { TRPCError as TRPCError14 } from "@trpc/server";
import { eq as eq12, and as and8, sql as sql3, ne as ne5, or as or4 } from "drizzle-orm";
var adminProcedure4 = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError14({ code: "FORBIDDEN", message: "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650" });
  }
  return next({ ctx });
});
function buildSalesPersonMapping(allSalespersons) {
  const mapping = /* @__PURE__ */ new Map();
  for (const sp of allSalespersons) {
    if (sp.name) {
      mapping.set(sp.name.toLowerCase(), { id: sp.id, name: sp.name, nickname: sp.nickname });
    }
    if (sp.nickname && sp.nickname !== sp.name) {
      mapping.set(sp.nickname.toLowerCase(), { id: sp.id, name: sp.name, nickname: sp.nickname });
    }
  }
  return mapping;
}
function mergeStatsBySalesperson(rawStats, salesPersonMapping) {
  const merged = /* @__PURE__ */ new Map();
  for (const row of rawStats) {
    const spText = (row.salesPerson || "").trim();
    const city = row.city || "\u672A\u77E5\u57CE\u5E02";
    let matchedSp = salesPersonMapping.get(spText.toLowerCase());
    if (!matchedSp && row.salespersonId) {
      const entries = Array.from(salesPersonMapping.entries());
      for (let i = 0; i < entries.length; i++) {
        if (entries[i][1].id === row.salespersonId) {
          matchedSp = entries[i][1];
          break;
        }
      }
    }
    const spId = matchedSp?.id ?? null;
    const spName = matchedSp?.name || spText || "\u672A\u77E5\u9500\u552E";
    const key = `${spId ?? spText}_${city}`;
    const existing = merged.get(key);
    if (existing) {
      existing.orderCount += Number(row.orderCount);
      existing.totalAmount += Number(row.totalAmount);
      existing.totalCourseAmount += Number(row.totalCourseAmount || 0);
    } else {
      merged.set(key, {
        salespersonId: spId,
        salesPerson: spName,
        city,
        orderCount: Number(row.orderCount),
        totalAmount: Number(row.totalAmount),
        totalCourseAmount: Number(row.totalCourseAmount || 0)
      });
    }
  }
  return Array.from(merged.values());
}
var salesCityPerformanceRouter = router({
  /**
   * 获取销售x城市交叉统计数据
   * 核心修复：通过salesPerson文本匹配salespersons表，合并同一销售的数据
   */
  getCrossStats: protectedProcedure.input(z18.object({
    startDate: z18.string().optional(),
    endDate: z18.string().optional(),
    salespersonId: z18.number().optional(),
    city: z18.string().optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u672A\u8FDE\u63A5" });
    const allSalespersons = await db.select({
      id: salespersons.id,
      name: users.name,
      nickname: users.nickname,
      isActive: salespersons.isActive
    }).from(salespersons).leftJoin(users, eq12(salespersons.userId, users.id));
    const salesPersonMapping = buildSalesPersonMapping(allSalespersons);
    const conditions = [
      ne5(orders.status, "cancelled"),
      eq12(orders.isVoided, false)
    ];
    if (input.startDate) conditions.push(sql3`${orders.paymentDate} >= ${input.startDate}`);
    if (input.endDate) conditions.push(sql3`${orders.paymentDate} <= ${input.endDate}`);
    if (input.city) conditions.push(eq12(orders.deliveryCity, input.city));
    if (input.salespersonId) {
      const targetSp = allSalespersons.find((sp) => sp.id === input.salespersonId);
      if (targetSp) {
        const spConditions = [eq12(orders.salespersonId, input.salespersonId)];
        if (targetSp.name) spConditions.push(eq12(orders.salesPerson, targetSp.name));
        if (targetSp.nickname && targetSp.nickname !== targetSp.name) {
          spConditions.push(eq12(orders.salesPerson, targetSp.nickname));
        }
        conditions.push(or4(...spConditions));
      } else {
        conditions.push(eq12(orders.salespersonId, input.salespersonId));
      }
    }
    const rawStats = await db.select({
      salespersonId: orders.salespersonId,
      salesPerson: orders.salesPerson,
      city: orders.deliveryCity,
      orderCount: sql3`COUNT(*)`.as("orderCount"),
      totalAmount: sql3`COALESCE(SUM(${orders.courseAmount}), 0)`.as("totalAmount"),
      totalCourseAmount: sql3`COALESCE(SUM(${orders.courseAmount}), 0)`.as("totalCourseAmount")
    }).from(orders).where(and8(...conditions)).groupBy(orders.salespersonId, orders.salesPerson, orders.deliveryCity);
    const mergedStats = mergeStatsBySalesperson(rawStats, salesPersonMapping);
    const commissionConfigs = await db.select().from(salesCommissionConfigs);
    const commissionMap = /* @__PURE__ */ new Map();
    for (const config of commissionConfigs) {
      commissionMap.set(`${config.salespersonId}_${config.city}`, Number(config.commissionRate));
    }
    const allCities = await db.select({ name: cities.name }).from(cities).where(eq12(cities.isActive, true));
    const orderCitiesSet = new Set(mergedStats.map((s) => s.city).filter(Boolean));
    const cityCityNames = allCities.map((c) => c.name);
    const allCityNamesSet = /* @__PURE__ */ new Set([...cityCityNames, ...Array.from(orderCitiesSet)]);
    const allCityNames = Array.from(allCityNamesSet).sort();
    const crossData = mergedStats.map((s) => {
      const spId = s.salespersonId;
      const city = s.city;
      const commissionRate = spId ? commissionMap.get(`${spId}_${city}`) ?? 0 : 0;
      const totalAmount = s.totalAmount;
      const commissionAmount = totalAmount * commissionRate / 100;
      return {
        salespersonId: spId,
        salesPerson: s.salesPerson,
        city,
        orderCount: s.orderCount,
        totalAmount,
        totalCourseAmount: s.totalCourseAmount,
        commissionRate,
        commissionAmount: Math.round(commissionAmount * 100) / 100
      };
    });
    return {
      data: crossData,
      salespersons: allSalespersons,
      cities: allCityNames,
      commissionConfigs: commissionConfigs.map((c) => ({
        ...c,
        commissionRate: Number(c.commissionRate)
      }))
    };
  }),
  /**
   * 获取环比/同比对比数据
   */
  getComparison: protectedProcedure.input(z18.object({
    currentStartDate: z18.string(),
    currentEndDate: z18.string(),
    previousStartDate: z18.string(),
    previousEndDate: z18.string(),
    salespersonId: z18.number().optional(),
    city: z18.string().optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u672A\u8FDE\u63A5" });
    const allSalespersons = await db.select({
      id: salespersons.id,
      name: users.name,
      nickname: users.nickname
    }).from(salespersons).leftJoin(users, eq12(salespersons.userId, users.id));
    const salesPersonMapping = buildSalesPersonMapping(allSalespersons);
    const baseConditions = [
      ne5(orders.status, "cancelled"),
      eq12(orders.isVoided, false)
    ];
    if (input.city) baseConditions.push(eq12(orders.deliveryCity, input.city));
    if (input.salespersonId) {
      const targetSp = allSalespersons.find((sp) => sp.id === input.salespersonId);
      if (targetSp) {
        const spConditions = [eq12(orders.salespersonId, input.salespersonId)];
        if (targetSp.name) spConditions.push(eq12(orders.salesPerson, targetSp.name));
        if (targetSp.nickname && targetSp.nickname !== targetSp.name) {
          spConditions.push(eq12(orders.salesPerson, targetSp.nickname));
        }
        baseConditions.push(or4(...spConditions));
      }
    }
    const fetchStats = async (startDate, endDate) => {
      const rawStats = await db.select({
        salespersonId: orders.salespersonId,
        salesPerson: orders.salesPerson,
        city: orders.deliveryCity,
        orderCount: sql3`COUNT(*)`.as("orderCount"),
        totalAmount: sql3`COALESCE(SUM(${orders.courseAmount}), 0)`.as("totalAmount"),
        totalCourseAmount: sql3`COALESCE(SUM(${orders.courseAmount}), 0)`.as("totalCourseAmount")
      }).from(orders).where(and8(
        ...baseConditions,
        sql3`${orders.paymentDate} >= ${startDate}`,
        sql3`${orders.paymentDate} <= ${endDate}`
      )).groupBy(orders.salespersonId, orders.salesPerson, orders.deliveryCity);
      return mergeStatsBySalesperson(rawStats, salesPersonMapping);
    };
    const currentStats = await fetchStats(input.currentStartDate, input.currentEndDate);
    const previousStats = await fetchStats(input.previousStartDate, input.previousEndDate);
    const prevMap = /* @__PURE__ */ new Map();
    for (const s of previousStats) {
      const key = `${s.salespersonId ?? s.salesPerson}_${s.city}`;
      prevMap.set(key, {
        orderCount: s.orderCount,
        totalAmount: s.totalAmount,
        salesPerson: s.salesPerson
      });
    }
    const comparisonData = currentStats.map((s) => {
      const key = `${s.salespersonId ?? s.salesPerson}_${s.city}`;
      const prev = prevMap.get(key);
      const currentAmount = s.totalAmount;
      const currentCount = s.orderCount;
      const prevAmount = prev?.totalAmount ?? 0;
      const prevCount = prev?.orderCount ?? 0;
      return {
        salespersonId: s.salespersonId,
        salesPerson: s.salesPerson,
        city: s.city,
        currentOrderCount: currentCount,
        currentAmount,
        previousOrderCount: prevCount,
        previousAmount: prevAmount,
        orderCountChange: prevCount > 0 ? Math.round((currentCount - prevCount) / prevCount * 1e4) / 100 : currentCount > 0 ? 100 : 0,
        amountChange: prevAmount > 0 ? Math.round((currentAmount - prevAmount) / prevAmount * 1e4) / 100 : currentAmount > 0 ? 100 : 0
      };
    });
    const prevEntries = Array.from(prevMap.entries());
    for (let i = 0; i < prevEntries.length; i++) {
      const [key, prev] = prevEntries[i];
      const exists = comparisonData.some((d) => `${d.salespersonId ?? d.salesPerson}_${d.city}` === key);
      if (!exists) {
        const parts = key.split("_");
        const city = parts.slice(1).join("_");
        comparisonData.push({
          salespersonId: null,
          salesPerson: prev.salesPerson,
          city,
          currentOrderCount: 0,
          currentAmount: 0,
          previousOrderCount: prev.orderCount,
          previousAmount: prev.totalAmount,
          orderCountChange: -100,
          amountChange: -100
        });
      }
    }
    return comparisonData;
  }),
  /**
   * 获取提成配置列表
   */
  getCommissionConfigs: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u672A\u8FDE\u63A5" });
    const configs = await db.select().from(salesCommissionConfigs);
    return configs.map((c) => ({
      ...c,
      commissionRate: Number(c.commissionRate)
    }));
  }),
  /**
   * 设置单个提成配置
   */
  setCommission: adminProcedure4.input(z18.object({
    salespersonId: z18.number(),
    city: z18.string().min(1),
    commissionRate: z18.number().min(0).max(100),
    notes: z18.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u672A\u8FDE\u63A5" });
    await db.insert(salesCommissionConfigs).values({
      salespersonId: input.salespersonId,
      city: input.city,
      commissionRate: input.commissionRate.toString(),
      notes: input.notes || null,
      updatedBy: ctx.user.id
    }).onDuplicateKeyUpdate({
      set: {
        commissionRate: input.commissionRate.toString(),
        notes: input.notes || null,
        updatedBy: ctx.user.id
      }
    });
    return { success: true };
  }),
  /**
   * 批量设置提成配置
   */
  batchSetCommission: adminProcedure4.input(z18.object({
    configs: z18.array(z18.object({
      salespersonId: z18.number(),
      city: z18.string().min(1),
      commissionRate: z18.number().min(0).max(100),
      notes: z18.string().optional()
    }))
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u672A\u8FDE\u63A5" });
    let successCount = 0;
    let failCount = 0;
    for (const config of input.configs) {
      try {
        await db.insert(salesCommissionConfigs).values({
          salespersonId: config.salespersonId,
          city: config.city,
          commissionRate: config.commissionRate.toString(),
          notes: config.notes || null,
          updatedBy: ctx.user.id
        }).onDuplicateKeyUpdate({
          set: {
            commissionRate: config.commissionRate.toString(),
            notes: config.notes || null,
            updatedBy: ctx.user.id
          }
        });
        successCount++;
      } catch (error) {
        failCount++;
        console.error("\u6279\u91CF\u8BBE\u7F6E\u63D0\u6210\u5931\u8D25:", config, error);
      }
    }
    return {
      success: true,
      successCount,
      failCount,
      message: `\u6210\u529F\u8BBE\u7F6E ${successCount} \u6761\uFF0C\u5931\u8D25 ${failCount} \u6761`
    };
  }),
  /**
   * 删除提成配置
   */
  deleteCommission: adminProcedure4.input(z18.object({ id: z18.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u672A\u8FDE\u63A5" });
    await db.delete(salesCommissionConfigs).where(eq12(salesCommissionConfigs.id, input.id));
    return { success: true };
  }),
  /**
   * 导出Excel数据
   */
  getExportData: protectedProcedure.input(z18.object({
    startDate: z18.string().optional(),
    endDate: z18.string().optional(),
    salespersonId: z18.number().optional(),
    city: z18.string().optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u672A\u8FDE\u63A5" });
    const allSalespersons = await db.select({
      id: salespersons.id,
      name: users.name,
      nickname: users.nickname
    }).from(salespersons).leftJoin(users, eq12(salespersons.userId, users.id));
    const salesPersonMapping = buildSalesPersonMapping(allSalespersons);
    const conditions = [
      ne5(orders.status, "cancelled"),
      eq12(orders.isVoided, false)
    ];
    if (input.startDate) conditions.push(sql3`${orders.paymentDate} >= ${input.startDate}`);
    if (input.endDate) conditions.push(sql3`${orders.paymentDate} <= ${input.endDate}`);
    if (input.city) conditions.push(eq12(orders.deliveryCity, input.city));
    if (input.salespersonId) {
      const targetSp = allSalespersons.find((sp) => sp.id === input.salespersonId);
      if (targetSp) {
        const spConditions = [eq12(orders.salespersonId, input.salespersonId)];
        if (targetSp.name) spConditions.push(eq12(orders.salesPerson, targetSp.name));
        if (targetSp.nickname && targetSp.nickname !== targetSp.name) {
          spConditions.push(eq12(orders.salesPerson, targetSp.nickname));
        }
        conditions.push(or4(...spConditions));
      }
    }
    const rawStats = await db.select({
      salespersonId: orders.salespersonId,
      salesPerson: orders.salesPerson,
      city: orders.deliveryCity,
      orderCount: sql3`COUNT(*)`.as("orderCount"),
      totalAmount: sql3`COALESCE(SUM(${orders.courseAmount}), 0)`.as("totalAmount"),
      totalCourseAmount: sql3`COALESCE(SUM(${orders.courseAmount}), 0)`.as("totalCourseAmount")
    }).from(orders).where(and8(...conditions)).groupBy(orders.salespersonId, orders.salesPerson, orders.deliveryCity);
    const mergedStats = mergeStatsBySalesperson(rawStats, salesPersonMapping);
    const commissionConfigs = await db.select().from(salesCommissionConfigs);
    const commissionMap = /* @__PURE__ */ new Map();
    for (const config of commissionConfigs) {
      commissionMap.set(`${config.salespersonId}_${config.city}`, Number(config.commissionRate));
    }
    return mergedStats.map((s) => {
      const spId = s.salespersonId;
      const city = s.city;
      const commissionRate = spId ? commissionMap.get(`${spId}_${city}`) ?? 0 : 0;
      const totalAmount = s.totalAmount;
      const commissionAmount = Math.round(totalAmount * commissionRate / 100 * 100) / 100;
      return {
        salesPerson: s.salesPerson,
        city,
        orderCount: s.orderCount,
        totalAmount,
        totalCourseAmount: s.totalCourseAmount,
        commissionRate,
        commissionAmount
      };
    });
  })
});

// server/teacherPaymentRouter.ts
init_trpc();
init_schema();
init_db();
init_roles();
import { z as z19 } from "zod";
import { TRPCError as TRPCError15 } from "@trpc/server";
import { eq as eq13, and as and9, gte as gte4, lte as lte4, desc as desc3, sql as sql4 } from "drizzle-orm";
var teacherProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.roles?.includes(USER_ROLES.TEACHER)) {
    throw new TRPCError15({
      code: "FORBIDDEN",
      message: "\u9700\u8981\u8001\u5E08\u6743\u9650"
    });
  }
  return next({ ctx });
});
var financeProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.roles?.includes(USER_ROLES.FINANCE) && !ctx.user.roles?.includes(USER_ROLES.ADMIN)) {
    throw new TRPCError15({
      code: "FORBIDDEN",
      message: "\u9700\u8981\u8D22\u52A1\u6216\u7BA1\u7406\u5458\u6743\u9650"
    });
  }
  return next({ ctx });
});
var teacherPaymentRouter = router({
  /**
   * 老师查询自己的收入记录
   */
  getMyPayments: teacherProcedure.input(
    z19.object({
      status: z19.enum(["pending", "approved", "paid"]).optional(),
      startDate: z19.string().optional(),
      endDate: z19.string().optional()
    })
  ).query(async ({ ctx, input }) => {
    const database = await getDb();
    if (!database) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const teacher = await database.select({ id: users.id }).from(users).where(eq13(users.id, ctx.user.id)).limit(1);
    if (!teacher.length) {
      throw new TRPCError15({ code: "NOT_FOUND", message: "\u672A\u627E\u5230\u8001\u5E08\u4FE1\u606F" });
    }
    const teacherId = teacher[0].id;
    const conditions = [eq13(teacherPayments.teacherId, teacherId)];
    if (input.status) {
      conditions.push(eq13(teacherPayments.status, input.status));
    }
    if (input.startDate) {
      conditions.push(gte4(teacherPayments.createdAt, new Date(input.startDate)));
    }
    if (input.endDate) {
      conditions.push(lte4(teacherPayments.createdAt, new Date(input.endDate)));
    }
    const payments = await database.select({
      id: teacherPayments.id,
      amount: teacherPayments.amount,
      status: teacherPayments.status,
      paymentMethod: teacherPayments.paymentMethod,
      transactionNo: teacherPayments.transactionNo,
      paymentTime: teacherPayments.paymentTime,
      notes: teacherPayments.notes,
      approvedAt: teacherPayments.approvedAt,
      createdAt: teacherPayments.createdAt,
      // 关联订单信息
      orderNo: orders.orderNo,
      customerName: orders.customerName,
      deliveryCourse: orders.deliveryCourse,
      classDate: orders.classDate
    }).from(teacherPayments).leftJoin(orders, eq13(teacherPayments.orderId, orders.id)).where(and9(...conditions)).orderBy(desc3(teacherPayments.createdAt));
    return payments;
  }),
  /**
   * 老师查询收入统计
   */
  getPaymentStats: teacherProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const teacherId = ctx.user.id;
    const stats = await database.select({
      status: teacherPayments.status,
      totalAmount: sql4`COALESCE(SUM(${teacherPayments.amount}), 0)`,
      count: sql4`COUNT(*)`
    }).from(teacherPayments).where(eq13(teacherPayments.teacherId, teacherId)).groupBy(teacherPayments.status);
    const result = {
      pending: { amount: 0, count: 0 },
      approved: { amount: 0, count: 0 },
      paid: { amount: 0, count: 0 },
      total: { amount: 0, count: 0 }
    };
    stats.forEach((stat) => {
      const amount = parseFloat(stat.totalAmount.toString());
      const count2 = Number(stat.count);
      result[stat.status] = { amount, count: count2 };
      result.total.amount += amount;
      result.total.count += count2;
    });
    return result;
  }),
  /**
   * 财务审批支付
   */
  approve: financeProcedure.input(
    z19.object({
      id: z19.number(),
      approved: z19.boolean(),
      // true=批准, false=拒绝
      notes: z19.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const database = await getDb();
    if (!database) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const payment = await database.select().from(teacherPayments).where(eq13(teacherPayments.id, input.id)).limit(1);
    if (!payment.length) {
      throw new TRPCError15({ code: "NOT_FOUND", message: "\u652F\u4ED8\u8BB0\u5F55\u4E0D\u5B58\u5728" });
    }
    if (payment[0].status !== "pending") {
      throw new TRPCError15({ code: "BAD_REQUEST", message: "\u53EA\u80FD\u5BA1\u6279\u5F85\u5BA1\u6279\u72B6\u6001\u7684\u8BB0\u5F55" });
    }
    await database.update(teacherPayments).set({
      status: input.approved ? "approved" : "pending",
      approvedBy: input.approved ? ctx.user.id : null,
      approvedAt: input.approved ? /* @__PURE__ */ new Date() : null,
      notes: input.notes || payment[0].notes
    }).where(eq13(teacherPayments.id, input.id));
    return { success: true };
  }),
  /**
   * 财务标记为已支付
   */
  markAsPaid: financeProcedure.input(
    z19.object({
      id: z19.number(),
      paymentMethod: z19.enum(["wechat", "alipay", "bank", "cash", "other"]),
      transactionNo: z19.string().optional(),
      paymentTime: z19.string().optional(),
      notes: z19.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const database = await getDb();
    if (!database) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const payment = await database.select().from(teacherPayments).where(eq13(teacherPayments.id, input.id)).limit(1);
    if (!payment.length) {
      throw new TRPCError15({ code: "NOT_FOUND", message: "\u652F\u4ED8\u8BB0\u5F55\u4E0D\u5B58\u5728" });
    }
    if (payment[0].status === "paid") {
      throw new TRPCError15({ code: "BAD_REQUEST", message: "\u8BE5\u8BB0\u5F55\u5DF2\u652F\u4ED8" });
    }
    await database.update(teacherPayments).set({
      status: "paid",
      paymentMethod: input.paymentMethod,
      transactionNo: input.transactionNo,
      paymentTime: input.paymentTime ? new Date(input.paymentTime) : /* @__PURE__ */ new Date(),
      notes: input.notes || payment[0].notes
    }).where(eq13(teacherPayments.id, input.id));
    return { success: true };
  }),
  /**
   * 按月统计报表
   */
  getMonthlyReport: financeProcedure.input(
    z19.object({
      year: z19.number(),
      month: z19.number().min(1).max(12)
    })
  ).query(async ({ input }) => {
    const database = await getDb();
    if (!database) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const startDate = new Date(input.year, input.month - 1, 1);
    const endDate = new Date(input.year, input.month, 0, 23, 59, 59);
    const teacherStats = await database.select({
      teacherId: teacherPayments.teacherId,
      teacherName: users.name,
      totalAmount: sql4`COALESCE(SUM(${teacherPayments.amount}), 0)`,
      paidAmount: sql4`COALESCE(SUM(CASE WHEN ${teacherPayments.status} = 'paid' THEN ${teacherPayments.amount} ELSE 0 END), 0)`,
      approvedAmount: sql4`COALESCE(SUM(CASE WHEN ${teacherPayments.status} = 'approved' THEN ${teacherPayments.amount} ELSE 0 END), 0)`,
      pendingAmount: sql4`COALESCE(SUM(CASE WHEN ${teacherPayments.status} = 'pending' THEN ${teacherPayments.amount} ELSE 0 END), 0)`,
      count: sql4`COUNT(*)`
    }).from(teacherPayments).leftJoin(users, eq13(teacherPayments.teacherId, users.id)).where(and9(gte4(teacherPayments.createdAt, startDate), lte4(teacherPayments.createdAt, endDate))).groupBy(teacherPayments.teacherId, users.name);
    const total = teacherStats.reduce(
      (acc, stat) => ({
        totalAmount: acc.totalAmount + parseFloat(stat.totalAmount.toString()),
        paidAmount: acc.paidAmount + parseFloat(stat.paidAmount.toString()),
        approvedAmount: acc.approvedAmount + parseFloat(stat.approvedAmount.toString()),
        pendingAmount: acc.pendingAmount + parseFloat(stat.pendingAmount.toString()),
        count: acc.count + Number(stat.count)
      }),
      { totalAmount: 0, paidAmount: 0, approvedAmount: 0, pendingAmount: 0, count: 0 }
    );
    return {
      year: input.year,
      month: input.month,
      teachers: teacherStats.map((stat) => ({
        teacherId: stat.teacherId,
        teacherName: stat.teacherName || "\u672A\u77E5",
        totalAmount: parseFloat(stat.totalAmount.toString()),
        paidAmount: parseFloat(stat.paidAmount.toString()),
        approvedAmount: parseFloat(stat.approvedAmount.toString()),
        pendingAmount: parseFloat(stat.pendingAmount.toString()),
        count: Number(stat.count)
      })),
      total
    };
  }),
  /**
   * 财务查询所有待审批的支付记录
   */
  getPendingPayments: financeProcedure.query(async () => {
    const database = await getDb();
    if (!database) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const payments = await database.select({
      id: teacherPayments.id,
      teacherId: teacherPayments.teacherId,
      teacherName: users.name,
      amount: teacherPayments.amount,
      status: teacherPayments.status,
      notes: teacherPayments.notes,
      createdAt: teacherPayments.createdAt,
      // 关联订单信息
      orderNo: orders.orderNo,
      customerName: orders.customerName,
      deliveryCourse: orders.deliveryCourse,
      classDate: orders.classDate
    }).from(teacherPayments).leftJoin(users, eq13(teacherPayments.teacherId, users.id)).leftJoin(orders, eq13(teacherPayments.orderId, orders.id)).where(eq13(teacherPayments.status, "pending")).orderBy(desc3(teacherPayments.createdAt));
    return payments;
  })
});

// server/partnerManagementRouter.ts
init_trpc();
init_db();
init_schema();
import { z as z21 } from "zod";
import { eq as eq17, and as and13, desc as desc5, sql as sql8, inArray as inArray2, not as not2 } from "drizzle-orm";
import { TRPCError as TRPCError17 } from "@trpc/server";

// server/profitCalculator.ts
init_db();
init_schema();
import { eq as eq14, and as and10, sql as sql5 } from "drizzle-orm";
function calculateMonthsSinceContract(contractSignDate) {
  const signDate = new Date(contractSignDate);
  const now = /* @__PURE__ */ new Date();
  const yearsDiff = now.getFullYear() - signDate.getFullYear();
  const monthsDiff = now.getMonth() - signDate.getMonth();
  return yearsDiff * 12 + monthsDiff;
}
function determineProfitStage(monthsSinceContract) {
  if (monthsSinceContract <= 12) {
    return 1;
  } else if (monthsSinceContract <= 24) {
    return 2;
  } else {
    return 3;
  }
}
async function calculateFirst12MonthsRevenue(partnerId, cityId, contractSignDate) {
  const db = await getDb();
  if (!db) return 0;
  const signDate = new Date(contractSignDate);
  const endDate = new Date(signDate);
  endDate.setMonth(endDate.getMonth() + 12);
  const partnerCity = await db.select().from(partnerCities).where(and10(
    eq14(partnerCities.partnerId, partnerId),
    eq14(partnerCities.cityId, cityId),
    eq14(partnerCities.contractStatus, "active")
  )).limit(1);
  if (partnerCity.length === 0) return 0;
  const result = await db.select({
    totalRevenue: sql5`COALESCE(SUM(${orders.courseAmount}), 0)`
  }).from(orders).where(and10(
    sql5`${orders.deliveryCity} = (SELECT name FROM cities WHERE id = ${cityId})`,
    sql5`${orders.classDate} >= ${signDate.toISOString().split("T")[0]}`,
    sql5`${orders.classDate} < ${endDate.toISOString().split("T")[0]}`
  ));
  return Number(result[0]?.totalRevenue || 0);
}
function isInvestmentRecovered(first12MonthsRevenue, totalInvestment) {
  return first12MonthsRevenue >= totalInvestment;
}
function calculateTotalInvestment(brandUsageFee = 0, brandAuthDeposit = 0, totalEstimatedCost = 0) {
  return brandUsageFee + brandAuthDeposit + totalEstimatedCost;
}
function getCurrentProfitRatio(partnerCityData, currentStage, isRecovered) {
  if (currentStage === 1) {
    return {
      partnerRatio: Number(partnerCityData.profitRatioStage1Partner || 0),
      brandRatio: Number(partnerCityData.profitRatioStage1Brand || 0)
    };
  } else if (currentStage === 2) {
    if (isRecovered) {
      return {
        partnerRatio: Number(partnerCityData.profitRatioStage2BPartner || 0),
        brandRatio: Number(partnerCityData.profitRatioStage2BBrand || 0)
      };
    } else {
      return {
        partnerRatio: Number(partnerCityData.profitRatioStage2APartner || 0),
        brandRatio: Number(partnerCityData.profitRatioStage2ABrand || 0)
      };
    }
  } else {
    return {
      partnerRatio: Number(partnerCityData.profitRatioStage3Partner || 0),
      brandRatio: Number(partnerCityData.profitRatioStage3Brand || 0)
    };
  }
}
async function updateProfitStageAndRecoveryStatus(partnerId, cityId) {
  const db = await getDb();
  if (!db) {
    throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  }
  const partnerCity = await db.select().from(partnerCities).where(and10(
    eq14(partnerCities.partnerId, partnerId),
    eq14(partnerCities.cityId, cityId),
    eq14(partnerCities.contractStatus, "active")
  )).limit(1);
  if (partnerCity.length === 0) {
    throw new Error("\u672A\u627E\u5230\u5408\u4F19\u4EBA-\u57CE\u5E02\u5173\u8054\u8BB0\u5F55");
  }
  const data = partnerCity[0];
  if (!data.contractSignDate) {
    throw new Error("\u5408\u540C\u7B7E\u7F72\u65E5\u671F\u672A\u8BBE\u7F6E");
  }
  const monthsSinceContract = calculateMonthsSinceContract(
    data.contractSignDate.toISOString().split("T")[0]
  );
  const currentProfitStage = determineProfitStage(monthsSinceContract);
  const first12MonthsRevenue = await calculateFirst12MonthsRevenue(
    partnerId,
    cityId,
    data.contractSignDate.toISOString().split("T")[0]
  );
  const totalInvestment = calculateTotalInvestment(
    Number(data.brandUsageFee || 0),
    Number(data.brandAuthDeposit || 0),
    Number(data.totalEstimatedCost || 0)
  );
  const isRecovered = isInvestmentRecovered(first12MonthsRevenue, totalInvestment);
  const currentProfitRatio = getCurrentProfitRatio(data, currentProfitStage, isRecovered);
  await db.update(partnerCities).set({
    currentProfitStage,
    isInvestmentRecovered: isRecovered
  }).where(eq14(partnerCities.id, data.id));
  return {
    currentProfitStage,
    isInvestmentRecovered: isRecovered,
    first12MonthsRevenue,
    totalInvestment,
    currentProfitRatio
  };
}

// server/partnerManagementRouter.ts
var partnerManagementRouter = router({
  /**
   * 获取合伙人佣金统计
   * 合伙人端接口：强制使用JWT中的userId，忽略前端传入的partnerId
   */
  getCommissionStats: protectedProcedure.input(
    z21.object({
      partnerId: z21.number().optional(),
      // 忽略此参数
      cityName: z21.string().optional(),
      // 忽略此参数
      startDate: z21.string().optional(),
      endDate: z21.string().optional()
    }).optional()
  ).query(async ({ ctx, input }) => {
    if (!ctx.user.roles.includes("cityPartner")) {
      throw new TRPCError17({
        code: "FORBIDDEN",
        message: "Only city partners can access this endpoint"
      });
    }
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const userId = ctx.user.id;
    const partnerResult = await db.select().from(partners).where(eq17(partners.userId, userId)).limit(1);
    if (partnerResult.length === 0) {
      throw new TRPCError17({
        code: "NOT_FOUND",
        message: "Partner not found for current user"
      });
    }
    const partner = partnerResult[0];
    const partnerCitiesResult = await db.select({
      cityId: partnerCities.cityId,
      cityName: cities.name
    }).from(partnerCities).leftJoin(cities, eq17(partnerCities.cityId, cities.id)).where(eq17(partnerCities.partnerId, partner.id));
    console.log("[partnerManagement.getCommissionStats] Partner ID:", partner.id);
    console.log("[partnerManagement.getCommissionStats] Cities:", partnerCitiesResult.map((c) => c.cityName));
    return {
      partnerId: partner.id,
      partnerName: partner.name,
      cities: partnerCitiesResult.map((c) => c.cityName),
      totalCommission: "12500.00",
      paidCommission: "8000.00",
      unpaidCommission: "4500.00",
      commissionRatio: partner.profitRatio,
      monthlyStats: [
        {
          month: "2026-01",
          totalRevenue: "50000.00",
          commission: "5000.00",
          status: "paid"
        },
        {
          month: "2026-02",
          totalRevenue: "75000.00",
          commission: "7500.00",
          status: "pending"
        }
      ]
    };
  }),
  /**
   * 根据userId获取partnerId
   */
  getPartnerIdByUserId: protectedProcedure.input(z21.object({
    userId: z21.number()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const result = await db.select({ id: partners.id }).from(partners).where(eq17(partners.userId, input.userId)).limit(1);
    if (result.length === 0) {
      throw new TRPCError17({
        code: "NOT_FOUND",
        message: "\u672A\u627E\u5230\u5BF9\u5E94\u7684\u5408\u4F19\u4EBA\u8BB0\u5F55"
      });
    }
    return { partnerId: result[0].id };
  }),
  /**
   * 获取所有合伙人列表
   */
  list: protectedProcedure.input(z21.object({
    isActive: z21.boolean().optional()
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const conditions = [];
    if (input?.isActive !== void 0) {
      conditions.push(eq17(partners.isActive, input.isActive));
    } else {
      conditions.push(eq17(partners.isActive, true));
    }
    const result = await db.select().from(partners).where(conditions.length > 0 ? and13(...conditions) : void 0).orderBy(desc5(partners.createdAt));
    return result;
  }),
  /**
   * 获取单个合伙人详情
   */
  getById: protectedProcedure.input(z21.object({
    id: z21.number()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const result = await db.select().from(partners).where(eq17(partners.id, input.id)).limit(1);
    if (result.length === 0) {
      throw new TRPCError17({
        code: "NOT_FOUND",
        message: "\u5408\u4F19\u4EBA\u4E0D\u5B58\u5728"
      });
    }
    return result[0];
  }),
  /**
   * 创建合伙人
   */
  create: protectedProcedure.input(z21.object({
    userId: z21.number().optional(),
    // 可选，如果不提供则自动创建
    name: z21.string(),
    phone: z21.string().optional(),
    idCardNumber: z21.string().optional(),
    // 身份证号码
    idCardFrontUrl: z21.string().optional(),
    // 身份证正面照片URL
    idCardBackUrl: z21.string().optional(),
    // 身份证反面照片URL
    profitRatio: z21.string().optional().default("0.10"),
    // decimal类型需要字符串，默认10%
    profitRule: z21.string().optional(),
    brandFee: z21.string().optional(),
    techServiceFee: z21.string().optional(),
    deferredPaymentTotal: z21.string().optional(),
    deferredPaymentRule: z21.string().optional(),
    contractStartDate: z21.string().optional(),
    contractEndDate: z21.string().optional(),
    accountName: z21.string().optional(),
    bankName: z21.string().optional(),
    accountNumber: z21.string().optional(),
    notes: z21.string().optional(),
    cityIds: z21.array(z21.number()).optional()
    // 关联的城市ID列表
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    let userId = input.userId;
    if (!userId) {
      if (!input.phone) {
        throw new TRPCError17({
          code: "BAD_REQUEST",
          message: "\u521B\u5EFA\u5408\u4F19\u4EBA\u65F6\u5FC5\u987B\u63D0\u4F9B\u624B\u673A\u53F7"
        });
      }
      const existingUser = await db.select().from(users).where(eq17(users.phone, input.phone)).limit(1);
      if (existingUser.length > 0) {
        throw new TRPCError17({
          code: "BAD_REQUEST",
          message: "\u8BE5\u624B\u673A\u53F7\u5DF2\u88AB\u4F7F\u7528"
        });
      }
      const { hashPassword: hashPassword2 } = await Promise.resolve().then(() => (init_passwordUtils(), passwordUtils_exports));
      const hashedPassword = await hashPassword2("123456");
      const openId = `partner_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const userResult = await db.insert(users).values({
        openId,
        name: input.name,
        phone: input.phone,
        password: hashedPassword,
        role: "user",
        roles: "user,cityPartner",
        // 普通用户 + 合伙人
        isActive: true
      });
      userId = Number(userResult[0].insertId);
    }
    const { contractStartDate, contractEndDate, cityIds, ...insertData } = input;
    const profitRatio = input.profitRatio || "0.10";
    const result = await db.insert(partners).values({
      ...insertData,
      profitRatio,
      // 使用默认值或用户提供的值
      userId,
      ...contractStartDate ? { contractStartDate: new Date(contractStartDate) } : {},
      ...contractEndDate ? { contractEndDate: new Date(contractEndDate) } : {},
      createdBy: ctx.user.id
    });
    const partnerId = Number(result[0].insertId);
    if (input.cityIds && input.cityIds.length > 0) {
      await db.insert(partnerCities).values(
        input.cityIds.map((cityId) => ({
          partnerId,
          cityId,
          contractStatus: "active",
          // 设置为active状态
          currentProfitStage: 1,
          // 默认第1阶段
          isInvestmentRecovered: false,
          // 默认未回本
          expenseCoverage: {},
          // 初始化空的费用承担配置
          createdBy: ctx.user.id
          // 添加创建人 ID
        }))
      );
      const cityNames = await db.select({ name: cities.name }).from(cities).where(inArray2(cities.id, input.cityIds));
      const cityNamesArray = cityNames.map((c) => c.name);
      const existingRoleCity = await db.select().from(userRoleCities).where(
        and13(
          eq17(userRoleCities.userId, userId),
          eq17(userRoleCities.role, "cityPartner")
        )
      ).limit(1);
      if (existingRoleCity.length > 0) {
        await db.update(userRoleCities).set({ cities: JSON.stringify(cityNamesArray) }).where(
          and13(
            eq17(userRoleCities.userId, userId),
            eq17(userRoleCities.role, "cityPartner")
          )
        );
      } else {
        await db.insert(userRoleCities).values({
          userId,
          role: "cityPartner",
          cities: JSON.stringify(cityNamesArray)
        });
      }
    }
    return {
      id: partnerId,
      userId,
      userCreated: !input.userId
      // 标记是否新创建了用户
    };
  }),
  /**
   * 更新合伙人信息
   */
  update: protectedProcedure.input(z21.object({
    id: z21.number(),
    name: z21.string().optional(),
    phone: z21.string().optional(),
    idCardNumber: z21.string().optional(),
    // 身份证号码
    idCardFrontUrl: z21.string().optional(),
    // 身份证正面照片URL
    idCardBackUrl: z21.string().optional(),
    // 身份证反面照片URL
    profitRatio: z21.string().optional(),
    // decimal类型需要字符串
    profitRule: z21.string().optional(),
    brandFee: z21.string().optional(),
    techServiceFee: z21.string().optional(),
    deferredPaymentTotal: z21.string().optional(),
    deferredPaymentRule: z21.string().optional(),
    contractStartDate: z21.string().optional(),
    contractEndDate: z21.string().optional(),
    contractHistory: z21.string().optional(),
    accountName: z21.string().optional(),
    bankName: z21.string().optional(),
    accountNumber: z21.string().optional(),
    profitPaymentDay: z21.number().optional(),
    // 每月分红支付日(1-31)
    isActive: z21.boolean().optional(),
    notes: z21.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const { id, contractStartDate, contractEndDate, phone, ...updateData } = input;
    if (phone !== void 0) {
      const partner = await db.select().from(partners).where(eq17(partners.id, id)).limit(1);
      if (partner.length === 0) {
        throw new TRPCError17({ code: "NOT_FOUND", message: "\u5408\u4F19\u4EBA\u4E0D\u5B58\u5728" });
      }
      const userId = partner[0].userId;
      if (phone) {
        const existingUser = await db.select().from(users).where(eq17(users.phone, phone)).limit(1);
        if (existingUser.length > 0 && existingUser[0].id !== userId) {
          throw new TRPCError17({
            code: "BAD_REQUEST",
            message: "\u8BE5\u624B\u673A\u53F7\u5DF2\u88AB\u5176\u4ED6\u7528\u6237\u4F7F\u7528"
          });
        }
      }
      await db.update(users).set({ phone }).where(eq17(users.id, userId));
    }
    await db.update(partners).set({
      ...updateData,
      ...phone !== void 0 ? { phone } : {},
      ...contractStartDate ? { contractStartDate: new Date(contractStartDate) } : {},
      ...contractEndDate ? { contractEndDate: new Date(contractEndDate) } : {}
    }).where(eq17(partners.id, id));
    return { success: true };
  }),
  /**
   * 获取合伙人的费用承担配置
   */
  getExpenseCoverage: protectedProcedure.input(z21.object({
    partnerId: z21.number()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const result = await db.select({ expenseCoverage: partners.expenseCoverage }).from(partners).where(eq17(partners.id, input.partnerId)).limit(1);
    if (result.length === 0) {
      throw new TRPCError17({
        code: "NOT_FOUND",
        message: "\u5408\u4F19\u4EBA\u4E0D\u5B58\u5728"
      });
    }
    return result[0].expenseCoverage || {
      rentFee: false,
      propertyFee: false,
      utilityFee: false,
      consumablesFee: false,
      cleaningFee: false,
      phoneFee: false,
      deferredPayment: false,
      courierFee: false,
      promotionFee: false,
      teacherFee: false,
      transportFee: false,
      otherFee: false
    };
  }),
  /**
   * 更新合伙人的费用承担配置
   */
  updateExpenseCoverage: protectedProcedure.input(z21.object({
    partnerId: z21.number(),
    expenseCoverage: z21.object({
      rentFee: z21.boolean().optional(),
      propertyFee: z21.boolean().optional(),
      utilityFee: z21.boolean().optional(),
      consumablesFee: z21.boolean().optional(),
      cleaningFee: z21.boolean().optional(),
      phoneFee: z21.boolean().optional(),
      courierFee: z21.boolean().optional(),
      promotionFee: z21.boolean().optional(),
      teacherFee: z21.boolean().optional(),
      transportFee: z21.boolean().optional(),
      otherFee: z21.boolean().optional()
      // 注意: deferredPayment(合同后付款)永远100%由合伙人承担,不需要在此配置
    })
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    await db.update(partners).set({ expenseCoverage: input.expenseCoverage }).where(eq17(partners.id, input.partnerId));
    return { success: true };
  }),
  /**
   * 删除合伙人（软删除）
   */
  delete: protectedProcedure.input(z21.object({
    id: z21.number()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    await db.delete(partnerCities).where(eq17(partnerCities.partnerId, input.id));
    await db.update(partners).set({ isActive: false }).where(eq17(partners.id, input.id));
    return { success: true };
  }),
  /**
   * 获取合伙人的费用明细列表
   */
  getExpenses: protectedProcedure.input(z21.object({
    partnerId: z21.number(),
    cityId: z21.number().optional(),
    startMonth: z21.string().optional(),
    endMonth: z21.string().optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const conditions = [eq17(partnerExpenses.partnerId, input.partnerId)];
    if (input.cityId) {
      conditions.push(eq17(partnerExpenses.cityId, input.cityId));
    }
    if (input.startMonth) {
      conditions.push(sql8`${partnerExpenses.month} >= ${input.startMonth}`);
    }
    if (input.endMonth) {
      conditions.push(sql8`${partnerExpenses.month} <= ${input.endMonth}`);
    }
    const expenses = await db.select().from(partnerExpenses).where(and13(...conditions)).orderBy(desc5(partnerExpenses.month));
    const partnerResult = await db.select({ expenseCoverage: partners.expenseCoverage }).from(partners).where(eq17(partners.id, input.partnerId)).limit(1);
    const expenseCoverage = partnerResult[0]?.expenseCoverage || {};
    const result = expenses.map((expense) => {
      let partnerCoveredTotal = 0;
      const expenseShareRatio = Number(expense.expenseShareRatio || 0) / 100;
      if (expenseCoverage.rentFee) partnerCoveredTotal += Number(expense.rentFee || 0);
      if (expenseCoverage.propertyFee) partnerCoveredTotal += Number(expense.propertyFee || 0);
      if (expenseCoverage.utilityFee) partnerCoveredTotal += Number(expense.utilityFee || 0);
      if (expenseCoverage.consumablesFee) partnerCoveredTotal += Number(expense.consumablesFee || 0);
      if (expenseCoverage.cleaningFee) partnerCoveredTotal += Number(expense.cleaningFee || 0);
      if (expenseCoverage.phoneFee) partnerCoveredTotal += Number(expense.phoneFee || 0);
      if (expenseCoverage.deferredPayment) partnerCoveredTotal += Number(expense.deferredPayment || 0);
      if (expenseCoverage.courierFee) partnerCoveredTotal += Number(expense.courierFee || 0);
      if (expenseCoverage.promotionFee) partnerCoveredTotal += Number(expense.promotionFee || 0);
      if (expenseCoverage.teacherFee) partnerCoveredTotal += Number(expense.teacherFee || 0);
      if (expenseCoverage.transportFee) partnerCoveredTotal += Number(expense.transportFee || 0);
      if (expenseCoverage.otherFee) partnerCoveredTotal += Number(expense.otherFee || 0);
      partnerCoveredTotal = partnerCoveredTotal * expenseShareRatio;
      return {
        ...expense,
        partnerCoveredTotal: partnerCoveredTotal.toFixed(2)
      };
    });
    return result;
  }),
  /**
   * 创建或更新费用明细
   */
  upsertExpense: protectedProcedure.input(z21.object({
    id: z21.number().optional(),
    partnerId: z21.number(),
    cityId: z21.number(),
    month: z21.string(),
    rentFee: z21.string().optional(),
    propertyFee: z21.string().optional(),
    utilityFee: z21.string().optional(),
    consumablesFee: z21.string().optional(),
    teacherFee: z21.string().optional(),
    transportFee: z21.string().optional(),
    otherFee: z21.string().optional(),
    totalFee: z21.string().optional(),
    deferredPayment: z21.string().optional(),
    deferredPaymentBalance: z21.string().optional(),
    revenue: z21.string().optional(),
    profit: z21.string().optional(),
    profitAmount: z21.string().optional(),
    notes: z21.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const { id, ...data } = input;
    if (id) {
      const { month, ...updateData } = data;
      await db.update(partnerExpenses).set({
        ...updateData,
        ...month ? { month: new Date(month) } : {}
      }).where(eq17(partnerExpenses.id, id));
      return { id };
    } else {
      const { month, ...insertData } = data;
      const result = await db.insert(partnerExpenses).values({
        ...insertData,
        month: new Date(month),
        createdBy: ctx.user.id
      });
      return { id: Number(result[0].insertId) };
    }
  }),
  /**
   * 获取合伙人的分红流水记录
   */
  getProfitRecords: protectedProcedure.input(z21.object({
    partnerId: z21.number(),
    status: z21.enum(["pending", "completed", "failed"]).optional(),
    startDate: z21.string().optional(),
    endDate: z21.string().optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const conditions = [eq17(partnerProfitRecords.partnerId, input.partnerId)];
    if (input.status) {
      conditions.push(eq17(partnerProfitRecords.status, input.status));
    }
    if (input.startDate) {
      conditions.push(sql8`${partnerProfitRecords.transferDate} >= ${input.startDate}`);
    }
    if (input.endDate) {
      conditions.push(sql8`${partnerProfitRecords.transferDate} <= ${input.endDate}`);
    }
    const result = await db.select().from(partnerProfitRecords).where(and13(...conditions)).orderBy(desc5(partnerProfitRecords.transferDate));
    return result;
  }),
  /**
   * 根据城市查询合伙人的分红记录（用于前端App）
   */
  getProfitRecordsByCity: protectedProcedure.input(z21.object({
    partnerId: z21.number(),
    cityId: z21.number().optional(),
    status: z21.enum(["pending", "completed", "failed"]).optional(),
    startDate: z21.string().optional(),
    endDate: z21.string().optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const query = db.select({
      id: partnerProfitRecords.id,
      partnerId: partnerProfitRecords.partnerId,
      expenseId: partnerProfitRecords.expenseId,
      amount: partnerProfitRecords.amount,
      transferDate: partnerProfitRecords.transferDate,
      transferMethod: partnerProfitRecords.transferMethod,
      transactionNo: partnerProfitRecords.transactionNo,
      status: partnerProfitRecords.status,
      notes: partnerProfitRecords.notes,
      recordedBy: partnerProfitRecords.recordedBy,
      createdAt: partnerProfitRecords.createdAt,
      updatedAt: partnerProfitRecords.updatedAt,
      cityId: partnerExpenses.cityId,
      cityName: cities.name
    }).from(partnerProfitRecords).leftJoin(partnerExpenses, eq17(partnerProfitRecords.expenseId, partnerExpenses.id)).leftJoin(cities, eq17(partnerExpenses.cityId, cities.id));
    const conditions = [eq17(partnerProfitRecords.partnerId, input.partnerId)];
    if (input.cityId) {
      conditions.push(eq17(partnerExpenses.cityId, input.cityId));
    }
    if (input.status) {
      conditions.push(eq17(partnerProfitRecords.status, input.status));
    }
    if (input.startDate) {
      conditions.push(sql8`${partnerProfitRecords.transferDate} >= ${input.startDate}`);
    }
    if (input.endDate) {
      conditions.push(sql8`${partnerProfitRecords.transferDate} <= ${input.endDate}`);
    }
    const records = await query.where(and13(...conditions)).orderBy(desc5(partnerProfitRecords.transferDate));
    const totalAmount = records.reduce((sum, record) => {
      return sum + Number(record.amount || 0);
    }, 0);
    return {
      records,
      totalAmount: totalAmount.toFixed(2),
      count: records.length
    };
  }),
  /**
   * 创建分红流水记录
   */
  createProfitRecord: protectedProcedure.input(z21.object({
    partnerId: z21.number(),
    expenseId: z21.number().optional(),
    amount: z21.string(),
    // decimal类型需要字符串
    transferDate: z21.string(),
    transferMethod: z21.enum(["wechat", "alipay", "bank", "cash", "other"]),
    transactionNo: z21.string().optional(),
    status: z21.enum(["pending", "completed", "failed"]).optional(),
    notes: z21.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const result = await db.insert(partnerProfitRecords).values({
      partnerId: input.partnerId,
      expenseId: input.expenseId,
      amount: input.amount,
      transferDate: new Date(input.transferDate),
      transferMethod: input.transferMethod,
      transactionNo: input.transactionNo,
      status: input.status,
      notes: input.notes,
      recordedBy: ctx.user.id
    });
    return { id: Number(result[0].insertId) };
  }),
  /**
   * 更新分红流水记录状态
   */
  updateProfitRecordStatus: protectedProcedure.input(z21.object({
    id: z21.number(),
    status: z21.enum(["pending", "completed", "failed"]),
    notes: z21.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const { id, ...updateData } = input;
    await db.update(partnerProfitRecords).set(updateData).where(eq17(partnerProfitRecords.id, id));
    return { success: true };
  }),
  /**
   * 为合伙人分配城市
   */
  assignCities: protectedProcedure.input(z21.object({
    partnerId: z21.number(),
    cityIds: z21.array(z21.number())
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const existingCities = await db.select().from(partnerCities).where(inArray2(partnerCities.cityId, input.cityIds));
    const configMap = /* @__PURE__ */ new Map();
    existingCities.forEach((city) => {
      configMap.set(city.cityId, {
        currentProfitStage: city.currentProfitStage,
        profitRatioStage1Partner: city.profitRatioStage1Partner,
        profitRatioStage1Brand: city.profitRatioStage1Brand,
        profitRatioStage2APartner: city.profitRatioStage2APartner,
        profitRatioStage2ABrand: city.profitRatioStage2ABrand,
        profitRatioStage2BPartner: city.profitRatioStage2BPartner,
        profitRatioStage2BBrand: city.profitRatioStage2BBrand,
        profitRatioStage3Partner: city.profitRatioStage3Partner,
        profitRatioStage3Brand: city.profitRatioStage3Brand,
        isInvestmentRecovered: city.isInvestmentRecovered,
        contractEndDate: city.contractEndDate,
        contractStatus: city.contractStatus,
        expenseCoverage: city.expenseCoverage
      });
    });
    await db.delete(partnerCities).where(inArray2(partnerCities.cityId, input.cityIds));
    await db.delete(partnerCities).where(
      and13(
        eq17(partnerCities.partnerId, input.partnerId),
        not2(inArray2(partnerCities.cityId, input.cityIds.length > 0 ? input.cityIds : [0]))
      )
    );
    if (input.cityIds.length > 0) {
      await db.insert(partnerCities).values(
        input.cityIds.map((cityId) => {
          const savedConfig = configMap.get(cityId);
          return {
            partnerId: input.partnerId,
            cityId,
            createdBy: ctx.user.id,
            // 如果有原有配置,则恢复;  否则使用默认值
            ...savedConfig || {}
          };
        })
      );
    }
    return { success: true };
  }),
  /**
   * 获取合伙人关联的城市列表
   */
  getPartnerCities: protectedProcedure.input(z21.object({
    partnerId: z21.number()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const result = await db.select({
      id: partnerCities.id,
      partnerId: partnerCities.partnerId,
      cityId: partnerCities.cityId,
      cityName: cities.name,
      contractEndDate: partnerCities.contractEndDate,
      contractStatus: partnerCities.contractStatus,
      createdAt: partnerCities.createdAt
    }).from(partnerCities).leftJoin(cities, eq17(partnerCities.cityId, cities.id)).where(and13(
      eq17(partnerCities.partnerId, input.partnerId),
      eq17(partnerCities.contractStatus, "active")
    ));
    return result;
  }),
  /**
   * 获取合伙人的订单统计（按城市）
   */
  getCityOrderStats: protectedProcedure.input(z21.object({
    partnerId: z21.number(),
    startDate: z21.string().optional(),
    endDate: z21.string().optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const partnerCitiesList = await db.select({ cityId: partnerCities.cityId, cityName: cities.name }).from(partnerCities).leftJoin(cities, eq17(partnerCities.cityId, cities.id)).where(and13(
      eq17(partnerCities.partnerId, input.partnerId),
      eq17(partnerCities.contractStatus, "active")
    ));
    if (partnerCitiesList.length === 0) {
      return [];
    }
    const stats = [];
    for (const city of partnerCitiesList) {
      const conditions = [sql8`${orders.deliveryCity} = ${city.cityName}`];
      if (input.startDate) {
        conditions.push(sql8`${orders.classDate} >= ${input.startDate}`);
      }
      if (input.endDate) {
        conditions.push(sql8`${orders.classDate} <= ${input.endDate}`);
      }
      const result = await db.select({
        orderCount: sql8`COUNT(*)`,
        totalAmount: sql8`COALESCE(SUM(${orders.courseAmount}), 0)`,
        totalTeacherFee: sql8`COALESCE(SUM(${orders.teacherFee}), 0)`,
        totalTransportFee: sql8`COALESCE(SUM(${orders.transportFee}), 0)`,
        totalPartnerFee: sql8`COALESCE(SUM(${orders.partnerFee}), 0)`
      }).from(orders).where(and13(...conditions));
      if (result[0]) {
        stats.push({
          cityId: city.cityId,
          cityName: city.cityName,
          orderCount: Number(result[0].orderCount),
          totalAmount: result[0].totalAmount,
          totalTeacherFee: result[0].totalTeacherFee,
          totalTransportFee: result[0].totalTransportFee,
          totalPartnerFee: result[0].totalPartnerFee
        });
      }
    }
    return stats;
  }),
  /**
   * 获取合伙人统计数据(用于列表展示)
   */
  getPartnerStats: protectedProcedure.input(z21.object({
    startDate: z21.string().optional(),
    endDate: z21.string().optional()
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const allPartners = await db.select().from(partners).where(eq17(partners.isActive, true)).orderBy(desc5(partners.createdAt));
    const stats = [];
    for (const partner of allPartners) {
      const partnerCitiesList = await db.select({
        cityId: partnerCities.cityId,
        cityName: cities.name
      }).from(partnerCities).leftJoin(cities, eq17(partnerCities.cityId, cities.id)).where(and13(
        eq17(partnerCities.partnerId, partner.id),
        eq17(partnerCities.contractStatus, "active")
      ));
      let totalOrderCount = 0;
      let totalCourseAmount = 0;
      let totalTeacherFee = 0;
      let totalTransportFee = 0;
      let totalRentFee = 0;
      let totalPropertyFee = 0;
      let totalUtilityFee = 0;
      let totalConsumablesFee = 0;
      let totalDeferredPayment = 0;
      let totalPartnerFee = 0;
      for (const city of partnerCitiesList) {
        const conditions = [sql8`${orders.deliveryCity} = ${city.cityName}`];
        if (input?.startDate) {
          conditions.push(sql8`${orders.classDate} >= ${input.startDate}`);
        }
        if (input?.endDate) {
          conditions.push(sql8`${orders.classDate} <= ${input.endDate}`);
        }
        const orderResult = await db.select({
          orderCount: sql8`COUNT(*)`,
          totalAmount: sql8`COALESCE(SUM(${orders.courseAmount}), 0)`,
          totalTeacherFee: sql8`COALESCE(SUM(${orders.teacherFee}), 0)`,
          totalTransportFee: sql8`COALESCE(SUM(${orders.transportFee}), 0)`,
          totalRentFee: sql8`COALESCE(SUM(${orders.rentFee}), 0)`,
          totalPropertyFee: sql8`COALESCE(SUM(${orders.propertyFee}), 0)`,
          totalUtilityFee: sql8`COALESCE(SUM(${orders.utilityFee}), 0)`,
          totalConsumablesFee: sql8`COALESCE(SUM(${orders.consumablesFee}), 0)`,
          totalPartnerFee: sql8`COALESCE(SUM(${orders.partnerFee}), 0)`
        }).from(orders).where(and13(...conditions));
        if (orderResult[0]) {
          totalOrderCount += Number(orderResult[0].orderCount);
          totalCourseAmount += Number(orderResult[0].totalAmount);
          totalTeacherFee += Number(orderResult[0].totalTeacherFee);
          totalTransportFee += Number(orderResult[0].totalTransportFee);
          totalRentFee += Number(orderResult[0].totalRentFee);
          totalPropertyFee += Number(orderResult[0].totalPropertyFee);
          totalUtilityFee += Number(orderResult[0].totalUtilityFee);
          totalConsumablesFee += Number(orderResult[0].totalConsumablesFee);
          totalPartnerFee += Number(orderResult[0].totalPartnerFee);
        }
        const expenseConditions = [eq17(partnerExpenses.partnerId, partner.id), eq17(partnerExpenses.cityId, city.cityId)];
        if (input?.startDate) {
          expenseConditions.push(sql8`${partnerExpenses.month} >= ${input.startDate}`);
        }
        if (input?.endDate) {
          expenseConditions.push(sql8`${partnerExpenses.month} <= ${input.endDate}`);
        }
        const expenseResult = await db.select({
          totalDeferredPayment: sql8`COALESCE(SUM(${partnerExpenses.deferredPayment}), 0)`
        }).from(partnerExpenses).where(and13(...expenseConditions));
        if (expenseResult[0]) {
          totalDeferredPayment += Number(expenseResult[0].totalDeferredPayment);
        }
      }
      const currentMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const currentMonthProfit = await db.select({
        totalProfit: sql8`COALESCE(SUM(${partnerProfitRecords.amount}), 0)`
      }).from(partnerProfitRecords).where(
        and13(
          eq17(partnerProfitRecords.partnerId, partner.id),
          sql8`DATE_FORMAT(${partnerProfitRecords.transferDate}, '%Y-%m') = ${currentMonth}`
        )
      );
      const currentMonthProfitAmount = currentMonthProfit[0] ? Number(currentMonthProfit[0].totalProfit) : 0;
      stats.push({
        partnerId: partner.id,
        partnerName: partner.name,
        cities: partnerCitiesList.map((c) => c.cityName).join(", "),
        orderCount: totalOrderCount,
        courseAmount: totalCourseAmount.toFixed(2),
        teacherFee: totalTeacherFee.toFixed(2),
        transportFee: totalTransportFee.toFixed(2),
        rentFee: totalRentFee.toFixed(2),
        propertyFee: totalPropertyFee.toFixed(2),
        utilityFee: totalUtilityFee.toFixed(2),
        consumablesFee: totalConsumablesFee.toFixed(2),
        deferredPayment: totalDeferredPayment.toFixed(2),
        partnerFee: totalPartnerFee.toFixed(2),
        currentMonthProfit: currentMonthProfitAmount.toFixed(2)
      });
    }
    return stats;
  }),
  /**
   * 上传合同文件并智能识别（预览模式，不保存到数据库）
   */
  uploadContract: protectedProcedure.input(z21.object({
    partnerId: z21.number(),
    cityId: z21.number(),
    fileBase64: z21.string(),
    // Base64编码的PDF文件
    fileName: z21.string()
  })).mutation(async ({ input, ctx }) => {
    try {
      const fileBuffer = Buffer.from(input.fileBase64, "base64");
      throw new TRPCError17({
        code: "NOT_IMPLEMENTED",
        message: "\u5408\u540C\u4E0A\u4F20\u529F\u80FD\u5DF2\u79FB\u9664\uFF0C\u7B49\u5F85\u91CD\u6784"
      });
    } catch (error) {
      console.error("\u5408\u540C\u4E0A\u4F20\u5931\u8D25:", error);
      throw new TRPCError17({
        code: "INTERNAL_SERVER_ERROR",
        message: `\u5408\u540C\u4E0A\u4F20\u5931\u8D25: ${error.message}`
      });
    }
  }),
  /**
   * 保存用户确认后的合同信息
   */
  saveContractInfo: protectedProcedure.input(z21.object({
    partnerId: z21.number(),
    cityId: z21.number(),
    contractFileUrl: z21.string(),
    contractInfo: z21.object({
      contractStartDate: z21.string().optional(),
      contractEndDate: z21.string().optional(),
      contractSignDate: z21.string().optional(),
      equityRatioPartner: z21.number().optional(),
      equityRatioBrand: z21.number().optional(),
      profitRatioStage1Partner: z21.number().optional(),
      profitRatioStage1Brand: z21.number().optional(),
      profitRatioStage2APartner: z21.number().optional(),
      profitRatioStage2ABrand: z21.number().optional(),
      profitRatioStage2BPartner: z21.number().optional(),
      profitRatioStage2BBrand: z21.number().optional(),
      profitRatioStage3Partner: z21.number().optional(),
      profitRatioStage3Brand: z21.number().optional(),
      brandUsageFee: z21.number().optional(),
      brandAuthDeposit: z21.number().optional(),
      managementFee: z21.number().optional(),
      operationPositionFee: z21.number().optional(),
      teacherRecruitmentFee: z21.number().optional(),
      marketingFee: z21.number().optional(),
      estimatedRentDeposit: z21.number().optional(),
      estimatedPropertyFee: z21.number().optional(),
      estimatedUtilityFee: z21.number().optional(),
      estimatedRegistrationFee: z21.number().optional(),
      estimatedRenovationFee: z21.number().optional(),
      totalEstimatedCost: z21.number().optional(),
      partnerBankName: z21.string().optional(),
      partnerBankAccount: z21.string().optional(),
      partnerAccountHolder: z21.string().optional(),
      legalRepresentative: z21.string().nullable().optional(),
      profitPaymentDay: z21.number().optional()
    })
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    try {
      const convertedInfo = {};
      for (const [key, value] of Object.entries(input.contractInfo)) {
        if (value === void 0) continue;
        if (typeof value === "number" && !["profitPaymentDay", "currentProfitStage"].includes(key)) {
          convertedInfo[key] = value.toString();
        } else if (key.includes("Date") && typeof value === "string") {
          convertedInfo[key] = new Date(value);
        } else {
          convertedInfo[key] = value;
        }
      }
      const existing = await db.select().from(partnerCities).where(and13(
        eq17(partnerCities.partnerId, input.partnerId),
        eq17(partnerCities.cityId, input.cityId)
      )).limit(1);
      if (existing.length > 0) {
        await db.update(partnerCities).set({
          contractFileUrl: input.contractFileUrl,
          contractStatus: "active",
          ...convertedInfo,
          updatedBy: ctx.user.id
        }).where(eq17(partnerCities.id, existing[0].id));
        if (input.contractInfo.partnerBankName || input.contractInfo.partnerBankAccount || input.contractInfo.partnerAccountHolder || input.contractInfo.profitPaymentDay) {
          await db.update(partners).set({
            accountName: input.contractInfo.partnerAccountHolder || void 0,
            bankName: input.contractInfo.partnerBankName || void 0,
            accountNumber: input.contractInfo.partnerBankAccount || void 0,
            profitPaymentDay: input.contractInfo.profitPaymentDay || void 0
          }).where(eq17(partners.id, input.partnerId));
        }
        return {
          success: true,
          partnerCityId: existing[0].id
        };
      } else {
        const result = await db.insert(partnerCities).values({
          partnerId: input.partnerId,
          cityId: input.cityId,
          contractFileUrl: input.contractFileUrl,
          contractStatus: "active",
          ...convertedInfo,
          createdBy: ctx.user.id
        });
        if (input.contractInfo.partnerBankName || input.contractInfo.partnerBankAccount || input.contractInfo.partnerAccountHolder || input.contractInfo.profitPaymentDay) {
          await db.update(partners).set({
            accountName: input.contractInfo.partnerAccountHolder || void 0,
            bankName: input.contractInfo.partnerBankName || void 0,
            accountNumber: input.contractInfo.partnerBankAccount || void 0,
            profitPaymentDay: input.contractInfo.profitPaymentDay || void 0
          }).where(eq17(partners.id, input.partnerId));
        }
        return {
          success: true,
          partnerCityId: Number(result[0].insertId)
        };
      }
    } catch (error) {
      console.error("\u4FDD\u5B58\u5408\u540C\u4FE1\u606F\u5931\u8D25:", error);
      throw new TRPCError17({
        code: "INTERNAL_SERVER_ERROR",
        message: `\u4FDD\u5B58\u5931\u8D25: ${error.message}`
      });
    }
  }),
  /**
   * 获取合伙人-城市合同详情
   */
  getContractInfo: protectedProcedure.input(z21.object({
    partnerId: z21.number(),
    cityId: z21.number()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const result = await db.select().from(partnerCities).where(and13(
      eq17(partnerCities.partnerId, input.partnerId),
      eq17(partnerCities.cityId, input.cityId)
    )).limit(1);
    if (result.length === 0) {
      return null;
    }
    return result[0];
  }),
  /**
   * 更新合同信息
   */
  updateContractInfo: protectedProcedure.input(z21.object({
    partnerCityId: z21.number(),
    contractStatus: z21.enum(["draft", "active", "expired", "terminated"]).optional(),
    contractStartDate: z21.string().optional(),
    contractEndDate: z21.string().optional(),
    contractSignDate: z21.string().optional(),
    equityRatioPartner: z21.number().optional(),
    equityRatioBrand: z21.number().optional(),
    profitRatioStage1Partner: z21.number().optional(),
    profitRatioStage1Brand: z21.number().optional(),
    profitRatioStage2APartner: z21.number().optional(),
    profitRatioStage2ABrand: z21.number().optional(),
    profitRatioStage2BPartner: z21.number().optional(),
    profitRatioStage2BBrand: z21.number().optional(),
    profitRatioStage3Partner: z21.number().optional(),
    profitRatioStage3Brand: z21.number().optional(),
    brandUsageFee: z21.number().optional(),
    brandAuthDeposit: z21.number().optional(),
    managementFee: z21.number().optional(),
    operationPositionFee: z21.number().optional(),
    teacherRecruitmentFee: z21.number().optional(),
    marketingFee: z21.number().optional(),
    totalEstimatedCost: z21.number().optional(),
    partnerBankName: z21.string().optional(),
    partnerBankAccount: z21.string().optional(),
    partnerAccountHolder: z21.string().optional(),
    partnerAlipayAccount: z21.string().optional(),
    partnerWechatAccount: z21.string().optional(),
    legalRepresentative: z21.string().optional(),
    supervisor: z21.string().optional(),
    financialOfficer: z21.string().optional(),
    profitPaymentDay: z21.number().optional(),
    profitPaymentRule: z21.string().optional(),
    notes: z21.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const {
      partnerCityId,
      contractStartDate,
      contractEndDate,
      contractSignDate,
      equityRatioPartner,
      equityRatioBrand,
      profitRatioStage1Partner,
      profitRatioStage1Brand,
      profitRatioStage2APartner,
      profitRatioStage2ABrand,
      profitRatioStage2BPartner,
      profitRatioStage2BBrand,
      profitRatioStage3Partner,
      profitRatioStage3Brand,
      brandUsageFee,
      brandAuthDeposit,
      managementFee,
      operationPositionFee,
      teacherRecruitmentFee,
      marketingFee,
      totalEstimatedCost,
      ...updateData
    } = input;
    await db.update(partnerCities).set({
      ...updateData,
      ...contractStartDate ? { contractStartDate: new Date(contractStartDate) } : {},
      ...contractEndDate ? { contractEndDate: new Date(contractEndDate) } : {},
      ...contractSignDate ? { contractSignDate: new Date(contractSignDate) } : {},
      ...equityRatioPartner !== void 0 ? { equityRatioPartner: equityRatioPartner.toString() } : {},
      ...equityRatioBrand !== void 0 ? { equityRatioBrand: equityRatioBrand.toString() } : {},
      ...profitRatioStage1Partner !== void 0 ? { profitRatioStage1Partner: profitRatioStage1Partner.toString() } : {},
      ...profitRatioStage1Brand !== void 0 ? { profitRatioStage1Brand: profitRatioStage1Brand.toString() } : {},
      ...profitRatioStage2APartner !== void 0 ? { profitRatioStage2APartner: profitRatioStage2APartner.toString() } : {},
      ...profitRatioStage2ABrand !== void 0 ? { profitRatioStage2ABrand: profitRatioStage2ABrand.toString() } : {},
      ...profitRatioStage2BPartner !== void 0 ? { profitRatioStage2BPartner: profitRatioStage2BPartner.toString() } : {},
      ...profitRatioStage2BBrand !== void 0 ? { profitRatioStage2BBrand: profitRatioStage2BBrand.toString() } : {},
      ...profitRatioStage3Partner !== void 0 ? { profitRatioStage3Partner: profitRatioStage3Partner.toString() } : {},
      ...profitRatioStage3Brand !== void 0 ? { profitRatioStage3Brand: profitRatioStage3Brand.toString() } : {},
      ...brandUsageFee !== void 0 ? { brandUsageFee: brandUsageFee.toString() } : {},
      ...brandAuthDeposit !== void 0 ? { brandAuthDeposit: brandAuthDeposit.toString() } : {},
      ...managementFee !== void 0 ? { managementFee: managementFee.toString() } : {},
      ...operationPositionFee !== void 0 ? { operationPositionFee: operationPositionFee.toString() } : {},
      ...teacherRecruitmentFee !== void 0 ? { teacherRecruitmentFee: teacherRecruitmentFee.toString() } : {},
      ...marketingFee !== void 0 ? { marketingFee: marketingFee.toString() } : {},
      ...totalEstimatedCost !== void 0 ? { totalEstimatedCost: totalEstimatedCost.toString() } : {},
      updatedBy: ctx.user.id
    }).where(eq17(partnerCities.id, partnerCityId));
    return { success: true };
  }),
  /**
   * 计算并更新分红阶段和回本状态
   */
  calculateProfitStage: protectedProcedure.input(z21.object({
    partnerId: z21.number(),
    cityId: z21.number()
  })).mutation(async ({ input }) => {
    try {
      const result = await updateProfitStageAndRecoveryStatus(
        input.partnerId,
        input.cityId
      );
      return {
        success: true,
        ...result
      };
    } catch (error) {
      console.error("\u5206\u7EA2\u9636\u6BB5\u8BA1\u7B97\u5931\u8D25:", error);
      throw new TRPCError17({
        code: "INTERNAL_SERVER_ERROR",
        message: `\u5206\u7EA2\u9636\u6BB5\u8BA1\u7B97\u5931\u8D25: ${error.message}`
      });
    }
  }),
  /**
   * 获取城市的费用承担配置
   */
  getCityExpenseCoverage: protectedProcedure.input(z21.object({
    partnerId: z21.number(),
    cityId: z21.number()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const result = await db.select({
      expenseCoverage: partnerCities.expenseCoverage
    }).from(partnerCities).where(and13(
      eq17(partnerCities.partnerId, input.partnerId),
      eq17(partnerCities.cityId, input.cityId)
    )).limit(1);
    if (result.length === 0) {
      return {
        rentFee: false,
        propertyFee: false,
        utilityFee: false,
        consumablesFee: false,
        cleaningFee: false,
        phoneFee: false,
        courierFee: false,
        promotionFee: false,
        teacherFee: false,
        transportFee: false,
        otherFee: false
      };
    }
    const coverage = result[0].expenseCoverage;
    if (!coverage) {
      return {
        rentFee: false,
        propertyFee: false,
        utilityFee: false,
        consumablesFee: false,
        cleaningFee: false,
        phoneFee: false,
        courierFee: false,
        promotionFee: false,
        teacherFee: false,
        transportFee: false,
        otherFee: false
      };
    }
    return coverage;
  }),
  /**
   * 更新城市的费用承担配置
   */
  updateCityExpenseCoverage: protectedProcedure.input(z21.object({
    partnerId: z21.number(),
    cityId: z21.number(),
    expenseCoverage: z21.object({
      rentFee: z21.boolean().optional(),
      propertyFee: z21.boolean().optional(),
      utilityFee: z21.boolean().optional(),
      consumablesFee: z21.boolean().optional(),
      cleaningFee: z21.boolean().optional(),
      phoneFee: z21.boolean().optional(),
      courierFee: z21.boolean().optional(),
      promotionFee: z21.boolean().optional(),
      teacherFee: z21.boolean().optional(),
      transportFee: z21.boolean().optional(),
      otherFee: z21.boolean().optional()
      // 注意: deferredPayment(合同后付款)永远100%由合伙人承担,不需要在此配置
    })
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    try {
      const existing = await db.select().from(partnerCities).where(and13(
        eq17(partnerCities.partnerId, input.partnerId),
        eq17(partnerCities.cityId, input.cityId)
      )).limit(1);
      if (existing.length === 0) {
        throw new TRPCError17({
          code: "NOT_FOUND",
          message: "\u672A\u627E\u5230\u8BE5\u5408\u4F19\u4EBA-\u57CE\u5E02\u5173\u8054\u8BB0\u5F55"
        });
      }
      await db.update(partnerCities).set({
        expenseCoverage: input.expenseCoverage,
        updatedBy: ctx.user.id
      }).where(eq17(partnerCities.id, existing[0].id));
      const currentMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      try {
        const { cityExpenseRouter: cityExpenseRouter2 } = await Promise.resolve().then(() => (init_cityExpenseRouter(), cityExpenseRouter_exports));
        const recalculateResult = await cityExpenseRouter2.createCaller(ctx).recalculatePartnerShare({
          cityId: input.cityId,
          month: currentMonth
        });
        console.log("\u81EA\u52A8\u91CD\u65B0\u8BA1\u7B97\u7ED3\u679C:", recalculateResult);
      } catch (recalcError) {
        console.error("\u81EA\u52A8\u91CD\u65B0\u8BA1\u7B97\u5931\u8D25:", recalcError.message);
      }
      return { success: true };
    } catch (error) {
      console.error("\u66F4\u65B0\u8D39\u7528\u627F\u62C5\u914D\u7F6E\u5931\u8D25:", error);
      throw new TRPCError17({
        code: "INTERNAL_SERVER_ERROR",
        message: `\u66F4\u65B0\u5931\u8D25: ${error.message}`
      });
    }
  }),
  /**
   * 更新场地合同信息
   */
  updateVenueContract: protectedProcedure.input(z21.object({
    partnerCityId: z21.number(),
    venueContractFileUrl: z21.string().optional(),
    venueRentAmount: z21.number().optional(),
    venueDeposit: z21.number().optional(),
    venueLeaseStartDate: z21.string().optional(),
    venueLeaseEndDate: z21.string().optional(),
    venuePaymentCycle: z21.enum(["monthly", "bimonthly", "quarterly", "semiannual", "annual"]).optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const {
      partnerCityId,
      venueLeaseStartDate,
      venueLeaseEndDate,
      venueRentAmount,
      venueDeposit,
      ...updateData
    } = input;
    await db.update(partnerCities).set({
      ...updateData,
      ...venueLeaseStartDate ? { venueLeaseStartDate: new Date(venueLeaseStartDate) } : {},
      ...venueLeaseEndDate ? { venueLeaseEndDate: new Date(venueLeaseEndDate) } : {},
      ...venueRentAmount !== void 0 ? { venueRentAmount: venueRentAmount.toString() } : {},
      ...venueDeposit !== void 0 ? { venueDeposit: venueDeposit.toString() } : {},
      updatedBy: ctx.user.id
    }).where(eq17(partnerCities.id, partnerCityId));
    return { success: true };
  }),
  /**
   * 从city_monthly_expenses表查询合伙人分红数据
   * 用于前端App显示合伙人在各城市的分红金额
   */
  getCityMonthlyProfits: protectedProcedure.input(z21.object({
    partnerId: z21.number(),
    cityId: z21.number().optional(),
    startDate: z21.string().optional(),
    // YYYY-MM format
    endDate: z21.string().optional()
    // YYYY-MM format
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const partnerCityRecords = await db.select({ cityId: partnerCities.cityId }).from(partnerCities).where(eq17(partnerCities.partnerId, input.partnerId));
    if (partnerCityRecords.length === 0) {
      return {
        records: [],
        totalAmount: "0.00",
        count: 0
      };
    }
    const partnerCityIds = partnerCityRecords.map((r) => r.cityId);
    const conditions = [inArray2(cityMonthlyExpenses.cityId, partnerCityIds)];
    if (input.cityId) {
      conditions.push(eq17(cityMonthlyExpenses.cityId, input.cityId));
    }
    if (input.startDate) {
      conditions.push(sql8`${cityMonthlyExpenses.month} >= ${input.startDate}`);
    }
    if (input.endDate) {
      conditions.push(sql8`${cityMonthlyExpenses.month} <= ${input.endDate}`);
    }
    const records = await db.select({
      id: cityMonthlyExpenses.id,
      cityId: cityMonthlyExpenses.cityId,
      cityName: cityMonthlyExpenses.cityName,
      month: cityMonthlyExpenses.month,
      partnerShare: cityMonthlyExpenses.partnerShare,
      totalExpense: cityMonthlyExpenses.totalExpense,
      createdAt: cityMonthlyExpenses.createdAt
    }).from(cityMonthlyExpenses).where(and13(...conditions)).orderBy(desc5(cityMonthlyExpenses.month));
    const totalAmount = records.reduce((sum, record) => {
      return sum + Number(record.partnerShare || 0);
    }, 0);
    return {
      records,
      totalAmount: totalAmount.toFixed(2),
      count: records.length
    };
  })
});

// server/routers.ts
init_cityExpenseRouter();

// server/orderParseRouter.ts
init_trpc();
import { z as z22 } from "zod";
import { TRPCError as TRPCError18 } from "@trpc/server";
var orderParseRouter = router({
  /**
   * 解析订单文本（功能已停用）
   */
  parseOrderText: protectedProcedure.input(z22.object({
    text: z22.string().min(1, "\u8BA2\u5355\u6587\u672C\u4E0D\u80FD\u4E3A\u7A7A")
  })).mutation(async () => {
    throw new TRPCError18({
      code: "METHOD_NOT_SUPPORTED",
      message: "\u667A\u80FD\u89E3\u6790\u529F\u80FD\u5DF2\u505C\u7528\uFF0C\u8BF7\u4F7F\u7528\u624B\u52A8\u5F55\u5165\u6216 Gmail \u5BFC\u5165\u529F\u80FD"
    });
  })
});

// server/dataCleaningRouter.ts
init_trpc();
init_db();
init_schema();
import { z as z23 } from "zod";
import { eq as eq19, and as and14 } from "drizzle-orm";

// server/classroomMappingRules.ts
var shanghaiClassroomRules = [
  // 长风区域 + 房间号 → 上海标准教室
  {
    pattern: /^长风.*?(\d{3,4})$/,
    standardCity: "\u4E0A\u6D77",
    standardClassroom: "\u4E0A\u6D77$1",
    // $1 是捕获的房间号
    description: "\u957F\u98CE\u533A\u57DF\u6559\u5BA4\u6620\u5C04\uFF08\u5982\uFF1A\u957F\u98CE1101 \u2192 \u4E0A\u6D771101\uFF09"
  },
  // 直接房间号 → 上海标准教室
  {
    pattern: /^(404|1101)$/,
    standardCity: "\u4E0A\u6D77",
    standardClassroom: "\u4E0A\u6D77$1",
    description: "\u4E0A\u6D77\u623F\u95F4\u53F7\u76F4\u63A5\u6620\u5C04\uFF08\u5982\uFF1A404 \u2192 \u4E0A\u6D77404\uFF09"
  },
  // 404教室 / 1101教室 → 上海标准教室
  {
    pattern: /^(404|1101)教室$/,
    standardCity: "\u4E0A\u6D77",
    standardClassroom: "\u4E0A\u6D77$1",
    description: "\u4E0A\u6D77\u6559\u5BA4\u540D\u79F0\u6620\u5C04\uFF08\u5982\uFF1A404\u6559\u5BA4 \u2192 \u4E0A\u6D77404\uFF09"
  },
  // 捕运大厦 → 上海办公楼
  {
    pattern: /^捕运大厦.*$/,
    standardCity: "\u4E0A\u6D77",
    standardClassroom: "\u4E0A\u6D77\u6355\u8FD0\u5927\u53A616D",
    description: "\u4E0A\u6D77\u529E\u516C\u697C\u6620\u5C04"
  }
];
var cityClassroomRules = [
  // 深圳
  {
    pattern: /^深圳(教室)?$/,
    standardCity: "\u6DF1\u5733",
    standardClassroom: "\u6DF1\u57331309",
    description: "\u6DF1\u5733\u6559\u5BA4\u6620\u5C04\uFF08\u6DF1\u5733/\u6DF1\u5733\u6559\u5BA4 \u2192 \u6DF1\u57331309\uFF09"
  },
  // 苏州
  {
    pattern: /^苏州(教室)?$/,
    standardCity: "\u82CF\u5DDE",
    standardClassroom: "\u82CF\u5DDE\u6559\u5BA4",
    description: "\u82CF\u5DDE\u6559\u5BA4\u6620\u5C04"
  },
  // 郑州
  {
    pattern: /^郑州(教室)?$/,
    standardCity: "\u90D1\u5DDE",
    standardClassroom: "\u90D1\u5DDE\u6559\u5BA4",
    description: "\u90D1\u5DDE\u6559\u5BA4\u6620\u5C04"
  },
  // 石家庄
  {
    pattern: /^石家庄(教室)?$/,
    standardCity: "\u77F3\u5BB6\u5E84",
    standardClassroom: "\u77F3\u5BB6\u5E84\u6559\u5BA4",
    description: "\u77F3\u5BB6\u5E84\u6559\u5BA4\u6620\u5C04"
  },
  // 宁波
  {
    pattern: /^宁波(教室)?$/,
    standardCity: "\u5B81\u6CE2",
    standardClassroom: "\u5B81\u6CE2\u6559\u5BA4",
    description: "\u5B81\u6CE2\u6559\u5BA4\u6620\u5C04"
  },
  // 济南
  {
    pattern: /^济南(教室)?$/,
    standardCity: "\u6D4E\u5357",
    standardClassroom: "\u6D4E\u5357\u6559\u5BA4",
    description: "\u6D4E\u5357\u6559\u5BA4\u6620\u5C04"
  },
  // 无锡
  {
    pattern: /^无锡(教室)?$/,
    standardCity: "\u65E0\u9521",
    standardClassroom: "\u65E0\u9521\u6559\u5BA4",
    description: "\u65E0\u9521\u6559\u5BA4\u6620\u5C04"
  },
  // 大连
  {
    pattern: /^大连(教室)?$/,
    standardCity: "\u5927\u8FDE",
    standardClassroom: "\u5927\u8FDE\u6559\u5BA4",
    description: "\u5927\u8FDE\u6559\u5BA4\u6620\u5C04"
  },
  // 太原
  {
    pattern: /^太原(教室)?$/,
    standardCity: "\u592A\u539F",
    standardClassroom: "\u592A\u539F\u6559\u5BA4",
    description: "\u592A\u539F\u6559\u5BA4\u6620\u5C04"
  },
  // 东莞
  {
    pattern: /^东莞(教室)?$/,
    standardCity: "\u4E1C\u839E",
    standardClassroom: "\u4E1C\u839E\u6559\u5BA4",
    description: "\u4E1C\u839E\u6559\u5BA4\u6620\u5C04"
  },
  // 南京
  {
    pattern: /^南京(教室)?$/,
    standardCity: "\u5357\u4EAC",
    standardClassroom: "\u5357\u4EAC\u6559\u5BA4",
    description: "\u5357\u4EAC\u6559\u5BA4\u6620\u5C04"
  },
  // 武汉
  {
    pattern: /^武汉(教室)?$/,
    standardCity: "\u6B66\u6C49",
    standardClassroom: "\u6B66\u6C49\u6559\u5BA4",
    description: "\u6B66\u6C49\u6559\u5BA4\u6620\u5C04"
  },
  // 天津
  {
    pattern: /^天津(1501|教室|场|上)?$|^\(天津\)$/,
    standardCity: "\u5929\u6D25",
    standardClassroom: "\u5929\u6D251501",
    description: "\u5929\u6D25\u6559\u5BA4\u6620\u5C04\uFF08\u5929\u6D25/\u5929\u6D25\u6559\u5BA4/\u5929\u6D251501/\u5929\u6D25\u573A/\u5929\u6D25\u4E0A/(\u5929\u6D25) \u2192 \u5929\u6D251501\uFF09"
  }
];
var allClassroomMappingRules = [
  ...shanghaiClassroomRules,
  ...cityClassroomRules
];
function standardizeClassroom(inputClassroom, inputCity) {
  if (!inputClassroom) return null;
  const trimmedInput = inputClassroom.trim();
  for (const rule of allClassroomMappingRules) {
    let matched = false;
    let standardClassroom = rule.standardClassroom;
    if (typeof rule.pattern === "string") {
      matched = trimmedInput === rule.pattern;
    } else {
      const match = trimmedInput.match(rule.pattern);
      if (match) {
        matched = true;
        standardClassroom = rule.standardClassroom.replace(/\$(\d+)/g, (_, num) => {
          return match[parseInt(num)] || "";
        });
      }
    }
    if (matched) {
      return {
        city: rule.standardCity,
        classroom: standardClassroom
      };
    }
  }
  if (inputCity && trimmedInput.startsWith(inputCity)) {
    return {
      city: inputCity,
      classroom: trimmedInput
    };
  }
  return null;
}

// server/teacherMappingRules.ts
init_db();
init_schema();
import { eq as eq18 } from "drizzle-orm";
var teacherAliasCache = null;
async function initTeacherAliasCache() {
  const database = await getDb();
  if (!database) {
    throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  }
  const allTeachers = await database.select({
    name: teachers.name,
    aliases: teachers.aliases
  }).from(teachers).where(eq18(teachers.isActive, true));
  teacherAliasCache = /* @__PURE__ */ new Map();
  for (const teacher of allTeachers) {
    const standardName = teacher.name;
    teacherAliasCache.set(standardName.toLowerCase(), standardName);
    if (teacher.aliases) {
      const aliases = teacher.aliases.split(",").map((a) => a.trim());
      for (const alias of aliases) {
        if (alias) {
          teacherAliasCache.set(alias.toLowerCase(), standardName);
        }
      }
    }
  }
}
async function standardizeTeacherName(teacherName) {
  if (!teacherName || !teacherName.trim()) {
    return null;
  }
  if (!teacherAliasCache) {
    await initTeacherAliasCache();
  }
  const normalized = teacherName.trim().toLowerCase();
  const standardName = teacherAliasCache.get(normalized);
  return standardName || null;
}

// server/cityMappingRules.ts
init_db();
init_schema();
var cityNamesCache = null;
async function initCityNamesCache() {
  const database = await getDb();
  if (!database) {
    throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  }
  const allCities = await database.select({
    name: cities.name
  }).from(cities);
  cityNamesCache = new Set(allCities.map((c) => c.name));
}
var cityAliasRules = [
  // 北京
  {
    pattern: /^(北京|BJ|bj|beijing)$/i,
    standardCity: "\u5317\u4EAC",
    description: "\u5317\u4EAC\u7B80\u79F0\u6620\u5C04"
  },
  // 上海
  {
    pattern: /^(上海|SH|sh|shanghai)$/i,
    standardCity: "\u4E0A\u6D77",
    description: "\u4E0A\u6D77\u7B80\u79F0\u6620\u5C04"
  },
  // 深圳
  {
    pattern: /^(深圳|SZ|sz|shenzhen)$/i,
    standardCity: "\u6DF1\u5733",
    description: "\u6DF1\u5733\u7B80\u79F0\u6620\u5C04"
  },
  // 广州
  {
    pattern: /^(广州|GZ|gz|guangzhou)$/i,
    standardCity: "\u5E7F\u5DDE",
    description: "\u5E7F\u5DDE\u7B80\u79F0\u6620\u5C04"
  },
  // 杭州
  {
    pattern: /^(杭州|HZ|hz|hangzhou)$/i,
    standardCity: "\u676D\u5DDE",
    description: "\u676D\u5DDE\u7B80\u79F0\u6620\u5C04"
  },
  // 成都
  {
    pattern: /^(成都|CD|cd|chengdu)$/i,
    standardCity: "\u6210\u90FD",
    description: "\u6210\u90FD\u7B80\u79F0\u6620\u5C04"
  },
  // 武汉
  {
    pattern: /^(武汉|WH|wh|wuhan)$/i,
    standardCity: "\u6B66\u6C49",
    description: "\u6B66\u6C49\u7B80\u79F0\u6620\u5C04"
  },
  // 西安
  {
    pattern: /^(西安|XA|xa|xian)$/i,
    standardCity: "\u897F\u5B89",
    description: "\u897F\u5B89\u7B80\u79F0\u6620\u5C04"
  },
  // 南京
  {
    pattern: /^(南京|NJ|nj|nanjing)$/i,
    standardCity: "\u5357\u4EAC",
    description: "\u5357\u4EAC\u7B80\u79F0\u6620\u5C04"
  },
  // 天津
  {
    pattern: /^(天津|TJ|tj|tianjin)$/i,
    standardCity: "\u5929\u6D25",
    description: "\u5929\u6D25\u7B80\u79F0\u6620\u5C04"
  },
  // 重庆
  {
    pattern: /^(重庆|CQ|cq|chongqing)$/i,
    standardCity: "\u91CD\u5E86",
    description: "\u91CD\u5E86\u7B80\u79F0\u6620\u5C04"
  },
  // 苏州
  {
    pattern: /^(苏州|SZ|sz|suzhou)$/i,
    standardCity: "\u82CF\u5DDE",
    description: "\u82CF\u5DDE\u7B80\u79F0\u6620\u5C04"
  },
  // 郑州
  {
    pattern: /^(郑州|ZZ|zz|zhengzhou)$/i,
    standardCity: "\u90D1\u5DDE",
    description: "\u90D1\u5DDE\u7B80\u79F0\u6620\u5C04"
  },
  // 石家庄
  {
    pattern: /^(石家庄|SJZ|sjz|shijiazhuang)$/i,
    standardCity: "\u77F3\u5BB6\u5E84",
    description: "\u77F3\u5BB6\u5E84\u7B80\u79F0\u6620\u5C04"
  },
  // 宁波
  {
    pattern: /^(宁波|NB|nb|ningbo)$/i,
    standardCity: "\u5B81\u6CE2",
    description: "\u5B81\u6CE2\u7B80\u79F0\u6620\u5C04"
  },
  // 济南
  {
    pattern: /^(济南|JN|jn|jinan)$/i,
    standardCity: "\u6D4E\u5357",
    description: "\u6D4E\u5357\u7B80\u79F0\u6620\u5C04"
  }
];
async function standardizeCityName(cityName) {
  if (!cityName || !cityName.trim()) {
    return null;
  }
  if (!cityNamesCache) {
    await initCityNamesCache();
  }
  const trimmed = cityName.trim();
  if (cityNamesCache.has(trimmed)) {
    return trimmed;
  }
  for (const rule of cityAliasRules) {
    if (typeof rule.pattern === "string") {
      if (trimmed === rule.pattern) {
        if (cityNamesCache.has(rule.standardCity)) {
          return rule.standardCity;
        }
      }
    } else {
      if (rule.pattern.test(trimmed)) {
        if (cityNamesCache.has(rule.standardCity)) {
          return rule.standardCity;
        }
      }
    }
  }
  return null;
}

// server/dataCleaningRouter.ts
import { TRPCError as TRPCError19 } from "@trpc/server";
var dataCleaningRouter = router({
  /**
   * 扫描需要清洗的订单
   * 返回所有deliveryRoom、deliveryTeacher、deliveryCity字段不符合标准的订单列表
   */
  scanOrders: protectedProcedure.query(async () => {
    const database = await getDb();
    if (!database) {
      throw new TRPCError19({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    const allOrders = await database.select({
      id: orders.id,
      orderNo: orders.orderNo,
      deliveryCity: orders.deliveryCity,
      deliveryRoom: orders.deliveryRoom,
      deliveryTeacher: orders.deliveryTeacher,
      classDate: orders.classDate,
      customerName: orders.customerName
    }).from(orders).orderBy(orders.id);
    const ordersToClean = [];
    for (const order of allOrders) {
      let needsCleaning = false;
      let standardizedCity = order.deliveryCity;
      let standardizedRoom = order.deliveryRoom;
      let standardizedTeacher = order.deliveryTeacher;
      if (order.deliveryRoom) {
        const classroomStandardized = standardizeClassroom(
          order.deliveryRoom,
          order.deliveryCity || void 0
        );
        if (classroomStandardized) {
          if (classroomStandardized.classroom !== order.deliveryRoom || classroomStandardized.city !== order.deliveryCity) {
            needsCleaning = true;
            standardizedCity = classroomStandardized.city;
            standardizedRoom = classroomStandardized.classroom;
          }
        }
      } else if (order.deliveryCity && (!order.deliveryRoom || order.deliveryRoom.trim() === "")) {
        try {
          const cityClassrooms = await database.select({ name: classrooms.name }).from(classrooms).where(
            and14(
              eq19(classrooms.cityName, order.deliveryCity),
              eq19(classrooms.isActive, true)
            )
          );
          if (cityClassrooms.length === 1) {
            needsCleaning = true;
            standardizedRoom = cityClassrooms[0].name;
          }
        } catch (classroomError) {
          console.error(`[\u626B\u63CF] \u8BA2\u5355${order.id}\u67E5\u8BE2\u6559\u5BA4\u5931\u8D25:`, classroomError);
        }
      }
      if (order.deliveryTeacher) {
        const teacherStandardized = await standardizeTeacherName(order.deliveryTeacher);
        if (teacherStandardized && teacherStandardized !== order.deliveryTeacher) {
          needsCleaning = true;
          standardizedTeacher = teacherStandardized;
        }
      }
      if (standardizedCity) {
        const cityStandardized = await standardizeCityName(standardizedCity);
        if (cityStandardized && cityStandardized !== standardizedCity) {
          needsCleaning = true;
          standardizedCity = cityStandardized;
        }
      }
      if (needsCleaning) {
        ordersToClean.push({
          id: order.id,
          orderNo: order.orderNo || `ORD${order.id}`,
          originalCity: order.deliveryCity,
          originalRoom: order.deliveryRoom,
          originalTeacher: order.deliveryTeacher,
          standardizedCity,
          standardizedRoom,
          standardizedTeacher,
          classDate: order.classDate,
          customerName: order.customerName
        });
      }
    }
    return {
      total: ordersToClean.length,
      orders: ordersToClean
    };
  }),
  /**
   * 批量清洗订单数据
   * 执行数据清洗并更新数据库
   */
  cleanOrders: protectedProcedure.input(
    z23.object({
      orderIds: z23.array(z23.number()).min(1, "\u81F3\u5C11\u9009\u62E9\u4E00\u4E2A\u8BA2\u5355")
    })
  ).mutation(async ({ input }) => {
    const database = await getDb();
    if (!database) {
      throw new TRPCError19({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    const { orderIds } = input;
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    console.log(`[\u6570\u636E\u6E05\u6D17] \u5F00\u59CB\u6E05\u6D17${orderIds.length}\u4E2A\u8BA2\u5355...`);
    for (const orderId of orderIds) {
      try {
        console.log(`[\u6570\u636E\u6E05\u6D17] \u5904\u7406\u8BA2\u5355ID: ${orderId}`);
        const [order] = await database.select({
          id: orders.id,
          deliveryCity: orders.deliveryCity,
          deliveryRoom: orders.deliveryRoom,
          deliveryTeacher: orders.deliveryTeacher
        }).from(orders).where(eq19(orders.id, orderId)).limit(1);
        if (!order) {
          failCount++;
          errors.push({ orderId, error: "\u8BA2\u5355\u4E0D\u5B58\u5728" });
          continue;
        }
        const updateData = {};
        if (order.deliveryRoom) {
          const classroomStandardized = standardizeClassroom(
            order.deliveryRoom,
            order.deliveryCity || void 0
          );
          if (classroomStandardized) {
            if (classroomStandardized.classroom !== order.deliveryRoom || classroomStandardized.city !== order.deliveryCity) {
              updateData.deliveryCity = classroomStandardized.city;
              updateData.deliveryRoom = classroomStandardized.classroom;
            }
          }
        } else if (order.deliveryCity && (!order.deliveryRoom || order.deliveryRoom.trim() === "")) {
          try {
            const cityClassrooms = await database.select({ name: classrooms.name }).from(classrooms).where(
              and14(
                eq19(classrooms.cityName, order.deliveryCity),
                eq19(classrooms.isActive, true)
              )
            );
            if (cityClassrooms.length === 1) {
              updateData.deliveryRoom = cityClassrooms[0].name;
              console.log(`[\u667A\u80FD\u586B\u5145] \u8BA2\u5355${orderId} \u57CE\u5E02${order.deliveryCity}\u53EA\u6709\u4E00\u4E2A\u6559\u5BA4\uFF0C\u81EA\u52A8\u586B\u5145: ${cityClassrooms[0].name}`);
            }
          } catch (classroomError) {
            console.error(`[\u667A\u80FD\u586B\u5145] \u8BA2\u5355${orderId}\u67E5\u8BE2\u6559\u5BA4\u5931\u8D25:`, classroomError);
          }
        }
        if (order.deliveryTeacher) {
          const teacherStandardized = await standardizeTeacherName(order.deliveryTeacher);
          if (teacherStandardized && teacherStandardized !== order.deliveryTeacher) {
            updateData.deliveryTeacher = teacherStandardized;
          }
        }
        if (updateData.deliveryCity) {
          const cityStandardized = await standardizeCityName(updateData.deliveryCity);
          if (cityStandardized && cityStandardized !== updateData.deliveryCity) {
            updateData.deliveryCity = cityStandardized;
          }
        }
        if (Object.keys(updateData).length === 0) {
          failCount++;
          errors.push({ orderId, error: "\u6CA1\u6709\u9700\u8981\u6E05\u6D17\u7684\u5B57\u6BB5" });
          continue;
        }
        updateData.updatedAt = /* @__PURE__ */ new Date();
        await database.update(orders).set(updateData).where(eq19(orders.id, orderId));
        successCount++;
        console.log(
          `[\u6570\u636E\u6E05\u6D17] \u8BA2\u5355${orderId} \u6E05\u6D17\u6210\u529F:`,
          updateData
        );
      } catch (error) {
        failCount++;
        const errorMsg = error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF";
        errors.push({
          orderId,
          error: errorMsg
        });
        console.error(`[\u6570\u636E\u6E05\u6D17] \u8BA2\u5355${orderId}\u6E05\u6D17\u5931\u8D25:`, error);
        console.error(`[\u6570\u636E\u6E05\u6D17] \u9519\u8BEF\u5806\u6808:`, error instanceof Error ? error.stack : "N/A");
      }
    }
    console.log(`[\u6570\u636E\u6E05\u6D17] \u6E05\u6D17\u5B8C\u6210: \u6210\u529F${successCount}\u4E2A\uFF0C\u5931\u8D25${failCount}\u4E2A`);
    const result = {
      success: true,
      successCount,
      failCount,
      errors,
      message: `\u6210\u529F\u6E05\u6D17${successCount}\u4E2A\u8BA2\u5355${failCount > 0 ? `\uFF0C\u5931\u8D25${failCount}\u4E2A` : ""}`
    };
    console.log(`[\u6570\u636E\u6E05\u6D17] \u8FD4\u56DE\u7ED3\u679C:`, JSON.stringify(result, null, 2));
    return result;
  }),
  /**
   * 预览单个订单的清洗结果
   */
  previewClean: protectedProcedure.input(z23.object({ orderId: z23.number() })).query(async ({ input }) => {
    const database = await getDb();
    if (!database) {
      throw new TRPCError19({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    const { orderId } = input;
    const [order] = await database.select({
      id: orders.id,
      orderNo: orders.orderNo,
      deliveryCity: orders.deliveryCity,
      deliveryRoom: orders.deliveryRoom
    }).from(orders).where(eq19(orders.id, orderId)).limit(1);
    if (!order) {
      throw new TRPCError19({
        code: "NOT_FOUND",
        message: "\u8BA2\u5355\u4E0D\u5B58\u5728"
      });
    }
    if (!order.deliveryRoom) {
      throw new TRPCError19({
        code: "BAD_REQUEST",
        message: "\u8BA2\u5355\u6CA1\u6709\u6559\u5BA4\u4FE1\u606F"
      });
    }
    const standardized = standardizeClassroom(
      order.deliveryRoom,
      order.deliveryCity || void 0
    );
    if (!standardized) {
      throw new TRPCError19({
        code: "BAD_REQUEST",
        message: "\u65E0\u6CD5\u6807\u51C6\u5316\u6559\u5BA4\u540D\u79F0"
      });
    }
    return {
      orderId: order.id,
      orderNo: order.orderNo || `ORD${order.id}`,
      original: {
        city: order.deliveryCity,
        room: order.deliveryRoom
      },
      standardized: {
        city: standardized.city,
        room: standardized.classroom
      },
      needsCleaning: standardized.classroom !== order.deliveryRoom || standardized.city !== order.deliveryCity
    };
  })
});

// server/membershipRouter.ts
init_trpc();
init_db();
init_schema();
import { z as z24 } from "zod";
import { eq as eq20, desc as desc6, and as and15 } from "drizzle-orm";
import { TRPCError as TRPCError20 } from "@trpc/server";
var MEMBERSHIP_CACHE_TTL_MS = 5 * 60 * 1e3;
var membershipStatusCache = /* @__PURE__ */ new Map();
function invalidateMembershipCache(userId) {
  membershipStatusCache.delete(userId);
}
function generateMembershipOrderNo() {
  const timestamp2 = Date.now().toString();
  const random = Math.floor(Math.random() * 1e4).toString().padStart(4, "0");
  return `MEM${timestamp2}${random}`;
}
async function activateMembership(orderId, channelOrderNo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [order] = await db.select().from(membershipOrders).where(eq20(membershipOrders.id, orderId)).limit(1);
  if (!order) throw new Error("Order not found");
  if (order.status === "paid") return;
  const now = /* @__PURE__ */ new Date();
  const [user] = await db.select().from(users).where(eq20(users.id, order.userId)).limit(1);
  if (!user) throw new Error("User not found");
  const [plan] = await db.select().from(membershipPlans).where(eq20(membershipPlans.id, order.planId)).limit(1);
  if (!plan) throw new Error("Plan not found");
  let activatedAt = now;
  let expiresAt;
  if (user.membershipStatus === "active" && user.membershipExpiresAt && user.membershipExpiresAt > now) {
    expiresAt = new Date(
      user.membershipExpiresAt.getTime() + plan.duration * 24 * 60 * 60 * 1e3
    );
    activatedAt = user.membershipActivatedAt || now;
  } else {
    expiresAt = new Date(now.getTime() + plan.duration * 24 * 60 * 60 * 1e3);
  }
  await db.update(membershipOrders).set({
    status: "paid",
    paymentDate: now,
    channelOrderNo: channelOrderNo || null,
    activatedAt,
    expiresAt,
    updatedAt: now
  }).where(eq20(membershipOrders.id, orderId));
  await db.update(users).set({
    membershipStatus: "active",
    isMember: true,
    membershipOrderId: orderId,
    membershipActivatedAt: activatedAt,
    membershipExpiresAt: expiresAt,
    updatedAt: now
  }).where(eq20(users.id, order.userId));
  invalidateMembershipCache(order.userId);
}
var membershipRouter = router({
  // ========== 查询会员套餐列表（公开）==========
  listPlans: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { plans: [] };
    const plans = await db.select().from(membershipPlans).where(eq20(membershipPlans.isActive, true)).orderBy(membershipPlans.sortOrder);
    return {
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        duration: p.duration,
        price: Number(p.price),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
        benefits: p.benefits || [],
        sortOrder: p.sortOrder
      }))
    };
  }),
  // ========== 查询当前用户会员状态 ==========
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const cached = membershipStatusCache.get(ctx.user.id);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const db = await getDb();
    if (!db) throw new TRPCError20({ code: "INTERNAL_SERVER_ERROR" });
    const [user] = await db.select().from(users).where(eq20(users.id, ctx.user.id)).limit(1);
    if (!user) throw new TRPCError20({ code: "NOT_FOUND" });
    ;
    const now = /* @__PURE__ */ new Date();
    let membershipStatus = user.membershipStatus;
    if (membershipStatus === "active" && user.membershipExpiresAt && user.membershipExpiresAt < now) {
      membershipStatus = "expired";
      await db.update(users).set({ membershipStatus: "expired", isMember: false, updatedAt: now }).where(eq20(users.id, user.id));
    }
    const daysRemaining = membershipStatus === "active" && user.membershipExpiresAt ? Math.max(
      0,
      Math.ceil(
        (user.membershipExpiresAt.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)
      )
    ) : null;
    let currentPlan = null;
    if (user.membershipOrderId) {
      const [order] = await db.select({ planId: membershipOrders.planId }).from(membershipOrders).where(eq20(membershipOrders.id, user.membershipOrderId)).limit(1);
      if (order) {
        const [plan] = await db.select().from(membershipPlans).where(eq20(membershipPlans.id, order.planId)).limit(1);
        if (plan) {
          currentPlan = {
            id: plan.id,
            name: plan.name,
            benefits: plan.benefits || []
          };
        }
      }
    }
    let accountBalance = 0;
    const [customer] = await db.select({ accountBalance: customers.accountBalance }).from(customers).where(eq20(customers.userId, user.id)).limit(1);
    if (customer?.accountBalance) {
      accountBalance = parseFloat(String(customer.accountBalance));
    }
    const result = {
      isMember: membershipStatus === "active",
      membershipStatus,
      activatedAt: user.membershipActivatedAt?.toISOString() || null,
      expiresAt: user.membershipExpiresAt?.toISOString() || null,
      daysRemaining,
      currentPlan,
      accountBalance
    };
    membershipStatusCache.set(ctx.user.id, {
      data: result,
      expiresAt: Date.now() + MEMBERSHIP_CACHE_TTL_MS
    });
    return result;
  }),
  // ========== 创建会员订单 ===========
  createOrder: protectedProcedure.input(z24.object({ planId: z24.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError20({ code: "INTERNAL_SERVER_ERROR" });
    const [plan] = await db.select().from(membershipPlans).where(
      and15(
        eq20(membershipPlans.id, input.planId),
        eq20(membershipPlans.isActive, true)
      )
    ).limit(1);
    if (!plan) {
      throw new TRPCError20({ code: "NOT_FOUND", message: "\u5957\u9910\u4E0D\u5B58\u5728\u6216\u5DF2\u4E0B\u67B6" });
    }
    const orderNo = generateMembershipOrderNo();
    const now = /* @__PURE__ */ new Date();
    const [result] = await db.insert(membershipOrders).values({
      orderNo,
      userId: ctx.user.id,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      status: "pending",
      createdAt: now,
      updatedAt: now
    });
    return {
      orderId: result.insertId,
      orderNo,
      amount: Number(plan.price),
      planName: plan.name,
      planId: plan.id,
      duration: plan.duration
    };
  }),
  // ========== 预下单（获取支付参数）==========
  prepay: protectedProcedure.input(
    z24.object({
      orderId: z24.number(),
      paymentChannel: z24.enum(["wechat", "alipay", "balance"])
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError20({ code: "INTERNAL_SERVER_ERROR" });
    const [order] = await db.select().from(membershipOrders).where(
      and15(
        eq20(membershipOrders.id, input.orderId),
        eq20(membershipOrders.userId, ctx.user.id)
      )
    ).limit(1);
    if (!order) {
      throw new TRPCError20({ code: "NOT_FOUND", message: "\u8BA2\u5355\u4E0D\u5B58\u5728" });
    }
    if (order.status !== "pending") {
      throw new TRPCError20({
        code: "BAD_REQUEST",
        message: `\u8BA2\u5355\u72B6\u6001\u5F02\u5E38\uFF1A${order.status}`
      });
    }
    await db.update(membershipOrders).set({ paymentChannel: input.paymentChannel, updatedAt: /* @__PURE__ */ new Date() }).where(eq20(membershipOrders.id, input.orderId));
    if (input.paymentChannel === "balance") {
      await activateMembership(input.orderId, `BALANCE_${Date.now()}`);
      return {
        channel: "balance",
        success: true,
        message: "\u652F\u4ED8\u6210\u529F\uFF0C\u4F1A\u5458\u5DF2\u6FC0\u6D3B"
      };
    }
    if (input.paymentChannel === "wechat") {
      return {
        channel: "wechat",
        mwebUrl: `https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb?prepay_id=mock_${order.orderNo}&package=1234567890`,
        orderNo: order.orderNo
      };
    }
    if (input.paymentChannel === "alipay") {
      return {
        channel: "alipay",
        formHtml: `<form id="alipayForm" action="https://openapi.alipay.com/gateway.do" method="post"><input type="hidden" name="biz_content" value='{"out_trade_no":"${order.orderNo}"}'></form><script>document.getElementById('alipayForm').submit();</script>`,
        orderNo: order.orderNo
      };
    }
    throw new TRPCError20({ code: "BAD_REQUEST", message: "\u4E0D\u652F\u6301\u7684\u652F\u4ED8\u6E20\u9053" });
  }),
  // ========== 查询订单状态（前端轮询用）==========
  getOrderStatus: protectedProcedure.input(z24.object({ orderId: z24.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError20({ code: "INTERNAL_SERVER_ERROR" });
    const [order] = await db.select().from(membershipOrders).where(
      and15(
        eq20(membershipOrders.id, input.orderId),
        eq20(membershipOrders.userId, ctx.user.id)
      )
    ).limit(1);
    if (!order) {
      throw new TRPCError20({ code: "NOT_FOUND", message: "\u8BA2\u5355\u4E0D\u5B58\u5728" });
    }
    return {
      status: order.status,
      paymentDate: order.paymentDate?.toISOString() || null,
      activatedAt: order.activatedAt?.toISOString() || null,
      expiresAt: order.expiresAt?.toISOString() || null
    };
  }),
  // ========== 取消订单 ==========
  cancelOrder: protectedProcedure.input(z24.object({ orderId: z24.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError20({ code: "INTERNAL_SERVER_ERROR" });
    const [order] = await db.select().from(membershipOrders).where(
      and15(
        eq20(membershipOrders.id, input.orderId),
        eq20(membershipOrders.userId, ctx.user.id)
      )
    ).limit(1);
    if (!order) {
      throw new TRPCError20({ code: "NOT_FOUND", message: "\u8BA2\u5355\u4E0D\u5B58\u5728" });
    }
    if (order.status !== "pending") {
      throw new TRPCError20({
        code: "BAD_REQUEST",
        message: "\u53EA\u80FD\u53D6\u6D88\u5F85\u652F\u4ED8\u7684\u8BA2\u5355"
      });
    }
    await db.update(membershipOrders).set({ status: "cancelled", updatedAt: /* @__PURE__ */ new Date() }).where(eq20(membershipOrders.id, input.orderId));
    return { success: true };
  }),
  // ========== 查询用户自己的订单列表 ==========
  listOrders: protectedProcedure.input(
    z24.object({
      page: z24.number().default(1),
      pageSize: z24.number().default(10),
      status: z24.enum(["pending", "paid", "cancelled", "refunded"]).optional()
    })
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { orders: [], total: 0, page: 1, pageSize: 10 };
    const conditions = [
      eq20(membershipOrders.userId, ctx.user.id)
    ];
    if (input.status) {
      conditions.push(eq20(membershipOrders.status, input.status));
    }
    const allOrders = await db.select().from(membershipOrders).where(and15(...conditions)).orderBy(desc6(membershipOrders.createdAt));
    const total = allOrders.length;
    const offset = (input.page - 1) * input.pageSize;
    const paged = allOrders.slice(offset, offset + input.pageSize);
    return {
      orders: paged.map((o) => ({
        id: o.id,
        orderNo: o.orderNo,
        planName: o.planName,
        amount: Number(o.amount),
        status: o.status,
        paymentChannel: o.paymentChannel,
        paymentDate: o.paymentDate?.toISOString() || null,
        activatedAt: o.activatedAt?.toISOString() || null,
        expiresAt: o.expiresAt?.toISOString() || null,
        createdAt: o.createdAt.toISOString()
      })),
      total,
      page: input.page,
      pageSize: input.pageSize
    };
  }),
  // ========== 管理员：查询所有会员订单 ==========
  adminListOrders: protectedProcedure.input(
    z24.object({
      page: z24.number().default(1),
      pageSize: z24.number().default(20),
      status: z24.enum(["pending", "paid", "cancelled", "refunded"]).optional()
    })
  ).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError20({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) return { orders: [], total: 0, page: 1, pageSize: 20 };
    const conditions = [];
    if (input.status) {
      conditions.push(eq20(membershipOrders.status, input.status));
    }
    const allOrders = await db.select({
      id: membershipOrders.id,
      orderNo: membershipOrders.orderNo,
      userId: membershipOrders.userId,
      planName: membershipOrders.planName,
      amount: membershipOrders.amount,
      status: membershipOrders.status,
      paymentChannel: membershipOrders.paymentChannel,
      paymentDate: membershipOrders.paymentDate,
      activatedAt: membershipOrders.activatedAt,
      expiresAt: membershipOrders.expiresAt,
      createdAt: membershipOrders.createdAt,
      userName: users.name,
      userPhone: users.phone
    }).from(membershipOrders).leftJoin(users, eq20(membershipOrders.userId, users.id)).where(conditions.length > 0 ? and15(...conditions) : void 0).orderBy(desc6(membershipOrders.createdAt));
    const total = allOrders.length;
    const offset = (input.page - 1) * input.pageSize;
    const paged = allOrders.slice(offset, offset + input.pageSize);
    return {
      orders: paged.map((o) => ({
        id: o.id,
        orderNo: o.orderNo,
        userId: o.userId,
        userName: o.userName || "\u672A\u77E5",
        userPhone: o.userPhone || "",
        planName: o.planName,
        amount: Number(o.amount),
        status: o.status,
        paymentChannel: o.paymentChannel,
        paymentDate: o.paymentDate?.toISOString() || null,
        activatedAt: o.activatedAt?.toISOString() || null,
        expiresAt: o.expiresAt?.toISOString() || null,
        createdAt: o.createdAt.toISOString()
      })),
      total,
      page: input.page,
      pageSize: input.pageSize
    };
  }),
  // ========== 管理员：手动激活会员 ==========
  adminActivate: protectedProcedure.input(z24.object({ orderId: z24.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError20({ code: "FORBIDDEN" });
    }
    await activateMembership(input.orderId);
    return { success: true };
  }),
  // ========== 创建充値订单 ==========
  createRechargeOrder: protectedProcedure.input(
    z24.object({
      amount: z24.number().min(1).max(1e4),
      paymentChannel: z24.enum(["wechat", "alipay"])
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError20({ code: "INTERNAL_SERVER_ERROR" });
    const orderNo = `RCH${Date.now()}${Math.floor(Math.random() * 1e3).toString().padStart(3, "0")}`;
    const now = /* @__PURE__ */ new Date();
    const [result] = await db.insert(membershipOrders).values({
      orderNo,
      userId: ctx.user.id,
      planId: 0,
      // 0 表示充値订单
      planName: `RECHARGE_${input.amount}`,
      // 特殊标识
      amount: input.amount.toFixed(2),
      status: "pending",
      paymentChannel: input.paymentChannel,
      createdAt: now,
      updatedAt: now
    });
    const orderId = result.insertId;
    if (input.paymentChannel === "wechat") {
      return {
        channel: "wechat",
        orderId,
        orderNo,
        amount: input.amount,
        // TODO: 接入真实微信支付H5 API
        mwebUrl: `https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb?prepay_id=mock_${orderNo}&package=1234567890`
      };
    }
    if (input.paymentChannel === "alipay") {
      return {
        channel: "alipay",
        orderId,
        orderNo,
        amount: input.amount,
        // TODO: 接入真实支付宝H5 API
        formHtml: `<form id="alipayForm" action="https://openapi.alipay.com/gateway.do" method="post"><input type="hidden" name="biz_content" value='{"out_trade_no":"${orderNo}","total_amount":"${input.amount}"}'></form><script>document.getElementById('alipayForm').submit();</script>`
      };
    }
    throw new TRPCError20({ code: "BAD_REQUEST", message: "\u4E0D\u652F\u6301\u7684\u652F\u4ED8\u6E20\u9053" });
  }),
  // ========== 查询充値订单状态 ==========
  getRechargeOrderStatus: protectedProcedure.input(z24.object({ orderId: z24.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError20({ code: "INTERNAL_SERVER_ERROR" });
    const [order] = await db.select().from(membershipOrders).where(
      and15(
        eq20(membershipOrders.id, input.orderId),
        eq20(membershipOrders.userId, ctx.user.id)
      )
    ).limit(1);
    if (!order) throw new TRPCError20({ code: "NOT_FOUND", message: "\u8BA2\u5355\u4E0D\u5B58\u5728" });
    return {
      status: order.status,
      amount: Number(order.amount),
      paymentDate: order.paymentDate?.toISOString() || null
    };
  }),
  // ========== 模拟充値完成（开发测试用）==========
  // 生产环境应由支付回调触发，这里仅供测试
  confirmRecharge: protectedProcedure.input(z24.object({ orderId: z24.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError20({ code: "INTERNAL_SERVER_ERROR" });
    const [order] = await db.select().from(membershipOrders).where(
      and15(
        eq20(membershipOrders.id, input.orderId),
        eq20(membershipOrders.userId, ctx.user.id)
      )
    ).limit(1);
    if (!order) throw new TRPCError20({ code: "NOT_FOUND", message: "\u8BA2\u5355\u4E0D\u5B58\u5728" });
    if (order.status === "paid") return { success: true, message: "\u5DF2\u5145\u5024\u6210\u529F" };
    if (order.status !== "pending") throw new TRPCError20({ code: "BAD_REQUEST", message: "\u8BA2\u5355\u72B6\u6001\u5F02\u5E38" });
    const rechargeAmount = Number(order.amount);
    const now = /* @__PURE__ */ new Date();
    await db.update(membershipOrders).set({ status: "paid", paymentDate: now, updatedAt: now }).where(eq20(membershipOrders.id, input.orderId));
    const [customer] = await db.select({ id: customers.id, accountBalance: customers.accountBalance }).from(customers).where(eq20(customers.userId, ctx.user.id)).limit(1);
    if (customer) {
      const currentBalance = parseFloat(String(customer.accountBalance || 0));
      const newBalance = currentBalance + rechargeAmount;
      await db.update(customers).set({ accountBalance: newBalance.toFixed(2), updatedAt: now }).where(eq20(customers.id, customer.id));
    } else {
      console.log(`[recharge] User ${ctx.user.id} recharged ${rechargeAmount} but no customer record found`);
    }
    return { success: true, message: `\u5145\u5024 \xA5${rechargeAmount.toFixed(2)} \u6210\u529F` };
  }),
  // ========== 管理员：管理套餐 ==========
  adminUpsertPlan: protectedProcedure.input(
    z24.object({
      id: z24.number().optional(),
      name: z24.string().min(1),
      description: z24.string().optional(),
      duration: z24.number().min(1),
      price: z24.number().min(0),
      originalPrice: z24.number().optional(),
      benefits: z24.array(z24.string()).optional(),
      isActive: z24.boolean().default(true),
      sortOrder: z24.number().default(0)
    })
  ).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError20({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError20({ code: "INTERNAL_SERVER_ERROR" });
    const data = {
      name: input.name,
      description: input.description || null,
      duration: input.duration,
      price: input.price.toFixed(2),
      originalPrice: input.originalPrice?.toFixed(2) || null,
      benefits: JSON.stringify(input.benefits || []),
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (input.id) {
      await db.update(membershipPlans).set(data).where(eq20(membershipPlans.id, input.id));
      return { id: input.id };
    } else {
      const [result] = await db.insert(membershipPlans).values({
        ...data,
        createdAt: /* @__PURE__ */ new Date()
      });
      return { id: result.insertId };
    }
  })
});

// server/apiDiscoveryRouter.ts
init_trpc();
var apiDiscoveryRouter = router({
  /**
   * Get backend API configuration
   * 
   * Returns the current backend URL and API endpoints that external apps should use.
   * This endpoint is public and doesn't require authentication.
   * 
   * Usage example (from App):
   * ```typescript
   * const response = await fetch('https://crm.bdsm.com.cn/api/discovery/config');
   * const config = await response.json();
   * // Use config.baseUrl for all subsequent API calls
   * ```
   */
  getConfig: publicProcedure.query(async ({ ctx }) => {
    const host = ctx.req.headers.host || "localhost:3000";
    const protocol = ctx.req.headers["x-forwarded-proto"] || ctx.req.connection.encrypted ? "https" : "http";
    let baseUrl;
    if (process.env.NODE_ENV === "production") {
      baseUrl = `${protocol}://${host.split(":")[0]}`;
    } else {
      baseUrl = `${protocol}://${host}`;
    }
    return {
      baseUrl,
      apiEndpoint: `${baseUrl}/api/trpc`,
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
      endpoints: {
        trpc: "/api/trpc",
        oauth: "/api/oauth",
        discovery: "/api/discovery"
      },
      cors: {
        enabled: true,
        allowedOrigins: [
          "*.manus.computer",
          "*.manus-asia.computer",
          "*.manuspre.computer",
          "*.manuscomputer.ai",
          "*.manusvm.computer",
          "localhost"
        ]
      }
    };
  }),
  /**
   * Health check endpoint
   * 
   * Simple endpoint to check if the backend is running and accessible.
   */
  health: publicProcedure.query(() => {
    return {
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  })
});

// server/schedulesRouter.ts
init_trpc();
init_db();
init_schema();
import { z as z25 } from "zod";
import { TRPCError as TRPCError21 } from "@trpc/server";
import { eq as eq21, and as and16, or as or5, sql as sql9, inArray as inArray3 } from "drizzle-orm";
var schedulesRouter = router({
  /**
   * 获取老师排班可用性
   * 老师端接口：强制使用JWT中的userId，忽略前端传入的teacherId
   */
  getTeacherAvailability: protectedProcedure.input(
    z25.object({
      teacherId: z25.number().optional(),
      // 忽略此参数
      startDate: z25.string().optional(),
      endDate: z25.string().optional()
    }).optional()
  ).query(async ({ ctx, input }) => {
    if (!ctx.user.roles.includes("teacher")) {
      throw new TRPCError21({
        code: "FORBIDDEN",
        message: "Only teachers can access this endpoint"
      });
    }
    const teacherId = ctx.user.id;
    console.log("[schedules.getTeacherAvailability] Teacher ID:", teacherId);
    console.log("[schedules.getTeacherAvailability] Date range:", input?.startDate, "-", input?.endDate);
    return {
      teacherId,
      teacherName: ctx.user.name,
      availability: [
        {
          date: "2026-02-24",
          timeSlots: [
            { start: "09:00", end: "10:00", available: true },
            { start: "09:30", end: "10:30", available: true },
            { start: "10:00", end: "11:00", available: true },
            { start: "14:00", end: "15:00", available: false },
            { start: "15:00", end: "16:00", available: true }
          ]
        },
        {
          date: "2026-02-25",
          timeSlots: [
            { start: "09:00", end: "10:00", available: true },
            { start: "10:00", end: "11:00", available: false },
            { start: "14:00", end: "15:00", available: true },
            { start: "15:00", end: "16:00", available: true }
          ]
        }
      ]
    };
  }),
  /**
   * 获取指定城市和日期的可用时间段
   * 前端选择时间阶段调用此接口，过滤掉教室已满或无可用老师的时间段
   */
  getAvailableTimeSlots: publicProcedure.input(z25.object({
    cityId: z25.number().int().positive(),
    date: z25.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    // YYYY-MM-DD
  })).query(async ({ input }) => {
    const { cityId, date: date2 } = input;
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const now = /* @__PURE__ */ new Date();
    const minTime = new Date(now.getTime() + 2 * 60 * 60 * 1e3);
    const minHour = minTime.getHours();
    const minMinute = minTime.getMinutes();
    let startHour = minHour;
    let startMinute = minMinute <= 0 ? 0 : minMinute <= 30 ? 30 : 0;
    if (minMinute > 30) {
      startHour += 1;
    }
    const timeSlots = [];
    for (let hour = startHour; hour <= 22; hour++) {
      const minutes = hour === startHour ? [startMinute] : [0, 30];
      for (const minute of minutes) {
        if (hour === 22 && minute > 30) break;
        const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        const cityTeachers = await db.select({ userId: userRoleCities.userId }).from(userRoleCities).where(and16(
          eq21(userRoleCities.role, "teacher"),
          sql9`JSON_CONTAINS(${userRoleCities.cities}, ${JSON.stringify([cityId.toString()])})`
        ));
        const teacherIds = cityTeachers.map((t2) => t2.userId);
        const startTimestamp = `${date2} ${timeStr}:00`;
        const endTimestamp = `${date2} ${String(hour + 1).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
        const busyTeachers = await db.select({ teacherId: schedules.teacherId }).from(schedules).where(and16(
          inArray3(schedules.teacherId, teacherIds),
          or5(
            and16(
              sql9`${schedules.startTime} <= ${startTimestamp}`,
              sql9`${schedules.endTime} > ${startTimestamp}`
            ),
            and16(
              sql9`${schedules.startTime} < ${endTimestamp}`,
              sql9`${schedules.endTime} >= ${endTimestamp}`
            )
          )
        ));
        const hasTeacher = teacherIds.length > busyTeachers.length;
        const cityClassrooms = await db.select({ id: classrooms.id }).from(classrooms).where(and16(
          eq21(classrooms.cityId, cityId),
          eq21(classrooms.isActive, true)
        ));
        const classroomIds = cityClassrooms.map((c) => c.id);
        const busyClassrooms = await db.select({ classroomId: schedules.classroomId }).from(schedules).where(and16(
          inArray3(schedules.classroomId, classroomIds),
          or5(
            and16(
              sql9`${schedules.startTime} <= ${startTimestamp}`,
              sql9`${schedules.endTime} > ${startTimestamp}`
            ),
            and16(
              sql9`${schedules.startTime} < ${endTimestamp}`,
              sql9`${schedules.endTime} >= ${endTimestamp}`
            )
          )
        ));
        const hasClassroom = classroomIds.length > busyClassrooms.length;
        timeSlots.push({
          startTime: timeStr,
          hasTeacher,
          hasClassroom,
          isAvailable: hasTeacher && hasClassroom
        });
      }
    }
    return {
      success: true,
      data: {
        date: date2,
        cityId,
        availableSlots: timeSlots
      }
    };
  }),
  /**
   * 老师设置不接客时段
   * 老师端接口：强制使用JWT中的userId作为teacherId
   */
  setUnavailability: protectedProcedure.input(z25.object({
    startTime: z25.string().datetime(),
    // ISO 8601 format: "2026-02-24T14:00:00Z"
    endTime: z25.string().datetime(),
    reason: z25.string().max(200).optional()
  })).mutation(async ({ ctx, input }) => {
    if (!ctx.user.roles.includes("teacher")) {
      throw new TRPCError21({
        code: "FORBIDDEN",
        message: "Only teachers can set unavailability"
      });
    }
    const teacherId = ctx.user.id;
    const { startTime, endTime, reason } = input;
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) {
      throw new TRPCError21({
        code: "BAD_REQUEST",
        message: "End time must be after start time"
      });
    }
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    await db.insert(teacherUnavailability).values({
      teacherId,
      startTime: start,
      endTime: end,
      reason: reason || null
    });
    return {
      success: true,
      message: "Unavailability period set successfully"
    };
  }),
  /**
   * 查看老师的不接客时段列表
   * 老师端接口：强制使用JWT中的userId作为teacherId
   */
  listUnavailability: protectedProcedure.input(z25.object({
    startDate: z25.string().optional(),
    // YYYY-MM-DD
    endDate: z25.string().optional()
  }).optional()).query(async ({ ctx, input }) => {
    if (!ctx.user.roles.includes("teacher")) {
      throw new TRPCError21({
        code: "FORBIDDEN",
        message: "Only teachers can view unavailability"
      });
    }
    const teacherId = ctx.user.id;
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const conditions = [eq21(teacherUnavailability.teacherId, teacherId)];
    if (input?.startDate) {
      conditions.push(sql9`${teacherUnavailability.endTime} >= ${input.startDate}`);
    }
    if (input?.endDate) {
      conditions.push(sql9`${teacherUnavailability.startTime} <= ${input.endDate}`);
    }
    const result = await db.select().from(teacherUnavailability).where(and16(...conditions));
    return {
      success: true,
      data: result
    };
  }),
  /**
   * 删除不接客时段
   * 老师端接口：强制使用JWT中的userId验证权限
   */
  deleteUnavailability: protectedProcedure.input(z25.object({
    id: z25.number().int().positive()
  })).mutation(async ({ ctx, input }) => {
    if (!ctx.user.roles.includes("teacher")) {
      throw new TRPCError21({
        code: "FORBIDDEN",
        message: "Only teachers can delete unavailability"
      });
    }
    const teacherId = ctx.user.id;
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const record = await db.select().from(teacherUnavailability).where(eq21(teacherUnavailability.id, input.id)).limit(1);
    if (record.length === 0) {
      throw new TRPCError21({
        code: "NOT_FOUND",
        message: "Unavailability record not found"
      });
    }
    if (record[0].teacherId !== teacherId) {
      throw new TRPCError21({
        code: "FORBIDDEN",
        message: "You can only delete your own unavailability records"
      });
    }
    await db.delete(teacherUnavailability).where(eq21(teacherUnavailability.id, input.id));
    return {
      success: true,
      message: "Unavailability period deleted successfully"
    };
  }),
  /**
   * 获取所有排课记录（包含订单信息）
   * 管理端接口：返回所有排课记录
   */
  listWithOrderInfo: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const allSchedules = await db.select().from(schedules).orderBy(sql9`${schedules.startTime} DESC`);
    return allSchedules;
  })
});

// server/analyticsRouter.ts
init_trpc();
init_db();
init_schema();
import { z as z26 } from "zod";
import { eq as eq22, and as and17, sql as sql10 } from "drizzle-orm";
import { TRPCError as TRPCError22 } from "@trpc/server";
var analyticsRouter = router({
  /**
   * 获取流失客户统计
   */
  inactiveCustomers: protectedProcedure.input(
    z26.object({
      days: z26.number().optional().default(30)
      // 多少天未消费算流失
    }).optional()
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError22({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const days = input?.days || 30;
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return [];
  }),
  /**
   * 获取订单统计
   */
  orderStats: protectedProcedure.input(
    z26.object({
      startDate: z26.string().optional(),
      endDate: z26.string().optional()
    }).optional()
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError22({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    let whereConditions = [];
    whereConditions.push(sql10`${orders.status} != 'cancelled'`);
    if (input?.startDate) {
      whereConditions.push(sql10`COALESCE(${orders.paymentDate}, DATE(${orders.createdAt})) >= ${input.startDate}`);
    }
    if (input?.endDate) {
      whereConditions.push(sql10`COALESCE(${orders.paymentDate}, DATE(${orders.createdAt})) <= ${input.endDate}`);
    }
    const statsResult = await db.select({
      totalOrders: sql10`COUNT(*)`,
      completedOrders: sql10`SUM(CASE WHEN ${orders.status} = 'paid' THEN 1 ELSE 0 END)`,
      pendingOrders: sql10`SUM(CASE WHEN ${orders.status} = 'pending' THEN 1 ELSE 0 END)`,
      cancelledOrders: sql10`SUM(CASE WHEN ${orders.status} = 'cancelled' THEN 1 ELSE 0 END)`,
      totalRevenue: sql10`COALESCE(SUM(${orders.courseAmount}), 0)`,
      totalPaymentAmount: sql10`COALESCE(SUM(${orders.paymentAmount}), 0)`,
      totalTeacherFee: sql10`COALESCE(SUM(${orders.teacherFee}), 0)`
    }).from(orders).where(whereConditions.length > 0 ? and17(...whereConditions) : void 0);
    const stats = statsResult[0];
    const totalPaymentAmount = Number(stats.totalPaymentAmount) || 0;
    const totalTeacherFee = Number(stats.totalTeacherFee) || 0;
    const netProfit = totalPaymentAmount - totalTeacherFee;
    return {
      totalOrders: Number(stats.totalOrders) || 0,
      completedOrders: Number(stats.completedOrders) || 0,
      pendingOrders: Number(stats.pendingOrders) || 0,
      cancelledOrders: Number(stats.cancelledOrders) || 0,
      totalRevenue: String(stats.totalRevenue || "0"),
      averageOrderValue: stats.totalOrders > 0 ? String((Number(stats.totalRevenue) / Number(stats.totalOrders)).toFixed(2)) : "0.00",
      totalPaymentAmount,
      totalTeacherFee,
      netProfit
    };
  }),
  /**
   * 获取数据分析看板统计
   * 多角色接口：根据JWT中的roles返回不同范围的数据
   */
  /**
   * 获取数据分析看板统计
   * 多角色接口：根据JWT中的roles返回不同范围的数据
   */
  getDashboardStats: protectedProcedure.input(
    z26.object({
      startDate: z26.string().optional(),
      endDate: z26.string().optional()
    }).optional()
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError22({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const userRoles = ctx.user.roles ? ctx.user.roles.split(",") : [];
    const userId = ctx.user.id;
    console.log("[analytics.getDashboardStats] User ID:", userId);
    console.log("[analytics.getDashboardStats] Roles:", userRoles);
    if (userRoles.includes("admin")) {
      return {
        role: "admin",
        totalOrders: 1250,
        totalRevenue: "1250000.00",
        totalCustomers: 850,
        totalTeachers: 45,
        monthlyGrowth: {
          orders: "+12%",
          revenue: "+15%",
          customers: "+8%"
        }
      };
    }
    if (userRoles.includes("sales")) {
      return {
        role: "sales",
        myOrders: 85,
        myRevenue: "85000.00",
        myCustomers: 42,
        monthlyTarget: "100000.00",
        achievementRate: "85%"
      };
    }
    if (userRoles.includes("teacher")) {
      return {
        role: "teacher",
        myCourses: 120,
        myStudents: 65,
        myEarnings: "24000.00",
        monthlyHours: 160,
        averageRating: 4.8
      };
    }
    if (userRoles.includes("cityPartner")) {
      const partnerRecord = await db.select({ id: partners.id }).from(partners).where(eq22(partners.userId, userId)).limit(1);
      if (partnerRecord.length === 0) {
        throw new TRPCError22({
          code: "NOT_FOUND",
          message: "Partner not found for current user"
        });
      }
      const partnerId = partnerRecord[0].id;
      const partnerCitiesRecords = await db.select({
        cityId: partnerCities.cityId,
        cityName: cities.name
      }).from(partnerCities).leftJoin(cities, eq22(partnerCities.cityId, cities.id)).where(and17(
        eq22(partnerCities.partnerId, partnerId),
        eq22(partnerCities.contractStatus, "active")
      ));
      console.log("[analytics.getDashboardStats] Partner ID:", partnerId);
      console.log("[analytics.getDashboardStats] Managed Cities:", partnerCitiesRecords.map((c) => c.cityName));
      return {
        role: "cityPartner",
        cities: partnerCitiesRecords.map((c) => c.cityName),
        totalOrders: 320,
        totalRevenue: "320000.00",
        totalExpense: "45000.00",
        netProfit: "275000.00",
        myCommission: "27500.00"
      };
    }
    throw new TRPCError22({
      code: "FORBIDDEN",
      message: "Insufficient permissions to access dashboard stats"
    });
  }),
  /**
   * 获取所有城市的统计数据
   */
  getAllCitiesWithStats: publicProcedure.input(
    z26.object({
      startDate: z26.string().optional(),
      endDate: z26.string().optional()
    }).optional()
  ).query(async ({ input }) => {
    const options = {};
    if (input?.startDate) {
      options.startDate = new Date(input.startDate);
    }
    if (input?.endDate) {
      options.endDate = new Date(input.endDate);
    }
    return await getAllCitiesWithStats(options);
  }),
  /**
   * 创建城市配置
   */
  createCityConfig: protectedProcedure.input(
    z26.object({
      city: z26.string(),
      areaCode: z26.string().optional(),
      description: z26.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError22({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const maxSortOrderResult = await db.select({ maxSort: sql10`MAX(${cities.sortOrder})` }).from(cities);
    const maxSortOrder = maxSortOrderResult[0]?.maxSort || 0;
    const newSortOrder = maxSortOrder + 1;
    const result = await db.insert(cities).values({
      name: input.city,
      areaCode: input.areaCode || null,
      isActive: true,
      sortOrder: newSortOrder
    });
    return { success: true, id: Number(result.insertId), sortOrder: newSortOrder };
  }),
  /**
   * 更新城市配置
   */
  updateCityPartnerConfig: protectedProcedure.input(
    z26.object({
      id: z26.number(),
      areaCode: z26.string().optional(),
      description: z26.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError22({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    await db.update(cities).set({
      areaCode: input.areaCode || null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq22(cities.id, input.id));
    return { success: true };
  }),
  /**
   * 删除城市配置
   */
  deleteCityConfig: protectedProcedure.input(
    z26.object({
      id: z26.number()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError22({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    await db.update(cities).set({
      isActive: false,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq22(cities.id, input.id));
    return { success: true };
  }),
  /**
   * 获取城市财务统计数据
   */
  cityFinancialStats: protectedProcedure.input(
    z26.object({
      dateRange: z26.string().optional(),
      startDate: z26.string().optional(),
      endDate: z26.string().optional()
    }).optional()
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError22({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    let whereConditions = [eq22(orders.status, "paid")];
    if (input?.startDate && input?.endDate) {
      whereConditions.push(sql10`${orders.classDate} >= ${input.startDate}`);
      whereConditions.push(sql10`${orders.classDate} <= ${input.endDate}`);
    } else if (input?.dateRange) {
      const now = /* @__PURE__ */ new Date();
      let startDateStr;
      switch (input.dateRange) {
        case "today":
          startDateStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split("T")[0];
          whereConditions.push(sql10`${orders.classDate} >= ${startDateStr}`);
          break;
        case "thisWeek":
          startDateStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString().split("T")[0];
          whereConditions.push(sql10`${orders.classDate} >= ${startDateStr}`);
          break;
        case "thisMonth":
          startDateStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
          whereConditions.push(sql10`${orders.classDate} >= ${startDateStr}`);
          break;
        case "thisYear":
          startDateStr = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
          whereConditions.push(sql10`${orders.classDate} >= ${startDateStr}`);
          break;
      }
    }
    const stats = await db.select({
      city: orders.deliveryCity,
      orderCount: sql10`COUNT(*)`,
      totalRevenue: sql10`SUM(${orders.courseAmount})`,
      totalTeacherFee: sql10`SUM(${orders.teacherFee})`,
      totalTransportFee: sql10`SUM(${orders.transportFee})`,
      totalOtherFee: sql10`SUM(${orders.otherFee})`,
      totalConsumablesFee: sql10`SUM(${orders.consumablesFee})`,
      totalRentFee: sql10`SUM(${orders.rentFee})`,
      totalPropertyFee: sql10`SUM(${orders.propertyFee})`,
      totalUtilityFee: sql10`SUM(${orders.utilityFee})`,
      totalPartnerFee: sql10`SUM(${orders.partnerFee})`
    }).from(orders).where(and17(...whereConditions)).groupBy(orders.deliveryCity);
    return stats.map((s) => {
      const totalRevenue = Number(s.totalRevenue) || 0;
      const teacherFee = Number(s.totalTeacherFee) || 0;
      const transportFee = Number(s.totalTransportFee) || 0;
      const rentFee = Number(s.totalRentFee) || 0;
      const propertyFee = Number(s.totalPropertyFee) || 0;
      const utilityFee = Number(s.totalUtilityFee) || 0;
      const consumablesFee = Number(s.totalConsumablesFee) || 0;
      const otherFee = Number(s.totalOtherFee) || 0;
      const partnerFee = Number(s.totalPartnerFee) || 0;
      const cleaningFee = 0;
      const phoneFee = 0;
      const expressFee = 0;
      const promotionFee = 0;
      const totalExpense = teacherFee + transportFee + rentFee + propertyFee + utilityFee + consumablesFee + cleaningFee + phoneFee + expressFee + promotionFee + otherFee + partnerFee;
      const profit = totalRevenue - totalExpense;
      const profitMargin = totalRevenue > 0 ? profit / totalRevenue * 100 : 0;
      return {
        city: s.city || "\u672A\u77E5",
        orderCount: Number(s.orderCount) || 0,
        totalRevenue,
        teacherFee,
        transportFee,
        rentFee,
        propertyFee,
        utilityFee,
        consumablesFee,
        cleaningFee,
        phoneFee,
        expressFee,
        promotionFee,
        otherFee,
        totalExpense,
        partnerShare: partnerFee,
        // 合伙人分成就是partnerFee
        deferredPayment: 0,
        // TODO: 延期支付需要从其他表查询
        profit,
        profitMargin
      };
    });
  }),
  /**
   * 获取流量来源分析数据
   */
  trafficSourceAnalysis: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError22({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const stats = await db.select({
      source: orders.trafficSource,
      orderCount: sql10`COUNT(*)`,
      totalRevenue: sql10`SUM(${orders.courseAmount})`
    }).from(orders).where(eq22(orders.status, "paid")).groupBy(orders.trafficSource);
    return stats.map((s) => ({
      source: s.source || "\u672A\u77E5",
      orderCount: Number(s.orderCount) || 0,
      totalRevenue: Number(s.totalRevenue) || 0,
      conversionRate: 0
      // TODO: 实现转化率计算
    }));
  }),
  /**
   * 获取城市收入趋势数据
   */
  cityRevenueTrend: protectedProcedure.input(
    z26.object({
      cityId: z26.number().optional(),
      months: z26.number().optional().default(12)
    }).optional()
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError22({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    const monthsCount = input?.months || 12;
    const startDate = /* @__PURE__ */ new Date();
    startDate.setMonth(startDate.getMonth() - monthsCount);
    let whereConditions = [
      eq22(orders.status, "paid"),
      sql10`${orders.classDate} >= ${startDate.toISOString().split("T")[0]}`
    ];
    if (input?.cityId) {
    }
    const monthColumn = sql10`DATE_FORMAT(${orders.classDate}, '%Y-%m')`;
    const stats = await db.select({
      month: monthColumn,
      city: orders.deliveryCity,
      totalRevenue: sql10`SUM(${orders.courseAmount})`,
      orderCount: sql10`COUNT(*)`
    }).from(orders).where(and17(...whereConditions)).groupBy(monthColumn, orders.deliveryCity).orderBy(monthColumn);
    const monthsSet = /* @__PURE__ */ new Set();
    const citiesMap = /* @__PURE__ */ new Map();
    stats.forEach((s) => {
      const month = s.month;
      const city = s.city || "\u672A\u77E5";
      const revenue = Number(s.totalRevenue) || 0;
      monthsSet.add(month);
      if (!citiesMap.has(city)) {
        citiesMap.set(city, []);
      }
    });
    const months = Array.from(monthsSet).sort();
    citiesMap.forEach((data, city) => {
      citiesMap.set(city, new Array(months.length).fill(0));
    });
    stats.forEach((s) => {
      const month = s.month;
      const city = s.city || "\u672A\u77E5";
      const revenue = Number(s.totalRevenue) || 0;
      const monthIndex = months.indexOf(month);
      if (monthIndex !== -1) {
        const cityData = citiesMap.get(city);
        if (cityData) {
          cityData[monthIndex] = revenue;
        }
      }
    });
    const cities3 = Array.from(citiesMap.entries()).map(([city, data]) => ({
      city,
      data
    }));
    return {
      months,
      cities: cities3
    };
  }),
  /**
   * 获取城市收入汇总数据
   */
  cityRevenue: protectedProcedure.input(
    z26.object({
      startDate: z26.string().optional(),
      endDate: z26.string().optional()
    }).optional()
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError22({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25" });
    let whereConditions = [eq22(orders.status, "paid")];
    if (input?.startDate) {
      whereConditions.push(sql10`${orders.classDate} >= ${input.startDate}`);
    }
    if (input?.endDate) {
      whereConditions.push(sql10`${orders.classDate} <= ${input.endDate}`);
    }
    const stats = await db.select({
      city: orders.deliveryCity,
      totalRevenue: sql10`SUM(${orders.courseAmount})`,
      orderCount: sql10`COUNT(*)`
    }).from(orders).where(and17(...whereConditions)).groupBy(orders.deliveryCity);
    return stats.map((s) => ({
      city: s.city || "\u672A\u77E5",
      totalRevenue: Number(s.totalRevenue) || 0,
      orderCount: Number(s.orderCount) || 0
    }));
  })
});

// server/bookingRouter.ts
init_trpc();
init_db();
init_schema();
import { z as z27 } from "zod";
import { eq as eq23, and as and18, or as or6, sql as sql11, asc as asc2 } from "drizzle-orm";
import { TRPCError as TRPCError23 } from "@trpc/server";

// server/orderNoGenerator.ts
var CITY_AREA_CODES = {
  "\u4E0A\u6D77": "021",
  "\u5317\u4EAC": "010",
  "\u5929\u6D25": "022",
  "\u91CD\u5E86": "023",
  "\u5E7F\u5DDE": "020",
  "\u6DF1\u5733": "0755",
  "\u676D\u5DDE": "0571",
  "\u5357\u4EAC": "025",
  "\u6B66\u6C49": "027",
  "\u6210\u90FD": "028",
  "\u897F\u5B89": "029",
  "\u90D1\u5DDE": "0371",
  "\u6D4E\u5357": "0531",
  "\u9752\u5C9B": "0532",
  "\u5927\u8FDE": "0411",
  "\u6C88\u9633": "024",
  "\u957F\u6625": "0431",
  "\u54C8\u5C14\u6EE8": "0451",
  "\u798F\u5DDE": "0591",
  "\u53A6\u95E8": "0592",
  "\u5357\u660C": "0791",
  "\u957F\u6C99": "0731",
  "\u5408\u80A5": "0551",
  "\u77F3\u5BB6\u5E84": "0311",
  "\u592A\u539F": "0351",
  "\u547C\u548C\u6D69\u7279": "0471",
  "\u4E4C\u9C81\u6728\u9F50": "0991",
  "\u62C9\u8428": "0891",
  "\u94F6\u5DDD": "0951",
  "\u897F\u5B81": "0971",
  "\u5170\u5DDE": "0931",
  "\u8D35\u9633": "0851",
  "\u6606\u660E": "0871",
  "\u6D77\u53E3": "0898",
  "\u5357\u5B81": "0771"
};
function generateOrderNo(city, suffix) {
  const now = /* @__PURE__ */ new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const dateTimePart = `${year}${month}${day}${hours}${minutes}${seconds}`;
  const areaCode = city && CITY_AREA_CODES[city] ? CITY_AREA_CODES[city] : "000";
  const suffixPart = suffix ? `-${suffix}` : "";
  return `${dateTimePart}-${areaCode}${suffixPart}`;
}

// server/bookingRouter.ts
var bookingRouter = router({
  /**
   * 获取指定城市、日期、总时长的所有可用时间段
   * 返回可用的开始时间列表
   * 考虑教室容量和现有预约
   */
  getAvailableSlots: publicProcedure.input(z27.object({
    cityId: z27.number().int().positive(),
    date: z27.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    // YYYY-MM-DD
    totalDuration: z27.number().positive(),
    // 总时长(小时)
    teacherId: z27.number().int().positive().optional()
    // 可选，指定老师
  })).query(async ({ input }) => {
    const { cityId, date: date2, totalDuration, teacherId } = input;
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const cityClassrooms = await db.select({
      id: classrooms.id,
      name: classrooms.name,
      sortOrder: classrooms.sortOrder,
      capacity: classrooms.capacity
    }).from(classrooms).where(and18(
      eq23(classrooms.cityId, cityId),
      eq23(classrooms.isActive, true)
    )).orderBy(asc2(classrooms.sortOrder));
    if (cityClassrooms.length === 0) {
      return {
        success: true,
        data: [],
        message: "\u8BE5\u57CE\u5E02\u6682\u65E0\u53EF\u7528\u6559\u5BA4"
      };
    }
    const dateStart = `${date2} 00:00:00`;
    const dateEnd = `${date2} 23:59:59`;
    const existingBookingsRaw = await db.select({
      classroomId: schedules.classroomId,
      startTime: schedules.startTime,
      endTime: schedules.endTime,
      teacherId: schedules.teacherId
    }).from(schedules).where(and18(
      sql11`${schedules.startTime} >= ${dateStart}`,
      sql11`${schedules.startTime} < ${dateEnd}`
    ));
    const formatLocalTime = (d) => {
      if (!d) return "";
      if (typeof d === "string") return d;
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    const existingBookings = existingBookingsRaw.map((b) => ({
      ...b,
      startTimeStr: formatLocalTime(b.startTime),
      endTimeStr: formatLocalTime(b.endTime)
    }));
    const availableSlots = [];
    const now = /* @__PURE__ */ new Date();
    const nowInBeijing = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    const twoHoursLater = new Date(nowInBeijing.getTime() + 2 * 60 * 60 * 1e3);
    const minutes = twoHoursLater.getMinutes();
    let minBookingHour = twoHoursLater.getHours();
    let minBookingMinute = 0;
    if (minutes > 0 && minutes <= 30) {
      minBookingMinute = 30;
    } else if (minutes > 30) {
      minBookingHour += 1;
      minBookingMinute = 0;
    }
    const todayInBeijing = nowInBeijing.toISOString().split("T")[0];
    const isToday = date2 === todayInBeijing;
    let minBookingTime = null;
    if (isToday) {
      const minBookingTimeStr = `${date2}T${String(minBookingHour).padStart(2, "0")}:${String(minBookingMinute).padStart(2, "0")}:00+08:00`;
      minBookingTime = new Date(minBookingTimeStr);
    }
    for (let hour = 9; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        if (hour === 23 && minute === 30) {
          continue;
        }
        const startDateTime = /* @__PURE__ */ new Date(`${date2}T${startTime}:00+08:00`);
        const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60 * 60 * 1e3);
        if (minBookingTime && startDateTime < minBookingTime) {
          continue;
        }
        const startTimestamp = `${date2} ${startTime}:00`;
        const endTime = `${String(endDateTime.getHours()).padStart(2, "0")}:${String(endDateTime.getMinutes()).padStart(2, "0")}`;
        const endTimestamp = `${date2} ${endTime}:00`;
        let hasAvailableClassroom = false;
        for (const classroom of cityClassrooms) {
          const conflictingBookings = existingBookings.filter((booking) => {
            if (booking.classroomId !== classroom.id) return false;
            const bookingStart = new Date(booking.startTimeStr).getTime();
            const bookingEnd = new Date(booking.endTimeStr).getTime();
            const slotStart = new Date(startTimestamp).getTime();
            const slotEnd = new Date(endTimestamp).getTime();
            return bookingStart <= slotStart && bookingEnd > slotStart || bookingStart < slotEnd && bookingEnd >= slotEnd || bookingStart >= slotStart && bookingEnd <= slotEnd;
          });
          if (conflictingBookings.length < (classroom.capacity || 1)) {
            if (teacherId) {
              const teacherConflict = existingBookings.some((booking) => {
                if (booking.teacherId !== teacherId) return false;
                const bookingStart = new Date(booking.startTimeStr).getTime();
                const bookingEnd = new Date(booking.endTimeStr).getTime();
                const slotStart = new Date(startTimestamp).getTime();
                const slotEnd = new Date(endTimestamp).getTime();
                return bookingStart <= slotStart && bookingEnd > slotStart || bookingStart < slotEnd && bookingEnd >= slotEnd || bookingStart >= slotStart && bookingEnd <= slotEnd;
              });
              if (teacherConflict) {
                continue;
              }
            }
            hasAvailableClassroom = true;
            break;
          }
        }
        if (hasAvailableClassroom) {
          availableSlots.push(startTime);
        }
      }
    }
    return {
      success: true,
      data: availableSlots,
      message: availableSlots.length > 0 ? `\u627E\u5230${availableSlots.length}\u4E2A\u53EF\u7528\u65F6\u95F4\u6BB5` : "\u8BE5\u65E5\u671F\u6682\u65E0\u53EF\u7528\u65F6\u95F4\u6BB5"
    };
  }),
  /**
   * 获取指定城市、时间段的可用教室
   * 按sortOrder优先级返回第一个可用的教室
   */
  getAvailableClassroom: publicProcedure.input(z27.object({
    cityId: z27.number().int().positive(),
    date: z27.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    // YYYY-MM-DD
    startTime: z27.string().regex(/^\d{2}:\d{2}$/),
    // HH:mm
    duration: z27.number().positive()
    // 课程时长(小时)
  })).query(async ({ input }) => {
    const { cityId, date: date2, startTime, duration } = input;
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const [hours, minutes] = startTime.split(":").map(Number);
    const startDateTime = /* @__PURE__ */ new Date(`${date2}T${startTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 60 * 1e3);
    const endTime = `${String(endDateTime.getHours()).padStart(2, "0")}:${String(endDateTime.getMinutes()).padStart(2, "0")}`;
    const startTimestamp = `${date2} ${startTime}:00`;
    const endTimestamp = `${date2} ${endTime}:00`;
    const cityClassrooms = await db.select({
      id: classrooms.id,
      name: classrooms.name,
      sortOrder: classrooms.sortOrder,
      capacity: classrooms.capacity
    }).from(classrooms).where(and18(
      eq23(classrooms.cityId, cityId),
      eq23(classrooms.isActive, true)
    )).orderBy(asc2(classrooms.sortOrder));
    if (cityClassrooms.length === 0) {
      return {
        success: true,
        data: null,
        message: "\u8BE5\u57CE\u5E02\u6682\u65E0\u53EF\u7528\u6559\u5BA4"
      };
    }
    for (const classroom of cityClassrooms) {
      const bookings = await db.select({ id: schedules.id }).from(schedules).where(and18(
        eq23(schedules.classroomId, classroom.id),
        or6(
          // 新预约开始时间在现有预约时间段内
          and18(
            sql11`${schedules.startTime} <= ${startTimestamp}`,
            sql11`${schedules.endTime} > ${startTimestamp}`
          ),
          // 新预约结束时间在现有预约时间段内
          and18(
            sql11`${schedules.startTime} < ${endTimestamp}`,
            sql11`${schedules.endTime} >= ${endTimestamp}`
          ),
          // 新预约完全包含现有预约
          and18(
            sql11`${schedules.startTime} >= ${startTimestamp}`,
            sql11`${schedules.endTime} <= ${endTimestamp}`
          )
        )
      ));
      if (bookings.length < (classroom.capacity || 1)) {
        return {
          success: true,
          data: {
            id: classroom.id,
            name: classroom.name,
            sortOrder: classroom.sortOrder,
            capacity: classroom.capacity,
            currentBookings: bookings.length
          }
        };
      }
    }
    return {
      success: true,
      data: null,
      message: "\u8BE5\u65F6\u95F4\u6BB5\u6240\u6709\u6559\u5BA4\u5DF2\u6EE1"
    };
  }),
  /**
   * 创建预约
   * 支持多课程预约
   * 自动分配教室（如果未指定）
   * 创建schedules记录和orders记录
   */
  create: protectedProcedure.input(z27.object({
    cityId: z27.number().int().positive(),
    teacherId: z27.number().int().positive(),
    date: z27.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    // YYYY-MM-DD
    startTime: z27.string().regex(/^\d{2}:\d{2}$/),
    // HH:mm
    classroomId: z27.number().int().positive().optional(),
    // 可选，不传则自动分配
    courseItems: z27.array(z27.object({
      courseId: z27.number().int().positive(),
      quantity: z27.number().int().positive().default(1),
      duration: z27.number().positive(),
      // 课程时长(小时)
      price: z27.number().positive()
      // 课程单价
    })).min(1),
    transportFee: z27.number().nonnegative().optional(),
    // 车费（可选）
    customerNote: z27.string().max(500).optional()
    // 客户备注
  })).mutation(async ({ ctx, input }) => {
    const { cityId, teacherId, date: date2, startTime, classroomId, courseItems, transportFee, customerNote } = input;
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const now = /* @__PURE__ */ new Date();
    const [hours, minutes] = startTime.split(":").map(Number);
    if (minutes !== 0 && minutes !== 30) {
      throw new TRPCError23({
        code: "BAD_REQUEST",
        message: "\u5F00\u59CB\u65F6\u95F4\u5FC5\u987B\u662F\u6574\u70B9\u6216\u534A\u70B9\uFF08\u598210:00\u621610:30\uFF09"
      });
    }
    const bookingDateTime = /* @__PURE__ */ new Date(`${date2}T${startTime}:00`);
    if (bookingDateTime < now) {
      throw new TRPCError23({
        code: "BAD_REQUEST",
        message: "\u4E0D\u80FD\u9884\u7EA6\u8FC7\u53BB\u7684\u65F6\u95F4"
      });
    }
    const minBookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1e3);
    if (bookingDateTime < minBookingTime) {
      throw new TRPCError23({
        code: "BAD_REQUEST",
        message: "\u9884\u7EA6\u65F6\u95F4\u5FC5\u987B\u5728\u5F53\u524D\u65F6\u95F42\u5C0F\u65F6\u4E4B\u540E"
      });
    }
    if (hours >= 23) {
      throw new TRPCError23({
        code: "BAD_REQUEST",
        message: "\u6700\u665A\u53EF\u9884\u7EA6\u65F6\u95F4\u4E3A23:00"
      });
    }
    const totalDuration = courseItems.reduce((sum, item) => sum + item.duration * item.quantity, 0);
    const totalPrice = courseItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const endDateTime = new Date(bookingDateTime.getTime() + totalDuration * 60 * 60 * 1e3);
    const endTime = `${String(endDateTime.getHours()).padStart(2, "0")}:${String(endDateTime.getMinutes()).padStart(2, "0")}`;
    const teacherResult = await db.select({ name: teachers.name }).from(teachers).where(eq23(teachers.id, teacherId)).limit(1);
    const teacherName = teacherResult[0]?.name || "";
    let finalClassroomId = classroomId;
    if (!finalClassroomId) {
      const availableClassrooms = await db.select().from(classrooms).where(and18(
        eq23(classrooms.cityId, cityId),
        eq23(classrooms.isActive, true)
      )).orderBy(asc2(classrooms.sortOrder)).limit(1);
      const availableClassroom = availableClassrooms[0];
      if (!availableClassroom) {
        throw new TRPCError23({
          code: "BAD_REQUEST",
          message: "\u8BE5\u57CE\u5E02\u6682\u65E0\u53EF\u7528\u6559\u5BA4"
        });
      }
      finalClassroomId = availableClassroom.id;
    }
    const startTimestamp = `${date2} ${startTime}:00`;
    const endTimestamp = `${date2} ${endTime}:00`;
    return await db.transaction(async (tx) => {
      const classroomResult = await tx.select().from(classrooms).where(eq23(classrooms.id, finalClassroomId)).limit(1).for("update");
      const classroom = classroomResult[0];
      const cityName = classroom?.cityName || "";
      if (!classroom) {
        throw new TRPCError23({
          code: "BAD_REQUEST",
          message: "\u6559\u5BA4\u4E0D\u5B58\u5728"
        });
      }
      const classroomBookings = await tx.select({ id: schedules.id }).from(schedules).where(and18(
        eq23(schedules.classroomId, finalClassroomId),
        or6(
          and18(
            sql11`${schedules.startTime} <= ${startTimestamp}`,
            sql11`${schedules.endTime} > ${startTimestamp}`
          ),
          and18(
            sql11`${schedules.startTime} < ${endTimestamp}`,
            sql11`${schedules.endTime} >= ${endTimestamp}`
          ),
          and18(
            sql11`${schedules.startTime} >= ${startTimestamp}`,
            sql11`${schedules.endTime} <= ${endTimestamp}`
          )
        )
      ));
      if (classroomBookings.length >= (classroom.capacity || 1)) {
        throw new TRPCError23({
          code: "CONFLICT",
          message: "\u62B1\u6B49\uFF0C\u8BE5\u65F6\u95F4\u6BB5\u5DF2\u88AB\u5176\u4ED6\u7528\u6237\u9884\u7EA6\uFF0C\u8BF7\u9009\u62E9\u5176\u4ED6\u65F6\u95F4"
        });
      }
      const teacherBookings = await tx.select({ id: schedules.id }).from(schedules).where(and18(
        eq23(schedules.teacherId, teacherId),
        or6(
          and18(
            sql11`${schedules.startTime} <= ${startTimestamp}`,
            sql11`${schedules.endTime} > ${startTimestamp}`
          ),
          and18(
            sql11`${schedules.startTime} < ${endTimestamp}`,
            sql11`${schedules.endTime} >= ${endTimestamp}`
          ),
          and18(
            sql11`${schedules.startTime} >= ${startTimestamp}`,
            sql11`${schedules.endTime} <= ${endTimestamp}`
          )
        )
      ));
      if (teacherBookings.length > 0) {
        throw new TRPCError23({
          code: "CONFLICT",
          message: "\u62B1\u6B49\uFF0C\u8BE5\u8001\u5E08\u5728\u6B64\u65F6\u95F4\u6BB5\u5DF2\u6709\u5176\u4ED6\u8BFE\u7A0B\u5B89\u6392\uFF0C\u8BF7\u9009\u62E9\u5176\u4ED6\u8001\u5E08\u6216\u65F6\u95F4"
        });
      }
      const orderNo = generateOrderNo();
      const orderResult = await tx.insert(orders).values({
        orderNo,
        customerId: ctx.user.id,
        customerName: ctx.user.name || "",
        salesId: ctx.user.id,
        // 必需字段
        paymentAmount: totalPrice.toString(),
        courseAmount: totalPrice.toString(),
        transportFee: transportFee ? transportFee.toString() : "0.00",
        classDate: new Date(date2),
        classTime: `${startTime}-${endTime}`,
        status: "pending",
        notes: customerNote || null,
        // 补全交付信息字段
        deliveryCity: cityName,
        deliveryRoom: classroom?.name || "",
        deliveryClassroomId: finalClassroomId,
        deliveryTeacher: teacherName,
        paymentStatus: "unpaid",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      });
      const orderId = Number(orderResult[0].insertId);
      const orderItemsData = [];
      for (const item of courseItems) {
        const courseResult = await tx.select({ name: courses.name }).from(courses).where(eq23(courses.id, item.courseId)).limit(1);
        const courseName = courseResult[0]?.name || `\u8BFE\u7A0B${item.courseId}`;
        const orderItemResult = await tx.insert(orderItems).values({
          orderId,
          courseId: item.courseId,
          courseName,
          quantity: item.quantity,
          price: item.price.toString(),
          subtotal: (item.price * item.quantity).toString(),
          duration: item.duration.toString(),
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
        const orderItemId = Number(orderItemResult[0].insertId);
        orderItemsData.push({
          orderItemId,
          courseId: item.courseId,
          courseName,
          quantity: item.quantity,
          duration: item.duration
        });
      }
      const scheduleIds = [];
      let currentStartTime = new Date(startTimestamp);
      for (const itemData of orderItemsData) {
        for (let i = 0; i < itemData.quantity; i++) {
          const currentEndTime = new Date(currentStartTime.getTime() + itemData.duration * 60 * 60 * 1e3);
          const scheduleResult = await tx.insert(schedules).values({
            orderId,
            orderItemId: itemData.orderItemId,
            customerId: ctx.user.id,
            customerName: ctx.user.name || "",
            teacherId,
            classroomId: finalClassroomId,
            courseType: itemData.courseName,
            deliveryCourse: itemData.courseName,
            // 设置 deliveryCourse字段
            classDate: new Date(date2),
            classTime: `${currentStartTime.getHours().toString().padStart(2, "0")}:${currentStartTime.getMinutes().toString().padStart(2, "0")}-${currentEndTime.getHours().toString().padStart(2, "0")}:${currentEndTime.getMinutes().toString().padStart(2, "0")}`,
            startTime: currentStartTime,
            endTime: currentEndTime,
            city: cityName,
            // 从教室记录获取城市名
            status: "scheduled",
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          });
          scheduleIds.push(Number(scheduleResult[0].insertId));
          currentStartTime = currentEndTime;
        }
      }
      const deliveryCourseMap = /* @__PURE__ */ new Map();
      for (const itemData of orderItemsData) {
        const count2 = deliveryCourseMap.get(itemData.courseName) || 0;
        deliveryCourseMap.set(itemData.courseName, count2 + itemData.quantity);
      }
      const deliveryCourseStr = Array.from(deliveryCourseMap.entries()).map(([courseName, count2]) => count2 > 1 ? `${courseName} x${count2}` : courseName).join(", ");
      await tx.update(orders).set({ deliveryCourse: deliveryCourseStr }).where(eq23(orders.id, orderId));
      return {
        success: true,
        data: {
          scheduleIds,
          // 返回所有创建的排课 ID
          orderId,
          orderNo,
          classroomId: finalClassroomId,
          totalDuration,
          totalPrice,
          transportFee: transportFee || 0,
          startTime,
          endTime,
          deliveryCourse: deliveryCourseStr
        },
        message: "\u9884\u7EA6\u521B\u5EFA\u6210\u529F"
      };
    });
  })
});

// server/paymentRouter.ts
init_trpc();
init_db();
init_schema();
import { z as z28 } from "zod";
import { TRPCError as TRPCError24 } from "@trpc/server";
import { eq as eq24 } from "drizzle-orm";
var PaymentChannelEnum = z28.enum(["wechat", "alipay", "balance"]);
var OrderStatusEnum = z28.enum(["pending", "paid", "has_balance", "completed", "cancelled", "refunded"]);
var paymentRouter = router({
  /**
   * 预下单接口
   * 向支付服务商进行预下单，获取前端拉起原生支付所需的参数
   */
  prepay: protectedProcedure.input(
    z28.object({
      orderId: z28.number().int().positive(),
      paymentChannel: PaymentChannelEnum
    })
  ).mutation(async ({ input, ctx }) => {
    const { orderId, paymentChannel } = input;
    const db = await getDb();
    if (!db) {
      throw new TRPCError24({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    const [order] = await db.select().from(orders).where(eq24(orders.id, orderId)).limit(1);
    if (!order) {
      throw new TRPCError24({
        code: "NOT_FOUND",
        message: "\u8BA2\u5355\u4E0D\u5B58\u5728"
      });
    }
    if (order.status !== "pending") {
      throw new TRPCError24({
        code: "BAD_REQUEST",
        message: `\u8BA2\u5355\u72B6\u6001\u4E0D\u6B63\u786E\uFF0C\u5F53\u524D\u72B6\u6001: ${order.status}`
      });
    }
    switch (paymentChannel) {
      case "balance":
        return await handleBalancePayment(orderId, ctx.user.id);
      case "wechat":
        return await handleWechatPrepay(order);
      case "alipay":
        return await handleAlipayPrepay(order);
      default:
        throw new TRPCError24({
          code: "BAD_REQUEST",
          message: "\u4E0D\u652F\u6301\u7684\u652F\u4ED8\u6E20\u9053"
        });
    }
  }),
  /**
   * 查询订单支付状态
   * 供前端轮询使用
   */
  getStatus: publicProcedure.input(
    z28.object({
      orderId: z28.number().int().positive()
    })
  ).query(async ({ input }) => {
    const { orderId } = input;
    const db = await getDb();
    if (!db) {
      throw new TRPCError24({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    const [order] = await db.select({
      status: orders.status,
      paymentDate: orders.paymentDate,
      paymentChannel: orders.paymentChannel
    }).from(orders).where(eq24(orders.id, orderId)).limit(1);
    if (!order) {
      throw new TRPCError24({
        code: "NOT_FOUND",
        message: "\u8BA2\u5355\u4E0D\u5B58\u5728"
      });
    }
    return {
      status: order.status,
      paymentDate: order.paymentDate,
      paymentChannel: order.paymentChannel
    };
  }),
  /**
   * 更新订单支付状态（内部接口）
   * 由支付回调Webhook调用
   */
  updateStatus: publicProcedure.input(
    z28.object({
      orderId: z28.number().int().positive(),
      status: OrderStatusEnum,
      paymentDate: z28.string().optional(),
      paymentChannel: z28.string().optional(),
      channelOrderNo: z28.string().optional()
    })
  ).mutation(async ({ input }) => {
    const { orderId, status, paymentDate, paymentChannel, channelOrderNo } = input;
    const db = await getDb();
    if (!db) {
      throw new TRPCError24({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25"
      });
    }
    const [order] = await db.select().from(orders).where(eq24(orders.id, orderId)).limit(1);
    if (!order) {
      throw new TRPCError24({
        code: "NOT_FOUND",
        message: "\u8BA2\u5355\u4E0D\u5B58\u5728"
      });
    }
    if (order.status === "paid" && status === "paid") {
      return {
        success: true,
        message: "\u8BA2\u5355\u5DF2\u652F\u4ED8\uFF0C\u5E42\u7B49\u6027\u5904\u7406"
      };
    }
    await db.update(orders).set({
      status,
      paymentDate: paymentDate ? new Date(paymentDate) : void 0,
      paymentChannel,
      channelOrderNo,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq24(orders.id, orderId));
    return {
      success: true,
      message: "\u8BA2\u5355\u72B6\u6001\u66F4\u65B0\u6210\u529F"
    };
  })
});
async function handleBalancePayment(orderId, userId) {
  const db = await getDb();
  if (!db) {
    throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  }
  await db.update(orders).set({
    status: "paid",
    paymentDate: /* @__PURE__ */ new Date(),
    paymentChannel: "balance",
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq24(orders.id, orderId));
  return {
    success: true,
    message: "\u4F59\u989D\u652F\u4ED8\u6210\u529F"
  };
}
async function handleWechatPrepay(order) {
  return {
    partnerId: "mock_partner_id",
    prepayId: "mock_prepay_id",
    nonceStr: "mock_nonce_str",
    timestamp: Date.now().toString(),
    sign: "mock_sign",
    package: "Sign=WXPay"
  };
}
async function handleAlipayPrepay(order) {
  return {
    orderString: "mock_order_string"
  };
}

// server/routers.ts
init_timezone();
init_roles();
init_db();
init_db();
import { TRPCError as TRPCError26 } from "@trpc/server";
init_orderIdGenerator();
init_channelOrderNoUtils();
init_teacherFeeValidator();
init_schema();
import { eq as eq25 } from "drizzle-orm";
var adminProcedure6 = protectedProcedure.use(({ ctx, next }) => {
  return next({ ctx });
});
var salesOrAdminProcedure2 = protectedProcedure.use(({ ctx, next }) => {
  return next({ ctx });
});
var financeOrAdminProcedure4 = protectedProcedure.use(({ ctx, next }) => {
  return next({ ctx });
});
var teacherProcedure3 = protectedProcedure.use(({ ctx, next }) => {
  return next({ ctx });
});
var appRouter = router({
  system: systemRouter,
  discovery: apiDiscoveryRouter,
  salespersons: salespersonRouter,
  customers: customerRouter,
  finance: financeRouter,
  city: cityRouter,
  permissions: permissionRouter,
  auth: authRouter,
  userManagement: userManagementRouter,
  normalizeOrder: normalizeOrderRouter,
  upload: uploadRouter,
  excelReport: excelReportRouter,
  notifications: notificationRouter,
  trafficSourceConfig: trafficSourceConfigRouter,
  transportFeeFix: transportFeeFixRouter,
  parsingLearning: parsingLearningRouter,
  reconciliation: reconciliationRouter,
  statementMatch: statementMatchRouter,
  salesCityPerformance: salesCityPerformanceRouter,
  teacherPayments: teacherPaymentRouter,
  partnerManagement: partnerManagementRouter,
  cityExpense: cityExpenseRouter,
  orderParse: orderParseRouter,
  dataCleaning: dataCleaningRouter,
  membership: membershipRouter,
  schedules: schedulesRouter,
  analytics: analyticsRouter,
  booking: bookingRouter,
  payment: paymentRouter,
  // 数据质量检查
  dataQuality: router({
    // 检查订单数据质量
    checkOrders: protectedProcedure.query(async () => {
      return checkOrderDataQuality();
    }),
    // 获取未配置城市列表
    getUnconfiguredCities: protectedProcedure.query(async () => {
      return getUnconfiguredCities();
    })
  }),
  // 审计日志
  auditLogs: router({
    // 获取所有审计日志
    getAll: protectedProcedure.input(z29.object({
      limit: z29.number().optional(),
      offset: z29.number().optional()
    }).optional()).query(async ({ input }) => {
      const limit = input?.limit || 100;
      const offset = input?.offset || 0;
      return getAllAuditLogs(limit, offset);
    }),
    // 按操作类型获取审计日志
    getByType: protectedProcedure.input(z29.object({
      operationType: z29.string(),
      limit: z29.number().optional()
    })).query(async ({ input }) => {
      const limit = input.limit || 50;
      return getAuditLogsByType(input.operationType, limit);
    }),
    // 按操作人获取审计日志
    getByOperator: protectedProcedure.input(z29.object({
      operatorId: z29.number(),
      limit: z29.number().optional()
    })).query(async ({ input }) => {
      const limit = input.limit || 50;
      return getAuditLogsByOperator(input.operatorId, limit);
    }),
    // 按日期范围获取审计日志
    getByDateRange: protectedProcedure.input(z29.object({
      startDate: z29.string(),
      endDate: z29.string()
    })).query(async ({ input }) => {
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      return getAuditLogsByDateRange(startDate, endDate);
    }),
    // 获取审计日志统计
    getStats: protectedProcedure.query(async () => {
      return getAuditLogStats();
    })
  }),
  // 用户管理(仅管理员)
  users: router({
    list: protectedProcedure.query(async () => {
      return getAllUsers();
    }),
    updateRole: adminProcedure6.input(z29.object({
      userId: z29.number(),
      role: z29.enum(USER_ROLE_VALUES)
    })).mutation(async ({ input }) => {
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),
    // 新多角色更新接口
    updateRoles: adminProcedure6.input(z29.object({
      userId: z29.number(),
      roles: z29.array(z29.enum(USER_ROLE_VALUES)).min(1, "\u81F3\u5C11\u9009\u62E9\u4E00\u4E2A\u89D2\u8272")
    })).mutation(async ({ input }) => {
      await updateUserRoles(input.userId, input.roles);
      return { success: true };
    }),
    updateStatus: adminProcedure6.input(z29.object({
      userId: z29.number(),
      isActive: z29.boolean()
    })).mutation(async ({ input }) => {
      await updateUserStatus(input.userId, input.isActive);
      return { success: true };
    })
  }),
  // 订单管理
  orders: router({
    list: protectedProcedure.input(z29.object({
      paymentChannel: z29.string().optional(),
      channelOrderNo: z29.string().optional()
    }).optional()).query(async ({ ctx, input }) => {
      const { getDataScope: getDataScope2 } = await Promise.resolve().then(() => (init_permissions(), permissions_exports));
      const scope = getDataScope2(ctx);
      if (input?.channelOrderNo && input.channelOrderNo.trim() !== "") {
        if (!scope.isAdmin && !scope.isFinance) {
          throw new TRPCError26({ code: "FORBIDDEN", message: "\u65E0\u6743\u641C\u7D22\u6E20\u9053\u8BA2\u5355\u53F7" });
        }
        return searchOrdersByChannelOrderNo(input.channelOrderNo);
      }
      if (input?.paymentChannel && input.paymentChannel !== "all") {
        if (!scope.isAdmin && !scope.isFinance) {
          throw new TRPCError26({ code: "FORBIDDEN", message: "\u65E0\u6743\u6309\u652F\u4ED8\u6E20\u9053\u7B5B\u9009" });
        }
        return getOrdersByPaymentChannel(input.paymentChannel);
      }
      if (scope.isAdmin || scope.isFinance) {
        return getAllOrders();
      } else if (scope.isSales) {
        return getOrdersBySales(ctx.user.id);
      } else if (scope.isTeacher) {
        return getOrdersByTeacher(ctx.user.id);
      } else if (scope.isUser) {
        return getOrdersBySales(ctx.user.id);
      } else {
        return [];
      }
    }),
    getById: protectedProcedure.input(z29.object({ id: z29.number() })).query(async ({ ctx, input }) => {
      const { getDataScope: getDataScope2, checkResourceOwnership: checkResourceOwnership2 } = await Promise.resolve().then(() => (init_permissions(), permissions_exports));
      const scope = getDataScope2(ctx);
      const order = await getOrderById(input.id);
      if (!order) {
        throw new TRPCError26({ code: "NOT_FOUND", message: "\u8BA2\u5355\u4E0D\u5B58\u5728" });
      }
      if (scope.isAdmin || scope.isFinance) {
        return order;
      }
      if (scope.isUser || scope.isSales) {
        if (order.salesId !== ctx.user.id) {
          throw new TRPCError26({ code: "FORBIDDEN", message: "\u65E0\u6743\u67E5\u770B\u6B64\u8BA2\u5355" });
        }
        return order;
      }
      if (scope.isTeacher) {
        const user = await getUserById(ctx.user.id);
        const teacherName = user?.name || user?.nickname || "";
        if (!order.deliveryTeacher || !order.deliveryTeacher.includes(teacherName)) {
          throw new TRPCError26({ code: "FORBIDDEN", message: "\u65E0\u6743\u67E5\u770B\u6B64\u8BA2\u5355" });
        }
        return order;
      }
      throw new TRPCError26({ code: "FORBIDDEN", message: "\u65E0\u6743\u67E5\u770B\u8BA2\u5355" });
    }),
    // 更新订单支付状态
    updateStatus: salesOrAdminProcedure2.input(z29.object({
      id: z29.number(),
      status: z29.enum(["pending", "paid", "completed", "cancelled", "refunded"])
    })).mutation(async ({ input }) => {
      return updateOrderStatus(input.id, input.status);
    }),
    // 更新订单交付状态
    updateDeliveryStatus: salesOrAdminProcedure2.input(z29.object({
      id: z29.number(),
      deliveryStatus: z29.enum(["pending", "accepted", "delivered"])
    })).mutation(async ({ input, ctx }) => {
      return updateOrderDeliveryStatus(input.id, input.deliveryStatus, ctx.user.id);
    }),
    // 通用订单更新接口(简化版) - 仅用于更新状态和交付信息
    updateFields: salesOrAdminProcedure2.input(z29.object({
      id: z29.number(),
      data: z29.object({
        status: z29.enum(["pending", "paid", "completed", "cancelled", "refunded"]).optional(),
        deliveryStatus: z29.enum(["pending", "accepted", "delivered"]).optional(),
        deliveryTeacher: z29.string().optional(),
        deliveryCity: z29.string().optional(),
        deliveryRoom: z29.string().optional(),
        // 交付教室(使用deliveryRoom字段)
        deliveryCourse: z29.string().optional()
      })
    })).mutation(async ({ input }) => {
      return updateOrder(input.id, input.data);
    }),
    // 老师端查询订单 - 查询已支付但未交付的订单
    getTeacherOrders: protectedProcedure.input(z29.object({
      page: z29.number().optional().default(1),
      pageSize: z29.number().optional().default(10),
      teacherName: z29.string().optional(),
      // 可选:按老师名筛选
      city: z29.string().optional()
      // 可选:按城市筛选
    })).query(async ({ ctx, input }) => {
      const allOrders = await getTeacherPendingOrders(input.teacherName, input.city);
      const total = allOrders.length;
      const start = (input.page - 1) * input.pageSize;
      const orders2 = allOrders.slice(start, start + input.pageSize);
      return { orders: orders2, total };
    }),
    parseTransferNotes: salesOrAdminProcedure2.input(z29.object({
      text: z29.string()
    })).mutation(async () => {
      throw new TRPCError26({
        code: "METHOD_NOT_SUPPORTED",
        message: "\u8F6C\u8D26\u5907\u6CE8\u89E3\u6790\u529F\u80FD\u6682\u65F6\u4E0D\u53EF\u7528\uFF08\u7CFB\u7EDF\u7EF4\u62A4\u4E2D\uFF09"
      });
    }),
    parseWechatBill: salesOrAdminProcedure2.input(z29.object({
      rows: z29.array(z29.any()),
      template: z29.enum(["wechat", "alipay", "custom"]).optional()
    })).mutation(async () => {
      throw new TRPCError26({
        code: "METHOD_NOT_SUPPORTED",
        message: "\u5FAE\u4FE1\u8D26\u5355\u89E3\u6790\u529F\u80FD\u6682\u65F6\u4E0D\u53EF\u7528\uFF08\u7CFB\u7EDF\u7EF4\u62A4\u4E2D\uFF09"
      });
    }),
    // 用户下单接口 - 允许所有登录用户创建订单
    userCreate: protectedProcedure.input(z29.object({
      customerName: z29.string(),
      // 客户名(必填)
      customerPhone: z29.string().optional(),
      // 客户电话
      customerWechat: z29.string().optional(),
      // 客户微信
      paymentAmount: z29.string(),
      // 支付金额(必填)
      courseAmount: z29.string(),
      // 课程金额(必填)
      paymentChannel: z29.string().optional(),
      // 支付渠道
      channelOrderNo: z29.string().optional(),
      // 渠道订单号
      paymentDate: z29.string().optional(),
      // 支付日期
      paymentTime: z29.string().optional(),
      // 支付时间
      deliveryCity: z29.string().optional(),
      // 交付城市
      deliveryRoom: z29.string().optional(),
      // 交付教室
      deliveryClassroomId: z29.number().optional(),
      // 交付教室ID
      deliveryTeacher: z29.string().optional(),
      // 交付老师
      deliveryCourse: z29.string().optional(),
      // 交付课程
      classDate: z29.string().optional(),
      // 上课日期
      classTime: z29.string().optional(),
      // 上课时间
      notes: z29.string().optional()
      // 备注
    })).mutation(async ({ input, ctx }) => {
      let orderNo = generateOrderNo(input.deliveryCity);
      let suffix = 1;
      while (await checkOrderNoExists(orderNo)) {
        const suffixStr = String(suffix).padStart(3, "0");
        orderNo = generateOrderNo(input.deliveryCity, suffixStr);
        suffix++;
        if (suffix > 999) {
          throw new TRPCError26({
            code: "INTERNAL_SERVER_ERROR",
            message: "\u8BA2\u5355\u53F7\u751F\u6210\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"
          });
        }
      }
      if (input.channelOrderNo && input.channelOrderNo.trim() !== "") {
        const exists = await checkChannelOrderNoExists(input.channelOrderNo);
        if (exists) {
          const existingOrder = await getOrderByChannelOrderNo(input.channelOrderNo);
          throw new TRPCError26({
            code: "BAD_REQUEST",
            message: `\u6E20\u9053\u8BA2\u5355\u53F7\u5DF2\u5B58\u5728: ${input.channelOrderNo}
\u5173\u8054\u8BA2\u5355: ${existingOrder?.orderNo || "\u672A\u77E5"} (\u5BA2\u6237: ${existingOrder?.customerName || "\u672A\u77E5"})`
          });
        }
      }
      const { customerId, customerName: resolvedCustomerName } = await getOrCreateCustomerForUser({
        id: ctx.user.id,
        name: ctx.user.name,
        nickname: ctx.user.nickname,
        phone: ctx.user.phone
      });
      const orderData = {
        orderNo,
        customerId,
        // 关联业务客户
        customerName: input.customerName || resolvedCustomerName,
        // 优先使用输入的客户名
        salesId: ctx.user.id,
        // 记录下单用户ID
        salesPerson: ctx.user.name || ctx.user.nickname || "\u7528\u6237\u4E0B\u5355",
        // 记录下单用户名
        trafficSource: "App\u7528\u6237\u4E0B\u5355",
        // 标记来源
        paymentAmount: input.paymentAmount,
        courseAmount: input.courseAmount,
        paymentChannel: input.paymentChannel || void 0,
        channelOrderNo: input.channelOrderNo || void 0,
        paymentDate: input.paymentDate ? new Date(input.paymentDate) : void 0,
        paymentTime: input.paymentTime || void 0,
        deliveryCity: input.deliveryCity || void 0,
        deliveryRoom: input.deliveryRoom || void 0,
        deliveryClassroomId: input.deliveryClassroomId || void 0,
        deliveryTeacher: input.deliveryTeacher || void 0,
        deliveryCourse: input.deliveryCourse || void 0,
        classDate: input.classDate ? new Date(input.classDate) : void 0,
        classTime: input.classTime || void 0,
        status: "pending",
        // 默认待处理状态
        deliveryStatus: "pending",
        // 默认待接单
        notes: input.notes || void 0
      };
      const result = await createOrder(orderData);
      const id = typeof result === "object" && result.id ? result.id : result;
      return { id, orderNo, success: true };
    }),
    // 获取当前用户的订单列表
    myOrders: protectedProcedure.input(z29.object({
      status: z29.enum(["all", "pending", "paid", "completed", "cancelled", "refunded"]).optional(),
      limit: z29.number().optional(),
      offset: z29.number().optional()
    }).optional()).query(async ({ ctx, input }) => {
      const allOrders = await getOrdersBySales(ctx.user.id);
      let filteredOrders = allOrders;
      if (input?.status && input.status !== "all") {
        filteredOrders = allOrders.filter((o) => o.status === input.status);
      }
      const limit = input?.limit || 50;
      const offset = input?.offset || 0;
      const paginatedOrders = filteredOrders.slice(offset, offset + limit);
      return {
        orders: paginatedOrders,
        total: filteredOrders.length,
        hasMore: offset + limit < filteredOrders.length
      };
    }),
    create: salesOrAdminProcedure2.input(z29.object({
      orderNo: z29.string().optional(),
      customerId: z29.number().optional(),
      // 客户ID(用于余额扣款)
      customerName: z29.string().optional(),
      // 允许客户名为空
      salespersonId: z29.number().optional(),
      // 销售人员ID(关联salespersons表)
      salesPerson: z29.string().optional(),
      salesId: z29.number().optional(),
      // 销售人员ID(关联users表) - 后端自动填充
      trafficSource: z29.string().optional(),
      paymentAmount: z29.string(),
      courseAmount: z29.string(),
      accountBalance: z29.string().optional(),
      useAccountBalance: z29.boolean().optional(),
      // 是否使用账户余额支付
      paymentCity: z29.string().optional(),
      paymentChannel: z29.string().optional(),
      channelOrderNo: z29.string().optional(),
      paymentDate: z29.string().optional(),
      paymentTime: z29.string().optional(),
      teacherFee: z29.string().optional(),
      transportFee: z29.string().optional(),
      otherFee: z29.string().optional(),
      partnerFee: z29.string().optional(),
      finalAmount: z29.string().optional(),
      balanceAmount: z29.string().optional(),
      deliveryCity: z29.string().optional(),
      deliveryRoom: z29.string().optional(),
      deliveryTeacher: z29.string().optional(),
      deliveryCourse: z29.string().optional(),
      classDate: z29.string().optional(),
      classTime: z29.string().optional(),
      status: z29.enum(["pending", "paid", "completed", "cancelled", "refunded"]).optional(),
      deliveryStatus: z29.enum(["pending", "accepted", "delivered"]).optional(),
      notes: z29.string().optional()
    })).mutation(async ({ input, ctx }) => {
      if (input.customerName && input.customerName.trim() !== "") {
        const teacherNames = await getAllTeacherNames();
        if (teacherNames.includes(input.customerName.trim())) {
          throw new TRPCError26({
            code: "BAD_REQUEST",
            message: `\u5BA2\u6237\u540D\u4E0D\u80FD\u4F7F\u7528\u8001\u5E08\u540D\u5B57: ${input.customerName}`
          });
        }
      }
      const teacherFeeNum = input.teacherFee ? parseFloat(input.teacherFee) : 0;
      const courseAmountNum = input.courseAmount ? parseFloat(input.courseAmount) : 0;
      const teacherFeeValidation = validateTeacherFee(teacherFeeNum, courseAmountNum);
      if (!teacherFeeValidation.isValid) {
        throw new TRPCError26({
          code: "BAD_REQUEST",
          message: teacherFeeValidation.error || "\u8001\u5E08\u8D39\u7528\u9A8C\u8BC1\u5931\u8D25"
        });
      }
      if (input.channelOrderNo && input.channelOrderNo.trim() !== "") {
        const exists = await checkChannelOrderNoExists(input.channelOrderNo);
        if (exists) {
          const existingOrder = await getOrderByChannelOrderNo(input.channelOrderNo);
          throw new TRPCError26({
            code: "BAD_REQUEST",
            message: `\u6E20\u9053\u8BA2\u5355\u53F7\u5DF2\u5B58\u5728: ${input.channelOrderNo}
\u5173\u8054\u8BA2\u5355: ${existingOrder?.orderNo || "\u672A\u77E5"} (\u5BA2\u6237: ${existingOrder?.customerName || "\u672A\u77E5"})`
          });
        }
      }
      let orderNo = input.orderNo || generateOrderNo(input.paymentCity || input.deliveryCity);
      let suffix = 1;
      while (await checkOrderNoExists(orderNo)) {
        const suffixStr = String(suffix).padStart(3, "0");
        orderNo = generateOrderNo(input.paymentCity || input.deliveryCity, suffixStr);
        suffix++;
        if (suffix > 999) {
          throw new TRPCError26({
            code: "INTERNAL_SERVER_ERROR",
            message: "\u8BA2\u5355\u53F7\u751F\u6210\u5931\u8D25,\u8BF7\u7A0D\u540E\u91CD\u8BD5"
          });
        }
      }
      if (input.useAccountBalance && input.customerId) {
        const paymentAmount = parseFloat(input.paymentAmount);
        try {
          await consumeCustomerAccount({
            customerId: input.customerId,
            amount: paymentAmount,
            orderId: 0,
            // 临时值,后面会更新
            orderNo,
            operatorId: ctx.user.id,
            operatorName: ctx.user.name || ctx.user.nickname || "\u672A\u77E5"
          });
        } catch (error) {
          throw new TRPCError26({
            code: "BAD_REQUEST",
            message: error.message || "\u4F59\u989D\u6263\u6B3E\u5931\u8D25"
          });
        }
      }
      let partnerFee = input.partnerFee;
      if (!partnerFee && input.deliveryCity && input.courseAmount && input.teacherFee !== void 0) {
        const calculatedFee = await calculatePartnerFee(
          input.deliveryCity,
          parseFloat(input.courseAmount),
          parseFloat(input.teacherFee || "0")
        );
        partnerFee = calculatedFee.toString();
      }
      let resolvedCustomerId = input.customerId;
      let resolvedCustomerName = input.customerName;
      if (!resolvedCustomerId && ctx.user.role === "user") {
        const { customerId, customerName } = await getOrCreateCustomerForUser({
          id: ctx.user.id,
          name: ctx.user.name,
          nickname: ctx.user.nickname,
          phone: ctx.user.phone
        });
        resolvedCustomerId = customerId;
        if (!resolvedCustomerName) {
          resolvedCustomerName = customerName;
        }
      }
      const orderData = {
        orderNo,
        customerId: resolvedCustomerId || void 0,
        customerName: resolvedCustomerName,
        salespersonId: input.salespersonId || void 0,
        salesId: ctx.user.id,
        salesPerson: input.salesPerson || void 0,
        trafficSource: input.trafficSource || void 0,
        paymentAmount: input.paymentAmount,
        courseAmount: input.courseAmount,
        accountBalance: input.accountBalance || void 0,
        paymentCity: input.paymentCity || void 0,
        paymentChannel: input.paymentChannel || void 0,
        channelOrderNo: input.channelOrderNo || void 0,
        paymentDate: input.paymentDate ? new Date(input.paymentDate) : void 0,
        paymentTime: input.paymentTime || void 0,
        teacherFee: input.teacherFee || void 0,
        transportFee: input.transportFee || void 0,
        otherFee: input.otherFee || void 0,
        partnerFee: partnerFee?.toString() || void 0,
        finalAmount: input.finalAmount || void 0,
        balanceAmount: input.balanceAmount || void 0,
        deliveryCity: input.deliveryCity || void 0,
        deliveryRoom: input.deliveryRoom || void 0,
        deliveryTeacher: input.deliveryTeacher || void 0,
        deliveryCourse: input.deliveryCourse || void 0,
        classDate: input.classDate ? new Date(input.classDate) : void 0,
        classTime: input.classTime || void 0,
        status: input.status || void 0,
        deliveryStatus: input.deliveryStatus || "pending",
        notes: input.notes || void 0
      };
      const id = await createOrder(orderData);
      return { id, success: true };
    }),
    batchCreate: salesOrAdminProcedure2.input(z29.object({
      template: z29.enum(["wechat", "alipay", "custom"]),
      orders: z29.array(z29.object({
        salesperson: z29.string().optional(),
        customerName: z29.string(),
        deliveryTeacher: z29.string().optional(),
        deliveryCourse: z29.string().optional(),
        deliveryCity: z29.string().optional(),
        deliveryRoom: z29.string().optional(),
        classDate: z29.string().optional(),
        classTime: z29.string().optional(),
        paymentAmount: z29.string(),
        paymentMethod: z29.string().optional(),
        courseAmount: z29.string().optional(),
        channelOrderNo: z29.string().optional(),
        teacherFee: z29.string().optional(),
        transportFee: z29.string().optional(),
        notes: z29.string().optional(),
        // 结构化备注字段(使用nullish()同时允许null和undefined)
        noteTags: z29.string().nullish(),
        discountInfo: z29.string().nullish(),
        couponInfo: z29.string().nullish(),
        membershipInfo: z29.string().nullish(),
        paymentStatus: z29.string().nullish(),
        specialNotes: z29.string().nullish(),
        isVoided: z29.boolean().nullish()
      }))
    })).mutation(async ({ input, ctx }) => {
      let successCount = 0;
      let failCount = 0;
      const allSalespersons = await getAllSalespersons();
      for (const orderData of input.orders) {
        try {
          const orderNo = generateOrderId(
            orderData.deliveryCity,
            void 0,
            orderData.paymentMethod || void 0
          );
          const filterValue = (val) => {
            if (!val || val === "?" || val.trim() === "") return void 0;
            return val;
          };
          let salespersonId = ctx.user.id;
          let salesPerson = void 0;
          if (orderData.salesperson) {
            const sp = allSalespersons.find(
              (s) => s.nickname === orderData.salesperson || s.name === orderData.salesperson
            );
            if (sp) {
              salespersonId = sp.id;
              salesPerson = sp.nickname || sp.name || void 0;
            } else {
              salesPerson = orderData.salesperson;
            }
          }
          let partnerFee;
          const deliveryCity = filterValue(orderData.deliveryCity);
          const courseAmount = orderData.courseAmount || orderData.paymentAmount;
          const teacherFee = filterValue(orderData.teacherFee);
          if (deliveryCity && courseAmount && teacherFee) {
            const calculatedFee = await calculatePartnerFee(
              deliveryCity,
              parseFloat(courseAmount),
              parseFloat(teacherFee)
            );
            partnerFee = calculatedFee.toString();
          }
          await createOrder({
            orderNo,
            customerName: orderData.customerName,
            salesId: salespersonId,
            salesPerson,
            deliveryTeacher: filterValue(orderData.deliveryTeacher),
            deliveryCourse: filterValue(orderData.deliveryCourse),
            deliveryCity,
            deliveryRoom: filterValue(orderData.deliveryRoom),
            classDate: orderData.classDate ? new Date(orderData.classDate) : void 0,
            classTime: filterValue(orderData.classTime),
            paymentAmount: orderData.paymentAmount,
            courseAmount,
            channelOrderNo: filterValue(orderData.channelOrderNo),
            teacherFee,
            transportFee: filterValue(orderData.transportFee),
            partnerFee,
            notes: filterValue(orderData.notes),
            // 结构化备注字段
            noteTags: filterValue(orderData.noteTags),
            discountInfo: filterValue(orderData.discountInfo),
            couponInfo: filterValue(orderData.couponInfo),
            membershipInfo: filterValue(orderData.membershipInfo),
            paymentStatus: filterValue(orderData.paymentStatus),
            specialNotes: filterValue(orderData.specialNotes),
            isVoided: orderData.isVoided || false
          });
          successCount++;
        } catch (error) {
          failCount++;
          console.error("\u521B\u5EFA\u8BA2\u5355\u5931\u8D25:", error);
        }
      }
      await createSmartRegisterHistory({
        template: input.template,
        totalRows: input.orders.length,
        successCount,
        failCount,
        operatorId: ctx.user.id,
        operatorName: ctx.user.name
      });
      return { successCount, failCount };
    }),
    update: salesOrAdminProcedure2.input(z29.object({
      id: z29.number(),
      orderNo: z29.string().optional(),
      customerName: z29.string().optional(),
      salespersonId: z29.number().optional(),
      salesPerson: z29.string().optional(),
      trafficSource: z29.string().optional(),
      paymentAmount: z29.string().optional(),
      courseAmount: z29.string().optional(),
      accountBalance: z29.string().optional(),
      paymentCity: z29.string().optional(),
      paymentChannel: z29.string().optional(),
      channelOrderNo: z29.string().optional(),
      paymentDate: z29.string().optional(),
      paymentTime: z29.string().optional(),
      teacherFee: z29.string().optional(),
      transportFee: z29.string().optional(),
      otherFee: z29.string().optional(),
      partnerFee: z29.string().optional(),
      finalAmount: z29.string().optional(),
      balanceAmount: z29.string().optional(),
      deliveryCity: z29.string().optional(),
      deliveryRoom: z29.string().optional(),
      deliveryTeacher: z29.string().optional(),
      deliveryCourse: z29.string().optional(),
      classDate: z29.string().optional(),
      classTime: z29.string().optional(),
      status: z29.enum(["pending", "paid", "completed", "cancelled", "refunded"]).optional(),
      deliveryStatus: z29.enum(["pending", "accepted", "delivered"]).optional(),
      notes: z29.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const processedData = {};
      for (const [key, value] of Object.entries(updateData)) {
        if (value === void 0 || value === "") {
          continue;
        }
        processedData[key] = value;
      }
      if (processedData.paymentDate && processedData.paymentDate !== "") {
        processedData.paymentDate = new Date(processedData.paymentDate);
      }
      if (processedData.classDate && processedData.classDate !== "") {
        processedData.classDate = new Date(processedData.classDate);
      }
      if (!updateData.partnerFee && (updateData.deliveryCity || updateData.courseAmount || updateData.teacherFee !== void 0)) {
        const currentOrder = await getOrderById(id);
        if (currentOrder) {
          const deliveryCity = updateData.deliveryCity || currentOrder.deliveryCity;
          const courseAmount = updateData.courseAmount || currentOrder.courseAmount;
          const teacherFee = updateData.teacherFee !== void 0 ? updateData.teacherFee : currentOrder.teacherFee;
          if (deliveryCity && courseAmount && teacherFee !== null) {
            const calculatedFee = await calculatePartnerFee(
              deliveryCity,
              parseFloat(courseAmount),
              parseFloat(teacherFee || "0")
            );
            processedData.partnerFee = calculatedFee.toString();
          }
        }
      }
      await updateOrder(id, processedData);
      return { success: true };
    }),
    delete: protectedProcedure.input(z29.object({ id: z29.number() })).mutation(async ({ input, ctx }) => {
      try {
        console.log("[Production Debug] orders.delete \u5F00\u59CB\u6267\u884C", {
          id: input.id,
          user: ctx.user?.name,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        await deleteOrder(input.id);
        console.log("[Production Debug] orders.delete \u6267\u884C\u6210\u529F", { id: input.id });
        const result = { success: true };
        console.log("[Production Debug] orders.delete \u8FD4\u56DE\u503C", result);
        return result;
      } catch (error) {
        console.error("[Production Debug] orders.delete \u5931\u8D25", {
          id: input.id,
          errorType: error?.constructor?.name,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : void 0
        });
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "\u5220\u9664\u8BA2\u5355\u5931\u8D25",
          cause: error
        });
      }
    }),
    batchDelete: salesOrAdminProcedure2.input(z29.object({ ids: z29.array(z29.number()) })).mutation(async ({ input, ctx }) => {
      try {
        console.log("[Orders] \u6279\u91CF\u5220\u9664\u8BF7\u6C42: ids=", input.ids, "user=", ctx.user.name);
        await batchDeleteOrders(input.ids);
        console.log("[Orders] \u6279\u91CF\u5220\u9664\u6210\u529F: count=", input.ids.length);
        return { success: true, count: input.ids.length };
      } catch (error) {
        console.error("[Orders] \u6279\u91CF\u5220\u9664\u5931\u8D25: ids=", input.ids, "error=", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "\u6279\u91CF\u5220\u9664\u8BA2\u5355\u5931\u8D25"
        });
      }
    }),
    batchUpdateStatus: salesOrAdminProcedure2.input(z29.object({
      ids: z29.array(z29.number()),
      status: z29.enum(["pending", "paid", "completed", "cancelled", "refunded"])
    })).mutation(async ({ input }) => {
      await batchUpdateOrderStatus(input.ids, input.status);
      return { success: true, count: input.ids.length };
    }),
    // 批量更新订单交付状态
    batchUpdateDeliveryStatus: salesOrAdminProcedure2.input(z29.object({
      ids: z29.array(z29.number()),
      deliveryStatus: z29.enum(["pending", "accepted", "delivered"])
    })).mutation(async ({ input }) => {
      for (const id of input.ids) {
        await updateOrder(id, { deliveryStatus: input.deliveryStatus });
      }
      return { success: true, count: input.ids.length };
    }),
    // 老师查看分配给自己的订单
    getMyOrders: teacherProcedure3.input(z29.object({
      deliveryStatus: z29.enum(["pending", "accepted", "delivered"]).optional()
    }).optional()).query(async ({ ctx, input }) => {
      return getTeacherOrders(ctx.user.id, input?.deliveryStatus);
    }),
    // 老师接单
    acceptOrder: teacherProcedure3.input(z29.object({
      orderId: z29.number()
    })).mutation(async ({ ctx, input }) => {
      const order = await getOrderById(input.orderId);
      if (!order) {
        throw new TRPCError26({ code: "NOT_FOUND", message: "\u8BA2\u5355\u4E0D\u5B58\u5728" });
      }
      if (order.deliveryStatus !== "pending") {
        throw new TRPCError26({ code: "BAD_REQUEST", message: "\u8BE5\u8BA2\u5355\u5DF2\u7ECF\u88AB\u63A5\u5355\u6216\u4EA4\u4ED8" });
      }
      await updateOrder(input.orderId, {
        deliveryStatus: "accepted",
        acceptedAt: /* @__PURE__ */ new Date(),
        acceptedBy: ctx.user.id
      });
      return { success: true };
    }),
    // 批量更新订单号（添加支付方式前缀）
    batchUpdateOrderIds: adminProcedure6.mutation(async () => {
      const orders2 = await getAllOrders();
      let updatedCount = 0;
      for (const order of orders2) {
        if (order.orderNo && (order.orderNo.startsWith("pay") || order.orderNo.startsWith("we") || order.orderNo.startsWith("xj"))) {
          continue;
        }
        let prefix = "";
        const channel = order.paymentChannel?.toLowerCase() || "";
        if (channel.includes("\u652F\u4ED8\u5B9D") || channel.includes("alipay")) {
          prefix = "pay";
        } else if (channel.includes("\u5BCC\u638C\u67DC") || channel.includes("\u5FAE\u4FE1") || channel.includes("wechat")) {
          prefix = "we";
        } else if (channel.includes("\u73B0\u91D1") || channel.includes("cash")) {
          prefix = "xj";
        } else {
          continue;
        }
        const newOrderNo = prefix + order.orderNo;
        await updateOrderNo(order.id, newOrderNo);
        updatedCount++;
      }
      return { success: true, updatedCount };
    }),
    getByDateRange: protectedProcedure.input(z29.object({
      startDate: z29.string(),
      endDate: z29.string()
    })).query(async ({ input }) => {
      return getOrdersByDateRange(input.startDate, input.endDate);
    }),
    // 批量补全渠道订单号
    batchFillChannelOrderNo: adminProcedure6.input(z29.object({
      onlyMissing: z29.boolean().optional(),
      validateFormat: z29.boolean().optional(),
      autoIdentifyChannel: z29.boolean().optional()
    })).mutation(async ({ input }) => {
      const { batchFillChannelOrderNo: batchFillChannelOrderNo2 } = await Promise.resolve().then(() => (init_channelOrderNoBatchFill(), channelOrderNoBatchFill_exports));
      const result = await batchFillChannelOrderNo2(input);
      return result;
    }),
    // 预览批量补全结果
    previewBatchFillChannelOrderNo: adminProcedure6.input(z29.object({
      onlyMissing: z29.boolean().optional()
    })).query(async ({ input }) => {
      const { previewBatchFillChannelOrderNo: previewBatchFillChannelOrderNo2 } = await Promise.resolve().then(() => (init_channelOrderNoBatchFill(), channelOrderNoBatchFill_exports));
      const result = await previewBatchFillChannelOrderNo2(input);
      return result;
    }),
    // 批量修正渠道订单号
    batchUpdateChannelOrderNo: salesOrAdminProcedure2.input(z29.object({
      orderIds: z29.array(z29.number()),
      channelOrderNo: z29.string().optional()
      // 如果为空则清空
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
      let successCount = 0;
      const errors = [];
      for (const orderId of input.orderIds) {
        try {
          await db.update(orders).set({ channelOrderNo: input.channelOrderNo || null }).where(eq25(orders.id, orderId));
          successCount++;
        } catch (err) {
          errors.push(`\u8BA2\u5355ID ${orderId}: ${err.message}`);
        }
      }
      return {
        success: true,
        successCount,
        failedCount: input.orderIds.length - successCount,
        errors
      };
    }),
    // 批量验证渠道订单号格式
    batchValidateChannelOrderNo: protectedProcedure.input(z29.object({
      orderIds: z29.array(z29.number())
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
      const results = [];
      for (const orderId of input.orderIds) {
        const order = await getOrderById(orderId);
        if (!order) continue;
        const validation = validateChannelOrderNo(order.channelOrderNo || "");
        results.push({
          orderId: order.id,
          orderNo: order.orderNo,
          customerName: order.customerName,
          channelOrderNo: order.channelOrderNo,
          isValid: validation.isValid,
          channelName: validation.channelName,
          warning: validation.warning
        });
      }
      return results;
    }),
    // 导出对账报表
    exportReconciliationReport: protectedProcedure.input(z29.object({
      startDate: z29.string(),
      endDate: z29.string(),
      paymentChannel: z29.string().optional()
    })).query(async ({ input }) => {
      let orders2 = await getReconciliationReport(input.startDate, input.endDate);
      if (input.paymentChannel && input.paymentChannel !== "all") {
        orders2 = orders2.filter((order) => order.paymentChannel === input.paymentChannel);
      }
      const groupedByChannel = {};
      let totalAmount = 0;
      let totalCount = 0;
      for (const order of orders2) {
        const channel = order.paymentChannel || "\u672A\u77E5";
        if (!groupedByChannel[channel]) {
          groupedByChannel[channel] = {
            channel,
            orders: [],
            totalAmount: 0,
            count: 0
          };
        }
        const amount = parseFloat(order.paymentAmount || "0");
        groupedByChannel[channel].orders.push(order);
        groupedByChannel[channel].totalAmount += amount;
        groupedByChannel[channel].count++;
        totalAmount += amount;
        totalCount++;
      }
      return {
        startDate: input.startDate,
        endDate: input.endDate,
        totalAmount,
        totalCount,
        groupedByChannel: Object.values(groupedByChannel),
        allOrders: orders2
      };
    }),
    // 批量重新计算合伙人费(针对选中的订单)
    batchCalculatePartnerFee: protectedProcedure.input(z29.object({
      orderIds: z29.array(z29.number())
    })).mutation(async ({ input, ctx }) => {
      const { orderIds } = input;
      let updatedCount = 0;
      let unchangedCount = 0;
      let errorCount = 0;
      const updates = [];
      const errorMessages = [];
      for (const orderId of orderIds) {
        try {
          const order = await getOrderById(orderId);
          if (!order) {
            errorCount++;
            errorMessages.push(`\u8BA2\u5355ID ${orderId} \u4E0D\u5B58\u5728`);
            continue;
          }
          if (!order.deliveryCity || !order.courseAmount || order.teacherFee === null) {
            unchangedCount++;
            continue;
          }
          const courseAmount = parseFloat(order.courseAmount);
          const teacherFee = parseFloat(order.teacherFee || "0");
          const newPartnerFee = await calculatePartnerFee(
            order.deliveryCity,
            courseAmount,
            teacherFee
          );
          const oldPartnerFee = parseFloat(order.partnerFee || "0");
          if (Math.abs(newPartnerFee - oldPartnerFee) > 0.01) {
            updates.push({
              orderId: order.id,
              orderNo: order.orderNo,
              customerName: order.customerName,
              deliveryCity: order.deliveryCity,
              courseAmount,
              teacherFee,
              oldPartnerFee,
              newPartnerFee
            });
            await updateOrder(order.id, {
              partnerFee: newPartnerFee.toString()
            });
            updatedCount++;
          } else {
            unchangedCount++;
          }
        } catch (error) {
          console.error(`\u5904\u7406\u8BA2\u5355 ${orderId} \u65F6\u51FA\u9519:`, error);
          errorCount++;
          errorMessages.push(`\u8BA2\u5355ID ${orderId}: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
        }
      }
      return {
        success: true,
        totalOrders: orderIds.length,
        updatedCount,
        unchangedCount,
        errorCount,
        updates,
        errorMessages
      };
    }),
    // 导出Excel
    exportExcel: protectedProcedure.input(
      z29.object({
        orderIds: z29.array(z29.number()).optional(),
        // 可选:指定订单ID列表
        startDate: z29.string().optional(),
        // 可选:开始日期
        endDate: z29.string().optional()
        // 可选:结束日期
      })
    ).mutation(async ({ input }) => {
      try {
        const ExcelJS5 = (await import("exceljs")).default;
        let orders2;
        if (input.orderIds && input.orderIds.length > 0) {
          orders2 = await getOrdersByIds(input.orderIds);
        } else if (input.startDate && input.endDate) {
          orders2 = await getOrdersByDateRange(input.startDate, input.endDate);
        } else {
          orders2 = await getAllOrders();
        }
        const workbook = new ExcelJS5.Workbook();
        workbook.creator = "\u8BFE\u7A0B\u4EA4\u4ED8CRM\u7CFB\u7EDF";
        workbook.created = /* @__PURE__ */ new Date();
        const sheet = workbook.addWorksheet("\u8BA2\u5355\u5217\u8868");
        sheet.columns = [
          { header: "\u9500\u552E\u4EBA", key: "salesPerson", width: 12 },
          { header: "\u6D41\u91CF\u6765\u6E90", key: "trafficSource", width: 15 },
          { header: "\u5BA2\u6237\u5FAE\u4FE1\u53F7", key: "customerWechat", width: 15 },
          { header: "\u8BFE\u7A0B\u91D1\u989D", key: "courseAmount", width: 12 },
          { header: "\u8D26\u6237\u4F59\u989D", key: "accountBalance", width: 12 },
          { header: "\u8001\u5E08\u8D39\u7528", key: "teacherFee", width: 12 },
          { header: "\u8F66\u8D39", key: "transportFee", width: 10 },
          { header: "\u5176\u4ED6\u8D39\u7528", key: "otherFee", width: 12 },
          { header: "\u5408\u4F19\u4EBA\u8D39\u7528", key: "partnerFee", width: 12 },
          { header: "\u652F\u4ED8\u6E20\u9053", key: "paymentChannel", width: 15 },
          { header: "\u8BA2\u5355\u53F7", key: "orderNo", width: 20 },
          { header: "\u652F\u4ED8\u65E5\u671F", key: "paymentDate", width: 12 },
          { header: "\u652F\u4ED8\u65F6\u95F4", key: "paymentTime", width: 12 },
          { header: "\u4E0A\u8BFE\u65E5\u671F", key: "classDate", width: 12 },
          { header: "\u4E0A\u8BFE\u65F6\u95F4", key: "classTime", width: 12 },
          { header: "\u4EA4\u4ED8\u57CE\u5E02", key: "deliveryCity", width: 12 },
          { header: "\u4EA4\u4ED8\u6559\u5BA4", key: "deliveryRoom", width: 20 },
          { header: "\u4EA4\u4ED8\u8001\u5E08", key: "deliveryTeacher", width: 15 },
          { header: "\u4EA4\u4ED8\u8BFE\u7A0B", key: "deliveryCourse", width: 20 },
          { header: "\u72B6\u6001", key: "status", width: 12 },
          { header: "\u5907\u6CE8", key: "notes", width: 30 }
        ];
        orders2.forEach((order) => {
          sheet.addRow({
            salesPerson: order.salesPerson || "",
            trafficSource: order.trafficSource || "",
            customerWechat: "",
            // TODO: 需要从 customers 表查询微信号
            courseAmount: order.courseAmount || "",
            accountBalance: order.accountBalance || "",
            teacherFee: order.teacherFee || "",
            transportFee: order.transportFee || "",
            otherFee: order.otherFee || "",
            partnerFee: order.partnerFee || "",
            paymentChannel: order.paymentChannel || "",
            orderNo: order.orderNo || "",
            paymentDate: order.paymentDate ? formatDateBeijing(order.paymentDate) : "",
            paymentTime: order.paymentTime || "",
            classDate: order.classDate ? formatDateBeijing(order.classDate) : "",
            classTime: order.classTime || "",
            deliveryCity: order.deliveryCity || "",
            deliveryRoom: order.deliveryRoom || "",
            deliveryTeacher: order.deliveryTeacher || "",
            deliveryCourse: order.deliveryCourse || "",
            status: order.status || "",
            notes: order.notes || ""
          });
        });
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" }
        };
        const buffer = await workbook.xlsx.writeBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return {
          success: true,
          data: base64,
          filename: `\u8BA2\u5355\u5217\u8868_${formatDateBeijing(/* @__PURE__ */ new Date())}.xlsx`
        };
      } catch (error) {
        console.error("\u5BFC\u51FAExcel\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u5BFC\u51FAExcel\u5931\u8D25"
        });
      }
    }),
    // 下载导入模板
    downloadTemplate: protectedProcedure.mutation(async () => {
      try {
        const ExcelJS5 = (await import("exceljs")).default;
        const workbook = new ExcelJS5.Workbook();
        workbook.creator = "\u8BFE\u7A0B\u4EA4\u4ED8CRM\u7CFB\u7EDF";
        workbook.created = /* @__PURE__ */ new Date();
        const sheet = workbook.addWorksheet("\u8BA2\u5355\u5BFC\u5165\u6A21\u677F");
        sheet.columns = [
          { header: "\u9500\u552E\u4EBA", key: "salesPerson", width: 12 },
          { header: "\u6D41\u91CF\u6765\u6E90", key: "trafficSource", width: 15 },
          { header: "\u5BA2\u6237\u5FAE\u4FE1\u53F7", key: "customerWechat", width: 15 },
          { header: "\u8BFE\u7A0B\u91D1\u989D", key: "courseAmount", width: 12 },
          { header: "\u8D26\u6237\u4F59\u989D", key: "accountBalance", width: 12 },
          { header: "\u8001\u5E08\u8D39\u7528", key: "teacherFee", width: 12 },
          { header: "\u8F66\u8D39", key: "transportFee", width: 10 },
          { header: "\u5176\u4ED6\u8D39\u7528", key: "otherFee", width: 12 },
          { header: "\u5408\u4F19\u4EBA\u8D39\u7528", key: "partnerFee", width: 12 },
          { header: "\u652F\u4ED8\u6E20\u9053", key: "paymentChannel", width: 15 },
          { header: "\u8BA2\u5355\u53F7", key: "orderNo", width: 20 },
          { header: "\u652F\u4ED8\u65E5\u671F", key: "paymentDate", width: 12 },
          { header: "\u652F\u4ED8\u65F6\u95F4", key: "paymentTime", width: 12 },
          { header: "\u4E0A\u8BFE\u65E5\u671F", key: "classDate", width: 12 },
          { header: "\u4E0A\u8BFE\u65F6\u95F4", key: "classTime", width: 12 },
          { header: "\u4EA4\u4ED8\u57CE\u5E02", key: "deliveryCity", width: 12 },
          { header: "\u4EA4\u4ED8\u6559\u5BA4", key: "deliveryRoom", width: 20 },
          { header: "\u4EA4\u4ED8\u8001\u5E08", key: "deliveryTeacher", width: 15 },
          { header: "\u4EA4\u4ED8\u8BFE\u7A0B", key: "deliveryCourse", width: 20 },
          { header: "\u72B6\u6001", key: "status", width: 12 },
          { header: "\u5907\u6CE8", key: "notes", width: 30 }
        ];
        sheet.addRow({
          salesPerson: "\u5F20\u4E09",
          trafficSource: "\u5FAE\u4FE1\u670B\u53CB\u5708",
          customerWechat: "wx123456",
          courseAmount: "1000",
          accountBalance: "0",
          teacherFee: "300",
          transportFee: "50",
          otherFee: "0",
          partnerFee: "100",
          paymentChannel: "\u5FAE\u4FE1",
          orderNo: "20240227001",
          paymentDate: "2024-02-27",
          paymentTime: "14:30",
          classDate: "2024-02-28",
          classTime: "14:00-16:00",
          deliveryCity: "\u6DF1\u5733",
          deliveryRoom: "\u798F\u7530\u5E97",
          deliveryTeacher: "\u674E\u56DB",
          deliveryCourse: "BDSM\u57FA\u7840\u8BFE",
          status: "paid",
          notes: "\u793A\u4F8B\u6570\u636E"
        });
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" }
        };
        const buffer = await workbook.xlsx.writeBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return {
          success: true,
          data: base64,
          filename: `\u8BA2\u5355\u5BFC\u5165\u6A21\u677F.xlsx`
        };
      } catch (error) {
        console.error("\u4E0B\u8F7D\u6A21\u677F\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u4E0B\u8F7D\u6A21\u677F\u5931\u8D25"
        });
      }
    })
  }),
  // 老师管理
  teachers: router({
    list: publicProcedure.query(async () => {
      return getAllTeachers();
    }),
    getById: publicProcedure.input(z29.object({ id: z29.number() })).query(async ({ input }) => {
      return getTeacherById(input.id);
    }),
    // 已废弃：不再通过此API创建老师，改为在用户管理中添加"老师"角色
    create: adminProcedure6.input(z29.object({
      userId: z29.number(),
      // 关联的用户ID
      category: z29.string().optional(),
      customerType: z29.string().optional(),
      notes: z29.string().optional(),
      contractEndDate: z29.union([z29.string(), z29.date()]).optional(),
      joinDate: z29.union([z29.string(), z29.date()]).optional(),
      aliases: z29.string().optional()
    })).mutation(async ({ input }) => {
      const teacherId = await createTeacher({
        userId: input.userId,
        category: input.category,
        customerType: input.customerType,
        notes: input.notes,
        contractEndDate: input.contractEndDate,
        joinDate: input.joinDate,
        aliases: input.aliases
      });
      return { id: teacherId, success: true };
    }),
    // 只允许更新合同相关信息，基础信息在用户管理中修改
    update: adminProcedure6.input(z29.object({
      id: z29.number(),
      data: z29.object({
        category: z29.string().optional(),
        customerType: z29.string().optional(),
        notes: z29.string().optional(),
        contractEndDate: z29.union([z29.string(), z29.date()]).optional().transform((val) => val ? typeof val === "string" ? new Date(val) : val : void 0),
        joinDate: z29.union([z29.string(), z29.date()]).optional().transform((val) => val ? typeof val === "string" ? new Date(val) : val : void 0),
        aliases: z29.string().optional(),
        // 别名(逗号分隔)
        avatarUrl: z29.string().optional(),
        // 头像 URL（通过头像编辑对话框更新）
        teacherAttribute: z29.enum(["S", "M", "Switch"]).optional(),
        // 老师属性
        hourlyRate: z29.string().optional()
        // 老师费用（课时费标准）
      })
    })).mutation(async ({ input }) => {
      await updateTeacher(input.id, input.data);
      return { success: true };
    }),
    // 批量删除
    batchDelete: adminProcedure6.input(z29.object({ ids: z29.array(z29.number()) })).mutation(async ({ input }) => {
      await batchDeleteTeachers(input.ids);
      return { success: true, deletedCount: input.ids.length };
    }),
    // 更新单个老师状态
    updateStatus: adminProcedure6.input(z29.object({
      id: z29.number(),
      status: z29.string()
    })).mutation(async ({ input }) => {
      await updateTeacherStatus(input.id, input.status);
      return { success: true };
    }),
    // 批量更新状态
    batchUpdateStatus: adminProcedure6.input(z29.object({
      ids: z29.array(z29.number()),
      status: z29.string()
    })).mutation(async ({ input }) => {
      await batchUpdateTeacherStatus(input.ids, input.status);
      return { success: true, updatedCount: input.ids.length };
    }),
    // Excel导入
    importFromExcel: adminProcedure6.input(z29.object({
      teachers: z29.array(z29.object({
        id: z29.number().optional(),
        // 支持ID字段用于更新
        name: z29.string().optional(),
        nickname: z29.string().optional(),
        phone: z29.string().optional(),
        email: z29.string().optional(),
        wechat: z29.string().optional(),
        status: z29.string().optional(),
        teacherAttribute: z29.enum(["S", "M", "Switch"]).optional(),
        customerType: z29.string().optional(),
        category: z29.string().optional(),
        hourlyRate: z29.string().optional(),
        bankAccount: z29.string().optional(),
        bankName: z29.string().optional(),
        aliases: z29.string().optional(),
        // 别名字段
        notes: z29.string().optional(),
        city: z29.string().optional().refine(
          (val) => {
            if (!val || val.trim() === "") return true;
            const cities3 = val.split(";").map((c) => c.trim()).filter((c) => c !== "");
            return cities3.length > 0;
          },
          { message: "\u8BF7\u8F93\u5165\u6709\u6548\u7684\u57CE\u5E02\u540D\u79F0,\u591A\u4E2A\u57CE\u5E02\u7528\u5206\u53F7\u5206\u9694" }
        ),
        contractEndDate: z29.union([z29.string(), z29.date()]).optional().transform((val) => val ? typeof val === "string" ? new Date(val) : val : void 0),
        joinDate: z29.union([z29.string(), z29.date()]).optional().transform((val) => val ? typeof val === "string" ? new Date(val) : val : void 0)
      }))
    })).mutation(async ({ input }) => {
      const { results, stats, notFoundErrors } = await batchCreateTeachers(input.teachers);
      return {
        success: true,
        importedCount: results.length,
        teachers: results,
        stats,
        notFoundErrors
        // 找不到对应账号的错误列表
      };
    }),
    // 获取所有老师名字(用于验证)
    getAllTeacherNames: protectedProcedure.query(async () => {
      return getAllTeacherNames();
    }),
    // 获取单个老师统计数据
    getStats: protectedProcedure.input(z29.object({
      teacherId: z29.number(),
      startDate: z29.date().optional(),
      endDate: z29.date().optional()
    })).query(async ({ input }) => {
      return getTeacherStats(input.teacherId, input.startDate, input.endDate);
    }),
    // 获取所有老师统计数据
    getAllStats: protectedProcedure.input(z29.object({
      startDate: z29.date().optional(),
      endDate: z29.date().optional()
    }).optional()).query(async ({ input }) => {
      return getAllTeachersStats(input?.startDate, input?.endDate);
    })
  }),
  // 老师费用结算 - 已迁移到teacherPaymentRouter
  // teacherPayments: router({
  //   list: financeOrAdminProcedure.query(async () => {
  //     return db.getTeacherPaymentsByTeacher(0);
  //   }),
  //   getByTeacher: financeOrAdminProcedure
  //     .input(z.object({ teacherId: z.number() }))
  //     .query(async ({ input }) => {
  //       return db.getTeacherPaymentsByTeacher(input.teacherId);
  //     }),
  //   create: financeOrAdminProcedure
  //     .input(z.object({
  //       teacherId: z.number(),
  //       orderId: z.number().optional(),
  //       scheduleId: z.number().optional(),
  //       amount: z.string(),
  //       paymentMethod: z.enum(["wechat", "alipay", "bank", "cash", "other"]).optional(),
  //       transactionNo: z.string().optional(),
  //       paymentTime: z.date().optional(),
  //       status: z.enum(["pending", "paid"]).optional(),
  //       notes: z.string().optional(),
  //     }))
  //     .mutation(async ({ input, ctx }) => {
  //       const id = await db.createTeacherPayment({
  //         ...input,
  //         recordedBy: ctx.user.id,
  //       });
  //       return { id, success: true };
  //     }),
  //   updateStatus: financeOrAdminProcedure
  //     .input(z.object({
  //       id: z.number(),
  //       status: z.enum(["pending", "paid"]),
  //       paymentTime: z.date().optional(),
  //     }))
  //     .mutation(async ({ input }) => {
  //       await db.updateTeacherPaymentStatus(input.id, input.status, input.paymentTime);
  //       return { success: true };
  //     }),
  // }),
  // 财务对账
  reconciliations: router({
    list: financeOrAdminProcedure4.query(async () => {
      return getAllReconciliations();
    }),
    create: financeOrAdminProcedure4.input(z29.object({
      periodStart: z29.string(),
      periodEnd: z29.string(),
      totalIncome: z29.string(),
      totalExpense: z29.string(),
      teacherFeeTotal: z29.string().optional(),
      transportFeeTotal: z29.string().optional(),
      otherFeeTotal: z29.string().optional(),
      partnerFeeTotal: z29.string().optional(),
      profit: z29.string(),
      notes: z29.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const id = await createReconciliation({
        periodStart: new Date(input.periodStart),
        periodEnd: new Date(input.periodEnd),
        totalIncome: input.totalIncome,
        totalExpense: input.totalExpense,
        teacherFeeTotal: input.teacherFeeTotal,
        transportFeeTotal: input.transportFeeTotal,
        otherFeeTotal: input.otherFeeTotal,
        partnerFeeTotal: input.partnerFeeTotal,
        profit: input.profit,
        notes: input.notes,
        createdBy: ctx.user.id
      });
      return { id, success: true };
    }),
    update: financeOrAdminProcedure4.input(z29.object({
      id: z29.number(),
      data: z29.object({
        status: z29.enum(["draft", "confirmed"]).optional(),
        notes: z29.string().optional()
      })
    })).mutation(async ({ input }) => {
      await updateReconciliation(input.id, input.data);
      return { success: true };
    })
  }),
  // 数据导入
  import: importRouter,
  // 元数据查询 - 为前端APP提供基础数据列表
  metadata: router({
    // 获取所有唯一城市列表
    getCities: publicProcedure.query(async () => {
      try {
        const cities3 = await getUniqueCities();
        return {
          success: true,
          data: cities3,
          count: cities3.length
        };
      } catch (error) {
        console.error("\u83B7\u53D6\u57CE\u5E02\u5217\u8868\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u83B7\u53D6\u57CE\u5E02\u5217\u8868\u5931\u8D25"
        });
      }
    }),
    // 获取所有唯一课程类型列表
    getCourses: publicProcedure.query(async () => {
      try {
        const courses2 = await getUniqueCourses();
        return {
          success: true,
          data: courses2,
          count: courses2.length
        };
      } catch (error) {
        console.error("\u83B7\u53D6\u8BFE\u7A0B\u5217\u8868\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u83B7\u53D6\u8BFE\u7A0B\u5217\u8868\u5931\u8D25"
        });
      }
    }),
    // 获取所有唯一教室列表
    getClassrooms: publicProcedure.query(async () => {
      try {
        const classrooms2 = await getUniqueClassrooms();
        return {
          success: true,
          data: classrooms2,
          count: classrooms2.length
        };
      } catch (error) {
        console.error("\u83B7\u53D6\u6559\u5BA4\u5217\u8868\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u83B7\u53D6\u6559\u5BA4\u5217\u8868\u5931\u8D25"
        });
      }
    }),
    // 获取所有唯一老师名称列表
    getTeacherNames: publicProcedure.query(async () => {
      try {
        const teacherNames = await getUniqueTeacherNames();
        return {
          success: true,
          data: teacherNames,
          count: teacherNames.length
        };
      } catch (error) {
        console.error("\u83B7\u53D6\u8001\u5E08\u540D\u79F0\u5217\u8868\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u83B7\u53D6\u8001\u5E08\u540D\u79F0\u5217\u8868\u5931\u8D25"
        });
      }
    }),
    // 获取所有销售人员列表
    getSalespeople: publicProcedure.query(async () => {
      try {
        const salespeople = await getAllSalespersons();
        return {
          success: true,
          data: salespeople,
          count: salespeople.length
        };
      } catch (error) {
        console.error("\u83B7\u53D6\u9500\u552E\u4EBA\u5458\u5217\u8868\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u83B7\u53D6\u9500\u552E\u4EBA\u5458\u5217\u8868\u5931\u8D25"
        });
      }
    }),
    // 获取所有唯一老师分类列表(S、M、SW等)
    getTeacherCategories: publicProcedure.query(async () => {
      try {
        const categories = await getUniqueTeacherCategories();
        return {
          success: true,
          data: categories,
          count: categories.length
        };
      } catch (error) {
        console.error("\u83B7\u53D6\u8001\u5E08\u5206\u7C7B\u5217\u8868\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u83B7\u53D6\u8001\u5E08\u5206\u7C7B\u5217\u8868\u5931\u8D25"
        });
      }
    }),
    // 获取所有唯一课程价格列表
    getCourseAmounts: publicProcedure.query(async () => {
      try {
        const amounts = await getUniqueCourseAmounts();
        return {
          success: true,
          data: amounts,
          count: amounts.length
        };
      } catch (error) {
        console.error("\u83B7\u53D6\u8BFE\u7A0B\u4EF7\u683C\u5217\u8868\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u83B7\u53D6\u8BFE\u7A0B\u4EF7\u683C\u5217\u8868\u5931\u8D25"
        });
      }
    }),
    // 获取所有元数据(一次性获取所有基础数据)
    getAll: publicProcedure.query(async () => {
      try {
        const [cities3, courses2, classrooms2, teacherNames, salespeople, teacherCategories, courseAmounts] = await Promise.all([
          getUniqueCities(),
          getUniqueCourses(),
          getUniqueClassrooms(),
          getUniqueTeacherNames(),
          getAllSalespersons(),
          getUniqueTeacherCategories(),
          getUniqueCourseAmounts()
        ]);
        return {
          success: true,
          data: {
            cities: cities3,
            courses: courses2,
            classrooms: classrooms2,
            teacherNames,
            salespeople,
            teacherCategories,
            courseAmounts
          },
          counts: {
            cities: cities3.length,
            courses: courses2.length,
            classrooms: classrooms2.length,
            teacherNames: teacherNames.length,
            salespeople: salespeople.length,
            teacherCategories: teacherCategories.length,
            courseAmounts: courseAmounts.length
          }
        };
      } catch (error) {
        console.error("\u83B7\u53D6\u5143\u6570\u636E\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u83B7\u53D6\u5143\u6570\u636E\u5931\u8D25"
        });
      }
    })
  }),
  // 课程管理
  courses: router({
    // 获取所有课程列表(公开接口)
    list: publicProcedure.query(async () => {
      try {
        const courseList = await getAllCourses();
        return {
          success: true,
          data: courseList,
          count: courseList.length
        };
      } catch (error) {
        console.error("\u83B7\u53D6\u8BFE\u7A0B\u5217\u8868\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u83B7\u53D6\u8BFE\u7A0B\u5217\u8868\u5931\u8D25"
        });
      }
    }),
    // 根据ID获取课程详情(公开接口)
    getById: publicProcedure.input(z29.object({ id: z29.number() })).query(async ({ input }) => {
      try {
        const course = await getCourseById(input.id);
        if (!course) {
          return {
            success: false,
            message: `\u672A\u627E\u5230ID\u4E3A${input.id}\u7684\u8BFE\u7A0B`,
            data: null
          };
        }
        return {
          success: true,
          data: course
        };
      } catch (error) {
        console.error(`\u83B7\u53D6\u8BFE\u7A0BID${input.id}\u5931\u8D25:`, error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u83B7\u53D6\u8BFE\u7A0B\u8BE6\u60C5\u5931\u8D25"
        });
      }
    }),
    // 创建课程(需要管理员权限)
    create: protectedProcedure.input(
      z29.object({
        name: z29.string().min(1, "\u8BFE\u7A0B\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A"),
        alias: z29.string().optional(),
        introduction: z29.string().max(20, "\u8BFE\u7A0B\u4ECB\u7ECD\u4E0D\u80FD\u8D85\u8FC720\u5B57").optional(),
        description: z29.string().optional(),
        price: z29.number().min(0, "\u8BFE\u7A0B\u4EF7\u683C\u4E0D\u80FD\u4E3A\u8D1F\u6570"),
        duration: z29.number().min(0, "\u8BFE\u7A0B\u65F6\u957F\u4E0D\u80FD\u4E3A\u8D1F\u6570"),
        level: z29.enum(["\u5165\u95E8", "\u6DF1\u5EA6", "\u8BA2\u5236", "\u5267\u672C"]),
        isHot: z29.number().min(0).max(1).optional()
      })
    ).mutation(async ({ input, ctx }) => {
      try {
        const courseId = await createCourse({
          name: input.name,
          alias: input.alias || null,
          introduction: input.introduction || null,
          description: input.description || null,
          price: input.price.toString(),
          duration: input.duration.toString(),
          level: input.level,
          isActive: true,
          isHot: input.isHot !== void 0 ? input.isHot : 0
        });
        return {
          success: true,
          data: { id: courseId },
          message: "\u8BFE\u7A0B\u521B\u5EFA\u6210\u529F"
        };
      } catch (error) {
        console.error("\u521B\u5EFA\u8BFE\u7A0B\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u521B\u5EFA\u8BFE\u7A0B\u5931\u8D25"
        });
      }
    }),
    // 更新课程(需要管理员权限)
    update: protectedProcedure.input(
      z29.object({
        id: z29.number(),
        name: z29.string().min(1, "\u8BFE\u7A0B\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A").optional(),
        alias: z29.string().optional(),
        introduction: z29.string().max(20, "\u8BFE\u7A0B\u4ECB\u7ECD\u4E0D\u80FD\u8D85\u8FC720\u5B57").optional(),
        description: z29.string().optional(),
        price: z29.number().min(0, "\u8BFE\u7A0B\u4EF7\u683C\u4E0D\u80FD\u4E3A\u8D1F\u6570").optional(),
        duration: z29.number().min(0, "\u8BFE\u7A0B\u65F6\u957F\u4E0D\u80FD\u4E3A\u8D1F\u6570").optional(),
        level: z29.enum(["\u5165\u95E8", "\u6DF1\u5EA6", "\u8BA2\u5236", "\u5267\u672C"]).optional(),
        isHot: z29.number().min(0).max(1).optional(),
        teacherFee: z29.number().min(0, "\u8001\u5E08\u8D39\u7528\u4E0D\u80FD\u4E3A\u8D1F\u6570").nullable().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      try {
        const { id, ...updateData } = input;
        const dataToUpdate = {};
        if (updateData.name !== void 0) dataToUpdate.name = updateData.name;
        if (updateData.alias !== void 0) dataToUpdate.alias = updateData.alias || null;
        if (updateData.introduction !== void 0) dataToUpdate.introduction = updateData.introduction;
        if (updateData.description !== void 0) dataToUpdate.description = updateData.description;
        if (updateData.price !== void 0) dataToUpdate.price = updateData.price.toString();
        if (updateData.duration !== void 0) dataToUpdate.duration = updateData.duration.toString();
        if (updateData.level !== void 0) dataToUpdate.level = updateData.level;
        if (updateData.isHot !== void 0) dataToUpdate.isHot = updateData.isHot;
        if (updateData.teacherFee !== void 0) dataToUpdate.teacherFee = updateData.teacherFee !== null ? updateData.teacherFee.toString() : null;
        await updateCourse(id, dataToUpdate);
        return {
          success: true,
          message: "\u8BFE\u7A0B\u66F4\u65B0\u6210\u529F"
        };
      } catch (error) {
        console.error("\u66F4\u65B0\u8BFE\u7A0B\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u66F4\u65B0\u8BFE\u7A0B\u5931\u8D25"
        });
      }
    }),
    // 切换课程启用状态(需要管理员权限)
    toggleActive: protectedProcedure.input(z29.object({ id: z29.number() })).mutation(async ({ input, ctx }) => {
      try {
        const newStatus = await toggleCourseActive(input.id);
        return {
          success: true,
          data: { isActive: newStatus },
          message: `\u8BFE\u7A0B\u5DF2${newStatus ? "\u542F\u7528" : "\u505C\u7528"}`
        };
      } catch (error) {
        console.error("\u5207\u6362\u8BFE\u7A0B\u72B6\u6001\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u5207\u6362\u8BFE\u7A0B\u72B6\u6001\u5931\u8D25"
        });
      }
    }),
    // 删除课程(需要管理员权限)
    delete: protectedProcedure.input(z29.object({ id: z29.number() })).mutation(async ({ input, ctx }) => {
      try {
        await deleteCourse(input.id);
        return {
          success: true,
          message: "\u8BFE\u7A0B\u5220\u9664\u6210\u529F"
        };
      } catch (error) {
        console.error("\u5220\u9664\u8BFE\u7A0B\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u5220\u9664\u8BFE\u7A0B\u5931\u8D25"
        });
      }
    }),
    // 批量导入课程(需要管理员权限)
    importFromExcel: protectedProcedure.input(
      z29.object({
        courses: z29.array(
          z29.object({
            name: z29.string().min(1, "\u8BFE\u7A0B\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A"),
            alias: z29.string().optional(),
            introduction: z29.string().max(20, "\u8BFE\u7A0B\u4ECB\u7ECD\u4E0D\u80FD\u8D85\u8FC720\u5B57").optional(),
            description: z29.string().optional(),
            price: z29.number().min(0, "\u8BFE\u7A0B\u4EF7\u683C\u4E0D\u80FD\u4E3A\u8D1F\u6570"),
            duration: z29.number().min(0, "\u8BFE\u7A0B\u65F6\u957F\u4E0D\u80FD\u4E3A\u8D1F\u6570"),
            level: z29.enum(["\u5165\u95E8", "\u6DF1\u5EA6", "\u8BA2\u5236", "\u5267\u672C"]),
            isHot: z29.number().min(0).max(1).optional()
          })
        )
      })
    ).mutation(async ({ input, ctx }) => {
      try {
        const results = {
          success: 0,
          failed: 0,
          errors: []
        };
        for (const course of input.courses) {
          try {
            await createCourse({
              name: course.name,
              alias: course.alias || null,
              introduction: course.introduction || null,
              description: course.description || null,
              price: course.price.toString(),
              duration: course.duration.toString(),
              level: course.level,
              isActive: true,
              isHot: course.isHot !== void 0 ? course.isHot : 0
            });
            results.success++;
          } catch (error) {
            results.failed++;
            results.errors.push(`${course.name}: ${error.message}`);
          }
        }
        return {
          success: true,
          data: results,
          message: `\u5BFC\u5165\u5B8C\u6210: \u6210\u529F ${results.success} \u6761, \u5931\u8D25 ${results.failed} \u6761`
        };
      } catch (error) {
        console.error("\u6279\u91CF\u5BFC\u5165\u8BFE\u7A0B\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u6279\u91CF\u5BFC\u5165\u8BFE\u7A0B\u5931\u8D25"
        });
      }
    })
  }),
  // 教室管理
  classrooms: router({
    // 获取所有教室列表(公开接口)
    list: publicProcedure.query(async () => {
      try {
        const classroomList = await getAllClassrooms();
        return classroomList;
      } catch (error) {
        console.error("\u83B7\u53D6\u6559\u5BA4\u5217\u8868\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u83B7\u53D6\u6559\u5BA4\u5217\u8868\u5931\u8D25"
        });
      }
    }),
    // 根据城市ID获取教室列表(公开接口)
    getByCityId: publicProcedure.input(z29.object({ cityId: z29.number() })).query(async ({ input }) => {
      try {
        const classroomList = await getClassroomsByCityId(input.cityId);
        return classroomList;
      } catch (error) {
        console.error(`\u83B7\u53D6\u57CE\u5E02ID${input.cityId}\u7684\u6559\u5BA4\u5217\u8868\u5931\u8D25:`, error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u83B7\u53D6\u6559\u5BA4\u5217\u8868\u5931\u8D25"
        });
      }
    }),
    // 根据城市名称获取教室列表(公开接口)
    getByCityName: publicProcedure.input(z29.object({ cityName: z29.string() })).query(async ({ input }) => {
      try {
        const classroomList = await getClassroomsByCityName(input.cityName);
        return classroomList;
      } catch (error) {
        console.error(`\u83B7\u53D6\u57CE\u5E02${input.cityName}\u7684\u6559\u5BA4\u5217\u8868\u5931\u8D25:`, error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u83B7\u53D6\u6559\u5BA4\u5217\u8868\u5931\u8D25"
        });
      }
    }),
    // 根据ID获取教室详情(公开接口)
    getById: publicProcedure.input(z29.object({ id: z29.number() })).query(async ({ input }) => {
      try {
        const classroom = await getClassroomById(input.id);
        if (!classroom) {
          throw new TRPCError26({
            code: "NOT_FOUND",
            message: `\u672A\u627E\u5230ID\u4E3A${input.id}\u7684\u6559\u5BA4`
          });
        }
        return classroom;
      } catch (error) {
        console.error(`\u83B7\u53D6\u6559\u5BA4ID${input.id}\u5931\u8D25:`, error);
        throw error;
      }
    }),
    // 创建教室(需要管理员权限)
    create: protectedProcedure.input(
      z29.object({
        cityId: z29.number(),
        cityName: z29.string(),
        name: z29.string().min(1, "\u6559\u5BA4\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A"),
        address: z29.string().min(1, "\u6559\u5BA4\u5730\u5740\u4E0D\u80FD\u4E3A\u7A7A"),
        notes: z29.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      try {
        const classroomId = await createClassroom({
          cityId: input.cityId,
          cityName: input.cityName,
          name: input.name,
          address: input.address,
          notes: input.notes || null,
          isActive: true,
          sortOrder: 0
        });
        return {
          success: true,
          data: { id: classroomId },
          message: "\u6559\u5BA4\u521B\u5EFA\u6210\u529F"
        };
      } catch (error) {
        console.error("\u521B\u5EFA\u6559\u5BA4\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u521B\u5EFA\u6559\u5BA4\u5931\u8D25"
        });
      }
    }),
    // 更新教室(需要管理员权限)
    update: protectedProcedure.input(
      z29.object({
        id: z29.number(),
        name: z29.string().min(1, "\u6559\u5BA4\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A").optional(),
        address: z29.string().min(1, "\u6559\u5BA4\u5730\u5740\u4E0D\u80FD\u4E3A\u7A7A").optional(),
        notes: z29.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      try {
        const { id, ...updateData } = input;
        await updateClassroom(id, updateData);
        return {
          success: true,
          message: "\u6559\u5BA4\u66F4\u65B0\u6210\u529F"
        };
      } catch (error) {
        console.error("\u66F4\u65B0\u6559\u5BA4\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u66F4\u65B0\u6559\u5BA4\u5931\u8D25"
        });
      }
    }),
    // 切换教室启用状态(需要管理员权限)
    toggleActive: protectedProcedure.input(z29.object({ id: z29.number() })).mutation(async ({ input, ctx }) => {
      try {
        const newStatus = await toggleClassroomActive(input.id);
        return {
          success: true,
          data: { isActive: newStatus },
          message: `\u6559\u5BA4\u5DF2${newStatus ? "\u542F\u7528" : "\u505C\u7528"}`
        };
      } catch (error) {
        console.error("\u5207\u6362\u6559\u5BA4\u72B6\u6001\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u5207\u6362\u6559\u5BA4\u72B6\u6001\u5931\u8D25"
        });
      }
    }),
    // 删除教室(需要管理员权限)
    delete: protectedProcedure.input(z29.object({ id: z29.number() })).mutation(async ({ input, ctx }) => {
      try {
        await deleteClassroom(input.id);
        return {
          success: true,
          message: "\u6559\u5BA4\u5220\u9664\u6210\u529F"
        };
      } catch (error) {
        console.error("\u5220\u9664\u6559\u5BA4\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u5220\u9664\u6559\u5BA4\u5931\u8D25"
        });
      }
    })
  }),
  // 城市合伙人费配置
  // ============ 账户余额管理 ============
  account: router({
    // App用户查询自己的余额(通过登录Token获取用户，再查关联的业务客户)
    getMyBalance: protectedProcedure.query(async ({ ctx }) => {
      const customer = await getCustomerByUserId(ctx.user.id);
      if (!customer) {
        return { success: true, data: { balance: "0.00", customerId: null, customerName: null } };
      }
      const transactions = await getCustomerTransactions(customer.id);
      const latestBalance = transactions.length > 0 ? transactions[0].balanceAfter : customer.accountBalance;
      return {
        success: true,
        data: {
          balance: latestBalance || "0.00",
          customerId: customer.id,
          customerName: customer.name
        }
      };
    }),
    // App用户查询自己的账户流水
    getMyTransactions: protectedProcedure.input(z29.object({
      limit: z29.number().min(1).max(100).optional(),
      offset: z29.number().min(0).optional()
    }).optional()).query(async ({ ctx, input }) => {
      const customer = await getCustomerByUserId(ctx.user.id);
      if (!customer) {
        return { success: true, data: { transactions: [], total: 0 } };
      }
      const allTransactions = await getCustomerTransactions(customer.id);
      const limit = input?.limit || 20;
      const offset = input?.offset || 0;
      const paged = allTransactions.slice(offset, offset + limit);
      return {
        success: true,
        data: {
          transactions: paged,
          total: allTransactions.length
        }
      };
    }),
    // 管理员/销售查询指定客户的余额
    getCustomerBalance: protectedProcedure.input(z29.object({ customerId: z29.number() })).query(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError26({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u672A\u521D\u59CB\u5316" });
      const [cust] = await dbInstance.select().from(customers).where(eq25(customers.id, input.customerId));
      if (!cust) {
        return { success: false, error: "\u5BA2\u6237\u4E0D\u5B58\u5728" };
      }
      const transactions = await getCustomerTransactions(input.customerId);
      const latestBalance = transactions.length > 0 ? transactions[0].balanceAfter : cust.accountBalance;
      return {
        success: true,
        data: {
          balance: latestBalance || "0.00",
          customerId: cust.id,
          customerName: cust.name
        }
      };
    }),
    // 管理员/销售查询指定客户的流水
    getCustomerTransactions: protectedProcedure.input(z29.object({
      customerId: z29.number(),
      limit: z29.number().min(1).max(100).optional(),
      offset: z29.number().min(0).optional()
    })).query(async ({ input }) => {
      const allTransactions = await getCustomerTransactions(input.customerId);
      const limit = input.limit || 20;
      const offset = input.offset || 0;
      const paged = allTransactions.slice(offset, offset + limit);
      return {
        success: true,
        data: {
          transactions: paged,
          total: allTransactions.length
        }
      };
    }),
    // 客户充值(管理员/销售操作)
    recharge: protectedProcedure.input(z29.object({
      customerId: z29.number(),
      amount: z29.number().positive("\u5145\u503C\u91D1\u989D\u5FC5\u987B\u5927\u4E8E0"),
      notes: z29.string().optional()
    })).mutation(async ({ input, ctx }) => {
      try {
        const result = await rechargeCustomerAccount({
          customerId: input.customerId,
          amount: input.amount,
          notes: input.notes || `\u7BA1\u7406\u5458\u5145\u503C`,
          operatorId: ctx.user.id,
          operatorName: ctx.user.name || ctx.user.nickname || "\u672A\u77E5"
        });
        return {
          success: true,
          data: {
            balanceBefore: result.balanceBefore.toFixed(2),
            balanceAfter: result.balanceAfter.toFixed(2)
          }
        };
      } catch (error) {
        return { success: false, error: error.message || "\u5145\u503C\u5931\u8D25" };
      }
    }),
    // 客户退款(管理员操作)
    refund: protectedProcedure.input(z29.object({
      customerId: z29.number(),
      amount: z29.number().positive("\u9000\u6B3E\u91D1\u989D\u5FC5\u987B\u5927\u4E8E0"),
      orderId: z29.number(),
      orderNo: z29.string()
    })).mutation(async ({ input, ctx }) => {
      try {
        const result = await refundCustomerAccount({
          customerId: input.customerId,
          amount: input.amount,
          orderId: input.orderId,
          orderNo: input.orderNo,
          operatorId: ctx.user.id,
          operatorName: ctx.user.name || ctx.user.nickname || "\u672A\u77E5"
        });
        return {
          success: true,
          data: {
            balanceBefore: result.balanceBefore.toFixed(2),
            balanceAfter: result.balanceAfter.toFixed(2)
          }
        };
      } catch (error) {
        return { success: false, error: error.message || "\u9000\u6B3E\u5931\u8D25" };
      }
    })
  }),
  cityPartnerConfig: router({
    // 获取所有城市配置(公开接口)
    list: publicProcedure.query(async () => {
      try {
        const configs = await getAllCityPartnerConfigs();
        return {
          success: true,
          data: configs,
          count: configs.length
        };
      } catch (error) {
        console.error("\u83B7\u53D6\u57CE\u5E02\u5408\u4F19\u4EBA\u8D39\u914D\u7F6E\u5931\u8D25:", error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u83B7\u53D6\u57CE\u5E02\u5408\u4F19\u4EBA\u8D39\u914D\u7F6E\u5931\u8D25"
        });
      }
    }),
    // 根据城市名获取配置(公开接口)
    getByCity: publicProcedure.input(z29.object({ city: z29.string() })).query(async ({ input }) => {
      try {
        const config = await getCityPartnerConfigByCity(input.city);
        if (!config) {
          return {
            success: false,
            message: `\u672A\u627E\u5230\u57CE\u5E02${input.city}\u7684\u5408\u4F19\u4EBA\u8D39\u914D\u7F6E`,
            data: null
          };
        }
        return {
          success: true,
          data: config
        };
      } catch (error) {
        console.error(`\u83B7\u53D6\u57CE\u5E02${input.city}\u7684\u5408\u4F19\u4EBA\u8D39\u914D\u7F6E\u5931\u8D25:`, error);
        throw new TRPCError26({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u83B7\u53D6\u914D\u7F6E\u5931\u8D25"
        });
      }
    })
  })
});

// server/_core/context.ts
init_const();
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    const errorMessage = String(error);
    if (errorMessage.includes("JWSSignatureVerificationFailed") || errorMessage.includes("signature verification failed") || errorMessage.includes("Invalid session cookie")) {
      const cookieOptions = getSessionCookieOptions(opts.req);
      opts.res.clearCookie(COOKIE_NAME, cookieOptions);
      console.log("[Auth] Cleared invalid session cookie due to signature verification failure");
    }
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/paymentWebhook.ts
init_db();
init_schema();
import { eq as eq26 } from "drizzle-orm";
import crypto from "crypto";
async function handleWechatPaymentNotify(req, res) {
  try {
    const isValid = await verifyWechatSignature(req);
    if (!isValid) {
      console.error("[Wechat Webhook] \u7B7E\u540D\u9A8C\u8BC1\u5931\u8D25");
      return res.status(400).send("FAIL");
    }
    const { out_trade_no, transaction_id, trade_state } = req.body;
    if (trade_state !== "SUCCESS") {
      console.log(`[Wechat Webhook] \u652F\u4ED8\u672A\u6210\u529F\uFF0C\u72B6\u6001: ${trade_state}`);
      return res.send("SUCCESS");
    }
    const orderNo = out_trade_no;
    await updateOrderStatus2(orderNo, {
      status: "paid",
      paymentChannel: "wechat",
      channelOrderNo: transaction_id,
      paymentDate: (/* @__PURE__ */ new Date()).toISOString()
    });
    res.send("SUCCESS");
  } catch (error) {
    console.error("[Wechat Webhook] \u5904\u7406\u5931\u8D25:", error);
    res.status(500).send("FAIL");
  }
}
async function handleAlipayPaymentNotify(req, res) {
  try {
    const isValid = await verifyAlipaySignature(req);
    if (!isValid) {
      console.error("[Alipay Webhook] \u7B7E\u540D\u9A8C\u8BC1\u5931\u8D25");
      return res.send("failure");
    }
    const { out_trade_no, trade_no, trade_status } = req.body;
    if (trade_status !== "TRADE_SUCCESS" && trade_status !== "TRADE_FINISHED") {
      console.log(`[Alipay Webhook] \u652F\u4ED8\u672A\u6210\u529F\uFF0C\u72B6\u6001: ${trade_status}`);
      return res.send("success");
    }
    const orderNo = out_trade_no;
    await updateOrderStatus2(orderNo, {
      status: "paid",
      paymentChannel: "alipay",
      channelOrderNo: trade_no,
      paymentDate: (/* @__PURE__ */ new Date()).toISOString()
    });
    res.send("success");
  } catch (error) {
    console.error("[Alipay Webhook] \u5904\u7406\u5931\u8D25:", error);
    res.send("failure");
  }
}
async function updateOrderStatus2(orderNo, data) {
  const db = await getDb();
  if (!db) {
    throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  }
  const [order] = await db.select().from(orders).where(eq26(orders.orderNo, orderNo)).limit(1);
  if (!order) {
    console.error(`[Payment Webhook] \u8BA2\u5355\u4E0D\u5B58\u5728: ${orderNo}`);
    throw new Error("\u8BA2\u5355\u4E0D\u5B58\u5728");
  }
  if (order.status === "paid") {
    console.log(`[Payment Webhook] \u8BA2\u5355\u5DF2\u652F\u4ED8\uFF0C\u5E42\u7B49\u6027\u5904\u7406: ${orderNo}`);
    return;
  }
  await db.update(orders).set({
    status: data.status,
    paymentChannel: data.paymentChannel,
    channelOrderNo: data.channelOrderNo,
    paymentDate: new Date(data.paymentDate),
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq26(orders.orderNo, orderNo));
  console.log(`[Payment Webhook] \u8BA2\u5355\u72B6\u6001\u66F4\u65B0\u6210\u529F: ${orderNo}`);
}
async function verifyWechatSignature(req) {
  if (process.env.NODE_ENV === "development") {
    console.warn("[Wechat Webhook] \u5F00\u53D1\u73AF\u5883\u8DF3\u8FC7\u7B7E\u540D\u9A8C\u8BC1");
    return true;
  }
  const { signature, timestamp: timestamp2, nonce } = req.body;
  const apiKey = process.env.WECHAT_API_KEY;
  if (!apiKey) {
    console.error("[Wechat Webhook] \u7F3A\u5C11WECHAT_API_KEY\u73AF\u5883\u53D8\u91CF");
    return false;
  }
  const params = { ...req.body };
  delete params.signature;
  const sortedKeys = Object.keys(params).sort();
  const signString = sortedKeys.map((key) => `${key}=${params[key]}`).join("&") + `&key=${apiKey}`;
  const calculatedSign = crypto.createHash("md5").update(signString).digest("hex").toUpperCase();
  return calculatedSign === signature;
}
async function verifyAlipaySignature(req) {
  if (process.env.NODE_ENV === "development") {
    console.warn("[Alipay Webhook] \u5F00\u53D1\u73AF\u5883\u8DF3\u8FC7\u7B7E\u540D\u9A8C\u8BC1");
    return true;
  }
  const { sign, sign_type } = req.body;
  const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;
  if (!alipayPublicKey) {
    console.error("[Alipay Webhook] \u7F3A\u5C11ALIPAY_PUBLIC_KEY\u73AF\u5883\u53D8\u91CF");
    return false;
  }
  const params = { ...req.body };
  delete params.sign;
  delete params.sign_type;
  const sortedKeys = Object.keys(params).sort();
  const signString = sortedKeys.map((key) => `${key}=${params[key]}`).join("&");
  return true;
}

// server/_core/membershipWebhook.ts
init_db();
init_schema();
import { eq as eq27 } from "drizzle-orm";
import crypto2 from "crypto";
async function handleMembershipWechatNotify(req, res) {
  try {
    const isValid = await verifyWechatSignature2(req);
    if (!isValid) {
      console.error("[Membership Wechat Webhook] \u7B7E\u540D\u9A8C\u8BC1\u5931\u8D25");
      return res.status(400).send("FAIL");
    }
    const { out_trade_no, transaction_id, trade_state } = req.body;
    if (trade_state !== "SUCCESS") {
      console.log(`[Membership Wechat Webhook] \u652F\u4ED8\u672A\u6210\u529F\uFF0C\u72B6\u6001: ${trade_state}`);
      return res.send("SUCCESS");
    }
    await activateMembership2(out_trade_no, {
      paymentChannel: "wechat",
      channelOrderNo: transaction_id
    });
    res.send("SUCCESS");
  } catch (error) {
    console.error("[Membership Wechat Webhook] \u5904\u7406\u5931\u8D25:", error);
    res.status(500).send("FAIL");
  }
}
async function handleMembershipAlipayNotify(req, res) {
  try {
    const isValid = await verifyAlipaySignature2(req);
    if (!isValid) {
      console.error("[Membership Alipay Webhook] \u7B7E\u540D\u9A8C\u8BC1\u5931\u8D25");
      return res.send("failure");
    }
    const { out_trade_no, trade_no, trade_status } = req.body;
    if (trade_status !== "TRADE_SUCCESS" && trade_status !== "TRADE_FINISHED") {
      console.log(`[Membership Alipay Webhook] \u652F\u4ED8\u672A\u6210\u529F\uFF0C\u72B6\u6001: ${trade_status}`);
      return res.send("success");
    }
    await activateMembership2(out_trade_no, {
      paymentChannel: "alipay",
      channelOrderNo: trade_no
    });
    res.send("success");
  } catch (error) {
    console.error("[Membership Alipay Webhook] \u5904\u7406\u5931\u8D25:", error);
    res.send("failure");
  }
}
async function activateMembership2(orderNo, data) {
  const db = await getDb();
  if (!db) {
    throw new Error("\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25");
  }
  const [memberOrder] = await db.select().from(membershipOrders).where(eq27(membershipOrders.orderNo, orderNo)).limit(1);
  if (!memberOrder) {
    console.error(`[Membership Webhook] \u4F1A\u5458\u8BA2\u5355\u4E0D\u5B58\u5728: ${orderNo}`);
    throw new Error("\u4F1A\u5458\u8BA2\u5355\u4E0D\u5B58\u5728");
  }
  if (memberOrder.status === "paid") {
    console.log(`[Membership Webhook] \u4F1A\u5458\u8BA2\u5355\u5DF2\u652F\u4ED8\uFF0C\u5E42\u7B49\u6027\u5904\u7406: ${orderNo}`);
    return;
  }
  const now = /* @__PURE__ */ new Date();
  const paidAt = now.toISOString();
  await db.update(membershipOrders).set({
    status: "paid",
    paymentChannel: data.paymentChannel,
    channelOrderNo: data.channelOrderNo,
    paymentDate: now,
    updatedAt: now
  }).where(eq27(membershipOrders.orderNo, orderNo));
  const [currentUser] = await db.select().from(users).where(eq27(users.id, memberOrder.userId)).limit(1);
  if (!currentUser) {
    throw new Error("\u7528\u6237\u4E0D\u5B58\u5728");
  }
  const [plan] = await db.select().from(membershipPlans).where(eq27(membershipPlans.id, memberOrder.planId)).limit(1);
  const durationDays = plan?.duration ?? 30;
  let expiresAt;
  if (currentUser.isMember && currentUser.membershipExpiresAt && currentUser.membershipExpiresAt > now) {
    expiresAt = new Date(currentUser.membershipExpiresAt);
    expiresAt.setDate(expiresAt.getDate() + durationDays);
  } else {
    expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + durationDays);
  }
  await db.update(users).set({
    isMember: true,
    membershipStatus: "active",
    membershipOrderId: memberOrder.id,
    membershipActivatedAt: now,
    membershipExpiresAt: expiresAt,
    updatedAt: now
  }).where(eq27(users.id, memberOrder.userId));
  console.log(`[Membership Webhook] \u4F1A\u5458\u6FC0\u6D3B\u6210\u529F: userId=${memberOrder.userId}, expiresAt=${expiresAt.toISOString()}`);
}
async function verifyWechatSignature2(req) {
  if (process.env.NODE_ENV === "development") {
    console.warn("[Membership Wechat Webhook] \u5F00\u53D1\u73AF\u5883\u8DF3\u8FC7\u7B7E\u540D\u9A8C\u8BC1");
    return true;
  }
  const { signature } = req.body;
  const apiKey = process.env.WECHAT_API_KEY;
  if (!apiKey) {
    console.error("[Membership Wechat Webhook] \u7F3A\u5C11WECHAT_API_KEY\u73AF\u5883\u53D8\u91CF");
    return false;
  }
  const params = { ...req.body };
  delete params.signature;
  const sortedKeys = Object.keys(params).sort();
  const signString = sortedKeys.map((key) => `${key}=${params[key]}`).join("&") + `&key=${apiKey}`;
  const calculatedSign = crypto2.createHash("md5").update(signString).digest("hex").toUpperCase();
  return calculatedSign === signature;
}
async function verifyAlipaySignature2(req) {
  if (process.env.NODE_ENV === "development") {
    console.warn("[Membership Alipay Webhook] \u5F00\u53D1\u73AF\u5883\u8DF3\u8FC7\u7B7E\u540D\u9A8C\u8BC1");
    return true;
  }
  const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;
  if (!alipayPublicKey) {
    console.error("[Membership Alipay Webhook] \u7F3A\u5C11ALIPAY_PUBLIC_KEY\u73AF\u5883\u53D8\u91CF");
    return false;
  }
  return true;
}

// server/wxworkCallback.ts
import crypto3 from "crypto";
var WXWORK_TOKEN = process.env.WXWORK_TOKEN || "wxworktoken2026";
function handleWxworkCallbackVerify(req, res) {
  const { msg_signature, timestamp: timestamp2, nonce, echostr } = req.query;
  console.log("[WxWork Callback] Verify request:", { msg_signature, timestamp: timestamp2, nonce, echostr: echostr?.substring(0, 20) + "..." });
  if (!msg_signature || !timestamp2 || !nonce || !echostr) {
    res.status(200).send("OK - WxWork callback endpoint is ready");
    return;
  }
  try {
    const arr = [WXWORK_TOKEN, timestamp2, nonce].sort();
    const str = arr.join("");
    const signature = crypto3.createHash("sha1").update(str).digest("hex");
    if (signature === msg_signature) {
      console.log("[WxWork Callback] Signature verified OK, returning echostr");
      res.status(200).send(echostr);
    } else {
      console.error("[WxWork Callback] Signature mismatch:", { expected: signature, got: msg_signature });
      res.status(403).send("Signature mismatch");
    }
  } catch (err) {
    console.error("[WxWork Callback] Error:", err);
    res.status(500).send("Internal error");
  }
}
function handleWxworkCallbackPost(req, res) {
  console.log("[WxWork Callback] Received POST message:", JSON.stringify(req.body).substring(0, 200));
  res.status(200).send("success");
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (origin.match(/^https?:\/\/.*\.manus\.computer$/)) {
        return callback(null, true);
      }
      if (origin.match(/^https?:\/\/.*\.manus-asia\.computer$/)) {
        return callback(null, true);
      }
      if (origin.match(/^https?:\/\/.*\.manuspre\.computer$/)) {
        return callback(null, true);
      }
      if (origin.match(/^https?:\/\/.*\.manuscomputer\.ai$/)) {
        return callback(null, true);
      }
      if (origin.match(/^https?:\/\/.*\.manusvm\.computer$/)) {
        return callback(null, true);
      }
      if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
        return callback(null, true);
      }
      if (origin.match(/^https?:\/\/127\.0\.0\.1(:\d+)?$/)) {
        return callback(null, true);
      }
      if (origin.startsWith("app://")) {
        return callback(null, true);
      }
      if (origin === "https://crm.bdsm.com.cn" || origin === "http://crm.bdsm.com.cn") {
        return callback(null, true);
      }
      if (origin.match(/^https?:\/\/.*\.bdsm\.com\.cn$/)) {
        return callback(null, true);
      }
      const customOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
      if (customOrigins.some((allowed) => origin === allowed || origin.endsWith(allowed))) {
        return callback(null, true);
      }
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "authorization", "X-Auth-Token", "x-auth-token"],
    exposedHeaders: ["Authorization", "authorization", "X-Auth-Token", "x-auth-token"]
  }));
  app.options("*", cors());
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.post("/api/webhook/wechat-payment-notify", handleWechatPaymentNotify);
  app.post("/api/webhook/alipay-payment-notify", handleAlipayPaymentNotify);
  app.post("/api/webhook/membership-wechat-notify", handleMembershipWechatNotify);
  app.post("/api/webhook/membership-alipay-notify", handleMembershipAlipayNotify);
  app.get("/api/wxwork/callback", handleWxworkCallbackVerify);
  app.post("/api/wxwork/callback", handleWxworkCallbackPost);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  app.use((err, req, res, next) => {
    console.error("[Express Error]", err);
    if (!res.headersSent) {
      res.status(err.status || 500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: err.message || "Internal server error"
        }
      });
    }
  });
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    const { serveStatic: serveStatic2 } = await Promise.resolve().then(() => (init_serve_static(), serve_static_exports));
    serveStatic2(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
