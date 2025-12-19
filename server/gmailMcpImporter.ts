import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * 使用MCP工具搜索Gmail邮件
 */
export async function searchGmailMessages(query: string = "", maxResults: number = 10) {
  try {
    const input = JSON.stringify({ query, maxResults });
    const command = `manus-mcp-cli tool call gmail_search_messages --server gmail --input '${input}'`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error("MCP stderr:", stderr);
    }

    // 解析MCP返回的结果
    const lines = stdout.trim().split("\n");
    const resultLine = lines.find(line => line.includes("result_file_path"));
    
    if (!resultLine) {
      throw new Error("未找到MCP结果文件路径");
    }

    const match = resultLine.match(/result_file_path="([^"]+)"/);
    if (!match) {
      throw new Error("无法解析MCP结果文件路径");
    }

    const resultFilePath = match[1];
    
    // 读取结果文件
    const fs = await import("fs/promises");
    const resultContent = await fs.readFile(resultFilePath, "utf-8");
    const result = JSON.parse(resultContent);

    return result;
  } catch (error: any) {
    console.error("搜索Gmail邮件失败:", error);
    throw new Error(`搜索Gmail邮件失败: ${error.message}`);
  }
}

/**
 * 使用MCP工具读取Gmail邮件线程
 */
export async function readGmailThread(threadId: string) {
  try {
    const input = JSON.stringify({ threadIds: [threadId] });
    const command = `manus-mcp-cli tool call gmail_read_threads --server gmail --input '${input}'`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error("MCP stderr:", stderr);
    }

    // 解析MCP返回的结果
    const lines = stdout.trim().split("\n");
    const resultLine = lines.find(line => line.includes("result_file_path"));
    
    if (!resultLine) {
      throw new Error("未找到MCP结果文件路径");
    }

    const match = resultLine.match(/result_file_path="([^"]+)"/);
    if (!match) {
      throw new Error("无法解析MCP结果文件路径");
    }

    const resultFilePath = match[1];
    
    // 读取结果文件
    const fs = await import("fs/promises");
    const resultContent = await fs.readFile(resultFilePath, "utf-8");
    const result = JSON.parse(resultContent);

    return result;
  } catch (error: any) {
    console.error("读取Gmail邮件失败:", error);
    throw new Error(`读取Gmail邮件失败: ${error.message}`);
  }
}

/**
 * 从邮件中提取文本内容
 */
export function extractEmailContent(emailData: any): string {
  if (!emailData || !emailData.threads || emailData.threads.length === 0) {
    return "";
  }

  const thread = emailData.threads[0];
  const messages = thread.messages || [];
  
  let content = "";
  for (const message of messages) {
    if (message.textContent) {
      content += message.textContent + "\n\n";
    }
  }

  return content.trim();
}
