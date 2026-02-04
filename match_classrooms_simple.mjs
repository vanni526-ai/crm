import mysql from 'mysql2/promise';

// 从环境变量获取数据库连接
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

// 创建数据库连接
const connection = await mysql.createConnection(DATABASE_URL);

console.log('🔍 开始匹配订单教室...\n');

// 1. 获取所有城市和教室数据
console.log('📊 加载城市和教室数据...');
const [allCities] = await connection.query('SELECT * FROM cities');
const [allClassrooms] = await connection.query('SELECT * FROM classrooms');

console.log(`✅ 加载了 ${allCities.length} 个城市, ${allClassrooms.length} 个教室\n`);

// 2. 创建城市名称到ID的映射
const cityNameToId = {};
allCities.forEach(city => {
  cityNameToId[city.name] = city.id;
});

// 3. 创建教室匹配索引 (城市ID + 教室列表)
const classroomIndex = {};
allClassrooms.forEach(classroom => {
  const key = `${classroom.cityId}`;
  if (!classroomIndex[key]) {
    classroomIndex[key] = [];
  }
  classroomIndex[key].push(classroom);
});

// 4. 获取所有有交付教室但未匹配的订单
console.log('🔍 查询需要匹配的订单...');
const [unmatchedOrders] = await connection.query(`
  SELECT id, orderNo, deliveryCity, deliveryRoom
  FROM orders
  WHERE deliveryRoom IS NOT NULL
    AND deliveryRoom != ''
    AND (deliveryClassroomId IS NULL OR deliveryClassroomId = 0)
`);

console.log(`📋 找到 ${unmatchedOrders.length} 个需要匹配的订单\n`);

// 5. 匹配逻辑
let matchedCount = 0;
let unmatchedCount = 0;
const matchResults = [];

for (const order of unmatchedOrders) {
  const cityName = order.deliveryCity?.trim();
  const roomName = order.deliveryRoom?.trim();
  
  if (!cityName || !roomName) {
    unmatchedCount++;
    continue;
  }
  
  // 获取城市ID
  const cityId = cityNameToId[cityName];
  if (!cityId) {
    console.log(`⚠️  订单 ${order.orderNo}: 城市"${cityName}"未找到`);
    unmatchedCount++;
    continue;
  }
  
  // 在该城市的教室中查找匹配
  const cityClassrooms = classroomIndex[cityId] || [];
  let matchedClassroom = null;
  
  // 尝试精确匹配
  matchedClassroom = cityClassrooms.find(c => c.name === roomName);
  
  // 如果精确匹配失败,尝试模糊匹配
  if (!matchedClassroom) {
    // 提取教室号码(如"404教室" -> "404", "1101教室" -> "1101")
    const roomNumberMatch = roomName.match(/(\d+)/);
    if (roomNumberMatch) {
      const roomNumber = roomNumberMatch[1];
      matchedClassroom = cityClassrooms.find(c => c.name.includes(roomNumber));
    }
  }
  
  // 如果还是没匹配到,尝试包含匹配
  if (!matchedClassroom) {
    matchedClassroom = cityClassrooms.find(c => 
      c.name.includes(roomName) || roomName.includes(c.name)
    );
  }
  
  if (matchedClassroom) {
    matchResults.push({
      orderId: order.id,
      orderNo: order.orderNo,
      classroomId: matchedClassroom.id,
      cityName,
      roomName,
      matchedName: matchedClassroom.name
    });
    matchedCount++;
  } else {
    console.log(`⚠️  订单 ${order.orderNo}: 在城市"${cityName}"中未找到教室"${roomName}"`);
    unmatchedCount++;
  }
}

console.log(`\n📊 匹配结果统计:`);
console.log(`✅ 成功匹配: ${matchedCount} 个订单`);
console.log(`❌ 未匹配: ${unmatchedCount} 个订单\n`);

// 6. 批量更新数据库
if (matchResults.length > 0) {
  console.log('💾 开始更新数据库...');
  
  for (const result of matchResults) {
    await connection.query(
      'UPDATE orders SET deliveryClassroomId = ? WHERE id = ?',
      [result.classroomId, result.orderId]
    );
  }
  
  console.log(`✅ 成功更新 ${matchResults.length} 个订单的教室ID\n`);
  
  // 显示前10个匹配示例
  console.log('📋 匹配示例(前10个):');
  matchResults.slice(0, 10).forEach(r => {
    console.log(`  订单 ${r.orderNo}: ${r.cityName} - ${r.roomName} → ${r.matchedName}`);
  });
}

// 7. 关闭数据库连接
await connection.end();

console.log('\n✅ 教室匹配完成!');
