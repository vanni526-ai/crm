import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { getToken } from "@/lib/api-client";

/**
 * tRPC React client - 直连 CRM 后端
 * Token 通过 URL 参数 + Authorization header 双重传递
 */
export const trpc: any = createTRPCReact<any>();

/** CRM 后端 tRPC 地址 */
const CRM_TRPC_URL = "https://crm.bdsm.com.cn/api/trpc";

/**
 * 创建 tRPC 客户端 - 直连 CRM 后端
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: CRM_TRPC_URL,
        transformer: superjson,
        async headers() {
          const token = await getToken();
          if (token) {
            return {
              Authorization: `Bearer ${token}`,
              "X-Auth-Token": token,
            };
          }
          return {};
        },
        async fetch(url, options) {
          // 在URL中附加token参数（CRM后端通过URL参数验证token）
          let finalUrl = typeof url === "string" ? url : url.toString();

          // 方式1: 从headers中提取token
          const headers = options?.headers as
            | Record<string, string>
            | undefined;
          let token = headers?.["X-Auth-Token"] || headers?.["x-auth-token"];

          // 方式2: 如果headers中没有，直接从存储获取
          if (!token) {
            try {
              token = (await getToken()) || "";
            } catch {
              token = "";
            }
          }

          if (token) {
            const separator = finalUrl.includes("?") ? "&" : "?";
            finalUrl = `${finalUrl}${separator}token=${encodeURIComponent(token)}`;
          }

          return fetch(finalUrl, {
            ...options,
          });
        },
      }),
    ],
  });
}
