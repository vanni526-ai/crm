import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

export const notificationRouter = router({
  /** App用户提交留言/申请通知 */
  submit: publicProcedure
    .input(z.object({
      userId: z.number(),
      userName: z.string().optional(),
      userPhone: z.string().optional(),
      type: z.enum(["general", "complaint", "suggestion", "consultation", "application"]).optional().default("general"),
      title: z.string().max(200).optional(),
      content: z.string().min(1, "留言内容不能为空").max(5000),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await db.createUserNotification({
          userId: input.userId,
          userName: input.userName,
          userPhone: input.userPhone,
          type: input.type,
          title: input.title,
          content: input.content,
        });
        return { success: true, id: result.id };
      } catch (error) {
        console.error("提交留言失败:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "提交留言失败" });
      }
    }),

  /** App用户查询自己的留言列表 */
  myList: publicProcedure
    .input(z.object({
      userId: z.number(),
      page: z.number().min(1).optional().default(1),
      pageSize: z.number().min(1).max(50).optional().default(20),
    }))
    .query(async ({ input }) => {
      try {
        return await db.listMyNotifications(input.userId, {
          page: input.page,
          pageSize: input.pageSize,
        });
      } catch (error) {
        console.error("查询留言列表失败:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "查询留言列表失败" });
      }
    }),

  /** 管理员查询所有通知列表 */
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["unread", "read", "replied", "archived"]).optional(),
      type: z.enum(["general", "complaint", "suggestion", "consultation", "application"]).optional(),
      userId: z.number().optional(),
      page: z.number().min(1).optional().default(1),
      pageSize: z.number().min(1).max(50).optional().default(20),
    }))
    .query(async ({ input }) => {
      try {
        return await db.listUserNotifications({
          status: input.status,
          type: input.type,
          userId: input.userId,
          page: input.page,
          pageSize: input.pageSize,
        });
      } catch (error) {
        console.error("查询通知列表失败:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "查询通知列表失败" });
      }
    }),

  /** 管理员获取单条通知详情 */
  detail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const notification = await db.getUserNotificationById(input.id);
      if (!notification) {
        throw new TRPCError({ code: "NOT_FOUND", message: "通知不存在" });
      }
      return notification;
    }),

  /** 管理员标记通知为已读 */
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.markNotificationRead(input.id);
      return { success: true };
    }),

  /** 管理员批量标记通知为已读 */
  batchMarkRead: protectedProcedure
    .input(z.object({ ids: z.array(z.number()).min(1) }))
    .mutation(async ({ input }) => {
      await db.batchMarkNotificationsRead(input.ids);
      return { success: true, count: input.ids.length };
    }),

  /** 管理员回复通知 */
  reply: protectedProcedure
    .input(z.object({
      id: z.number(),
      adminReply: z.string().min(1, "回复内容不能为空").max(5000),
    }))
    .mutation(async ({ ctx, input }) => {
      const notification = await db.getUserNotificationById(input.id);
      if (!notification) {
        throw new TRPCError({ code: "NOT_FOUND", message: "通知不存在" });
      }
      await db.replyNotification(input.id, {
        adminReply: input.adminReply,
        repliedBy: ctx.user.id,
      });
      return { success: true };
    }),

  /** 管理员归档通知 */
  archive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.archiveNotification(input.id);
      return { success: true };
    }),

  /** 管理员删除通知 */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteUserNotification(input.id);
      return { success: true };
    }),

  /** 获取未读通知数量（管理员用，可用于导航角标） */
  unreadCount: protectedProcedure
    .query(async () => {
      const count = await db.getUnreadNotificationCount();
      return { count };
    }),
});
