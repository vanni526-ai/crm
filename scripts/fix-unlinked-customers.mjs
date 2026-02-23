/**
 * 数据修复脚本：检查并修复users和customers表的未关联记录
 * 
 * 执行逻辑：
 * 1. 查找所有没有关联customer的user记录
 * 2. 尝试通过phone关联现有customer
 * 3. 如果找不到匹配的customer，创建新的customer记录
 * 4. 生成修复报告
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq, isNull, and } from "drizzle-orm";
import { users, customers } from "../drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

async function fixUnlinkedCustomers() {
  console.log("=".repeat(60));
  console.log("开始检查users和customers表的关联关系");
  console.log("=".repeat(60));
  console.log();

  const report = {
    totalUsers: 0,
    usersWithCustomer: 0,
    usersWithoutCustomer: 0,
    linkedByPhone: 0,
    newCustomersCreated: 0,
    errors: [],
  };

  try {
    // 1. 获取所有用户
    const allUsers = await db.select().from(users);
    report.totalUsers = allUsers.length;
    console.log(`📊 总用户数: ${report.totalUsers}`);
    console.log();

    // 2. 检查每个用户是否有关联的customer
    for (const user of allUsers) {
      try {
        // 查找该用户关联的customer
        const [existingCustomer] = await db
          .select()
          .from(customers)
          .where(eq(customers.userId, user.id))
          .limit(1);

        if (existingCustomer) {
          report.usersWithCustomer++;
          continue;
        }

        // 用户没有关联的customer
        report.usersWithoutCustomer++;
        console.log(`⚠️  用户 ${user.id} (${user.name || user.phone || "未知"}) 没有关联的customer`);

        // 3. 尝试通过phone关联现有customer
        if (user.phone) {
          const [customerByPhone] = await db
            .select()
            .from(customers)
            .where(
              and(
                eq(customers.phone, user.phone),
                isNull(customers.userId)
              )
            )
            .limit(1);

          if (customerByPhone) {
            // 关联现有customer
            await db
              .update(customers)
              .set({ userId: user.id })
              .where(eq(customers.id, customerByPhone.id));
            
            report.linkedByPhone++;
            console.log(`   ✅ 通过phone关联到customer ${customerByPhone.id} (${customerByPhone.name})`);
            continue;
          }
        }

        // 4. 创建新的customer记录
        const customerName = user.name || user.nickname || user.phone || `用户${user.id}`;
        const [result] = await db.insert(customers).values({
          userId: user.id,
          name: customerName,
          phone: user.phone || null,
          trafficSource: "App注册",
          createdBy: user.id,
          accountBalance: "0.00",
        });

        report.newCustomersCreated++;
        console.log(`   ✅ 创建新customer ${result.insertId} (${customerName})`);
      } catch (error) {
        report.errors.push({
          userId: user.id,
          userName: user.name || user.phone || "未知",
          error: error.message,
        });
        console.error(`   ❌ 处理用户 ${user.id} 时出错:`, error.message);
      }
    }

    // 5. 生成报告
    console.log();
    console.log("=".repeat(60));
    console.log("修复完成！统计报告：");
    console.log("=".repeat(60));
    console.log(`📊 总用户数: ${report.totalUsers}`);
    console.log(`✅ 已有关联的用户: ${report.usersWithCustomer}`);
    console.log(`⚠️  未关联的用户: ${report.usersWithoutCustomer}`);
    console.log(`🔗 通过phone关联: ${report.linkedByPhone}`);
    console.log(`➕ 新创建customer: ${report.newCustomersCreated}`);
    console.log(`❌ 处理失败: ${report.errors.length}`);
    console.log();

    if (report.errors.length > 0) {
      console.log("错误详情：");
      report.errors.forEach((err, index) => {
        console.log(`${index + 1}. 用户 ${err.userId} (${err.userName}): ${err.error}`);
      });
      console.log();
    }

    // 6. 验证修复结果
    console.log("=".repeat(60));
    console.log("验证修复结果...");
    console.log("=".repeat(60));
    
    const usersWithoutCustomerAfter = [];
    for (const user of allUsers) {
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.userId, user.id))
        .limit(1);
      
      if (!customer) {
        usersWithoutCustomerAfter.push(user);
      }
    }

    if (usersWithoutCustomerAfter.length === 0) {
      console.log("✅ 所有用户都已成功关联customer！");
    } else {
      console.log(`⚠️  仍有 ${usersWithoutCustomerAfter.length} 个用户未关联customer：`);
      usersWithoutCustomerAfter.forEach((user) => {
        console.log(`   - 用户 ${user.id} (${user.name || user.phone || "未知"})`);
      });
    }
    console.log();

    return report;
  } catch (error) {
    console.error("❌ 脚本执行失败:", error);
    throw error;
  }
}

// 执行脚本
fixUnlinkedCustomers()
  .then((report) => {
    console.log("✅ 脚本执行完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });
