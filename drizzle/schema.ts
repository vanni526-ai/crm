import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, index, date, time, json, unique } from "drizzle-orm/mysql-core";

/**
 * 用户表 - 支持多角色：管理员(admin)、老师(teacher)、普通用户(user)、销售(sales)、城市合伙人(cityPartner)
 * roles字段存储逗号分隔的角色列表，如 "admin,teacher"
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  nickname: varchar("nickname", { length: 50 }), // 花名
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }), // 手u673au53f7(用于登u5f55)
  password: varchar("password", { length: 255 }), // 加密后u7684密码
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "sales", "finance", "user"]).default("user").notNull(), // 兼容旧字段，保留但不再作为主要角色字段
  roles: varchar("roles", { length: 255 }).default("user").notNull(), // 新多角色字段，逗号分隔，如 "admin,teacher"
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * 客户表
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // 关联users表(可选,用于App注册用户)
  name: varchar("name", { length: 100 }).notNull(), // 客户名
  wechatId: varchar("wechatId", { length: 100 }), // 微信号
  phone: varchar("phone", { length: 20 }),
  trafficSource: varchar("trafficSource", { length: 100 }), // 流量来源(花名)
  accountBalance: decimal("accountBalance", { precision: 10, scale: 2 }).default("0.00").notNull(), // 账户余额
  tags: text("tags"), // 客户标签(JSON数组存储)
  notes: text("notes"),
  createdBy: int("createdBy").notNull(), // 创建人(销售)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
  wechatIdx: index("wechat_idx").on(table.wechatId),
  createdByIdx: index("created_by_idx").on(table.createdBy),
}));

/**
 * 订单表 - 根据瀛姬体验馆订单信息登记表设计
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNo: varchar("orderNo", { length: 50 }).notNull().unique(), // 序号
  customerId: int("customerId"), // 关联客户(可选)
  customerName: varchar("customerName", { length: 100 }), // 客户姓名(手动输入)
  salespersonId: int("salespersonId"), // 关联销售人员表(可选)
  salesId: int("salesId").notNull(), // 销售人ID(用户ID,保留兼容)
  salesPerson: varchar("salesPerson", { length: 100 }), // 销售人(花名)
  trafficSource: varchar("trafficSource", { length: 100 }), // 流量来源(花名)
  
  // 金额相关
  paymentAmount: decimal("paymentAmount", { precision: 10, scale: 2 }).notNull(), // 支付金额
  courseAmount: decimal("courseAmount", { precision: 10, scale: 2 }).notNull(), // 课程金额
  accountBalance: decimal("accountBalance", { precision: 10, scale: 2 }).default("0.00").notNull(), // 账户余额
  
  // 支付信息
  paymentCity: varchar("paymentCity", { length: 50 }), // 支付城市
  paymentChannel: varchar("paymentChannel", { length: 50 }), // 支付渠道(富掌柜/微信/支付宝)
  channelOrderNo: text("channelOrderNo"), // 渠道订单号;商户订单号;退款单号
  paymentDate: date("paymentDate"), // 支付日期
  paymentTime: time("paymentTime"), // 支付时间
  
  // 费用明细
  teacherFee: decimal("teacherFee", { precision: 10, scale: 2 }).default("0.00"), // 老师费用
  transportFee: decimal("transportFee", { precision: 10, scale: 2 }).default("0.00"), // 车费
  partnerFee: decimal("partnerFee", { precision: 10, scale: 2 }).default("0.00"), // 合伙人费用
  consumablesFee: decimal("consumablesFee", { precision: 10, scale: 2 }).default("0.00"), // 耗材费用
  rentFee: decimal("rentFee", { precision: 10, scale: 2 }).default("0.00"), // 房租费用
  propertyFee: decimal("propertyFee", { precision: 10, scale: 2 }).default("0.00"), // 物业费用
  utilityFee: decimal("utilityFee", { precision: 10, scale: 2 }).default("0.00"), // 水电费用
  otherFee: decimal("otherFee", { precision: 10, scale: 2 }).default("0.00"), // 其他费用
  finalAmount: decimal("finalAmount", { precision: 10, scale: 2 }).default("0.00"), // 金串到账金额
  
  // 交付信息
  deliveryCity: varchar("deliveryCity", { length: 50 }), // 交付城市
  deliveryRoom: varchar("deliveryRoom", { length: 100 }), // 交付教室(旧字段,保留兼容)
  deliveryClassroomId: int("deliveryClassroomId"), // 关联classrooms表
  deliveryTeacher: varchar("deliveryTeacher", { length: 100 }), // 交付老师
  deliveryCourse: varchar("deliveryCourse", { length: 200 }), // 交付课程
  classDate: date("classDate"), // 上课日期
  classTime: varchar("classTime", { length: 50 }), // 上课时间(支持时间范围如"14:00-16:00")
  
  status: mysqlEnum("status", ["pending", "paid", "completed", "cancelled", "refunded"]).default("pending").notNull(),
  deliveryStatus: mysqlEnum("deliveryStatus", ["undelivered", "delivered"]).default("undelivered").notNull(), // 交付状态：未交付/已交付
  isVoided: boolean("isVoided").default(false).notNull(), // 是否作废
  notes: text("notes"), // 备注
  
  // 结构化备注字段
  noteTags: text("noteTags"), // 备注标签(JSON数组)
  discountInfo: text("discountInfo"), // 折扣信息(JSON对象)
  couponInfo: text("couponInfo"), // 优惠券信息(JSON对象)
  membershipInfo: text("membershipInfo"), // 会员信息(JSON对象)
  paymentStatus: varchar("paymentStatus", { length: 50 }), // 支付状态标签
  specialNotes: text("specialNotes"), // 特殊要求/备注
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  customerIdx: index("customer_idx").on(table.customerId),
  salesIdx: index("sales_idx").on(table.salesId),
  statusIdx: index("status_idx").on(table.status),
  paymentDateIdx: index("payment_date_idx").on(table.paymentDate),
  classDateIdx: index("class_date_idx").on(table.classDate),
}));

/**
 * 老师表
 */
