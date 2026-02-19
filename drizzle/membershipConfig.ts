import { mysqlTable, int, varchar, timestamp, boolean } from "drizzle-orm/mysql-core";

/**
 * 会员配置表
 * 用于存储会员系统的全局配置，如有效期天数等
 */
export const membershipConfig = mysqlTable("membershipConfig", {
  id: int("id").primaryKey().autoincrement(),
  configKey: varchar("configKey", { length: 50 }).notNull().unique(), // 配置键名，如 "validity_days"
  configValue: varchar("configValue", { length: 255 }).notNull(), // 配置值
  description: varchar("description", { length: 255 }), // 配置说明
  isActive: boolean("isActive").default(true).notNull(), // 是否启用
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
