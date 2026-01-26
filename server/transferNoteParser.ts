import { invokeLLM } from "./_core/llm";
import { extractNotesInfo } from "./notesExtractor";

/**
 * 智能纠错功能 - 自动修正常见错误
 */
function smartCorrection(order: any): any {
  // 1. 日期格式纠错
  if (order.classDate) {
    // 处理MM.DD格式,补充年份
    const dateMatch = order.classDate.match(/^(\d{1,2})\.(\d{1,2})$/);
    if (dateMatch) {
      const month = parseInt(dateMatch[1]);
      const day = parseInt(dateMatch[2]);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      // 如果月份小于当前月份,则判定为下一年
      const year = month < currentMonth ? currentYear + 1 : currentYear;
      order.classDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    
    // 处理MM月DD日格式
    const dateMatch2 = order.classDate.match(/^(\d{1,2})月(\d{1,2})日$/);
    if (dateMatch2) {
      const month = parseInt(dateMatch2[1]);
      const day = parseInt(dateMatch2[2]);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      const year = month < currentMonth ? currentYear + 1 : currentYear;
      order.classDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  
  // 2. 金额格式纠错 - 全角数字转半角
  const amountFields = ['paymentAmount', 'courseAmount', 'teacherFee', 'transportFee', 'otherFee', 'partnerFee'];
  amountFields.forEach(field => {
    if (order[field] && typeof order[field] === 'string') {
      // 全角数字转半角
      order[field] = order[field].replace(/[０-９]/g, (char: string) => {
        return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
      });
      // 移除非数字字符(保留数字、小数点和负号)
      order[field] = order[field].replace(/[^\d.-]/g, '');
    }
  });
  
  // 3. 时间格式纠错 - 统一为HH:MM-HH:MM格式
  if (order.classTime && typeof order.classTime === 'string') {
    // 将全角凒号、波浪号等替换为半角连接符
    order.classTime = order.classTime
      .replace(/[～〜~]/g, '-')  // 各种波浪号转为连接符
      .replace(/\./g, ':');  // 点号转为冒号
  }
  
  // 4. 老师名格式纠错 - 移除多余的"老师“后缀
  if (order.deliveryTeacher && typeof order.deliveryTeacher === 'string') {
    // 如果已经包含"老师“后缀,不再重复添加
    if (order.deliveryTeacher.includes('老师') && order.deliveryTeacher.endsWith('上')) {
      order.deliveryTeacher = order.deliveryTeacher.replace(/上$/, '');
    }
  }
  
  // 5. 地点格式纠错 - 提取城市和教室
  if (order.deliveryCity && typeof order.deliveryCity === 'string') {
    // 移除括号
    order.deliveryCity = order.deliveryCity.replace(/[\(\)（）]/g, '');
    
    // 如果包含数字(如“上海404”),分离城市和教室
    const cityRoomMatch = order.deliveryCity.match(/^([一-龥]+)(\d+.*)$/);
    if (cityRoomMatch) {
      order.deliveryCity = cityRoomMatch[1];
      if (!order.deliveryRoom) {
        order.deliveryRoom = cityRoomMatch[2];
      }
    }
    
    // 移除“单”后缀
    order.deliveryCity = order.deliveryCity.replace(/单$/, '');
  }
  
  // 6. 多个交易单号处理 - 用逗号分隔
  if (order.channelOrderNo && typeof order.channelOrderNo === 'string') {
    // 如果包含多个数字串(用空格分隔),用逗号连接
    const orderNos = order.channelOrderNo.split(/\s+/).filter((no: string) => no.length > 10);
    if (orderNos.length > 1) {
      order.channelOrderNo = orderNos.join(',');
    }
  }
  
  // 7. 退款场景处理 - 确保金额为负数
  if (order.deliveryCourse && typeof order.deliveryCourse === 'string') {
    if (order.deliveryCourse.includes('退款') || order.deliveryCourse.includes('退费')) {
      // 确保金额为负数
      if (order.paymentAmount && !order.paymentAmount.startsWith('-')) {
        order.paymentAmount = '-' + order.paymentAmount;
      }
      if (order.courseAmount && !order.courseAmount.startsWith('-')) {
        order.courseAmount = '-' + order.courseAmount;
      }
    }
  }
  
  return order;
}

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
  
  // 构建销售人员名字列表(包括真实姓名、花名和别名)
  const salespersonNamesList: string[] = [];
  const salespersonMapping: Map<string, string> = new Map(); // 别名/真实姓名 -> 花名(或真实姓名)的映射
  const nicknameMapping: Map<string, string> = new Map(); // 真实姓名 -> 花名的映射
  
  salespersons.forEach(sp => {
    // 优先使用花名,如果没有花名则使用真实姓名
    const displayName = sp.nickname || sp.name;
    
    // 添加真实姓名
    salespersonNamesList.push(sp.name);
    salespersonMapping.set(sp.name, displayName);
    
    // 添加花名
    if (sp.nickname) {
      salespersonNamesList.push(sp.nickname);
      salespersonMapping.set(sp.nickname, displayName);
      nicknameMapping.set(sp.name, sp.nickname);
    }
    
    // 添加别名
    if (sp.aliases) {
      try {
        const aliases = JSON.parse(sp.aliases);
        if (Array.isArray(aliases)) {
          aliases.forEach(alias => {
            salespersonNamesList.push(alias);
            salespersonMapping.set(alias, displayName);
          });
        }
      } catch (e) {
        // 忽略JSON解析错误
      }
    }
  });
  
  const salespersonNames = salespersonNamesList.join("、");
  const teacherNamesList = teacherNames.join("、");
  
  // 构建别名说明
  const aliasExplanations: string[] = [];
  salespersons.forEach(sp => {
    if (sp.aliases && sp.aliases.length > 0) {
      const aliases = JSON.parse(sp.aliases);
      if (aliases.length > 0) {
        aliasExplanations.push(`${aliases.join("/")} 是 ${sp.name} 的别名`);
      }
    }
  });
  const aliasInfo = aliasExplanations.length > 0 
    ? `\n\n别名说明:\n${aliasExplanations.join("\n")}` 
    : "";

  const prompt = `你是一个专业的数据解析助手,擅长从非结构化文本中精准提取订单信息。请仔细阅读以下规则和示例,然后解析转账备注。

**重要:如果输入是聊天记录格式(包含发送者名字和时间戳,例如"树莓啤啤 14:04"),请忽略这些元数据行,只解析真正的订单内容行。**

**流量来源识别:如果输入是聊天记录格式,请提取发送者的微信名(设备微信号)到trafficSource字段。例如:"瀛姬沐沐（11-20点 周天周一休息） 18:22" -> trafficSource="瀛姬沐沐（11-20点 周天周一休息）"。如果不是聊天记录格式则留空。**

**作废订单识别:如果记录以"作废"开头(例如"作废 山竹 12.22..."),则将isVoided设置true,否则设置false。**

重要提示:
1. **销售人员识别(必须精确匹配)**: 
   - 销售人员**通常是每行文本的第一个词**(例如"山竹 12.7..."中的"山竹","妖渊 12.6..."中的"妖渊","好好 12.5..."中的"好好","ivy 12.6..."中的"ivy")
   - 系统中的销售人员有: ${salespersonNames}${aliasInfo}
   - **必须从这个列表中精确匹配**,如果第一个词不在列表中则留空
   - 特别注意:"好好"、"ivy"都是销售人员名,不是副词或其他词性
   - **请直接返回识别到的名字**(例如识别到"山竹",就返回"山竹";识别到"妖渊",就返回"妖渊")
2. **老师名识别**: 系统中的老师有: ${teacherNamesList}。老师名可能带有"老师"后缀或"上"后缀。
3. **客户名识别规则** - 客户名**不能**是以下任何一种:
   - 老师名(${teacherNamesList})
   - 城市名(北京、上海、天津、武汉、重庆、成都、郑州、济南、南京、苏州、无锡、东莞、福州、泉州、太原、石家庄等)
   - 课程名或业务类型(2v2、基础局、女王局、丝袜课、裸足丝袜、问罪、臣服、反转、sp课、埃及艳后、活动、充值、面销等)
   - 包含“单”、“上”、“教室”等后缀的词
   - 包含“报销”、“车费”、“辛苦费”、“收款”等费用或交易相关词
   - **特别注意:对于面销/充值类订单,如果文本中没有明确的客户名称,则customerName应该留空,不要把“充值”、“面销”等词误识别为客户名**
4. **地点识别**: 地点通常是城市名,可能带括号,例如"(北京)"、"上海"、"武汉单"。
5. **课程识别**: 
   - 课程名通常包含"局"、"课"等后缀
   - **"面销"是一种课程类型**,不是费用记录
   - 其他课程包括:2v2、基础局、女王局、丝袜课、裸足丝袜、问罪、臣服、反转、sp课、埃及艳后等
6. **费用记录过滤**: 以下类型的文本**不应该**创建订单,应该跳过:
   - **纯费用支付记录**:只包含"报销“、“车费“、“辛苦费“、“提成“等词,且没有课程名和上课时间
   - **注意**:如果包含"面销“作为课程名,并有收款金额,则应该创建订单
7. **特殊场景识别**:
   - **退款**: 课程名包含"退款“或"退费“,金额应为负数(paymentAmount和courseAmount都为负数)
   - **补课**: 课程名包含"补课“或"补计时“,正常处理
   - **存课**: 课程名包含"存“字(如"存一节裸足丝袜课“),正常处理,在notes中标注"存课“
   - **多人拼课**: 客户名包含"和“或逗号(如"客户A和客户B“),正常处理
   - **促销计算**: 如果包含“9送2“、“第二节课半价“等促销信息,请在notes中保留
   - **多个交易单号**: 如果有多个交易单号,用逗号分隔存储到channelOrderNo字段
   - **教室使用备注**: 如果包含"教室第一次使用“等信息,请在notes中保留

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
- 示例7: 山竹 12.20 16:10-17:10基础局 韦德上 阿Q 1200全款微信已付 (上海404) 给老师300 交易单号4200002971202512209215930344 (销售:山竹,客户:阿Q,老师费用:300,渠道订单号:4200002971202512209215930344)
- 示例8: 山竹 12.20 21:30-23:30 基础局+线下乳首课 唐泽上 JoeGong 1200定金已付 1600尾款未付(上海404)报销老师100车费 给老师600 支付宝收款 (销售:山竹,客户:JoeGong,**transportFee:100**,**teacherFee:600**,**车费和老师费用必须严格区分,不能混淆!**)
- 示例9: 山竹 12.20 23:30-0:30 问罪 淼淼上 John 600定金已付 1500尾款未付(上海1101)报销老师100车费 给老师400 (销售:山竹,客户:John,**transportFee:100**,**teacherFee:400**,**"报销老师100车费"中的100是车费,不是老师费用!**)
- 示例10: 山竹 12.25 退款 客户名 退款1000 (销售:山竹,课程:退款,金额:-1000,**退款金额应该为负数**)
- 示例11: 山竹 12.26 补课 声声上 客户A 500已付 (销售:山竹,课程:补课,老师:声声,客户:客户A,金额:500)
- 示例12: 山竹 12.27 基础局 yy上yaya上 客户B和客户C 3000已付 (销售:山竹,课程:基础局,老师:yy和yaya,客户:客户B和客户C,金额:3000,**多人拼课场景**)
- 示例13: 山竹 12.28 14:00-16:00 基础局 声声上 客户D 2000已付 给声声500 车费50 (销售:山竹,老师费用:500,车费:50,**注意区分“给老师”和“车费”**)
- 示例14: 夏鑫 1月21日 14:00~17:00 3个小时基础女王局 歪歪老师上 天津单 全款3000（第三节课半价）Augustin.W 给老师600 (销售:夏鑫,课程:3个小时基础女王局,老师:歪歪,客户:Augustin.W,金额:3000,老师费用:600,notes:第三节课半价)
- 示例15: 山竹 12.23 20:30-21:30 tk 昭昭上 （大连）从不服输 750定金已付 750未付 给老师300 （大连教室第一次使用）4200002887202512219062635765 (销售:山竹,课程:tk,老师:昭昭,地点:大连,客户:从不服输,支付:750,总额:1500,老师费用:300,notes:大连教室第一次使用)
- 示例16: 夏鑫 12月21日 存一节裸足丝袜课+流放剧本 YY老师面销 5000 给老师500 望山全款5000 4200002984202512216346104594 4200002991202512210344645644 (销售:夏鑫,课程:存一节裸足丝袜课+流放剧本,老师:YY,客户:望山,金额:5000,老师费用:500,channelOrderNo:两个交易单号用逗号分隔,notes:存课)
- 示例16b: ivy 1.22 15.00-17.00 淼淼面销充值六送一 收款9000 给淼淼课费600+面销900=1500 支付宝交易单号A2026012216553210044220 (销售:ivy,课程:面销充值六送一,老师:淼淼,**客户名:留空**,金额:9000,老师费用:1500,**注意:这是充值订单,文本中没有明确客户名,不要把“充值”误识别为客户名**)
- 示例17: 嘅嘅 12.21 13:00-15:00 臣服剧本课 姜一上 长风404 涛涛10800 全款已付 9送2=13200-6500=6700 给老师600 (销售:嘅嘅,课程:臣服剧本课,老师:姜一,地点:上海,教室:长风404,客户:涛涛,金额:10800,老师费用:600,notes:9送2促销)
**格式容错规则:**
- 日期格式: MM.DD 或 MM月DD日 或 MM-DD 或 MM/DD 或 YYYY-MM-DD
- 时间格式: HH:MM-HH:MM 或 HH:MM~HH:MM 或 HH:MM～HH:MM 或 HH.MM-HH.MM
- 金额格式: 
  * 可能包含"已付“、“未付“、“定金“、“全款“、“尾款“等关键词
  * 可能包含全角/半角数字混合(2400、2４００)
  * 可能包含错别字(全款写成“全欮“)
- 地点格式: 可能在括号中(北京大兴) 或 直接写(上海404) 或 带后缀(天津单)
- 老师名格式: 可能带“老师”后缀 或 “上”后缀 或 无后缀
- 课程名格式: 可能包含特殊符号(丝袜课➕基础课) 或 加号(基础局+裸足丝袜)
- 客户名格式: 可能是中文、英文、数字混合,可能包含特殊字符
- **缺失字段处理**: 如果某些字段缺失(如客户名、时间、地点),请留空,不要用其他字段填充

请将以下转账备注解析为JSON数组,每个对象包含以下字段:
- salesperson: 销售人员名字(花名),必须从系统销售人员列表(${salespersonNames})中匹配,如果找不到匹配的销售人员则留空
- classDate: 上课日期(格式: 2024-MM-DD 或 2025-MM-DD,根据当前时间判断年份)
- classTime: 上课时间(格式: HH:MM-HH:MM)
- deliveryCourse: 课程名称
- deliveryTeacher: 老师名字(包含"老师"后缀如果有)
- customerName: 客户名字(必须严格遵守上述客户名识别规则,如果无法确定客户名则留空)
- paymentAmount: 支付金额(只提取数字,不包含"已付"、"未付"等文字)
- paymentMethod: 支付方式(如"支付宝收款"、"富掌柜收款"、"现金"、"微信",如果没有明确提及则留空)
- courseAmount: 课程总金额(如果有"未付"金额,计算总额)
- channelOrderNo: 渠道订单号/交易单号(从"交易单号XXXXX"中提取数字,例如:4200002912202512208697791196,如果没有则留空)
- teacherFee: 老师费用(从"给老师XXX"中提取数字,**不包括车费**,如果没有则留空)
- transportFee: 车费(从"报销老师XXX车费"、"报销XXX车费"、"老师打车XXX"、"车费XXX"中提取数字。**重要:车费和老师费用必须严格区分!如果文本中明确提到"车费"二字,则该金额属于transportFee而不是teacherFee**,如果没有则留空)
- deliveryCity: 上课城市(例如:上海、北京)
- deliveryRoom: 上课教室/房间号(例如:404、大兴)
- trafficSource: 流量来源/设备微信号(如果输入是聊天记录格式,请提取发送者的微信名称。例如:"瀛姬沐沐（11-20点 周天周一休息） 18:22" -> trafficSource="瀛姬沐沐（11-20点 周天周一休息）","瀛姬秋秋11:00-20:00 14:57" -> trafficSource="瀛姬秋秋11:00-20:00"。如果不是聊天记录格式则留空)
- notes: 其他备注信息(不要包含聊天记录的发送者名字和时间戳,例如"树莓啤啤 14:04"这样的元数据)
- isVoided: 是否作废(如果记录以"作废"开头则为true,否则为false)

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
                    channelOrderNo: { type: "string" },
                    teacherFee: { type: "string" },
                    transportFee: { type: "string" },
                    deliveryCity: { type: "string" },
                    deliveryRoom: { type: "string" },
                    trafficSource: { type: "string" },
                    notes: { type: "string" },
                    isVoided: { type: "boolean", description: "是否作废(如果记录以'作废'开头则为true,否则为false)" }
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
    const orders = parsed.orders || [];
    
    // 将别名/真实姓名转换为花名(或真实姓名),并提取结构化备注信息
    orders.forEach((order: any) => {
      if (order.salesperson && salespersonMapping.has(order.salesperson)) {
        // 优先使用花名显示
        order.salesperson = salespersonMapping.get(order.salesperson);
      }
      
      // 智能纠错功能
      order = smartCorrection(order);
      
      // 提取结构化备注信息
      if (order.notes) {
        const extracted = extractNotesInfo(order.notes);
        order.noteTags = extracted.tags.length > 0 ? JSON.stringify(extracted.tags) : null;
        order.discountInfo = extracted.discountInfo ? JSON.stringify(extracted.discountInfo) : null;
        order.couponInfo = extracted.couponInfo ? JSON.stringify(extracted.couponInfo) : null;
        order.membershipInfo = extracted.membershipInfo ? JSON.stringify(extracted.membershipInfo) : null;
        order.paymentStatus = extracted.paymentStatus || null;
        order.specialNotes = extracted.specialNotes || null;
      }
    });
    
    return orders;
  } catch (error: any) {
    console.error("解析转账备注失败:", error);
    throw new Error(`解析失败: ${error.message}`);
  }
}
