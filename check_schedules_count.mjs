import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// 查询schedules表总数
const [schedulesCount] = await connection.query('SELECT COUNT(*) as count FROM schedules');
console.log('schedules表总记录数:', schedulesCount[0].count);

// 查询orders表总数
const [ordersCount] = await connection.query('SELECT COUNT(*) as count FROM orders');
console.log('orders表总记录数:', ordersCount[0].count);

// 查询schedules表中有orderId的记录数
const [withOrderId] = await connection.query('SELECT COUNT(*) as count FROM schedules WHERE orderId IS NOT NULL');
console.log('schedules表中有orderId的记录数:', withOrderId[0].count);

// 查询schedules表中没有orderId的记录数
const [withoutOrderId] = await connection.query('SELECT COUNT(*) as count FROM schedules WHERE orderId IS NULL');
console.log('schedules表中没有orderId的记录数:', withoutOrderId[0].count);

// 查询schedules表按创建时间分组统计
const [byDate] = await connection.query(`
  SELECT DATE(createdAt) as date, COUNT(*) as count 
  FROM schedules 
  GROUP BY DATE(createdAt) 
  ORDER BY date DESC 
  LIMIT 10
`);
console.log('\nschedules表按创建日期统计（最近10天）:');
byDate.forEach(row => {
  console.log(`  ${row.date}: ${row.count}条`);
});

// 查询是否有重复的排课记录
const [duplicates] = await connection.query(`
  SELECT customerName, teacherName, startTime, COUNT(*) as count
  FROM schedules
  GROUP BY customerName, teacherName, startTime
  HAVING count > 1
  ORDER BY count DESC
  LIMIT 10
`);
console.log('\n重复的排课记录（前10条）:');
duplicates.forEach(row => {
  console.log(`  客户:${row.customerName}, 老师:${row.teacherName}, 时间:${row.startTime}, 重复次数:${row.count}`);
});

await connection.end();