export const teachers = mysqlTable("teachers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // 姓名
  phone: varchar("phone", { length: 20 }), // 电话号码
  status: varchar("status", { length: 20 }).default("活跃").notNull(), // 活跃状态(活跃/不活跃)
  customerType: varchar("customerType", { length: 200 }), // 受众客户类型
  notes: text("notes"), // 备注
  category: varchar("category", { length: 50 }), // 分类(本部老师/合伙店老师)
  city: varchar("city", { length: 50 }), // 所在城市(合伙店老师使用)
  avatarUrl: varchar("avatarUrl", { length: 500 }), // 头像URL(S3存储)
  // 保留原有字段以兼容
  nickname: varchar("nickname", { length: 50 }), // 花名
  email: varchar("email", { length: 320 }),
  wechat: varchar("wechat", { length: 100 }),
  hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }), // 课时费标准
  bankAccount: varchar("bankAccount", { length: 100 }), // 银行账号
  bankName: varchar("bankName", { length: 100 }), // 开户行
  aliases: text("aliases"), // 别名列表(JSON数组)
  contractEndDate: date("contractEndDate"), // 合同到期时间
  joinDate: date("joinDate"), // 入职时间
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  phoneIdx: index("teacher_phone_idx").on(table.phone),
  cityIdx: index("teacher_city_idx").on(table.city),
  nameIdx: index("teacher_name_idx").on(table.name),
}));

/**
 * 课程排课表
 */
export const schedules = mysqlTable("schedules", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId"), // 关联订单(可选)
  
  // 客户信息
  customerId: int("customerId"), // 学员ID(可选)
  customerName: varchar("customerName", { length: 100 }), // 客户名(微信号)
  wechatId: varchar("wechatId", { length: 100 }), // 微信号
  
  // 销售信息
  salesName: varchar("salesName", { length: 100 }), // 销售人(花名)
  trafficSource: varchar("trafficSource", { length: 100 }), // 流量来源(花名)
  
  // 支付信息
  paymentAmount: decimal("paymentAmount", { precision: 10, scale: 2 }), // 支付金额
  courseAmount: decimal("courseAmount", { precision: 10, scale: 2 }), // 课程金额
  accountBalance: decimal("accountBalance", { precision: 10, scale: 2 }), // 账户余额
  paymentCity: varchar("paymentCity", { length: 50 }), // 支付城市
  channelOrderNo: varchar("channelOrderNo", { length: 100 }), // 城道订单号
  overflowOrderNo: varchar("overflowOrderNo", { length: 100 }), // 溢户订单号
  refundNo: varchar("refundNo", { length: 100 }), // 退款单号
  paymentDate: date("paymentDate"), // 支付日期
  paymentTime: varchar("paymentTime", { length: 20 }), // 支付时间
  
  // 费用信息
  teacherFee: decimal("teacherFee", { precision: 10, scale: 2 }), // 老师费用
  transportFee: decimal("transportFee", { precision: 10, scale: 2 }), // 车费
  otherFee: decimal("otherFee", { precision: 10, scale: 2 }), // 其他费用
  partnerFee: decimal("partnerFee", { precision: 10, scale: 2 }), // 合伙人费用
  receivedAmount: decimal("receivedAmount", { precision: 10, scale: 2 }), // 金串到账金额
  
  // 交付信息
  deliveryCity: varchar("deliveryCity", { length: 50 }), // 交付城市
  deliveryClassroom: varchar("deliveryClassroom", { length: 100 }), // 交付教室
  deliveryTeacher: varchar("deliveryTeacher", { length: 100 }), // 交付老师
  deliveryCourse: varchar("deliveryCourse", { length: 200 }), // 交付课程
  
  // 课程信息
  teacherId: int("teacherId"), // 授课老师ID
  teacherName: varchar("teacherName", { length: 100 }), // 授课老师名称(手动输入)
  courseType: varchar("courseType", { length: 200 }).notNull(), // 课程类型
  classDate: date("classDate"), // 上课日期
  classTime: varchar("classTime", { length: 20 }), // 上课时间
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  city: varchar("city", { length: 50 }), // 城市
  location: varchar("location", { length: 200 }), // 教室/地点
  
  status: mysqlEnum("status", ["scheduled", "completed", "cancelled"]).default("scheduled").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  teacherIdx: index("teacher_idx").on(table.teacherId),
  customerIdx: index("schedule_customer_idx").on(table.customerId),
  startTimeIdx: index("start_time_idx").on(table.startTime),
  cityIdx: index("schedule_city_idx").on(table.city),
  salesIdx: index("sales_idx").on(table.salesName),
  paymentDateIdx: index("payment_date_idx").on(table.paymentDate),
}));

