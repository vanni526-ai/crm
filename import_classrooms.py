import pandas as pd
import mysql.connector
import os
from urllib.parse import urlparse, parse_qs

# 读取Excel文件
df = pd.read_excel('/home/ubuntu/upload/教室地址.xlsx')

# 数据库连接
db_url = os.getenv('DATABASE_URL')
print(f"DATABASE_URL: {db_url[:50]}...")

# 解析DATABASE_URL
parsed = urlparse(db_url)
host = parsed.hostname
port = parsed.port or 3306
user = parsed.username
password = parsed.password
database = parsed.path.lstrip('/')

# 解析SSL参数
ssl_config = None
if '?ssl=' in db_url:
    database = database.split('?')[0]
    ssl_config = {'ssl_disabled': False}

print(f"连接信息: host={host}, port={port}, user={user}, database={database}")

conn = mysql.connector.connect(
    host=host,
    port=port,
    user=user,
    password=password,
    database=database,
    ssl_disabled=False
)
cursor = conn.cursor()

# 首先插入城市数据(去重)
cities = df['城市'].unique()
city_id_map = {}

for idx, city_name in enumerate(cities, start=1):
    cursor.execute("""
        INSERT INTO cities (name, isActive, sortOrder)
        VALUES (%s, true, %s)
        ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)
    """, (city_name, idx))
    city_id = cursor.lastrowid
    if city_id == 0:  # 如果是重复的,获取现有ID
        cursor.execute("SELECT id FROM cities WHERE name = %s", (city_name,))
        city_id = cursor.fetchone()[0]
    city_id_map[city_name] = city_id
    print(f"城市: {city_name}, ID: {city_id}")

# 插入教室数据
for idx, row in df.iterrows():
    city_name = row['城市']
    classroom_name = row['教室名称']
    classroom_address = row['教室地址']
    city_id = city_id_map[city_name]
    
    cursor.execute("""
        INSERT INTO classrooms (cityId, cityName, name, address, isActive, sortOrder)
        VALUES (%s, %s, %s, %s, true, %s)
    """, (city_id, city_name, classroom_name, classroom_address, idx + 1))
    print(f"教室: {city_name} - {classroom_name}")

conn.commit()
cursor.close()
conn.close()

print(f"\n导入完成!")
print(f"- 城市数: {len(cities)}")
print(f"- 教室数: {len(df)}")
