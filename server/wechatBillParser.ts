// LLM功能已在迁移阿里云阶段暂时禁用

/**
 * 微信账单行数据
 */
export interface WechatBillRow {
  transactionTime: string; // 交易时间
  transactionType: string; // 交易类型
  counterparty: string; // 交易对方(老师)
  goods: string; // 商品(包含课程详细信息)
  incomeExpense: string; // 收/支
  amount: string; // 金额
  paymentMethod: string; // 支付方式
  status: string; // 当前状态
  transactionNo: string; // 交易单号
  merchantNo: string; // 商户单号
  notes: string; // 备注
}

/**
 * 解析后的订单信息
 */
export interface ParsedOrderInfo {
  customerName: string; // 客户名
  deliveryTeacher: string; // 交付老师
  deliveryCourse: string; // 交付课程
  deliveryCity: string; // 交付城市
  deliveryRoom: string; // 交付教室
  classDate: string; // 上课日期(YYYY-MM-DD)
  classTime: string; // 上课时间(HH:MM-HH:MM)
  paymentAmount: string; // 支付金额
  courseAmount: string; // 课程金额
  teacherFee: string; // 老师费用
  notes: string; // 备注(原始商品信息)
  rawData: WechatBillRow; // 原始数据
}

/**
 * 使用LLM解析微信账单中的商品信息
 */
export async function parseWechatBillWithLLM(
  rows: WechatBillRow[],
  template: string = "wechat"
): Promise<ParsedOrderInfo[]> {
  throw new Error("微信账单LLM解析功能暂时不可用（系统维护中）");
}

/**
 * 从交易对方字符串中提取老师名称
 * 例如: "瀛姬某某某 北京女syy 5%,30%" -> "yy"
 * 例如: "漩涡小羊 武汉瀛姬小羊老师" -> "小羊"
 */
function extractTeacherName(counterparty: string): string {
  if (!counterparty || counterparty === "/") {
    return "";
  }

  // 尝试提取常见的老师名称模式
  const patterns = [
    /女[sd](\w+)/i, // 匹配"女s"或"女d"后面的名字
    /老师(\w+)/i, // 匹配"老师"后面的名字
    /瀛姬(\w+)/i, // 匹配"瀛姬"后面的名字
  ];

  for (const pattern of patterns) {
    const match = counterparty.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // 如果没有匹配到,返回整个字符串(去掉特殊字符)
  return counterparty
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, "")
    .substring(0, 10);
}

/**
 * 批量解析微信账单
 */
export async function parseWechatBillBatch(
  rows: WechatBillRow[],
  template: "wechat" | "alipay" | "custom" = "wechat"
): Promise<ParsedOrderInfo[]> {
  throw new Error("微信账单批量解析功能暂时不可用（系统维护中）");
}
