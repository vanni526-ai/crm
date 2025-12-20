import { deleteCustomersWithTeacherNames } from "./server/db.ts";

async function main() {
  console.log("开始清理客户表中的老师名...");
  
  try {
    const deletedCount = await deleteCustomersWithTeacherNames();
    console.log(`✅ 成功清理${deletedCount}个老师名客户记录`);
  } catch (error) {
    console.error("❌ 清理失败:", error);
    process.exit(1);
  }
}

main();
