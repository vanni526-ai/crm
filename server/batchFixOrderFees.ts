/**
 * 批量修正历史订单费用数据
 * 为所有有originalText但费用字段为0的订单重新提取老师费用、车费,并自动计算合伙人费
 */

import { getDb, calculatePartnerFee } from './db';
import { orders } from '../drizzle/schema';
import { eq, and, or, isNotNull } from 'drizzle-orm';

/**
 * 从原始文本中提取费用信息
 */
export function extractFeesFromText(text: string): { teacherFee: number; transportFee: number } {
  let teacherFee = 0;
  let transportFee = 0;
  
  if (!text) {
    return { teacherFee, transportFee };
  }
  
  // 老师费用识别规则
  // 1. "给老师XXX" 或 "给XXX(老师名)"
  const teacherFeePattern1 = /给(?:老师|橘子|[\u4e00-\u9fa5]{2})\s*(\d+(?:\.\d+)?)/g;
  let match;
  while ((match = teacherFeePattern1.exec(text)) !== null) {
    teacherFee += parseFloat(match[1]);
  }
  
  // 2. "课时费XXX"
  const teacherFeePattern2 = /课时费\s*(\d+(?:\.\d+)?)/g;
  while ((match = teacherFeePattern2.exec(text)) !== null) {
    teacherFee += parseFloat(match[1]);
  }
  
  // 3. "给老师XXX+XXX+XXX=XXX" 形式(使用等号后的总数)
  const teacherFeePattern3 = /给老师[\s\d+.]+=(\d+(?:\.\d+)?)/g;
  while ((match = teacherFeePattern3.exec(text)) !== null) {
    // 如果有等号形式,使用等号后的总数替换之前的累加
    teacherFee = parseFloat(match[1]);
  }
  
  // 车费识别规则(使用Set去重)
  const transportFeeMatches = new Set<number>();
  
  // 1. "酒店车费XXX" (优先匹配更具体的模式)
  const transportFeePattern3 = /酒店车费\s*(\d+(?:\.\d+)?)/g;
  while ((match = transportFeePattern3.exec(text)) !== null) {
    transportFeeMatches.add(parseFloat(match[1]));
  }
  
  // 2. "报销老师XXX车费"
  const transportFeePattern1a = /报销老师\s*(\d+(?:\.\d+)?)车费/g;
  while ((match = transportFeePattern1a.exec(text)) !== null) {
    transportFeeMatches.add(parseFloat(match[1]));
  }
  
  // 3. "老师打车XXX"
  const transportFeePattern1b = /老师打车\s*(\d+(?:\.\d+)?)/g;
  while ((match = transportFeePattern1b.exec(text)) !== null) {
    transportFeeMatches.add(parseFloat(match[1]));
  }
  
  // 4. "打车XXX" (不包含老师)
  const transportFeePattern4 = /(?<!老师)打车\s*(\d+(?:\.\d+)?)/g;
  while ((match = transportFeePattern4.exec(text)) !== null) {
    transportFeeMatches.add(parseFloat(match[1]));
  }
  
  // 5. "XXX酒店" 或 "客户报销酒店XXX"
  const transportFeePattern2 = /(?:(\d+(?:\.\d+)?)酒店|客户报销酒店\s*(\d+(?:\.\d+)?))/g;
  while ((match = transportFeePattern2.exec(text)) !== null) {
    transportFeeMatches.add(parseFloat(match[1] || match[2]));
  }
  
  // 求和
  transportFee = Array.from(transportFeeMatches).reduce((sum, val) => sum + val, 0);
  
  return { teacherFee, transportFee };
}

/**
 * 批量修正订单费用
 * @returns 修正的订单数量
 */
export async function batchFixOrderFees(): Promise<{
  total: number;
  updated: number;
  skipped: number;
  details: Array<{ orderId: number; orderNo: string; teacherFee: number; transportFee: number; partnerFee: number }>;
}> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    // 查询所有有notes但费用字段为0的订单(originalText存储在notes字段中)
    const ordersToFix = await db
      .select()
      .from(orders)
      .where(
        and(
          isNotNull(orders.notes),
          or(
            eq(orders.teacherFee, '0.00'),
            eq(orders.transportFee, '0.00')
          )
        )
      );

    console.log(`[批量修正] 找到 ${ordersToFix.length} 个需要修正费用的订单`);

    const details: Array<{ orderId: number; orderNo: string; teacherFee: number; transportFee: number; partnerFee: number }> = [];
    let updated = 0;
    let skipped = 0;

    for (const order of ordersToFix) {
      const originalText = order.notes || '';
      
      // 提取费用
      const { teacherFee, transportFee } = extractFeesFromText(originalText);
      
      // 计算合伙人费(如果有城市和课程金额)
      let partnerFee = 0;
      if (order.deliveryCity && order.courseAmount) {
        const courseAmount = parseFloat(order.courseAmount);
        partnerFee = await calculatePartnerFee(
          order.deliveryCity,
          courseAmount,
          teacherFee
        );
      }
      
      // 准备更新的字段(只更新提取到新值的字段)
      const updateData: any = {};
      
      // 只有提取到新的老师费用时才更新(避免清零)
      if (teacherFee > 0) {
        updateData.teacherFee = teacherFee.toFixed(2);
      }
      
      // 只有提取到新的车费时才更新(避免清零)
      if (transportFee > 0) {
        updateData.transportFee = transportFee.toFixed(2);
      }
      
      // 只有计算出新的合伙人费时才更新
      if (partnerFee > 0) {
        updateData.partnerFee = partnerFee.toFixed(2);
      }
      
      // 如果有任何字段需要更新,执行更新
      const needUpdate = Object.keys(updateData).length > 0;
      if (needUpdate) {
        await db
          .update(orders)
          .set(updateData)
          .where(eq(orders.id, order.id));
        
        details.push({
          orderId: order.id,
          orderNo: order.orderNo || '',
          teacherFee,
          transportFee,
          partnerFee,
        });
        
        updated++;
        console.log(`[批量修正] 订单 ${order.orderNo}: 老师费用=${teacherFee}, 车费=${transportFee}, 合伙人费=${partnerFee}`);
      } else {
        skipped++;
        console.log(`[批量修正] 订单 ${order.orderNo}: 未提取到费用信息,跳过`);
      }
    }

    console.log(`[批量修正] 完成: 总计${ordersToFix.length}个, 更新${updated}个, 跳过${skipped}个`);

    return {
      total: ordersToFix.length,
      updated,
      skipped,
      details,
    };
  } catch (error) {
    console.error('[批量修正] 失败:', error);
    throw error;
  }
}
