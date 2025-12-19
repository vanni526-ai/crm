/**
 * Gmail导入周报脚本
 * 每周一早上9点运行,统计上周的Gmail订单导入情况并发送通知
 */

import { getAllGmailImportLogs } from '../server/db';
import { notifyOwner } from '../server/_core/notification';

async function generateWeeklyReport() {
  try {
    console.log('开始生成Gmail导入周报...');

    // 计算上周的开始和结束时间(周一00:00到周日23:59)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=周日, 1=周一, ...
    const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek + 6; // 距离上周一的天数
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - daysToLastMonday);
    lastMonday.setHours(0, 0, 0, 0);
    
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);

    console.log(`统计周期: ${lastMonday.toLocaleDateString('zh-CN')} 至 ${lastSunday.toLocaleDateString('zh-CN')}`);

    // 查询上周的导入记录
    const allLogs = await getAllGmailImportLogs();
    const logs = allLogs.filter(log => {
      const logTime = new Date(log.emailDate).getTime();
      return logTime >= lastMonday.getTime() && logTime <= lastSunday.getTime();
    });

    console.log(`查询到 ${logs.length} 条导入记录`);

    // 统计数据
    const totalImports = logs.length;
    const successfulImports = logs.filter(log => log.status === 'success').length;
    const failedImports = logs.filter(log => log.status === 'failed').length;
    const partialImports = logs.filter(log => log.status === 'partial').length;
    const totalOrders = logs.reduce((sum, log) => sum + (log.successOrders || 0), 0);
    const failedOrders = logs.reduce((sum, log) => sum + (log.failedOrders || 0), 0);
    const successRate = totalImports > 0 
      ? ((successfulImports / totalImports) * 100).toFixed(1) 
      : '0.0';

    // 生成周报内容
    const reportTitle = `📊 Gmail订单导入周报 (${lastMonday.toLocaleDateString('zh-CN')} - ${lastSunday.toLocaleDateString('zh-CN')})`;
    
    const reportContent = `
## 导入概况

- **总导入次数**: ${totalImports} 次
- **成功导入**: ${successfulImports} 次
- **部分成功**: ${partialImports} 次
- **失败导入**: ${failedImports} 次
- **成功率**: ${successRate}%

## 订单统计

- **成功创建订单**: ${totalOrders} 个
- **创建失败订单**: ${failedOrders} 个

## 详细记录

${logs.length > 0 ? logs.map((log, index) => `
${index + 1}. ${new Date(log.emailDate).toLocaleString('zh-CN')}
   - 状态: ${log.status === 'success' ? '✅ 成功' : log.status === 'partial' ? '⚠️ 部分成功' : '❌ 失败'}
   - 订单: ${log.successOrders || 0} 成功 / ${log.failedOrders || 0} 失败
   ${log.errorLog ? `- 错误: ${log.errorLog.split('\n')[0]}` : ''}
`).join('\n') : '本周无导入记录'}

---
*此周报由系统自动生成，每周一早上9点发送*
`;

    console.log('周报内容生成完成');
    console.log(reportContent);

    // 发送通知
    const notified = await notifyOwner({
      title: reportTitle,
      content: reportContent,
    });
    
    if (notified) {
      console.log('✅ 周报已成功发送');
    } else {
      console.error('❌ 周报发送失败');
    }

    return {
      success: true,
      stats: {
        totalImports,
        successfulImports,
        failedImports,
        partialImports,
        totalOrders,
        failedOrders,
        successRate: `${successRate}%`,
      },
    };
  } catch (error: any) {
    console.error('生成周报失败:', error);
    
    // 发送错误通知
    await notifyOwner({
      title: '⚠️ Gmail导入周报生成失败',
      content: `周报生成过程中发生错误:\n\n${error.message}\n\n请检查系统日志。`,
    });
    
    return {
      success: false,
      error: error.message,
    };
  }
}

// 执行周报生成
generateWeeklyReport()
  .then(result => {
    console.log('周报生成结果:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
