import { invokeLLM } from "./_core/llm";

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
  // 客户匹配相关字段
  matchedCustomerId?: number; // 匹配到的客户ID
  matchedCustomers?: Array<{ id: number; name: string; wechatId?: string; phone?: string }>; // 可能匹配的客户列表
}

/**
 * 使用LLM解析微信账单中的商品信息
 */
export async function parseWechatBillWithLLM(
  row: WechatBillRow
): Promise<ParsedOrderInfo | null> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是一个专业的数据解析助手。你的任务是从课程订单描述中提取结构化信息。

支持两种输入格式:

**1. 完整账单格式** (包含交易对方、商品、金额等字段):
示例: "七七 12.1 丝袜课 足球砖家 yy 14:00-16:00全款3000(北京上)"

**2. 单行文本格式** (转账备注等,信息更简洁):
示例: "转账备注: 七七  11.22 基础+丝袜 Tohsaka Rin yy 13:00-15:00（北京上）"
示例: "七七 11.22 基础+丝袜 Tohsaka Rin yy 13:00-15:00(北京上)"

需要提取的信息:
1. **customerName** (客户名): 
   - **重要**: 客户名和销售人员是不同的!
   - 客户名通常在开头,如"七七"、"山竹"
   - 销售人员通常是英文名字,如"ivy"、"yy"、"AL1987"
   - **如果无法确定客户名,请返回空字符串**
   - 单行文本中,客户名可能在"转账备注:"后面,但不是所有情况都有
   
2. **classDate** (上课日期):
   - 格式: YYYY-MM-DD
   - 输入格式: "月.日"(如"12.1"、"11.22")
   - 当前年份: 2025年, 当前月份: 12月
   - 如果月份 > 12月,说明是2024年的数据
   
3. **classTime** (上课时间):
   - 格式: HH:MM-HH:MM (如"14:00-16:00"、"13:00-15:00")
   - 注意提取完整的时间范围
   
4. **deliveryCourse** (交付课程):
   - 常见课程: "丝袜课"、"基础局"、"基础+丝袜"、"裸足丝袜课"
   - 单行文本中通常在日期后面
   
5. **deliveryCity** (交付城市):
   - 通常在括号中: "(北京上)"、"(北京)"、"（北京上）" (注意中英文括号)
   - 提取城市名即可,如"北京"、"无锡"、"天津"
   - 如果没有括号则为空
   
6. **deliveryRoom** (交付教室):
   - 数字或字母数字组合: "404"、"1101"、"i404"
   - 如果没有则为空
   
7. **paymentAmount** (支付金额):
   - 从"全款"、"定金"、"尾款"后面提取数字
   - 如果没有明确关键词,使用交易金额
   
8. **courseAmount** (课程总金额):
   - 通常等于支付金额
   
9. **teacherFee** (老师费用):
   - 从"给老师"、"给XX"后面提取
   - 如果没有则为空

**重要规则**:
- **客户名区分**: 客户名通常是2-4个字的**中文名字**,英文名字通常是销售人员
- **如果没有明确的客户名,必须返回空字符串**
- 日期必须转换为 YYYY-MM-DD 格式
- 城市名只保留汉字,去掉"上"、"下"等后缀
- 如果信息不完整或无法提取,对应字段返回空字符串`,
        },
        {
          role: "user",
          content: `请解析以下微信账单信息:

交易对方: ${row.counterparty}
商品描述: ${row.goods}
金额: ${row.amount}
交易时间: ${row.transactionTime}

请返回JSON格式的解析结果。`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "parsed_order_info",
          strict: true,
          schema: {
            type: "object",
            properties: {
              customerName: {
                type: "string",
                description: "客户名",
              },
              classDate: {
                type: "string",
                description: "上课日期(YYYY-MM-DD格式)",
              },
              classTime: {
                type: "string",
                description: "上课时间(HH:MM-HH:MM格式)",
              },
              deliveryCourse: {
                type: "string",
                description: "交付课程",
              },
              deliveryCity: {
                type: "string",
                description: "交付城市",
              },
              deliveryRoom: {
                type: "string",
                description: "交付教室",
              },
              paymentAmount: {
                type: "string",
                description: "支付金额(数字)",
              },
              courseAmount: {
                type: "string",
                description: "课程总金额(数字)",
              },
              teacherFee: {
                type: "string",
                description: "老师费用(数字,如果没有则为空字符串)",
              },
            },
            required: [
              "customerName",
              "classDate",
              "classTime",
              "deliveryCourse",
              "deliveryCity",
              "deliveryRoom",
              "paymentAmount",
              "courseAmount",
              "teacherFee",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content || typeof content !== 'string') {
      return null;
    }

    const parsed = JSON.parse(content);

    // 从交易对方中提取老师名称
    const teacherName = extractTeacherName(row.counterparty);

    return {
      customerName: parsed.customerName || "",
      deliveryTeacher: teacherName,
      deliveryCourse: parsed.deliveryCourse || "",
      deliveryCity: parsed.deliveryCity || "",
      deliveryRoom: parsed.deliveryRoom || "",
      classDate: parsed.classDate || "",
      classTime: parsed.classTime || "",
      paymentAmount: parsed.paymentAmount || "",
      courseAmount: parsed.courseAmount || parsed.paymentAmount || "",
      teacherFee: parsed.teacherFee || "",
      notes: row.goods,
      rawData: row,
    };
  } catch (error) {
    console.error("解析微信账单失败:", error);
    return null;
  }
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
  const results: ParsedOrderInfo[] = [];

  for (const row of rows) {
    // 只处理支出类型的记录(老师费用)
    if (row.incomeExpense !== "支出") {
      continue;
    }

    // 跳过退款记录
    if (row.status.includes("退款") || row.status.includes("退还")) {
      continue;
    }

    const parsed = await parseWechatBillWithLLM(row);
    if (parsed && parsed.customerName) {
      results.push(parsed);
    }
  }

  return results;
}
