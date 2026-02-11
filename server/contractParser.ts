import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * 合同信息接口
 */
export interface ContractInfo {
  // 合同基本信息
  contractStartDate?: string; // YYYY-MM-DD
  contractEndDate?: string; // YYYY-MM-DD
  contractSignDate?: string; // YYYY-MM-DD
  
  // 股权结构
  equityRatioPartner?: number; // 合伙人工商股权比例（如60）
  equityRatioBrand?: number; // 品牌方工商股权比例（如40）
  
  // 分红比例
  profitRatioStage1Partner?: number; // 第1阶段合伙人分红比例（如30）
  profitRatioStage1Brand?: number;
  profitRatioStage2APartner?: number; // 第2阶段A合伙人分红比例（未回本）
  profitRatioStage2ABrand?: number;
  profitRatioStage2BPartner?: number; // 第2阶段B合伙人分红比例（已回本）
  profitRatioStage2BBrand?: number;
  profitRatioStage3Partner?: number; // 第3阶段合伙人分红比例
  profitRatioStage3Brand?: number;
  
  // 投资费用
  brandUsageFee?: number; // 品牌使用费
  brandAuthDeposit?: number; // 品牌授权押金
  managementFee?: number; // 管理费
  operationPositionFee?: number; // 运营岗位费
  teacherRecruitmentFee?: number; // 老师招聘及培训费
  marketingFee?: number; // 营销推广费
  
  // 固定成本预估
  totalEstimatedCost?: number; // 总预估成本
  
  // 收款账户信息
  partnerBankName?: string; // 合伙人开户行
  partnerBankAccount?: string; // 合伙人银行账号
  partnerAccountHolder?: string; // 合伙人账户名
  
  // 运营信息
  legalRepresentative?: string; // 法人代表
  
  // 分红支付规则
  profitPaymentDay?: number; // 每月分红支付日（如25）
}

/**
 * 上传合同文件到S3
 * @param fileBuffer 文件Buffer
 * @param fileName 文件名
 * @param partnerId 合伙人ID
 * @param cityId 城市ID
 * @returns S3文件URL
 */
export async function uploadContractFile(
  fileBuffer: Buffer,
  fileName: string,
  partnerId: number,
  cityId: number
): Promise<string> {
  // 生成唯一的文件key
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileKey = `contracts/partner-${partnerId}/city-${cityId}/${timestamp}-${randomSuffix}-${fileName}`;
  
  // 上传到S3
  const { url } = await storagePut(fileKey, fileBuffer, "application/pdf");
  
  return url;
}

/**
 * 从PDF文件中提取文本内容
 * @param fileBuffer PDF文件Buffer
 * @returns 提取的文本内容
 */
export async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
  try {
    // 加载PDF文档
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(fileBuffer),
      useSystemFonts: true,
    });
    
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    
    let fullText = "";
    
    // 遍历所有页面提取文本
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // 提取文本项并拼接
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      
      fullText += pageText + "\n";
    }
    
    return fullText.trim();
  } catch (error) {
    console.error("PDF文本提取失败:", error);
    throw new Error("无法提取PDF文本内容");
  }
}

/**
 * 使用LLM智能识别合同内容
 * @param contractText 合同文本内容
 * @returns 识别出的合同信息
 */
export async function parseContractWithLLM(contractText: string): Promise<ContractInfo> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `你是一个专业的合同信息提取助手，擅长从城市合伙人合作协议中提取关键信息。

请从合同中提取以下信息：
1. 合同期限（起始日期、结束日期、签署日期）
2. 工商股权比例（甲方和乙方的股权比例）
3. 分红比例（按阶段划分，注意分红比例与股权比例是独立的）
   - 第1阶段（0-12个月）：甲方和乙方的分红比例
   - 第2阶段A（13-24个月，未回本）：甲方和乙方的分红比例
   - 第2阶段B（13-24个月，已回本）：甲方和乙方的分红比例
   - 第3阶段（25个月后）：甲方和乙方的分红比例
4. 投资费用明细（品牌使用费、品牌授权押金、管理费、运营岗位费、老师招聘及培训费、营销推广费）
5. 固定成本预估（总预估成本，如"二押三租"费用）
6. 收款账户信息（乙方的开户行、账号、户名）
7. 运营信息（法人代表）
8. 分红支付规则（每月支付日）

注意：
- 所有金额单位统一为元（不要带单位）
- 所有比例统一为百分数（如30表示30%）
- 日期格式统一为YYYY-MM-DD
- 如果某个字段在合同中找不到，返回null
- 甲方通常是品牌方，乙方通常是合伙人`
      },
      {
        role: "user",
        content: `请从以下合同内容中提取关键信息：\n\n${contractText}`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "contract_info",
        strict: true,
        schema: {
          type: "object",
          properties: {
            contractStartDate: { type: ["string", "null"] },
            contractEndDate: { type: ["string", "null"] },
            contractSignDate: { type: ["string", "null"] },
            equityRatioPartner: { type: ["number", "null"] },
            equityRatioBrand: { type: ["number", "null"] },
            profitRatioStage1Partner: { type: ["number", "null"] },
            profitRatioStage1Brand: { type: ["number", "null"] },
            profitRatioStage2APartner: { type: ["number", "null"] },
            profitRatioStage2ABrand: { type: ["number", "null"] },
            profitRatioStage2BPartner: { type: ["number", "null"] },
            profitRatioStage2BBrand: { type: ["number", "null"] },
            profitRatioStage3Partner: { type: ["number", "null"] },
            profitRatioStage3Brand: { type: ["number", "null"] },
            brandUsageFee: { type: ["number", "null"] },
            brandAuthDeposit: { type: ["number", "null"] },
            managementFee: { type: ["number", "null"] },
            operationPositionFee: { type: ["number", "null"] },
            teacherRecruitmentFee: { type: ["number", "null"] },
            marketingFee: { type: ["number", "null"] },
            totalEstimatedCost: { type: ["number", "null"] },
            partnerBankName: { type: ["string", "null"] },
            partnerBankAccount: { type: ["string", "null"] },
            partnerAccountHolder: { type: ["string", "null"] },
            legalRepresentative: { type: ["string", "null"] },
            profitPaymentDay: { type: ["number", "null"] }
          },
          required: [],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== 'string') {
    throw new Error("LLM返回内容为空或格式错误");
  }

  const contractInfo: ContractInfo = JSON.parse(content);
  
  // 过滤掉null值
  const filteredInfo: ContractInfo = {};
  for (const [key, value] of Object.entries(contractInfo)) {
    if (value !== null) {
      filteredInfo[key as keyof ContractInfo] = value as any;
    }
  }
  
  return filteredInfo;
}

/**
 * 完整的合同上传和识别流程
 * @param fileBuffer PDF文件Buffer
 * @param fileName 文件名
 * @param partnerId 合伙人ID
 * @param cityId 城市ID
 * @returns 合同文件URL和识别出的合同信息
 */
export async function uploadAndParseContract(
  fileBuffer: Buffer,
  fileName: string,
  partnerId: number,
  cityId: number
): Promise<{ contractFileUrl: string; contractInfo: ContractInfo }> {
  // 1. 上传文件到S3
  const contractFileUrl = await uploadContractFile(fileBuffer, fileName, partnerId, cityId);
  
  // 2. 提取PDF文本
  const contractText = await extractTextFromPDF(fileBuffer);
  
  // 3. 使用LLM识别合同内容
  const contractInfo = await parseContractWithLLM(contractText);
  
  return {
    contractFileUrl,
    contractInfo
  };
}
