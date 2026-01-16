import { invokeLLM } from "./_core/llm";
import { getAllGmailImportConfigs, isTeacherName } from "./db";

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
  accountBalance: number; // 账户余额
  paymentMethod: string; // 支付方式(支付宝/富掌柜/现金)
  channelOrderNo: string; // 渠道订单号/交易单号
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
  const errorMappings = configs.find(c => c.configKey === "error_mappings")?.configValue as Record<string, string> || {};

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

⚠️ 订单边界识别规则（非常重要）：
- 每条订单是一个独立的消息，从发送人+时间戳开始，到下一个发送人之前结束
- 例如：
  订单1: "瀛姬喇喇12:00-21:00  00:43\n土豆 1.12 14.00-15.00 ..."
  订单2: "瀛姬觅知音（周五周六休息）  14:29\n周日上午9-11点..."
  订单3: "瀛姬 紫希上班时间（11:00-20:00）  23:57\n山竹 1.14 21:10-22:10 ..."
- 每个订单的备注字段只保存该条消息的完整文本，不要混入其他订单的信息

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
3. 客户名 - 客户的名字(通常在备注或金额信息中,如"韩开银")
   ⚠️ 注意:客户名不能是老师名,也不能是课程名!
   * 如果识别出的名字看起来像课程名称(如"高定网T"、"LEC4"、"基础局"等),则不是客户名
   * 如果没有明确客户名则留空
4. 上课日期 - 格式YYYY-MM-DD(如"2025-12-17")
5. 上课时间 - 时间范围(如"20:30-21:30"、"18:00-20:00")
6. 课程名称 - 课程内容(如"sp课"、"裸足丝袜+埃及艳后")
7. 老师名称 - 老师的名字(如"云云"、"皮皮")
8. 城市 - 上课城市(如"无锡"、"济南")
   ⚠️ 教室到城市的映射规则(必须遵守):
   * "404教室" 或 "404" → 城市填写"上海"
   * "1101教室" 或 "1101" → 城市填写"上海"
   * "捕运大厦16D" → 城市填写"上海"(上海总部办公楼)
   * "长风各岸404" → 城市填写"上海"
   * "长风北岸1101" → 城市填写"上海"
   * "腾讯会议" → 城市填写"互联网课"(线上课程)
   * 其他教室根据文本中的城市信息填写
9. 教室 - 教室信息(如"无锡教室"、"济南教室")
10. 支付金额 - 总支付金额(定金+尾款)
11. 课程金额 - 课程总价
12. 首付金额 - 定金金额
13. 尾款金额 - 尾款金额
14. 老师费用 - 老师的费用,常见表达:
   * "给老师XXX" (如"给老师300"、"给老师400"、"给老师600")
   * "给XXX(老师名)XXX" (如"给橘子1300"、"给云云500")
   * "给老师XXX+XXX" (如"给老师1260+240+100=1600")
   * "已给老师XXX再给老师XXX" (如"已给老师4210再给老师450",总计4660)
   * "课时费XXX" (如"课时费4660")
   * ⚠️ 注意:"给老师XXX"是老师费用,不是车费!
   * 如果没有明确提到老师费用,则塡0
15. 车费 - 报销的车费/交通费,常见表达:
   * "报销老师XXX车费" (如"报销老师100车费")
   * "老师打车XXX" (如"100老师打车")
   * "酒店车费XXX" (如"酒店车费加课时费4660"中的车费部分)
   * "客户报销酒店XXX" (如"客户报销酒店250")
   * ⚠️ 注意:只有明确提到"报销"、"车费"、"打车"、"酒店"等关键词才是车费!
   * 如果没有明确提到车费,则塡0
16. 账户余额 - 从文本中提取余额信息,如"余额 6200抵扣 2400剩 3800"提取3800,"余额 9200-3600=5600"提取5600,如果没有提及余额则塡0
17. 支付方式 - 支付渠道(如"支付宝收款"、"富掌柜收款"、"现金",如果没有明确提及则留空)
18. 渠道订单号 - 交易单号/渠道订单号,常见表达:
   * "交易单号XXXXXXXX" (如"交易单号4200002971202512209215930344")
   * ⚠️ **重要**: 如果没有明确提到渠道订单号,则必须留空(空字符串""),不要填充"1.1"、"1.2"等占位符数字
   * 渠道订单号通常是15位以上的长数字串(如微信支付宝订单号),不会是"1.1"这样的简单数字
