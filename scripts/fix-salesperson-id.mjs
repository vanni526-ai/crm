/**
 * 为历史订单补全salespersonId字段
 * 根据salesPerson文本字段匹配salespersons表中的name或nickname
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixSalespersonId() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('正在连接数据库...');
    
    // 查询所有销售人员
    const [salespersons] = await connection.query(`
      SELECT id, name, nickname, aliases FROM salespersons WHERE isActive = 1
    `);
    
    console.log(`✅ 查询到 ${salespersons.length} 个销售人员`);
    
    // 查询所有salespersonId为null但salesPerson有值的订单
    const [orders] = await connection.query(`
      SELECT id, salesPerson FROM orders 
      WHERE salespersonId IS NULL AND salesPerson IS NOT NULL AND salesPerson != ''
    `);
    
    console.log(`✅ 查询到 ${orders.length} 个需要修复的订单\n`);
    
    if (orders.length === 0) {
      console.log('没有需要修复的订单');
      return;
    }
    
    let fixedCount = 0;
    let notFoundCount = 0;
    const notFoundNames = new Set();
    
    console.log('开始匹配并更新订单...\n');
    console.log('订单ID\t销售人员\t匹配结果');
    console.log('='.repeat(60));
    
    for (const order of orders) {
      const salesPersonText = order.salesPerson.trim();
      
      // 尝试匹配销售人员
      let matchedSalesperson = null;
      
      for (const sp of salespersons) {
        // 匹配name
        if (sp.name && sp.name.trim() === salesPersonText) {
          matchedSalesperson = sp;
          break;
        }
        
        // 匹配nickname
        if (sp.nickname && sp.nickname.trim() === salesPersonText) {
          matchedSalesperson = sp;
          break;
        }
        
        // 匹配aliases
        if (sp.aliases) {
          try {
            const aliasesArray = JSON.parse(sp.aliases);
            if (Array.isArray(aliasesArray) && aliasesArray.includes(salesPersonText)) {
              matchedSalesperson = sp;
              break;
            }
          } catch (e) {
            // 忽略JSON解析错误
          }
        }
      }
      
      if (matchedSalesperson) {
        // 更新订单的salespersonId
        await connection.query(
          'UPDATE orders SET salespersonId = ? WHERE id = ?',
          [matchedSalesperson.id, order.id]
        );
        
        console.log(`${order.id}\t${salesPersonText}\t✅ 匹配到: ${matchedSalesperson.name} (ID: ${matchedSalesperson.id})`);
        fixedCount++;
      } else {
        console.log(`${order.id}\t${salesPersonText}\t❌ 未找到匹配`);
        notFoundCount++;
        notFoundNames.add(salesPersonText);
      }
    }
    
    console.log('='.repeat(60));
    console.log(`\n修复完成！统计信息:`);
    console.log(`  总订单数: ${orders.length}`);
    console.log(`  已修复: ${fixedCount}`);
    console.log(`  未找到匹配: ${notFoundCount}`);
    
    if (notFoundNames.size > 0) {
      console.log(`\n未找到匹配的销售人员名称:`);
      notFoundNames.forEach(name => console.log(`  - ${name}`));
    }
    
    // 验证修复结果
    const [result] = await connection.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN salespersonId IS NULL AND salesPerson IS NOT NULL THEN 1 ELSE 0 END) as still_null
      FROM orders
    `);
    
    console.log(`\n验证结果:`);
    console.log(`  总订单数: ${result[0].total}`);
    console.log(`  仍需修复: ${result[0].still_null}`);
    
  } catch (error) {
    console.error('❌ 发生错误:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('\n数据库连接已关闭');
  }
}

// 运行脚本
fixSalespersonId().catch(console.error);
