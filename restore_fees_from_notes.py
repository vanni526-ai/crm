import re
import json

# 订单备注数据(从SQL查询结果)
orders_data = [
    {"orderNo": "ORD1767678237612462", "notes": "给老师400 交易单号 420000297020260105030529012"},
    {"orderNo": "ORD1767678237579364", "notes": "给老师400  4200002886202512309220314700"},
    {"orderNo": "ORD1767678237543988", "notes": "给老师300（南京教室第四次使用） 交易单号4200002887202601036292580576"},
    {"orderNo": "ORD1767678237511535", "notes": "给老师750（南京教室第四次使用） 交易单号 4200002892202601056175628755"},
    {"orderNo": "ORD1767678237479657", "notes": "给老师720 支付宝付款"},
    {"orderNo": "ORD1767678237445231", "notes": "给老师500"},
    {"orderNo": "ORD1767678237410451", "notes": "报销老师100打车费 给老师1050 （教室1101）交易单号4200002913202601059972698277"},
    {"orderNo": "ORD1767678237394316", "notes": "报销老师100打车费加酒店费300（，老师大学生回不去了有门禁，住酒店）给老师900 （泉州教室第一次使用） 交易单号4200002893202601059291814395"},
]

def extract_fees(notes):
    """从备注中提取老师费用和车费"""
    teacher_fee = 0
    transport_fee = 0
    
    if not notes:
        return teacher_fee, transport_fee
    
    # 提取老师费用
    teacher_pattern = r'给老师(\d+(?:\.\d+)?)'
    teacher_matches = re.findall(teacher_pattern, notes)
    if teacher_matches:
        teacher_fee = float(teacher_matches[-1])  # 取最后一个匹配
    
    # 提取车费
    transport_patterns = [
        r'报销老师(\d+(?:\.\d+)?)打车费',
        r'酒店费(\d+(?:\.\d+)?)',
    ]
    
    for pattern in transport_patterns:
        matches = re.findall(pattern, notes)
        for match in matches:
            transport_fee += float(match)
    
    return teacher_fee, transport_fee

# 生成SQL更新语句
print("-- 恢复订单费用数据")
print()

for order in orders_data:
    teacher_fee, transport_fee = extract_fees(order["notes"])
    
    if teacher_fee > 0 or transport_fee > 0:
        print(f"-- {order['orderNo']}: 老师费用={teacher_fee}, 车费={transport_fee}")
        print(f"UPDATE orders SET ")
        print(f"  teacherFee = '{teacher_fee:.2f}',")
        print(f"  transportFee = '{transport_fee:.2f}'")
        print(f"WHERE orderNo = '{order['orderNo']}';")
        print()
