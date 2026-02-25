import { describe, it, expect } from "vitest";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq, and, like, isNull, or } from "drizzle-orm";

describe("Update empty nicknames for teachers", () => {
  it("should find and update teachers with empty nicknames", async () => {
    const db = await getDb();
    if (!db) {
      console.error("数据库连接失败");
      return;
    }
    
    // 先查询所有老师用户，查看nickname字段的实际值
    const allTeachers = await db
      .select({
        id: users.id,
        name: users.name,
        nickname: users.nickname,
        roles: users.roles,
      })
      .from(users)
      .where(like(users.roles, "%老师%"))
      .limit(20);

    console.log(`\n查询到 ${allTeachers.length} 位老师:`);
    allTeachers.forEach((teacher) => {
      console.log(`  ID: ${teacher.id}, 姓名: ${teacher.name}, 花名: "${teacher.nickname}", 角色: ${teacher.roles}`);
    });

    // 查询所有老师角色且花名为NULL或空字符串的用户
    const teachersWithEmptyNickname = await db
      .select({
        id: users.id,
        name: users.name,
        nickname: users.nickname,
        roles: users.roles,
      })
      .from(users)
      .where(
        and(
          like(users.roles, "%老师%"),
          or(isNull(users.nickname), eq(users.nickname, ""))
        )
      );

    console.log(`\n找到 ${teachersWithEmptyNickname.length} 位花名为空的老师:`);
    teachersWithEmptyNickname.forEach((teacher) => {
      console.log(`  ID: ${teacher.id}, 姓名: ${teacher.name}, 花名: ${teacher.nickname}, 角色: ${teacher.roles}`);
    });

    if (teachersWithEmptyNickname.length === 0) {
      console.log("\n所有老师都已有花名，无需更新");
      return;
    }

    // 批量更新花名为用户名
    let updatedCount = 0;
    for (const teacher of teachersWithEmptyNickname) {
      await db
        .update(users)
        .set({ nickname: teacher.name })
        .where(eq(users.id, teacher.id));
      updatedCount++;
      console.log(`  已更新: ID ${teacher.id}, 花名设置为 "${teacher.name}"`);
    }

    console.log(`\n✅ 成功更新 ${updatedCount} 位老师的花名`);

    // 验证更新结果
    const verifyResult = await db
      .select({
        id: users.id,
        name: users.name,
        nickname: users.nickname,
      })
      .from(users)
      .where(
        and(
          like(users.roles, "%老师%"),
          or(isNull(users.nickname), eq(users.nickname, ""))
        )
      );

    console.log(`\n验证结果: 还有 ${verifyResult.length} 位老师的花名为空`);
    expect(verifyResult.length).toBe(0);
  });
});
