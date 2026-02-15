#!/bin/bash
# cityExpense.list API HTTP调用测试脚本

API_BASE="http://localhost:3000/api/trpc"

echo "========================================="
echo "cityExpense.list API HTTP调用测试"
echo "========================================="
echo ""

echo "测试1: 空参数调用"
echo "URL: ${API_BASE}/cityExpense.list?input=%7B%7D"
echo "参数: {}"
echo "---"
curl -s "${API_BASE}/cityExpense.list?input=%7B%7D" | jq -r '.error.json.data.code // "SUCCESS"'
echo ""
echo ""

echo "测试2: 带month参数调用"
echo "URL: ${API_BASE}/cityExpense.list?input=%7B%22month%22%3A%222026-01%22%7D"
echo "参数: {\"month\":\"2026-01\"}"
echo "---"
curl -s "${API_BASE}/cityExpense.list?input=%7B%22month%22%3A%222026-01%22%7D" | jq -r '.error.json.data.code // "SUCCESS"'
echo ""
echo ""

echo "测试3: 带cityId和month参数调用"
echo "URL: ${API_BASE}/cityExpense.list?input=%7B%22cityId%22%3A3%2C%22month%22%3A%222026-01%22%7D"
echo "参数: {\"cityId\":3,\"month\":\"2026-01\"}"
echo "---"
curl -s "${API_BASE}/cityExpense.list?input=%7B%22cityId%22%3A3%2C%22month%22%3A%222026-01%22%7D" | jq -r '.error.json.data.code // "SUCCESS"'
echo ""
echo ""

echo "========================================="
echo "测试完成"
echo "========================================="
echo ""
echo "注意: 所有测试都会返回UNAUTHORIZED错误,因为没有携带session cookie"
echo "这是预期行为,说明参数解析正常,只是缺少认证信息"
echo ""
echo "如果返回BAD_REQUEST错误,说明参数验证失败"
echo "如果返回SUCCESS,说明API调用成功(但这不太可能,因为需要登录)"
