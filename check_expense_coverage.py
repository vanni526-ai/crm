import mysql.connector
import json
import os

# 连接数据库
conn = mysql.connector.connect(
    host=os.environ.get('DATABASE_HOST', 'localhost'),
    user=os.environ.get('DATABASE_USER', 'root'),
    password=os.environ.get('DATABASE_PASSWORD', ''),
    database=os.environ.get('DATABASE_NAME', 'course_crm')
)

cursor = conn.cursor()

# 查询重庆的expenseCoverage
cursor.execute("""
SELECT 
  pc.id,
  pc.partnerId,
  p.name as partnerName,
  pc.expenseCoverage,
  pc.profitRatioStage1Partner
FROM partner_cities pc
LEFT JOIN partners p ON pc.partnerId = p.id
JOIN cities c ON pc.cityId = c.id
WHERE c.name LIKE '%重庆%' AND pc.contractStatus = 'active'
""")

result = cursor.fetchone()
if result:
    print(f"partner_cities.id: {result[0]}")
    print(f"partnerId: {result[1]}")
    print(f"partnerName: {result[2]}")
    print(f"expenseCoverage: {result[3]}")
    print(f"profitRatioStage1Partner: {result[4]}")
    
    if result[3]:
        try:
            coverage = json.loads(result[3])
            print(f"\nexpenseCoverage解析后:")
            print(json.dumps(coverage, indent=2, ensure_ascii=False))
        except Exception as e:
            print(f"\nexpenseCoverage无法解析为JSON: {e}")
    else:
        print("\nexpenseCoverage为NULL或空字符串")
else:
    print("未找到重庆的active状态记录")

cursor.close()
conn.close()
