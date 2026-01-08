-- 恢复订单费用数据

-- ORD1767678237612462: 老师费用=400.0, 车费=0
UPDATE orders SET 
  teacherFee = '400.00',
  transportFee = '0.00'
WHERE orderNo = 'ORD1767678237612462';

-- ORD1767678237579364: 老师费用=400.0, 车费=0
UPDATE orders SET 
  teacherFee = '400.00',
  transportFee = '0.00'
WHERE orderNo = 'ORD1767678237579364';

-- ORD1767678237543988: 老师费用=300.0, 车费=0
UPDATE orders SET 
  teacherFee = '300.00',
  transportFee = '0.00'
WHERE orderNo = 'ORD1767678237543988';

-- ORD1767678237511535: 老师费用=750.0, 车费=0
UPDATE orders SET 
  teacherFee = '750.00',
  transportFee = '0.00'
WHERE orderNo = 'ORD1767678237511535';

-- ORD1767678237479657: 老师费用=720.0, 车费=0
UPDATE orders SET 
  teacherFee = '720.00',
  transportFee = '0.00'
WHERE orderNo = 'ORD1767678237479657';

-- ORD1767678237445231: 老师费用=500.0, 车费=0
UPDATE orders SET 
  teacherFee = '500.00',
  transportFee = '0.00'
WHERE orderNo = 'ORD1767678237445231';

-- ORD1767678237410451: 老师费用=1050.0, 车费=100.0
UPDATE orders SET 
  teacherFee = '1050.00',
  transportFee = '100.00'
WHERE orderNo = 'ORD1767678237410451';

-- ORD1767678237394316: 老师费用=900.0, 车费=400.0
UPDATE orders SET 
  teacherFee = '900.00',
  transportFee = '400.00'
WHERE orderNo = 'ORD1767678237394316';

