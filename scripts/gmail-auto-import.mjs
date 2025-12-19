#!/usr/bin/env node
/**
 * Gmail自动订单导入定时任务
 * 
 * 功能:
 * 1. 每天自动读取Gmail中的"打款群"邮件
 * 2. 解析邮件内容提取订单信息
 * 3. 自动录入到CRM系统数据库
 * 4. 记录处理日志
 * 
 * 使用方法:
 * node scripts/gmail-auto-import.mjs
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// 日志目录
const logDir = join(projectRoot, "logs");
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

// 日志文件
const logFile = join(logDir, `gmail-import-${new Date().toISOString().split("T")[0]}.log`);

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  writeFileSync(logFile, logMessage + "\n", { flag: "a" });
}

function error(message, err) {
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] ERROR: ${message}\n${err?.stack || err}`;
  console.error(errorMessage);
  writeFileSync(logFile, errorMessage + "\n", { flag: "a" });
}

async function main() {
  log("=".repeat(80));
  log("Gmail自动订单导入任务开始");
  log("=".repeat(80));

  try {
    // 1. 搜索包含"打款群"的邮件
    log("步骤1: 搜索Gmail邮件...");
    const searchResult = execSync(
      `manus-mcp-cli tool call gmail_search_messages --server gmail --input '{"q": "打款群", "max_results": 10}'`,
      { encoding: "utf-8", cwd: projectRoot }
    );
    
    log("搜索完成");
    
    // 2. 解析搜索结果
    const resultMatch = searchResult.match(/MCP tool invocation result saved to:\s*(.+\.json)/);
    if (!resultMatch) {
      log("未找到新邮件,任务结束");
      return;
    }
    
    const resultFile = resultMatch[1].trim();
    log(`读取搜索结果: ${resultFile}`);
    
    const searchData = JSON.parse(readFileSync(resultFile, "utf-8"));
    const threads = searchData.result?.threads || [];
    
    if (threads.length === 0) {
      log("未找到包含'打款群'的邮件,任务结束");
      return;
    }
    
    log(`找到 ${threads.length} 封邮件`);
    
    // 3. 读取每封邮件的详细内容
    for (const thread of threads) {
      try {
        log(`\n处理邮件: ${thread.id}`);
        log(`  主题: ${thread.subject}`);
        log(`  日期: ${thread.date}`);
        
        // 读取邮件完整内容
        const readResult = execSync(
          `manus-mcp-cli tool call gmail_read_threads --server gmail --input '{"thread_ids": ["${thread.id}"], "include_full_messages": true}'`,
          { encoding: "utf-8", cwd: projectRoot }
        );
        
        const readResultMatch = readResult.match(/MCP tool invocation result saved to:\s*(.+\.json)/);
        if (!readResultMatch) {
          log("  无法读取邮件内容,跳过");
          continue;
        }
        
        const readResultFile = readResultMatch[1].trim();
        const emailData = JSON.parse(readFileSync(readResultFile, "utf-8"));
        
        const messages = emailData.result?.[0]?.messages || [];
        if (messages.length === 0) {
          log("  邮件内容为空,跳过");
          continue;
        }
        
        const emailContent = messages[0].pickedMarkdownContent || messages[0].pickedPlainContent || "";
        if (!emailContent) {
          log("  无法提取邮件内容,跳过");
          continue;
        }
        
        log(`  邮件内容长度: ${emailContent.length} 字符`);
        
        // 4. 解析订单信息
        log("  解析订单信息...");
        
        // 这里需要调用解析API
        // 由于是独立脚本,我们使用HTTP请求调用tRPC API
        const parseResponse = await fetch("http://localhost:3000/api/trpc/gmailAutoImport.parseGmailEmail", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            emailContent,
          }),
        });
        
        if (!parseResponse.ok) {
          log(`  解析失败: HTTP ${parseResponse.status}`);
          continue;
        }
        
        const parseResult = await parseResponse.json();
        const orders = parseResult.result?.data?.orders || [];
        
        log(`  解析成功,提取 ${orders.length} 条订单`);
        
        if (orders.length === 0) {
          log("  未提取到订单信息,跳过");
          continue;
        }
        
        // 5. 批量创建订单
        log("  批量创建订单...");
        
        const createResponse = await fetch("http://localhost:3000/api/trpc/gmailAutoImport.batchCreateFromGmail", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orders,
          }),
        });
        
        if (!createResponse.ok) {
          log(`  创建订单失败: HTTP ${createResponse.status}`);
          continue;
        }
        
        const createResult = await createResponse.json();
        const { successCount, failCount, total } = createResult.result?.data || {};
        
        log(`  创建完成: 成功 ${successCount}/${total}, 失败 ${failCount}`);
        
      } catch (err) {
        error(`处理邮件 ${thread.id} 时出错`, err);
      }
    }
    
    log("\n" + "=".repeat(80));
    log("Gmail自动订单导入任务完成");
    log("=".repeat(80));
    
  } catch (err) {
    error("任务执行失败", err);
    process.exit(1);
  }
}

// 运行主函数
main().catch((err) => {
  error("未捕获的错误", err);
  process.exit(1);
});
