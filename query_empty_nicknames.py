import os
import mysql.connector

# 从环境变量获取数据库连接信息
db_url = os.getenv("DATABASE_URL")
# 解析DATABASE_URL: mysql://user:pass@host:port/dbname
if db_url:
    # 移除 mysql:// 前缀
    db_url = db_url.replace("mysql://", "")
    # 分离用户名密码和主机信息
    auth, host_info = db_url.split("@")
    username, password = auth.split(":")
    host_port, dbname = host_info.split("/")
    # 移除可能的查询参数
    dbname = dbname.split("?")[0]
    host, port = host_port.split(":") if ":" in host_port else (host_port, "3306")
    
    # 连接数据库
    conn = mysql.connector.connect(
        host=host,
        port=int(port),
        user=username,
        password=password,
        database=dbname
    )
    
    cursor = conn.cursor(dictionary=True)
    
    # 查询所有用户
    cursor.execute("SELECT id, name, nickname, roles FROM users LIMIT 20")
    users = cursor.fetchall()
    
    print(f"总共查询到 {len(users)} 条用户记录")
    print("\n前20条用户记录:")
    for user in users:
        print(f"ID: {user['id']}, 姓名: {user['name']}, 花名: {user['nickname']}, 角色: {user['roles']}")
    
    # 查询花名为NULL的老师用户
    cursor.execute("""
        SELECT id, name, nickname, roles 
        FROM users 
        WHERE roles LIKE '%老师%' AND nickname IS NULL
        LIMIT 20
    """)
    empty_nickname_teachers = cursor.fetchall()
    
    print(f"\n\n花名为NULL的老师用户: {len(empty_nickname_teachers)} 条")
    for teacher in empty_nickname_teachers:
        print(f"ID: {teacher['id']}, 姓名: {teacher['name']}, 花名: {teacher['nickname']}, 角色: {teacher['roles']}")
    
    cursor.close()
    conn.close()
else:
    print("DATABASE_URL 环境变量未设置")
