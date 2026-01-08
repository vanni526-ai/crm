# 订单数据(从SQL查询结果)
orders_data = [
    {"orderNo": "ORD1767678237612462", "deliveryCity": "南京", "courseAmount": "2000.00", "teacherFee": "400.00", "partnerFeeRate": "0.30"},
    {"orderNo": "ORD1767678237579364", "deliveryCity": "上海", "courseAmount": "350.00", "teacherFee": "400.00", "partnerFeeRate": None},
    {"orderNo": "ORD1767678237543988", "deliveryCity": "南京", "courseAmount": "2100.00", "teacherFee": "300.00", "partnerFeeRate": "0.30"},
    {"orderNo": "ORD1767678237511535", "deliveryCity": "南京", "courseAmount": "350.00", "teacherFee": "750.00", "partnerFeeRate": "0.30"},
    {"orderNo": "ORD1767678237479657", "deliveryCity": "上海", "courseAmount": "3600.00", "teacherFee": "720.00", "partnerFeeRate": None},
    {"orderNo": "ORD1767678237445231", "deliveryCity": "上海", "courseAmount": "1200.00", "teacherFee": "500.00", "partnerFeeRate": None},
    {"orderNo": "ORD1767678237410451", "deliveryCity": "武汉", "courseAmount": "1000.00", "teacherFee": "1050.00", "partnerFeeRate": "0.30"},
    {"orderNo": "ORD1767678237394316", "deliveryCity": "泉州", "courseAmount": "2400.00", "teacherFee": "900.00", "partnerFeeRate": "0.30"},
]

print("-- 计算并更新合伙人费用")
print()

for order in orders_data:
    course_amount = float(order["courseAmount"])
    teacher_fee = float(order["teacherFee"])
    partner_fee_rate = float(order["partnerFeeRate"]) if order["partnerFeeRate"] else 0
    
    # 计算合伙人费用: (课程金额 - 老师费用) * 合伙人费比例
    base_profit = course_amount - teacher_fee
    partner_fee = base_profit * partner_fee_rate
    
    print(f"-- {order['orderNo']}: {order['deliveryCity']}, 课程金额={course_amount}, 老师费用={teacher_fee}, 合伙人费比例={partner_fee_rate}, 合伙人费={partner_fee:.2f}")
    print(f"UPDATE orders SET partnerFee = '{partner_fee:.2f}' WHERE orderNo = '{order['orderNo']}';")
    print()
