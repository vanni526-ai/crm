#!/usr/bin/env python3
import os
import mysql.connector
from urllib.parse import urlparse

db_url = os.getenv('DATABASE_URL', '')
parsed = urlparse(db_url)

conn = mysql.connector.connect(
    host=parsed.hostname,
    port=parsed.port or 3306,
    user=parsed.username,
    password=parsed.password,
    database=parsed.path[1:]
)

cursor = conn.cursor()

query = """
SELECT 
  pc.id,
  pc.partnerId,
  p.name as partnerName,
  p.phone,
  pc.contractStatus,
  pc.currentProfitStage,
  pc.profitRatioStage1Partner,
  pc.createdAt,
  pc.updatedAt
FROM partner_cities pc
LEFT JOIN partners p ON pc.partnerId = p.id
JOIN cities c ON pc.cityId = c.id
WHERE c.name LIKE '%重庆%'
ORDER BY pc.id
"""

cursor.execute(query)
rows = cursor.fetchall()

print(f"重庆partner_cities记录数: {len(rows)}\n")
print("=" * 100)

for i, row in enumerate(rows, 1):
    print(f"\n记录 #{i}:")
    print(f"  partner_cities.id: {row[0]}")
    print(f"  partnerId: {row[1]}")
    print(f"  合伙人姓名: {row[2]}")
    print(f"  合伙人电话: {row[3]}")
    print(f"  合同状态(contractStatus): {row[4]}")
    print(f"  当前分红阶段: {row[5]}")
    print(f"  阶段1合伙人比例: {row[6]}%")
    print(f"  创建时间: {row[7]}")
    print(f"  更新时间: {row[8]}")
    print("-" * 100)

conn.close()
