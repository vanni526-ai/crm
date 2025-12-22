/**
 * 自动优化解析规则定时任务
 * 
 * 功能:
 * 1. 检查未学习的修正记录数量
 * 2. 当累积10条以上时自动触发优化
 * 3. 使用notifyOwner通知管理员查看优化结果
 * 
 * 使用方式:
 * node scripts/auto-optimize-parsing.mjs
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { parsingCorrections } from '../drizzle/schema.js';
import { eq } from 'drizzle-orm';
import { autoOptimizePrompt } from '../server/promptOptimizer.js';
import { notifyOwner } from '../server/_core/notification.js';

async function main() {
  console.log('[Auto-Optimize] 开始检查未学习的修正记录...');

  // 连接数据库
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  try {
    // 查询未学习的修正记录
    const unlearnedCorrections = await db
      .select()
      .from(parsingCorrections)
      .where(eq(parsingCorrections.isLearned, false));

    console.log(`[Auto-Optimize] 发现 ${unlearnedCorrections.length} 条未学习的修正记录`);

    // 如果累积10条以上,触发自动优化
    if (unlearnedCorrections.length >= 10) {
      console.log('[Auto-Optimize] 开始自动优化...');

      const result = await autoOptimizePrompt(10);

      console.log(`[Auto-Optimize] 优化完成:`);
      console.log(`  - 处理修正记录: ${result.correctionCount} 条`);
      console.log(`  - 生成新示例: ${result.newExamples.length} 个`);
      console.log(`  - 优化版本: ${result.version}`);
      console.log(`  - 优化类型: ${result.optimizationType}`);

      // 通知管理员
      const notified = await notifyOwner({
        title: '解析规则自动优化完成',
        content: `系统已自动优化解析规则:\n\n- 处理修正记录: ${result.correctionCount} 条\n- 生成新示例: ${result.newExamples.length} 个\n- 优化版本: ${result.version}\n- 优化类型: ${result.optimizationType}\n\n请前往"系统设置 > 解析学习"查看详细结果。`,
      });

      if (notified) {
        console.log('[Auto-Optimize] 已通知管理员');
      } else {
        console.log('[Auto-Optimize] 通知管理员失败(服务暂时不可用)');
      }
    } else {
      console.log(`[Auto-Optimize] 未达到优化阈值(10条),跳过优化`);
    }
  } catch (error) {
    console.error('[Auto-Optimize] 执行失败:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }

  console.log('[Auto-Optimize] 任务完成');
}

main();
