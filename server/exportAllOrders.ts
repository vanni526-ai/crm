/**
 * 导出所有订单数据到Excel
 */

import { getDb } from "./db";
import { orders } from "../drizzle/schema";
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

async function exportAllOrders() {
  console.log("开始导出订单数据...\n");
  
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection failed');
  }
  
  // 查询所有订单数据
  console.log("正在查询订单数据...");
  const allOrders = await db.select().from(orders);
  
  console.log(`查询到 ${allOrders.length} 条订单记录\n`);
  
  // 转换数据格式为Excel友好格式
  const excelData = allOrders.map(order => ({
    '订单ID': order.id,
    '订单号': order.orderNo,
    '销售人': order.salesPerson,
    '流量来源': order.trafficSource,
    '客户微信号': order.customerName,
    '客户名': order.customerName,
    '课程金额': order.courseAmount,
    '支付金额': order.paymentAmount,
    '金串到账金额': order.finalAmount,
    '尾款金额': order.balanceAmount,
    '账户余额': order.accountBalance,
    '老师费用': order.teacherFee,
    '车费': order.transportFee,
    '其他费用': order.otherFee,
    '耗材费用': order.consumablesFee,
    '房租费用': order.rentFee,
    '物业费用': order.propertyFee,
    '水电费用': order.utilityFee,
    '合伙人费用': order.partnerFee,

    '支付渠道': order.paymentChannel,
    '渠道订单号': order.channelOrderNo,
    '支付日期': order.paymentDate,
    '支付时间': order.paymentTime,
    '上课日期': order.classDate,
    '上课时间': order.classTime,
    '交付城市': order.deliveryCity,
    '交付教室': order.deliveryRoom,
    '交付教室ID': order.deliveryClassroomId,
    '交付老师': order.deliveryTeacher,
    '交付课程': order.deliveryCourse,
    '订单类型': order.orderType,
    '状态': order.status,
    '交付状态': order.deliveryStatus,
    '是否作废': order.isVoided ? '是' : '否',
    '备注': order.notes,
    '备注标签': order.noteTags,
    '折扣信息': order.discountInfo,
    '优惠券信息': order.couponInfo,
    '会员信息': order.membershipInfo,
    '支付状态': order.paymentStatus,
    '特殊备注': order.specialNotes,
    '创建时间': order.createdAt,
    '更新时间': order.updatedAt
  }));
  
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // 设置列宽
  const colWidths = [
    { wch: 10 },  // 订单ID
    { wch: 30 },  // 订单号
    { wch: 15 },  // 销售人
    { wch: 20 },  // 流量来源
    { wch: 20 },  // 客户微信号
    { wch: 15 },  // 客户名
    { wch: 12 },  // 课程金额
    { wch: 12 },  // 首付金额
    { wch: 12 },  // 尾款金额
    { wch: 12 },  // 充值金额
    { wch: 12 },  // 账户余额
    { wch: 12 },  // 老师费用
    { wch: 10 },  // 车费
    { wch: 12 },  // 其他费用
    { wch: 12 },  // 合伙人费用
    { wch: 12 },  // 净收入
    { wch: 15 },  // 支付渠道
    { wch: 35 },  // 渠道订单号
    { wch: 12 },  // 支付日期
    { wch: 12 },  // 支付时间
    { wch: 12 },  // 上课日期
    { wch: 15 },  // 上课时间
    { wch: 12 },  // 交付城市
    { wch: 20 },  // 交付教室
    { wch: 12 },  // 交付教室ID
    { wch: 15 },  // 交付老师
    { wch: 30 },  // 交付课程
    { wch: 12 },  // 状态
    { wch: 12 },  // 置信度
    { wch: 50 },  // 备注
    { wch: 50 },  // 原始文本
    { wch: 20 },  // 创建时间
    { wch: 20 }   // 更新时间
  ];
  ws['!cols'] = colWidths;
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, "订单数据");
  
  // 生成文件名（包含时间戳）
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `订单数据导出_${timestamp}.xlsx`;
  const filepath = path.join('/home/ubuntu', filename);
  
  // 写入文件
  XLSX.writeFile(wb, filepath);
  
  console.log(`✅ 导出成功！`);
  console.log(`文件路径: ${filepath}`);
  console.log(`总记录数: ${allOrders.length} 条\n`);
  
  return filepath;
}

// 执行导出
exportAllOrders()
  .then(filepath => {
    console.log("导出完成！");
    process.exit(0);
  })
  .catch(error => {
    console.error("导出失败:", error);
    process.exit(1);
  });