/**
 * 课程日程与订单匹配关系表
 */
export const matchedScheduleOrders = mysqlTable("matchedScheduleOrders", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("scheduleId").notNull(), // 关联课程日程
  orderId: int("orderId").notNull(), // 关联订单
  matchMethod: mysqlEnum("matchMethod", ["llm_intelligent", "manual", "channel_order_no"]).notNull(), // 匹配方式
  confidence: decimal("confidence", { precision: 5, scale: 2 }), // 匹配置信度(0-100)
  matchDetails: text("matchDetails"), // 匹配详情(JSON格式,存储匹配依据)
  isVerified: boolean("isVerified").default(false).notNull(), // 是否已人工验证
  verifiedBy: int("verifiedBy"), // 验证人ID
  verifiedAt: timestamp("verifiedAt"), // 验证时间
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  scheduleIdx: index("schedule_idx").on(table.scheduleId),
  orderIdx: index("order_idx").on(table.orderId),
  uniqueMatch: unique("unique_schedule_order").on(table.scheduleId, table.orderId),
}));

/**
 * 老师费用结算表
 */
export const teacherPayments = mysqlTable("teacherPayments", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(),
  orderId: int("orderId"), // 关联订单
  scheduleId: int("scheduleId"), // 关联排课(可选)
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // 费用金额
  paymentMethod: mysqlEnum("paymentMethod", ["wechat", "alipay", "bank", "cash", "other"]),
  transactionNo: varchar("transactionNo", { length: 100 }),
  paymentTime: timestamp("paymentTime"),
  status: mysqlEnum("status", ["pending", "paid"]).default("pending").notNull(),
  notes: text("notes"),
  recordedBy: int("recordedBy").notNull(), // 登记人(财务)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  teacherIdx: index("teacher_payment_idx").on(table.teacherId),
  orderIdx: index("order_payment_idx").on(table.orderId),
  statusIdx: index("payment_status_idx").on(table.status),
}));

/**
 * 财务对账表
 */
export const reconciliations = mysqlTable("reconciliations", {
  id: int("id").autoincrement().primaryKey(),
  periodStart: date("periodStart").notNull(), // 对账周期开始
  periodEnd: date("periodEnd").notNull(), // 对账周期结束
  totalIncome: decimal("totalIncome", { precision: 12, scale: 2 }).notNull(), // 总收入
  totalExpense: decimal("totalExpense", { precision: 12, scale: 2 }).notNull(), // 总支出(老师费用+车费+其他费用+合伙人费用)
  teacherFeeTotal: decimal("teacherFeeTotal", { precision: 12, scale: 2 }).default("0.00"), // 老师费用合计
  transportFeeTotal: decimal("transportFeeTotal", { precision: 12, scale: 2 }).default("0.00"), // 车费合计
  otherFeeTotal: decimal("otherFeeTotal", { precision: 12, scale: 2 }).default("0.00"), // 其他费用合计
  partnerFeeTotal: decimal("partnerFeeTotal", { precision: 12, scale: 2 }).default("0.00"), // 合伙人费用合计
  profit: decimal("profit", { precision: 12, scale: 2 }).notNull(), // 利润
  status: mysqlEnum("status", ["draft", "confirmed"]).default("draft").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(), // 创建人(财务)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  periodIdx: index("period_idx").on(table.periodStart, table.periodEnd),
}));

/**
 * Gmail导入记录表
 */// Gmail导入配// Gmail错误反馈记录表
