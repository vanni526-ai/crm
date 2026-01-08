#!/usr/bin/env node
/**
 * 批量重算所有订单的合伙人费用
 * 
 * 使用方法:
 * node scripts/recalculate-partner-fees.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import { orders, cityPartnerConfig } from "../drizzle/schema.js";
import { eq, and, isNotNull, or } from "drizzle-orm";

// 数据库连接
const db = drizzle(process.env.DATABASE_URL);

/**
 * 获取城市的合伙人费率配置
 */
async function getCityPartnerConfigByCity(city) {
  const configs = await db
    .select()
    .from(cityPartnerConfig)
    .where(and(
      eq(cityPartnerConfig.city, city),
      eq(cityPartnerConfig.isActive, true)
    ))
    .limit(1);
  
  return configs[0] || null;
}

/**
 * 计算合伙人费用
 */
async function calculatePartnerFee(city, courseAmount, teacherFee) {
  if (!city) return 0;
  
  const config = await getCityPartnerConfigByCity(city);
  if (!config) return 0;
  
  const rate = Number(config.partnerFeeRate) / 100;
  const baseRevenue = courseAmount - teacherFee;
  
  // 如果基础收益<=0，返回0
  if (baseRevenue <= 0) return 0;
  
  const partnerFee = baseRevenue * rate;
  
  return Math.round(partnerFee * 100) / 100; // 保留两位小数
}

/**
 * 批量重算所有订单的合伙人费
 */
async function recalculateAllPartnerFees() {
  console.log("开始批量重算合伙人费用...\n");
  
  // 查询所有需要重算的订单
  const allOrders = await db
    .select()
    .from(orders)
    .where(and(
      isNotNull(orders.deliveryCity),
      isNotNull(orders.courseAmount),
      isNotNull(orders.teacherFee)
    ));
  
  console.log(`找到 ${allOrders.length} 个订单需要重算合伙人费用\n`);
  
  let updatedCount = 0;
  let unchangedCount = 0;
  let errorCount = 0;
  
  const updates = [];
  
  for (const order of allOrders) {
    try {
      const courseAmount = parseFloat(order.courseAmount);
      const teacherFee = parseFloat(order.teacherFee || "0");
      
      // 计算新的合伙人费
      const newPartnerFee = await calculatePartnerFee(
        order.deliveryCity,
        courseAmount,
        teacherFee
      );
      
      const oldPartnerFee = parseFloat(order.partnerFee || "0");
      
      // 如果合伙人费有变化，记录更新
      if (Math.abs(newPartnerFee - oldPartnerFee) > 0.01) {
        updates.push({
          orderNo: order.orderNo,
          customerName: order.customerName,
          deliveryCity: order.deliveryCity,
          courseAmount: courseAmount,
          teacherFee: teacherFee,
          oldPartnerFee: oldPartnerFee,
          newPartnerFee: newPartnerFee,
        });
        
        // 更新数据库
        await db
          .update(orders)
          .set({ partnerFee: newPartnerFee.toString() })
          .where(eq(orders.id, order.id));
        
        updatedCount++;
      } else {
        unchangedCount++;
      }
    } catch (error) {
      console.error(`处理订单 ${order.orderNo} 时出错:`, error.message);
      errorCount++;
    }
  }
  
  // 输出更新报告
  console.log("\n========== 更新报告 ==========\n");
  console.log(`总订单数: ${allOrders.length}`);
  console.log(`已更新: ${updatedCount}`);
  console.log(`无需更新: ${unchangedCount}`);
  console.log(`错误: ${errorCount}`);
  console.log("\n========== 详细更新列表 ==========\n");
  
  if (updates.length > 0) {
    console.log("订单号 | 客户名 | 城市 | 课程金额 | 老师费用 | 旧合伙人费 | 新合伙人费");
    console.log("------|--------|------|----------|----------|------------|------------");
    
    updates.forEach(u => {
      console.log(
        `${u.orderNo} | ${u.customerName || '-'} | ${u.deliveryCity} | ` +
        `¥${u.courseAmount.toFixed(2)} | ¥${u.teacherFee.toFixed(2)} | ` +
        `¥${u.oldPartnerFee.toFixed(2)} | ¥${u.newPartnerFee.toFixed(2)}`
      );
    });
  } else {
    console.log("没有订单需要更新");
  }
  
  console.log("\n批量重算完成！");
}

// 执行脚本
recalculateAllPartnerFees()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("脚本执行失败:", error);
    process.exit(1);
  });
