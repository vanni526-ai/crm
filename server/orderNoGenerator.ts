// 城市区号映射
const CITY_AREA_CODES: Record<string, string> = {
  "上海": "021",
  "北京": "010",
  "天津": "022",
  "重庆": "023",
  "广州": "020",
  "深圳": "0755",
  "杭州": "0571",
  "南京": "025",
  "武汉": "027",
  "成都": "028",
  "西安": "029",
  "郑州": "0371",
  "济南": "0531",
  "青岛": "0532",
  "大连": "0411",
  "沈阳": "024",
  "长春": "0431",
  "哈尔滨": "0451",
  "福州": "0591",
  "厦门": "0592",
  "南昌": "0791",
  "长沙": "0731",
  "合肥": "0551",
  "石家庄": "0311",
  "太原": "0351",
  "呼和浩特": "0471",
  "乌鲁木齐": "0991",
  "拉萨": "0891",
  "银川": "0951",
  "西宁": "0971",
  "兰州": "0931",
  "贵阳": "0851",
  "昆明": "0871",
  "海口": "0898",
  "南宁": "0771",
};

/**
 * 生成订单号
 * 格式: YYYYMMDDHHMMSS-区号
 * 例如: 20231216143021-021 (上海)
 * 
 * @param city 城市名称
 * @param suffix 可选后缀，用于解决冲突
 * @returns 订单号
 */
export function generateOrderNo(city?: string, suffix?: string): string {
  const now = new Date();
  
  // 格式化日期时间为 YYYYMMDDHHMMSS
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const dateTimePart = `${year}${month}${day}${hours}${minutes}${seconds}`;
  
  // 获取城市区号,如果城市不在映射中,使用默认区号 000
  const areaCode = city && CITY_AREA_CODES[city] ? CITY_AREA_CODES[city] : "000";
  
  // 如果有后缀,添加到订单号末尾
  const suffixPart = suffix ? `-${suffix}` : "";
  
  return `${dateTimePart}-${areaCode}${suffixPart}`;
}

/**
 * 获取城市区号
 * @param city 城市名称
 * @returns 区号
 */
export function getCityAreaCode(city: string): string | undefined {
  return CITY_AREA_CODES[city];
}

/**
 * 获取所有支持的城市列表
 * @returns 城市名称数组
 */
export function getSupportedCities(): string[] {
  return Object.keys(CITY_AREA_CODES);
}
