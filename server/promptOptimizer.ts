import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { parsingCorrections, promptOptimizationHistory } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * 分析用户修正数据,识别错误模式
 */
export async function analyzeCorrectionPatterns(corrections: any[]) {
  if (corrections.length === 0) {
    return { patterns: [], recommendations: [] };
  }

  // 准备分析数据
  const correctionSummary = corrections.map(c => ({
    field: c.fieldName,
    type: c.correctionType,
    original: c.originalText,
    llmValue: c.llmValue,
    correctedValue: c.correctedValue,
  }));

  // 使用LLM分析错误模式
  const analysisPrompt = `你是一个智能解析系统的优化专家。请分析以下用户修正记录,识别LLM解析中的错误模式。

用户修正记录(共${corrections.length}条):
${JSON.stringify(correctionSummary, null, 2)}

请分析:
1. 哪些字段最容易出错?
2. 错误的常见模式是什么?(格式识别错误、逻辑错误、字段遗漏等)
3. 针对每个错误模式,应该如何改进prompt?

请以JSON格式返回分析结果:
{
  "patterns": [
    {
      "field": "字段名",
      "errorType": "错误类型",
      "description": "错误模式描述",
      "frequency": "出现频率(高/中/低)",
      "examples": ["示例1", "示例2"]
    }
  ],
  "recommendations": [
    {
      "type": "add_example | update_rule | fix_error_pattern",
      "priority": "高/中/低",
      "description": "改进建议描述",
      "newExample": "建议添加的新示例(如果适用)"
    }
  ]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是一个智能解析系统的优化专家,擅长分析错误模式并提出改进建议。" },
        { role: "user", content: analysisPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "correction_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              patterns: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field: { type: "string" },
                    errorType: { type: "string" },
                    description: { type: "string" },
                    frequency: { type: "string" },
                    examples: {
                      type: "array",
                      items: { type: "string" }
                    }
                  },
                  required: ["field", "errorType", "description", "frequency", "examples"],
                  additionalProperties: false
                }
              },
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    priority: { type: "string" },
                    description: { type: "string" },
                    newExample: { type: "string" }
                  },
                  required: ["type", "priority", "description"],
                  additionalProperties: false
                }
              }
            },
            required: ["patterns", "recommendations"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    if (!content || typeof content !== 'string') {
      throw new Error("LLM返回空内容");
    }

    const analysis = JSON.parse(content);
    return analysis;
  } catch (error: any) {
    console.error("分析修正模式失败:", error);
    throw new Error(`分析失败: ${error.message}`);
  }
}

/**
 * 根据分析结果生成新的prompt示例
 */
export async function generatePromptExamples(recommendations: any[]) {
  const highPriorityRecs = recommendations.filter(r => r.priority === "高");
  
  if (highPriorityRecs.length === 0) {
    return [];
  }

  const examplePrompt = `基于以下改进建议,生成3-5个新的解析示例,用于优化智能登记的LLM prompt。

改进建议:
${JSON.stringify(highPriorityRecs, null, 2)}

请生成格式化的示例,每个示例包含:
- 原始文本(模拟真实的订单登记文本)
- 解析结果(JSON格式,包含所有关键字段)
- 注释(说明这个示例解决了什么问题)

返回JSON数组格式:
[
  {
    "text": "原始文本",
    "explanation": "解析说明",
    "highlights": "重点提示"
  }
]`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是一个智能解析系统的prompt工程师,擅长设计高质量的示例。" },
        { role: "user", content: examplePrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "prompt_examples",
          strict: true,
          schema: {
            type: "object",
            properties: {
              examples: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    explanation: { type: "string" },
                    highlights: { type: "string" }
                  },
                  required: ["text", "explanation", "highlights"],
                  additionalProperties: false
                }
              }
            },
            required: ["examples"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    if (!content || typeof content !== 'string') {
      throw new Error("LLM返回空内容");
    }

    const result = JSON.parse(content);
    return result.examples || [];
  } catch (error: any) {
    console.error("生成prompt示例失败:", error);
    throw new Error(`生成失败: ${error.message}`);
  }
}

/**
 * 自动优化prompt(主函数)
 */
export async function autoOptimizePrompt(minCorrections?: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 如果没有指定minCorrections,从配置中读取
  if (minCorrections === undefined) {
    const { parsingLearningConfig } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const configs = await db
      .select()
      .from(parsingLearningConfig)
      .where(eq(parsingLearningConfig.configKey, "auto_optimize_threshold"));

    if (configs.length > 0) {
      const configValue = JSON.parse(configs[0].configValue);
      minCorrections = configValue.threshold || 10;
    } else {
      minCorrections = 10; // 默认值
    }
  }

  // 获取未学习的修正记录
  const corrections = await db
    .select()
    .from(parsingCorrections)
    .where(eq(parsingCorrections.isLearned, false));

  if (corrections.length < minCorrections!) {
    return {
      success: false,
      message: `修正记录不足(当前${corrections.length}条,需要至少${minCorrections}条)`,
    };
  }

  // 分析错误模式
  const analysis = await analyzeCorrectionPatterns(corrections);

  // 生成新示例
  const newExamples = await generatePromptExamples(analysis.recommendations);

  if (newExamples.length === 0) {
    return {
      success: false,
      message: "没有生成新的示例",
      analysis,
    };
  }

  // 生成版本号
  const latestVersion = await db
    .select()
    .from(promptOptimizationHistory)
    .orderBy((t: any) => t.createdAt)
    .limit(1);

  const versionNum = latestVersion.length > 0 
    ? parseInt(latestVersion[0].version.replace('v', '')) + 1 
    : 1;
  const version = `v${versionNum}`;

  // 保存优化记录
  await db.insert(promptOptimizationHistory).values([{
    version,
    optimizationType: 'add_example',
    changeDescription: `基于${corrections.length}条用户修正,添加${newExamples.length}个新示例`,
    newExamples: JSON.stringify(newExamples),
    correctionCount: corrections.length,
    isActive: true,
    createdBy: 0, // 系统自动
  }]);

  // 标记修正记录为已学习
  for (const correction of corrections) {
    await db
      .update(parsingCorrections)
      .set({
        isLearned: true,
        learnedAt: new Date(),
      })
      .where(eq(parsingCorrections.id, correction.id));
  }

  return {
    success: true,
    version,
    analysis,
    newExamples,
    correctionCount: corrections.length,
  };
}
