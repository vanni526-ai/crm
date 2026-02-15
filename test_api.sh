#!/bin/bash
# 测试cityExpense.list API的HTTP调用

# 首先需要登录获取session cookie
# 这里我们直接测试参数格式

# tRPC的GET请求需要将input参数进行JSON编码后URL编码
# 测试1: 空参数
echo "测试1: 空参数 {}"
curl -s "http://localhost:3000/api/trpc/cityExpense.list?input=%7B%7D" 2>&1 | head -20

echo -e "\n\n测试2: 带month参数 {\"month\":\"2026-01\"}"
curl -s "http://localhost:3000/api/trpc/cityExpense.list?input=%7B%22month%22%3A%222026-01%22%7D" 2>&1 | head -20

echo -e "\n\n测试3: 检查URL编码是否正确"
echo "原始: {\"month\":\"2026-01\"}"
echo "编码: %7B%22month%22%3A%222026-01%22%7D"
python3 -c "import urllib.parse; print('解码:', urllib.parse.unquote('%7B%22month%22%3A%222026-01%22%7D'))"
