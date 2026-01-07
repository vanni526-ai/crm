import { invokeLLM } from "./_core/llm";
import { getAllSalespersons, getAllTeachers, isTeacherName } from "./db";

/**
 * 从ICS解析出的订单信息(与Gmail导入格式一致)
 */
export interface ParsedICSOrder {
  salesperson: string; // 销售人员
  deviceWechat: string; // 设备微信号(流量来源)
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
  accountBalance: number; // 账户余额
  paymentMethod: string; // 支付方式(支付宝/富掌柜/现金)
  channelOrderNo: string; // 渠道订单号/交易单号
  notes: string; // 备注
  originalText: string; // 原始文本(SUMMARY字段)
}

/**
 * 使用LLM解析ICS日历事件中的订单信息
 * ICS文件的SUMMARY字段通常包含类似"七七 线上理论课 水不在深有龙则呜 姜一 全款350"的信息
 */
export async function parseICSOrderContent(
  icsEvents: Array<{
    summary: string;
    description: string;
    location: string;
    startTime: Date;
    endTime: Date;
    organizer: string;
    attendees: string[];
  }>
): Promise<ParsedICSOrder[]> {
  // 获取销售人员和老师列表
  const salespersons = await getAllSalespersons();
  const teachers = await getAllTeachers();

  const salespersonList = salespersons.map(s => `${s.name}${s.aliases ? ` (别名: ${s.aliases})` : ""}`).join(", ");
  const teacherList = teachers.map(t => `${t.name}${t.aliases ? ` (别名: ${t.aliases})` : ""}`).join(", ");

  // 构建LLM提示词
  const prompt = `你是一个专业的订单信息提取助手。请从以下ICS日历事件中提取所有订单信息。

已知的销售人员列表: ${salespersonList}
已知的老师列表: ${teacherList}

ICS日历事件列表:
${icsEvents.map((event, index) => `
事件 ${index + 1}:
- SUMMARY: ${event.summary}
- LOCATION: ${event.location}
- ORGANIZER: ${event.organizer}
- START: ${event.startTime.toISOString()}
- END: ${event.endTime.toISOString()}
- DESCRIPTION: ${event.description}
`).join("\n")}

请提取每个事件的以下信息:
1. 销售人员 - 从SUMMARY第一个词识别销售人员花名(如"昭昭"、"嘟嘟"、"七七"),如果无法识别则留空
2. 设备微信号 - 流量来源,通常是日历所有者或设备账号,可以从ORGANIZER或文件元数据推断,如果无法识别则留空
3. 客户名 - 客户的名字,通常在SUMMARY中(如"七七"可能是客户名),注意不要把老师名当作客户名
4. 上课日期 - 从START时间提取,格式YYYY-MM-DD(如"2025-12-17")
5. 上课时间 - 从START和END时间提取,格式HH:MM-HH:MM(如"20:30-21:30")
6. 课程名称 - 课程内容,从SUMMARY中提取(如"线上理论课"、"水不在深有龙则呜")
7. 老师名称 - 老师的名字,从SUMMARY或ORGANIZER中提取(如"姜一"、"云云")
8. 城市 - 从LOCATION中提取城市信息(如"上海"、"无锡")
   ⚠️ 教室到城市的映射规则:
   * "404教室" 或 "404" → 城市填写"上海"
   * "1101教室" 或 "1101" → 城市填写"上海"
   * "捷运大厦16D" → 城市填写"上海"
9. 教室 - 从LOCATION中提取教室信息(如"无锡教室"、"济南教室"、"404")
10. 支付金额 - 从SUMMARY中提取金额信息(如"全款350"中的350)
11. 课程金额 - 课程总价,通常等于支付金额
12. 首付金额 - 定金,如果SUMMARY中提到"定金XXX"则提取,否则为0
13. 尾款金额 - 尾款,如果SUMMARY中提到"尾款XXX"则提取,否则为0
14. 老师费用 - 老师的费用,如果SUMMARY或DESCRIPTION中提到"给老师XXX"则提取,否则为0
15. 车费 - 车费,如果提到"报销XXX车费"则提取,否则为0
16. 账户余额 - 客户账户余额,如果SUMMARY中提到则提取,否则为0
17. 支付方式 - 支付方式(支付宝/微信/富掌柜/现金/银行转账),如果无法识别则留空
18. 渠道订单号 - 交易单号,如果SUMMARY或DESCRIPTION中提到则提取,否则留空
19. 备注 - 其他重要信息,从DESCRIPTION或SUMMARY中提取

⚠️ 重要规则:
- 客户名不能是老师名!如果识别出的客户名在老师列表中,则将客户名设为空
- 如果SUMMARY格式类似"客户名 课程 老师名 金额",则第一个词是客户名,倒数第二个词是老师名
- 日期和时间必须从START/END字段提取,不要从SUMMARY中猜测
- 金额相关字段如果无法识别则填0,不要填null
- 字符串字段如果无法识别则留空,不要填"未知"或"无"

请以JSON数组格式返回结果,每个订单一个对象。`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是一个专业的数据提取助手,擅长从非结构化文本中提取结构化信息。" },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ics_orders",
          strict: true,
          schema: {
            type: "object",
            properties: {
              orders: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    salesperson: { type: "string", description: "销售人员花名" },
                    deviceWechat: { type: "string", description: "设备微信号/流量来源" },
                    customerName: { type: "string", description: "客户名" },
                    classDate: { type: "string", description: "上课日期 YYYY-MM-DD" },
                    classTime: { type: "string", description: "上课时间 HH:MM-HH:MM" },
                    course: { type: "string", description: "课程名称" },
                    teacher: { type: "string", description: "老师名称" },
                    city: { type: "string", description: "城市" },
                    classroom: { type: "string", description: "教室" },
                    paymentAmount: { type: "number", description: "支付金额" },
                    courseAmount: { type: "number", description: "课程金额" },
                    downPayment: { type: "number", description: "首付金额" },
                    finalPayment: { type: "number", description: "尾款金额" },
                    teacherFee: { type: "number", description: "老师费用" },
                    carFee: { type: "number", description: "车费" },
                    accountBalance: { type: "number", description: "账户余额" },
                    paymentMethod: { type: "string", description: "支付方式" },
                    channelOrderNo: { type: "string", description: "渠道订单号" },
                    notes: { type: "string", description: "备注" },
                    originalText: { type: "string", description: "原始SUMMARY文本" }
                  },
                  required: [
                    "salesperson", "deviceWechat", "customerName", "classDate", "classTime",
                    "course", "teacher", "city", "classroom", "paymentAmount", "courseAmount",
                    "downPayment", "finalPayment", "teacherFee", "carFee", "accountBalance",
                    "paymentMethod", "channelOrderNo", "notes", "originalText"
                  ],
                  additionalProperties: false
                }
              }
            },
            required: ["orders"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    if (!content || typeof content !== "string") {
      throw new Error("LLM返回空内容或格式错误");
    }

    const parsed = JSON.parse(content);
    const orders: ParsedICSOrder[] = parsed.orders;

    // 后处理:过滤掉客户名是老师名的情况
    for (const order of orders) {
      if (order.customerName && await isTeacherName(order.customerName)) {
        console.warn(`[ICS解析] 客户名"${order.customerName}"是老师名,已清空`);
        order.customerName = "";
      }
    }

    return orders;
  } catch (error) {
    console.error("[ICS解析] LLM解析失败:", error);
    throw new Error(`ICS订单解析失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}
