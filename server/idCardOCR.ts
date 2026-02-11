/**
 * 身份证OCR识别服务
 * 使用LLM进行图片识别，提取姓名和身份证号码
 */

import { invokeLLM } from "./_core/llm";

export interface IDCardOCRResult {
  name: string;
  idCardNumber: string;
  success: boolean;
  error?: string;
}

/**
 * 识别身份证照片中的姓名和身份证号码
 * @param imageUrl 身份证照片的URL（支持正面和反面）
 * @returns 识别结果
 */
export async function recognizeIDCard(imageUrl: string): Promise<IDCardOCRResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个专业的身份证OCR识别助手。请从图片中提取姓名和身份证号码，并以JSON格式返回。如果无法识别，请返回空字符串。"
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "请识别这张身份证照片中的姓名和身份证号码。"
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "id_card_info",
          strict: true,
          schema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "身份证上的姓名"
              },
              idCardNumber: {
                type: "string",
                description: "身份证号码（18位）"
              }
            },
            required: ["name", "idCardNumber"],
            additionalProperties: false
          }
        }
      }
    });

    const message = response.choices[0]?.message;
    if (!message?.content) {
      return {
        name: "",
        idCardNumber: "",
        success: false,
        error: "LLM返回内容为空"
      };
    }

    // 提取content，处理可能的数组格式
    let contentText = "";
    if (typeof message.content === "string") {
      contentText = message.content;
    } else if (Array.isArray(message.content)) {
      // 如果是数组，提取第一个text类型的内容
      const textContent = message.content.find(c => c.type === "text");
      if (textContent && "text" in textContent) {
        contentText = textContent.text;
      }
    }
    
    if (!contentText) {
      return {
        name: "",
        idCardNumber: "",
        success: false,
        error: "LLM返回内容为空"
      };
    }
    
    const result = JSON.parse(contentText);
    
    // 验证身份证号码格式（18位，最后一位可能是X）
    const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
    if (result.idCardNumber && !idCardRegex.test(result.idCardNumber)) {
      return {
        name: result.name || "",
        idCardNumber: result.idCardNumber || "",
        success: false,
        error: "身份证号码格式不正确"
      };
    }

    return {
      name: result.name || "",
      idCardNumber: result.idCardNumber || "",
      success: true
    };
  } catch (error) {
    console.error("身份证OCR识别失败:", error);
    return {
      name: "",
      idCardNumber: "",
      success: false,
      error: error instanceof Error ? error.message : "未知错误"
    };
  }
}
