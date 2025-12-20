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
1. **销售人员识别(必须精确匹配)**: 
   - 销售人员**通常是每行文本的第一个词**(例如"山竹 12.7..."中的"山竹","妖渊 12.6..."中的"妖渊","好好 12.5..."中的"好好","ivy 12.6..."中的"ivy")
   - 系统中的销售人员有: ${salespersonNames}
   - **必须从这个列表中精确匹配**,如果第一个词不在列表中则留空
   - 特别注意:"好好"、"ivy"都是销售人员名,不是副词或其他词性
2. **老师名识别**: 系统中的老师有: ${teacherNamesList}。老师名可能带有"老师"后缀或"上"后缀。
3. **客户名识别规则** - 客户名**不能**是以下任何一种:
   - 老师名(${teacherNamesList})
   - 城市名(北京、上海、天津、武汉、重庆、成都、郑州、济南、南京、苏州、无锡、东莞、福州、泉州、太原、石家庄等)
   - 课程名或业务类型(2v2、基础局、女王局、丝袜课、裸足丝袜、问罪、臣服、反转、sp课、埃及艳后、活动等)
   - 包含"单"、"上"、"教室"等后缀的词
   - 包含"报销"、"车费"、"辛苦费"等费用相关词
4. **地点识别**: 地点通常是城市名,可能带括号,例如"(北京)"、"上海"、"武汉单"。
5. **课程识别**: 
   - 课程名通常包含"局"、"课"等后缀
   - **"面销"是一种课程类型**,不是费用记录
   - 其他课程包括:2v2、基础局、女王局、丝袜课、裸足丝袜、问罪、臣服、反转、sp课、埃及艳后等
6. **费用记录过滤**: 以下类型的文本**不应该**创建订单,应该跳过:
   - **纯费用支付记录**:只包含"报销"、"车费"、"辛苦费"、"提成"等词,且没有课程名和上课时间
   - **注意**:如果包含"面销"作为课程名,并有收款金额,则应该创建订单

转账备注格式说明:
- 每行一条转账记录
- 典型格式: 销售名 日期 时间 课程 老师 地点 客户 金额 备注
- 示例1: 夏鑫 12月25日 13:00~15：00 2个小时基础女王局 米妮老师 上海404 全欮2400 支付宝收款 (销售:夏鑫,客户名缺失)
- 示例2: 山竹 12.16 15:00-18:30 基础局+裸足丝袜 声声上 (北京大兴) 不爱吃汉堡 2500已付 2850未付 (销售:山竹,客户名:不爱吃汉堡)
- 示例3: 山竹 12.7 yy面销 2000 (销售:山竹,老师:yy,课程:面销,金额:2000,**应该创建订单**)
- 示例3b: 山竹 12.7 yy面销 2000 给yy200 (销售:山竹,老师:yy,课程:面销,收款:2000,老师费用:200,**应该创建订单**)
- 示例3c: ivy 12.16 晚晚面销 2400 (销售:ivy,老师:晚晚,课程:面销,金额:2400,**应该创建订单**)
- 示例3d: 妖渊 12.12 活动 市场部面销 1920 (销售:如果系统中有"妖渊"则填写,老师:市场部,课程:活动/面销,金额:1920,**应该创建订单**)
- 示例4: 妖渊 12.6 18:30~20:00 2v2 yy和声声老师 天津单 850 (销售:如果系统中有"妖渊"则填写,否则留空;天津是城市,2v2是课程,无客户名)
- 示例5: 好好 12.5 18:30-21:30 丝袜课➕两节基础课 yy上 天津单 1000 (销售:好好,不是副词)
- 示例6: ivy 12.6 14.30-15.30 女慕课一节 yy 行之 3000 (销售:ivy,客户名:行之)
- 日期格式: MM.DD 或 MM月DD日
- 时间格式: HH:MM-HH:MM 或 HH:MM~HH:MM
- 金额可能包含"已付"、"未付"、"定金"、"全款"等关键词
- 地点可能在括号中,例如: (北京大兴)
- 有些字段可能缺失

请将以下转账备注解析为JSON数组,每个对象包含以下字段:
- salesperson: 销售人员名字(花名),必须从系统销售人员列表(${salespersonNames})中匹配,如果找不到匹配的销售人员则留空
- classDate: 上课日期(格式: 2024-MM-DD 或 2025-MM-DD,根据当前时间判断年份)
- classTime: 上课时间(格式: HH:MM-HH:MM)
- deliveryCourse: 课程名称
- deliveryTeacher: 老师名字(包含"老师"后缀如果有)
- customerName: 客户名字(必须严格遵守上述客户名识别规则,如果无法确定客户名则留空)
- paymentAmount: 支付金额(只提取数字,不包含"已付"、"未付"等文字)
- paymentMethod: 支付方式(如"支付宝收款"、"富掌柜收款"、"现金",如果没有明确提及则留空)
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
                    paymentMethod: { type: "string" },
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
