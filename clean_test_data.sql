-- ==========================================
-- 测试数据清理SQL脚本
-- ==========================================
-- 创建时间: 2026-02-15
-- 说明: 清理数据库中的测试数据，保留指定的测试用户
-- 保留的测试账号:
--   - phone: 13860029testtest
--   - phone: 13800138013  
--   - email: 526test@example.com
-- ==========================================

-- 开始事务
START TRANSACTION;

-- ==========================================
-- 1. 备份将要删除的数据（可选，用于审计）
-- ==========================================

-- 查看将要删除的users数据
SELECT '=== 将要删除的users数据 ===' as info;
SELECT id, name, phone, email, roles, createdAt
FROM users
WHERE 
  (name LIKE '%test%' 
  OR phone LIKE '%test%'
  OR email LIKE '%test%'
  OR name LIKE '%测试%'
  OR phone LIKE '%000%')
  AND phone NOT IN ('13860029testtest', '13800138013')
  AND (email IS NULL OR email != '526test@example.com')
ORDER BY id;

-- 查看将要删除的partners数据
SELECT '=== 将要删除的partners数据 ===' as info;
SELECT p.id, p.name, p.phone, p.userId, p.createdAt
FROM partners p
WHERE 
  (p.name LIKE '%test%' 
  OR p.phone LIKE '%test%'
  OR p.name LIKE '%测试%'
  OR p.phone LIKE '%000%')
  AND p.phone NOT IN ('13860029testtest', '13800138013')
ORDER BY p.id;

-- ==========================================
-- 2. 删除关联数据（先删除外键关联）
-- ==========================================

-- 删除partner_cities中关联到测试partners的记录
SELECT '=== 删除partner_cities关联数据 ===' as info;
DELETE FROM partner_cities
WHERE partnerId IN (
  SELECT id FROM partners
  WHERE 
    (name LIKE '%test%' 
    OR phone LIKE '%test%'
    OR name LIKE '%测试%'
    OR phone LIKE '%000%')
    AND phone NOT IN ('13860029testtest', '13800138013')
);

-- 删除user_role_cities中关联到测试users的记录
SELECT '=== 删除user_role_cities关联数据 ===' as info;
DELETE FROM user_role_cities
WHERE userId IN (
  SELECT id FROM users
  WHERE 
    (name LIKE '%test%' 
    OR phone LIKE '%test%'
    OR email LIKE '%test%'
    OR name LIKE '%测试%'
    OR phone LIKE '%000%')
    AND phone NOT IN ('13860029testtest', '13800138013')
    AND (email IS NULL OR email != '526test@example.com')
);

-- ==========================================
-- 3. 删除主表数据
-- ==========================================

-- 删除partners表中的测试数据
SELECT '=== 删除partners表测试数据 ===' as info;
DELETE FROM partners
WHERE 
  (name LIKE '%test%' 
  OR phone LIKE '%test%'
  OR name LIKE '%测试%'
  OR phone LIKE '%000%')
  AND phone NOT IN ('13860029testtest', '13800138013');

-- 删除users表中的测试数据
SELECT '=== 删除users表测试数据 ===' as info;
DELETE FROM users
WHERE 
  (name LIKE '%test%' 
  OR phone LIKE '%test%'
  OR email LIKE '%test%'
  OR name LIKE '%测试%'
  OR phone LIKE '%000%')
  AND phone NOT IN ('13860029testtest', '13800138013')
  AND (email IS NULL OR email != '526test@example.com');

-- ==========================================
-- 4. 验证清理结果
-- ==========================================

SELECT '=== 清理后的数据统计 ===' as info;
SELECT 
  (SELECT COUNT(*) FROM users WHERE name LIKE '%test%' OR phone LIKE '%test%' OR email LIKE '%test%' OR name LIKE '%测试%' OR phone LIKE '%000%') as remaining_test_users,
  (SELECT COUNT(*) FROM teachers WHERE name LIKE '%test%' OR phone LIKE '%test%' OR name LIKE '%测试%' OR phone LIKE '%000%') as remaining_test_teachers,
  (SELECT COUNT(*) FROM partners WHERE name LIKE '%test%' OR phone LIKE '%test%' OR name LIKE '%测试%' OR phone LIKE '%000%') as remaining_test_partners,
  (SELECT COUNT(*) FROM orders WHERE customerName LIKE '%test%' OR deliveryTeacher LIKE '%test%' OR customerName LIKE '%测试%') as remaining_test_orders;

-- 查看保留的测试账号
SELECT '=== 保留的测试账号 ===' as info;
SELECT id, name, phone, email, roles
FROM users
WHERE phone IN ('13860029testtest', '13800138013')
   OR email = '526test@example.com'
ORDER BY id;

-- ==========================================
-- 5. 提交或回滚
-- ==========================================

-- 如果一切正常，执行COMMIT提交更改
-- 如果发现问题，执行ROLLBACK回滚更改

-- COMMIT;
-- ROLLBACK;

SELECT '=== 清理脚本执行完成 ===' as info;
SELECT '请检查上述结果，确认无误后执行 COMMIT; 提交更改' as reminder;
SELECT '如果发现问题，请执行 ROLLBACK; 回滚更改' as warning;
