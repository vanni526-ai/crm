-- 批量重算合伙人费用的SQL脚本
-- 此脚本会根据城市配置和订单数据，重新计算所有订单的合伙人费

-- 1. 先查看当前有问题的订单
SELECT 
  o.orderNo,
  o.customerName,
  o.deliveryCity,
  o.courseAmount,
  o.teacherFee,
  o.partnerFee as oldPartnerFee,
  c.partnerFeeRate,
  CASE 
    WHEN o.courseAmount - IFNULL(o.teacherFee, 0) <= 0 THEN 0
    ELSE ROUND((o.courseAmount - IFNULL(o.teacherFee, 0)) * c.partnerFeeRate / 100, 2)
  END as newPartnerFee
FROM orders o
LEFT JOIN cityPartnerConfig c ON o.deliveryCity = c.city AND c.isActive = 1
WHERE o.deliveryCity IS NOT NULL 
  AND o.courseAmount IS NOT NULL
  AND o.teacherFee IS NOT NULL
  AND (
    -- 合伙人费为负数
    CAST(o.partnerFee AS DECIMAL(10,2)) < 0
    OR
    -- 合伙人费为0但应该有值
    (IFNULL(o.partnerFee, 0) = 0 AND o.courseAmount > IFNULL(o.teacherFee, 0))
    OR
    -- 合伙人费与计算值不一致
    ABS(IFNULL(CAST(o.partnerFee AS DECIMAL(10,2)), 0) - 
        CASE 
          WHEN o.courseAmount - IFNULL(o.teacherFee, 0) <= 0 THEN 0
          ELSE ROUND((o.courseAmount - IFNULL(o.teacherFee, 0)) * c.partnerFeeRate / 100, 2)
        END
    ) > 0.01
  )
ORDER BY o.deliveryCity, o.id
LIMIT 100;

-- 2. 批量更新所有订单的合伙人费
-- 注意：这个更新会影响所有有城市配置的订单
UPDATE orders o
INNER JOIN cityPartnerConfig c ON o.deliveryCity = c.city AND c.isActive = 1
SET o.partnerFee = CASE 
  WHEN o.courseAmount - IFNULL(o.teacherFee, 0) <= 0 THEN '0.00'
  ELSE CAST(ROUND((o.courseAmount - IFNULL(o.teacherFee, 0)) * c.partnerFeeRate / 100, 2) AS CHAR)
END
WHERE o.deliveryCity IS NOT NULL 
  AND o.courseAmount IS NOT NULL
  AND o.teacherFee IS NOT NULL;
