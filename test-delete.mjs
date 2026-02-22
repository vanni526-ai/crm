import { appRouter } from "./server/routers.js";

// 创建测试上下文
const ctx = {
  user: {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: {
    protocol: "https",
    headers: {},
  },
  res: {},
};

const caller = appRouter.createCaller(ctx);

// 测试删除订单
try {
  console.log("\n=== 测试删除订单 ===");
  const result = await caller.orders.delete({ id: 2610012 });
  console.log("✅ 删除成功:", result);
} catch (error) {
  console.error("❌ 删除失败:", error.message);
  console.error("错误详情:", error);
}

process.exit(0);
