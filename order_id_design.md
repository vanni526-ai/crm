# 订单号生成规则设计

## 格式定义

```
ORD + YYYYMMDDHHMMSS + 随机3位字符 + 城市区号
```

**示例:**
- `ORD20241225143022ABC021` - 上海订单(区号021)
- `ORD20241225143022XYZ010` - 北京订单(区号010)
- `ORD20241225143022DEF022` - 天津订单(区号022)

## 字段说明

1. **前缀**: `ORD` (固定)
2. **日期时间**: `YYYYMMDDHHMMSS` (14位,精确到秒)
   - `YYYY`: 4位年份
   - `MM`: 2位月份
   - `DD`: 2位日期
   - `HH`: 2位小时(24小时制)
   - `MM`: 2位分钟
   - `SS`: 2位秒
3. **随机字符**: 3位大写字母或数字组合
4. **城市区号**: 3位数字(如021、010、022)

## 城市区号映射表

| 城市 | 区号 |
|------|------|
| 上海 | 021 |
| 北京 | 010 |
| 天津 | 022 |
| 广州 | 020 |
| 深圳 | 0755 → 755 (取后3位) |
| 杭州 | 0571 → 571 (取后3位) |
| 南京 | 025 |
| 武汉 | 027 |
| 成都 | 028 |
| 西安 | 029 |
| 重庆 | 023 |
| 苏州 | 0512 → 512 (取后3位) |
| 其他/未知 | 000 |

## 生成逻辑

```typescript
function generateOrderId(city?: string): string {
  // 1. 获取当前日期时间
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  
  const dateTime = `${year}${month}${day}${hour}${minute}${second}`;
  
  // 2. 生成3位随机字符(大写字母+数字)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';
  for (let i = 0; i < 3; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // 3. 获取城市区号
  const areaCode = getCityAreaCode(city);
  
  // 4. 组合订单号
  return `ORD${dateTime}${random}${areaCode}`;
}

function getCityAreaCode(city?: string): string {
  const cityAreaCodeMap: Record<string, string> = {
    '上海': '021',
    '北京': '010',
    '天津': '022',
    '广州': '020',
    '深圳': '755',
    '杭州': '571',
    '南京': '025',
    '武汉': '027',
    '成都': '028',
    '西安': '029',
    '重庆': '023',
    '苏州': '512',
  };
  
  return cityAreaCodeMap[city || ''] || '000';
}
```

## 唯一性保证

- 日期时间精确到秒(14位)
- 3位随机字符(36^3 = 46,656种组合)
- 同一秒内生成重复订单号的概率极低(<0.01%)
- 如需更高唯一性,可增加随机字符位数或添加毫秒

## 兼容性

- 订单号长度: 3 + 14 + 3 + 3 = 23位
- 全部使用大写字母和数字,便于识别和输入
- 包含时间信息,便于排序和查询
