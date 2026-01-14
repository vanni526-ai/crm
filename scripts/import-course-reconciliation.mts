import { getDb } from '../server/db.js';
import { orders } from '../drizzle/schema.js';
import fs from 'fs';

async function importCourseReconciliation() {
  console.log('=== 导入课程对账表到订单管理 ===\n');
  
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
  
  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    
    try {
      // 跳过无效记录
      if (!record['日期'] || !record['客户名']) {
        skipCount++;
        continue;
      }
      
      // 构建订单数据
      const orderData = {
        orderNo: `ICS${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        customerName: String(record['客户名'] || ''),
        classDate: new Date(record['日期']),
        classTime: `${record['开始时间'] || ''}-${record['结束时间'] || ''}`,
        deliveryTeacher: String(record['老师'] || ''),
        deliveryCourse: String(record['课程'] || ''),
        deliveryCity: String(record['地点'] || ''),
        deliveryClassroom: String(record['教室'] || ''),
        notes: String(record['备注'] || ''),
        status: 'completed' as const,
        createdAt: new Date(),
      };
      
      // 插入订单
      await db.insert(orders).values(orderData);
      successCount++;
      
      if ((i + 1) % 100 === 0) {
        console.log(`已处理: ${i + 1}/${data.length}`);
      }
      
    } catch (error: any) {
      console.error(`记录 ${i + 1} 导入失败:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n=== 导入完成 ===');
  console.log(`成功: ${successCount}`);
  console.log(`跳过: ${skipCount}`);
  console.log(`失败: ${errorCount}`);
  
  process.exit(0);
}

importCourseReconciliation().catch(err => {
  console.error('导入失败:', err);
  process.exit(1);
});
