// LLM功能已在迁移阿里云阶段暂时禁用
// 迁移稳定后可接入通义千问API重新启用

/**
 * 分析纠错模式（LLM功能暂时禁用）
 */
export async function analyzeCorrectionPatterns(corrections: any[]): Promise<any[]> {
  // LLM分析已禁用
  return [];
}

/**
 * 生成Prompt示例（LLM功能暂时禁用）
 */
export async function generatePromptExamples(recommendations: any[]): Promise<any[]> {
  // LLM生成已禁用
  return [];
}

/**
 * 自动优化Prompt（LLM功能暂时禁用）
 */
export async function autoOptimizePrompt(minCorrections?: number): Promise<{
  success: boolean;
  message: string;
  optimizedPrompt?: string;
}> {
  return {
    success: false,
    message: "Prompt自动优化功能暂时不可用（系统维护中）",
  };
}
