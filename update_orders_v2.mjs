#!/usr/bin/env node
/**
 * 订单数据批量更新脚本 (ES Module版本)
 * 从Excel文件读取规整后的订单数据，更新数据库中的所有订单记录
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import mysql from 'mysql2/promise';
import XLSX from 'xlsx';

// 数据库配置
const DB_URL = process.env.DATABASE_URL || '';

async function loadExcelData(filePath) {
  console.log('📂 正在读取Excel文件...');
  
  // 读取Excel文件
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  // 使用创建时间填充空的支付日期
  console.log('🔄 使用创建时间填充空的支付日期...');
  data.forEach(row => {
    if (!row['支付日期'] && row['创建时间']) {
      row['支付日期'] = row['创建时间'];
    }
  });
  
  console.log(`✅ 成功读取 ${data.length} 条订单记录`);
  return data;
}

function parseDate(value) {
  if (!value) return null;
  
  // 如果是Excel日期序列号
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  
  // 如果是Date对象
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  
  // 如果是字符串
  if (typeof value === 'string') {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {}
  }
  
  return null;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

function mapExcelToDbFields(row) {
  /**
   * 将Excel行数据映射到数据库字段
   * 注意：数据库字段名使用camelCase
   */
  return {
    orderNo: row['订单号'] || null,
    salesPerson: row['销售人'] || null,
    trafficSource: row['流量来源'] || null,
    customerName: row['客户名'] || null,
    courseAmount: parseNumber(row['课程金额']),
    paymentAmount: parseNumber(row['支付金额']),
    finalAmount: parseNumber(row['金串到账金额']),
    balanceAmount: parseNumber(row['尾款金额']),
    accountBalance: parseNumber(row['账户余额']),
    teacherFee: parseNumber(row['老师费用']),
    transportFee: parseNumber(row['车费']),
    otherFee: parseNumber(row['其他费用']),
    consumablesFee: parseNumber(row['耗材费用']),
    rentFee: parseNumber(row['房租费用']),
    propertyFee: parseNumber(row['物业费用']),
    utilityFee: parseNumber(row['水电费用']),
    partnerFee: parseNumber(row['合伙人费用']),
    paymentChannel: row['支付渠道'] || null,
    channelOrderNo: row['渠道订单号'] || null,
    paymentDate: parseDate(row['支付日期']),
    paymentTime: row['支付时间'] || null,
    classDate: parseDate(row['上课日期']),
    classTime: row['上课时间'] || null,
    deliveryCity: row['交付城市'] || null,
    deliveryRoom: row['交付教室'] || null,
    deliveryClassroomId: row['交付教室ID'] ? parseInt(row['交付教室ID']) : null,
    deliveryTeacher: row['交付老师'] || null,
    deliveryCourse: row['交付课程'] || null,
    orderType: row['订单类型'] || 'course',
    status: row['状态'] || 'pending',
    deliveryStatus: row['交付状态'] || 'pending',
    isVoided: row['是否作废'] === '是' ? 1 : 0,
    notes: row['备注'] || null,
    noteTags: row['备注标签'] || null,
    discountInfo: row['折扣信息'] || null,
    couponInfo: row['优惠券信息'] || null,
    membershipInfo: row['会员信息'] || null,
    paymentStatus: row['支付状态'] || null,
    specialNotes: row['特殊备注'] || null,
  };
}

async function updateOrdersInDb(data) {
  console.log('\n🔄 正在连接数据库...');
  
  // 解析数据库URL
  const dbUrl = new URL(DB_URL);
  const connection = await mysql.createConnection({
    host: dbUrl.hostname,
    port: dbUrl.port || 3306,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1),
    ssl: { rejectUnauthorized: false }, // TiDB Cloud requires SSL
  });
  
  console.log('✅ 数据库连接成功');
  console.log(`\n🔄 开始更新 ${data.length} 条订单...`);
  console.log('='.repeat(80));
  
  let successCount = 0;
  let errorCount = 0;
  let notFoundCount = 0;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const orderId = parseInt(row['订单ID']);
    const orderNo = row['订单号'];
    
    try {
      // 检查订单是否存在
      const [existing] = await connection.execute(
        'SELECT id FROM orders WHERE id = ?',
        [orderId]
      );
      
      if (!existing || existing.length === 0) {
        console.log(`⚠️  [${i+1}/${data.length}] 订单ID ${orderId} 不存在，跳过`);
        notFoundCount++;
        continue;
      }
      
      // 映射字段
      const updateData = mapExcelToDbFields(row);
      
      // 构建UPDATE语句
      const fields = Object.keys(updateData).filter(key => updateData[key] !== undefined);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => updateData[field]);
      values.push(orderId);
      
      // 执行更新
      await connection.execute(
        `UPDATE orders SET ${setClause} WHERE id = ?`,
        values
      );
      
      successCount++;
      if ((i + 1) % 50 === 0) {
        console.log(`✅ 已处理 ${i + 1}/${data.length} 条订单...`);
      }
      
    } catch (error) {
      errorCount++;
      console.log(`❌ [${i+1}/${data.length}] 订单ID ${orderId} (${orderNo}) 更新失败: ${error.message}`);
    }
  }
  
  await connection.end();
  
  console.log('='.repeat(80));
  console.log('\n📊 更新完成统计:');
  console.log(`   ✅ 成功更新: ${successCount} 条`);
  console.log(`   ❌ 更新失败: ${errorCount} 条`);
  console.log(`   ⚠️  未找到: ${notFoundCount} 条`);
  console.log(`   📝 总计: ${data.length} 条`);
  
  return { successCount, errorCount, notFoundCount };
}

async function main() {
  const excelFile = '/home/ubuntu/upload/订单数据导出_规整后_V4_最终版_2026-02-25_02-08-26.xlsx';
  
  try {
    // 加载数据
    const data = await loadExcelData(excelFile);
    
    // 显示数据摘要
    console.log('\n📋 数据摘要:');
    console.log(`   总订单数: ${data.length}`);
    console.log(`   有效订单: ${data.filter(r => r['状态'] === 'paid').length}`);
    console.log(`   作废订单: ${data.filter(r => r['是否作废'] === '是').length}`);
    const totalAmount = data.reduce((sum, r) => sum + parseNumber(r['课程金额']), 0);
    console.log(`   课程金额总计: ¥${totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    
    // 确认更新
    console.log('\n⚠️  即将更新数据库中的所有订单记录（不是新增）');
    console.log('   按 Ctrl+C 取消，或等待3秒后自动开始...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 执行更新
    const { successCount, errorCount, notFoundCount } = await updateOrdersInDb(data);
    
    if (errorCount > 0) {
      console.log(`\n⚠️  有 ${errorCount} 条订单更新失败，请检查错误日志`);
      process.exit(1);
    }
    
    console.log('\n✅ 所有订单更新完成！');
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ 发生错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
