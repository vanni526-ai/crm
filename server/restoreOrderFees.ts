/**
 * 恢复被批量修正错误影响的订单费用数据
 * 从Gmail导入日志中读取原始解析数据,恢复正确的费用信息
 */

import { getDb } from './db';
import { orders, gmailImportLogs } from '../drizzle/schema';
import { eq, and, gte } from 'drizzle-orm';

export async function restoreOrderFeesFromGmail(): Promise<{
  total: number;
  restored: number;
  failed: number;
  details: Array<{ orderNo: string; status: string; message: string }>;
}> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    // 查询2026-01-05之后的Gmail导入日志
    const importLogs = await db
      .select()
      .from(gmailImportLogs)
      .where(
        and(
          eq(gmailImportLogs.status, 'success'),
          gte(gmailImportLogs.createdAt, new Date('2026-01-05'))
        )
      )
      .orderBy(gmailImportLogs.createdAt);

    console.log(`[数据恢复] 找到 ${importLogs.length} 条Gmail导入日志`);

    const details: Array<{ orderNo: string; status: string; message: string }> = [];
    let restored = 0;
    let failed = 0;

    for (const log of importLogs) {
      try {
        // 解析parsedData JSON
        const parsedData = typeof log.parsedData === 'string' 
          ? JSON.parse(log.parsedData) 
          : log.parsedData;

        if (!Array.isArray(parsedData)) {
          console.log(`[数据恢复] 日志${log.id}的parsedData不是数组,跳过`);
          continue;
        }

        // 遍历每个解析出的订单
        for (const orderData of parsedData) {
          const orderNo = orderData.orderNo;
          if (!orderNo) {
            continue;
          }

          // 查找对应的订单
          const existingOrders = await db
            .select()
            .from(orders)
            .where(eq(orders.orderNo, orderNo));

          if (existingOrders.length === 0) {
            console.log(`[数据恢复] 订单${orderNo}不存在,跳过`);
            continue;
          }

          const order = existingOrders[0];

          // 检查是否需要恢复(老师费用或车费为0)
          const needRestore = 
            order.teacherFee === '0.00' || 
            order.transportFee === '0.00' ||
            parseFloat(order.partnerFee || '0') < 0;

          if (!needRestore) {
            console.log(`[数据恢复] 订单${orderNo}费用正常,跳过`);
            continue;
          }

          // 从原始数据恢复费用
          const updateData: any = {};
          
          if (orderData.teacherFee !== undefined && orderData.teacherFee !== null) {
            updateData.teacherFee = parseFloat(orderData.teacherFee).toFixed(2);
          }
          
          if (orderData.transportFee !== undefined && orderData.transportFee !== null) {
            updateData.transportFee = parseFloat(orderData.transportFee).toFixed(2);
          }
          
          if (orderData.partnerFee !== undefined && orderData.partnerFee !== null) {
            updateData.partnerFee = parseFloat(orderData.partnerFee).toFixed(2);
          }

          // 执行更新
          if (Object.keys(updateData).length > 0) {
            await db
              .update(orders)
              .set(updateData)
              .where(eq(orders.id, order.id));

            restored++;
            details.push({
              orderNo,
              status: 'success',
              message: `恢复成功: 老师费用=${updateData.teacherFee || order.teacherFee}, 车费=${updateData.transportFee || order.transportFee}, 合伙人费=${updateData.partnerFee || order.partnerFee}`,
            });
            console.log(`[数据恢复] 订单${orderNo}恢复成功`);
          }
        }
      } catch (error) {
        failed++;
        console.error(`[数据恢复] 处理日志${log.id}失败:`, error);
      }
    }

    console.log(`[数据恢复] 完成: 总计${importLogs.length}条日志, 恢复${restored}个订单, 失败${failed}个`);

    return {
      total: importLogs.length,
      restored,
      failed,
      details,
    };
  } catch (error) {
    console.error('[数据恢复] 失败:', error);
    throw error;
  }
}
