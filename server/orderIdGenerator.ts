/**
 * 订单号生成工具
 * 格式: ORD + YYYYMMDDHHMMSS + 随机3位字符 + 城市区号
 * 示例: ORD20241225143022ABC021 (上海订单)
 */

/**
 * 城市到区号的映射表
 */
const CITY_AREA_CODE_MAP: Record<string, string> = {
  '上海': '021',
  '北京': '010',
  '天津': '022',
  '广州': '020',
  '深圳': '755', // 0755取后3位
  '杭州': '571', // 0571取后3位
  '南京': '025',
  '武汉': '027',
  '成都': '028',
  '西安': '029',
  '重庆': '023',
  '苏州': '512', // 0512取后3位
  '无锡': '510', // 0510取后3位
  '宁波': '574', // 0574取后3位
  '青岛': '532', // 0532取后3位
  '大连': '411', // 0411取后3位
  '沈阳': '024',
  '长沙': '731', // 0731取后3位
  '郑州': '371', // 0371取后3位
  '济南': '531', // 0531取后3位
  '福州': '591', // 0591取后3位
  '厦门': '592', // 0592取后3位
  '昆明': '871', // 0871取后3位
  '合肥': '551', // 0551取后3位
  '南昌': '791', // 0791取后3位
  '石家庄': '311', // 0311取后3位
  '哈尔滨': '451', // 0451取后3位
  '长春': '431', // 0431取后3位
  '太原': '351', // 0351取后3位
  '兰州': '931', // 0931取后3位
  '银川': '951', // 0951取后3位
  '西宁': '971', // 0971取后3位
  '乌鲁木齐': '991', // 0991取后3位
  '拉萨': '891', // 0891取后3位
  '呼和浩特': '471', // 0471取后3位
  '南宁': '771', // 0771取后3位
  '贵阳': '851', // 0851取后3位
  '海口': '898', // 0898取后3位
  '三亚': '899', // 0899取后3位
};

/**
 * 获取城市区号
 * @param city 城市名称
 * @returns 3位区号,未知城市返回'000'
 */
export function getCityAreaCode(city?: string | null): string {
  if (!city) return '000';
  return CITY_AREA_CODE_MAP[city] || '000';
}

/**
 * 生成3位随机字符(大写字母+数字)
 * @returns 3位随机字符串
 */
function generateRandomChars(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成订单号
 * @param city 城市名称(可选)
 * @param date 日期时间(可选,默认当前时间)
 * @returns 格式化的订单号
 */
export function generateOrderId(city?: string | null, date?: Date): string {
  // 1. 获取日期时间
  const now = date || new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  
  const dateTime = `${year}${month}${day}${hour}${minute}${second}`;
  
  // 2. 生成3位随机字符
  const random = generateRandomChars();
  
  // 3. 获取城市区号
  const areaCode = getCityAreaCode(city);
  
  // 4. 组合订单号
  return `ORD${dateTime}${random}${areaCode}`;
}

/**
 * 验证订单号格式是否正确
 * @param orderId 订单号
 * @returns 是否有效
 */
export function isValidOrderId(orderId: string): boolean {
  // 格式: ORD + 14位日期时间 + 3位随机字符 + 3位区号 = 23位
  const pattern = /^ORD\d{14}[A-Z0-9]{3}\d{3}$/;
  return pattern.test(orderId);
}

/**
 * 从订单号中提取信息
 * @param orderId 订单号
 * @returns 提取的信息
 */
export function parseOrderId(orderId: string): {
  valid: boolean;
  dateTime?: string;
  randomChars?: string;
  areaCode?: string;
  city?: string;
} {
  if (!isValidOrderId(orderId)) {
    return { valid: false };
  }
  
  const dateTime = orderId.substring(3, 17); // YYYYMMDDHHMMSS
  const randomChars = orderId.substring(17, 20); // 3位随机字符
  const areaCode = orderId.substring(20, 23); // 3位区号
  
  // 反向查找城市
  const city = Object.keys(CITY_AREA_CODE_MAP).find(
    key => CITY_AREA_CODE_MAP[key] === areaCode
  );
  
  return {
    valid: true,
    dateTime,
    randomChars,
    areaCode,
    city,
  };
}
