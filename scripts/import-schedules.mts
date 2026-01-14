import { getDb } from '../server/db.js';
import { schedules } from '../drizzle/schema.js';
import fs from 'fs';

async function importSchedules() {
  console.log('=== 导入课程对账表到课程排课 ===\n');
  
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection failed');
  }
  
  // 读取数据
  const rawData = fs.readFileSync('/tmp/course_reconciliation_data.json', 'utf-8');
  const { data } = JSON.parse(rawData);
  
  console.log(`总记录数: ${data.length}\n`);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    
    try {
      // 跳过无效记录
      if (!record['日期'] || !record['客户名']) {
        skipCount++;
        continue;
      }
      
      // 解析日期和时间
      const classDate = new Date(record['日期']);
      const startTimeStr = String(record['开始时间'] || '09:00');
      const endTimeStr = String(record['结束时间'] || '10:00');
      
      // 构建完整的时间戳
      const [startHour, startMin] = startTimeStr.split(':').map(Number);
      const [endHour, endMin] = endTimeStr.split(':').map(Number);
      
      const startTime = new Date(classDate);
      startTime.setHours(startHour || 0, startMin || 0, 0, 0);
      
      const endTime = new Date(classDate);
      endTime.setHours(endHour || 0, endMin || 0, 0, 0);
      
      // 构建排课数据
      const scheduleData = {
        customerName: String(record['客户名'] || '').substring(0, 100),
        teacherName: String(record['老师'] || '').substring(0, 100),
        courseType: String(record['课程'] || '未指定').substring(0, 200),
        city: String(record['地点'] || '').substring(0, 50),
        location: String(record['教室'] || '').substring(0, 200),
        classDate: classDate,
        classTime: `${startTimeStr}-${endTimeStr}`.substring(0, 20),
        startTime: startTime,
        endTime: endTime,
        deliveryCity: String(record['地点'] || '').substring(0, 50),
        deliveryClassroom: String(record['教室'] || '').substring(0, 100),
        deliveryTeacher: String(record['老师'] || '').substring(0, 100),
        deliveryCourse: String(record['课程'] || '').substring(0, 200),
        status: 'completed' as const,
        notes: String(record['备注'] || ''),
        createdAt: new Date(),
      };
      
      // 插入排课
      await db.insert(schedules).values(scheduleData);
      successCount++;
      
      if ((i + 1) % 100 === 0) {
        console.log(`已处理: ${i + 1}/${data.length}`);
      }
      
    } catch (error: any) {
      const errorMsg = `记录 ${i + 1} (${record['客户名']}): ${error.message}`;
      errors.push(errorMsg);
      errorCount++;
      
      if (errorCount <= 5) {
        console.error(errorMsg);
      }
    }
  }
  
  console.log('\n=== 导入完成 ===');
  console.log(`成功: ${successCount}`);
  console.log(`跳过: ${skipCount}`);
  console.log(`失败: ${errorCount}`);
  
  if (errors.length > 5) {
    console.log(`\n(仅显示前5个错误,共${errors.length}个错误)`);
  }
  
  process.exit(0);
}

importSchedules().catch(err => {
  console.error('导入失败:', err);
  process.exit(1);
});
