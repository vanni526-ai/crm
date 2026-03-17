import { date, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 课程表
 * 存储课程信息，包括课程名称、时间、地点、学员信息等
 */
export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  /** 课程名称 */
  courseName: varchar("courseName", { length: 255 }).notNull(),
  /** 课程类型 */
  courseType: varchar("courseType", { length: 100 }).notNull(),
  /** 上课日期 (YYYY-MM-DD) */
  classDate: date("classDate").notNull(),
  /** 上课时间 (HH:MM) */
  classTime: varchar("classTime", { length: 10 }).notNull(),
  /** 课程时长（分钟） */
  duration: int("duration").notNull(),
  /** 教室地址 */
  classroomAddress: text("classroomAddress").notNull(),
  /** 教室名称 */
  classroomName: varchar("classroomName", { length: 255 }).notNull(),
  /** 学员姓名 */
  studentName: varchar("studentName", { length: 100 }).notNull(),
  /** 学员电话 */
  studentPhone: varchar("studentPhone", { length: 20 }).notNull(),
  /** 课程状态 */
  status: mysqlEnum("status", ["pending", "accepted", "completed", "cancelled"]).default("pending").notNull(),
  /** 课程费用 */
  fee: decimal("fee", { precision: 10, scale: 2 }).notNull(),
  /** 备注 */
  notes: text("notes"),
  /** 接单老师ID */
  teacherId: int("teacherId"),
  /** 接单老师姓名 */
  teacherName: varchar("teacherName", { length: 100 }),
  /** 创建时间 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新时间 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Course = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;
