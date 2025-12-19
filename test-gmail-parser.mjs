/**
 * 测试Gmail订单解析功能
 */

const testEmailContent = `Dear:

微信群"瀛姬合伙店打款群"的聊天记录如下:

—————  2025-12-17  —————

瀛姬喵喵11:00-20:00  17:34

昭昭 12.17 20:30-21:30 sp课 云云上（无锡单）全款1500已付 无锡教室第三次使用


瀛姬小颖  19:09

嘟嘟 12.17 18:00-20:00  裸足丝袜+埃及艳后  皮皮上（济南）  ，韩开银1600定金已付   1600尾款已付➕报销老师200车费 （济南教室第二次使用）`;

console.log("测试邮件内容:");
console.log(testEmailContent);
console.log("\n" + "=".repeat(60) + "\n");

// 导入解析函数
import { parseGmailOrderContent } from "./server/gmailOrderParser.ts";

try {
  console.log("开始解析...\n");
  const orders = await parseGmailOrderContent(testEmailContent);
  
  console.log(`解析成功! 共提取 ${orders.length} 条订单:\n`);
  
  orders.forEach((order, index) => {
    console.log(`订单 ${index + 1}:`);
    console.log(`  销售人员: ${order.salesperson}`);
    console.log(`  设备微信号: ${order.deviceWechat}`);
    console.log(`  客户名: ${order.customerName}`);
    console.log(`  上课日期: ${order.classDate}`);
    console.log(`  上课时间: ${order.classTime}`);
    console.log(`  课程: ${order.course}`);
    console.log(`  老师: ${order.teacher}`);
    console.log(`  城市: ${order.city}`);
    console.log(`  教室: ${order.classroom}`);
    console.log(`  支付金额: ${order.paymentAmount}`);
    console.log(`  课程金额: ${order.courseAmount}`);
    console.log(`  首付金额: ${order.downPayment}`);
    console.log(`  尾款金额: ${order.finalPayment}`);
    console.log(`  老师费用: ${order.teacherFee}`);
    console.log(`  车费: ${order.carFee}`);
    console.log(`  备注: ${order.notes}`);
    console.log("\n");
  });
  
  console.log("测试通过! ✅");
} catch (error) {
  console.error("解析失败:", error);
  console.log("测试失败! ❌");
  process.exit(1);
}
