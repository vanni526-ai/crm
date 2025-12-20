import { drizzle } from "drizzle-orm/mysql2";
import { orders } from "./drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

const allOrders = await db.select({
  id: orders.id,
  orderNo: orders.orderNo,
  paymentChannel: orders.paymentChannel
}).from(orders).limit(10);

console.log("前10个订单的支付渠道信息:");
allOrders.forEach(order => {
  console.log(`订单号: ${order.orderNo}, 支付渠道: ${order.paymentChannel || '(空)'}`);
});

// 统计支付渠道分布
const channelStats: Record<string, number> = {};
const allOrdersFull = await db.select({
  paymentChannel: orders.paymentChannel
}).from(orders);

allOrdersFull.forEach(order => {
  const channel = order.paymentChannel || '(空)';
  channelStats[channel] = (channelStats[channel] || 0) + 1;
});

console.log("\n支付渠道统计:");
Object.entries(channelStats).forEach(([channel, count]) => {
  console.log(`${channel}: ${count}个订单`);
});

process.exit(0);
