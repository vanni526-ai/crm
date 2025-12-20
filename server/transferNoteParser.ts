import { invokeLLM } from "./_core/llm";

/**
 * 解析转账备注文本,提取订单信息
 * 
 * 格式: 销售名 日期 时间 课程 老师 客户 金额 备注 地点 教室
 * 示例: 山竹 12.16 15:00-18:30 基础局+裸足丝袜 声声上 (北京大兴) 不爱吃汉堡 2500已付 2850未付 给声声报销400车费 一共给声声1885
 */
export async function parseTransferNotes(text: string) {
  const lines = text.trim().split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error("没有有效的转账备注数据");
  }

  // 获取销售人员列表和老师列表
  const { getAllSalespersons, getAllTeacherNames } = await import("./db");
  const salespersons = await getAllSalespersons();
  const teacherNames = await getAllTeacherNames();
  
  const salespersonNames = salespersons.map(s => s.name).join("、");
  const teacherNamesList = teacherNames.join("、");

  const prompt = `你是一个专业的数据解析助手。请解析以下转账备注,提取订单信息。

重要提示:
1. **销售人员识别**: 销售人员通常是整句话的第一个名字。系统中的销售人员有: ${salespersonNames}
2. **客户名识别**: 客户名通常是地点之后的名字,或者是老师名之后的名字。客户名**不能**是老师名。
3. **老师名识别**: 系统中的老师有: ${teacherNamesList}。老师名可能带有"老师"后缀。
4. **地点识别**: 地点通常是城市名+房间号,例如"上海404"、"北京大兴"。地点**不是**客户名。

转账备注格式说明:
- 每行一条转账记录
- 典型格式: 销售名 日期 时间 课程 老师 地点 客户 金额 备注
- 示例1: 夏鑫 12月25日 13:00~15：00 2个小时基础女王局 米妮老师 上海404 全款2400 支付宝收款
- 示例2: 山竹 12.16 15:00-18:30 基础局+裸足丝袜 声声上 (北京大兴) 不爱吃汉堡 2500已付 2850未付
- 日期格式: MM.DD 或 MM月DD日
- 时间格式: HH:MM-HH:MM 或 HH:MM~HH:MM
- 金额可能包含"已付"、"未付"、"定金"、"全款"等关键词
- 地点可能在括号中,例如: (北京大兴)
- 有些字段可能缺失

请将以下转账备注解析为JSON数组,每个对象包含以下字段:
- salesperson: 销售人员名字(花名),必须是系统中的销售人员之一
- classDate: 上课日期(格式: 2024-MM-DD 或 2025-MM-DD,根据当前时间判断年份)
- classTime: 上课时间(格式: HH:MM-HH:MM)
- deliveryCourse: 课程名称
- deliveryTeacher: 老师名字(包含"老师"后缀如果有)
- customerName: 客户名字(不能是老师名,不能是地点名)
- paymentAmount: 支付金额(只提取数字,不包含"已付"、"未付"等文字)
- courseAmount: 课程总金额(如果有"未付"金额,计算总额)
- deliveryCity: 上课城市(例如:上海、北京)
- deliveryRoom: 上课教室/房间号(例如:404、大兴)
- notes: 其他备注信息

转账备注数据:
${lines.join('\n')}

请直接返回JSON数组,不要包含任何其他说明文字。`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是一个数据解析专家,擅长从非结构化文本中提取结构化信息。" },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "transfer_notes",
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
                    classDate: { type: "string" },
                    classTime: { type: "string" },
                    deliveryCourse: { type: "string" },
                    deliveryTeacher: { type: "string" },
                    customerName: { type: "string" },
                    paymentAmount: { type: "string" },
                    courseAmount: { type: "string" },
                    deliveryCity: { type: "string" },
                    deliveryRoom: { type: "string" },
                    notes: { type: "string" }
                  },
                  required: ["paymentAmount"],
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
    if (!content || typeof content !== 'string') {
      throw new Error("LLM返回空内容或格式错误");
    }

    const parsed = JSON.parse(content);
    return parsed.orders || [];
  } catch (error: any) {
    console.error("解析转账备注失败:", error);
    throw new Error(`解析失败: ${error.message}`);
  }
}
