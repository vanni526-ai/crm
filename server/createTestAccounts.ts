/**
 * 创建测试账号脚本
 * 运行: node --loader ts-node/esm server/createTestAccounts.ts
 */
import { getDb } from "./db.js";
import { users } from "../drizzle/schema.js";
import { hashPassword } from "./passwordUtils.js";
import { eq } from "drizzle-orm";

async function createTestAccounts() {
  console.log("开始创建测试账号...");

  const drizzle = await getDb();
  if (!drizzle) {
    console.error("数据库连接失败");
    process.exit(1);
  }

  const testAccounts = [
    {
      name: "test",
      password: "123456",
      phone: "13800138001",
      email: "test@example.com",
      role: "user" as const,
      nickname: "测试用户",
    },
    {
      name: "admin",
      password: "admin123",
      phone: "13800138000",
      email: "admin@example.com",
      role: "admin" as const,
      nickname: "管理员",
    },
  ];

  for (const account of testAccounts) {
    try {
      // 检查用户是否已存在
      const existing = await drizzle
        .select()
        .from(users)
        .where(eq(users.name, account.name))
        .limit(1);

      if (existing.length > 0) {
        console.log(`用户 ${account.name} 已存在,跳过创建`);
        
        // 更新密码
        const hashedPassword = await hashPassword(account.password);
        await drizzle
          .update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, existing[0].id));
        
        console.log(`已更新用户 ${account.name} 的密码`);
        continue;
      }

      // 加密密码
      const hashedPassword = await hashPassword(account.password);

      // 生成openId
      const openId = `user_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}`;

      // 创建用户
      await drizzle.insert(users).values({
        openId,
        name: account.name,
        nickname: account.nickname,
        email: account.email,
        phone: account.phone,
        password: hashedPassword,
        role: account.role,
        isActive: true,
      });

      console.log(`✓ 创建用户成功: ${account.name} (密码: ${account.password})`);
    } catch (error) {
      console.error(`✗ 创建用户失败: ${account.name}`, error);
    }
  }

  console.log("\n测试账号创建完成!");
  console.log("\n可用的测试账号:");
  console.log("1. 用户名: test, 密码: 123456 (普通用户)");
  console.log("2. 用户名: admin, 密码: admin123 (管理员)");
  console.log("\n也可以使用手机号或邮箱登录");

  process.exit(0);
}

createTestAccounts().catch((error) => {
  console.error("创建测试账号失败:", error);
  process.exit(1);
});
