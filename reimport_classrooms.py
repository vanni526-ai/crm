import pandas as pd
import os
from urllib.parse import urlparse, parse_qs
import mysql.connector

# 读取Excel文件
df = pd.read_excel('/home/ubuntu/upload/教室地址.xlsx')
print(f'读取到 {len(df)} 条教室记录')

# 解析DATABASE_URL
database_url = os.getenv('DATABASE_URL')
if not database_url:
    raise ValueError('DATABASE_URL environment variable not set')

# 解析连接字符串
parsed = urlparse(database_url)
query_params = parse_qs(parsed.query)

# 提取连接参数
host = parsed.hostname
port = parsed.port or 3306
user = parsed.username
password = parsed.password
database = parsed.path.lstrip('/')

# 连接数据库 (启用SSL)
conn = mysql.connector.connect(
    host=host,
    port=port,
    user=user,
    password=password,
    database=database,
    ssl_verify_cert=False,
    ssl_verify_identity=False
)
cursor = conn.cursor()

# 查询所有城市的ID映射
cursor.execute("SELECT id, name FROM cities")
city_map = {row[1]: row[0] for row in cursor.fetchall()}
print(f'\n城市映射: {city_map}')

# 导入教室数据
success_count = 0
error_count = 0

for idx, row in df.iterrows():
    city_name = str(row['城市']).strip()
    classroom_name = str(row['教室名称']).strip()
    address = str(row['教室地址']).strip()
    
    # 匹配城市ID
    city_id = city_map.get(city_name)
    
    if not city_id:
        print(f'❌ 城市 "{city_name}" 未找到,跳过教室 "{classroom_name}"')
        error_count += 1
        continue
    
    try:
        # 插入教室数据(包含cityName字段)
        cursor.execute("""
            INSERT INTO classrooms (cityId, cityName, name, address, isActive, createdAt, updatedAt)
            VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
        """, (city_id, city_name, classroom_name, address, True))
        
        success_count += 1
        print(f'✅ 导入教室: {city_name} - {classroom_name}')
    except Exception as e:
        print(f'❌ 导入失败: {city_name} - {classroom_name}, 错误: {e}')
        error_count += 1

conn.commit()
cursor.close()
conn.close()

print(f'\n导入完成!')
print(f'成功: {success_count} 条')
print(f'失败: {error_count} 条')
