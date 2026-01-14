import { getDb } from '../server/db.js';
import { orders, schedules } from '../drizzle/schema.js';
import { sql } from 'drizzle-orm';

async function verifyImport() {
  const db = await getDb();
  if (!db) {
    console.error('Database connection failed');
    process.exit(1);
  }
  
  const orderCount = await db.select({ count: sql`count(*)` }).from(orders);
  const scheduleCount = await db.select({ count: sql`count(*)` }).from(schedules);
  
  // 查询最近导入的订单样本
  const recentOrders = await db.select().from(orders).orderBy(sql`id DESC`).limit(5);
  
  // 查询最近导入的排课样本
  const recentSchedules = await db.select().from(schedules).orderBy(sql`id DESC`).limit(5);
  
  console.log('=== 数据导入验证结果 ===\n');
  console.log(`订单表记录数: ${orderCount[0].count}`);
  console.log(`排课表记录数: ${scheduleCount[0].count}\n`);
  
  console.log('=== 最近导入的订单样本 ===');
  recentOrders.forEach((order, idx) => {
    console.log(`\n订单 ${idx + 1}:`);
    console.log(`  订单号: ${order.orderNo}`);
    console.log(`  客户名: ${order.customerName}`);
    console.log(`  上课日期: ${order.classDate}`);
    console.log(`  上课时间: ${order.classTime}`);
    console.log(`  老师: ${order.deliveryTeacher}`);
    console.log(`  课程: ${order.deliveryCourse}`);
  });
  
  console.log('\n\n=== 最近导入的排课样本 ===');
  recentSchedules.forEach((schedule, idx) => {
    console.log(`\n排课 ${idx + 1}:`);
    console.log(`  客户名: ${schedule.customerName}`);
    console.log(`  老师: ${schedule.teacherName}`);
    console.log(`  课程: ${schedule.courseType}`);
    console.log(`  上课日期: ${schedule.classDate}`);
    console.log(`  时间: ${schedule.startTime} - ${schedule.endTime}`);
    console.log(`  地点: ${schedule.city} ${schedule.location}`);
  });
  
  process.exit(0);
}

verifyImport().catch(err => {
  console.error('验证失败:', err);
  process.exit(1);
});
