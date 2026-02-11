-- 查询所有测试合伙人数据
SELECT 
  p.id as partner_id,
  p.name as partner_name,
  pc.id as city_id,
  pc.cityName as city_name
FROM partners p
LEFT JOIN partnerCities pc ON p.id = pc.partnerId
WHERE p.name = '测试合伙人'
ORDER BY p.id;