19. 备注 - 保存该订单的完整原始文本信息(从销售人员名开始到该条消息结束的所有内容)
   ⚠️ 非常重要 - 订单边界隔离
   * **只保存当前订单的原始文本,不要混入其他订单的信息**
   * 每条订单是一个独立的消息,从发送人+时间戳开始到下一个发送人之前结束
   * 示例说明 - 如果聊天记录包含两条消息
     第一条消息是 瀛姬喵喵 发的，内容是 土豆的福州订单
     第二条消息是 瀛姬觅知音 发的，内容是 天津订单
     那么订单1的备注只包含土豆的福州订单内容，不包含天津订单
     订单2的备注只包含天津订单内容，不包含福州订单
   * 订单1的备注不应该包含订单2的任何信息,反之亦然
   * 这样可以确保每个订单的备注字段独立且完整

注意事项:
- 如果某个字段没有明确提到,请填写空字符串或0
- ⚠️ **特别注意**: 不要使用"1.1"、"1.2"等数字作为占位符,尤其是渠道订单号字段
- 金额只提取数字,不要包含货币符号
- 日期统一使用YYYY-MM-DD格式
- 如果只提到"全款XXX已付",则支付金额=课程金额=全款金额
- 如果提到"定金XXX已付"和"尾款XXX已付",则支付金额=定金+尾款
- 设备微信号是发送消息的账号(如"瀛姬喵喵11:00-20:00"、"瀛姬小颖"),不是销售人员
- 销售人员是订单信息的第一个词(如"昭昭"、"嘟嘟")
- 老师名称通常在课程信息后面,格式为"XX上"(如"云云上"、"皮皮上")
- 城市识别规则(⚠️ 非常重要):
  * **上海教室**: 如果教室是"404教室"、"404"、"1101教室"、"1101"、"捕运大厦16D"、"长风北岸404"、"长风北岸1101",城市必须填写"上海"
  * **线上课程**: 如果教室或地点是"腾讯会议"、"腾讯"、"网课"、"线上",城市填写"互联网课"
  * **其他城市**: 根据文本中的城市信息填写(如"(无锡单)"→"无锡"、"(济南)"→"济南"、"会议室:天津教室"→"天津")
  * **教室推断**: 如果文本中没有明确的城市信息,但有教室信息,尝试从教室名称中推断(如"无锡教室"→"无锡"、"天津教室"→"天津")
  * **未知情况**: 如果无法推断城市,则留空
- 客户名可能在金额信息中(如"韩开银 1600定金已付")
  * 客户名不能是课程名!如果识别出的名字看起来像课程名称(如"高定网T"、"LEC4"、"基础局"、"刘心班任"等),则留空
  * 如果没有明确客户名则留空- 账户余额提取规则:
  * 如果文本中包含"余额"关键词,提取最终的余额数字
  * 例1: "余额 6200抵扣 2400剩 3800" → accountBalance=3800
  * 例2: "余额 9200-3600=5600" → accountBalance=5600
  * 例3: "余额 8000-3000-3500=1500" → accountBalance=1500
  * 例4: "余额 9712-2400=7312" → accountBalance=7312
  * 如果没有提及余额,则accountBalance=0
- 老师费用提取规则(⚠️ 非常重要):
  * 查找"给老师"、"给XXX(老师名)"、"课时费"等关键词
  * "给老师300" → teacherFee=300 (不是车费!)
  * "绘老师400" → teacherFee=400 (不是车费!)
  * "给老师600" → teacherFee=600 (不是车费!)
  * **重点格式**: "给{老师名}{金额}" (如"给嫩嫩210"、"给嘴嘴200"、"给姜一1050") → 提取金额作为teacherFee
  * 如果有多次给老师费用,需要相加(如"已给老师4210再给老师450" = 4660)
  * 如果有加号表达式,需要计算总和(如"给老师1260+240+100" = 1600)
  * 注意: 老师名通常是2-3个字(如嫩嫩、嘴嘴、姜一、云云、声声),金额是紧跟其后的数字
