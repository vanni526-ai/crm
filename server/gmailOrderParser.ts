import { invokeLLM } from "./_core/llm";
import { getAllGmailImportConfigs } from "./db";

/**
 * 解析后的订单信息
 */
export interface ParsedGmailOrder {
  salesperson: string; // 销售人员
  deviceWechat: string; // 设备微信号
  customerName: string; // 客户名
  classDate: string; // 上课日期 (YYYY-MM-DD)
  classTime: string; // 上课时间
  course: string; // 课程名称
  teacher: string; // 老师名称
  city: string; // 城市
  classroom: string; // 教室
  paymentAmount: number; // 支付金额
  courseAmount: number; // 课程金额
  downPayment: number; // 首付金额
  finalPayment: number; // 尾款金额
  teacherFee: number; // 老师费用
  carFee: number; // 车费
  notes: string; // 备注
  originalText: string; // 原始文本
}

/**
 * 使用LLM解析微信群聊天记录中的订单信息
 */
export async function parseGmailOrderContent(
  emailContent: string
): Promise<ParsedGmailOrder[]> {
  // 读取配置规则
  const configs = await getAllGmailImportConfigs();
  const cityAreaCodes = configs.find(c => c.configKey === "city_area_codes")?.configValue as Record<string, string> || {};
  const salesAliases = configs.find(c => c.configKey === "sales_aliases")?.configValue as Record<string, string> || {};
  const defaultFees = configs.find(c => c.configKey === "default_fees")?.configValue as { teacherFeeRate: number; transportFeeDefault: number } || { teacherFeeRate: 0.5, transportFeeDefault: 200 };

  // 构建配置提示
  const configHints = [];
  if (Object.keys(cityAreaCodes).length > 0) {
    configHints.push(`城市区号映射: ${JSON.stringify(cityAreaCodes)}`);
  }
  if (Object.keys(salesAliases).length > 0) {
    configHints.push(`销售人员别名映射: ${JSON.stringify(salesAliases)} - 如果遇到别名，请转换为正式名称`);
  }
  configHints.push(`默认老师费用比例: ${defaultFees.teacherFeeRate * 100}%, 默认车费: ¥${defaultFees.transportFeeDefault}`);
  
  const configPrompt = configHints.length > 0 ? `\n\n参考配置规则（用于提高解析准确率）:\n${configHints.join('\n')}` : '';

  const prompt = `你是一个专业的订单信息提取助手。请从以下微信群聊天记录中提取所有订单信息。${configPrompt}

⚠️ 重要：常见同音字错误纠正（必须使用正确的字）：
- "瀛姬" 是正确的，不要写成 "瀑姬"
- "嘟嘟" 是正确的，不要写成 "嘅嘅" 或其他同音字
- "昭昭" 是正确的，不要写成 "赵赵" 或 "朝朝"
- 设备微信号中包含 "瀛姬" 的，一定要使用 "瀛" 字，不是 "瀑" 字

聊天记录:
${emailContent}

请提取每条订单的以下信息:
1. 销售人员 - 订单信息第一个词,销售人员的花名(如"昭昭"、"嘟嘟")
2. 设备微信号 - 发送消息的微信账号(如"瀛姬喵喵11:00-20:00"、"瀛姬小颖")
3. 客户名 - 客户的名字(通常在备注或金额信息中,如"韩开银",如果没有明确客户名则留空)
4. 上课日期 - 格式YYYY-MM-DD(如"2025-12-17")
5. 上课时间 - 时间范围(如"20:30-21:30"、"18:00-20:00")
6. 课程名称 - 课程内容(如"sp课"、"裸足丝袜+埃及艳后")
7. 老师名称 - 老师的名字(如"云云"、"皮皮")
8. 城市 - 上课城市(如"无锡"、"济南")
9. 教室 - 教室信息(如"无锡教室"、"济南教室")
10. 支付金额 - 总支付金额(定金+尾款)
11. 课程金额 - 课程总价
12. 首付金额 - 定金金额
13. 尾款金额 - 尾款金额
14. 老师费用 - 老师的费用(如果有)
15. 车费 - 报销的车费(如果有)
16. 备注 - 其他重要信息(如"无锡教室第三次使用")

注意事项:
- 如果某个字段没有明确提到,请填写空字符串或0
- 金额只提取数字,不要包含货币符号
- 日期统一使用YYYY-MM-DD格式
- 如果只提到"全款XXX已付",则支付金额=课程金额=全款金额
- 如果提到"定金XXX已付"和"尾款XXX已付",则支付金额=定金+尾款
- 设备微信号是发送消息的账号(如"瀛姬喵喵11:00-20:00"、"瀛姬小颖"),不是销售人员
- 销售人员是订单信息的第一个词(如"昭昭"、"嘟嘟")
- 老师名称通常在课程信息后面,格式为"XX上"(如"云云上"、"皮皮上")
- 城市信息通常在括号中(如"(无锡单)"、"(济南)")
- 客户名可能在金额信息中(如"韩开银1600定金已付"),如果没有则留空

请以JSON数组格式返回所有订单,每个订单包含以上所有字段。`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "你是一个专业的订单信息提取助手,擅长从非结构化文本中准确提取订单数据。",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "order_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              orders: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    salesperson: { type: "string" },
                    deviceWechat: { type: "string" },
                    customerName: { type: "string" },
                    classDate: { type: "string" },
                    classTime: { type: "string" },
                    course: { type: "string" },
                    teacher: { type: "string" },
                    city: { type: "string" },
                    classroom: { type: "string" },
                    paymentAmount: { type: "number" },
                    courseAmount: { type: "number" },
                    downPayment: { type: "number" },
                    finalPayment: { type: "number" },
                    teacherFee: { type: "number" },
                    carFee: { type: "number" },
                    notes: { type: "string" },
                  },
                  required: [
                    "salesperson",
                    "deviceWechat",
                    "customerName",
                    "classDate",
                    "classTime",
                    "course",
                    "teacher",
                    "city",
                    "classroom",
                    "paymentAmount",
                    "courseAmount",
                    "downPayment",
                    "finalPayment",
                    "teacherFee",
                    "carFee",
                    "notes",
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["orders"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("LLM返回空内容");
    }

    // 确保content是字符串类型
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const parsed = JSON.parse(contentStr);
    // 后处理纠错：修正常见同音字错误
    const correctCommonErrors = (text: string): string => {
      if (!text) return text;
      return text
        .replace(/瀑姬/g, "瀛姬")  // 瀑姬 → 瀛姬
        .replace(/嘅嘅/g, "嘟嘟")  // 嘅嘅 → 嘟嘟
        .replace(/赵赵/g, "昭昭")  // 赵赵 → 昭昭
        .replace(/朝朝/g, "昭昭"); // 朝朝 → 昭昭
    };

    const orders: ParsedGmailOrder[] = parsed.orders.map((order: any) => ({
      ...order,
      salesperson: correctCommonErrors(order.salesperson),
      deviceWechat: correctCommonErrors(order.deviceWechat),
      customerName: correctCommonErrors(order.customerName),
      teacher: correctCommonErrors(order.teacher),
      originalText: emailContent,
    }));

    return orders;
  } catch (error) {
    console.error("解析Gmail订单失败:", error);
    throw new Error(`解析订单失败: ${error}`);
  }
}