export const gmailErrorFeedback = mysqlTable("gmail_error_feedback", {
  id: int("id").autoincrement().primaryKey(),
  importLogId: int("import_log_id").notNull(), // 关联的导入记录ID
  fieldName: varchar("field_name", { length: 100 }).notNull(), // 错误字段名
  wrongValue: text("wrong_value").notNull(), // 错误的值
  correctValue: text("correct_value").notNull(), // 正确的值
  feedbackType: varchar("feedback_type", { length: 20 }).notNull(), // 反馈类型: manual(手动标记), auto(自动学习)
  isLearned: boolean("is_learned").default(false), // 是否已学习应用
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gmailImportConfig = mysqlTable("gmail_import_config", {
  id: int("id").primaryKey().autoincrement(),
  configKey: varchar("configKey", { length: 100 }).notNull().unique(), // 配置键
  configValue: json("configValue").notNull(), // 配置值(JSON)
  description: text("description"), // 配置说明
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// Gmail导入日志表
export const gmailImportLogs = mysqlTable("gmailImportLogs", (table) => ({
  id: int("id").autoincrement().primaryKey(),
  emailSubject: varchar("emailSubject", { length: 255 }).notNull(), // 邮件主题
  emailDate: timestamp("emailDate").notNull(), // 邮件日期
  threadId: varchar("threadId", { length: 100 }).notNull(), // Gmail线程ID
  totalOrders: int("totalOrders").notNull(), // 解析出的订单数
  successOrders: int("successOrders").notNull(), // 成功录入的订单数
  failedOrders: int("failedOrders").notNull(), // 失败的订单数
  status: mysqlEnum("status", ["success", "partial", "failed"]).notNull(), // 导入状态
  errorLog: text("errorLog"), // 错误日志
  emailContent: text("emailContent"), // 邮件内容(用于查看原始数据)
  parsedData: json("parsedData"), // 解析后的订单数据(JSON)
  warningFlags: json("warningFlags"), // 警告标记(JSON数组,如["missing_channel_order_no","invalid_amount"])
  importedBy: int("importedBy").notNull(), // 导入人(0表示系统自动)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}), (table) => ({
  threadIdIdx: index("thread_id_idx").on(table.threadId),
  statusIdx: index("status_idx").on(table.status),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

/**
 * 数据导入记录表
 */
export const importLogs = mysqlTable("importLogs", {
  id: int("id").autoincrement().primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 20 }).notNull(), // csv, excel, xml, ics
  dataType: varchar("dataType", { length: 50 }).notNull(), // orders, schedules, etc.
  totalRows: int("totalRows").notNull(),
  successRows: int("successRows").notNull(),
  failedRows: int("failedRows").notNull(),
  errorLog: text("errorLog"),
  importedBy: int("importedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// 类型导出
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type Teacher = typeof teachers.$inferSelect;
export type InsertTeacher = typeof teachers.$inferInsert;
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;
export type TeacherPayment = typeof teacherPayments.$inferSelect;
export type InsertTeacherPayment = typeof teacherPayments.$inferInsert;
export type Reconciliation = typeof reconciliations.$inferSelect;
export type InsertReconciliation = typeof reconciliations.$inferInsert;
export type ImportLog = typeof importLogs.$inferSelect;
export type InsertImportLog = typeof importLogs.$inferInsert;
export type GmailImportLog = typeof gmailImportLogs.$inferSelect;
export type GmailImportConfig = typeof gmailImportConfig.$inferSelect;
export type InsertGmailImportLog = typeof gmailImportLogs.$inferInsert;
export type Salesperson = typeof salespersons.$inferSelect;
export type InsertSalesperson = typeof salespersons.$inferInsert;

/**
 * 销售人员表
 */
export const salespersons = mysqlTable("salespersons", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // 关联用户表(可选)
  name: varchar("name", { length: 100 }).notNull(), // 真实姓名
  nickname: varchar("nickname", { length: 50 }), // 花名/昵称
  aliases: text("aliases"), // 别名列表(JSON数组存储,如["ivy","山竹","妖渊"])
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  wechat: varchar("wechat", { length: 100 }), // 微信号
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("0.00"), // 提成比例(%)
  city: varchar("city", { length: 50 }), // 所在城市
  isActive: boolean("isActive").default(true).notNull(), // 是否在职
  orderCount: int("orderCount").default(0).notNull(), // 订单数量(统计字段)
  totalSales: decimal("totalSales", { precision: 12, scale: 2 }).default("0.00").notNull(), // 销售总额(统计字段)
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("sales_user_idx").on(table.userId),
  phoneIdx: index("sales_phone_idx").on(table.phone),
  cityIdx: index("sales_city_idx").on(table.city),
}));

/**
 * 账户流水表 - 记录客户账户余额变动
 */
export const accountTransactions = mysqlTable("accountTransactions", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(), // 客户ID
  customerName: varchar("customerName", { length: 100 }).notNull(), // 客户姓名(冗余字段,方便查询)
  type: mysqlEnum("type", ["recharge", "consume", "refund"]).notNull(), // 流水类型: 充值/消费/退款
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // 金额(正数为增加,负数为减少)
  balanceBefore: decimal("balanceBefore", { precision: 10, scale: 2 }).notNull(), // 变动前余额
  balanceAfter: decimal("balanceAfter", { precision: 10, scale: 2 }).notNull(), // 变动后余额
  relatedOrderId: int("relatedOrderId"), // 关联订单ID(消费/退款时)
  relatedOrderNo: varchar("relatedOrderNo", { length: 50 }), // 关联订单号(冗余字段)
  notes: text("notes"), // 备注
  operatorId: int("operatorId").notNull(), // 操作人 ID
  operatorName: varchar("operatorName", { length: 100 }), // 操作人姓名(冗余字段)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  customerIdx: index("customer_idx").on(table.customerId),
  typeIdx: index("type_idx").on(table.type),
  orderIdx: index("order_idx").on(table.relatedOrderId),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type AccountTransaction = typeof accountTransactions.$inferSelect;
export type InsertAccountTransaction = typeof accountTransactions.$inferInsert;

// 智能登记历史表
export const smartRegisterHistory = mysqlTable("smartRegisterHistory", {
  id: int("id").autoincrement().primaryKey(),
  template: mysqlEnum("template", ["wechat", "alipay", "custom"]).notNull(), // 数据源模板
  totalRows: int("totalRows").notNull(), // 总记录数
  successCount: int("successCount").notNull(), // 成功创建数量
  failCount: int("failCount").notNull(), // 失败数量
  operatorId: int("operatorId").notNull(), // 操作人 ID
  operatorName: varchar("operatorName", { length: 100 }), // 操作人姓名(冗余字段)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  operatorIdx: index("operator_idx").on(table.operatorId),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type SmartRegisterHistory = typeof smartRegisterHistory.$inferSelect;
export type InsertSmartRegisterHistory = typeof smartRegisterHistory.$inferInsert;

/**
 * Gmail导入历史表 - 记录从 Gmail 自动导入的邮件和订单
 */
export const gmailImportHistory = mysqlTable("gmailImportHistory", {
  id: int("id").autoincrement().primaryKey(),
  messageId: varchar("messageId", { length: 255 }).notNull().unique(), // Gmail Message-ID
  threadId: varchar("threadId", { length: 255 }).notNull(), // Gmail Thread-ID
  subject: text("subject"), // 邮件标题
  fromEmail: varchar("fromEmail", { length: 255 }), // 发件人邮箱
  orderId: int("orderId"), // 关联的订单ID
  importStatus: mysqlEnum("importStatus", ["success", "failed", "skipped"]).notNull(), // 导入状态
  errorMessage: text("errorMessage"), // 失败原因
  operatorId: int("operatorId").notNull(), // 操作人 ID
  operatorName: varchar("operatorName", { length: 100 }), // 操作人姓名
  importedAt: timestamp("importedAt").defaultNow().notNull(), // 导入时间
}, (table) => ({
  messageIdIdx: index("message_id_idx").on(table.messageId),
  threadIdIdx: index("thread_id_idx").on(table.threadId),
  importedAtIdx: index("imported_at_idx").on(table.importedAt),
  operatorIdx: index("operator_idx").on(table.operatorId),
}));

export type GmailImportHistory = typeof gmailImportHistory.$inferSelect;
export type InsertGmailImportHistory = typeof gmailImportHistory.$inferInsert;

/**
 * 字段映射配置表 - 支持自定义解析规则
 */
export const fieldMappings = mysqlTable("fieldMappings", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["salesperson_alias", "city_code", "teacher_alias", "course_alias"]).notNull(), // 映射类型
  sourceValue: varchar("sourceValue", { length: 100 }).notNull(), // 原始值(如"山竹"、"BJ")
  targetValue: varchar("targetValue", { length: 100 }).notNull(), // 目标值(如"王舒婷"、"北京")
  description: text("description"), // 说明
  isActive: boolean("isActive").default(true).notNull(), // 是否启用
  createdBy: int("createdBy").notNull(), // 创建人
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  typeIdx: index("type_idx").on(table.type),
  sourceIdx: index("source_idx").on(table.sourceValue),
}));

export type FieldMapping = typeof fieldMappings.$inferSelect;
export type InsertFieldMapping = typeof fieldMappings.$inferInsert;

/**
 * 解析修正记录表 - 记录用户对LLM解析结果的修正,用于学习优化
 */
export const parsingCorrections = mysqlTable("parsingCorrections", {
  id: int("id").autoincrement().primaryKey(),
  originalText: text("originalText").notNull(), // 原始输入文本
  fieldName: varchar("fieldName", { length: 50 }).notNull(), // 被修正的字段名
  llmValue: text("llmValue"), // LLM解析的值
  correctedValue: text("correctedValue").notNull(), // 用户修正后的值
  correctionType: mysqlEnum("correctionType", ["field_missing", "field_wrong", "format_error", "logic_error", "manual_edit"]).notNull(), // 修正类型
  context: text("context"), // 上下文信息(JSON格式,包含其他字段的值)
  userId: int("userId").notNull(), // 修正人ID
  userName: varchar("userName", { length: 100 }), // 修正人姓名
  isLearned: boolean("isLearned").default(false).notNull(), // 是否已用于学习
  learnedAt: timestamp("learnedAt"), // 学习时间
  annotationType: mysqlEnum("annotationType", ["typical_error", "edge_case", "common_pattern", "none"]).default("none"), // 标注类型
  annotationNote: text("annotationNote"), // 标注备注
  annotatedBy: int("annotatedBy"), // 标注人 ID
  annotatedAt: timestamp("annotatedAt"), // 标注时间
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  fieldIdx: index("field_idx").on(table.fieldName),
  userIdx: index("user_idx").on(table.userId),
  learnedIdx: index("learned_idx").on(table.isLearned),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type ParsingCorrection = typeof parsingCorrections.$inferSelect;
export type InsertParsingCorrection = typeof parsingCorrections.$inferInsert;

/**
 * Prompt优化历史表 - 记录自动优化的prompt变更
 */
export const promptOptimizationHistory = mysqlTable("promptOptimizationHistory", {
  id: int("id").autoincrement().primaryKey(),
  version: varchar("version", { length: 50 }).notNull(), // 版本号(如"v1.0.1")
  optimizationType: mysqlEnum("optimizationType", ["add_example", "update_rule", "fix_error_pattern"]).notNull(), // 优化类型
  changeDescription: text("changeDescription").notNull(), // 变更描述
  newExamples: text("newExamples"), // 新增的示例(JSON数组)
  correctionCount: int("correctionCount").default(0).notNull(), // 基于多少条修正记录优化
  isActive: boolean("isActive").default(true).notNull(), // 是否启用
  createdBy: int("createdBy").notNull(), // 创建人(系统自动=0)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  versionIdx: index("version_idx").on(table.version),
  activeIdx: index("active_idx").on(table.isActive),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type PromptOptimizationHistory = typeof promptOptimizationHistory.$inferSelect;
export type InsertPromptOptimizationHistory = typeof promptOptimizationHistory.$inferInsert;

/**
 * 解析学习配置表 - 存储解析学习相关的配置参数
 */
export const parsingLearningConfig = mysqlTable("parsingLearningConfig", {
  id: int("id").autoincrement().primaryKey(),
  configKey: varchar("configKey", { length: 50 }).notNull().unique(), // 配置键(如"auto_optimize_threshold")
  configValue: text("configValue").notNull(), // 配置值(JSON格式)
  description: text("description"), // 配置说明
  updatedBy: int("updatedBy").notNull(), // 更新人ID
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ParsingLearningConfig = typeof parsingLearningConfig.$inferSelect;
export type InsertParsingLearningConfig = typeof parsingLearningConfig.$inferInsert;

/**
 * 城市合伙人费配置表 - 存储各城市的合伙人费比例
 */
export const cityPartnerConfig = mysqlTable("cityPartnerConfig", {
  id: int("id").autoincrement().primaryKey(),
  city: varchar("city", { length: 50 }).notNull().unique(), // 城市名称
  areaCode: varchar("areaCode", { length: 10 }), // 电话区号
  partnerFeeRate: decimal("partnerFeeRate", { precision: 5, scale: 2 }).notNull(), // 合伙人费比例(0-100)
  description: text("description"), // 说明
  isActive: boolean("isActive").default(true).notNull(), // 是否启用
  updatedBy: int("updatedBy").notNull(), // 更新人 ID
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  cityIdx: index("city_idx").on(table.city),
  activeIdx: index("active_idx").on(table.isActive),
}));

export type CityPartnerConfig = typeof cityPartnerConfig.$inferSelect;
export type InsertCityPartnerConfig = typeof cityPartnerConfig.$inferInsert;

/**
 * 审计日志表 - 记录重要操作的历史记录
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  action: mysqlEnum("action", [
    "order_create", "order_update", "order_delete",
    "user_create", "user_role_update", "user_status_update", "user_delete",
    "data_import",
    "customer_create", "customer_update", "customer_delete",
    "teacher_create", "teacher_update", "teacher_delete",
    "schedule_create", "schedule_update", "schedule_delete",
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  actionIdx: index("action_idx").on(table.action),
  userIdx: index("user_idx").on(table.userId),
  targetIdx: index("target_idx").on(table.targetType),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * 合伙人费审计日志表 - 记录批量计算合伙人费的操作历史
 */
export const partnerFeeAuditLogs = mysqlTable("partnerFeeAuditLogs", {
  id: int("id").autoincrement().primaryKey(),
  operationType: varchar("operationType", { length: 50 }).notNull(), // 操作类型(如"batch_calculate_partner_fee")
  operationDescription: text("operationDescription").notNull(), // 操作描述
  operatorId: int("operatorId").notNull(), // 操作人ID
  operatorName: varchar("operatorName", { length: 100 }).notNull(), // 操作人姓名
  affectedCount: int("affectedCount").default(0).notNull(), // 影响的记录数
  details: json("details"), // 详细信息(JSON格式,包含受影响的订单ID列表等)
  status: mysqlEnum("status", ["success", "failed", "partial"]).default("success").notNull(), // 操作状态
  errorMessage: text("errorMessage"), // 错误信息(如果失败)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  operationTypeIdx: index("operation_type_idx").on(table.operationType),
  operatorIdx: index("operator_idx").on(table.operatorId),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type PartnerFeeAuditLog = typeof partnerFeeAuditLogs.$inferSelect;
export type InsertPartnerFeeAuditLog = typeof partnerFeeAuditLogs.$inferInsert;


/**
 * 系统账号表 - 记录CRM系统的使用者账号、密码和身份
 */
export const systemAccounts = mysqlTable("systemAccounts", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(), // 用户名
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(), // 密码哈希值
  email: varchar("email", { length: 100 }), // 邮箱
  phone: varchar("phone", { length: 20 }), // 电话
  identity: mysqlEnum("identity", ["customer", "teacher", "sales", "finance", "admin", "store_partner"]).notNull(), // 身份类型
  relatedId: int("relatedId"), // 关联ID(客户ID/老师ID/销售人员ID等)
  relatedName: varchar("relatedName", { length: 100 }), // 关联名称(客户名/老师名/销售名等)
  isActive: boolean("isActive").default(true).notNull(), // 是否激活
  lastLoginAt: timestamp("lastLoginAt"), // 最后登录时间
  createdAt: timestamp("createdAt").defaultNow().notNull(), // 创建时间
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), // 更新时间
  createdBy: int("createdBy"), // 创建人ID
  notes: text("notes"), // 备注
}, (table) => ({
  usernameIdx: index("username_idx").on(table.username),
  identityIdx: index("identity_idx").on(table.identity),
  relatedIdIdx: index("related_id_idx").on(table.relatedId),
  isActiveIdx: index("is_active_idx").on(table.isActive),
}));

export type SystemAccount = typeof systemAccounts.$inferSelect;
export type InsertSystemAccount = typeof systemAccounts.$inferInsert;

/**
 * 账号审计日志表 - 记录账号的所有操作历史
 */
export const accountAuditLogs = mysqlTable("accountAuditLogs", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(), // 账号ID
  operationType: mysqlEnum("operationType", ["create", "update", "delete", "login", "password_change", "activate", "deactivate"]).notNull(), // 操作类型
  operatorId: int("operatorId"), // 操作人ID
  operatorName: varchar("operatorName", { length: 100 }), // 操作人名称
  oldValue: json("oldValue"), // 修改前的值
  newValue: json("newValue"), // 修改后的值
  ipAddress: varchar("ipAddress", { length: 50 }), // IP地址
  userAgent: text("userAgent"), // 用户代理
  createdAt: timestamp("createdAt").defaultNow().notNull(), // 创建时间
}, (table) => ({
  accountIdIdx: index("account_id_idx").on(table.accountId),
  operationTypeIdx: index("operation_type_idx").on(table.operationType),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type AccountAuditLog = typeof accountAuditLogs.$inferSelect;
export type InsertAccountAuditLog = typeof accountAuditLogs.$inferInsert;


/**
 * 账号权限表 - 存储每个系统账号的菜单权限
 */
export const accountPermissions = mysqlTable("accountPermissions", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(), // 系统账号ID
  permissionKey: varchar("permissionKey", { length: 100 }).notNull(), // 权限标识(菜单路径)
  permissionName: varchar("permissionName", { length: 100 }).notNull(), // 权限名称(菜单名)
  isGranted: boolean("isGranted").default(true).notNull(), // 是否授予该权限
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  accountIdIdx: index("account_id_permission_idx").on(table.accountId),
  permissionKeyIdx: index("permission_key_idx").on(table.permissionKey),
  uniqueAccountPermission: unique("unique_account_permission").on(table.accountId, table.permissionKey),
}));

export type AccountPermission = typeof accountPermissions.$inferSelect;
export type InsertAccountPermission = typeof accountPermissions.$inferInsert;


/**
 * 课程表 - 存储课程信息
 */
export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // 课程名称
  introduction: varchar("introduction", { length: 20 }), // 课程介绍(限制20字)
  description: text("description"), // 课程描述
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // 课程价格
  duration: decimal("duration", { precision: 10, scale: 2 }).notNull(), // 课程时长(小时)，支持最大值99999999.99
  level: mysqlEnum("level", ["入门", "深度", "订制", "剧本"]).notNull(), // 课程程度
  isActive: boolean("isActive").default(true).notNull(), // 是否启用
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  nameIdx: index("name_idx").on(table.name),
  levelIdx: index("level_idx").on(table.level),
  isActiveIdx: index("is_active_idx").on(table.isActive),
}));

export type Course = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;

/**
 * 城市表 - 存储运营城市信息
 */
export const cities = mysqlTable("cities", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(), // 城市名称
  areaCode: varchar("areaCode", { length: 10 }), // 电话区号
  isActive: boolean("isActive").default(true).notNull(), // 是否启用
  sortOrder: int("sortOrder").default(0), // 排序顺序
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  nameIdx: index("city_name_idx").on(table.name),
  activeIdx: index("city_active_idx").on(table.isActive),
}));

export type City = typeof cities.$inferSelect;
export type InsertCity = typeof cities.$inferInsert;

/**
 * 教室表 - 存储各城市的教室信息
 */
export const classrooms = mysqlTable("classrooms", {
  id: int("id").autoincrement().primaryKey(),
  cityId: int("cityId").notNull(), // 关联城市ID
  cityName: varchar("cityName", { length: 50 }).notNull(), // 城市名称(冗余字段,方便查询)
  name: varchar("name", { length: 100 }).notNull(), // 教室名称(如"404教室")
  address: text("address").notNull(), // 教室详细地址
  isActive: boolean("isActive").default(true).notNull(), // 是否启用
  sortOrder: int("sortOrder").default(0), // 排序顺序
  notes: text("notes"), // 备注
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  cityIdIdx: index("classroom_city_idx").on(table.cityId),
  cityNameIdx: index("classroom_city_name_idx").on(table.cityName),
  activeIdx: index("classroom_active_idx").on(table.isActive),
}));

export type Classroom = typeof classrooms.$inferSelect;
export type InsertClassroom = typeof classrooms.$inferInsert;


/**
 * 申请通知表 - 记录前端App用户提交的留言/申请信息
 */
export const userNotifications = mysqlTable("user_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 提交留言的用户ID
  userName: varchar("userName", { length: 100 }), // 用户名称(冗余字段,方便查询)
  userPhone: varchar("userPhone", { length: 20 }), // 用户手机号(冗余字段)
  type: varchar("type", { length: 50 }).default("general").notNull(), // 留言类型: general(一般留言), complaint(投诉), suggestion(建议), consultation(咨询), application(申请)
  title: varchar("title", { length: 200 }), // 留言标题(可选)
  content: text("content").notNull(), // 留言内容
  status: varchar("status", { length: 20 }).default("unread").notNull(), // 状态: unread(未读), read(已读), replied(已回复), archived(已归档)
  adminReply: text("adminReply"), // 管理员回复内容
  repliedBy: int("repliedBy"), // 回复人ID
  repliedAt: timestamp("repliedAt"), // 回复时间
  readAt: timestamp("readAt"), // 已读时间
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("notification_user_idx").on(table.userId),
  statusIdx: index("notification_status_idx").on(table.status),
  typeIdx: index("notification_type_idx").on(table.type),
  createdAtIdx: index("notification_created_at_idx").on(table.createdAt),
}));
export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = typeof userNotifications.$inferInsert;

/**
 * 销售提成配置表 - 存储销售人员在不同城市的提成比例
 */
export const salesCommissionConfigs = mysqlTable("sales_commission_configs", {
  id: int("id").autoincrement().primaryKey(),
  salespersonId: int("salespersonId").notNull(), // 关联销售人员表
  city: varchar("city", { length: 50 }).notNull(), // 城市名称
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).notNull(), // 提成比例(0-100%)
  notes: text("notes"), // 备注
  updatedBy: int("updatedBy").notNull(), // 更新人ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  salespersonIdx: index("commission_salesperson_idx").on(table.salespersonId),
  cityIdx: index("commission_city_idx").on(table.city),
  uniqueSalespersonCity: unique("unique_salesperson_city").on(table.salespersonId, table.city),
}));

export type SalesCommissionConfig = typeof salesCommissionConfigs.$inferSelect;
export type InsertSalesCommissionConfig = typeof salesCommissionConfigs.$inferInsert;
