import { getDb } from './server/db.ts';
import { orders } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const db = await getDb();

const result = await db.select().from(orders).where(eq(orders.orderNo, 'ORD1769234555645602'));

if (result.length > 0) {
  const order = result[0];
  console.log('=== 订单详情 ===');
  console.log('订单号:', order.orderNo);
  console.log('客户名:', order.customerName);
  console.log('销售人:', order.salesperson);
  console.log('课程:', order.course);
  console.log('老师:', order.teacher);
  console.log('支付金额:', order.totalAmount);
  console.log('\n=== 备注 ===');
  console.log(order.notes);
  console.log('\n=== 原始文本 ===');
  console.log(order.originalText);
} else {
  console.log('未找到订单');
}

process.exit(0);
