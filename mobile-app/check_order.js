// 检查订单数据
const orderNo = '20260209023453-000';
console.log(`正在检查订单: ${orderNo}`);
console.log('需要检查的关键信息:');
console.log('1. 订单状态 (status)');
console.log('2. 是否分配了老师 (deliveryTeacher/teacherId)');
console.log('3. 上课日期和时间 (classDate/classTime)');
console.log('4. 订单是否已支付');
console.log('\n请在后端数据库中查询该订单的详细信息');
