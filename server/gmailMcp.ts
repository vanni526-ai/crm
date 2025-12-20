/**
 * Gmail MCP工具封装
 * 通过MCP Gmail服务器调用Gmail API
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Gmail邮件搜索结果
 */
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
}

/**
 * Gmail线程详情
 */
export interface GmailThread {
  id: string;
  messages: Array<{
    id: string;
    threadId: string;
    labelIds?: string[];
    snippet?: string;
    payload?: {
      headers?: Array<{
        name: string;
        value: string;
      }>;
      body?: {
        data?: string;
      };
      parts?: Array<{
        mimeType?: string;
        body?: {
          data?: string;
        };
      }>;
    };
    internalDate?: string;
  }>;
}

/**
 * 搜索Gmail邮件
 * @param query Gmail搜索查询语法 (例如: "from:user@example.com subject:订单 after:2024/01/01")
 * @param maxResults 最大结果数 (默认50, 最大500)
 * @returns 邮件列表
 */
export async function searchGmailMessages(
  query?: string,
  maxResults: number = 50
): Promise<GmailMessage[]> {
  try {
    const input = JSON.stringify({
      q: query,
      max_results: Math.min(maxResults, 500),
    });

    const { stdout } = await execAsync(
      `manus-mcp-cli tool call gmail_search_messages --server gmail --input '${input}'`
    );

    const result = JSON.parse(stdout);
    
    // MCP返回格式: { content: [{ type: "text", text: JSON字符串 }] }
    if (result.content && result.content[0] && result.content[0].text) {
      const data = JSON.parse(result.content[0].text);
      return data.messages || [];
    }

    return [];
  } catch (error) {
    console.error("搜索Gmail邮件失败:", error);
    throw new Error(`搜索Gmail邮件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 读取Gmail线程详情
 * @param threadIds 线程ID数组 (最多100个)
 * @param includeFullMessages 是否包含完整消息内容 (默认true)
 * @returns 线程详情列表
 */
export async function readGmailThreads(
  threadIds: string[],
  includeFullMessages: boolean = true
): Promise<GmailThread[]> {
  try {
    if (threadIds.length === 0) {
      return [];
    }

    if (threadIds.length > 100) {
      throw new Error("一次最多读取100个线程");
    }

    const input = JSON.stringify({
      thread_ids: threadIds,
      include_full_messages: includeFullMessages,
    });

    const { stdout } = await execAsync(
      `manus-mcp-cli tool call gmail_read_threads --server gmail --input '${input}'`
    );

    const result = JSON.parse(stdout);
    
    // MCP返回格式: { content: [{ type: "text", text: JSON字符串 }] }
    if (result.content && result.content[0] && result.content[0].text) {
      const data = JSON.parse(result.content[0].text);
      return data.threads || [];
    }

    return [];
  } catch (error) {
    console.error("读取Gmail线程失败:", error);
    throw new Error(`读取Gmail线程失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 从Gmail邮件头中提取指定字段
 * @param headers 邮件头数组
 * @param name 字段名 (例如: "Subject", "From", "Message-ID")
 * @returns 字段值,如果不存在返回undefined
 */
export function getHeaderValue(
  headers: Array<{ name: string; value: string }> | undefined,
  name: string
): string | undefined {
  if (!headers) return undefined;
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header?.value;
}

/**
 * 从Gmail邮件中提取纯文本内容
 * @param message Gmail消息对象
 * @returns 邮件的纯文本内容
 */
export function extractEmailBody(message: GmailThread["messages"][0]): string {
  if (!message.payload) return "";

  // 尝试从body中获取
  if (message.payload.body?.data) {
    return Buffer.from(message.payload.body.data, "base64").toString("utf-8");
  }

  // 尝试从parts中获取text/plain部分
  if (message.payload.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
    }

    // 如果没有text/plain,尝试获取text/html
    for (const part of message.payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const html = Buffer.from(part.body.data, "base64").toString("utf-8");
        // 简单的HTML标签移除(实际使用中可能需要更复杂的HTML解析)
        return html.replace(/<[^>]*>/g, "").trim();
      }
    }
  }

  return "";
}

/**
 * 从Gmail邮件中提取发件人邮箱地址
 * @param fromHeader From头的值 (例如: "John Doe <john@example.com>")
 * @returns 邮箱地址
 */
export function extractEmailAddress(fromHeader: string): string {
  const match = fromHeader.match(/<(.+?)>/);
  return match ? match[1] : fromHeader;
}
