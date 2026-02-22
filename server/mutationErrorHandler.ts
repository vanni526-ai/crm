import { TRPCError } from "@trpc/server";

/**
 * Mutation错误处理包装函数
 * 确保所有mutation错误都返回JSON格式而不是HTML 500错误
 */
export async function withMutationErrorHandling<T>(
  mutationName: string,
  handler: () => Promise<T>,
  input?: any
): Promise<T> {
  try {
    console.log(`[Mutation] ${mutationName} 开始`, input ? { input } : '');
    const result = await handler();
    console.log(`[Mutation] ${mutationName} 成功`);
    return result;
  } catch (error) {
    console.error(`[Mutation] ${mutationName} 失败:`, error);
    
    // 如果已经是TRPCError,直接抛出
    if (error instanceof TRPCError) {
      throw error;
    }
    
    // 否则包装成TRPCError
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : '操作失败',
      cause: error,
    });
  }
}
