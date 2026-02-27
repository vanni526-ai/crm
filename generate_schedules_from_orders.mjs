import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // 查询所有orders记录
  const [orders] = await connection.query(`
    SELECT 
      id as orderId,
      customerId,
      customerName,
      salesName,
      trafficSource,
      courseAmount,
      teacherFee,
      transportFee,
      otherFee,
      partnerFee,
      deliveryCity,
      deliveryRoom as deliveryClassroom,
      deliveryTeacher,
      deliveryCourse,
      classDate,
      classTime
    FROM orders
    WHERE classDate IS NOT NULL
  `);

  console.log(`找到${orders.length}条有上课日期的订单记录`);

  let successCount = 0;
  let failedCount = 0;

  for (const order of orders) {
    try {
      // 解析classTime为startTime和endTime
      let startTime, endTime;
      if (order.classTime && order.classDate) {
        const [startHM, endHM] = order.classTime.split('-');
        if (startHM && endHM) {
          const [startH, startM] = startHM.split(':');
          const [endH, endM] = endHM.split(':');
          
          const baseDate = new Date(order.classDate);
          startTime = new Date(baseDate);
          startTime.setHours(parseInt(startH) || 0, parseInt(startM) || 0, 0, 0);
          
          endTime = new Date(baseDate);
          endTime.setHours(parseInt(endH) || 0, parseInt(endM) || 0, 0, 0);
        }
      }

      // 如果没有时间信息，使用默认值
      if (!startTime || !endTime) {
        const baseDate = order.classDate ? new Date(order.classDate) : new Date();
        startTime = new Date(baseDate);
        startTime.setHours(9, 0, 0, 0);
        endTime = new Date(baseDate);
        endTime.setHours(10, 0, 0, 0);
      }

      // 插入schedule记录
      await connection.query(`
        INSERT INTO schedules (
          orderId,
          customerId,
          customerName,
          salesName,
          trafficSource,
          courseAmount,
          teacherFee,
          transportFee,
          otherFee,
          partnerFee,
          deliveryCity,
          deliveryClassroom,
          deliveryTeacher,
          deliveryCourse,
          classDate,
          classTime,
          startTime,
          endTime,
          courseType,
          location,
          teacherName,
          status,
          createdAt,
          updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW(), NOW())
      `, [
        order.orderId,
        order.customerId || 0,
        order.customerName || '',
        order.salesName || '',
        order.trafficSource || '',
        order.courseAmount || 0,
        order.teacherFee || 0,
        order.transportFee || 0,
        order.otherFee || 0,
        order.partnerFee || 0,
        order.deliveryCity || '',
        order.deliveryClassroom || '',
        order.deliveryTeacher || '',
        order.deliveryCourse || '',
        order.classDate,
        order.classTime || '',
        startTime,
        endTime,
        order.deliveryCourse || '未知课程',
        order.deliveryClassroom || '',
        order.deliveryTeacher || ''
      ]);

      successCount++;
    } catch (error) {
      console.error(`订单${order.orderId}处理失败:`, error.message);
      failedCount++;
    }
  }

  console.log(`\n生成完成:`);
  console.log(`  成功: ${successCount}条`);
  console.log(`  失败: ${failedCount}条`);

  // 验证结果
  const [result] = await connection.query('SELECT COUNT(*) as count FROM schedules');
  console.log(`\nschedules表当前记录数: ${result[0].count}`);

} finally {
  await connection.end();
}
