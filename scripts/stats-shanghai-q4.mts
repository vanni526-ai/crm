import { getDb } from '../server/db.js';
import { schedules } from '../drizzle/schema.js';
import { sql, and, gte, lte, or, like } from 'drizzle-orm';

async function statsShanghai() {
  console.log('=== 上海地区2025年Q4课程统计 ===\n');
  
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection failed');
  }
  
  // 定义月份范围
  const months = [
    { name: '10月', start: '2025-10-01', end: '2025-10-31' },
    { name: '11月', start: '2025-11-01', end: '2025-11-30' },
    { name: '12月', start: '2025-12-01', end: '2025-12-31' },
  ];
  
  console.log('统计范围: 上海地区(包含404和1101教室)\n');
  
  for (const month of months) {
    // 查询该月份上海地区的课程
    const courses = await db
      .select()
      .from(schedules)
      .where(
        and(
          gte(schedules.classDate, new Date(month.start)),
          lte(schedules.classDate, new Date(month.end)),
          or(
            like(schedules.deliveryClassroom, '%404%'),
            like(schedules.deliveryClassroom, '%1101%'),
            like(schedules.location, '%404%'),
            like(schedules.location, '%1101%'),
            like(schedules.deliveryCity, '%上海%'),
            like(schedules.city, '%上海%')
          )
        )
      );
    
    console.log(`${month.name} (${month.start} 至 ${month.end}):`);
    console.log(`  课程数量: ${courses.length}`);
    
    // 统计404和1101的分布
    const room404 = courses.filter(c => 
      (c.deliveryClassroom && c.deliveryClassroom.includes('404')) ||
      (c.location && c.location.includes('404'))
    );
    
    const room1101 = courses.filter(c => 
      (c.deliveryClassroom && c.deliveryClassroom.includes('1101')) ||
      (c.location && c.location.includes('1101'))
    );
    
    console.log(`  - 404教室: ${room404.length}节课`);
    console.log(`  - 1101教室: ${room1101.length}节课`);
    console.log(`  - 其他/未指定: ${courses.length - room404.length - room1101.length}节课`);
    console.log();
  }
  
  // 总计
  const totalCourses = await db
    .select()
    .from(schedules)
    .where(
      and(
        gte(schedules.classDate, new Date('2025-10-01')),
        lte(schedules.classDate, new Date('2025-12-31')),
        or(
          like(schedules.deliveryClassroom, '%404%'),
          like(schedules.deliveryClassroom, '%1101%'),
          like(schedules.location, '%404%'),
          like(schedules.location, '%1101%'),
          like(schedules.deliveryCity, '%上海%'),
          like(schedules.city, '%上海%')
        )
      )
    );
  
  console.log('=== 总计 ===');
  console.log(`2025年Q4(10-12月)上海地区总课程数: ${totalCourses.length}`);
  
  process.exit(0);
}

statsShanghai().catch(err => {
  console.error('统计失败:', err);
  process.exit(1);
});
