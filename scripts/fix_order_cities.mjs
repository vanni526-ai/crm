import mysql from 'mysql2/promise';

// 数据库连接配置
const connection = await mysql.createConnection(process.env.DATABASE_URL);

/**
 * 根据教室信息推断城市
 */
function inferCityFromClassroom(classroom) {
  if (!classroom) return null;
  
  const classroomLower = classroom.toLowerCase().trim();
  
  // 上海教室关键词
  const shanghaiKeywords = [
    '404', '1101', '捷运大厦16d', '长风北岸404', '长风北岸1101',
    '404教室', '1101教室', '捷运大厦', '长风北岸'
  ];
  
  for (const keyword of shanghaiKeywords) {
    if (classroomLower.includes(keyword.toLowerCase())) {
      return '上海';
    }
  }
  
  // 从教室名称中提取城市(如"无锡教室" → "无锡")
  const cityMatch = classroom.match(/^([\u4e00-\u9fa5]+)教室$/);
  if (cityMatch) {
    return cityMatch[1];
  }
  
  return null;
}

/**
 * 批量修复订单城市信息
 */
async function fixOrderCities() {
  console.log('开始批量修复订单城市信息...\n');
  
  try {
    // 1. 获取所有城市为空但有教室信息的订单
    const [orders] = await connection.execute(`
      SELECT id, deliveryCity, deliveryRoom
      FROM orders
      WHERE (deliveryCity IS NULL OR deliveryCity = '' OR deliveryCity = '-')
        AND deliveryRoom IS NOT NULL 
        AND deliveryRoom != ''
        AND status != 'cancelled'
      ORDER BY id
    `);
    
    console.log(`找到 ${orders.length} 个需要修复的订单\n`);
    
    if (orders.length === 0) {
      console.log('没有需要修复的订单');
      await connection.end();
      return;
    }
    
    // 2. 按推断的城市分组统计
    const cityStats = {};
    let updatedCount = 0;
    let skippedCount = 0;
    const updates = [];
    
    for (const order of orders) {
      const inferredCity = inferCityFromClassroom(order.deliveryRoom);
      
      if (inferredCity) {
        updates.push({ id: order.id, city: inferredCity, classroom: order.deliveryRoom });
        updatedCount++;
        
        if (!cityStats[inferredCity]) {
          cityStats[inferredCity] = { count: 0, classrooms: new Set() };
        }
        cityStats[inferredCity].count++;
        cityStats[inferredCity].classrooms.add(order.deliveryRoom);
      } else {
        skippedCount++;
      }
    }
    
    // 3. 显示预览并确认
    console.log('='.repeat(60));
    console.log('修复预览:');
    console.log('='.repeat(60));
    console.log(`总订单数: ${orders.length}`);
    console.log(`可修复: ${updatedCount}`);
    console.log(`无法推断: ${skippedCount}`);
    console.log('');
    
    console.log('各城市统计:');
    console.log('-'.repeat(60));
    for (const [city, stats] of Object.entries(cityStats)) {
      console.log(`${city}: ${stats.count}个订单`);
      console.log(`  教室: ${Array.from(stats.classrooms).join(', ')}`);
    }
    console.log('');
    
    // 4. 执行更新
    console.log('开始更新订单...');
    for (const update of updates) {
      await connection.execute(
        'UPDATE orders SET deliveryCity = ? WHERE id = ?',
        [update.city, update.id]
      );
    }
    
    // 5. 输出结果
    console.log('='.repeat(60));
    console.log('更新完成!');
    console.log('='.repeat(60));
    console.log(`成功更新: ${updatedCount}个订单`);
    console.log(`跳过: ${skippedCount}个订单`);
    console.log('');
    
    console.log('详细统计:');
    console.log('-'.repeat(60));
    for (const [city, stats] of Object.entries(cityStats)) {
      console.log(`${city}: ${stats.count}个订单`);
    }
    
  } catch (error) {
    console.error('批量修复失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 执行修复
fixOrderCities().catch(console.error);
