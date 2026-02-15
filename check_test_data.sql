-- 检查数据库中的测试数据
-- 保留的测试用户: 13860029testtest, 526test@example.com, 13800138013

-- 1. 检查users表中的测试数据
SELECT '=== users表测试数据 ===' as info;
SELECT id, name, phone, email, roles, createdAt
FROM users
WHERE 
  name LIKE '%test%' 
  OR phone LIKE '%test%'
  OR email LIKE '%test%'
  OR name LIKE '%测试%'
  OR phone LIKE '%000%'
ORDER BY createdAt DESC;

-- 2. 检查teachers表中的测试数据
SELECT '=== teachers表测试数据 ===' as info;
SELECT t.id, t.name, t.phone, t.email, t.createdAt
FROM teachers t
WHERE 
  t.name LIKE '%test%' 
  OR t.phone LIKE '%test%'
  OR t.email LIKE '%test%'
  OR t.name LIKE '%测试%'
  OR t.phone LIKE '%000%'
ORDER BY t.createdAt DESC;

-- 3. 检查partners表中的测试数据
SELECT '=== partners表测试数据 ===' as info;
SELECT p.id, p.name, p.phone, p.email, p.createdAt
FROM partners p
WHERE 
  p.name LIKE '%test%' 
  OR p.phone LIKE '%test%'
  OR p.email LIKE '%test%'
  OR p.name LIKE '%测试%'
  OR p.phone LIKE '%000%'
ORDER BY p.createdAt DESC;

-- 4. 检查orders表中的测试数据
SELECT '=== orders表测试数据 ===' as info;
SELECT o.id, o.customerName, o.customerPhone, o.teacherName, o.createdAt
FROM orders o
WHERE 
  o.customerName LIKE '%test%' 
  OR o.customerPhone LIKE '%test%'
  OR o.teacherName LIKE '%test%'
  OR o.customerName LIKE '%测试%'
  OR o.customerPhone LIKE '%000%'
ORDER BY o.createdAt DESC;

-- 5. 检查是否有关联到测试用户的订单
SELECT '=== 关联到测试老师的订单 ===' as info;
SELECT o.id, o.customerName, o.teacherName, o.amount, o.createdAt
FROM orders o
INNER JOIN teachers t ON o.teacherId = t.id
WHERE 
  t.name LIKE '%test%' 
  OR t.phone LIKE '%test%'
  OR t.name LIKE '%测试%'
ORDER BY o.createdAt DESC
LIMIT 20;

-- 6. 统计测试数据数量
SELECT '=== 测试数据统计 ===' as info;
SELECT 
  (SELECT COUNT(*) FROM users WHERE name LIKE '%test%' OR phone LIKE '%test%' OR email LIKE '%test%' OR name LIKE '%测试%') as test_users_count,
  (SELECT COUNT(*) FROM teachers WHERE name LIKE '%test%' OR phone LIKE '%test%' OR email LIKE '%test%' OR name LIKE '%测试%') as test_teachers_count,
  (SELECT COUNT(*) FROM partners WHERE name LIKE '%test%' OR phone LIKE '%test%' OR email LIKE '%test%' OR name LIKE '%测试%') as test_partners_count,
  (SELECT COUNT(*) FROM orders WHERE customerName LIKE '%test%' OR customerPhone LIKE '%test%' OR teacherName LIKE '%test%' OR customerName LIKE '%测试%') as test_orders_count;
