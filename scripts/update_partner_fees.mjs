import mysql from 'mysql2/promise';

// 数据库连接配置
const connection = await mysql.createConnection(process.env.DATABASE_URL);

/**
 * 根据城市名称获取合伙人费配置
 */
async function getCityPartnerConfig(city) {
  if (!city) return null;
  
  const [rows] = await connection.execute(
    'SELECT * FROM cityPartnerConfig WHERE city = ? AND isActive = 1',
    [city]
  );
  
  return rows[0] || null;
}

/**
 * 计算合伙人费
 */
function calculatePartnerFee(courseAmount, teacherFee, partnerFeeRate) {
  const rate = Number(partnerFeeRate) / 100;
  const partnerFee = (courseAmount - teacherFee) * rate;
  return Math.round(partnerFee * 100) / 100;
}

/**
 * 批量更新订单的合伙人费用
 */
async function updatePartnerFees() {
  console.log('开始批量更新订单合伙人费用...\n');
  
  try {
    // 1. 获取所有需要更新的订单(有城市信息且合伙人费用为0或null的订单)
    const [allOrders] = await connection.execute(`
      SELECT id, deliveryCity, courseAmount, paymentAmount, teacherFee, partnerFee
      FROM orders
      WHERE deliveryCity IS NOT NULL 
        AND deliveryCity != ''
        AND (partnerFee = 0 OR partnerFee IS NULL)
        AND status != 'cancelled'
      ORDER BY id
    `);
    
    console.log(`找到 ${allOrders.length} 个需要更新的订单\n`);
    
    if (allOrders.length === 0) {
      console.log('没有需要更新的订单');
      await connection.end();
      return;
    }
    
    // 2. 按城市分组统计
    const cityStats = {};
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    for (const order of allOrders) {
      try {
        const city = order.deliveryCity;
        
        // 获取城市配置
        const config = await getCityPartnerConfig(city);
        
        if (!config) {
          skippedCount++;
          if (!cityStats[city]) {
            cityStats[city] = { count: 0, updated: 0, skipped: 0, noConfig: true };
          }
          cityStats[city].skipped++;
          continue;
        }
        
        // 计算合伙人费用
        const courseAmount = parseFloat(order.courseAmount || order.paymentAmount || 0);
        const teacherFee = parseFloat(order.teacherFee || 0);
        const partnerFee = calculatePartnerFee(courseAmount, teacherFee, config.partnerFeeRate);
        
        // 更新订单
        await connection.execute(
          'UPDATE orders SET partnerFee = ? WHERE id = ?',
          [partnerFee, order.id]
        );
        
        updatedCount++;
        
        // 统计
        if (!cityStats[city]) {
          cityStats[city] = { 
            count: 0, 
            updated: 0, 
            skipped: 0, 
            noConfig: false,
            rate: config.partnerFeeRate 
          };
        }
        cityStats[city].count++;
        cityStats[city].updated++;
        
      } catch (error) {
        errors.push({ orderId: order.id, error: error.message });
        skippedCount++;
      }
    }
    
    // 3. 输出统计结果
    console.log('='.repeat(60));
    console.log('更新结果统计:');
    console.log('='.repeat(60));
    console.log(`总订单数: ${allOrders.length}`);
    console.log(`成功更新: ${updatedCount}`);
    console.log(`跳过: ${skippedCount}`);
    console.log('');
    
    console.log('各城市统计:');
    console.log('-'.repeat(60));
    console.log('城市\t\t订单数\t更新数\t跳过数\t费率');
    console.log('-'.repeat(60));
    
    for (const [city, stats] of Object.entries(cityStats)) {
      if (stats.noConfig) {
        console.log(`${city}\t\t${stats.count}\t${stats.updated}\t${stats.skipped}\t无配置`);
      } else {
        console.log(`${city}\t\t${stats.count}\t${stats.updated}\t${stats.skipped}\t${stats.rate}%`);
      }
    }
    
    if (errors.length > 0) {
      console.log('\n错误列表:');
      console.log('-'.repeat(60));
      errors.forEach(err => {
        console.log(`订单ID ${err.orderId}: ${err.error}`);
      });
    }
    
    console.log('\n更新完成!');
    
  } catch (error) {
    console.error('批量更新失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 执行更新
updatePartnerFees().catch(console.error);
