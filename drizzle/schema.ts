import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, index, date, time, json } from "drizzle-orm/mysql-core";

/**
 * 用户表 - 支持管理员、销售、财务三种角色
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  nickname: varchar("nickname", { length: 50 }), // 花名
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "sales", "finance", "user"]).default("user").notNull(),
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
  otherFee: decimal("otherFee", { precision: 10, scale: 2 }).default("0.00"), // 其他费用
  partnerFee: decimal("partnerFee", { precision: 10, scale: 2 }).default("0.00"), // 合伙人费用
  finalAmount: decimal("finalAmount", { precision: 10, scale: 2 }).default("0.00"), // 金串到账金额
  
  // 交付信息
  deliveryCity: varchar("deliveryCity", { length: 50 }), // 交付城市
  deliveryRoom: varchar("deliveryRoom", { length: 100 }), // 交付教室
  deliveryTeacher: varchar("deliveryTeacher", { length: 100 }), // 交付老师
  deliveryCourse: varchar("deliveryCourse", { length: 200 }), // 交付课程
  classDate: date("classDate"), // 上课日期
  classTime: varchar("classTime", { length: 50 }), // 上课时间(支持时间范围如"14:00-16:00")
  
  status: mysqlEnum("status", ["pending", "paid", "completed", "cancelled", "refunded"]).default("pending").notNull(),
  notes: text("notes"), // 备注
  
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
  // 保留原有字段以兼容
  nickname: varchar("nickname", { length: 50 }), // 花名
  email: varchar("email", { length: 320 }),
  wechat: varchar("wechat", { length: 100 }),
  hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }), // 课时费标准
  bankAccount: varchar("bankAccount", { length: 100 }), // 银行账号
  bankName: varchar("bankName", { length: 100 }), // 开户行
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
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  wechat: varchar("wechat", { length: 100 }), // 微信号
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("0.00"), // 提成比例(%)
  city: varchar("city", { length: 50 }), // 所在城市
  isActive: boolean("isActive").default(true).notNull(), // 是否在职
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
