import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("notifications", () => {
  // 用于存储创建的通知ID
  let createdNotificationId: number;

  it("should submit a notification (public procedure)", async () => {
    const publicCaller = appRouter.createCaller(createPublicContext());

    const result = await publicCaller.notifications.submit({
      userId: 1,
      userName: "测试用户",
      userPhone: "13800138000",
      type: "general",
      title: "测试留言标题",
      content: "这是一条测试留言内容，用于验证申请通知功能是否正常工作。",
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.id).toBeGreaterThan(0);
    createdNotificationId = result.id;
  });

  it("should submit notification with different types", async () => {
    const publicCaller = appRouter.createCaller(createPublicContext());

    const types = ["complaint", "suggestion", "consultation", "application"] as const;
    for (const type of types) {
      const result = await publicCaller.notifications.submit({
        userId: 2,
        userName: "用户B",
        type,
        content: `这是一条${type}类型的留言`,
      });
      expect(result.success).toBe(true);
      expect(result.id).toBeGreaterThan(0);
    }
  });

  it("should reject empty content", async () => {
    const publicCaller = appRouter.createCaller(createPublicContext());

    await expect(
      publicCaller.notifications.submit({
        userId: 1,
        content: "",
      })
    ).rejects.toThrow();
  });

  it("should list notifications for admin (protected procedure)", async () => {
    const authCaller = appRouter.createCaller(createAuthContext());

    const result = await authCaller.notifications.list({
      page: 1,
      pageSize: 10,
    });

    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it("should filter notifications by status", async () => {
    const authCaller = appRouter.createCaller(createAuthContext());

    const result = await authCaller.notifications.list({
      status: "unread",
      page: 1,
      pageSize: 10,
    });

    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
    // 所有返回的通知都应该是unread状态
    for (const item of result.items) {
      expect(item.status).toBe("unread");
    }
  });

  it("should filter notifications by type", async () => {
    const authCaller = appRouter.createCaller(createAuthContext());

    const result = await authCaller.notifications.list({
      type: "complaint",
      page: 1,
      pageSize: 10,
    });

    expect(result).toBeDefined();
    for (const item of result.items) {
      expect(item.type).toBe("complaint");
    }
  });

  it("should get notification detail", async () => {
    const authCaller = appRouter.createCaller(createAuthContext());

    // 先获取列表拿到一个ID
    const listResult = await authCaller.notifications.list({ page: 1, pageSize: 1 });
    if (listResult.items.length > 0) {
      const detail = await authCaller.notifications.detail({ id: listResult.items[0].id });
      expect(detail).toBeDefined();
      expect(detail.id).toBe(listResult.items[0].id);
      expect(detail.content).toBeDefined();
    }
  });

  it("should mark notification as read", async () => {
    const authCaller = appRouter.createCaller(createAuthContext());

    // 先获取一条未读通知
    const listResult = await authCaller.notifications.list({ status: "unread", page: 1, pageSize: 1 });
    if (listResult.items.length > 0) {
      const result = await authCaller.notifications.markRead({ id: listResult.items[0].id });
      expect(result.success).toBe(true);

      // 验证状态已更新
      const detail = await authCaller.notifications.detail({ id: listResult.items[0].id });
      expect(detail.status).toBe("read");
      expect(detail.readAt).toBeDefined();
    }
  });

  it("should reply to notification", async () => {
    const authCaller = appRouter.createCaller(createAuthContext());

    const listResult = await authCaller.notifications.list({ page: 1, pageSize: 1 });
    if (listResult.items.length > 0) {
      const result = await authCaller.notifications.reply({
        id: listResult.items[0].id,
        adminReply: "感谢您的留言，我们已收到并会尽快处理。",
      });
      expect(result.success).toBe(true);

      // 验证回复已保存
      const detail = await authCaller.notifications.detail({ id: listResult.items[0].id });
      expect(detail.status).toBe("replied");
      expect(detail.adminReply).toBe("感谢您的留言，我们已收到并会尽快处理。");
      expect(detail.repliedAt).toBeDefined();
    }
  });

  it("should get unread count", async () => {
    const authCaller = appRouter.createCaller(createAuthContext());

    const result = await authCaller.notifications.unreadCount();
    expect(result).toBeDefined();
    expect(typeof result.count).toBe("number");
    expect(result.count).toBeGreaterThanOrEqual(0);
  });

  it("should list user's own notifications (public procedure)", async () => {
    const publicCaller = appRouter.createCaller(createPublicContext());

    const result = await publicCaller.notifications.myList({
      userId: 1,
      page: 1,
      pageSize: 10,
    });

    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    // 所有返回的通知都应该属于userId=1
    for (const item of result.items) {
      expect(item.userId).toBe(1);
    }
  });

  it("should archive notification", async () => {
    const authCaller = appRouter.createCaller(createAuthContext());

    const listResult = await authCaller.notifications.list({ page: 1, pageSize: 1 });
    if (listResult.items.length > 0) {
      const result = await authCaller.notifications.archive({ id: listResult.items[0].id });
      expect(result.success).toBe(true);

      const detail = await authCaller.notifications.detail({ id: listResult.items[0].id });
      expect(detail.status).toBe("archived");
    }
  });

  it("should batch mark notifications as read", async () => {
    const publicCaller = appRouter.createCaller(createPublicContext());
    const authCaller = appRouter.createCaller(createAuthContext());

    // 先创建几条新通知
    const ids: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await publicCaller.notifications.submit({
        userId: 3,
        content: `批量测试留言 ${i + 1}`,
      });
      ids.push(r.id);
    }

    // 批量标记已读
    const result = await authCaller.notifications.batchMarkRead({ ids });
    expect(result.success).toBe(true);
    expect(result.count).toBe(3);
  });

  it("should delete notification", async () => {
    const publicCaller = appRouter.createCaller(createPublicContext());
    const authCaller = appRouter.createCaller(createAuthContext());

    // 创建一条用于删除的通知
    const submitResult = await publicCaller.notifications.submit({
      userId: 99,
      content: "这条通知将被删除",
    });

    const deleteResult = await authCaller.notifications.delete({ id: submitResult.id });
    expect(deleteResult.success).toBe(true);

    // 验证已删除
    await expect(
      authCaller.notifications.detail({ id: submitResult.id })
    ).rejects.toThrow();
  });

  it("should reject list for unauthenticated user", async () => {
    const publicCaller = appRouter.createCaller(createPublicContext());

    await expect(
      publicCaller.notifications.list({ page: 1, pageSize: 10 })
    ).rejects.toThrow();
  });
});
