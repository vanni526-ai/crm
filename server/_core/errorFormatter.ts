import { TRPCError } from "@trpc/server";

/**
 * 全局tRPC错误格式化器
 * 确保所有错误都返回JSON格式
 */
export function formatError(opts: {
  error: TRPCError;
  type: 'query' | 'mutation' | 'subscription' | 'unknown';
  path: string | undefined;
  input: unknown;
  ctx: any;
  shape: any;
}) {
  const { error, type, path, input } = opts;
  
  // 记录详细的错误日志
  console.error(`[tRPC Error] ${type} ${path}:`, {
    code: error.code,
    message: error.message,
    input,
    cause: error.cause,
    stack: error.stack,
  });
  
  // 记录完整的错误对象用于调试
  console.error('[tRPC Error Full]', JSON.stringify({
    code: error.code,
    message: error.message,
    name: error.name,
    cause: error.cause instanceof Error ? {
      message: error.cause.message,
      stack: error.cause.stack,
    } : error.cause,
  }, null, 2));
  
  // 返回格式化的错误响应
  return {
    ...opts.shape,
    data: {
      ...opts.shape.data,
      // 确保错误信息对前端友好
      httpStatus: getHttpStatusFromErrorCode(error.code),
    },
  };
}

/**
 * 将tRPC错误代码映射到HTTP状态码
 */
function getHttpStatusFromErrorCode(code: TRPCError['code']): number {
  const statusMap: Partial<Record<TRPCError['code'], number>> = {
    PARSE_ERROR: 400,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_SUPPORTED: 405,
    TIMEOUT: 408,
    CONFLICT: 409,
    PRECONDITION_FAILED: 412,
    PAYLOAD_TOO_LARGE: 413,
    UNPROCESSABLE_CONTENT: 422,
    TOO_MANY_REQUESTS: 429,
    CLIENT_CLOSED_REQUEST: 499,
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
  };
  
  return statusMap[code] || 500;
}