- 车费提取规则(⚠️ 非常重要):
  * 只有明确包含"报销"、"车费"、"打车"、"酒店"等关键词才是车费
  * "报销老师100车费" → carFee=100
  * "老师打车100" → carFee=100
  * "给老师300" → carFee=0 (这是老师费用,不是车费!)
  * 如果同时提到酒店和车费,需要相加(如"240酒店+100老师打车" = 340)

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
                    accountBalance: { type: "number" },
                    paymentMethod: { type: "string" },
                    channelOrderNo: { type: "string" },
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
                    "accountBalance",
                    "paymentMethod",
                    "channelOrderNo",
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
      let corrected = text
        .replace(/瀑姬/g, "瀛姬")  // 瀑姬 → 瀛姬
        .replace(/嘅嘅/g, "嘟嘟")  // 嘅嘅 → 嘟嘟
        .replace(/赵赵/g, "昭昭")  // 赵赵 → 昭昭
        .replace(/朝朝/g, "昭昭"); // 朝朝 → 昭昭
      
      // 应用用户配置的错误映射
      for (const [wrongValue, correctValue] of Object.entries(errorMappings)) {
        const regex = new RegExp(wrongValue, 'g');
        corrected = corrected.replace(regex, correctValue);
      }
      
      return corrected;
    };

    // 费用后处理函数:从原始文本中提取老师费用和车费
    const extractFees = (text: string): { teacherFee: number; carFee: number } => {
      let teacherFee = 0;
      let carFee = 0;
      
      // 老师费用识别规则
      // 1. "给老师XXX" 或 "给XXX(老师名)"
      const teacherFeePattern1 = /给(?:老师|橘子|[\u4e00-\u9fa5]{2})\s*(\d+(?:\.\d+)?)/g;
      let match;
      while ((match = teacherFeePattern1.exec(text)) !== null) {
        teacherFee += parseFloat(match[1]);
      }
      
      // 2. "课时费XXX"
      const teacherFeePattern2 = /课时费\s*(\d+(?:\.\d+)?)/g;
      while ((match = teacherFeePattern2.exec(text)) !== null) {
        teacherFee += parseFloat(match[1]);
      }
      
      // 3. "给老师XXX+XXX+XXX=XXX" 形式(使用等号后的总数)
      const teacherFeePattern3 = /给老师[\s\d+.]+=(\d+(?:\.\d+)?)/g;
      while ((match = teacherFeePattern3.exec(text)) !== null) {
        // 如果有等号形式,使用等号后的总数替换之前的累加
        teacherFee = parseFloat(match[1]);
      }
      
      // 车费识别规则
      // 1. "报销老师XXX车费" 或 "老师打车XXX"
      const carFeePattern1 = /(?:报销老师|老师打车|车费)\s*(\d+(?:\.\d+)?)/g;
      while ((match = carFeePattern1.exec(text)) !== null) {
        carFee += parseFloat(match[1]);
      }
      
      // 2. "XXX酒店" 或 "客户报销酒店XXX"
      const carFeePattern2 = /(?:(\d+(?:\.\d+)?)酒店|客户报销酒店\s*(\d+(?:\.\d+)?))/g;
      while ((match = carFeePattern2.exec(text)) !== null) {
        carFee += parseFloat(match[1] || match[2]);
      }
      
      // 3. "酒店车费XXX"
      const carFeePattern3 = /酒店车费\s*(\d+(?:\.\d+)?)/g;
      while ((match = carFeePattern3.exec(text)) !== null) {
        carFee += parseFloat(match[1]);
      }
      
      return { teacherFee, carFee };
    };
    
    // 先纠错，然后验证客户名是否为老师名或课程名
    const courseKeywords = ["高定", "网T", "LEC", "基础局", "班任", "课程", "课"];
    const orders: ParsedGmailOrder[] = [];
    for (const order of parsed.orders) {
      let customerName = correctCommonErrors(order.customerName);
      
      // 如果客户名是老师名，则留空
      if (customerName && await isTeacherName(customerName)) {
        console.log(`[Gmail解析] 检测到客户名"${customerName}"是老师名，已留空`);
        customerName = '';
      }
      
      // 如果客户名是课程名，则留空
      if (customerName && courseKeywords.some(keyword => customerName.includes(keyword))) {
        console.log(`[Gmail解析] 检测到客户名"${customerName}"疑似课程名，已留空`);
        customerName = '';
      }
      
      // 从原始文本中提取费用信息(作为LLM解析的补充)
      // 尝试通过销售人员名、客户名、老师名和渠道订单号在原始文本中定位订单
      let orderText = '';
      let foundOrderText = false;
      
      // 策略1: 如果有渠道订单号,直接用渠道订单号定位(最准确)
      if (order.channelOrderNo && order.channelOrderNo.trim()) {
        const lines = emailContent.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes(order.channelOrderNo)) {
            orderText = line;
            foundOrderText = true;
            break;
          }
        }
      }
      
      // 策略2: 如果策略1失败,尝试通过销售人员名+日期定位并提取完整消息块
      if (!foundOrderText && order.salesperson && order.classDate) {
        // 从YYYY-MM-DD格式提取月日(如"2026-01-05" -> "1.5")
        let month = '';
        let day = '';
        const isoDateMatch = order.classDate.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (isoDateMatch) {
          month = String(parseInt(isoDateMatch[2], 10)); // 去掉前导0
          day = String(parseInt(isoDateMatch[3], 10));   // 去掉前导0
        }
        
        if (month && day) {
          const lines = emailContent.split('\n');
          let startIndex = -1;
          
          // 找到匹配的行索引
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // 匹配销售人员名和日期(支持"1.5"格式)
            const matchesSalesperson = line.includes(order.salesperson) && line.includes(`${month}.${day}`);
            // 也尝试匹配客户名和日期
            const matchesCustomer = customerName && line.includes(customerName) && line.includes(`${month}.${day}`);
            // 也尝试匹配老师名和日期
            const matchesTeacher = order.teacher && line.includes(order.teacher) && line.includes(`${month}.${day}`);
            
            if (matchesSalesperson || matchesCustomer || matchesTeacher) {
              startIndex = i;
              break;
            }
          }
          
          // 如果找到了匹配的行,提取从该行开始到下一个发送人之前的所有内容
          if (startIndex >= 0) {
            // 向前查找发送人+时间戳行(如"瀛姬喵喵12:00-21:00  00:43")
            let senderLineIndex = startIndex;
            for (let i = startIndex - 1; i >= 0; i--) {
              const line = lines[i].trim();
              // 匹配发送人格式: 包含中文名字和时间(如"12:00")
              if (line.match(/[\u4e00-\u9fa5]+.*\d{1,2}:\d{2}/)) {
                senderLineIndex = i;
                break;
              }
              // 如果遇到空行或分隔符,停止向前查找
              if (line === '' || line.startsWith('---')) {
                break;
              }
            }
            
            // 向后查找下一个发送人行或日期分隔符
            let endIndex = lines.length;
            for (let i = startIndex + 1; i < lines.length; i++) {
              const line = lines[i].trim();
              // 匹配下一个发送人格式
              if (line.match(/[一-龥]+.*\d{1,2}:\d{2}/)) {
                endIndex = i;
                break;
              }
              // 如果遇到日期分隔符(如"—————  2026-1-15  —————"),也停止提取
              if (line.startsWith('—') || line.startsWith('---')) {
                endIndex = i;
                break;
              }
            }
            
            // 提取从发送人行到下一个发送人之前的所有内容
            orderText = lines.slice(senderLineIndex, endIndex).join('\n').trim();
            foundOrderText = true;
          }
        }
      }
      
      // 策略3: 如果前两个策略都失败,使用LLM已经解析的费用,不再从原始文本提取
      // 这样可以避免从整个邮件内容中错误提取费用
      if (!foundOrderText) {
        // 使用空字符串,这样extractFees会返回0,不会影响LLM的解析结果
        orderText = '';
        console.warn(`[Gmail解析] 未找到订单原始文本: 销售=${order.salesperson}, 客户=${customerName}, 日期=${order.classDate}, 将使用LLM解析的费用`);
      }
      
      const extractedFees = extractFees(orderText);
      
      orders.push({
        ...order,
        salesperson: correctCommonErrors(order.salesperson),
        deviceWechat: correctCommonErrors(order.deviceWechat),
        customerName,
        teacher: correctCommonErrors(order.teacher),
        // 如果LLM返回的费用为0,使用正则提取的费用
        teacherFee: order.teacherFee > 0 ? order.teacherFee : extractedFees.teacherFee,
        carFee: order.carFee > 0 ? order.carFee : extractedFees.carFee,
        // ⚠️ 重要修复: notes字段也使用提取的orderText,确保每个订单的备注独立
        // 如果orderText提取成功,使用orderText;否则使用LLM返回的notes(而不是整个emailContent)
        notes: orderText || order.notes,
        // 保存该订单的原始文本(仅包含当前订单,不包含其他订单)
        originalText: orderText || order.notes,
      });
    }

    return orders;
  } catch (error) {
    console.error("解析Gmail订单失败:", error);
    throw new Error(`解析订单失败: ${error}`);
  }
}
