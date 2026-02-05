/**
 * 批量同步App用户到业务客户表
 * 
 * 用途：为所有通过App注册并下单但未关联业务客户的用户创建业务客户记录
 * 
 * 运行方式：node scripts/syncAppUsersToCustomers.mjs
 */

import mysql from 'mysql2/promise';

async function syncAppUsersToCustomers() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('开始同步App用户到业务客户表...\n');
  
  // 1. 查找所有通过App下单但未关联业务客户的用户
  const [unlinkedOrders] = await conn.execute(`
    SELECT DISTINCT o.salesId as userId, u.name, u.nickname, u.phone
    FROM orders o
    JOIN users u ON o.salesId = u.id
    WHERE o.trafficSource = 'App用户下单'
      AND o.customerId IS NULL
      AND u.role = 'user'
      AND u.loginMethod = 'phone'
  `);
  
  console.log(`找到 ${unlinkedOrders.length} 个未关联业务客户的App用户\n`);
  
  let created = 0;
  let linked = 0;
  let errors = 0;
  
  for (const user of unlinkedOrders) {
    try {
      // 2. 检查是否已有关联的业务客户
      const [existingByUserId] = await conn.execute(
        'SELECT id, name FROM customers WHERE userId = ?',
        [user.userId]
      );
      
      let customerId;
      let customerName;
      
      if (existingByUserId.length > 0) {
        // 已有关联的业务客户
        customerId = existingByUserId[0].id;
        customerName = existingByUserId[0].name;
        console.log(`用户 ${user.phone} 已有关联的业务客户 ${customerId}`);
      } else {
        // 检查是否有同手机号的业务客户
        const [existingByPhone] = await conn.execute(
          'SELECT id, name FROM customers WHERE phone = ?',
          [user.phone]
        );
        
        if (existingByPhone.length > 0) {
          // 关联现有客户
          customerId = existingByPhone[0].id;
          customerName = existingByPhone[0].name;
          await conn.execute(
            'UPDATE customers SET userId = ? WHERE id = ?',
            [user.userId, customerId]
          );
          console.log(`用户 ${user.phone} 关联到现有业务客户 ${customerId} (${customerName})`);
          linked++;
        } else {
          // 创建新的业务客户
          customerName = user.name || user.nickname || user.phone || `用户${user.userId}`;
          const [insertResult] = await conn.execute(
            'INSERT INTO customers (userId, name, phone, trafficSource, createdBy, accountBalance) VALUES (?, ?, ?, ?, ?, ?)',
            [user.userId, customerName, user.phone, 'App注册', user.userId, '0.00']
          );
          customerId = insertResult.insertId;
          console.log(`为用户 ${user.phone} 创建新业务客户 ${customerId}`);
          created++;
        }
      }
      
      // 3. 更新该用户的所有未关联订单
      const [updateResult] = await conn.execute(
        'UPDATE orders SET customerId = ? WHERE salesId = ? AND customerId IS NULL',
        [customerId, user.userId]
      );
      
      if (updateResult.affectedRows > 0) {
        console.log(`  - 更新了 ${updateResult.affectedRows} 个订单\n`);
      }
      
    } catch (error) {
      console.error(`处理用户 ${user.phone} 时出错:`, error.message);
      errors++;
    }
  }
  
  console.log('\n========== 同步完成 ==========');
  console.log(`新创建业务客户: ${created}`);
  console.log(`关联现有客户: ${linked}`);
  console.log(`处理错误: ${errors}`);
  
  await conn.end();
}

syncAppUsersToCustomers().catch(console.error);
