SELECT 
  id,
  orderNo,
  customerName,
  teacherFee,
  transportFee,
  partnerFee,
  courseAmount,
  deliveryCity,
  deliveryTeacher,
  LEFT(notes, 100) as notes_preview
FROM orders
WHERE orderNo IN (
  'ORD1767678237612462',
  'ORD1767678237579364',
  'ORD1767678237543988',
  'ORD1767678237511535',
  'ORD1767678237479657',
  'ORD1767678237445231'
)
ORDER BY id;
