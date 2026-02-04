/**
 * CRM内容生成服务
 * 基于compact-content-generation Skill的最佳实践
 * 
 * 功能:
 * 1. 课程介绍文案生成
 * 2. 营销短信/邮件生成
 * 3. 客户跟进话术生成
 */

import { invokeLLM } from "./_core/llm";

// ==================== 类型定义 ====================

export interface CourseIntroParams {
  courseName: string;
  courseType?: string;
  targetAudience?: string;
  highlights?: string[];
  duration?: string;
  price?: number;
}

export interface MarketingMessageParams {
  type: "sms" | "email";
  purpose: "promotion" | "reminder" | "followup" | "holiday";
  customerName?: string;
  courseName?: string;
  discount?: string;
  deadline?: string;
  customContent?: string;
}

export interface FollowUpScriptParams {
  customerName: string;
  customerStatus: "new" | "interested" | "hesitant" | "inactive";
  lastContact?: string;
  previousCourse?: string;
  notes?: string;
}

// ==================== 内容生成函数 ====================

/**
 * 生成课程介绍文案
 */
export async function generateCourseIntro(params: CourseIntroParams): Promise<string> {
  const prompt = buildCourseIntroPrompt(params);
  
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `你是一位专业的课程营销文案撰写专家。你的任务是为课程创建吸引人的介绍文案。

写作原则:
1. 语言自然流畅,避免生硬的营销腔调
2. 突出课程的独特价值和学员收益
3. 使用具体的细节和案例,而非空泛的描述
4. 适当使用情感化语言,但不过度煽情
5. 控制在300-500字之间

避免:
- 使用星号(*)强调
- 过于正式的语言
- 重复的句式结构
- 空洞的形容词堆砌`
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const content = response.choices[0].message.content;
  return typeof content === 'string' ? content : '';
}

/**
 * 生成营销短信/邮件
 */
export async function generateMarketingMessage(params: MarketingMessageParams): Promise<string> {
  const prompt = buildMarketingPrompt(params);
  
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: params.type === "sms" 
          ? `你是一位专业的短信营销文案撰写专家。

写作原则:
1. 控制在70字以内(短信字数限制)
2. 开头直接点明主题
3. 包含明确的行动号召
4. 语言简洁有力

格式要求:
- 不使用任何特殊符号
- 不使用表情符号
- 结尾留联系方式或链接占位符`
          : `你是一位专业的邮件营销文案撰写专家。

写作原则:
1. 主题行吸引人且简洁
2. 正文结构清晰
3. 包含明确的行动号召
4. 语言专业但不生硬

格式要求:
- 提供邮件主题和正文
- 正文控制在200-400字
- 结尾包含签名占位符`
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const content = response.choices[0].message.content;
  return typeof content === 'string' ? content : '';
}

/**
 * 生成客户跟进话术
 */
export async function generateFollowUpScript(params: FollowUpScriptParams): Promise<string> {
  const prompt = buildFollowUpPrompt(params);
  
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `你是一位经验丰富的课程销售顾问。你的任务是为销售人员提供个性化的客户跟进话术。

写作原则:
1. 根据客户状态调整沟通策略
2. 语言自然,像朋友间的对话
3. 提供具体的话术示例
4. 包含可能的客户异议及应对方法

输出格式:
1. 开场白(2-3种选择)
2. 核心话术
3. 常见异议应对
4. 结束语建议`
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const content = response.choices[0].message.content;
  return typeof content === 'string' ? content : '';
}

// ==================== Prompt构建函数 ====================

function buildCourseIntroPrompt(params: CourseIntroParams): string {
  let prompt = `请为以下课程撰写一段吸引人的介绍文案:

课程名称: ${params.courseName}`;

  if (params.courseType) {
    prompt += `\n课程类型: ${params.courseType}`;
  }
  if (params.targetAudience) {
    prompt += `\n目标受众: ${params.targetAudience}`;
  }
  if (params.highlights && params.highlights.length > 0) {
    prompt += `\n课程亮点: ${params.highlights.join("、")}`;
  }
  if (params.duration) {
    prompt += `\n课程时长: ${params.duration}`;
  }
  if (params.price) {
    prompt += `\n课程价格: ¥${params.price}`;
  }

  return prompt;
}

function buildMarketingPrompt(params: MarketingMessageParams): string {
  const purposeMap = {
    promotion: "促销活动",
    reminder: "课程提醒",
    followup: "客户跟进",
    holiday: "节日问候"
  };

  let prompt = `请撰写一条${params.type === "sms" ? "短信" : "邮件"}，目的是: ${purposeMap[params.purpose]}`;

  if (params.customerName) {
    prompt += `\n客户姓名: ${params.customerName}`;
  }
  if (params.courseName) {
    prompt += `\n相关课程: ${params.courseName}`;
  }
  if (params.discount) {
    prompt += `\n优惠信息: ${params.discount}`;
  }
  if (params.deadline) {
    prompt += `\n截止时间: ${params.deadline}`;
  }
  if (params.customContent) {
    prompt += `\n补充信息: ${params.customContent}`;
  }

  return prompt;
}

function buildFollowUpPrompt(params: FollowUpScriptParams): string {
  const statusMap = {
    new: "新客户(首次接触)",
    interested: "有意向客户(表达过兴趣)",
    hesitant: "犹豫客户(有顾虑未下单)",
    inactive: "沉默客户(长时间未联系)"
  };

  let prompt = `请为以下客户生成跟进话术:

客户姓名: ${params.customerName}
客户状态: ${statusMap[params.customerStatus]}`;

  if (params.lastContact) {
    prompt += `\n上次联系: ${params.lastContact}`;
  }
  if (params.previousCourse) {
    prompt += `\n之前咨询的课程: ${params.previousCourse}`;
  }
  if (params.notes) {
    prompt += `\n备注信息: ${params.notes}`;
  }

  return prompt;
}

// ==================== 批量生成函数 ====================

/**
 * 批量生成营销短信
 */
export async function batchGenerateMarketingMessages(
  customers: Array<{ name: string; phone: string }>,
  template: Omit<MarketingMessageParams, "customerName">
): Promise<Array<{ name: string; phone: string; message: string }>> {
  const results = [];
  
  for (const customer of customers) {
    const message = await generateMarketingMessage({
      ...template,
      customerName: customer.name
    });
    
    results.push({
      name: customer.name,
      phone: customer.phone,
      message
    });
  }
  
  return results;
}
