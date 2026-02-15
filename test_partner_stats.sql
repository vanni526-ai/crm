-- 模拟getPartnerStats的查询逻辑
SELECT 
  pc.partnerId,
  pc.cityId,
  c.name as cityName,
  pc.contractStatus,
  p.name as partnerName
FROM partner_cities pc
LEFT JOIN cities c ON pc.cityId = c.id
LEFT JOIN partners p ON pc.partnerId = p.id
WHERE pc.partnerId = 30002 
  AND pc.contractStatus = 'active';
