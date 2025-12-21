import { mysqlTable, int, varchar, text, timestamp, mysqlEnum, boolean, index } from "drizzle-orm/mysql-core";

/**
 * 字段映射配置表 - 支持自定义解析规则
 */
export const fieldMappings = mysqlTable("field_mappings", {
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
